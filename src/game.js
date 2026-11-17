// AeroSketch: Build & Control — main game engine (kid-friendly)
(() => {
  const REF_W = 1200;
  const REF_H = 720;
  const TAXI_SPEED = 85;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);

  // ---------- STATE ----------
  const state = {
    mode: 'fly',
    tool: 'runway',
    domeStamp: 'star_6',
    signStamp: 'loc_a',
    night: false,
    showTrace: false,
    traceOpacity: 0.45,
    traceImg: null,
    customTraceUrl: null,
    airportId: 'cmx',
    airport: null,
    graph: { nodes: [], edges: [], adj: [] },
    spots: [],
    planes: [],
    selected: null,
    stars: 0,
    lives: 3,
    crashes: 0,
    seen: {},
    drag: null,
    undo: [],
    ripples: [],
    explosions: [],
    time: 0,
  };
  const view = { s: 1, baseScale: 1, zoom: 1, panX: 0, panY: 0, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 };
  let uidCounter = 1;

  const clouds = [0, 1, 2, 3].map((i) => ({
    x: Math.random() * 1400,
    y: 120 + i * 170 + Math.random() * 60,
    size: 50 + Math.random() * 30,
    speed: 8 + Math.random() * 8,
  }));

  // ---------- HELPERS ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const deepCopy = (o) => JSON.parse(JSON.stringify(o));
  const segLen = (s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);

  function projectT(s, p) {
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    const L2 = dx * dx + dy * dy || 1;
    const t = ((p.x - s.x1) * dx + (p.y - s.y1) * dy) / L2;
    const tc = clamp(t, 0, 1);
    const x = s.x1 + dx * tc;
    const y = s.y1 + dy * tc;
    return { t, tc, x, y, d: Math.hypot(p.x - x, p.y - y) };
  }

  function segIntersect(a, b) {
    const r = { x: a.x2 - a.x1, y: a.y2 - a.y1 };
    const s = { x: b.x2 - b.x1, y: b.y2 - b.y1 };
    const den = r.x * s.y - r.y * s.x;
    if (Math.abs(den) < 1e-6) return null;
    const qp = { x: b.x1 - a.x1, y: b.y1 - a.y1 };
    const t = (qp.x * s.y - qp.y * s.x) / den;
    const u = (qp.x * r.y - qp.y * r.x) / den;
    if (t < -0.001 || t > 1.001 || u < -0.001 || u > 1.001) return null;
    return { t: clamp(t, 0, 1), u: clamp(u, 0, 1) };
  }

  function angleDiff(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function turnToward(p, target, dt, rate = 5) {
    const d = angleDiff(p.angle, target);
    const step = rate * dt;
    p.angle += Math.abs(d) <= step ? d : Math.sign(d) * step;
  }

  function runwayNumber(bearing) {
    let n = Math.round(bearing / 10) % 36;
    if (n === 0) n = 36;
    return String(n).padStart(2, '0');
  }

  function runwayLabels(x1, y1, x2, y2) {
    const brg = (Math.atan2(x2 - x1, -(y2 - y1)) * 180 / Math.PI + 360) % 360;
    return { label1: runwayNumber(brg), label2: runwayNumber((brg + 180) % 360) };
  }

  // ---------- PILOT BUBBLE ----------
  let bubbleTimer = null;
  function say(avatar, title, text) {
    $('pilotAvatar').textContent = avatar;
    $('pilotTitle').textContent = title;
    $('pilotText').textContent = text;
    const b = $('pilotBubble');
    b.classList.remove('bump');
    b.classList.remove('hidden-bubble');
    void b.offsetWidth;
    b.classList.add('bump');
    clearTimeout(bubbleTimer);
    // Auto-hide after 3.8s so it never blocks runways or buildings
    bubbleTimer = setTimeout(() => b.classList.add('hidden-bubble'), 3800);
  }

  // ---------- PERSISTENCE ----------
  function updateLivesDisplay() {
    const el = $('livesDisplay');
    if (!el) return;
    let s = '';
    for (let i = 0; i < 3; i++) {
      s += i < state.lives ? '❤️' : '🖤';
    }
    el.textContent = s;
  }

  function loadProgress() {
    try {
      const p = JSON.parse(localStorage.getItem('aerosketch:progress') || '{}');
      state.stars = p.stars || 0;
      state.seen = p.seen || {};
    } catch (e) { /* ignore */ }
    updateLivesDisplay();
  }
  function saveProgress() {
    localStorage.setItem('aerosketch:progress', JSON.stringify({ stars: state.stars, seen: state.seen }));
    $('starCount').textContent = state.stars;
    updateLivesDisplay();
  }
  function saveAirport() {
    localStorage.setItem('aerosketch:airport:' + state.airportId, JSON.stringify(state.airport));
  }

  // ---------- TAXI GRAPH ----------
  function buildGraph(a) {
    const segs = [
      ...a.runways.map((r) => ({ x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2, runway: true })),
      ...a.taxiRoads.map((t) => ({ x1: t.x1, y1: t.y1, x2: t.x2, y2: t.y2, runway: false })),
    ];
    const splits = segs.map(() => [0, 1]);
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j < segs.length; j++) {
        const A = segs[i];
        const B = segs[j];
        const hit = segIntersect(A, B);
        if (hit) {
          splits[i].push(hit.t);
          splits[j].push(hit.u);
        }
        const pairs = [[A, B, j], [B, A, i]];
        for (const [s, o, oi] of pairs) {
          for (const e of [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]) {
            const pr = projectT(o, e);
            if (pr.d < 18 && pr.t >= -0.03 && pr.t <= 1.03) splits[oi].push(pr.tc);
          }
        }
      }
    }
    const nodes = [];
    const edges = [];
    const nodeAt = (x, y) => {
      for (let k = 0; k < nodes.length; k++) {
        if (Math.hypot(nodes[k].x - x, nodes[k].y - y) < 18) return k;
      }
      nodes.push({ x, y });
      return nodes.length - 1;
    };
    segs.forEach((s, i) => {
      const ts = [...new Set(splits[i].map((t) => +t.toFixed(4)))].sort((p, q) => p - q);
      let prev = null;
      ts.forEach((t) => {
        const n = nodeAt(s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t);
        if (prev !== null && prev !== n) edges.push({ a: prev, b: n, runway: s.runway });
        prev = n;
      });
    });
    const adj = nodes.map(() => []);
    edges.forEach((e) => {
      const w = hyp(nodes[e.a], nodes[e.b]) * (e.runway ? 3 : 1);
      adj[e.a].push({ to: e.b, w });
      adj[e.b].push({ to: e.a, w });
    });
    return { nodes, edges, adj };
  }

  function nearestOnGraph(x, y) {
    const g = state.graph;
    let best = null;
    g.edges.forEach((e) => {
      const A = g.nodes[e.a];
      const B = g.nodes[e.b];
      const pr = projectT({ x1: A.x, y1: A.y, x2: B.x, y2: B.y }, { x, y });
      if (!best || pr.d < best.d) best = { x: pr.x, y: pr.y, d: pr.d, edge: e };
    });
    return best;
  }

  function findPath(fx, fy, tx, ty, exact) {
    const g = state.graph;
    if (!g.edges.length) return [{ x: tx, y: ty }];
    const S = nearestOnGraph(fx, fy);
    const T = nearestOnGraph(tx, ty);
    const pts = [];
    if (S.d > 3) pts.push({ x: S.x, y: S.y });
    if (S.edge === T.edge) {
      pts.push({ x: T.x, y: T.y });
    } else {
      const n = g.nodes.length;
      const dist = new Array(n).fill(Infinity);
      const prev = new Array(n).fill(-1);
      const done = new Array(n).fill(false);
      const wf = S.edge.runway ? 3 : 1;
      dist[S.edge.a] = hyp(S, g.nodes[S.edge.a]) * wf;
      dist[S.edge.b] = hyp(S, g.nodes[S.edge.b]) * wf;
      for (;;) {
        let u = -1;
        for (let k = 0; k < n; k++) if (!done[k] && dist[k] < Infinity && (u === -1 || dist[k] < dist[u])) u = k;
        if (u === -1) break;
        done[u] = true;
        g.adj[u].forEach(({ to, w }) => {
          if (dist[u] + w < dist[to]) {
            dist[to] = dist[u] + w;
            prev[to] = u;
          }
        });
      }
      const ca = dist[T.edge.a] + hyp(T, g.nodes[T.edge.a]);
      const cb = dist[T.edge.b] + hyp(T, g.nodes[T.edge.b]);
      let end = ca <= cb ? T.edge.a : T.edge.b;
      if (!isFinite(dist[end])) {
        pts.push({ x: tx, y: ty });
        return pts;
      }
      const chain = [];
      while (end !== -1) {
        chain.unshift(end);
        end = prev[end];
      }
      chain.forEach((k) => pts.push({ x: g.nodes[k].x, y: g.nodes[k].y }));
      pts.push({ x: T.x, y: T.y });
    }
    if (exact && Math.hypot(T.x - tx, T.y - ty) > 3) pts.push({ x: tx, y: ty });
    return pts;
  }

  // ---------- PARKING SPOTS ----------
  function starAngle(i, arms) {
    return -Math.PI / 2 + (i + 0.5) * (Math.PI * 2 / arms);
  }

  function computeSpots(a) {
    const spots = [];
    const add = (x, y, key, label) => {
      if (x < 15 || x > REF_W - 15 || y < 15 || y > REF_H - 15) return;
      if (spots.some((s) => Math.hypot(s.x - x, s.y - y) < 28)) return;
      spots.push({ x, y, key, label });
    };
    const ordered = [...a.stamps].sort((p, q) => (p.type === 'gate' ? -1 : 0) - (q.type === 'gate' ? -1 : 0));
    ordered.forEach((st) => {
      if (st.type === 'gate') add(st.x, st.y, st.id, st.label);
      else if (st.type === 'cargo') add(st.x, st.y - 50, st.id + '-c', st.label);
      else if (st.type === 'helipad') add(st.x, st.y, st.id, 'Helipad');
      else if (st.type === 'star_hub') {
        const arms = st.arms || 6;
        const r = st.radius || 110;
        const centerDomeR = Math.min(r * 0.32, 58);
        const armLengths = Array.isArray(st.armLengths) ? st.armLengths : null;
        for (let i = 0; i < arms; i++) {
          const ang = (Array.isArray(st.armAngles) && st.armAngles[i] !== undefined)
            ? st.armAngles[i]
            : starAngle(i, arms);
          const armLen = (armLengths && armLengths[i]) || r;
          const concourseSpan = Math.max(30, armLen - centerDomeR - 20);
          const numGates = Math.max(1, Math.floor(concourseSpan / 44));
          const nx = -Math.sin(ang);
          const ny = Math.cos(ang);
          const cos = Math.cos(ang);
          const sin = Math.sin(ang);
          for (let g = 1; g <= numGates; g++) {
            const d = centerDomeR + 14 + (g / (numGates + 1)) * concourseSpan;
            const px = st.x + cos * d;
            const py = st.y + sin * d;
            add(px + nx * 32, py + ny * 32, `${st.id}-${i}-L${g}`, `G${i + 1}-${g}A`);
            add(px - nx * 32, py - ny * 32, `${st.id}-${i}-R${g}`, `G${i + 1}-${g}B`);
          }
          // Tip gate
          add(st.x + cos * (armLen + 16), st.y + sin * (armLen + 16), `${st.id}-${i}-tip`, `G${i + 1}-T`);
        }
      } else if (st.type === 'square_dome') {
        const w = st.width || 130;
        const h = st.height || 95;
        add(st.x, st.y + h / 2 + 30, st.id + '-s', st.label);
        add(st.x, st.y - h / 2 - 30, st.id + '-n', st.label);
        add(st.x - w / 2 - 30, st.y, st.id + '-w', st.label);
        add(st.x + w / 2 + 30, st.y, st.id + '-e', st.label);
      } else if (st.type === 'midfield') {
        const w = st.width || 150;
        const h = st.height || 60;
        add(st.x - w / 3, st.y - h / 2 - 28, st.id + '-n1', 'Gate N1');
        add(st.x + w / 3, st.y - h / 2 - 28, st.id + '-n2', 'Gate N2');
        add(st.x - w / 3, st.y + h / 2 + 28, st.id + '-s1', 'Gate S1');
        add(st.x + w / 3, st.y + h / 2 + 28, st.id + '-s2', 'Gate S2');
      } else if (st.type === 'crescent') {
        const r = st.radius || 100;
        for (let k = -2; k <= 2; k++) {
          const a = -Math.PI / 2 + k * 0.45;
          add(st.x + Math.cos(a) * (r + 30), st.y + Math.sin(a) * (r + 30), st.id + '-c' + k, 'Gate C' + (k + 3));
        }
      } else if (st.type === 'pier') {
        // Linear concourse pier: gates along left and right sides
        const len = Math.hypot(st.x2 - st.x1, st.y2 - st.y1);
        if (len > 40) {
          const dx = (st.x2 - st.x1) / len;
          const dy = (st.y2 - st.y1) / len;
          const nx = -dy;
          const ny = dx;
          const numGates = Math.max(1, Math.floor(len / 42));
          for (let g = 1; g <= numGates; g++) {
            const t = (g / (numGates + 1)) * len;
            const px = st.x1 + dx * t;
            const py = st.y1 + dy * t;
            add(px + nx * 32, py + ny * 32, st.id + '-L' + g, 'Gate ' + g + 'A');
            add(px - nx * 32, py - ny * 32, st.id + '-R' + g, 'Gate ' + g + 'B');
          }
          add(st.x2 + dx * 16, st.y2 + dy * 16, st.id + '-tip', 'Gate ' + (numGates + 1));
        }
      } else if (st.type === 'free_poly' && st.points && st.points.length >= 3) {
        // Freehand Drawn Building: compute perimeter and space gates along edges
        const pts = st.points;
        for (let i = 0; i < pts.length; i++) {
          const p1 = pts[i];
          const p2 = pts[(i + 1) % pts.length];
          const edgeLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          if (edgeLen > 45) {
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const dx = (p2.x - p1.x) / edgeLen;
            const dy = (p2.y - p1.y) / edgeLen;
            // Outward normal (assuming clockwise or outward pointing check)
            const nx = dy;
            const ny = -dx;
            // Check if (midX + nx*25, midY + ny*25) is outside polygon
            const testX = midX + nx * 28;
            const testY = midY + ny * 28;
            add(testX, testY, st.id + '-g' + i, (st.label || 'T') + '-G' + (i + 1));
          }
        }
      }
    });
    return spots;
  }

  function spotTaken(key, except) {
    return state.planes.some((p) => p !== except && (p.spotKey === key || p.targetSpot === key));
  }

  function rebuild() {
    state.graph = buildGraph(state.airport);
    state.spots = computeSpots(state.airport);
  }

  function commit() {
    rebuild();
    saveAirport();
  }

  function pushUndo() {
    state.undo.push(JSON.stringify(state.airport));
    if (state.undo.length > 40) state.undo.shift();
  }

  // ---------- PLANES ----------
  function makePlane(id) {
    return {
      uid: uidCounter++,
      def: getPlaneById(id),
      x: 0, y: 0, angle: 0,
      status: 'idle',
      path: [], speed: 0, alt: 0,
      rw: null, onArrive: null,
      spotKey: null, targetSpot: null,
    };
  }

  const commandable = (p) => p && ['idle', 'parked', 'taxi'].includes(p.status);
  const selectedPlane = () => state.planes.find((p) => p.uid === state.selected) || null;

  function selectPlane(p) {
    state.selected = p ? p.uid : null;
  }

  function planeAt(x, y) {
    let best = null;
    let bestD = 38;
    state.planes.forEach((p) => {
      if (p.alt > 0.3) return;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { best = p; bestD = d; }
    });
    return best;
  }

  function runwayBusy(r) {
    return state.planes.some((p) => ['approach', 'rollout', 'lineup', 'takeoff'].includes(p.status) && p.rwId === r);
  }

  // Check if a plane is still on or near a specific runway
  function planeOnRunway(r, p) {
    if (p.rwId === r) return true;
    if (p.status === 'parked') return false;
    const pr = projectT({ x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2 }, { x: p.x, y: p.y });
    return pr.d < 38 && pr.tc >= -0.05 && pr.tc <= 1.05;
  }

  function triggerCrash(p1, p2, x, y) {
    Sound.crash();
    state.lives = Math.max(0, state.lives - 1);
    state.crashes += 1;
    updateLivesDisplay();

    // Spawn animated explosion particles
    for (let i = 0; i < 28; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 120;
      state.explosions.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 12 + Math.random() * 18,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.5,
        color: ['#f97316', '#ef4444', '#facc15', '#334155'][Math.floor(Math.random() * 4)],
      });
    }

    // Remove the crashed planes
    state.planes = state.planes.filter((pl) => pl !== p1 && pl !== p2);
    if (state.selected === (p1 && p1.uid) || state.selected === (p2 && p2.uid)) {
      state.selected = null;
    }

    say('🚨', 'CRASH ON RUNWAY!', `"${p1.def.shortName} collided with ${p2 ? p2.def.shortName : 'traffic'}! Clear the runway faster!"`);

    if (state.lives <= 0) {
      setTimeout(() => {
        const overlay = $('crashOverlay');
        if (overlay) {
          $('crashTitle').textContent = '💥 AIRPORT SAFETY ALERT!';
          $('crashDesc').textContent = 'Too many runway collisions! Airplanes must be parked safely before new flights touch down.';
          overlay.classList.remove('hidden');
        }
      }, 700);
    }
  }

  function landPlane(planeId) {
    const rws = state.airport.runways.filter((r) => segLen(r) > 150);
    if (!rws.length) {
      Sound.oops();
      say('👷', 'No runway yet!', 'Switch to ✏️ Build and draw a runway first!');
      return;
    }
    // Allow landing even if busy (with warning), or pick a free one if available
    let r = rws.find((rw) => !runwayBusy(rw));
    let hasObstacle = false;
    if (!r) {
      r = rws[Math.floor(Math.random() * rws.length)];
      hasObstacle = true;
      Sound.alarm();
      say('⚠️', 'CAUTION: Runway Occupied!', '"Warning: A plane is still on this runway! Park it quickly before touchdown!"');
    }

    const flip = Math.random() < 0.5;
    const sx = flip ? r.x2 : r.x1;
    const sy = flip ? r.y2 : r.y1;
    const ex = flip ? r.x1 : r.x2;
    const ey = flip ? r.y1 : r.y2;
    const len = Math.hypot(ex - sx, ey - sy);
    const dx = (ex - sx) / len;
    const dy = (ey - sy) / len;
    const def = getPlaneById(planeId || PLANE_FLEET[Math.floor(Math.random() * PLANE_FLEET.length)].id);
    const p = makePlane(def.id);
    p.rw = { sx, sy, dx, dy, len };
    p.rwId = r;
    p.along = -560;
    p.x = sx + dx * p.along;
    p.y = sy + dy * p.along;
    p.angle = Math.atan2(dy, dx);
    p.status = 'approach';
    p.speed = 170;
    p.alt = 1;
    state.planes.push(p);
    state.seen[def.id] = (state.seen[def.id] || 0) + 1;
    saveProgress();
    if (!hasObstacle) {
      Sound.blip();
      say('🧑‍✈️', def.shortName + ' arriving!', `"${def.pilotGreeting}"`);
    }
  }

  function takeOff() {
    let p = selectedPlane();
    if (!commandable(p)) p = state.planes.find(commandable);
    if (!p) {
      Sound.oops();
      say('🙋', 'No planes ready!', 'Press 🛬 Land New Plane! to bring one in first.');
      return;
    }
    const rws = state.airport.runways.filter((r) => segLen(r) > 150);
    if (!rws.length) {
      Sound.oops();
      say('👷', 'No runway!', 'Build a runway first so planes can take off.');
      return;
    }
    let best = null;
    rws.forEach((r) => {
      [[r.x1, r.y1, r.x2, r.y2], [r.x2, r.y2, r.x1, r.y1]].forEach(([sx, sy, ex, ey]) => {
        const d = Math.hypot(p.x - sx, p.y - sy);
        if (!best || d < best.d) best = { d, sx, sy, ex, ey, r };
      });
    });
    selectPlane(p);
    p.spotKey = null;
    p.targetSpot = null;
    p.path = findPath(p.x, p.y, best.sx, best.sy, true);
    p.status = 'taxi';
    const len = Math.hypot(best.ex - best.sx, best.ey - best.sy);
    p.onArrive = (pl) => {
      pl.rw = { sx: best.sx, sy: best.sy, dx: (best.ex - best.sx) / len, dy: (best.ey - best.sy) / len, len };
      pl.rwId = best.r;
      pl.along = 0;
      pl.status = 'lineup';
    };
    Sound.blip();
    const lbl = best.sx === best.r.x1 && best.sy === best.r.y1 ? best.r.label1 : best.r.label2;
    say('🧑‍✈️', p.def.shortName, `"Taxiing to Runway ${lbl || ''} for takeoff! Here we go!"`);
  }

  function sendPlaneTo(p, x, y, spot) {
    p.spotKey = null;
    p.targetSpot = spot ? spot.key : null;
    p.path = findPath(p.x, p.y, x, y, !!spot);
    p.status = 'taxi';
    p.onArrive = spot
      ? (pl) => {
          pl.status = 'parked';
          pl.spotKey = spot.key;
          pl.targetSpot = null;
          state.stars += 1;
          saveProgress();
          Sound.chime();
          say('🎉', 'Parked at ' + (spot.label || 'the gate') + '!', `"Thanks, Tower! Passengers are getting off the ${pl.def.shortName}. +1 ⭐"`);
        }
      : null;
  }

  function updatePlanes(dt) {
    const remove = [];
    state.planes.forEach((p) => {
      switch (p.status) {
        case 'approach': {
          p.along += p.speed * dt;
          const touch = p.rw.len * 0.1;
          p.alt = clamp((touch - p.along) / 600, 0, 1);
          if (p.along >= touch) {
            p.status = 'rollout';
            p.alt = 0;
            Sound.land();
          }
          break;
        }
        case 'rollout': {
          p.speed = Math.max(42, p.speed - 65 * dt);
          p.along += p.speed * dt;
          if (p.speed <= 42 || p.along >= p.rw.len * 0.75) {
            p.status = 'idle';
            p.speed = 0;
            p.rwId = null;
            selectPlane(p);
            say('🧑‍✈️', p.def.shortName + ' landed!', '"Touchdown! Tap a glowing P gate to park me!"');
          }
          break;
        }
        case 'taxi': {
          if (!p.path.length) { arrive(p); break; }
          const tgt = p.path[0];
          const dx = tgt.x - p.x;
          const dy = tgt.y - p.y;
          const d = Math.hypot(dx, dy);
          const step = TAXI_SPEED * dt;
          if (d <= step) {
            p.x = tgt.x;
            p.y = tgt.y;
            p.path.shift();
            if (!p.path.length) arrive(p);
          } else {
            p.x += (dx / d) * step;
            p.y += (dy / d) * step;
            turnToward(p, Math.atan2(dy, dx), dt);
          }
          break;
        }
        case 'lineup': {
          const target = Math.atan2(p.rw.dy, p.rw.dx);
          turnToward(p, target, dt, 2.5);
          if (Math.abs(angleDiff(p.angle, target)) < 0.04) {
            p.angle = target;
            p.status = 'takeoff';
            p.speed = 25;
            Sound.whoosh();
            say('🚀', p.def.shortName + ' taking off!', '"Full power! Up, up and away! Bye bye!"');
          }
          break;
        }
        case 'takeoff': {
          p.speed = Math.min(330, p.speed + 95 * dt);
          p.along += p.speed * dt;
          if (p.along > p.rw.len * 0.55) p.alt = Math.min(1.6, p.alt + dt * 0.6);
          if (p.x < -250 || p.x > REF_W + 250 || p.y < -250 || p.y > REF_H + 250 || p.along > p.rw.len + 700) {
            remove.push(p);
            state.stars += 1;
            saveProgress();
          }
          break;
        }
        default:
          break;
      }
      if (['approach', 'rollout', 'takeoff'].includes(p.status)) {
        p.x = p.rw.sx + p.rw.dx * p.along;
        p.y = p.rw.sy + p.rw.dy * p.along;
      }
    });

    // Collision Detection: Check if a landing/rollout plane hits an unparked plane on the runway!
    for (let i = 0; i < state.planes.length; i++) {
      const p1 = state.planes[i];
      // Only active ground/touchdown planes can crash
      if (p1.status === 'rollout' || (p1.status === 'approach' && p1.alt < 0.25) || p1.status === 'takeoff') {
        for (let j = 0; j < state.planes.length; j++) {
          if (i === j) continue;
          const p2 = state.planes[j];
          // Check collision with another plane that is on the ground and not safely parked
          if (p2.alt < 0.3 && p2.status !== 'parked') {
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            // Collision radius based on wingspans
            const crashDist = (p1.def.wingspan + p2.def.wingspan) * 0.45;
            if (dist < crashDist) {
              const crashX = (p1.x + p2.x) / 2;
              const crashY = (p1.y + p2.y) / 2;
              triggerCrash(p1, p2, crashX, crashY);
              return; // Avoid multiple collision triggers in same frame
            }
          }
        }
      }
    }

    if (remove.length) {
      state.planes = state.planes.filter((p) => !remove.includes(p));
      if (remove.some((p) => p.uid === state.selected)) state.selected = null;
    }
  }

  function arrive(p) {
    const cb = p.onArrive;
    p.onArrive = null;
    p.status = 'idle';
    if (cb) cb(p);
  }

  // ---------- AIRPORT LOADING ----------
  function loadTrace(url) {
    const img = new Image();
    img.onload = () => { state.traceImg = img; };
    img.src = url;
  }

  function loadAirport(id) {
    state.airportId = id;
    const base = STARTER_AIRPORTS[id];
    let data = null;
    try { data = JSON.parse(localStorage.getItem('aerosketch:airport:' + id) || 'null'); } catch (e) { data = null; }
    state.airport = data || deepCopy({ runways: base.runways, taxiRoads: base.taxiRoads, stamps: base.stamps, signs: base.signs });
    state.undo = [];
    rebuild();
    state.planes = [];
    state.selected = null;
    base.initialPlanes.forEach((ip) => {
      const p = makePlane(ip.planeId);
      p.x = ip.x;
      p.y = ip.y;
      p.angle = ip.angle;
      if (ip.status === 'parked') {
        const spot = state.spots
          .filter((s) => !spotTaken(s.key))
          .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (spot) { p.x = spot.x; p.y = spot.y; p.spotKey = spot.key; }
        p.status = 'parked';
      } else {
        const pr = nearestOnGraph(p.x, p.y);
        if (pr) { p.x = pr.x; p.y = pr.y; }
        p.status = 'idle';
      }
      state.planes.push(p);
    });
    if (!state.customTraceUrl) loadTrace(base.traceImage);
    say('🧑‍✈️', base.name, base.welcomeMessage);
  }

  // ---------- VIEW / INPUT ----------
  function resize() {
    view.dpr = window.devicePixelRatio || 1;
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.floor(view.w * view.dpr);
    canvas.height = Math.floor(view.h * view.dpr);
    canvas.style.width = view.w + 'px';
    canvas.style.height = view.h + 'px';

    // Generous safe margins so airport never touches top bar or bottom dock
    const topSafe = 75;
    const bottomSafe = 115;
    const sideSafe = 35;
    const availW = Math.max(200, view.w - sideSafe * 2);
    const availH = Math.max(200, view.h - topSafe - bottomSafe);

    // Compute base scale to fit 1200x720 coordinate space within safe area
    view.baseScale = Math.min(availW / (REF_W + 40), availH / (REF_H + 30));
    view.s = view.baseScale * (view.zoom || 1);
    view.ox = (view.w - REF_W * view.s) / 2 + (view.panX || 0);
    view.oy = topSafe + (availH - REF_H * view.s) / 2 + (view.panY || 0);
  }

  function resetCamera() {
    view.zoom = 1;
    view.panX = 0;
    view.panY = 0;
    resize();
    Sound.pop();
    say('🎯', 'Camera Reset', 'Whole airport centered cleanly on screen!');
  }

  function zoomBy(factor) {
    const newZoom = Math.min(2.5, Math.max(0.55, (view.zoom || 1) * factor));
    view.zoom = newZoom;
    resize();
    Sound.pop();
  }

  function toRef(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left - view.ox) / view.s, y: (e.clientY - rect.top - view.oy) / view.s };
  }

  function snapPoint(x, y) {
    let best = null;
    state.graph.nodes.forEach((n) => {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < 24 && (!best || d < best.d)) best = { x: n.x, y: n.y, d };
    });
    if (best) return best;
    const pr = nearestOnGraph(x, y);
    if (pr && pr.d < 20) return { x: pr.x, y: pr.y };
    return { x, y };
  }

  let pointer = null;
  let isPanning = false;
  let panStart = { x: 0, y: 0 };

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(2.5, Math.max(0.55, (view.zoom || 1) * factor));
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = (mx - view.ox) / view.s;
    const wy = (my - view.oy) / view.s;

    view.zoom = newZoom;
    view.s = view.baseScale * view.zoom;
    view.ox = mx - wx * view.s;
    view.oy = my - wy * view.s;
    view.panX = view.ox - (view.w - REF_W * view.s) / 2;
    view.panY = view.oy - (75 + (Math.max(200, view.h - 190) - REF_H * view.s) / 2);
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    // Dismiss pilot bubble on canvas click
    $('pilotBubble').classList.add('hidden-bubble');

    // Pan with Right click, Middle click, Shift key, or Space bar
    if (e.button === 2 || e.button === 1 || e.shiftKey || state.spaceDown) {
      isPanning = true;
      panStart = { x: e.clientX - (view.panX || 0), y: e.clientY - (view.panY || 0) };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    const p = toRef(e);
    pointer = { start: p, moved: false };
    if (state.mode === 'build' && (state.tool === 'runway' || state.tool === 'taxi' || state.tool === 'pier')) {
      const s = state.tool === 'taxi' ? snapPoint(p.x, p.y) : p;
      state.drag = { x1: s.x, y1: s.y, x2: s.x, y2: s.y, tool: state.tool };
    } else if (state.mode === 'build' && state.tool === 'free_building') {
      state.freeStroke = [{ x: p.x, y: p.y }];
    }
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (isPanning) {
      view.panX = e.clientX - panStart.x;
      view.panY = e.clientY - panStart.y;
      view.ox = (view.w - REF_W * view.s) / 2 + view.panX;
      view.oy = 75 + (Math.max(200, view.h - 190) - REF_H * view.s) / 2 + view.panY;
      return;
    }
    if (!pointer) return;
    const p = toRef(e);
    if (Math.hypot(p.x - pointer.start.x, p.y - pointer.start.y) > 8) pointer.moved = true;
    if (state.drag) {
      const s = state.drag.tool === 'taxi' ? snapPoint(p.x, p.y) : p;
      state.drag.x2 = s.x;
      state.drag.y2 = s.y;
    } else if (state.freeStroke) {
      const lastPt = state.freeStroke[state.freeStroke.length - 1];
      if (Math.hypot(p.x - lastPt.x, p.y - lastPt.y) > 12) {
        state.freeStroke.push({ x: p.x, y: p.y });
      }
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (isPanning) {
      isPanning = false;
      return;
    }
    if (!pointer) return;
    const p = toRef(e);
    const wasMoved = pointer.moved;
    pointer = null;
    if (state.mode === 'fly') {
      flyTap(p.x, p.y);
      return;
    }
    if (state.freeStroke) {
      const stroke = state.freeStroke;
      state.freeStroke = null;
      if (stroke.length < 4) {
        Sound.oops();
        say('🎨', 'Magic Pen', 'Draw a loop around the grass to create a custom building!');
        return;
      }
      // Simplify and smooth stroke into a polygon
      pushUndo();
      const count = state.airport.stamps.filter((s) => s.type === 'free_poly' || s.type === 'star_hub' || s.type === 'square_dome').length;
      state.airport.stamps.push({
        id: 'poly_' + Date.now(),
        type: 'free_poly',
        points: stroke,
        label: 'Terminal ' + (count + 1),
      });
      Sound.pop();
      say('✨', 'Custom Building Created!', 'Gates have been automatically placed along your hand-drawn walls!');
      commit();
      return;
    }
    if (state.drag) {
      const d = state.drag;
      state.drag = null;
      const len = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
      const minLen = d.tool === 'runway' ? 160 : (d.tool === 'pier' ? 60 : 40);
      if (!wasMoved || len < minLen) {
        Sound.oops();
        say('👷', 'Drag to draw!', d.tool === 'runway'
          ? 'Hold down and drag a long line across the grass to make a runway!'
          : (d.tool === 'pier'
              ? 'Hold down and drag across the grass to build a long Concourse Pier with gates!'
              : 'Hold down and drag a line to make a taxi road. Connect it to a runway!'));
        return;
      }
      pushUndo();
      if (d.tool === 'runway') {
        const labels = runwayLabels(d.x1, d.y1, d.x2, d.y2);
        state.airport.runways.push({ id: 'u' + Date.now(), x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2, ...labels });
        say('🛫', `Runway ${labels.label1}/${labels.label2} built!`, 'Runway numbers come from the compass direction. Cool, right?');
      } else if (d.tool === 'pier') {
        const count = state.airport.stamps.filter((s) => s.type === 'pier').length;
        state.airport.stamps.push({
          id: 'pier_' + Date.now(),
          type: 'pier',
          x1: d.x1, y1: d.y1,
          x2: d.x2, y2: d.y2,
          label: 'Pier ' + String.fromCharCode(65 + count),
        });
        say('🏢', `Concourse Pier built!`, 'Gates automatically attached along both sides so planes can park!');
      } else {
        state.airport.taxiRoads.push({ x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2 });
        say('🛣️', 'Taxi road built!', 'Planes can drive on it now. Connect roads to runways and gates!');
      }
      Sound.pop();
      commit();
      return;
    }
    buildTap(p.x, p.y);
  });

  function addRipple(x, y, color) {
    state.ripples.push({ x, y, t: 0, color });
  }

  function flyTap(x, y) {
    const hit = planeAt(x, y);
    if (hit) {
      selectPlane(hit);
      Sound.blip();
      if (commandable(hit)) {
        say('🧑‍✈️', hit.def.shortName, `"${hit.def.pilotGreeting} Tap a glowing P to park, or press Take Off!"`);
      } else {
        say('🧑‍✈️', hit.def.shortName, '"I\'m busy flying right now! ✈️"');
      }
      return;
    }
    let p = selectedPlane();
    if (!commandable(p)) {
      Sound.oops();
      say('👆', 'Pick a plane first!', 'Tap on an airplane, then tap where it should go.');
      return;
    }
    const spot = state.spots
      .filter((s) => Math.hypot(s.x - x, s.y - y) < 42)
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (spot) {
      if (spotTaken(spot.key, p)) {
        Sound.oops();
        say('🚫', 'That gate is taken!', 'Another plane is parked there. Pick a different glowing P!');
        return;
      }
      sendPlaneTo(p, spot.x, spot.y, spot);
      addRipple(spot.x, spot.y, '#facc15');
      Sound.blip();
      say('🧑‍✈️', p.def.shortName, `"Roger! Taxiing to ${spot.label || 'the gate'}!"`);
      return;
    }
    const pr = nearestOnGraph(x, y);
    if (!pr || pr.d > 70) {
      Sound.oops();
      say('🌱', 'That\'s grass!', 'Planes can only drive on gray roads. Tap a road or a glowing P gate.');
      return;
    }
    sendPlaneTo(p, pr.x, pr.y, null);
    addRipple(pr.x, pr.y, '#38bdf8');
    Sound.blip();
    say('🧑‍✈️', p.def.shortName, '"Roger, Tower! Rolling there now!"');
  }

  function stampHit(st, x, y) {
    if (st.type === 'free_poly' && st.points) {
      // Ray casting point-in-polygon check or distance to polygon points
      let inside = false;
      const pts = st.points;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i].x, yi = pts[i].y;
        const xj = pts[j].x, yj = pts[j].y;
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }
    if (st.type === 'pier') return distToSeg(x, y, st) < 26;
    if (st.type === 'star_hub') {
      const r = st.radius || 110;
      const centerApronR = Math.min(r * 0.35, 65) + 16;
      if (Math.hypot(st.x - x, st.y - y) < centerApronR) return true;
      const arms = st.arms || 6;
      for (let i = 0; i < arms; i++) {
        const ang = (Array.isArray(st.armAngles) && st.armAngles[i] !== undefined) ? st.armAngles[i] : starAngle(i, arms);
        const armLen = (Array.isArray(st.armLengths) && st.armLengths[i]) || r;
        const x2 = st.x + Math.cos(ang) * armLen;
        const y2 = st.y + Math.sin(ang) * armLen;
        if (distToSeg(x, y, { x1: st.x, y1: st.y, x2, y2 }) < 26) return true;
      }
      return false;
    }
    if (st.type === 'square_dome') return Math.abs(st.x - x) < (st.width || 130) / 2 && Math.abs(st.y - y) < (st.height || 95) / 2;
    if (st.type === 'midfield') return Math.abs(st.x - x) < 85 && Math.abs(st.y - y) < 40;
    if (st.type === 'crescent') return Math.hypot(st.x - x, st.y - y) < 125;
    if (st.type === 'cargo') return Math.abs(st.x - x) < 60 && Math.abs(st.y - y) < 34;
    return Math.hypot(st.x - x, st.y - y) < 30;
  }

  function distToSeg(x, y, s) {
    return projectT(s, { x, y }).d;
  }

  function buildTap(x, y) {
    const a = state.airport;
    if (state.tool === 'erase') {
      const tryRemove = (arr, test) => {
        for (let i = arr.length - 1; i >= 0; i--) {
          if (test(arr[i])) {
            pushUndo();
            arr.splice(i, 1);
            return true;
          }
        }
        return false;
      };
      const removed =
        tryRemove(a.signs, (s) => Math.hypot(s.x - x, s.y - y) < 32) ||
        tryRemove(a.stamps, (st) => st.type !== 'star_hub' && st.type !== 'square_dome' && stampHit(st, x, y)) ||
        tryRemove(a.taxiRoads, (t) => distToSeg(x, y, t) < 14) ||
        tryRemove(a.runways, (r) => distToSeg(x, y, r) < 24) ||
        tryRemove(a.stamps, (st) => stampHit(st, x, y));
      if (removed) {
        Sound.erase();
        addRipple(x, y, '#f43f5e');
        commit();
      } else {
        say('🧽', 'Nothing there', 'Tap right on a road, building, or sign to erase it.');
      }
      return;
    }
    if (state.tool === 'dome') {
      pushUndo();
      const type = state.domeStamp;
      const count = a.stamps.filter((s) => s.type === 'star_hub' || s.type === 'square_dome' || s.type === 'midfield' || s.type === 'crescent').length;
      const st = { id: 'u' + Date.now() + Math.floor(Math.random() * 1000), type, x, y };
      if (type === 'star_6') Object.assign(st, { type: 'star_hub', label: 'T' + (count + 1), arms: 6, radius: 260 });
      else if (type === 'star_4') Object.assign(st, { type: 'star_hub', label: 'T' + (count + 1), arms: 4, radius: 210 });
      else if (type === 'star_3') Object.assign(st, { type: 'star_hub', label: 'T' + (count + 1), arms: 3, radius: 180 });
      else if (type === 'square_dome') Object.assign(st, { label: 'T' + (count + 1), width: 130, height: 95 });
      else if (type === 'midfield') Object.assign(st, { label: 'T' + (count + 1) + ' Satellite', width: 150, height: 60 });
      else if (type === 'crescent') Object.assign(st, { label: 'T' + (count + 1) + ' Crescent', radius: 100 });
      else if (type === 'round_dome') Object.assign(st, { label: 'Grand Dome', radius: 46 });
      else if (type === 'gate') st.label = 'G' + (a.stamps.filter((s) => s.type === 'gate').length + 1);
      else if (type === 'cargo') st.label = 'CARGO';
      else if (type === 'helipad') st.label = 'H';
      else if (type === 'tower') st.label = 'TWR';
      a.stamps.push(st);
      Sound.pop();
      addRipple(x, y, '#38bdf8');
      commit();
      return;
    }
    if (state.tool === 'sign') {
      pushUndo();
      const def = SIGN_STAMPS.find((s) => s.id === state.signStamp) || SIGN_STAMPS[0];
      a.signs.push({ x, y, kind: def.kind, text: def.text });
      Sound.pop();
      addRipple(x, y, '#facc15');
      commit();
      return;
    }
    say('👷', 'Drag to draw!', 'Hold down and drag across the grass to draw.');
  }

  // ---------- DRAWING ----------
  function palette() {
    return state.night
      ? { ground: '#1d2b3a', stripe: '#203142', dot: 'rgba(255,255,255,0.05)', concrete: '#334155', road: '#2b3647', roadEdge: '#0f172a', asphalt: '#1e2533', building: '#1e3a5f', glass: '#fde68a', ink: '#0b1220', text: '#f8fafc' }
      : { ground: '#8fd16a', stripe: '#98d873', dot: 'rgba(0,0,0,0.06)', concrete: '#d9dee5', road: '#a7b0bc', roadEdge: '#475569', asphalt: '#3b4252', building: '#7cc7ff', glass: '#e0f2fe', ink: '#0f172a', text: '#0f172a' };
  }

  function drawGround(P) {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = P.ground;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.fillStyle = P.stripe;
    for (let x = 0; x < view.w; x += 120) ctx.fillRect(x, 0, 60, view.h);
    ctx.fillStyle = P.dot;
    for (let x = 20; x < view.w; x += 36) {
      for (let y = 20; y < view.h; y += 36) {
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawTrace() {
    if (!state.showTrace || !state.traceImg) return;
    const img = state.traceImg;
    const sc = Math.min(REF_W / img.width, REF_H / img.height);
    const w = img.width * sc;
    const h = img.height * sc;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#fffdf6';
    ctx.fillRect((REF_W - w) / 2, (REF_H - h) / 2, w, h);
    ctx.globalAlpha = state.traceOpacity;
    ctx.drawImage(img, (REF_W - w) / 2, (REF_H - h) / 2, w, h);
    ctx.restore();
  }

  function strokeSegs(segs, width, color, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    segs.forEach((s) => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawTaxiRoads(P, roads, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    strokeSegs(roads, 24, P.roadEdge);
    strokeSegs(roads, 18, P.road);
    if (state.night) {
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 8;
      strokeSegs(roads, 2.5, '#4ade80');
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#60a5fa';
      roads.forEach((s) => {
        const L = segLen(s);
        const nx = -(s.y2 - s.y1) / (L || 1);
        const ny = (s.x2 - s.x1) / (L || 1);
        for (let d = 0; d <= L; d += 34) {
          const x = s.x1 + (s.x2 - s.x1) * (d / (L || 1));
          const y = s.y1 + (s.y2 - s.y1) * (d / (L || 1));
          [-1, 1].forEach((side) => {
            ctx.beginPath();
            ctx.arc(x + nx * 11 * side, y + ny * 11 * side, 1.8, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      });
    } else {
      strokeSegs(roads, 2.5, '#facc15', [9, 7]);
    }
    ctx.restore();
  }

  function drawRunway(P, r, alpha = 1) {
    const L = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
    if (L < 2) return;
    const ang = Math.atan2(r.y2 - r.y1, r.x2 - r.x1);
    const W = 42;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(r.x1, r.y1);
    ctx.rotate(ang);
    // blast pads with chevrons
    [[-44, 1], [L, -1]].forEach(([px, dir]) => {
      ctx.fillStyle = state.night ? '#273041' : '#5b6474';
      ctx.fillRect(px, -W / 2 + 4, 44, W - 8);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      for (let c = 0; c < 3; c++) {
        const cx = dir === 1 ? px + 8 + c * 11 : px + 36 - c * 11;
        ctx.beginPath();
        ctx.moveTo(cx, -W / 2 + 9);
        ctx.lineTo(cx + 7 * dir, 0);
        ctx.lineTo(cx, W / 2 - 9);
        ctx.stroke();
      }
    });
    ctx.fillStyle = P.asphalt;
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(0, -W / 2, L, W, 6);
    ctx.fill();
    ctx.stroke();
    // piano keys
    ctx.fillStyle = '#f8fafc';
    [6, L - 30].forEach((px) => {
      for (let k = -3; k <= 3; k++) {
        if (k === 0) continue;
        ctx.fillRect(px, k * 5.2 - 1.6, 24, 3.2);
      }
    });
    // centerline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(90, 0);
    ctx.lineTo(L - 90, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    // night lights
    if (state.night) {
      for (let d = 0; d <= L; d += 30) {
        [-1, 1].forEach((side) => {
          ctx.fillStyle = '#fff7d6';
          ctx.shadowColor = '#fff7d6';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(d, side * (W / 2 - 2), 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.shadowBlur = 0;
      [[2, '#22c55e'], [L - 2, '#ef4444']].forEach(([px, col]) => {
        ctx.fillStyle = col;
        for (let k = -3; k <= 3; k++) {
          ctx.beginPath();
          ctx.arc(px, k * 6, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    // numbers
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 17px ui-rounded, "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (r.label1) {
      ctx.save();
      ctx.translate(58, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(r.label1, 0, 0);
      ctx.restore();
    }
    if (r.label2) {
      ctx.save();
      ctx.translate(L - 58, 0);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(r.label2, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawDomeGrid(x, y, r, P) {
    ctx.save();
    ctx.fillStyle = P.glass;
    if (state.night) { ctx.shadowColor = '#fde68a'; ctx.shadowBlur = 18; }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.clip();
    ctx.strokeStyle = state.night ? '#b45309' : '#0284c7';
    ctx.lineWidth = 1.4;
    const step = r / 3;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * step, y - r);
      ctx.lineTo(x + k * step, y + r);
      ctx.moveTo(x - r, y + k * step);
      ctx.lineTo(x + r, y + k * step);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    // shine
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.25, r * 0.12, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function labelPill(text, x, y, P, bg) {
    ctx.font = '900 13px ui-rounded, "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = bg || '#ffffff';
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 11, w, 22, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
  }

  function drawStamp(P, st) {
    ctx.save();
    ctx.lineJoin = 'round';
    if (st.type === 'star_hub') {
      const r = st.radius || 110;
      const arms = st.arms || 6;
      const centerApronR = Math.min(r * 0.35, 65) + 16;
      const centerDomeR = Math.min(r * 0.32, 58);
      const armLengths = Array.isArray(st.armLengths) ? st.armLengths : null;

      // 1. Center Apron concrete disc
      ctx.fillStyle = P.concrete;
      ctx.strokeStyle = P.roadEdge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(st.x, st.y, centerApronR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2. Concrete Apron Finger per Arm (leaves open grass/taxiways between concourses!)
      for (let i = 0; i < arms; i++) {
        const ang = (Array.isArray(st.armAngles) && st.armAngles[i] !== undefined) ? st.armAngles[i] : starAngle(i, arms);
        const armLen = (armLengths && armLengths[i]) || r;
        ctx.save();
        ctx.translate(st.x, st.y);
        ctx.rotate(ang);
        ctx.fillStyle = P.concrete;
        ctx.strokeStyle = P.roadEdge;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(centerDomeR * 0.55, -26, armLen - centerDomeR * 0.55 + 16, 52, 14);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 3. Concourse Finger Building Bodies, Skylights, and Jetbridges
      for (let i = 0; i < arms; i++) {
        const ang = (Array.isArray(st.armAngles) && st.armAngles[i] !== undefined) ? st.armAngles[i] : starAngle(i, arms);
        const armLen = (armLengths && armLengths[i]) || r;
        const concourseSpan = Math.max(30, armLen - centerDomeR - 20);
        const numGates = Math.max(1, Math.floor(concourseSpan / 44));

        ctx.save();
        ctx.translate(st.x, st.y);
        ctx.rotate(ang);

        // Building body
        ctx.fillStyle = P.building;
        ctx.strokeStyle = P.ink;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(centerDomeR * 0.7, -13, armLen - centerDomeR * 0.7, 26, 10);
        ctx.fill();
        ctx.stroke();

        // Skylights along center
        ctx.fillStyle = state.night ? '#fde68a' : '#ffffff';
        for (let w = centerDomeR + 15; w < armLen - 10; w += 20) {
          ctx.beginPath();
          ctx.arc(w, 0, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Attached Jetbridge Gates along BOTH flanks!
        for (let g = 1; g <= numGates; g++) {
          const d = centerDomeR + 14 + (g / (numGates + 1)) * concourseSpan;
          ctx.fillStyle = '#9ca3af';
          ctx.fillRect(d - 3, -20, 6, 8);
          ctx.fillRect(d - 3, 12, 6, 8);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(d - 8, -20); ctx.lineTo(d + 8, -20);
          ctx.moveTo(d - 8, 20); ctx.lineTo(d + 8, 20);
          ctx.stroke();
        }

        // Tip Gate at the end of the concourse
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(armLen - 2, -4, 8, 8);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(armLen + 6, -8); ctx.lineTo(armLen + 6, 8);
        ctx.stroke();

        ctx.restore();
      }

      // 4. Central Grand Glass Dome & Label
      drawDomeGrid(st.x, st.y, centerDomeR, P);
      labelPill(st.label || 'T1', st.x, st.y + centerDomeR + 14, P);
    } else if (st.type === 'square_dome') {
      const w = st.width || 130;
      const h = st.height || 95;
      ctx.fillStyle = P.concrete;
      ctx.strokeStyle = P.roadEdge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(st.x - w / 2 - 22, st.y - h / 2 - 22, w + 44, h + 44, 26);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = P.building;
      ctx.strokeStyle = P.ink;
      ctx.beginPath();
      ctx.roundRect(st.x - w / 2, st.y - h / 2, w, h, 20);
      ctx.fill();
      ctx.stroke();
      drawDomeGrid(st.x, st.y, Math.min(w, h) * 0.3, P);
      labelPill(st.label || 'T', st.x, st.y + h / 2 - 14, P);
    } else if (st.type === 'gate') {
      ctx.fillStyle = P.building;
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(st.x - 22, st.y - 40, 44, 16, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(st.x - 3, st.y - 24, 6, 12);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(st.x - 10, st.y - 8);
      ctx.lineTo(st.x + 10, st.y - 8);
      ctx.moveTo(st.x, st.y - 8);
      ctx.lineTo(st.x, st.y + 18);
      ctx.stroke();
      ctx.fillStyle = state.night ? '#f8fafc' : '#0f172a';
      ctx.font = '900 12px ui-rounded, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.label || '', st.x, st.y - 46);
    } else if (st.type === 'midfield') {
      const w = st.width || 150;
      const h = st.height || 60;
      ctx.fillStyle = P.concrete;
      ctx.strokeStyle = P.roadEdge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(st.x - w / 2 - 16, st.y - h / 2 - 16, w + 32, h + 32, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = P.building;
      ctx.strokeStyle = P.ink;
      ctx.beginPath();
      ctx.roundRect(st.x - w / 2, st.y - h / 2, w, h, 14);
      ctx.fill();
      ctx.stroke();
      // Little jetbridge stubs
      ctx.fillStyle = '#9ca3af';
      [[-w / 3, -h / 2 - 12], [w / 3, -h / 2 - 12], [-w / 3, h / 2], [w / 3, h / 2]].forEach(([dx, dy]) => {
        ctx.fillRect(st.x + dx - 4, st.y + dy, 8, 12);
      });
      labelPill(st.label || 'Satellite', st.x, st.y, P);
    } else if (st.type === 'crescent') {
      const r = st.radius || 100;
      ctx.fillStyle = P.concrete;
      ctx.strokeStyle = P.roadEdge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(st.x, st.y, r + 24, -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.stroke();
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(st.x, st.y, r, -Math.PI * 0.82, -Math.PI * 0.18);
      ctx.stroke();
      ctx.strokeStyle = P.building;
      ctx.lineWidth = 14;
      ctx.stroke();
      // Windows along the arc
      ctx.fillStyle = state.night ? '#fde68a' : '#ffffff';
      for (let a = -Math.PI * 0.8; a <= -Math.PI * 0.2; a += 0.18) {
        ctx.beginPath();
        ctx.arc(st.x + Math.cos(a) * r, st.y + Math.sin(a) * r, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      labelPill(st.label || 'Crescent', st.x, st.y - r - 22, P);
    } else if (st.type === 'round_dome') {
      drawDomeGrid(st.x, st.y, st.radius || 46, P);
      labelPill(st.label || 'Dome', st.x, st.y + (st.radius || 46) + 12, P);
    } else if (st.type === 'pier') {
      // Linear Concourse Pier
      const L = Math.hypot(st.x2 - st.x1, st.y2 - st.y1);
      if (L > 10) {
        const ang = Math.atan2(st.y2 - st.y1, st.x2 - st.x1);
        ctx.save();
        ctx.translate(st.x1, st.y1);
        ctx.rotate(ang);
        // Concrete apron base under the pier
        ctx.fillStyle = P.concrete;
        ctx.strokeStyle = P.roadEdge;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-12, -26, L + 24, 52, 16);
        ctx.fill();
        ctx.stroke();
        // Pier building body
        ctx.fillStyle = P.building;
        ctx.strokeStyle = P.ink;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(0, -12, L, 24, 10);
        ctx.fill();
        ctx.stroke();
        // Skylights along center
        ctx.fillStyle = state.night ? '#fde68a' : '#ffffff';
        for (let d = 20; d < L - 15; d += 22) {
          ctx.beginPath();
          ctx.arc(d, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // Attached Jetbridges along both sides!
        const numGates = Math.max(1, Math.floor(L / 42));
        for (let g = 1; g <= numGates; g++) {
          const d = (g / (numGates + 1)) * L;
          ctx.fillStyle = '#9ca3af';
          ctx.fillRect(d - 3, -20, 6, 8);
          ctx.fillRect(d - 3, 12, 6, 8);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(d - 8, -20); ctx.lineTo(d + 8, -20);
          ctx.moveTo(d - 8, 20); ctx.lineTo(d + 8, 20);
          ctx.stroke();
        }
        ctx.restore();
        labelPill(st.label || 'Pier', (st.x1 + st.x2) / 2, (st.y1 + st.y2) / 2, P);
      }
    } else if (st.type === 'free_poly' && st.points && st.points.length >= 3) {
      // Freehand Drawn Custom Terminal Building
      const pts = st.points;
      // Concrete Apron outline under the polygon
      ctx.fillStyle = P.concrete;
      ctx.strokeStyle = P.roadEdge;
      ctx.lineWidth = 14;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();

      // Main Building Body
      ctx.fillStyle = P.building;
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glass skylight highlights at centroid
      let cx = 0, cy = 0;
      pts.forEach((p) => { cx += p.x; cy += p.y; });
      cx /= pts.length;
      cy /= pts.length;
      ctx.fillStyle = state.night ? '#fde68a' : '#e0f2fe';
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = state.night ? '#b45309' : '#0284c7';
      ctx.lineWidth = 2;
      ctx.stroke();

      labelPill(st.label || 'Terminal', cx, cy, P);
    } else if (st.type === 'cargo') {
      ctx.fillStyle = state.night ? '#7c4a1e' : '#f59e0b';
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(st.x - 58, st.y - 30, 116, 60, 10);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(15,23,42,0.35)';
      ctx.lineWidth = 2;
      for (let k = -40; k <= 40; k += 16) {
        ctx.beginPath();
        ctx.moveTo(st.x + k, st.y - 26);
        ctx.lineTo(st.x + k, st.y + 26);
        ctx.stroke();
      }
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 2;
      [[-74, 10], [64, 14], [70, -4]].forEach(([dx, dy]) => {
        ctx.fillRect(st.x + dx, st.y + dy, 10, 10);
        ctx.strokeRect(st.x + dx, st.y + dy, 10, 10);
      });
      labelPill('📦 ' + (st.label || 'CARGO'), st.x, st.y, P);
    } else if (st.type === 'helipad') {
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(st.x, st.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(st.x, st.y, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px ui-rounded, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', st.x, st.y + 1);
    } else if (st.type === 'tower') {
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(st.x, st.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = state.night ? '#fde68a' : '#67e8f9';
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.lineTo(st.x + Math.cos(a) * 11, st.y + Math.sin(a) * 11);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (Math.floor(state.time * 2) % 2 === 0) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(st.x, st.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      labelPill('🗼 ' + (st.label || 'TWR'), st.x, st.y + 30, P);
    }
    ctx.restore();
  }

  function drawSign(P, s) {
    ctx.save();
    if (s.kind === 'compass') {
      ctx.translate(s.x, s.y);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(0, -24); ctx.lineTo(7, 0); ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, 24); ctx.lineTo(7, 0); ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 10px ui-rounded, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', 0, -36 + 0);
      ctx.fillText('36', 0, -38 + 50 + 30);
      ctx.restore();
      return;
    }
    if (s.kind === 'wind') {
      ctx.translate(s.x, s.y);
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 12); ctx.lineTo(0, -16);
      ctx.stroke();
      ctx.rotate(Math.sin(state.time * 3) * 0.15);
      const cols = ['#f97316', '#ffffff', '#f97316', '#ffffff'];
      cols.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        const x0 = i * 10;
        const h0 = 9 - i * 1.6;
        const h1 = 9 - (i + 1) * 1.6;
        ctx.moveTo(x0, -16 - h0); ctx.lineTo(x0 + 10, -16 - h1);
        ctx.lineTo(x0 + 10, -16 + h1); ctx.lineTo(x0, -16 + h0);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      ctx.restore();
      labelPill(s.text || 'WIND', s.x, s.y + 24, P);
      return;
    }
    const colors = {
      location: { bg: '#0f172a', fg: '#facc15', border: '#facc15' },
      direction: { bg: '#facc15', fg: '#0f172a', border: '#0f172a' },
      mandatory: { bg: '#dc2626', fg: '#ffffff', border: '#ffffff' },
    }[s.kind] || { bg: '#facc15', fg: '#0f172a', border: '#0f172a' };
    ctx.font = '900 13px ui-monospace, Menlo, monospace';
    const w = ctx.measureText(s.text).width + 16;
    ctx.fillStyle = '#334155';
    ctx.fillRect(s.x - w / 2 + 6, s.y + 10, 3, 8);
    ctx.fillRect(s.x + w / 2 - 9, s.y + 10, 3, 8);
    ctx.fillStyle = colors.bg;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(s.x - w / 2, s.y - 12, w, 24, 5);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(s.x - w / 2 + 3, s.y - 9, w - 6, 18, 3);
    ctx.stroke();
    ctx.fillStyle = colors.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.text, s.x, s.y + 1);
    ctx.restore();
  }

  function drawSpots() {
    const p = selectedPlane();
    if (state.mode !== 'fly' || !commandable(p)) return;
    const pulse = 1 + Math.sin(state.time * 5) * 0.12;
    state.spots.forEach((s) => {
      if (spotTaken(s.key, p)) return;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 15px ui-rounded, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', 0, 1);
      ctx.restore();
    });
  }

  function drawPaths() {
    state.planes.forEach((p) => {
      if (p.status !== 'taxi' || !p.path.length) return;
      const sel = p.uid === state.selected;
      ctx.save();
      ctx.strokeStyle = sel ? '#facc15' : 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = sel ? 5 : 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([2, 10]);
      ctx.lineDashOffset = -state.time * 30;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      p.path.forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawPlane(P, p) {
    const ground = 0.62;
    const sc = ground * (1 + p.alt * 0.75);
    const off = 3 + p.alt * 45;
    ctx.save();
    ctx.translate(p.x + off * 0.6, p.y + off);
    ctx.rotate(p.angle);
    ctx.fillStyle = `rgba(15, 23, 42, ${0.28 - p.alt * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(-p.def.length * 0.1 * sc, 0, p.def.length * 0.5 * sc, p.def.bodyWidth * 0.5 * sc, 0, 0, Math.PI * 2);
    ctx.ellipse(-p.def.length * 0.2 * sc, 0, p.def.length * 0.12 * sc, p.def.wingspan * 0.95 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    drawCartoonPlaneShape(ctx, p.def, {
      scale: sc,
      isSelected: p.uid === state.selected && p.alt < 0.3,
      isNight: state.night,
      isFlying: p.alt > 0,
    });
    ctx.restore();
    if (p.uid === state.selected && p.alt < 0.3) {
      labelPill(p.def.shortName, p.x, p.y - p.def.wingspan * sc - 18, P, '#fef08a');
    }
  }

  function drawClouds(dt) {
    if (state.night) return;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    clouds.forEach((c) => {
      c.x += c.speed * dt;
      if (c.x > view.w + 150) c.x = -150;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.07)';
      [[0, 0, 1], [0.8, 0.15, 0.75], [-0.8, 0.2, 0.7]].forEach(([dx, dy, r]) => {
        ctx.beginPath();
        ctx.arc(c.x + dx * c.size + 40, c.y + dy * c.size + 60, c.size * r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      [[0, 0, 1], [0.8, 0.15, 0.75], [-0.8, 0.2, 0.7]].forEach(([dx, dy, r]) => {
        ctx.beginPath();
        ctx.arc(c.x + dx * c.size, c.y + dy * c.size, c.size * r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  function drawDragPreview(P) {
    const d = state.drag;
    if (!d) return;
    if (d.tool === 'runway') {
      const labels = runwayLabels(d.x1, d.y1, d.x2, d.y2);
      drawRunway(P, { ...d, ...labels }, 0.7);
      const len = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
      labelPill(len < 160 ? 'Keep dragging… ✈️' : `Runway ${labels.label1}/${labels.label2} ✓`, (d.x1 + d.x2) / 2, (d.y1 + d.y2) / 2 - 40, P, len < 160 ? '#fecaca' : '#bbf7d0');
    } else if (d.tool === 'pier') {
      // Preview dragged concourse pier
      const L = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
      const ang = Math.atan2(d.y2 - d.y1, d.x2 - d.x1);
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.translate(d.x1, d.y1);
      ctx.rotate(ang);
      ctx.fillStyle = P.concrete;
      ctx.fillRect(-10, -24, L + 20, 48);
      ctx.fillStyle = P.building;
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(0, -12, L, 24, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      labelPill(L < 60 ? 'Drag longer pier…' : 'Concourse Pier ✓', (d.x1 + d.x2) / 2, (d.y1 + d.y2) / 2 - 32, P, L < 60 ? '#fecaca' : '#bbf7d0');
    } else {
      drawTaxiRoads(P, [d], 0.75);
    }
  }

  function drawRipples(dt) {
    state.ripples.forEach((r) => { r.t += dt; });
    state.ripples = state.ripples.filter((r) => r.t < 0.6);
    state.ripples.forEach((r) => {
      ctx.save();
      ctx.globalAlpha = 1 - r.t / 0.6;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 10 + r.t * 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // Draw and update explosion particles
    state.explosions.forEach((ex) => {
      ex.life += dt;
      ex.x += ex.vx * dt;
      ex.y += ex.vy * dt;
    });
    state.explosions = state.explosions.filter((ex) => ex.life < ex.maxLife);
    state.explosions.forEach((ex) => {
      const alpha = 1 - ex.life / ex.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ex.color;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r * (1 + ex.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.time += dt;
    updatePlanes(dt);

    const P = palette();
    drawGround(P);
    ctx.setTransform(view.dpr * view.s, 0, 0, view.dpr * view.s, view.dpr * view.ox, view.dpr * view.oy);
    drawTrace();
    const a = state.airport;
    const isBigTerminal = (s) => ['star_hub', 'square_dome', 'midfield', 'crescent', 'pier', 'free_poly'].includes(s.type);
    a.stamps.filter(isBigTerminal).forEach((s) => drawStamp(P, s));
    drawTaxiRoads(P, a.taxiRoads);
    a.runways.forEach((r) => drawRunway(P, r));
    a.stamps.filter((s) => !isBigTerminal(s)).forEach((s) => drawStamp(P, s));
    a.signs.forEach((s) => drawSign(P, s));
    drawSpots();
    drawPaths();
    [...state.planes].sort((p, q) => p.alt - q.alt).forEach((p) => drawPlane(P, p));
    drawDragPreview(P);

    // Live preview of freehand drawing stroke
    if (state.freeStroke && state.freeStroke.length >= 2) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(state.freeStroke[0].x, state.freeStroke[0].y);
      for (let i = 1; i < state.freeStroke.length; i++) {
        ctx.lineTo(state.freeStroke[i].x, state.freeStroke[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
    drawRipples(dt);
    drawClouds(dt);
    requestAnimationFrame(frame);
  }

  // ---------- UI WIRING ----------
  function setMode(mode) {
    state.mode = mode;
    state.drag = null;
    $('btnFly').classList.toggle('active', mode === 'fly');
    $('btnBuild').classList.toggle('active', mode === 'build');
    $('flyDock').classList.toggle('hidden', mode !== 'fly');
    const isBuild = mode === 'build';
    $('buildDock').classList.toggle('hidden', !isBuild);
    if (!isBuild) {
      $('buildDock').classList.remove('collapsed');
      $('btnExpandDock').classList.add('hidden');
    }
    updateTray();
    resize();
    if (mode === 'fly') {
      say('🧑‍✈️', 'Fly Planes!', 'Tap a plane, then tap a glowing P gate. Or press Land New Plane!');
    } else {
      say('👷', 'Build Mode!', 'Pick a tool at the bottom. Drag to draw runways and roads! (Tab to hide tools)');
    }
  }

  function setTool(tool) {
    state.tool = tool;
    document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
    updateTray();
    const hints = {
      runway: ['🛫', 'Runway', 'Drag a long line across the grass. The numbers appear by magic!'],
      taxi: ['🛣️', 'Taxi Road', 'Drag to draw a road. It snaps onto runways and other roads.'],
      free_building: ['🎨', 'Magic Pen', 'Draw any building shape or outline on the grass with your finger/mouse!'],
      pier: ['✏️', 'Draw Pier', 'Drag across the grass to build a long Concourse Pier with gates on both sides!'],
      dome: ['🏢', 'Buildings', 'Pick a building above, then tap the grass to place it!'],
      sign: ['🪧', 'Signs', 'Pick a sign above, then tap to stick it on the map!'],
      erase: ['🧽', 'Eraser', 'Tap anything to make it disappear!'],
    };
    say(...hints[tool]);
  }

  function updateTray() {
    const tray = $('tray');
    const show = state.mode === 'build' && (state.tool === 'dome' || state.tool === 'sign');
    tray.classList.toggle('hidden', !show);
    $('tracePanel').classList.toggle('hidden', !(state.mode === 'build' && state.showTrace));
    if (!show) return;
    const items = state.tool === 'dome' ? DOME_STAMPS : SIGN_STAMPS;
    const current = state.tool === 'dome' ? state.domeStamp : state.signStamp;
    tray.innerHTML = '';
    items.forEach((it) => {
      const b = document.createElement('button');
      b.className = 'chip' + (it.id === current ? ' active' : '');
      if (state.tool === 'dome') {
        b.textContent = it.label;
      } else {
        const swatch = { location: 'sw-loc', direction: 'sw-dir', mandatory: 'sw-man' }[it.kind];
        b.innerHTML = swatch ? `<span class="swatch ${swatch}">${it.text}</span>` : it.label;
      }
      b.onclick = () => {
        if (state.tool === 'dome') state.domeStamp = it.id;
        else state.signStamp = it.id;
        Sound.pop();
        updateTray();
      };
      tray.appendChild(b);
    });
  }

  function openHangar() {
    const grid = $('hangarGrid');
    grid.innerHTML = '';
    PLANE_FLEET.forEach((def) => {
      const card = document.createElement('div');
      card.className = 'card ' + (def.maker === 'Airbus' ? 'airbus' : 'boeing');
      const seen = state.seen[def.id] || 0;
      card.innerHTML = `
        <div class="maker">${def.maker.toUpperCase()}</div>
        <div class="pname">${def.name}</div>
        <canvas width="160" height="120"></canvas>
        <div class="tag">${def.sizeTag}</div>
        <div class="fact">${def.funFact}</div>
        <div class="seen">${seen ? '✅ Landed ' + seen + '×' : '❔ Not landed yet'}</div>
        <button class="flybtn">🛬 Fly this plane!</button>`;
      const c = card.querySelector('canvas');
      const cx = c.getContext('2d');
      cx.translate(80, 62);
      cx.rotate(-Math.PI / 2);
      drawCartoonPlaneShape(cx, def, { scale: 1.45 });
      card.querySelector('.flybtn').onclick = () => {
        closeHangar();
        setMode('fly');
        landPlane(def.id);
      };
      grid.appendChild(card);
    });
    $('hangar').classList.remove('hidden');
    Sound.pop();
  }

  function closeHangar() {
    $('hangar').classList.add('hidden');
  }

  function init() {
    loadProgress();
    $('starCount').textContent = state.stars;

    const picker = $('airportPicker');
    Object.values(STARTER_AIRPORTS).forEach((ap) => {
      const o = document.createElement('option');
      o.value = ap.id;
      o.textContent = ap.name;
      picker.appendChild(o);
    });
    picker.value = state.airportId;
    picker.onchange = () => { loadAirport(picker.value); Sound.pop(); };

    $('btnFly').onclick = () => setMode('fly');
    $('btnBuild').onclick = () => setMode('build');
    $('btnNight').onclick = () => {
      state.night = !state.night;
      $('btnNight').textContent = state.night ? '🌙' : '☀️';
      Sound.pop();
      say(state.night ? '🦉' : '☀️', state.night ? 'Night lights ON!' : 'Sunny day!', state.night
        ? 'Look at the green taxi lights and glowing runway edges!'
        : 'Clear blue skies for flying!');
    };
    $('btnHangar').onclick = openHangar;
    $('hangarClose').onclick = closeHangar;
    $('btnLand').onclick = () => landPlane();
    $('btnTakeoff').onclick = takeOff;

    document.querySelectorAll('.tool').forEach((b) => {
      b.onclick = () => { setTool(b.dataset.tool); Sound.pop(); };
    });
    $('btnTrace').onclick = () => {
      state.showTrace = !state.showTrace;
      $('btnTrace').classList.toggle('active', state.showTrace);
      updateTray();
      Sound.pop();
      say('📷', state.showTrace ? 'Your drawing is ON!' : 'Drawing hidden', state.showTrace
        ? 'Trace over your pencil lines with runways, roads and buildings!'
        : 'Back to the cartoon grass.');
    };
    $('traceOpacity').oninput = (e) => { state.traceOpacity = e.target.value / 100; };

    // Sample sketch buttons for quick preview and AI testing
    document.querySelectorAll('.sample-btn').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('.sample-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        loadTrace(btn.dataset.src);
        state.showTrace = true;
        $('btnTrace').classList.add('active');
        Sound.pop();
        say('📷', 'Drawing Switched!', `Viewing ${btn.innerText}. Tap [✨ AI Auto-Build from Photo] to analyze!`);
      };
    });

    $('traceUpload').onchange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      document.querySelectorAll('.sample-btn').forEach((b) => b.classList.remove('active'));
      if (state.customTraceUrl) URL.revokeObjectURL(state.customTraceUrl);
      state.customTraceUrl = URL.createObjectURL(f);
      loadTrace(state.customTraceUrl);
      state.lastUploadedFile = f;
      state.showTrace = true;
      $('btnTrace').classList.add('active');
      updateTray();
      Sound.chime();
      say('📷', 'New Drawing Loaded!', 'Tap [✨ AI Auto-Build from Photo] to magically generate the airport!');
    };

    // AI Auto-Build from Photo Feature using Gemini Vision with Retry & Resilience
    async function analyzeWithGemini(apiKey, base64Image, onStatus) {
      const prompt = `You are an expert aviation architect converting a child's hand-drawn airport blueprint sketch into a playable 2D vector coordinate map.
The coordinate space is width 1200 by height 720 (X from 50 to 1150, Y from 50 to 670). Center is (600, 360).

CRITICAL ARCHITECTURAL RULES & PROPORTIONS:
1. RETAIN TRUE GEOMETRY & PROPORTIONS:
   - Scale features proportionally across the whole 1200x720 canvas. Do not shrink large complexes into tiny stubby shapes.
   - Runways: Detect their full length spanning from edge to edge.
     * In dual vertical runway designs (like the sketch), Left runway runs near x: 70-120 (y: 60 to 660, heading '18R'/'36L'). Right runway runs near x: 1080-1130 (y: 60 to 660, heading '18L'/'36R').
   - Taxiway networks: Connect runway thresholds and exits to parallel taxiways and concourse aprons.

2. STAR TERMINALS & MULTI-CONCOURSE PIERS (HIGH FIDELITY):
   - When the drawing shows a large multi-arm / multi-concourse terminal (such as a 6-concourse star hub with dozens of gates radiating outward):
     * Option A (Star Hub): Output type 'star_hub' at center (e.g. x: 600, y: 360) with:
       "arms": 6,
       "radius": 280 to 350 (MUST BE LARGE so the arms stretch across the apron toward the runways, exactly like the drawing!),
       "label": "Terminal 1 - Central Hub & Hotel"
     * Option B (Concourse Piers): Or output the central spine/hall as type 'square_dome' (x: 600, y: 360, width: 120, height: 180, label: "Terminal / Hotel"), AND output each radiating finger as type 'pier' with start (x1, y1) at the center and end (x2, y2) extending out (e.g. concourses stretching NW, W, SW, NE, E, SE).
     * DO NOT generate random disconnected crescent or trapezoid buildings around the star hub unless clearly drawn as separate standalone satellite terminals!
     * If the drawing has special aprons or facilities (e.g., 'MIL' military apron at bottom-right), include type 'cargo' (x: 1040, y: 585, label: "MIL Apron").

3. BUILDING TYPES:
   - 'star_hub': { id, type: 'star_hub', x, y, arms: 4..8, radius: 240..350, label }
   - 'pier': { id, type: 'pier', x1, y1, x2, y2, label } (for long linear concourse fingers with gates on both sides)
   - 'square_dome': { id, type: 'square_dome', x, y, width: 100..200, height: 70..180, label }
   - 'tower': { id, type: 'tower', x, y, label: 'TWR' }
   - 'cargo': { id, type: 'cargo', x, y, label } (for cargo / military / maintenance aprons)
   - 'helipad': { id, type: 'helipad', x, y, label: 'H' }

Respond ONLY with valid, raw JSON (no markdown formatting, no backticks, no markdown fence):
{
  "runways": [
    {"id":"r1", "x1":70, "y1":60, "x2":70, "y2":660, "label1":"18R", "label2":"36L"},
    {"id":"r2", "x1":1130, "y1":60, "x2":1130, "y2":660, "label1":"18L", "label2":"36R"}
  ],
  "taxiRoads": [
    {"x1":130, "y1":60, "x2":130, "y2":660},
    {"x1":1070, "y1":60, "x2":1070, "y2":660}
  ],
  "stamps": [
    {"id":"hub", "type":"star_hub", "x":600, "y":360, "arms":6, "radius":310, "label":"Terminal 1 - Central Hub & Hotel"},
    {"id":"mil", "type":"cargo", "x":1040, "y":585, "label":"MIL Apron"}
  ],
  "signs": [
    {"x":145, "y":100, "kind":"location", "text":"A1"}
  ]
}`;

      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const mime = (base64Image.match(/^data:(image\/\w+);base64,/) || [])[1] || 'image/png';

      // Resilience cascade: healthy models first, with fallbacks across flash variants
      const models = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
      const maxAttempts = 4;
      let lastError = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const modelName = models[Math.min(attempt - 1, models.length - 1)];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const payload = {
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mime, data: cleanBase64 } }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        };

        try {
          if (attempt > 1 && onStatus) {
            onStatus(`Traffic spike! Retrying with ${modelName} (Attempt ${attempt}/${maxAttempts})...`);
          }

          // AbortController with 25s timeout to avoid indefinite hangs during spikes
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            const errMsg = errJson.error?.message || `HTTP ${res.status}`;
            const status = res.status;

            // Retry on 429 (Rate Limit / Quota Spike), 503 (Overloaded), 500, 502, 504
            const isRetryable = status === 429 || status === 500 || status === 502 || status === 503 || status === 504 ||
              /spike|overload|quota|resource exhausted|unavailable|capacity|busy/i.test(errMsg);

            if (isRetryable && attempt < maxAttempts) {
              const backoffMs = Math.round(Math.pow(2, attempt - 1) * 1200 + Math.random() * 800);
              const waitSec = (backoffMs / 1000).toFixed(1);
              console.warn(`[Gemini Spike] Attempt ${attempt} HTTP ${status}: ${errMsg}. Retrying in ${waitSec}s...`);
              if (onStatus) {
                onStatus(`Gemini servers busy. Retrying in ${waitSec}s (Attempt ${attempt + 1}/${maxAttempts})...`);
              }
              await new Promise((r) => setTimeout(r, backoffMs));
              continue;
            }

            throw new Error(errMsg);
          }

          const resData = await res.json();
          const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) throw new Error("Empty response from Gemini Vision");
          const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleaned);

        } catch (err) {
          lastError = err;
          const isAbort = err.name === 'AbortError';
          const isNetwork = !navigator.onLine || /network|failed to fetch/i.test(err.message || '');
          const isTransient = isAbort || isNetwork;

          if (isTransient && attempt < maxAttempts) {
            const backoffMs = Math.round(Math.pow(2, attempt - 1) * 1500 + Math.random() * 600);
            const waitSec = (backoffMs / 1000).toFixed(1);
            console.warn(`[Gemini Transient Error] Attempt ${attempt}: ${err.message}. Retrying in ${waitSec}s...`);
            if (onStatus) {
              onStatus(`Connection busy. Retrying in ${waitSec}s (Attempt ${attempt + 1}/${maxAttempts})...`);
            }
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }

          if (attempt >= maxAttempts) {
            break;
          }
        }
      }

      throw lastError || new Error("Failed to reach Gemini AI after retries.");
    }

    // Modal UI for AI Settings
    const aiModal = $('aiModal');
    const aiSettingsBtn = $('btnAiSettings');
    const aiModalClose = $('aiModalClose');
    const saveApiKeyBtn = $('btnSaveApiKey');
    const apiKeyInput = $('geminiApiKeyInput');

    function getSavedApiKey() {
      return localStorage.getItem('aerosketch:gemini_key') || window.GEMINI_API_KEY || '';
    }

    if (aiSettingsBtn && aiModal) {
      aiSettingsBtn.onclick = () => {
        apiKeyInput.value = getSavedApiKey();
        aiModal.classList.remove('hidden');
      };
      if (aiModalClose) aiModalClose.onclick = () => aiModal.classList.add('hidden');
      if (saveApiKeyBtn) {
        saveApiKeyBtn.onclick = () => {
          const k = apiKeyInput.value.trim();
          localStorage.setItem('aerosketch:gemini_key', k);
          aiModal.classList.add('hidden');
          Sound.chime();
          say('🔑', 'AI Key Saved!', 'Gemini Vision AI is ready to analyze your airport drawings!');
        };
      }
    }

    const aiBtn = $('btnAiBuild');
    if (aiBtn) {
      aiBtn.onclick = async () => {
        if (!state.traceImg) {
          Sound.oops();
          say('📷', 'Upload a drawing first!', 'Click a sample sketch or [📁 Upload Photo] first.');
          return;
        }

        const apiKey = getSavedApiKey();
        if (!apiKey) {
          Sound.oops();
          if (aiModal) {
            apiKeyInput.value = '';
            aiModal.classList.remove('hidden');
          }
          say('🔑', 'Gemini API Key Needed', 'Please enter your free Google Gemini API Key so the AI can analyze your drawing!');
          return;
        }

        const loadingOverlay = $('aiLoadingOverlay');
        const titleEl = $('aiLoadingTitle');
        const subEl = $('aiLoadingSub');
        if (titleEl) titleEl.textContent = 'Gemini AI Vision Analyzing Sketch...';
        if (subEl) subEl.textContent = 'Scanning runways, magnetic headings, taxiways, and terminal concourses from your photo...';
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
        Sound.streak();
        say('🤖', 'Gemini AI Vision Analyzing...', 'AI is scanning runways, concourse piers, domes, and taxiways from your photo...');

        try {
          // Convert current trace image to base64
          const cvs = document.createElement('canvas');
          const maxDim = 1200;
          let w = state.traceImg.width || 800;
          let h = state.traceImg.height || 600;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
            else { w = Math.round((w * maxDim) / h); h = maxDim; }
          }
          cvs.width = w;
          cvs.height = h;
          const ctxOff = cvs.getContext('2d');
          ctxOff.drawImage(state.traceImg, 0, 0, w, h);
          const base64 = cvs.toDataURL('image/jpeg', 0.85);

          const onStatus = (msg) => {
            if (subEl) subEl.textContent = msg;
            say('🤖', 'AI Busy — Retrying', msg);
          };

          const generated = await analyzeWithGemini(apiKey, base64, onStatus);

          if (!generated || (!generated.runways && !generated.stamps && !generated.taxiRoads)) {
            throw new Error("No airport features detected in drawing");
          }

          // Format output safely
          const blueprint = {
            runways: (generated.runways || []).map((r, i) => ({
              id: r.id || 'r' + i,
              x1: Math.round(r.x1), y1: Math.round(r.y1),
              x2: Math.round(r.x2), y2: Math.round(r.y2),
              label1: r.label1 || '09', label2: r.label2 || '27'
            })),
            taxiRoads: (generated.taxiRoads || []).map(t => ({
              x1: Math.round(t.x1), y1: Math.round(t.y1),
              x2: Math.round(t.x2), y2: Math.round(t.y2)
            })),
            stamps: (generated.stamps || []).map((s, i) => {
              const x1 = s.x1 !== undefined ? Math.round(s.x1) : undefined;
              const y1 = s.y1 !== undefined ? Math.round(s.y1) : undefined;
              const x2 = s.x2 !== undefined ? Math.round(s.x2) : undefined;
              const y2 = s.y2 !== undefined ? Math.round(s.y2) : undefined;
              const defaultX = (x1 !== undefined && x2 !== undefined) ? Math.round((x1 + x2) / 2) : 600;
              const defaultY = (y1 !== undefined && y2 !== undefined) ? Math.round((y1 + y2) / 2) : 360;
              return {
                id: s.id || 'st' + i,
                type: s.type || 'square_dome',
                x: s.x !== undefined ? Math.round(s.x) : defaultX,
                y: s.y !== undefined ? Math.round(s.y) : defaultY,
                label: s.label || 'T' + (i + 1),
                arms: s.arms || 6,
                radius: s.radius ? Math.round(s.radius) : (s.type === 'star_hub' ? 300 : 110),
                width: s.width || 130,
                height: s.height || 95,
                armLengths: Array.isArray(s.armLengths) ? s.armLengths.map(Number) : undefined,
                armAngles: Array.isArray(s.armAngles) ? s.armAngles.map(Number) : undefined,
                x1, y1, x2, y2,
              };
            }),
            signs: generated.signs || []
          };

          pushUndo();
          state.airport = blueprint;
          state.planes = [];
          state.selected = null;
          commit();
          Sound.chime();
          say('✨', 'AI Blueprint Generated!', `Rebuilt ${blueprint.runways.length} runways, ${blueprint.taxiRoads.length} taxiways, and ${blueprint.stamps.length} buildings from your photo!`);
        } catch (err) {
          console.error("Gemini Vision AI Error:", err);
          Sound.oops();
          say('⚠️', 'AI Vision Error', err.message || 'Could not analyze drawing. Check your API key or network.');
        } finally {
          if (loadingOverlay) loadingOverlay.classList.add('hidden');
        }
      };
    }
    $('btnUndo').onclick = () => {
      const prev = state.undo.pop();
      if (!prev) { Sound.oops(); say('↩️', 'Nothing to undo', 'You haven\'t built anything new yet.'); return; }
      state.airport = JSON.parse(prev);
      commit();
      Sound.erase();
    };

    // Save airport design as JSON file to computer
    const saveBtn = $('btnSaveAirport');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const json = JSON.stringify(state.airport, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (state.airportId || 'my-airport') + '-blueprint.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Sound.streak();
        say('💾', 'Airport Saved!', 'Your airport blueprint was saved as a file on your computer!');
      };
    }

    // Load airport design from computer JSON file
    const loadBtn = $('btnLoadAirport');
    const fileInput = $('airportFileInput');
    if (loadBtn && fileInput) {
      loadBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (data && (data.runways || data.taxiRoads || data.stamps)) {
              pushUndo();
              state.airport = {
                runways: data.runways || [],
                taxiRoads: data.taxiRoads || [],
                stamps: data.stamps || [],
                signs: data.signs || [],
              };
              commit();
              Sound.chime();
              say('📂', 'Airport Loaded!', 'Successfully opened your custom airport blueprint!');
            }
          } catch (err) {
            Sound.oops();
            say('⚠️', 'Could not open file', 'Make sure it is a valid .json airport file.');
          }
        };
        reader.readAsText(file);
      };
    }

    $('btnReset').onclick = () => {
      if (!confirm('Start this airport over from the beginning?')) return;
      localStorage.removeItem('aerosketch:airport:' + state.airportId);
      loadAirport(state.airportId);
    };

    const tryAgainBtn = $('btnTryAgain');
    if (tryAgainBtn) {
      tryAgainBtn.onclick = () => {
        state.lives = 3;
        updateLivesDisplay();
        $('crashOverlay').classList.add('hidden');
        loadAirport(state.airportId);
        Sound.streak();
        say('💪', 'Safety Team Ready!', '"Runways are clear! Let\'s guide planes safely to their gates!"');
      };
    }

    // Dismiss pilot bubble on close button or click
    const bubbleClose = $('pilotBubbleClose');
    if (bubbleClose) {
      bubbleClose.onclick = (e) => {
        e.stopPropagation();
        $('pilotBubble').classList.add('hidden-bubble');
      };
    }
    $('pilotBubble').onclick = () => $('pilotBubble').classList.add('hidden-bubble');

    // Camera HUD controls
    $('btnZoomIn').onclick = () => zoomBy(1.2);
    $('btnZoomOut').onclick = () => zoomBy(0.83);
    $('btnResetCam').onclick = resetCamera;

    // Zen Mode toggle
    function toggleZen() {
      document.body.classList.toggle('zen-mode');
      const isZen = document.body.classList.contains('zen-mode');
      $('btnExitZen').classList.toggle('hidden', !isZen);
      Sound.pop();
    }
    $('btnZen').onclick = toggleZen;
    $('btnExitZen').onclick = toggleZen;

    // Dock Collapse / Expand toggle
    function toggleDock(collapse) {
      const bd = $('buildDock');
      const eb = $('btnExpandDock');
      const isCollapsed = collapse !== undefined ? collapse : !bd.classList.contains('collapsed');
      bd.classList.toggle('collapsed', isCollapsed);
      eb.classList.toggle('hidden', !isCollapsed);
      Sound.pop();
    }
    $('btnCollapseDock').onclick = () => toggleDock(true);
    $('btnExpandDock').onclick = () => toggleDock(false);

    // Keyboard shortcuts: Space (Pan), Tab (Toggle dock), Z (Zen view)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT') {
        state.spaceDown = true;
        canvas.style.cursor = 'grab';
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (state.mode === 'build') toggleDock();
      }
      if ((e.key === 'z' || e.key === 'Z') && document.activeElement.tagName !== 'INPUT') {
        toggleZen();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        state.spaceDown = false;
        canvas.style.cursor = '';
      }
    });

    window.addEventListener('resize', resize);
    resize();
    loadAirport(state.airportId);
    setMode('fly');
    say('🧑‍✈️', 'Welcome to AeroSketch!', 'Tap a plane, then tap a glowing P to park it. Or press 🛬 Land New Plane!');
    requestAnimationFrame(frame);
  }

  init();
})();

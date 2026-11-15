// Gentle, kid-friendly sound effects made with the Web Audio API (no files needed)
const Sound = (() => {
  let ac = null;
  let muted = false;

  function audio() {
    if (muted) return null;
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone(freq, dur, type = 'sine', vol = 0.12, slideTo = null, delay = 0) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, f1, f2, vol) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(f1, t);
    f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t);
    src.stop(t + dur);
  }

  return {
    pop: () => tone(520, 0.12, 'triangle', 0.15, 880),
    blip: () => {
      tone(1200, 0.06, 'square', 0.035);
      tone(1500, 0.06, 'square', 0.035, null, 0.08);
    },
    chime: () => [660, 880, 1320].forEach((f, i) => tone(f, 0.28, 'sine', 0.12, null, i * 0.1)),
    whoosh: () => noise(2.4, 250, 2600, 0.2),
    land: () => {
      noise(0.5, 900, 250, 0.14);
      tone(160, 0.25, 'sine', 0.08);
    },
    erase: () => tone(420, 0.16, 'sawtooth', 0.05, 140),
    crash: () => {
      noise(1.6, 1800, 80, 0.35);
      tone(220, 0.9, 'sawtooth', 0.12, 40);
    },
    alarm: () => {
      tone(880, 0.16, 'square', 0.05);
      tone(660, 0.16, 'square', 0.05, null, 0.2);
    },
    streak: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, null, i * 0.09)),
    oops: () => {
      tone(320, 0.14, 'triangle', 0.1);
      tone(230, 0.2, 'triangle', 0.1, null, 0.15);
    },
    setMuted: (m) => { muted = m; },
    isMuted: () => muted,
  };
})();

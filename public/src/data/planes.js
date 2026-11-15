// 12 Airbus & Boeing Fleet + Cartoon Top-Down Renderer

const PLANE_FLEET = [
  // AIRBUS FLEET
  {
    id: 'a380',
    maker: 'Airbus',
    name: 'A380-800 Super',
    shortName: 'A380 Super',
    sizeTag: 'Super Jumbo ⭐',
    engines: 4,
    wingspan: 36,
    length: 44,
    bodyWidth: 13,
    color: '#38bdf8',
    accent: '#0284c7',
    doubleDeck: true,
    wingtipStyle: 'fence',
    funFact: 'Double-decker giant with 4 engines! Holds over 500 passengers!',
    pilotGreeting: 'Super A380 here! Need a big gate for our double-decker!',
  },
  {
    id: 'a350',
    maker: 'Airbus',
    name: 'A350-1000',
    shortName: 'A350-1000',
    sizeTag: 'Big Wide-Body',
    engines: 2,
    wingspan: 31,
    length: 43,
    bodyWidth: 10.5,
    color: '#a855f7',
    accent: '#7e22ce',
    raccoonMask: true,
    wingtipStyle: 'curved',
    funFact: 'Has a cool black "raccoon mask" windshield and curved wingtips!',
    pilotGreeting: 'A350-1000 checking in with our black mask sunglasses!',
  },
  {
    id: 'a340',
    maker: 'Airbus',
    name: 'A340-600',
    shortName: 'A340-600',
    sizeTag: '4-Engine Long Jet',
    engines: 4,
    wingspan: 30,
    length: 45,
    bodyWidth: 10,
    color: '#ec4899',
    accent: '#be185d',
    wingtipStyle: 'winglet',
    funFact: 'Super long fuselage with 4 engines under the wings!',
    pilotGreeting: 'Long A340-600 ready to roll down the taxi road!',
  },
  {
    id: 'a330',
    maker: 'Airbus',
    name: 'A330-900neo',
    shortName: 'A330neo',
    sizeTag: 'Wide-Body',
    engines: 2,
    wingspan: 29,
    length: 39,
    bodyWidth: 10,
    color: '#14b8a6',
    accent: '#0f766e',
    raccoonMask: true,
    wingtipStyle: 'curved',
    funFact: 'Quiet twin-engine wide-body jet that flies across oceans!',
    pilotGreeting: 'A330neo touched down smoothly!',
  },
  {
    id: 'a320',
    maker: 'Airbus',
    name: 'A320neo',
    shortName: 'A320neo',
    sizeTag: 'Fast Jet',
    engines: 2,
    wingspan: 22,
    length: 29,
    bodyWidth: 8.5,
    color: '#22c55e',
    accent: '#15803d',
    wingtipStyle: 'sharklet',
    funFact: 'Fits into almost any gate and has tall "Sharklet" wingtips!',
    pilotGreeting: 'A320neo here! We can zip into any gate super fast!',
  },
  {
    id: 'a220',
    maker: 'Airbus',
    name: 'A220-300',
    shortName: 'A220-300',
    sizeTag: 'Nimble Jet',
    engines: 2,
    wingspan: 20,
    length: 26,
    bodyWidth: 8,
    color: '#06b6d4',
    accent: '#0e7490',
    wingtipStyle: 'sharklet',
    funFact: 'The smallest Airbus jet—loves short runways and tight turns!',
    pilotGreeting: 'Little A220 ready! Point us to any gate!',
  },

  // BOEING FLEET
  {
    id: 'b747',
    maker: 'Boeing',
    name: '747-8 Jumbo',
    shortName: '747-8 Jumbo',
    sizeTag: 'Super Jumbo ⭐',
    engines: 4,
    wingspan: 34,
    length: 45,
    bodyWidth: 12,
    color: '#f97316',
    accent: '#c2410c',
    upperHump: true,
    wingtipStyle: 'raked',
    funFact: 'The "Queen of the Skies" with a famous upstairs hump in front!',
    pilotGreeting: 'Queen of the Skies 747-8 here! Look at our top hump!',
  },
  {
    id: 'b777x',
    maker: 'Boeing',
    name: '777-9 (777X)',
    shortName: 'Boeing 777X',
    sizeTag: 'Giant Twin ⭐',
    engines: 2,
    wingspan: 34,
    length: 46,
    bodyWidth: 11,
    color: '#fbbf24',
    accent: '#b45309',
    wingtipStyle: 'raked',
    funFact: 'World’s biggest twin-engine jet with massive GE9X turbofans!',
    pilotGreeting: 'Giant Boeing 777X on deck! Listen to those huge twin engines!',
  },
  {
    id: 'b787',
    maker: 'Boeing',
    name: '787-9 Dreamliner',
    shortName: '787 Dreamliner',
    sizeTag: 'Dreamliner',
    engines: 2,
    wingspan: 29,
    length: 39,
    bodyWidth: 10,
    color: '#3b82f6',
    accent: '#1d4ed8',
    wingtipStyle: 'curved',
    funFact: 'Built from super-light carbon fiber with swooping wings!',
    pilotGreeting: 'Dreamliner 787 ready! Where should we park today?',
  },
  {
    id: 'b767',
    maker: 'Boeing',
    name: '767-300ER',
    shortName: '767-300ER',
    sizeTag: 'Cargo & Passenger',
    engines: 2,
    wingspan: 26,
    length: 36,
    bodyWidth: 9.5,
    color: '#8b5cf6',
    accent: '#5b21b6',
    wingtipStyle: 'winglet',
    funFact: 'Favorite jet for both ocean flights and overnight cargo boxes!',
    pilotGreeting: 'Boeing 767 ready for passenger gate or Cargo Zone!',
  },
  {
    id: 'b757',
    maker: 'Boeing',
    name: '757-200',
    shortName: '757 Flying Pencil',
    sizeTag: 'Rocket Jet',
    engines: 2,
    wingspan: 23,
    length: 35,
    bodyWidth: 8.5,
    color: '#ef4444',
    accent: '#b91c1c',
    wingtipStyle: 'winglet',
    funFact: 'Nicknamed the "Flying Pencil"—super powerful takeoff climb!',
    pilotGreeting: '757 Rocket Jet here! Watch how fast we take off!',
  },
  {
    id: 'b737',
    maker: 'Boeing',
    name: '737 MAX 8',
    shortName: '737 MAX 8',
    sizeTag: 'Fast Jet',
    engines: 2,
    wingspan: 22,
    length: 29,
    bodyWidth: 8.5,
    color: '#eab308',
    accent: '#a16207',
    wingtipStyle: 'split',
    funFact: 'Popular short-haul jet with cool V-shaped split wingtips!',
    pilotGreeting: '737 MAX 8 ready to taxi! Tap anywhere to guide us!',
  },
];

function getPlaneById(id) {
  return PLANE_FLEET.find((p) => p.id === id) || PLANE_FLEET[0];
}

/**
 * Draws a cute, chunky cartoon top-down airplane centered at (0,0) facing +X (angle 0)
 */
function drawCartoonPlaneShape(ctx, plane, options = {}) {
  const {
    scale = 1,
    isSelected = false,
    isNight = false,
    isFlying = false,
    shadowOffset = 0,
  } = options;

  ctx.save();
  ctx.scale(scale, scale);

  const L = plane.length;
  const W = plane.wingspan;
  const BW = plane.bodyWidth;

  // Drop shadow when flying or taxiing
  if (shadowOffset > 0) {
    ctx.save();
    ctx.translate(-shadowOffset, shadowOffset);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 0, L * 0.5, W * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Selection Halo
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(L, W) * 0.68, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();
  }

  // Engine Pods under wings
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  const engPositions = plane.engines === 4 ? [0.42, 0.72] : [0.46];
  engPositions.forEach((pos) => {
    const ey = W * pos;
    const ex = -L * 0.02 + (pos - 0.4) * -10;
    const ew = plane.id === 'b777x' ? 9 : 7.5;
    const eh = plane.id === 'b777x' ? 5.5 : 4.5;
    // Left engine
    ctx.beginPath();
    ctx.roundRect(ex, -ey - eh / 2, ew, eh, 2);
    ctx.fill();
    ctx.stroke();
    // Right engine
    ctx.beginPath();
    ctx.roundRect(ex, ey - eh / 2, ew, eh, 2);
    ctx.fill();
    ctx.stroke();
  });

  // Main Swept Wings
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(L * 0.14, 0);
  ctx.lineTo(-L * 0.18, -W);
  ctx.lineTo(-L * 0.3, -W);
  ctx.lineTo(-L * 0.14, 0);
  ctx.lineTo(-L * 0.3, W);
  ctx.lineTo(-L * 0.18, W);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Colorful Wingtip Accents
  ctx.fillStyle = plane.color;
  ctx.beginPath();
  ctx.roundRect(-L * 0.3, -W - 1, L * 0.13, 3.5, 1.5);
  ctx.roundRect(-L * 0.3, W - 2.5, L * 0.13, 3.5, 1.5);
  ctx.fill();

  // Tail Horizontal Stabilizers
  const tailSpan = W * 0.38;
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(-L * 0.32, 0);
  ctx.lineTo(-L * 0.48, -tailSpan);
  ctx.lineTo(-L * 0.54, -tailSpan);
  ctx.lineTo(-L * 0.44, 0);
  ctx.lineTo(-L * 0.54, tailSpan);
  ctx.lineTo(-L * 0.48, tailSpan);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Chubby Cartoon Fuselage
  ctx.fillStyle = plane.color;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-L * 0.52, -BW / 2, L, BW, BW / 2);
  ctx.fill();
  ctx.stroke();

  // White Belly / Roof Stripe
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.roundRect(-L * 0.42, -BW * 0.25, L * 0.78, BW * 0.5, BW * 0.25);
  ctx.fill();

  // 747 Upper Deck Hump or A380 Full Double-Deck Roof Line
  if (plane.upperHump) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(L * 0.02, -BW * 0.32, L * 0.36, BW * 0.64, 3);
    ctx.fill();
    ctx.stroke();
  } else if (plane.doubleDeck) {
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-L * 0.38, -BW * 0.3, L * 0.76, BW * 0.6, 4);
    ctx.stroke();
  }

  // Cockpit Windshield (with A350/A330neo Raccoon Mask!)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  if (plane.raccoonMask) {
    ctx.arc(L * 0.35, 0, BW * 0.38, -1.35, 1.35);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
  } else {
    ctx.arc(L * 0.35, 0, BW * 0.32, -1.15, 1.15);
  }
  ctx.fill();

  // Tail Fin Stripe
  ctx.fillStyle = plane.accent;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-L * 0.5, -2, L * 0.16, 4, 2);
  ctx.fill();
  ctx.stroke();

  // Night Navigation Lights (Red Left, Green Right, Strobe Tail)
  if (isNight || isFlying) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-L * 0.22, -W, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(-L * 0.22, W, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

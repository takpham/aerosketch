// Playable Cartoon Reconstructions of His 3 Notebook Drawings + Blank Sandbox

const STARTER_AIRPORTS = {
  cmx: {
    id: 'cmx',
    name: '⭐ Ca Mau Star Airport (CMX)',
    subtitle: '6-Arm Star Terminal T1 with Glass Grid Dome!',
    traceImage: 'public/sample-drawings/IMG_0412.png',
    welcomeMessage: 'Welcome to Ca Mau Xinjhen Airport! Tap any plane or gate to play!',
    // Normalized coordinates on a 1200 x 720 reference canvas
    runways: [
      { id: 'r1', x1: 110, y1: 75, x2: 110, y2: 645, label1: '18R', label2: '36L' },
      { id: 'r2', x1: 310, y1: 95, x2: 1055, y2: 95, label1: '09', label2: '27' },
      { id: 'r3', x1: 1055, y1: 95, x2: 1055, y2: 645, label1: '18L', label2: '36R' },
    ],
    taxiRoads: [
      // Left parallel taxiway + loops
      { x1: 110, y1: 115, x2: 195, y2: 115 },
      { x1: 195, y1: 115, x2: 195, y2: 615 },
      { x1: 110, y1: 265, x2: 195, y2: 265 },
      { x1: 110, y1: 425, x2: 195, y2: 425 },
      { x1: 110, y1: 615, x2: 390, y2: 615 },
      // Top parallel taxiway & high-speed exits
      { x1: 195, y1: 215, x2: 865, y2: 215 },
      { x1: 440, y1: 95, x2: 495, y2: 215 },
      { x1: 660, y1: 95, x2: 660, y2: 215 },
      { x1: 865, y1: 215, x2: 1055, y2: 145 },
      // Right diagonal exits
      { x1: 1055, y1: 250, x2: 965, y2: 350 },
      { x1: 965, y1: 350, x2: 965, y2: 530 },
      { x1: 965, y1: 450, x2: 1055, y2: 560 },
      // Connectors into Star Terminal Apron
      { x1: 195, y1: 360, x2: 420, y2: 410 },
      { x1: 615, y1: 215, x2: 615, y2: 310 },
      { x1: 390, y1: 615, x2: 910, y2: 615 },
    ],
    stamps: [
      { id: 't1', type: 'star_hub', x: 615, y: 425, label: 'T1', arms: 6, radius: 135 },
      { id: 't2', type: 'square_dome', x: 915, y: 545, label: 'T2', width: 95, height: 110 },
      { id: 'hq', type: 'cargo', x: 1130, y: 375, label: 'CNA HQ' },
    ],
    signs: [
      { x: 390, y: 185, kind: 'compass', text: '36' },
      { x: 255, y: 215, kind: 'direction', text: '← T1 | T2 →' },
      { x: 195, y: 165, kind: 'location', text: 'A' },
      { x: 465, y: 145, kind: 'mandatory', text: '09-27' },
    ],
    initialPlanes: [
      { planeId: 'a380', x: 465, y: 345, angle: 0.4, status: 'parked' },
      { planeId: 'b777x', x: 520, y: 95, angle: 0, status: 'taxi' },
      { planeId: 'a350', x: 765, y: 335, angle: -0.5, status: 'parked' },
    ],
  },

  efo: {
    id: 'efo',
    name: '⚡ Super-Fast Airport (EFO)',
    subtitle: 'One Airport That Is Efficient — Fast Diagonal Exits!',
    traceImage: 'public/sample-drawings/IMG_0414.png',
    welcomeMessage: 'Super-Fast Airport! Planes zip off the runway on diagonal roads!',
    runways: [
      { id: 'r1', x1: 120, y1: 280, x2: 1060, y2: 280, label1: '18L', label2: '36R' },
      { id: 'r2', x1: 120, y1: 490, x2: 1060, y2: 490, label1: '18R', label2: '36L' },
    ],
    taxiRoads: [
      // Parallel spine taxiways
      { x1: 160, y1: 195, x2: 980, y2: 195 },
      { x1: 160, y1: 385, x2: 980, y2: 385 },
      { x1: 160, y1: 565, x2: 980, y2: 565 },
      // End loops
      { x1: 160, y1: 195, x2: 160, y2: 565 },
      { x1: 980, y1: 195, x2: 980, y2: 565 },
      // Fast diagonal high-speed exits!
      { x1: 310, y1: 280, x2: 410, y2: 195 },
      { x1: 520, y1: 280, x2: 620, y2: 195 },
      { x1: 740, y1: 280, x2: 850, y2: 195 },
      { x1: 340, y1: 280, x2: 450, y2: 385 },
      { x1: 610, y1: 280, x2: 710, y2: 385 },
      { x1: 360, y1: 490, x2: 470, y2: 385 },
      { x1: 640, y1: 490, x2: 530, y2: 385 },
      { x1: 500, y1: 490, x2: 560, y2: 565 },
      { x1: 820, y1: 490, x2: 890, y2: 565 },
    ],
    stamps: [
      { id: 't_north', type: 'square_dome', x: 580, y: 105, label: 'MAIN TERMINAL', width: 380, height: 85 },
      { id: 'twr', type: 'tower', x: 610, y: 350, label: 'TWR' },
      { id: 'cargo1', type: 'cargo', x: 510, y: 635, label: 'CARGO ZONE' },
      { id: 'cargo2', type: 'cargo', x: 960, y: 630, label: 'CARGO EAST' },
      { id: 'gate1', type: 'gate', x: 430, y: 155, label: 'G1' },
      { id: 'gate2', type: 'gate', x: 580, y: 155, label: 'G2' },
      { id: 'gate3', type: 'gate', x: 730, y: 155, label: 'G3' },
    ],
    signs: [
      { x: 325, y: 350, kind: 'direction', text: '⚡ EFFICIENT HUB' },
      { x: 740, y: 620, kind: 'wind', text: 'WIND 10kt' },
      { x: 250, y: 385, kind: 'location', text: 'B' },
      { x: 450, y: 240, kind: 'mandatory', text: '18L-36R' },
    ],
    initialPlanes: [
      { planeId: 'b747', x: 510, y: 635, angle: 0, status: 'parked' },
      { planeId: 'a320', x: 430, y: 155, angle: Math.PI / 2, status: 'parked' },
      { planeId: 'b787', x: 260, y: 280, angle: 0, status: 'taxi' },
    ],
  },

  mmh: {
    id: 'mmh',
    name: '🏙️ Twin-Dome Mega Hub (MMH)',
    subtitle: 'Two Giant Dome Terminals (T1 & T3) + Helipads!',
    traceImage: 'public/sample-drawings/IMG_2958.png',
    welcomeMessage: 'Twin-Dome Mega Hub! Two giant terminals T1 & T3 plus Helipads!',
    runways: [
      { id: 'r1', x1: 95, y1: 85, x2: 1105, y2: 85, label1: '36L', label2: '18R' },
      { id: 'r2', x1: 95, y1: 185, x2: 1105, y2: 185, label1: '36R', label2: '18L' },
      { id: 'r3', x1: 95, y1: 645, x2: 1105, y2: 645, label1: '36L', label2: '18R' },
    ],
    taxiRoads: [
      // Top high-speed web
      { x1: 120, y1: 135, x2: 1060, y2: 135 },
      { x1: 280, y1: 85, x2: 350, y2: 135 },
      { x1: 580, y1: 85, x2: 650, y2: 135 },
      { x1: 820, y1: 85, x2: 890, y2: 135 },
      { x1: 350, y1: 135, x2: 420, y2: 185 },
      { x1: 650, y1: 135, x2: 720, y2: 185 },
      // Midfield spine & apron loops
      { x1: 120, y1: 245, x2: 1060, y2: 245 },
      { x1: 585, y1: 245, x2: 585, y2: 585 },
      { x1: 120, y1: 585, x2: 1060, y2: 585 },
      { x1: 120, y1: 185, x2: 120, y2: 585 },
      { x1: 1060, y1: 185, x2: 1060, y2: 585 },
    ],
    stamps: [
      { id: 't1_main', type: 'square_dome', x: 340, y: 385, label: 'T1 DOME', width: 175, height: 150 },
      { id: 't1_west', type: 'square_dome', x: 175, y: 385, label: 'T1-W', width: 75, height: 75 },
      { id: 't1_south', type: 'square_dome', x: 340, y: 525, label: 'T1-S', width: 75, height: 65 },
      { id: 't2_mid', type: 'cargo', x: 585, y: 385, label: 'T2A / T2B' },
      { id: 't3_main', type: 'square_dome', x: 825, y: 385, label: 'T3 DOME', width: 185, height: 150 },
      { id: 't3_east', type: 'square_dome', x: 995, y: 385, label: 'T3-E', width: 75, height: 75 },
      { id: 't3_south', type: 'square_dome', x: 825, y: 525, label: 'T3-S', width: 75, height: 65 },
      { id: 'heli1', type: 'helipad', x: 205, y: 550, label: 'H' },
      { id: 'heli2', type: 'helipad', x: 255, y: 560, label: 'H' },
      { id: 'gate1', type: 'gate', x: 340, y: 290, label: 'T1-N' },
      { id: 'gate2', type: 'gate', x: 825, y: 290, label: 'T3-N' },
      { id: 'gate3', type: 'gate', x: 450, y: 385, label: 'T1-E' },
      { id: 'gate4', type: 'gate', x: 715, y: 385, label: 'T3-W' },
    ],
    signs: [
      { x: 585, y: 245, kind: 'direction', text: '← T1 | T3 →' },
      { x: 280, y: 245, kind: 'location', text: 'A' },
      { x: 890, y: 245, kind: 'location', text: 'C' },
      { x: 585, y: 615, kind: 'mandatory', text: '36L-18R' },
    ],
    initialPlanes: [
      { planeId: 'a380', x: 340, y: 290, angle: -Math.PI / 2, status: 'parked' },
      { planeId: 'b777x', x: 825, y: 290, angle: -Math.PI / 2, status: 'parked' },
      { planeId: 'a350', x: 450, y: 185, angle: 0, status: 'taxi' },
    ],
  },

  blank: {
    id: 'blank',
    name: '➕ Build My Own Airport',
    subtitle: 'Empty grassy field — build everything yourself!',
    traceImage: 'public/sample-drawings/IMG_0412.png',
    welcomeMessage: 'An empty field! Draw your first runway, then add roads and a terminal with gates!',
    runways: [],
    taxiRoads: [],
    stamps: [],
    signs: [],
    initialPlanes: [],
  },
};

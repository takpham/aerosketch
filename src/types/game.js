// Core Kid-Friendly Game Constants & Types for AeroSketch: Build & Control

const GAME_MODES = {
  FLY: 'fly',
  BUILD: 'build',
};

const BUILD_TOOLS = {
  RUNWAY: 'runway',
  TAXI: 'taxi',
  FREE_BUILDING: 'free_building',
  PIER: 'pier',
  DOME: 'dome',
  SIGN: 'sign',
  ERASE: 'erase',
};

const DOME_STAMPS = [
  { id: 'star_6', label: '⭐ 6-Arm Star Hub', icon: '🌟' },
  { id: 'star_4', label: '✖️ 4-Arm Cross Hub', icon: '✖️' },
  { id: 'star_3', label: '🌿 3-Arm Y Hub', icon: '🌿' },
  { id: 'square_dome', label: '🏢 Glass Dome Terminal', icon: '🏢' },
  { id: 'midfield', label: '🏝️ Midfield Satellite', icon: '🏝️' },
  { id: 'crescent', label: '🌙 Crescent Terminal', icon: '🌙' },
  { id: 'round_dome', label: '🌐 Big Glass Dome', icon: '🌐' },
  { id: 'gate', label: '🌉 Jetbridge Gate', icon: '🌉' },
  { id: 'cargo', label: '📦 Cargo Zone', icon: '📦' },
  { id: 'helipad', label: '🚁 Helipad (H)', icon: '🚁' },
  { id: 'tower', label: '🗼 Control Tower', icon: '🗼' },
];

const SIGN_STAMPS = [
  { id: 'loc_a', kind: 'location', text: 'A', label: 'Black [A] Sign' },
  { id: 'dir_bc', kind: 'direction', text: '← B | C →', label: 'Yellow Direction Sign' },
  { id: 'hold_18', kind: 'mandatory', text: '18L-36R', label: 'Red STOP Runway Sign' },
  { id: 'compass', kind: 'compass', text: '36', label: '🧭 Compass Rose' },
  { id: 'wind', kind: 'wind', text: 'WIND 10kt', label: '🎏 Wind Sock' },
];

/** Five strategic paint / camouflage colors. No RGB picker. No arbitrary hex. */
export const GAME_COLORS = {
  RED: '#E74C3C',
  GREEN: '#72B83F',
  BLUE: '#536DDE',
  YELLOW: '#E5B93D',
  PURPLE: '#8D5CC7',
};

export const GAME_COLOR_KEYS = ['RED', 'GREEN', 'BLUE', 'YELLOW', 'PURPLE'];

/** HUD / clay chrome — docs/06-color-palette-v2.md (non-gameplay) */
export const HUD = {
  BG: '#0D1B1E',
  SURFACE: '#152428',
  ACCENT: '#F4A261',
  SUCCESS: '#2A9D8F',
  DANGER: '#E63946',
  TEXT: '#F1FAEE',
};

/** Cream used for skin / unpainted clay UI — not a defender paint color. */
export const CLAY_SKIN = '#F1FAEE';

export const COLORS = {
  ...GAME_COLORS,
  WHITE: CLAY_SKIN,
};

export const COLOR_NAMES = {
  RED: 'Red',
  GREEN: 'Green',
  BLUE: 'Blue',
  YELLOW: 'Yellow',
  PURPLE: 'Purple',
};

export function isGameColor(key) {
  if (!key) return false;
  return Object.prototype.hasOwnProperty.call(GAME_COLORS, String(key).trim().toUpperCase());
}

export function hexForColor(key) {
  if (!key) return null;
  const k = String(key).trim().toUpperCase();
  return GAME_COLORS[k] || null;
}

export function colorKeyFromValue(value) {
  if (value == null || value === '') return null;
  const upper = String(value).trim().toUpperCase();
  if (GAME_COLORS[upper]) return upper;
  const hex = upper.startsWith('#') ? upper : `#${upper}`;
  const found = GAME_COLOR_KEYS.find((k) => GAME_COLORS[k].toUpperCase() === hex);
  return found || null;
}

export function normalizeHex(hex) {
  if (!hex) return CLAY_SKIN;
  const upper = hex.trim().toUpperCase();
  if (upper === '#FFFFFF') return CLAY_SKIN;
  return upper;
}

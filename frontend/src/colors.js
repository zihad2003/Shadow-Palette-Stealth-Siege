export const COLORS = {
  WHITE: '#F1FAEE',
  YELLOW: '#F4C245',
  GREEN: '#2A9D8F',
  RED: '#E63946',
  BLUE: '#264653'
};

export const COLOR_NAMES = {
  '#F1FAEE': 'White',
  '#F4C245': 'Yellow',
  '#2A9D8F': 'Green',
  '#E63946': 'Red',
  '#264653': 'Blue'
};

export function normalizeHex(hex) {
  if (!hex) return COLORS.WHITE;
  const upper = hex.trim().toUpperCase();
  if (upper === '#FFFFFF') return COLORS.WHITE;
  return upper;
}

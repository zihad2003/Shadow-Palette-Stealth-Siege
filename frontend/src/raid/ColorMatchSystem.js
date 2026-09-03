import { isGameColor } from '../colors.js';

/**
 * Exact camouflage match. Unpainted tiles (null) never match.
 * Independent of rendering — always uses stored gameplay colors.
 */
export function isMatch(attackerColor, tileColor) {
  if (!isGameColor(attackerColor)) return false;
  if (tileColor == null || tileColor === '') return false;
  return String(attackerColor).trim().toUpperCase() === String(tileColor).trim().toUpperCase();
}

export const ColorMatchSystem = { isMatch };
export default ColorMatchSystem;

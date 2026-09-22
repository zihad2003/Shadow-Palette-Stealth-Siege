/** Physical key codes — unlike `e.key`, these do not flip when Shift / Caps Lock is held. */
const MOVE_CODES = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ShiftLeft',
  'ShiftRight',
]);

export function noteKeyDown(keys, e) {
  keys.add(e.code);
  if (MOVE_CODES.has(e.code)) e.preventDefault();
}

export function noteKeyUp(keys, e) {
  keys.delete(e.code);
}

export function clearKeys(keys) {
  keys.clear();
}

export function walkAxes(keys) {
  let forward = 0;
  let turn = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) forward += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) forward -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) turn += 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) turn -= 1;
  return { forward, turn };
}

export function shiftHeld(keys) {
  return keys.has('ShiftLeft') || keys.has('ShiftRight');
}

export function codeHeld(keys, ...codes) {
  return codes.some((code) => keys.has(code));
}

/**
 * Keyup is often lost on Alt-Tab, pointer-lock click, or the OS intercepting Shift.
 * Clearing the set on those events stops ghost walking.
 */
export function bindKeyReleaseGuards(keysRef) {
  const clear = () => keysRef.current.clear();
  const onVis = () => {
    if (document.hidden) clear();
  };
  const onLock = () => {
    if (!document.pointerLockElement) clear();
  };
  window.addEventListener('blur', clear);
  window.addEventListener('contextmenu', clear);
  document.addEventListener('visibilitychange', onVis);
  document.addEventListener('pointerlockchange', onLock);
  document.addEventListener('pointerlockerror', clear);
  return () => {
    window.removeEventListener('blur', clear);
    window.removeEventListener('contextmenu', clear);
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('pointerlockchange', onLock);
    document.removeEventListener('pointerlockerror', clear);
  };
}

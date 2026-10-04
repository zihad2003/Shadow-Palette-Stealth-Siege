import { GAME_COLOR_KEYS, COLOR_NAMES } from '../colors.js';

export const DAILY_TASKS_KEY = 'sp_daily_tasks_v1';

export const DAILY_TASK_REWARD = { coins: 120, ink: 15 };

/** Tiles of each color required today before the next day unlocks. */
export const DAILY_PAINT_PER_COLOR = 4;

export const DAILY_TASKS = [
  { id: 'paint', label: 'Paint 4 tiles of each of the 5 colors', target: 20 },
  { id: 'collect', label: 'Collect house coins', target: 1 },
  { id: 'raid', label: 'Finish 1 raid', target: 1 },
];

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function emptyProgress() {
  return { paint: 0, collect: 0, raid: 0 };
}

export function emptyColorCounts() {
  return Object.fromEntries(GAME_COLOR_KEYS.map((key) => [key, 0]));
}

export function defaultDailyState() {
  return { day: todayKey(), progress: emptyProgress(), colors: emptyColorCounts(), claimed: false };
}

export function ensureToday(state) {
  const day = todayKey();
  if (!state || state.day !== day) {
    return { day, progress: emptyProgress(), colors: emptyColorCounts(), claimed: false };
  }
  const colors = emptyColorCounts();
  GAME_COLOR_KEYS.forEach((key) => {
    colors[key] = Math.max(0, Math.min(DAILY_PAINT_PER_COLOR, Number(state.colors?.[key]) || 0));
  });
  return {
    day: state.day,
    progress: {
      paint: Math.max(0, Number(state.progress?.paint) || 0),
      collect: Math.max(0, Number(state.progress?.collect) || 0),
      raid: Math.max(0, Number(state.progress?.raid) || 0),
    },
    colors,
    claimed: !!state.claimed,
  };
}

/** Record tiles painted today, capped per color so one color cannot finish the day. */
export function bumpPaintColor(state, colorKey, amount = 1) {
  const next = ensureToday(state);
  const key = String(colorKey || '').trim().toUpperCase();
  if (!GAME_COLOR_KEYS.includes(key)) return next;
  const add = Math.max(0, Number(amount) || 0);
  if (!add) return next;
  next.colors = {
    ...next.colors,
    [key]: Math.min(DAILY_PAINT_PER_COLOR, (Number(next.colors[key]) || 0) + add),
  };
  return next;
}

export function paintDayStatus(state) {
  const s = ensureToday(state);
  const missing = GAME_COLOR_KEYS.filter((key) => (Number(s.colors?.[key]) || 0) < DAILY_PAINT_PER_COLOR);
  const names = missing.map((key) => {
    const have = Number(s.colors?.[key]) || 0;
    return `${COLOR_NAMES[key] || key} ${have}/${DAILY_PAINT_PER_COLOR}`;
  });
  return {
    ok: missing.length === 0,
    missing,
    names,
    colors: s.colors,
    perColor: DAILY_PAINT_PER_COLOR,
    warning: missing.length
      ? `Paint all 5 colors before the next day. Still need: ${names.join(', ')}.`
      : '',
  };
}

function dailyKey(userId) {
  return userId ? `${DAILY_TASKS_KEY}_${userId}` : DAILY_TASKS_KEY;
}

export function readDailyState(userId) {
  try {
    const raw = JSON.parse(window.localStorage.getItem(dailyKey(userId)) || 'null');
    if (userId && (!raw || typeof raw !== 'object')) return defaultDailyState();
    return ensureToday(raw);
  } catch {
    return defaultDailyState();
  }
}

export function writeDailyState(state, userId) {
  try {
    const payload = JSON.stringify(ensureToday(state));
    window.localStorage.setItem(DAILY_TASKS_KEY, payload);
    if (userId) window.localStorage.setItem(dailyKey(userId), payload);
  } catch {
    /* private mode */
  }
}

export function bumpProgress(state, id, amount = 1) {
  const next = ensureToday(state);
  const task = DAILY_TASKS.find((t) => t.id === id);
  if (!task || next.claimed) return next;
  const add = Math.max(0, Number(amount) || 0);
  if (!add) return next;
  const cur = Number(next.progress[id]) || 0;
  next.progress = {
    ...next.progress,
    [id]: Math.min(task.target, cur + add),
  };
  return next;
}

export function allTasksComplete(state) {
  const s = ensureToday(state);
  const tasksOk = DAILY_TASKS.every((t) => (Number(s.progress[t.id]) || 0) >= t.target);
  return tasksOk && paintDayStatus(s).ok;
}

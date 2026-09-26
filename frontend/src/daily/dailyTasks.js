export const DAILY_TASKS_KEY = 'sp_daily_tasks_v1';

export const DAILY_TASK_REWARD = { coins: 120, ink: 15 };

export const DAILY_TASKS = [
  { id: 'paint', label: 'Paint or recolor 20 tiles', target: 20 },
  { id: 'collect', label: 'Collect house coins', target: 1 },
  { id: 'raid', label: 'Finish 1 raid', target: 1 },
];

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function emptyProgress() {
  return { paint: 0, collect: 0, raid: 0 };
}

export function defaultDailyState() {
  return { day: todayKey(), progress: emptyProgress(), claimed: false };
}

export function ensureToday(state) {
  const day = todayKey();
  if (!state || state.day !== day) {
    return { day, progress: emptyProgress(), claimed: false };
  }
  return {
    day: state.day,
    progress: {
      paint: Math.max(0, Number(state.progress?.paint) || 0),
      collect: Math.max(0, Number(state.progress?.collect) || 0),
      raid: Math.max(0, Number(state.progress?.raid) || 0),
    },
    claimed: !!state.claimed,
  };
}

export function readDailyState() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(DAILY_TASKS_KEY) || 'null');
    return ensureToday(raw);
  } catch {
    return defaultDailyState();
  }
}

export function writeDailyState(state) {
  try {
    window.localStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(ensureToday(state)));
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
  return DAILY_TASKS.every((t) => (Number(s.progress[t.id]) || 0) >= t.target);
}

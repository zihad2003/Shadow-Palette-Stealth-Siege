import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ClipboardList, Gift } from 'lucide-react';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';
import { DAILY_TASKS, DAILY_TASK_REWARD, allTasksComplete, paintDayStatus, DAILY_PAINT_PER_COLOR } from '../../daily/dailyTasks.js';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../../colors.js';
import { useGameState } from '../../state/GameStateContext.jsx';

export default function DailyTasksPanel({ hidden = false }) {
  const { dailyTasks, claimDailyTasks } = useGameState();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.code === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (hidden || !dailyTasks) return null;

  const complete = allTasksComplete(dailyTasks);
  const paintGate = paintDayStatus(dailyTasks);
  const claimed = !!dailyTasks.claimed;
  const doneCount = DAILY_TASKS.filter((task) => {
    if (task.id === 'paint') return paintGate.ok;
    const cur = Number(dailyTasks.progress?.[task.id]) || 0;
    return cur >= task.target;
  }).length;

  return (
    <div ref={boxRef} className="pointer-events-auto relative w-fit max-w-full">
      <ClayButton
        variant={open ? 'tab-active' : 'ghost'}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`h-9 px-2.5 rounded-xl text-[11px] flex items-center gap-1.5 ${
          complete && !claimed ? 'ring-1 ring-[#2a9d8f]/70' : ''
        }`}
      >
        <ClipboardList size={13} />
        Daily
        <span className="text-[9px] tabular-nums text-clay-muted">
          {claimed ? 'done' : `${doneCount}/${DAILY_TASKS.length}`}
        </span>
      </ClayButton>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label="Daily tasks"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute left-0 top-[calc(100%+6px)] z-[80] w-[220px] max-w-[46vw]"
          >
            <ClayPanel depth="deep" className="p-3 rounded-2xl w-full flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading font-semibold text-[11px] text-clay-text tracking-wide">Daily</h3>
                {claimed ? (
                  <span className="text-[9px] uppercase tracking-wider text-clay-muted flex items-center gap-0.5">
                    <Check size={10} /> Claimed
                  </span>
                ) : null}
              </div>
              <ul className="flex flex-col gap-2">
                {DAILY_TASKS.map((task) => {
                  const cur = Math.min(task.target, Number(dailyTasks.progress?.[task.id]) || 0);
                  const paintDone = task.id === 'paint' && paintGate.ok;
                  const pct = task.id === 'paint'
                    ? Math.round((GAME_COLOR_KEYS.filter((key) => (Number(paintGate.colors?.[key]) || 0) >= DAILY_PAINT_PER_COLOR).length / GAME_COLOR_KEYS.length) * 100)
                    : Math.round((cur / task.target) * 100);
                  const done = task.id === 'paint' ? paintDone : cur >= task.target;
                  return (
                    <li key={task.id} className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[10px] leading-tight ${done ? 'text-clay-text' : 'text-clay-muted'}`}>
                          {task.label}
                        </span>
                        <span className="text-[9px] tabular-nums text-clay-muted shrink-0">
                          {task.id === 'paint'
                            ? `${GAME_COLOR_KEYS.filter((key) => (Number(paintGate.colors?.[key]) || 0) >= DAILY_PAINT_PER_COLOR).length}/5`
                            : `${cur}/${task.target}`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/15 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{
                            width: `${pct}%`,
                            background: done
                              ? 'linear-gradient(90deg, #2a9d8f, #4ecdc0)'
                              : 'linear-gradient(90deg, #e9c46a, #f4a261)',
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!paintGate.ok ? (
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-clay-danger leading-snug">{paintGate.warning}</p>
                  <div className="flex items-center gap-1">
                    {GAME_COLOR_KEYS.map((key) => {
                      const have = Number(paintGate.colors?.[key]) || 0;
                      const done = have >= DAILY_PAINT_PER_COLOR;
                      return (
                        <span
                          key={key}
                          title={`${COLOR_NAMES[key]} ${have}/${DAILY_PAINT_PER_COLOR}`}
                          className={`w-4 h-4 rounded-full ${done ? 'ring-1 ring-clay-text' : 'opacity-35'}`}
                          style={{ background: GAME_COLORS[key] }}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <ClayButton
                variant="success"
                disabled={!complete || claimed}
                onClick={() => claimDailyTasks()}
                className="w-full py-1.5 rounded-xl text-[10px] flex items-center justify-center gap-1"
              >
                <Gift size={12} />
                {claimed
                  ? 'Claimed'
                  : complete
                    ? `Claim +${DAILY_TASK_REWARD.coins}c / +${DAILY_TASK_REWARD.ink} ink`
                    : 'Finish all'}
              </ClayButton>
            </ClayPanel>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

import React from 'react';
import { Check, Gift } from 'lucide-react';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';
import { DAILY_TASKS, DAILY_TASK_REWARD, allTasksComplete } from '../../daily/dailyTasks.js';
import { useGameState } from '../../state/GameStateContext.jsx';

export default function DailyTasksPanel({ hidden = false }) {
  const { dailyTasks, claimDailyTasks } = useGameState();
  if (hidden || !dailyTasks) return null;

  const complete = allTasksComplete(dailyTasks);
  const claimed = !!dailyTasks.claimed;

  return (
    <ClayPanel
      depth="raised"
      className="absolute top-16 left-3 z-30 pointer-events-auto p-3 rounded-2xl w-[200px] max-w-[46vw] flex flex-col gap-2"
    >
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
          const pct = Math.round((cur / task.target) * 100);
          const done = cur >= task.target;
          return (
            <li key={task.id} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[10px] leading-tight ${done ? 'text-clay-text' : 'text-clay-muted'}`}>
                  {task.label}
                </span>
                <span className="text-[9px] tabular-nums text-clay-muted shrink-0">
                  {cur}/{task.target}
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
  );
}

import React, { Suspense, lazy } from 'react';
import { Hammer, Flag, Swords } from 'lucide-react';
import { useGameState } from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

const PlotPreview = lazy(() => import('../three/PlotPreview.jsx'));

export default function RTSCommandPanel() {
  const { selectedPlot, userId, handleClaimPlot, transitionTo } = useGameState();

  if (!selectedPlot) return null;

  const isSelf = selectedPlot.ownerId === userId;
  const isClaimed = selectedPlot.status === 'CLAIMED_SELF' || selectedPlot.status === 'CLAIMED_ENEMY';

  return (
    <ClayPanel
      depth="deep"
      className="absolute bottom-5 left-5 z-40 w-80 p-3.5 rounded-[24px] flex items-center gap-3 pointer-events-auto"
    >
      <div className="w-16 h-16 rounded-2xl clay-inset overflow-hidden relative shrink-0">
        <Suspense fallback={<div className="w-full h-full" />}>
          <PlotPreview status={selectedPlot.status} />
        </Suspense>
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-clay-accent text-clay-bg font-heading font-extrabold text-[9px]">
          LVL 1
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <h4 className="font-heading font-bold text-xs text-clay-accent tracking-wide uppercase">
          Sector Plot #{selectedPlot.id}
        </h4>
        <p className="text-[11px] text-clay-muted">
          {isSelf
            ? 'Your operational fortress'
            : isClaimed
              ? `Occupied by User #${selectedPlot.ownerId}`
              : 'Unclaimed fertile territory'}
        </p>

        {isSelf ? (
          <ClayButton
            variant="primary"
            onClick={() => transitionTo('BASE_BUILDER', { plotId: selectedPlot.id })}
            className="mt-1 py-1.5 px-2 rounded-xl text-[10px] flex items-center justify-center gap-1"
          >
            <Hammer size={12} /> Open Builder
          </ClayButton>
        ) : !isClaimed ? (
          <ClayButton
            variant="success"
            onClick={() => handleClaimPlot(selectedPlot.id)}
            className="mt-1 py-1.5 px-2 rounded-xl text-[10px] flex items-center justify-center gap-1"
          >
            <Flag size={12} /> Claim Plot
          </ClayButton>
        ) : (
          <ClayButton
            variant="danger"
            onClick={() => transitionTo('STEALTH_RAID', { defenderId: selectedPlot.ownerId })}
            className="mt-1 py-1.5 px-2 rounded-xl text-[10px] flex items-center justify-center gap-1"
          >
            <Swords size={12} /> Infiltrate
          </ClayButton>
        )}
      </div>
    </ClayPanel>
  );
}

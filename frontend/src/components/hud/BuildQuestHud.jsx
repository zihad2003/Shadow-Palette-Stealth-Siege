import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { houseLabel, REPAIR_BUILDING_COST, STARTER_HOUSE_COUNT } from '../../gamemap/starterRuins.js';
import { GUIDE_STEPS } from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

function CompassArrow({ compass }) {
  if (!compass || compass.onScreen) return null;
  const padX = 0.78;
  const padY = 0.58;
  let x = compass.nx;
  let y = compass.ny;
  const scale = Math.max(Math.abs(x) / padX, Math.abs(y) / padY, 1);
  x /= scale;
  y /= scale;
  const deg = (Math.atan2(compass.nx, -compass.ny) * 180) / Math.PI;
  return (
    <div
      className="absolute z-40 pointer-events-none"
      style={{
        left: `${50 + x * 46}%`,
        top: `${50 - y * 38}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="relative w-8 h-8" style={{ transform: `rotate(${deg}deg)` }}>
        <span className="absolute inset-0 rounded-full bg-[#f4a261]/18" />
        <svg viewBox="0 0 24 24" className="absolute inset-1 text-[#f4a261] drop-shadow-[0_0_6px_rgba(244,162,97,0.5)]">
          <path fill="currentColor" d="M12 3.4L18.6 18.2 12 14.6 5.4 18.2z" />
        </svg>
      </div>
    </div>
  );
}

export default function BuildQuestHud({
  guideStep,
  activeRuin,
  repairedCount,
  rebuildProgress,
  nearActive,
  compass,
  onDismissWelcome,
  onDismissMoveTip,
}) {
  const name = activeRuin ? houseLabel(activeRuin.buildingType) : 'House';
  const step = Math.min(STARTER_HOUSE_COUNT, repairedCount + (activeRuin ? 1 : 0));

  return (
    <>
      <CompassArrow compass={compass} />

      <AnimatePresence>
        {guideStep === GUIDE_STEPS.WELCOME && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-[#0d1b1e]/45 pointer-events-auto"
          >
            <ClayPanel depth="deep" className="p-5 rounded-3xl w-[280px] max-w-[88vw] flex flex-col gap-3 text-center">
              <h2 className="font-heading font-semibold text-sm text-clay-text">Rebuild</h2>
              <p className="text-[11px] text-clay-muted">Follow the marker. Hold F.</p>
              <ClayButton variant="success" onClick={onDismissWelcome} className="w-full py-2 rounded-xl text-xs">
                Start
              </ClayButton>
            </ClayPanel>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {guideStep === GUIDE_STEPS.MOVE_TIP && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute top-[4.75rem] left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
          >
            <ClayPanel className="h-11 px-3.5 rounded-2xl flex items-center gap-3">
              <p className="text-[11px] text-clay-text">
                <kbd className="text-clay-accent">M</kbd> to move
              </p>
              <ClayButton variant="primary" onClick={onDismissMoveTip} className="h-7 px-3 rounded-lg text-[10px]">
                OK
              </ClayButton>
            </ClayPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {guideStep === GUIDE_STEPS.REBUILD && activeRuin && (
        <div className="absolute top-[4.75rem] left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <ClayPanel className="h-11 px-3.5 rounded-2xl flex items-center gap-2.5">
            <div className="w-16 h-1.5 rounded-full clay-inset overflow-hidden">
              <div
                className="h-full rounded-full bg-clay-accent"
                style={{ width: `${Math.round((nearActive ? rebuildProgress : 0) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] font-heading font-semibold text-clay-text whitespace-nowrap">
              {step}/{STARTER_HOUSE_COUNT} {name}
            </p>
            <p className="text-[10px] text-clay-muted whitespace-nowrap">
              {nearActive
                ? rebuildProgress > 0.02
                  ? `${Math.round(rebuildProgress * 100)}%`
                  : `Hold F · ${REPAIR_BUILDING_COST.coins}c`
                : 'Marker'}
            </p>
          </ClayPanel>
        </div>
      )}
    </>
  );
}

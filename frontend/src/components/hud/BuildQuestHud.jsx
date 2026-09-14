import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hammer, MapPin, Move } from 'lucide-react';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';
import { houseLabel, REPAIR_BUILDING_COST, STARTER_HOUSE_COUNT } from '../../gamemap/starterRuins.js';
import { GUIDE_STEPS } from '../../state/GameStateContext.jsx';

function CompassArrow({ compass }) {
  if (!compass || compass.onScreen) return null;
  const x = Math.max(-0.86, Math.min(0.86, compass.nx));
  const y = Math.max(-0.78, Math.min(0.78, compass.ny));
  const angle = (Math.atan2(compass.nx, -compass.ny) * 180) / Math.PI;
  return (
    <div
      className="absolute z-40 pointer-events-none"
      style={{
        left: `${50 + x * 50}%`,
        top: `${50 - y * 50}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        className="w-10 h-10 rounded-full clay-panel-deep flex items-center justify-center text-clay-accent"
        style={{ transform: `rotate(${angle}deg)` }}
      >
        <MapPin size={18} />
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
  const name = activeRuin ? houseLabel(activeRuin.buildingType) : 'house';
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
            className="absolute inset-0 z-[60] flex items-center justify-center bg-[#0d1b1e]/55 pointer-events-auto"
          >
            <motion.div
              initial={{ y: 18, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >
              <ClayPanel depth="deep" className="p-6 rounded-[28px] w-[380px] max-w-[90vw] flex flex-col gap-3 text-center">
                <p className="text-[10px] font-heading font-bold uppercase tracking-[0.24em] text-clay-accent">
                  Base rebuild
                </p>
                <h2 className="font-heading font-extrabold text-xl text-clay-text">Your fortress is in ruins</h2>
                <p className="text-xs text-clay-muted leading-relaxed">
                  Follow the marker to each house. Stand on the rubble and <strong className="text-clay-text">hold F</strong> to
                  rebuild — {STARTER_HOUSE_COUNT} houses, one at a time. Then you can move them with M.
                </p>
                <ClayButton variant="success" onClick={onDismissWelcome} className="w-full py-2.5 rounded-2xl text-xs">
                  Follow the marker
                </ClayButton>
                <p className="text-[10px] text-clay-muted">WASD also starts the guide</p>
              </ClayPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {guideStep === GUIDE_STEPS.MOVE_TIP && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-36 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
          >
            <ClayPanel depth="deep" className="px-5 py-3 rounded-3xl flex flex-col gap-2 items-center max-w-[340px]">
              <p className="text-[11px] font-heading font-bold text-clay-text flex items-center gap-1.5">
                <Move size={13} /> House standing — rearrange anytime
              </p>
              <p className="text-[10px] text-clay-muted text-center">
                Press <kbd className="text-clay-text">M</kbd> to pick it up. Drop the blueprint on a free tile — it will
                slide into place.
              </p>
              <ClayButton variant="primary" onClick={onDismissMoveTip} className="px-4 py-1.5 rounded-xl text-[10px] font-bold">
                Next house
              </ClayButton>
            </ClayPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {guideStep === GUIDE_STEPS.REBUILD && activeRuin && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center gap-2">
          <ClayPanel className="px-4 py-2 rounded-3xl flex items-center gap-3 min-w-[240px]">
            <div className="relative w-11 h-11 shrink-0">
              <svg viewBox="0 0 44 44" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="#f4a261"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={113.1}
                  strokeDashoffset={113.1 * (1 - (nearActive ? rebuildProgress : 0))}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-clay-accent">
                <Hammer size={14} />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-heading uppercase font-bold text-clay-accent tracking-wider">
                Rebuild {step} / {STARTER_HOUSE_COUNT}
              </p>
              <p className="text-[12px] font-heading font-extrabold text-clay-text truncate">{name}</p>
              <p className="text-[10px] text-clay-muted">
                {nearActive
                  ? rebuildProgress > 0.02
                    ? `Rebuilding… ${Math.round(rebuildProgress * 100)}%`
                    : `Hold F · ${REPAIR_BUILDING_COST.coins}c / ${REPAIR_BUILDING_COST.ink} ink`
                  : 'Come here · follow the marker'}
              </p>
            </div>
          </ClayPanel>
        </div>
      )}
    </>
  );
}

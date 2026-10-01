import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { houseLabel, REPAIR_BUILDING_COST, STARTER_HOUSE_COUNT } from '../../gamemap/starterRuins.js';
import { GUIDE_STEPS } from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

function AimTag({ compass, color }) {
  const kind = compass.kind === 'garage' ? 'Garage' : compass.kind === 'part' ? 'Cart part' : 'Rebuild';
  return (
    <div
      className="px-2 py-1 rounded-xl bg-[#0d1b1e]/92 border text-[10px] font-heading font-semibold text-clay-text whitespace-nowrap shadow-lg"
      style={{ borderColor: color }}
    >
      <span className="block text-[8px] uppercase tracking-wider" style={{ color }}>{kind}</span>
      {compass.label || kind}
    </div>
  );
}

function CompassArrow({ compass, clearLeft }) {
  if (!compass) return null;
  const aspect = compass.aspect > 0 ? compass.aspect : 1;
  const nx = Number(compass.nx) || 0;
  const ny = Number(compass.ny) || 0;
  const color = compass.color || '#F4A261';
  const rawX = 50 + nx * 50;
  const rawY = 50 - ny * 50;
  const minX = clearLeft ? 38 : 8;
  const maxX = 91;
  const minY = 20;
  const maxY = 76;
  const blocked = rawX < minX || rawX > maxX || rawY < minY || rawY > maxY;
  if (compass.onScreen && !blocked) {
    return (
      <div
        className="absolute z-30 pointer-events-none flex flex-col items-center"
        style={{
          left: `${rawX}%`,
          top: `${rawY}%`,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <AimTag compass={compass} color={color} />
        <svg viewBox="0 0 24 16" className="w-5 h-3.5 -mt-px" style={{ color }}>
          <path fill="currentColor" d="M12 16 L3 4 H21 Z" />
        </svg>
      </div>
    );
  }
  const x = Math.min(maxX, Math.max(minX, rawX));
  const y = Math.min(maxY, Math.max(minY, rawY));
  const besidePanel = clearLeft && rawX < minX;
  const deg = (Math.atan2((rawX - x) * aspect, y - rawY) * 180) / Math.PI;
  return (
    <div
      className="absolute z-30 pointer-events-none flex flex-col items-center gap-1"
      style={{
        left: besidePanel ? '18rem' : `${x}%`,
        top: `${y}%`,
        transform: besidePanel ? 'translate(0, -50%)' : 'translate(-50%, -50%)',
      }}
    >
      <div className="relative w-8 h-8" style={{ transform: `rotate(${deg}deg)` }}>
        <span className="absolute inset-0 rounded-full" style={{ background: `${color}33` }} />
        <svg viewBox="0 0 24 24" className="absolute inset-1" style={{ color }}>
          <path fill="currentColor" d="M12 3.4L18.6 18.2 12 14.6 5.4 18.2z" />
        </svg>
      </div>
      <AimTag compass={compass} color={color} />
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
  aim,
  clearLeft,
  onDismissWelcome,
  onDismissMoveTip,
}) {
  const name = activeRuin ? houseLabel(activeRuin.buildingType) : 'House';
  const step = Math.min(STARTER_HOUSE_COUNT, repairedCount + (activeRuin ? 1 : 0));

  return (
    <>
      <CompassArrow compass={compass} clearLeft={clearLeft} />

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
              <p className="text-[11px] text-clay-muted">Rebuild the houses first. Then pick up the cart parts and mount them at the garage. Follow the pointer.</p>
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

      {aim && aim.kind !== 'house' && (
        <div className="absolute top-[4.75rem] left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <ClayPanel className="h-11 px-3.5 rounded-2xl flex items-center gap-2.5">
            <p className="text-[11px] font-heading font-semibold text-clay-text whitespace-nowrap">
              {aim.label}
            </p>
            <p className="text-[10px] text-clay-muted whitespace-nowrap">
              {aim.kind === 'garage' ? 'Hold F at the garage' : 'Press E to pick up'}
            </p>
          </ClayPanel>
        </div>
      )}

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
                : 'Walk to it'}
            </p>
          </ClayPanel>
        </div>
      )}
    </>
  );
}

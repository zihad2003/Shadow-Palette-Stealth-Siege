import React from 'react';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../../colors.js';
import { houseInfo } from '../../gamemap/houseCatalog.js';
import { houseLabel } from '../../gamemap/starterRuins.js';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';
import HousePeek from './HousePeek.jsx';

export default function HouseStation({
  building,
  ruined,
  gameDay = 1,
  storedCoins = 0,
  storedInk = 0,
  selectedColor,
  onCollect,
  onCollectInk,
  onPickColor,
  onSleep,
  sleepWarning = '',
  onOpenMakeup,
  patrolOwned = false,
  patrolOn = false,
  patrolCost = 500,
  canAffordPatrol = true,
  onActivatePatrol,
  onTogglePatrol,
}) {
  if (!building) return null;
  if (ruined) return <HousePeek building={building} ruined />;

  const info = houseInfo(building.buildingType);
  const name = info.name || houseLabel(building.buildingType);
  const type = building.buildingType;
  const level = building.level || 1;

  return (
    <div className="pointer-events-auto w-full">
      <ClayPanel depth="deep" className="px-3 py-2.5 rounded-2xl flex flex-col gap-2">
        <div>
          <p className="text-[11px] font-heading font-semibold text-clay-text">
            {name}
            {type !== 'MAKEUP_HOUSE' ? ` · L${level}` : ''}
          </p>
          <p className="text-[10px] text-clay-muted leading-snug">{info.use}</p>
        </div>

        {type === 'COIN_GENERATOR' ? (
          <>
            <p className="text-[11px] font-semibold text-clay-text">Stored {storedCoins}</p>
            <p className="text-[10px] text-clay-muted">+{level} every 10s</p>
            <ClayButton
              variant="primary"
              disabled={storedCoins <= 0}
              onClick={onCollect}
              className="h-8 rounded-xl text-[11px]"
            >
              Collect
            </ClayButton>
          </>
        ) : null}

        {type === 'INK_HOUSE' ? (
          <>
            <p className="text-[11px] font-semibold text-clay-text">Stored {storedInk} ink</p>
            <p className="text-[10px] text-clay-muted">+{level} every 10s · Makeup changes camo</p>
            <ClayButton
              variant="success"
              disabled={storedInk <= 0}
              onClick={onCollectInk}
              className="h-8 rounded-xl text-[11px]"
            >
              Collect ink
            </ClayButton>
            <div className="flex items-center gap-1.5">
              {GAME_COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPickColor?.(key)}
                  className={`w-7 h-7 rounded-full clay-blob border-0 p-0 ${
                    selectedColor === key ? 'ring-2 ring-clay-text' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ background: GAME_COLORS[key] }}
                  title={COLOR_NAMES[key]}
                  aria-label={COLOR_NAMES[key]}
                />
              ))}
            </div>
          </>
        ) : null}

        {type === 'SLEEP_HOUSE' ? (
          <>
            <p className="text-[11px] font-semibold text-clay-text">Day {gameDay}</p>
            {sleepWarning ? (
              <p className="text-[10px] text-clay-danger leading-snug">{sleepWarning}</p>
            ) : null}
            <ClayButton
              variant="success"
              disabled={!!sleepWarning}
              onClick={onSleep}
              className="h-8 rounded-xl text-[11px]"
            >
              Sleep · save
            </ClayButton>
            {info.after ? <p className="text-[10px] text-clay-accent leading-snug">{info.after}</p> : null}
          </>
        ) : null}

        {type === 'CRAFT_HOUSE' ? (
          <div className="flex flex-col gap-1.5">
            {patrolOwned ? (
              <>
                <p className="text-[10px] text-clay-muted leading-snug">
                  {patrolOn ? 'On · 1c every 30s. Off parks it in this house.' : 'Off · parked in Craft House.'}
                </p>
                <ClayButton
                  variant={patrolOn ? 'ghost' : 'success'}
                  onClick={() => onTogglePatrol?.()}
                  className="h-8 rounded-xl text-[10px]"
                >
                  {patrolOn ? 'Turn patrol off' : 'Turn patrol on'}
                </ClayButton>
              </>
            ) : (
              <ClayButton
                variant="success"
                disabled={!canAffordPatrol}
                onClick={() => onActivatePatrol?.()}
                className="h-8 rounded-xl text-[10px]"
              >
                Buy patrol · {patrolCost}c
              </ClayButton>
            )}
          </div>
        ) : null}

        {type === 'MAKEUP_HOUSE' ? (
          <ClayButton variant="primary" onClick={onOpenMakeup} className="h-8 rounded-xl text-[11px]">
            Change camo
          </ClayButton>
        ) : null}
      </ClayPanel>
    </div>
  );
}

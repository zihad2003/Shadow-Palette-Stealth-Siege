import React from 'react';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../../colors.js';
import { UPGRADE_COSTS } from '../../data/raidTargets.js';
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
  selectedColor,
  buildings = [],
  onCollect,
  onPickColor,
  onSleep,
  onUpgrade,
  onOpenMakeup,
}) {
  if (!building) return null;
  if (ruined) return <HousePeek building={building} ruined />;

  const info = houseInfo(building.buildingType);
  const name = info.name || houseLabel(building.buildingType);
  const type = building.buildingType;
  const level = building.level || 1;
  const upgrades = (buildings || []).filter((b) => !b.ruined && (b.level || 1) < 3);

  return (
    <div className="absolute left-4 top-[4.75rem] z-40 pointer-events-auto max-w-[240px]">
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
        ) : null}

        {type === 'SLEEP_HOUSE' ? (
          <>
            <p className="text-[11px] font-semibold text-clay-text">Day {gameDay}</p>
            <ClayButton variant="success" onClick={onSleep} className="h-8 rounded-xl text-[11px]">
              Sleep · save
            </ClayButton>
            {info.after ? <p className="text-[10px] text-clay-accent leading-snug">{info.after}</p> : null}
          </>
        ) : null}

        {type === 'CRAFT_HOUSE' ? (
          upgrades.length ? (
            <div className="flex flex-col gap-1">
              {upgrades.map((b) => {
                const cost = UPGRADE_COSTS[b.level || 1];
                return (
                  <ClayButton
                    key={b.id}
                    variant="primary"
                    onClick={() => onUpgrade?.(b.id)}
                    className="h-8 rounded-xl text-[10px]"
                  >
                    {houseLabel(b.buildingType)} L{(b.level || 1) + 1}
                    {cost ? ` · ${cost.coins}c` : ''}
                  </ClayButton>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-clay-accent leading-snug">All houses are L3. Hold F is faster.</p>
          )
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

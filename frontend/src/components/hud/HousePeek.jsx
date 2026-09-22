import React from 'react';
import { houseInfo } from '../../gamemap/houseCatalog.js';
import { houseLabel } from '../../gamemap/starterRuins.js';
import ClayPanel from '../ui/ClayPanel.jsx';

export default function HousePeek({ building, ruined }) {
  if (!building) return null;
  const info = houseInfo(building.buildingType);
  const name = info.name || houseLabel(building.buildingType);
  return (
    <div className="absolute left-4 top-[4.75rem] z-40 pointer-events-none max-w-[220px]">
      <ClayPanel depth="deep" className="px-3 py-2.5 rounded-2xl flex flex-col gap-1">
        <p className="text-[11px] font-heading font-semibold text-clay-text">{name}</p>
        <p className="text-[10px] text-clay-muted leading-snug">{ruined ? info.need : info.use}</p>
        {!ruined && info.after ? <p className="text-[10px] text-clay-accent leading-snug">{info.after}</p> : null}
      </ClayPanel>
    </div>
  );
}

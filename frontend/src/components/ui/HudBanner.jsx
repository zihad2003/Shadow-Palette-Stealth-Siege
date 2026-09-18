import React from 'react';
import ClayPanel from './ClayPanel.jsx';

export default function HudBanner({ title, subtitle, className = '' }) {
  return (
    <ClayPanel className={`h-11 px-3.5 rounded-2xl flex items-center min-w-0 max-w-[240px] ${className}`}>
      <div className="min-w-0 leading-tight">
        <h1 className="font-heading font-semibold text-[13px] text-clay-text truncate">{title}</h1>
        {subtitle ? <p className="text-[10px] text-clay-muted truncate">{subtitle}</p> : null}
      </div>
    </ClayPanel>
  );
}

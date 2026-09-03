import React from 'react';
import ClayPanel from './ClayPanel.jsx';

export default function HudBanner({
  icon,
  title,
  subtitle,
  brand = 'Shadow Palette',
  brandTag = 'Stealth & Siege',
  className = '',
}) {
  return (
    <ClayPanel
      className={`px-4 py-2.5 rounded-[24px] flex items-center gap-3 pointer-events-auto max-w-[280px] ${className}`}
    >
      <span className="clay-icon w-10 h-10 text-lg text-clay-accent shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-heading font-extrabold uppercase tracking-[0.22em] text-clay-text/90 truncate">
          {brand}
        </p>
        <p className="text-[8px] font-heading font-bold uppercase tracking-[0.28em] text-clay-accent truncate mb-0.5">
          {brandTag}
        </p>
        <h1 className="font-heading font-extrabold text-sm leading-tight text-clay-text truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[9px] font-heading font-bold text-clay-muted uppercase tracking-widest truncate">
            {subtitle}
          </p>
        )}
      </div>
    </ClayPanel>
  );
}

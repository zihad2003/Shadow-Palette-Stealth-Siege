import React from 'react';

export default function ClayChip({
  label,
  value,
  icon,
  valueClass = 'text-clay-accent',
  className = '',
}) {
  return (
    <div
      className={`h-11 px-3 rounded-2xl clay-chip flex items-center gap-1.5 text-clay-muted shrink-0 ${className}`}
    >
      {icon}
      {label ? (
        <span className="font-heading uppercase tracking-wide text-[9px] leading-none">{label}</span>
      ) : null}
      {value !== undefined ? (
        <strong className={`font-heading text-[13px] leading-none ${valueClass}`}>{value}</strong>
      ) : null}
    </div>
  );
}

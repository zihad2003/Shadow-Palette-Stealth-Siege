import React from 'react';

/** Shared top bar: title left, tools + resources right — same height, edge-aligned. */
export default function HudHeader({ left, right }) {
  return (
    <header className="absolute top-4 inset-x-4 z-50 h-11 flex items-center justify-between gap-3 pointer-events-none">
      <div className="flex items-center min-w-0 pointer-events-auto">{left}</div>
      <div className="flex items-center gap-2 shrink-0 pointer-events-auto">{right}</div>
    </header>
  );
}

import React from 'react';
import ClayPanel from '../ui/ClayPanel.jsx';

export default function ActionPrompt({ lines = [] }) {
  const items = (lines || []).filter(Boolean).slice(0, 3);
  if (!items.length) return null;
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center gap-1.5">
      {items.map((line) => (
        <ClayPanel key={line} className="h-9 px-3 rounded-2xl text-[11px] font-semibold text-clay-text flex items-center">
          {line}
        </ClayPanel>
      ))}
    </div>
  );
}

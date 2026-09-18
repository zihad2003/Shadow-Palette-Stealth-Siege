import React from 'react';
import { Zap } from 'lucide-react';
import ClayPanel from '../ui/ClayPanel.jsx';

export default function StaminaBar({ stamina = 1, sprinting = false, exhausted = false, className = '' }) {
  const pct = Math.round(Math.max(0, Math.min(1, stamina)) * 100);
  const tone = exhausted ? 'bg-clay-danger' : sprinting ? 'bg-clay-accent' : 'bg-clay-success';

  return (
    <ClayPanel className={`h-9 px-2.5 rounded-2xl flex items-center gap-2 pointer-events-none ${className}`}>
      <Zap size={12} className={exhausted ? 'text-clay-danger' : sprinting ? 'text-clay-accent' : 'text-clay-muted'} />
      <div className="w-20 h-1.5 rounded-full clay-inset overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%`, transition: 'width 90ms linear' }} />
      </div>
    </ClayPanel>
  );
}

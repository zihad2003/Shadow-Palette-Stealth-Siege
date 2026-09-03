import React from 'react';
import { Coins, Droplet, Gem, Swords, Shield, Palette } from 'lucide-react';
import { COLORS } from '../../colors.js';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';
import { soundEngine } from '../../soundEngine.js';

const DIFFICULTY_TONE = {
  Easy: 'text-clay-success',
  Medium: 'text-clay-accent',
  Hard: 'text-clay-danger',
};

export default function RaidTargetCard({ target, onRaid }) {
  return (
    <ClayPanel
      depth="deep"
      className="snap-center shrink-0 w-[300px] md:w-[340px] p-4 rounded-[28px] flex flex-col gap-3"
    >
      <div className="clay-inset rounded-2xl h-28 relative overflow-hidden grayscale">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3a3a3a] via-[#1c1c1c] to-[#0a0a0a]" />
        <div className="absolute inset-3 rounded-xl border border-white/20 grid grid-cols-4 grid-rows-3 gap-1 p-2 opacity-70">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{ background: i % 3 === 0 ? '#d0d0d0' : i % 2 === 0 ? '#7a7a7a' : '#444' }}
            />
          ))}
        </div>
        <span className="absolute bottom-2 left-3 text-[10px] font-heading font-bold tracking-widest text-white/80">
          GRAYSCALE PREVIEW
        </span>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-heading font-extrabold text-sm text-clay-text">{target.name}</h3>
          <p className="text-[11px] text-clay-muted">Owner #{target.ownerId} · Lv {target.level}</p>
        </div>
        <span className={`text-[10px] font-heading font-bold uppercase ${DIFFICULTY_TONE[target.difficulty] || ''}`}>
          {target.difficulty}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="clay-inset rounded-xl px-2 py-2 flex flex-col items-center gap-0.5">
          <Coins size={12} className="text-clay-yellow" />
          <strong className="font-heading text-xs text-clay-yellow">{target.coins}</strong>
          <span className="text-[9px] text-clay-muted uppercase">Coins</span>
        </div>
        <div className="clay-inset rounded-xl px-2 py-2 flex flex-col items-center gap-0.5">
          <Droplet size={12} className="text-clay-success" />
          <strong className="font-heading text-xs text-clay-success">{target.ink}</strong>
          <span className="text-[9px] text-clay-muted uppercase">Ink</span>
        </div>
        <div className="clay-inset rounded-xl px-2 py-2 flex flex-col items-center gap-0.5">
          <Gem size={12} className="text-clay-accent" />
          <strong className="font-heading text-xs text-clay-accent">{target.chips}</strong>
          <span className="text-[9px] text-clay-muted uppercase">Chips</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-clay-muted">
        <span className="flex items-center gap-1">
          <Palette size={12} style={{ color: COLORS[target.camo] }} />
          Camo {target.camo}
        </span>
        <span className="flex items-center gap-1">
          <Shield size={12} />
          {target.lighthouse ? 'Lighthouse on' : 'No lighthouse'}
        </span>
      </div>

      <ClayButton
        variant="danger"
        onClick={() => {
          soundEngine.playClickSound();
          onRaid(target);
        }}
        className="w-full py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2"
      >
        <Swords size={14} /> Raid this base
      </ClayButton>
    </ClayPanel>
  );
}

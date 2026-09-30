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
          <div className="flex items-center gap-1.5">
            <h3 className="font-heading font-extrabold text-sm text-clay-text">{target.name || target.username}</h3>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                target.online || target.isOnline
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  target.online || target.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'
                }`}
              />
              {target.online || target.isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <p className="text-[11px] text-clay-muted">
            Owner #{target.ownerId || target.id} · {target.isBot ? 'Bot Garrison' : 'Player Base'} · Lv {target.level || 1}
          </p>
        </div>
        <span
          className={`text-[10px] font-heading font-bold uppercase ${
            target.difficulty ? (DIFFICULTY_TONE[target.difficulty] || 'text-clay-accent') : 'text-clay-accent'
          }`}
        >
          {target.difficulty || (target.isBot ? 'Bot' : (target.online || target.isOnline ? 'PvP Live' : 'Async'))}
        </span>
      </div>

      {target.description && (
        <p className="text-[10.5px] text-clay-muted leading-tight line-clamp-2 px-1">
          {target.description}
        </p>
      )}

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
          <Palette size={12} style={{ color: COLORS[target.camo || target.camoColor] || '#999' }} />
          Camo {target.camo || target.camoColor || 'BLUE'}
        </span>
        <span className="flex items-center gap-1">
          <Shield size={12} />
          {target.hasLighthouse || target.lighthouse ? 'Lighthouse' : 'No light'}
          {target.hasPatrol || target.patrol ? ' · Patrol' : ''}
          {target.hasJail || target.jail ? ' · Jail' : ''}
        </span>
      </div>

      <ClayButton
        variant="danger"
        magnetic
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

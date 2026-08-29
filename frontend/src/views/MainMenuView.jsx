import React, { useState } from 'react';
import { useGameState } from '../state/GameStateContext.jsx';
import { COLORS } from '../colors.js';
import { setupPlayer } from '../api.js';
import { soundEngine } from '../soundEngine.js';

export default function MainMenuView() {
  const { userId, characterModel, setCharacterModel, camoColor, setCamoColor, transitionTo, showToast } = useGameState();
  const [selectedChar, setSelectedChar] = useState(characterModel || 1);
  const [selectedCamo, setSelectedCamo] = useState(camoColor || 'BLUE');

  const charList = [
    { id: 1, name: 'SHADOW NINJA', desc: 'Silent & agile infiltration operative', icon: '🥷' },
    { id: 2, name: 'FOREST SCOUT', desc: 'Tactical camouflage & scout specialist', icon: '🏹' },
    { id: 3, name: 'PHANTOM GHOST', desc: 'High-stealth extraction operative', icon: '👻' },
  ];

  const camoList = [
    { key: 'WHITE', hex: COLORS.WHITE, label: 'Band 5 (Lightest)' },
    { key: 'YELLOW', hex: COLORS.YELLOW, label: 'Band 4' },
    { key: 'GREEN', hex: COLORS.GREEN, label: 'Band 3 (Medium)' },
    { key: 'RED', hex: COLORS.RED, label: 'Band 2' },
    { key: 'BLUE', hex: COLORS.BLUE, label: 'Band 1 (Darkest)' },
  ];

  const handleStartGame = async () => {
    soundEngine.playClickSound();
    try {
      await setupPlayer(userId, selectedChar, selectedCamo);
      showToast('Operative Setup Synchronized with Server!', 'success');
    } catch (e) {
      showToast('Profile configuration saved locally', 'info');
    }
    setCharacterModel(selectedChar);
    setCamoColor(selectedCamo);
    transitionTo('WORLD_MAP');
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 overflow-y-auto">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* Main Glass Modal Card */}
      <div className="relative z-10 w-full max-w-2xl glass-panel-deep p-8 rounded-3xl flex flex-col items-center gap-6 shadow-glassDeep border border-white/10">
        {/* Header */}
        <div className="text-center flex flex-col gap-1">
          <h1 className="font-heading font-extrabold text-2xl md:text-3xl tracking-wider bg-gradient-to-r from-white via-amber-300 to-sky-300 bg-clip-text text-transparent">
            SHADOW PALETTE: SETUP OPERATIVE
          </h1>
          <p className="text-xs text-slate-400">
            Select your operative character avatar and permanent camouflage strategy color
          </p>
        </div>

        {/* Character Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {charList.map((c) => {
            const isSelected = selectedChar === c.id;
            return (
              <div
                key={c.id}
                onClick={() => {
                  soundEngine.playClickSound();
                  setSelectedChar(c.id);
                }}
                className={`p-4 rounded-2xl cursor-pointer flex flex-col items-center text-center gap-2.5 transition-all duration-300 ${
                  isSelected
                    ? 'bg-sky-500/20 border-2 border-sky-400 shadow-neonCyan scale-105'
                    : 'bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center text-3xl border border-white/10 shadow-inner">
                  {c.icon}
                </div>
                <h3 className="font-heading font-bold text-xs text-white tracking-wide">{c.name}</h3>
                <p className="text-[10px] text-slate-400">{c.desc}</p>
                {isSelected && (
                  <span className="text-[10px] font-heading font-bold text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/40">
                    ✓ SELECTED
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Permanent Camouflage Color Strategy */}
        <div className="w-full bg-black/30 p-4 rounded-2xl flex flex-col items-center gap-3 border border-white/5">
          <div className="text-center">
            <h3 className="font-heading font-bold text-xs text-amber-400 uppercase tracking-wider">
              Permanent Camo Strategy Color
            </h3>
            <p className="text-[11px] text-slate-400">
              Determines your strategy pattern luminance band matching in stealth raids
            </p>
          </div>

          <div className="flex items-center gap-4">
            {camoList.map((c) => {
              const isSelected = selectedCamo === c.key;
              return (
                <button
                  key={c.key}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => {
                    soundEngine.playPaintSound();
                    setSelectedCamo(c.key);
                  }}
                  className={`w-10 h-10 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                    isSelected
                      ? 'border-white scale-125 shadow-[0_0_16px_rgba(255,255,255,0.9)]'
                      : 'border-white/20 hover:scale-110 hover:border-white/50'
                  }`}
                  title={`${c.key} (${c.label})`}
                >
                  {isSelected && <span className="text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Enter World Button */}
        <button
          onClick={handleStartGame}
          className="w-full max-w-xs py-3 rounded-2xl font-heading font-bold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-neonEmerald transition-all duration-300 flex items-center justify-center gap-2"
        >
          <span>ENTER WORLD MAP</span>
          <span>➔</span>
        </button>
      </div>
    </div>
  );
}

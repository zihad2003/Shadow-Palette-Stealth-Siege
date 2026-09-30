import React, { useState } from 'react';
import { useGameState } from '../state/GameStateContext.jsx';
import CharacterPreview from '../components/three/CharacterPreview.jsx';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import { RAID_TARGETS } from '../data/raidTargets.js';
import { CheckCircle2, Clock, ShieldAlert, Sparkles, LogOut, Swords } from 'lucide-react';
import { duoSetReady } from '../api.js';

export default function DuoLobbyView() {
  const {
    duoParty,
    setDuoParty,
    userId,
    username,
    characterModel,
    camoColor,
    leaveDuoParty,
    showToast,
  } = useGameState();

  const isHost = Number(duoParty?.hostId) === Number(userId);
  const isGuest = Number(duoParty?.guestId) === Number(userId);

  const selectedDefenderId = duoParty?.defenderId || RAID_TARGETS[0]?.ownerId || 12;
  const currentTarget = RAID_TARGETS.find((t) => Number(t.ownerId) === Number(selectedDefenderId)) || RAID_TARGETS[0];

  const hostReady = !!duoParty?.hostReady;
  const guestReady = !!duoParty?.guestReady;
  const myReady = isHost ? hostReady : guestReady;
  const bothReady = hostReady && guestReady;

  const [toggling, setToggling] = useState(false);

  const handleToggleReady = async () => {
    if (!duoParty?.partyId || toggling) return;
    setToggling(true);
    try {
      const nextReady = !myReady;
      const res = await duoSetReady({
        partyId: duoParty.partyId,
        userId,
        ready: nextReady,
        model: characterModel,
        camo: camoColor,
        defenderId: selectedDefenderId,
      });
      if (res?.success) {
        setDuoParty((p) => ({ ...(p || {}), ...res }));
        showToast(nextReady ? 'You are READY!' : 'Ready status cancelled', 'info');
      }
    } catch {
      showToast('Failed to update ready state', 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleSelectTarget = async (target) => {
    if (!isHost || bothReady) return;
    try {
      const res = await duoSetReady({
        partyId: duoParty.partyId,
        userId,
        ready: hostReady,
        model: characterModel,
        camo: camoColor,
        defenderId: target.ownerId,
      });
      if (res?.success) {
        setDuoParty((p) => ({ ...(p || {}), ...res }));
      }
    } catch {
      /* ignore */
    }
  };

  const hostModel = duoParty?.hostModel || (isHost ? characterModel : 1);
  const hostCamo = duoParty?.hostCamo || (isHost ? camoColor : 'BLUE');
  const guestModel = duoParty?.guestModel || (isGuest ? characterModel : 2);
  const guestCamo = duoParty?.guestCamo || (isGuest ? camoColor : 'PURPLE');

  return (
    <div className="absolute inset-0 z-50 bg-[#0d1417]/95 backdrop-blur-md flex flex-col p-4 sm:p-6 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Swords size={20} />
          </div>
          <div>
            <h2 className="text-[17px] font-heading font-semibold text-white tracking-wide">
              Tactical Duo Lobby
            </h2>
            <p className="text-[11px] text-clay-muted">
              Both agents must confirm ready to breach the target fortress
            </p>
          </div>
        </div>

        <ClayButton
          variant="danger"
          className="h-9 px-3.5 rounded-xl text-[11px] font-medium flex items-center gap-1.5"
          onClick={() => leaveDuoParty?.()}
        >
          <LogOut size={13} />
          Leave Duo
        </ClayButton>
      </div>

      {/* Main Dual Podium Stage */}
      <div className="flex-1 max-w-5xl w-full mx-auto my-auto py-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Host Agent Card */}
        <ClayPanel
          depth="deep"
          className={`relative p-5 rounded-3xl border transition-all duration-300 flex flex-col items-center ${
            hostReady
              ? 'border-emerald-500/60 shadow-[0_0_35px_rgba(16,185,129,0.2)] bg-emerald-950/20'
              : 'border-white/10 bg-black/25'
          }`}
        >
          <div className="w-full flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-clay-text uppercase tracking-wider">
              Host Agent {isHost && '(You)'}
            </span>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide ${
                hostReady
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                  : 'bg-white/5 text-clay-muted border border-white/10'
              }`}
            >
              {hostReady ? <CheckCircle2 size={13} /> : <Clock size={13} />}
              {hostReady ? 'READY' : 'PREPARING'}
            </div>
          </div>

          {/* 3D Model Canvas */}
          <div className="relative w-44 h-48 sm:w-52 sm:h-56 my-2 rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-transparent border border-white/5 shadow-inner">
            <CharacterPreview characterModel={hostModel} camoColor={hostCamo} />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>

          <h3 className="text-[15px] font-semibold text-white mt-1">
            {duoParty?.hostName || `Player #${duoParty?.hostId}`}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-clay-muted">ID: {duoParty?.hostId}</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="text-[10px] font-semibold uppercase text-clay-accent">
              Camo {hostCamo}
            </span>
          </div>
        </ClayPanel>

        {/* Guest Agent Card */}
        <ClayPanel
          depth="deep"
          className={`relative p-5 rounded-3xl border transition-all duration-300 flex flex-col items-center ${
            guestReady
              ? 'border-emerald-500/60 shadow-[0_0_35px_rgba(16,185,129,0.2)] bg-emerald-950/20'
              : 'border-white/10 bg-black/25'
          }`}
        >
          <div className="w-full flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-clay-text uppercase tracking-wider">
              Infiltrator {isGuest && '(You)'}
            </span>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide ${
                guestReady
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                  : 'bg-white/5 text-clay-muted border border-white/10'
              }`}
            >
              {guestReady ? <CheckCircle2 size={13} /> : <Clock size={13} />}
              {guestReady ? 'READY' : duoParty?.guestJoined ? 'PREPARING' : 'INVITED'}
            </div>
          </div>

          {!duoParty?.guestJoined && !isGuest ? (
            <div className="flex flex-col items-center justify-center my-auto py-12 text-center">
              <div className="relative mb-3 flex items-center justify-center">
                <span className="absolute h-14 w-14 rounded-full border border-amber-500/40 animate-ping" />
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Clock size={20} className="animate-spin" style={{ animationDuration: '4s' }} />
                </div>
              </div>
              <h4 className="text-[13px] font-semibold text-white">Invite Sent to Player #{duoParty?.guestId}</h4>
              <p className="text-[11px] text-clay-muted mt-1 max-w-[22ch]">
                Waiting for friend to accept invite and enter lobby...
              </p>
            </div>
          ) : (
            <>
              {/* 3D Model Canvas */}
              <div className="relative w-44 h-48 sm:w-52 sm:h-56 my-2 rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-transparent border border-white/5 shadow-inner">
                <CharacterPreview characterModel={guestModel} camoColor={guestCamo} />
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              </div>

              <h3 className="text-[15px] font-semibold text-white mt-1">
                {duoParty?.guestName || `Player #${duoParty?.guestId}`}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-clay-muted">ID: {duoParty?.guestId}</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span className="text-[10px] font-semibold uppercase text-clay-accent">
                  Camo {guestCamo}
                </span>
              </div>
            </>
          )}
        </ClayPanel>
      </div>

      {/* Target Base Selection & Launch Action Bar */}
      <div className="max-w-5xl w-full mx-auto mt-2">
        <ClayPanel depth="deep" className="p-4 sm:p-5 rounded-3xl border border-white/10 bg-black/40">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Target Info */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldAlert size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-white">Target: {currentTarget.name}</p>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 uppercase">
                    {currentTarget.difficulty || 'MEDIUM'}
                  </span>
                </div>
                <p className="text-[11px] text-clay-muted">
                  Bounty: {currentTarget.coins} Coins · {currentTarget.ink} Ink · {currentTarget.chips} Chips
                </p>
              </div>
            </div>

            {/* Target selector pills if host */}
            {isHost && (
              <div className="flex items-center gap-2">
                {RAID_TARGETS.map((t) => {
                  const active = Number(t.ownerId) === Number(selectedDefenderId);
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTarget(t)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                        active
                          ? 'bg-clay-accent text-clay-bg font-semibold shadow-sm'
                          : 'bg-white/5 text-clay-muted hover:bg-white/10'
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Launch / Ready Button */}
            <div className="flex items-center gap-3">
              {bothReady ? (
                <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 text-black font-semibold text-[13px] tracking-wide animate-bounce shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                  <Sparkles size={16} />
                  BREACHING IN PROGRESS...
                </div>
              ) : (
                <ClayButton
                  variant={myReady ? 'ghost' : 'success'}
                  className={`h-12 px-8 rounded-2xl text-[13px] font-semibold flex items-center gap-2 shadow-lg transition-all ${
                    myReady
                      ? 'border border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
                      : 'bg-emerald-500 text-black hover:bg-emerald-400'
                  }`}
                  onClick={handleToggleReady}
                  disabled={toggling}
                >
                  <CheckCircle2 size={16} />
                  {myReady ? 'Cancel Ready' : 'READY / START RAID'}
                </ClayButton>
              )}
            </div>
          </div>
        </ClayPanel>
      </div>
    </div>
  );
}

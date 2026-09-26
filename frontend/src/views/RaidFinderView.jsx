import React, { useEffect, useState } from 'react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import HudHeader from '../components/ui/HudHeader.jsx';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import RaidTargetCard from '../components/raid/RaidTargetCard.jsx';
import { RAID_TARGETS } from '../data/raidTargets.js';
import { useGameState } from '../state/GameStateContext.jsx';
import { RefreshCw, Users } from 'lucide-react';

export default function RaidFinderView() {
  const {
    transitionTo,
    setRaidTargetId,
    camoColor,
    raidCooldownUntil,
    showToast,
    onlinePlayers,
    duoParty,
    inviteDuoPlayer,
    startDuoRaidOnTarget,
    leaveDuoParty,
    refreshOnlinePlayers,
    userId,
  } = useGameState();
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [duoOpen, setDuoOpen] = useState(true);
  const [sentDuo, setSentDuo] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [manualId, setManualId] = useState('');

  useEffect(() => {
    const tick = () => setCooldownLeft(Math.max(0, Math.ceil((raidCooldownUntil - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [raidCooldownUntil]);

  useEffect(() => {
    if (!duoOpen && !(duoParty?.partyId && duoParty.status !== 'ENDED')) return undefined;
    let cancelled = false;
    const pull = async () => {
      setRefreshing(true);
      try {
        await refreshOnlinePlayers?.();
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };
    pull();
    const id = window.setInterval(pull, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duoOpen, duoParty?.partyId, duoParty?.status]);

  const inDuo = !!duoParty?.partyId && duoParty.status !== 'ENDED';
  const isDuoHost = inDuo && Number(duoParty.hostId) === Number(userId);
  const partnerLabel = inDuo
    ? isDuoHost
      ? duoParty.guestName || `Player ${duoParty.guestId}`
      : duoParty.hostName || `Player ${duoParty.hostId}`
    : null;

  const handleRaid = async (target) => {
    if (cooldownLeft > 0) {
      showToast(`Cooldown ${cooldownLeft}s`, 'error');
      return;
    }
    setRaidTargetId(target.ownerId);
    if (inDuo && isDuoHost) {
      await startDuoRaidOnTarget(target.ownerId, target);
      return;
    }
    if (inDuo && !isDuoHost) {
      showToast('Wait for host to pick a base', 'info');
      return;
    }
    transitionTo('RAID_ENTER', {
      defenderId: target.ownerId,
      raidLoot: target,
    });
  };

  const players = (onlinePlayers || []).filter((p) => Number(p.userId) !== Number(userId));
  const otherHint = Number(userId) === 12 ? 34 : 12;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const list = await refreshOnlinePlayers?.();
      const others = (list || []).filter((p) => Number(p.userId) !== Number(userId));
      showToast(others.length ? `${others.length} online` : 'Nobody else online yet', 'info');
    } finally {
      setRefreshing(false);
    }
  };

  const sendManualInvite = async () => {
    const gid = Number(manualId);
    if (!Number.isFinite(gid) || gid <= 0) {
      showToast('Enter friend user id (e.g. 34)', 'error');
      return;
    }
    const ok = await inviteDuoPlayer(gid);
    if (ok) {
      setSentDuo((s) => ({ ...s, [gid]: true }));
      setManualId('');
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-clay-bg flex flex-col">
      <HudHeader
        left={<HudBanner title="Raids" />}
        right={
          <>
            <ClayPanel className="h-11 px-3.5 rounded-2xl text-[11px] font-semibold text-clay-accent flex items-center">
              Camo {camoColor}
            </ClayPanel>
            <ClayButton
              variant={duoOpen || inDuo ? 'success' : 'primary'}
              className="h-11 px-4 rounded-2xl text-[12px] font-semibold flex items-center gap-2 shadow-sm"
              onClick={() => setDuoOpen((v) => !v)}
            >
              <Users size={14} />
              {inDuo ? 'Duo ready' : players.length ? `Duo · ${players.length}` : 'Duo'}
            </ClayButton>
            <NavigationTabs />
            <TopResourceBar />
          </>
        }
      />

      {(duoOpen || inDuo) && (
        <div className="absolute top-[4.75rem] right-4 z-40 w-[18rem] pointer-events-auto">
          <ClayPanel depth="deep" className="px-3 py-3 rounded-2xl">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[12px] font-semibold">Duo raid</p>
              <ClayButton
                variant="ghost"
                className="!h-8 !w-8 !min-w-8 !p-0 !rounded-full !gap-0 shrink-0"
                title="Refresh online"
                onClick={onRefresh}
              >
                <RefreshCw size={13} strokeWidth={2.25} className={refreshing ? 'animate-spin' : ''} />
              </ClayButton>
            </div>
            <p className="text-[10px] text-clay-muted mb-2">
              You are <span className="text-clay-text font-semibold">Player {userId}</span>
            </p>

            {inDuo ? (
              <div className="space-y-2">
                <p className="text-[11px] text-clay-text">
                  With <span className="font-semibold">{partnerLabel}</span>
                </p>
                <p className="text-[10px] text-clay-muted">
                  {isDuoHost
                    ? 'Pick a base below — friend joins with voice.'
                    : 'Waiting for host to pick a base…'}
                </p>
                <ClayButton
                  variant="danger"
                  className="h-9 w-full rounded-xl text-[12px] font-semibold"
                  onClick={() => leaveDuoParty?.()}
                >
                  Leave duo
                </ClayButton>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-clay-muted mb-1.5">Available now ({players.length})</p>
                {players.length === 0 ? (
                  <p className="text-[11px] text-clay-muted leading-snug mb-2">
                    No one listed yet — both stay on Raid Finder, then refresh, or invite by id below.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto mb-2">
                    {players.map((p) => (
                      <div
                        key={p.userId}
                        className="flex items-center justify-between gap-2 rounded-xl bg-black/10 px-2 py-1.5"
                      >
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium truncate">
                            {p.username || `Player ${p.userId}`}
                          </p>
                          <p className="text-[9px] text-clay-muted">id {p.userId} · online</p>
                        </div>
                        <ClayButton
                          variant={sentDuo[p.userId] ? 'ghost' : 'success'}
                          className="h-8 px-3 rounded-xl text-[11px] font-semibold shrink-0 shadow-sm"
                          onClick={async () => {
                            const ok = await inviteDuoPlayer(p.userId);
                            if (ok) setSentDuo((s) => ({ ...s, [p.userId]: true }));
                          }}
                        >
                          {sentDuo[p.userId] ? 'Sent' : 'Invite'}
                        </ClayButton>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    placeholder={`Friend id (e.g. ${otherHint})`}
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    className="flex-1 h-8 rounded-lg bg-black/15 px-2 text-[11px] text-clay-text outline-none border border-white/10"
                  />
                  <ClayButton
                    variant="success"
                    className="h-9 px-3.5 rounded-xl text-[11px] font-semibold shrink-0"
                    onClick={sendManualInvite}
                  >
                    Invite
                  </ClayButton>
                </div>
              </>
            )}
          </ClayPanel>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {RAID_TARGETS.map((t) => (
            <RaidTargetCard key={t.id} target={t} onRaid={() => handleRaid(t)} />
          ))}
        </div>
      </div>
    </div>
  );
}

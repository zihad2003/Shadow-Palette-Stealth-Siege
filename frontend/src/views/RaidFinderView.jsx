import React, { useEffect, useState } from 'react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import HudHeader from '../components/ui/HudHeader.jsx';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import RaidTargetCard from '../components/raid/RaidTargetCard.jsx';
import { useGameState } from '../state/GameStateContext.jsx';
import { RefreshCw, Users, Eye, Swords, ShieldAlert, Car } from 'lucide-react';
import DuoLobbyView from '../duo/DuoLobbyView.jsx';
import { sendVisitInvite, fetchRaidTargets } from '../api.js';

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
    garageComplete,
  } = useGameState();
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [duoOpen, setDuoOpen] = useState(true);
  const [sentDuo, setSentDuo] = useState({});
  const [sentVisit, setSentVisit] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [manualId, setManualId] = useState('');
  const [targets, setTargets] = useState([]);
  const [targetError, setTargetError] = useState('');

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    const loadTargets = async () => {
      try {
        const data = await fetchRaidTargets();
        if (cancelled) return;
        if (Array.isArray(data)) {
          setTargets(data);
          setTargetError('');
        } else {
          setTargetError('Raid server returned an unexpected target list');
        }
      } catch (err) {
        if (!cancelled) {
          setTargetError(err?.message || 'Could not load raid worlds');
        }
      }
    };
    loadTargets();
    const interval = window.setInterval(loadTargets, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId]);

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
  }, [duoOpen, duoParty?.partyId, duoParty?.status]);

  const fmtUid = (id) => {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) return null;
    return String(n).padStart(5, '0');
  };

  const inDuo = !!duoParty?.partyId && duoParty.status !== 'ENDED';
  const isDuoHost = inDuo && Number(duoParty.hostId) === Number(userId);

  if (inDuo && duoParty?.status !== 'IN_RAID') {
    return <DuoLobbyView />;
  }
  const partnerLabel = inDuo
    ? isDuoHost
      ? duoParty.guestName || `Player ${fmtUid(duoParty.guestId)}`
      : duoParty.hostName || `Player ${fmtUid(duoParty.hostId)}`
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

  const handleSendVisit = async (targetId, targetPlayer) => {
    if (!garageComplete) {
      showToast('Construct your vehicle in the garage first to enable base visits!', 'warning');
      return;
    }
    if (targetPlayer && targetPlayer.garageComplete === false) {
      showToast(`${targetPlayer.username || `Player ${fmtUid(targetId)}`} has not built their base vehicle yet!`, 'warning');
      return;
    }
    try {
      await sendVisitInvite(userId, targetId);
      setSentVisit((s) => ({ ...s, [targetId]: true }));
      showToast(`Base visit invite sent to Player ${fmtUid(targetId)}!`, 'success');
    } catch {
      showToast('Could not send visit invite', 'error');
    }
  };

  const players = (() => {
    const byId = new Map();
    for (const p of onlinePlayers || []) {
      const id = Number(p.userId);
      if (!id || id === Number(userId)) continue;
      byId.set(id, p);
    }
    for (const t of targets || []) {
      if (t.isBot || t.bot) continue;
      if (!(t.online || t.isOnline)) continue;
      const id = Number(t.ownerId || t.id);
      if (!id || id === Number(userId)) continue;
      if (byId.has(id)) continue;
      byId.set(id, {
        userId: id,
        username: t.username || t.name,
        camoColor: t.camoColor || t.camo || 'BLUE',
        online: !!(t.online || t.isOnline),
      });
    }
    return [...byId.values()];
  })();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const list = await refreshOnlinePlayers?.();
      const targetList = await fetchRaidTargets();
      if (Array.isArray(targetList)) {
        setTargets(targetList);
        setTargetError('');
      }
      const others = (list || []).filter((p) => Number(p.userId) !== Number(userId));
      showToast(others.length ? `${others.length} players online` : 'Targets updated', 'info');
    } finally {
      setRefreshing(false);
    }
  };

  const sendManualInvite = async () => {
    const gid = Number(manualId);
    if (!Number.isFinite(gid) || gid <= 0) {
      showToast('Enter valid player ID', 'error');
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
        left={<HudBanner title="Tactical Raid Radar" />}
        right={
          <>
            <ClayPanel className="h-11 px-3.5 rounded-2xl text-[11px] font-semibold text-clay-accent flex items-center gap-1.5">
              {garageComplete ? <Car size={13} className="text-clay-success" /> : null}
              {garageComplete ? 'Vehicle Online' : 'Vehicle Incomplete'}
            </ClayPanel>
            <ClayButton
              variant={duoOpen || inDuo ? 'success' : 'primary'}
              className="h-11 px-4 rounded-2xl text-[12px] font-semibold flex items-center gap-2 shadow-sm"
              onClick={() => setDuoOpen((v) => !v)}
            >
              <Users size={14} />
              {inDuo ? 'Duo ready' : players.length ? `Co-op / Duo (${players.length})` : 'Co-op / Duo'}
            </ClayButton>
            <NavigationTabs />
            <TopResourceBar />
          </>
        }
      />

      {(duoOpen || inDuo) && (
        <div className="absolute top-[4.75rem] right-4 z-40 w-[20rem] pointer-events-auto">
          <ClayPanel depth="deep" className="px-3.5 py-3 rounded-2xl">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[12px] font-semibold flex items-center gap-1.5">
                <Users size={14} className="text-clay-accent" />
                Co-op / Duo
              </p>
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
              Your device account:{' '}
              <span className="text-clay-text font-semibold">
                {fmtUid(userId) ? `Player ${fmtUid(userId)}` : 'Connecting…'}
              </span>
            </p>

            {inDuo ? (
              <div className="space-y-2">
                <p className="text-[11px] text-clay-text">
                  Duo Partner: <span className="font-semibold">{partnerLabel}</span>
                </p>
                <p className="text-[10px] text-clay-muted">
                  {isDuoHost
                    ? 'Select a raid target below — partner joins with voice.'
                    : 'Waiting for duo host to pick a target…'}
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
                <p className="text-[10px] text-clay-muted mb-1.5">Online Players Nearby ({players.length})</p>
                {players.length === 0 ? (
                  <p className="text-[11px] text-clay-muted leading-snug mb-2">
                    No other players online yet. You can raid the 5 faction bot bases below or invite a friend by ID.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto mb-2">
                    {players.map((p) => (
                      <div
                        key={p.userId}
                        className="flex items-center justify-between gap-1.5 rounded-xl bg-black/15 px-2.5 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium truncate">
                            {p.username || `Player ${fmtUid(p.userId)}`}
                          </p>
                          <p className="text-[9px] text-clay-muted">#{fmtUid(p.userId)} · Camo {p.camoColor || 'BLUE'}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <ClayButton
                            variant={sentDuo[p.userId] ? 'ghost' : 'success'}
                            className="h-7 px-2.5 rounded-lg text-[10px] font-semibold shadow-sm"
                            title="Invite to Duo Co-op Raid"
                            onClick={async () => {
                              const ok = await inviteDuoPlayer(p.userId);
                              if (ok) setSentDuo((s) => ({ ...s, [p.userId]: true }));
                            }}
                          >
                            {sentDuo[p.userId] ? 'Sent' : 'Duo'}
                          </ClayButton>
                          <ClayButton
                            variant={sentVisit[p.userId] ? 'ghost' : (!garageComplete || p.garageComplete === false) ? 'ghost' : 'primary'}
                            className={`h-7 px-2 rounded-lg text-[10px] font-semibold shadow-sm ${(!garageComplete || p.garageComplete === false) ? 'opacity-50' : ''}`}
                            title={
                              !garageComplete
                                ? 'Build vehicle in garage first'
                                : p.garageComplete === false
                                ? 'Target player has no vehicle built'
                                : 'Invite to Visit Base'
                            }
                            onClick={() => handleSendVisit(p.userId, p)}
                          >
                            <Eye size={12} />
                          </ClayButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5 mt-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="Friend user id"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    className="flex-1 h-8 rounded-lg bg-black/15 px-2 text-[11px] text-clay-text outline-none border border-white/10"
                  />
                  <ClayButton
                    variant="success"
                    className="h-8 px-3 rounded-xl text-[11px] font-semibold shrink-0"
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

      <div className="flex-1 overflow-y-auto px-4 pb-16 pt-28">
        <div className="max-w-4xl mx-auto mb-4">
          <h2 className="font-heading font-extrabold text-base text-clay-text">Available Targets</h2>
          <p className="text-xs text-clay-muted">
            Solo or Co-op Raids: infiltrate the 5 faction bot strongholds or raid live player bases.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 max-w-4xl mx-auto">
          {!userId ? (
            <p className="text-sm text-clay-muted col-span-full">Connecting to the raid server…</p>
          ) : targetError && targets.length === 0 ? (
            <p className="text-sm text-clay-muted col-span-full">{targetError}</p>
          ) : targets.length === 0 ? (
            <p className="text-sm text-clay-muted col-span-full">Looking for raid worlds…</p>
          ) : null}
          {targets.map((t) => (
            <RaidTargetCard key={t.id || t.ownerId} target={t} onRaid={() => handleRaid(t)} />
          ))}
        </div>
      </div>
    </div>
  );
}

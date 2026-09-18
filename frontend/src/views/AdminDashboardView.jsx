import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Droplet,
  Gem,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import ClayChip from '../components/ui/ClayChip.jsx';
import { useGameState } from '../state/GameStateContext.jsx';
import { soundEngine } from '../soundEngine.js';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminOverview,
  fetchAdminUser,
  fetchAdminUsers,
  seedAdminUsers,
  updateAdminUser,
} from '../api.js';
import { GAME_COLOR_KEYS, GAME_COLORS } from '../colors.js';

const emptyForm = {
  username: '',
  coins: 500,
  inkEnergy: 100,
  chips: 200,
  characterModel: 1,
  camoColor: 'BLUE',
  prestigeLevel: 0,
};

const inputClass =
  'w-full clay-inset rounded-xl px-3 py-2 text-xs text-clay-text bg-transparent outline-none placeholder:text-clay-muted';

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-clay-muted">{label}</span>
      {children}
    </label>
  );
}

export default function AdminDashboardView() {
  const { transitionTo, showToast, userId, coins, inkEnergy, chips, camoColor, characterModel } = useGameState();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);

  const localFallback = useMemo(
    () => [
      {
        id: userId,
        username: `Player${userId}`,
        coins,
        inkEnergy,
        chips,
        characterModel: characterModel || 1,
        camoColor: camoColor || 'BLUE',
        prestigeLevel: 0,
        plotId: null,
        buildingCount: 0,
        raidAttempts: 0,
        successfulRaids: 0,
      },
    ],
    [userId, coins, inkEnergy, chips, characterModel, camoColor]
  );

  const loadList = useCallback(
    async (q = query) => {
      try {
        const [ov, list] = await Promise.all([fetchAdminOverview(), fetchAdminUsers(q)]);
        setOverview(ov);
        setUsers(list.users || []);
        setOffline(false);
        return list.users || [];
      } catch (e) {
        setOffline(true);
        setOverview(null);
        setUsers(localFallback);
        return localFallback;
      }
    },
    [query, localFallback]
  );

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await fetchAdminUser(id);
      setDetail(data);
      setForm({ ...emptyForm, ...data.user });
      setOffline(false);
    } catch (e) {
      const row = users.find((u) => u.id === id) || localFallback.find((u) => u.id === id) || localFallback[0];
      if (row) {
        setDetail({ success: true, user: row, buildings: [], recentRaids: [] });
        setForm({ ...emptyForm, ...row });
      }
    }
  }, [users, localFallback]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const list = await loadList('');
      if (!alive) return;
      if (list.length) {
        setSelectedId(list[0].id);
        await loadDetail(list[0].id);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    soundEngine.playClickSound();
    setLoading(true);
    const list = await loadList(query);
    const keep = list.find((u) => u.id === selectedId)?.id || list[0]?.id || null;
    setSelectedId(keep);
    if (keep) await loadDetail(keep);
    setLoading(false);
  };

  const selectUser = async (id) => {
    soundEngine.playClickSound();
    setCreating(false);
    setSelectedId(id);
    await loadDetail(id);
  };

  const saveUser = async () => {
    if (offline) {
      showToast('Start the Spring Boot backend to edit players', 'error');
      return;
    }
    if (!form.username?.trim()) {
      showToast('Username is required', 'error');
      return;
    }
    setBusy(true);
    try {
      if (creating) {
        const res = await createAdminUser(form);
        showToast(`Created ${res.user.username}`, 'success');
        setCreating(false);
        setSelectedId(res.user.id);
        await loadList(query);
        await loadDetail(res.user.id);
      } else if (selectedId) {
        const res = await updateAdminUser(selectedId, form);
        showToast(`Updated ${res.user.username}`, 'success');
        await loadList(query);
        await loadDetail(selectedId);
      }
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async () => {
    if (offline || !selectedId || creating) return;
    if (!window.confirm(`Delete player #${selectedId}? This removes their plot and raid logs.`)) return;
    setBusy(true);
    try {
      await deleteAdminUser(selectedId);
      showToast('Player deleted', 'success');
      const list = await loadList(query);
      const next = list[0]?.id || null;
      setSelectedId(next);
      if (next) await loadDetail(next);
      else {
        setDetail(null);
        setForm(emptyForm);
      }
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const seed = async () => {
    if (offline) {
      showToast('Start the Spring Boot backend to seed demo players', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await seedAdminUsers();
      showToast(res.seeded ? `Seeded ${res.seeded} demo players` : 'Demo players already exist', 'success');
      await refresh();
    } catch (e) {
      showToast(e.message || 'Seed failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const stats = overview || {
    userCount: users.length,
    occupiedPlots: 0,
    raidCount: 0,
    totalCoins: users.reduce((s, u) => s + (u.coins || 0), 0),
    totalInk: users.reduce((s, u) => s + (u.inkEnergy || 0), 0),
    totalChips: users.reduce((s, u) => s + (u.chips || 0), 0),
  };

  return (
    <div className="relative w-full h-full overflow-y-auto bg-clay-bg p-4 md:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,162,97,0.1)_0%,transparent_45%)] pointer-events-none" />
      <div className="relative z-10 max-w-6xl mx-auto flex flex-col gap-4 pb-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-heading font-bold uppercase tracking-[0.22em] text-clay-accent">
              Operator console
            </p>
            <h1 className="font-heading font-extrabold text-xl text-clay-text flex items-center gap-2">
              <LayoutDashboard size={20} /> User dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ClayButton variant="ghost" onClick={refresh} className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5">
              <RefreshCw size={13} /> Refresh
            </ClayButton>
            <ClayButton variant="ghost" onClick={seed} className="px-3 py-2 rounded-xl text-xs">
              Seed demo
            </ClayButton>
            <ClayButton
              variant="primary"
              onClick={() => transitionTo('MAIN_MENU')}
              className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
            >
              <ArrowLeft size={13} /> Back to game
            </ClayButton>
          </div>
        </header>

        {offline && (
          <ClayPanel className="px-4 py-3 rounded-2xl text-xs text-clay-muted">
            Backend is offline — showing this session only. Start Spring Boot on port 8080 to manage all players.
          </ClayPanel>
        )}

        <div className="flex flex-wrap gap-2">
          <ClayChip icon={<Users size={13} className="text-clay-accent" />} label="Players" value={stats.userCount} />
          <ClayChip icon={<Coins size={13} className="text-clay-yellow" />} label="Coins" value={stats.totalCoins} valueClass="text-clay-yellow" />
          <ClayChip icon={<Droplet size={13} className="text-clay-success" />} label="Ink" value={stats.totalInk} valueClass="text-clay-success" />
          <ClayChip icon={<Gem size={13} className="text-clay-accent" />} label="Chips" value={stats.totalChips} />
          <ClayChip label="Plots" value={stats.occupiedPlots} />
          <ClayChip label="Raids" value={stats.raidCount} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
          <ClayPanel depth="deep" className="p-4 rounded-[28px] flex flex-col gap-3 min-h-[420px]">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-clay-muted" />
                <input
                  className={`${inputClass} pl-8`}
                  placeholder="Search name or id"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') refresh();
                  }}
                />
              </div>
              <ClayButton
                variant="success"
                disabled={offline}
                onClick={() => {
                  soundEngine.playClickSound();
                  setCreating(true);
                  setSelectedId(null);
                  setDetail(null);
                  setForm(emptyForm);
                }}
                className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus size={13} /> New player
              </ClayButton>
            </div>

            <div className="clay-inset rounded-2xl overflow-hidden">
              <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-clay-surface text-clay-muted font-heading uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3 py-2 font-bold">Id</th>
                      <th className="px-3 py-2 font-bold">Player</th>
                      <th className="px-3 py-2 font-bold">Camo</th>
                      <th className="px-3 py-2 font-bold">Coins</th>
                      <th className="px-3 py-2 font-bold">Raids</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-clay-muted">
                          Loading players…
                        </td>
                      </tr>
                    )}
                    {!loading && users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-clay-muted">
                          No players yet — seed demo or create one.
                        </td>
                      </tr>
                    )}
                    {users.map((u) => {
                      const active = !creating && u.id === selectedId;
                      return (
                        <tr
                          key={u.id}
                          onClick={() => selectUser(u.id)}
                          className={`cursor-pointer border-t border-white/5 ${
                            active ? 'bg-clay-accent/15' : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="px-3 py-2 font-heading text-clay-accent">#{u.id}</td>
                          <td className="px-3 py-2 text-clay-text font-bold">{u.username}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ background: GAME_COLORS[u.camoColor] || '#8aa3a0' }}
                              />
                              {u.camoColor}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-clay-yellow">{u.coins}</td>
                          <td className="px-3 py-2 text-clay-muted">
                            {u.successfulRaids}/{u.raidAttempts}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </ClayPanel>

          <ClayPanel depth="deep" className="p-4 rounded-[28px] flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading font-bold text-sm text-clay-text">
                {creating ? 'New player' : selectedId ? `Player #${selectedId}` : 'Select a player'}
              </h2>
              {!creating && selectedId && (
                <ClayButton
                  variant="danger"
                  disabled={offline || busy}
                  onClick={removeUser}
                  className="px-2.5 py-1.5 rounded-xl text-[10px] flex items-center gap-1"
                >
                  <Trash2 size={12} /> Delete
                </ClayButton>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Username">
                <input
                  className={inputClass}
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                />
              </Field>
              <Field label="Camo">
                <select
                  className={inputClass}
                  value={form.camoColor}
                  onChange={(e) => setForm((f) => ({ ...f, camoColor: e.target.value }))}
                >
                  {GAME_COLOR_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Coins">
                <input
                  type="number"
                  className={inputClass}
                  value={form.coins}
                  onChange={(e) => setForm((f) => ({ ...f, coins: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Ink">
                <input
                  type="number"
                  className={inputClass}
                  value={form.inkEnergy}
                  onChange={(e) => setForm((f) => ({ ...f, inkEnergy: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Chips">
                <input
                  type="number"
                  className={inputClass}
                  value={form.chips}
                  onChange={(e) => setForm((f) => ({ ...f, chips: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Prestige">
                <input
                  type="number"
                  min="0"
                  max="5"
                  className={inputClass}
                  value={form.prestigeLevel}
                  onChange={(e) => setForm((f) => ({ ...f, prestigeLevel: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Model">
                <select
                  className={inputClass}
                  value={form.characterModel}
                  onChange={(e) => setForm((f) => ({ ...f, characterModel: Number(e.target.value) }))}
                >
                  <option value={1}>1 — Male Operative</option>
                  <option value={2}>2 — Female Operative</option>
                </select>
              </Field>
            </div>

            <ClayButton
              variant="success"
              disabled={busy || offline}
              onClick={saveUser}
              className="w-full py-2.5 rounded-2xl text-xs"
            >
              {creating ? 'Create player' : 'Save changes'}
            </ClayButton>

            {detail?.user && !creating && (
              <div className="text-[10px] text-clay-muted flex flex-col gap-1">
                <p>
                  Plot {detail.user.plotId ?? '—'} · {detail.user.buildingCount} buildings · prestige{' '}
                  {detail.user.prestigeLevel}
                </p>
                {detail.buildings?.length > 0 && (
                  <p>
                    Houses:{' '}
                    {detail.buildings.map((b) => `${b.buildingType.replace(/_/g, ' ')} L${b.level}`).join(' · ')}
                  </p>
                )}
                {detail.recentRaids?.length > 0 && (
                  <p>
                    Last raids:{' '}
                    {detail.recentRaids
                      .slice(0, 4)
                      .map((r) => r.outcome || '—')
                      .join(', ')}
                  </p>
                )}
              </div>
            )}
          </ClayPanel>
        </div>
      </div>
    </div>
  );
}

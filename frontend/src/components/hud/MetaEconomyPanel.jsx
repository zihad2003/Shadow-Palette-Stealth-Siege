import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Gem, Crown, CalendarCheck, X } from 'lucide-react';
import {
  useGameState,
  DAILY_LOGIN_COINS,
  PATROL_UNLOCK_RAIDS,
} from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

export default function MetaEconomyPanel() {
  const {
    isMetaOpen,
    setIsMetaOpen,
    coins,
    chips,
    prestigeLevel,
    successfulRaids,
    patrolUnlocked,
    raidCooldownUntil,
    lastDailyClaim,
    claimDailyLogin,
    tradeChipsForCoins,
    performPrestige,
    buildings,
  } = useGameState();

  const [tradeAmount, setTradeAmount] = useState(50);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const today = new Date().toISOString().slice(0, 10);
  const dailyClaimed = lastDailyClaim === today;
  const upgradable = buildings.filter((b) =>
    ['SLEEP_HOUSE', 'INK_HOUSE', 'CRAFT_HOUSE', 'COIN_GENERATOR'].includes(b.buildingType)
  );
  const prestigeReady =
    prestigeLevel < 5 && upgradable.length >= 4 && upgradable.every((b) => (b.level || 1) >= 3);

  useEffect(() => {
    if (!isMetaOpen) return undefined;
    const tick = () => setCooldownLeft(Math.max(0, Math.ceil((raidCooldownUntil - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isMetaOpen, raidCooldownUntil]);

  return (
    <AnimatePresence>
      {isMetaOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d1b1e]/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ClayPanel depth="deep" className="w-[460px] max-w-[92vw] p-6 rounded-[28px] flex flex-col gap-4 relative">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-base text-clay-accent tracking-wider">
                Economy & Prestige
              </h2>
              <ClayButton
                variant="ghost"
                onClick={() => setIsMetaOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                aria-label="Close"
              >
                <X size={14} />
              </ClayButton>
            </div>

            <div className="clay-inset p-3.5 rounded-2xl flex flex-col gap-2">
              <span className="text-[11px] font-heading font-bold text-clay-success uppercase tracking-wider flex items-center gap-1.5">
                <CalendarCheck size={12} /> Daily Login
              </span>
              <p className="text-xs text-clay-muted">Claim +{DAILY_LOGIN_COINS} coins once per day.</p>
              <ClayButton
                variant={dailyClaimed ? 'ghost' : 'success'}
                disabled={dailyClaimed}
                onClick={claimDailyLogin}
                className="w-full py-2 rounded-2xl text-xs"
              >
                {dailyClaimed ? 'Already claimed today' : `Claim +${DAILY_LOGIN_COINS} coins`}
              </ClayButton>
            </div>

            <div className="clay-inset p-3.5 rounded-2xl flex flex-col gap-2">
              <span className="text-[11px] font-heading font-bold text-clay-accent uppercase tracking-wider flex items-center gap-1.5">
                <Gem size={12} /> Chip → Coin Trade
              </span>
              <p className="text-xs text-clay-muted">
                1 chip = 1 coin · You have {chips} chips / {coins} coins
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={chips}
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(parseInt(e.target.value, 10) || 0)}
                  className="w-24 px-2 py-1.5 rounded-xl clay-inset text-clay-text text-center font-bold text-xs"
                />
                <ClayButton
                  variant="primary"
                  onClick={() => tradeChipsForCoins(tradeAmount)}
                  className="flex-1 py-2 rounded-2xl text-xs flex items-center justify-center gap-1"
                >
                  <Coins size={13} /> Trade
                </ClayButton>
              </div>
            </div>

            <div className="clay-inset p-3.5 rounded-2xl flex flex-col gap-2">
              <span className="text-[11px] font-heading font-bold text-clay-accent uppercase tracking-wider flex items-center gap-1.5">
                <Crown size={12} /> Prestige
              </span>
              <p className="text-xs text-clay-muted">
                Level {prestigeLevel}/5 · Stealth bonus +{prestigeLevel * 5}% · Resets base when all houses are
                Lvl 3
              </p>
              <ClayButton
                variant={prestigeReady ? 'primary' : 'ghost'}
                disabled={!prestigeReady}
                onClick={performPrestige}
                className="w-full py-2 rounded-2xl text-xs"
              >
                {prestigeLevel >= 5
                  ? 'Max prestige'
                  : prestigeReady
                    ? 'Perform Prestige'
                    : 'Need 4+ buildings at Lvl 3'}
              </ClayButton>
            </div>

            <div className="clay-inset p-3.5 rounded-2xl flex flex-col gap-1.5 text-xs text-clay-muted">
              <p>
                Successful raids: <strong className="text-clay-text">{successfulRaids}</strong>
                {patrolUnlocked ? ' · Patrol unlocked' : ` · Patrol unlock at ${PATROL_UNLOCK_RAIDS}`}
              </p>
              <p>
                Raid cooldown:{' '}
                <strong className="text-clay-text">
                  {cooldownLeft > 0 ? `${cooldownLeft}s remaining` : 'Ready'}
                </strong>
              </p>
            </div>
          </ClayPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

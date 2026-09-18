import React, { useEffect, useState } from 'react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import HudHeader from '../components/ui/HudHeader.jsx';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import RaidTargetCard from '../components/raid/RaidTargetCard.jsx';
import { RAID_TARGETS } from '../data/raidTargets.js';
import { useGameState } from '../state/GameStateContext.jsx';

export default function RaidFinderView() {
  const { transitionTo, setRaidTargetId, camoColor, raidCooldownUntil } = useGameState();
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    const tick = () => setCooldownLeft(Math.max(0, Math.ceil((raidCooldownUntil - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [raidCooldownUntil]);

  const handleRaid = (target) => {
    setRaidTargetId(target.ownerId);
    transitionTo('STEALTH_RAID', { defenderId: target.ownerId, raidLoot: target });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-clay-bg flex flex-col">
      <HudHeader
        left={<HudBanner title="Raids" />}
        right={
          <>
            <NavigationTabs />
            <TopResourceBar />
          </>
        }
      />

      <div className="absolute top-[4.75rem] left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <ClayPanel className="h-11 px-3.5 rounded-2xl text-[11px] font-semibold text-clay-accent flex items-center">
          {cooldownLeft > 0 ? `Cooldown ${cooldownLeft}s` : `Camo ${camoColor}`}
        </ClayPanel>
      </div>

      <div className="flex-1 flex items-center pt-24 pb-8">
        <div className="w-full overflow-x-auto px-8 snap-x snap-mandatory scroll-smooth">
          <div className="flex items-stretch gap-4 min-w-max pb-4">
            {RAID_TARGETS.map((target) => (
              <RaidTargetCard key={target.id} target={target} onRaid={handleRaid} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

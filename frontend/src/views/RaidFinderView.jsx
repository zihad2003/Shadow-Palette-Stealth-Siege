import React from 'react';
import { Search } from 'lucide-react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import RaidTargetCard from '../components/raid/RaidTargetCard.jsx';
import { RAID_TARGETS } from '../data/raidTargets.js';
import { useGameState } from '../state/GameStateContext.jsx';

export default function RaidFinderView() {
  const { transitionTo, setRaidTargetId, camoColor } = useGameState();

  const handleRaid = (target) => {
    setRaidTargetId(target.ownerId);
    transitionTo('STEALTH_RAID', { defenderId: target.ownerId, raidLoot: target });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-clay-bg flex flex-col">
      <header className="absolute top-4 left-5 right-5 z-50 flex items-center justify-between pointer-events-none gap-3 flex-nowrap">
        <HudBanner icon={<Search size={16} />} title="Find Raid" subtitle="Scroll to match a fortress" />
        <NavigationTabs />
        <TopResourceBar />
      </header>

      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <ClayPanel className="px-4 py-1.5 rounded-full text-xs font-bold text-clay-accent tracking-wide">
          Camo {camoColor} locks on start · grayscale fortress · matching tiles hide you
        </ClayPanel>
      </div>

      <div className="flex-1 flex items-center pt-28 pb-8">
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

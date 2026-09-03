import React from 'react';
import { Home, Search, Settings } from 'lucide-react';
import { useGameState } from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

export default function NavigationTabs() {
  const { gameState, transitionTo, setIsOptionsOpen } = useGameState();

  const tabs = [
    { key: 'BASE_BUILDER', label: 'Home Base', icon: Home },
    { key: 'RAID_FINDER', label: 'Find Raid', icon: Search },
  ];

  return (
    <ClayPanel className="p-1.5 rounded-[22px] flex items-center gap-1 pointer-events-auto">
      {tabs.map((tab) => {
        const isActive =
          gameState === tab.key || (tab.key === 'RAID_FINDER' && gameState === 'STEALTH_RAID');
        const Icon = tab.icon;
        return (
          <ClayButton
            key={tab.key}
            variant={isActive ? 'tab-active' : 'tab'}
            onClick={() => transitionTo(tab.key)}
            className="px-3.5 py-2 rounded-xl text-xs md:text-sm flex items-center gap-1.5"
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </ClayButton>
        );
      })}

      <ClayButton
        variant="ghost"
        onClick={() => setIsOptionsOpen(true)}
        className="px-2.5 py-2 rounded-xl text-clay-accent"
        aria-label="Game options"
      >
        <Settings size={15} />
      </ClayButton>
    </ClayPanel>
  );
}

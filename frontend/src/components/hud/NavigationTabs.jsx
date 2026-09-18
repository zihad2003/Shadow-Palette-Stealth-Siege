import React from 'react';
import { Home, Search, Settings } from 'lucide-react';
import { useGameState } from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

export default function NavigationTabs() {
  const { gameState, transitionTo, setIsOptionsOpen, setIsMetaOpen } = useGameState();

  const tabs = [
    { key: 'BASE_BUILDER', label: 'Base', icon: Home },
    { key: 'RAID_FINDER', label: 'Raid', icon: Search },
  ];

  return (
    <ClayPanel className="h-11 p-1 rounded-2xl flex items-center gap-0.5">
      {tabs.map((tab) => {
        const isActive =
          gameState === tab.key || (tab.key === 'RAID_FINDER' && gameState === 'STEALTH_RAID');
        const Icon = tab.icon;
        return (
          <ClayButton
            key={tab.key}
            variant={isActive ? 'tab-active' : 'tab'}
            onClick={() => transitionTo(tab.key)}
            className="h-9 px-3 rounded-xl text-[11px] flex items-center gap-1.5"
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{tab.label}</span>
          </ClayButton>
        );
      })}
      <ClayButton
        variant="ghost"
        onClick={() => setIsMetaOpen(true)}
        className="h-9 px-2.5 rounded-xl text-[10px] font-heading font-bold"
        aria-label="Economy"
      >
        Meta
      </ClayButton>
      <ClayButton
        variant="ghost"
        onClick={() => setIsOptionsOpen(true)}
        className="h-9 w-9 rounded-xl flex items-center justify-center"
        aria-label="Options"
      >
        <Settings size={14} />
      </ClayButton>
    </ClayPanel>
  );
}

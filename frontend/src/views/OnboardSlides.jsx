import React from 'react';
import OnboardSlide from '../components/ui/OnboardSlide.jsx';
import { GAME_COLOR_KEYS, GAME_COLORS } from '../colors.js';

export function StoryView() {
  return (
    <OnboardSlide
      step={1}
      next="INTRO_FORTRESS"
      lines={[
        { n: '01', title: 'Color left the island.', body: 'Your fortress starts unpainted.' },
        { n: '02', title: 'Paint is camouflage.', body: 'Five colors. Ink is the cost.' },
        { n: '03', title: 'Raids go gray.', body: 'Match tiles. Avoid the light.' },
      ]}
    />
  );
}

export function FortressIntroView() {
  return (
    <OnboardSlide
      step={2}
      title="Fortress"
      next="INTRO_COLOR"
      lines={[
        { n: '01', title: 'Ruins on the plot.', body: 'Four houses wait smashed.' },
        { n: '02', title: 'Walk close. Hold F.', body: 'Sleep, Craft, Ink, Coin.' },
        { n: '03', title: 'Press M to move.', body: 'Drop a repaired house on a new tile.' },
      ]}
    />
  );
}

export function ColorIntroView() {
  return (
    <OnboardSlide
      step={3}
      title="Color"
      next="INTRO_RAID"
      extra={
        <div className="flex items-center gap-2.5">
          {GAME_COLOR_KEYS.map((key) => (
            <span key={key} className="w-3 h-3 rounded-full" style={{ backgroundColor: GAME_COLORS[key] }} />
          ))}
        </div>
      }
      lines={[
        { n: '01', title: 'One camo on your body.', body: 'Change it later at Makeup House.' },
        { n: '02', title: 'Walk-brush paints tiles.', body: 'E on, Q size, 1–5 color.' },
        { n: '03', title: 'No color over 35%.', body: 'Five ink per tile.' },
      ]}
    />
  );
}

export function RaidIntroView() {
  return (
    <OnboardSlide
      step={4}
      title="Raid"
      next="MAIN_MENU"
      nextLabel="Operative"
      lines={[
        { n: '01', title: 'The map turns gray.', body: 'Your body keeps its color.' },
        { n: '02', title: 'Stand on a matching tile.', body: 'The Searchlight sweeps the yard.' },
        { n: '03', title: 'Siren? Break a wall.', body: 'Four hits. Gate locks.' },
      ]}
    />
  );
}

export default StoryView;

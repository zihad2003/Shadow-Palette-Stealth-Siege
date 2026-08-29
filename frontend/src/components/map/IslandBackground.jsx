import React from 'react';

export default function IslandBackground() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden">
      {/* 2.5D Static Island Terrain Background Image */}
      <img
        src="/assets/island_map.png"
        alt="Isometric Island Diorama"
        className="w-full h-full object-fill block filter drop-shadow-2xl"
        draggable={false}
      />
    </div>
  );
}

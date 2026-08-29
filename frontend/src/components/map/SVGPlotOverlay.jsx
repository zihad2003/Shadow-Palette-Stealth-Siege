import React from 'react';
import PlotPolygon from './PlotPolygon.jsx';
import { useGameState } from '../../state/GameStateContext.jsx';
import { MAP_DIMENSIONS } from '../../data/plotCoordinates.js';

export default function SVGPlotOverlay({ onPlotClick }) {
  const { plots, hoveredPlotId, setHoveredPlotId, selectedPlot, setSelectedPlot } = useGameState();

  return (
    <svg
      viewBox={`0 0 ${MAP_DIMENSIONS.width} ${MAP_DIMENSIONS.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full z-10 select-none"
    >
      <defs>
        {/* Glow Filters for Selected & Hover States */}
        <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Render all 36 Plot Polygons */}
      {plots.map((plot) => (
        <PlotPolygon
          key={plot.id}
          plot={plot}
          isHovered={hoveredPlotId === plot.id}
          isSelected={selectedPlot?.id === plot.id}
          onHover={(id) => setHoveredPlotId(id)}
          onLeave={() => setHoveredPlotId(null)}
          onClick={(clickedPlot) => {
            setSelectedPlot(clickedPlot);
            if (onPlotClick) onPlotClick(clickedPlot);
          }}
        />
      ))}
    </svg>
  );
}

import React from 'react';
import { soundEngine } from '../../soundEngine.js';

export default function PlotPolygon({
  plot,
  isHovered,
  isSelected,
  onHover,
  onLeave,
  onClick,
}) {
  const { id, points, centerX, centerY, status, ownerId, buildingType } = plot;

  // Determine appearance based on ownership and hover states
  let fillColor = 'rgba(16, 185, 129, 0.30)'; // Emerald for Unclaimed
  let strokeColor = 'rgba(52, 211, 153, 0.6)';
  let strokeWidth = 1.5;
  let strokeDash = '4,4';
  let badgeBg = 'rgba(16, 185, 129, 0.85)';
  let labelText = `#${id}`;

  if (status === 'CLAIMED_SELF') {
    fillColor = 'rgba(59, 130, 246, 0.45)';
    strokeColor = '#60a5fa';
    strokeWidth = 2.5;
    strokeDash = 'none';
    badgeBg = 'rgba(37, 99, 235, 0.95)';
    labelText = `#${id} BASE`;
  } else if (status === 'CLAIMED_ENEMY') {
    fillColor = 'rgba(239, 68, 68, 0.40)';
    strokeColor = '#f87171';
    strokeWidth = 2;
    strokeDash = 'none';
    badgeBg = 'rgba(220, 38, 38, 0.95)';
    labelText = `U#${ownerId || id}`;
  }

  if (isHovered) {
    fillColor = status === 'CLAIMED_SELF'
      ? 'rgba(96, 165, 250, 0.65)'
      : (status === 'CLAIMED_ENEMY' ? 'rgba(248, 113, 113, 0.65)' : 'rgba(52, 211, 153, 0.60)');
    strokeColor = '#ffffff';
    strokeWidth = 3;
    strokeDash = 'none';
  }

  if (isSelected) {
    fillColor = 'rgba(251, 191, 36, 0.55)';
    strokeColor = '#fbbf24';
    strokeWidth = 3.5;
    strokeDash = 'none';
  }

  return (
    <g
      className="plot-group group cursor-pointer transition-all duration-200"
      onMouseEnter={() => {
        soundEngine.playClickSound();
        onHover(id);
      }}
      onMouseLeave={onLeave}
      onClick={() => onClick(plot)}
    >
      {/* Sector Plot Polygon */}
      <polygon
        points={points}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        className="plot-polygon transition-all duration-200"
      />

      {/* Floating Center Badge Anchor */}
      <g transform={`translate(${centerX}, ${centerY})`} className="pointer-events-none">
        {/* Soft shadow glow behind badge */}
        <circle r="14" fill="rgba(0,0,0,0.6)" filter="blur(2px)" />

        {/* Badge Pill */}
        <rect
          x="-24"
          y="-10"
          width="48"
          height="20"
          rx="10"
          fill={badgeBg}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1"
          className="transition-transform duration-200 group-hover:scale-110"
        />

        {/* Label Text */}
        <text
          x="0"
          y="4"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="9"
          fontWeight="bold"
          fontFamily="Outfit, sans-serif"
          className="select-none tracking-wider"
        >
          {labelText}
        </text>

        {/* Status Indicator Icon on Top of Badge */}
        {status === 'CLAIMED_SELF' && (
          <text x="0" y="-12" textAnchor="middle" fontSize="12" className="animate-bounce">
            👑
          </text>
        )}
        {status === 'CLAIMED_ENEMY' && (
          <text x="0" y="-12" textAnchor="middle" fontSize="11">
            🏰
          </text>
        )}
      </g>
    </g>
  );
}

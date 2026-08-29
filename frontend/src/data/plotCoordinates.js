// High-Precision Plot Coordinate Map for the 2.5D Isometric Island (1024 x 819 ViewBox)
// Mapped to the 8 radial stone spoke avenues and the inner/outer lawn sectors.

const cx = 512;
const cy = 445; // Center stone circle plaza

// Helper to calculate perspective-compressed radial points
function getRadialPoint(angleDeg, radius, yStretch = 0.70) {
  const rad = (angleDeg * Math.PI) / 180;
  // Isometric perspective factor (slight tilt down)
  const perspective = yStretch + Math.sin(rad) * 0.08;
  const x = Math.round(cx + Math.cos(rad) * radius);
  const y = Math.round(cy + Math.sin(rad) * radius * perspective);
  return { x, y };
}

// 8 Radial Sectors:
// Sector 0: Top (North) ~ -90° (270°)
// Sector 1: Top-Right (NE) ~ -45° (315°)
// Sector 2: Right (East) ~ 0°
// Sector 3: Bottom-Right (SE) ~ 45°
// Sector 4: Bottom (South) ~ 90°
// Sector 5: Bottom-Left (SW) ~ 135°
// Sector 6: Left (West) ~ 180°
// Sector 7: Top-Left (NW) ~ 225°

const sectorAngles = [
  { start: 275, end: 310, name: 'North' },
  { start: 320, end: 355, name: 'North-East' },
  { start: 5,   end: 40,  name: 'East' },
  { start: 50,  end: 85,  name: 'South-East' },
  { start: 95,  end: 130, name: 'South' },
  { start: 140, end: 175, name: 'South-West' },
  { start: 185, end: 220, name: 'West' },
  { start: 230, end: 265, name: 'North-West' },
];

const innerPlots = sectorAngles.map((sec, idx) => {
  const rIn = 95;
  const rOut = 215;
  const p1 = getRadialPoint(sec.start, rIn);
  const p2 = getRadialPoint(sec.start, rOut);
  const p3 = getRadialPoint(sec.end, rOut);
  const p4 = getRadialPoint(sec.end, rIn);
  const midAngle = (sec.start + sec.end) / 2;
  const center = getRadialPoint(midAngle, (rIn + rOut) / 2);

  return {
    id: idx + 1,
    ring: 'INNER',
    name: `Sector Plot #${idx + 1} (${sec.name})`,
    centerX: center.x,
    centerY: center.y,
    points: `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`,
    status: idx === 0 ? 'CLAIMED_SELF' : (idx === 2 || idx === 5 ? 'CLAIMED_ENEMY' : 'UNCLAIMED'),
    ownerId: idx === 0 ? 12 : (idx === 2 ? 34 : (idx === 5 ? 77 : null)),
    buildingType: idx === 0 ? 'CRAFT_HOUSE' : (idx === 2 ? 'INK_HOUSE' : null),
  };
});

const outerPlots = sectorAngles.map((sec, idx) => {
  const rIn = 235;
  const rOut = 375;
  const p1 = getRadialPoint(sec.start - 2, rIn);
  const p2 = getRadialPoint(sec.start - 2, rOut);
  const p3 = getRadialPoint(sec.end + 2, rOut);
  const p4 = getRadialPoint(sec.end + 2, rIn);
  const midAngle = (sec.start + sec.end) / 2;
  const center = getRadialPoint(midAngle, (rIn + rOut) / 2);

  const plotId = idx + 9;
  return {
    id: plotId,
    ring: 'OUTER',
    name: `Outer Fortress #${plotId} (${sec.name})`,
    centerX: center.x,
    centerY: center.y,
    points: `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`,
    status: plotId === 11 ? 'CLAIMED_ENEMY' : (plotId === 14 ? 'CLAIMED_ENEMY' : 'UNCLAIMED'),
    ownerId: plotId === 11 ? 55 : (plotId === 14 ? 89 : null),
    buildingType: plotId === 11 ? 'COIN_GENERATOR' : null,
  };
});

export const PLOT_COORDINATES = [...innerPlots, ...outerPlots];
export const MAP_DIMENSIONS = { width: 1024, height: 819 };

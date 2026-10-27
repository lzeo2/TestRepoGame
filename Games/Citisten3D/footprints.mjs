// Conservative X/Z envelopes of the supplied, facade-normalized building kit.
// Reserve every intersected lot, including overhangs; keep models at true scale.
export const BUILDING_ENVELOPES = Object.freeze({
  townhall: [18, 15], residential: [8, 6], commercial: [8.28, 8.28],
  industrial: [9.01, 8], power: [8, 7], water: [6, 6],
  police: [7.59, 7.59], fire: [8, 7.05], park: [8, 8],
  wall: [10, 1], watchtower: [4, 4],
  // New economic roles reuse these supplied models at their original scale.
  apartments: [8, 6], workshop: [9.01, 8], clinic: [8, 7.05],
  school: [8.28, 8.28], solar: [8, 7], river_pump: [6, 6],
});

export function footprintLots(building, lotSize = 10) {
  const [width, depth] = BUILDING_ENVELOPES[building.type];
  const rx = Math.max(0, Math.ceil((width / lotSize - 1) / 2));
  const rz = Math.max(0, Math.ceil((depth / lotSize - 1) / 2));
  const lots = [];
  for (let z = building.z - rz; z <= building.z + rz; z++) {
    for (let x = building.x - rx; x <= building.x + rx; x++) lots.push({ x, z });
  }
  return lots;
}

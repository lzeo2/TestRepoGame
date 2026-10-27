// Coordinates are continuous lot indices (integer = lot center), heights metres.
// The renderer and placement consumers share this function; no random state.
export function createRiverTerrain(size, layout = 'river-v1') {
  if (!Number.isInteger(size) || size < 12 || size > 200) throw new RangeError('River size must be 12..200');
  if (!['river-v1', 'legacy-flat'].includes(layout)) throw new RangeError('Unknown terrain layout');
  const halfWidth = Math.max(.6, Math.min(3, size / 55)), bankWidth = 1;
  const waterHeight = -.4, bedHeight = -2.4;
  const bend = Math.min(3, (size - 12) * .04);
  // At size 200 the river is 12 lots west of the hall, inside the starting view.
  // Small maps retain a dry 5x5 starter square and at least one western dry lot.
  const offset = Math.min(12, Math.max(4, size * .12, halfWidth + bankWidth + bend + 2.1));
  const base = Math.floor(size / 2) - offset;
  const rows = Array.from({ length: Math.ceil(size / 4) + 1 }, (_, i) => Math.min(size, i * 4) - .5);
  const centers = rows.map(z => base + bend * Math.sin((z + .5) / size * Math.PI * 2));
  const valid = (x, z) => Number.isFinite(x) && Number.isFinite(z) && x >= -.5 && z >= -.5 && x <= size - .5 && z <= size - .5;
  function centerAt(z) {
    const clamped = Math.max(-.5, Math.min(size - .5, z));
    const i = Math.min(rows.length - 2, Math.floor((clamped + .5) / 4));
    return centers[i] + (centers[i + 1] - centers[i]) * (clamped - rows[i]) / (rows[i + 1] - rows[i]);
  }
  const distance = (x, z) => Math.abs(x - centerAt(z));
  function isWater(x, z) { return layout === 'river-v1' && valid(x, z) && distance(x, z) <= halfWidth; }
  function isBank(x, z) {
    if (layout !== 'river-v1' || !valid(x, z)) return false;
    const d = distance(x, z); return d > halfWidth && d < halfWidth + bankWidth;
  }
  function heightAt(x, z) {
    if (layout === 'legacy-flat' || !valid(x, z)) return 0;
    const d = distance(x, z);
    if (d >= halfWidth + bankWidth) return 0;
    if (d >= halfWidth) return waterHeight * (1 - (d - halfWidth) / bankWidth);
    return bedHeight + (waterHeight - bedHeight) * Math.max(0, (d - (halfWidth - .35)) / .35);
  }
  return Object.freeze({ size, layout, isWater, isBank, heightAt, centerAt,
    halfWidth, bankWidth, waterHeight, bedHeight, rows: Object.freeze(rows) });
}

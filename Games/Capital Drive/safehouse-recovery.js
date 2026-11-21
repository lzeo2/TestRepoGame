const FRONT_OFFSETS = [1.7, 2.35, .9];
const SIDE_OFFSETS = [0, .55, -.55];

function isPoint(point) {
  return Number.isFinite(point?.x) && Number.isFinite(point?.z);
}

function* approaches(entry, preferred) {
  if (isPoint(preferred)) yield { x: preferred.x, z: preferred.z, yaw: entry.yaw };
  const sin = Math.sin(entry.yaw), cos = Math.cos(entry.yaw);
  for (const front of FRONT_OFFSETS) for (const side of SIDE_OFFSETS) {
    yield {
      x: entry.x - sin * front + cos * side,
      z: entry.z - cos * front - sin * side,
      yaw: entry.yaw,
    };
  }
}

export function planSafehouseReturn({ entries, origin, storyHome, isOwned, canStand, findEntry }) {
  const houses = entries.filter(entry => entry.type === 'house' && isPoint(entry) && Number.isFinite(entry.yaw));
  const fallback = houses.find(entry => entry.id === storyHome?.roomId);
  const owned = houses.filter(entry => entry !== fallback && isOwned(entry.id));
  if (isPoint(origin)) {
    const distance = entry => Math.hypot(entry.x - origin.x, entry.z - origin.z);
    owned.sort((a, b) => distance(a) - distance(b));
  }
  const choices = fallback ? [...owned, fallback] : owned;
  for (const entry of choices) {
    const story = entry === fallback;
    for (const approach of approaches(entry, story ? storyHome.approach : entry.approach)) {
      if (findEntry(approach) !== entry || !canStand(approach)) continue;
      return { entry, approach, name: story ? storyHome.name || entry.name : entry.name };
    }
  }
  return null;
}

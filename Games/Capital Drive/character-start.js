import { roadProfile } from './road-network.js';
import { projectSegment } from './simulation.js';

const point = p => p && [p.x, p.z].every(Number.isFinite);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// Initial campaign placement only. Live travel remains with the driving/walking owners.
export function prepareCharacterStart(simulation, hero, { initial = false, publicEntries = [] } = {}) {
  if (initial !== true || !point(hero?.start) || !simulation?.player) return null;
  const start = hero.start, candidates = [], add = p => {
    if (point(p)) candidates.push({ x: p.x, z: p.z, yaw: Number.isFinite(p.yaw) ? p.yaw : start.yaw || 0 });
  };
  if (hero.id === 'corporate') {
    const entry = publicEntries.find(p => p.id === 'interior-canberra-centre' && point(p) && Number.isFinite(p.yaw));
    if (entry) add({ x: entry.x - Math.sin(entry.yaw) * 2, z: entry.z - Math.cos(entry.yaw) * 2, yaw: entry.yaw });
  }
  add(start);
  // One initial source-road search; no recurring world scan or invented home address.
  let road = null;
  for (const segment of simulation.graph?.segments || []) {
    const profile = roadProfile(segment.road);
    if (!profile.trafficAllowed || profile.pavementWidth <= 0) continue;
    const projected = projectSegment(start.x, start.z, segment.a, segment.b);
    if (!road || projected.distance < road.distance) road = { ...projected, profile,
      yaw: Math.atan2(-(segment.b[0] - segment.a[0]), -(segment.b[1] - segment.a[1])) };
  }
  if (!road) return null;
  const along = (distance, side = 0) => ({ x: road.x - Math.sin(road.yaw) * distance + Math.cos(road.yaw) * side,
    z: road.z - Math.cos(road.yaw) * distance - Math.sin(road.yaw) * side, yaw: road.yaw });
  const roadside = road.profile.driveWidth / 2 + 1.4;
  const sides = [];
  for (const distance of [0, -2, 2, -4, 4, -6, 6]) for (const side of [-roadside, roadside]) sides.push(along(distance, side));
  sides.sort((a, b) => gap(a, start) - gap(b, start)); sides.forEach(add);
  for (const radius of [2, 4, 6, 10, 16]) for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8;
    add({ x: start.x + Math.cos(angle) * radius, z: start.z + Math.sin(angle) * radius });
  }
  let tests = 0, parked = false;
  const lane = Math.min(road.profile.driveWidth * .23, 3.2);
  for (const distance of [18, -18, 24, -24, 30, -30]) {
    for (const side of [lane, -lane]) {
      const pose = along(distance, side);
      if (++tests > 200 || gap(pose, start) < 6 || !simulation.canOccupy({ ...simulation.player, ...pose }, { ignoreId: simulation.player.id })) continue;
      const result = simulation.teleport(pose);
      if (result.ok && gap(simulation.player, start) >= 6 && simulation.canOccupy(simulation.player)) { parked = true; break; }
    }
    if (parked) break;
  }
  if (!parked) return null;
  for (const candidate of candidates) {
    if (++tests > 200) break;
    if (gap(candidate, simulation.player) < 6) continue;
    const checked = { ...candidate };
    if (!simulation.moveActor(checked, 0, 0, .45).blocked) return Object.freeze(checked);
  }
  return null;
}

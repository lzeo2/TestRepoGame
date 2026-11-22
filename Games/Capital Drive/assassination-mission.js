import { roadProfile } from './road-network.js';

export const ASSASSINATION_MISSION_ID = 'blackthorn-account';
export const ASSASSINATION_TARGET_ID = 'blackthorn-voss';
const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const PUBLIC = new Set(['residential', 'living_street', 'tertiary', 'secondary', 'unclassified']);

// A fictional temporary compound on checked open ground, never a real tenancy or surveyed layout.
export function createAssassinationChapter(map, { canStand = () => false, hasLineOfSight = () => false, nearestRoad } = {}) {
  const anchor = map?.landmarks?.find(p => p.id === 'kingston');
  if (!finite(anchor)) return null;
  const candidates = [];
  for (const road of map.roads || []) {
    if (!PUBLIC.has(road.type) || !road.name || road.bridge || road.tunnel || ['private', 'no'].includes(road.sourceTags?.access)) continue;
    const half = roadProfile(road).driveWidth / 2;
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      if (length < 65) continue;
      for (const t of [.25, .5, .75]) for (const side of [-1, 1]) {
        const tangentX = dx / length, tangentZ = dz / length, nx = -tangentZ * side, nz = tangentX * side;
        const street = { x: a[0] + dx * t, z: a[1] + dz * t };
        const origin = { x: street.x + nx * (half + 7), z: street.z + nz * (half + 7), yaw: Math.atan2(nx, nz) };
        const distance = Math.hypot(origin.x - anchor.x, origin.z - anchor.z);
        const exitT = t + (t < .5 ? 1 : -1) * 40 / length;
        if (distance > 210 || exitT < .05 || exitT > .95) continue;
        const exit = { x: a[0] + dx * exitT + nx * (half + 5.5), z: a[1] + dz * exitT + nz * (half + 5.5) };
        candidates.push({ origin, street, exit, distance, road: road.name, sourceRoad: road.sourceId || road.id });
      }
    }
  }
  candidates.sort((a, b) => a.distance - b.distance || a.origin.x - b.origin.x || a.origin.z - b.origin.z);
  for (const candidate of candidates.slice(0, 160)) {
    const { origin, street, exit } = candidate, c = Math.cos(origin.yaw), s = Math.sin(origin.yaw);
    const point = (x, z) => ({ x: origin.x + c * x + s * z, z: origin.z - s * x + c * z, yaw: origin.yaw });
    const approach = point(0, -1.5), target = point(0, 4.8);
    const probes = [-5, 0, 5].flatMap(x => [0, 4, 8].map(z => point(x, z)));
    probes.push(approach, exit, ...[-1, 1].map(x => point(x, 4.8)));
    for (let i = 1; i < 12; i++) probes.push({ x: approach.x + (exit.x - approach.x) * i / 12, z: approach.z + (exit.z - approach.z) * i / 12 });
    if (!probes.every(p => canStand(p))) continue;
    if (nearestRoad && probes.some(p => {
      const near = nearestRoad(p.x, p.z);
      return near && near.distance < roadProfile(near.road).driveWidth / 2 + 2;
    })) continue;
    if (!hasLineOfSight(street, approach) || !hasLineOfSight(approach, target)) continue;
    const compound = { id: 'blackthorn-yard', name: 'Blackthorn collection yard', origin, width: 10, depth: 8,
      sourceRoad: candidate.sourceRoad, road: candidate.road, fictional: true,
      props: [
        { id: 'blackthorn-west-crate', kind: 'crate', ...point(-3.8, 2.5), width: 1.4, depth: 1.4, height: 1.1, color: 0x7b735d },
        { id: 'blackthorn-east-crate', kind: 'crate', ...point(3.8, 5.5), width: 1.4, depth: 1.4, height: .85, color: 0x6c776e },
        { id: 'blackthorn-west-screen', kind: 'screen', ...point(-4.8, 4), width: .18, depth: 8, height: 1.9, color: 0x69746c },
        { id: 'blackthorn-east-screen', kind: 'screen', ...point(4.8, 4), width: .18, depth: 8, height: 1.9, color: 0x69746c },
        { id: 'blackthorn-rear-screen', kind: 'screen', ...point(0, 7.8), width: 9.6, depth: .18, height: 1.9, color: 0x69746c },
      ] };
    return freeze({ id: ASSASSINATION_MISSION_ID, name: 'Optional: The Blackthorn account', contact: 'Mara', optional: true,
      assassination: true, combat: true, reward: 2600, time: 900, compound,
      briefing: `Adrian Voss, a Blackthorn extortion boss, is at the fictional collection yard beside ${candidate.road}. Reach its open front on foot. Take out Voss with a weapon or get close and fight unarmed. Then reach the marked pickup and lose the police.`,
      outro: 'Mara: Voss is dead. You cleared the yard and the search. The Blackthorn account is closed.',
      cutscene: { id: ASSASSINATION_MISSION_ID, title: 'The Blackthorn account', lines: [
        { speaker: 'Mara', text: 'Adrian Voss runs the Blackthorn extortion crew. He is meeting his collectors at their temporary yard.', duration: 4 },
        { speaker: 'Mara', text: 'Go through the open front, kill Voss, then reach the pickup. Lose the search before we settle the contract.', duration: 4 },
      ] },
      stages: [
        { ...approach, kind: 'foot', radius: 3, hold: .5, clear: true, label: 'Reach the open front of the fictional Blackthorn yard on foot' },
        { ...target, kind: 'assassination', targetId: ASSASSINATION_TARGET_ID, targetName: 'Adrian Voss', appearanceId: 'contract:blackthorn-voss',
          radius: 90, hold: 0, label: 'Take out Adrian Voss with a weapon or unarmed combat' },
        { ...exit, kind: 'escape', pickupOnFoot: true, radius: 4, hold: 1, clear: true, requireWanted: false,
          label: `Leave the yard on foot: reach the ${candidate.road} pickup, then lose the police anywhere` },
      ] });
  }
  return null;
}

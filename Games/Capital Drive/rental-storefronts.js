import { roadProfile } from './road-network.js';

const LOCATIONS = [
  { id: 'rental-kingston', name: 'Kingston Car Rental', roadId: '673311537-0', segment: 1, side: -1, tint: 0x174b61 },
  { id: 'rental-airport', name: 'Airport Car Rental', roadId: '68565762-airport-0', segment: 18, side: 1, tint: 0x28535e },
  { id: 'rental-city', name: 'Civic Car Rental', roadId: '140105798-north-0', segment: 7, side: -1, tint: 0x444b6b },
];
const BODY = { length: 5.2, width: 2.2, ignoreId: 'player' };
const BUILDING = { length: 8.5, width: 4, ignoreId: 'player' };

// Original lots beside mapped road segments. Use the same local coordinates
// for the building collider, glass frontage, approach and marked vehicle bay.
export function buildRentalStorefronts(simulation, heightAt) {
  const sites = [], barriers = [];
  for (const location of LOCATIONS) {
    const segment = simulation.graph.segments.find(s => s.road.id === location.roadId && s.index === location.segment);
    if (!segment || segment.road.bridge || segment.edges.length !== 2) continue;
    const { a, b, road } = segment;
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < 27) continue;
    const tx = dx / length, tz = dz / length, nx = -tz * location.side, nz = tx * location.side;
    const nearEdge = roadProfile(road).driveWidth / 2 + 3;
    const yaw = Math.atan2(nx, nz);
    const point = (u, v) => ({ x: (a[0] + b[0]) / 2 + u * tx + (nearEdge + v) * nx,
      z: (a[1] + b[1]) / 2 + u * tz + (nearEdge + v) * nz, yaw });
    const polygon = corners => corners.map(([u, v]) => { const { x, z } = point(u, v); return [x, z]; });
    const door = point(0, 13.8), pickup = Object.freeze(point(0, 7)), roadPoint = point(0, -nearEdge);
    const walls = [[-6, 15], [6, 15], [6, 22], [-6, 22]];
    const placements = [door, pickup, point(0, 18.5), ...walls.map(([u, v]) => point(u, v))];
    const heights = [...placements, point(0, -1)].map(p => heightAt(p.x, p.z));
    if (heights.some(y => !Number.isFinite(y)) || Math.max(...heights) - Math.min(...heights) > 2) continue;
    const offRoad = p => {
      const hit = simulation.nearestRoad(p.x, p.z);
      return hit && hit.distance >= roadProfile(hit.road).driveWidth / 2 + 2.5;
    };
    if (!placements.every(offRoad) || !simulation.hasLineOfSight(roadPoint, door) || !simulation.hasLineOfSight(door, pickup)) continue;
    if (![-5, -2, 1, 4].every(u => simulation.canOccupy(point(u, 18.5), BUILDING))) continue;
    if (![-2, 0, 2].every(u => [4, 6, 8, 10, 12].every(v => simulation.canOccupy(point(u, v), BODY)))) continue;
    if (![0, 2].every(v => simulation.canOccupy(point(0, v), BODY))) continue;
    const barrier = { id: `${location.id}-walls`, type: 'building', height: 4.15, points: polygon(walls) };
    barriers.push(barrier);
    sites.push(Object.freeze({ id: location.id, name: location.name, aliases: ['car rental', 'vehicle hire', road.name], road: road.name,
      ...door, radius: 3, pickup, returnBay: pickup, point, rotation: -Math.atan2(tz, tx), signDirection: -location.side,
      tint: location.tint, apron: polygon([[-6.3, -1], [6.3, -1], [6.3, 22], [-6.3, 22]]) }));
  }
  return { sites: Object.freeze(sites), barriers };
}

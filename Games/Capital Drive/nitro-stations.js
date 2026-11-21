import { roadProfile } from './road-network.js';

export const NITRO_REFILL_COST = 45;
const INTERACTION_RADIUS = 3.25;
const MAX_STATION_DISTANCE = 22;
const MAX_STOP_SPEED = .6;
const FULL_TANK = .995;
const BAY_CLEARANCE = Object.freeze({ length: 5.2, width: 2.1, ignoreId: 'player' });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const validPoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.z);

function* candidates(site) {
  for (const furniture of site.furniture || []) {
    if (furniture.role !== 'pump' || !validPoint(furniture) || !Number.isFinite(furniture.yaw)) continue;
    const sideX = Math.cos(furniture.yaw) * 3, sideZ = Math.sin(furniture.yaw) * 3;
    yield { x: furniture.x + sideX, z: furniture.z + sideZ };
    yield { x: furniture.x - sideX, z: furniture.z - sideZ };
  }
  if (validPoint(site.canopy)) yield site.canopy;
  yield site;
  for (const radius of [4, 7, 11, 16, MAX_STATION_DISTANCE]) {
    for (let angle = 0; angle < 16; angle++) {
      const yaw = angle * Math.PI / 8;
      yield { x: site.x + Math.cos(yaw) * radius, z: site.z + Math.sin(yaw) * radius };
    }
  }
}

// Bay positions are original gameplay fixtures beside preserved source POIs.
// A candidate must clear the live street geometry and leave the public lane open.
export function createNitroStations(sources, { nearestRoad, canOccupy, hasLineOfSight }) {
  const stations = [];
  for (const site of sources) {
    if (site.category !== 'petrol' || !validPoint(site)) continue;
    for (const candidate of candidates(site)) {
      if (distance(candidate, site) > MAX_STATION_DISTANCE + .001) continue;
      const road = nearestRoad(candidate.x, candidate.z);
      if (!road || !Number.isFinite(road.yaw)) continue;
      if (road.road.type !== 'service' && road.distance < roadProfile(road.road).driveWidth / 2 + 3.5) continue;
      const bay = { x: candidate.x, z: candidate.z, yaw: road.yaw };
      if (!canOccupy(bay, BAY_CLEARANCE) || !hasLineOfSight(bay, road)) continue;
      stations.push(Object.freeze({
        id: site.id, name: site.name, sourceName: site.sourceName,
        radius: INTERACTION_RADIUS, ...bay,
      }));
      break;
    }
  }
  return Object.freeze(stations);
}

export function nitroRefillQuote(stations, driving, context, cash, hasLineOfSight) {
  if (!validPoint(context?.pose) || context.onFoot !== false || context.passenger || context.recovering ||
      context.interior || context.airborne || !Number.isFinite(context.vehicleHealth) || context.vehicleHealth <= 0 ||
      !Number.isFinite(context.health) || context.health <= 0 ||
      !Number.isFinite(driving?.nitroFuel) || driving.nitroFuel < 0 || driving.nitroFuel >= FULL_TANK) return null;
  let station = null, best = Infinity;
  for (const candidate of stations) {
    const gap = distance(candidate, context.pose);
    if (gap > candidate.radius || gap >= best || hasLineOfSight?.(context.pose, candidate) === false) continue;
    station = candidate; best = gap;
  }
  if (!station) return null;
  const cost = context.sandbox ? 0 : NITRO_REFILL_COST;
  const { speed, vx, vz } = context.pose;
  if (![speed, vx, vz].every(Number.isFinite)) return null;
  const moving = Math.max(Math.abs(speed), Math.hypot(vx, vz)) > MAX_STOP_SPEED;
  const reason = moving ? 'Stop on the nitro bay first.' : cash < cost ? `You need $${cost} for nitro.` : '';
  return { ok: !reason, station, cost, reason, moving };
}

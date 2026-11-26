// Night streetlights along the retained suburban and city street network.
// Citywide pavement estimates are supplemented by surveyed ACT columns on selected shopping streets.
import { roadProfile } from './road-network.js';
import { STREETLIGHT_COLUMNS } from './streetlight-columns.js';

export const STREETLIGHT_CAP = 220;
// Residential through primary streets carry bus stops today; those classes get
// lamps. Trunk, motorway, service and airport ways stay unlit on purpose.
const ELIGIBLE = new Set(['residential', 'living_street', 'unclassified', 'tertiary', 'tertiary_link', 'secondary', 'secondary_link', 'primary', 'primary_link']);
const SPACING = 115, PAVEMENT_MARGIN = .45, PAVEMENT_REACH = 8.5, POLE_CLEARANCE = Object.freeze({ length: .4, width: .4 });

export function indexStreetlights(lamps, cellSize) {
  const cells = new Map();
  for (const lamp of lamps) {
    const key = Math.floor(lamp.x/cellSize)+','+Math.floor(lamp.z/cellSize);
    if (!cells.has(key)) cells.set(key,[]);
    cells.get(key).push(lamp);
  }
  return function nearby(x,z,radius,result) {
    result.length=0;
    for (let a=Math.floor((x-radius)/cellSize);a<=Math.floor((x+radius)/cellSize);a++) {
      for (let b=Math.floor((z-radius)/cellSize);b<=Math.floor((z+radius)/cellSize);b++) {
        for (const lamp of cells.get(a+','+b) || []) {
          if ((lamp.x-x)**2+(lamp.z-z)**2<=radius**2) result.push(lamp);
        }
      }
    }
    return result;
  };
}

function surveyedColumns(roads, {columns, waterAt, isOnBridge, canOccupy, nearestRoad}) {
  if (!nearestRoad || !columns.length) return [];
  const names = new Set(columns.map(column => column[7]));
  const roadsByName = new Map();
  for (const road of roads || []) {
    if (!names.has(road.name) || !ELIGIBLE.has(road.type) || String(road.id).includes('-airport-') ||
        (road.sourceTags?.bridge && road.sourceTags.bridge !== 'no')) continue;
    if (!roadsByName.has(road.name)) roadsByName.set(road.name,[]);
    roadsByName.get(road.name).push(road);
  }
  const lamps = [];
  for (const [id,x,z,height,outreach,tint,column,street] of columns) {
    const matching = roadsByName.get(street);
    if (!matching || waterAt?.(x,z) || isOnBridge?.(x,z)) continue;
    // The adjacent cycleway or service lane can be nearer than the named street.
    // Check its clearance independently of the matching road used to aim the arm.
    const near = nearestRoad(x,z);
    if (!near || near.distance > 18 || near.distance < roadProfile(near.road).driveWidth/2+.3) continue;
    let owner, offsetX, offsetZ, best=18*18;
    for (const road of matching) for (let i=1;i<road.points.length;i++) {
      const [ax,az]=road.points[i-1], [bx,bz]=road.points[i];
      const dx=bx-ax,dz=bz-az;
      const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)||0));
      const rx=x-ax-t*dx,rz=z-az-t*dz, d=rx*rx+rz*rz;
      if (d<best) {owner=road;best=d;offsetX=rx;offsetZ=rz;}
    }
    if (!owner || best<(roadProfile(owner).driveWidth/2+.3)**2 ||
        (canOccupy && !canOccupy({x,z,yaw:0},POLE_CLEARANCE))) continue;
    // Adjacent inventory records can describe one shared column. Never move a
    // recorded position to force it into an incompatible OSM carriageway.
    if (lamps.some(lamp => Math.abs(lamp.x-x)<1.5 && (lamp.x-x)**2+(lamp.z-z)**2<1.5**2)) continue;
    lamps.push(Object.freeze({id,x,z,yaw:Math.atan2(-offsetX,offsetZ),roadId:String(owner.id),street,
      source:'ACT',height,outreach,tint,column}));
  }
  return lamps;
}

export function createStreetlights(roads, { waterAt, isOnBridge, canOccupy, nearestRoad, columns=STREETLIGHT_COLUMNS } = {}) {
  const candidates = [];
  for (const road of roads || []) {
    const id = String(road.id || '');
    if (!ELIGIBLE.has(road.type) || id.includes('-airport-')) continue;
    // Bridge decks are lit separately in the render contract; a deck lamp would
    // float above its real ground sample, so tagged crossings are skipped.
    if (road.sourceTags?.bridge && road.sourceTags.bridge !== 'no') continue;
    const profile = roadProfile(road);
    const offset = profile.driveWidth / 2 + (profile.pavementWidth || 1) + PAVEMENT_MARGIN;
    if (offset > PAVEMENT_REACH) continue; // keeps every lamp near its roadway
    const points = road.points;
    if (!Array.isArray(points) || points.length < 2) continue;
    let carried = 0, parity = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      if (!Number.isFinite(length) || length <= 0) continue;
      const ux = dx / length, uz = dz / length;
      for (let travel = SPACING - carried; travel <= length; travel += SPACING) {
        const cx = a[0] + ux * travel, cz = a[1] + uz * travel;
        const side = parity++ % 2 ? 1 : -1;
        const nx = uz * side, nz = -ux * side; // pavement normal, alternating sides
        const x = cx + nx * offset, z = cz + nz * offset;
        if (![x, z].every(Number.isFinite)) continue;
        if (waterAt?.(x, z)) continue;
        if (isOnBridge?.(x, z)) continue;
        // Junction lamps must not stand in any carriageway, including the
        // crossing street's, so the nearest live road is checked as well.
        const near = nearestRoad?.(x, z);
        if (near && near.distance < roadProfile(near.road).driveWidth / 2 + .3) continue;
        candidates.push({ x, z, yaw: Math.atan2(-nx, nz), roadId: id });
      }
      carried = (carried + length) % SPACING;
    }
  }
  // Slot thinning keeps the cap exact and spreads lamps over the whole city
  // instead of filling the first districts. Each cap slot owns a stride window
  // of candidates; the first pole that clears live street geometry wins it.
  const slots = Math.min(STREETLIGHT_CAP, candidates.length), stride = candidates.length / slots;
  let misses = 0;
  const lamps = [];
  for (let slot = 0; slot < slots; slot++) {
    let index = Math.floor(slot * stride) + misses;
    while (index < candidates.length) {
      const candidate = candidates[index++];
      if (canOccupy && !canOccupy(candidate, POLE_CLEARANCE)) { misses++; continue; }
      lamps.push(Object.freeze({ id: `streetlight-${slot}`, x: candidate.x, z: candidate.z, yaw: candidate.yaw, roadId: candidate.roadId }));
      break;
    }
  }
  const surveyed=surveyedColumns(roads,{columns,waterAt,isOnBridge,canOccupy,nearestRoad});
  if (!surveyed.length) return Object.freeze(lamps);
  const nearby=indexStreetlights(surveyed,20), matches=[];
  const complementary=lamps.filter(lamp=>!nearby(lamp.x,lamp.z,12,matches).length);
  return Object.freeze([...complementary,...surveyed]);
}

import { createVehicleFlight } from './vehicle-flight.js';
import { createDrivingState, prepareDriving, measureDriving } from './driving-dynamics.js';
import { coveredCentrePassage } from './covered-passage.js';
import { roadProfile, roadSpeed } from './road-network.js';
import { prepareWaterRing } from './water-contact.js';
import { createTrafficLights } from './traffic-lights.js';
import { CAPITAL_BY_ID as BY_ID, TRAFFIC_CAR_IDS } from '../../assets/car-arcade/fleet.js';
// Coordinates are metres east/south; yaw matches THREE.Object3D.rotation.y.
const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const angleDelta = (a, b) => ((b - a + Math.PI * 3) % TAU) - Math.PI;
const yawFor = (dx, dz) => Math.atan2(-dx, -dz);
// Fleet bumpers and wheel edges extend slightly beyond the authored body sizes.
function vehicleSize(vehicle = {}, overrides = {}) {
  const model = BY_ID[vehicle?.modelId];
  const length = Number.isFinite(vehicle?.length) && vehicle.length > 0 ? clamp(vehicle.length, 1, 16) : model ? model.length + 0.08 : 4.5;
  const width = Number.isFinite(vehicle?.width) && vehicle.width > 0 ? clamp(vehicle.width, 0.5, 4) : model ? model.width + 0.024 : 1.8;
  return { length: overrides.length ?? length, width: overrides.width ?? width };
}

// Keep the original four SAT dot products scalar; collision probes must not
// allocate temporary axis/vector arrays for every nearby vehicle pair.
function vehicleAxisOverlap(dx, dz, x, z, afx, afz, arx, arz, bfx, bfz, brx, brz, al, aw, bl, bw) {
  return Math.abs(dx * x + dz * z) <
    Math.abs(afx * x + afz * z) * al / 2 + Math.abs(arx * x + arz * z) * aw / 2 +
    Math.abs(bfx * x + bfz * z) * bl / 2 + Math.abs(brx * x + brz * z) * bw / 2;
}

export function projectSegment(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  const px = a[0] + dx * t, pz = a[1] + dz * t;
  return { x: px, z: pz, t, distance: Math.hypot(x - px, z - pz) };
}

// Map coordinates stay within +/-20km and every grid cell size is >= 8, so
// cell indices remain far inside +/-0x8000 and this packed integer key is an
// exact, collision-free replacement for a `${x},${z}` string.
const cellKey = (x, z) => (x + 0x8000) * 0x10000 + (z + 0x8000);
class SpatialGrid {
  constructor(size = 64) { this.size = size; this.cells = new Map(); this.extents = new WeakMap(); }
  insert(item, minX, minZ, maxX, maxZ) {
    this.extents.set(item, { minX, minZ, maxX, maxZ });
    for (let x = Math.floor(minX / this.size); x <= Math.floor(maxX / this.size); x++) {
      for (let z = Math.floor(minZ / this.size); z <= Math.floor(maxZ / this.size); z++) {
        const key = cellKey(x, z);
        let cell = this.cells.get(key);
        if (cell === undefined) { cell = []; this.cells.set(key, cell); }
        cell.push(item);
      }
    }
  }
  remove(item) {
    const box = this.extents.get(item);
    if (!box) return;
    for (let x = Math.floor(box.minX / this.size); x <= Math.floor(box.maxX / this.size); x++) {
      for (let z = Math.floor(box.minZ / this.size); z <= Math.floor(box.maxZ / this.size); z++) {
        const key = cellKey(x, z), items = this.cells.get(key), index = items.indexOf(item);
        if (index >= 0) items.splice(index, 1);
        if (!items.length) this.cells.delete(key);
      }
    }
    this.extents.delete(item);
  }
  query(x, z, radius) {
    const found = new Set();
    const minX = x - radius, maxX = x + radius, minZ = z - radius, maxZ = z + radius;
    for (let ix = Math.floor((x - radius) / this.size); ix <= Math.floor((x + radius) / this.size); ix++) {
      for (let iz = Math.floor((z - radius) / this.size); iz <= Math.floor((z + radius) / this.size); iz++) {
        for (const item of this.cells.get(cellKey(ix, iz)) || []) {
          if (found.has(item)) continue;
          const box = this.extents.get(item);
          // Cell membership is deliberately coarse. Retain touching boxes, but
          // avoid polygon/vehicle narrow phases outside the actual query square.
          if (box.maxX >= minX && box.minX <= maxX && box.maxZ >= minZ && box.minZ <= maxZ) found.add(item);
        }
      }
    }
    return found;
  }
}

// Shared OSM node IDs connect ways. Coordinate keys also join clipped/fallback data.
export function buildRoadGraph(roads, { excludeSegment = () => false } = {}) {
  const nodes = new Map(), edges = [], segments = [];
  const coordinates = new Map();
  function nodeFor(road, i) {
    const p = road.points[i], coordinate = `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
    const key = coordinates.get(coordinate) ?? String(road.nodes?.[i] ?? coordinate);
    coordinates.set(coordinate, key);
    if (!nodes.has(key)) nodes.set(key, { id: key, x: p[0], z: p[1], outgoing: [] });
    return nodes.get(key);
  }
  function addEdge(from, to, road, segment, direction) {
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    if (length < 0.1) return;
    const dx = (to.x - from.x) / length, dz = (to.z - from.z) / length;
    const edge = { id: edges.length, from, to, road, segment, direction, length, dx, dz,
      yaw: yawFor(dx, dz), laneOffset: Math.min(roadProfile(road).driveWidth * 0.23, 3.2) };
    from.outgoing.push(edge); segment.edges.push(edge); edges.push(edge);
  }
  for (const road of roads) {
    for (let i = 0; i < road.points.length - 1; i++) {
      const from = nodeFor(road, i), to = nodeFor(road, i + 1);
      if (from === to) continue;
      const segment = { road, a: road.points[i], b: road.points[i + 1], index: i, edges: [] };
      segments.push(segment);
      if (excludeSegment(segment)) continue;
      if (road.oneway !== -1) addEdge(from, to, road, segment, 1);
      if (road.oneway !== 1) addEdge(to, from, road, segment, -1);
    }
  }
  return { nodes, edges, segments };
}

export function pointOnLane(edge, position) {
  return { x: edge.from.x + edge.dx * position + edge.dz * edge.laneOffset,
    z: edge.from.z + edge.dz * position - edge.dx * edge.laneOffset, yaw: edge.yaw };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

function polygonContact(x, z, points, radius) {
  let inside = false, hasClosest = false, closestSq = 0, closestX = 0, closestZ = 0, closestDX = 0, closestDZ = 0, area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j], b = points[i];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    area += a[0] * b[1] - b[0] * a[1];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    // Keep scalar nearest-edge state: these probes run for every vehicle body
    // sample, and allocating a projection plus copied record per edge is costly.
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const px = a[0] + dx * t, pz = a[1] + dz * t;
    const ex = x - px, ez = z - pz, distanceSq = ex * ex + ez * ez;
    // Very close distances can round differently after squaring. Use the
    // original distance comparison for ties so symmetric corners keep their normal.
    const nearlyEqual = hasClosest && Math.abs(distanceSq - closestSq) <= 4 * Number.EPSILON * Math.max(distanceSq, closestSq);
    const closer = nearlyEqual ? Math.hypot(ex, ez) < Math.hypot(x - closestX, z - closestZ) : distanceSq < closestSq;
    if (!hasClosest || closer) {
      hasClosest = true; closestSq = distanceSq; closestX = px; closestZ = pz; closestDX = dx; closestDZ = dz;
    }
  }
  if (!hasClosest) return null;
  // Resolve depth only for the chosen edge.
  const closestDistance = Math.hypot(x - closestX, z - closestZ);
  if (!inside && closestDistance >= radius) return null;
  let nx = x - closestX, nz = z - closestZ;
  const length = Math.hypot(nx, nz);
  if (length > 0.0001) { nx /= length; nz /= length; }
  else {
    const edgeLength = Math.hypot(closestDX, closestDZ) || 1;
    const winding = area < 0 ? -1 : 1;
    nx = closestDZ / edgeLength * winding; nz = -closestDX / edgeLength * winding;
  }
  if (inside && length > 0.0001) { nx = -nx; nz = -nz; }
  return { nx, nz, depth: inside ? radius + closestDistance : radius - closestDistance };
}

// Static feasibility needs only presence, not a resolving normal or depth. Read
// live edges with the same strict distance test as polygonContact.
function polygonIntersectsCircle(x, z, points, radius) {
  let inside = false, hasEdge = false;
  const radiusSq = radius * radius;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j], b = points[i];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const px = a[0] + dx * t, pz = a[1] + dz * t;
    const ex = x - px, ez = z - pz, distanceSq = ex * ex + ez * ez;
    if (distanceSq < radiusSq || (!hasEdge && !(distanceSq >= radiusSq))) return true;
    hasEdge = true;
  }
  return hasEdge && inside;
}

function insideRing(x,z,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[j],b=points[i];
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}

// Route around the legacy solid only when the source-pinned architectural
// passage cannot be prepared. Valid layer-1 geometry shares the actual opening
// with rendering and collision, restoring its source-adjacent travel edges.
function coveredCentreRoutingGuard(map) {
  if (coveredCentrePassage(map)) return () => false;
  const building = (map.buildings || []).find(item => item.id === 'osm-46081156');
  const covered = (map.roads || []).find(road => road.sourceId === 'way/347384260' && road.sourceTags?.covered === 'yes');
  if (!building?.points?.length || building.type === 'roof' || !covered ||
      (map.collisionReplacedBuildingIds || []).includes(building.id)) return () => false;
  const approaches = new Set(['way/347384260', 'way/380074148', 'way/701312042']);
  const rings = [building.points, ...(building.innerRings || []).map(hole => hole.points || hole)];
  return segment => {
    if (!approaches.has(segment.road.sourceId) || Number(segment.road.sourceTags?.layer || 0) > 0 || segment.road.sourceTags?.bridge === 'yes') return false;
    const [ax, az] = segment.a, dx = segment.b[0] - ax, dz = segment.b[1] - az, cuts = [0, 1];
    const onBoundary = (x, z) => rings.some(ring => ring.some((a, j) => projectSegment(x, z, a, ring[(j + 1) % ring.length]).distance < 1e-7));
    // Both retained passage endpoints lie exactly on the solid facade. A car
    // cannot occupy that shared node, so its connecting approach must close too.
    if (onBoundary(ax, az) || onBoundary(segment.b[0], segment.b[1])) return true;
    for (const ring of rings) for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], ex = b[0] - a[0], ez = b[1] - a[1];
      const denominator = dx * ez - dz * ex;
      if (Math.abs(denominator) < 1e-9) continue;
      const t = ((a[0] - ax) * ez - (a[1] - az) * ex) / denominator;
      const u = ((a[0] - ax) * dz - (a[1] - az) * dx) / denominator;
      if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
    }
    cuts.sort((a, b) => a - b);
    return cuts.slice(1).some((end, i) => {
      if (end - cuts[i] < 1e-9) return false;
      const t = (cuts[i] + end) / 2, x = ax + dx * t, z = az + dz * t;
      return onBoundary(x, z) || (insideRing(x, z, building.points) && !rings.slice(1).some(ring => insideRing(x, z, ring)));
    });
  };
}

export function createSimulation(map, options = {}) {
  const graph = buildRoadGraph(map.roads || [], { excludeSegment: coveredCentreRoutingGuard(map) });
  const trafficLights = createTrafficLights(map, graph, options.trafficSignals || map.trafficSignals);
  const roadIndex = new SpatialGrid(80), buildingIndex = new SpatialGrid(48), waterIndex = new SpatialGrid(128), barrierIndex = new SpatialGrid(32);
  const replacedColliders=new Set(map.collisionReplacedBuildingIds||[]);
  // Mission-scoped water waiver: a live predicate may exempt a position from
  // water blocking (the Skylark yard river arm). Surfaces and waterAt stay untouched.
  const waterExemption=options.waterExemption;
  for (const segment of graph.segments) roadIndex.insert(segment,
    Math.min(segment.a[0], segment.b[0]), Math.min(segment.a[1], segment.b[1]),
    Math.max(segment.a[0], segment.b[0]), Math.max(segment.a[1], segment.b[1]));
  // Guardrails can omit bridge tags even when their retained road owner is a deck.
  // Resolve only confirmed bridge owners; ordinary fences retain their planar contact.
  const bridgeRailOwners = new Map();
  const roadsById = new Map((map.roads || []).map(road => [road.id, road]));
  for (const barrier of map.barriers || []) {
    const owner = roadsById.get(barrier.roadContext?.id);
    if (barrier.id?.startsWith('osm-guard-rail-') && owner?.sourceTags?.bridge && owner.sourceTags.bridge !== 'no') bridgeRailOwners.set(barrier, owner);
  }
  function railOverlapsBody(barrier, x, z, base, height) {
    const owner = bridgeRailOwners.get(barrier);
    if (!owner || !options.vehicleHeightAt || !Number.isFinite(base)) return true;
    const railBase = options.vehicleHeightAt({ x, z }, owner);
    if (!Number.isFinite(railBase)) return true;
    return !(base + height + .1 < railBase || base > railBase + (barrier.height || .75) + .1);
  }
  function railOverlapsVehicle(barrier, x, z, pose) {
    return !options.vehicleHeightAt || railOverlapsBody(barrier, x, z, vehicleBase(pose), vehicleBodyHeight(pose));
  }
  const passage = coveredCentrePassage(map);
  for (const building of (map.buildings || []).flatMap(b => b === passage?.building ? passage.groundParts : [b])) {
    if (!building.points?.length||building.type==='roof'||replacedColliders.has(building.id)) continue;
    buildingIndex.insert(building, Math.min(...building.points.map(p => p[0])), Math.min(...building.points.map(p => p[1])),
      Math.max(...building.points.map(p => p[0])), Math.max(...building.points.map(p => p[1])));
  }
  for (const area of map.areas || []) {
    if (area.type !== 'water' || !area.points?.length) continue;
    waterIndex.insert(area, Math.min(...area.points.map(p => p[0])), Math.min(...area.points.map(p => p[1])),
      Math.max(...area.points.map(p => p[0])), Math.max(...area.points.map(p => p[1])));
  }
  function registerStaticBarriers(barriers){
    for(const barrier of barriers){
      if(!barrier.points?.length||barrierIndex.extents.has(barrier))continue;
      barrierIndex.insert(barrier,Math.min(...barrier.points.map(p=>p[0])),Math.min(...barrier.points.map(p=>p[1])),Math.max(...barrier.points.map(p=>p[0])),Math.max(...barrier.points.map(p=>p[1])));
    }
  }
  registerStaticBarriers(map.barriers||[]);
  const waterEdges=new SpatialGrid(128),waterMask=new WeakMap(),waterRings=new WeakMap();
  const waterSurfaces=new WeakMap();
  const underDeck=Object.freeze({underBridge:true});
  for(const area of map.areas||[]){
    if(area.type!=='water')continue;
    if(area.points?.length>2){
      const level=area.id==='osm-relation-3400115-0'?(Number.isFinite(map.lakeWaterLevel)?map.lakeWaterLevel:5.93):area.surfaceY;
      if(Number.isFinite(level))waterSurfaces.set(area,Object.freeze({id:area.id,y:level}));
    }
    waterRings.set(area,{outer:prepareWaterRing(area.points||[]),holes:(area.innerRings||[]).map(r=>prepareWaterRing(r.points||r))});
    for(const ring of [area.points,...(area.innerRings||[]).map(r=>r.points||r)]){
      if(!ring)continue;
      for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const a=ring[j],b=ring[i];
        waterEdges.insert({area},Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1]));
      }
    }
  }
  function waterCell(polygon,x,z){
    const {outer,holes}=waterRings.get(polygon);
    const cx=Math.floor(x/128),cz=Math.floor(z/128),key=`${cx},${cz}`;
    if(!waterMask.has(polygon))waterMask.set(polygon,new Map());
    const cache=waterMask.get(polygon);
    let mask=cache.get(key);
    if(mask===undefined){
      const px=(cx+.5)*128,pz=(cz+.5)*128;
      const boundary=[...waterEdges.query(px,pz,96)].some(edge=>edge.area===polygon);
      mask=boundary?'edge':outer.contains(px,pz)&&!holes.some(r=>r.contains(px,pz))?'water':'land';
      cache.set(key,mask);
    }
    return mask;
  }
  function waterAt(x,z,optionsForWater){
    if(!Number.isFinite(x) || !Number.isFinite(z)) return null;
    if(map.bounds&&(x<map.bounds.minX||x>map.bounds.maxX||z<map.bounds.minZ||z>map.bounds.maxZ))return null;
    if(!optionsForWater?.underBridge&&options.isOnBridge?.(x,z))return null;
    for(const area of waterIndex.query(x,z,0)){
      const surface=waterSurfaces.get(area);
      if(!surface)continue;
      const mask=waterCell(area,x,z),{outer,holes}=waterRings.get(area);
      if(mask==='water'||(mask==='edge'&&outer.contains(x,z)&&!holes.some(r=>r.contains(x,z))))return surface;
    }
    return null;
  }
  function physicalContact(index,polygon,x,z,radius){
    if(index!==waterIndex){
      for(const hole of polygon.innerRings||[]){
        const ring=hole.points||hole;
        if(!insideRing(x,z,ring))continue;
        let contact=null;
        for(let i=0;i<ring.length;i++){
          const edge=projectSegment(x,z,ring[i],ring[(i+1)%ring.length]);
          if(edge.distance>=radius||!insideRing(edge.x,edge.z,polygon.points))continue;
          const d=Math.max(edge.distance,1e-9);
          if(!contact||radius-edge.distance>contact.depth)contact={nx:(x-edge.x)/d,nz:(z-edge.z)/d,depth:radius-edge.distance};
        }
        // A courtyard contact resolves towards its open interior, rather than
        // towards the original building's distant outer facade.
        return contact;
      }
      return polygonContact(x,z,polygon.points,radius);
    }
    if(options.isOnBridge?.(x,z,radius))return null;
    const {outer,holes}=waterRings.get(polygon),mask=waterCell(polygon,x,z);
    if(mask==='land')return null;
    if(mask==='water')return {nx:1,nz:0,depth:radius};
    for(const ring of holes)if([[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].every(([dx,dz])=>ring.contains(x+dx,z+dz)))return null;
    return outer.contact(x,z,radius);
  }
  const parkedCars = [], abandonedCars = [];
  let externalVehicles = [], peopleIndex = new SpatialGrid(8);
  const vehicleImpacts=[];
  function recordVehicleImpact(vehicle,person,dx,dz){
    if(person.id!=='player-body'&&!/^ped:\d+$/.test(person.id))return;
    const travel=Math.hypot(dx,dz),gap=Math.hypot(person.x-vehicle.x,person.z-vehicle.z);
    const measured=Number.isFinite(vehicle.vx)&&Number.isFinite(vehicle.vz)?Math.hypot(vehicle.vx,vehicle.vz):Math.abs(vehicle.speed||0);
    if(travel<1e-9||gap<1e-9||!Number.isFinite(measured)||typeof vehicle.id!=='string')return;
    const velocity=Math.min(60,measured);
    const closing=(dx*(person.x-vehicle.x)+dz*(person.z-vehicle.z))/(travel*gap);
    const speed=velocity*Math.max(0,closing);
    if(speed<1)return;
    const prior=vehicleImpacts.find(event=>event.offenderId===vehicle.id&&event.targetId===person.id);
    if(prior&&prior.speed>=speed)return;
    if(prior)vehicleImpacts.splice(vehicleImpacts.indexOf(prior),1);
    if(vehicleImpacts.length>=32)vehicleImpacts.shift();
    vehicleImpacts.push(Object.freeze({targetId:person.id,offenderId:vehicle.id,speed,
      vx:dx/travel*velocity,vz:dz/travel*velocity,interiorId:null}));
  }
  const peopleStats = { count: 0, cells: 0, queries: 0, lastCandidates: 0, maxCandidates: 0, blocked: 0 };
  function blockedByPeople(person,onContact) { onContact?.(person);peopleStats.blocked++; return false; }
  // Geometry is refreshed once by the controller, never by per-car snapshots.
  // Down adults remain bodies; their state owner explicitly marks absent bodies inactive.
  function setExternalPeople(list = []) {
    peopleIndex = new SpatialGrid(8);
    let count = 0;
    for (const person of Array.isArray(list) ? list : []) {
      if (count >= 256) break;
      if (!person || typeof person.id !== 'string' || person.active === false ||
        ![person.x, person.z].every(Number.isFinite)) continue;
      const radius = person.radius === undefined ? 0.35 : person.radius;
      if (!Number.isFinite(radius) || radius < 0.1 || radius > 2 ||
        person.x < bounds.minX - radius || person.x > bounds.maxX + radius ||
        person.z < bounds.minZ - radius || person.z > bounds.maxZ + radius) continue;
      const body = { id: person.id, x: person.x, z: person.z, radius };
      if (Number.isFinite(person.y)) body.y = person.y;
      if (Number.isFinite(person.height) && person.height > 0) body.height = person.height;
      peopleIndex.insert(body, body.x - radius, body.z - radius, body.x + radius, body.z + radius);
      count++;
    }
    peopleStats.count = count; peopleStats.cells = peopleIndex.cells.size; peopleStats.lastCandidates = 0;
    return count;
  }
  function personLocal(person, pose) {
    const dx = person.x - pose.x, dz = person.z - pose.z;
    return { x: Math.cos(pose.yaw) * dx - Math.sin(pose.yaw) * dz,
      z: -Math.sin(pose.yaw) * dx - Math.cos(pose.yaw) * dz };
  }
  function boxDistance(point, halfWidth, halfLength) {
    const x = Math.abs(point.x) - halfWidth, z = Math.abs(point.z) - halfLength;
    return Math.hypot(Math.max(0, x), Math.max(0, z)) + Math.min(0, Math.max(x, z));
  }
  // Exact minimum distance from a segment to the full rectangle, including corners.
  function segmentBoxDistance(a, b, halfWidth, halfLength) {
    let lo = 0, hi = 1;
    for (const [start, delta, extent] of [[a.x, b.x-a.x, halfWidth], [a.z, b.z-a.z, halfLength]]) {
      if (Math.abs(delta) < 1e-12) { if (Math.abs(start) > extent) { lo = 1; hi = 0; break; } }
      else {
        const u = (-extent-start)/delta, v = (extent-start)/delta;
        lo = Math.max(lo, Math.min(u,v)); hi = Math.min(hi, Math.max(u,v));
      }
    }
    if (lo <= hi) return 0;
    let distance = Math.min(boxDistance(a,halfWidth,halfLength),boxDistance(b,halfWidth,halfLength));
    for (const x of [-halfWidth,halfWidth]) for (const z of [-halfLength,halfLength]) {
      distance = Math.min(distance,projectSegment(x,z,[a.x,a.z],[b.x,b.z]).distance);
    }
    return distance;
  }
  function peopleVehicleClear(pose, length, width, fromPose, ignorePersonId, onContact) {
    const travel = fromPose ? Math.hypot(pose.x-fromPose.x,pose.z-fromPose.z) : 0;
    if (fromPose && (![fromPose.x,fromPose.z,fromPose.yaw].every(Number.isFinite) || travel > 64)) return blockedByPeople();
    const turn = fromPose ? angleDelta(fromPose.yaw,pose.yaw) : 0, corner = Math.hypot(length,width)/2;
    const queryX = fromPose ? (pose.x+fromPose.x)/2 : pose.x, queryZ = fromPose ? (pose.z+fromPose.z)/2 : pose.z;
    const people = peopleIndex.query(queryX,queryZ,travel/2+corner+2);
    peopleStats.queries++; peopleStats.lastCandidates = people.size;
    peopleStats.maxCandidates = Math.max(peopleStats.maxCandidates,people.size);
    const stuntSweep = options.stuntSupportAt && options.vehicleHeightAt && (pose.stuntActive || fromPose?.stuntActive);
    let startY, endY, checkedPerson, checkedOverlap;
    const overlapsLevel = person => {
      if (person === checkedPerson) return checkedOverlap;
      checkedPerson = person; checkedOverlap = true;
      if (!options.vehicleHeightAt) return true;
      const personY = Number.isFinite(person.y) ? person.y : options.actorHeightAt?.(person) ??
        (stuntSweep ? options.vehicleHeightAt(person) : NaN);
      if (!Number.isFinite(personY)) return true;
      // Sample heights only once a planar contact is possible, and retain the
      // entire sweep envelope so crossing a person's level cannot tunnel.
      if (startY === undefined) {
        startY = vehicleBase(fromPose || pose); endY = vehicleBase(pose);
      }
      if (!Number.isFinite(startY) || !Number.isFinite(endY)) return true;
      const carTop = Math.max(startY,endY) + Math.max(vehicleBodyHeight(pose),vehicleBodyHeight(fromPose || pose));
      return checkedOverlap = !(Math.min(startY,endY) > personY + (person.height || 1.8) || carTop < personY);
    };
    for (const person of people) {
      if (person.id === ignorePersonId) continue;
      const end = personLocal(person,pose), endDepth = person.radius-boxDistance(end,width/2,length/2);
      if (!fromPose) { if (endDepth > 1e-9 && overlapsLevel(person)) return blockedByPeople(); continue; }
      const prior = personLocal(person,fromPose);
      let priorDepth = person.radius-boxDistance(prior,width/2,length/2);
      if (Math.abs(turn) < 1e-10) {
        if (priorDepth > 1e-9) {
          // Permit only travel directly out of an existing body contact, never through it.
          const epsilon = 1e-5, near = {x:prior.x+(end.x-prior.x)*epsilon,z:prior.z+(end.z-prior.z)*epsilon};
          if ((endDepth >= priorDepth-1e-9 || boxDistance(near,width/2,length/2) < boxDistance(prior,width/2,length/2)-1e-10) && overlapsLevel(person)) return blockedByPeople(person,onContact);
        } else if (segmentBoxDistance(prior,end,width/2,length/2) < person.radius-1e-9 && overlapsLevel(person)) return blockedByPeople(person,onContact);
        continue;
      }
      // Bound each swept corner arc to 2cm. The inflated clear-body test covers
      // the intervening rotation too, rather than checking only sampled headings.
      const steps = Math.max(1,Math.ceil((travel+Math.abs(turn)*corner)/0.02));
      const margin = (travel+Math.abs(turn)*corner)/steps/2;
      for (let i=1;i<=steps;i++) {
        const t=i/steps, sample = {x:fromPose.x+(pose.x-fromPose.x)*t,z:fromPose.z+(pose.z-fromPose.z)*t,yaw:fromPose.yaw+turn*t};
        const local=personLocal(person,sample), depth=person.radius-boxDistance(local,width/2,length/2);
        if (Math.max(priorDepth,depth)+margin > 1e-9 && overlapsLevel(person)) return blockedByPeople(person,onContact);
        priorDepth=depth;
      }
    }
    return true;
  }
  const stopRequests = new Map();
  function setExternalVehicles(list = []) {
    externalVehicles = list.filter(car => car && typeof car.id === 'string' &&
      [car.x, car.z, car.yaw, car.length, car.width].every(Number.isFinite)).slice(0, 16);
    return externalVehicles.length;
  }
  function requestVehicleStop(id, seconds = 3) {
    if (!traffic.some(car => car.id === id && car.active) || !Number.isFinite(seconds)) return false;
    stopRequests.set(id, Math.max(stopRequests.get(id) || 0, clamp(seconds, 0, 10)));
    return true;
  }
  const vehicleBase=car=>car.stuntActive&&Number.isFinite(car.stuntY)?car.stuntY:Number.isFinite(car.y)?car.y:options.vehicleHeightAt(car,car.edge?.road)+.18;
  const vehicleBodyHeight=car=>Number.isFinite(car.height)&&car.height>0?car.height:BY_ID[car.modelId]?.height||1.6;
  function sameVehicleLevel(a,b) {
    if(!options.vehicleHeightAt)return true;
    // Callers have already bounded X/Z reach. Separate only disjoint actual
    // vertical body intervals; overlapping levels retain the existing SAT.
    const ay=vehicleBase(a),by=vehicleBase(b);
    if(!Number.isFinite(ay)||!Number.isFinite(by))return true;
    return !(ay+vehicleBodyHeight(a)+.1<by||by+vehicleBodyHeight(b)+.1<ay);
  }
  function vehicleOverlap(a, al, aw, b) {
    const dimensions = vehicleSize(b);
    const bl = clamp(dimensions.length, 1, 16), bw = clamp(dimensions.width, 0.5, 4);
    // Half-perimeters enclose both rotated bodies without trigonometry. Only
    // definitely distant pairs skip the existing separating-axis narrow phase.
    const radius = (al + aw + bl + bw) / 2, dx = a.x - b.x, dz = a.z - b.z;
    if (dx * dx + dz * dz > radius * radius) return false;
    if (!sameVehicleLevel(a,b)) return false;
    const afx = -Math.sin(a.yaw || 0), afz = -Math.cos(a.yaw || 0), arx = -afz, arz = afx;
    const bfx = -Math.sin(b.yaw || 0), bfz = -Math.cos(b.yaw || 0), brx = -bfz, brz = bfx;
    return vehicleAxisOverlap(dx, dz, afx, afz, afx, afz, arx, arz, bfx, bfz, brx, brz, al, aw, bl, bw) &&
      vehicleAxisOverlap(dx, dz, arx, arz, afx, afz, arx, arz, bfx, bfz, brx, brz, al, aw, bl, bw) &&
      vehicleAxisOverlap(dx, dz, bfx, bfz, afx, afz, arx, arz, bfx, bfz, brx, brz, al, aw, bl, bw) &&
      vehicleAxisOverlap(dx, dz, brx, brz, afx, afz, arx, arz, bfx, bfz, brx, brz, al, aw, bl, bw);
  }
  function staticVehicleClear(pose, options = {}) {
    let { length, width } = vehicleSize(pose, options);
    if (!pose || ![pose.x, pose.z, pose.yaw, length, width].every(Number.isFinite) || length <= 0 || width <= 0) return false;
    length = clamp(length, 1, 16); width = clamp(width, 0.5, 4);
    const radius = width / 2, span = Math.max(0, length / 2 - radius), samples = Math.max(2, Math.ceil(span * 4));
    const sin = Math.sin(pose.yaw), cos = Math.cos(pose.yaw);
    const firstX = pose.x - sin * -span, firstZ = pose.z - cos * -span;
    if (firstX < bounds.minX + radius || firstX > bounds.maxX - radius || firstZ < bounds.minZ + radius || firstZ > bounds.maxZ - radius) return false;
    // One conservative square covers every original body-circle query. Filter
    // its candidates against each circle's original inclusive query envelope;
    // polygon geometry and bridge callbacks are still read at every sample.
    const reach = radius + span * Math.max(Math.abs(sin), Math.abs(cos));
    // Outward padding covers rounding when a sample lies on a query boundary.
    const envelope = reach + Number.EPSILON * (Math.abs(pose.x) + Math.abs(pose.z) + reach + 1) * 4;
    const candidates = [buildingIndex, barrierIndex, waterIndex].map(index => [index, index.query(pose.x, pose.z, envelope)]);
    for (let i = 0; i <= samples; i++) {
      const offset = -span + 2 * span * i / samples;
      const x = pose.x - sin * offset, z = pose.z - cos * offset;
      if (x < bounds.minX + radius || x > bounds.maxX - radius || z < bounds.minZ + radius || z > bounds.maxZ - radius) return false;
      for (const [index, polygons] of candidates) for (const polygon of polygons) {
        if (index === waterIndex && waterExemption?.(x, z)) continue;
        const box = index.extents.get(polygon);
        if (box.maxX < x - radius || box.minX > x + radius || box.maxZ < z - radius || box.minZ > z + radius) continue;
        if (index === barrierIndex && bridgeRailOwners.has(polygon) && !railOverlapsVehicle(polygon, x, z, pose)) continue;
        const occupied = index !== waterIndex && !polygon.innerRings?.length
          ? polygonIntersectsCircle(x,z,polygon.points,radius)
          : physicalContact(index,polygon,x,z,radius);
        if (occupied) return false;
      }
    }
    return true;
  }
  function vehicleClear(pose, { ignoreId = pose?.id, fromPose, ignorePersonId, ...options } = {}, onContact) {
    let { length, width } = vehicleSize(pose, options);
    if (!staticVehicleClear(pose, { length, width })) return false;
    length = clamp(length, 1, 16); width = clamp(width, 0.5, 4);
    if (!peopleVehicleClear(pose,length,width,fromPose,ignorePersonId,onContact)) return false;
    return ![player, ...traffic, ...parkedIndex.query(pose.x,pose.z,Math.hypot(length,width)/2+4), ...abandonedCars, ...externalVehicles].some(car =>
      car !== pose && car.id !== ignoreId && car.active !== false && vehicleOverlap(pose, length, width, car));
  }
  function canOccupy(pose,options){return vehicleClear(pose,options);}
  function moveVehicle(vehicle, dx, dz, options = {}) {
    const { length, width } = vehicleSize(vehicle, options);
    if (!vehicle || ![vehicle.x, vehicle.z, vehicle.yaw, dx, dz].every(Number.isFinite)) return { moved: false, blocked: true, distance: 0 };
    const startX = vehicle.x, startZ = vehicle.z, requested = Math.hypot(dx, dz), scale = requested > 8 ? 8 / requested : 1;
    dx *= scale; dz *= scale;
    const onContact=person=>recordVehicleImpact(vehicle,person,dx,dz);
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
    let blocked = scale < 1;
    for (let i = 0; i < steps; i++) {
      const pose = { x: vehicle.x + dx / steps, z: vehicle.z + dz / steps, yaw: vehicle.yaw,
        edge:vehicle.edge,modelId:vehicle.modelId,height:vehicle.height,y:vehicle.stuntActive?vehicle.stuntY:vehicle.y,
        supportY:vehicle.supportY,supportX:vehicle.supportX,supportZ:vehicle.supportZ,
        ...(vehicle.stuntActive?{stuntActive:true}:{}) };
      if (!vehicleClear(pose, { length, width, ignoreId: vehicle.id, fromPose: vehicle },onContact)) { blocked = true; break; }
      vehicle.x = pose.x; vehicle.z = pose.z;
    }
    const distance = Math.hypot(vehicle.x - startX, vehicle.z - startZ);
    return { moved: distance > 0.00001, blocked, distance, x: vehicle.x, z: vehicle.z };
  }
  let abandonedSerial = 0, focusPoint;
  let parkedIndex = new SpatialGrid(32);
  const parkedById = new Map();
  function setParkedCars(cars = []) {
    parkedIndex = new SpatialGrid(32);
    parkedCars.length = 0; parkedById.clear();
    let count = 0;
    for (const car of cars) {
      if (!Number.isFinite(car.x) || !Number.isFinite(car.z)) continue;
      const parked = { ...car, id: car.id ?? `parked:${count}`, x: car.x, z: car.z, yaw: Number.isFinite(car.yaw) ? car.yaw : 0,
        modelId: car.modelId || 'lantern', color: car.color ?? 0xd4d7d3, active: car.active !== false };
      if (!BY_ID[car.modelId] && typeof car.suv === 'boolean') {
        parked.length = car.length ?? (car.suv ? 4.5 : 4.7);
        parked.width = car.width ?? (car.suv ? 1.98 : 1.85);
      }
      parkedCars.push(parked); parkedById.set(parked.id, parked);
      const size = vehicleSize(parked), sin = Math.abs(Math.sin(parked.yaw)), cos = Math.abs(Math.cos(parked.yaw));
      const extentX = sin * size.length / 2 + cos * size.width / 2;
      const extentZ = cos * size.length / 2 + sin * size.width / 2;
      parkedIndex.insert(parked, parked.x - extentX, parked.z - extentZ, parked.x + extentX, parked.z + extentZ);
      count++;
    }
    return count;
  }
  const bounds = map.bounds;
  const searchLimit = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 160);
  function nearestRoad(x, z) {
    let best = null;
    for (let radius = 40; radius <= searchLimit * 2; radius *= 2) {
      for (const segment of roadIndex.query(x, z, radius)) {
        const projection = projectSegment(x, z, segment.a, segment.b);
        if (!best || projection.distance < best.distance) best = { ...projection, road: segment.road,
          segment: segment.index, yaw: yawFor(segment.b[0] - segment.a[0], segment.b[1] - segment.a[1]) };
      }
      if (best && best.distance <= radius) return best;
    }
    return best;
  }
  const player = { id: 'player', modelId: 'lantern', color: 0xd4d7d3, active: true, x: 0, z: 0, yaw: 0, speed: 0, vx: 0, vz: 0, steer: 0, odometer: 0, crashes: 0, lastImpactSpeed:0, offroad: false };
  const driving = createDrivingState();
  let nitroAutoRecharge = options.nitroAutoRecharge !== false;
  const flight = options.stuntSupportAt && options.vehicleHeightAt
    ? createVehicleFlight({supportAt:options.stuntSupportAt,heightAt:options.vehicleHeightAt}) : null;
  const random = seededRandom(options.seed ?? 20261112);
  const traffic = [], models = TRAFFIC_CAR_IDS;
  const colors = [0xd4d7d3, 0x777e84, 0x274d79, 0xa4463b, 0xd1c8b4, 0x555952, 0xc5b86e];
  let elapsed = 0, crashCooldown = 0;
  function placeTraffic(car, edge, position) {
    car.edge = edge; car.position = position;
    Object.assign(car, pointOnLane(edge, position));
  }
  function refreshPlayerSupport(source = player, relocated = false) {
    if (!options.preserveVehicleSupport || !options.vehicleHeightAt) return;
    if (!relocated && Number.isFinite(player.supportY) &&
        player.supportX === player.x && player.supportZ === player.z) return;
    // A teleport can move between decks at identical X/Z. Vehicle changes
    // inherit the acquired car's support, including its directed road.
    if (relocated) player.supportY = undefined;
    player.supportY = options.vehicleHeightAt(source, source.edge?.road);
    player.supportX = player.x;
    player.supportZ = player.z;
  }
  function reset(spawn = map.spawn) {
    flight?.clear(player);
    Object.assign(driving, createDrivingState());
    const fallback = graph.edges[0] ? pointOnLane(graph.edges[0], Math.min(8, graph.edges[0].length / 2)) : { x: 0, z: 0, yaw: 0 };
    const target = spawn || fallback;
    Object.assign(player, { x: target.x, z: target.z, yaw: target.yaw || 0, speed: 0, vx: 0, vz: 0, steer: 0,
      odometer: 0, crashes: 0, lastImpactSpeed:0, offroad: false });
    refreshPlayerSupport(player, true);
    crashCooldown = 0; stopRequests.clear(); vehicleImpacts.length=0; trafficLights.reset();
  }
  // Placement previews use the same clearance and heading as teleport.
  function previewTeleport(point) {
    const rejected = reason => ({ ok: false, x: player.x, z: player.z, yaw: player.yaw,
      adjusted: false, reason, distance: 0 });
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z) ||
      (point.yaw !== undefined && !Number.isFinite(point.yaw))) return rejected('invalid-coordinate');
    const yaw = point.yaw === undefined ? (Number.isFinite(player.yaw) ? player.yaw : 0)
      : Math.atan2(Math.sin(point.yaw), Math.cos(point.yaw));
    const {length,width} = vehicleSize(player), radius = width / 2, span = Math.max(0,length / 2 - radius);
    const marginX = Math.min(Math.max(2,radius + span * Math.abs(Math.sin(yaw))), (bounds.maxX - bounds.minX) / 2);
    const marginZ = Math.min(Math.max(2,radius + span * Math.abs(Math.cos(yaw))), (bounds.maxZ - bounds.minZ) / 2);
    const insideBounds = candidate => ({ x: clamp(candidate.x, bounds.minX + marginX, bounds.maxX - marginX),
      z: clamp(candidate.z, bounds.minZ + marginZ, bounds.maxZ - marginZ) });
    const origin = insideBounds(point);
    const clearVehicle = candidate => vehicleClear({ ...player, ...candidate, yaw, supportY:undefined }, { ignorePersonId:'player-body' });
    function blockerAt(candidate) {
      for (const [index, reason] of [[buildingIndex, 'building'], [barrierIndex, 'fence'], [waterIndex, 'water']]) {
        for (const polygon of index.query(candidate.x, candidate.z, 1.8)) {
          const contact = physicalContact(index,polygon,candidate.x,candidate.z,1.8);
          if (contact) return { ...contact, reason };
        }
      }
      for (const car of [...parkedIndex.query(candidate.x, candidate.z, 3.8), ...abandonedCars]) {
        if (!car.active) continue;
        const dx = candidate.x - car.x, dz = candidate.z - car.z, gap = Math.hypot(dx, dz);
        if (gap < 3.8) return { nx: gap > 0.001 ? dx / gap : 1, nz: gap > 0.001 ? dz / gap : 0,
          depth: 3.8 - gap, reason: 'parked-car' };
      }
      for (const car of traffic) {
        if (!car.active) continue;
        const dx = candidate.x - car.x, dz = candidate.z - car.z, gap = Math.hypot(dx, dz);
        if (gap < 3.4) return { nx: gap > 0.001 ? dx / gap : 1, nz: gap > 0.001 ? dz / gap : 0,
          depth: 3.4 - gap, reason: 'traffic' };
      }
      return null;
    }
    const initialBlocker = blockerAt(origin);
    let target = !initialBlocker && clearVehicle(origin) ? origin : null;
    let reason = initialBlocker?.reason || (!target ? 'occupied-space' : origin.x !== point.x || origin.z !== point.z ? 'bounds' : 'exact');
    if (!target) {
      // The closest polygon edge handles even large footprints/lakes without a road snap.
      let projected = origin;
      let escapeDirection = initialBlocker;
      for (let attempt = 0; attempt < 12; attempt++) {
        const contact = blockerAt(projected);
        if (!contact && clearVehicle(projected)) { target = projected; break; }
        if (contact) escapeDirection = contact;
        if (!escapeDirection) break;
        const step = contact ? contact.depth + 0.05 : 0.4;
        const next = insideBounds({ x: projected.x + escapeDirection.nx * step,
          z: projected.z + escapeDirection.nz * step });
        if (Math.hypot(next.x - projected.x, next.z - projected.z) < 0.001) break;
        projected = next;
      }
      if (!target && !blockerAt(projected) && clearVehicle(projected)) target = projected;
      // Nearby clear land takes priority over a longer projection or any road fallback.
      const projectedDistance = target ? Math.hypot(target.x - origin.x, target.z - origin.z) : Infinity;
      search: for (const radius of [2, 4, 8, 12, 20, 32, 48, 64, 96, 128]) {
        if (radius >= projectedDistance) break;
        for (let i = 0; i < 32; i++) {
          const angle = i / 32 * TAU;
          const candidate = insideBounds({ x: origin.x + Math.cos(angle) * radius, z: origin.z + Math.sin(angle) * radius });
          if (!blockerAt(candidate) && clearVehicle(candidate)) { target = candidate; break search; }
        }
      }
    }
    if (!target) {
      const road = nearestRoad(origin.x, origin.z);
      if (road) {
        const candidate = insideBounds(road);
        if (!blockerAt(candidate) && clearVehicle(candidate)) { target = candidate; reason = 'road-fallback'; }
      }
    }
    if (!target) return rejected('no-clear-position');
    const distance = Math.hypot(target.x - point.x, target.z - point.z);
    return { ok: true, x: target.x, z: target.z, yaw, adjusted: distance > 0.000001, reason, distance };
  }
  // Teleport changes position/motion only. Discovery and trip statistics belong to callers.
  function teleport(point) {
    const result = previewTeleport(point);
    if (!result.ok) return result;
    const { x, z, yaw } = result, road = nearestRoad(x, z);
    flight?.clear(player);
    Object.assign(driving, createDrivingState(), { nitroFuel: driving.nitroFuel });
    Object.assign(player, { x, z, yaw, speed: 0, vx: 0, vz: 0, steer: 0,
      offroad: !road || road.distance > roadProfile(road.road).driveWidth * 0.5 + 1 });
    refreshPlayerSupport(player, true);
    crashCooldown = 0;
    return result;
  }
  reset();
  // Source road centrelines can overlap retained fences/buildings/water. Cache
  // only immutable geometry: a waiting player or bus must remain a real queue.
  const trafficEdgeClearance = new Map();
  function trafficEdgeClear(edge, car) {
    const dimensions = vehicleSize(car), key = `${edge.id}:${dimensions.length}:${dimensions.width}`;
    if (!trafficEdgeClearance.has(key)) {
      const samples = Math.max(1, Math.ceil(edge.length / 0.5));
      let clear = true;
      for (let sample = 0; sample <= samples; sample++) {
        if (!staticVehicleClear(pointOnLane(edge, edge.length * sample / samples), dimensions)) { clear = false; break; }
      }
      trafficEdgeClearance.set(key, clear);
    }
    return trafficEdgeClearance.get(key);
  }
  const candidates = graph.edges.filter(edge => edge.length > 8 && roadProfile(edge.road).trafficAllowed);
  const roadSpeeds = new WeakMap();
  function laneSpeed(edge) {
    let limits = roadSpeeds.get(edge.road);
    if (!limits) {
      limits = { forward: roadSpeed(edge.road, 1).kmh / 3.6, reverse: roadSpeed(edge.road, -1).kmh / 3.6 };
      roadSpeeds.set(edge.road, limits);
    }
    return edge.direction < 0 ? limits.reverse : limits.forward;
  }
  function nearbyEdges(radius, focus = focusPoint || player) {
    const nearby = [];
    for (const segment of roadIndex.query(focus.x, focus.z, radius)) {
      if (projectSegment(focus.x, focus.z, segment.a, segment.b).distance > radius) continue;
      for (const edge of segment.edges) if (edge.length > 8 && roadProfile(edge.road).trafficAllowed) nearby.push(edge);
    }
    return nearby;
  }
  // Segment count favours finely mapped side streets. Weight local road length
  // and source road class instead, without enlarging the fixed ambient fleet.
  function spawnPool(edges, focus = focusPoint || player) {
    let total = 0;
    return edges.map(edge => {
      const profile = roadProfile(edge.road), distance = projectSegment(focus.x, focus.z, edge.segment.a, edge.segment.b).distance;
      const demand = profile.major ? 3 + Math.min(3, profile.lanes) + (laneSpeed(edge) >= 70 / 3.6 ? 1 : 0) : 1;
      total += edge.length * demand / (1 + distance / 300);
      return { edge, cumulative: total };
    });
  }
  function pickSpawn(pool) {
    const target = random() * pool[pool.length - 1].cumulative;
    let low = 0, high = pool.length - 1;
    while (low < high) { const middle = (low + high) >>> 1; if (target < pool[middle].cumulative) high = middle; else low = middle + 1; }
    return pool[low].edge;
  }
  const initialEdges = spawnPool(nearbyEdges(350)), fallbackEdges = spawnPool(candidates);
  const trafficCount = Math.max(0, Math.min(options.trafficCount ?? 40, 56));
  for (let i = 0; i < trafficCount && candidates.length; i++) {
    const car = { id: `traffic:${i}`, slot: i, active: true, anger: 0, honks: 0, honkCooldown: 0, overtake: 0, overtakeCooldown: 0, aggressive: i % 3 !== 0, x: 0, z: 0, yaw: 0, speed: 0, modelId: models[i % models.length], color: colors[i % colors.length],
      cruiseFactor: 0.88 + random() * 0.12 };
    let valid = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      const pool = initialEdges.length && attempt < 60 ? initialEdges : fallbackEdges;
      const edge = pickSpawn(pool);
      if (!trafficEdgeClear(edge, car)) continue;
      placeTraffic(car, edge, random() * edge.length);
      const spawnDistance = Math.hypot(car.x - player.x, car.z - player.z);
      if (spawnDistance > 45 && (attempt >= 60 || spawnDistance < 350) &&
        traffic.every(other => Math.hypot(car.x - other.x, car.z - other.z) > 12)) { valid = true; break; }
    }
    car.active = valid;
    traffic.push(car);
  }
  let nextTrafficRefresh = 0;
  function refreshTrafficArea() {
    if (elapsed < nextTrafficRefresh) return;
    nextTrafficRefresh = elapsed + 2;
    const localEdges = spawnPool(nearbyEdges(650));
    if (!localEdges.length) return;
    for (const car of traffic) {
      const focus = focusPoint || player;
      if (Math.hypot(car.x - focus.x, car.z - focus.z) <= (car.active ? 850 : 330)) continue;
      for (let attempt = 0; attempt < 40; attempt++) {
        const edge = pickSpawn(localEdges);
        if (!trafficEdgeClear(edge, car)) continue;
        const position = random() * edge.length, pose = pointOnLane(edge, position);
        const gap = Math.hypot(pose.x - focus.x, pose.z - focus.z);
        // The renderer culls traffic at 300m; replacements enter beyond that view.
        if (gap < 330 || gap > 650 || traffic.some(other => other !== car && other.active && Math.hypot(pose.x - other.x, pose.z - other.z) < 15)) continue;
        placeTraffic(car, edge, position); car.health = 100; car.active = true; car.anger = 0; car.overtake = 0; car.speed = Math.min(10, laneSpeed(edge)); break;
      }
    }
  }
  function nextEdge(car) {
    const choices = car.edge.to.outgoing.filter(edge => roadProfile(edge.road).trafficAllowed && trafficEdgeClear(edge, car));
    const onward = choices.filter(edge => edge.to !== car.edge.from);
    const pool = onward.length ? onward : choices;
    return pool.length ? pool[Math.floor(random() * pool.length)] : null;
  }
  function trafficHorn(car, reason) {
    if (car.honkCooldown > 0) return;
    car.honks++;
    car.honkCooldown = 5 + car.slot % 4;
    options.onTrafficHorn?.({ id: car.id, x: car.x, z: car.z, reason });
  }
  function cutInSpeed(car, edge, body, playerBody, px, pz, ahead) {
    if (car.speed < 6.5 || ahead <= 0 || ahead >= 25 || px * px + pz * pz > 28 ** 2) return Infinity;
    const side = px * edge.dz - pz * edge.dx;
    const sideways = player.vx * edge.dz - player.vz * edge.dx;
    if (Math.abs(sideways) < 1.35 || Math.abs(side - sideways * .25) <= Math.abs(side) + .15) return Infinity;
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    const alignment = Math.abs(fx * edge.dx + fz * edge.dz), across = Math.abs(fx * edge.dz - fz * edge.dx);
    const projectedSide = (playerBody.length * across + playerBody.width * alignment) / 2;
    const laneReach = body.width / 2 + projectedSide + .15;
    const entry = Math.max(0, (Math.abs(side) - laneReach) / Math.abs(sideways));
    if (entry > .65) return Infinity;
    const playerAlong = player.vx * edge.dx + player.vz * edge.dz;
    const closing = car.speed - playerAlong;
    const projectedLength = (playerBody.length * alignment + playerBody.width * across) / 2;
    const gap = ahead - closing * entry - body.length / 2 - projectedLength;
    // A parallel pass has no lateral entry. An entering body must come within
    // short headway as well, even when its longitudinal speed is higher.
    if (gap < -body.length || gap > 1.5 + car.speed * .55 + Math.max(0, closing) * .65 ||
      !sameVehicleLevel(car, player)) return Infinity;
    return Math.max(0, Math.min(car.speed - 1.5, playerAlong + (gap - 4) * 1.6));
  }
  function updateTraffic(dt) {
    refreshTrafficArea();
    const playerBody = player.active !== false && player.vx * player.vx + player.vz * player.vz >= 8 ** 2 ? vehicleSize(player) : null;
    for (const car of traffic) {
      if (!car.active || car.health === 0) continue;
      car.honkCooldown = Math.max(0, car.honkCooldown - dt);
      car.overtakeCooldown = Math.max(0, car.overtakeCooldown - dt);
      const priorPose = { x: car.x, z: car.z, yaw: car.yaw }, priorEdge = car.edge, priorPosition = car.position;
      const edge = car.edge, remaining = edge.length - car.position;
      const body = vehicleSize(car);
      const signalDistance = trafficLights.stopDistance(car, body);
      const signalLimited = Number.isFinite(signalDistance);
      const limit = laneSpeed(edge);
      let target = limit * car.cruiseFactor;
      if (car.aggressive && limit >= 40 / 3.6) target = Math.min(target * 1.05, limit + 3 / 3.6);
      const stopTime = stopRequests.get(car.id) || 0;
      if (stopTime > 0) { target = 0; car.overtake = 0; stopRequests.set(car.id, Math.max(0, stopTime - dt)); }
      const cruise = target;
      if (signalLimited) { target = Math.min(target, Math.sqrt(12 * Math.max(0, signalDistance))); car.overtake = 0; }
      let blocked = false, junctionDistance = Infinity;
      const junctionSpeed = edge.to.outgoing.length > 2 ? Math.sqrt(7.5 ** 2 + 12 * Math.max(0, remaining - 20)) : Infinity;
      target = Math.min(target, junctionSpeed);
      for (const other of traffic) {
        if (car === other || !other.active) continue;
        if(Math.abs(car.x-other.x)<30&&Math.abs(car.z-other.z)<30&&!sameVehicleLevel(car,other))continue;
        if (other.edge === edge && other.position > car.position) {
          const gap = other.position - car.position;
          if (gap < 24) { blocked = true; target = Math.min(target, Math.max(0, (gap - 7) * 0.8)); }
        } else if (remaining < 12 && other.slot < car.slot && other.edge.to === edge.to &&
          other.edge !== edge && other.edge.length - other.position < 10) target = Math.min(target, 1.5);
      }
      const px = player.x - car.x, pz = player.z - car.z;
      const ahead = px * edge.dx + pz * edge.dz;
      if (ahead > 0 && ahead < 22 && Math.abs(px * edge.dz - pz * edge.dx) < 2.8 && sameVehicleLevel(car,player)) target = Math.min(target, Math.max(0, (ahead - 7) * 0.75));
      const emergencySpeed = playerBody && !signalLimited && stopTime <= 0 ? cutInSpeed(car, edge, body, playerBody, px, pz, ahead) : Infinity;
      const cutIn = Number.isFinite(emergencySpeed);
      if (cutIn) {
        target = Math.min(target, emergencySpeed);
        car.overtake = 0;
        car.overtakeCooldown = Math.max(car.overtakeCooldown, 1);
        trafficHorn(car, 'cut-in');
      }
      for (const obstacle of [...parkedIndex.query(car.x,car.z,28), ...abandonedCars, ...traffic, ...externalVehicles]) {
        if (obstacle === car || obstacle.active === false) continue;
        const dx = obstacle.x - car.x, dz = obstacle.z - car.z, obstacleSize = vehicleSize(obstacle);
        if(dx*dx+dz*dz<60*60&&!sameVehicleLevel(car,obstacle))continue;
        if (obstacle.edge && traffic[obstacle.slot] === obstacle) {
          const alignment = edge.dx * obstacle.edge.dx + edge.dz * obstacle.edge.dz;
          // Clear opposing lanes are not lead vehicles, even on narrow roads.
          // The physical sweep still blocks genuinely intersecting car bodies.
          if (alignment < -0.95 && Math.abs(dx * edge.dz - dz * edge.dx) >=
            (body.width + obstacleSize.width) / 2 + 0.15) continue;
          if (Math.abs(alignment) < 0.65) {
            // Crossing cars need approach priority, rather than a following gap.
            // Limit straight-line prediction to these nearby segments and their turn mouths.
            const cross = edge.dx * obstacle.edge.dz - edge.dz * obstacle.edge.dx;
            const ownDistance = (dx * obstacle.edge.dz - dz * obstacle.edge.dx) / cross;
            const otherDistance = (dx * edge.dz - dz * edge.dx) / cross;
            const bothInside = ownDistance < 3 && otherDistance < 3;
            const otherFirst = bothInside ? obstacle.slot < car.slot : otherDistance < 3 ||
              ownDistance > 3 && (otherDistance < ownDistance - 2 || Math.abs(otherDistance - ownDistance) <= 2 && obstacle.slot < car.slot);
            if (ownDistance > 0 && ownDistance < 24 && otherDistance > -3 && otherDistance < 24 &&
              ownDistance < remaining + 4 && otherDistance < obstacle.edge.length - obstacle.position + 4 && otherFirst) {
              junctionDistance = Math.min(junctionDistance, Math.max(0, ownDistance - 6));
              target = Math.min(target, junctionDistance * 0.8);
            }
            continue;
          }
        }
        const ahead = dx * edge.dx + dz * edge.dz;
        if (ahead > 0 && ahead < 24 && Math.abs(dx * edge.dz - dz * edge.dx - (car.overtake > 0 ? -Math.min(3.2, edge.laneOffset * 1.5) : 0)) < 1.5 + obstacleSize.width / 2) {
          target = Math.min(target, Math.max(0, (ahead - 3 - obstacleSize.length / 2) * 0.8));
        }
      }
      if (target < cruise * 0.65 && !signalLimited) blocked = true;
      car.anger = clamp(car.anger + (blocked ? dt * 0.3 : -dt * 0.2), 0, 1);
      if (car.anger > 0.45 && car.honkCooldown === 0) trafficHorn(car, 'queue');
      // Passing stays on wide one-way carriageways, with a clear return corridor.
      const passOffset = -Math.min(3.2, edge.laneOffset * 1.5);
      const lanePose = pointOnLane(edge, car.position);
      const passClear = edge.road.oneway !== 0 && Boolean(edge.road.oneway) && roadProfile(edge.road).driveWidth >= 10 && remaining > 35 &&
        ![player, ...traffic, ...parkedIndex.query(car.x,car.z,30), ...abandonedCars, ...externalVehicles].some(other => {
          if (other === car || other.active === false) return false;
          const dx = other.x - lanePose.x, dz = other.z - lanePose.z;
          return Math.abs(dx * edge.dx + dz * edge.dz) < 24 && Math.abs(dx * edge.dz - dz * edge.dx - passOffset) < 3.1 && sameVehicleLevel(car,other);
        });
      if (car.overtake > 0) {
        car.overtake = Math.max(0, car.overtake - dt);
        if (!passClear) car.overtake = 0;
        else target = Math.min(cruise * 1.1, junctionSpeed, limit + (limit >= 40 / 3.6 ? 3 / 3.6 : 0));
      } else if (car.aggressive && blocked && car.anger > 0.4 && car.overtakeCooldown === 0 && stopTime <= 0 && !signalLimited && passClear) {
        car.overtake = 2; car.overtakeCooldown = 9;
      }
      car.speed += clamp(target - car.speed, -(cutIn ? 14 : 9) * dt, 3.5 * dt);
      // A hard displacement cap keeps fast cars behind the front-bumper stop line.
      if (signalLimited) car.speed = Math.min(car.speed, Math.max(0, signalDistance) / dt);
      if (Number.isFinite(junctionDistance)) car.speed = Math.min(car.speed, junctionDistance / dt);
      car.position += car.speed * dt;
      // Small segments can cross more than one node per tick.
      let transitions = 0;
      while (car.position > car.edge.length && transitions++ < 12) {
        const overflow = car.position - car.edge.length, next = nextEdge(car);
        if (next) { car.edge = next; car.position = overflow; }
        else {
          car.position = car.edge.length; car.speed = 0;
          if (Math.hypot(car.x - (focusPoint || player).x, car.z - (focusPoint || player).z) > 330) car.active = false;
          break;
        }
      }
      const pose = pointOnLane(car.edge, Math.min(car.position, car.edge.length));
      const targetX = pose.x + (car.overtake > 0 ? car.edge.dz * passOffset : 0);
      const targetZ = pose.z - (car.overtake > 0 ? car.edge.dx * passOffset : 0);
      const movement = moveVehicle(car, targetX - car.x, targetZ - car.z);
      if (movement.blocked) { car.edge = priorEdge; car.position = priorPosition; car.x = priorPose.x; car.z = priorPose.z; car.speed = 0; }
      else {
        const turn = angleDelta(car.yaw, pose.yaw) * Math.min(1, dt * 9);
        const turnSteps = Math.max(1, Math.ceil(Math.abs(turn) / 0.05));
        // Translation was swept with the prior heading. Check the rotating body
        // too, so a turning corner cannot overlap and permanently lock its peer.
        for (let turnStep = 0; turnStep < turnSteps && Math.abs(turn) > 0.000001; turnStep++) {
          const nextPose = { x: car.x, z: car.z, yaw: car.yaw + turn / turnSteps,
            modelId: car.modelId, length: car.length, width: car.width, edge:car.edge,height:car.height };
          if (!canOccupy(nextPose, { ignoreId: car.id, fromPose: car })) break;
          car.yaw = nextPose.yaw;
        }
      }
    }
  }
  function resolveImpact(nx, nz, depth) {
    const correction = { x: player.x + nx * depth, z: player.z + nz * depth, yaw: player.yaw,
      supportY:player.supportY,supportX:player.supportX,supportZ:player.supportZ,
      ...(player.stuntActive?{y:player.stuntY,stuntActive:true}:{}) };
    const body = vehicleSize(player);
    if (peopleVehicleClear(correction,body.length,body.width,player)) {
      player.x = correction.x; player.z = correction.z;
    }
    const impact = player.vx * nx + player.vz * nz;
    if (impact < 0) {
      player.vx -= impact * nx * 1.15; player.vz -= impact * nz * 1.15;
      player.vx *= 0.85; player.vz *= 0.85;
      if (-impact > 3 && crashCooldown <= 0) { player.crashes++; player.lastImpactSpeed=-impact; crashCooldown = 0.85; }
    }
  }
  function step(dt, input = {}, focus = player) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    refreshPlayerSupport();
    focusPoint = focus && Number.isFinite(focus.x) && Number.isFinite(focus.z) ? focus : player;
    dt = Math.min(dt, 0.05); elapsed += dt; crashCooldown -= dt;
    trafficLights.step(dt);
    const throttle = clamp(Number(input.throttle) || 0, -1, 1);
    player.steer += (clamp(Number(input.steer) || 0, -1, 1) - player.steer) * Math.min(1, dt * 10);
    const road = nearestRoad(player.x, player.z);
    player.offroad = !road || road.distance > roadProfile(road.road).driveWidth * 0.5 + 1;
    let fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    let forward = player.vx * fx + player.vz * fz;
    let lateral = player.vx * -fz + player.vz * fx;
    const braking = Boolean(input.brake);
    const mods=options.vehicleMods?.()||{},power=options.powerModifiers?.()||{};
    const tier=kind=>clamp(Number.isInteger(mods[kind])?mods[kind]:0,0,2);
    const engine=(1+tier('engine')*.12)*clamp(Number(power.engine)||1,1,1.25);
    const brakeForce=1+tier('brakes')*.15;
    const grip=(1+tier('handling')*.08)*clamp(Number(power.handling)||1,1,1.25);
    const assist = prepareDriving(driving, dt, { throttle, steer: player.steer, forward,
      handbrake: input.handbrake, boost: input.boost, brake: braking, airborne: Boolean(player.stuntActive) });
    const acceleration = throttle * (forward * throttle < -0.5 ? 20*brakeForce : (driving.nitroActive ? 17 : 11.5)*engine);
    forward += acceleration * dt;
    if (braking) forward = Math.sign(forward) * Math.max(0, Math.abs(forward) - 24 * brakeForce * dt);
    const drag = (player.offroad ? 0.9 : 0.14) + assist.handbrakeDrag;
    forward *= Math.exp(-drag * dt);
    if (!throttle) forward = Math.sign(forward) * Math.max(0, Math.abs(forward) - 0.6 * dt);
    forward = clamp(forward, -12, player.offroad ? 27 : driving.nitroActive ? 54 : 46);
    const turnRate = -player.steer * forward * 0.075 / (1 + Math.abs(forward) * 0.035);
    const turn = turnRate * dt * assist.turnScale * grip;
    const turnSteps = Math.max(1, Math.ceil(Math.abs(turn) / 0.05));
    for (let turnStep = 0; turnStep < turnSteps && Math.abs(turn) > 0.000001; turnStep++) {
      const nextPose = { x: player.x, z: player.z, yaw: player.yaw + turn / turnSteps,
        modelId: player.modelId, length: player.length, width: player.width, edge:player.edge,height:player.height,
        supportY:player.supportY,supportX:player.supportX,supportZ:player.supportZ,
        ...(player.stuntActive?{y:player.stuntY,stuntActive:true}:{}) };
      if (!canOccupy(nextPose, { ignoreId: player.id, fromPose: player })) break;
      player.yaw = nextPose.yaw;
    }
    player.yaw = Math.atan2(Math.sin(player.yaw), Math.cos(player.yaw));
    // Preserve world momentum as the body turns; handbrake reduces lateral tyre grip.
    const oldVx = fx * forward - fz * lateral, oldVz = fz * forward + fx * lateral;
    fx = -Math.sin(player.yaw); fz = -Math.cos(player.yaw);
    forward = oldVx * fx + oldVz * fz;
    lateral = (oldVx * -fz + oldVz * fx) * Math.exp(-(assist.lateralGrip ?? (player.offroad ? 3.3 : 7.5)) * dt);
    player.vx = fx * forward - fz * lateral; player.vz = fz * forward + fx * lateral;
    const movement = moveVehicle(player, player.vx * dt, player.vz * dt);
    if (movement.blocked) {
      if (Math.hypot(player.vx, player.vz) > 3 && crashCooldown <= 0) { player.crashes++; player.lastImpactSpeed=Math.hypot(player.vx,player.vz); crashCooldown = 0.85; }
      player.vx *= 0.4; player.vz *= 0.4;
    }
    for (const building of [...buildingIndex.query(player.x, player.z, 2),...barrierIndex.query(player.x,player.z,2)]) {
      const contact = physicalContact(buildingIndex,building,player.x,player.z,1.55);
      if (contact) resolveImpact(contact.nx, contact.nz, contact.depth + 0.02);
    }
    for (const car of [...parkedIndex.query(player.x, player.z, 3.55), ...abandonedCars]) {
      if (!car.active) continue;
      const dx = player.x - car.x, dz = player.z - car.z, gap = Math.hypot(dx, dz);
      if (gap < 3.55 && sameVehicleLevel(player,car)) resolveImpact(gap > 0.001 ? dx / gap : Math.cos(car.yaw),
        gap > 0.001 ? dz / gap : -Math.sin(car.yaw), 3.55 - gap + 0.01);
    }
    refreshPlayerSupport();
    flight?.step(player,dt);
    updateTraffic(dt);
    for (const car of traffic) {
      if (!car.active) continue;
      const dx = player.x - car.x, dz = player.z - car.z, gap = Math.hypot(dx, dz);
      if (gap < 3.2 && sameVehicleLevel(player,car)) resolveImpact(gap > 0.001 ? dx / gap : 1, gap > 0.001 ? dz / gap : 0, (3.2 - gap) * 0.65);
    }
    player.speed = player.vx * fx + player.vz * fz;
    measureDriving(driving, dt, { forward: player.speed, lateral: player.vx * -fz + player.vz * fx,
      boost: input.boost, airborne: Boolean(player.stuntActive), recharge: nitroAutoRecharge });
    player.odometer += Math.hypot(player.vx, player.vz) * dt;
    if (![player.x, player.z, player.yaw, player.speed, player.vx, player.vz].every(Number.isFinite) ||
      player.x < bounds.minX - 15 || player.x > bounds.maxX + 15 || player.z < bounds.minZ - 15 || player.z > bounds.maxZ + 15) {
      const trip = player.odometer, crashes = player.crashes;
      reset(); player.odometer = trip; player.crashes = crashes;
    }
  }
  function setPlayerVehicle(vehicle = {}) {
    flight?.clear(player);
    Object.assign(driving, createDrivingState(), { nitroFuel: driving.nitroFuel });
    if (typeof vehicle.modelId === 'string') player.modelId = vehicle.modelId;
    if (Number.isFinite(vehicle.color)) player.color = vehicle.color;
    return { modelId: player.modelId, color: player.color };
  }
  function nearbyVehicles(x, z, radius = 7) {
    if (![x, z, radius].every(Number.isFinite) || radius < 0) return [];
    return [player, ...traffic, ...parkedIndex.query(x,z,radius), ...abandonedCars].filter(car => car.active !== false &&
      Math.hypot(x - car.x, z - car.z) <= radius).map(car => ({ id: car.id, x: car.x, z: car.z, yaw: car.yaw,
        modelId: car.modelId, color: car.color, personId: car.personId ?? car.id,
        ...(options.vehicleHeightAt?{y:vehicleBase(car)}:{}),
        health: car === player ? undefined : car.health ?? 100, disabled: car !== player && car.health === 0, active: true, occupied: traffic.includes(car), unlocked: car === player || abandonedCars.includes(car), speed: car.speed || 0 }));
  }
  function vehicleForDamage(id) {
    return parkedById.get(id) || traffic.find(item => item.id === id) || abandonedCars.find(item => item.id === id);
  }
  function damageVehicle(id, amount) {
    if (id === 'player' || !Number.isFinite(amount) || amount <= 0) return false;
    const car = vehicleForDamage(id);
    if (!car || car.active === false || car.health === 0) return false;
    car.health = Math.max(0, (car.health ?? 100) - amount);
    if (car.health === 0) { car.speed = 0; car.vx = 0; car.vz = 0; car.overtake = 0; }
    return true;
  }
  function claimVehicle(id, { health = 100 } = {}) {
    if (id === 'player') return { ok: true, vehicle: { ...nearbyVehicles(player.x, player.z, 0)[0] }, stolen: false, reason: 'current' };
    const car = traffic.find(item => item.id === id) || parkedById.get(id) || abandonedCars.find(item => item.id === id);
    if (!car || !car.active) return { ok: false, vehicle: null, stolen: false, reason: 'unavailable' };
    if (car.health === 0) return { ok: false, vehicle: null, stolen: false, reason: 'disabled' };
    if (Math.abs(car.speed || 0) > 5) return { ok: false, vehicle: null, stolen: false, reason: 'moving' };
    const prior = { id: `abandoned:${++abandonedSerial}`, x: player.x, z: player.z, yaw: player.yaw,
      modelId: player.modelId, color: player.color, health: clamp(health, 0, 100), active: true,
      ...(options.vehicleHeightAt?{y:vehicleBase(player)}:{}) };
    if (abandonedCars.length >= 12) {
      const disposable = abandonedCars.findIndex(item => !item.active || Math.hypot(item.x - player.x, item.z - player.z) > 330);
      if (disposable < 0) return { ok: false, vehicle: null, stolen: false, reason: 'vehicle-limit' };
      abandonedCars.splice(disposable, 1);
    }
    const stolen = !abandonedCars.includes(car);
    abandonedCars.push(prior);
    car.active = false; car.speed = 0;
    flight?.clear(player);
    Object.assign(driving, createDrivingState(), { nitroFuel: driving.nitroFuel });
    Object.assign(player, { x: car.x, z: car.z, yaw: car.yaw, modelId: car.modelId, color: car.color,
      speed: 0, vx: 0, vz: 0, steer: 0 });
    refreshPlayerSupport(car, true);
    return { ok: true, vehicle: { ...nearbyVehicles(player.x, player.z, 0).find(item => item.id === 'player'), health: car.health ?? 100 }, stolen, reason: 'claimed' };
  }
  function sweepActor(actor, dx, dz, radius, playerVehicle, allowSwimming) {
    if (!actor || ![actor.x, actor.z, dx, dz, radius].every(Number.isFinite) || radius <= 0) return { moved: false, blocked: true, distance: 0 };
    radius = clamp(radius, 0.1, 2);
    const startX = actor.x, startZ = actor.z;
    let water=allowSwimming ? waterAt(startX,startZ,actor.swimming?underDeck:undefined) : null;
    // A bounded sweep prevents thin-wall tunnelling and never seeks a distant road.
    const length = Math.hypot(dx, dz), scale = length > 8 ? 8 / length : 1;
    dx *= scale; dz *= scale;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.min(radius * 0.5, 0.2)));
    function moveIfClear(x, z) {
      if (x < bounds.minX + radius || x > bounds.maxX - radius || z < bounds.minZ + radius || z > bounds.maxZ - radius) return false;
      for (const index of [buildingIndex, barrierIndex, waterIndex]) for (const polygon of index.query(x, z, radius)) {
        if(allowSwimming && index===waterIndex && waterSurfaces.has(polygon)) continue;
        if(index===waterIndex && waterExemption?.(x,z)) continue;
        if (index === barrierIndex && bridgeRailOwners.has(polygon) && !railOverlapsBody(polygon, x, z,
          Number.isFinite(actor.y) ? actor.y : options.actorHeightAt?.({ ...actor, x, z }), actor.height || 1.8)) continue;
        if (physicalContact(index,polygon,x,z,radius)) return false;
      }
      const nextWater=allowSwimming ? waterAt(x,z,water?underDeck:undefined) : null;
      if(water && !nextWater && options.groundHeightAt?.(x,z)>water.y+1.55) return false;
      const blocked=[playerVehicle, ...traffic, ...parkedIndex.query(x,z,radius+3), ...abandonedCars, ...externalVehicles].some(car => {
        if (!car || !Number.isFinite(car.x) || !Number.isFinite(car.z) || car === actor ||
            (typeof actor.id === 'string' && car.id === actor.id) || car.active === false) return false;
        const size = vehicleSize(car);
        const yaw = car.yaw || 0, dx = x - car.x, dz = z - car.z;
        const along = Math.abs(-Math.sin(yaw) * dx - Math.cos(yaw) * dz);
        const across = Math.abs(Math.cos(yaw) * dx - Math.sin(yaw) * dz);
        const clearX=Math.max(0,along-size.length/2),clearZ=Math.max(0,across-size.width/2);
        if(clearX*clearX+clearZ*clearZ>=radius*radius) return false;
        if(options.vehicleHeightAt) {
          const actorY=Number.isFinite(actor.y)?actor.y:options.actorHeightAt?.(actor);
          const nextY=Number.isFinite(actor.y)?actor.y:options.actorHeightAt?.({...actor,x,z});
          if(Number.isFinite(actorY)&&Number.isFinite(nextY)) {
            const carY=vehicleBase(car),height=Number.isFinite(actor.height)&&actor.height>0?actor.height:1.8;
            if(Number.isFinite(carY)&&(Math.min(actorY,nextY)>carY+vehicleBodyHeight(car)||Math.max(actorY,nextY)+height<carY)) return false;
          }
        }
        // A refreshed moving hull can already touch an actor. Permit only
        // decreasing penetration, so small outward steps can leave that contact.
        const prior=personLocal(actor,car),next=personLocal({x,z},car);
        const priorDistance=boxDistance(prior,size.width/2,size.length/2);
        const nextDistance=boxDistance(next,size.width/2,size.length/2);
        if(priorDistance<radius-1e-9 && nextDistance>priorDistance+1e-9) {
          const near={x:prior.x+(next.x-prior.x)*1e-5,z:prior.z+(next.z-prior.z)*1e-5};
          if(boxDistance(near,size.width/2,size.length/2)>=priorDistance-1e-10) return false;
        }
        return !nextWater || !options.vehicleHeightAt || vehicleBase(car)<=nextWater.y+.8;
      });
      if(blocked) return false;
      actor.x=x; actor.z=z; water=nextWater;
      return true;
    }
    let blocked = scale < 1;
    for (let i = 0; i < steps; i++) {
      const x = actor.x + dx / steps, z = actor.z + dz / steps;
      if (!moveIfClear(x,z)) { blocked=true; if(!moveIfClear(x,actor.z)) moveIfClear(actor.x,z); }
    }
    const distance = Math.hypot(actor.x - startX, actor.z - startZ);
    const result={ moved: distance > 0.00001, blocked, distance, x: actor.x, z: actor.z };
    if(allowSwimming) result.water=water;
    return result;
  }
  const moveActor=(actor,dx,dz,radius=.45,playerVehicle=player)=>sweepActor(actor,dx,dz,radius,playerVehicle,false);
  const moveSwimmingActor=(actor,dx,dz,radius=.45,playerVehicle=player)=>sweepActor(actor,dx,dz,radius,playerVehicle,true);
  function hasLineOfSight(a, b) {
    if (!a || !b || ![a.x, a.z, b.x, b.z].every(Number.isFinite)) return false;
    const distance = Math.hypot(b.x - a.x, b.z - a.z);
    if (distance > 1500) return false;
    const polygons = buildingIndex.query((a.x + b.x) / 2, (a.z + b.z) / 2, distance / 2 + 1);
    for (const polygon of polygons) {
      if (physicalContact(buildingIndex,polygon,a.x,a.z,.001) || physicalContact(buildingIndex,polygon,b.x,b.z,.001)) return false;
      for (let i = 0, j = polygon.points.length - 1; i < polygon.points.length; j = i++) {
        const p = polygon.points[j], q = polygon.points[i];
        const rx = b.x - a.x, rz = b.z - a.z, sx = q[0] - p[0], sz = q[1] - p[1];
        const cross = rx * sz - rz * sx;
        if (Math.abs(cross) < 1e-9) continue;
        const tx = p[0] - a.x, tz = p[1] - a.z;
        const t = (tx * sz - tz * sx) / cross, u = (tx * rz - tz * rx) / cross;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1 && !(polygon.innerRings||[]).some(h=>insideRing(a.x+rx*t,a.z+rz*t,h.points||h))) return false;
      }
    }
    return true;
  }
  return { player, driving, traffic, parkedCars, abandonedCars, graph, trafficLights, step, reset, teleport, previewTeleport, nearestRoad, setParkedCars,
    setNitroAutoRecharge(enabled) { nitroAutoRecharge = enabled === true; },
    registerStaticBarriers, unregisterStaticBarriers: barriers => barriers.forEach(part=>barrierIndex.remove(part)),
    setExternalVehicles, setExternalPeople, canOccupy, moveVehicle, requestVehicleStop, drainVehicleImpacts:()=>vehicleImpacts.splice(0),
    get peopleContacts() { return Object.freeze({ ...peopleStats }); },
    setPlayerVehicle, nearbyVehicles, claimVehicle, vehicleForDamage, damageVehicle, moveActor, moveSwimmingActor, waterAt, hasLineOfSight, get elapsed() { return elapsed; } };
}

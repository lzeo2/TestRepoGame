import { roadProfile } from './road-network.js';
import { createTrafficLights } from './traffic-lights.js';
import { BY_ID } from '../../assets/car-arcade/fleet.js';
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

export function projectSegment(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  const px = a[0] + dx * t, pz = a[1] + dz * t;
  return { x: px, z: pz, t, distance: Math.hypot(x - px, z - pz) };
}

class SpatialGrid {
  constructor(size = 64) { this.size = size; this.cells = new Map(); }
  insert(item, minX, minZ, maxX, maxZ) {
    for (let x = Math.floor(minX / this.size); x <= Math.floor(maxX / this.size); x++) {
      for (let z = Math.floor(minZ / this.size); z <= Math.floor(maxZ / this.size); z++) {
        const key = `${x},${z}`;
        if (!this.cells.has(key)) this.cells.set(key, []);
        this.cells.get(key).push(item);
      }
    }
  }
  query(x, z, radius) {
    const found = new Set();
    for (let ix = Math.floor((x - radius) / this.size); ix <= Math.floor((x + radius) / this.size); ix++) {
      for (let iz = Math.floor((z - radius) / this.size); iz <= Math.floor((z + radius) / this.size); iz++) {
        for (const item of this.cells.get(`${ix},${iz}`) || []) found.add(item);
      }
    }
    return found;
  }
}

// Shared OSM node IDs connect ways. Coordinate keys also join clipped/fallback data.
export function buildRoadGraph(roads) {
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
  let inside = false, closest = null, area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j], b = points[i];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    area += a[0] * b[1] - b[0] * a[1];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const candidate = projectSegment(x, z, a, b);
    if (!closest || candidate.distance < closest.distance) closest = { ...candidate, dx: b[0] - a[0], dz: b[1] - a[1] };
  }
  if (!closest || (!inside && closest.distance >= radius)) return null;
  let nx = x - closest.x, nz = z - closest.z;
  const length = Math.hypot(nx, nz);
  if (length > 0.0001) { nx /= length; nz /= length; }
  else {
    const edgeLength = Math.hypot(closest.dx, closest.dz) || 1;
    const winding = area < 0 ? -1 : 1;
    nx = closest.dz / edgeLength * winding; nz = -closest.dx / edgeLength * winding;
  }
  if (inside && length > 0.0001) { nx = -nx; nz = -nz; }
  return { nx, nz, depth: inside ? radius + closest.distance : radius - closest.distance };
}

function insideRing(x,z,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[j],b=points[i];
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}

export function createSimulation(map, options = {}) {
  const graph = buildRoadGraph(map.roads || []);
  const trafficLights = createTrafficLights(map, graph, options.trafficSignals || map.trafficSignals);
  const roadIndex = new SpatialGrid(80), buildingIndex = new SpatialGrid(48), waterIndex = new SpatialGrid(128), barrierIndex = new SpatialGrid(32);
  const replacedColliders=new Set(map.collisionReplacedBuildingIds||[]);
  for (const segment of graph.segments) roadIndex.insert(segment,
    Math.min(segment.a[0], segment.b[0]), Math.min(segment.a[1], segment.b[1]),
    Math.max(segment.a[0], segment.b[0]), Math.max(segment.a[1], segment.b[1]));
  for (const building of map.buildings || []) {
    if (!building.points?.length||building.type==='roof'||replacedColliders.has(building.id)) continue;
    buildingIndex.insert(building, Math.min(...building.points.map(p => p[0])), Math.min(...building.points.map(p => p[1])),
      Math.max(...building.points.map(p => p[0])), Math.max(...building.points.map(p => p[1])));
  }
  for (const area of map.areas || []) {
    if (area.type !== 'water' || !area.points?.length) continue;
    waterIndex.insert(area, Math.min(...area.points.map(p => p[0])), Math.min(...area.points.map(p => p[1])),
      Math.max(...area.points.map(p => p[0])), Math.max(...area.points.map(p => p[1])));
  }
  for(const barrier of map.barriers||[]){
    if(!barrier.points?.length)continue;
    barrierIndex.insert(barrier,Math.min(...barrier.points.map(p=>p[0])),Math.min(...barrier.points.map(p=>p[1])),Math.max(...barrier.points.map(p=>p[0])),Math.max(...barrier.points.map(p=>p[1])));
  }
  const waterEdges=new SpatialGrid(128),waterMask=new WeakMap();
  for(const area of map.areas||[]){
    if(area.type!=='water')continue;
    for(const ring of [area.points,...(area.innerRings||[]).map(r=>r.points||r)]){
      if(!ring)continue;
      for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const a=ring[j],b=ring[i];
        waterEdges.insert({area},Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1]));
      }
    }
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
    const holes=(polygon.innerRings||[]).map(r=>r.points||r);
    const cx=Math.floor(x/128),cz=Math.floor(z/128),key=`${cx},${cz}`;
    if(!waterMask.has(polygon))waterMask.set(polygon,new Map());
    const cache=waterMask.get(polygon);
    let mask=cache.get(key);
    if(mask===undefined){
      const px=(cx+.5)*128,pz=(cz+.5)*128;
      const boundary=[...waterEdges.query(px,pz,96)].some(edge=>edge.area===polygon);
      mask=boundary?'edge':insideRing(px,pz,polygon.points)&&!holes.some(r=>insideRing(px,pz,r))?'water':'land';
      cache.set(key,mask);
    }
    if(mask==='land')return null;
    if(mask==='water')return {nx:1,nz:0,depth:radius};
    for(const ring of holes)if([[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].every(([dx,dz])=>insideRing(x+dx,z+dz,ring)))return null;
    return polygonContact(x,z,polygon.points,radius);
  }
  const parkedCars = [], abandonedCars = [];
  let externalVehicles = [], peopleIndex = new SpatialGrid(8);
  const peopleStats = { count: 0, cells: 0, queries: 0, lastCandidates: 0, maxCandidates: 0, blocked: 0 };
  function blockedByPeople() { peopleStats.blocked++; return false; }
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
  function peopleVehicleClear(pose, length, width, fromPose, ignorePersonId) {
    const travel = fromPose ? Math.hypot(pose.x-fromPose.x,pose.z-fromPose.z) : 0;
    if (fromPose && (![fromPose.x,fromPose.z,fromPose.yaw].every(Number.isFinite) || travel > 64)) return blockedByPeople();
    const turn = fromPose ? angleDelta(fromPose.yaw,pose.yaw) : 0, corner = Math.hypot(length,width)/2;
    const queryX = fromPose ? (pose.x+fromPose.x)/2 : pose.x, queryZ = fromPose ? (pose.z+fromPose.z)/2 : pose.z;
    const people = peopleIndex.query(queryX,queryZ,travel/2+corner+2);
    peopleStats.queries++; peopleStats.lastCandidates = people.size;
    peopleStats.maxCandidates = Math.max(peopleStats.maxCandidates,people.size);
    for (const person of people) {
      if (person.id === ignorePersonId) continue;
      const end = personLocal(person,pose), endDepth = person.radius-boxDistance(end,width/2,length/2);
      if (!fromPose) { if (endDepth > 1e-9) return blockedByPeople(); continue; }
      const prior = personLocal(person,fromPose);
      let priorDepth = person.radius-boxDistance(prior,width/2,length/2);
      if (Math.abs(turn) < 1e-10) {
        if (priorDepth > 1e-9) {
          // Permit only travel directly out of an existing body contact, never through it.
          const epsilon = 1e-5, near = {x:prior.x+(end.x-prior.x)*epsilon,z:prior.z+(end.z-prior.z)*epsilon};
          if (endDepth >= priorDepth-1e-9 || boxDistance(near,width/2,length/2) < boxDistance(prior,width/2,length/2)-1e-10) return blockedByPeople();
        } else if (segmentBoxDistance(prior,end,width/2,length/2) < person.radius-1e-9) return blockedByPeople();
        continue;
      }
      // Bound each swept corner arc to 2cm. The inflated clear-body test covers
      // the intervening rotation too, rather than checking only sampled headings.
      const steps = Math.max(1,Math.ceil((travel+Math.abs(turn)*corner)/0.02));
      const margin = (travel+Math.abs(turn)*corner)/steps/2;
      for (let i=1;i<=steps;i++) {
        const t=i/steps, sample = {x:fromPose.x+(pose.x-fromPose.x)*t,z:fromPose.z+(pose.z-fromPose.z)*t,yaw:fromPose.yaw+turn*t};
        const local=personLocal(person,sample), depth=person.radius-boxDistance(local,width/2,length/2);
        if (Math.max(priorDepth,depth)+margin > 1e-9) return blockedByPeople();
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
  function vehicleOverlap(a, al, aw, b) {
    const dimensions = vehicleSize(b);
    const bl = clamp(dimensions.length, 1, 16), bw = clamp(dimensions.width, 0.5, 4);
    const axes = [a.yaw || 0, b.yaw || 0].flatMap(yaw =>
      [[-Math.sin(yaw), -Math.cos(yaw)], [Math.cos(yaw), -Math.sin(yaw)]]);
    const af = [-Math.sin(a.yaw || 0), -Math.cos(a.yaw || 0)], ar = [-af[1], af[0]];
    const bf = [-Math.sin(b.yaw || 0), -Math.cos(b.yaw || 0)], br = [-bf[1], bf[0]];
    return axes.every(([x, z]) => Math.abs((a.x - b.x) * x + (a.z - b.z) * z) <
      Math.abs(af[0] * x + af[1] * z) * al / 2 + Math.abs(ar[0] * x + ar[1] * z) * aw / 2 +
      Math.abs(bf[0] * x + bf[1] * z) * bl / 2 + Math.abs(br[0] * x + br[1] * z) * bw / 2);
  }
  function staticVehicleClear(pose, options = {}) {
    let { length, width } = vehicleSize(pose, options);
    if (!pose || ![pose.x, pose.z, pose.yaw, length, width].every(Number.isFinite) || length <= 0 || width <= 0) return false;
    length = clamp(length, 1, 16); width = clamp(width, 0.5, 4);
    const radius = width / 2, span = Math.max(0, length / 2 - radius), samples = Math.max(2, Math.ceil(span * 4));
    for (let i = 0; i <= samples; i++) {
      const offset = -span + 2 * span * i / samples;
      const x = pose.x - Math.sin(pose.yaw) * offset, z = pose.z - Math.cos(pose.yaw) * offset;
      if (x < bounds.minX + radius || x > bounds.maxX - radius || z < bounds.minZ + radius || z > bounds.maxZ - radius) return false;
      for (const index of [buildingIndex, barrierIndex, waterIndex]) for (const polygon of index.query(x, z, radius)) {
        if (physicalContact(index,polygon,x,z,radius)) return false;
      }
    }
    return true;
  }
  function canOccupy(pose, { ignoreId = pose?.id, fromPose, ignorePersonId, ...options } = {}) {
    let { length, width } = vehicleSize(pose, options);
    if (!staticVehicleClear(pose, { length, width })) return false;
    length = clamp(length, 1, 16); width = clamp(width, 0.5, 4);
    if (!peopleVehicleClear(pose,length,width,fromPose,ignorePersonId)) return false;
    return ![player, ...traffic, ...parkedIndex.query(pose.x,pose.z,Math.hypot(length,width)/2+4), ...abandonedCars, ...externalVehicles].some(car =>
      car !== pose && car.id !== ignoreId && car.active !== false && vehicleOverlap(pose, length, width, car));
  }
  function moveVehicle(vehicle, dx, dz, options = {}) {
    const { length, width } = vehicleSize(vehicle, options);
    if (!vehicle || ![vehicle.x, vehicle.z, vehicle.yaw, dx, dz].every(Number.isFinite)) return { moved: false, blocked: true, distance: 0 };
    const startX = vehicle.x, startZ = vehicle.z, requested = Math.hypot(dx, dz), scale = requested > 8 ? 8 / requested : 1;
    dx *= scale; dz *= scale;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
    let blocked = scale < 1;
    for (let i = 0; i < steps; i++) {
      const pose = { x: vehicle.x + dx / steps, z: vehicle.z + dz / steps, yaw: vehicle.yaw };
      if (!canOccupy(pose, { length, width, ignoreId: vehicle.id, fromPose: vehicle })) { blocked = true; break; }
      vehicle.x = pose.x; vehicle.z = pose.z;
    }
    const distance = Math.hypot(vehicle.x - startX, vehicle.z - startZ);
    return { moved: distance > 0.00001, blocked, distance, x: vehicle.x, z: vehicle.z };
  }
  let abandonedSerial = 0, focusPoint;
  let parkedIndex = new SpatialGrid(32);
  function setParkedCars(cars = []) {
    parkedIndex = new SpatialGrid(32);
    parkedCars.length = 0;
    let count = 0;
    for (const car of cars) {
      if (!Number.isFinite(car.x) || !Number.isFinite(car.z)) continue;
      const parked = { ...car, id: car.id ?? `parked:${count}`, x: car.x, z: car.z, yaw: Number.isFinite(car.yaw) ? car.yaw : 0,
        modelId: car.modelId || 'lantern', color: car.color ?? 0xd4d7d3, active: car.active !== false };
      if (typeof car.suv === 'boolean') {
        parked.length = car.length ?? (car.suv ? 4.5 : 4.7);
        parked.width = car.width ?? (car.suv ? 1.98 : 1.85);
      }
      parkedCars.push(parked);
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
  const random = seededRandom(options.seed ?? 20261112);
  const traffic = [], models = ['lantern', 'orchard', 'gravel', 'relay', 'atlas', 'finch'];
  const colors = [0xd4d7d3, 0x777e84, 0x274d79, 0xa4463b, 0xd1c8b4, 0x555952, 0xc5b86e];
  let elapsed = 0, crashCooldown = 0;
  function placeTraffic(car, edge, position) {
    car.edge = edge; car.position = position;
    Object.assign(car, pointOnLane(edge, position));
  }
  function reset(spawn = map.spawn) {
    const fallback = graph.edges[0] ? pointOnLane(graph.edges[0], Math.min(8, graph.edges[0].length / 2)) : { x: 0, z: 0, yaw: 0 };
    const target = spawn || fallback;
    Object.assign(player, { x: target.x, z: target.z, yaw: target.yaw || 0, speed: 0, vx: 0, vz: 0, steer: 0,
      odometer: 0, crashes: 0, lastImpactSpeed:0, offroad: false });
    crashCooldown = 0; stopRequests.clear(); trafficLights.reset();
  }
  // Teleport keeps the current heading unless an explicit finite yaw is supplied.
  // It changes position/motion only; discovery and trip statistics belong to callers.
  function teleport(point) {
    const rejected = reason => ({ ok: false, x: player.x, z: player.z, yaw: player.yaw,
      adjusted: false, reason, distance: 0 });
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z) ||
      (point.yaw !== undefined && !Number.isFinite(point.yaw))) return rejected('invalid-coordinate');
    const marginX = Math.min(2, (bounds.maxX - bounds.minX) / 2);
    const marginZ = Math.min(2, (bounds.maxZ - bounds.minZ) / 2);
    const insideBounds = candidate => ({ x: clamp(candidate.x, bounds.minX + marginX, bounds.maxX - marginX),
      z: clamp(candidate.z, bounds.minZ + marginZ, bounds.maxZ - marginZ) });
    const origin = insideBounds(point);
    function blockerAt(candidate) {
      for (const [index, reason] of [[buildingIndex, 'building'], [barrierIndex, 'fence'], [waterIndex, 'water']]) {
        for (const polygon of index.query(candidate.x, candidate.z, 1.8)) {
          const contact = physicalContact(index,polygon,candidate.x,candidate.z,1.8);
          if (contact) return { ...contact, reason };
        }
      }
      for (const car of [...parkedIndex.query(candidate.x, candidate.z, 1.8), ...abandonedCars]) {
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
    let target = initialBlocker ? null : origin;
    let reason = initialBlocker?.reason || (origin.x !== point.x || origin.z !== point.z ? 'bounds' : 'exact');
    if (!target) {
      // The closest polygon edge handles even large footprints/lakes without a road snap.
      let projected = origin;
      for (let attempt = 0; attempt < 12; attempt++) {
        const contact = blockerAt(projected);
        if (!contact) { target = projected; break; }
        const next = insideBounds({ x: projected.x + contact.nx * (contact.depth + 0.05),
          z: projected.z + contact.nz * (contact.depth + 0.05) });
        if (Math.hypot(next.x - projected.x, next.z - projected.z) < 0.001) break;
        projected = next;
      }
      if (!target && !blockerAt(projected)) target = projected;
      // Nearby clear land takes priority over a longer projection or any road fallback.
      const projectedDistance = target ? Math.hypot(target.x - origin.x, target.z - origin.z) : Infinity;
      search: for (const radius of [2, 4, 8, 12, 20, 32, 48, 64, 96, 128]) {
        if (radius >= projectedDistance) break;
        for (let i = 0; i < 32; i++) {
          const angle = i / 32 * TAU;
          const candidate = insideBounds({ x: origin.x + Math.cos(angle) * radius, z: origin.z + Math.sin(angle) * radius });
          if (!blockerAt(candidate)) { target = candidate; break search; }
        }
      }
    }
    if (!target) {
      const road = nearestRoad(origin.x, origin.z);
      if (road) {
        const candidate = insideBounds(road);
        if (!blockerAt(candidate)) { target = candidate; reason = 'road-fallback'; }
      }
    }
    if (!target) return rejected('no-clear-position');
    const yaw = point.yaw === undefined ? (Number.isFinite(player.yaw) ? player.yaw : 0)
      : Math.atan2(Math.sin(point.yaw), Math.cos(point.yaw));
    const road = nearestRoad(target.x, target.z);
    Object.assign(player, { x: target.x, z: target.z, yaw, speed: 0, vx: 0, vz: 0, steer: 0,
      offroad: !road || road.distance > roadProfile(road.road).driveWidth * 0.5 + 1 });
    crashCooldown = 0;
    const distance = Math.hypot(target.x - point.x, target.z - point.z);
    return { ok: true, x: target.x, z: target.z, yaw, adjusted: distance > 0.000001, reason, distance };
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
  function nearbyEdges(radius, focus = focusPoint || player) {
    const nearby = [];
    for (const segment of roadIndex.query(focus.x, focus.z, radius)) {
      if (projectSegment(focus.x, focus.z, segment.a, segment.b).distance > radius) continue;
      for (const edge of segment.edges) if (edge.length > 8 && roadProfile(edge.road).trafficAllowed) nearby.push(edge);
    }
    return nearby;
  }
  const initialEdges = nearbyEdges(350);
  const trafficCount = Math.max(0, Math.min(options.trafficCount ?? 40, 56));
  for (let i = 0; i < trafficCount && candidates.length; i++) {
    const car = { id: `traffic:${i}`, slot: i, active: true, anger: 0, honks: 0, honkCooldown: 0, overtake: 0, overtakeCooldown: 0, aggressive: i % 3 !== 0, x: 0, z: 0, yaw: 0, speed: 0, modelId: models[i % models.length], color: colors[i % colors.length],
      cruiseFactor: 0.78 + random() * 0.2 };
    let valid = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      const pool = initialEdges.length && attempt < 60 ? initialEdges : candidates;
      const edge = pool[Math.floor(random() * pool.length)];
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
    const localEdges = nearbyEdges(650);
    if (!localEdges.length) return;
    for (const car of traffic) {
      const focus = focusPoint || player;
      if (Math.hypot(car.x - focus.x, car.z - focus.z) <= (car.active ? 850 : 330)) continue;
      for (let attempt = 0; attempt < 40; attempt++) {
        const edge = localEdges[Math.floor(random() * localEdges.length)];
        if (!trafficEdgeClear(edge, car)) continue;
        const position = random() * edge.length, pose = pointOnLane(edge, position);
        const gap = Math.hypot(pose.x - focus.x, pose.z - focus.z);
        // The renderer culls traffic at 300m; replacements enter beyond that view.
        if (gap < 330 || gap > 650 || traffic.some(other => other !== car && other.active && Math.hypot(pose.x - other.x, pose.z - other.z) < 15)) continue;
        placeTraffic(car, edge, position); car.active = true; car.anger = 0; car.overtake = 0; car.speed = Math.min(10, (edge.road.speed || 50) / 3.6); break;
      }
    }
  }
  function nextEdge(car) {
    const choices = car.edge.to.outgoing.filter(edge => roadProfile(edge.road).trafficAllowed && trafficEdgeClear(edge, car));
    const onward = choices.filter(edge => edge.to !== car.edge.from);
    const pool = onward.length ? onward : choices;
    return pool.length ? pool[Math.floor(random() * pool.length)] : null;
  }
  function updateTraffic(dt) {
    refreshTrafficArea();
    for (const car of traffic) {
      if (!car.active) continue;
      car.honkCooldown = Math.max(0, car.honkCooldown - dt);
      car.overtakeCooldown = Math.max(0, car.overtakeCooldown - dt);
      const priorPose = { x: car.x, z: car.z, yaw: car.yaw }, priorEdge = car.edge, priorPosition = car.position;
      const edge = car.edge, remaining = edge.length - car.position;
      const body = vehicleSize(car);
      const signalDistance = trafficLights.stopDistance(car, body);
      const signalLimited = Number.isFinite(signalDistance);
      // OSM maxspeed is km/h. Junction courtesy and spacing are intentionally simple.
      let target = clamp((edge.road.speed || 50) / 3.6, 5, 24) * car.cruiseFactor * (car.aggressive ? 1.16 : 1);
      const stopTime = stopRequests.get(car.id) || 0;
      if (stopTime > 0) { target = 0; car.overtake = 0; stopRequests.set(car.id, Math.max(0, stopTime - dt)); }
      const cruise = target;
      if (signalLimited) { target = Math.min(target, Math.sqrt(12 * Math.max(0, signalDistance))); car.overtake = 0; }
      let blocked = false, junctionDistance = Infinity;
      if (edge.to.outgoing.length > 2 && remaining < 20) target = Math.min(target, 7.5);
      for (const other of traffic) {
        if (car === other || !other.active) continue;
        if (other.edge === edge && other.position > car.position) {
          const gap = other.position - car.position;
          if (gap < 24) { blocked = true; target = Math.min(target, Math.max(0, (gap - 7) * 0.8)); }
        } else if (remaining < 12 && other.slot < car.slot && other.edge.to === edge.to &&
          other.edge !== edge && other.edge.length - other.position < 10) target = Math.min(target, 1.5);
      }
      const px = player.x - car.x, pz = player.z - car.z;
      const ahead = px * edge.dx + pz * edge.dz;
      if (ahead > 0 && ahead < 22 && Math.abs(px * edge.dz - pz * edge.dx) < 2.8) target = Math.min(target, Math.max(0, (ahead - 7) * 0.75));
      for (const obstacle of [...parkedIndex.query(car.x,car.z,28), ...abandonedCars, ...traffic, ...externalVehicles]) {
        if (obstacle === car || obstacle.active === false) continue;
        const dx = obstacle.x - car.x, dz = obstacle.z - car.z, obstacleSize = vehicleSize(obstacle);
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
      if (car.anger > 0.45 && car.honkCooldown === 0) { car.honks++; car.honkCooldown = 5 + car.slot % 4; }
      // Passing stays on wide one-way carriageways, with a clear return corridor.
      const passOffset = -Math.min(3.2, edge.laneOffset * 1.5);
      const lanePose = pointOnLane(edge, car.position);
      const passClear = edge.road.oneway !== 0 && Boolean(edge.road.oneway) && roadProfile(edge.road).driveWidth >= 10 && remaining > 35 &&
        ![player, ...traffic, ...parkedIndex.query(car.x,car.z,30), ...abandonedCars, ...externalVehicles].some(other => {
          if (other === car || other.active === false) return false;
          const dx = other.x - lanePose.x, dz = other.z - lanePose.z;
          return Math.abs(dx * edge.dx + dz * edge.dz) < 24 && Math.abs(dx * edge.dz - dz * edge.dx - passOffset) < 3.1;
        });
      if (car.overtake > 0) {
        car.overtake = Math.max(0, car.overtake - dt);
        if (!passClear) car.overtake = 0;
        else target = Math.min(cruise * 1.1, 28);
      } else if (car.aggressive && blocked && car.anger > 0.4 && car.overtakeCooldown === 0 && stopTime <= 0 && !signalLimited && passClear) {
        car.overtake = 2; car.overtakeCooldown = 9;
      }
      car.speed += clamp(target - car.speed, -9 * dt, 3.5 * dt);
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
            modelId: car.modelId, length: car.length, width: car.width };
          if (!canOccupy(nextPose, { ignoreId: car.id, fromPose: car })) break;
          car.yaw = nextPose.yaw;
        }
      }
    }
  }
  function resolveImpact(nx, nz, depth) {
    const correction = { x: player.x + nx * depth, z: player.z + nz * depth, yaw: player.yaw };
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
    const acceleration = throttle * (forward * throttle < -0.5 ? 20 : input.boost ? 17 : 11.5);
    forward += acceleration * dt;
    if (braking) forward = Math.sign(forward) * Math.max(0, Math.abs(forward) - 24 * dt);
    const drag = (player.offroad ? 0.9 : 0.14) + (input.handbrake ? 0.65 : 0);
    forward *= Math.exp(-drag * dt);
    if (!throttle) forward = Math.sign(forward) * Math.max(0, Math.abs(forward) - 0.6 * dt);
    forward = clamp(forward, -12, player.offroad ? 27 : input.boost ? 54 : 46);
    const turnRate = -player.steer * forward * 0.075 / (1 + Math.abs(forward) * 0.035);
    const turn = turnRate * dt * (input.handbrake ? 1.42 : 1);
    const turnSteps = Math.max(1, Math.ceil(Math.abs(turn) / 0.05));
    for (let turnStep = 0; turnStep < turnSteps && Math.abs(turn) > 0.000001; turnStep++) {
      const nextPose = { x: player.x, z: player.z, yaw: player.yaw + turn / turnSteps,
        modelId: player.modelId, length: player.length, width: player.width };
      if (!canOccupy(nextPose, { ignoreId: player.id, fromPose: player })) break;
      player.yaw = nextPose.yaw;
    }
    player.yaw = Math.atan2(Math.sin(player.yaw), Math.cos(player.yaw));
    // Preserve world momentum as the body turns; handbrake reduces lateral tyre grip.
    const oldVx = fx * forward - fz * lateral, oldVz = fz * forward + fx * lateral;
    fx = -Math.sin(player.yaw); fz = -Math.cos(player.yaw);
    forward = oldVx * fx + oldVz * fz;
    lateral = (oldVx * -fz + oldVz * fx) * Math.exp(-(input.handbrake ? 1.1 : player.offroad ? 3.3 : 7.5) * dt);
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
    for (const car of [...parkedIndex.query(player.x, player.z, 1.55), ...abandonedCars]) {
      if (!car.active) continue;
      const dx = player.x - car.x, dz = player.z - car.z, gap = Math.hypot(dx, dz);
      if (gap < 3.55) resolveImpact(gap > 0.001 ? dx / gap : Math.cos(car.yaw),
        gap > 0.001 ? dz / gap : -Math.sin(car.yaw), 3.55 - gap + 0.01);
    }
    updateTraffic(dt);
    for (const car of traffic) {
      if (!car.active) continue;
      const dx = player.x - car.x, dz = player.z - car.z, gap = Math.hypot(dx, dz);
      if (gap < 3.2) resolveImpact(gap > 0.001 ? dx / gap : 1, gap > 0.001 ? dz / gap : 0, (3.2 - gap) * 0.65);
    }
    player.speed = player.vx * fx + player.vz * fz;
    player.odometer += Math.hypot(player.vx, player.vz) * dt;
    if (![player.x, player.z, player.yaw, player.speed, player.vx, player.vz].every(Number.isFinite) ||
      player.x < bounds.minX - 15 || player.x > bounds.maxX + 15 || player.z < bounds.minZ - 15 || player.z > bounds.maxZ + 15) {
      const trip = player.odometer, crashes = player.crashes;
      reset(); player.odometer = trip; player.crashes = crashes;
    }
  }
  function setPlayerVehicle(vehicle = {}) {
    if (typeof vehicle.modelId === 'string') player.modelId = vehicle.modelId;
    if (Number.isFinite(vehicle.color)) player.color = vehicle.color;
    return { modelId: player.modelId, color: player.color };
  }
  function nearbyVehicles(x, z, radius = 7) {
    if (![x, z, radius].every(Number.isFinite) || radius < 0) return [];
    return [player, ...traffic, ...parkedIndex.query(x,z,radius), ...abandonedCars].filter(car => car.active !== false &&
      Math.hypot(x - car.x, z - car.z) <= radius).map(car => ({ id: car.id, x: car.x, z: car.z, yaw: car.yaw,
        modelId: car.modelId, color: car.color, personId: car.personId ?? car.id,
        active: true, occupied: traffic.includes(car), unlocked: car === player || abandonedCars.includes(car), speed: car.speed || 0 }));
  }
  function claimVehicle(id) {
    if (id === 'player') return { ok: true, vehicle: { ...nearbyVehicles(player.x, player.z, 0)[0] }, stolen: false, reason: 'current' };
    const car = [...traffic, ...parkedCars, ...abandonedCars].find(item => item.id === id && item.active);
    if (!car) return { ok: false, vehicle: null, stolen: false, reason: 'unavailable' };
    if (Math.abs(car.speed || 0) > 5) return { ok: false, vehicle: null, stolen: false, reason: 'moving' };
    const prior = { id: `abandoned:${++abandonedSerial}`, x: player.x, z: player.z, yaw: player.yaw,
      modelId: player.modelId, color: player.color, active: true };
    if (abandonedCars.length >= 12) {
      const disposable = abandonedCars.findIndex(item => !item.active || Math.hypot(item.x - player.x, item.z - player.z) > 330);
      if (disposable < 0) return { ok: false, vehicle: null, stolen: false, reason: 'vehicle-limit' };
      abandonedCars.splice(disposable, 1);
    }
    const stolen = !abandonedCars.includes(car);
    abandonedCars.push(prior);
    car.active = false; car.speed = 0;
    Object.assign(player, { x: car.x, z: car.z, yaw: car.yaw, modelId: car.modelId, color: car.color,
      speed: 0, vx: 0, vz: 0, steer: 0 });
    return { ok: true, vehicle: nearbyVehicles(player.x, player.z, 0).find(item => item.id === 'player'), stolen, reason: 'claimed' };
  }
  function moveActor(actor, dx, dz, radius = 0.45) {
    if (!actor || ![actor.x, actor.z, dx, dz, radius].every(Number.isFinite) || radius <= 0) return { moved: false, blocked: true, distance: 0 };
    radius = clamp(radius, 0.1, 2);
    const startX = actor.x, startZ = actor.z;
    // A bounded sweep prevents thin-wall tunnelling and never seeks a distant road.
    const length = Math.hypot(dx, dz), scale = length > 8 ? 8 / length : 1;
    dx *= scale; dz *= scale;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.min(radius * 0.5, 0.2)));
    function clear(x, z) {
      if (x < bounds.minX + radius || x > bounds.maxX - radius || z < bounds.minZ + radius || z > bounds.maxZ - radius) return false;
      for (const index of [buildingIndex, barrierIndex, waterIndex]) for (const polygon of index.query(x, z, radius)) {
        if (physicalContact(index,polygon,x,z,radius)) return false;
      }
      return ![player, ...traffic, ...parkedIndex.query(x,z,radius+3), ...abandonedCars, ...externalVehicles].some(car => {
        if (car === actor || (typeof actor.id === 'string' && car.id === actor.id) || car.active === false) return false;
        const size = vehicleSize(car);
        const yaw = car.yaw || 0, dx = x - car.x, dz = z - car.z;
        const along = Math.abs(-Math.sin(yaw) * dx - Math.cos(yaw) * dz);
        const across = Math.abs(Math.cos(yaw) * dx - Math.sin(yaw) * dz);
        return Math.hypot(Math.max(0, along - size.length / 2), Math.max(0, across - size.width / 2)) < radius;
      });
    }
    let blocked = scale < 1;
    for (let i = 0; i < steps; i++) {
      const x = actor.x + dx / steps, z = actor.z + dz / steps;
      if (clear(x, z)) { actor.x = x; actor.z = z; }
      else { blocked = true; if (clear(x, actor.z)) actor.x = x; else if (clear(actor.x, z)) actor.z = z; }
    }
    const distance = Math.hypot(actor.x - startX, actor.z - startZ);
    return { moved: distance > 0.00001, blocked, distance, x: actor.x, z: actor.z };
  }
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
  return { player, traffic, parkedCars, abandonedCars, graph, trafficLights, step, reset, teleport, nearestRoad, setParkedCars,
    setExternalVehicles, setExternalPeople, canOccupy, moveVehicle, requestVehicleStop,
    get peopleContacts() { return Object.freeze({ ...peopleStats }); },
    setPlayerVehicle, nearbyVehicles, claimVehicle, moveActor, hasLineOfSight, get elapsed() { return elapsed; } };
}

import { LIGHT_RAIL_SOURCE } from './light-rail-source.js';

const TRAIN_LENGTH = 26.4, TRAIN_WIDTH = 2.62;
const SERVICE_SPEED = 21, TURN_SPEED = 8, ACCEL = 1.75, BRAKE = 2.1;
const DWELL = 7, SUBSTEP = 1 / 30, HEADWAY = 150;
const BOARD_REACH = 5, SERVICE_TRAINS = 8, RESERVE_CLEARANCE = 500;
const finitePose = pose => pose && Number.isFinite(pose.x) && Number.isFinite(pose.z);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function compilePlatform(stop, key, line, heightAt, canStand) {
  const footprint = stop.platforms[key], direction = key === 'north' ? 1 : -1;
  const index = line.nodes.indexOf(stop[key]);
  const [railX, railZ] = line.points[index];
  const [ax, az] = line.points[Math.max(0, index - 2)], [bx, bz] = line.points[Math.min(line.points.length - 1, index + 2)];
  const trackYaw = Math.atan2(ax - bx, az - bz);
  const corners = footprint.points.slice(0, -1);
  const x = corners.reduce((sum, point) => sum + point[0], 0) / corners.length;
  const z = corners.reduce((sum, point) => sum + point[1], 0) / corners.length;
  const edges = corners.map(([px, pz], i) => {
    const [qx, qz] = corners[(i + 1) % corners.length];
    return {dx:qx - px, dz:qz - pz, length:Math.hypot(qx - px, qz - pz)};
  });
  const long = edges.reduce((best, edge) => edge.length > best.length ? edge : best);
  const sameDirection = long.dx * Math.sin(trackYaw) + long.dz * Math.cos(trackYaw) < 0;
  const fx = long.dx / long.length * (sameDirection ? 1 : -1);
  const fz = long.dz / long.length * (sameDirection ? 1 : -1);
  const yaw = Math.atan2(-fx, -fz);
  const width = edges.filter(edge => edge.length < long.length / 2).reduce((sum, edge) => sum + edge.length, 0) / 2;
  const length = edges.filter(edge => edge.length >= long.length / 2).reduce((sum, edge) => sum + edge.length, 0) / 2;
  const side = Math.sign((railX - x) * Math.cos(yaw) - (railZ - z) * Math.sin(yaw)) || 1;
  const doorSide = Math.sign((x - railX) * Math.cos(trackYaw) - (z - railZ) * Math.sin(trackYaw)) || -side;
  const nearDoor = (railX - x) * fx + (railZ - z) * fz;
  const candidates = [0, 2, -2, 4, -4, 8, -8].map(offset => {
    const at = Math.min(length / 2 - .8, Math.max(.8 - length / 2, nearDoor + offset));
    return {x:x + fx * at, z:z + fz * at, yaw:trackYaw};
  });
  const approach = candidates.find(candidate => canStand(candidate)) || candidates[0];
  return Object.freeze({id:`${stop.id}-${key}`, stopId:stop.id, name:stop.name, direction,
    sourceId:footprint.sourceId, points:Object.freeze(footprint.points.map(point => Object.freeze(point.slice()))),
    x, z, y:heightAt(x,z), yaw, side, doorSide, length, platformWidth:width,
    approach:Object.freeze({...approach, y:heightAt(approach.x,approach.z)})});
}

function compileLine(source, bounds, heightAt, canStand) {
  const routes = source.lines.map(line => Object.freeze({
    id: line.id, direction: line.direction,
    points: Object.freeze(line.points.map(point => Object.freeze(point.slice()))),
  }));
  if (!bounds || routes.some(route => route.points.some(([x,z]) =>
    x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ))) return null;
  const north = source.lines[0], south = source.lines[2];
  const platforms = [];
  const platformsByStop = new Map();
  const stops = source.stops.map(stop => {
    const northPlatform = compilePlatform(stop, 'north', north, heightAt, canStand);
    const southPlatform = compilePlatform(stop, 'south', south, heightAt, canStand);
    platforms.push(northPlatform, southPlatform);
    platformsByStop.set(stop.id, {north:northPlatform, south:southPlatform});
    const {approach} = stop === source.stops.at(-1) ? southPlatform : northPlatform;
    return Object.freeze({id:stop.id, name:stop.name, sourceId:`node/${stop.station}`,
      x:approach.x, z:approach.z, y:approach.y, approach,
      aliases:Object.freeze(['light rail','tram','Capital Line',`${stop.name} light rail`])});
  });
  const path = [], markers = [];
  let circuitLength = 0;
  for (const line of source.lines) {
    const direction = line.direction === 1 ? 'north' : 'south';
    const names = new Map(source.stops.map((stop, i) => [stop[direction], {
      stop:stops[i], platform:platformsByStop.get(stop.id)[direction],
    }]));
    for (let i = 0; i < line.points.length; i++) {
      if (line.direction && names.has(line.nodes[i]))
        markers.push(Object.freeze({distance:circuitLength, ...names.get(line.nodes[i]), direction:line.direction}));
      if (i === line.points.length - 1) break;
      const a = line.points[i], b = line.points[i + 1], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < .001) continue;
      path.push({a,b,length,becomes:circuitLength+length,start:circuitLength,direction:line.direction,
        yaw:Math.atan2(a[0]-b[0], a[1]-b[1])});
      circuitLength += length;
    }
  }
  return {routes:Object.freeze(routes), stops:Object.freeze(stops), platforms:Object.freeze(platforms), markers, path, circuitLength};
}

export function createLightRail(map, { heightAt = () => 0, canStand = () => true, canReach = () => true } = {}) {
  const line = compileLine(LIGHT_RAIL_SOURCE, map?.bounds, heightAt, canStand);
  const stops = line?.stops || Object.freeze([]), routes = line?.routes || Object.freeze([]);
  const platforms = line?.platforms || Object.freeze([]), stopsById = new Map(stops.map(stop => [stop.id,stop]));
  const fleet = line ? Array.from({length:SERVICE_TRAINS + 1}, (_, i) => ({
    id:`capital-tram-${i + 1}`, kind:'tram', width:TRAIN_WIDTH,length:TRAIN_LENGTH,
    x:0,y:0,z:0,yaw:0,speed:0,active:i<SERVICE_TRAINS,stopId:null,nextStopId:null,doorsOpen:false,
    occupied:true,direction:0,playerAboard:false,
  })) : [];
  const records = fleet.map(train => ({train, distance:0, at:0, next:0, dwell:0, track:0}));
  const cap = line?.circuitLength || 1;
  const wrap = distance => (distance % cap + cap) % cap;
  // Spread the scheduled sets along the full circuit, starting at Alinga Street.
  const startingMarkers = line ? records.map((_, i) => {
    const target = cap * i / SERVICE_TRAINS;
    return i === SERVICE_TRAINS ? 0 : line.markers.reduce((best, marker, index) =>
      Math.abs(marker.distance - target) < Math.abs(line.markers[best].distance - target) ? index : best, 0);
  }) : [];
  let riding = null, exitQueued = false, seatValue;
  const upcoming = record => line.markers[record.next];
  function journey(record) {
    const {markers} = line;
    const previous = markers[(record.next - 1 + markers.length) % markers.length];
    const next = upcoming(record);
    // A terminus has a stop marker on each track. Show the next distinct stop.
    const onward = previous.stop === next.stop ? markers[(record.next + 1) % markers.length] : next;
    return { nextStop:onward.stop.name, destination:(onward.direction === 1 ? stops.at(-1) : stops[0]).name,
      direction:onward.direction };
  }
  const findSegment = (distance, index) => {
    const {path} = line;
    while (index > 0 && distance < path[index].start) index--;
    while (index < path.length - 1 && distance >= path[index].becomes) index++;
    return index;
  };

  function position(record) {
    const {train} = record;
    record.track = findSegment(record.distance, record.track);
    const road = line.path[record.track], t = (record.distance - road.start) / road.length;
    train.x = road.a[0] + (road.b[0] - road.a[0])*t;
    train.z = road.a[1] + (road.b[1] - road.a[1])*t;
    train.y = heightAt(train.x, train.z);
    train.yaw = road.yaw;
    train.direction = train.doorsOpen && record.at >= 0 ? line.markers[record.at].direction : road.direction;
    train.nextStopId = upcoming(record).stop.id;
  }

  function stop(record, index, extraDwell = 0) {
    const occurrence = line.markers[index], {train} = record;
    record.distance = occurrence.distance;
    record.at = index;
    record.next = (index + 1) % line.markers.length;
    record.dwell = DWELL + extraDwell;
    train.speed = 0;
    train.stopId = occurrence.stop.id;
    train.doorSide = occurrence.platform.doorSide;
    train.doorsOpen = true;
    position(record);
    // At terminus track branches the next running segment already reverses.
    // Keep doors facing the arrival platform throughout its dwell.
    const before = line.path[findSegment(wrap(record.distance - .001), record.track)];
    const outward = line.path[record.track];
    if (before.direction === occurrence.direction) train.yaw = before.yaw;
    else if (outward.direction === occurrence.direction) train.yaw = outward.yaw;
  }

  function reset() {
    riding = null; exitQueued = false; seatValue = null;
    if(!line)return;
    records.forEach((record, index) => {
      record.train.playerAboard = false;
      record.train.active = index < SERVICE_TRAINS;
      stop(record, startingMarkers[index], 2);
      if (!record.train.active) {
        record.train.doorsOpen = false;
        record.train.stopId = null;
      }
    });
  }
  reset();

  function nearStop(pose, radius = 12) {
    if (!finitePose(pose) || !Number.isFinite(radius) || radius < 0) return null;
    let closest = null, best = radius;
    for (const platform of platforms) {
      const distance = gap(pose, platform.approach);
      if (distance <= best) { closest = platform; best = distance; }
    }
    return closest ? {...stopsById.get(closest.stopId), approach:closest.approach,
      platformId:closest.id, direction:closest.direction, distance:best} : null;
  }

  function callShuttle(platform, pose) {
    const reserve = records.at(-1);
    if (records.some(record => record.train.active && upcoming(record).platform.id === platform.platformId &&
      wrap(upcoming(record).distance - record.distance) <= 210)) return true;
    if (!reserve || reserve === riding || reserve.train.active && gap(reserve.train, pose) < RESERVE_CLEARANCE) return false;
    for (const [index, occurrence] of line.markers.entries()) {
      if (occurrence.platform.id !== platform.platformId) continue;
      const distance = wrap(occurrence.distance - 160);
      const track = findSegment(distance, 0);
      if (!line.path[track].direction || records.some(record => record !== reserve && record.train.active &&
        Math.min(wrap(record.distance-distance),wrap(distance-record.distance)) < HEADWAY)) continue;
      // The spare set enters the approaching rail ahead of pickup. It then
      // drives and brakes to a normal stop instead of appearing at the door.
      Object.assign(reserve, {distance, track, at:-1, next:index, dwell:0});
      Object.assign(reserve.train, {active:true, speed:12, doorsOpen:false, stopId:null,playerAboard:false});
      position(reserve);
      return true;
    }
    return false;
  }

  function boardableRecord(stopId, direction) {
    return records.find(({train}) => train.active && train.doorsOpen && train.stopId === stopId && train.direction === direction);
  }

  function interact(ctx = {}) {
    if (ctx.recovering || ctx.indoors) return {ok:false,reason:'Use the light rail outside recovery and interiors.'};
    if (riding) {
      if (!riding.train.doorsOpen) {
        exitQueued = true;
        return {ok:false,stopping:true,reason:'Exit requested. Press E at the next platform.'};
      }
      const platform = line.markers[riding.at].platform;
      if (!canStand(platform.approach,riding.train.id)) {
        exitQueued = true;
        return {ok:false,reason:'Platform is blocked. The doors will wait briefly.'};
      }
      riding.train.playerAboard = false;
      riding = null;
      exitQueued = false;
      seatValue = null;
      return {ok:true,exited:true,stopId:platform.stopId,exitPose:platform.approach,reason:`Exited at ${platform.name}.`};
    }
    if (!ctx.onFoot || ctx.busy) return {ok:false,reason:'Finish your activity and approach the platform on foot.'};
    const platform = nearStop(ctx.pose, BOARD_REACH);
    if (!platform) return {ok:false,reason:'Walk to a Capital Line platform marker.'};
    const train = boardableRecord(platform.id,platform.direction);
    if (!train) {
      const called = callShuttle(platform,ctx.pose);
      return {ok:false,waiting:true,stopId:platform.id,
        reason:called?'Tram approaching. Press E when the doors open.':'Wait at the platform for the next tram.'};
    }
    if (!canStand(ctx.pose,train.train.id) || !canReach(ctx.pose,platform.approach))
      return {ok:false,reason:'Find clear space on the platform before boarding.'};
    riding = train;
    riding.train.playerAboard = true;
    exitQueued = false;
    // Give time to enter, then restart promptly.
    train.dwell = Math.min(train.dwell, 2.4);
    const {destination} = journey(train);
    return {ok:true,boarded:true,passenger:true,trainId:train.train.id,stopId:platform.id,reason:`Boarded the Capital Line towards ${destination}.`};
  }

  function step(dt) {
    if (!line || !Number.isFinite(dt) || dt <= 0) return;
    const steps = Math.max(1,Math.ceil(Math.min(dt,.25) / SUBSTEP)), slice = Math.min(dt,.25) / steps;
    for (let index=0; index<steps; index++) for (const record of records) {
      const {train} = record;
      if (!train.active) continue;
      if (record.dwell > 0) {
        record.dwell = Math.max(0, record.dwell - slice);
        if (record.dwell > 0) continue;
        train.doorsOpen = false;
        train.stopId = null;
        record.at = -1;
      }
      const towards = upcoming(record), distance = wrap(towards.distance - record.distance);
      let clearance = Infinity;
      for (const other of records) if (other !== record && other.train.active)
        clearance = Math.min(clearance, wrap(other.distance - record.distance) - HEADWAY);
      const max = line.path[record.track].direction ? SERVICE_SPEED : TURN_SPEED;
      const desired = Math.min(max, Math.sqrt(2*BRAKE*Math.max(0,Math.min(distance,clearance))));
      train.speed += Math.max(-BRAKE*slice, Math.min(ACCEL*slice,desired-train.speed));
      const travel = Math.max(0, Math.min(train.speed*slice,clearance));
      if (distance <= travel + .035) {
        stop(record, record.next, riding === record && exitQueued ? 5 : 0);
        if (riding === record) exitQueued = false;
      } else if (travel > 0) {
        record.distance = wrap(record.distance + travel);
        position(record);
      }
    }
  }

  function snapshot() {
    return { vehicles:fleet.map(train => ({...train})), stops, routes, platforms,
      passenger:!!riding, passengerStopId:riding?.train.stopId || null,
      passengerJourney:riding ? journey(riding) : null, exitRequested:exitQueued };
  }
  return { routes,stops,platforms,vehicles:fleet,nearStop,interact,step,snapshot,reset,
    platformJourney(stopId, direction) { const record = boardableRecord(stopId,direction); return record ? journey(record) : null; },
    get passenger(){return !!riding;},
    get passengerStopId(){return riding?.train.doorsOpen ? riding.train.stopId : null;},
    get passengerJourney(){return riding ? journey(riding) : null;},
    get seatPose(){
      if (!riding) return null;
      const {train} = riding;
      if (!seatValue || seatValue.id !== train.id || seatValue.x !== train.x || seatValue.y !== train.y + 1.25 ||
        seatValue.z !== train.z || seatValue.yaw !== train.yaw || seatValue.speed !== train.speed) {
        seatValue = Object.freeze({id:train.id,x:train.x,y:train.y+1.25,z:train.z,yaw:train.yaw,speed:train.speed});
      }
      return seatValue;
    },
  };
}

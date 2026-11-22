import { LIGHT_RAIL_SOURCE } from './light-rail-source.js';

const TRAIN_LENGTH = 26.4, TRAIN_WIDTH = 2.62;
const SERVICE_SPEED = 21, TURN_SPEED = 8, ACCEL = 1.75, BRAKE = 2.1;
const DWELL = 7, SUBSTEP = 1 / 30, HEADWAY = 150;
const BOARD_REACH = 5;
const finitePose = pose => pose && Number.isFinite(pose.x) && Number.isFinite(pose.z);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function compileLine(source, bounds, heightAt, canStand) {
  const routes = source.lines.map(line => Object.freeze({
    id: line.id, direction: line.direction,
    points: Object.freeze(line.points.map(point => Object.freeze(point.slice()))),
  }));
  if (!bounds || routes.some(route => route.points.some(([x,z]) =>
    x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ))) return null;
  const north = source.lines[0], south = source.lines[2];
  const stops = source.stops.map(stop => {
    const sight = north.nodes.indexOf(stop.north);
    const [nx, nz] = north.points[sight], [sx, sz] = south.points[south.nodes.indexOf(stop.south)];
    const [ax, az] = north.points[Math.max(0, sight - 2)];
    const [bx, bz] = north.points[Math.min(north.points.length - 1, sight + 2)];
    const yaw = Math.atan2(ax - bx, az - bz);
    const centre = {x:(nx + sx) / 2, z:(nz + sz) / 2, yaw};
    // Prefer the station island. Move a blocked spawn up the same island before
    // falling back to its surveyed label. No door exit ever searches a road.
    const candidates = [centre, ...[2,-2,4,-4].map(forward => ({ x:centre.x-Math.sin(yaw)*forward,
      z:centre.z-Math.cos(yaw)*forward, yaw })),
      {x:stop.coordinates[0], z:stop.coordinates[1], yaw}];
    const approach = candidates.find(candidate => canStand(candidate)) || centre;
    const trackGap = Math.hypot(nx-sx,nz-sz);
    return Object.freeze({id:stop.id, name:stop.name, sourceId:`node/${stop.station}`, side:1,
      ...centre, y:heightAt(centre.x, centre.z), trackGap,
      platformWidth:Math.max(.7, trackGap - TRAIN_WIDTH - .16),
      approach:Object.freeze({...approach, y:heightAt(approach.x, approach.z)}),
      aliases:Object.freeze(['light rail','tram','Capital Line',`${stop.name} light rail`])});
  });
  const path = [], markers = [];
  let circuitLength = 0;
  for (const line of source.lines) {
    const names = new Map(source.stops.map((stop, i) => [line.direction === 1 ? stop.north : stop.south, stops[i]]));
    for (let i = 0; i < line.points.length; i++) {
      if (line.direction && names.has(line.nodes[i]))
        markers.push(Object.freeze({distance:circuitLength, stop:names.get(line.nodes[i]), direction:line.direction}));
      if (i === line.points.length - 1) break;
      const a = line.points[i], b = line.points[i + 1], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < .001) continue;
      path.push({a,b,length,becomes:circuitLength+length,start:circuitLength,direction:line.direction,
        yaw:Math.atan2(a[0]-b[0], a[1]-b[1])});
      circuitLength += length;
    }
  }
  return {routes:Object.freeze(routes), stops:Object.freeze(stops), markers, path, circuitLength};
}

export function createLightRail(map, { heightAt = () => 0, canStand = () => true, canReach = () => true } = {}) {
  const line = compileLine(LIGHT_RAIL_SOURCE, map?.bounds, heightAt, canStand);
  const stops = line?.stops || Object.freeze([]), routes = line?.routes || Object.freeze([]);
  const fleet = line ? Array.from({length:5}, (_, i) => ({
    id:`capital-tram-${i + 1}`, kind:'tram', width:TRAIN_WIDTH,length:TRAIN_LENGTH,
    x:0,y:0,z:0,yaw:0,speed:0,active:i!==4,stopId:null,nextStopId:null,doorsOpen:false,
    occupied:true,direction:0,playerAboard:false,
  })) : [];
  const records = fleet.map(train => ({train, distance:0, at:0, next:0, dwell:0, track:0}));
  const cap = line?.circuitLength || 1;
  const wrap = distance => (distance % cap + cap) % cap;
  let riding = null, exitQueued = false, seatValue;
  const upcoming = record => line.markers[record.next];
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
      record.train.active = index < 4;
      stop(record, [0,2,5,8,4][index], 2);
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
    for (const stop of stops) {
      const distance = gap(pose, stop.approach);
      if (distance <= best) { closest = stop; best = distance; }
    }
    return closest ? {...closest, distance:best} : null;
  }

  function callShuttle(stopId, pose) {
    const reserve = records.at(-1);
    if (records.some(record => record.train.active && upcoming(record).stop.id === stopId &&
      wrap(upcoming(record).distance - record.distance) <= 210)) return true;
    if (!reserve || reserve === riding || reserve.train.active && gap(reserve.train, pose) < 320) return false;
    for (const [index, occurrence] of line.markers.entries()) {
      if (occurrence.stop.id !== stopId) continue;
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

  function interact(ctx = {}) {
    if (ctx.recovering || ctx.indoors) return {ok:false,reason:'Use the light rail outside recovery and interiors.'};
    if (riding) {
      if (!riding.train.doorsOpen) {
        exitQueued = true;
        return {ok:false,stopping:true,reason:'Exit requested. Press E at the next platform.'};
      }
      const platform = line.markers[riding.at].stop;
      if (!canStand(platform.approach,riding.train.id)) {
        exitQueued = true;
        return {ok:false,reason:'Platform is blocked. The doors will wait briefly.'};
      }
      riding.train.playerAboard = false;
      riding = null;
      exitQueued = false;
      seatValue = null;
      return {ok:true,exited:true,stopId:platform.id,exitPose:platform.approach,reason:`Exited at ${platform.name}.`};
    }
    if (!ctx.onFoot || ctx.busy) return {ok:false,reason:'Finish your activity and approach the platform on foot.'};
    const platform = nearStop(ctx.pose, BOARD_REACH);
    if (!platform) return {ok:false,reason:'Walk to a Capital Line platform marker.'};
    const available = records.filter(record => record.train.active && record.train.doorsOpen && record.train.stopId === platform.id);
    const train = available.find(record => upcoming(record).stop.id !== platform.id) || available[0];
    if (!train) {
      const called = callShuttle(platform.id,ctx.pose);
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
    return {ok:true,boarded:true,passenger:true,trainId:train.train.id,stopId:platform.id,reason:`Boarded the Capital Line at ${platform.name}.`};
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
    return { vehicles:fleet.map(train => ({...train})), stops, routes,
      passenger:!!riding, passengerStopId:riding?.train.stopId || null, exitRequested:exitQueued };
  }
  return { routes,stops,vehicles:fleet,nearStop,interact,step,snapshot,reset,
    get passenger(){return !!riding;},
    get passengerStopId(){return riding?.train.doorsOpen ? riding.train.stopId : null;},
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

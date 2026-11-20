import { createRoutePlanner, roadProfile } from './road-network.js';

const LENGTH = 5.2, WIDTH = 2.044, MAX_SPEED = 10;
const angle = value => Math.atan2(Math.sin(value), Math.cos(value));
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const copy = value => value == null ? null : JSON.parse(JSON.stringify(value));
const lane = (edge,at) => ({x:edge.from.x+edge.dx*at+edge.dz*edge.laneOffset,
  z:edge.from.z+edge.dz*at-edge.dx*edge.laneOffset,yaw:edge.yaw});

export function deliverySources(stores = [], dealers = []) {
  return Object.freeze([...stores.filter(s => s.type === 'food'),
    ...dealers.filter(s => s.type === 'arms' && s.dealer && s.fictional)]
    .filter(s => Number.isFinite(s.x) && Number.isFinite(s.z))
    .map(s => Object.freeze({id:s.id,name:s.name,kind:s.type === 'food' ? 'food' : 'arms',
      x:s.publicApproach?.x ?? s.x,z:s.publicApproach?.z ?? s.z,roadId:s.roadId,
      weaponIds:s.weaponIds ? Object.freeze([...s.weaponIds]) : undefined})));
}

// Transient physical transport only. The career owner debits/refunds and consumes
// the one terminal event; this owner never grants inventory, money or passive pay.
export function createDeliveryService(map, simulation, { sources = [] } = {}) {
  const planner = createRoutePlanner(simulation.graph);
  const edges = simulation.graph.edges.filter(e => e.length >= 18 && roadProfile(e.road).trafficAllowed);
  const catalog = sources.map(s => Object.freeze({...s,weaponIds:s.weaponIds ? Object.freeze([...s.weaponIds]) : undefined}));
  const car = {id:'delivery-courier',kind:'delivery',modelId:'dockside',personId:'delivery-driver',
    color:'#b68b48',length:LENGTH,width:WIDTH,x:0,z:0,yaw:0,speed:0,health:100,active:false,occupied:true};
  const vehicles = [car], events = [];
  let phase = 'idle', reason = '', orderData = null, serial = 0, mode = false;
  let route = [], points = [], cursor = 0, legStart = null, elapsed = 0, stalled = 0, wait = 0;
  let pickup = null, dropoff = null, terminal = false;
  const busy = () => ['approaching','waiting'].includes(phase);
  function emit(type) {
    events.push(Object.freeze({type,...orderData,reason}));
    if (events.length > 16) events.shift();
  }
  function finish(type, why) {
    if (!busy() || terminal) return {ok:false,reason:'No active delivery'};
    phase = type; reason = why; terminal = true; car.speed = 0; wait = 0; emit(type);
    return {ok:true,orderId:orderData.id,reason};
  }
  function guard(ctx) {
    if (!ctx.pose || ![ctx.pose.x,ctx.pose.z].every(Number.isFinite)) return 'Player unavailable';
    if (ctx.recovering) return 'Recovery in progress';
    if (ctx.indoors) return 'Go outside first';
    if (ctx.busy) return 'Finish the current activity first';
    if (!ctx.onFoot) return 'Get out of your vehicle first';
    return '';
  }
  const bodyClear = (pose,fromPose) => simulation.canOccupy(pose,{length:LENGTH,width:WIDTH,ignoreId:car.id,fromPose});
  function stop(edge,at) {
    at = Math.max(6,Math.min(edge.length-6,at));
    const pose = lane(edge,at);
    return bodyClear(pose) ? {...pose,at,edgeId:edge.id} : null;
  }
  function nearbyStops(pose,maxWalk) {
    return edges.map(edge => {
      const at = Math.max(6,Math.min(edge.length-6,(pose.x-edge.from.x)*edge.dx+(pose.z-edge.from.z)*edge.dz));
      return {edge,at,d:distance(lane(edge,at),pose)};
    }).filter(item => item.d <= maxWalk).sort((a,b) => a.d-b.d).slice(0,24);
  }
  function connect(from, to) {
    const a = simulation.graph.edges[from.edgeId], b = simulation.graph.edges[to.edgeId];
    if (a === b && to.at > from.at + 5) return [a];
    const middle = a.to === b.from ? [] : planner.findEdges(a.to, b.from);
    if (a.to !== b.from && !middle.length) return null;
    const result = [a, ...middle, b];
    // Immediate reversing on the same road segment is not a drivable junction.
    if (result.some((edge, i) => i && edge.segment === result[i - 1].segment)) return null;
    return result;
  }
  function lengthOf(path, from, to) {
    return path.length === 1 ? to.at - from.at : path.reduce((sum, edge) => sum + edge.length, 0) - from.at - (path.at(-1).length - to.at);
  }
  function routePoints(path, from, to) {
    if (path.length === 1) return [{ ...to }];
    const result = [];
    path.forEach((edge, i) => {
      if (i === path.length - 1) result.push({ ...to });
      else {
        const end = lane(edge, edge.length), next = lane(path[i + 1], 0);
        if (Math.abs(angle(edge.yaw - path[i + 1].yaw)) > .5) result.push({ ...end, precision: true }, { ...next, precision: true });
        else result.push({ x: (end.x + next.x) / 2, z: (end.z + next.z) / 2 });
      }
    });
    return result;
  }
  function drive(dt) {
    // Progress along the lane polyline, rather than stopping at every OSM node.
    // A bounded lookahead rounds the short joins between successive left lanes.
    while (cursor < points.length - 1) {
      const target = points[cursor], previous = cursor ? points[cursor - 1] : legStart;
      const dx = target.x - previous.x, dz = target.z - previous.z, length2 = dx * dx + dz * dz;
      const projection = length2 ? ((car.x - previous.x) * dx + (car.z - previous.z) * dz) / length2 : 1;
      if (distance(car, target) < (target.precision ? .35 : 1) || (!target.precision && projection >= 1)) cursor++;
      else break;
    }
    const target = points[cursor];
    if (!target) { car.speed = 0; return; }
    const gap = distance(car, target), finalGap = distance(car, points.at(-1));
    if (cursor === points.length - 1 && finalGap < .2 && car.speed < .2) {
      car.speed = 0; phase = 'waiting'; wait = 0; emit('arrived'); return;
    }
    let remaining = gap, cornerLimit = MAX_SPEED, ahead = gap;
    let previous = cursor ? points[cursor - 1] : legStart;
    for (let i = cursor; i < points.length - 1; i++) {
      const here = points[i], next = points[i + 1];
      const incoming = Math.atan2(here.z - previous.z, here.x - previous.x);
      const outgoing = Math.atan2(next.z - here.z, next.x - here.x);
      const bend = Math.abs(angle(outgoing - incoming));
      if (ahead < 35 && bend > .2) {
        const cornerSpeed = Math.max(2, 6 - bend * 2.2);
        cornerLimit = Math.min(cornerLimit, Math.sqrt(cornerSpeed * cornerSpeed + 5 * Math.max(0, ahead - 3)));
      }
      const span = distance(here, next); remaining += span; ahead += span; previous = here;
    }
    let look = Math.min(target.precision ? gap : 8, 2.2 + car.speed * .55), aim = target;
    let from = car;
    for (let i = cursor; i < points.length; i++) {
      const to = points[i], span = distance(from, to);
      if (span >= look || i === points.length - 1) {
        const t = span > 0 ? Math.min(1, look / span) : 0;
        aim = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t }; break;
      }
      look -= span; from = to;
    }
    const desiredYaw = Math.atan2(-(aim.x - car.x), -(aim.z - car.z));
    const turn = angle(desiredYaw - car.yaw);
    let wantedSpeed = Math.min(MAX_SPEED, cornerLimit, Math.sqrt(Math.max(0, remaining - .08) * 4));
    if (target.precision) wantedSpeed = Math.min(wantedSpeed, Math.sqrt(Math.max(0, gap - .05) * 4));
    if (Math.abs(turn) > .5) wantedSpeed = Math.min(wantedSpeed, 2.5);
    if (Math.abs(turn) > 1) wantedSpeed = 0;
    const signalGap = simulation.trafficLights?.stopDistance(car, { length: LENGTH }) ?? Infinity;
    wantedSpeed = Math.min(wantedSpeed, Math.sqrt(Math.max(0, signalGap - .12) * 8));
    const clearance = Math.min(remaining, 2 + car.speed * .9);
    const front = { x: car.x - Math.sin(car.yaw) * clearance, z: car.z - Math.cos(car.yaw) * clearance, yaw: car.yaw };
    if (!bodyClear(front, car)) wantedSpeed = 0;
    car.speed += Math.max(-5 * dt, Math.min(2 * dt, wantedSpeed - car.speed));
    const yaw = angle(car.yaw + Math.max(-1.2 * dt, Math.min(1.2 * dt, turn)));
    if (bodyClear({ ...car, yaw }, car)) car.yaw = yaw;
    const travel = Math.min(remaining, car.speed * dt, Math.max(0, signalGap));
    const movement = simulation.moveVehicle(car, -Math.sin(car.yaw) * travel, -Math.cos(car.yaw) * travel,
      { length: LENGTH, width: WIDTH });
    if (movement.blocked || travel < car.speed * dt - 1e-6) car.speed = 0;
    stalled = movement.distance > .002 || Number.isFinite(signalGap) ? 0 : stalled + dt;
  }
  function order(request = {}, ctx = {}, preview = false) {
    if (busy() || car.active) return {ok:false,reason:'A courier is already dispatched'};
    const denied = guard(ctx); if (denied) return {ok:false,reason:denied};
    const source = catalog.find(s => s.id === request.sourceId && s.kind === request.kind);
    if (!source || !['food','arms'].includes(request.kind) || typeof request.itemId !== 'string' ||
      (source.kind === 'food' && request.itemId !== 'food') ||
      (source.kind === 'arms' && !source.weaponIds?.includes(request.itemId))) return {ok:false,reason:'Unavailable dispatch item or source'};
    for (const start of nearbyStops(source,75)) {
      if (source.roadId && start.edge.road.id !== source.roadId) continue;
      const from = stop(start.edge,start.at);
      if (!from || !simulation.hasLineOfSight(source,from)) continue;
      for (const end of nearbyStops(ctx.pose,45)) {
        const to = stop(end.edge,end.at);
        if (!to || distance(from,to) < 35 || !simulation.hasLineOfSight(ctx.pose,to)) continue;
        const path = connect(from,to); if (!path) continue;
        const metres = lengthOf(path,from,to);
        if (metres < 35 || metres > 10000) continue;
        if (preview) return {ok:true,kind:source.kind,itemId:request.itemId,sourceId:source.id,sourceName:source.name,pickup:copy(from),dropoff:copy(to),metres:Math.round(metres)};
        orderData = Object.freeze({id:`delivery-${++serial}`,orderId:`delivery-${serial}`,kind:source.kind,
          itemId:request.itemId,sourceId:source.id,sourceName:source.name});
        pickup = from; dropoff = to; mode = !!ctx.sandbox; terminal = false;
        route = path.map(e => e.id); points = routePoints(path,from,to); cursor = 0;
        legStart = {...from}; elapsed = stalled = wait = 0; reason = ''; phase = 'approaching';
        Object.assign(car,from,{speed:0,health:100,active:true}); emit('accepted');
        return {ok:true,orderId:orderData.id,pickup:copy(pickup),dropoff:copy(dropoff),metres:Math.round(metres)};
      }
    }
    return {ok:false,reason:'No clear directed public road delivery route'};
  }
  function interact(ctx = {}) {
    const denied = guard(ctx);
    if (denied || !!ctx.sandbox !== mode) return {ok:false,reason:denied || 'Delivery mode changed'};
    if (phase !== 'waiting' || car.speed > .05) return {ok:false,reason:'Wait for the courier to stop'};
    if (distance(ctx.pose,car) > 4 || !simulation.hasLineOfSight(ctx.pose,car)) return {ok:false,reason:'Walk beside the stopped courier'};
    // Recheck every short segment of the actual handover approach against bodies.
    const steps = Math.ceil(distance(ctx.pose,car)/.2);
    for (let i=0;i<=steps;i++) {
      const t=steps ? i/steps : 0;
      if (!simulation.canOccupy({x:ctx.pose.x+(car.x-ctx.pose.x)*t,z:ctx.pose.z+(car.z-ctx.pose.z)*t,yaw:car.yaw},
        {length:1,width:.8,ignoreId:car.id,ignorePersonId:'player-body'})) return {ok:false,reason:'Courier handover blocked'};
    }
    return finish('completed','Delivery handed over');
  }
  function cancel(why = 'Delivery cancelled') { return finish('cancelled',typeof why === 'string' ? why : 'Delivery cancelled'); }
  function damageVehicle(id,amount) {
    if (id !== car.id || !car.active || !Number.isFinite(amount) || amount <= 0 || car.health <= 0) return false;
    car.health = Math.max(0,car.health-amount);
    if (!car.health) finish('failed','Courier vehicle disabled');
    return true;
  }
  function step(dt,ctx = {}) {
    if (!car.active || !Number.isFinite(dt) || dt <= 0) return;
    if (busy() && (ctx.recovering || !!ctx.sandbox !== mode)) finish('cancelled',ctx.recovering ? 'Recovery interrupted delivery' : 'Delivery mode changed');
    let remaining = Math.min(.2,dt);
    while (remaining > 1e-8) {
      const tick = Math.min(remaining,1/60); remaining -= tick;
      if (busy()) {
        elapsed += tick;
        if (phase === 'approaching') drive(tick); else wait += tick;
        if (stalled > 30 || elapsed > 600 || wait > 120) finish('failed','Delivery interrupted or road blocked');
      } else {
        wait += tick;
        if (wait > 3) car.active = false;
      }
    }
  }
  function reset() {
    if (busy()) finish('cancelled','Delivery reset');
    car.active = false; car.speed = 0;
    phase = 'idle'; reason = ''; orderData = null; route = []; points = []; pickup = dropoff = null;
  }
  function snapshot() {
    return {phase,reason,order:orderData ? Object.freeze(copy(orderData)) : null,car:{...car},pickup:copy(pickup),dropoff:copy(dropoff),
      route:[...route],waypoint:cursor,stats:{couriers:Number(car.active),courierLimit:1}};
  }
  const quote = (request,ctx) => order(request,ctx,true);
  return {vehicles,order,quote,canOrder:quote,interact,cancel,step,reset,snapshot,damageVehicle,
    get phase() {return phase;},get busy() {return busy();},drainEvents:() => events.splice(0)};
}

// Fictional game hardware on supplied storefronts, not real camera-location data.
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const room = value => value ?? null;
const COS_HALF_FOV = Math.cos(35 * Math.PI / 180);
const JAM_RADIUS = 25, JAM_SECONDS = 18, ALERT_SECONDS = 2.5;
export const CAMERA_PULSE = Object.freeze({ radius: 80, seconds: 12 });
const NO_MARKS = Object.freeze([]);
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const face = (a,b) => Math.atan2(a.x-b.x,a.z-b.z);

export function streetCameraLocations(stores, heightAt, clear) {
  const locations = [];
  for (const store of stores) {
    if (locations.length >= 6) break;
    const f = store.frontage, approach = store.publicApproach || store;
    if (!valid(f) || !Number.isFinite(f.yaw) || !valid(approach) || locations.some(c=>distance(c,f)<44)) continue;
    const awayX = -Math.sin(f.yaw), awayZ = -Math.cos(f.yaw);
    const target = {x:approach.x,z:approach.z,y:heightAt(approach.x,approach.z)+1.5};
    for (const projection of [.62,1.25,2.15]) {
      const x=f.x+awayX*projection,z=f.z+awayZ*projection;
      const from = {id:store.id,x,z,y:heightAt(x,z)+3,interiorId:null};
      if (distance(from,target)<2 || distance(from,target)>38 || !clear(from,target,null)) continue;
      locations.push({...from,yaw:face(from,target)});
      break;
    }
  }
  return locations;
}

export function shopCameraLocation(plan, clear) {
  if (plan?.type !== 'shop' || !valid(plan.counter) || !valid(plan.spawn)) return null;
  const {origin,width,depth,floorY} = plan;
  const target={...plan.counter,y:floorY+1.35,interiorId:plan.id};
  const cos=Math.cos(origin.yaw),sin=Math.sin(origin.yaw);
  for (const z of [depth*.24,depth*.48,depth*.72]) for (const x of [-width*.37,width*.37,0]) {
    const location={id:`shop-${plan.storeId}`,interiorId:plan.id,x:origin.x+cos*x+sin*z,z:origin.z-sin*x+cos*z,y:floorY+2.45};
    if (distance(location,target)<2 || !clear(location,target,plan)) continue;
    return {...location,yaw:face(location,target)};
  }
  return null;
}

export function createSecurityCameras(locations = [], { hasLineOfSight, heightAt = () => 0 } = {}) {
  const cameras = [], ids = new Set(), events = [], roomCameras = new Map();
  let time = 0, crime = null, lastSerial = -1, nextSighting = 0, disposed = false, indoor = null, pulse = null;
  function register(p) {
    if (!valid(p) || typeof p.id !== 'string' || !p.id || !Number.isFinite(p.yaw)) return null;
    const y = Number.isFinite(p.y) ? p.y : heightAt(p.x,p.z)+3;
    return Number.isFinite(y) ? {id:p.id,x:p.x,y,z:p.z,yaw:p.yaw,interiorId:room(p.interiorId),
      health:40,enabled:true,jammedUntil:0,alertUntil:0,nextCheck:0} : null;
  }
  for (const p of locations) {
    if (cameras.length === 6) break;
    const c=register(p);
    if (!c || ids.has(c.id)) continue;
    ids.add(c.id); cameras.push(c);
  }
  const activeCameras = () => indoor ? [indoor,...cameras] : cameras;
  const powered = c => c.enabled && c.health > 0;
  const active = c => powered(c) && c.jammedUntil <= time;
  const state = c => !powered(c) ? 'offline' : !active(c) ? 'jammed' : c.alertUntil > time ? 'alert' : 'watching';
  const copy = c => Object.freeze({ id: c.id, x: c.x, y: c.y, z: c.z, yaw: c.yaw,
    interiorId: c.interiorId, health: c.health, enabled: active(c), state: state(c), jamRemaining: Math.max(0,c.jammedUntil-time) });
  function setRoomCamera(location) {
    indoor = null;
    if (disposed || !location?.interiorId) return;
    indoor = roomCameras.get(location.id) || register(location);
    if (indoor) {
      roomCameras.delete(indoor.id);
      roomCameras.set(indoor.id,indoor);
      if (roomCameras.size > 40) roomCameras.delete(roomCameras.keys().next().value);
    }
  }
  const reachable = point => !disposed && valid(point) ? activeCameras().filter(c=>active(c) && c.interiorId===room(point.interiorId) && distance(c,point)<=JAM_RADIUS) : [];
  function jamNearby(point) {
    const targets = reachable(point);
    for (const c of targets) {
      c.jammedUntil=time+JAM_SECONDS;
      c.alertUntil=0;
      crime?.cameras.delete(c.id);
    }
    return targets.length;
  }
  function markNearby(point) {
    if (disposed || !valid(point)) return 0;
    const space=room(point.interiorId);
    const targets=activeCameras().filter(c=>c.interiorId===space && distance(c,point)<=CAMERA_PULSE.radius);
    pulse=targets.length?{space,targets,expires:time+CAMERA_PULSE.seconds}:null;
    return targets.length;
  }
  function mapMarks(interiorId = null) {
    if (!pulse || pulse.space!==room(interiorId)) return NO_MARKS;
    return Object.freeze(pulse.targets.map(c=>Object.freeze({id:c.id,x:c.x,z:c.z,state:state(c)})));
  }
  function nearStatus(point) {
    if (disposed || !valid(point)) return null;
    let result=null;
    for (const c of activeCameras()) {
      const current=state(c);
      if (room(point.interiorId)!==c.interiorId || distance(c,point)>40 || !['alert','jammed'].includes(current)) continue;
      if (current==='alert') return copy(c);
      result=copy(c);
    }
    return result;
  }
  function reportCrime(receipt) {
    if (disposed || !valid(receipt) || !Number.isSafeInteger(receipt.serial) || receipt.serial < 0 ||
      receipt.serial <= lastSerial || typeof receipt.kind !== 'string' || !receipt.kind ||
      !Number.isFinite(receipt.level) || receipt.level <= 0) return false;
    lastSerial = receipt.serial;
    const at = {serial:receipt.serial,x:receipt.x,z:receipt.z,y:receipt.y,interiorId:room(receipt.interiorId),alreadyReported:receipt.alreadyReported===true,
      kind:receipt.kind,level:Math.min(5,Math.max(1,Math.floor(receipt.level)))};
    const eligibleCameras = activeCameras().filter(c=>active(c)&&eligible(c,at));
    if (eligibleCameras.length) crime={at,expires:time+12,cameras:new Set(eligibleCameras.map(c=>c.id))};
    return true;
  }
  function eligible(c, p) {
    if (!valid(p) || room(p.interiorId) !== c.interiorId) return false;
    const dx = p.x - c.x, dz = p.z - c.z, distance = Math.hypot(dx, dz);
    return distance <= 40 && (distance < 1e-6 || (-Math.sin(c.yaw) * dx - Math.cos(c.yaw) * dz) / distance >= COS_HALF_FOV);
  }
  function step(dt, context = {}) {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Camera dt must be finite and nonnegative.');
    if (disposed || context.paused || !dt) return;
    time += dt;
    if (crime && time > crime.expires) crime = null;
    if (pulse && time >= pulse.expires) pulse=null;
    const player = valid(context.player) ? { ...context.player, interiorId: room(context.interiorId),
      y: Number.isFinite(context.player.y) ? context.player.y : heightAt(context.player.x, context.player.z) + 1.5 } : null;
    for (const c of activeCameras()) {
      if (!active(c) || time + 1e-9 < c.nextCheck) continue;
      const targetCrime = crime && crime.cameras.has(c.id);
      const target = targetCrime ? crime.at : context.wanted > 0 && time >= nextSighting && eligible(c, player) ? player : null;
      if (!target || typeof hasLineOfSight !== 'function') continue;
      c.nextCheck = time + .4;
      const y = Number.isFinite(target.y) ? target.y : heightAt(target.x, target.z) + 1.5;
      if (!Number.isFinite(y) || hasLineOfSight(copy(c), { ...target, y }) !== true) continue;
      c.alertUntil=time+ALERT_SECONDS;
      if (targetCrime) {
        events.push(Object.freeze({ type: 'crime-spotted', cameraId: c.id, ...crime.at })); crime = null;
      } else {
        events.push(Object.freeze({ type: 'sighting', cameraId: c.id, x: player.x, z: player.z, interiorId: player.interiorId }));
        nextSighting = time + 2;
      }
    }
  }
  function shotTargets() {
    return Object.freeze(disposed ? [] : activeCameras().filter(c => c.health > 0).map(c => Object.freeze({
      ...copy(c), feetY: c.y - .18, height: .36, radius: .32 })));
  }
  function hitByShot(id, damage, ray = {}) {
    const c = activeCameras().find(c => c.id === id);
    if (disposed || !c || c.health <= 0 || !Number.isFinite(damage) || damage <= 0 || room(ray.interiorId) !== c.interiorId) return { hits: 0, people: [] };
    c.health = Math.max(0, c.health - Math.min(100, damage));
    return { hits: 1, people: [], cameraId: c.id, destroyed: c.health === 0 };
  }
  return Object.freeze({ reportCrime,step,shotTargets,hitByShot,setRoomCamera,jammerTargets:point=>reachable(point).length,jamNearby,nearStatus,markNearby,mapMarks,
    setEnabled(id, enabled) { const c = activeCameras().find(c => c.id === id); if (c && !disposed) c.enabled = enabled === true; },
    remove(id) {
      if (indoor?.id===id) indoor=null;
      roomCameras.delete(id);
      const i=cameras.findIndex(c=>c.id===id); if (i>=0) cameras.splice(i,1);
      if (pulse) pulse.targets=pulse.targets.filter(c=>c.id!==id);
    },
    snapshot: () => Object.freeze(activeCameras().map(copy)), drainEvents: () => events.splice(0),
    dispose() { disposed = true; cameras.length = 0; roomCameras.clear(); indoor=null; events.length = 0; crime = null; pulse=null; } });
}

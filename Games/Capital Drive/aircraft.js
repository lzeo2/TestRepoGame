import { createVehicleChallenge } from './vehicle-challenges.js';

const LENGTH = 10, SPAN = 9, ENTRY_RANGE = 3.5, MAX_SPEED = 68;
export const JET_TAKEOFF_SPEED = 28;
export const CAMPAIGN_AIRCRAFT_IDS = Object.freeze(['jet:1', 'jet:2', 'helicopter:1']);
const ROTOR_LENGTH = 8, ROTOR_SPAN = 10;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const finitePose = p => p && [p.x, p.z].every(Number.isFinite);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function inRing(x, z, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function segmentDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], d = dx * dx + dz * dz;
  const t = d ? clamp(((x - a[0]) * dx + (z - a[1]) * dz) / d, 0, 1) : 0;
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
function offset(pose, side, forward) {
  return { x: pose.x + Math.cos(pose.yaw) * side - Math.sin(pose.yaw) * forward,
    z: pose.z - Math.sin(pose.yaw) * side - Math.cos(pose.yaw) * forward };
}
const entry = plane => offset(plane, 2.1, 1.3);
const copy = plane => Object.freeze({ ...plane });

// Original jets on sourced airport aprons.
// The controller alone translates the returned theft/impact events into crimes
// and player damage. This module has no wallet, storage or wall-clock authority.
export function createAircraft(map, simulation, { heightAt = () => 0 } = {}) {
  const challenge = createVehicleChallenge(), events = [], planes = [];
  let activeId = null, challengeId = null, challengeSandbox = false;
  const bounds = map.bounds;
  const sourceBuildings = new Map();
  const CELL = 100;
  for (const b of map.buildings || []) {
    const p = b.points;
    if (!p?.length) continue;
    const minX = Math.min(...p.map(q => q[0])), maxX = Math.max(...p.map(q => q[0]));
    const minZ = Math.min(...p.map(q => q[1])), maxZ = Math.max(...p.map(q => q[1]));
    const base = Math.max(...p.map(q => heightAt(...q)));
    const body = { ...b, base, top: base + (Number.isFinite(b.height) ? b.height : 8) };
    for (let x = Math.floor(minX / CELL); x <= Math.floor(maxX / CELL); x++) {
      for (let z = Math.floor(minZ / CELL); z <= Math.floor(maxZ / CELL); z++) {
        const key = `${x},${z}`;
        if (!sourceBuildings.has(key)) sourceBuildings.set(key, []);
        sourceBuildings.get(key).push(body);
      }
    }
  }
  const activePlane = () => planes.find(p => p.id === activeId) || null;
  const flightCopy = p => p ? Object.freeze({ ...p, groundY: heightAt(p.x,p.z), altitude: p.y-heightAt(p.x,p.z) }) : null;
  function groundClear(pose) {
    if(pose.kind==='helicopter')return simulation.canOccupy(pose,{length:ROTOR_LENGTH,width:3.4,ignoreId:pose.id});
    if (!simulation.canOccupy(pose, { length: LENGTH, width: 3.6, ignoreId: pose.id })) return false;
    // Existing vehicle widths cap at four metres. Probe each actual wing tip
    // separately so the visible nine-metre span cannot pass through a wall.
    return [-3.5, 3.5].every(side => simulation.canOccupy({ ...pose, ...offset(pose, side, -.4) },
      { length: 2, width: 2, ignoreId: pose.id }));
  }
  function sourceApronContains(apron, pose) {
    return [[0, 0], [-4.5, 0], [4.5, 0], [0, 5.2], [0, -5.2]].every(([s, f]) => {
      const p = offset(pose, s, f);
      return inRing(p.x, p.z, apron.points);
    });
  }
  function clearOfRoads(pose) {
    for (const road of map.roads || []) {
      const width = Number(road.width) || 7;
      for (let i = 1; i < road.points.length; i++) {
        if (segmentDistance(pose.x, pose.z, road.points[i - 1], road.points[i]) < width / 2 + 7) return false;
      }
    }
    return true;
  }
  const anchor = map.landmarks?.find(p => p.id === 'canberra-airport');
  const surfaces=map.airport?.surfaces||[];
  const aprons = surfaces.filter(s => s.kind === 'apron' && s.closed);
  const runwayEdges = surfaces.filter(s=>s.kind==='runway'&&!s.closed&&s.width>0).flatMap(s=>
    s.points.slice(1).map((b,i)=>{
      const a=s.points[i];
      return {a,b,heading:Math.atan2(a[0]-b[0],a[1]-b[1]),halfWidth:s.width/2};
    }));
  const candidates = [];
  for (const apron of aprons) {
    const p = apron.points, minX = Math.min(...p.map(q => q[0])), maxX = Math.max(...p.map(q => q[0]));
    const minZ = Math.min(...p.map(q => q[1])), maxZ = Math.max(...p.map(q => q[1]));
    for (let x = minX + 12; x < maxX - 8; x += 22) for (let z = minZ + 12; z < maxZ - 8; z += 22) {
      const pose = { x, z, yaw: 0 };
      if (sourceApronContains(apron, pose)) candidates.push({ ...pose, apronId: apron.id });
    }
  }
  candidates.sort((a, b) => (anchor ? distance(a, anchor) - distance(b, anchor) : a.x - b.x));
  for (const pose of candidates) {
    if (planes.length === 2) break;
    if (planes.some(p => distance(p, pose) < 40 || Math.abs(p.x - pose.x) < 20) || !groundClear(pose) || !clearOfRoads(pose)) continue;
    const apron = aprons.find(a => a.id === pose.apronId);
    const heading = [-Math.PI / 2, 0, Math.PI, Math.PI / 2].find(yaw => {
      const aligned = { ...pose, yaw };
      if (!sourceApronContains(apron, aligned) || !groundClear(aligned)) return false;
      // Admission should offer a usable departure, not a nose aimed into the
      // terminal. These are ordinary checked ground probes, never a clear flag.
      for (let d = 12; d <= 240; d += 12) if (!groundClear({ ...aligned, ...offset(aligned, 0, d) })) return false;
      return true;
    });
    if (heading === undefined) continue;
    pose.yaw = heading;
    const door = entry(pose);
    if (!simulation.canOccupy({ ...door, yaw: pose.yaw }, { length: 1, width: .9 })) continue;
    planes.push({ ...pose, id: CAMPAIGN_AIRCRAFT_IDS[planes.length], kind:'jet', model: planes.length,
      name: planes.length ? 'Peregrine jet' : 'Kestrel jet', y: heightAt(pose.x, pose.z),
      speed: 0, verticalSpeed: 0, pitch: 0, bank: 0, throttle: 0, takeoffRoll:0,
      length: LENGTH, width: SPAN, airborne: false, stolen: false, wrecked: false, active: true });
  }
  function rotorStand(pose, id = CAMPAIGN_AIRCRAFT_IDS[2], separation = planes) {
    if(!finitePose(pose)||!Number.isFinite(pose.yaw)||!Number.isFinite(heightAt(pose.x,pose.z)))return null;
    const rotor={...pose,id,kind:'helicopter',name:'Wattle helicopter',length:ROTOR_LENGTH,width:ROTOR_SPAN,
      y:heightAt(pose.x,pose.z),speed:0,verticalSpeed:0,pitch:0,bank:0,throttle:0,rotor:0,
      airborne:false,stolen:false,wrecked:false,active:true};
    if(separation.some(plane=>distance(plane,rotor)<32)||!groundClear(rotor)||!airClear({...rotor,y:rotor.y+1}))return null;
    const door=entry(rotor);
    return simulation.canOccupy({...door,yaw:rotor.yaw},{length:1,width:.9})&&simulation.hasLineOfSight(door,rotor)?rotor:null;
  }
  function airportRotor(id, separation) {
    for(const candidate of candidates){
      if(!clearOfRoads(candidate))continue;
      const aircraft=rotorStand(candidate,id,separation);
      if(aircraft)return aircraft;
    }
    return null;
  }
  const rotor=airportRotor();
  if(rotor)planes.push(rotor);
  const initial = planes.map(p => ({ ...p }));
  let loanRotor=null;
  const jobHelicopterIds=new Set();
  function addJobHelicopter(id,pose) {
    if(typeof id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/.test(id)||
      CAMPAIGN_AIRCRAFT_IDS.includes(id)||id==='loan:jet'||id==='loan:helicopter')return {ok:false,reason:'invalid-job-aircraft-id'};
    if(jobHelicopterIds.has(id)||planes.some(p=>p.id===id))return {ok:false,reason:'job-aircraft-id-used'};
    if(planes.some(p=>p.jobLoaner))return {ok:false,reason:'job-aircraft-present'};
    if(!finitePose(pose)||!Number.isFinite(pose.yaw))return {ok:false,reason:'invalid-job-aircraft-pose'};
    const rotor=rotorStand({x:pose.x,z:pose.z,yaw:pose.yaw},id,planes);
    if(!rotor)return {ok:false,reason:'job-aircraft-placement-blocked'};
    Object.defineProperty(rotor,'id',{value:id,enumerable:true,writable:false,configurable:false});
    Object.assign(rotor,{name:'Skylark extraction helicopter',loaner:true,jobLoaner:true,pendingRelease:false});
    planes.push(rotor);jobHelicopterIds.add(id);
    return {ok:true,id,aircraft:copy(rotor)};
  }
  function releaseJobHelicopter(id) {
    const index=planes.findIndex(p=>p.jobLoaner&&p.id===id);
    if(index<0)return jobHelicopterIds.has(id)?{ok:true,id,removed:false,deferred:false}:{ok:false,reason:'unknown-job-aircraft'};
    const rotor=planes[index];
    if(activeId===id){rotor.pendingRelease=true;return {ok:true,id,removed:false,deferred:true};}
    planes.splice(index,1);return {ok:true,id,removed:true,deferred:false};
  }
  const checkpoints=new WeakMap(),checkpointIds=new Set([...initial.map(p=>p.id),'loan:jet','loan:helicopter']);
  function checkpointPlane(plane) {
    const ground=heightAt(plane.x,plane.z);
    if(!checkpointIds.has(plane.id)||!['jet','helicopter'].includes(plane.kind)||
      ![plane.x,plane.y,plane.z,plane.yaw,plane.speed,plane.verticalSpeed,plane.pitch,plane.bank,plane.throttle,ground].every(Number.isFinite)||
      !['airborne','stolen','wrecked','active'].every(key=>typeof plane[key]==='boolean')||
      plane.x<bounds.minX||plane.x>bounds.maxX||plane.z<bounds.minZ||plane.z>bounds.maxZ||
      plane.y<ground-.25||plane.y>ground+420.25)return null;
    const saved={...plane,speed:clamp(plane.speed,plane.kind==='helicopter'?-24:0,plane.kind==='helicopter'?24:MAX_SPEED),
      verticalSpeed:clamp(plane.verticalSpeed,-120,120),pitch:clamp(plane.pitch,-Math.PI,Math.PI),
      bank:clamp(plane.bank,-Math.PI,Math.PI),throttle:clamp(plane.throttle,0,1)};
    if(plane.kind==='helicopter'){
      if(!Number.isFinite(plane.rotor))return null;
      saved.rotor=clamp(plane.rotor,0,1);
    }else {
      if(!Number.isFinite(plane.takeoffRoll))return null;
      saved.takeoffRoll=clamp(plane.takeoffRoll,0,1000000);
    }
    return Object.freeze(saved);
  }
  function captureCheckpoint() {
    const retained=planes.filter(p=>!p.jobLoaner);
    if(challenge.snapshot().active||activePlane()?.jobLoaner||retained.length>CAMPAIGN_AIRCRAFT_IDS.length+2)return null;
    try {
      const records=retained.map(ref=>({ref,saved:checkpointPlane(ref)}));
      if(records.some(record=>!record.saved)||new Set(records.map(record=>record.saved.id)).size!==records.length||
        (activeId!==null&&!records.some(record=>record.saved.id===activeId&&record.saved.active&&!record.saved.wrecked)))return null;
      const token=Object.freeze(Object.create(null));
      checkpoints.set(token,{activeId,records});return token;
    }catch{return null;}
  }
  function checkpointReason(token) {
    const saved=token&&typeof token==='object'?checkpoints.get(token):null;
    if(!saved)return 'invalid-checkpoint';
    if(activePlane()?.jobLoaner)return 'job-aircraft-active';
    try {
      for(const {saved:plane} of saved.records) {
        if(!checkpointPlane(plane))return 'invalid-aircraft';
        if(plane.airborne ? !airClear(plane) : !groundClear(plane))return 'aircraft-blocked';
      }
    }catch{return 'placement-unavailable';}
    return null;
  }
  function canRestoreCheckpoint(token) {return checkpointReason(token)===null;}
  function restoreCheckpoint(token) {
    const reason=checkpointReason(token);if(reason)return {ok:false,reason};
    const saved=checkpoints.get(token);
    // Preflight every retained aircraft before changing any live object or event.
    for(const {ref,saved:plane} of saved.records)Object.assign(ref,plane);
    const liveJobCraft=planes.filter(plane=>plane.jobLoaner);
    planes.splice(0,planes.length,...saved.records.map(record=>record.ref),...liveJobCraft);activeId=saved.activeId;
    challenge.clear();challenge.drainEvents();challengeId=null;challengeSandbox=false;events.length=0;
    return {ok:true,activeId};
  }
  function runwayAligned(plane) {
    if(runwayEdges.some(({a,b,heading,halfWidth})=>segmentDistance(plane.x,plane.z,a,b)<=halfWidth-4.5&&
      Math.abs(Math.cos(plane.yaw-heading))>=.97))return true;
    // Each apron stand already owns a physically checked departure line. This
    // preserves a usable short takeoff at the game stand without a hidden boost.
    const stand=initial.find(p=>plane.loaner?p.kind==='jet':p.id===plane.id);
    if(!stand||Math.cos(plane.yaw-stand.yaw)<.97)return false;
    const dx=plane.x-stand.x,dz=plane.z-stand.z,sin=Math.sin(stand.yaw),cos=Math.cos(stand.yaw);
    const along=-dx*sin-dz*cos;
    return along>=-1&&along<=(stand.runLength||224)&&Math.abs(dx*cos-dz*sin)<=5;
  }
  function nearest(pose) {
    if (!finitePose(pose)) return null;
    const matches = planes.filter(p => !p.airborne && !p.wrecked && distance(pose, entry(p)) <= ENTRY_RANGE);
    matches.sort((a, b) => distance(pose, entry(a)) - distance(pose, entry(b)));
    return matches.length ? copy(matches[0]) : null;
  }
  function validApproach(ctx, plane) {
    return ctx?.valid === true && ctx.onFoot === true && finitePose(ctx.pose) && plane && !plane.wrecked &&
      !plane.airborne && Math.abs(plane.speed)<.5 && distance(ctx.pose, entry(plane)) <= ENTRY_RANGE &&
      simulation.hasLineOfSight(ctx.pose, entry(plane));
  }
  function exitPose(plane) {
    for (const [side, forward] of [[2.1, 1.3], [-2.1, 1.3], [0, -6], [0, 6]]) {
      const p = { ...offset(plane, side, forward), yaw: plane.yaw, id: plane.id };
      if (!simulation.canOccupy(p, { length: 1, width: .9, ignoreId: plane.id })) continue;
      const origin = { ...entry(plane), id: plane.id };
      const swept = simulation.moveActor(origin, p.x - origin.x, p.z - origin.z, .45);
      if (!swept.blocked && distance(origin, p) < .1) return { x: p.x, z: p.z, yaw: p.yaw, y: heightAt(p.x, p.z) };
    }
    return null;
  }
  function interact(ctx) {
    const plane = activePlane();
    if (plane) {
      if (ctx?.valid !== true) return { ok: false, reason: 'Aircraft controls unavailable.' };
      if (plane.airborne || plane.y - heightAt(plane.x, plane.z) > .75 || Math.abs(plane.speed) > .5) {
        return { ok: false, reason: 'Land and stop the aircraft before exiting.' };
      }
      const p = exitPose(plane);
      if (!p) return { ok: false, reason: 'The aircraft exit is blocked.' };
      activeId = null; plane.throttle = 0;
      events.push({ type: 'exited', id: plane.id, exitPose: p });
      if(plane.jobLoaner&&plane.pendingRelease)planes.splice(planes.indexOf(plane),1);
      return { ok: true, exited: true, exitPose: p };
    }
    if (challenge.snapshot().active) {
      challenge.cancel('Cancelled.'); challengeId = null;
      return { ok: true, cancelled: true };
    }
    const target = nearest(ctx?.pose);
    if (!validApproach(ctx, target)) return { ok: false, reason: 'Walk beside a stopped aircraft.' };
    const actual = planes.find(p => p.id === target.id);
    if (actual.stolen || actual.loaner) {
      activeId = actual.id; events.push({ type: 'boarded', id: actual.id });
      return { ok: true, boarded: true, stolen: false };
    }
    challengeSandbox = ctx.sandbox === true; challengeId = target.id;
    challenge.clear();
    challenge.drainEvents();
    challenge.start('jet', { targetId: target.id, anchor: entry(target), sandbox: challengeSandbox });
    return { ok: true, challenge: true, reason: `Match the eight pulses on the ${target.kind} console.` };
  }
  function airClear(pose) {
    if (pose.x < bounds.minX + 7 || pose.x > bounds.maxX - 7 || pose.z < bounds.minZ + 7 || pose.z > bounds.maxZ - 7) return false;
    const probes=pose.kind==='helicopter'?[[0,0,1.6],[0,4.5,.6],[0,-4.5,.6],[-4.5,0,.6],[4.5,0,.6]]:
      [[0,0,1.2],[0,4,1],[0,-4,1],[-3.5,-.4,1],[3.5,-.4,1]];
    for (const [side, forward, radius] of probes) {
      const p = offset(pose, side, forward);
      const checked = new Set();
      for (let x = Math.floor((p.x - radius) / CELL); x <= Math.floor((p.x + radius) / CELL); x++) {
        for (let z = Math.floor((p.z - radius) / CELL); z <= Math.floor((p.z + radius) / CELL); z++) {
          for (const b of sourceBuildings.get(`${x},${z}`) || []) {
            if (checked.has(b) || pose.y > b.top + .5 || pose.y + 2.8 < b.base) continue;
            checked.add(b);
            if (inRing(p.x, p.z, b.points) || b.points.some((a, i) =>
              segmentDistance(p.x, p.z, a, b.points[(i + 1) % b.points.length]) < radius)) return false;
          }
        }
      }
      if (pose.y + .25 < heightAt(p.x, p.z)) return false;
    }
    return true;
  }
  function impact(plane, severe) {
    const speed = Math.abs(plane.speed);
    plane.speed = 0; plane.throttle = 0; plane.bank = 0;
    if (severe) { plane.wrecked = true; plane.verticalSpeed = Math.min(-2, plane.verticalSpeed); }
    events.push({ type: 'impact', id: plane.id, damage: severe ? clamp(speed * 1.1, 30, 85) : clamp(speed * .6, 0, 30),
      wrecked: plane.wrecked, pose: { x: plane.x, y: plane.y, z: plane.z } });
  }
  function flyHelicopter(plane,h,input,throttle,turn) {
    plane.rotor=Math.min(1,plane.rotor+h*1.8);
    const ground=heightAt(plane.x,plane.z), climb=input.climb===true&&!input.descend&&plane.rotor>=.7;
    if(!plane.airborne&&!climb)return;
    plane.airborne=true;
    // Positive input is D/right, matching the car owner; forward is local -Z.
    plane.yaw-=turn*h*.78;
    const ease=1-Math.exp(-2*h);
    plane.speed+=(throttle*24-plane.speed)*ease;
    plane.bank+=(-turn*.24-plane.bank)*ease;
    plane.pitch+=(-throttle*.18-plane.pitch)*ease;
    const targetVertical=climb?6:input.descend===true?-4:0;
    plane.verticalSpeed+=(targetVertical-plane.verticalSpeed)*ease;
    const dx=-Math.sin(plane.yaw)*plane.speed*h,dz=-Math.cos(plane.yaw)*plane.speed*h;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.35)),targetY=Math.min(ground+420,plane.y+plane.verticalSpeed*h);
    for(let i=0;i<steps;i++){
      const x=plane.x+dx/steps,z=plane.z+dz/steps,floor=heightAt(x,z);
      const next={...plane,x,z,y:Math.max(floor,plane.y+(targetY-plane.y)/(steps-i))};
      if(!airClear(next)){impact(plane,true);return;}
      if(next.y<=floor+.025&&plane.verticalSpeed<0){
        if(Math.abs(plane.speed)>4.5||!groundClear(next)){impact(plane,true);return;}
        next.y=floor;
        plane.airborne=false;plane.speed=0;plane.verticalSpeed=0;plane.bank=0;plane.pitch=0;
      }
      plane.x=next.x;plane.z=next.z;plane.y=next.y;
    }
  }
  function step(dt, input = {}, ctx = {}) {
    const attempt = planes.find(p => p.id === challengeId);
    if (challenge.snapshot().active) {
      const ready = validApproach(ctx, attempt);
      challenge.step(dt, input.challenge || {}, { valid: ready, sandbox: ctx.sandbox === true });
      for (const event of challenge.drainEvents()) {
        if (event.type === 'complete' && ready && event.targetId === challengeId && event.sandbox === challengeSandbox) {
          attempt.stolen = true; activeId = attempt.id;
          events.push({ type: 'stolen', id: attempt.id, sandbox: challengeSandbox,
            pose: { x: attempt.x, z: attempt.z }, sessionId: event.sessionId });
          events.push({ type: 'boarded', id: attempt.id });
        } else if (event.type === 'failed' || event.type === 'cancel') events.push({ type: event.type, reason: event.reason });
      }
      if (!challenge.snapshot().active) challengeId = null;
    }
    const plane = activePlane();
    if (!plane || !Number.isFinite(dt) || dt <= 0 || ctx.valid !== true) return snapshot();
    const elapsed = Math.min(dt, .1), parts = Math.max(1, Math.ceil(elapsed / .02)), h = elapsed / parts;
    const throttle = clamp(Number(input.throttle) || 0, -1, 1), turn = clamp(Number(input.turn) || 0, -1, 1);
    for (let frame = 0; frame < parts; frame++) {
      const ground = heightAt(plane.x, plane.z);
      if (plane.wrecked) {
        plane.verticalSpeed -= 9.8 * h; plane.y = Math.max(ground, plane.y + plane.verticalSpeed * h);
        if (plane.y <= ground) { plane.airborne = false; plane.verticalSpeed = 0; plane.pitch = 0; }
        continue;
      }
      if(plane.kind==='helicopter'){flyHelicopter(plane,h,input,throttle,turn);continue;}
      plane.throttle = clamp(plane.throttle + throttle * h * .32, 0, 1);
      plane.speed = clamp(plane.speed + (plane.throttle * 13 - 1.3 - plane.speed * .055 - (throttle < 0 ? 13 : 0)) * h, 0, MAX_SPEED);
      const oldYaw = plane.yaw;
      plane.yaw -= turn * h * (plane.airborne ? .63 : .8) * Math.min(1, plane.speed / 6);
      plane.bank += ((plane.airborne ? -turn * .42 : 0) - plane.bank) * Math.min(1, h * 4);
      const canLift=plane.airborne||plane.speed>=JET_TAKEOFF_SPEED&&plane.takeoffRoll>=22&&runwayAligned(plane);
      const lift = input.climb === true && canLift && plane.speed>=JET_TAKEOFF_SPEED ? 10 * Math.min(1, (plane.speed - 24) / 16) : 0;
      const targetVertical = lift - (input.descend === true ? 4 : 0) - (plane.airborne && plane.speed < 25 ? 7 : 0);
      plane.verticalSpeed += (targetVertical - plane.verticalSpeed) * Math.min(1, h * 3);
      if (!plane.airborne && lift > 0) plane.airborne = true;
      let nextY = Math.min(ground + 420, Math.max(ground, plane.y + plane.verticalSpeed * h));
      const dx = -Math.sin(plane.yaw) * plane.speed * h, dz = -Math.cos(plane.yaw) * plane.speed * h;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .35));
      for (let i = 0; i < steps; i++) {
        const next = { ...plane, x: plane.x + dx / steps, z: plane.z + dz / steps,
          y: plane.y + (nextY - plane.y) / (steps - i) };
        const floor = heightAt(next.x, next.z);
        if (plane.airborne) {
          if (!airClear(next)) { impact(plane, true); break; }
          if (next.y <= floor + .08 && plane.verticalSpeed <= 0) {
            if (plane.verticalSpeed < -5 || plane.speed > 54 || !groundClear(next)) { impact(plane, true); break; }
            next.y = floor; plane.airborne = false; plane.verticalSpeed = 0; plane.takeoffRoll=0;
          }
          plane.x = next.x; plane.z = next.z; plane.y = next.y;
        } else {
          if (!groundClear(next)) { plane.yaw = oldYaw; impact(plane, plane.speed > 22); break; }
          const result = simulation.moveVehicle(plane, dx / steps, dz / steps, { length: LENGTH, width: 3.6, ignoreId: plane.id });
          if (result.blocked) { impact(plane, plane.speed > 22); break; }
          plane.takeoffRoll=plane.speed<1?0:plane.takeoffRoll+result.distance;
          plane.y = heightAt(plane.x, plane.z);
        }
      }
      plane.pitch += ((plane.airborne ? Math.atan2(plane.verticalSpeed, Math.max(10, plane.speed)) : 0) - plane.pitch) * Math.min(1, h * 4);
    }
    return snapshot();
  }
  function challengeView(){
    const lock=challenge.snapshot();
    return lock.active?Object.freeze({...lock,aircraftKind:planes.find(p=>p.id===challengeId)?.kind||'jet'}):lock;
  }
  function snapshot() {
    const plane = activePlane(), lock = challengeView();
    return Object.freeze({ planes: Object.freeze(planes.map(copy)), activeId, active: flightCopy(plane),
      challenge: lock, prompt: lock.active ? lock.prompt.replace('CAR LOCK',`${lock.aircraftKind.toUpperCase()} LOCK`) : plane ?
        (plane.wrecked?'Aircraft damaged. Land and stop to exit.':plane.kind==='helicopter'?
          'W/S move · A/D turn · Space rise · Shift land · E exit':plane.airborne?
          'W/S throttle · A/D turn · Space climb · Shift descend':
          'Align with runway · Hold W to 101 km/h · Space lift') : '' });
  }
  return { nearest, interact, step, snapshot, captureCheckpoint, canRestoreCheckpoint, restoreCheckpoint,addJobHelicopter,releaseJobHelicopter,
    get active() { return flightCopy(activePlane()); },
    get challenge() { return challengeView(); },
    get seatPose() { const p = activePlane(); return p ? { ...offset(p, 0, 2), y: p.y + 1.55, yaw: p.yaw, speed: p.speed } : null; },
    drainEvents: () => events.splice(0),
    reset({absentAircraft=[]}={}) {
      challenge.clear(); challenge.drainEvents(); activeId = null; challengeId = null; events.length = 0;
      jobHelicopterIds.clear();
      const absent=new Set(absentAircraft);
      planes.splice(0, planes.length, ...initial.filter(p=>!absent.has(p.id)).map(p=>({...p})));
      // Preserve the optional flight after a Campaign theft using distinctly
      // named loan aircraft, without recreating a consumed original identity.
      const jetStand=initial.find(p=>p.kind==='jet');
      if(jetStand&&!planes.some(p=>p.kind==='jet'))planes.push({...jetStand,id:'loan:jet',name:'Jules training jet',loaner:true});
      if(rotor&&absent.has(rotor.id)){
        loanRotor??=airportRotor('loan:helicopter',initial);
        if(loanRotor)planes.push({...loanRotor,name:'Airfield training helicopter',loaner:true});
      }
    },
    clearChallenge(reason = 'Interrupted.') { challenge.cancel(reason); challengeId = null; },
  };
}

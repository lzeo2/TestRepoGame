import { DRONE_STRIKE_BLAST } from './ordnance.js';

const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const axis = n => Number.isFinite(n) ? clamp(n, -1, 1) : 0;

// Supplied-time fictional flight. The controller retains the vulnerable body,
// economy, camera, weapons and mission authority throughout a flight.
export function createDrone({ heightAt = () => 0, canOccupy = () => true } = {}) {
  let pose = { x: 0, y: 3, z: 0, yaw: 0 }, origin = { x: 0, z: 0 };
  let active = false, disposed = false, battery = 90, reason = null, strikeSerial = 0;
  const ground = (x, z) => heightAt(x, z);
  function bodyReady(body, ctx = {}) {
    return finite(body?.actor || body) && body?.mode === 'foot' && Number.isFinite(body.health) && body.health > 0 &&
      !body.recovery && !body.recovering && !body.interiorId && !ctx.interiorId && !ctx.interior && !ctx.recovering;
  }
  function clear(next, from) {
    return Number.isFinite(next.y) && canOccupy(next, { from: { ...from }, radius: .45, height: .3, ignoreVehicles: true }) !== false;
  }
  function recall(why = 'recalled') {
    if (!active) return false;
    active = false; reason = why; return true;
  }
  function deploy(body, ctx = {}) {
    if (disposed || active || ctx.paused || !(ctx.owned || ctx.sandbox) || !bodyReady(body, ctx)) return false;
    const p = body.actor || body, yaw = Number.isFinite(p.yaw) ? p.yaw : 0;
    const next = { x: p.x - Math.sin(yaw), z: p.z - Math.cos(yaw), yaw };
    next.y = ground(next.x, next.z) + 3;
    if (!clear(next, { ...p, y: ground(p.x,p.z) + 1.5 })) return false;
    pose = next; origin = { x: p.x, z: p.z }; battery = 90; active = true; reason = null; return true;
  }
  function step(dt, input = {}) {
    if (disposed || !active || input.paused || !Number.isFinite(dt) || dt <= 0) return;
    if (!bodyReady(input.body, input)) { recall('body-unavailable'); return; }
    const elapsed = Math.min(dt, battery);
    battery = Math.max(0, battery - elapsed);
    if (Number.isFinite(input.yaw)) pose.yaw = input.yaw;
    const f = axis(input.forward), r = axis(input.right), l = axis(input.lift), norm = Math.max(1, Math.hypot(f,r,l));
    const dx = (-Math.sin(pose.yaw)*f + Math.cos(pose.yaw)*r)*8/norm;
    const dz = (-Math.cos(pose.yaw)*f - Math.sin(pose.yaw)*r)*8/norm;
    // Half-metre swept probes prevent thin walls being skipped on long ticks.
    const count = Math.max(1, Math.ceil(elapsed * 16)), slice = elapsed/count;
    for (let i=0; i<count; i++) {
      const next = { ...pose, x: pose.x+dx*slice, z: pose.z+dz*slice };
      const range = Math.hypot(next.x-origin.x,next.z-origin.z);
      if (range>150) { next.x=origin.x+(next.x-origin.x)*150/range; next.z=origin.z+(next.z-origin.z)*150/range; }
      const floor=ground(next.x,next.z);
      next.y=clamp(pose.y+l*8*slice/norm,floor+3,floor+45);
      if (clear(next,pose)) pose=next;
      else {
        for (const coordinate of ['x','z','y']) {
          const slide={...pose,[coordinate]:next[coordinate]}, g=ground(slide.x,slide.z);
          if (slide.y>=g+3 && slide.y<=g+45 && Math.hypot(slide.x-origin.x,slide.z-origin.z)<=150 && clear(slide,pose)) pose=slide;
        }
      }
    }
    if (!battery) recall('battery-empty');
  }
  function strike(body, ctx = {}) {
    if (disposed || !active || ctx.paused || body?.passenger || body?.actor?.impactTime > 0 || !ctx.owned || !ctx.upgraded || !bodyReady(body, ctx))
      return {ok:false,message:'Fly your upgraded drone outside to use a strike.'};
    const floor = ground(pose.x,pose.z);
    if (!Number.isFinite(floor)) return {ok:false,message:'No clear ground below the drone.'};
    let from = pose;
    for (let y = pose.y; y > floor + .25;) {
      y = Math.max(floor + .25,y - .5);
      const next = {...pose,y};
      if (!clear(next,from)) return {ok:false,message:'Move above clear outdoor ground first.'};
      from = next;
    }
    return {ok:true,message:'Drone strike deployed.',event:Object.freeze({type:'explosion',id:`drone-strike:${++strikeSerial}`,
      kind:'drone-strike',x:pose.x,y:floor+.25,z:pose.z,...DRONE_STRIKE_BLAST,interiorId:null})};
  }
  function snapshot() {
    const g=ground(pose.x,pose.z);
    return Object.freeze({ ...pose, active, battery, range:Math.hypot(pose.x-origin.x,pose.z-origin.z),
      altitude:Number.isFinite(g)?pose.y-g:0, reason, disposed });
  }
  return { deploy, step, recall, strike, snapshot, dispose() { if(disposed)return; recall('disposed'); disposed=true; } };
}

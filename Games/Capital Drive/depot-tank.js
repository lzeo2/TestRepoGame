// Original arcade vehicle movement. The depot owns its one bounded spawn.
const finitePose = pose => pose && Number.isFinite(pose.x) && Number.isFinite(pose.z);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const amount = value => Number.isFinite(value) ? clamp(value, -1, 1) : 0;
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const BOARD_DISTANCE = 5.4;

export function createDepotTank(map, simulation, { heightAt = () => 0 } = {}) {
  const spawn = map.defenceDepot?.drivableTank;
  const ground = (x,z) => {
    const y = heightAt(x,z);
    return Number.isFinite(y) ? y : 0;
  };
  const vehicle = spawn && { ...spawn, y:ground(spawn.x,spawn.z), speed:0, active:true, occupied:false };
  let stolen = false, seat = null;

  function nearest(pose) {
    return vehicle && finitePose(pose) && gap(pose,vehicle) <= BOARD_DISTANCE ? vehicle : null;
  }
  function exitPose() {
    const cos = Math.cos(vehicle.yaw), sin = Math.sin(vehicle.yaw), side = vehicle.width / 2 + .85;
    for (const [right, aft] of [[side,0],[-side,0],[side,1.7],[-side,1.7],[0,vehicle.length / 2 + .85]]) {
      const pose = { x:vehicle.x+cos*right+sin*aft, z:vehicle.z-sin*right+cos*aft, yaw:vehicle.yaw };
      if (!simulation.moveActor({...pose},0,0,.45).blocked && simulation.hasLineOfSight(vehicle,pose))
        return { ...pose, y:ground(pose.x,pose.z) };
    }
    return null;
  }
  function interact(ctx = {}) {
    if (!vehicle || ctx.valid !== true || ctx.paused || ctx.indoors || ctx.recovering)
      return { ok:false,message:'The tank is unavailable right now.' };
    if (vehicle.occupied) {
      if (Math.abs(vehicle.speed) > .55) return { ok:false,message:'Brake before leaving the tank.' };
      const pose = exitPose();
      if (!pose) return { ok:false,message:'Move the tank somewhere with a clear exit.' };
      vehicle.occupied = false;
      vehicle.speed = 0;
      seat = null;
      return { ok:true,message:'You left the tank.',pose };
    }
    if (!ctx.onFoot || !nearest(ctx.pose) || !simulation.hasLineOfSight(ctx.pose,vehicle))
      return { ok:false,message:'Approach the tank on foot.' };
    vehicle.occupied = true;
    const firstUse = !stolen;
    stolen = true;
    return { ok:true,message:'W/S drive · A/D steer · Space brake · E exit',stolen:firstUse };
  }
  function step(dt, input = {}, ctx = {}) {
    if (!vehicle?.occupied || ctx.valid !== true || ctx.paused || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt,.07);
    const throttle = input.brake ? 0 : amount(input.throttle);
    if (input.brake || !throttle) {
      vehicle.speed *= Math.exp(-(input.brake ? 7.2 : 1.25) * dt);
      if (Math.abs(vehicle.speed) < .035) vehicle.speed = 0;
    } else {
      const reverses = vehicle.speed * throttle < 0;
      vehicle.speed = clamp(vehicle.speed + throttle * (reverses ? 9 : 3.7) * dt,-4,14);
    }
    const steer = amount(input.steer);
    if (steer) {
      const yaw = vehicle.yaw + steer * (vehicle.speed < -.15 ? -1 : 1) * (.62 + Math.min(4,Math.abs(vehicle.speed)) * .09) * dt;
      const turning = { ...vehicle,yaw };
      if (simulation.canOccupy(turning,{fromPose:vehicle})) vehicle.yaw = yaw;
    }
    if (vehicle.speed) {
      const advance = vehicle.speed * dt;
      const result = simulation.moveVehicle(vehicle,-Math.sin(vehicle.yaw)*advance,-Math.cos(vehicle.yaw)*advance);
      if (result.blocked) vehicle.speed = 0;
      if (result.moved) vehicle.y = ground(vehicle.x,vehicle.z);
    }
  }
  function reset() {
    if (vehicle) Object.assign(vehicle,spawn,{y:ground(spawn.x,spawn.z),speed:0,occupied:false});
    seat = null;
    stolen = false;
  }
  function snapshot() {
    return Object.freeze({ active:vehicle?.occupied===true,vehicle:vehicle?Object.freeze({...vehicle}):null });
  }
  return {
    vehicle,nearest,interact,step,reset,snapshot,
    get isActive(){return vehicle?.occupied===true;},
    get seatPose(){
      if (!vehicle?.occupied) return null;
      const {id,x,y,z,yaw,speed} = vehicle, eye = y+1.7;
      if (!seat || seat.x!==x || seat.y!==eye || seat.z!==z || seat.yaw!==yaw || seat.speed!==speed)
        seat = Object.freeze({id,x,y:eye,z,yaw,speed});
      return seat;
    },
  };
}

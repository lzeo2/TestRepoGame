// A copied front/back probe retains the actual car centre as its pitch anchor.
export function stuntVehicleHeightAt(pose) {
  if (!pose?.stuntActive || ![pose.x,pose.z,pose.yaw,pose.stuntY,pose.stuntPitch,pose.stuntX,pose.stuntZ].every(Number.isFinite)) return null;
  const along = (pose.x-pose.stuntX)*-Math.sin(pose.yaw)+(pose.z-pose.stuntZ)*-Math.cos(pose.yaw);
  const height = pose.stuntY-.18+along*Math.tan(Math.max(-.6,Math.min(.6,pose.stuntPitch)));
  return Number.isFinite(height) ? height : null;
}

// Optional stunt-only vertical motion. Ordinary cars retain their existing state.
export function createVehicleFlight({ supportAt, heightAt, gravity = 18 }) {
  let support = null, airborne = false;
  function clear(car) {
    support = null; airborne = false;
    for (const key of ['stuntActive','stuntY','stuntVy','stuntPitch','stuntX','stuntZ']) delete car[key];
  }
  function stampPose(car) {
    car.stuntX = car.x; car.stuntZ = car.z;
    car.stuntPitch = Math.max(-.6,Math.min(.6,Math.atan2(car.stuntVy,Math.max(.01,Math.hypot(car.vx,car.vz)))));
  }
  function step(car, dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const ground = heightAt(car,car.edge?.road) + .18;
    const next = supportAt(car);
    const valid = next && [next.height,next.slopeX,next.slopeZ].every(Number.isFinite);
    if (!Number.isFinite(ground)) { clear(car); return; }
    if (airborne) {
      const vy = car.stuntVy - gravity * dt;
      const y = car.stuntY + car.stuntVy * dt - gravity * dt * dt / 2;
      const floor = valid ? Math.max(ground,next.height+.18) : ground;
      if (!Number.isFinite(y) || !Number.isFinite(vy)) { clear(car); return; }
      if (vy <= 0 && y <= floor) {
        if (!valid) { clear(car); return; }
        airborne = false;
      } else {
        car.stuntY = Math.min(y,ground+45); car.stuntVy = y > ground+45 ? Math.min(0,vy) : vy;
        stampPose(car);
        return;
      }
    }
    if (valid) {
      support = next;
      car.stuntActive = true; car.stuntY = Math.max(ground,next.height+.18);
      car.stuntVy = car.vx*next.slopeX+car.vz*next.slopeZ;
      stampPose(car);
    } else if (support && car.stuntActive) {
      const launch = car.vx*support.slopeX+car.vz*support.slopeZ;
      support = null;
      if (Math.hypot(car.vx,car.vz)>9 && launch>0) {
        airborne = true; car.stuntVy = launch;
        // Advance on the first unsupported step too.
        step(car,dt);
      } else if (car.stuntY>ground+.05) {
        airborne = true; car.stuntVy = 0; step(car,dt);
      } else clear(car);
    }
  }
  return { step, clear };
}

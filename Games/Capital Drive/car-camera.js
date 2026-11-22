const finite = value => Number.isFinite(value) ? value : 0;
const clamp = (value, low, high) => Math.max(low, Math.min(high, finite(value)));

// Match placeCar's YXZ rotation, including its road/stunt slope. The eye comes
// from the actual fleet mesh, so short cabins keep their own seating position.
export function carCockpitFrame(pose, { eye = [0, 1.05, 0], ground = 0, pitch = 0, lookYaw = 0, lookPitch = 0, passenger = false } = {}) {
  const yaw = finite(pose?.yaw), slope = clamp(pitch, -.65, .65);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(slope), sp = Math.sin(slope);
  const rotate = (x, y, z) => {
    const py = y * cp - z * sp, pz = y * sp + z * cp;
    return { x: x * cy + pz * sy, y: py, z: -x * sy + pz * cy };
  };
  const seat = rotate(finite(eye?.[0]) * (passenger ? -1 : 1), finite(eye?.[1]), finite(eye?.[2]));
  const camera = { x: finite(pose?.x) + seat.x, y: finite(ground) + .18 + seat.y, z: finite(pose?.z) + seat.z };
  const horizontal = clamp(lookYaw, -1.45, 1.45), vertical = clamp(lookPitch, -.5, .72);
  const direction = rotate(-Math.sin(horizontal) * Math.cos(vertical), Math.sin(vertical), -Math.cos(horizontal) * Math.cos(vertical));
  return { camera, target: { x: camera.x + direction.x * 20, y: camera.y + direction.y * 20, z: camera.z + direction.z * 20 }, near: .035, fov: 70 };
}

// Presentation only: no camera accumulation, physics writes or random impulses.
export function createDrivingCameraShake() {
  const offset={x:0,y:0};
  let phase=0,amplitude=0,bump=0,lastCrashes=null,lastOffroad=null;
  return {advance(dt,car,{suppressed=false,cockpit=false}={}) {
    const step=clamp(dt,0,.1),speed=Math.abs(finite(car?.speed));
    const crashes=finite(car?.crashes),offroad=car?.offroad===true;
    const impact=lastCrashes!==null&&crashes>lastCrashes;
    const verge=lastOffroad===false&&offroad;
    lastCrashes=crashes;lastOffroad=offroad;
    if(suppressed||speed<.6||!step){amplitude=0;bump=0;phase=0;return null;}
    const surface=car?.edge?.road?.surface;
    const rough=offroad||['gravel','dirt','unpaved','ground'].includes(surface);
    const scale=cockpit?.32:1;
    const target=clamp((speed-.6)/38,0,1)*(rough?.024:.009)*scale;
    amplitude+=(target-amplitude)*(1-Math.exp(-step*12));
    if(impact||verge)bump=Math.max(bump,(impact?clamp(car?.lastImpactSpeed/30,.2,1):.35)*.025*scale);
    bump*=Math.exp(-step*13);
    phase=(phase+step*(7+speed*.23))%(Math.PI*2);
    offset.x=Math.sin(phase*2)*amplitude*.45;
    offset.y=Math.sin(phase*3)*amplitude+Math.sin(phase*5)*bump;
    return offset;
  }};
}

export const drivingCameraShake=createDrivingCameraShake();

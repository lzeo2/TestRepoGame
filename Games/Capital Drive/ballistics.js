// Deterministic metre-based hitscan shared by gameplay and adult owners.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const MAX_AIM_PITCH = Math.PI * 70 / 180;
const MAX_SHOT_RANGE = 200;
export function createShotRays({ x, y, z, yaw, pitch = 0, range, pellets = 1, spread = 0, aiming = false, serial = 1, interiorId = null }) {
  const count = clamp(Math.floor(pellets), 1, 6), width = spread * (aiming ? .42 : 1);
  return Array.from({ length: count }, (_, pellet) => {
    const offset = count > 1 ? (pellet / (count - 1) * 2 - 1) * width : width * (((serial - 1) % 5) / 2 - 1);
    const angle = yaw + offset, elevation = clamp(pitch, -MAX_AIM_PITCH, MAX_AIM_PITCH);
    return { x, y, z, yaw: angle, pitch: elevation, dx: -Math.sin(angle) * Math.cos(elevation), dy: Math.sin(elevation), dz: -Math.cos(angle) * Math.cos(elevation), range, interiorId };
  });
}
// Upright capsule: the body cylinder and rounded ends use the same narrow radius.
export function rayTargetDistance(ray, target) {
  if (!ray || !target || !Number.isFinite(target.health) || target.health <= 0 || target.active === false || (target.interiorId || null) !== (ray.interiorId || null)) return Infinity;
  const feet = target.feetY ?? target.y, height = target.height ?? 1.8, radius = target.radius ?? .36;
  if (![ray.x,ray.y,ray.z,ray.dx,ray.dy,ray.dz,ray.range,target.x,feet,target.z,height,radius].every(Number.isFinite) || height <= 0 || radius <= 0 || ray.range <= 0 || ray.range > MAX_SHOT_RANGE || Math.abs(Math.hypot(ray.dx,ray.dy,ray.dz)-1)>1e-6) return Infinity;
  const lower = feet + Math.min(radius, height / 2), upper = feet + Math.max(height - radius, height / 2);
  let nearest = Infinity;
  const accept = t => { if (t >= 0 && t <= ray.range) nearest = Math.min(nearest, t); };
  const ox = ray.x - target.x, oz = ray.z - target.z, a = ray.dx ** 2 + ray.dz ** 2;
  const b = ox * ray.dx + oz * ray.dz, c = ox ** 2 + oz ** 2 - radius ** 2;
  const startY = Math.max(lower,Math.min(upper,ray.y));
  if(c+(ray.y-startY)**2<=0)return 0;
  if (a > 1e-12 && b*b >= a*c) {
    const root = Math.sqrt(b*b-a*c);
    for (const t of [(-b-root)/a,(-b+root)/a]) if (ray.y+ray.dy*t >= lower && ray.y+ray.dy*t <= upper) accept(t);
  }
  for (const center of [lower, upper]) {
    const oy = ray.y-center, dot = b+oy*ray.dy, square = c+oy*oy, discriminant = dot*dot-square;
    if (discriminant >= 0) { accept(-dot-Math.sqrt(discriminant)); accept(-dot+Math.sqrt(discriminant)); }
  }
  return nearest;
}
export function resolveShotRay(ray, { targets = [], blockDistance = ray.range } = {}) {
  let distance = Math.max(0, Math.min(ray.range, blockDistance)), target = null;
  for (const candidate of targets) {
    const hit = rayTargetDistance(ray, candidate);
    if (hit < distance) { target = candidate; distance = hit; }
  }
  return { target, distance, endX: ray.x + ray.dx * distance, endY: ray.y + ray.dy * distance, endZ: ray.z + ray.dz * distance };
}

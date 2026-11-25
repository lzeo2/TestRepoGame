import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

// Street-side lamps built from the road-anchored data module. Daytime shows
// dark grey poles only; after dusk a second bounded pass fades in additive
// decal glows, matching the headlight render contract of no real lights.
export const STREETLIGHT_VIEW_LIMITS = Object.freeze({ maxDrawCalls: 2, maxPoleInstances: 880, maxGlowInstances: 440, poleHeight: 5.6 });

const POLE_SHADE = 0x3d4347, ARM_SHADE = 0x32373b, HEAD_SHADE = 0x2a2e31, GLOW_COLOR = 0xffd9a3;

export function createStreetlightsView(scene, lamps = [], heightAt = () => 0) {
  const pose = new THREE.Object3D(), color = new THREE.Color();
  const poleGeometry = new THREE.BoxGeometry(1, 1, 1);
  const poleMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const poles = new THREE.InstancedMesh(poleGeometry, poleMaterial, STREETLIGHT_VIEW_LIMITS.maxPoleInstances);
  poles.name = 'Sourced streetlight poles, arms and heads';
  poles.frustumCulled = false; poles.count = 0; scene.add(poles);
  // The glow texture is the headlights-view decal: a soft additive disc.
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const i = (y * 32 + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
    pixels[i + 3] = Math.round(255 * Math.max(0, 1 - Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5)) ** 2);
  }
  const texture = new THREE.DataTexture(pixels, 32, 32); texture.needsUpdate = true;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  const glowGeometry = new THREE.PlaneGeometry(1, 1); glowGeometry.rotateX(-Math.PI / 2);
  const glowMaterial = new THREE.MeshBasicMaterial({ color: GLOW_COLOR, map: texture, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -2 });
  const glow = new THREE.InstancedMesh(glowGeometry, glowMaterial, STREETLIGHT_VIEW_LIMITS.maxGlowInstances);
  glow.name = 'Night streetlight glows';
  glow.frustumCulled = false; glow.count = 0; glow.visible = false; scene.add(glow);
  const local = (lamp, dx, dz) => {
    const cs = Math.cos(lamp.yaw), sn = Math.sin(lamp.yaw);
    return { x: lamp.x + dx * cs - dz * sn, z: lamp.z + dx * sn + dz * cs };
  };
  const stats = { lamps: 0, poleInstances: 0, glowInstances: 0, drawCalls: 0, glowDrawCalls: 0, maxDrawCalls: STREETLIGHT_VIEW_LIMITS.maxDrawCalls,
    night: 0, geometries: 2, materials: 2, textures: 1, lights: 0, disposed: false };
  // Static furniture: instance matrices are written once, never per frame.
  for (const lamp of lamps) {
    if (stats.poleInstances + 3 > STREETLIGHT_VIEW_LIMITS.maxPoleInstances ||
      stats.glowInstances + 2 > STREETLIGHT_VIEW_LIMITS.maxGlowInstances) break;
    if (![lamp.x, lamp.z, lamp.yaw].every(Number.isFinite)) continue;
    const y = heightAt(lamp.x, lamp.z);
    if (!Number.isFinite(y)) continue;
    const box = (x, yy, z, w, h, d, shade) => {
      pose.position.set(x, yy, z); pose.rotation.set(0, -lamp.yaw, 0, 'YXZ'); pose.scale.set(w, h, d); pose.updateMatrix();
      poles.setMatrixAt(stats.poleInstances, pose.matrix); poles.setColorAt(stats.poleInstances, color.setHex(shade)); stats.poleInstances++;
    };
    box(lamp.x, y + STREETLIGHT_VIEW_LIMITS.poleHeight / 2, lamp.z, .1, STREETLIGHT_VIEW_LIMITS.poleHeight, .1, POLE_SHADE);
    const arm = local(lamp, 0, -.65); box(arm.x, y + 5.42, arm.z, .07, .07, 1.3, ARM_SHADE);
    const head = local(lamp, 0, -1.25); box(head.x, y + 5.5, head.z, .32, .12, .6, HEAD_SHADE);
    // Ground cone reaches from the kerb under the arm toward the lane.
    const cone = local(lamp, 0, -2.6);
    const coneFront = local(lamp, 0, -5.6), coneBack = local(lamp, 0, .4);
    const front = heightAt(coneFront.x, coneFront.z), back = heightAt(coneBack.x, coneBack.z);
    const tilt = Number.isFinite(front) && Number.isFinite(back) ? Math.atan2(front - back, 6) : 0;
    pose.position.set(cone.x, y + .12, cone.z); pose.rotation.set(tilt, -lamp.yaw, 0, 'YXZ'); pose.scale.set(4.5, 1, 7); pose.updateMatrix();
    glow.setMatrixAt(stats.glowInstances, pose.matrix); stats.glowInstances++;
    pose.position.set(head.x, y + 5.44, head.z); pose.rotation.set(Math.PI / 2, -lamp.yaw, 0, 'YXZ'); pose.scale.set(.9, .5, 1); pose.updateMatrix();
    glow.setMatrixAt(stats.glowInstances, pose.matrix); stats.glowInstances++;
    stats.lamps++;
  }
  poles.count = stats.poleInstances; poles.visible = stats.poleInstances > 0;
  if (poles.instanceColor) poles.instanceColor.needsUpdate = true;
  glow.count = stats.glowInstances;
  stats.drawCalls = poles.visible ? 1 : 0;
  let disposed = false, lastNight = -1;
  function update(_focus, { night = 0 } = {}) {
    if (disposed) return;
    const value = Number.isFinite(night) ? Math.max(0, Math.min(1, night)) : 0;
    if (value === lastNight) return;
    lastNight = value;
    // The atmosphere's smooth daylight drives the ramp: lamps wake below
    // daylight .45 and burn fully by daylight .2; brighter than .55 is day.
    const alpha = Math.max(0, Math.min(1, (value - .55) / .25));
    glow.visible = alpha > 0 && stats.glowInstances > 0;
    glowMaterial.opacity = .55 * alpha;
    stats.night = value; stats.glowDrawCalls = glow.visible ? 1 : 0;
    stats.drawCalls = (poles.visible ? 1 : 0) + stats.glowDrawCalls;
  }
  function dispose() {
    if (disposed) return;
    disposed = true; glow.visible = false;
    poles.removeFromParent(); glow.removeFromParent();
    poles.dispose(); glow.dispose();
    poleGeometry.dispose(); glowGeometry.dispose(); poleMaterial.dispose(); glowMaterial.dispose(); texture.dispose();
    poles.count = glow.count = 0;
    stats.lamps = stats.poleInstances = stats.glowInstances = 0;
    stats.drawCalls = stats.glowDrawCalls = stats.night = 0; stats.disposed = true;
  }
  return { update, get stats() { return Object.freeze({ ...stats }); }, dispose };
}

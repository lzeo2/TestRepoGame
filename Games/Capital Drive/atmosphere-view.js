import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const CAPACITY = 320;
const validPoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.z);
const fraction = value => value - Math.floor(value);

// One fixed rain-line pool; reuse the world's existing sky, fog and two lights.
export function createAtmosphereView(scene, { hemisphere, sun, heightAt = () => 0, quality = 'low' } = {}) {
  const positions = new Float32Array(CAPACITY * 6);
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3); attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', attribute); geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({ color: 0xbdceda, transparent: true, opacity: .42, depthWrite: false });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'Local rain'; lines.frustumCulled = false; lines.visible = false; scene.add(lines);
  let disposed = false, count = 0, lastElapsed = null, lastX = null, lastZ = null, lastGround = null, lastCount = null;
  function update(state, focus, { interior = false, quality: currentQuality = quality } = {}) {
    if (disposed || !state || !Number.isFinite(state.elapsed) || !Number.isFinite(state.rain)) return;
    if (scene.background?.isColor) scene.background.setHex(state.skyColor);
    if (scene.fog?.color) { scene.fog.color.setHex(state.fogColor); scene.fog.near = state.fogNear; scene.fog.far = state.fogFar; }
    if (hemisphere) { hemisphere.color.setHex(state.hemisphereSkyColor); hemisphere.groundColor.setHex(state.hemisphereGroundColor); hemisphere.intensity = state.hemisphereIntensity; }
    if (sun) { sun.color.setHex(state.sunColor); sun.intensity = state.sunIntensity; sun.position.set(state.sunX, state.sunY, state.sunZ); }
    const ground = validPoint(focus) ? (Number.isFinite(focus.y) ? focus.y : heightAt(focus.x, focus.z)) : NaN;
    count = !interior && validPoint(focus) && Number.isFinite(ground) ? Math.floor((currentQuality === 'performance' ? 160 : CAPACITY) * Math.max(0, Math.min(1, state.rain))) : 0;
    geometry.setDrawRange(0, count * 2); lines.visible = count > 0;
    if (!count || (state.elapsed === lastElapsed && focus.x === lastX && focus.z === lastZ && ground === lastGround && count === lastCount)) return;
    lastElapsed = state.elapsed; lastX = focus.x; lastZ = focus.z; lastGround = ground; lastCount = count;
    lines.position.set(focus.x, ground, focus.z);
    for (let i = 0; i < count; i++) {
      const radius = Math.sqrt(fraction(i * .61803398875 + .17)) * 27, angle = i * 2.39996323;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      const y = 1 + fraction(i * .754877666 + state.elapsed * -1.45) * 16;
      const index = i * 6;
      positions[index] = x; positions[index + 1] = y; positions[index + 2] = z;
      positions[index + 3] = x + state.windX * .11; positions[index + 4] = y - .9; positions[index + 5] = z + state.windZ * .11;
    }
    attribute.needsUpdate = true;
  }
  return { update, get stats() { return Object.freeze({ capacity: CAPACITY, rainLines: count, drawCalls: count > 0 ? 1 : 0,
    geometryCount: disposed ? 0 : 1, materialCount: disposed ? 0 : 1, bufferBytes: disposed ? 0 : positions.byteLength, lightsCreated: 0, disposed }); },
  dispose() { if (disposed) return; disposed = true; scene.remove(lines); geometry.dispose(); material.dispose(); count = 0; } };
}

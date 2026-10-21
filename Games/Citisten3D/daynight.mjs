import * as THREE from './vendor/three.module.js';

// phase: 0 midnight, .25 dawn, .5 noon, .75 dusk. No clock or simulation here.
export function createDayNight(scene) {
  const ambient = new THREE.AmbientLight(0xffe8ce, .45);
  const hemisphere = new THREE.HemisphereLight(0xc9dbe8, 0x667047, 1.1);
  const sun = new THREE.DirectionalLight(0xffe0b0, 2);
  const moon = new THREE.DirectionalLight(0x9eb7ed, .45);
  sun.position.set(-200, 400, 150);
  moon.position.set(200, 280, -120);
  scene.add(ambient, hemisphere, sun, moon);
  scene.background = new THREE.Color();
  const nightSky = new THREE.Color(0x101b30), daySky = new THREE.Color(0xb9cfda);
  const nightAmbient = new THREE.Color(0x263e70), dayAmbient = new THREE.Color(0xffe8ce);
  const nightHemi = new THREE.Color(0x43587d), dayHemi = new THREE.Color(0xc9dbe8);
  let phase = .5;
  function setPhase(value) {
    if (!Number.isFinite(value)) throw new RangeError('Phase must be finite');
    phase = ((value % 1) + 1) % 1;
    const t = THREE.MathUtils.smoothstep(-Math.cos(phase * Math.PI * 2), -.25, .35);
    scene.background.copy(nightSky).lerp(daySky, t);
    ambient.color.copy(nightAmbient).lerp(dayAmbient, t);
    ambient.intensity = THREE.MathUtils.lerp(.28, .45, t);
    hemisphere.color.copy(nightHemi).lerp(dayHemi, t);
    hemisphere.intensity = THREE.MathUtils.lerp(.35, 1.1, t);
    sun.intensity = 2 * t;
    moon.intensity = .55 * (1 - t);
    return t;
  }
  setPhase(phase);
  return { setPhase, get phase() { return phase; }, lights: { ambient, hemisphere, sun, moon }, dispose() { scene.remove(ambient, hemisphere, sun, moon); } };
}

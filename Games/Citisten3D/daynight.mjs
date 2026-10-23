import * as THREE from './vendor/three.module.js';

// phase: 0 midnight, .25 dawn, .5 noon, .75 dusk. No clock or simulation here.
export function createDayNight(scene) {
  const ambient = new THREE.AmbientLight(0xffe8ce, .45);
  const hemisphere = new THREE.HemisphereLight(0xc9dbe8, 0x667047, 1.1);
  const sun = new THREE.DirectionalLight(0xffe0b0, 2);
  const moon = new THREE.DirectionalLight(0x9eb7ed, .45);
  const probe = new THREE.LightProbe(new THREE.SphericalHarmonics3(), 1);
  sun.position.set(-200, 400, 150);
  moon.position.set(200, 280, -120);
  for (const light of [sun, moon]) {
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.bias = -.00015; light.shadow.normalBias = .045;
    light.shadow.camera.near = 1; light.shadow.camera.far = 1300;
    scene.add(light.target);
  }
  scene.add(ambient, hemisphere, sun, moon, probe);
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
    ambient.intensity = THREE.MathUtils.lerp(.08, .18, t);
    hemisphere.color.copy(nightHemi).lerp(dayHemi, t);
    hemisphere.intensity = THREE.MathUtils.lerp(.18, .5, t);
    // Analytic sky SH, not a captured/reflection probe or baked global illumination.
    const { r, g, b } = hemisphere.color;
    probe.sh.coefficients[0].set(r, g, b).multiplyScalar(.35 + .4 * t);
    probe.sh.coefficients[1].set(r, g, b).multiplyScalar(.08 + .12 * t);
    sun.intensity = 3 * t;
    moon.intensity = .8 * (1 - t);
    for (const light of [sun, moon]) {
      const castShadow = light === sun ? t > .02 : t < .98;
      if (light.castShadow && !castShadow) {
        light.shadow.dispose();
        light.shadow.map = null; light.shadow.mapPass = null;
      }
      light.castShadow = castShadow;
    }
    return t;
  }
  setPhase(phase);
  return { setPhase, get phase() { return phase; }, lights: { ambient, hemisphere, sun, moon, probe },
    follow(camera) {
      const radius = Math.max(75, Math.min(360, camera.position.y * .9));
      for (const light of [sun, moon]) {
        const c = light.shadow.camera;
        c.left = c.bottom = -radius; c.right = c.top = radius; c.updateProjectionMatrix();
        light.target.position.set(camera.position.x, 0, camera.position.z);
        light.position.copy(light.target.position).add(light === sun ? new THREE.Vector3(-200, 400, 150) : new THREE.Vector3(200, 280, -120));
      }
    },
    dispose() { scene.remove(ambient, hemisphere, sun, moon, probe, sun.target, moon.target); sun.shadow.dispose(); moon.shadow.dispose(); } };

}

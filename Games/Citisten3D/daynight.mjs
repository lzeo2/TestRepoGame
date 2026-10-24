import * as THREE from './vendor/three.module.js';

// Visual clock only; authoritative gameplay/save clocks stay in the simulation.
export function phaseForState(state) {
  if (state.mode === 'free') return (.5 + state.time / 480) % 1;
  return state.phase === 'day' ? .27 + .46 * (1 - THREE.MathUtils.clamp(state.dayRemaining / 240, 0, 1)) : 0;
}

// phase: 0 midnight, .25 dawn, .5 noon, .75 dusk.
export function createDayNight(scene) {
  const ambient = new THREE.AmbientLight(0xffe8ce, .45);
  const hemisphere = new THREE.HemisphereLight(0xc9dbe8, 0x667047, 1.1);
  const sun = new THREE.DirectionalLight(0xffe0b0, 2);
  const moon = new THREE.DirectionalLight(0x9eb7ed, .45);
  const probe = new THREE.LightProbe(new THREE.SphericalHarmonics3(), 1);
  const sunDirection = new THREE.Vector3(), moonDirection = new THREE.Vector3();
  // Tiny immutable analytic sky, convolved by Three once for shared PBR
  // reflections. Brightness follows time without rebuilding PMREM every frame.
  const environmentBytes = new Uint8Array(64 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) {
    const up = Math.cos((y + .5) / 32 * Math.PI), i = (y * 64 + x) * 4;
    const color = new THREE.Color(up < 0 ? 0x596445 : 0xb9cfda).lerp(new THREE.Color(up < 0 ? 0x30382b : 0x7095bb), Math.abs(up));
    environmentBytes[i] = color.r * 255; environmentBytes[i + 1] = color.g * 255; environmentBytes[i + 2] = color.b * 255; environmentBytes[i + 3] = 255;
  }
  const environment = new THREE.DataTexture(environmentBytes, 64, 32);
  environment.mapping = THREE.EquirectangularReflectionMapping; environment.needsUpdate = true;
  const previousEnvironment = scene.environment; scene.environment = environment;
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
  const warmSky = new THREE.Color(0xc99d80), warmSun = new THREE.Color(0xffb573), noonSun = new THREE.Color(0xffecd0);
  let phase = .5, daylight = 1;
  function setPhase(value) {
    if (!Number.isFinite(value)) throw new RangeError('Phase must be finite');
    phase = ((value % 1) + 1) % 1;
    const angle = (phase - .25) * Math.PI * 2;
    sunDirection.set(-Math.cos(angle), Math.sin(angle), .32).normalize();
    moonDirection.copy(sunDirection).negate();
    const t = THREE.MathUtils.smoothstep(-Math.cos(phase * Math.PI * 2), -.25, .35);
    daylight = t;
    const twilight = (1 - THREE.MathUtils.smoothstep(Math.abs(sunDirection.y), 0, .55)) * t;
    scene.background.copy(nightSky).lerp(daySky, t).lerp(warmSky, twilight * .55);
    scene.environmentIntensity = .08 + t * .92;
    sun.color.copy(noonSun).lerp(warmSun, twilight);
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
  return { setPhase, sunDirection, get daylight() { return daylight; }, get phase() { return phase; }, lights: { ambient, hemisphere, sun, moon, probe },
    approach(value, dt) {
      if (!Number.isFinite(value) || !Number.isFinite(dt) || dt < 0) throw new RangeError('Invalid light transition');
      const delta = THREE.MathUtils.euclideanModulo(value - phase + .5, 1) - .5;
      return setPhase(phase + THREE.MathUtils.clamp(delta, -dt * .08, dt * .08));
    },
    follow(camera) {
      const radius = Math.max(75, Math.min(360, camera.position.y * .9));
      for (const light of [sun, moon]) {
        const c = light.shadow.camera;
        c.left = c.bottom = -radius; c.right = c.top = radius; c.updateProjectionMatrix();
        light.target.position.set(camera.position.x, 0, camera.position.z);
        // Below-horizon lights have zero contribution outside mixed twilight.
        const direction = light === sun ? sunDirection : moonDirection;
        light.position.copy(light.target.position).addScaledVector(direction, 600);
      }
    },
    dispose() { scene.remove(ambient, hemisphere, sun, moon, probe, sun.target, moon.target); sun.shadow.dispose(); moon.shadow.dispose(); scene.environment = previousEnvironment; environment.dispose(); } };

}

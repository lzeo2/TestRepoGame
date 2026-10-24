import * as THREE from './vendor/three.module.js';

const weatherNames = ['clear', 'rain', 'snow', 'fog'];
export function weatherAt(time, cold = false) {
  if (!Number.isFinite(time) || time < 0) throw new RangeError('Weather time must be nonnegative');
  return cold ? 'snow' : ['clear', 'rain', 'clear', 'fog', 'snow', 'clear'][Math.floor(time / 180) % 6];
}

// Analytic single-scattering height fog integrated along each surface ray. No
// full-screen buffers or raymarch. It cannot shadow fog behind an obstruction.
export function createAtmosphere(scene, extent) {
  const fog = new THREE.FogExp2(0xb9cfda, .00035);
  const previousFog = scene.fog; scene.fog = fog;
  const uniforms = { cityFogDensity: { value: .00035 }, cityFogSun: { value: new THREE.Vector3(0, 1, 0) },
    cityFogWarm: { value: new THREE.Color(0xffd7a0) }, cityFogDay: { value: 1 } };
  const patched = new Map();
  function patch(material) {
    if (patched.has(material) || !material.fog || material.isShaderMaterial) return;
    const original = { compile: material.onBeforeCompile, key: material.customProgramCacheKey };
    const key = original.key.call(material);
    patched.set(material, original);
    material.onBeforeCompile = function (shader, renderer) {
      original.compile.call(this, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'varying vec3 vCityFogWorld;\n' + shader.vertexShader.replace('#include <fog_vertex>', `
#include <fog_vertex>
vec4 cityWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
 cityWorld = instanceMatrix * cityWorld;
#endif
vCityFogWorld = (modelMatrix * cityWorld).xyz;
`);
      shader.fragmentShader = `varying vec3 vCityFogWorld;
uniform float cityFogDensity;
uniform vec3 cityFogSun;
uniform vec3 cityFogWarm;
uniform float cityFogDay;
` + shader.fragmentShader.replace('#include <fog_fragment>', `
#ifdef USE_FOG
 vec3 cityRay = vCityFogWorld - cameraPosition;
 float cityDistance = length(cityRay);
 float cityDelta = clamp(cityRay.y / 140.0, -30.0, 30.0);
 float cityIntegral = abs(cityDelta) < 0.001 ? 1.0 - cityDelta * 0.5 : (1.0 - exp(-cityDelta)) / cityDelta;
 float cityOptical = cityDistance * cityFogDensity * exp(-max(cameraPosition.y, 0.0) / 140.0) * cityIntegral;
 // A thin uniform layer retains distance fade above the valley fog.
 float cityFade = 1.0 - exp(-max(0.0, cityOptical + cityDistance * cityFogDensity * 0.18));
 float cityScatter = pow(max(0.0, dot(normalize(cityRay + vec3(0.0001)), cityFogSun)), 12.0) * cityFogDay * 0.3;
 gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(fogColor, cityFogWarm, cityScatter), clamp(cityFade, 0.0, 0.98));
#endif
`);
    };
    material.customProgramCacheKey = () => `${key}:citisten-height-fog-v1`;
    material.needsUpdate = true;
  }
  // Fixed camera-relative particle volume; immutable seed attribute, motion in
  // the vertex shader. Neither snow nor rain touches gameplay or collision.
  const seeds = new Float32Array(768 * 3);
  for (let i = 0; i < seeds.length; i++) seeds[i] = ((Math.imul(i + 1, 16807) ^ Math.imul(i + 71, 48271)) >>> 0) / 4294967296;
  const particleGeometry = new THREE.InstancedBufferGeometry();
  particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, -.5, 1, 0, .5, 1, 0], 3));
  particleGeometry.setIndex([0, 1, 2, 2, 1, 3]);
  particleGeometry.setAttribute('seed', new THREE.InstancedBufferAttribute(seeds, 3));
  particleGeometry.instanceCount = 768;
  const particleMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { elapsed: { value: 0 }, snow: { value: 0 }, eye: { value: new THREE.Vector3() }, daylight: { value: 1 } },
    vertexShader: `attribute vec3 seed;
uniform float elapsed; uniform float snow; uniform vec3 eye;
varying float alpha;
void main() {
 float speed = mix(48.0, 4.0, snow);
 vec3 p = vec3((seed.x - 0.5) * 180.0, mod(seed.y * 100.0 - elapsed * speed, 100.0) - 25.0, (seed.z - 0.5) * 180.0);
 p.x += sin(elapsed + seed.z * 50.0) * snow * 3.0;
 vec4 view = modelViewMatrix * vec4(p + eye, 1.0);
 view.xy += vec2(position.x * mix(0.08, 0.38, snow), position.y * mix(2.4, 0.38, snow));
 alpha = (1.0 - smoothstep(50.0, 90.0, length(p.xz))) * smoothstep(0.0, 12.0, length(p));
 gl_Position = projectionMatrix * view;
}`,
    fragmentShader: `uniform float daylight; varying float alpha;
void main() { gl_FragColor = vec4(mix(vec3(0.38,0.47,0.6),vec3(0.85,0.9,0.95),daylight), alpha * 0.48); }
` });
  const particles = new THREE.Mesh(particleGeometry, particleMaterial); particles.frustumCulled = false; particles.visible = false;
  scene.add(particles);
  const skyGeometry = new THREE.SphereGeometry(extent * 3.8, 24, 12);
  const skyMaterial = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { skyColor: { value: new THREE.Color() }, sunDirection: { value: new THREE.Vector3() }, day: { value: 1 }, cloud: { value: 0 } },
    vertexShader: 'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 direction; uniform vec3 skyColor; uniform vec3 sunDirection; uniform float day; uniform float cloud;
void main(){
 vec3 ray=normalize(direction); float horizon=pow(1.0-abs(ray.y),4.0);
 vec3 zenith=skyColor*mix(0.6,0.85,day);
 vec3 haze=mix(skyColor,vec3(0.78,0.78,0.72),0.28*day);
 vec3 color=mix(zenith,haze,horizon);
 float disc=smoothstep(0.9995,0.99985,dot(ray,sunDirection));
 float glow=pow(max(0.0,dot(ray,sunDirection)),48.0)*0.15;
 color+=vec3(1.0,0.72,0.38)*(disc+glow)*day*(1.0-cloud*0.8);
 gl_FragColor=vec4(color,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}` });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial); sky.frustumCulled = false; sky.renderOrder = -100; scene.add(sky);
  let weather = 'clear', elapsed = 0, disposed = false;
  return {
    particles, sky, uniforms,
    get weather() { return weather; },
    setWeather(value) {
      if (!weatherNames.includes(value)) throw new RangeError('Weather must be clear, rain, snow or fog');
      weather = value; particles.visible = value === 'rain' || value === 'snow';
      particleMaterial.uniforms.snow.value = Number(value === 'snow');
    },
    update(camera, daylight, sunDirection, dt = 0) {
      if (disposed) return;
      if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Atmosphere delta must be nonnegative');
      elapsed = (elapsed + Math.min(dt, .25)) % 3600;
      const dense = weather === 'fog' ? 3.6 : weather === 'clear' ? 1 : 2.1;
      uniforms.cityFogDensity.value = .00035 * dense * 1000 / extent;
      uniforms.cityFogSun.value.copy(sunDirection); uniforms.cityFogDay.value = daylight;
      fog.color.copy(scene.background);
      particleMaterial.uniforms.eye.value.copy(camera.position);
      particleMaterial.uniforms.elapsed.value = elapsed; particleMaterial.uniforms.daylight.value = daylight;
      sky.position.copy(camera.position);
      skyMaterial.uniforms.skyColor.value.copy(scene.background);
      skyMaterial.uniforms.day.value = daylight; skyMaterial.uniforms.sunDirection.value.copy(sunDirection);
      skyMaterial.uniforms.cloud.value = Number(weather !== 'clear');
      // New pools can appear after ready, including moving agents. Patching is
      // once per shared material and chains the building/AO hooks unchanged.
      scene.traverse(node => { for (const m of [].concat(node.material || [])) patch(m); });
    },
    dispose() {
      if (disposed) return; disposed = true;
      scene.fog = previousFog; scene.remove(particles, sky);
      for (const [m, original] of patched) { m.onBeforeCompile = original.compile; m.customProgramCacheKey = original.key; m.needsUpdate = true; }
      patched.clear(); particleGeometry.dispose(); particleMaterial.dispose(); skyGeometry.dispose(); skyMaterial.dispose();
    },
  };
}

// Street furniture, not building geometry. Fixed cap, selected from actual road
// cells. Emissive bulbs and analytic ground pools avoid per-lamp shadow maps.
export function createStreetLamps(scene, roads) {
  const capacity = 160, poleGeometry = new THREE.BoxGeometry(.24, 7, .24), bulbGeometry = new THREE.BoxGeometry(.8, .22, .8);
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x454b4b, metalness: .8, roughness: .55 });
  const bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xe9d4a6, emissive: 0xffcf85, emissiveIntensity: 0 });
  const pole = new THREE.InstancedMesh(poleGeometry, poleMaterial, capacity), bulb = new THREE.InstancedMesh(bulbGeometry, bulbMaterial, capacity);
  const poolGeometry = new THREE.PlaneGeometry(13, 13); poolGeometry.rotateX(-Math.PI / 2);
  const poolMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { strength: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv; uniform float strength; void main(){float d=length(vUv-0.5)*2.0;gl_FragColor=vec4(vec3(1.0,0.67,0.28),pow(max(0.0,1.0-d),2.0)*strength);}' });
  const pools = new THREE.InstancedMesh(poolGeometry, poolMaterial, capacity);
  for (const mesh of [pole, bulb, pools]) { mesh.count = 0; mesh.frustumCulled = false; scene.add(mesh); }
  pole.castShadow = pole.receiveShadow = true;
  const matrix = new THREE.Matrix4(); let version = -1;
  return { pole, bulb, pools,
    update(night, force = false) {
      bulbMaterial.emissiveIntensity = night * 2.5; poolMaterial.uniforms.strength.value = night * .36;
      pools.visible = night > .01;
      if (!force && version === roads.version) return;
      let n = 0;
      for (const key of roads.cells) {
        const { x, z } = roads.cell(key);
        if ((x + z) % 6 || n === capacity) continue;
        const p = roads.center(x, z), offset = roads.lotSize * .42;
        pole.setMatrixAt(n, matrix.makeTranslation(p.x + offset, 3.5, p.z + offset));
        bulb.setMatrixAt(n, matrix.makeTranslation(p.x + offset, 7.05, p.z + offset));
        pools.setMatrixAt(n, matrix.makeTranslation(p.x + offset, .07, p.z + offset)); n++;
      }
      for (const mesh of [pole, bulb, pools]) { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; }
      version = roads.version;
    },
    dispose() { for (const mesh of [pole, bulb, pools]) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose(); } },
  };
}

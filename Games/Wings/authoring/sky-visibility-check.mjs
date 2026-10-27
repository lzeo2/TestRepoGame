// Actual source/TSL graphs + CPU geometry/optics. No GPU compilation or pixel claim.
// THREE_ROOT and ESBUILD_ROOT must point to existing approved tools. Installs nothing.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT, 'Set THREE_ROOT and ESBUILD_ROOT');
const root = resolve(process.env.THREE_ROOT);
const load = p => import(pathToFileURL(resolve(root, p)).href);
assert.equal(JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version, '0.186.0');
const THREE = await load('src/Three.WebGPU.js');
const TSL = THREE.TSL;
// Three.TSL.js imports the package build, which would split node identities from source builders.
const tslNames = [...(await readFile(resolve(root, 'src/Three.TSL.js'), 'utf8')).matchAll(/export const (\w+)/g)].map(m => m[1]);
const tslModule = 'data:text/javascript;base64,' + Buffer.from(
  `import { TSL } from ${JSON.stringify(pathToFileURL(resolve(root, 'src/Three.WebGPU.js')).href)};` +
  tslNames.map(name => `export const ${name}=TSL.${name};`).join('')
).toString('base64');
const { build } = await import(pathToFileURL(resolve(process.env.ESBUILD_ROOT, 'lib/main.js')).href);
const sourceRoot = new URL('../source/games/wings/', import.meta.url);
const result = await build({
  stdin: { contents: `export * from './src/render/world/cloud-volume.ts';
    export * from './src/render/world/sky.ts';
    export * from './src/render/world/atmosphere.ts';
    export * from './src/render/world/settings.ts';
    export * from './src/sim/time-of-day.ts';`, resolveDir: sourceRoot.pathname, loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'approved-existing-three', setup(b) {
    b.onResolve({ filter: /^three(?:\/|$)/ }, ({ path }) => {
      if (path === 'three/tsl') return { path: tslModule, external: true };
      const file = path === 'three' || path === 'three/webgpu' ? 'src/Three.WebGPU.js' : path.slice(6);
      return { path: pathToFileURL(resolve(root, file)).href, external: true };
    });
  } }],
});
const source = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const worldView = await readFile(new URL('src/render/world-view.ts', sourceRoot), 'utf8');
assert.equal([...worldView.matchAll(/createCloudLayers\(settings\.cloudLayers, settings\.oceanDetail >= 2 \? 5 : 4, renderer\.reversedDepthBuffer\)/g)].length, 2, 'Initial and quality-switch clouds must use the real renderer');
// Evaluate the actual proxy helper's constant TSL graph, not a copied shader equation.
function constant(node) {
  if (node.isVarNode) return constant(node.node);
  if (node.isConstNode) return typeof node.value === 'number' ? [node.value] : node.value.toArray();
  if (node.isJoinNode || node.nodes) return node.nodes.flatMap(constant);
  if (node.isSplitNode) {
    const value = constant(node.node);
    return [...node.components].map(c => value['xyzw'.indexOf(c)]);
  }
  throw Error('Unsupported constant graph node: ' + node.constructor.name);
}
const { Vector3, Vector4, PerspectiveCamera, Raycaster, Scene } = THREE;
let lost = 0, covered = 0;
for (const system of [THREE.WebGLCoordinateSystem, THREE.WebGPUCoordinateSystem]) {
  for (const reversed of [false, true]) for (const quality of ['balanced', 'high']) {
    const settings = source.WORLD_QUALITY[quality];
    const clouds = source.createCloudLayers(settings.cloudLayers, settings.oceanDetail >= 2 ? 5 : 4, reversed);
    const camera = new PerspectiveCamera(62, 900 / 617, .3, settings.far);
    camera.coordinateSystem = system; camera._reversedDepth = reversed; camera.updateProjectionMatrix();
    for (const height of [761, 1300, 2600]) {
      camera.position.set(4300, height, -2700); camera.updateMatrixWorld();
      clouds.update(camera.position); clouds.group.updateMatrixWorld(true);
      for (const mesh of clouds.group.children) {
        assert(mesh.material.vertexNode && !mesh.material.depthTest && !mesh.material.depthWrite);
        const bottom = mesh.position.y - 400, top = mesh.position.y + 400;
        for (const slope of [-.4, -.08, -.01, .01, .03, .08, .4]) {
          const ray = new Vector3(.1, slope, -1).normalize();
          const hits = new Raycaster(camera.position, ray).intersectObject(mesh, false);
          if (!hits.length) continue;
          const hit = hits[0];
          // Independent slab intersection: reject rays that cannot reach real density in range.
          const a = (bottom - height) / ray.y, b = (top - height) / ray.y;
          const entry = Math.max(0, Math.min(a, b));
          const exit = Math.min(source.CLOUD_RANGE, Math.max(a, b));
          if (exit <= entry) continue;
          const clip = new Vector4(...hit.point.toArray(), 1).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
          const fixed = constant(source.cloudProxyClip(TSL.vec4(...clip.toArray())));
          assert.deepEqual([fixed[0], fixed[1], fixed[3]], [clip.x, clip.y, clip.w]);
          assert(fixed[3] > 0 && fixed[2] >= 0 && fixed[2] <= fixed[3]);
          const low = system === THREE.WebGLCoordinateSystem && !reversed ? -clip.w : 0;
          if (clip.z < low || clip.z > clip.w) lost++;
          covered++;
        }
      }
    }
    clouds.dispose();
  }
}
assert(lost > 0, 'Fixture must reproduce real-medium rays lost to proxy clipping');
console.log(`PASS actual box/ray + actual TSL proxy equation: ${covered} covered rays, ${lost} previously clipped; XY/W unchanged`);
// Specific screenshot contract: 761 m camera, first layer [900,1700], 4 km target.
const boundary = Math.atan((1700 - 761) / source.WORLD_QUALITY.high.far) * 180 / Math.PI;
assert(Math.abs(boundary - 4.4743) < .001);
assert((900 - 761) / .03 < source.CLOUD_RANGE && (1700 - 761) / .03 > 12000);
console.log(`PASS 761 m clipping reproduction: medium starts at 4633.33 m but top proxy is 31300 m; old edge ${boundary.toFixed(4)} degrees`);
// Independent quadrature, using real source daylight densities and retained falloff uniform.
const falloff = source.STORM.fogFalloff.value;
function contrast(seconds, distance, fromY, toY) {
  const { fogBase, fogSea } = source.sampleTimeOfDay(seconds);
  let optical = 0;
  for (let i = 0; i < 16384; i++) {
    const h = fromY + (toY - fromY) * (i + .5) / 16384;
    optical += (fogBase + fogSea * Math.exp(-Math.max(h, 0) * falloff)) * distance / 16384;
  }
  return Math.exp(-optical);
}
for (const seconds of [0, 375]) {
  const rows = [3700, 4000, 4200].map(d => ({ distance: d, sea: +contrast(seconds, d, 761, 0).toFixed(6), level: +contrast(seconds, d, 761, 761).toFixed(6) }));
  console.log(`MEASURE source fog hour=${source.sampleTimeOfDay(seconds).hour}: ${JSON.stringify(rows)}`);
}
assert(contrast(0, 4000, 761, 0) > .47 && contrast(0, 4000, 761, 0) < .48);
assert(contrast(375, 4000, 761, 0) < .01);
const renderer = new THREE.WebGPURenderer({ forceWebGL: true, canvas: { width: 900, height: 617, addEventListener() {}, removeEventListener() {}, style: {} } });
// CPU builder context only: no adapter/device/backend initialization.
renderer.hasFeature = () => false;
renderer.backend.utils = { getTextureSampleData: () => ({ primarySamples: 1 }) };
// Exercise pinned PassNode.setup and backend format selectors, not copied assumptions.
const { default: WebGLTextureUtils } = await load('src/renderers/webgl-fallback/utils/WebGLTextureUtils.js');
const { getFormat: gpuFormat } = await load('src/renderers/webgpu/utils/WebGPUTextureUtils.js');
const gl = Object.fromEntries(['DEPTH_COMPONENT', 'UNSIGNED_INT', 'FLOAT', 'DEPTH_COMPONENT24', 'DEPTH_COMPONENT32F'].map((key, i) => [key, i + 1]));
const glTextures = new WebGLTextureUtils({ gl, extensions: { get() { throw Error('Unexpected extension lookup'); } } });
const glFormat = texture => glTextures.getInternalFormat(null, gl.DEPTH_COMPONENT, texture.type === THREE.FloatType ? gl.FLOAT : gl.UNSIGNED_INT, false, THREE.NoColorSpace);
assert.equal(TSL.viewportDepthTexture().value.type, THREE.UnsignedIntType, 'Pinned shared default reproduces reversed-Z mismatch');
const ownedTextures = new Set();
let graphs = 0, depthCopies = 0;
for (const reversed of [false, true]) {
  const low = source.createCloudLayers(0, 4, reversed);
  assert.equal(low.group.children.length, 0); low.dispose(); low.dispose();
}
for (const file of ['src/renderers/webgl-fallback/nodes/GLSLNodeBuilder.js', 'src/renderers/webgpu/nodes/WGSLNodeBuilder.js']) {
  const { default: Builder } = await load(file);
  for (const [reversed, logarithmic] of [[false, false], [true, false], [false, true]]) {
    Object.defineProperty(renderer, 'reversedDepthBuffer', { value: reversed, configurable: true });
    Object.defineProperty(renderer, 'logarithmicDepthBuffer', { value: logarithmic, configurable: true });
    const clouds = source.createCloudLayers(2, 5, renderer.reversedDepthBuffer), sky = source.createSky();
    const camera = new PerspectiveCamera(62, 900 / 617, .3, 12000), scene = new Scene();
    const scenePass = TSL.pass(scene, camera);
    scenePass.setup({ renderer });
    const sourceDepth = scenePass.renderTarget.depthTexture;
    assert.equal(sourceDepth.type, reversed ? THREE.FloatType : THREE.UnsignedIntType);
    const groupTextures = new Set(), targetCopies = new Set();
    let disposals = 0, copyDisposals = 0;
    for (const mesh of [...clouds.group.children, sky.mesh]) {
      const builder = new Builder(mesh, renderer); builder.camera = camera; builder.scene = scene; builder.build();
      assert(builder.vertexShader.length > 100 && builder.fragmentShader.length > 100);
      assert(!/\b(undefined|NaN)\b/.test(builder.vertexShader + builder.fragmentShader));
      if (mesh !== sky.mesh) {
        assert(builder.fragmentShader.includes('exp(') && builder.fragmentShader.includes('for ('));
        const copies = builder.updateBeforeNodes.filter(node => node.constructor.name === 'ViewportDepthTextureNode');
        assert.equal(copies.length, 1, 'Each cloud graph must retain native opaque-depth copying');
        const copy = copies[0], texture = copy.defaultFramebuffer;
        assert.equal(texture.format, sourceDepth.format);
        assert.equal(texture.type, sourceDepth.type);
        assert.equal(glFormat(texture), reversed ? gl.DEPTH_COMPONENT32F : gl.DEPTH_COMPONENT24);
        assert.equal(glFormat(texture), glFormat(sourceDepth));
        assert.equal(gpuFormat(texture), reversed ? 'depth32float' : 'depth24plus');
        assert.equal(gpuFormat(texture), gpuFormat(sourceDepth));
        // r186 clones per render-target reference. The real clone must inherit the chosen type.
        const targetCopy = copy.getTextureForReference(scenePass.renderTarget);
        assert.notEqual(targetCopy, texture);
        assert.equal(targetCopy.type, sourceDepth.type);
        assert.equal(targetCopy.format, sourceDepth.format);
        if (!targetCopies.has(targetCopy)) {
          targetCopies.add(targetCopy);
          targetCopy.addEventListener('dispose', () => copyDisposals++);
        }
        if (!groupTextures.has(texture)) {
          assert(!ownedTextures.has(texture), 'Quality/world recreation must not reuse an old texture');
          groupTextures.add(texture); ownedTextures.add(texture);
          texture.addEventListener('dispose', () => disposals++);
        }
        depthCopies++;
        // Ensure the real material graph consumes the tested helper, not an unused export.
        assert.match(builder.vertexShader, /vec4(?:<f32>)?\([^\n]*\.xy, 0\.0, [^\n]*\.w\s*\)/);
      }
      graphs++;
    }
    assert.equal(groupTextures.size, 1, 'Both layers must share only their own group depth texture');
    clouds.dispose(); clouds.dispose();
    assert.equal(disposals, 1, 'Own depth texture must dispose once');
    assert.equal(copyDisposals, targetCopies.size, 'All per-target viewport copies must dispose once');
    sky.dispose(); scenePass.dispose();
  }
}
console.log(`PASS ${graphs} actual GLSL/WGSL sky/cloud graphs: standard/reversed/log depth; native compilation/pixels UNPROVEN`);
console.log(`PASS ${depthCopies} actual viewport depth graphs match PassNode type/format and WebGL/WebGPU selectors; ${ownedTextures.size} isolated group textures and their target clones disposed once; Low has no meshes; both world callers wired`);

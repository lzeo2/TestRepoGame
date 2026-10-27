# Wings shadow helper

## Scope and inspected source

Only `src/render/realism-shadows.ts`, `shadow-realism-check.ts` and this manual
belong to this lane. Scene/world/daylight integration belongs to the parent.
No deployed bundle, aircraft geometry, aircraft-shadow helper, lighting direction,
color or intensity changed. No new game, assets, dependencies or network loads.
Main maintenance inventory's Wings entry hash matches current HEAD
`2d7f08aa3ca94c87da2921c7916bec48d28e13aa`; this nested source is not deployed.
Rights, native rendering and publication holds in the main Wings manual remain.

Inspected exact Three 0.186.0 `examples/jsm/csm/CSMShadowNode.js`,
`src/lights/LightShadow.js`, `src/nodes/lighting/ShadowBaseNode.js`,
`ShadowNode.js`, `ShadowFilterNode.js`, `AnalyticLightNode.js` and `LightsNode.js`.
The helper imports that real addon, not a replacement CSM implementation.

## Integration contract

```ts
const shadows = createRealismShadows(existingSun, quality)
// Renderer: shadowMap.type = PCFShadowMap; enabled = quality !== "low".
// Add existingSun to its existing parent before rendering. Do not add another sun.
// After camera projection/pose changes, before rendering:
shadows.update(camera)
// Before destroying the scene/renderer:
shadows.dispose()
```

Low disables sun shadow casting and allocates no cascades. Balanced uses two
1024-square maps; High uses three 2048-square maps. Both use practical splits
(lambda 0.5), maxFar 4000, faded cascade transitions and radius 1.5 native PCF.
Bias is -0.00015, normalBias 0.25 world units; upstream scales bias per cascade.
Shadow depth is 0.5..12000 with a 1000-unit caster margin. These are starting
settings requiring native visual acceptance, not a guarantee of acne-free pixels.
Receivers/casters must opt into receiveShadow/castShadow in their owning modules.

CSM lazily initializes from the renderer's camera and depth conventions. Its
updateBefore automatically positions and texel-snaps the cascade placeholders
on every render. update(camera) refreshes fitted bounds after projection changes
and supports replacing the scene camera after first initialization. Use one scene
camera per helper; thumbnails/multi-camera passes need separate lighting graphs.
Keep the sun and its target in the same untransformed parent coordinate space,
as upstream CSM uses their local positions. This helper never moves either.

**Quality rebuild requirement:** setQuality(q) returns false for a no-op, true
when configuration changes. Stop rendering first, then change quality and rebuild
the host's renderer lighting graph before the next render. Recreating the renderer
is the conservative public boundary. Three 0.186 AnalyticLightNode caches its
shadowColorNode, while LightsNode's light hash includes only id/castShadow for
directional lights, not the custom shadow node. Merely replacing shadowNode or
setting material.needsUpdate is not proven to invalidate those caches. Parent
must wire this lifecycle; live quality switching is not native-verified here.
Do not resume an old renderer holding the disposed graph. Low/High switching
also remains subject to the host's normal renderer.shadowMap.enabled handling.

The helper restores the exact original shadow object and castShadow on dispose,
including any owner resources. dispose is idempotent; setQuality after disposal
throws. Upstream CSM.dispose detaches cascade placeholders/targets but does not
explicitly dispose its child ShadowNodes. The small subclass disposes those
first, releasing their render targets/materials; this uses the pinned upstream
_shadowNodes field and must be reviewed on a Three upgrade.

## Softness and contact limits

Inspected native TSL exposes Basic, PCF and VSM filtering, not PCSS. PCFSoftShadowMap
is explicitly removed from ShadowNode's filter table. PCFShadowMap uses five
Vogel-disk samples rotated by interleaved gradient noise, with hardware comparison
filtering where supported. This is fixed-radius softened shadowing, **not variable
penumbra, contact hardening, PCSS or screen-space contact shadows**. No speculative
raw-depth shader was added without GPU compilation/visual proof.

Existing aircraft.ts enables the aircraft-shadow blob only on Low and adjusts it
for ground height, sun direction and altitude. That is an approximate height cue,
not geometric contact shadows. It is untouched; do not enable it on top of CSM
without reviewing double-darkening. Real close-contact detail and variable
penumbra remain unmet operator visual goals pending a separately tested filter.

## Bounds, cost and verification

No geometry or triangles added. Shadow passes redraw existing caster triangles,
so total submitted frame triangles/draws can increase despite unchanged geometry.
Balanced: 2,097,152 texels, estimated RGBA8 + depth32 payload 16,777,216 bytes.
High: 12,582,912 texels, estimated payload 100,663,296 bytes. These exclude driver
alignment, cached pipelines/materials and backend allocations, not measured GPU
memory. Low adds zero map texels. FPS and native GPU memory are unmeasured.

The Node regression bundles actual Three, initializes actual CSM frustums/fade
nodes and actual ShadowNode render targets with no GPU. It checks practical
splits, finite fitted XY/depth bounds, resize, camera movement, both coordinate
systems and reversed depth, no extra DirectionalLight, map dimensions, seven
render-target disposal events across quality changes, no orphan placeholders,
restoration and double-disposal. This is graph/resource evidence, not shader
compilation, softness/contact visual approval, integrated scene or FPS acceptance.

Run from the nested source root with THREE_ROOT pointing at the existing exact
Three package and ESBUILD_ROOT at existing esbuild 0.28.2. No installs/output files:

```sh
node <<'NODE'
const { build } = require(process.env.ESBUILD_ROOT)
const root = process.env.THREE_ROOT
build({ entryPoints: ['games/wings/shadow-realism-check.ts'], bundle: true,
  platform: 'node', format: 'cjs', write: false,
  plugins: [{ name: 'exact-three', setup(b) {
    b.onResolve({ filter: /^three(?:\/.*)?$/ }, ({ path: p }) => ({ path:
      p === 'three/webgpu' ? root + '/build/three.webgpu.js' :
      p === 'three/tsl' ? root + '/build/three.tsl.js' :
      p.startsWith('three/addons/') ? root + '/examples/jsm/' + p.slice(13) :
      root + '/build/three.module.js' }))
  }}]
}).then(r => {
  const M = require('module'), m = new M(process.cwd() + '/shadow-check.cjs', module)
  m.filename = process.cwd() + '/shadow-check.cjs'; m.paths = module.paths
  m._compile(r.outputFiles[0].text, m.filename)
}).catch(e => { console.error(e); process.exitCode = 1 })
NODE
```

Actual result: `pass: true`, `graphCases: 3`, `disposedTargets: 7`,
`trianglesAdded: 0`; source bytes: helper 3196, regression 6020.
The first fixture attempt failed on assigning Camera.reversedDepth (read-only).
The corrected fixture sets the same _reversedDepth field used by the renderer;
all three subsequent graph cases passed. No browser/GPU run or push performed.
Main maintenance checker was attempted and blocked by pre-existing unrelated
uncommitted Games changes: `Commit inspected source changes before validating
its inventory.` This lane did not alter those paths or refresh the main inventory.

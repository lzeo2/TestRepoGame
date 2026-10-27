# Wings cloud volumes

## Scope and integration

Replaces only the optional flat cloud decks, preserving createCloudLayers(count,
octaves), group/update/dispose and the sky.ts export used by world-view.ts.
Low remains empty; Balanced uses one volume; High uses two. Sky dome, water's
sky approximation and deterministic createLightning from 214b7c8 remain unchanged.
No assets, dependencies, network loads, deployed output or catalog changes.
Main inventory identifies existing Wings as 232; this isolated source is not the
deployed Games/Wings tree. Main manual's rights and native rendering holds remain.
Parent owns main manual/inventory updates and integration acceptance.

Volumes span 900..1700 and 1750..2550 world units. Each camera-following box is
32 km square; density fades radially between 10 and 14 km. Density uses two
scales of continuous 3D value noise (interpolated lattice slices), a vertical
profile and wind advection. Back faces supply rays, not cloud surfaces.
Midpoint quadrature integrates density and Beer-Lambert transmittance in world
space, including when inside the layer. Each occupied step estimates sunlight
extinction and forward scattering (Henyey-Greenstein g=0.55). Shared STORM flash
illuminates clouds. Optional STORM.sunDirection/daylight nodes are consumed when
present before graph creation; otherwise the existing storm break direction is
used. Parent must recreate materials if adding these nodes later.

## Depth API review

Inspected exact Three 0.186.0 ViewportDepthTextureNode, ViewportTextureNode and
ViewportDepthNode. viewportDepthTexture copies current framebuffer depth before
the transparent pass; it is not the proxy's back-face depth. Transparent cloud
materials do not write depth. Native perspectiveDepthToViewZ selects reversed
depth from renderer.reversedDepthBuffer. Logarithmic depth instead needs
logarithmicDepthToViewZ, selected only when logarithmic depth is enabled without
reversed depth. The result is negative view Z, negated then divided by the ray's
view-space forward cosine to obtain ray distance. Exit is clipped against that
opaque distance, box exit and 14 km; entry clamps to zero for an inside camera.
Signed epsilon bounds division on axis-parallel rays. Requires the existing
perspective camera and an opaque depth buffer; orthographic cameras are not
supported. Depth copy/backend behavior remains GPU-unverified.

## Budgets and remaining limits

| Quality | Layers | View steps/layer | Light steps/occupied sample | Proxy triangles | Draws |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low | 0 | 0 | 0 | 0 | 0 |
| Balanced | 1 | 16 | 2 | 12 | 1 |
| High | 2 | 28 | 3 | 24 | 2 |

Old cloud-only triangles were 0/2/4. Worst-case density evaluations per covered
pixel are 48 Balanced, 224 High (including light samples across both layers).
Each density evaluation uses four 2D value-noise evaluations. View marching exits
below 1% transmittance. Sun marching is capped at 1.2 km. No textures/render
targets allocated by this helper; Three owns the shared viewport depth texture
and framebuffer-copy cost. Resource disposal is checked for geometry/materials.

Two-layer transparent ordering is fixed for the usual below-cloud camera and
approximate when above/between layers. No multiple scattering, cloud shadows on
terrain, temporal reconstruction, weather simulation or cross-layer sun shadows.
Coarse marching can band, especially near the horizon. GPU memory, frame time,
FPS, visual quality, shader compilation and native rendering are unmeasured.
No browser was launched; the reserved QA slot was not used.

## Node regression

Run from the nested source root. Set THREE_ROOT to the existing exact 0.186.0
package and ESBUILD_ROOT to the existing approved esbuild module. No install or
output files. Source entry points are essential: mixing bundled Three with the
source-only GLSLNodeBuilder produces separate TSL state and fails with null If.

```sh
node <<'NODE'
const { build } = require(process.env.ESBUILD_ROOT)
const root = process.env.THREE_ROOT
build({ entryPoints: ['games/wings/cloud-realism-check.ts'], bundle: true,
  platform: 'node', format: 'cjs', write: false,
  plugins: [{ name: 'exact-three', setup(b) {
    b.onResolve({ filter: /^three(?:\/.*)?$/ }, ({ path: p }) => ({ path:
      p === 'three/webgpu' ? root + '/src/Three.WebGPU.js' :
      p === 'three/tsl' ? root + '/src/Three.TSL.js' :
      p.startsWith('three/src/') ? root + '/' + p.slice(6) :
      root + '/src/Three.js' }))
  }}]
}).then(r => {
  const M = require('module'), m = new M(process.cwd() + '/cloud-check.cjs', module)
  m.filename = process.cwd() + '/cloud-check.cjs'; m.paths = module.paths
  m._compile(r.outputFiles[0].text, m.filename)
}).catch(e => { console.error(e); process.exitCode = 1 })
NODE
```

The regression builds actual Three GLSL node graphs for Balanced and High under
standard, reversed and logarithmic depth: six cases, nine material graphs. It
checks finite shader source, loops/extinction, quality budgets, camera tracking,
resource disposal, depth-equation round trips, opaque ray clipping, homogeneous
optical conservation, forward scattering and retained lightning API behavior.
Graph generation is not shader compilation or a GPU draw. Initial fixture failed
because bundled/source Three had separate TSL state; source-only resolution fixed
it. Final output: pass true, triangles 0/12/24, six graph cases; generated fragment
sources range 11820..11831 characters. Optical math passed; FPS unmeasured.
Bundled JavaScript syntax passed. Main maintenance checker was attempted and
blocked by existing unrelated main-tree changes: `Commit inspected source
changes before validating its inventory.` No main-tree files were changed.

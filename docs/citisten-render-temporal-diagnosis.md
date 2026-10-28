# Citisten renderer temporal diagnosis, lane 60

## Result

**No distinct deterministic renderer-order/identity defect reproduced. Entire-world
shaking remains UNRESOLVED. Weird visual artifacts independently remain UNRESOLVED.**
This negative CPU evidence does not contradict either user observation. The original
complaint's build is unknown; the user intends to check the current website. The old
private v2 is unchanged. The conditional key-release repair does not establish that
either complaint is resolved.

No runtime edit or proposed product fix. In particular, no shadow snapping, bias,
LOD, AA, DPR, lighting or animation patch. Lane 55 already quantified coplanar-depth
precision and fractional unsnapped shadow-follow sensitivity without pixel/root-cause
proof. Those are not new findings here; this check does not rerun or rename them.

## Identity, scope and source pin

- Sole agent `openai-codex/gpt-6-astra`, thinking `high`, confirmed by session header;
  no subagents or advisor calls. Session `01a184a5-99b2-76e3-8dad-67fa5ff779b6`.
- Log basename: `2026-10-28T22-33-27-734Z_01a184a5-99b2-76e3-8dad-67fa5ff779b6.jsonl`.
  First command 2026-10-28 22:33:33 UTC; hard deadline 22:43:27 UTC from session start.
  Final check receipt collected at 22:36:56; commit/finish reported in handoff.
- Baseline HEAD `9d959b73533d61b7f3a80ddea50db37ff7dbfd46`;
  game tree `ff06ce5f68cbf300d93fd55c5a8396ed563d3cd4`, 228 files,
  35,188,315 bytes, agreeing with the canonical inventory. All 228 working files
  were independently hashed against Git index blobs without writing objects.
- Brief supplies exact publication via `017e4a47`/`da16004a` and documentation
  `d3dbb39e`, with live 233/233 source-plus-font hashes and 80 MIME checks. This
  lane did not make HTTP requests or repeat that publication proof. The 233-source
  freeze includes five fonts in addition to the 228-file game tree.
- Owned changes only: `scripts/citisten_render_temporal_check.mjs` and this receipt.
  Parent retains runtime/native/contracts/manual/checkpoint; sibling Sol owns the
  separate visual-clock check/receipt. Its untracked script appeared during this run
  and was neither read nor staged. No source files, existing diagnostics or saves
  were changed. No new runtime freeze is needed for these diagnostic-only files.

Read AGENTS, CODE_QUALITY, maintenance README, complete current 1,099-line manual,
inventory row, prior world/camera diagnoses and motion integration. Inspected the
actual world/camera/daynight/materials/external-materials/atmosphere paths, native
caller, building instance owners and vendored matrix/shadow/material/render-list
paths. Hivemind filesystem was unavailable; repository evidence was available.

## Actual order and inspected hypotheses

All source pointers below are under `Games/Citisten3D/` at the pin above.

1. **Frame ownership/order:** `native.mjs:110-137` updates simulation, drains shots,
   synchronizes models/operational tint and city events, approaches visual phase and
   selects weather before `world.render`. `world.mjs:126-143` resizes projection only
   on client-size change, then calls controls, roads, light follow, buildings, lamps,
   atmosphere, AO and terrain before renderer; shot expiry follows renderer. The
   diagnostic executes that exact render function with call-recording dependencies.
   `camera.mjs:91-108` writes position/rotation during controls.update, before follow.

2. **Shadow projection caching:** `daynight.mjs:88-98` updates both orthographic
   projection matrices on EVERY follow call, including inactive lights. Vendored
   `three.module.js:9263-9342` additionally refreshes on map allocation, then calls
   shadow.updateMatrices. `three.core.js:46438-46511` reads current light/target world
   positions and composes projection times view; DirectionalLightShadow at 47835
   inherits this method. No stale projection reproduced at radius 75, 193.5 or 360.

3. **Target order and active/inactive transitions:** targets are scene children
   (`daynight.mjs:29-34`); follow changes both target and light positions. The actual
   renderer updates the scene and unparented camera at `three.module.js:17700-17704`,
   before shadow rendering at 17774. Day/night disposes and nulls inactive maps
   (`daynight.mjs:67-75`). Actual vendor shadow-map execution recreated active maps
   and produced the same matrix on return to the same state after an inactive phase.
   No previous-frame target or activation-history matrix error was found.

4. **Environment/shader identity:** day/night allocates one DataTexture, changes
   environmentIntensity and light state without replacing its image. Vendor PMREM
   lookup (`three.module.js:3915-3984`) caches that non-render-target texture by
   identity; actual PMREM generation is NOT executed here. Scene environmentIntensity
   is assigned before uniform upload at 18773-18830; Standard's material intensity
   override at 15404 applies only to an explicit material.envMap. Atmosphere patches
   each material once, chains its prior hook and shares live uniform objects
   (`atmosphere.mjs:16-54,112-135`). The executed masonry-plus-fog hook retained
   identity/cache key/version through 16 phase updates; its uniform values stayed
   current. Shader strings were assembled, not compiled or rasterized.

5. **Instance counts/identity:** external-building allocation writes all live handles
   before return (`external-buildings.mjs:145-159`); removal compacts the last handle
   and sets active counts/visibility at 228-236. Static identical poses early-return;
   mobile rigs update before render at 238-255. City supplements follow the same
   upload/active-count sequence (`city-render.mjs:97-115,168-177`). This is inspection,
   not a new real-GLB allocation/swap test. The executed city-event clear/refill case
   (`city-event-effects.mjs:30-97`) retained exact active instance bytes and hid zero
   counts; it does not cover every pool or GPU upload hazard.

6. **Transparency/depth:** direct read-only parsing of 18 local LOD0 `model.glb` JSON
   chunks found **132 OPAQUE material definitions, zero BLEND/MASK**. No texture
   pixels were decoded. `external-materials.mjs:33-77` clones sampler/UV state rather
   than sharing mutable texture objects; terrain and asphalt retain existing polygon
   offsets. Grid, weather particles, lamp pools and flood effects use depthWrite=false
   (`world.mjs:79-80`, `atmosphere.mjs:65,157`, `city-event-effects.mjs:21-22`).
   Vendor transparent lists sort object-level entries (`three.module.js:8078,
   8167-8220`), not individual instances/triangles. This leaves blending/occlusion and
   precision limitations, but no deterministic temporal artifact was demonstrated.
   Opaque source metadata is not proof of correct depth pixels or artifact-free art.

7. **Post-render FX scope:** `world-effects.mjs:29-38` expires only the 64-shot line
   and impact buffers. A shot is submitted before expiry for that frame. The actual
   function changes those buffers at dt .25 but leaves all scene/camera matrices
   untouched. It is not a full-screen effect, camera feedback path or demonstrated
   whole-world motion cause. No expiry-order patch is justified by this observation.

## Executable evidence and limits

```sh
node --check scripts/citisten_render_temporal_check.mjs
node scripts/citisten_render_temporal_check.mjs
```

Uses real local Three Matrix/Scene/Camera/Light/RenderTarget classes and actual
application daynight, atmosphere, surface, city-event and shot modules. Reuses the
existing diagnostics' bounded VM source-function technique. The unmodified vendored
WebGLShadowMap function executes in memory with no-op GL-state/clear/draw endpoints;
its render-target objects are real CPU objects. The two actual renderer matrix-update
statements also execute. There is no WebGLRenderer construction, pixel decoding,
image double, GL context, browser, DOM input, RAF or native simulation in this test.
VSM shader strings are empty explicit doubles; only the shipped PCF branch runs.
The world call-order case uses dependency doubles, not an actual loaded world.

Eight cases pass:

- Actual world render call order.
- 21 phase/pose shadow frames: phases .5/.25/0/.75/.5/0/.5, each at camera
  `(0,215,180)`, `(40,80,-50)`, `(-90,400,75)`; independently rebuilt orthographic
  camera/projection/view oracle, maximum absolute shadow matrix error **0**.
- Four additional frames: unchanged map reuse, inactive disposal, active recreation,
  and exact same-state matrix equality independent of history. **25 frames total.**
- Deliberately injected stale target matrix changes the result; restoration returns
  exactly to baseline. This is a sensitivity control, NOT a reproduced product bug,
  causal old-red/fixed-green pair or proposed source change.
- Environment identity/version/bytes unchanged across those transitions.
- Fog/surface hook and shared-uniform behavior across 16 phase updates.
- Three active flame instances clear/refill with exact matrix bytes and visibility.
- Post-render shot expiry changes only its buffers, not scene/camera matrices.

Actual final output:

```text
RENDER TEMPORAL PASS: 8 cases; 25 shadow frames; max matrix error 0; no reproduced product defect, no pixels
```

Initial run stopped with `TypeError: Cannot read properties of undefined (reading
'observed')`: the fixture assumed render targets had userData. Replacing that
fixture-only bookkeeping with a WeakSet fixed it. No application assertion was
weakened. Two subsequent runs passed, the final with camera height 400 matching
its normal clamp. This failure is not expected product-red evidence.

Syntax, targeted execution, catalog, preservation and diff guards passed. Catalog
output: `CATALOG PASS: 129 entries, schema, unique integer IDs, Git URLs`.
Preservation output: `PRESERVATION PASS: 228 current game files match Git; inventory
tree ff06ce5f68cbf300d93fd55c5a8396ed563d3cd4`.
Maintenance checker exited 1 solely with `Missing docs/maintenance/games/001-brainrotboulevard.md`;
no manual fabrication, refresh, bypass or acceptance claim. The unchanged whole-world
suite was not rerun: this narrower check changes the condition by executing actual
vendor shadow allocation/transition code rather than only LightShadow.updateMatrices.

## Handoff and preservation

GPU precision, shader compilation, texture sampling, blending, real draw delivery,
compositor behavior and actual user-device visuals remain unproven. No native
Water/Save/Continue, supported-device/FPS, screenshot or visual acceptance. Existing
Windows/Chromebook approval tickets and failed GPU receipts retain their status;
this lane neither supersedes them nor launches their failed configurations.

Await the user's website screenshot/clip and paused-versus-unpaused, hands-off
comparison, ideally noting whether silhouettes move against the HUD or only surface
shading changes. This is missing discriminating evidence, not an approval blocker.
Use the existing memory-only motion recorder unchanged; its sampled matrices cannot
clear visible artifacts when stable. Parent integrates this qualified negative
finding with the separately owned visual-clock diagnosis and manual.

All game assets/vendor notices/model bytes match Git. Saves, prior evidence,
diagnostics, private v2 and sparse selection were untouched. No downloads, installs,
exports, remote execution, server, browser, source copies on disk, full-fleet run,
game addition or push. Catalog remains 129; zero ingested or self-made additions.

Initial root free space **2,423,308,288 bytes**, before script growth
**2,422,419,456**, before receipt/commit **2,416,947,200**; all above the
2,147,483,648-byte floor, no waiver. Owned text is below 1 MB; shared-host disk
changes are not attributable solely to this lane. Final bytes/commit/time accompany
the handoff. Only the two owned new paths may be staged.

# Foldwild world-first renderer milestone

Scope: presentation changes in `Games/Foldwild/view.js`, plus the standalone
native browser regression `scripts/test_foldwild_view_v2.py`. No catalog,
registration, game logic, optional horror model or original asset bytes changed.
Actual worker provider/model: `openai-codex` / `gpt-6.1-sol`.

## Retained and added contract

All existing `createView` methods remain. The core still owns movement, encounters,
rewards and the only animation clock. `render(dt)` consumes elapsed seconds;
zero elapsed time pauses action motion. No renderer RAF, storage or simulation.

New methods: `setAppearance`, `setQuality('low'|'standard')`,
`orbitCamera(deltaRadians)`, `recenterCamera`, `getCameraYaw`. Body rotation keeps
the existing `angle + Math.PI` orientation and does not drag camera yaw.
Appearance accepts six-digit RGB `skin`, `coat`, `hair`, `pack` or the matching
`skinTone`, `coatColor`, `hairColor`, `backpackColor` aliases, plus the actual
world adapter's `backpack` and `hair` style IDs (short/cropped/long/none).

The renderer consumes the actual `REGION_LAYOUTS` export: two-triangle 160 m
ground, path polylines, house/roof colors, flat river, individual bridge boards
and rails, groves, rocks and landmarks. Repeated scenery shares four instanced
batches. Nearby NPCs share six part batches, with role-specific coats and skin
variation, while the player has a separate folded coat/head/hair/legs/backpack.
NPC idle motion changes the presentation matrices, not the supplied x/z points.

World input admits the documented POI types within +/-80 m. Visible actors are
chosen within 40 m for wild creatures and 32 m for NPCs: at most four wild
creatures/four NPCs on low and six/eight on
standard. Distant source props remain low-poly instanced scenery, with frustum
culling and distance fog. No floating pads remain. Marker taps only call the
existing `onCheckpoint`; they do not teleport or bypass core action guards.
Mouse drag/right-drag and two-finger drag orbit; a moved gesture cannot also tap.
Major house camera avoidance uses the authored collision rectangles.

Local GLBs retain source geometry/material RGB and are normalized to a 1.45 m
world extent or 2.4 m battle extent. Separate cosmetic shapes use size/family
anchors; this is not an all-80 clipping/fit certification. The original appearance
remains the default. Battle actors face each other, lunge/recoil as whole static
models, and use an original folded kite sheet on a curved flight. Optional
`animateAction.result` distinguishes a supplied miss/failed/lost result; the view
never rolls an outcome or changes battle state.

Low forces WebGL1, antialias off, DPR1, maximum 960 x 540. Standard is capped at
1280 x 720. Core frame pacing is unchanged by the view. No postprocessing,
shadows, remote loads or procedural texture assets were added.

## Resource handling

The 12-entry LRU shares source geometry/materials between clones, retaining
references until their active presentation slots close. Scene generations and
per-slot closure checks stop old requests attaching to new scenes. Evicted or
disposed pending requests dispose their resources when they finish. Instanced
buffers, shared authored geometry/materials and input listeners are disposed.
`inspect()` retains original fields and adds quality/yaw/cache/model counts,
actual renderer draw/triangle counts and read-only position/resource diagnostics.

## Runnable verification

```sh
node --experimental-default-type=module --check Games/Foldwild/view.js
xvfb-run python3 scripts/test_foldwild_view_v2.py
git diff --check -- Games/Foldwild/view.js scripts/test_foldwild_view_v2.py docs/foldwild-view-v2.md
```

The test uses the actual local renderer, region module, world adapter and source
models on a bounded native server at port 8794, always shut down in `finally`.
It rejects missing merchant ABI, model fallbacks, browser/request errors,
non-local requests and a 60-draw/60k-triangle overrun. It checks tap/orbit,
independent yaw/recenter, quality resize, actual lunge/kite motion, paused dt,
reduced motion, 40 asynchronous world/battle replacements, warm cache resource
stability, mobile two-finger orbit, and disposal during a pending real load.
Three JPEGs are collected in the test's temporary output directory, each capped
at 300 KB: desktop world, desktop battle, mobile world. Main owns subjective
visual acceptance; these isolated renderer captures are not full-game/UI proof.

Integration result and actual counts are recorded below after the sibling world
adapter supplies the approved POIs. Initial full-native command exited 1 with
`world adapter has not supplied the approved region ABI`; this was not a pass.
A separately labeled temporary presentation fixture used the actual region
static POIs plus current legacy wild points to exercise rendering while waiting.
The latest labeled fixture command exited 0 with world 19 draws/6,217 triangles,
battle 7 draws/1,446 triangles, 12 cached entries/18 warm geometries/zero textures
after 40 replacements, and zero browser/HTTP/external-request errors. Its three
JPEGs total 81,845 bytes on the initial run; subsequent captures overwrite them.
`node --experimental-default-type=module --check Games/Foldwild/view.js` and
explicit-path `git diff --check` both exited 0. Python AST parsing printed
`PASS: Python syntax`.

After the sibling adapter arrived, the unmodified committed native test ran
against its actual merchant/NPC/wild POIs and exited 0. The first adapter run
exposed the third authored wild site just outside the original 32 m visual
radius; the renderer now admits wild actors within 40 m while retaining the
four/six actor caps. Appearance now consumes the adapter's actual hairstyle and
backpack fields. Final actual counts: world 19 draws/6,449 triangles, battle
7 draws/1,446 triangles, 40 scene races, stable 12-entry cache/18 geometries/zero
textures. All browser, HTTP, failed-request and external-request arrays were
empty. Final three screenshots total 82,137 bytes; reported run storage delta
was 8,192 bytes. Output ended:
`PASS: native desktop/mobile WebGL1 view, camera, actual models, action motion, 40 races, LRU and disposal`.
This is renderer/adapter proof, not complete game core or hardware acceptance.

Held: complete campaign, all-80 cosmetic fit, ledger viewer, appearance UI wiring,
class/gameplay wiring, horror/frontier work, full catalog release gate, and actual
N100 Chromebook FPS acceptance. No performance certification, registration or
push is claimed.

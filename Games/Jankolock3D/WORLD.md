# Jankolock 3D world milestone

Standalone, unregistered world/traversal viewer: `world.html`. This is an
operator-authorized original rebuild, not an ingested game or a finished MOBA.
No catalog change, gameplay HUD, hero work, push or publication is included.

## Source and provenance

All district geometry, map coordinates, materials, labels and traversal code are
original authored primitives. No reference-game art, map mesh, audio, code or
text was imported. The office-supply names are original parody labels. The
operator supplied the three-lane, lane-chain and traversal mechanics brief.
Reference wiki URLs identify mechanics only, not a redistribution permission:

- https://deadlock.wiki/Mechanics
- https://deadlock.wiki/The_Cursed_Apple
- https://deadlock.wiki/Zipline
- https://deadlock.wiki/Teleporters
- https://deadlock.wiki/Movement

The world builder did not independently revalidate the wiki's current contents;
coordinates and dimensions here are an original approximation, not a measured
reconstruction. No external reference is fetched by the runtime.

Vendored three.js **0.186.0 / r186**, upstream
https://github.com/mrdoob/three.js/tree/r186, is MIT-licensed by the three.js
authors. `vendor/LICENSE` is intact. The two modules and license match the
operator-provided staging package byte-for-byte, with no local modifications:

| File | SHA-256 |
| --- | --- |
| three.core.js | 9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6 |
| three.module.js | 9052042d676cb0fdc1ddfefe193053f34b7ac0513a616fdac4535d49987812ea |
| LICENSE | 8b378ebe60e2fe500158cb0ac71cb5e8b7d92953c2abcc63a0eb90499653b5bc |

Atkinson Hyperlegible and Bungee load from the existing shared local font
folders, with system fallbacks and their existing OFL notices. The optional
crate bell uses original WebAudio oscillators, starts only after Sound is
selected and does not load audio assets.

## Files and integration API

- `world-data.mjs`: `createWorldData()` returns a deeply frozen version-1
  descriptor, metre units, y-up, feet positions, 900x900 footprint. `LANES`,
  `TEAM_COLORS`, `WALK_SPEED=8`, `ZIP_SPEED=24`, `LIMIT=448`, `rampHeight()` and
  `terrainHeight()` are exported. `spawns` has 42 IDs with `team`, `lane`,
  `type` and `position`: seven structures per team per lane. Station endpoints
  are 770 metres apart. `docs/jank3d-spawns.json` exports the entire descriptor,
  not only the spawn array; the regression checks exact equality.
- `traversal.mjs`: `createTraveler(world)` creates caller-owned mutable traversal
  state. `stepTraveler(world,state,input,dt)` consumes yaw/pitch, forward/side/up,
  jump and interact intents; it caps each step at 0.05 seconds. `interact()` and
  `interaction()` implement nearby station/crate/portal/vent/rope actions.
  `moveCapsule()`, `capsuleIntersects()`, `surfaceHeight()` and `BODY` expose the
  same collision geometry for integrations. `capsuleIntersects()` accepts either
  an AABB or a ramp descriptor; ramps collide as the rendered rotated 0.2m slabs.
  `travelerSnapshot()` returns a
  frozen primitive-only observation. Sets of collected/broken IDs belong to
  the caller, not a global game economy.
- `world-scene.mjs`: `createWorldScene(canvas,world)` returns `render`, `resize`,
  `sync`, `diagnostics` and idempotent `dispose`. Static primitives are instanced;
  crate meshes remain individually hideable. No renderer is shared with a hero
  or gameplay system. The viewer camera is first-person/spectator, not the
  later third-person gameplay camera.
- `viewer.mjs`: native keyboard, drag and touch intents; optional bounded orbit
  flythrough; one RAF; blur/hidden input clearing; pagehide and context-loss
  teardown. The viewer substeps slow frames, caps elapsed catch-up at 0.25s,
  and does not guarantee real-time travel speed on a software renderer.
  `window.jank3dWorldSnapshot()` is read-only diagnostics. No state/time grants.

The scene includes 12-28m offices, roof access ramps and some roof links, three
color-coded lanes, structure markers, paired stamp teleporters, two roof vents,
Staple Tower rope and soul crate, two supply camps with breakable crates and
cover, a below-street sewer/Mid-Boss marker and a stamina-draining plaza. These
are geometry/traversal fixtures, not combat, AI, boss or economy systems. The
skybox is an enclosing 2200m BoxGeometry with six inward-facing, uniformly
solid-color faces, plus separate sun and clouds. No gradient or runtime asset
is used. Guardian approaches use slopes, not individual stair-step geometry.
Staple Tower renders directly from its two leg AABBs and top AABB; the opening
is walkable and the roof/rope route remains available.

## Controls

WASD moves; arrow keys or pointer drag looks; Space jumps; E interacts. Walk off
enables non-colliding spectator movement; Space/Shift changes spectator height.
Flythrough restores its saved position and heading when switched off. Touch
controls provide movement, look, jump and interaction. The shell uses the same
flat dark panels in both browser color schemes; the light capture is a media
compatibility check, not a claim of a separate light palette.

## Mockup lineage

Exactly **two** codex-imagen attempts produced
`docs/jank3d-design/ui-mockup-world-imagen.png` and
`docs/jank3d-design/ui-mockup-world-flat.png`. Originals are preserved. The second
still contained unwanted panel texture. `world-mockup.py` deterministically
posterizes its lettering and reconstructs flat panel masks at the AI design's
coordinates. It writes `ui-mockup-world-normalized.png` before further UI work.
This is a transformed AI layout, not a runtime capture or a third imagegen
attempt. It uses six exact colors, no gradients/shadows/glow, 4px corners,
#25292b panels, #f1eee5 body, #e6bd4a as the only UI accent, black/white buttons
and a pale-blue world-canvas placeholder. Pixel lettering is deliberately
posterized; runtime uses the local fonts instead. Reviewer fidelity approval
is separate. The older `ui-mockup-world-controls.png` HTML design is superseded,
left untracked and excluded from this commit.

## Repeatable verification and limits

```sh
python3 -B Games/Jankolock3D/world-mockup.py
node Games/Jankolock3D/world-test.mjs
# From the repository root, with no other browser gate active:
TMPDIR=/dev/shm timeout 180s python3 -B Games/Jankolock3D/world-qa.py
TMPDIR=/dev/shm timeout 420s python3 -B Games/Jankolock3D/world-qa.py --native
```

`world-test`: **491 assertions passed**, including all roofs, each lane's
end-to-end walking fixture, full outbound zip plus reverse/detach, ramps,
teleports, both vents, tower/crate/bell event, crate collision removal, sewer,
plaza drain, bridge underside and JSON equality. These are module fixtures,
not native-browser acceptance. All authored modules and both vendor modules
passed `node --check`. Vendor cache byte equality was checked. Authored diff
whitespace checks pass; the complete staged diff reports one unchanged upstream
warning at `vendor/three.core.js:49957` (`space before tab in indent`). The vendor
was not reformatted so its original bytes and provenance remain verifiable.

`world-qa.py` pins system Chromium, blocks nonlocal requests, checks response
statuses, console/page/request errors, image variance and mobile overflow/44px
buttons, then stops its temporary server in `finally`. Foldwild is served
read-only from Git when sparse; `world-foldwild-reference.png` genuinely shows
its existing start screen, not gameplay. Evidence uses software WebGL, never
supported-hardware acceptance. The comparison labels the transformed AI
mockup separately from the native runtime. Mobile evidence is an actual
390x720 viewport padded to 1280x720, not a 1280px mobile layout.

Fresh UI-only QA completed with **7 captures, 0 recorded errors**, all 29
responses HTTP 200, no 390px overflow and all 13 visible buttons at least 44px.
`world-ui-evidence.json` preserves this result separately. The aerial capture
shows the three lane corridors but fog obscures distant detail; it does not
prove collision or rideability. Dark/light mobile captures use the same panel
palette. The labeled comparison is 2560x752; runtime desktop captures are
1280x720. The genuine Foldwild reference shows its start screen only.

The pre-resume 420-second native process ended without a final report or
recoverable exit status; its three flushed capture observations are preserved
in `world-interrupted-native.jsonl`. It is not a passing native run. A fresh
210-second native retry follows the successful UI gate, without overlapping
browsers. Fresh all-lane acceptance remains **HOLD** until a report proves all
three complete rides and grounded arrival walks. A Graft in-flight capture
alone does not prove arrival or other lanes. `world-evidence.json` is the
latest run, while `world-native-evidence.json` and `world-ui-evidence.json`
separate native and UI results. A screenshot inventory does not self-grade A
or I; a separate reviewer must inspect them. Hardware, full-fleet, gameplay,
combat/economy and publication gates are outside this world milestone.

`python3 -B scripts/check_maintenance_docs.py` was run and failed with
`AssertionError: Inventory stale: inspect changes, then run --refresh.` The
orchestrator owns maintenance inventory/manual reconciliation; those files
were not edited by the world worker.

### Corrective collision and skybox follow-up

The reviewer side-entry probe exposed height-only ramp support without slab
volume collision. Shared `capsuleIntersects()` now transforms the capsule
segment into the rendered slab's local coordinates and minimizes segment/box
distance. `moveCapsule()` rejects lateral entry, retains low-edge/top stepping,
and `stepTraveler()` resolves upward slab contact. Slabs remain passable below
when there is headroom; no ramp geometry was removed. Regressions cover the
exact 25-step reviewer probe, both ramp axes and slope signs, jumping undersides,
underpasses, and walking through the staple opening. All original 468 assertions,
including every roof and complete lane routes, remain intact.

The old reviewer probe reached x=-387 at feet y=0 inside the slab; the fix stops
at x=-383.4 outside it. A jumping underside fixture previously reached head
height 7.3m through a 7m ramp; the fixed peak is 6.709m. Tower collision now uses
`staple-tower-west`, `staple-tower-east`, and `staple-tower-top` instead of the old
`staple-tower` box. Signatures, spawn/station coordinates and descriptor version
are unchanged. JSON was re-exported with `world-test.mjs --json` and checked for
exact descriptor equality. The historical WORLD-REVIEW.md is unchanged.

These are module regressions, not native acceptance. No browser or new capture
was run for this correction. Native A remains HOLD; the orchestrator owns the
fresh native gate and maintenance reconciliation. Syntax and authored whitespace
checks passed. The maintenance checker still rejects uncommitted Games changes,
including sibling work; this worker does not own or refresh that inventory.

### Final bounded native result

The fresh 210-second retry reached Graft and Midway grounded endpoints and
Greenhedge in flight, then exited **137** after the 10-second cleanup grace.
No third arrival or retained grounded-walk observations exist: **native HOLD**.
`world-native-evidence.json` explicitly reconstructs only the flushed capture
observations; console/request history is unknown, not clean. Raw observations
are in `world-bounded-native.jsonl`. UI reports mark the three shared images
replaced by newer native captures; their original variance values are historical.
The QA runner now checkpoints captures/walks and saves errors before closing
the browser. This instrumentation passes Python syntax only; its new checkpoint
behavior has not received another browser run. No production navigation defect
was established. Browser/server processes stopped. Hermes advice ticket
`pi-2027948-1792619695258-0497d09d` remains pending after a 10-second timeout.

# Astra aircraft: model provenance and integration contract

## Scope and provenance

The operator explicitly approved **two AI-generated Wings aircraft models** for
this fleet run. These are original procedural low-poly geometry authored by
**openai-codex/gpt-6-astra**, using the Python-standard-library generator
`../verification/generate-models.py` (generator identifier: Wings astra geometry
generator v1). No third-party model, texture, image, traced reference, or copied
mesh was input. Existing Wings files were inspected only for loader, coordinate,
scale and node conventions. These are fictional aircraft, not branded replicas.

No additional third-party asset-license requirement was identified for these
new geometry files because they contain no third-party asset input. This is
**not** a guarantee of copyright ownership, copyrightability, non-infringement,
or unrestricted rights in every jurisdiction. It does not resolve the existing
upstream Wings game's missing-license qualification. Existing Three MIT and
other upstream notices still apply to their respective components.

| Asset under `Games/Wings/models/` | Bytes | Triangles | SHA-256 |
| --- | ---: | ---: | --- |
| `astra-interceptor.glb` | 46840 | 328 | `4b718b8b7fe0c32c85adb373b421dc08e4500bef4ae87f82c62fcba5ca4bf83e` |
| `astra-trainer.glb` | 55712 | 368 | `98f01e24c65201e70da94ceaf3638555880ed9ecea1595dcb082e2ed490c7b1d` |

Generator SHA-256:
`a0a219230de1ff48b92d34d570737e982f599f8a0d22e01c352046a44e43d4fc`.
Generation is deterministic. Both assets are below the strict 200,000-byte limit.
No textures, external buffers, compression decoders, skins or baked animation
clips are required. Each mesh includes indexed triangles, flat outward normals
and UV0. Root transforms are identity.

## Integration status (follow-up task 2)

Both aircraft are now wired into offline Custom setup and the seven-aircraft
hangar (keys 6/7). Custom selection is a local `StartRequest.aircraft`, not a new
room/network setting: after the unchanged renderer/first-draw gate, the session
sends the existing validated `spawn` message. Solo/bot launch routes retain their
hangar. Unknown kinds return an error. The original five tuning entries and bot
selection weights are unchanged; Astra bot weights are zero.

Actual arcade handling relative to fighter:

| Kind | Cruise / boost m/s | Corner speed / rate | Roll / direct yaw-turn rad/s | Pitch response | Cockpit eye / pitch |
| --- | --- | --- | --- | --- | --- |
| Interceptor | 145.8 / 199.8 | 99.36 / 1.034 | 3.76 / 0.9024 | 10.34 | (0, 1.35, -3) / +0.02 rad |
| Trainer | 121.5 / 166.5 | 82.8 / 1.188 | 4.32 / 1.0368 | 11.88 | (0, 1.35, -0.65) / +0.035 rad |

Roll/yaw response also scales by 0.94/1.08. Fighter stall 55, radius 8,
HP 450, weapons, thrust, collision and remaining handling rules are retained.
Trainer uses the existing fixed-wing jet physics and fighter audio, not a new
propeller simulation. Chase offsets are 26/6 and 22/6 metres. Camera sight offsets
are provisional, not native cockpit acceptance. The descriptors below are now
implemented; trainer fixed gear is not a pivot and its prop rotates on local Z.
Thumbnails reuse scene.ts's existing kind/team loader, view and bounds framing;
no separate decorative images or renderer bypass were added.

`node Games/Wings/verification/astra-check.mjs` checks both loopback spawns,
wire snapshots, ordinary-input takeoff/turn, descriptor nodes, hashes and cockpit
math. `check-ui.html` now additionally checks actual custom-menu requests reach
real loopback spawns for both kinds, plus keys 1/6/7 and listener disposal.
These fixtures are not rendered flight. Four native desktop/mobile/theme UI
cases pass. An isolated upstream aircraft-preview build using the new Wings
converter/materials hit its 40-second outer bound; no converted-render PASS.
World flight, thumbnails, prop animation and native cockpit acceptance stay held.

## Original integration contract and historical fixture evidence

Use distinct picker labels **Astra Interceptor** and **Astra Trainer** and the
filenames above; do not overwrite upstream GLBs. Model/root names are
`astra-interceptor` and `astra-trainer`. Coordinates are **-Z nose/forward,
+Y up, +X right**, at **scale 1**, in Wings' meter-like world units. No model
rotation or normalization is needed. The origin is near the fuselage center;
this is not a ground-centered asset.

| Model | Bounds X/Y/Z | Silhouette | Suggested placeholder length/span |
| --- | --- | --- | --- |
| Interceptor | 12 / 3.7 / 17.15 | Long pointed nose, swept wings, twin canted fins, twin exhausts | 17.15 / 12 |
| Trainer | 11.2 / 4.275 / 9.55 | Short round body, straight high wing, single fin, two-blade prop, fixed gear | 9.55 / 11.2 |

Named nodes shared by both: `cockpit`, `gun_muzzle`, `wing_L`, `wing_R`,
`stabilizer_L`, `stabilizer_R`, `canopy`, `fuselage`. `gun_muzzle` is an anchor,
not a visible weapon or promise of a specific loadout. The trainer propeller
pivot is `propeller`, translated to `(0, 0, -4.7)`; its blades are local to that
pivot. Rotate about **local Z**. The trainer `gear` group contains its connected
crossbar, struts, wheels and tailwheel. The interceptor has no gear geometry.
Do not advertise retractable gear or movable control surfaces for these assets.

Suggested minimal render descriptors matching the inspected deployed loader:

- Interceptor: `file: "astra-interceptor"`, `pivots: []`, `stores: []`,
  `spinners: []`, `afterburners: []`,
  `anchors: [{key: "gun", node: "gun_muzzle"}]`, `shadow: [12, 17.15]`.
- Trainer: `file: "astra-trainer"`, `pivots: ["propeller"]`, `stores: []`,
  `spinners: [{name: "propeller", axis: "z", speed: 40, driver: "engine"}]`,
  `afterburners: []`, `anchors: [{key: "gun", node: "gun_muzzle"}]`,
  `shadow: [11.2, 9.55]`.
- Both placeholders use `heli: false`. Do not add `gear` to trainer pivots if
  keeping its fixed gear visible: the existing update loop scales a registered
  `gear` bone according to gearDown. No `pilot_1`/`pilot_2` meshes are supplied.
- Optional cockpit markers: interceptor `(0, 1.35, -3)`, trainer
  `(0, 1.35, -0.65)`. Configure camera offsets in authored source, not the GLB.

**Handling suggestions, not flight-tested tuning:** relative to the existing
fighter baseline, try interceptor top speed 1.08x and turn response 0.94x;
trainer top speed 0.90x and turn response 1.08x. Keep existing physics, loadout,
stall constraints and collision rules until the source owner validates them.
Start cockpit pitch at the baseline and only change after native view testing.
Dimensions do not automatically update gameplay collision radii.

### Loader evidence and material limits

Read-only inspection used HEAD `8165683`'s deployed
`assets/aircraft-D9mwCKGU.js` (loader/rig converter `qV`, configuration `gc`,
creator `PG`) and root/accessor metadata from `fa18.glb`, `yf12.glb`, and
`a10.glb`. The converter preserves root-relative transforms, gathers named
pivots and anchors, remaps ordinary material colors into its toon palette,
and recognizes `livery_` ancestor names. The generated wing accents deliberately
use `livery_wing_L/R` so team identification can survive that remapping.
The placeholder nose and forward vector confirm -Z forward; models are not
rescaled by the converter. This is inspection evidence, not permission to edit
the minified bundle.

Opaque painted PBR materials use moderate/high roughness; dark opaque canopies
avoid sorting/transparency dependencies. No emissive materials or textures are
needed. The existing Wings converter replaces these materials with its own
shaders, so the fixture colors are **not** a guarantee of the in-game palette.
Existing Wings shader/device failures are not fixed by these assets.

## Reproduce and verify

From the repository root, with existing tools only:

```sh
python3 -B Games/Wings/verification/generate-models.py
python3 -B Games/Wings/verification/check-models.py
python3 -B Games/Wings/verification/check-models-browser.py --out /tmp/trg-fleet/lane1
```

The browser check discovers an already-cached Three 0.186.0 or accepts
`--three-root PATH`; it does not install anything. Its temporary loopback server
serves that dependency only for the fixture and terminates in `finally`.
`model-preview.html` is a verification fixture, not a game entry; open it through
this server rather than expecting `/__three__/` on the deployed site.

Fresh checks passed:

- Structural/size regression: deterministic bytes, GLB chunks, buffer bounds,
  node tree, finite attributes, normals/winding, indices, distinct propeller rig,
  no external textures/buffers and <2,000 triangles per aircraft.
- Four isolated Chromium/SwiftShader + Three **186** renders: 1100x720 and
  390x920, light/dark preferences, front/rear quarter views. Both models draw in
  each run (14/20 draw calls, 328/368 triangles). Zero console/page errors,
  zero warnings, zero external requests. This uses standard Three WebGLRenderer,
  **not Wings' renderer, shaders or rig converter**.
- Evidence outside Git: `/tmp/trg-fleet/lane1/browser.json` and
  `light-1100.png`, `dark-1100.png`, `light-390.png`, `dark-390.png` in that folder.
- Catalog check: 125 unique IDs, expected schema, and tracked entry URLs.

The original lane1 run claimed no actual Wings rendered-flight, picker, material-converter, propeller animation,
collision, handling, native hardware, full-catalog smoke or release acceptance
is claimed. No game was added or registered. No push.

## Blockers and ownership

Historical lane1 blocker (resolved by follow-up task 1): local staging TypeScript source was not found; a help ticket was raised instead
of fetching upstream or editing minified bundles. Lane 2 owns source recovery,
implementation, picker/handling integration and the Wings maintenance manual.
Lane 7 owns inventory refresh: `check_maintenance_docs.py` already reported
`Inventory stale: inspect changes, then run --refresh.` before these changes,
and the recorded inventory had no Wings entry. This lane does not refresh it.
The model fixture is deliberately separate from the existing held renderer gate.

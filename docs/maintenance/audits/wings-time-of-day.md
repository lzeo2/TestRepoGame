# Wings: deterministic time-of-day lighting

## Scope

Existing game 232 only. No game, aircraft, catalog entry, dependency, network
service or publication added. Node checks gate this milestone; no browser run,
screenshots, full-fleet smoke or push. Historical GPU and rights holds remain.

## Source and implementation

Recovered the retained upstream source for pin
`bf5f6277e38ee52e9bfa4ae4a01337b46175c181`, then applied the currently served
`port.patch` (starting blob `facc698317d21ffbbed98899f9be4a6dd6327250`).
The initial inventory was stale before this work; it is not an acceptance receipt.
Rebuilt authored source, never edited minified bundles. The regenerated complete
patch clean-applies to the retained pin and reconstructs the authored tree byte
for byte, including its new regression sources. Its blank context lines are
normalized without changing reconstructed source bytes.

- `src/sim/time-of-day.ts`: pure absolute-seconds sampler. Every 600 room seconds
  is one 24-hour day, starting at 09:00. Negative values wrap; nonfinite inputs
  reject. Inclined unit solar orbit, smooth solar/ambient strength, twilight and
  fog interpolation; no random seed, real date or accumulated lighting delta.
- `src/ui/game.ts`: samples the existing interpolated room timeline, capped by
  the latest simulation snapshot. Spawn, flight and death share that clock;
  respawn does not reset it. Menu return resets the backdrop to 09:00; a fresh
  room starts at time zero. The existing pause menu does not stop the room.
- `src/render/world/daylight.ts`: actual directional sun, warm horizon light,
  hemisphere ambient, shared sky/cloud/ocean/fog uniforms and dimmed aircraft
  reflection maps. The procedural sky dome is the skybox, including a moving
  solar disc and matching ocean reflections. No CSS/theme setting is involved.
- Balanced/High use a player-focused 1024-square solar shadow map, with terrain,
  trees, aircraft and ships participating as appropriate. Low retains the
  existing bounded contact-shadow fallback, now following the moving sun and
  fading through the horizon. The existing Low fallback is chosen when an
  aircraft view is created; changing quality does not recreate that view.
- Night raises base fog from 0.00005 to 0.00075 and sea mist from 0.0003 to
  0.0011, while ambient strength falls from 1.4 to 0.06. This reduces actual world
  visibility on every preset, not merely HUD colors. Flight physics, bot sensors,
  weapon targeting and spotting rules remain unchanged.
- Every locally occupied aircraft gets one real forward/downward `SpotLight`
  at night, steeper for Apache searchlight use. It illuminates light-responsive
  terrain/ships/models; no decorative beam mesh. Range 500 m, inverse-square
  decay, no spotlight shadow map. Remote aircraft and thumbnails get no beam.
  Daylight, death, loss of local ownership and disposal remove it and its target.
  The existing custom unlit ocean shader does not receive spotlight illumination.
- Storm flashes now use absolute room time: first at 8 s, then every 19 s, with
  deterministic bolt samples. Post-processing consumes the current flash rather
  than carrying a previous world flash forward. Existing non-lighting cosmetic
  particle/animation randomness and world generation were not rewritten.
- Controls explain the automatic cycle/lights. Source font links now preserve
  the already-deployed local font paths without a manual HTML delivery patch.

## Delivery and consumer audit

Built with existing esbuild 0.28.2 and Three 0.186.0, no installation. Builder
adds the lighting regression entry and lowers template literals, preserving
shader string contents while escaping their literal newlines/trailing spaces.
This fixes generated diff-whitespace findings without suppressing the check.

Output: **25 files, 3,543,748 bytes**, including build metadata and retained
license in staging. Runtime HTML/assets and the three bundled regressions were
delivered; metadata/license were not unnecessarily duplicated. Existing GLBs,
font files, notices and unrelated source are untouched by this lane.

Before retiring the 11 old generated assets, a Git-index text-reference audit
included sparse-excluded HTML/JS/MJS/TS/CSS/JSON/Markdown/text/Python/patch content.
Runtime consumers were confined to Wings' old chunks and its two HTML entries;
other matches were historical documentation. Authored dynamic imports, model
loader URLs and the terrain-worker URL were traced. New generated imports,
HTML/CSS entries and worker references resolve; no replacement output refers to
an old asset basename. Historical documentation was retained.

## Verification

From the repository root:

```sh
node Games/Wings/verification/lighting-check.mjs
node Games/Wings/verification/solo-check.mjs
node Games/Wings/verification/astra-check.mjs
node --check scripts/build_wings.mjs
python3 -B scripts/check_maintenance_docs.py
```

Fresh results:

- Lighting sampler: **PASS**, 4,801 sweep samples, wrap/negative/invalid-input,
  unit sun, light/fog bounds, sunrise/sunset direction, continuity and partition
  independence. Actual solar/ambient objects, sky/fog/reflection uniforms,
  quality settings, shadow focus, fixed storm sampling and converted F-15/Apache
  spotlight transforms/lifecycle: **PASS**.
- Existing solo takeoff/fresh-room/crash/respawn regression: **PASS**.
- Existing converted-jet flight/weapons/stores/bays/anchors regression: **PASS**.
- All **18** delivered JS/MJS files plus the builder: `node --check` **PASS**.
- **128** catalog entries: schema, unique integer IDs and tracked URLs **PASS**.
  Catalog is unchanged by this task. Local HTML/font links resolve; generated
  imports and terrain-worker URL resolve; no new external loads.
- Authored changes and generated delivery: `git diff --check` **PASS**.

These are CPU/render-state checks, not pixel, native flight or hardware shader
acceptance. No captures were requested or taken. After source commit `cad81ac0`,
the unchanged maintenance checker exited **1** with `Commit inspected source
changes before validating its inventory.` Remaining dirty game paths belonged
to concurrent Citisten atmosphere and Wings PBR documentation work, not this
lighting delivery. Their manual edits were preserved; only this lane's lighting
section was staged. No inventory refresh was attempted over those changes and
no whole-repository maintenance PASS is claimed. The earlier shared-index lock
did not block this commit; no lock was removed by this lane.

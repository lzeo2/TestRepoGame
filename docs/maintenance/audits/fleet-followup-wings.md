# Wings follow-up task 1: source rebuild and menu context lifecycle

## Result and limits

The native shared-browser Wings -> Server Survival -> Astray sequence failed
**1/3, exit 1 before**, then passed **3/3, exit 0 after**, including a second run
on the final build. This fixes the unsolicited menu renderer startup, not the
underlying flight shader/driver stall. **No rendered-flight, supported-GPU or
full-fleet PASS.** The existing 122/125 full gate remains failed; no push.
No games, dependencies, generated aircraft or aircraft-picker integration added.
Catalog remains 125 entries.

## Source and root-cause trace

Read project instructions, maintenance index/inventory/manual, triage, upstream
AGENTS/contracts/design/style and relevant source. The starting Wings tree was
`7ae15ac9cc87870923d2b37399304ed677efc870`, entry
`3f1d3cc09ad7522c393886a0e2c5ea3c4da5e862`, matching inventory.
The supplied source reports pin `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`
and clean Git status before/after. No refetch, install, source/cache edits,
repository node_modules, sparse changes or history rewrite.

`main.ts` had two callers of `bootScene()`: an unconditional post-paint task and
the shared `start()` used by all three offline launch routes. `createSceneHost()`
initializes WebGPU/WebGL2, streams the world and starts an animation loop even
without a session. Its first-draw promise resolves only after world readiness
and nonzero draws; shader/device errors and timeout reject. `startGame()` follows
that await. Session disposal calls `host.setFrame(null)`, retaining a menu backdrop.
Thus an HTML-only menu visit unnecessarily entered the expensive GPU path.
Earlier raw diagnostic evidence located successor hangs inside native getContext,
not HTTP loading; it did not identify a specific defective shader.

Removed only the post-paint `bootScene()` call, not rendering on Play. The status
now says to choose a flight to load the world. Automatic first-launch quality
benchmarking moves to the first successful return to the menu, rather than
attempting an idle-menu benchmark while a flight is starting. Flight shaders,
Three, world, renderer failure handling, first-draw checks, offline simulation,
menu routes and phase2 listener cleanup remain intact. No headless detection,
renderer hiding, forced quality, replacement materials, timeout/filter changes
or per-game browser restart. Returning after actual play can still exercise the
unresolved renderer issue; this change does not claim otherwise.

## Rebuild and consumer audit

External staging contains only Wings source/tests/config and patch-added tests;
public assets and exact cached package directories are symlinked. Footprint
9.3 MiB, below 50 MiB. Bun uses `--preserve-symlinks` so cached Vite dependencies
resolve through staging node_modules without writing/installing in the cache.

With `STAGE` pointing to that external root, the actual build command is:

```sh
cd "$STAGE/games/wings"
"$HOME/.bun/bin/bun" --preserve-symlinks node_modules/vite/bin/vite.js build
```

Cached versions: Vite 7.3.7, Three 0.186.0, Rollup 4.64.5, esbuild 0.28.2.
Final build output: `62 modules transformed`, `built in 30.90s`, exit 0.
The existing >500 kB chunk warning remains. No typecheck PASS is claimed.
Only built HTML/chunks and updated regression sources were copied back, never
public models/notices. The external `rebuild-port.py` generates a full normalized
patch against the pin and checks applicability without writing to pinned source:

```sh
python3 "$STAGE/rebuild-port.py" "$SOURCE" "$STAGE" "$REPO/Games/Wings"
git -C "$SOURCE" apply --check "$REPO/Games/Wings/port.patch"
```

Before deletion, exhaustive `git grep --cached -l` for the four old hashes found
only Wings index/main/game/scene imports and the historical aircraft reference
in protected `docs/models.md`. Traced fixture imports too: check-ui retains its
unchanged check/lobby/fleet/vehicles/spawn chunks; the model fixture imports Three
through its own `/__three__/` import map, not the retired aircraft chunk.
Protected model documentation remains unchanged; its old bundle reference records
the inspected historical build, not a current runtime consumer. All replacement
HTML/chunks/fixtures were checked for old-name imports before removing old files.

Retired: `main-0obH-XWs`, `scene-DnxDq55i`, `game-DO1-XD9F`,
`aircraft-D9mwCKGU`. Final replacements: `main-DtSMZe4y`, `scene-B2Nc6D93`,
`game-BhRCrzoC`, `aircraft-TZhQ6vXa`. Rebuild reordered some generated import/export
bindings, changing dependent hashes without authored shader/engine edits.

## Verification and evidence

Evidence label: `trg-fleet/followup/wings/` (external, not committed).

- `before.log`: unchanged smoke command with `SMOKE_PORT=8982`, games
  `Wings,Server Survival,Astray`; 1/3, exit 1. Both successors timed out at the
  unchanged 15-second domcontentloaded deadline.
- `after.log`, `after-final.log`: same sequence through new
  `verification/check-context-sequence.py`; each 3/3, exit 0. It delegates to the
  unchanged runner, one browser throughout. The 90-second outer process bound
  terminates owned test processes rather than extending page timeouts.
- `ui-final.log`: `PASS: 4 viewport/theme failure screens, Low retry/reload, all
  3 launch paths fail closed, Controls/Settings return, offline custom controls,
  spawn cleanup/layout and HUD fixture separation. No rendered flight.`
  The test now first checks an idle lobby without an error dialog/scene stats,
  then clicks Solo to trigger the deliberately unavailable renderer, including
  after Low reload. Existing three-route failure and fixture assertions remain.
- `solo.log`: normal-input takeoff to y=1459.632, speed 177.720; fresh time 0;
  crash at 4.0167 s and respawn at 14.0167 s. Rendering not tested.
- `build.log`: final Vite build; `old-consumers.txt`: pre-deletion tracked scan.
- `ui/`: desktop/mobile light/dark menus, failures, custom/controls/settings,
  spawn and HUD fixture screenshots. Inspected dark desktop/light mobile menus
  and light desktop/dark mobile failure screens: menu text and diagnostic
  controls visible without cropping. These are not aircraft/flight screenshots.
- JS `node --check`, Python AST parsing, 125-entry catalog schema/unique integer
  IDs/Git URL checks, clean patch applicability and scoped `git diff --check`
  pass. No new runtime third-party load is introduced; UI test records zero
  external requests and page errors. Expected unavailable-renderer console
  diagnostics are not GPU acceptance.

`python3 -B scripts/check_maintenance_docs.py` was run and reports
`AssertionError: Commit inspected source changes before validating its inventory.`
Concurrent source edits also exist; inventory refresh is explicitly coordinator
owned and was not performed. A new source tree necessarily needs reconciliation.
Other workers' portal/catalog-title/manual changes are not part of this commit.

Disk checks preceded staging/build/test/artifact growth and remained above 2 GiB;
recorded free space during this task ranged approximately 2.338–2.358 billion
bytes. Shared-workspace changes are not attributable solely to this worker.
Test HTTP servers terminated; port 8982 was checked clear. Final source/status,
protected-file hashes, disk and commit evidence are retained externally.

## Remaining acceptance

Missing upstream LICENSE/rights qualification unchanged. Model GLBs and protected
model fixture/generator/docs unchanged. Flight shader/compiler isolation, supported
GPU takeoff/combat/crash/respawn/exit/restart, automatic-quality behavior after
actual play and full 125-game gate remain required. The unavailable-GPU fixture
cannot establish those. Source recovery is complete; aircraft integration belongs
to the separately assigned next task. No ask_hermes tool is available here; an
external renderer-hold ticket records the unresolved hardware/compiler request.

## Follow-up task 2: Astra picker and real spawn integration

Task 1 above is historical. Task 2 adds both approved models, not a new game.
Catalog remains 125; no registration, dependency, network feature, inventory
refresh or push. Pin remains clean/read-only. Existing model bytes and generator
are unchanged. Current inventory is already behind task 1: Wings entry recorded
`3f1d3cc...` / tree `7ae15ac...`, while task 2 started at entry `4f522d2...` /
tree `c527821...`. No historical inventory PASS is treated as acceptance.

Trace: VehicleKind -> VEHICLES -> actual custom Aircraft row -> local-only
StartRequest.aircraft -> GameSession.connect after the unchanged first-draw gate
-> normal spawn message -> onSpawn allowlist -> spawnVehicle/createFlightState ->
existing stepFlight and compact snapshots -> CONFIG/loadKind/buildTemplate ->
createAircraftView -> existing kind/team thumbnail and bounds framing -> camera
maps and hangar keys 6/7. Invalid kinds now return `Unknown aircraft kind.`
The five existing specs/handling entries are retained. Astra bot weights are zero;
armor/audio/camera records cover both new kinds. No new room config field or
online transport. Trainer deliberately reuses jet flight/fighter audio and weapons,
not a realistic prop simulation. Exact handling and camera values are in
`Games/Wings/docs/models.md`; no invisible store/gear animation is advertised.

Staging recipe: retain the existing minimal staging and cached dependency symlinks.
Replace only its `public` symlink with a local directory, symlink each original
asset directory except models, then create a local models directory containing
individual symlinks to every original model and both immutable deployed Astra
models. Never copy through the former public symlink into the source pin.
Build with the task 1 Bun/Vite command. Rebuild the new regression with:

```sh
cd "$STAGE/games/wings"
"$HOME/.bun/bin/bun" --preserve-symlinks build astra-check.ts --target=node --minify --outfile=astra-check.mjs
```

The staging patch generator was extended to enumerate source files plus
`astra-check.ts`, so newly modified aircraft contracts are included, not only
prior patch paths. Its normalized output passes `git -C "$SOURCE" apply --check`.
Deploy only built HTML/assets plus regression sources/bundle; retain model bytes,
notices and historical fixture files. Tracked `git grep --cached` and constructed
Vite dependency/import scans include check-ui's check/lobby/fleet/spawn consumers.
All replaced hashes are absent from rebuilt HTML/chunk imports. The new check-ui
bundle uses the same seven-kind fleet and tests actual custom-menu requests against
real loopback spawn, then keys 1/6/7 and disposed listeners. It is explicitly a
renderer-free fixture, not a forged successful game session.

Actual checks (external evidence label `trg-fleet/followup/wings-task2/`):

- Vite: `62 modules transformed` on the initial runtime build; final fixture adds
  shared simulation modules. Existing >500 kB warning retained. No typecheck PASS.
- `astra.log` / `astra-deployed.log`: both models pass ordinary-input climb/turn,
  offline config, validated spawn, wire snapshot, descriptor node/hash and camera
  math checks. Interceptor y=1597.911, speed=190.323; trainer y=1275.162,
  speed=161.557. No position/health grants or GPU claims.
- `solo.log`, `models.log`: original solo takeoff/crash/respawn and both exact
  46,840/55,712-byte SHA-256 models pass. Generator unchanged.
- `ui-final.log`: all four viewport/theme unavailable-renderer cases pass,
  all three launch routes fail closed, Low reload, Controls/Settings, native
  custom Aircraft keyboard selection, seven-kind spawn and cleanup/layout pass.
  Zero page errors/external requests. Expected unavailable-context diagnostics
  remain. A fixture-only programmatic focus test initially failed because click
  left DOM focus on Aircraft while menu selection moved; corrected the fixture
  interaction to click Aircraft, without changing runtime navigation.
- `ui-final/`: actual picker desktop/mobile screenshots plus clearly labelled
  spawn/HUD fixtures. Reviewed desktop and mobile picker images in dark/light
  preferences: both names fit, focus is visible. Upstream dark styling persists.
  Existing failure toast/footer crowding is not redesigned by this task.
- `context.log`: first sequence **2/3**, Astray reload `net::ERR_ABORTED`.
  `context-retry.log` and `context-final.log`: unchanged sequence **3/3**, exit 0
  each. No filtering, extended per-page deadlines or per-game browser restart.
- `converted.log`: isolated upstream aircraft preview compiled from the changed
  source with actual Wings converter/node materials, no world replacement;
  bounded SwiftShader attempt exited **124 at 40 seconds**. No completed
  converted-material screenshot or render PASS. Historical standard-Three
  previews remain separate evidence. Native flight/thumbnail/prop/cockpit held.
- Patch applicability and JS syntax pass. The task 2 scoped whitespace claim
  did not establish a clean generated artifact: the baseline diff exposes 21
  regression shader-literal findings plus one runtime finding, detailed below.
  Maintenance checker still requires committed-source inventory reconciliation;
  inventory refresh is coordinator-owned. Full 122/125 release failure stands.

Workspace staging remained about 15 MiB; evidence under 5 MiB, below the added
30 MiB budget. Free disk remained above 2 GiB (about 2.33 billion bytes).
No source/cache writes, installs, fetches, direct bundle edits or persistent test
servers. No ask_hermes tool is exposed; the existing renderer hold is retained,
not guessed around. Supported-GPU and full-catalog release gates remain pending.

### Regression artifact rebuild correction

Rebuilt only `verification/astra-check.mjs` with the corrected `--minify` command
above, Bun **1.4.3**, no sourcemaps, installs, cache writes or build plugins.
Copied only that compiled file from writable staging into the repository. The
read-only source pin remains `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`, clean;
`port.patch` still passes `git apply --check`. Staged `astra-check.ts` is
byte-identical to the committed source from `d435f12` (blob
`fafa49625780b49cbf26de08db102b6096777d29`); no test logic changed.
Before editing, Wings tree `9d95fcd5bd06dd057b454dc63beec21979c1ef2d` matched
inventory. Runtime bundles, GLBs, generator and existing Three MIT notice remain
untouched. No history rewrite: path content in original `d435f12` history still
requires separately authorized remediation.

Actual rebuild output: `Bundled 24 modules in 251ms`, `astra-check.mjs 0.54 MB`;
a second identical build took 214ms and produced identical bytes. Size falls from
**884,415 to 539,850 bytes**, saving **344,565 bytes (38.96%)**. Output SHA-256:
`199cbe8815f1698f586ca0ecac0c9d5c32999e48a7de5cacd2ac0c17ad89ef24`.
All three host-path comment lines are gone. Home/temp/user/root path-prefix scans
and Windows backslash-drive scan return zero matches. An initial broad drive
pattern also matched four URL/regex fragments; inspection identified XML namespace,
data-URL regex and two shader attribution URLs, not host paths. No new runtime
loads or entry payload were added.

Fresh commands/results:

- `node --check Games/Wings/verification/astra-check.mjs`: exit 0.
- `node Games/Wings/verification/astra-check.mjs`: PASS both kinds, offline
  config/spawn/snapshots, ordinary-input takeoff/turn, immutable GLBs, descriptors
  and cockpit math. y=1597.911 / 1275.162, speed=190.323 / 161.557.
  Old/new bundle stdout is byte-identical, SHA-256
  `cc330feae2351853bc491f52ab301f62ae817176851c1fb72df82c91271d4262`.
- `node Games/Wings/verification/solo-check.mjs`: PASS offline takeoff, fresh
  session, ordinary-input crash and respawn; rendering not tested.
- `python3 -B Games/Wings/verification/check-models.py`: PASS both original
  hashes, 46,840/55,712 bytes and 328/368 triangles.
- Catalog: PASS 125 unique integer IDs, schema and Git-backed URLs.
- `git diff --check`: current-change check exits 0. Against `e787681`, the
  regression still has **21 diagnostics, exit 2**: trailing whitespace at lines
  **54, 57, 542, 1209, 1211, 1214, 1216, 1218, 1807, 1817, 1976, 3571, 3573**;
  space-before-tab indentation at **1210, 1212, 1213, 1215, 1217, 1219, 1261,
  3574**. These retained shader literals were not hand-edited or suppressed.
  `assets/aircraft-BFgSn1xg.js:30` remains the separate untouched runtime
  trailing-whitespace finding. The global baseline range is not clean.
- `python3 -B scripts/check_maintenance_docs.py`: before commit exits 1,
  `AssertionError: Commit inspected source changes before validating its inventory.`
  Inventory refresh is coordinator-owned after the output commit, not performed
  by this task.

Pre-growth free space: **2,328,309,760 bytes**, above 2 GiB. No browser or full
release gate ran for this artifact-only correction; no new screenshots or games,
no push, and no rendered-flight or history-remediation claim.

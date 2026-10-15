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

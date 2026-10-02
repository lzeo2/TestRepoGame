# Shared emulation and binary-loader maintenance

<!-- maintenance-site: emulation-runtime -->

## Identity and status

Baseline `8c8a055`: `Games/_emulatorjs/` is shared infrastructure, **not a game**.
Git contains 75 files/51,334,846 logical bytes, including 39 packed core archives.
It is not materialized for this review. Nine small entry wrappers reference its
local loader: Balatro plus catalog ids 114 through 121. The commercial ROM
wrappers have no verified redistribution clearance in this review.

Coverage: read all nine entry wrappers, complete `loader.js`, `storage.js`,
`GameManager.js`, `gamepad.js`, version JSON and minifier source. Read selected
`emulator.js` bootstrap/download/control/persistence/netplay boundaries, and
cross-checked relevant tokens/fragments in the live minified bundle. **Not a
full human review of its 4,687-line emulator, 295,774-byte minified bundle,
compression/shader/touch/socket vendors, archive contents, WASM cores, ROMs or
Flash/Unity engines.** No decompilation, whole-engine download/diff or binary
extraction was performed.

## Implementation map

Each GBA entry defines `EJS_player='#game'`, `EJS_core='gba'`,
`EJS_startOnLoaded=true`, `EJS_pathtodata='../_emulatorjs/data/'`, and a local
`EJS_gameUrl`, then loads `../_emulatorjs/data/loader.js`.

| Entry directory / catalog id | Actual gameUrl payload |
| --- | --- |
| `DrMario` / 114 | `Classic NES Series - Dr. Mario (USA, Europe).gba` |
| `StreetFighter2` / 115 | `Super Street Fighter II Turbo - Revival (USA).gba` |
| `AdvanceWars` / 116 | `advance-wars.zip` |
| `MarioKartSuperCircuit` / 117 | `mario-cart-super-circuit.gba` |
| `MetroidFusion` / 118 | `Metroid Fusion (Europe) (En,Fr,De,Es,It).zip` |
| `MegaManZero` / 119 | `megamanzero.zip` |
| `KirbyAmazingMirror` / 120 | `Kirby & the Amazing Mirror (Europe) (En,Fr,De,Es,It).zip` |
| `SonicAdvance` / 121 | `sonic-advance.zip` |
| `Balatro` / 221 | `balatro-gba-0.2.2.gba` |

IDs were checked against baseline `games.json`; payload names above are source
evidence, not a rights grant. Never allocate future IDs from this table.

`loader.js:loadScript/loadStyle` resolves from `EJS_pathtodata` or its own script
URL, with optional `EJS_paths[file]` overrides. Normal mode loads
`emulator.min.js` and `emulator.min.css`. `EJS_DEBUG_XX=true` instead loads seven
unminified/component scripts plus CSS. It translates global `EJS_*` options into
`config` and creates `window.EJS_emulator = new EmulatorJS(EJS_player, config)`;
ready/start/load/save callbacks are attached through `.on()`.

`EmulatorJS.getCore()` maps `gba` to `mgba`. `createStartButton()` /
`startButtonClicked()` lead to `downloadGameCore()`. The core archive is
`cores/mgba-wasm.data` (933,634 bytes); it is decompressed into JS/WASM, and
`initGameCore()` executes the JS through a blob script. `initModule()` sets
`window.Module`, canvas and WASM/worker blob resolvers. Runtime initialization
calls `downloadFiles()`, which initializes `EJS_GameManager`, then downloads ROM,
BIOS, optional state/parent/patch before `startGame()` calls native `callMain()`
and resumes the main loop. `downloadFile()` uses XHR for ordinary HTTP/relative
paths; `EJS_paths` overrides can redirect requests and are a trust boundary.

The version JSON says `40.6`; emulator identifies `4.0.6`, with core-cache version
`9`. These are embedded version labels, **not a verified upstream commit pin**.

## Gameplay and controls

The shared runtime owns input and toolbar, not ROM rules or victory conditions.
Do not retrofit wrapper-level win/lose states. `createControlSettingMenu()`'s
GBA scheme labels indices 8=A, 0=B, 10=L, 11=R, 2=Select, 3=Start and 4-7=D-pad.
Combined with `defaultControllers[0]`, player 1 defaults are:

- Arrows: D-pad; Z: A; X: B; Q: L; E: R; V: Select; Enter: Start.
- `keyChange()` forwards both keydown/keyup to
  `gameManager.simulateInput(player,index,value)` after start and outside popups.
  Runtime focus is on its parent; clicking/touching it refocuses the parent.
- `setVirtualGamepad()` creates GBA A/B, D-pad, Start/Select/L/R touch controls.
  Visibility depends on runtime touch/settings state, not the wrapper alone.
- `GamepadHandler.loop()` polls every 10 ms and exposes `terminate()`. The
  inspected emulator binding starts polling; no complete teardown API was
  established in this bounded review. Closing a browser document is different
  from implementing safe same-document remounting.
- Toolbar restart delegates to `system_restart`; saves, pause, volume, fast
  forward, rewind, fullscreen and settings depend on core support.

Player 2 mappings can be assigned in control settings; defaults are not a promise
of two-player ROM support. The Street Fighter II catalog's same-keyboard versus
claim needs actual ROM/menu verification; neither emulator input slots nor a
familiar franchise establishes that mode. No gamepad/touch/Safari fidelity was
tested here.

## State and persistence

- `saveSettings()` stores `ejs-settings` (volume/muted) and
  `ejs-<resolved core>-settings` (controls/settings/cheats). All these GBA games
  share `ejs-mgba-settings`, so control changes cross game boundaries.
- Four IndexedDB databases/stores: `EmulatorJS-roms`/`rom`,
  `EmulatorJS-bios`/`bios`, `EmulatorJS-core`/`core`,
  `EmulatorJS-states`/`states`. `EJS_STORAGE` maintains key index `?EJS_KEYS!`.
- `downloadRom()` first makes a HEAD request, compares cached `content-length`,
  then fetches/decompresses if necessary. ROM cache keys use basename; content
  integrity is not verified. Default cache size limit is 1 GiB per eligible
  response, not proof of an aggregate disk cap. Warm cache still needs HEAD.
- `downloadGameCore()` caches `<core>-wasm.data` with version `9`. Its cache key
  omits the thread suffix used in download paths: toggling threads can reuse an
  incompatible cached payload. Current wrappers do not enable threads.
- `GameManager` mounts IDBFS at `/data/saves`; save-file sync happens on explicit
  save and beforeunload. Errors from sync callbacks are ignored. Quick state slots
  are virtual files such as `1-quick.state`; do not assume they persist across
  reloads. Browser-state export/import has a separate runtime path.
- `getStateInfo()` polls native state every 50 ms without a deadline. Save UI can
  wait indefinitely if native state never becomes available.

Export saves before origin migration or runtime upgrade. Do not clear all
IndexedDB/localStorage as a universal fix; it deletes user progress. Cache
manager operations must be distinguished from save storage.

## Dependencies and provenance

Source links embedded by the runtime identify
<https://github.com/EmulatorJS/EmulatorJS> and
<https://github.com/libretro/RetroArch>. Its About/license UI embeds full GPL v3
text with the EmulatorJS notice naming Ethan O'Brien and GPL v3-or-later wording.
No standalone LICENSE/COPYING/CREDITS file is tracked in `_emulatorjs`; preserve
embedded notice bytes, but do not claim a complete per-core/source-offer audit.
Runtime license does **not** license bundled ROMs. Individual core terms and
corresponding source/pins need independent verification before an update.

`Games/Balatro/CREDITS.md` records OutBlade mirror commit `3c8cf43`, GBALATRO
release 0.2.2 and an MIT claim. This is historical local evidence, not a fetched
license or full hash verification in this worker. Commercial-game assets and
fan-demake branding must be evaluated separately. No default MIT inference.

`checkForUpdates()` fetches a remote version JSON on localhost/127.0.0.1 or debug
mode; this code also exists in the live minified bundle. Production-normal
wrappers are local asset loaders, but development runs are not strictly
zero-third-party-network. Default netplay endpoint is remote; connection code
is gated by both debug and `EJS_EXPERIMENTAL_NETPLAY` and needs a game ID. None of
these wrappers enables it. A dormant endpoint string is not an observed socket.

## Related Flash/Unity and shared assets

`storage/ruffle/` has five runtime files totaling 28,941,953 bytes: a loader, two
hashed JS chunks, two WASM files. Ruffle's loader constructs
`core.ruffle.<hash>.js` and hashed WASM paths; they are real outgoing consumers,
not unused files because no wrapper names each binary. Its vendor fragment uses
`new Function('return this')` as a global-object fallback: triage, not proven
user-controlled injection. Full vendor runtime and SWF network behavior remain
unreviewed. Default Ruffle config includes `allowNetworking`; local SWFs alone
are not proof of network closure.

Four Bloons subpages consume the shared Ruffle loader. Fancy Pants 3 tries local
`ruffle/ruffle.js` then falls back to `../../storage/ruffle/ruffle.js`; the variable
`cdnScript` does **not** make that local URL a CDN. Crush the Castle instead loads
its own `ruffle.js` and SWF. Flash gameplay/control/save internals are unknown to
wrapper-only inspection. Do not invent controls from the titles.

Unity wrappers use loader JSON as another dynamic manifest. Read examples:
`Games/BitLife/Build/BitLife.json` names three `.unityweb` payloads;
`Games/SubwaySurfers/Build/SanFrancisco/SanFrancisco.json` adds asm fallbacks and
`TOTAL_MEMORY=369098752`; `Games/BaldisBasics/baldi.json` names `unity/` payloads.
JSON-relative loader resolution and decompression must be traced before moving
these archives. A `companyName` field or mirror comment is not licensing proof.
BitLife's XHR hook matches selected vendor hosts and routes to `json/null.json`;
Subway's XHR/fetch hook does likewise and uses `js/poki-noop.js`. These hooks are
not a sandbox for arbitrary future fetches, sockets or SWF behavior. Compiled
Unity/WASM binaries were not human-reviewed. Platform/window/fullscreen behavior
needs actual browser QA, not an inferred operating-system support claim.

`storage/js/cloak.js` is an actual 34-byte local no-op, consumed by six small
entry HTML files in the reviewed entry scan. `images/ico.ico` is a 1,024-byte
favicon referenced by eight entries. These files are not deletion candidates
based on names alone. The entry scan does not certify every engine consumer.

## Audit findings

- **INF-06, HIGH:** `emulator.js:checkForUpdates()` constructor path makes a
  third-party development fetch; remove/disable updater at its shared source and
  produce a provenance-preserving runtime artifact under an approved task.
- **INF-07, MEDIUM:** `loader.js:loadScript/loadStyle` have no `onerror` rejection
  or deadline. Missing script/CSS can leave bootstrap awaiting forever. Add a
  single shared rejection path with useful local error feedback.
- **INF-08, HIGH:** `storage.js:put/remove` leave IndexedDB open/delete errors
  unresolved; `GameManager` ignores save-sync errors. Settle promises on every
  terminal event and surface save failure without claiming progress was saved.
- **INF-09, MEDIUM:** core cache omits threads; include thread mode and revision
  in identity before any thread-mode change. Current default path is unthreaded.
- **INF-10, MEDIUM:** settings storage access is outside JSON catches; blocked
  storage/quota errors can interrupt boot/settings. Guard get/set operations and
  retain in-memory play with visible persistence failure.
- **INF-11, MEDIUM:** `getStateInfo()` has unbounded polling. Add timeout and clear
  interval on failure/teardown; reject export instead of waiting forever.
- **INF-12, HIGH:** ROM/core provenance completeness is unresolved; owner/legal
  evidence is a release prerequisite, not a functional loader fix.

## Safe iteration

Patch shared loader error handling once, not nine caller copies. Keep wrapper
identity and upstream gameplay. Normal mode uses the minified artifact: editing
only unminified source will not change production. The included minifier needs
`uglify-js`/`uglifycss`; do not install them here or hand-edit the compiled bundle.
An approved task must establish an existing legitimate reproducible vendor
update path or explicitly document why it is blocked. Preserve GPL and all core
notices. Do not enable debug/netplay/threads to fix loading or rewrite engines.

## Verification

Actually run: Git counts/asset existence/catalog assertions and stdin syntax
checks; see [audit evidence](../audits/infrastructure.md). **Native runs: 0.**
Recommended: one licensed fixture first, cold then warm context, blocked third
parties, HEAD failures, cache length mismatch, denied storage/quota, missing core
and missing CSS. Verify input release after blur, touch orientation, gamepad
reconnect, toolbar restart, save export/import and reload. Test Safari and actual
N100 hardware separately; source memory constants are not measured peak usage.
Main owns the unfiltered full catalog smoke gate and screenshots.

## Future outlook

Week 1 rights/pins and observable loader/save failures; week 2 accessible wrapper
control help/focus and shared error-path checks; week 3 only approved lightweight
local dependency upgrades after source/notices validation; week 4 cold/warm,
mobile/Safari/gamepad and real hardware regression. Defer netplay, new ROMs,
threaded cores and engine replacement: this audit grants none of them.

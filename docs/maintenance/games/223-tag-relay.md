<!-- maintenance-game: Games/Tag Relay -->
# Tag Relay maintenance

## Identity and status

Registered id **223**, category `action`, not featured. Entry `Games/Tag Relay/index.html`; baseline `8c8a055` has 20 files, 74,714 bytes. This is an ingested local two-player Sprig game, not a self-made fallback or network multiplayer. Existing verified source and prior regression evidence are retained; this worker made documentation-only changes.

## Implementation map

Source review coverage: complete entry/style, `script.js`, `game.js`, preserved `original.js`, CREDITS, game/runtime MIT notices, and all Sprig modules except bitmap-font numeric data in `base/font.js`. The small compiled ES modules are readable and their lifecycle/input/render/audio callees were inspected. Font bytes were inventoried, not visually or legally independently certified.

`script.js` imports `webEngine` and `createTagGame`. `start()` cleans prior objects, hides `#menu`, creates engine/game, enables `#restart`, and focuses `#arena`. `feedback()` updates `#red-score`, `#blue-score`, `#clock`, `#round`, `#status`, pad disabled state and `#pause`; a terminal result calls engine cleanup then non-scheduling `api.render()`. The game owns map/sprite/tune templates, `canMove`, `award`, `tick`, `snapshot`, timer/music cleanup and pause methods. Sprig `base/index.js` validates map bounds and sprite setters; `web/index.js` owns the canvas keydown listener and RAF; `web/tune.js` owns cancellable tune delays and oscillator gain.

## Gameplay and controls

Start match is explicit. Red uses W/A/S/D, Blue I/J/K/L; independent labeled native touch-pad buttons dispatch the same key path. Each activation moves one tile; only walls are solid, and engine setters prevent leaving the map. Red scores by sharing Blue's tile; Blue scores by surviving seven elapsed seconds. `award()` disables round input, plays point feedback, and starts a 1.5-second interround break; `tick()` advances the arena. First to seven wins. Pause/Resume and Restart are native actions. Fourteen retained map entries include intentional repeats, so do not advertise fourteen unique arena designs. A match finishes within thirteen scoring rounds; the final map slot need not be reached.

## State and persistence

`createTagGame()` owns scores, arena index, `phase`, paused/disposed flags, elapsed time, one 50ms interval and tune handles. `snapshot()` returns frozen copied positions and counters. `window.tagRelaySnapshot` is a read-only diagnostic getter, not a cheat/setter API. No save keys/localStorage are used. Hidden documents pause and require explicit Resume; `pagehide` calls cleanup. Restart ends music/timers, removes the old input/RAF, then creates one new session. Terminal cleanup stops scheduling but retains a final rendered frame. The module-global AudioContext is retained for reuse, not recreated for every round.

## Dependencies and provenance

[CREDITS](<../../../Games/Tag Relay/CREDITS.md>) and [source evidence](../../tag-relay-sources.md) record Leo B / Hack Club's `2-Player-Tag.js`, game pin `1450c00a43c5ec09d2c4a8971763226ab447829f`, unchanged `original.js`, and separate Sprig 1.0.3 runtime pin `f2e175fba0020c8a6db964aaf884dc1f1365e26f`. Both MIT notices are present. Upstream URLs are `https://github.com/hackclub/sprig`; full paths/pins are in CREDITS. Local shell fonts reuse existing Atkinson Hyperlegible and Bungee assets/notices. No external runtime load, editor, room service, eval or remote signaling occurs in inspected code. Independent bitmap-font authorship beyond retained notices is not claimed.

## Audit findings

- **MEDIUM triage**, `script.js`, `window.addEventListener('pagehide', cleanup)`: cleanup nulls engine/game but leaves Start menu hidden; no `pageshow` recovery exists. Recommended repro: start, navigate away, then Back with persisted page cache. A restored page may show a dead board. Minimal root fix after native confirmation: reinitialize an explicit ready state on persisted pageshow, not retain old timers.
- **LOW bounded limitation**, `vendor/sprig/web/index.js`, `const tunes = []`: every `playTune` handle is retained until engine disposal. A first-to-seven match is bounded, so this is not an unbounded match leak. Prune ended handles only if profiling warrants it.
- Non-finding: `canMove()` alone permits an out-of-bounds empty tile, but Sprig `_canMoveToPush` enforces bounds at the actual sprite setter. Do not duplicate a speculative fix.

## Safe iteration

Preserve upstream sprites, tunes, maps and frozen `original.js`; timing repairs are already explicitly disclosed. Modify shell lifecycle or shared normal key routing, not separate touch-only movement rules. Keep terminal render non-scheduling and cancellation ownership intact. Do not add sockets or call this co-op over the network. Any runtime repair needs a fresh approved lease and focused regression.

## Verification

Actually run here: all fifteen JS files passed STDIN ESM `node --input-type=module --check`; browser/native checks **zero**. Existing `docs/tag-relay-sources.md` records a prior `scripts/test_tag_relay.py` pass, both winner paths, 127 legal chase moves, pause/visibility/restart/two-touch and three captures; that evidence was read, not rerun or independently visually reviewed. Recommended: Main run the unchanged focused script plus persisted-pageshow navigation, then the serial full catalog gate. A narrow materialization belongs to Main, not this worker.

## Future outlook

Week 1: persisted-page lifecycle reproduction and audio/input regression preservation. Week 2: Main desktop/mobile review at 320/390 widths with keyboard focus and both touch pads. Later: investigate mute access and hardware audio behavior only if users need it. Online matchmaking, new maps, new fonts and standalone runtime replacement are deliberately deferred.

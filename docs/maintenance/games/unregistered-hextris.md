<!-- maintenance-game: Games/Hextris -->
# Hextris maintenance

## Identity and status

**Unregistered**, no current id/category. Entry `Games/Hextris/index.html`; source baseline `8c8a055`, 20 files, 205,339 bytes. The source-port disposition in [prior evidence](../../ports-hextris.md) is WONTFIX for the earlier run after capped polish failures. Its proposed id 223 is now occupied by Tag Relay; it is not an allocator or registration instruction. Current documentation does not reopen that port task.

## Implementation map

Source review coverage: full HTML/CSS, all fourteen game `js/` files, GPL LICENSE, complete small JSONfn vendor file, and Keypress implementation/header. The 92,593-byte minified jQuery vendor was not human-reviewed in entirety. No binary game engine is present.

Entry loads vendors then save/view/wave/math/entities/check/update/render/input/main/initialization globals. `initialize()` builds settings, scales `#canvas`, loads highscores, calls `setStartScreen()` and installs input. `init()` restores or creates `MainHex`, falling `blocks` and `waveone`. `animLoop()` switches global `gameState`, calls render/update and schedules RAF. `Hex.rotate()` changes six-side orientation; `doesBlockCollide()` settles blocks. `floodFill()`/`consolidateBlocks()` connect same-color neighbors and award squared group-size times combo multiplier. `waveGen` cycles random, double, crosswise, spiral, circle and half-circle patterns. DOM anchors include `#startBtn`, `#pauseBtn`, `#restartBtn`, `#restart`, `#openSideBar`, `#helpScreen`, `#inst_main_body`, `#overlay` and score containers.

## Gameplay and controls

Start, rotation with left/right or A/D, down/S speed-up, P/Space pause and Enter start/restart are explicitly wired. Touch/mouse body-side handlers rotate the hexagon. Matching three or more touching same-color blocks clears them; stack count beyond settings.rows ends the game. Game-over displays current/top-three scores and restart. Pause uses state -1 with resume transition delays; start state is 0, running 1 and game-over 2. Button markup is native, but event bindings often remain mouse/touch-only. No audio implementation was found in the game logic.

## State and persistence

Globals own `MainHex`, `blocks`, `waveone`, `history`, score/settings and timing. Keys are **`saveState`** and **`highscores`**. `exportSaveState()` deep-copies/des-scales objects and uses JSONfn to serialize functions, then `init()` revives them. Saves occur during block drawing/deletion and unload; highscores retain three values. RAF continues during pause/end to render visual state. Blur calls pause. Storage reads/writes lack a unified failure boundary; only highscore JSON parsing has a catch, not shape validation.

## Dependencies and provenance

GPLv3 text is present in [LICENSE.md](../../../Games/Hextris/LICENSE.md). Prior evidence records upstream `https://github.com/Hextris/hextris`, pin `3f4847dc8fd7dab3d1c87e6324b9159d92fbd396`, authors Logan Engstrom, Garrett Finucane, Noah Moroze and Michael Yang, and GPLv3-or-later from the collected README. This run checked local license/evidence, not remote revision. jQuery and Apache-2.0 Keypress are local; JSONfn is inherited from the upstream tree. The historical wiki's removed remote Hextris is not this source port. Keep old evidence but do not reuse its native pass as current verification.

## Audit findings

- **HIGH**, `js/main.js`, `init()` to `JSONfn.parse(saveState)` and `vendor/jsonfn.min.js`, prefix `function`: same-origin persisted strings revive through eval. This is a traced executable-save path, not an eval keyword-only XSS verdict; no remote input exploit is established. Minimal architectural repair: persist plain state and reconstruct Hex/Block/waveGen instances from validated fields, with a nonexecuting legacy migration. Keep old saves backed up until migration is tested.
- **HIGH**, `main.js` restore and `save-state.js` writes: corrupt JSON or denied storage can abort initialization/rendering. Catch/validate at shared persistence boundary and offer fresh-game recovery without silently discarding best scores.
- **MEDIUM**, `input.js`/`initialization.js`, `mousedown` or `touchstart` on native Start/Pause/Restart buttons: keyboard-generated click activation is not wired. Root fix: use native click for shell actions, separate from body-side rotation and avoid duplicate scoring/input.
- **MEDIUM**, `view.js`, `pause()` updates only button `src`: these are buttons, not images; visible Pause text does not become Resume. Prior evidence also records mobile label overflow and stale Help/store copy. Confirm current images before final UI judgment.
- Non-finding: `showHelp()` inserts fixed constructed instructional HTML, not identified untrusted text. Do not label it XSS from `.html()` alone.

## Safe iteration

Preserve hex rotation, adjacency/combo rules and GPL notices. Persistence redesign requires concrete migration fixtures and source instance reconstruction, not replacing the engine. Wrapper event/text fixes should retain body-side controls and one RAF. This task is docs-only; WONTFIX/registration/rights decisions belong to Main/owner.

## Verification

Actually run: seventeen JS files passed Git-blob STDIN syntax checks, including vendors; no native/browser runs or screenshots here. Repeat `git show HEAD:Games/Hextris/js/main.js | node --check`. Main owns any narrow lease. Recommended: click versus Enter/Space actions, left/right touch, pause/resume, saved partial stacks, malformed save/highscore shape, storage denied, combo clearing, overflow/game-over/restart, high-DPI resize and mobile labels. The earlier port page explicitly separates targeted checks from its failed full gate; neither certifies this baseline.

## Future outlook

Week 1: save execution/recovery design and legacy consumer trace. Week 2: native shell activation, truthful Resume labels and Main screenshot review. Later: trim unused image-era selectors only after consumer evidence; inspect reduced-motion and timing on hardware. Registration and new features remain held, not promised for the month.

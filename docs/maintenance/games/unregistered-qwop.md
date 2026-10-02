<!-- maintenance-game: Games/QWOP -->
# QWOP maintenance

## Identity and status

**Unregistered**, no current catalog id/category; entry `Games/QWOP/index.html`. Baseline `8c8a055` contains one 18,549-byte file. It is a standalone QWOP-style local implementation, not verified as Bennett Foddy's original game. Historical id 15 was removed and must not be reused. Owner keep/remove and rights decisions remain pending; this audit does not register, replace or delete the folder.

## Implementation map

Source review coverage: complete HTML, inline CSS and inline JavaScript. No hidden/minified/binary engine or external asset dependency is present. `#gameCanvas` is fixed at 800 by 400 inside `#gameArea`. HUD IDs are `#distance`, `#best`, `#finalDistance`; overlays/buttons are `#gameOver`, `#restartBtn`, `#helpModal`, `#helpBtn`, `#closeHelp`; `.key[data-key]` divs serve mouse controls.

`calculatePositions()` derives thigh/calf endpoints and head position. `updatePhysics()` applies held-key angular force, damping, gravity, bounds, ground-contact movement and fall detection. `draw()` follows the camera and draws line-body/ground/markers. `gameLoop()` computes positions, updates physics, draws and schedules RAF. `endGame()` reports distance and writes best; `reset()` reconstructs the runner/camera and clears the result overlay. This is a small custom approximation, not evidence of original QWOP physics or upstream permission.

## Gameplay and controls

Play auto-starts after `reset()`. Q and W drive left/right thigh force; O and P drive left/right calf force. Keyboard listeners prevent default for these keys. Mouse down/up/leave on `.key` divs sets the same pressed flags. No touch/pointer listeners or native-button semantics exist for those divs. Distance is the maximum horizontal hip displacement divided by ten; either foot contacting the ground alone adds forward velocity. Excess torso tilt or low head ends the run. Try Again or R after game-over resets; there is no finite finish line or win condition. Help opens via `#helpBtn` and closes by Got it, backdrop or Escape, but does not pause simulation. There is no audio.

## State and persistence

Globals hold runner joints/velocity, camera, distance, `gameRunning`, `keysPressed`, ground points and `bestDistance`. Save key **`qwop_best`** is read with unguarded localStorage access and `parseFloat`; a nonnumeric value displays NaN and suppresses future comparisons. `endGame()` writes storage without handling failure. RAF continues drawing when physics stops. `reset()` does not clear pressed keys. No blur/visibility release exists, so changing focus while holding a key can leave it active after return.

## Dependencies and provenance

The one-file tree has no LICENSE, CREDITS, source URL, upstream revision or author notice establishing redistribution rights. The title/copy alone cannot establish provenance. Historical `docs/GAMES.md` describes a QWOP-style orphan pending disposition; that is status evidence, not license permission. Font stack names Geist but loads no font asset; it falls back to local platform/system fonts. Canvas/CSS/input/storage APIs are the only inspected runtime dependencies; no network request is authored.

## Audit findings

- **HIGH**, entry script at `localStorage.getItem('qwop_best')`: blocked storage can abort startup before `gameLoop()`. Nonnumeric/Infinity data is not validated. Recommended repro: storage access denied; then corrupt value and reload. Minimal fix: one guarded finite-nonnegative read/write boundary, preserving usable best data.
- **MEDIUM**, `.key` event wiring, `mousedown` only: mobile input and keyboard activation of visible controls are absent. Use native buttons/pointer events with release/cancel ownership while preserving normal muscle flags.
- **MEDIUM**, `reset()`/document keydown/up: held state survives reset and focus loss. Clear the shared input map on reset/blur/hidden, not in each physics limb.
- **MEDIUM**, CSS `canvas` 800px, `.game-container` 40px padding, `overflow:hidden`: narrow displays can crop the board and controls. Scale canvas presentation and let shell content scroll; verify hit areas before asserting a mobile fix.
- **MEDIUM**, `#helpModal`: visible-class modal lacks dialog semantics/focus management and hidden content remains focusable. Add native dialog behavior or explicit focus/hidden-state handling; simulation pause must be an intentional decision.

## Safe iteration

Do not polish an unlicensed orphan into a newly approved game. First establish owner intent and source/license evidence. If maintenance is approved, change persistence/input/layout boundaries with a tiny regression, preserving this implementation's one-RAF lifecycle. Do not claim original-game authenticity or replace it with another fabricated port. No deletion without tracked consumer trace.

## Verification

Actually run: extracted inline script passed STDIN `node --check`; browser/native runs **zero**, no screenshots. Reproduce extraction with Python HTMLParser before checking; do not feed HTML itself to Node. Main alone may lease this file for recommended tests: Q/W/O/P input, mouse and actual touch, fall/result, R/button restart, held-key focus loss, denied/corrupt save, modal Tab/Escape and 320px clipping. Unregistered files are outside the registered full smoke gate.

## Future outlook

Week 1: rights/keep decision and storage/input-release triage. Week 2 only if retained: native actions, responsive shell and accessible Help with Main desktop/mobile review. Later: measured elapsed-time physics rather than frame-count dependence. New muscles, stages, original-game branding claims and registration are deferred.

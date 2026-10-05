# Joust play-flow audit (batch 4)

Identity: registered id 162, entry `Games/Joust/index.html`, entry blob `db6ed5bf4b86c7a975cf38ee7158b53c367aa722`, tree `7f621c09078aca1c3838b5099e5a6eba9fe62412`, 4 files, 1,205,691 bytes. Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Maintenance manual `docs/maintenance/games/162-joust.md` read for orientation; all claims below re-checked against baseline source with `git show`.

Validation status: **CODE-REVIEW ONLY**. No browser run, no screenshots, no engine execution by this worker.

## Source inspected

- `Games/Joust/index.html` (4,877 bytes): full read. Wrapper script anchors: `waitForScene()` polls `window.joustGame.scene.getScene("JoustScene")` up to 200 x 100ms then `scene.scene.resume()`; `fireKey(type, keyCode, code)` builds `KeyboardEvent` with patched `keyCode`/`which`; `padKeys` maps `btn-left`/`btn-right`/`btn-flap` to ArrowLeft/ArrowRight/Space; `#restartBtn` calls `window.location.reload()`.
- `Games/Joust/bundle.js` (blob `a555dd992897f9fcbae911bc5d77a908dccae96d`, 1,194,707 bytes): first ~400 bytes read (webpack IIFE header) plus whole-file token grep. Counts at baseline: `handlePlayerEnemyCollision` 3, `handleCollision` 1, `JoustScene` 1, `scene.pause()` 1, `spawnAwayFromPlayer` 2, `learnFromDefeat` 1, `successRate` 2, `localStorage` 6, `requestAnimationFrame` 7, `Game Over` 1, `Lives` 2, `Score` 2, `new AudioContext` 1. Single `handleCollision` occurrence is consistent with a call site only and no definition in the bundle.
- `Games/Joust/LICENSE-MIT.txt` (blob `0d4666f91d272fce4b595a5a7552ba6d1925a0c8`): first 5 lines read, MIT grant naming Christian Schladetsch. `bundle.js.LICENSE.txt` inventoried by name only.

Held: the minified Phaser engine interior and the full game-tail module body were not read line by line. The manual reports extracting the tail class; this worker only re-verified the token anchors above. Engine internals are held.

## Flow (visible wrapper vs opaque engine)

- Boot: page loads `bundle.js`, last module creates an 800x600 Arcade Physics game exposing `window.joustGame`; wrapper `waitForScene` resumes `JoustScene` (auto-start, no landing screen).
- Start/setup: no authored start screen; header text `header.page-head h1` "Joust" plus a static instructions paragraph.
- Input: keyboard arrows/space in the minified player class (`createCursorKeys`, `JustDown` per manual); wrapper touch buttons dispatch synthetic keydown/keyup; Escape requested to restart per header copy (engine-side handling not re-verified).
- Core loop: Phaser RAF/physics, **opaque, held**. Do not infer flap cadence or enemy AI beyond the named anchors `patrol`/`attackPlayer`/`evadePlayer` (anchors reported by manual; `spawnAwayFromPlayer`/`learnFromDefeat` re-counted here).
- Score/progression: scene text objects `Score`/`Lives` exist in the bundle; intended award of 100 per defeated enemy comes from manual orientation, not re-traced this run.
- Win/lose: `Game Over` string exists; three-life outcome **not verified**, and the collision defect below can make the scored path unreachable. UNKNOWN pending runtime.
- Restart: `#restartBtn` reloads the page (verified in wrapper source).

## UI bloat classification: MILD

Persistent, non-game elements: `header.page-head` with `h1` "Joust" and a 2-sentence instructions paragraph, always visible above `#game-wrap`; `#restartBtn` fixed top-right (hidden until scene found). Genuine game UI: `#touch` pad with `#btn-left`/`#btn-flap`/`#btn-right`, shown only under `@media (pointer: coarse)`; keep. No ads, no promotional cards, no decorative animation in the wrapper.

## Popup/modal inventory

None authored in the wrapper. No modal, no repeat nag. Engine `Game Over` prompt is internal canvas text, not a DOM modal.

## Animation/simulation

Wrapper performs no animation. Engine loop is Phaser RAF plus physics (opaque, held). Do not read the renderer RAF as evidence of model animation.

## Findings

- HIGH: `bundle.js`, `handlePlayerEnemyCollision` calls `handleCollision` but the token grep finds no definition; a real player/enemy overlap can throw instead of resolving the joust. Root: game-tail collision wiring. Fix: recover matching authored collision source and rebuild; do not hand-edit the compiled bundle. Native repro needed.
- HIGH: `bundle.js` game tail calls `scene.pause()` inside scene `create`, while the wrapper resumes exactly once; an Escape-triggered scene restart can re-pause with no second resume. Root: scene lifecycle vs `waitForScene`. Fix: authored lifecycle change or a bounded wrapper bridge after runtime confirmation.
- MEDIUM: `successRate` `localStorage` reads are unguarded (6 `localStorage` tokens in bundle); denied storage can break enemy setup. Fix: guarded accessor with default.
- No fix needed: touch pad, restart button and static header are small and non-blocking.

## Recommended playable view

Keep the canvas, `#touch` pad, `#restartBtn`, score/lives. Fold the `header.page-head` instructions paragraph into a one-time acknowledged help overlay with optional reopen; keep only the `h1` title line if desired. No recurring popups exist to remove.

## Smallest browser check still needed

Load the page, force a player/enemy overlap from above, capture console exception (tests `handleCollision`), then press Escape twice and confirm the scene still runs, then press Restart. Cold storage-denied load is the follow-up check.

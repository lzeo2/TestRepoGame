# Frogger (id 216) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 216, registered, directory `Games/Frogger/` (10 files, 68,024 B).
- Entry: `index.html`, blob 2fc6bbd9d5d8ccc1ddf4a27c2a380edbcc73c262, tree dab0c6795a0cbb0e1e92cd61994f0df89d1c89ea.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. CREDITS/README/LICENSE present in tree (attribution files, not re-read here).

## Source inspected
- `index.html` read in full: `#hud > h1 + p` (controls text: arrow keys / on-screen pad), `#container > canvas#game` (320x480, `touch-action:none`), scripts `engine.js` then `game.js`.
- `game.js` blob 0857c2befeba0d425681791ee1274342c1f55ff9, 8,601 B: read lines 1-120 plus full function index. Inspected: `window.addEventListener("load") -> Game.initialize("game", sprites, startGame)`, `sprites`/`enemies` tables, object type constants (`OBJECT_FROG/TRUNK/CAR/WATER`), `MAX_FROG_LIVES = 3`, `FROG_SCORE`, `TIME_TO_WIN = 10`, `startGame`, `playGame` (builds `GameBoard` with `Spawner`, `Frog`, `Water`), `winGame` (score +100, `TitleScreen("You win!", "Press the up arrow to play again", playGame)`), `loseGame` (`TitleScreen("You lose!", ..., reset score)`), `Background.draw` (paints `Score:` / `Lives:` text), `Frog` sprite with `step(dt)` countdown (`remainingSecs`, `startDying()`), key handling via `Game.keys['up']` etc. Remainder of `game.js` (lines ~121-~250, `Frog.step` body, Spawner/Water/car logic) partially held.
- `engine.js` blob 9a807711fce0b7551c9cd2fbba45d1209defbb82, 11,608 B: NOT read. Game loop/RAF, key binding, `GameBoard`/`Sprite`/`TitleScreen` implementations are HELD pending a next pass.

## Flow
- Boot: load -> `Game.initialize("game", sprites, startGame)` (engine details held).
- Start: `startGame` -> `Background` board -> `playGame()` adds `Spawner`, `Frog`, `Water`.
- Input: arrow keys through `Game.keys[...]` (`up` moves frog, hop step timing `timeToStep 0.25s`); header claims an on-screen pad for touch - the pad element is NOT in `index.html`, so its existence is HELD (likely inside `engine.js`).
- Core loop: sprite `step(dt)` updates (frog hop animation, car/trunk spawns, countdown), collision via typed objects (engine details held).
- Score/progression: `FROG_SCORE` drawn in `Background.draw`; 3 lives; `TIME_TO_WIN = 10` second per-hop countdown shown as `Remaining time:`.
- Win/lose: `winGame()` / `loseGame()` TitleScreens.
- Restart: "Press the up arrow to play again" on the title screen (engine `TitleScreen` callback; held body).

## UI bloat classification: MILD
- Persistent: `#hud > h1` game title + `#hud > p` full instructions paragraph on every visit. Genuine HUD text (score/lives/time) is drawn on canvas, not DOM.
- No ads/modals/popups in wrapper.

## Popup/modal inventory
- None in DOM. Canvas `TitleScreen` win/lose cards are genuine game states (result + restart), not nags.

## Animation/simulation
- Model animation: `Frog.step(dt)` with `steppingTime/animating/frame` state and `Background.step`/sprite stepping - real per-object state updates scheduled by the engine's loop (RAF location inside held `engine.js`). Not decorative renderer animation.

## Findings
1. (Medium) Header claims "On touch, use the on-screen pad" but no pad exists in `index.html`; if `engine.js` does not create touch controls, touch users cannot play (AGENTS requires keyboard AND touch). Necessary fix if confirmed: add/verify a touch pad. Held pending `engine.js` inspection.
2. (Low) Persistent `#hud p` instructions should become one-time acknowledged help in a future change. No fix now.
3. (Info) `MAX_FROG_LIVES`/`FROG_SCORE` are module-level globals mutated across rounds (`loseGame` resets score but lives handling held) - verify reset semantics in the next pass.

## Recommended playable view
- Keep canvas HUD text (score/lives/time), title-screen restart, and a touch pad if present; move `#hud p` copy to one-time help.

## Validation status
CODE-REVIEW ONLY. Smallest needed check: browser-load, arrow-key hop, verify touch pad presence, reach win/lose, press up to replay.

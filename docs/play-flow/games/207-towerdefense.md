# Play flow audit: Tower Defense (id 207)

## Identity / baseline

- Registered `games.json` id 207, url `Games/TowerDefense/index.html` (verified; 116 entries).
- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (5 files, 56,492 bytes).
- Maintenance document basename: `docs/maintenance/games/207-towerdefense.md`.
- Provenance: `CREDITS.md` (blob `6c9549545df83a1812d52287a7feb2578d40bcea`) - upstream `github.com/oldj/html5-tower-defense`, MIT, commit `e3e009c7673121e98d6ff02c85fb442c774b6391`, ingested 2025-09-24; `td-pkg-en-min.js` shipped unmodified.

## Source inspected

- `Games/TowerDefense/index.html` blob `67e32e7ab64fb8dba6b579a94ceabb401263ccc7` read completely (55 lines): `<h1>Tower defense</h1>`, `#howto` instruction paragraph ("Pick a tower in the panel on the right ... Press start to send the next wave ... Works with touch too."), `#td-loading` "Loading...", `#td-board` with `canvas#td-canvas`, `#about` attribution; `window.onload` calls `_TD.init("td-board", true)`, hides loading, shows board; inline touch glue translating `touchend` -> `MouseEvent("click")` on the canvas.
- `Games/TowerDefense/td-pkg-en-min.js` blob `cda72395ad1ac0c76c85507c2e3b690027b79549` inspected partially: minified single-file engine (51,080 B); head region read (approx first 1.5 KB): `_TD` object with `init/start/checkCheat` skeleton, `version "0.1.17"`, `is_debug: !!i` (wrapper passes `true`), `is_paused`, `stage`/`Stage("stage-main")`, `eventManager`, canvas wiring `onmousemove`/`onclick` -> `getEventXY` -> `t.click/hover`, `step()` loop with `exp_fps` targets (24/12/6/4).
- Held: remainder of `td-pkg-en-min.js` (minified, ~50 KB) not read end-to-end: tower/monster stats, wave scheduling, money/upgrade rules and win/lose conditions are **UNKNOWN** in detail.

## Flow

- Boot: `window.onload` -> `_TD.init("td-board", true)` -> `_TD.start()` (engine), loading text swapped for board. Debug logging is on (`is_debug` true) because the wrapper passes `true`.
- Start/setup: per wrapper text, pick a tower in the right panel and click a grass tile to build; click a built tower to upgrade/sell; "start" button sends the next wave (wrapper text; button DOM is created by the minified engine, exact selector **UNKNOWN**).
- Input/core loop: mouse click + touch (wrapper touch glue); engine `step()` RAF/timer loop advancing monsters along a path at `step_time`/`global_speed` (head-region evidence only).
- Score/progression: money/lives/waves in engine (**UNKNOWN** detail).
- Win/lose: "do not let monsters reach the exit" per wrapper; exact lose/win state functions **UNKNOWN** (minified).
- Restart: no wrapper restart control; engine behavior **UNKNOWN**.

## UI bloat classification: MILD

- Persistent authored chrome: `h1` "Tower defense", `#howto` (one full paragraph of rules, persistent on every visit), `#about` attribution line, `#td-loading`. `h1`+`#about` are static header/footer, `#howto` duplicates what a one-time help should say.
- Genuine game UI: tower panel/HUD/canvas created by the engine (**UNKNOWN** selectors) - do not hide headers inside the canvas blindly.
- Popups: none authored in wrapper; engine alerts/menus **UNKNOWN**. `is_debug true` likely emits `s.log` console noise (LOW).

## Animation / simulation

- Engine `step()` loop (observed `_TD.step`, `exp_fps` 24 target, `last_iframe_time` timing) updates monster/tower state and redraws `#td-canvas` with `devicePixelRatio` scaling (`_TD.retina`). Model-level animation detail held (minified).

## Findings

1. MEDIUM - `#howto` rules paragraph is persistent page copy above the game; per house guidance instructions belong in a one-time acknowledged help (optional reopen). Fix: collapse `#howto` to a Help toggle in `index.html`; keep `#about` and `h1`.
2. LOW - `_TD.init("td-board", true)` enables debug mode (console logging). Fix: pass `false` once behavior is verified, unless the manual documents debug output as intentional.
3. LOW - Engine restart/game-over path not evidenced; a browser pass must confirm a reset path exists (no wrapper restart button today).

## Recommended playable view

Keep `#td-board`/`#td-canvas` and all engine HUD/panel/touch affordances. Keep `h1` + `#about`. Move the `#howto` paragraph into a one-time help dialog (acknowledged, reopenable). No popups to add; none to remove in wrapper.

## Validation

CODE-REVIEW ONLY. Smallest needed check: bounded local load, build one tower, start a wave, confirm lose/win and a restart path, capture desktop + 360px screenshots.

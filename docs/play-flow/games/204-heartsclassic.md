# Hearts Classic (id 204) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 204, registered, directory `Games/HeartsClassic/` (36 files, 213,581 B; meta author "Yao Yujian").
- Entry: `index.html`, blob f0450627361bd3861cff9ef0305633ba3102574f, tree 7a88aac85017a94e4dcff90249a67f49a61a66a8.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`.

## Source inspected
- `index.html` read in full: `#main-button-group` (`New Game`, `#settings-but`), `.howto` paragraph, `#game-region`, `#control-region > #settings-dialog` (player names `.player-set-name`, difficulty inputs `.player-diff` 1-4, `Back`/`Apply` buttons), loader `js/main` via require.js.
- `js/main.js` blob 700e78aee03752fce6c025e95cc1fe7b87a9105e (1,542 B) read in full: require config (baseUrl `js`, jquery lib), layout init, `#control-region` button handlers (hide/Apply writes `config.names`/`config.levels` + `config.sync()`), `New Game -> confirm("This will end the current game. Are you sure?") -> game.newGame()`, `#settings-but -> show #settings-dialog`, finally `game.newGame()` on load (auto-start).
- `js/game.js` blob 9b25a14ec34a8bd7805ed19ebfda69b002cb4c3f (8,780 B): AMD module head + first ~80 lines read: `players` array `Human(0)` + three `Ai`, `status`/`heartBroken`/`rounds` state, `initBrains()` mapping `config.levels` 1-4 to `SimpleBrain`/`AsyncBrain(McBrain)`/`AsyncBrain(PomDPBrain)`/`PomDPBrain{time:2000}`, `informCardOut` (heart-break on suit 1), `getPlayerForTransfer` (pass rotation), exports start with `adjustLayout`. Rest of `game.js` (round/play/scoring functions) HELD.
- Tree has `js/board.js`, `js/rules.js`, `js/ui.js` (implied by define), `js/domBinding.js`, `js/config.js`, brain modules - NOT read: HELD.

## Flow
- Boot: require.js -> `main.js` -> layout/domBinding -> `game.newGame()` auto-start.
- Start/setup: `New Game` (confirm dialog) or Settings (names/difficulty, Apply persists via `config.sync()` - localStorage handled inside held `config.js`).
- Input: click a card to play (per `.howto`); layout modules map clicks (held `ui/domBinding`).
- Core loop: AMD game state machine (`status`, `currentPlay`, `heartBroken`) + brain workers for AI; details HELD.
- Score/progression: rounds-based hearts scoring (`rounds`, pass rotation, heartBroken flag) - round scoring bodies HELD.
- Win/lose: not verified in inspected ranges - HELD (likely round/score summary in `ui`).
- Restart: `New Game` button -> `game.newGame()` after native `confirm()`.

## UI bloat classification: MILD
- Persistent: `.howto` paragraph under the buttons every visit (genuine onboarding copy but recurring).
- Genuine game UI: `#main-button-group`, `#game-region` table, `#settings-dialog` (settings, user-triggered).
- No ads/decorative cards found.

## Popup/modal inventory
- Native `confirm()` on New Game (recurring only on explicit user action) - blocks until answered; consider in-game confirm later.
- `#settings-dialog` inside `#control-region`: shown by Settings button, hidden by Back/Apply. Not a nag.
- No other dialogs in inspected source.

## Animation/simulation
- Card flip animation asset `img/flip.png` exists; actual animation/render loop in held `ui/layout` modules. RAF/loop location: HELD - do not claim.

## Findings
1. (Low) `.howto` persists on every load; fold into one-time help in a future change. No fix now.
2. (Info) AI brains run via workers (`BrainWorker.js`, `AsyncBrain`) with `PomDPBrain` 2s think time at level 4; runtime responsiveness needs a browser check. HELD.
3. (Info) Large held surface: `game.js` remainder, `board.js`, `rules.js`, `ui.js`, `config.js` - no complete-review claim.

## Recommended playable view
- Keep button group, `#game-region`, settings dialog, status/score displays the UI module renders; move `.howto` to one-time help.

## Validation status
CODE-REVIEW ONLY. Smallest needed check: browser-load (auto game starts), play one card following suit, complete a round with score display, New Game restart, Settings apply.

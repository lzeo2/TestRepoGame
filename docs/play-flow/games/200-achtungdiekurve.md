# Achtung die Kurve — play-flow audit (batch 1)

- Identity: catalog id 200, registered. `Games/AchtungDieKurve/`, entry
  `Games/AchtungDieKurve/index.html` (blob `bf90c7f1aad910a6a43dba4ace602d735879c82c`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 6 files / 28,652 B.
  Authors named in entry meta: Mathias Paumgarten, David Strauß (`CREDITS.md`,
  `LICENSE` present, not read).
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` (blob above), read fully. Setup UI: `#rightColumn` with
  `#addPlayerContainer` (`#playerNameInput`, `#playerControlsSelect`,
  `#addPlayerButton`), `#playerListContainer`/`#playerList`,
  `#startGameContainer`/`#startGame`. Play field: `#leftColumn` containing
  `#canvas`, `#helpContainer` (long Help text, class `show` initially),
  `#upgradeContainer` (no-canvas fallback, class `hide`).
- `javascripts/script.js` (blob `eaf46563a93657a1fc90dec3e99cae7a1ad704ce`,
  335 lines), partial: lines 1-120 read verbatim + binding grep. Real names:
  `listOfControls` key pairs (37/39, 65/83, 71/72, 75/76), `game = new Game(...)`,
  `handleKeyDown`/`handleKeyUp` → `setCurrentDirection` → `processCurrentDirections`
  on `setInterval(processCurrentDirections, 1000 / numberOfDirectionProcessesPerSecond)`,
  `handleStartGameClick` (shows `#canvas`, hides `#startGameContainer` and
  `#helpContainer`, `game.start()`, `game.startSession()`), `activateControls`,
  touch listeners on `domCanvas` lines 326-329 (`touchstart/move/end/cancel`).
- `javascripts/adk.minified.js` (blob `bd7d893305e1b46bc6cd5f937869262d1f018ec0`,
  7,926 B, minified): head only (about 600 bytes: `ColorManager` HSV→hex line
  colours). Rest held — it is the `Game` engine.
- Held: `stylesheets/style.css`, `CREDITS.md`, `LICENSE`, remainder of `script.js`
  (lines 120-335) and all but the head of the minified engine.

## Flow (from source)

- Boot: entry renders setup column; `#helpContainer` Help panel visible first.
- Start/setup: type name, pick key pair, `#addPlayerButton` → `#playerList`;
  with players present `#startGame` appears → `handleStartGameClick` starts
  engine + direction pump interval.
- Input/core loop: keydown/keyup map to per-player direction −1/0/1; every
  `1000/n` ms `game.handleControl(playerID, direction)`; touch zones handled by
  `handleTouchChange` (lines 326-329).
- Score/progression/win-lose: page copy states survival = 1 point per player
  survived, contact with line or border eliminates. The implementation lives in
  the held minified `Game` class — **treat engine rules as partially verified,
  pending full engine read**.
- Restart/exit: not visible in inspected ranges of `script.js` (session restart
  likely later in file) — held.

## UI bloat: MILD

- Persistent `#helpContainer` Help essay (Introduction/Getting started) shown
  before play, hidden by `handleStartGameClick` — one-time setup help, genuine.
- `#rightColumn` setup form is the genuine game menu (players, key pairs).
- `#upgradeContainer` is hidden unless canvas unsupported (real fallback).
- No decorative cards, no recurring popups seen.

## Popups / modals

- None. `#helpContainer`/`#startGameContainer` toggle via `className`
  `show`/`hide`; no alert/confirm in inspected ranges.

## Animation / simulation

- Canvas engine inside `adk.minified.js` (held); the visible loop is the
  direction `setInterval` pump in `script.js`, i.e. real model input, not a
  decorative RAF. Renderer details held.

## Findings

- MEDIUM — engine + restart logic held (`adk.minified.js` uninspected beyond
  head; `script.js` lines 120-335 unread). Claims about scoring/round end come
  from page copy only and must not be certified until the engine is read.
- LOW — controls reference on the page duplicates Help text (`.p` in
  `#rightColumn` and `#helpContainer`); harmless duplication, fold into one
  help panel if touched.

## Recommended playable view

Keep `#rightColumn` setup menu, `#canvas`, HUD produced by engine. Move the
`#helpContainer` essay to a one-time acknowledged help with reopen. No ad/info
popups present.

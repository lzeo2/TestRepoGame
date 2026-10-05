# A Dark Room — play-flow audit (batch 1)

- Identity: catalog id 51, registered. `Games/ADarkRoom/`, entry
  `Games/ADarkRoom/index.html` (blob `d425fb85f827f8863549d18dd032dea564d76c6e`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 180 files / 7,141,869 B.
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` (blob above), read fully: script stack (jQuery libs, `script/Button.js`,
  `audio.js`, `engine.js`, `state_manager.js`, `header.js`, `notifications.js`,
  `events.js`, `room.js`, `outside.js`, `world.js`, `path.js`, `ship.js`, `space.js`,
  `fabricator.js`, `prestige.js`, `scoring.js`, event modules, `localization.js`),
  CSS stack (`css/main.css` … `css/space.css`, `fabricator.css`). DOM: `#wrapper`,
  `#saveNotify`, `#content`, `#outerSlider`, `#main`, `#header`. Language loader
  whitelists `?lang=` against `langs.js` before `document.write`.
- `script/engine.js` (blob `e3bf19671854be0ea5eec5833de9cd0d88b118b4`, 942 lines),
  partial: structure grep + selected ranges. `window.Engine` object, `Engine.init`,
  `Engine.loadGame`, `Engine.switchLanguage`, a `setInterval(callback, interval,
  skipDouble)` wrapper (line 834-840), menu construction appending to `#header`,
  `window.open` share links (GitHub, App Store, Google Play, Facebook, Google+,
  Twitter, Reddit) around lines 200-503.
- Held, not inspected (180 files total; only entry + partial engine read):
  all of `script/` beyond `engine.js` ranges (game content: `room.js`, `outside.js`,
  `world.js`, `path.js`, `ship.js`, `space.js`, `events/*`, `scoring.js`,
  `prestige.js`, `notifications.js`, `state_manager.js`), all `css/`,
  `lib/`, `lang/`, audio.

## Flow (from source; engine depth held)

- Boot: jQuery → script stack → `Engine.init` builds `#header` menu and loads
  saved state (`Engine.loadGame`) or starts fresh `window.State = {}`.
- Start/setup: text-adventure loop driven by per-module `Engine.setInterval`
  timers (fire, gather, events); exact tick wiring held in uninspected modules.
- Input: button/DOM clicks via `script/Button.js`; swipe/touch via vendored
  `jquery.event.swipe.js`/`move.js` (loaded, body not read).
- Score/progression: `script/scoring.js` and `prestige.js` exist; contents held.
- Win/lose: ship/space endgame and death events exist as files
  (`script/ship.js`, `script/space.js`, audio `ending.flac`, `death.flac`);
  exact triggers **UNKNOWN — held pending engine/runtime review**.
- Restart/reset: state persistence through `state_manager.js` (held).

## UI bloat: UNKNOWN (leaning MILD from entry)

- Visible wrapper only: `#header` menu, `#content`/`#outerSlider` panes,
  `#saveNotify` status strip, corner `.logo` link (external, user-initiated).
- Full UI inventory requires the held `script/` modules.

## Popups / modals

- `#saveNotify` save toast (genuine feedback). Menu built in `engine.js`
  includes share options that `window.open` external sites (user-initiated,
  one action each; the Google+ URL is dead). No recurring ad/info popups seen
  in inspected ranges; event-module dialogs held.

## Animation / simulation

- Timer-driven text/DOM updates via `Engine.setInterval` wrapper; jQuery color
  transitions (`jquery.color-2.1.2.min.js`) for fades. No canvas renderer seen.
  Full simulation held.

## Findings

- MEDIUM — `engine.js` share menu opens external URLs (`window.open` to
  `facebook.com`, `twitter.com`, `reddit.com`, `itunes.apple.com`,
  `play.google.com`, dead `plus.google.com`). User-initiated only, but it is an
  offline-policy edge: clicking leaves the origin. Root: `script/engine.js`
  ~lines 200-503. Fix if desired: drop or localize the share block; do not
  touch game logic.
- Held — all gameplay/progression/win-lose logic uninspected; this report makes
  no claim about rules, death, or ending behaviour.

## Recommended playable view

Not actionable until the held `script/` modules are reviewed. Preserve
`#header` HUD and menus; only after review decide whether share links and the
persistent `.logo` corner link stay.

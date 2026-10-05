# Fireboy and Watergirl (id 127) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 127, registered, directory `Games/FireboyAndWatergirl/`.
- Entry: `Games/FireboyAndWatergirl/index.html`, blob `5176b352669bdcf50bde0a6ba5c759e2fc382c5e` (matches inventory `entry_blob`), tree 500a4be0b9dbfd2d81e3c4441bf1f5e6178c039a, 137 files.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Branded title in page is "Fireboy & Watergirl 2 Light Temple"; no assumptions drawn about upstream rules or licensing from the title.

## Source inspected
- `index.html` (2293 B) read in full: `#root > #container/#hammer/#debug-fps`, `bower_components/requirejs/require.js`, cache-buster `addScript('version.js', ...)` then `require(["fireboy-and-watergirl-light-temple.min.js?v=" + version])`, `gameName = "fireboy-and-watergirl-light-temple.min.js"`.
- Tree listing via `git ls-tree`: `main.min.js` (blob 5f112a6a95e1ccbc3bb48c2cff118806216cf17a), `game.json`, `assets/ bower_components/ data/ js/ json/ images/`, `version.js` (980bd7c8a97cddbb82e700133f40f5fa8665f402), `source.txt` (b3156b4f).
- Bundle `fireboy-and-watergirl-light-temple.min.js`, blob c40bc253f4546195b1b281feddabe25c3a2f7c17, 1,936,412 B: NOT read (compiled/minified RequireJS bundle).

## Held
- All engine mechanics inside the minified bundle: gameplay loop, level progression, win/lose, controls, save state are **UNKNOWN pending engine/runtime review**. Only the wrapper entry above is verified from source.

## Flow (from visible wrapper only)
- Boot: `index.html` -> require.js -> loads `version.js` -> `require([bundle])` into `#container`.
- Start/setup, input, core loop, score/damage, win/lose, restart: **UNKNOWN** (inside opaque bundle).
- Exit: none visible in wrapper (embedded canvas game).

## UI bloat classification: MILD
- Persistent: `#debug-fps` debug div always in DOM (only meaningful if bundle writes it), `#hammer` unknown purpose inside bundle.
- No title cards, ads or modals in the authored wrapper. Engine-side menus are opaque; cannot classify without runtime review.

## Popup/modal inventory
- None in authored wrapper. Any engine menus: UNKNOWN.

## Animation/simulation
- Wrapper has no RAF/loop of its own; renderer and any model animation live inside the bundle: OPAQUE/HELD. Do not read `#debug-fps` presence as an animation loop.

## Findings
1. (Info) Compiled bundle blocks source-level gameplay audit. Severity low for portal operation; no fix within this report - a bounded runtime review is the necessary step.
2. (Info) `body` has typo `overlfow: hidden` in inline style; harmless because CSS default still applies, but the intent (no scroll) is not enforced. Fix: correct the property if a wrapper touch-up is ever authorized. No fix recommended in this docs-only pass.

## Recommended playable view (for a later change pass)
- Keep `#container` canvas, any engine HUD/touch controls and start/restart path the runtime reveals.
- Wrapper itself adds nothing to remove; `#debug-fps` could be hidden in a future authorized wrapper change.

## Validation status
CODE-REVIEW ONLY. Smallest needed check: load `Games/FireboyAndWatergirl/index.html` in a browser, confirm boot past `version.js`, reach a start/play state, and record actual controls, HUD and restart behaviour. Existing native receipts (if any in the maintenance manual) are historical, not this pass.

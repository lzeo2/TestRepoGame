# Fleeing the Complex (id 57) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 57, registered, directory `Games/FleeingTheComplex/`.
- Entry: `index.html`, blob e81287b7913c698e62d7efa94b2e22c38a50186b, tree ef4bc7a981a6ba0d213e576c53da1666fa8042f1, 12 files, 60,666,680 B total.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Title in page: "Fleeing the Complex | Fan-hosted port". Branded narrative game; no assumptions about its story, branching or controls from the title.

## Source inspected
- `index.html` (884 B) read in full: `<div id="ruffle">`, `ruffle/ruffle.js`, then on `load`:
  `window.RufflePlayer.newest()` -> `ruffle.createPlayer()` -> `player.id="player"`, `player.load("5.swf")`.
- `git ls-tree`: `5.swf` blob e372c3276bd28cc90c9c1247341ddc79c84e54f7; `ruffle/` tree 390f35997c575cd1f5b6d96de19e898e67b5f332 with vendored `ruffle.js` (c6ef26fc), wasm blobs (622bb7fc, d6c752be), Apache/MIT/NOTICE licenses present (ruffle LICENSE_APACHE 1b5ec8b7, LICENSE_MIT 941fe993).

## Held
- The SWF content (branching narrative, choices, win/lose, timing, controls) is a compiled Flash binary: **engine mechanics UNKNOWN pending engine/runtime review**. Only the wrapper entry/launch path is verified.

## Flow (wrapper only)
- Boot: page load -> Ruffle WebAssembly player created full-window -> loads `5.swf`.
- Start/setup, input, core loop, score/progression, win/lose, restart: **UNKNOWN** (inside SWF).
- Exit: none in wrapper.

## UI bloat classification: NONE (wrapper)
- Wrapper adds no chrome: no headers, cards, ads or modals. Body is plain black. Ruffle may render its own player menu (context menu/quality) at runtime: UNKNOWN until checked.

## Popup/modal inventory
- None authored in wrapper. Ruffle default context menu: UNKNOWN.

## Animation/simulation
- Wrapper has no RAF; all rendering and any model/stage animation run inside Ruffle/SWF: OPAQUE/HELD. Renderer RAF must not be conflated with game animation.

## Findings
1. (Info) Fully compiled SWF: any gameplay/UI claim beyond the visible `player.load("5.swf")` launch path would be invented; held pending runtime review.
2. (Info) `player.id = "player"` and full-window sizing are the only layout controls; no responsive/HUD wrapper exists. No fix needed now.

## Recommended playable view
- Wrapper already preserves the full game surface; nothing to remove. Keep `#ruffle` full-window and the vendored license files.

## Validation status
CODE-REVIEW ONLY. Smallest needed check: bounded browser load of the entry, confirm `5.swf` boots through Ruffle, record actual start screen, controls, choice/progression UI, and end/restart behaviour.

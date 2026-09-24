# Credits: Asteroids

- Source repo: https://github.com/dmcinnes/HTML5-Asteroids
- License: MIT, Copyright (c) 2010 Doug McInnes (see LICENSE)
- Commit: 930301cbda83ed3b120f64b801d937d077ee2da0 (2016-01-13)
- Date ingested: 2026-09-24

## Evidence

- Shipped `LICENSE` is byte-identical to the upstream `LICENSE` ("Copyright (c) 2010 Doug McInnes").
- Shipped `game.js`, `ipad.js`, `jquery-1.4.1.min.js`, `vector_battle_regular.typeface.js`, both `.wav` files and `index.html` share the upstream file set; `game.js` differs from upstream only in small edits (game-over state renamed `waiting` → `start`, sentence-case canvas text such as "Game over"/"Paused").
- Upstream `README.md` not shipped.

## Files shipped

- `game.js`, `ipad.js`, `jquery-1.4.1.min.js`, `vector_battle_regular.typeface.js`, two `.wav` sounds, `LICENSE` (from upstream)
- `index.html` (new: HUD header, instructions, touch controls)

## Modifications

- Offline ingest, analytics stripped.
- `ipad.js` rewritten from iPad-only detection to generic touch detection with flexbox on-screen controls.
- Sentence-case canvas text and state rename as noted above.
- New `index.html` wrapper (HUD + instructions + touch buttons); upstream `index.html` not used.

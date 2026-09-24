# Credits: Missile Command

- Source repo: https://github.com/andymason/Missile-Command-JavaScript-Clone
- License: MIT, Copyright (c) 2012 Andrew Mason (see LICENSE)
- Commit: d82cabdfd73cd60fa46bea98075663c8719ac5df (2012-11-05)
- Date ingested: 2026-09-24

## Evidence

- Shipped `LICENSE` and `README.md` are byte-identical to upstream ("HTML5 Missile Command Clone ... A WIP clone of the classic Atari game Missile Command remade using HTML5 Canvas").
- Shipped `missile_command.js` is the upstream file with additive edits only (score/wave HUD text, win + restart states, scaled click coordinates for responsive canvas).

## Files shipped

- `missile_command.js`, `LICENSE`, `README.md` (from upstream; upstream `inspiration/` dir not shipped)
- `index.html` (new: HUD header, instructions, responsive canvas wrapper)

## Modifications

- Offline ingest, analytics stripped (upstream ships no analytics; none added).
- Added score/wave HUD text, won/lost/restart state handling, and canvas coordinate scaling for `max-width: 100%`.
- New `index.html` wrapper; upstream `index.html` not used.

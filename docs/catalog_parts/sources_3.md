# Ingestion provenance - worker 3 (reconstructed from committed file header comments; original part_3.json was lost in a sparse-checkout rebuild, entries and provenance recovered verbatim from the games' header comments and the worker report)

## Pacman
- Source repo: https://github.com/daleharvey/pacman
- License: WTFPL
- Commit: 3acc5e2bb10e93c8f08eceb1562e1a16d672a1c6
- Files: vendored engine + local audio, thin wrapper (start overlay, restart, touch) added
- Modifications: wrapper overlay, touch controls, house-style flat colors; no runtime external requests

## Qix
- Source repo: https://github.com/astropanic/JIX
- License: MIT
- Commit: c08594ec0423af2001a1a3904f745649e375dec8
- Files: scripts/{game,graphics,hud,input,player}.js, styles/main.css, wrapper index.html
- Modifications: wrapper overlay (start/restart/touch), house-style

## Joust
- Source repo: https://github.com/cschladetsch/JsJoust
- License: MIT
- Commit: 88cb734e4bc149e6e81c8abf6993e5f35aac66d8
- Files: webpack prod bundle vendored (no build step at runtime), wrapper index.html
- Modifications: fixed upstream crash (EnemyAI never passed the player; spawnAwayFromPlayer() TypeError), wrapper overlay + touch

## Tron Light Cycles
- Source repo: https://github.com/faboyds/Tron
- License: MIT
- Commit: f95e35bc26f0c3778162c3de6e42a19c9fc60b2a
- Files: sketch.js, vendored p5.js 0.6.0 (LGPL-2.1, p5-LICENSE.txt shipped), wrapper index.html
- Modifications: wrapper overlay + restart + touch; p5 vendored unmodified (license note in file header)

## Skipped
- Pengo: no permissive JS/HTML clone exists (candidates were Python/C/DOS, unlicensed, or proprietary art); documented with 11 search queries in the worker report. Candidate for in-house build later.

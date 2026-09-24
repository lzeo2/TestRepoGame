# Credits: Space Invaders

- Source repo: https://github.com/ozelentok/SpaceInvaders
- License: MIT, Copyright (c) 2018 Oz Elentok (see LICENSE, upstream `LICENSE.txt`)
- Commit: 02ccd86d3841d90cff99b85b05adc0cd052d7570 (2018-09-02)
- Date ingested: 2026-09-24

## Evidence

- Shipped `javascripts/` (Const.js, SpaceShip.js, CDetection.js, Game.js, Main.js), `images/`, `vendor/jquery-1.8.2.min.js` and `apple-touch-icon.png` are byte-identical to upstream (`diff -rq` clean).
- Shipped `LICENSE` is byte-identical to upstream `LICENSE.txt` ("MIT License, Copyright (c) 2018 Oz Elentok").

## Files shipped

- `javascripts/`, `images/`, `vendor/`, `apple-touch-icon.png`, `LICENSE` (from upstream; upstream `README.md` not shipped)
- `index.html` (adapted from upstream `index.html`: viewport meta added, title/head adjusted)

## Modifications

- Offline ingest, analytics stripped (upstream ships no analytics; none added).
- Game code and assets unchanged; only the HTML head rewritten (viewport meta, title "Shooter Game").

# Credits: DuckHunt

- Source repo: https://github.com/MattSurabian/DuckHunt-JS
- License: MIT, Copyright (c) 2015 Matt Surabian (see LICENSE)
- Commit: 5a28db7442ebc7dc8060342413df24c0319f4190 (2026-03-27)
- Date ingested: 2026-09-24

## Evidence

- Shipped `duckhunt.js`, `audio.json`, `sprites.json`, `audio.mp3`, `audio.ogg`, `sprites.png` are byte-identical to the upstream webpack build output in `dist/` (`diff -q` clean on all).
- Shipped `LICENSE` is byte-identical to upstream `LICENSE`.
- Shipped `index.html` keeps upstream `dist/index.html` metadata: title "DuckHuntJS", meta author "Matt Surabian".

## Files shipped

- `duckhunt.js`, `audio.json`, `audio.mp3`, `audio.ogg`, `sprites.json`, `sprites.png`, `LICENSE` (from upstream `dist/`; upstream build tooling `src/`, `gulpfile.js`, `webpack.config.js` etc. not shipped)
- `index.html` (adapted from `dist/index.html`: script ref only, description meta kept)

## Modifications

- Offline ingest, analytics stripped (upstream ships no analytics; none added).
- Only the prebuilt `dist/` runtime shipped instead of the full source repo; game code unmodified.

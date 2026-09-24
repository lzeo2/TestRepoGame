# Credits: Cribbage Classic

- Source repo: https://github.com/jeffbcole/jeffbcole.github.io (site source of cribbageclassic.com, per `CNAME` + `cribbage_privacy.html`)
- License: Apache License 2.0 (see LICENSE), byte-identical to upstream `LICENSE`
- Commit: 9a3fd29a25776a232fbb584ff3dd5dd6c35f2628 (2026-03-02)
- Date ingested: 2026-09-24

## Evidence

- `cards.css`, `game.js`, `computerPlayer.js`, `scoreboard.css`, `LICENSE` are byte-identical to upstream; `images/` diff clean.
- `game.css`, `menus.css`, `menus.js`, `scoreboard.js`, `settings.js`, `index.html` are upstream files with small edits (see below).
- Upstream repo root contains the same file set: `cards.css`, `computerPlayer.js`, `game.css`, `game.js`, `menus.css`, `menus.js`, `scoreboard.css`, `scoreboard.js`, `settings.js`.

## Files shipped

- All `.js`/`.css`/`images/`/`LICENSE` from upstream (upstream ad/privacy/app-store files not shipped)
- `index.html` (adapted from upstream `index.html`)

## Modifications

- Offline ingest, analytics stripped (removed the Google Analytics gtag.js block from `index.html`).
- Removed the app-store redirect (`redirectToAppStore()`) and start delay; game auto-starts a Standard game.
- Added a fixed on-page how-to overlay and a menu button tweak; no rule/AI logic changes (`game.js` and `computerPlayer.js` byte-identical).

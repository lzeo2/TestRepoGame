# Credits: Frogger

- Source repo: https://github.com/RotaruDan/frogger
- License: GNU GPL Version 2 (see LICENSE), per upstream README
- Commit: a4b33cf54297b4f71d0e0f31c1911fea2d4b2360 (2014-03-17)
- Date ingested: 2026-09-24

## Evidence

- Shipped `README.md` is the upstream README and links directly to `github.com/RotaruDan/frogger`.
- Shipped `base.css` and `LICENSE` are byte-identical to upstream.
- Shipped `engine.js` / `game.js` are the upstream files with small edits only (see below).
- Upstream is itself based on github.com/cykod/AlienInvasion (noted in README); images under `images/` are from upstream.

## Files shipped

- `engine.js`, `game.js`, `base.css`, `images/`, `README.md`, `LICENSE` (from upstream)
- `index.html` (new: HUD header, instructions, portrait-friendly wrapper)

## Modifications

- Offline ingest, analytics stripped (upstream ships no analytics; none added).
- Device-rotate `alert()`s replaced with a portrait layout comment; `bangers` web font replaced with system font stack.
- Auto-starts a game instead of the title screen, adds a cumulative score counter (`FROG_SCORE`) and HUD draw, sentence-case prompt text.
- New `index.html` wrapper.

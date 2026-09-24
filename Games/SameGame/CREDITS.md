# SameGame credits

- Upstream: https://github.com/gaborbata/samegame1k
- License: MIT (see LICENSE), Copyright (c) 2017 Gabor Bata
- Upstream commit: 91df2de82549b64c17e5bbba7e28646bfac3c3f1
- Retrieved: 2026-09-24

## What ships

The game is the author's readable pre-golfed source from
`optimization-phases/01-samegame1k-original.js` in that repository,
shipped as `samegame.js`. `samegame1k.png` is the upstream artwork used
as the page icon. `index.html` is the upstream page, adapted.

## Modifications

1. `index.html`: added a visible header with the game title and inline
   instructions in sentence case (no modal intro was added; the game
   starts playable on load as upstream does).
2. `index.html`: removed Open Graph / Twitter social meta tags and the
   fixed-position footer overlay; footer credit now sits in normal flow.
3. `index.html`: canvas scales to narrow screens (`max-width: 100%`).
4. `samegame.js`: two-line coordinate-scale fix so pointer input still
   maps to the right cell when the canvas is displayed at a different
   size than its internal 528x288. No game logic changed.
5. `glue.js` (new): touch input (tap maps to the mouse handler) and
   keyboard input (arrow cursor, Enter/Space clears a group, N starts a
   new game), matching the instructions in the header.

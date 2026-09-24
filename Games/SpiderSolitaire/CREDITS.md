# Credits

- Game: spider-solitaire (React implementation)
- Repo: https://github.com/lklynet/spider-solitaire
- License: MIT (see LICENSE), Copyright (c) 2025 Lee Kelly
- Commit: d4478182a93da6b02ab9f590bb2f7409461077a4
- Date: ingested 2026-09-24

## Modifications made

- Shipped the production build (vite output) as static files, with asset paths changed from absolute (/assets, /spider.svg) to relative so the game works offline from any subdirectory.
- Page title changed from "spider-solitaire" to "Spider Solitaire".
- Removed all CSS text-transform: uppercase rules (house rule: no ALL-CAPS).
- Removed the body radial-gradient background (house rule: no gradients). Card-back conic/linear gradients are card artwork and were kept.
- Added one inline instruction line above the game (visible header copy).
- Added minimal keyboard glue: card, stock and foundation elements get tabindex and respond to Enter/Space via click (upstream is pointer-only).
- No game logic was modified. The game deals and starts automatically on load.

## Notes

- The bundle contains the string "https://react.dev/errors/" inside a React error message. It is never fetched at runtime; there are no external loads.

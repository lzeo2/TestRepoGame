# 2048 port evidence

## Source and license

- Upstream: https://github.com/gabrielecirulli/2048
- Pinned revision: `478b6ec346e3787f589e4af751378d06ded4cbbc` (shallow clone HEAD, fetched 2026-09-30)
- License: MIT, copyright 2014 Gabriele Cirulli. The upstream `LICENSE.txt` is vendored at `Games/2048/LICENSE.txt` and remains unchanged.
- Asset terms: this port vendors no upstream images or fonts. The runtime uses the system sans-serif stack. The upstream engine and CSS are the only vendored runtime code and are covered by the upstream MIT notice. The portal favicon is referenced from the existing repository root and is not duplicated here.

## Port changes

- Kept the upstream game engine, local score and game-state storage, board rendering, score display, win and game-over states, restart actions, arrow-key controls, and swipe controls.
- Removed upstream startup-image and apple-touch-image references because those assets are not needed by the deployed game.
- Removed runtime external links and the upstream font import. Attribution is plain local text, and the in-page instructions describe both arrow keys and board swipes.
- Changed the favicon reference to `../../favicon.svg` as required by the portal layout.
- Added solid black, touch-sized action controls, visible focus, and reduced-motion handling without changing the tile or board identity.

## Intended future catalog record

This port is intentionally not registered in `games.json` during P5. The later registry entry should be:

```json
{"id":222,"title":"2048","cat":"puzzle","icon":"","desc":"2048 by Gabriele Cirulli. Merge matching tiles to reach 2048. MIT-licensed original.","url":"Games/2048/index.html","featured":false}
```

## Verification

- `node --check` passed for all ten authored or vendored JavaScript entry files.
- `git diff --check` passed.
- Runtime external-load scan found no `http(s)` URL, CSS import, `fetch`, `WebSocket`, `XMLHttpRequest`, or `sendBeacon` in `Games/2048` outside the license notice.
- A finite local Playwright test covered desktop arrow-key movement, score change after a deterministic merge, restart reset, mobile swipe movement, screenshot capture, and console, page-error, failed-request, and external-request checks.
- Screenshots: `new-2048-desktop.png` and `new-2048-mobile.png` in the requested temporary review-shot directory.

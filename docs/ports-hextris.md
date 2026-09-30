# Hextris port evidence

## Source and licensing

- Upstream: https://github.com/Hextris/hextris
- Pinned revision: `3f4847dc8fd7dab3d1c87e6324b9159d92fbd396` (repository `HEAD` on 2026-09-30)
- Authors named by upstream: Logan Engstrom, Garrett Finucane, Noah Moroze, and Michael Yang.
- License: GNU General Public License version 3 or later, as stated by upstream `README.md` and preserved in `Games/Hextris/LICENSE.md`.
- Upstream license bytes: 35,178. Local license bytes: 35,178. SHA-256: `ccb349b4132ed7737f25e5adebfe61f3d52dca33708df1e50352320438d1d4c2`.
- Asset terms: no separate asset license was provided in the pinned tree. This port does not redistribute the upstream fonts, social images, badges, or Font Awesome files. It uses system fonts and retains only the upstream JavaScript game source plus locally vendored runtime dependencies. The selected dependency files retain their upstream license headers: jQuery 1.9.1 under the MIT-style jQuery license and Keypress 1.0.8 under Apache License 2.0. `jsonfn.min.js` is part of the upstream GPL repository and is retained unchanged.

## Local modifications

- Kept the recognizable upstream canvas game, hexagon mechanics, scoring, falling blocks, keyboard input, and native touch input.
- Replaced the upstream document shell with a self-contained static shell using `../../favicon.svg` and system fonts.
- Removed analytics, ad scripts, the analytics beacon, remote script injection, social sharing, store badges, and remote font dependencies.
- Removed the upstream game-over score beacon.
- Replaced image and icon actions with labeled, black native buttons. The game-facing copy uses flat colors and documents arrow keys, A/D rotation, down/S speed-up, and touch side controls.
- Did not edit `games.json`; registry work is intentionally deferred.

## Runnable verification

- `node --check` passed for every file in `Games/Hextris/js/`.
- `git diff --check` passed.
- Playwright bounded localhost test passed in desktop and iPhone-sized mobile contexts. It exercised start, arrow and A/D controls, down control, touch start and restart, forced game-over score display, restart, console/page errors, and external request checks.
- Review screenshots: `new-hextris-desktop.png` and `new-hextris-mobile.png` were written to the review screenshot directory with the start control dismissed and the game visible.
- Runtime request audit found only the local page, local scripts, local stylesheet, and the root favicon. The only URL strings in runtime files are informational source/license comments in the vendored Keypress file and an upstream algorithm comment; neither is fetched.

## Future catalog entry

Registry work is not included in this port. The expected later entry is:

```json
{"id":223,"title":"Hextris","cat":"puzzle","icon":"","desc":"Hextris by Logan Engstrom, Garrett Finucane, Noah Moroze, and Michael Yang, released under the GNU GPLv3.","url":"Games/Hextris/index.html","featured":false}
```

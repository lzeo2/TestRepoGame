# Bowling - credits

- Source: https://github.com/iliagrigorevdev/bowling
- License: GPL-3.0 (see LICENSE)
- Commit: 60fa6fe5283869c45515f614f6a99b181c63d499
- Retrieved: 2025-09-24

## Third-party code bundled upstream (unchanged)

- three.js (MIT license) at js/three.js
- ammo.js (zlib license) at js/ammo.js
- GLTFLoader.js, part of three.js examples (MIT license)

All are loaded from local files; the game fetches nothing from external hosts.

## Modifications made

- Added a fixed visible header with sentence-case inline instructions (no intro overlay; the game already started playable on load).
- Added a restart button in the header and a keyboard glue script (js/keyboard.js): arrow keys move the ball, space bar or enter bowls, R restarts the game.
- Moved the scorecard readout below the new header and gave it a solid background for contrast.
- No other game logic or assets were changed.

# Credits

## Sokoban

- Source repo: https://github.com/shunyue1320/sokoban
- License: MIT (see LICENSE)
- Commit: 9d15e6d32a533cf1099f995e30c01ea45ee0f1ff (2026-06-01)
- Retrieved: 2026-09-24

### Modifications made

- Renamed `game.html` to `index.html` and fixed the page title.
- Restored `js/mapdata100.js` from the git blob (the shallow checkout produced a 0-byte file).
- Moved the help text into a always-visible inline header (removed the help toggle button) to match portal rules.
- Translated the visible UI copy (buttons, level counter, win message) from Chinese to English.
- Replaced the fixed 560px layout with a responsive canvas and scrollable page.
- Added an on-screen directional pad for touch input (keyboard input unchanged).
- Restyled buttons to meet 44px touch target and contrast rules.
- Kept all original game logic, level data and sprite assets intact.

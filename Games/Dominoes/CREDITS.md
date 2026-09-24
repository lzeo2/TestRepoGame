# Dominoes - credits

- Source: https://github.com/martakoprivica/Dominoes_web_game
- License: MIT (see LICENSE)
- Commit: 53fd52326768513c24a0d52b1be3019af11abfb1
- Retrieved: 2025-09-24

## Modifications made

- Promoted the game page (igra.html) to index.html so the game starts playable on load; the upstream menu page with its play button was removed as a click-to-start gate.
- Added a visible sentence-case header with inline instructions (drag or tap-to-select dominoes, fill all eight slots to win, restart button).
- Removed the empty `<img src="">` on the restart button and gave it an accessible label.
- Added a click/tap and keyboard fallback path (Enter or Space selects a domino, then a slot places it) so the game is playable without drag gestures.
- Added focus and selection outlines for the tap/keyboard path.
- Stripped menu-only CSS and unused menu assets (meni.png, igraj.png, pravila.png, nota1.png, nota2.png, popup.png, polje4.png) that were referenced only by the removed menu page.
- Removed console.log debug output from touch handlers; normalized line endings to LF.
- Kept the local music.mp3, background art, tile art, and win page (bravo.html) intact.

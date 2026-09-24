# Credits: Crossword

- Source repo: https://github.com/HoldOffHunger/jquery-crossword-puzzle-generator
- License: BSD 3-Clause (see LICENSE), copyright (c) 2017 Benjamin Tepolt
- Commit: 797d689fe5b9811a5bbd0922bff769c0f4583eb4
- Date ingested: 2025-09-24

## Files shipped

- index.html (adapted from crossword-puzzle-demo.html)
- javascript/crossword-puzzle.js (two visible strings reworded, see below)
- javascript/jquery.min.js (jQuery 3.2.1, MIT, vendored from the CDN URL the upstream page used, now served locally)
- css/crossword-puzzle.css (unmodified)
- LICENSE (upstream LICENSE.txt)

## Modifications

- Replaced the Google CDN jQuery script tag with a local copy so the game runs fully offline.
- Rewrote the page title and added a visible inline header with sentence-case instructions, a progress line, and a new puzzle button.
- Added a small script that hides the answer form until a clue is clicked, updates the progress line, and announces the completed puzzle (the win state); the new puzzle button reloads to generate a fresh random board (restart path).
- Reworded two visible strings to sentence case: the wrong-answer message and the already-solved message; changed the button label "Reveal Answer" to "Reveal answer".
- Bumped grid cells and buttons to at least 44px and added a viewport meta tag for phones; grid letters display uppercase, as is usual for crosswords.

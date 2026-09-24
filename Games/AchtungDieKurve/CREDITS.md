# Achtung die Kurve credits

- Upstream: https://github.com/stravid/achtung-die-kurve
- License: MIT (see LICENSE)
- Upstream commit: de0d347ee4c0a87c1928e7b339c771991a080dd8
- Date ingested: 2025-09-24

## Source layout

Shipped the upstream `examples/html/` demo: index.html, javascripts/adk.minified.js, javascripts/script.js, stylesheets/style.css.

## Modifications made

- Removed the unused vendored jquery.js (no `$()` calls anywhere) and its script tag.
- Removed all external links: GitHub fork link, author homepages, imprint/privacy pages, browser promo link. Credits now live in this file.
- Sentence-cased UI copy: "Add player", "Start game", "Player name", "Getting started".
- Added inline always-visible controls instructions in the right column (keyboard key pairs plus touch zones).
- Added minimal touch glue in script.js: the field splits into four vertical zones so a phone can steer the first two players (tap or hold a zone to turn).
- No external scripts, fonts, fetches or trackers; the page loads only local files.

## Game flow

Setup (add at least two players inline) to start game to rounds with a ranked end screen and automatic restart, scores persisting across rounds.

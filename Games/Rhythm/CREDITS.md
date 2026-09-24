# Rhythm credits

- Source: https://github.com/ChloeLiang/rhythm-game
- License: MIT (see LICENSE), Copyright (c) 2018 Liang Xin, Chloe
- Upstream commit: 4995fbf1573f0dbdfac00bfe99c18523b610f24d
- Date ingested: 2026-09-24

## Modifications made for offline hosting

- Removed external Google Fonts (Playball), external favicon (icons8) and remote og:image/og:url meta tags; font replaced with a system font stack.
- Removed external links in the menu (GitHub repo, theishter.com) and the decorative heart character; credits kept as plain text here.
- Flattened CSS gradients to solid colors and removed uppercase text transforms (house UI rules).
- Added a visible inline header with controls (sentence case).
- Added touch/pointer input on the on-screen keys (pointerdown/pointerup) plus touch-action: none so mobile can play.
- Added a fail/clear result heading (misses over half of all notes = failed) and a "Play again" restart button on the summary screen.
- Faded menu now ignores pointer events during play so the summary is reachable.
- Dropped unused upstream screenshot (img/screenshot.gif, referenced only by the upstream readme).

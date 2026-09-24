# Bullet Hell credits

- Source: https://github.com/selenebun/bullethell
- License: MIT (see LICENSE), Copyright (c) 2020 Amelia Clarke
- Upstream commit: 75173f8c37868ac7f30b886da6d28560e8e4418b
- Date ingested: 2026-09-24

## Modifications made for offline hosting

- Game already ships its dependencies locally (p5.min.js, Source Code Pro ttf); no external scripts, fonts, or requests existed. Only the upstream readme (unreferenced by the game) was dropped in favor of this file.
- Added touch/mouse drag input: hold a finger or mouse button to steer the ship and fire (keyboard controls unchanged).
- Added a visible sidebar notice on ship destruction (lose state: the level restarts) and on boss kill (level cleared), with auto-clear after 2.5 seconds.
- Added the touch control line to the inline Controls list.
- No gradients, emoji, em-dash, or all-caps copy were present in the shipped UI; the FPS debug block stays hidden by default (toggled with F).

# Credits: JavaScript Racer

- Source repo: https://github.com/jakesgordon/javascript-racer (the codeincomplete.com JavaScript Racer, by its original author)
- License: MIT (see LICENSE), copyright (c) 2012-2016 Jake Gordon and contributors
- Commit: 3e8a060b5900755db27f899612a74a77427c853e
- Date ingested: 2025-09-24

## Files shipped

- index.html (adapted from v4.final.html)
- common.css (unmodified except none; upstream file)
- common.js (one change, see below)
- stats.js (unmodified)
- images/background.png, images/sprites.png, images/mute.png (unmodified)
- music/racer.mp3, music/racer.ogg (unmodified)
- LICENSE (upstream)

## Modifications

- Removed the version links (v1 to v4) so the page only points at files that exist in this folder.
- Rewrote the instructions into a visible inline paragraph (sentence case), covering keyboard and touch controls, scoring, and the fact that the race starts on load.
- Removed the stray loading text under the canvas and translated the canvas fallback message to English.
- Added touch control buttons (accelerate, brake, steer left, steer right) and a restart button, shown on small screens; the restart resets position, speed, and lap timers.
- Added a responsive style block so the fixed 640x480 canvas fits small screens.
- Changed music playback in common.js to unlock on the first key press or pointer interaction, because browsers block autoplay with sound. The audio files stay local (no external hosts).
- Added viewport meta and a plain credits line.

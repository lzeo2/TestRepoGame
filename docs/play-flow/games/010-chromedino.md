# Chrome Dino (id 10) - play-flow audit report

CODE-REVIEW ONLY. No browser run in this pass.

- Identity: id 10, registered, url `Games/ChromeDino/dino.html`.
- Baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 3 files (dino.html, LICENSE, README.md), 137099 bytes.

## Source inspected

- `Games/ChromeDino/dino.html` blob `383ecd827daa6533312b1215afe912edc743767b` (117507 bytes, 2597 lines). Inspected: lines 1-60 (head, `hideClass`, Chromium copyright note, Runner bootstrap), lines 197-620 region via targeted reads (`Runner.prototype` methods `startGame` line 384, `restart` line 617, `gameOver` line 579, `onResize`, RAF `this.raqId = requestAnimationFrame(this.update.bind(this))` line 566), lines 753-816 (`GameOverPanel`), lines 2500-2597 (body: `#main-frame-error`, `#offline-resources` base64 sprites/audio, boot script, social markup). Not read line-by-line: obstacle/collision sections (~lines 830-2100, standard T-Rex runner classes `Horizon`, `Trex`, `DistanceMeter`, `Obstacle`, `Collision`); held for a full mechanics pass, but class names above are from actual grep of this file.
- Assets are embedded base64 (`img id="1x-trex"`, `1x-horizon`, `1x-restart`, `template id="audio-resources"` with `offline-sound-press/hit/reached`), so the game is offline-self-contained.

## Flow

- Boot: `if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) new Runner('.interstitial-wrapper'); else document.getElementById("main-frame-notchrome").style.display="";` (line ~2560). Non-Chrome user agents get the "Sorry, this game only runs on the Google Chrome!" message (`#main-frame-notchrome`) - a hard gate; Firefox/Safari users see a refusal. See finding 1.
- Start: page shows "Press space to start" (`.onlyforchrome`); `Runner` waits for key/touch (`Runner.events` include keydown/touchstart, `startGame` bound at line 369).
- Input: space/up jump, down duck (standard `Runner.keycodes` map at line 173), touch controller element (`this.touchController` line 308).
- Core loop: single RAF loop `Runner.prototype.update` -> `distanceMeter`, `horizon`, `tRex` updates; speed/distance ramp; collision -> `gameOver()` (line 437 call path, 579 definition).
- Score: `DistanceMeter` hi-score text (`#1x-text` sprite), `localStorage`-style best distance held inside runner classes (not re-verified here; held).
- Lose: `gameOver()` draws `GameOverPanel` (restart sprite `1x-restart`).
- Restart: `Runner.prototype.restart` (line 617) from GameOverPanel click/tap. No win state (endless runner; correct for genre).

## UI bloat: MILD

- Persistent: `#main-frame-error` interstitial shell (Chrome-error-page styling), "Press space to start" line, empty `#socialbutts` addthis markup table (`addthis_toolbox` div, no addthis script is loaded anywhere - `a.js` is commented out at line 18), `#main-frame-notchrome` (hidden unless non-Chrome).
- Genuine game HUD: canvas inside `.interstitial-wrapper`, `#offline-resources`.
- Popups/modals: none authored. No ad/info/nag dialogs.

## Animation

- Real model animation driven by one RAF loop (`requestAnimationFrame(this.update.bind(this))`, line 566): sprite-frame scrolling in `Horizon`, `Trex` frame animation, `DistanceMeter` text updates. Not a renderer-only RAF; gameplay state (position, speed, crash) advances in `update`. Self-contained, not held.

## Findings

1. MEDIUM - Chrome-only user-agent gate (`navigator.userAgent.indexOf('chrome')`) blocks Firefox/Safari/Edge(Firefox UA) entirely with a "download Chrome" message. Smallest fix: attempt `new Runner(...)` unconditionally (the game is plain canvas JS) and keep the message only as fallback if construction throws.
2. LOW - `#socialbutts` addthis markup renders an empty styled table in Chrome (no loader script). Remove the dead block (`hideClass(".onlyforchrome")` also hides "Press space to start" on non-Chrome, which is intended).
3. LOW - page title is "Google Classroom" while `og:title` says "Play Chrome Dino"; cosmetic mismatch, fix title if touched.
4. External references: two static `<a href>` links (`thecodepost.org` article, `google.com/chrome`) - anchors only, no runtime fetch. No third-party scripts. OK under offline policy; do not add more.

## Recommended playable view

Keep the canvas game area, "Press space to start" hint, GameOverPanel restart. Drop the `#main-frame-error`/interstitial error-page chrome and the dead `#socialbutts` table; keep controls info as a one-time acknowledged help. No recurring popups exist.

## Validation

CODE-REVIEW ONLY. Smallest needed check: open `dino.html`, press space, jump over one obstacle, crash, restart via panel, and repeat in Firefox to confirm finding 1.

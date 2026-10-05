# Free Throw (id 152) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 152, registered, directory `Games/FreeThrow/` (2 files: LICENSE + index.html).
- Entry: `index.html`, blob 1fea822550cd2a5ed51c37e0dc91ee1aef3d7c18, tree 794e212021bf34a2238c1bbeeb641e136bf88670, 17,662 B.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Ingested from github.com/jeremymartinezq/Basketball-game, MIT, commit 2bf12dc (header comment); modifications documented: 10-shot round, 12-point target, start screen, rim bounce, flat colors, 44px touch targets.

## Source inspected
- Entire `index.html` read in full (CSS + markup + inline script, lines 1 to end of file).

## Flow (from source)
- Boot: DOM ready -> `resetBall()`; game waits at `#startOverlay` ("Free Throw" + rules + `#playBtn`).
- Start: `#playBtn` click -> hides overlay, `playing = true`, `startShotClock()`.
- Input: `#shoot-button` mousedown/touchstart -> `startPower()`; mouseup/touchend -> `shoot()`; keyboard `Space` down/up (with `spacePressed` guard) charge/release; `ArrowLeft/ArrowRight` -> `aimLeft()`/`aimRight()`; `KeyR` -> `restartGame()`.
- Core loop: `startPower()` runs a `setInterval(20ms)` oscillating `power` (0..100, `powerIncreasing`), writing `#power-level` height. `shoot()` computes `releaseQuality = |70 - power|`, `accuracyFactor`, `velocityX/velocityY`, then `animateShot()` via `requestAnimationFrame`: gravity `velocityY += 0.4`, position updates on `.ball` `left/top`, `bounceOffRim()` collision against rim endpoints, rim-score test increments `score += 2`.
- Score/progression: `#score`, `#shots-left` (10), `#shot-clock` (24s `setInterval`; violation wastes an attempt), `Target 12`.
- Win/lose: `gameOver()` -> `#game-over` overlay, `verdict` "You win: ..." if `score >= WIN_TARGET(12)` else "You lose: ...", `#final-score`.
- Restart: `#restart-button` -> `restartGame()` (resets score/shots/overlay/shot clock); `R` key while playing.

## UI bloat classification: MILD
- Persistent: `.instructions` card below the court repeating controls ("hold Space... R restarts... Score 12 or more from 10 shots") - duplicates `#startOverlay` copy; present every visit.
- Genuine game UI: `.scoreboard` stats, `#power-meter`, `#aim-controls` (46px), `#shoot-button` (52px), `.space-indicator`, `#startOverlay` (start), `#game-over` (result). Touch targets >=44px in authored CSS.

## Popup/modal inventory
- `#startOverlay`: one-time start screen with rules; dismissed by `#playBtn`, never re-shown (restart also keeps it hidden).
- `#game-over`: result overlay shown only at round end; dismissed by Play again.
- No recurring nag/ad/info popups in source.

## Animation/simulation
- Model animation: `animateShot()` RAF updates `ballX/ballY/velocityX/velocityY` and writes `ball.style.left/top` - real physics model, not decoration. Power meter is a `setInterval` state update. Shot-clock timer `setInterval`. All timers cleared in `gameOver()`/`restartGame()` (`clearInterval(shotClockTimer/powerInterval)`); RAF self-terminates on out-of-bounds via `endShot()`.

## Findings
1. (Low) `.instructions` duplicates `#startOverlay` guidance persistently; fold into a one-time help (reopenable) in a future authorized change. No fix now.
2. (Low) `game-over` copy says "Final score: X of 20 possible" while the round is 10 shots x 2 points = 20; consistent, but `#score` target display says "Target 12" - fine. No fix.
3. (Info) `startShotClock()` can fire its violation branch while a shot is animating? Guarded by `ballInHand && !isAnimating`; timers cleared during animation. No bug found.

## Recommended playable view
- Keep `.scoreboard`, court/ball, power meter, aim/shoot buttons, start and round-over overlays; move `.instructions` into one-time acknowledged help with optional reopen.

## Validation status
CODE-REVIEW ONLY. Smallest needed check: browser-load, start, charge/release a shot with Space and touch, score/reach game over, restart with button and `R`.

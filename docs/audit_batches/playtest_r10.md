# Playtest batch R10 (PHASE 1b deep interactive)

Environment: local `python3 -m http.server 8199` (repo root), Playwright chromium under `xvfb-run -a`, http:// not file://. Budget 90 s/game, 0 screenshots, per-game browser context. Internet available in this environment (worldguessr iframe and cdnjs three.js both loaded).

Method note: an initial canvas pixel-hash metric turned out to be blind on WebGL canvases (Phaser AUTO / three.js readback returns constant), and two flows desynced during asset preload. Affected games (Merge Cats ×2, Neon Flappy, Orbit Collector) got one bounded state-verification probe reading live scene/JS state (`PawDefenseGame.scene`, `OrbitScene.player.position`, overlay classList) — no game-file edits.

## Verdicts

GeoGuesser | played: partially | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Merge Cats Defender | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Merge Cats Defender Hacked | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Neon Snake | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Neon Breakout | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Neon Flappy | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Neon Boss Rush | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Orbit Collector | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass

## Notes per game

- **GeoGuesser**: iframe embed of https://www.worldguessr.com/ loaded (external network reachable here — NOT environment-limited this run). Clicks + ArrowUp/ArrowRight/Enter into the cross-origin frame changed frame DOM; no PageErrors. One ad script failed `net::ERR_NETWORK_CHANGED` (doubleclick gpt.js, non-blocking) + permissions-policy warning (accelerometer). In-game score not directly readable cross-origin — controls evidence is indirect (frame DOM change), hence played: partially. Restart nt (external site owns its UI).
- **Merge Cats Defender**: full flow confirmed via scene state: Landing → (PLAY) LevelMap → (stage-1 node) SquadSelect → (START ►) Battle. Battle live: coins 200 → 110 → 20 after 3 dock-card→lane placements, scene children 36 → 47, "Wave 1/6" running. Pause ('II') and 'Quit to Map' affordances present in HUD. No death/loss reached in budget → restart nt. 0 PageErrors, 0 console errors, 0 failed requests.
- **Merge Cats Defender Hacked**: identical flow works end-to-end; unlimited-coin hack active (coins start 999999, badge "1009998" after tick), placements succeed (children 36 → 47), Tabby shows "0c" cost. Same clean error record. Restart nt (mid-wave; 'Quit to Map' + Next Stage/World Map buttons exist per code).
- **Neon Snake**: START clicked, arrow keys changed snake direction (canvas hash changed), snake died into wall → deathScreen appeared → RETRY (#restartBtn) hid it and reset score. 0 errors.
- **Neon Breakout**: playBtn started game, ArrowLeft/Right moved paddle (canvas changed), idling let ball drop all 3 lives → #death screen with score shown → #retryBtn restarted cleanly. 0 errors.
- **Neon Flappy**: startScreen click started run, 5× Space flapped (canvas changed), bird died → #overScreen shown → click on #restartBtn hides overScreen and starts a new run (verified by immediate classList polling; re-death without taps is expected). No win state — endless by design. 0 errors.
- **Neon Boss Rush**: startBtn started, arrows + Space moved/fought (HUD `#scoreText` state changed, startScreen hidden), game-over/win screens not reached within ~40 s of play/idle (multi-phase fight) → restart nt; #overBtn and #winBtn are wired to startGame in code (script.js:480-482). 0 errors.
- **Orbit Collector**: three.js r128 loaded from cdnjs (internet available — offline would break it, but this run it worked; `typeof THREE === 'object'`, 0 PageErrors). Start clicked → start-screen hidden; held ArrowRight+KeyW: player moved `[0,0,6] → [8,0,-4.43]`, score 0 → 20 (collected crystals), planet rotation advanced 0.650 → 0.816 (rAF loop animating). **Phase 1 flag confirmed by code + probe**: the only end overlay is `#game-over` with `<h2>Game Over</h2>`, and it is shown ONLY on win (`collected.size >= TOTAL`); there is NO lose state/path in the code. Restart button = `location.reload()`. Win overlay not reached in budget → restart nt.

## Artifacts

- Harness: /tmp/playtest_r10.py, /tmp/probe_r10.py, /tmp/probe2_r10.py (outside repo, not committed)
- Raw output: /tmp/r10_out.log, /tmp/probe2_out.log
- Screenshots used: 0 of 1 allowed. No game files edited. Nothing committed.

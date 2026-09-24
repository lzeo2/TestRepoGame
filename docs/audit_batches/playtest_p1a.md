## Playtest P1a
Asteroids | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > screenshot: shots_playtest/p1a_asteroids_play.png
  > hud-diff: hud: 'Score 0 Lives 3 Wave 1 Best 0'->'Score 40 Lives 2 Wave 1 Best 0'; lives: '3'->'2'; score: '0'->'40'
  > restart ok: pause -> Menu -> start screen -> START re-entered play
  > console_errors=0 bad_responses=[] pageerrors=0
  > elapsed=16s
Space Invaders | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > hud-diff: hud: 'Score 0 Lives 3 Wave 1 Best 0'->'Score 10 Lives 3 Wave 1 Best 0'; score: '0'->'10'
  > restart ok: pause -> Menu -> start screen -> START re-entered play
  > console_errors=0 bad_responses=[] pageerrors=0
  > elapsed=14s
Galaxian | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > hud-diff: hud: 'Score 0 Lives 3 Wave 1 Best 0'->'Score 40 Lives 3 Wave 1 Best 0'; score: '0'->'40'
  > restart ok: pause -> Menu -> start screen -> START re-entered play
  > console_errors=0 bad_responses=[] pageerrors=0
  > elapsed=10s
Missile Command | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass [pageerrors: Cannot read properties of undefined (reading 'filter')]
  > hud-diff: ammo: '30'->'26'; hud: 'Score 0 Cities 6 Missiles 30 Wave 1 Best 0'->'Score 0 Cities 6 Missiles 26 Wave 1 Best 0'
  > restart ok: pause -> Menu -> start screen -> START re-entered play
  > console_errors=0 bad_responses=[] pageerrors=1
  > DIAGNOSIS: pageerror fires at BOOT (before START): script.js L425 `updateHud()` runs while `cities` (L27) is still undefined; `cities.filter` throws (L44). Non-fatal: start() inits cities at L344, full play + restart unaffected. L1 bug, but violates CODE_QUALITY §3 (no console errors in normal load).
  > elapsed=11s
Lunar Lander | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > hud-diff: alt: '299'->'279'; fuel: '100'->'75'; hud: 'Score 0 Landing 1 Fuel 100 Speed 18.4 Alt 299 Best 0'->'Score 0 Landing 1 Fuel 75 Speed 9.5 Alt 279 Best 0'; speed: '18.4'->'9.5'
  > restart ok: game-over screen reached, clicked #restartBtn
  > console_errors=0 bad_responses=[] pageerrors=0
  > elapsed=28s
Centipede | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > canvas state digest changed (no HUD field changed)
  > restart ok: pause -> Menu -> start screen -> START re-entered play
  > console_errors=0 bad_responses=[] pageerrors=0
  > elapsed=10s
Dig Dug | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > canvas state digest changed (no HUD field changed)
  > restart ok: pause -> Menu -> start screen -> START re-entered play
  > console_errors=0 bad_responses=[] pageerrors=0
  > elapsed=10s
Frogger | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > hud-diff: best: '0'->'50'; hud: 'Score 0 Best 0 Lives 3 Homes 0/5 Pause'->'Score 50 Best 50 Lives 0 Homes 0/5 Pause'; lives: '3'->'0'; overScore: '0'->'50'; score: '0'->'50'
  > restart ok: game-over screen reached, clicked #retryBtn
  > console_errors=0 bad_responses=[] pageerrors=0
  > elapsed=19s
DotRunner | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > hud-diff: hud: 'Score 0 Best 0 Lives 3 Pause'->'Score 50 Best 0 Lives 1 Pause'; lives: '3'->'1'; score: '0'->'50'
  > restart ok: pause -> Menu -> start screen -> START re-entered play
  > console_errors=0 bad_responses=[] pageerrors=0
  > elapsed=15s
Pacman | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > canvas state digest changed (no HUD field changed)
  > restart ok: state digest changed after in-game Restart (score not machine-readable)
  > console_errors=0 bad_responses=[] pageerrors=0
  > elapsed=10s
Qix | played: yes | controls responded: yes | score/state changed: yes | restart works: no | verdict: play-broken(input ok, restart failed)
  > canvas state digest changed (no HUD field changed)
  > restart FAILED: restartBtn not visible/reachable during play
  > DIAGNOSIS (static): #restartBtn is created with `hidden` (index.html L76), has a click handler=L118 (location.reload), but NOTHING ever sets it visible (`hidden = false` / removeAttribute: zero hits in Games/Qix). Lose state exists (hud.js L65 onTimeOver on timer expiry) but it only clones a visual `.game-over` sheet — no wired restart/menu button ever appears. Restart affordance permanently unreachable; no Menu path either.
  > console_errors=0 bad_responses=[] pageerrors=0
  > elapsed=14s
Joust | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > no hud/canvas change observed after keys — INSTRUMENT BLIND: canvas toDataURL digest is a stale/static buffer for this Phaser canvas (same hash across 1s idle while enemies visibly move); Joust also has no HUD/score DOM ids. Corrected via bounded scene-level diagnostic (window.joustGame -> JoustScene): ArrowLeft registers in Phaser key layer (keys[37].isDown=true during hold) and player sprite moves (100,573) -> (25,575) during hold; enemies advance each sample; scene active, loop frames 91->184, 0 pageerrors. Score stayed 0 (no enemy hit) but player/game state demonstrably changed by input.
  > restart ok: Restart -> reload -> Start re-enters play
  > console_errors=0 bad_responses=[] pageerrors=0
  > elapsed=11s (main run) + 3 bounded Joust diagnostics
Tron Light Cycles | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > canvas state digest changed (no HUD field changed)
  > restart ok: Restart -> overlay -> Start re-enters play
  > console_errors=0 bad_responses=[] pageerrors=0
  > elapsed=9s

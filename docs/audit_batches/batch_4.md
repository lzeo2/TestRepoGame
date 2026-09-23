## Batch 4
Bloons TD | functional OK | slop: none | f=8 a=7 s=9 | keep — hub page linking 4 real BTD sub-builds (btd/btd2/btd3/btd4 all present), clean minimal styling.
Drift Boss | functional OK | slop: minor | f=9 a=8 s=8 | keep — full build (game.js 4.5MB, splash/orientate assets present); em-dash in controls hint.
Wordle | functional OK | slop: none | f=9 a=8 s=8 | keep — 2.8MB fully-inline single file, zero external refs, gate clean.
Doodle Jump | functional OK | slop: none | f=9 a=8 s=9 | keep — offline CloudAPI stub replaces cloud service; all assets local.
Chess | functional OK | slop: minor | f=8 a=7 s=7 | fix — working minimax AI + drag/touch board, but "How to play" claims click-select-move while chessboard.js 0.3.0 is drag-only (no click handler); em-dash status strings; cloak.js 404 benign.
Thumb Fighter | functional OK | slop: minor | f=8 a=7 s=7 | fix — C3 build runs clean, but dead ref: link manifest appmanifest.json does not exist (404); cloak.js 404 benign.
Jetpack Joyride | functional OK | slop: none | f=8 a=8 s=9 | keep — Phaser 3.24 build, cloak.js removed with explanatory comment, gate clean.
Jetpack Joyride Hacked | functional OK | slop: minor | f=8 a=7 s=7 | keep — hack VERIFIED live by runtime probe: window.game exists, all 8 scenes' update() wrapped (body.enable=false invincibility + forced coins), localStorage.setItem intercept installed; pulsing red HACKED badge = minor slop.
Doge Miner | functional OK | slop: none | f=8 a=7 s=8 | keep — React build, local assets, cloak.js/ico 404 benign, gate clean.
Hangman | functional OK | slop: none | f=9 a=8 s=9 | keep — self-contained: start/play/end screens, score, restart, keyboard + on-screen keys, 5 rounds.
Retro Bowl Hacked | functional OK | slop: minor | f=8 a=7 s=8 | keep — hack patched inline in GM runtime getter _AK: returns 99999/999 early for coach_credit/salary_cap/boost_salary_cap before falling through — live path, not shadowed; Poki SDK stubbed locally.
Cookie Clicker Hacked | functional OK | slop: minor | f=9 a=7 s=8 | keep — interval sets global Game.cookies/cookiesEarned/cookiesPs; Game is a plain global in main.js, patch not shadowed and tops up every 2s; (Orteil license header asks no re-hosting — worth a legal glance, not a code defect).
Flappy Bird Hacked | functional OK | slop: minor | f=9 a=8 s=8 | keep — hack live: hitPipe(){return false} + ground clamp + best=99999; loss state unreachable (intended god mode), win at 20 pipes still reachable.
Tetris Hacked | functional OK | slop: minor | f=7 a=7 s=7 | fix — hacks effective (startGame 999999/level100, lock() wipes board + 10000×level score, gameOver() never reachable), but newPiece "// HACKED: always find valid position" is a no-op comment (dead claim), gameOver() is dead code, and level=100 forces 50ms ticks = near-unplayable speed.
Age of War Hacked | functional OK | slop: none | f=9 a=8 s=9 | keep — both badge claims live: gold+=99999/s in update(), buy() grants player units hp×10/dmg×5/range×2 (one-hit kills vs vanilla enemies); clean custom build.

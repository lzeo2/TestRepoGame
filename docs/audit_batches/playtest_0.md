# Audit Batches

## Playtest 0

Interactive playtest (real browser, http://127.0.0.1 server, viewport 1280x800).
Format: TITLE | played: | controls responded: | score/state changed: | restart works: | verdict

2048 | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Note: only WASD bound (e.keyCode 65/87/68/83) — arrows do nothing, and controls are NOT documented in-page; no restart/new-game affordance exists anywhere (board freezes with "You LOSE" on game over).

Age of War | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Note: START clicked, units spawned (6/18 clicks; others timed out waiting on unaffordable card), gold 128→73, score 0→46, wave 1→2, HP bars move; win/lose overlay not reachable in 30s, Space (documented as start/restart) does nothing mid-game.

Snake | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Note: full loop — Start Game → ArrowRight → wall crash → Game Over (final-score 0) → Play Again resets board & score.

Breakout | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Note: ball needs Space to launch (dx=0 until then), paddle needs HELD arrows (instant key press too short for rAF loop); score 0→2, reached GAME OVER by idling, Space restarts (score→0, over→false). No page error.

Hextris | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Note: START STACKING → hex rotates on each Arrow press (canvas hash changes), blocks land/stack; no score clear within 15s (score 0), no menu/restart affordance until win at 250/game over.
Soccer Random | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Note: Construct 3/WebGL canvas; loaded after SwiftShader fix, start clicks + Space/Up/W changed canvas frame hash (idle 605e0f2c -> 4adda113); canvas-only page, no DOM restart/menu affordance to exercise; 2 non-blocking 404s logged.
Basket Random | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Note: Construct 3 canvas; start clicks + keys changed frame hash (3a56a1ce -> 32976584); non-fatal PageError "Cannot set properties of undefined (setting 'src')" + "Blocked: js/null.js" (ad/stub script, game kept running to end of session); canvas-only, no restart affordance in DOM.
Volley Random | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Note: Construct 3 canvas; start clicks + keys changed frame hash (b6d8ee70 -> b253640c); only favicon 404s, no PageError; canvas-only, no restart affordance in DOM.
Ovo | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Note: Construct 2 (c2runtime); click + arrows/space changed frame hash (b22e140c -> 17f0795f); shot docs/audit_batches/shots_playtest/ovoplay.png; only benign Construct dev warnings in console (duplicate tag/child), no PageError; canvas-only, no restart affordance reachable pre-game-over.
Run 3 | played: partially | controls responded: no | score/state changed: no | restart works: nt | verdict: play-broken (reached live but STATIC canvas ~10s after load; clicks/Space/arrows changed nothing, frame hash frozen at 827cf54f; PageError "Unexpected non-whitespace character after JSON at position 152" during startup)
Note: single allowed retry then failed at harness level (Page.goto 'load' event >25s on the heavy emscripten bundle, assets themselves served 200); likely stuck on loading screen or halted by the bad JSON parse — needs follow-up, no game files touched.
Chrome Dino | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Note: full loop — static idle -> Space starts run (canvas animates) -> idle crash (animation stops) -> Space restarts; only favicon 404s, no PageError.
Flappy Bird | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Note: full loop — START FLYING hides overlay (playing), Space flaps changed frame hash (5eb96aa -> 5416e188), crash shows "FLIGHT OVER" overlay, R key resets (overlay hidden, score back to 0); no PageError.
Character Alsen | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Note: typed "hello there alsen" + Enter -> user msg + bot reply added (chat msgs 2->4, counter "0 chats"->"1 chats"), typing indicator ran; no PageError; no in-page restart affordance (chat session only; typing "bye" sets input disabled with "Refresh to restart" placeholder); 2x 404 = chat-area CSS background missing the `data:` prefix in `url("image/svg+xml,...")` (cosmetic only).
QWOP | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Note: W/O then Q/P key gaits drove the runner -> he tripped within 2 cycles (game-over overlay appeared, final 0.0m — classic QWOP flopping, distance never advanced), "Try Again" button resets (overlay hidden, distance 0.0m); R-key also bound for restart; first attempt died on a harness probe bug (.game-over is opacity-toggled, not display), fixed in harness only; favicon 404 only, no PageError.
Star Catcher | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Note: Space starts; ArrowLeft/Right chased stars -> score 0->11, lives 3->1 within ~30s (budget ran out 1 life short of game over, so restart path untested — code binds Space to reset() from 'over' state); favicon 404 only, no PageError.

# Play flow audit: Word Scramble (id 190)

## Identity / baseline

- Registered `games.json` id 190, url `Games/WordScramble/index.html` (verified; 116 entries).
- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (2 files, 34,696 bytes).
- Maintenance document basename: `docs/maintenance/games/190-wordscramble.md`.
- Provenance: `LICENSE` MIT `872c8463...` (upstream not restated in the inspected header comment; held).

## Source inspected

- `Games/WordScramble/index.html` blob `32b070547e202b40c26d33aa375fb4325d306259` inspected in ranges (1,304 lines total):
  - Lines 1-108 read via UI grep: header (`h1` "Word Scramble", rules/howto), HUD (`#round`, `#score`, `#time`, `#streak`, `#scrambled`, `#hint`, `#badge`, `#answer` input, `#msg[aria-live]`, `#checkBtn`, `#reshuffleBtn`, `#restartBtn`), `#endOverlay.overlay.hidden` (`#endTitle`, `#endScore`, `#endText`).
  - Lines 109-1104: embedded `words` array (objects `{word, hint, difficulty}`) - **data only, not read item-by-item** (held as data, not logic).
  - Lines 1105-1304 read completely: `ROUNDS = 10`, `TARGET = 100`, `timeMap { common: 20, rare: 25, exclusive: 30, legendary: 35 }`, `getWordClass`, `scramble`, `msg`, `updateHud`, `stopTimer/startTimer`, `pickWord`, `renderRound`, `timeUp`, `advance`, `check`, `reshuffle`, `endGame`, `startGame`, wiring + auto-start `startGame()` at load.

## Flow

- Boot: auto-starts (`startGame()` at file end) - first round live immediately (start overlay removed by design).
- Setup: `startGame()` resets `round=1, score=0, streak=0`, hides `#endOverlay`, `renderRound()` picks a random word, sets `wordClass` via `getWordClass` (declared `difficulty` field or length/repeat heuristic), `maxTime = timeMap[wordClass]`, renders `#scrambled` (`scramble()` shuffles uppercase letters, recursive retry if unchanged), `#hint` ("Hint: ..."), `#badge` (class label), clears `#answer`, starts 1 s `setInterval`.
- Input: type in `#answer` (`maxLength = correctWord.length + 4`), `#checkBtn` or Enter -> `check()`; `#reshuffleBtn` -> `reshuffle()` (re-scrambles, **timer keeps running**); `#restartBtn` -> `startGame`.
- Core loop: correct answer (`val === correctWord`, case-folded) -> lock round, stop timer, `.good` class, points `10 + bonus` (time bonuses `+10/+7/+5` inside first 5/10/15 s, `+5` streak >= 3, `+10/+15` for `exclusive`/`legendary`), `#msg` "Correct: <word>. +N points.", `setTimeout(advance, 1300)`. Wrong -> streak reset, `.bad` flash 400 ms, `#msg` "Not quite. Try again." (retry allowed, no round loss). Timeout -> `timeUp()`: streak 0, `#msg` "Time is up. The word was <word>.", `setTimeout(advance, 1600)`.
- Score/progression: HUD `#round` (capped at `ROUNDS`), `#score`, `#time`, `#streak`; `advance()` increments round, `round > ROUNDS` -> `endGame()`.
- Win/lose: `endGame()` -> `#endOverlay`: "You win" if `score >= TARGET (100)` else "Target missed", with `#endScore`/`#endText`.
- Restart/exit: `#restartBtn` in HUD (also active during play) restarts; end overlay has no separate restart (check markup at capture - `#restartBtn` remains reachable behind/beside overlay only if not covered; `startGame` is bound to it regardless).

## UI bloat classification: MILD

- Persistent: header howto paragraph (rules + keyboard help) always above HUD - candidate for one-time acknowledged help.
- Genuine HUD (keep): `#round/#score/#time/#streak`, `#scrambled`, `#hint`, `#badge`, `#answer`, `#checkBtn`, `#reshuffleBtn`, `#msg`.
- Popups: exactly one `#endOverlay` (end-of-match). No recurring nags/ads. `#msg` is inline status.

## Animation / simulation

- Timer is a real 1 s `setInterval` decrementing `timeLeft` (`startTimer`/`stopTimer`, guard `if (!running || locked) return`); `#badge`/`.bad`/`.good` class flashes are the only visual motion. No RAF, no card/dice animation.

## Findings

1. LOW - Stale-timeout race: `check()`/`timeUp()` schedule `setTimeout(advance, 1300/1600)`; if the player clicks `#restartBtn` within that window, `running` is true again and the pending `advance()` fires, immediately skipping to the next round (round counter jumps). Root: `advance()` only guards `running`. Fix: generation counter (`let sessionId = 0` incremented in `startGame`, captured by `advance`).
2. LOW - `getWordClass` fallback heuristic is dead for entries that declare `difficulty` (all inspected entries do); harmless. No fix.
3. LOW - `#hint` text "Hint: " prefix plus `#badge` class label duplicate information mildly; acceptable HUD, no fix.
4. Copy check: messages are sentence case, no em-dashes observed.

## Recommended playable view

Keep the HUD row, `#scrambled`/`#answer`/buttons, `#msg`. Fold the header howto paragraph into one-time acknowledged help with reopen. Keep `#endOverlay` (one-shot). No nags to add/remove.

## Validation

CODE-REVIEW ONLY. Smallest needed check: bounded local load, play 2 rounds (correct + timeout), trigger restart during the 1.3 s delay to confirm finding 1, finish 10 rounds, verify `#endOverlay` both win and miss paths; 360px screenshot.

# Play flow audit: Yahtzee (id 182)

## Identity / baseline

- Registered `games.json` id 182, url `Games/Yahtzee/index.html` (verified; 116 entries).
- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (4 files, 20,149 bytes).
- Maintenance document basename: `docs/maintenance/games/182-yahtzee.md`.
- Provenance (in-source): `github.com/taylorhansen/Yahtzee`, MIT, commit `26dec5d9750a536f1c4e9515bf7c69b6bd15683c`; start overlay removed, counters/target/end state added.

## Source inspected

- `index.html` blob `7e2d1f5cdbdcefc0ba9705dc270c265352c802f1` read completely (121 lines): `header.page-head` (h1 + rules paragraph), `header.hud` (`#totalScore`, "Target 200", `#rounds-left`, `#rolls-left`), `.dice-area` (five `label.die` with `.dice#0..4` + `input.hold0..4` checkboxes, `#roll` button), `#yahtzeeTable` (13 category rows `td.cell` + `#upperSecBonus` row), `#end-screen.overlay.hidden` (`#end-title`, `#end-detail`, `#restart-btn`).
- `script.js` blob `763a0a9415b1feee23022e6f5d33d2a876216974` read completely (453 lines): `yahtzeeGame()` bound via `window.onload`; `roll/rollReset/updateHeld/updateCounters`, `cellScore`, `upperSec/upperSecScore/checkUpperBonus`, `kind/kindScore`, `fullHouse`, `straight/checkStraightCombo`, `chance`, `yahtzee/yahtzeeExtend`, `endGame`, keyboard wiring (table Enter/Space, document Space=roll / 1-5=hold), `restart-btn` -> `window.location.reload()`.
- `style.css` blob `ddfa5389c2e5c5264728c2a2a17cd5d2034d10be` not read (4,942 B) - visual only, held.

## Flow

- Boot: no start screen; `window.onload = yahtzeeGame` wires everything, dice blank until first roll (`rollReset` clears `.dice` text), `updateCounters()` runs (Roll enabled, 13 rounds, 3 rolls).
- Setup: HUD fixed: Target 200, rounds left = `13 - scoredCount`, rolls left = `3 - rolls`.
- Input: tap `#roll`; tap a die (checkbox `#hold0..4`) to hold (first roll ignores holds by design: `held[i] === false || rolls === 0`); tap an open `td.cell` row to score; keyboard: Space rolls, 1-5 toggle holds (unless focus is INPUT/BUTTON/cell), Tab to rows + Enter/Space scores.
- Core loop: `roll()` randomizes unheld dice up to 3x -> `cellScore(name, value)` banks (writes `name+"Score"`, `rollReset`, `disable(name)` strike class + `tabIndex -1`, `total(value)`, `scoredCount++`), `updateCounters()` disables Roll at 3 rolls or after scoring.
- Score/progression: `#totalScore` accumulates; upper-section accumulator feeds `checkUpperBonus` (>= 63 -> +35, `#upperSecBonusScore`); Yahtzee 50 first, then `yahtzeeExtend()` appends a "Yahtzee bonus" row scoring 100.
- Win/lose: at `scoredCount >= 13`, `endGame()` -> `#end-screen` with "Target reached" (>= 200) or "Game over" + `#end-detail` final score line.
- Restart/exit: `#restart-btn` -> `window.location.reload()` (full reload; works but blunt).

## UI bloat classification: MILD

- Persistent: `header.page-head` paragraph with full rules + keyboard help (always above HUD) - fold into one-time acknowledged help.
- Genuine HUD (keep): `header.hud` counters, `.dice-area`, `#yahtzeeTable` (the scorecard IS the game UI), `#end-screen`.
- Popups: exactly one state-triggered `#end-screen` at game end (not recurring). No ads/nags/modals.

## Animation / simulation

- No RAF; dice are plain text digits in `.dice` (no rolling animation in script; any CSS dice styling is in unread style.css - no claims). All state is synchronous DOM updates; `disable()` adds `.strike`.

## Findings

1. MEDIUM - Header copy is factually wrong: `header.page-head` says "Six or more ones in the upper section earn a 35 point bonus", but `checkUpperBonus()` awards 35 when the upper-section **total** `upperSecAccumulator >= 63`. Players are misled about the bonus rule. Fix: reword to "Score 63 or more in the upper section for a 35 point bonus." Root: `index.html` `header.page-head`, logic in `script.js` `checkUpperBonus`.
2. LOW - Restart uses `window.location.reload()` instead of an in-page reset; acceptable but reloads assets and loses no state anyway. Optional: re-run `yahtzeeGame` state reset. No fix required.
3. LOW - Keyboard guard `target.classList.contains("cell")` throws if `target` lacks `classList`? Guarded by `target && target.classList &&` - actually the document-level handler checks `target.tagName === "INPUT" || "BUTTON" || target.classList.contains("cell")` without a `classList` guard; `document` targets have `classList`, `document.body` too - safe in practice (HTMLElement). No fix needed.
4. Note - `yahtzeeExtend` mutates ids (`yahtzee` id removed then re-created); verified consistent with later `getElm("yahtzee")` calls. No fix.

## Recommended playable view

Keep HUD, dice row, full scorecard, `#end-screen`. Move `header.page-head` paragraph into one-time acknowledged help with reopen. Fix finding 1 copy before any playable-view capture. No popups to add or remove.

## Validation

CODE-REVIEW ONLY. Smallest needed check: bounded local load, play 2 rounds with keyboard, score each category once, verify counters/bonus, finish to `#end-screen`, press `#restart-btn`.

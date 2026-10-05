# Play flow audit: Video Poker (id 181)

## Identity / baseline

- Registered `games.json` id 181, url `Games/VideoPoker/index.html` (verified; 116 entries).
- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (4 files, 38,681 bytes).
- Maintenance document basename: `docs/maintenance/games/181-videopoker.md`.
- Provenance (in-source): `github.com/varunbudati/VideoPoker`, MIT, commit `3f2e2ea791fb05afe1b5a82217d6cdccb1d80887`; fonts/gradient/alert() removed, keyboard + overlays added.

## Source inspected

- `index.html` blob `39e92657640a074b980ca35bd9af838adc31b093` read completely (171 lines): `header` (`h1`, `#game-type`, `p.howto` full controls text, `#theme-toggle-btn`), `.info-panel` (`#score`, `#current-bet`, `#decrease-bet`/`#increase-bet`), `.cards-container` `#card0..4` (`.card-inner`, `.card-back`, `.card-face .card-value/.card-suit`, `.hold-indicator`), `#deal-btn`, `#hand-result`, `.paytable table` (9 rows), `#game-select` (8 variants), `footer` credit, overlays `#bust-screen` and `#target-screen` (`.overlay.hidden` with buttons `#bust-restart`, `#target-new`, `#target-keep`).
- `script.js` blob `5c3da9c00c1a7ba8ca882170459829bb992b8fce` read completely (763 lines): constants (`INITCHIPS 1000`, `INITMINBET 10`, `MAX_BET_MULTIPLIER 5`, `SESSION_TARGET 2000`), `initializeDeck`, `onDealClick`, `dealNewHand`, `replaceDraw`, `toggleHold`, `displayCard`, `increaseBet/decreaseBet`, `changeGameType`/`setGamePaytable`/`updatePaytableDisplay`, `recognize` + `flush/straight/four/full/three/twopair/pair`, `resetGame`, overlay + keyboard wiring, `loadThemePreference`/`toggleTheme` (`localStorage 'videoPokerTheme'`).
- `style.css` blob `cf3dbaa9ea0344e5b836a4caaae5ab10c2cbd315` not read (9,925 B) - visual layout only, held.

## Flow

- Boot: `DOMContentLoaded` wires listeners + `initializeDeck`; also a second `initializeDeck()` at file end (redundant but idempotent). No start overlay (removed by design) - game ready on load.
- Setup: `#game-select` picks variant -> `setGamePaytable` mutates `paytable` and refreshes the on-screen table; `#increase-bet`/`#decrease-bet` adjust `bet = betmultiplier * minbet` only when `firstDeal`.
- Input: tap cards to toggle `.held` (only when `!firstDeal`); `#deal-btn` Deal -> Draw; keyboard `1-5` hold, `Enter`/`Space` deal, `ArrowUp/Down` bet (guarded: overlays open, INPUT/SELECT targets, focused BUTTON Enter/Space all ignored).
- Core loop: `dealNewHand` (deducts `bet`, deals 5 from a 52-card `deck[]` with `gone` flags) -> `replaceDraw` (replaces non-held) -> `recognize()` -> `score += paytable[handType] * bet` -> `#hand-result` text, paytable row `.active` highlight -> bust/target checks.
- Score/progression: `#score` balance, `hands` count, `score_low`/`score_high` tracked (high/low not displayed), session win at `>= 2000` chips.
- Win/lose: lose = `score < bet` after payout -> `#bust-screen` ("Out of chips", `#bust-detail` "You ran out of chips after playing N hands.") after 1 s; mid-game low balance just rewrites `#hand-result` ("Low on chips. Bet reduced to N."); session win = first time `score >= SESSION_TARGET` -> `#target-screen` ("Session won", `#target-detail` "You grew 1000 chips into N.", buttons Keep playing/New game) after 700 ms.
- Restart/exit: `resetGame` (via `#bust-restart`/`#target-new`) restores 1000 chips, clears overlays/cards; `#target-keep` dismisses and continues. No dead ends.

## UI bloat classification: MILD

- Persistent: `p.howto` paragraph in the header (full controls/rules text, always visible), `.paytable` (genuine reference HUD - keep), `#game-type` label (keep).
- Genuine HUD: balance/bet panel, cards, `#deal-btn`, `#hand-result` (one-line feedback, keep).
- Popups: two overlays, both state-triggered and one-shot (`#bust-screen` hard gate, `#target-screen` once per session via `sessionCelebrated`). **No recurring nag/ad/info popups.** `#hand-result` replaces the old alert() popups - good.

## Animation / simulation

- No RAF. Card reveal via `.flipped`/`.held` class toggles (CSS flip in unread style.css - no claims); `setTimeout` delays (700/1000 ms) gate overlays. Timer-free; deal logic synchronous.

## Findings

1. MEDIUM - Balance can go negative in the 1-second window before `#bust-screen` appears: the bust check runs `setTimeout(..., 1000)` after `replaceDraw`, and `dealNewHand` deducts `bet` with no `score >= bet` guard, so a quick second Deal while the overlay is pending drives `#score` negative. Root: `dealNewHand` (`score -= bet`) called from `onDealClick`; caller `#deal-btn`. Fix: guard `onDealClick` with `if (score < bet) return;` (and/or show the overlay synchronously).
2. MEDIUM - `setGamePaytable(AllAmerican)` sets `paytable[PAIR] = 1` (and the table row updates to show Pair pays 1), but `pair()` only accepts pairs `>= JACK` unless `game === TensOrBetter`; All American therefore pays nothing for 2s-10s pairs while its displayed paytable implies any pair pays. Root: `pair()` min selection vs `setGamePaytable` `AllAmerican` branch. Fix: extend `pair()` min (`if (game === TensOrBetter || game === AllAmerican) min = TWO;`) or correct the displayed paytable row for the variant.
3. LOW - Dead game-type constants `BonusPoker`, `DoubleBonus`, `DoubleBonusBonus` are declared but unreachable from `#game-select` (8 visible options). Remove or expose; no behavior impact.
4. LOW - `initializeDeck()` runs twice (DOMContentLoaded + file end). Harmless; drop the second call.

## Recommended playable view

Keep `.info-panel`, cards, `#deal-btn`, `#hand-result`, `.paytable`, `#game-select`, `#theme-toggle-btn`, both state overlays. Fold `p.howto` into one-time acknowledged help with reopen. No popups to add; overlays are legitimate end-states, not nags.

## Validation

CODE-REVIEW ONLY. Smallest needed check: bounded local load, play 3 hands with keyboard, trigger bust (fast-click during the 1 s window to reproduce finding 1), check All American pair payout, verify `#target-screen` at 2000 chips and `resetGame`.

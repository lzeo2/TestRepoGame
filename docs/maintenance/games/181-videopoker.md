<!-- maintenance-game: Games/VideoPoker -->
# Video Poker maintenance

## Identity and status

Registered ID 181, `classic`, not featured; entry `Games/VideoPoker/index.html`. Baseline `8c8a055` contains four files, 38,681 bytes. The eight selectable variants are backed by local DOM/JavaScript, not an external casino service. Runtime offline behavior remains untested in this documentation-only assignment.

## Implementation map

Source review coverage: complete `index.html`, `script.js`, `style.css`, `LICENSE`; no compiled engine omitted. Script caches `#deal-btn`, `#score`, `#game-select`, `#hand-result` and `#card0` through `#card4`. `DOMContentLoaded` binds click/change handlers, initializes the deck and updates displays. A second top-level `initializeDeck()` is redundant initialization, not a second gameplay loop.

`onDealClick()` alternates `dealNewHand()` and `replaceDraw()`. Deck objects have `index`, `suit` and `gone`; discarded cards remain unavailable until the next hand. Held state lives in `.held` DOM classes. `recognize()` sorts a copy into `shand` and calls `flush`, `straight`, `four`, `full`, `three`, `twopair`, `pair`. `setGamePaytable()` changes payouts; `pair()` changes the minimum rank for Tens or Better. `resetGame()` clears balance, hand displays and overlays, but retains the selected variant and theme.

## Gameplay and controls

Auto-ready table starts with 1,000 chips and a 10-chip wager. Deal takes the wager and deals five cards; selecting cards holds them; Draw replaces the others and settles the hand. 1-5 toggle holds, Enter/Space deal/draw, Up/Down change the wager in 10-chip units up to 50. Buttons and cards accept clicks/taps; cards are non-focusable divs, so numeric shortcuts provide keyboard play rather than native card activation. The menu exposes Jacks or Better, Tens or Better, All American and five alternate Jacks or Better paytables. Unused bonus-variant constants are not available menu features. At 2,000 chips a delayed celebration permits continuing or resetting; insufficient minimum funds lead to a delayed bankruptcy overlay. There is no sound implementation.

## State and persistence

`firstDeal`, `hand`, `deck`, `score`, `betmultiplier`, `hands`, extrema and `sessionCelebrated` are in-memory. Balance/hand progress do not survive reload. Only `videoPokerTheme` is stored. `loadThemePreference()` and `toggleTheme()` perform unguarded storage access. Win/bust/low-balance feedback uses 700/1000 ms timeouts without handles or session tokens. Reset cannot invalidate those delayed callbacks. There is no ongoing timer or animation-frame engine, although CSS flips/transitions animate cards and theme colors.

## Dependencies and provenance

Local `script.js` and `style.css` are the entire runtime dependency set. `LICENSE` has MIT terms for Varun; HTML visibly credits Varun Budati. HTML and [sources_7](../../catalog_parts/sources_7.md) record `https://github.com/varunbudati/VideoPoker` at `3f2e2ea791fb05afe1b5a82217d6cdccb1d80887`. This audit checked shipped evidence, not remote source identity. No card-art, font or audio fetch appears in the inspected files.

## Audit findings

- **HIGH**, `script.js`, `dealNewHand()`/`increaseBet()`/`replaceDraw()`: no affordability guard precedes deduction. Low-fund reduction runs only when `score < minbet`, not `score < bet`. Recommended repro: finish a hand with 10-40 chips, increase bet to 50, Deal. Balance becomes negative. Root fix: require an affordable bet at the shared deal boundary and clamp wager controls after settlement.
- **MEDIUM**, `script.js`, `changeGameType()`: selector remains active between Deal and Draw, allowing a paid hand to change its evaluation/payout rules. Root fix: disallow variant changes during a hand, or snapshot variant/paytable at Deal.
- **MEDIUM**, `script.js`, delayed overlays in `replaceDraw()`: reset leaves callbacks able to display results from an older session. Root fix: track/cancel timeout handles or verify a generation token.
- **MEDIUM**, `script.js`, `loadThemePreference()`/`toggleTheme()`: denied storage throws instead of falling back. Root fix: catch optional preference reads/writes; do not couple theme persistence to game success.

## Safe iteration

Preserve evaluator constants, ace-low straight handling and discard exclusion. Root fixes belong in `dealNewHand()` and variant/lifecycle functions, not just button handlers. Keep keyboard and pointer callers aligned. Use semantic held buttons or explicit pressed state without changing card identities. Runtime patches are not authorized by this document task.

## Verification

Actually run: blob-based JavaScript syntax and document/catalog checks; see [batch audit](../audits/games-66.md). No native sessions/screenshots. Reproduce syntax with `git show HEAD:Games/VideoPoker/script.js | node --check`. Recommended native cases: five-card holds, ace-low straight, each menu variant, low-bankroll maximum bet, mid-hand variant switch, immediate reset before overlay, denied storage, and both theme layouts at phone width. Historical short playtests did not reach bankruptcy or session reset and cannot certify those paths.

## Future outlook

Prioritize affordable wagering and immutable hand rules in week one. Then address delayed callbacks, storage resilience and accessible held-state announcements. Review mobile light/dark screenshots and reduced-motion flips before any broad shell polish. Defer new poker variants, stats persistence and strategy assistance until current eight variants have deterministic evaluator and payout coverage.

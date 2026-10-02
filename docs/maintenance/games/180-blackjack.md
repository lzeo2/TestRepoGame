<!-- maintenance-game: Games/Blackjack -->
# Blackjack maintenance

## Identity and status

Registered ID 180, category `classic`, not featured. Entry: `Games/Blackjack/index.html`. Reviewed source baseline `8c8a055`. Four tracked files total 29,452 bytes. This is an ingested DOM card game, not a canvas or emulator port. Local CSS, JavaScript and synthesized sound suggest offline dependency closure; no browser/network verification was performed in this audit.

## Implementation map

Source review coverage: all of `index.html`, `script.js`, `style.css` and `LICENSE` read. There is no unread compiled engine. HTML inline handlers call the global script functions; the final `enterGame()` initializes the table immediately, despite obsolete start-screen lookups.

`createDeck()` shuffles 52 rank/suit objects. `calculateScore()` lowers aces from eleven to one when needed. `startGame()` validates the wager, deducts chips, deals two hands, and calls `settleNaturals()`. `hit()`, `stand()`, `doubleDown()` and `handleSplit()` eventually reach `processDealerTurn()` and `evaluateHandScore()`. `endGame()` publishes payouts and overlays. Useful DOM anchors are `#bet-input`, `#game-controls`, `#split-hand-section`, `#active-hand-indicator`, `#status-message`, `#win-screen` and `#broke-screen`.

## Gameplay and controls

The table starts ready for betting. Chip buttons assign 10/50/100/500 rather than adding their printed amounts. Deal starts a hand; H hits, S stands, D doubles and Enter deals when betting. Native buttons support keyboard activation and pointer/touch clicks. Split appears for equal ranks with sufficient bankroll. Dealer stands on every 17, including soft 17. Player naturals pay a floored 3:2 profit; simultaneous naturals push. Split hands are settled separately. Reaching 2,000 chips shows a once-per-session celebration; bankruptcy offers another 1,000-chip buy-in. New session clears hands but deliberately retains peak bankroll/rank history. Audio uses short Web Audio oscillators without asset downloads or a mute control.

## State and persistence

Global arrays hold deck/player/split/dealer cards; `activeHandIndex`, `isSplit` and `gameOver` determine turn flow. `chips`, `highestBankroll` and `currentTitle` persist under `bj_chips`, `bj_highest`, `bj_title`. Reads/writes are caught, but `parseInt` accepts prefixes and negative values. Hand contents are not saved: reload after the initial bet deduction abandons that hand. Split/double deductions are not immediately saved, unlike the initial bet. `checkBrokeState()` schedules an untracked 600 ms callback; reset does not cancel it. Oscillators stop themselves; there is no continuous animation loop.

## Dependencies and provenance

`LICENSE` contains MIT terms for Vimal Ram. HTML and [historical source evidence](../../catalog_parts/sources_7.md) identify `https://github.com/Vimal9RAM-NAP/blackjack-web`, revision `81e00b0e7021c41a9a7dbbea5369e8d00ef498bb`. These are repository-held ingestion records, not a fresh upstream comparison. Cards are text glyphs; no bundled third-party image/font dependency appears. Keep the notice and the recorded modifications with the port.

## Audit findings

- **MEDIUM**, `script.js`, `doubleDown()` and document `keydown`: D still doubles after a hit hides `#double-btn`; the handler checks only `inHand()`. After splitting it also acts on `playerHand` rather than the active hand. Impact: shortcuts bypass supported action rules. Root fix: centralize eligibility checks in each action, including two-card/non-split requirements, rather than trusting button visibility.
- **MEDIUM**, `script.js`, `checkBrokeState()`: queued bankruptcy can appear after `resetGame()` restores funds. Repro recommendation: go broke, immediately reset, wait 600 ms. Root fix: cancel the callback or recheck chips/session identity when it executes.
- **MEDIUM**, `style.css`, `body`: flex defaults to a row while `.page-head` and `.game-container` are sibling full-width elements. Mobile layout needs native inspection; a column direction is the smallest likely correction, not a table redesign. Visual impact is not measured here.

## Safe iteration

Change action guards in shared functions, because HTML and shortcuts both call them. Keep natural settlement distinct from ordinary wins. Test both split hands before changing wagers; do not replace the upstream engine. Retain existing save keys and explicitly decide whether reset should clear rank history. Runtime edits require a separate lease and rollback commit.

## Verification

Actually run: classic JavaScript syntax checks from Git blobs, catalog identity/source existence assertions and document checks, as recorded in [batch audit](../audits/games-66.md). Native/browser checks: zero. Recheck script with `git show HEAD:Games/Blackjack/script.js | node --check`. Recommended native sequence: valid/invalid bet, natural/push, hit then D, split both outcomes, bankrupt/reset race, reload during a hand, and blocked storage. Capture desktop/mobile screenshots and focus behavior before declaring layout fixed.

## Future outlook

First repair action eligibility and bankruptcy lifecycle, then reconcile save timing with abandoned-hand behavior. Week-two refurbishment should add modal focus containment, live payout announcements and optional mute, with reduced-motion handling for `.draw-anim`. Defer new betting variants until rule/payout regressions and provenance review are complete; no real-money functionality is proposed.

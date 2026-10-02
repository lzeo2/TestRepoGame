<!-- maintenance-game: Games/GoFish -->
# Go Fish maintenance

## Identity and status

Registered ID 184, `classic`, not featured. Entry `Games/GoFish/index.html`; two tracked files total 27,151 bytes at `8c8a055`. Auto-starting single-file port includes all layout and game logic plus a separate MIT notice. Source has no remote runtime dependency; no current native turn or network test was run.

## Implementation map

Source review coverage: complete `index.html` including inline CSS and the private-method `GoFish` class, plus `LICENSE`. There is no separate compiled engine. Constructor captures `#newGameBtn`, `#difficultySelect`, `#yourCards`, `#opponentCards`, `#fullDeck`, fish piles, `#scoreline`, `#popup`; bottom-level `new GoFish()` and `game.newGame()` bootstrap play.

DOM card groups are the actual hand model: `data-level` identifies ranks and `data-type` suits. `#getGroup`, `#passCards`, `#addToCardsFromDeck` and `#addToFish` relocate nodes. `#checkForCompleteBlocks()` converts four-card groups into books. `#processTurn()` dispatches player/AI turns; `#waitForYourGuess()` and `#waitForYourFish()` await clickable/focusable cards. `#generateOpponentGuess()` uses rank knowledge, draw counts and difficulty. `#updateInfo()` bounds AI knowledge from remaining cards.

## Gameplay and controls

Seven cards are dealt to each player; starting side is random. Ask by clicking/tapping an eligible top card of a held rank or tabbing to it and pressing Enter/Space. A failed ask requires drawing from the deck. A drawn matching rank retains the turn. Each book is four cards; first to seven books wins, with a dialog offering another game. New game and difficulty changes ask for confirmation. Easy/Medium/Hard/God change AI selection; God deliberately sometimes reads the player's hand. This intended difficulty behavior is not a security exploit. The opponent's hand is visually hidden. No sound remains.

## State and persistence

Private fields hold turn/game-over flags and AI rank maps, while cards remain DOM-backed. Only difficulty persists under the generic key `difficulty`; hands/books are not saved. `#runId` prevents an old main turn loop from continuing after restart, and `#yourInputReject` aborts a pending ask/draw. Animation waits use many short `setTimeout` promises. Intermediate animation methods do not all check run identity after awaits; cancellation coverage should be reviewed before extending restart behavior. A capture-phase event blocker consumes input during animations and repeated clicks shorten delays. Dialog cancel is always prevented, so Escape does not dismiss confirmations.

## Dependencies and provenance

HTML cites `https://github.com/surenenfiajyan/go-fish`; MIT `LICENSE` names Suren Enfiajyan. [sources_8](../../catalog_parts/sources_8.md) describes class ingestion and discarded remote audio/art, but supplies no pinned upstream revision for this game. Pin remains unknown; do not invent it. CSS card faces use rank/suit letters and modern `:has()`/container units. These require browser compatibility checks, not additional dependencies. Historical welcome-dialog documentation is stale: current instructions are a static note.

## Audit findings

- **HIGH**, `index.html`, constructor assignment of `#difficultySelectEl.value`: unguarded `localStorage.getItem('difficulty')` can throw before `game.newGame()`, leaving an empty table when storage is denied. Root fix: catch the read with the same fallback used for writes; separately namespace/migrate the generic key.
- **MEDIUM**, `index.html`, `#fullDeck` markup and `#addCardClickListener()`: deck ancestor has `aria-hidden="true"`, while its drawable child becomes focusable and sets `aria-hidden="false"`. Child visibility cannot override a hidden ancestor. Recommended repro: use a screen reader during a failed ask. Root fix: remove ancestor hiding for the active interactive deck and expose only its draw control.
- **MEDIUM**, `index.html`, `#popup.oncancel`: blanket cancellation prevention removes Escape from ordinary confirmation dialogs. Root fix: allow decline/cancel where `onDecline` exists and preserve terminal restart flow deliberately.
- **LOW**, `index.html`, `#shuffle()`: selecting from the entire array on every iteration biases permutations. Minimal fix is shrinking-range Fisher-Yates, preserving the rank/deal model.

## Safe iteration

Do not replace DOM-backed cards independently of AI accounting and book queries. Maintain private fields and run cancellation while fixing storage/accessible draw handling. Keep intentional God-mode information advantage. A broader animation rewrite is unnecessary; test each await boundary before adding a small run-token guard. No runtime edits are authorized here.

## Verification

Actually run: inline-script syntax and catalog/doc assertions, [batch audit](../audits/games-66.md). Native/browser checks: zero. Recommended native sequence: wait for deal, take a real ask turn, failed ask/draw, book collection, seven-book result, restart during ask and after animation, denied storage, Escape decline, screen-reader deck selection. Historical quick play ran the removed welcome dialog and did not verify a turn, so its partial result is not current evidence.

## Future outlook

Fix startup storage failure first, then active-deck accessibility and confirmation cancellation. Month refurbishment should verify mobile hit targets, reduced-motion waits and browser support for selector features. Defer richer difficulty explanations or persistent matches until source pin and cancellable-session behavior are documented and tested.

# Go Fish (id 184) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 184, registered, directory `Games/GoFish/` (2 files: LICENSE + index.html).
- Entry: `index.html`, blob 0f19efcdeb5a6a4469ad2973239d731699297bf0, tree 21e7929e494a1b33a373af6bfefebc3d7c7ef83d, 26,079 B, 793 lines.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Header comment: adapted from "go-fish" by Suren Enfiajyan, MIT (github.com/surenenfiajyan/go-fish); changes documented (single-file, flat restyle, no sound pack, rules dialog replaced with non-blocking note).

## Source inspected
- Lines 1-242: head, CSS (incl. `dialog` styling, `.message`, `.rules-note`).
- Lines ~243-274: markup: `<header>` with `#newGameBtn`, `#difficultySelect` (easy/medium/hard/god), `#scoreline`; `.rules-note` paragraph; `#opponentCards/#opponentFishes/#fullDeck/#yourFishes/#yourCards`; `<dialog id="popup">` with `.message` and Yes/No form buttons.
- Lines 275-470: `class GoFish` start - private fields (`#runId`, `#gameOver`, `#yourTurn`, `#blockEvents`), constructor wiring (`#newGameButtonEl.onclick -> #showDialog('Start a new game?', ...)`, difficulty change persists `localStorage['difficulty']`), event blocker listeners, `newGame()` deal loop (7 cards each side, `while (#runId === runId && !#gameOver) await #processTurn()`), `#showDialog` (`popup.showModal()`, Yes/No text swap), `#addToCardsFromDeck`, `#checkForCompleteBlocks`, `#addToFish`.
- Line-index grep of remainder: `#processTurn` at 512; loss dialog at 521 "You lost! The computer won 7 books..."; win dialog at 528 "You won! You collected 7 books..."; `#shuffle` at 536; message positioning near 747. Bodies of `#processTurn`, AI ask logic (512-793) NOT read line-by-line: HELD.

## Flow
- Boot: DOM -> `new GoFish()` constructor (auto game start via... constructor does not call `newGame()` in inspected range; the initial deal call site is in the held tail - HELD).
- Start/setup: `#newGameBtn` always confirms via modal; `#difficultySelect` persists difficulty, offers new game.
- Input: click/keyboard on `.card[tabindex]` elements (CSS focus/hover present), guarded by `#blockEvents` blocker with `cursor: wait`.
- Core loop: `#processTurn()` async turn machine (held body); books collected via `#checkForCompleteBlocks` -> `#addToFish`.
- Score/progression: `#scoreline` and book piles (`.your-fishes/.opponent-fishes`); first to 7 books wins.
- Win/lose: `#showDialog` with play-again Yes (lines 519-528).
- Restart: dialog Yes -> `this.newGame()`; `#runId` invalidates stale loops.

## UI bloat classification: MILD
- Persistent: `.rules-note` strip across the top every visit (non-blocking rules text - documented replacement for the old dialog; genuine onboarding but recurring).
- Genuine game UI: header controls, `#scoreline`, board areas. No ad/decorative cards.

## Popup modal inventory
- `<dialog id="popup">` (single reusable modal), triggers: (a) New game click - "Start a new game?"; (b) difficulty change - "New difficulty applies..."; (c) win - play again?; (d) loss - play again?. `oncancel` prevents Esc-dismiss. Not a recurring nag: only on explicit user action or game end.

## Animation/simulation
- Card deal/move uses CSS `transition` + `await this.#wait(duration)` (150ms) sequencing in `#addToCardsFromDeck`/`#addToFish` - real state-driven DOM animation tied to game events, `#calculateDuration` collapses to 0ms after rapid clicks. No decorative loop.

## Findings
1. (Low) `.rules-note` persists on every load; move into one-time acknowledged help with optional reopen in a future change. No fix now.
2. (Info) Held: `#processTurn` and AI ask logic unread; win/lose claims rest on dialog call sites at lines 519-528, not full turn-logic review.

## Recommended playable view
- Keep header controls, `#scoreline`, card areas and book piles; replace `.rules-note` with one-time help; keep the `#popup` dialogs (user-triggered only).

## Validation status
CODE-REVIEW ONLY. Smallest needed check: browser-load, deal, ask a rank, complete a book, reach a win/loss dialog, start a new game and change difficulty.

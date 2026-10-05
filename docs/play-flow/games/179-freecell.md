# FreeCell (id 179) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 179, registered, directory `Games/FreeCell/`.
- Entry: `index.html`, blob 5f66a4cf53e9f3cfafb662d097245f7540845b4f, tree 18eac0fc6291ff7a71eb8cf4a3943046b2d984c2, 4 files (LICENSE, index.html, script.js, style.css).
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Ingested from github.com/taeber/freecell, MIT, commit e1249a7, per the header comment (landing page/service worker/share/app-info removed, keyboard play and no-moves-left banner added).

## Source inspected
- `index.html` read in full: header `.page-head > h1 + p` with static rules/controls text ("Move all 52 cards to the four foundations... Keyboard: Tab to a card and press Enter to move it, U undoes, A toggles Auto/Pick, N starts a new game"), `<main></main>`, `<script src="script.js">`.
- `script.js` blob 56ceea5f3f4740e70471532c03d6dfbc1066d3cb, 25,058 B: inspected lines 1-~260 (rules: `canPutInCell`, `canPutOntoFoundation`, `canPutOntoCascade`, `makeGameData`, `makeHistory`, `distribute`, `checkedMove`, `moveFromCell`, `moveFromCascade`, `automove`, `move`, `easymove`, `lost`, start of `Play`), plus a complete function index for the remainder: `Card`, `shuffle`, `Deck`, `decode/encode`, `RandomDeck/OrderedDeck`, `renderCard/renderCells/renderFoundations/renderCascades`, `formatTime`, `renderWinner`, `renderStuck`, `Renderer`, `App`, `doc.addEventListener("keydown")` at line 836. Bodies of `Play` (356-408), `lost` details, `Renderer` (604-818) and `App` (819-end) NOT read line-by-line: HELD.

## Flow (from inspected source)
- Boot: `script.js` builds a `Renderer(dom, onNextFrame, window)` and `App(window)`; game auto-starts (header comment: start overlay removed, auto-start).
- Start/setup: `Play(renderer, onNewGame, params)` deals via `distribute(cascades, deck)`; `N` key / new-game path re-deals.
- Input/core loop: pointer taps plus keyboard (`keydown` listener at script.js:836; Tab/Enter select-move, `U` undo, `A` auto/pick, `N` new game) per header and `App` wiring (App body held).
- Score/progression: moves counter and timer surfaced through `formatTime`/`renderWinner(won, moves, started, ended)`; foundation build via `canPutOntoFoundation` (ace up by suit).
- Win/lose: `renderWinner` on win; `lost(data, history)` (no-moves-left) -> `renderStuck(won, stuck)` banner.
- Restart: `onNewGame` callback path; exact key binding body in held `App` region.

## UI bloat classification: MILD
- Persistent: `.page-head > h1 + p` - a full rules/controls paragraph rendered on every visit (genuine onboarding copy, but persistent rather than one-time). No ads, no modals, no decorative cards in inspected markup.

## Popup/modal inventory
- None in `index.html`. Any `<dialog>`/banner created by `renderStuck`/`renderWinner` are in held script region; they are result banners, not recurring nags, per their call sites (post-loss/post-win).

## Animation/simulation
- Rendering goes through `Renderer` + `onNextFrame` scheduling (renderer RAF); card motion/state model in held `Renderer` body. No decorative animation claim made here.

## Findings
1. (Low) Persistent instructions paragraph duplicates the help role; a future change could move it to a one-time acknowledged help with optional reopen. No fix in this docs-only pass.
2. (Info) Held regions: `Play`, `Renderer`, `App` bodies unread; keyboard binding details beyond the header claim need confirmation in the next source pass.

## Recommended playable view
- Keep `#main` board, foundation/cascade rendering, undo/auto/new-game actions and the win/no-moves banners; move `.page-head p` copy into a one-time help (reopenable) if a later change is authorized.

## Validation status
CODE-REVIEW ONLY. Smallest needed check: browser-load, deal a game, make a move by tap and keyboard, force a win or no-moves banner, press `N` to restart.

# Dominoes (id 201) - play-flow audit report

CODE-REVIEW ONLY. No browser run in this pass.

- Identity: id 201, registered, url `Games/Dominoes/index.html`.
- Baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 25 files, 5849737 bytes (music.mp3 is 4.8MB).

## Source inspected

- `Games/Dominoes/index.html` blob `f5cc5f173b53ad84a49fefec6a1e6605709a308d` (3827 bytes, read completely).
- `Games/Dominoes/touch.js` blob `c201b57713d579b07ab77ffb9bf3c3d39d5bb7b2` (read completely). Functions: `drag`, `allowDrop`, `drop`, `addTouchEvents`, `clearSelection`, `selectTile`, `placeInSlot`, `checkAllDropBoxesFilled`, `openNewPageIfAllFilled`; `window.onload` shuffles `#drag` children; a random `block1..8` is pre-placed into `#mesto1`.
- `Games/Dominoes/bravo.html` blob `cd10edcc7645cd8dce599bbeb5f15bae636d2d23` - not read (win page, listed as held). Inline `<script>` in index.html (audio/localStorage check) read with the file.

## Flow

- Boot: header `h1` + instruction `<p>`, `<audio id="backgroundMusic" autoplay loop src="music.mp3">`, `#drag` tray of 8 `.images` tiles (`#block1`-`#block8`, CSS `--img:url(1.png..8.png)`), `#board` with 8 `.dropBox` slots (`#mesto1`-`#mesto8`), restart `<button class="reset" onClick="window.location.reload()">`.
- Start: no start screen; `window.onload` randomizes tray order and drops one random tile into `#mesto1`.
- Input: HTML5 drag (`dragstart` -> `drop`) for mouse; `touchstart/touchmove/touchend` + `elementFromPoint` for touch; click/Enter/Space select (`selectTile` sets `.selected` + `draggedElementId`) then click/Enter/Space on a slot (`placeInSlot`).
- Core loop: none - no RAF, no timers besides `<audio loop>`. State = DOM child order.
- Progress/win: `openNewPageIfAllFilled()` runs after every placement; if all 8 `.dropBox` children match one of 8 hardcoded winning permutations (alternating parity orders of `block1..block8`), it navigates to `bravo.html`.
- Lose: none in source. Wrong orders silently do nothing (see finding 1).
- Restart: `window.location.reload()` on `.reset` button (aria-label "Restart").

## UI bloat: MILD

- Persistent: `header.gamehead` title + full rules paragraph above the board (always visible description), restart button image.
- Genuine game UI: `#drag`, `#board`.
- Popups/modals: none. Win = full page navigation to `bravo.html` (held). No ad/info/nag popups.

## Animation

- No authored animation or simulation loop. Only `audio.loop` playback. Nothing held.

## Findings

1. HIGH - no feedback on wrong placement: `openNewPageIfAllFilled()` returns silently when no order matches; a player can fill all 8 slots incorrectly and get no "try again"/loss state, and nothing resets except the reload button. Smallest fix: when all slots are full and no order matches, show an inline status line (or shake the board) telling the player to clear/restart; keep reload button.
2. MEDIUM - the win condition is parity-order matching (alternating evens/odds), not real domino matching rules; the header text says "so matching ends line up", which overclaims. Either align copy with the actual permutation rule or leave code and fix copy after a rules decision. Do not fabricate new rules.
3. MEDIUM - `<audio autoplay loop>` (4.8MB music.mp3) starts without user gesture and only plays afterwards if `localStorage.musicPlaying === 'true'`, but nothing in this folder ever sets that key (grep of index/touch.js shows only `getItem`). Behavior is inconsistent (autoplay may be blocked by browsers). Fix: gate `audio.play()` behind the first pointer/keydown.
4. LOW - inline `ondragstart/ondrop/onclick` handlers and `window.location.reload()` are acceptable for this size; `node --check` style review: no syntax issues seen in `touch.js`.

## Recommended playable view

Keep `#drag`, `#board`, restart button; move the `header.gamehead` rules paragraph into one-time acknowledged help (reopenable). Add an inline result status instead of silent wrong-fill. No popups to remove.

## Validation

CODE-REVIEW ONLY. Smallest needed check: load page, drag one tile to an empty slot, tap-place on touch, fill all 8 correctly (expect `bravo.html`), fill incorrectly (expect finding-1 behavior), press Restart.

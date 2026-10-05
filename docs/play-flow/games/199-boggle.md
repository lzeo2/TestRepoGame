# Boggle — play-flow audit (batch 1)

- Identity: catalog id 199, registered. `Games/Boggle/`, entry
  `Games/Boggle/index.html` (blob `485d0378f513c7028f4d1b0d065556a2a6dfbc81`,
  10,973 B, 121 lines; single self-contained file), source baseline
  `5be686e1ab350c8ddce7a827c413612e421c3a5c`. `CREDITS.md` (1d6ddb2b) and
  `LICENSE` (6175876c) present, not read.
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` `<script>` block (lines 24-121), **read fully**. Real names:
  `BDICT` word set, `PLANTS` seed list, `PTS={3:1,4:1,5:2,6:3,7:5}`,
  `SIZE=4`, ids `grid`, `cur`, `msg`, `time`, `score`, `wc`, `best`, `found`;
  functions `neighbors`, `plant`, `randLetter`, `gen`, `render`, `paintPath`,
  `cellOf` (uses `document.elementFromPoint`), `extend`, `commitWord`,
  `evaluate`, `drawFound`, `flash`, `tick`, `inGridPath` (DFS validator);
  `best = localStorage.getItem('boggleBest')`.
- Entry markup above the script (grep-inspected): `h1` "Word Boggle", HUD row
  with the ids above plus `#new` button.

## Flow (from source)

- Boot: `gen()` runs immediately at script end and sets `window.__READY__=true`.
- Start/setup: `gen()` builds a 4x4 grid, plants up to 5 words from `PLANTS`
  (random-walk placement with 300 attempts each), fills gaps from `FILL`
  letter bag, resets score, `time=90`, clears found set, starts
  `setInterval(tick, 1000)`.
- Input: pointer drag on `#grid` (`pointerdown` → `pointermove` `extend` →
  `pointerup` `evaluate`), path rules in `extend` (no repeats, adjacency,
  backtrack-by-two pops); keyboard typing (`document.keydown`: letters append
  to `typed`, Backspace edits, Escape clears, Enter validates via
  `inGridPath` then `commitWord`).
- Core loop: no frame loop; 1 s `tick()` decrements `time`.
- Score: `commitWord` — rejects <3 letters, words not in `BDICT`, repeats;
  `PTS` by length, updates `#score`/`#wc`, new best written to
  `localStorage 'boggleBest'`.
- Win/lose: `tick()` at `time<=0` → `over=true`, `clearInterval(timer)`,
  `flash('Time is up. Final score N. Press New board.')`. No separate win
  state (open-ended score attack).
- Restart: `#new` (`onclick=gen`) rebuilds board and restarts the timer; no
  timer leak (`clearInterval(timer)` inside `gen` and on game over).

## UI bloat: NONE

- `h1`, compact HUD stats, `#msg` status line, `#found` word list, `#new`
  button — all genuine game HUD. No description cards, no modals, no ads.

## Popups / modals

- None. Feedback is text flashes in `#msg` (`flash(t, col)`).

## Animation / simulation

- State-tick model only (`tick` interval + DOM class `.sel` path highlight).
  No canvas, no decorative animation.

## Findings

- No defects found in inspected source. Notes: dictionary is a compact custom
  word list (common words only), so valid English words can be rejected —
  by design of `BDICT`; message copy already reports the rejection.
- LOW — `PLANTS` includes duplicates ("gold", "tale", "ring", "boat",
  "hand", "cloud", "light", "plant"), harmless because `gen()` shuffles and
  attempts only 5 successful plants.
- `gen()` runs before any first-time hint; not a defect, just behaviour to
  know: the board is live on load.

## Recommended playable view

Already minimal: keep HUD, `#found`, `#new`. Nothing to trim; no help popup
exists (the short instructions line above the grid, if present in markup,
can stay or move to one-time help — no recurring popups either way).

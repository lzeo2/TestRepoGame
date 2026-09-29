# Sweep Worker F1 — Fix Wave Report

Date: 2025-09-29 · Scope: worker-A filter gap (FIX 1) + worker-B/E thumbnail gap (FIX 2).
Files touched: `assets/portal-ux.js`, `index.html` (inline `<style>` block), this report + screenshot.
Bundle files `assets/index-*.js` / `assets/index-*.css` were NOT edited (Direction A).

---

## FIX 1 — Category filter chips for 6 missing categories

**Finding (worker A, trg-v2-run-notes.md):** the frozen bundle's chip array (`Ru` in
`index-CRWHmtoy.js`) covers only all/action/puzzle/strategy/classic/sports/riddle.
Catalog cats `arcade`(11), `card`(4), `idle`(3), `story`(4), `simulation`(1), `word`(4)
— 27 entries — had no filter route.

**Change:**
- `assets/portal-ux.js`: new `injectUxCatChips()` appends 6 buttons to the existing
  `nav.category-filter`, reusing `category-filter__btn` (so existing chip CSS, the
  per-chip count badges and the 44px touch-target rule apply automatically) plus a
  `ux-cat-chip` marker class. Clicking a chip hides non-matching cards via
  `data-ux-cat-hidden` (mirrors the established `data-ux-tag-hidden` pattern);
  clicking again toggles back to all. Clicking any bundle-rendered chip clears the
  ux-layer category so the two filters can't intersect to 0 (a programmatic
  All-click inside the handler is exempt via a guard flag). Chips are injected on
  `fetchGames().then(...)` and re-asserted in the existing `onMutations`
  MutationObserver hook, so React re-renders can't lose the filter.
- `index.html` (inline style block, next to the other ux hide rules):
  `.game-card[data-ux-cat-hidden] { display: none !important; }`.
- `doClearFilters()` / `updateClearFiltersBtn()` now account for `activeUxCat`.
- No minified-bundle chip logic touched; React never re-renders the appended
  buttons because it did not create them.

## FIX 2 — Orphaned thumbnails: verified, ZERO wired

**Finding (workers B+E):** 88 jpgs in `assets/thumbs/`, THUMBS map reachable slugs
only cover registered games; ~38 files orphaned.

**Method:** cross-checked every orphan filename slug against the current
`games.json` titles (exact map-key match AND loose slugification of every
registered title, `hacked` suffixes stripped, punctuation dropped). Also checked
the reverse direction: no registered title fuzzy-matches any orphan file.

**Result: 0 of 38 orphan thumbs match a registered game.** All 38 slugs
(`2048, ageofwar, bossrush, brickdash, connectfour, crossyroad, flappybird, fps,
fruitninja, geometryrash, gridheist, hangman, helixjump, hextris, houseofhazards,
lastlantern, letterboxed, lightsout, matchflip, mathquiz, memory, minesweeper,
paddleduel, pong, poorbunny, queueescape, qwop, simonsays, starcatcher,
storyadventure, sudoku, tetris, thumbfighter, tictactoe, tilemerge, typingspeed,
whackamole, wordle`) correspond to titles REMOVED from the catalog in the earlier
21-game purge — none appears as a substring of any of the 120 current titles
(script check output: all 38 candidates → `[]` hits). Near-misses were rejected:
`ultimatetictactoe` (registered) ≠ orphan `tictactoe` (different game, wrong art);
`geometrydashlite` already has its own mapping; no `sudoku`/`wordle`/`memory`/
`minesweeper` games exist in the catalog. Per instructions ("do not invent
thumbs") nothing was wired.

**Additional reconciliation:** removed 44 dead `THUMBS` entries whose keys are
purged-game titles (e.g. `"2048": "2048"`, `"Tetris": "tetris"`,
`"Whack-a-Mole": "whackamole"`) — lookups that can never hit. Map now: 59 pairs,
every key a registered title, every mapped slug backed by a real file. The 38
orphan jpgs (~1.4 MB) are now PROVEN unreferenced by the live portal (bundle
contains 0 `thumbs/` refs; only `getGameThumb` reads THUMBS) — deletable on
operator sign-off; not deleted here (flag-only discipline, matches worker E's
suggestion to reconcile first).

---

## Verification evidence

`node --check assets/portal-ux.js` → clean. Served repo root via
`python3 -m http.server 8811` (killed after), Playwright chromium `--no-sandbox`,
viewport 1280×900 + mobile 375×700, `networkidle`:

```
CHIPS: ['all','action','puzzle','strategy','classic','sports','riddle',
        'arcade','card','idle','story','simulation','word']
VISIBLE TOTAL (all): 120
CHIP arcade:     visible=11 expected=11 -> OK   toggle-off -> 120
CHIP card:       visible=4  expected=4  -> OK   toggle-off -> 120
CHIP idle:       visible=3  expected=3  -> OK   toggle-off -> 120
CHIP story:      visible=4  expected=4  -> OK   toggle-off -> 120
CHIP simulation: visible=1  expected=1  -> OK   toggle-off -> 120
CHIP word:       visible=4  expected=4  -> OK   toggle-off -> 120
BUNDLE CHIP action while ux arcade: visible=22 (action count) ux-pressed=[]
MOBILE 375px arcade chip: visible=11 expected=11
MOBILE horizontal overflow: False
CONSOLE ERRORS: []  CONSOLE WARNINGS: []  PAGEERRORS: []  BAD RESPONSES: []
```

- Screenshot (desktop, all 13 chips with counts): `docs/sweep-shots/portal-filters-after.png`
- Mobile screenshot (arcade active, "11 games", active chip inverted): `/tmp/mobile-filters.png` (not committed; docs screenshots kept minimal)
- games.json parse: 120 entries; per-cat counts used as expected values above.
- `git status` clean except the three files listed above.

## Rejected thumb mappings (all 38, evidence class)

| Orphan file | Reason rejected |
|---|---|
| `2048.jpg` | No 2048-like title in catalog (substring scan over all 120 titles: 0 hits) |
| `ageofwar.jpg` | "Age of War"/"Age of War Hacked" purged; 0 substring hits |
| `bossrush.jpg` | No match ("Bullet Hell" is a different game; 0 hits) |
| `brickdash.jpg` | "Brick Dash" purged; 0 hits |
| `connectfour.jpg` | "Connect Four" purged; 0 hits |
| `crossyroad.jpg` | "Crossy Road (+Hacked)" purged; 0 hits |
| `flappybird.jpg` | "Flappy Bird (+Hacked)" purged; 0 hits |
| `fps.jpg` | "FPS" purged; 0 hits (not Super Hot / 10 Minutes Till Dawn) |
| `fruitninja.jpg` | "Fruit Ninja (+Hacked)" purged; 0 hits |
| `geometryrash.jpg` | "Geometry Rash" purged; registered "Geometry Dash Lite" already mapped to `geometrydashlite` |
| `gridheist.jpg` | "Grid Heist" purged; 0 hits |
| `hangman.jpg` | "Hangman" purged; 0 hits |
| `helixjump.jpg` | "Helix Jump" purged; 0 hits |
| `hextris.jpg` | "Hextris" purged; 0 hits |
| `houseofhazards.jpg` | "House of Hazards" purged; 0 hits |
| `lastlantern.jpg` | "Last Lantern" purged; 0 hits |
| `letterboxed.jpg` | "Letter Boxed" purged; 0 hits (not "Word Ladder") |
| `lightsout.jpg` | "Lights Out" purged; 0 hits |
| `matchflip.jpg` | "Match Flip" purged; 0 hits (not "SameGame") |
| `mathquiz.jpg` | "Math Quiz" purged; 0 hits |
| `memory.jpg` | "Memory" purged; 0 hits |
| `minesweeper.jpg` | "Minesweeper" purged; 0 hits |
| `paddleduel.jpg` | "Paddle Duel" purged; 0 hits |
| `pong.jpg` | "Pong" purged; 0 hits |
| `poorbunny.jpg` | "Poor Bunny (+Hacked)" purged; 0 hits |
| `queueescape.jpg` | "Queue Escape" purged; 0 hits |
| `qwop.jpg` | "QWOP" unregistered (docs/GAMES.md documents it as intentional); 0 catalog hits |
| `simonsays.jpg` | "Simon Says" purged; 0 hits |
| `starcatcher.jpg` | "Star Catcher" purged; 0 hits |
| `storyadventure.jpg` | "Story Adventure" purged; registered story games are A Dark Room / Stranded In Isekai / etc. |
| `sudoku.jpg` | No sudoku game registered; 0 hits |
| `tetris.jpg` | "Tetris (+Hacked)" purged; 0 hits |
| `thumbfighter.jpg` | "Thumb Fighter" purged; 0 hits |
| `tictactoe.jpg` | Registered game is "Ultimate Tic-Tac-Toe" (different game, `ultimatetictactoe` ≠ `tictactoe`); art would be wrong |
| `tilemerge.jpg` | "Tile Merge" purged; 0 hits |
| `typingspeed.jpg` | "Typing Speed" purged; 0 hits |
| `whackamole.jpg` | "Whack-a-Mole" purged; 0 hits |
| `wordle.jpg` | No wordle-like registered ("Word Search/Ladder/Scramble", "Boggle", "Crossword" are different games); 0 hits |

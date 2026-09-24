# Catalog part 4: provenance

## Duck Hunt (Games/DuckHunt/)

**Built in-house, no OSS mirror found.** GitHub search surfaced two permissively-licensed
candidates, both rejected on asset-provenance grounds:

- `MattSurabian/DuckHunt-JS` (MIT code, 631 stars): bundles sprite PNGs and sound files
  (dog laugh, quacks, "oh yeah") ripped from the original NES release. Nintendo's art and
  audio are proprietary; the repo's MIT license cannot relicense them. Rejected.
- `JSLegendDev/Duck-Hunter` (MIT code): bundles `nintendo-nes-font.ttf` under
  CC BY-NC-SA 3.0 (non-commercial, share-alike) and freesound audio packs that require
  attribution (CC BY 3.0/4.0), plus it needs a vite + KAPLAY npm build chain, which this
  repo's no-build policy forbids. Rejected.

Remaining hits were either unlicensed (no LICENSE file, so no grant to reuse) or
unrelated (command-line simulators, TI-84 ports). Fallback approved: the shipped game is
an original single-file implementation (flat canvas art, no external assets, no
dependencies).

## Curve Fever (Games/CurveFever/)

- **Repo:** https://github.com/stravid/achtung-die-kurve
- **License:** MIT (LICENSE.txt shipped)
- **Commit:** de0d347ee4c0a87c1928e7b339c771991a080dd8
- **Files taken:** `javascripts/config.js`, `utilities.js`, `colormanager.js`, `player.js`,
  `playermanager.js`, `engine.js`, `game.js` (concatenated unmodified into `engine.js`),
  plus `LICENSE`.
- **Modifications:** upstream example page (add-player form, jQuery, help copy) replaced
  by a fixed-roster wrapper: start screen with documented controls, 1P vs AI mode (new
  AI driver that probes the canvas the way the engine's hit test does) and local 2P mode
  (A/D vs arrow keys), touch steer buttons, round/match scoring overlays (first to 5),
  CSS-scaled canvas for resize safety, interval cleanup on menu and page exit. jQuery was
  never used by the engine and is not vendored.

## Sokoban (Games/Sokoban/)

- **Repo:** https://github.com/taniarascia/sokoban
- **License:** MIT (LICENSE.txt shipped)
- **Commit:** 23ee71c46566506d85445130c78dfae2b6347792
- **Files taken:** `Sokoban.js`, `constants.js`, `utils.js` cell vocabulary, movement and
  push rules, paint rules and flat palette (folded into `script.js`), plus `LICENSE`.
- **Modifications:** single upstream level replaced by five hand-authored levels (each
  verified solvable with a BFS solver before shipping); char-map level parser; undo via
  board snapshots; move / push / target counters; generic win check (all targets covered
  instead of the upstream level-specific `=== 6` check); corner-deadlock lose state with
  undo/restart recovery; on-screen touch d-pad and keyboard (arrows/WASD, U, R);
  resize-safe DPI-aware canvas rendering; start / level-clear / stuck / complete
  overlays.

## Nonogram (Games/Nonogram/)

- **Repo:** https://github.com/monkeyArms/nonogram
- **License:** MIT (LICENSE.txt shipped)
- **Commit:** a61efe2cb85452417fcdcdb6e2399eb4f7bd45b1
- **Files taken:** `dist/nonogram.min.js` (vendored as `vendor/nonogram.js`),
  `dist/themes/default/styles.css`, all five `dist/themes/default/templates/*.html`,
  plus `LICENSE`.
- **Modifications:** `sourceMappingURL` comment stripped from the bundle (map not
  shipped); example page (Google Fonts link, wikipedia/github anchors, console panel)
  replaced by a game wrapper: start screen with documented controls, 5x5 / 10x10 quick
  picks wired through the library's own generate control, mistakes counter (delegated
  capture/bubble listeners around the library's cell handler), timer, win overlay,
  keyboard cursor (arrows + Space, mirrored X toggle), resize redraw of the preview,
  vendored Solve button hidden so a reveal cannot masquerade as a win.

## Tower of Hanoi (Games/TowerOfHanoi/)

- **Repo:** https://github.com/Jayakrishna14s/Tower-of-Hanoi
- **License:** MIT (LICENSE.txt shipped)
- **Commit:** badd04c9d8d8d1a9d9be322fc2a268a566a950ee
- **Files taken:** `script.js` core rod model (topValues peg slots, `rodClick` selection
  and placement rules, undo stack, disc style swaps, minimal-budget win/lose logic).
- **Modifications:** Google Fonts link and bundled `assets/*.ttf` fonts removed (font
  files were not of known permissive origin); dead `window.close()` exit button,
  multi-page navigation and `console.log` debug spam removed; timed win/lose redirects
  replaced by win/lose overlays with restart paths; keyboard controls added (1/2/3 peg
  select, U undo, R reset); HUD shows moves left, moves used and the minimal 2^n - 1
  budget; responsive flat stylesheet rewrite (44px+ targets, no fixed-width text
  blocks).

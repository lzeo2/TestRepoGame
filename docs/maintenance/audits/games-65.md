# Delegation 65: readable board, puzzle and arcade sources

## Scope and evidence

Documentation-only review against source commit `8c8a055813b35bbd5d8b632423328333b4252d43`. Actual environment printed `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`. Owned output: the 15 manuals linked below and this report. Runtime/catalog/licenses were not modified, Games was not materialized and sparse selection was not changed. No dependency installation, new game, registration, deletion, publication or push occurred.

Source was accessed with `git ls-tree -rlz 8c8a055 Games/<Folder>/` and `git show 8c8a055:<exact-path>` into bounded temporary text copies. Directory sizes are tracked logical bytes, not shared-filesystem exclusive allocation. Main owns subjective UI review, catalog corrections, runtime authorization and full native release gate.

Human coverage includes every assigned HTML/bootstrap, authored CSS and readable gameplay script. **Exceptions disclosed:** Pacman's minified Modernizr and Tron's minified p5 implementation were syntax-checked but not fully human-reviewed; Joust's complete small final game module and relevant keyboard/bootstrap boundaries were read, not its entire minified Phaser engine. Audio binaries were inventoried, not listened to or independently licensed. A syntax pass does not certify an engine, controls or rights.

Historical sources consulted: `docs/catalog_parts/sources_3.md`, `sources_5.md`, `sources_6.md`, FreeCell section of `sources_7.md`, Backgammon section of `sources_11.md`, assigned portions of P1a/P1b/P2a/P2b playtests, `docs/GAMES.md` and `docs/wiki/Game-List.md`. Historical counts of 120 are stale against the actual 115-entry baseline; those documents were not rewritten under this lease. The recorded source pins are ingestion evidence, not freshly verified upstream downloads.

## Manuals and tracked size

| Manual | Files | Bytes |
| --- | ---: | ---: |
| [154 Backgammon](../games/154-backgammon.md) | 6 | 45,138 |
| [160 Pacman](../games/160-pacman.md) | 24 | 330,423 |
| [161 Qix](../games/161-qix.md) | 7 | 16,503 |
| [162 Joust](../games/162-joust.md) | 4 | 1,205,691 |
| [163 Tron Light Cycles](../games/163-tronlightcycles.md) | 5 | 428,531 |
| [169 Puzzle 15](../games/169-puzzle15.md) | 1 | 11,739 |
| [170 Peg Solitaire](../games/170-pegsolitaire.md) | 1 | 15,911 |
| [171 Checkers](../games/171-checkers.md) | 1 | 43,765 |
| [172 Reversi](../games/172-reversi.md) | 1 | 26,862 |
| [174 Mastermind](../games/174-mastermind.md) | 5 | 65,154 |
| [175 Nim](../games/175-nim.md) | 2 | 12,892 |
| [176 Dots and Boxes](../games/176-dotsandboxes.md) | 4 | 20,605 |
| [177 Ultimate Tic-Tac-Toe](../games/177-ultimatetictactoe.md) | 4 | 28,164 |
| [178 Klondike Solitaire](../games/178-klondikesolitaire.md) | 4 | 29,932 |
| [179 FreeCell](../games/179-freecell.md) | 4 | 33,473 |

## First-priority findings

All rows are **static findings, runtime fix not authorized and native repro not run**. Each page supplies impact, minimum patch boundary, preservation rules and fuller verification steps. Anchor strings identify exact code without unstable generated line numbers.

| Severity | Source and anchor | Impact / recommended native repro | Minimal root response |
| --- | --- | --- | --- |
| HIGH | `Games/Joust/bundle.js`, `r.handleCollision(t)` / enemy class `s` | Actual enemy overlap calls a missing method; earlier movement pass never hit an enemy. | Recover authentic authored collision implementation and reproducible build; no compiled hand-edit. |
| HIGH | `Games/Joust/bundle.js`, scene `create` / `this.scene.pause()` | Escape recreates a paused scene after one-shot wrapper resume. | Correct source lifecycle or authorized scene-ready wrapper bridge; test two Escape resets. |
| HIGH | `Games/Qix/scripts/game.js`, `Game.update` / `Board.addPath`; `hud.js`, `setClaim` | Territory, enemy and win loop absent; drawing movement is not advertised gameplay. | Main verifies authentic playable upstream and keep/refurbish/copy decision; no fabricated replacement. |
| HIGH | `Games/Backgammon/engine.js`, `self.pieces[player][okmove.target]++` | Off sentinel 999 produces NaN array slot and never increments off tray. | Branch off-counter mutation at shared move commit; conserve 15 checkers. |
| HIGH | `Games/Backgammon/script.js`, `doMove/endMatch/UI.update` | CPU winner set after update has no post-move result observer. | Add idempotent terminal notification after shared move mutation. |
| HIGH | `Games/Pacman/index.html`, `PACMAN.init(...); startGame()` versus `pacman.js`, `loaded` | Synthetic startup N sent before audio-ready listener attachment. | Start from explicit ready callback once. |
| HIGH | `Games/DotsAndBoxes/script.js`, keyboard `el.className === 'hline'` | Cursor class makes every intended Enter/Space move fail. | Use existing coordinate predicate or classList membership. |
| HIGH | `Games/UltimateTicTacToe/script.js`, `getWinner` / main-board `D` | Three drawn boards falsely win while other boards remain open. | Recognize only X/O winning triples; preserve all-closed draw. |
| HIGH | `Games/KlondikeSolitaire/script.js`, `hasAnyLegalMove` | Ignores waste recycle reaching buried playable cards, false terminal loss. | Complete reachable draw-state check or conservative stuck detection. |
| HIGH | `Games/FreeCell/script.js`, `addOnEmptyCascadeClicks` / `if (!dom.picked)` | Empty selection object passes guard; empty-cascade click dereferences undefined. | Reuse `hasPick` before selected-node lookup. |
| HIGH | `Games/FreeCell/script.js`, `tryEasymove` | Old-deal timeout can repaint new-deal UI from stale game closure. | Cancel or generation-tag chains per deal. |
| HIGH | `Games/Checkers/index.html`, `GameManager.Select` opening move test | Ordinary-step enumeration can falsely lose a capture-only position. | One full legal-action enumerator for input, AI and terminal checks. |
| HIGH | `Games/TronLightCycles/sketch.js`, `tronRestart` / `paused = 1` | Touch-only users cannot resume reset/death because pads have no Space action. | Accessible resume action calls existing `tronStart`. |
| MEDIUM | `Games/Nim/index.html`, `endRound` / `if (moverWon)` | Misere winner never gets a score increment. | Derive winning side once from mode/final mover. |
| MEDIUM | `Games/Mastermind/engine.js`, Controller `show` listener | Full correct guess checked before Give up can set won and lost together. | Return after a terminal checked-row outcome. |
| MEDIUM | `Games/Puzzle15/index.html`, local scramble `interval` | Rapid Restart leaves concurrent shuffle walks and premature unlock. | Store/cancel a single shuffle handle at reset. |
| MEDIUM | `Games/Reversi/index.html`, `mcts` / 1500ms budget | Synchronous search blocks input/repaint; subsequent hint/input gap persists. | Profile actual hardware, then bounded computation and shared readiness transition. |

Additional per-page findings cover keyboard-focused native buttons, stale selection/turn guards, result accessibility, notice completeness and mobile geometry. None are silently called fixed. No eval/innerHTML pattern was labeled an exploit without tracing its actual inputs.

## Rights and dependency holds

Qix, Puzzle 15, Peg Solitaire, Checkers and Reversi have MIT claims/source pins in headers/history but **no complete LICENSE blob** in their current folders. Restore verified authentic notices only under authorization; do not assume an unknown file has default MIT terms. Pacman's generic WTFPL notice plus a source record is not individual audio-origin clearance. Joust/Tron retain game/vendor notices; preserve them. Existing notice contact details are intentionally not copied into new manuals; notices themselves remained read-only.

No external script/font/asset runtime dependency was found in the small authored bootstraps. Large minified vendor internals remain a disclosed review boundary. URLs in source attribution are evidence links, not runtime requests. No source was removed based on apparent unused audio or dormant preload strings.

## Actual verification

The following outputs were produced from nondestructive Git access and stdin `node --check`:

```text
syntax: 28 / 28
catalog: PASS 115 unique IDs, 115 tracked URLs
assigned identity: PASS 15 entries
PASS: 15 markers, 135 sections, source-coverage disclosures, relative links, no contact addresses/em dashes
owned documents: 16; logical bytes: 92077
tracked source: 73 files; 2314783 bytes
```

The logical document count above was measured before adding this result block; final committed byte size is reported in completion. Largest source folders are Joust (1,205,691 bytes), TronLightCycles (428,531), and Pacman (330,423). `git diff --check` on owned paths completed with no output; final staged whitespace check is also required before commit. Files elsewhere in the shared working tree belong to other workers and were not staged here.

All 28 valid JS inputs passed: each tracked `.js` (including vendors and Joust bundle) and each nonempty executable inline script from assigned HTML. This parses browser code without executing gameplay; it cannot reveal missing collision methods, DOM event-order defects or storage exceptions. Catalog validation checked unique IDs and every runtime URL against tracked Git paths, not sparse filesystem existence.

**Native runs: 0. Screenshots: 0. Full catalog smoke: not run by this worker.** Main must run the unchanged full serial gate before any release decision. Historical partial passes are linked per game and explicitly limited; they cannot substitute for current native gameplay, mobile/theme screenshots or legal review.

Reproduce source review with `git show 8c8a055:Games/<ExactFolder>/<file>` and pipe standalone JS to `node --check`. For HTML, extract each non-src executable script and parse separately; do not run node directly on HTML. Main alone owns browser/materialization leases; no worker narrow-checkout command should change the current sparse selection.

## Refurbishment outlook

1. Week 1: authentic rights/build evidence, collision/rules defects and input/lifecycle regressions first. Qix and compiled Joust need Main decisions before broad refurbishment.
2. Week 2: shared native-button routing, focus restoration, non-color state, mobile layout, result semantics and reduced-motion settlement. Main supplies actual desktop/mobile screenshots in both themes.
3. Week 3: actual N100 AI/frame profiling, bounded responsive computation only where evidence justifies it. Do not disguise a timeout before synchronous work as a performance fix.
4. Week 4: replay/save lifecycle decisions and repeat native regression. New online modes, art, engines and 3D additions are separate source-first plans, not authorized by this doc group.

Publication, catalog correction, source rebuild and any runtime patch remain explicit Main/operator gates. No new games were added, ingested or self-made in delegation 65.

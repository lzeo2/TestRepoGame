<!-- maintenance-game: Games/Backgammon -->
# Backgammon maintenance

## Identity and status

Registered ID **154**, category `strategy`, entry `Games/Backgammon/index.html`. Baseline `8c8a055`; six tracked files, 45,138 bytes. This is an ingested rules engine with a locally authored DOM controller, not a new game. All script/style references are relative. Offline dependency closure is source evidence, not a current browser pass.

## Implementation map

**Source review coverage:** read `index.html`, `style.css`, `script.js`, `engine.js`, `brain.js` completely, plus the MIT notice and historical source report. No opaque engine or binary assets occur in this folder.

HTML loads `engine.js`, `brain.js`, then `script.js`. `backgammon.game(config)` constructs `Game`; `setup`, `roll`, `generatemoves`, `okmove`, `move`, `nextmove`, `onbar`, `canclear`, and `haswon` own rules. `backgammon.brain` binds its instance through `init(game)` and makes greedy moves in `onroll`.

The UI's `buildBoard` lays out `ROWS` as a numbered snake, with `#barW`, `#offW`, and 24 point buttons. `computeTargets` filters the engine's candidate moves through `okmove`; `clickPoint`, `clickBar`, and `clickOff` converge on `doMove`. `UI.update/onroll` connect engine notifications to `render`, which paints counts, dice and `#status`.

## Gameplay and controls

Play creates a match with the human white and computer black. White moves toward point 1; black moves toward 24. Rolls are automatic; doubles offer four moves. A bar checker must re-enter before another checker moves. Opposing pairs block landings; lone blots can be hit. Bearing off uses sentinel target `999`.

Mouse/touch selects a checker and then a highlighted point or Off tray. Native Tab/Shift+Tab and Enter/Space activate the actual buttons; no arrow-key board navigation is implemented. `#newMatchBtn` starts again; Menu returns to `#startScreen`. Human actions earn 5 for a hit, 2 for bearing off, and 100 for a win. End detection defects below prevent treating every advertised result as verified.

## State and persistence

The engine owns `pieces`, `rolls`, `moves`, `okmoves`, `movenum`, `wtm` and `winner`. UI closure variables own selection, session, cumulative score/won/lost and per-match points. No save key or storage API appears. Reload discards the session. Engine `nextmove` supports a timeout when `config.delay` is set; this wrapper does not set it. The brain's declared timeout helper is unused: its current move loop is synchronous.

## Dependencies and provenance

Local MIT `LICENSE` credits Max Irwin. [Historical ingestion evidence](../../catalog_parts/sources_11.md) records `https://github.com/binarymax/backgammon.js`, revision `b00c2e67e97dda35d43f6f8068f19f90e835798a`. Header evidence agrees on source and describes removing debug output and replacing the jQuery board with this dependency-free shell. Revision attribution is a committed ingestion record, not a fresh upstream comparison. No images, fonts or sound files are bundled.

## Audit findings

- **HIGH, static:** `engine.js`, `Game.prototype.move`, anchor `self.pieces[player][okmove.target]++`: bearing off increments array slot `999` instead of `offwhite/offblack`. It creates `NaN` there and never updates the displayed off count. Repro recommendation: bear off a checker and inspect the tray. Root fix: branch on the off sentinel and increment the matching off counter; preserve total 15 checkers across board/bar/off.
- **HIGH, static:** `script.js`, `doMove/endMatch` and `UI.update`: only the human `doMove` checks `winner` after `game.move`. A computer win sets `winner` after its update callback and has no result notification. Root fix: add one post-move terminal notification in the shared engine/UI adapter, with idempotent match recording for either side.
- **MEDIUM, static rules risk:** `generatemoves/okmove` test individual candidates, not complete dice sequences. The HTML claim that both dice must be used does not establish the maximum-use/higher-die rule. Add deterministic constrained-roll cases before claiming complete rules compliance.

## Safe iteration

Patch rules at `Game.move`, not tray rendering. Preserve point/index conversions (`p - 1`), white bar source `24`, black bar `-1`, and off `999`. Keep result recording idempotent and retain existing source notices. Runtime edits require a separate lease; this task changed documentation only. Roll back by reverting only the authorized patch commit.

## Verification

Actually run: Git inventory/catalog identity checks and JavaScript syntax checks described in [batch 65](../audits/games-65.md). Native browser runs: **0**. [Historical P2b](../../audit_batches/playtest_p2b.md) observed selection feedback and new-match dice, not bearing-off or either complete outcome.

Recommended native checks: legal bar re-entry, blocked turns, doubles, exact and oversize bearing off, both winners, New match and Menu after results. Inspect `#status`, off trays and score rather than only pixels. Read source without checkout with `git show HEAD:Games/Backgammon/engine.js`; Main owns any temporary checkout and full catalog smoke gate.

## Future outlook

Week 1: repair off accounting and terminal notification, with conservation/result regression cases. Week 2: keyboard focus after board replacement and 44px header-action review (`.chip button` overrides height). Later: validate full-turn dice sequencing before stronger AI. Defer saved matches and network multiplayer until the existing local match is demonstrably correct.

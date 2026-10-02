<!-- maintenance-game: Games/Puzzle15 -->
# Puzzle 15 maintenance

## Identity and status

Registered ID **169**, category `puzzle`, entry `Games/Puzzle15/index.html`. Baseline `8c8a055`; one tracked file, 11,739 bytes. All HTML, CSS and game logic are inline, with no runtime external dependency. Offline capability is source-backed, not a new native test result.

## Implementation map

**Source review coverage:** complete single file read, including provenance header, static controls, CSS, board manipulation, shuffle and persistence. There is no opaque engine or additional asset tree.

The IIFE caches `#puzzle`, `#hud`, `#resultOverlay`, `#moves`, `#time` and `#best`, then calls `startRound`. `buildGrid` creates 16 divs with position IDs `cell-row-col`, the last empty. `shiftCell` swaps the clicked tile's CSS position and ID with its adjacent empty tile. DOM identity/position is the board model: do not introduce a second unsynchronized array. `getAdjacentCells/getEmptyAdjacentCell` provide shared legality; `checkOrder` scans positions and calls `winRound`.

`scramble` rebuilds solved order and takes 100 random legal steps on an 8ms interval, rejecting immediate reversal through `previousCell`. Input stays locked until it finishes. This construction guarantees solvability, not uniform random sampling or minimum difficulty.

## Gameplay and controls

The page auto-shuffles on load. Click/tap a numbered adjacent tile to slide it. Arrows and WASD move the gap in the named direction by moving the corresponding adjacent tile; they are not tile-direction controls. Every accepted human slide increments moves and schedules a solved check after 130ms. Invalid/nonadjacent slides do nothing. Completing 1 through 15 with the gap bottom-right displays result stats and Play again. There is no fail condition, which is appropriate for this untimed puzzle. Restart starts another shuffle. No audio exists.

## State and persistence

Closure variables `playing/moves/seconds/timerId/checkId` own lifecycle. `startTimer/stopTimer` manage the one-second displayed clock; solve stops it. `p15-best` stores a positive parsed move count with guarded read/write and no saved board. Reload loses the deal but retains best when storage is available. Corrupt values are filtered except permissive `parseInt` accepts prefixes such as `12junk`.

The scramble interval handle is local rather than a lifecycle-owned variable; another Restart does not cancel it. `puzzle.focus()` cannot reliably focus the current non-tabbable div.

## Dependencies and provenance

Header and [ingestion record](../../catalog_parts/sources_5.md) identify `https://github.com/arnisritins/15-Puzzle`, revision `47c82f10865b698fbecc55006a23703cdde83249`, and Arnis Ritins/MIT. Original scripts/styles were merged and the shell, clock, storage and keyboard bridge added. The folder has no separate LICENSE and the header lacks the full MIT terms: recover the correct upstream notice before asserting complete redistribution compliance. No upstream request was made here.

## Audit findings

- **MEDIUM, static race:** `index.html`, `scramble`, anchor `var interval = setInterval`: rapid Restart starts multiple independent random walks on the replacement grid. One completion can unlock input/start a timer while another shuffle still runs. Root fix: retain one `shuffleId` outside the function and cancel it before rebuilding.
- **MEDIUM, static accessibility:** `buildGrid` creates generic div tiles and `#puzzle` lacks tabindex; visual labels are available but individual tiles have no native keyboard activation/role. Root fix: focusable board with announced gap position, preserving existing arrow controls; avoid 16 gratuitous tab stops.
- **LOW, static motion:** `.cell` transitions have no reduced-motion override. Add an authored CSS media rule, not engine replacement.
- **Historical non-finding:** P1b initially read the counter mid-shuffle; its retry correctly waited and saw zero. That old timing mismatch is not evidence Restart always fails.

## Safe iteration

Cancel shuffle/check/clock handles at their shared lifecycle boundary. Preserve legal random-walk shuffling and style/ID swapping, including stable tile values. Do not clear `p15-best` on ordinary Restart or add a migration without versioned evidence. Keep source attribution; runtime changes require a new task lease.

## Verification

Actually run: Git/catalog identity, extracted inline-script stdin parsing and document checks in [batch 65](../audits/games-65.md); **0 native runs**. [Historical P1b](../../audit_batches/playtest_p1b.md) verified moves and delayed Restart, not rapid overlapping restarts or winning.

Recommended native checks: wait until shuffle completes before reading Moves; restart repeatedly during shuffle; exercise all gap edges, tap invalid tiles, solve a known deal, reload best, block/corrupt storage, and inspect keyboard focus/reduced motion. Sparse-safe source: `git show HEAD:Games/Puzzle15/index.html`. Main owns browser extraction and the full gate.

## Future outlook

Week 1: single-shuffle lifecycle regression. Week 2: meaningful board focus/result announcement and reduced motion. Later: optional same-deal retry only if requested; defer solver, rankings and multiplayer. Preserve a puzzle's open-ended play rather than inventing a losing timer.

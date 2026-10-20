# Jankolock mechanics research and proposed contract

Delegation #2, research only. Checked 2026-10-20 UTC with
`openai-codex/gpt-6.1-sol`, reasoning `xhigh`, confirmed by `PI_PROVIDER`,
`PI_MODEL`, and `PI_REASONING_LEVEL`. No model changes or subdelegation.
Work branch: `feat/jankolock`. Evidence log:
`.swarmforge-logs/jankolock-02-mechanics.log` (local, ignored, not committed).

**Recommendation: an original 6x6, fixed-axis sliding jam puzzle.** Its comedy
belongs in original names, drawings, and optional cosmetic reactions, not
unannounced physics. Do not describe it as a Sokoban port or copy another
product's boards. No runtime, assets, catalog entries, or maintenance files
were changed for this research. This proposal is not gameplay acceptance.

## 1. Retrieved sources, exact text, and limits

HTTP results below are observed GET results, not assumed availability. HTML
whitespace is normalized in quotations; Japanese translations are mine.
External links are research citations, not proposed runtime loads.

### S1. Original Sokoban publisher: rules and rights notice

- <https://www.sokoban.jp/rule.html>: **200**.
- Exact rules: `(1) 1個の荷物を押して動かすことができます。`
  `(2) 2個以上の荷物を押して動かすことはできません。`
  `(3) 荷物を引いて動かすことはできません。`
- Translation: you can push one package; you cannot push two or more packages;
  you cannot pull packages. The introductory paragraph specifies delivering
  packages to designated storage places by controlling the warehouse worker.
- <https://www.sokoban.jp/>: **200**, labels itself `Sokoban Official Site` and
  credits `COPYRIGHT©1982 HIROYUKI IMABAYASHI`. It identifies the names and
  rabbit mark as Falcon trademarks or registered trademarks.
- Scope: primary evidence for push-only rules and attribution, not permission
  to reuse code, levels, branding, or artwork. The guessed English path
  <https://www.sokoban.jp/eng/> returned **404**, not an English source.

### S2. Solver author's deadlock explanation

- <https://jsokoapplet.sourceforge.io/sokoban/deadlocks.html>: **200**.
  Maintained JSoko site, credited to Matthias Meger. This is a primary account
  of that solver author's classification, not the original game's rulebook.
- Exact definition: `That means the level isn't solvable anymore, no matter
  what the user does.` The surrounding explanation attributes this to being
  able to push, never pull, and recommends undo or restart.
- It separately describes dead squares, frozen boxes, corrals, bipartite
  goal-assignment failures, and closed diagonals. A corral concerns player
  reachability; a bipartite failure can occur even when each box individually
  has a reachable goal. Neither reduces to "a block looks stuck."
- Limit: these are useful descriptions, not an exhaustive deadlock detector
  or proof that importing corner tests solves a different puzzle family.
- <https://sokobano.de/wiki/index.php?title=Deadlocks>: TLS validation failed
  with `CERTIFICATE_VERIFY_FAILED: self-signed certificate`. Not inspected;
  certificate checking was not disabled.

### S3. Unblock Me: Kiragames' own FAQ

- <https://www.kiragames.com/faq.html>: **200**, reached through the publisher's
  **200** home page <https://www.kiragames.com/>.
- Exact instruction: `Use your touch screen to slide rectangular wooden
  blocks back and forth inside the grid.` It specifies `only left and right,
  or up and down, depending on the block’s movement` and ends with sliding
  `the red wooden block out of the grid.`
- Exact scoring note: `Please note: Challenge mode tracks your move.`
- Publisher listings were also **200**:
  <https://apps.apple.com/us/app/unblock-me/id315019111> and
  <https://play.google.com/store/apps/details?id=com.kiragames.unblockmefree&hl=en>.
  They confirm the exit objective, but do not establish the complete movement
  or move-counting rules. Player reviews and store marketing are not rules.
- Limits: the FAQ excerpt does not settle exact grid dimensions, scoring per
  cell versus per drag, all current modes, or a license for any level. Do not
  invent those details. Guessed `/games/unblock-me/` and `/support/` URLs on
  the publisher's site both returned **404**.

### S4. Rush Hour: manufacturer-authored rules, third-party host

- <https://www.manua.ls/thinkfun/rush-hour/manual>: **200**. Its manual section
  reproduces `HOW TO PLAY`, `© 2010 ThinkFun Inc.`, and `#5000. CH02`.
- Exact manual wording: `Vehicles can only slide forward & backward, not
  sideways.` Also: `No lifting the cars or trucks off the traffic grid
  surface. Stay in your lanes!` The stated object is sliding the red car
  through the exit.
- Corroboration: <https://www.ultraboardgames.com/rush-hour/game-rules.php>:
  **200**, matching the lane-only rule and stating that a complete solution
  is printed on the back of each challenge card.
- Evidence boundary: the manufacturer-authored text is accessible on a
  **third-party mirror**, not freshly authenticated against a live official
  manual. Do not cite the mirror's generated product FAQs as ThinkFun rules.
  In particular, its suggestion that only direct blockers need moving is
  misleading: indirect dependencies are central to jam puzzles.
- Official endpoints tried, with actual outcomes:
  - <https://www.thinkfun.com/products/rush-hour/>: **403**.
  - <https://www.thinkfun.com/>: **403**.
  - <https://www.thinkfun.com/wp-content/uploads/2015/09/RushH-5000-IN02.pdf>:
    **404**.
  - <https://www.thinkfun.com/wp-content/uploads/2015/09/RushH-5000-IN01.pdf>:
    **404**.
  - <https://www.ravensburger.us/en-US/products/thinkfun/logic-games/rush-hour-76500>:
    **403**.
  - <https://www.ravensburger.de/de-DE/produkte/spiele/thinkfun/rush-hour-76500>:
    **404**.
  - <https://www.thinkfun.co.uk/products/rush-hour/>: **404**.
  - <https://play.google.com/store/apps/details?id=com.thinkfun.rushhour&hl=en>:
    **404**; the guessed app identifier is not evidence of an available app.
- Search limits: Google returned a redirect/help shell; DuckDuckGo returned
  **202** with a human challenge; Bing returned unrelated band results.
  None was used as factual evidence. An archive CDX query returned **200**
  with `[]`, which supplies no archived manual.

### S5. Klotski: GNOME's own manual and movement source

- Immutable manual:
  <https://raw.githubusercontent.com/GNOME/gnome-klotski/5fb2a84cf4812bdffd02e669f0b04714e2f23087/help/C/index.docbook>:
  **200**. This is GNOME's upstream GitHub mirror, not an unaffiliated guide.
- Lines 189–191 specify moving the patterned block to the green markers in
  as few moves as possible, moving blocks one at a time. Lines 289–292 say:
  `You cannot move a block to a space already occupied by another block`,
  with a special exception allowing the patterned block through the green
  blocks to win.
- Immutable source:
  <https://raw.githubusercontent.com/GNOME/gnome-klotski/091a38a6a2e788e2792b58972ead6c907cd3b6ec/src/puzzle.vala>:
  **200**. `can_be_moved` at lines 289–297 checks `(0,1)`, `(0,-1)`, `(1,0)`,
  and `(-1,0)` for a non-static piece. Unlike fixed-axis cars, these blocks
  can be considered for motion along both axes.
- Both hashes were obtained from GitHub's file-history API and their pinned
  raw URLs were then fetched, rather than assuming a moving branch was pinned.
- Limit: this establishes the GNOME implementation, not every historical
  Klotski ruleset. No GNOME code, art, puzzle data, or manual was vendored.
  The inspected manual has inconsistent historical GPL version notices, so
  it is not a substitute for a fresh component-license audit if reuse is ever
  proposed. This design does not require such reuse.
- Old `help.gnome.org/users/gnome-klotski/stable/` index/rules pages and
  `help.gnome.org/klotski/` returned **404**. Guessed `help/C/rules.page` paths
  on GitLab and the GitHub mirror returned **404**: the actual manual is
  DocBook. <https://gnome.pages.gitlab.gnome.org/gnome-klotski/> redirected to
  a **200 sign-in page**, not rules. <https://apps.gnome.org/Klotski/> was
  **404**. A successful status on an authentication page proves nothing.

## 2. These puzzle families are not interchangeable

| Family | Controlled thing | Legal motion | Objective and typical failure |
| --- | --- | --- | --- |
| Sokoban [S1, S2] | Walking worker pushing boxes | One box pushed at a time; no pulling; worker access matters | All goals filled; irreversible pushes can destroy solvability |
| Unblock Me [S3] | Rectangular blocks directly | Fixed per-block horizontal or vertical lane | Target block exits; dependencies must be rearranged |
| Rush Hour [S4] | Vehicles directly | Forward/backward along each vehicle's lane, no lifting | Target car exits; moving indirect blockers matters |
| GNOME Klotski [S5] | Blocks directly | Orthogonal translation on either axis where space permits | Patterned block reaches designated exit area |

A mathematical distinction matters more than the theme. In the proposed
sliding game, every legal pre-completion move has a legal inverse: moving
one rigid piece back crosses precisely the cells it just vacated. Therefore
all states reachable from a solvable start remain solvable, by retracing moves
and then solving. A newly reached state cannot have zero legal moves because
at least the inverse is available. A generated start can still belong to a
component with no solution, so validation remains necessary.

This argument requires fixed geometry, no one-way gates, no disappearing
pieces, no locks, no move limit, and no random rule changes. It does not apply
to Sokoban's push-only transitions. Do not add a "permanent deadlock" detector
based on corner occupancy or tell a sliding player that undo is their only
recovery. Call temporary congestion a **jam**. Undo is convenience, not a
hidden rescue mechanic.

A straight red-car imitation also is not meaningful originality by itself.
Keep independently authored boards, prose, visual design, and theme. A rules
comparison is not a brand-clearance or redistribution-rights finding.

## 3. Proposed exact rules: small, deterministic, teachable

These are design choices, not claims that all cited games share them.

- Board: 6 columns by 6 rows. Integer coordinates `x,y` are zero-based,
  measured from the top-left. No extra holes, teleports, or interior walls in
  version 1. The exit is visibly outside the right edge of row `y=2`.
- Every piece is a rectangle of length 2 or 3 and width 1. Its horizontal or
  vertical axis and perpendicular lane never change. One designated target
  is horizontal, length 2, on row 2. Stable IDs are independent of joke names.
- A move slides exactly one piece to a different integer coordinate along
  its axis. Any nonzero distance is allowed if **every swept cell**, not just
  the destination, stays in bounds and avoids all other pieces. No rotation,
  jumping, pushing chains, overlap, or diagonal motion. Invalid attempts do
  not change state or score.
- Goal convention: a legal target slide ending at `x=4` wins. Reaching the
  board edge is the logical exit; the target's subsequent off-board drawing
  is cosmetic. Clearing its route without moving it does not win. No
  partially off-board coordinates enter state. Starts already at the goal
  are rejected as playable levels.
- One accepted slide counts as one move, whether it travels 1 or 4 cells.
  Returning the same piece later is another move. Do not require longest
  slides and do not count pointer events or animation frames.
- UI parity: a pointer drag commits once on release. For keyboard play,
  selecting a piece and using its axis arrows previews a landing cell;
  Enter/Space commits and Escape cancels. Show the preview and instruction.
  Native destination buttons are an alternative. Holding an arrow must not
  silently charge many moves for a slide a mouse performs in one action.
- Undo restores the previous committed state and move count, including after
  winning. No undo limit or score penalty. Restart restores the exact initial
  state. No timer, lives, forced loss, or random post-start rule changes.
- Optional solution help must be honest: an initial stored witness is not a
  valid next-step hint after an arbitrary detour. Simplest first release:
  omit dynamic hints, or explicitly offer "Restart and show solution."

### Fair feedback and comedy

Display `Moves: m` and, **only after proof**, `Best possible: d*`. Suggested
optional medals: 3 for `m=d*`, 2 for `m<=d*+2`, 1 for any completion. Completing
is never failure. A visible assistance label can accompany solution viewing;
undo alone is not cheating. Compare only identical level/version or exact
endless seed/index/version. Never publish a random-walk length as "par."

Original comedy can be mismatched wheel drawings, a wobbling paper label, or
brief remarks such as "The queue has developed a queue." Cosmetic wobble
must not move logical cells, hit regions, the camera, or focus. No hidden
collision padding, fake input lag, swapped controls, random penalties, or
surprise immovable pieces. Respect reduced motion and provide sound/motion
off. Use flat colors, readable system/local font fallbacks, visible focus,
44px controls, and a mobile layout. No borrowed mascots, assets, or taunting
copy. A joke must not conceal the selected piece, its axis, or the exit.

## 4. Exact solver proof and solution backtracking

A feasible first implementation uses ordinary breadth-first search (BFS),
not a neural solver or a new dependency. Each edge is exactly the one-slide
action counted by the UI, with unit cost.

1. Validate the definition: 6x6 bounds, unique IDs, allowed lengths and axes,
   valid fixed lanes, no overlaps, exactly one correct target, unsolved start.
2. Encode a state as the vector of each piece's varying coordinate in fixed
   ID order. Geometry and lanes live in the immutable definition. Do not
   reorder interchangeable-looking pieces without also preserving IDs for
   replay and hints. Occupancy can be rebuilt in a 36-cell array.
3. For every piece, scan both axis directions until the edge or first blocker.
   Emit **every reachable landing cell**, not just adjacent or maximal moves.
   A sweep cannot pass through an occupied cell to an empty destination.
4. Enqueue the initial key; mark visited at enqueue. For each first-seen
   neighbor store `parent[next] = {previousKey, move:{id,to}}`. Fix iteration
   order by piece ID and destination coordinate for reproducible witnesses.
5. On dequeuing a goal, follow parent links to the start and reverse that
   action list. BFS's nondecreasing depths prove it has minimum slide count.
   Replay every action through the core and confirm the terminal condition.
6. Queue exhaustion proves unsolvable for this definition. Hitting a memory
   or expansion cap means **unknown**, never unsolvable or optimal. Reject or
   defer that candidate. A valid nonoptimal witness proves only solvability.

The search is finite, but "6x6" does not prove it is cheap. For `n2` length-2
and `n3` length-3 fixed-lane pieces, a loose coordinate-state upper bound is
`5^n2 * 4^n3`, before overlap constraints. Ten length-2 pieces already permit
9,765,625 coordinate combinations. Start with an explicit authoring cap of
100,000 discovered states per board, measure actual memory/time, and simplify
or defer boards that exceed it. This is a proposed cap, not a benchmark.
If BFS proves too costly, change the level or separately investigate an
admissible search; do not add speculative solver infrastructure now.

### Required proof record for every shipped authored board

A level needs its complete original piece layout, stable ID, rules version,
canonical definition fingerprint, creation/provenance note, shortest distance,
full `{id,to}` solution, and measured visited-state count. The proof record
must correspond to the exact shipped layout, not a visually similar draft.
The fingerprint can be a reproducible canonical serialization; no hashing
library is necessary. Solver output and independent replay are distinct gates.

Build-time verification should re-solve **all 20**, not spot-check a few:
validate definitions; reconstruct shortest paths; independently replay swept
moves; assert `solution.length === optimal`; confirm no earlier accidental
win; reject duplicates after ignoring cosmetic labels. Reordering JSON fields
or changing a joke name should not create a "new" puzzle. Add one small
stdlib verification script when implementation is authorized, no test
framework. Include regression cases for illegal jump-through, wrong-axis
movement, undo-after-win, and the same action's keyboard/pointer move count.

### Bounded experiment actually run for this research

An original illustrative board, **not a finished pack level**, used this layout:

| ID | Axis | Length | Fixed lane | Initial varying coordinate |
| --- | --- | --- | --- | --- |
| T | H | 2 | row 2 | x=0 |
| A | V | 3 | column 2 | y=0 |
| B | H | 3 | row 4 | x=0 |
| D | V | 2 | column 5 | y=3 |

In-memory stdlib BFS found `D→y0, B→x3, A→y3, T→x4`: **4 moves**, 61 states
discovered before the first goal. Independent unit-step occupancy replay
passed. Exhausting the conceptual component, including goal vertices for
analysis, found **112 states and 800 directed edges**; every edge had its
legal inverse. This tests the model, not the unimplemented UI or 20 boards.

A separate 100-slide walk alternating the target between two reachable
coordinates returned to a goal with optimal distance **0**. This deliberately
simple counterexample demonstrates why walk length is not a difficulty proof.
Even suppressing immediate reversals does not rule out longer cycles or
shortcuts. Command summary and actual output are retained in the local log.

## 5. Twenty hand-authored boards: content plan and acceptance

The following are **authoring briefs**, not supplied layouts or certified
solutions. No claim is made that 20 levels exist or pass. Each must be designed
independently, then revised against the solver and human play. Do not
transcribe commercial challenge cards, GNOME puzzle data, web screenshots,
or an assumed "public-domain classic" without actual rights evidence.

| Board | Intended lesson or structure | Proposed shortest-slide band |
| --- | --- | --- |
| 01 | Target selection and visible exit, one clean slide | 1 |
| 02 | Move one vertical obstruction aside | 2–3 |
| 03 | A landing choice that preserves another lane | 3–4 |
| 04 | Move sideways before clearing the exit row | 3–5 |
| 05 | Use an empty staging area, then free the blocker | 4–6 |
| 06 | Distinguish length-2 and length-3 clearance | 5–7 |
| 07 | One dependency behind the direct blocker | 5–8 |
| 08 | Temporarily move away from the exit | 6–9 |
| 09 | Reuse a vacated lane for a second piece | 7–10 |
| 10 | Clear two independent obstructions in either order | 7–10 |
| 11 | A constrained order, not merely extra clutter | 8–11 |
| 12 | Reposition the same support piece twice | 9–12 |
| 13 | Move the target backward to release workspace | 9–13 |
| 14 | Interleaved horizontal and vertical dependencies | 10–14 |
| 15 | Temporary blockage of the exit route pays off later | 11–15 |
| 16 | A plausible detour with an easy undo lesson | 11–16 |
| 17 | Two staging areas competing for one lane | 12–17 |
| 18 | Resolve a longer dependency loop without rule changes | 13–18 |
| 19 | Combine previously taught mechanisms | 14–20 |
| 20 | A readable capstone, no new hidden mechanic | 15–22 |

These bands are hypotheses, not a monotonically proven difficulty curve.
A board's shortest distance is one metric, not human difficulty. Record direct
exit blockers, dependency depth, necessary temporary regress, tempting branches,
and playtest comprehension. Board 10 can have several equally good solutions;
uniqueness is not a requirement. Do not equate many equivalent move orders
with deep reasoning. If a claimed lesson is bypassed by a shortest solution,
revise the brief or layout rather than mislabel the board.

## 6. Deterministic endless: proven solvability, bounded claims

The minimal honest version is a **replayable remix stream** from independently
authored, certified templates, not an unbounded promise of unique layouts.
The finite 6x6 rule space necessarily repeats. Randomly placing pieces until
one happens to solve is not an acceptable unchecked generation scheme.

Proposed deterministic pipeline:

1. Identify each run by `(rulesVersion, generatorVersion, seed:uint32,
   index:integer in 0..4294967294, requestedBand)`. Store/display that identity.
   Reject malformed inputs. Validate seed 0 rather than silently replacing it.
   At index exhaustion, ask for a new seed rather than wrapping invisibly.
2. Specify an integer PRNG, for example
   `s=(Math.imul(1664525,s)+1013904223)>>>0`. One proposed initial state is
   `(seed ^ Math.imul(index+1,0x9e3779b1) ^ bandCode)>>>0`, with fixed numeric
   band codes, template order, and draw order in the generator version.
   Never use `Math.random()`, wall-clock time, animation timing, or display
   size inside generation. Publish golden seed/index outputs after choosing
   the final algorithm; this proposal is not yet that frozen contract.
3. Select an original template and its verified goal arrangement. Bound each
   walk, for example `12 + (nextUint32() % 49)` attempted slides. Stop early
   if no eligible move exists. In the authoring graph, take legal slides away
   from that arrangement. The core may analyze a goal state; only the play UI
   locks further input on winning. Require the first slide to move the target
   away from the exit; skip a template if that is impossible. Reject every
   later goal state, so the reversed walk reaches its first goal only at the
   end. Skip immediate reversals for variety, not as a difficulty proof.
4. Reverse and invert the walk. Replay it through the core: this is a
   constructive solvability witness. Reject solved, invalid, unchanged, or
   duplicate candidates within this index's bounded retry process. Do not
   reject based on session history: the same identity must reproduce the same
   board even when requested out of order. Measure cross-index repeats rather
   than promise their absence. A label/color change does not make a new board.
5. Run the same unit-slide-cost BFS on the candidate. Use exact `d*` to filter
   difficulty and to replace the walk with a backtracked shortest solution.
   A proposed first budget is 20,000 discovered states per candidate and 8
   candidates per index. These require device profiling; they are not measured
   performance promises. Deterministic state-count caps, not time cutoffs,
   decide acceptance, so slow devices generate the same result.
6. On exhaustion, serve a deterministic already-certified authored board in
   the requested band and label it as a remix fallback. If no such board is
   available, state that the requested band is unavailable; do not invent a
   par or relax the rules silently. Never enter an unbounded retry loop.

Schedule the bounded search in event-loop slices if device measurements need
it; yielding must not change candidate order or acceptance. Do not introduce
workers or a solver dependency before measuring the simple version. If the
proposed budget causes visible stalls, ship fewer pre-certified remixes and
mark runtime generation unproven until fixed.

A reverse walk explores only the chosen template's fixed-lane component; it
cannot generate a new piece topology. Seed diversity, walk length, occupancy,
and shuffled skins do not demonstrate difficulty or novelty. Measure actual
accepted `d*`, repetitions, fallback rate, and perceived variety. In an
implementation test, enumerate a documented seed/index set twice and compare
full definitions, proofs, and rejection decisions; replay every result. A
finite seed test is regression evidence, not a proof over all uint32 seeds.

## 7. Minimal module contract, proposal only

Use three authored ES modules and one small development verifier, not an
engine, event bus, plugin system, or runtime dependency. Actual filenames
and exported names remain the implementing lane's decision.

**Core** owns immutable geometry and pure state transitions:

```text
Definition = { size:6, exit:{side:"right",row:2}, targetId,
               pieces:[{id,axis:"H"|"V",length:2|3,lane}], start:[coordinate] }
Move       = { id, to:integer }
validate(definition)              -> errors[]
legalMoves(definition,state)      -> Move[]
applyMove(definition,state,move)  -> newState | null  // invalid: no mutation
isSolved(definition,state)        -> boolean
stateKey(state)                   -> stable string
```

State keys are scoped to a definition; cross-level storage also needs its
canonical definition fingerprint. IDs, lanes, and target identity never
change. Pure analysis may enumerate goal-state moves; the UI stops real play
after completion. Core has no DOM, animation, clocks, storage, random draws,
scoring, or text jokes. Its legality predicate is shared by solver and UI.

**Levels** owns the original authored definitions and proof metadata. Endless
uses core legality plus the specified seeded procedure and returns
`{definition, proof:{optimal,solution,visited}, identity, fallback}` only after
validation. An authoring solver may live in the development verifier; runtime
BFS is needed only if actual runtime remix filtering is shipped. No fetched
level data and no third-party layout import. Persisted proof data must be
invalidated by a definition/rules change.

**UI** owns selection, gesture preview, history snapshots, move count,
completion lock, optional solution viewing, and rendering. It submits one
`Move` to the core per commit. Invalid moves produce useful local feedback;
only successful moves push the previous state onto an initially empty
history. Undo pops history, restart restores `start` and empties history,
and count derives from history length rather than a second independent counter. Rendering jitter never enters state. Reset selection
and previews on undo/restart/level change. Pointer cancellation commits
nothing. No second collision engine in the drawing code.

## 8. Findings, verification, and remaining gates

- Read `AGENTS.md` and `docs/CODE_QUALITY.md` completely. Read the existing
  `docs/jankolock-provenance.md` for scope, without changing it.
- Observed root free space: **1.9G**, below the floor. Used only bounded text
  and in-memory HTTP/BFS work. No installs, saved downloads, assets, checkout,
  browser, or server. No branch switch, push, or implementation.
- Verified primary sources: original Sokoban publisher, Kiragames FAQ,
  pinned GNOME manual and source. Rush Hour primary-authored text is verified
  only as displayed by a third-party manual host, with independent matching
  transcription. Live official-host verification remains unresolved.
- Actual solver-model experiment passed, with numbers above. All authored
  board layouts, 20-board proofs, endless implementation/performance,
  difficulty calibration, UI accessibility, visual review, and offline browser
  acceptance remain **unproven**. No games were added by this lane.
- Original levels and art still need authoring receipts. Mechanics research
  grants no rights to other games' level designs, marks, characters, or art.
- Before implementation shipping: run the small verifier on all 20 exact
  boards and a recorded deterministic seed set, then normal syntax/diff and
  integration checks. Full registered-game smoke is still a separate
  mandatory pre-push gate; research results do not substitute for it.

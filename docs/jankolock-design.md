# JANKOLOCK design contract

Delegation #4, 2026-10-20; `openai-codex/gpt-6.1-sol`, `xhigh`, no
subdelegation. **DESIGN ONLY: UNBUILT / NOT PROVEN. No prior render claim.**

## Scope and holds

Read `AGENTS.md`, `docs/CODE_QUALITY.md`, `docs/jankolock-provenance.md` and all
three `docs/jankolock-research-*.md`. Operator rules supersede research options.
Original code/levels/art/audio/copy, not a port. Historical identity/name clearance
unresolved; no upstream branding/expression, invented attribution or reuse rights.

Shared `feat/jankolock`; own this doc/ignored design log only. No main/Wings/
Character AI/catalog/maintenance changes. Catalog 125, zero added; ID240 only
conditionally claimed. No registration/publication/push here. Disk 1.8G: bounded
text only; build/assets/browser blocked until >=2 GiB, no unauthorized cleanup/
broad checkout/history rewrite. Future lanes are not started.

## Rules and scoring

- 6x6, zero-based x/y top-left, right exit y=2. Width1 crates, fixed H/V
  axis/lane, len2/3; T is H len2 row2. No special cells.
- Slide one crate any nonzero integer distance, all swept cells in-bounds/clear.
  No rotations/jumps/pushing/chains/diagonals. One accepted slide = one move,
  any distance; invalid/zero/preview/cancel/animation costs zero.
- Win only after moving T to x4, not clearing its route. Reject solved starts.
  No off-board state. Core can analyze goals; won UI stops slides only.
- Unlimited free Undo/Restart after win too. No timers/lives/permanent death/
  locks/match4/random physics/fake lag. Reversible jams, not forced losses.

Show moves m/certified shortest d. Stamps 3 for m=d, 2 within d+2, 1 completion;
m<d is a proof defect. No server highscores/dynamic hints. Walk length is not par.

## Controls and session flow

Start: title/objective/controls, level selector, Endless, native Start. States:
start/preparing/playing/won/recoverable error, no forced loss. Preparing supports
Cancel; Start requires validated proof-ready data. No extra launch layer.

Canvas art plus fixed native piece buttons. Tab in ID order, focus/click selects;
label ID/axis/length/row/column. Provide native selector if board targets fall
below 44px. No canvas-only interaction.

| Input | Exact behavior |
| --- | --- |
| Arrows/WASD | One-cell axis preview, repeats free; blocked/perpendicular keeps preview with explanation. Outline/coordinate show landing. |
| Enter/Space | Commit changed preview once, otherwise select. Suppress duplicate activation; unrelated controls retain native behavior. |
| Escape/Tab away | Cancel preview/drag free; Tab selects next. No focus trap. |
| Drag | Capture primary pointer, axis-lock, nearest cell (half ties upward), swept-legal clamp; release once, tap selects. Fixed CSS hit bounds. |
| Pointer cancel/lost capture/blur/second pointer | Cancel, no commit. |
| Touch | >=44px D-pad previews, perpendicular disabled/explained; explicit Commit/Cancel. Page scroll outside pieces. |

Separate committed state/preview/selection. Moves = history.length; one snapshot
per commit. Undo cancels preview then pops; Restart restores start/clears history.
Level change cancels gestures/search. Undo from won restores playing/board focus.
Win region announces once, focuses heading, keeps board visible, offers Next,
Undo/Restart/Levels/Hall; after 20 offer Endless. No blocking modal/auto-next.
Saved valid best can survive Undo; current count/victory reflect restored state.

## Layout, original art and sound

Desktop: title/theme/mute, level/start; grid/exit left, stats/selection/D-pad/
Commit right; Undo/Restart below. Result replaces side instructions; Hall has Back.
Mobile: header, level/count, grid/gutter, selection, D-pad/Commit/Cancel,
Undo/Restart, result/hall. At 320px fit 264px grid plus exit. No horizontal
scroll; wrap/safe-area/vertical scroll. Reflow at 200% zoom, retain selector/D-pad.

Original canvas shipping blocks/crooked stamps, plain Exit. Flat paper/charcoal,
black actions, system fonts; no gradients/teal-on-green/emoji/em-dash copy.
Both themes: contrast/focus, IDs/arrows/patterns beyond color. No borrowed art.
Brief wobble, fixed hit boxes/grid/focus; reduced motion/Motion off is still.
Render on change, stop settled/hidden/reset loops; DPR cap2, CSS-pixel input.
One gesture-started WebAudio context, enveloped/throttled original stamp/victory/
falling fail chirps. Persistent visible Mute. Audio failure => silence/text.
No samples/autoplay/copied melody. `Blocked by crate A`, `Slide cancelled`,
`Shipment cleared`; stamps never hide state.

## Frozen proposed files, data and APIs

Root `Games/Jankolock/`, browser ESM; no framework/build/install/service worker.
Descriptive types, not implementation. Numbers: finite bounded integers.

| Record | Shape / invariant |
| --- | --- |
| Definition | `{rulesVersion:"jk-r1",size:6,exitRow:2,targetId:"T",pieces:Piece[],start:State}` |
| Piece | `{id,axis:"H"\|"V",length:2\|3,lane}`; unique A-Z IDs, ASCII order, lane 0..5, 1..18 pieces |
| State | Array aligned to pieces; H=x/lane=y, V=y/lane=x; 0..6-length, no overlap |
| Move | `{id,to}` absolute coordinate |
| Proof | `{rulesVersion:"jk-r1",fingerprint,optimal,solution:Move[],visited}`; visited includes root |
| Level | `{id:"01".."20",title,lesson,band:[min,max],definition,proof,origin:"independently authored"}` |
| Authored identity | `{kind:"authored",packVersion:"jk-pack1",levelId}` |
| Endless identity | `{kind:"endless",rulesVersion:"jk-r1",generatorVersion:"jk-e1",packVersion:"jk-pack1",seed,index,band}` |
| Prepared | `{identity,level,fallback:null\|{sourceLevelId,reason:"budget-or-band"}}`, verified proof required |

Endless level.id identifies its source template, not an authored completion.
UI labels it Remix/seed/index, omits template lesson, persists no authored best.

Reject malformed/version/T/geometry/overlap/array/solved-start errors. Analysis
permits goals. Never mutate inputs. Fingerprint: whitespace-free JSON of
`["jk-r1",6,2,"T",pieces mapped to [id,axis,length,lane],start]`, not security hash.
Exclude copy; duplicate checks sort geometry/start tuples with target marker,
ignoring labels/non-target IDs. Proof requires exact fingerprint.

### core.js (lane A)

- `validateDefinition(def)`, `validateState(def,state) -> string[]` errors;
  ordinary bad data does not throw; state validator requires valid definition.
- `stateKey(state) -> string`: comma-joined, definition-scoped.
- `fingerprint(def) -> string`: canonical above.
- `legalMoves(def,state) -> Move[]`: all swept landings, ID then to ascending,
  including from goals; `applyMove(def,state,move) -> fresh State|null`.
- `isSolved(def,state) -> boolean`: T=4; UI requires commit.
- `solve(def,{maxStates,signal?}) -> Promise<SearchResult>`, from def.start.
  Results: `{status:"solved",proof}`, `{status:"unsolvable",visited}`,
  `{status:"unknown",visited,reason:"state-budget"}`, `{status:"cancelled"}`.
  Invalid definition rejects, not unsolvable. No DOM/random/storage/audio/clock.

### levels.js (lane B)

`PACK_VERSION="jk-pack1"`; `getLevels() -> readonly Level[]` in ID order;
`prepareAuthored(levelId) -> Prepared` rejects missing/unproved levels;
`prepareEndless({seed,index,band},{signal?}) -> Promise<Prepared>` uses algorithm
below. Cancellation rejects AbortError, never fallback. Imports core only; no
DOM/storage/clock/fetched levels. A fake 20-entry pack is not release-ready.
Private independent replay checks unit-step occupancy without core.applyMove.

### ui.js, index.html, style.css (lane C)

Sole DOM/session/storage/audio owner; imports core/levels. Native labeled IDs:
`startBtn`, `levelSelect`, `board`, `pieceControls`, `commitBtn`, `cancelBtn`,
`undoBtn`, `restartBtn`, `status`, `result`, `themeBtn`, `muteBtn`, `motionToggle`,
`hallBtn`, `hallBackBtn`, `portraitHost`. One token/AbortSignal owns preparation;
reset/change/cancel aborts/increments. Pointer ID owns drag. Core.applyMove once
per commit, no UI collision engine. C renders disabled portrait text; Back aborts
its separate hall signal/disposes handle. Late imports cannot mount after Back.

### portrait.js / portrait-config.json (lane D)

`mountPortrait(host,config,{reducedMotion,signal?}) -> Promise<Handle>`;
Handle: `status:"unavailable"|"failed"|"loaded"`, `dispose()`,
`setReducedMotion(boolean)`. Abort rejects AbortError/disposes late loads.
No puzzle state/storage writes.

Local deployment-generated config defaults `{schema:1,enabled:false}`; enabled
adds `url:"./assets/portrait_relief.glb",sha256,bytes`. On Hall request UI validates
this guaranteed-present manifest, then lazy-imports portrait.js only if enabled.
Bounded stdlib presence/permission check generates it, no build system. Never
probe guessed GLB URLs. Bad config shows unavailable; packaging rejects missing
config. D styles only host content, no shared CSS edits.

## Solver proof contract

Unit-cost BFS: every landing, visited at enqueue, parent key/Move; first dequeued
goal backtracks shortest witness. Queue exhausted=unsolvable, cap=unknown.
Caps discovered states: authored100,000/runtime20,000. Goal before expansion;
unknown before excess enqueue. Yield every256 expansions, no clock cutoffs.
Profile before workers. All20 need original layout/fingerprint/origin/optimal/
witness/measured visited. Re-solve and independent unit-step replay, no applyMove;
reject sweeps/zero slides/early goals/duplicates/count errors. Changed layout/
rules invalidate proofs. Research experiment is not a pack/UI test.

## Complete 20-level briefs

**Every row: UNBUILT / NOT PROVEN. No actual layouts/proofs are authored here.**
Original titles; mechanics-research lessons/bands, not measured difficulty.

| ID / title | Lesson / structure | Target shortest slides |
| --- | --- | --- |
| 01 First Dispatch | Select target, one clean exit slide | 1 |
| 02 Inspection Queue | Move one vertical obstruction aside | 2-3 |
| 03 Leave a Gap | Landing choice preserves another lane | 3-4 |
| 04 Sideways Paperwork | Move sideways before clearing exit row | 3-5 |
| 05 Holding Bay | Empty staging area, then free blocker | 4-6 |
| 06 Long Package | Length-2 versus length-3 clearance | 5-7 |
| 07 Second in Line | Dependency behind direct blocker | 5-8 |
| 08 Return to Sender | Temporarily move away from exit | 6-9 |
| 09 Shared Loading Lane | Reuse vacated lane for second crate | 7-10 |
| 10 Two Inspectors | Independent obstructions, either order | 7-10 |
| 11 Queue Procedure | Constrained order, not extra clutter | 8-11 |
| 12 Double Handling | Reposition same support twice | 9-12 |
| 13 Back Up the Shipment | Target backward to release workspace | 9-13 |
| 14 Crossing Forms | Interleaved H/V dependencies | 10-14 |
| 15 Temporary Closure | Block exit route now for later payoff | 11-15 |
| 16 Wrong Desk | Plausible detour, easy undo lesson | 11-16 |
| 17 Bay Reservation | Two staging areas compete for one lane | 12-17 |
| 18 Circular Approval | Longer dependency loop, same rules | 13-18 |
| 19 Dispatch Audit | Combine taught mechanisms | 14-20 |
| 20 Final Collection | Readable capstone, no hidden mechanic | 15-22 |

No copied layouts. Revise bypassed lessons; review dependencies/regress/branches/
comprehension. Multiple optima allowed; difficulty unproven.

## Frozen endless algorithm jk-e1

Finite-topology remixes; seed uint32 including zero; index 0..4294967294,
then new seed, no wrap. Band/code/slides: easy/1/1..7, medium/2/8..13,
hard/3/14..22. Version rules/generator/pack changes; no Math.random/clocks.

1. Templates: certified authored boards within band, sorted ID. Their goal
   arrangements come from replaying certified solutions. Empty list => visible
   band-unavailable error, no invented board or difficulty downgrade.
2. PRNG initial uint32 = `(seed XOR imul(index+1,0x9e3779b1) XOR bandCode) >>> 0`.
   Each draw first updates `s=(imul(1664525,s)+1013904223) >>> 0`, returns s.
   Use JS integer semantics and no other randomness; freeze golden outputs.
3. Up to 8 candidates. Consume one draw for template modulo count, one for walk
   length `12 + draw % 49`. Begin at its goal. Step zero must move T away from
   x=4. Later eligible moves exclude goals, immediate inverse and any previously
   seen walk state. List in core order. Empty list ends walk without a draw;
   otherwise one draw chooses modulo count. Record each previous coordinate.
4. Reject no-slide, solved, unchanged or within-index duplicate fingerprint.
   Reverse/invert walk, independently replay to the template goal. This proves
   solvability only. Candidate keeps template geometry, walked state as start.
5. BFS with 20,000-state cap; accept first solved, in-band, independently
   replay-valid shortest proof. Unknown/out-of-band/invalid proceeds to next
   attempt without rewinding PRNG. Search never consumes random draws.
6. Eight failures => certified authored template at `index % count`, with
   fallback source/reason and visible `Certified board fallback` plus source ID.
   No unbounded retry or false novelty/par claim.

Same identity => same board/proof/rejections/fallback across history/speed/theme.
No session filtering. Fixed topology repeats; measure repeats/fallbacks. Variety/
performance unproven; hold failed profiling, never change budgets/invent par.

## Conditional portrait hall

Only exact supplied photo3d `portrait_relief.glb`. Reported absent; tracked-name/
shallow photo3d checks found none, not exhaustive external search. **glb_stats
and exact-file preview: NOT RUN, absent.** No prior render, fabricated likeness,
substitute or inferred rights. Plain pedestal and `Portrait unavailable: supplied
file not installed`; build without asset/three.js when absent.

Only with exact-file presence, >=2 GiB and portrait/likeness permission may D
read-copy local Circuit Ward r160 `three.module.js`, `GLTFLoader.js`,
`BufferGeometryUtils.js`, `LICENSE` to Jankolock vendor/. No donor writes/art/CDN.
Evidence: [sources](circuit-ward-sources.md), [models](circuit-ward-models.md);
pin `d04539a76736ff500cae883d6a38b3dd8643c548`, 1,414,498 bytes. Match four
source/destination hashes to browser/board research. Preserve local imports/MIT;
library license does not cover portrait.

Before enabling: record exact path/bytes/SHA-256/permission; compatible glb_stats
checks chunks, accessor/buffer ranges, decoded finite bounds, triangles/materials/
nodes/resources. No generic CLI found in inspected scripts: resolve tool or
approve bounded compatible checker. Restrictive existing game auditors are not
arbitrary-portrait validators. Reject external URIs/unsupported extensions and
preserve supplied bytes, no silent repair.

Exact-file local preview: original pedestal, bounds-fit camera/light/resize;
no orbit dependency/spin. Lazy load once per live hall. Back disposes renderer,
geometry/materials/textures and stale loads; failures show unavailable, not block
2D play. Separate evidence: WebGL attempted/context; exact-hash GLB load verified;
VISION-reviewed portrait screenshot; genuine hardware render on named GPU/device.
Pi SwiftShader cannot certify hardware render. Canvas/loader events are not
visual proof. Hardware stays NOT PROVEN; supplied asset requires glb_stats and
exact-file preview, absent asset leaves both NOT RUN.

## Storage and offline boundary

Key `jankolock:v1`: `{schema:1,theme:"system"|"light"|"dark",muted:boolean,
motion:"system"|"off",lastLevelId,best:[{levelId,fingerprint,moves,stamps}]}`.
Max 20 authored bests, no seed archive/history/proofs/previews. Validate enums,
IDs/uniqueness/fingerprints/bounded integers/stamps. Reject stale/malformed/
inconsistent/>32768-character data; no storage HTML. Catch access/JSON/quota/
security errors: memory-only play, one `Progress is not saved on this device`.
Save settings/completions only. Defaults system theme/motion, muted until opt-in.
Fresh start; explicit progress reset is separate from Restart.

Offline = zero external runtime requests under local static serving, not first
load without server/cache. No analytics/accounts/third-party assets/fonts/fetches/
sockets/proxy/backend changes. Local config/conditional GLB only, no absent URL
probe. Use local/inline favicon.

## Four future lanes and concurrency

Same operator pins, <=20min tasks, no subdelegation/switch/reset/push. Commit
explicit owned paths; disk/source/permission holds apply.

| Lane | Exclusive writes | Deliverable / dependency |
| --- | --- | --- |
| A Core | `Games/Jankolock/core.js`, `scripts/test_jankolock_core.mjs` | Pure rules/BFS and exhaustive small regressions; lands first |
| B Content | `Games/Jankolock/levels.js`, `scripts/test_jankolock_levels.mjs` | 20 actual boards/proofs, generator, independent replay/goldens; imports A |
| C Interaction | `Games/Jankolock/{ui.js,index.html,style.css}`, `scripts/test_jankolock_browser.py` | Native input/canvas/session/storage/audio and playtest; imports A/B |
| D Hall | `Games/Jankolock/{portrait.js,portrait-config.json}`, conditional `assets/portrait_relief.glb`, `vendor/`, `scripts/test_jankolock_portrait.py` | Absent-safe hall/config or exact approved file; no C edits |

Orchestrator owns docs/subjective review/later integration. No cross-lane edits;
API changes require agreement, no aliases. B proofs precede C gameplay claims.
D owns hall disposal, C owns generation token/pointer. Report partial authorship,
request another bounded pass if needed; never fabricate completion.

## Acceptance plan: runtime gates NOT RUN

Small stdlib/assert tests, no framework. .mjs may use verified data/local ESM
mapping if .js is CommonJS in Node; no root package.json/game rewrite for tests.

1. A: invalid geometry, swept jump-through, every distance/inverse, immutability,
   route-clear-not-win, T->x4, solved starts, BFS order/caps/unknown. Exhaust tiny
   graphs independently for shortest distances.
2. B: re-solve/replay all 20, duplicates/lessons. Goldens: seed 0/1/max, all
   bands, boundary indices, fallback/cancel. Publish matrix, run twice, compare
   boards/proofs/rejections and replay all. Measure states/stalls/d/repeats/
   fallbacks. Finite samples do not prove all seeds.
3. C: real play of >=3 proven boards (01/middle/20) using keyboard, multi-cell
   drag, mobile touch drag and D-pad/Commit. Check preview/cancel, equal move
   counts, blocked gestures, focus/scroll, wins, Undo/Restart after win, replay,
   Next/endless cancel. Multi-slide victory per route; no injected state.
4. Corrupt/stale/oversized/denied storage, mute/suspended audio, reduced motion,
   DPR/resize, 320px/desktop, 200% text zoom, both themes. Real start/play/preview/
   win screenshots, mobile/desktop, both themes; orchestrator VISION review of
   contrast/focus/clipping/hit alignment, not mere image existence.
5. D: disabled => unavailable DOM, no vendor/GLB request/404. Enabled => exact
   hash/local load, visible hall, framing image, repeated open/Back/dispose,
   load/context failures. GPU evidence separate.
6. Capture console/page errors/failed/4xx requests without new benign filters.
   Play with non-local network blocked. Harness port >=8910; finally stops
   browser/server. Syntax/external-load/diff checks; orchestrator checks catalog
   schema/IDs/tracked URLs. Quote actual outputs, exclusions and pass counts.
7. After registration targeted smoke, exact title, assert 1 selected (script
   can misleadingly report 0/0). Does not replace interaction tests:
   `SMOKE_PORT=8910 xvfb-run python3 scripts/smoke_test_games.py --games JANKOLOCK`.
8. Separate mandatory full pre-push gate, every registered game:
   `SMOKE_PORT=8911 xvfb-run python3 scripts/smoke_test_games.py`.
   Sparse missing assets block; report exclusions/pass-total. No weaker filters,
   targeted substitute or old PASS. Held gate => no push; passing grants no push.

No implementation/pack/runtime/render/screenshots/smoke PASS; text checks only.

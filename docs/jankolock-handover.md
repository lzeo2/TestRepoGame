# JANKOLOCK initial capacity-held handover

**Historical receipt:** the subsequent operator resolution identifies Valve's
Deadlock and supersedes the puzzle direction. See the active
[design](jankolock-design.md) and [provenance/current hold](jankolock-provenance.md).
The counts/checks below belong to the initial research run, not a new build.

2026-10-20. **PARTIAL: research and design only. No game added or registered.**

## Phases and decisions

- **Phase 0:** [Research synthesis](jankolock-research.md), three source lanes
  plus adversarial review. Exact intended Deadlock unresolved. Recommended
  original fixed-axis jam-sliding puzzle; cosmetic jank, not borrowed brands,
  levels or assets. Valve is not established as the puzzle reference; claimed
  1991 Brøderbund DOS history unsupported. jdp's browser game is match-4.
- **Phase 1:** [Design contract](jankolock-design.md) drafted with rules, controls,
  scoring, APIs, offline/portrait handling, deterministic generation algorithm,
  twenty authoring briefs and four disjoint future build lanes. Operator-reviewable,
  not implemented or accepted. Briefs are not solved layouts.
- **Phase 2:** **NOT STARTED, capacity hold.** Zero engine/UI/generator modules,
  zero authored pack levels, zero model/vendor copies, zero build commits.
- **Phase 3:** **NOT RUN.** No start/three-level keyboard/drag/mobile playtest,
  game screenshots, targeted smoke or full catalog gate. No gate is waived.

## Branch, IDs and commits

`feat/jankolock` pre-existed at main's exact current boat-push HEAD `a1e7128`.
Selected without resetting refs; main never checked out by this run. Main and
origin/main remained `a1e7128` at review. No push, merge or publication.

Catalog remains **125 entries / max ID234**, equal to the branch baseline.
ID240 only is documented as a claim, **not a registration**. IDs235–239 remain
reserved to trivia; re-read live catalog immediately before any registration.
No ingested or self-made game was added. Intended future game is explicitly
operator-authorized original authorship, not an ingested Deadlock port.

| Commit | Scope |
| --- | --- |
| `c2c423e` | Initial provenance/isolation and ID240 claim |
| `e6e6771` | Identity research |
| `bd5df8e` | Browser/card/board/house-copy research |
| `b410d32` | Mechanics and solver research |
| `ddebbce` | Independent adversarial review |
| `21d47aa` | Design contract |
| Final `docs: reconcile Jankolock research and record capacity hold` | Synthesis, resolved review findings, portrait update, this receipt |

Build/register commits: **none**. Final receipt is identified by subject rather
than a self-referential hash; obtain it with `git log -1 --oneline`.

## Actual evidence and gate counts

| Check | Actual result / limitation |
| --- | --- |
| Orchestrator source re-fetch | 3/3 HTTP200 with verified Valve/jdp/Kiragames excerpts |
| Independent reviewer re-fetch | 6/6 HTTP200; not every historical citation independently retrieved |
| Circuit Ward read-only dependency hashes | 4/4 matched, 1,414,498 bytes; no copy or source edit |
| Research solver-model experiment | One illustrative board: shortest4, exhaustive112 states /800 directed edges, inverses/replay pass |
| Shipped authored levels / certificates | **0/20**, not 20 proven levels; no implemented endless seed statistics |
| Catalog | `PASS catalog schema/unique IDs/tracked URLs: 125; max=234; 240 free, NOT registered`; unchanged from base |
| Owned Markdown path hygiene | `PASS owned docs: no machine-specific absolute paths` |
| `git diff --check` | Exit0, no output; branch Markdown checks also exit0 |
| `python3 -B scripts/check_maintenance_docs.py` | **BLOCKED/exit1:** `AssertionError: Commit inspected source changes before validating its inventory.` Pre-existing dirty Wings source triggers its global guard. No refresh/weakening or sibling edits |
| Touched authored JS / `node --check` | None / not applicable; no runtime JS authored |
| Interactive / smoke / game VISION gates | **0 run / 0 passed**; no servers, so no reserved-port collision |

No maintenance audit/manual/inventory was edited. Documentation-only changes do
not add a game requiring a new manual. Existing inventory is not recertified;
its global checker remains blocked by sibling source. A future implementation
must add/update only its own manual and coordinate shared inventory ownership.

## Portrait status

Initially missing, supplied `portrait_relief.glb` appeared during research.
Independent read-only hash/header/chunk/JSON inspection: **10,972,672 bytes**,
SHA-256 `abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9`,
**421,968 triangles** from metadata, one mesh/material, no external resource URIs.
Not a complete integrity pass. No fresh glb_stats CLI, full accessor decode,
GLTFLoader/game load or WebGL render by this swarm. No integration claimed.

Supplier build receipt matches those bytes but explicitly records overall/
hyper-photorealistic quality FAIL. Orchestrator visually reviewed the two
supplier previews `out/angle_front.png` and `out/pv_0.png` with matching receipt
hashes. Colored head is recognizable but soft/cropped; gray renderer obscures
facial detail. These are not game screenshots, a new exact-file preview render,
a full 360-degree bust or supported-GPU evidence. The supplier's separate
production receipt names astra workers; our swarm did not invoke them. Keep
upstream model provenance distinct from this run's pinned sol delegations.

Conditional manifest design stays disabled if absent/uncleared, with no missing
asset request, fake substitute or vendor cost. Rights/likeness clearance,
compatible integrity checks, exact-file game preview, device budget and honest
quality description remain open. SwiftShader load/DOM checks cannot clear
supported-device rendering.

## Worker sampling, drift and review

Five bounded delegations, all requested and returned `openai-codex/gpt-6.1-sol`,
`xhigh`; no fast mode, model reroll or subdelegation. Lane #3 could verify the
provider/model but did not independently expose thinking metadata; requested
xhigh is not relabeled as its measured runtime fact. Reviewer confirmed xhigh.

Two cycles: research #1–#3, then design/review #4–#5. After each cycle the
orchestrator sampled **first25 and last12 lines of every lane log**, verified
commits via `git log`, and read every delivered document and actual correction
diff. Reviewer additionally inspected all844 original research lines plus
provenance and the design snapshot. Corrections retain source limitations,
reject lock/power-up/loss jokes, qualify BGG metadata and freeze solver order.
No unattended implementation or subjective-acceptance delegation occurred.

Ignored logs (command findings tee'd locally):

- `.swarmforge-logs/jankolock-01-identity.log`
- `.swarmforge-logs/jankolock-02-mechanics.log`
- `.swarmforge-logs/jankolock-03-browser-board.log`
- `.swarmforge-logs/jankolock-04-design.log`
- `.swarmforge-logs/jankolock-05-review.log`

Harness `worker-2026-10-20T03-14-*.log` and `worker-2026-10-20T03-26-50-*.log`
also remain ignored. **Drift:** first-cycle source logs were larger than the
intended compact text lane. No raw downloads/browser/model growth was authorized;
later logs were explicitly limited and concise. Model drift in our lanes: none
observed. Scope/claim drift was caught and corrected, not concealed as PASS.

## Capacity and workspace

Initial available root bytes: **1,941,528,576**. Latest pre-receipt sample:
**1,881,325,568**, change **−60,203,008 bytes** across the shared filesystem.
This global consumption is not attributed solely to this swarm. At that sample,
owned docs totaled110,019 bytes before this receipt; ten owned lane/harness logs
totaled545,009 bytes. Git objects/metadata add overhead. Later final commands
may move these samples slightly; the operative threshold is **2,147,483,648**.

Open capacity ticket: `pi-1379240-1792466056900-bdb127d8`. Hermes advice did not
restore capacity, acknowledge a capacity owner or waive the floor. Separate
research-tooling ticket `pi-1379958-1792466181450-edb0cbc6` timed out, unresolved;
it is not needed to justify further research claims. No deletion, cleanup,
gc, history rewrite, install or broad/narrow game checkout was performed.

Owned paths are committed at handoff. Shared worktree is **not globally clean**:
these pre-existing sibling files remain dirty and were never staged/edited here:

- `Games/Wings/verification/check-speedboat-browser.py`
- `Games/Wings/verification/generate-models.py`

Never stash/reset/commit them to manufacture clean status. Character AI and
other swarms' maintenance audits remain untouched. Sparse selection unchanged
by this run.

## Three honest limitations and unblock

1. Intended Deadlock, the alleged 1991 release and name clearance are unresolved.
   The chosen direction is original mechanics design, not faithful attribution.
2. No game,20-level pack or generator exists; no interactive/screenshots/smoke
   acceptance can be claimed from source research or the single toy solver.
3. Supplied portrait is approximate, quality FAIL, dense and not game-load/
   hardware verified; basic container checks do not clear permission or visuals.

**Operator action:** restore measured free space above2 GiB (with room to retain
that floor), then resume the four disjoint build lanes. Recheck branch/catalog,
portrait bytes/permission and shared ownership before writing. Reserve only
ports>=8910. Complete native three-level/mobile/offline/VISION/portrait gates,
then register240 if still free. Full all-games smoke is mandatory before any
separately authorized push; no push is requested or performed here.

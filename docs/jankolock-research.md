# JANKOLOCK research and historical appendix

## Active operator resolution

The operator subsequently resolved the reference as **Valve's Deadlock** and
ordered an original arena/bots/capture/item-draft translation, not a puzzle.
The [active design](jankolock-design.md) and [updated provenance](jankolock-provenance.md)
supersede the recommendation below. Other candidates and mechanics comparisons
are retained as historical research, not competing current identity claims.
Capacity was subsequently restored and the arena translation implemented.
See the [current build receipt](jankolock-release.md) for registration, native
play, portrait and targeted smoke evidence; the initial findings below remain
historical.

## Historical phase0 synthesis

2026-10-20. Orchestrator synthesis of three parallel sol/xhigh research lanes,
an independent sol/xhigh adversarial lane and a sol/xhigh design lane. This is
research/design delivery, **not an added game or completed implementation**.

### What Deadlock did we find before operator resolution?

**At that stage the intended original remained unidentified.** The following
was the initial recommendation, now superseded: an independently
authored **jam-sliding exit puzzle with cosmetic jank**, not a faithful port of
any located Deadlock. The operator expressly requested this direction, so it
can proceed without inventing an upstream identity. No third-party brands,
assets, code, text or level layouts are proposed for reuse. JANKOLOCK is the
original working title, not a legally cleared mark or claim of endorsement.

| Candidate | What it actually is | Decision / source limit |
| --- | --- | --- |
| Valve Deadlock | Early-development multiplayer combat game; official announcements describe heroes and firearms. Steam community tags classify the shooter/MOBA family. | Not evidence for a jam puzzle. Its art, characters, text and marks are not licensed by a mechanics-remix order. [Valve store](https://store.steampowered.com/app/1422450/Deadlock/?l=english), [API](https://store.steampowered.com/api/appdetails?appids=1422450&l=english). |
| Claimed 1991 Brøderbund DOS maze shooter | No primary record substantiating this year/publisher/platform/genre combination found. Two limited catalog OCR searches are not exhaustive. | Unsupported, not disproved. Do not repeat as fact or silently substitute another game. [Identity lane](jankolock-research-identity.md#b1-brøderbund-spring-1991-education-catalog). |
| Accolade Deadlock: Planetary Conquest | 1996 turn-based space-colony/resource strategy, archived publisher requirements specify Windows. | Real historical namesake, not the alleged DOS maze shooter. [Archived publisher page](https://web.archive.org/web/19980201111236id_/http://www.accolade.com/products/deadlock/home.htm). |
| jdp Deadlock | HTML5 row/column match-4; nonmatching moves create locks; power-ups; endless and timed modes. | Strongest located browser-puzzle name match, but mechanically different from an exit-slider and not established as intended reference. [Author](https://jdp.itch.io/deadlock). |
| Geckoo1337 Deadlock | Windows LD42 puzzle: turn red booleans green, axis-dependent motion, restricted space and loss if unable to move. | Not an inspected browser port or jam-slider source. [Author](https://geckoo1337.itch.io/deadlock). |
| Deadlocked | HTML5/desktop low-resolution FPS, near-name rather than exact title. | Unrelated genre; no reusable asset grant. [Author](https://khreathor.itch.io/deadlocked). |
| Card Deadlock | Inspected fan TCG uses active/bench heroes, souls and patron HP. MIT software notice explicitly excludes third-party art. | No Valve art clearance, not an exit-slider. [Pinned source/license details](jankolock-research-browser-board.md#deadlock-tcg-browser-fan-project-not-official-or-cleared-artwork). |
| Board Deadlock! | BGG designer-attributed 2025 abstract WW1 breakthrough description, 12x6 board and ratio-table combat. A separate 1972 numerical-strategy listing is only a search lead. | Catalog/partial description, not authenticated complete rules or an open license. [BGG metadata](https://api.geekdo.com/api/geekitems?objectid=446550&objecttype=thing&subtype=boardgame). |
| dubl / dribl collections | Checked exact domains identify eyewear and football services. Nearby-name Dubdoo is an actual browser collection but not established as intended. | No verified intended collection URL or Deadlock relationship. No guessed domain may become provenance. [Receipts and search failures](jankolock-research-browser-board.md#names-and-collection-urls). |

The three source lanes recorded requested URLs, statuses, short quotations and
failed searches. HTTP 200 on a shell, challenge or irrelevant result was not
counted as confirmation. General-web search was access-limited. The orchestrator
independently re-fetched Valve API, jdp and Kiragames FAQ: **3/3 HTTP 200**, each
with the claimed mechanics excerpt. The reviewer separately checked six URLs,
including Sokoban, pinned GNOME movement code and the fan TCG license. These
checks are not an exhaustive historical or trademark search.

## Mechanic anatomy and recommended remix

[Mechanics lane](jankolock-research-mechanics.md) compares primary Sokoban rules,
Kiragames' FAQ, pinned GNOME Klotski movement, and manufacturer-authored Rush
Hour rules available only through a mirror. It does not import any layouts.

- **Grid:** original 6x6 layouts, horizontal/vertical length-2/3 shipping crates.
  Each crate stays in its fixed lane. Other crates are obstacles; board edges
  are walls except the visibly drawn target exit. No extra obstacle mechanic.
- **Slide:** any nonzero integral distance with the entire swept path clear.
  One committed slide is one move for keyboard, drag and touch alike.
- **Win:** target T, horizontal length 2 at row 2, is actually slid to x=4.
  Clearing the route alone is not victory. Off-board motion is presentation.
- **Reversibility:** every pre-win move can be undone by the same inverse
  slide. Unlike push-only Sokoban, reaching a temporary jam does not create
  an irreversible loss. No lock, power-up, timer or false no-move game-over.
- **Difficulty:** teach selection, direct blockers, staging, indirect blockers,
  temporary regression and reused lanes. Twenty original authoring briefs
  target 1 through 15–22 shortest slides, not certified difficulty today.
- **Proof:** unit-slide BFS, parent backtracking and independent replay of all
  swept cells for each exact board. A cap means unknown, never unsolvable.
  Seeded endless walks within certified templates, then BFS-checks the actual
  candidate, labels fallback and makes no infinite-uniqueness promise.
- **Jank twist:** shipping paperwork is crooked; the rules are not. Original
  canvas crate details and brief damped stamp wobble, optional synthesized
  stamp/chirp gags. Invalid input gets useful text, never clumsy collision,
  swapped controls, fake delay or move penalties. Reduced motion stays still.

Janky-game conventions such as wobbly physics and deliberately clumsy feedback
are inspiration, not evidence of a particular Deadlock's mechanics. This design
keeps the comedy in cosmetic feedback to preserve puzzle fairness. Local house
samples have short event-linked copy and clear controls, not an established
paperwork canon. Proposed copy: `Blocked by crate A`, `Slide cancelled`,
`Shipment cleared`. No copied characters, catchphrases, brand assets or text.

[Full design](jankolock-design.md) freezes controls, move preview/commit parity,
undo/restart, 20 briefs, scoring, seed algorithm, APIs, four disjoint future
build lanes, desktop/mobile layouts and separate evidence gates. **The briefs
are not twenty delivered levels.** Neither authored pack nor generator exists.

## Challenges resolved

The [adversarial review](jankolock-review.md) inspected every original research
line and independently checked load-bearing sources:

1. jdp is match-4, not jam-sliding. No claim that its identity was resolved.
2. Lane #3's lock/power-up/loss/timer humor was rejected, not merged into the
   reversible rules. Its source note now labels these superseded alternatives.
3. The toy BFS discovery count depends on neighbor order: directional scans
   discovered 61, ascending destination order 55. Both yield shortest **4**;
   exhaustive component **112 states / 800 directed edges**, all reversible.
   This is one research model, **not a 20-level proof or shipped regression**.
4. BGG metadata is designer-attributed catalog description, not an authenticated
   publisher rulebook. Rush Hour's official-host access remains unresolved.

## Portrait update

The supplied `photo3d/out/portrait_relief.glb` was absent on entry but appeared
later. No copy, transformation, vendoring or game integration was performed.
Read-only independent inspection of those exact bytes found:

| Check | Observation |
| --- | --- |
| Bytes / SHA-256 | 10,972,672 / `abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9` |
| Header/chunks | glTF v2, total length matches, aligned in-bounds JSON and BIN chunks |
| Metadata | 1 mesh, 1 material, 421,968 triangles, no images/textures/skins/animations/extensions or resource URIs |
| Integrity limit | No complete accessor decoding, index/bounds validation or fresh glb_stats run by this swarm |
| Supplier receipt | Matching asset hash/statistics; processing PASS, overall/hyper-photorealistic quality **FAIL** |
| Runtime status | Not copied, not load-verified in game, not WebGL-rendered by this swarm; likeness rights unresolved |

Read-only vision inspection reviewed supplier `out/angle_front.png` and
`out/pv_0.png`; both hashes match the supplier's exact-file build receipt.
The colored point-splat front view shows a recognizable photo-colored head,
soft detail and abrupt crop boundaries, not a complete photorealistic bust.
The gray helper preview shows coarse/obscured facial detail; the supplier warns
that its material handling/culling is unsuitable for judging photorealism.
These are existing supplier artifacts, **not fresh game screenshots or a
successful game preview render**. No subjective score or hardware claim.

The supplier's separate production receipt reports astra workers; they were
not invoked by this Jankolock swarm. Our five delegations remained sol/xhigh.
Do not misattribute upstream production to this run or silently call it a
photorealism PASS. The 421,968-triangle cost also needs actual device profiling;
no silent optimization or replacement asset is authorized.

The absent/uncleared-asset design keeps the optional Hall disabled through a
local manifest, with no missing-GLB fetch or fabricated substitute. Only an
approved asset enables read-copied Circuit Ward r160 core/loader/helper plus
MIT notice (1,414,498 bytes); no Circuit Ward files are edited. Pi SwiftShader
load/DOM evidence cannot establish supported-GPU rendering. An exact-file
preview and full integrity checks remain separate gates after capacity clears.

## Initial stop point (historical sample)

For the current pivot/capacity ticket see [provenance](jankolock-provenance.md).
At the initial stop, root capacity remained below **2,147,483,648 bytes**. Ticket
`pi-1379240-1792466056900-bdb127d8` is unresolved; advice did not waive the
operator's floor or acknowledge a capacity owner. Research/design text was the
explicitly permitted initial lane. No bulk checkout, installs, cleanup, history
rewrite, asset copy, browser or server was used. Implementation/registration
and all interactive/smoke gates are held, not silently waived.

Catalog remains **125 entries**, max ID234. **240 is claimed only**, not used;
235–239 remain outside our range. Recheck live catalog before any registration.
No games were added. See [handover](jankolock-handover.md) for commits, sampling,
actual checks, storage and honest limitations.

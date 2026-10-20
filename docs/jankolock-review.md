# Jankolock adversarial review

Delegation #5, 2026-10-20 UTC. `openai-codex/gpt-6.1-sol`, `xhigh`, confirmed by `PI_PROVIDER`, `PI_MODEL`, `PI_REASONING_LEVEL`. No subdelegation, model change, switch or reset. Read `AGENTS.md`, `docs/CODE_QUALITY.md` and provenance. Research baseline: `b410d32` on `feat/jankolock`. Local evidence: `.swarmforge-logs/jankolock-05-review.log`, ignored.

**Decision: the recommended design is an original mechanics remix, not a proven faithful Deadlock adaptation.** The downstream draft resolves conflicting rules, not identity or reuse rights. No game, portrait, render, registration or runtime acceptance is delivered by this review.

## Coverage and commit isolation

Inspected each of the **844 research lines**, including tables, code contract and qualifications, with numbered `git show HEAD:<path>` and `git diff a1e7128..b410d32 -- <path>`. All three are additions, not edits to an existing engine. Line references below use that baseline. Also inspected all 19 provenance lines and its introducing commit.

| Commit | Entire changed-path set |
| --- | --- |
| `c2c423e` | `docs/jankolock-provenance.md` |
| `e6e6771` | `docs/jankolock-research-identity.md` |
| `bd5df8e` | `docs/jankolock-research-browser-board.md` |
| `b410d32` | `docs/jankolock-research-mechanics.md` |

All four commits are docs-only; their worktree copies match Git. `main` and `origin/main` remain `a1e712890f585165575662b6b977c9b20955a475` at entry and pre-commit checks. Neither ref was updated. Prior workers' historical ref movements are not proven.

### Sections inspected

All tables, bullets and qualifications in these ranges were inspected:

- **Identity 1–41:** configuration, finding, five candidates, publisher/user tags; F1.
- **43–116:** V1 store/API, V2 site/announcements, H1 catalogs, H2 archived frames; date and original/current publisher distinctions retained.
- **118–176:** B1/B2 catalogs/OCR, every search row, corrected paths, archival collisions; limited coverage cannot prove absence.
- **178–215:** rights, Steam agreement, authorship, unresolved items, verification; no reuse/name clearance.
- **Mechanics 1–136:** recommendation; S1 Japanese rules/translation, S2 taxonomy, S3 FAQ, S4 Rush Hour mirrors/official failures, S5 immutable GNOME; families distinguished.
- **138–216:** family table, reversibility, exact rules, input parity, undo/restart, hints, medals/comedy; F2.
- **218–291:** BFS/backtracking, caps/unknown, proof records/verifier, toy layout/walk experiment; F3.
- **293–330:** all 20 briefs/bands, difficulty metrics, alternate solutions; no delivered boards.
- **332–389:** seed/index/PRNG, goal departure, inverse witness, duplicates, BFS/caps/fallback, topology limits; performance/variety unproven.
- **391–453:** full core/levels/UI contract, history/count, cancellation/reset, remaining gates; proposal only.
- **Browser/board 1–24:** decision, four collection URLs, search limits; Dubdoo not established as dubl/dribl.
- **26–64:** jdp, Geckoo1337, Deadlocked, Valve; rules/controls/platforms/permissions; match-4 not jam slider.
- **66–103:** TCG revision/every rules bullet/license, 2025 metadata, 1972 snippet; F4, no engine/rulebook acceptance.
- **105–136:** catalog/copy, every joke, wobble/synth/presentation; local game quotes checked in Git; F2.
- **138–176:** portrait, all five tools, closure/hashes, handoff; no portrait acceptance. Advice ticket `pi-1379958-1792466181450-edb0cbc6` remains unresolved.
- **Provenance 1–19:** authorization/isolation, ID, capacity, conditional portrait; context, not historical/third-party rights evidence.

Only the six URLs below were independently fetched. Other receipts remain lane evidence. No additional load-bearing contradiction was established.

## Findings and exact fix recommendations

### F1. HIGH gate: intended Deadlock remains unidentified

Identity lines 10–41 and browser/board lines 7, 28–44 do not identify the intended game. Valve/Accolade do not establish jdp; none establishes lane #2's fixed-axis exit puzzle. **1991 Brøderbund DOS maze shooter remains unsupported, not disproved.** Limited catalog coverage cannot close it.

**Fix:** retain “original recommended mechanics remix; intended Deadlock source unresolved” in design/handoff and catalog copy. Obtain an actual URL, screenshot, credits/manual or move description before claiming fidelity. Never silently substitute a namesake or guessed domain, or assert the unsupported year/publisher/platform/genre. Rename lane #3's ambiguous “plausible sliding puzzle” heading to “row/column match-4 candidate.” Current notes do not falsely claim a verified port; preserve their uncertainty.

### F2. MEDIUM discrepancy: lane #3's joke events contradict lane #2

Browser/board lines 122–134 propose locked lanes, power-ups, no-legal-move loss/restart and timed completion. Mechanics lines 147–160, 170–199 instead select reversible moves without locks, timer or forced loss; no power-up mechanic is defined. A reached nonterminal state retains the previous move's inverse. “Row locked” would falsely imply persistent state; “All departments are waiting for each other” cannot justify game over.

**Fix:** discard lock/permit, power-up and terminal-no-move gags; omit the conditional timer gag without a separately approved mode. Prefer factual blocked-slide/completion/undo/restart feedback. “Jam cleared” needs a real defined event, not invented clearing/scoring. Optional humor stays subordinate to that label. These jokes are inappropriate to the rules, not offensive language. The inverse proof is sound under its assumptions; adding irreversible rules requires a new solver/proof. Generated unsolvable components still require rejection.

### F3. LOW discrepancy: solver discovery order

Mechanics 234–235 prescribe ID/destination order; 281–285 report 61 discovered states without specifying experimental order. Independent ascending destinations gave **55**; directional near-to-far gave **61**, under both table `TABD` and lexical `ABDT` piece order. Both prove four moves; exhaustive counts agree.

**Fix:** document neighbor order and goal-test timing; freeze them before visited-count regression fixtures. The 61 is order-specific, not a false optimum or graph invariant.

### F4. LOW qualification: board metadata versus primary rules

Browser/board 93–99's “accessible primary metadata” proves BGG's record, not an authenticated publisher rulebook. Compare lane #2's explicit Rush Hour mirror qualification.

**Fix:** say “BGG catalog metadata with designer-attributed description”; retain incomplete-rules limits and require an authenticated rulebook for fidelity. The 1972 snippet remains a lead only. Neither board record was independently fetched here; their historical details remain uncertified by this review.

## Independent network evidence

Six distinct URLs, bounded in-memory GETs on 2026-10-20 UTC, all **HTTP 200**. Excerpts/statuses/hashes logged; no assets saved. Same-URL follow-ups resolved extraction-needle misses.

1. [Valve API](https://store.steampowered.com/api/appdetails?appids=1422450&l=english): developer/publisher Valve; “Deadlock is a multiplayer game in early development.” Coming soon, Action. No jam-puzzle connection.
2. [jdp](https://jdp.itch.io/deadlock): “Click and Drag to move rows and columns.” “Match 4 or more tiles to make a combo.” “Timed has no locks and shorter levels”; three minutes. Endless game-over requires all rows/columns locked and no power-ups. Not the proposed exit puzzle.
3. [Kiragames FAQ](https://www.kiragames.com/faq.html): slide rectangular blocks “only left and right, or up and down”; “Challenge mode tracks your move.” Does not establish 6x6, per-drag scoring or level permission.
4. [Sokoban rules](https://www.sokoban.jp/rule.html): `荷物を引いて動かすことはできません。` No pulling; adjacent rules allow pushing one package, not two or more. Supports push-only contrast, not reuse.
5. [Immutable GNOME source](https://raw.githubusercontent.com/GNOME/gnome-klotski/091a38a6a2e788e2792b58972ead6c907cd3b6ec/src/puzzle.vala): `internal bool can_be_moved` tests `(0,1)`, `(0,-1)`, `(1,0)`, `(-1,0)` for non-static pieces. Header: GPL v3 or later. Not fixed-axis motion or a permissive dependency.
6. [Pinned TCG license](https://raw.githubusercontent.com/BrandeisPatrick/tcg/9329b9132a57da5c1980c8a5128f85504818896d/LICENSE): MIT software notice explicitly excludes third-party art rights. No Valve asset grant.

## Rights, portrait and runtime gates

**HIGH reuse/asset gates, not evidence of current unauthorized ingestion:** no inspected note establishes reusable Deadlock/jdp/commercial puzzle assets or layouts. TCG's MIT software license does not clear third-party expression. GNOME source has GPL obligations; manual notice inconsistencies require component-specific review if copying is proposed. Research access, archival hosting, free play and credit are not redistribution permission. No blanket legal or name-clearance conclusion follows.

Read Circuit Ward's MIT notice/source receipt; independently matched all four vendor hashes/byte counts (**1,414,498 bytes**). Its nine model paths confirm the exact-six test is not a portrait CLI. The monster auditor's single-mesh/material contract likewise cannot certify arbitrary GLBs.

Provenance/lane #3 correctly prohibit fabricated substitutes. Actual supplied path/asset and permission remain unresolved. **No portrait statistics, likeness, GLB validity or render are certified.** Require source/rights, hash/size, URI/feature inspection and compatible checks before desktop/mobile offline preview after capacity clears. No replacement model, fabricated screenshot or network fallback; no dependency copying now.

### Downstream design snapshot

Read all 12 sections of sibling-owned, then-untracked `docs/jankolock-design.md`. It already addresses F1/F2: original/unresolved reference, no locks/power-ups/timer. Retain those decisions. Its disabled manifest/lazy imports, no guessed GLB probe, absent-safe text, exact-file/rights/capacity gates and separate GLB/visual/hardware evidence are appropriate **untested proposals**. Twenty briefs, generator and future lanes remain unbuilt, not newly authorized or certified here.

## Verification and handoff

Independent in-memory unit-step sweep/replay and BFS produced:

```text
BFS table order optimal 4 discovered 55 path [('D', 0), ('B', 3), ('A', 3), ('T', 4)]
PASS: component states=112 directed_edges=800; all inverses; stated four-move witness replayed.
```

Directional enumeration reproduced 61 as explained in F3. This tests the proposed toy model only. All 20 actual layouts/proofs, endless code/budgets/variety, UI/input parity, accessibility, persistence and browser behavior remain **unproven**. No asset or browser operation was attempted below the capacity floor.

Git catalog: **125 entries**, max ID **234**, unique IDs/schema/tracked URLs pass; **240 free**, not registered. Recheck before registration. Zero games added/built/registered; no build/register commit. Only this review is committed. Sibling Wings verification changes and design draft were not staged or edited.

Start root availability: **1,912,242,176 bytes**, below 2 GiB: implementation remains capacity-blocked. Unknown identity blocks faithful attribution, not the authorized original direction; missing portrait/permission blocks enabling that optional asset, not absent-safe 2D play. Runtime acceptance remains unproven. No smoke/screenshots/performance/release pass. Full registered-game smoke remains mandatory before a separately authorized push. No push or other-doc edits here.

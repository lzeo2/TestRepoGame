---
name: capital-drive-development
description: Develop, debug, verify and profile the existing offline Capital Drive Canberra game. Use for its feature owners, campaign and NPC mechanics, sourced map/terrain imports, procedural houses and streaming, offline cache and bounded release evidence.
---

Use this skill for the existing `Games/Capital Drive/` project, catalog 245.
It supplies a development procedure, not authorization for a new game, source
acquisition, registration, publication, credentials, deployment or push. The
current user instruction controls the authorized work.

## Start with the actual checkout

Read `AGENTS.md`, `docs/CODE_QUALITY.md`, `docs/maintenance/README.md`,
`docs/maintenance/games/245-capital-drive.md` and the relevant entry in
`docs/maintenance/inventory.json`. Inspect current source and callers before
trusting an old receipt or this skill's example counts. Read the topic contracts
linked by the manual; distinguish their dated evidence from current acceptance.

From the repository root:

```sh
git status --short
git branch --show-current
git rev-parse HEAD
df -h /
git ls-files 'Games/Capital Drive/*' '.agents/skills/capital-drive-development/*'
```

When sparse checkout is enabled, record its selection and inspect missing files
with `git show HEAD:'Games/Capital Drive/<file>'`. Expand only necessary paths,
then restore the original selection. Keep at least 2 GiB free before downloads,
exports or checkout growth. Preserve other people's changes. Use explicit owned
paths and bounded disjoint tasks if delegation is authorized; coordinate the
controller, data files, cache stamps and Git index with their owners.

## Choose the reference for the work

- [Architecture and verification](references/architecture-and-verification.md):
  owner map, feature admission, campaign/receipt/retry/NPC invariants, focused
  test selection, offline cache and review/release handoff.
- [Source maps and performance](references/source-maps-and-performance.md):
  reproducible geographic imports, region and housing coverage, terrain support,
  bridge/floor levels, lazy houses/streaming, attribution and measured profiling.
- [Detailed topic recipes](references/workflow.md): existing feature-specific
  procedures and historical continuations. Consult the section for the touched
  subsystem; check its paths, counts and controls against current code. Do not
  turn a historical browser receipt into a fresh result.

Common contracts are `docs/capital-drive-street-life-contract.md`,
`docs/capital-drive-story-and-streaming-contract.md`,
`docs/capital-drive-cache-and-performance-contract.md`,
`docs/capital-drive-city-systems-contract.md` and the manual's latest source and
verification links. Geographic work also reads `docs/capital-drive-sources.md`,
`docs/capital-drive-district-sources.md`,
`docs/capital-drive-regional-sources.md` and the relevant sidecar attribution.
House work also reads the living-interiors and vehicle-impact contracts. Combat,
recon, crew, transport and aircraft changes read their respective topic contracts.

## Implement through the owner

This is a static site with local ES modules and no application build step or npm
installation. Serve the repository root when a browser is needed: the game uses
shared local assets outside its own directory. Keep raw data, optional developer
packages, exact source exports and evidence outside the checkout.

`script.js` owns the sole loop, live input/context, mode transitions, storage and
integration. Feature modules own supplied-time state or pooled presentation.
Identify the authoritative owner, its caller and its regression before changing
anything. Keep cash, items, offences, completion and receipts with their existing
owners. A view, caller boolean, menu click or elapsed caption cannot grant them.

Preserve Campaign, Street Life and Free roam separation; save schema/migration
and denied-storage handling; exact source geometry and source IDs; shared actor,
vehicle, room, shot-cover and terrain ownership; bounded allocation and disposal.
Do not add remote runtime requests/assets, another RAF or a second timer owner.
Do not touch protected games, bundled portal JavaScript or the disabled proxy.

For a feature, describe the trigger and resulting behavior, patch the smallest
owner boundary, and leave a meaningful focused regression with negative cases.
Test the actual domain modules and adapters. Label detached fixtures, setup
teleports and synthetic wallets as such. Read-only diagnostics are for evidence,
not positive proof of naturally earned progression.

## Run the map census

Use `python3 -B scripts/check_capital_drive.py --map-census` from the repository
root for the full regression and map pass. For a narrow geometry change run
the relevant command from the [census recipe](../../../docs/verification/capital-drive-guidance-map-census-2026-11-25.md).
Capture the road report both before and after a collider change. Use
`--world-obstacles` to include generated parapets and yards. For a bridge
claim, check upper and lower car and pedestrian contact at the same map point.
Keep occupied lane probes in the report even when structural checks pass.

## Verify at the right scope

Run touched JS syntax checks and the focused suites listed in the architecture
reference first. Use the authored runner to inspect the larger plan:

```sh
python3 -B scripts/check_capital_drive.py --help
python3 -B scripts/check_capital_drive.py --dry-run
```

`python3 -B scripts/check_capital_drive.py` is the bounded whole-game source gate,
not the default loop for each tiny edit. Run it for an integration milestone or
when the requested scope requires it. It checks required files, syntax, suites,
cache and whitespace, stops at failure and has a 900-second overall budget.
Do not weaken its assertions, timeouts or missing-file checks to get green.
A full-fleet `smoke_test_games.py` run is reserved for an explicit push/release
order under repository rules. A source pass does not prove native play or FPS.

Only the designated integration owner regenerates the offline closure after the
last runtime change. A documentation-only skill edit does not require a cache
stamp. For requested native evidence, choose the relevant existing bounded
harness, a fresh external output directory and one coordinated browser slot.
Review current arguments/controls; terminate its temporary server/browser and
retain failed evidence. Do not manufacture progress, bypass collision or filter
unexpected errors out of the result.

Finish with exact changed paths, commands and actual outcomes, source revision
or hashes, and remaining native/hardware/source holds. Reconcile the maintenance
manual/inventory when runtime changes require it, through the assigned owner.
Stage/commit/push only within current authorization; this skill grants none.

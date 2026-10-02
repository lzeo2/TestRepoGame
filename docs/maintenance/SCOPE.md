# Maintenance audit and refurbishment contract

The owner requested continued feature work, a comprehensive code audit and
extensive documentation for every game/site feature, with subagents and a future
outlook. This run documents and audits the existing site, investigates the held
Foldwild input defect, and plans a month of refurbishment and source-first 3D
additions. It does not silently register, publish, delete, relicense or push.

## Exact inventory

Git at kickoff contains 115 catalog entries, 120 game directories and one shared
emulator runtime directory: 121 directories/11,489 blobs/1,881,612,390 game-tree
bytes. Five games are unregistered: 2048, Foldwild, Hextris, QWOP and Slope.
`Games/_emulatorjs` is infrastructure, not a sixth unregistered game.

`inventory.json` records current entry blob/tree IDs, tracked counts/sizes, catalog
status and the unique documentation path. Refresh using
`python3 -B scripts/check_maintenance_docs.py --refresh` only after inspecting
source changes. Run without `--refresh` to detect stale inventory and missing
pages/sections. Coverage checks do not certify correctness or legal provenance.

## Each game needs actionable, source-grounded documentation

Each assigned game gets its own Markdown page with this exact identity marker:
`<!-- maintenance-game: Games/ExactFolder -->` and these headings:

1. `Identity and status`: exact entry, ID/category/catalog state; offline/runtime
   evidence distinguished from assertions; immutable/protected or held status.
2. `Implementation map`: actual bootstrap files, engine/family, relative asset
   layout, useful functions and source anchors. Distinguish compiled/vendor code
   from authored wrappers; state unread/restricted engine areas explicitly.
3. `Gameplay and controls`: mechanics, start/restart/outcome, keyboard/touch/audio
   behavior evidenced in source. Do not infer controls just from a familiar title.
4. `State and persistence`: actual state owners/save keys/timers/cleanup; unknown
   engine internals labeled unknown, never invented.
5. `Dependencies and provenance`: local/remote dependencies, shared runtimes,
   licenses/notices and verified source evidence. Unknown rights stay unknown;
   bundled ROM presence is not redistribution clearance.
6. `Audit findings`: bounded findings with severity, exact file/source anchor,
   impact and a root-cause fix; missing evidence and non-findings separated.
7. `Safe iteration`: smallest patch points, preserve game identity/upstream
   content, protected boundaries, migration and rollback, no speculative engine
   rewrite or placeholder replacement.
8. `Verification`: reproducible narrow-checkout commands, static and actual
   browser checks, interaction/restart/save checks; separate recommended checks
   from commands actually run. No pass fabricated from a screenshot/file existing.
9. `Future outlook`: ranked immediate refurbishment and later improvements;
   clear rights/performance prerequisites and features deliberately deferred.

Aim for meaningful depth, not identical boilerplate. Cite inspected functions and
paths. Reuse prior verified reports but mark dated evidence and superseded claims.
Large binary/minified engines may not be human-reviewed in entirety: disclose
coverage, inspect bootstrap/dependency/security boundaries, do not claim full
engine certification. Do not copy personal emails, secrets or absolute paths.

## Site-feature documentation

Trace the actual portal/canonical catalog, search/filter/sort/favorites/recent
history, density/theme/chips/share/metadata/local fonts/accessibility, game launch,
static deployment/routes/headers, disabled proxy, shared emulator/bootstrap,
rights and sparse-storage workflow. Record exact keys/DOM selectors/callers and
what not to edit. Document tests' coverage limitations and release commands.

Historical README/architecture/wiki counts and stale font/provenance claims need
correction, not silent deletion of audit history. New index links the per-game
manual, site features, ranked audit, known blockers and roadmap. Future agents
start there and obey AGENTS/CODE_QUALITY before touching runtime.

## Audit boundaries and verification

- Human/static review covers wrappers/authored sources and source/data interfaces;
  machine scans inventory text/code, local references, remote loads, storage,
  unsafe sinks, syntax and suspicious patterns. Pattern hits need triage.
- Native full catalog loading is a separate serial, bounded operation using the
  unchanged sparse smoke wrapper. No claim of gameplay/provenance/hardware quality
  from its 115 loading results; exclusions/timeout/pageerror limitations disclosed.
- Read Character AI only. Preserve Eaglercraft/GPL/ownership notes, original supplied
  models/vendor notices, disabled `/bare/*`. No broad Games checkout/install.
- Main owns scope/design/subjective image review. Workers use actual
  `openai-codex/gpt-6.1-sol`, disjoint paths, 10–20-minute limits and explicit-path
  anonymous milestone commits. No worker pushes or deletes others' files.
- Storage growth normally stays below 30 MB and at least 2 GB free. The approved
  full-gate exception uses at most 300 MiB Games, at least 1.5 GiB free and finally
  restores sparse selection. Check disk before each growing operation.

## Month outlook

Plan four weekly checkpoints: reliability/rights triage first, high-value wrapper
and accessibility refurbishment next, then source-verified lightweight 3D ports
and sustained hardware QA. Target a few additional 3D experiences, not a guaranteed
count regardless of license/performance. Each selected game must have verified
upstream revision, code/assets licenses, local dependency closure and actual play
proof before registration. Do not call a camera demo a complete action game.

No automatic month-long/background work is promised. Unresolved rights, actual
N100 profiling, catalog ID allocation and publication remain explicit owner gates.
Report every new build/register pair if any is later authorized and added.

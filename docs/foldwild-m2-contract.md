# Foldwild M2: collection expression and battle continuity

Status: implementation authorized by the owner's "keep developing" instruction.
This continues the existing original RPG, not registration, publication or a push.
The horror candidate and procedural frontier remain outside this milestone.

Current checkpoint: [implementation and verification review](foldwild-m2-review.md).
Systems are implemented locally, but integrated native acceptance is held on the
intermittent mobile ledger close after viewport resize. No release approval.

## Product checkpoint

Finish a real discovered-creature inspection loop: open Field Ledger, inspect an
owned or previously seen species as an actual rotatable model, equip an owned
accessory, return to the unchanged expedition, and safely release an eligible ally.
Add saved hairstyle choices and explicit Save progress. Explain actual evolution
in the result when it occurs. Preserve an ongoing battle through reload, including
its enemy, active allies, RNG, round, HP, energy and temporary effects. No reload
healing, rerolling or repeated payout. Native gameplay, not grants, proves the loop.

## Disjoint ownership

- View: `view.js`, new `scripts/test_foldwild_inspection.py` and view report.
- Save: `world.js`, new `scripts/test_foldwild_continuity.mjs` and save report.
- Shell: `index.html`, `style.css`, new small shell check and shell report.
- Integration: `script.js`, new native M2 check and integration report, after or
  against the exact APIs below. Existing checks are read-only unless Main assigns.

Main reviews visual design and actual screenshots. Coding tasks stay bounded to
15–20 minutes, actual `openai-codex/gpt-6.1-sol`, explicit-path anonymous commits.
No dependencies, mutable debug hooks, other-game checkout or original-model edits.
Restore the original sparse selection after integration. No new games/catalog IDs.

## Renderer API

Reuse the one existing canvas, renderer, RAF and 12-entry reference-safe model
cache. Do not create another renderer or preview animation loop.

`await view.showInspection({speciesId, cosmeticId='none'})` resets the current
presentation to mode `inspection`, creates a neutral ground and one actual local
creature centered at the origin, and frames its complete silhouette. Validate the
canonical descriptor through the existing creature loader. Failures stay honestly
reported through `inspect().fallbackModels`; a resolved promise alone is not proof.
`orbitCamera(delta)` supports inspection, with an independent inspection yaw so
world heading is unchanged. `recenterCamera()` resets inspection facing in that
mode. Allow single-finger drag to rotate while inspecting; never dispatch a world
checkpoint in inspection. Reduced motion does not disable deliberate rotation.
Existing battle/world behavior and shared resource cleanup remain intact.

The core moves `#game-canvas` from `.viewport` into `#ledger-model-host` while
inspecting. On preview/ledger close it returns the SAME node to `.viewport` before
restoring world or result presentation; do not replace the canvas or its listeners.
Use a presentation generation/token for fast repeated selection and closing so
late loads cannot resurrect a closed preview. Core controls loading text and focus.
Render can run at existing low cadence with dt=0 while a modal pauses simulation.

## Shell IDs

Inside `#collection-dialog`, after filters and before the card list:
`ledger-inspector` (initially hidden), `ledger-model-name`, `ledger-model-host`,
`ledger-model-status` (live status), and buttons `ledger-rotate-left`,
`ledger-rotate-right`, `ledger-model-reset`, `ledger-preview-close`.

Add a separate native `release-dialog` with `release-title`,
`release-description`, `release-confirm`, `release-cancel`. Confirmation names
the exact individual/species and says it cannot be undone. Native Escape cancels.
Add `save-now` to the expedition toolbar and `evolution-summary` inside result.
No shell controls are described as wired until integration proves their actions.
Flat/local house style, 44px targets, readable inspection viewport, no overlap or
horizontal overflow at 320/390px. Desktop/battle layout already accepted stays.

## Persistence and release API

Keep schema version 2 and existing primary/backup keys. Add OPTIONAL
`pendingBattle` (missing in old v2 and v1 -> null). Fresh state returns null.
When non-null it is a canonical, non-ended battle returned by existing
`validateBattle`. Validate before serialization and loading:

- `result === null`, `phase === 'command'`, both sides have a living active ally.
- Player UID order exactly matches saved team; every player identity, level, XP,
  individual, trait, cosmetic and HP/energy matches the corresponding saved
  roster after `clearEffects`. Preserve battle effects in the snapshot, not the
  ordinary roster. Player class equals saved activeClass, synergies enabled;
  enemy class is none, with no colliding player/enemy UIDs.
- Wild enemy exactly matches one current `worldPoints(state)` wild descriptor,
  including level, UID `wild-${encounterIndex}` and seeded individual data.
- Rival enemy identities/levels/order and UIDs exactly match
  `RIVALS[state.region]` and `rival-${encounterIndex}-${i}`. A completed regional
  trial cannot become a pending trial. All enemies are known/seen species.
- Bound snapshot round (initial ceiling 10000) and counters/XP; validate nested
  records/arrays/prototypes/descriptors without invoking getters. Keep 128-log
  and 256 KiB save caps. Reject malformed/inconsistent saves, preserve raw bytes.

No ended/reward-bearing snapshot is accepted. Settlement computes rewards once,
clears pending, and writes the final state in the same synchronous flow. A failed
write honestly reports in-memory-only progress and never destroys good bytes.

Export pure `releaseCreature(state, uid)` from world.js: validate and copy, reject
unknown UID, active pending battle, favorite, team member, last remaining or last
conscious ally. Remove only that UID and its favorite reference; keep seen/caught
history, nextUid and every unrelated resource/progress field. No release payout.
Future story-required guards join this shared boundary when those tasks exist.

## Core flow

`save()` sets `state.pendingBattle` from the current ongoing battle only while
phase=battle; otherwise null. It must not copy only cleared effects. Save after
every resolved command, including spent kites on a missed capture. Continue
restores the exact canonical pending snapshot with busy=false and no fresh RNG,
starting reward, automatic action or heal. Normal saved world states still load.

Ledger owned cards get Inspect and Release; seen-species cards get Inspect,
unknown species never get a name/model/actions. Attribute and accessory controls
stay UID-keyed. Only show/equip cosmetics already owned. Changing accessory while
previewing updates that model without duplicate rewards or unrelated state edits.
Release cancel/Escape must leave bytes unchanged; confirmation calls the shared
pure guard again. Last-team and favorites guards are enforced, not just disabled.

Wire hairstyles short/cropped/long/none at existing outpost-only appearance menu;
pass saved hair through `viewAppearance`. Save progress provides honest success,
quota/storage failure and corrupt-slot refusal. Preserve existing autosave feedback.
Record before/after species around XP settlement; put actual unfolding names into
`evolution-summary` once without extra XP, new RNG or altered capture identities.

## Acceptance

Pure continuity checks cover old-save compatibility, exact resumed action replay,
effects, RNG and profiles, descriptor/schema defenses, cross-team/enemy integrity,
release guards/immutability, backup/quota/corrupt preservation. Existing eight pure
suites must remain green. Actual native loop includes merchant/capture, inspection
rotation/close, safe team/favorite/release confirmation, hairstyle/save/Continue,
mid-battle reload and repeated finished-state reload with no duplicate payout.
Inspect/draw/triangle/cache counts are evidence, not N100 FPS certification.
Review desktop/mobile images personally. Keep full campaign, final expedition,
all-species acquisition/fit and fresh unfiltered pre-push gate explicitly open.

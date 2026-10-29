# Citisten screenshot / seed / usability repair contract

## Current authority and generation

The new user reproduction supersedes waiting-only checkpoints. The privately
inspected screenshot shows broad parallel green terrain/water bands, a water-heavy
view, a large HUD/control/event stack and right-edge utility clipping. Motion,
unchanged worlds across seeds and unintuitive interaction are explicit user
reports; a still image alone proves neither motion nor seed behavior. No assumed
z-fighting certainty or key-release-as-complete-resolution claim.

Current guarded lifecycle ticket `citisten-repair-source-ready-1793231007146-834a363a.json`,
owner51fcd205, generation`a72aeefe`, was opened/reviewed/answered through the
installed lifecycle CLI. Delegations began under generation`1f4b21de`; subsequent
scheduling-only continuation used`413a8e8a`. Earlier generations, including screenshot
`d2fd0a66`, expired through guarded review when later user turns arrived, not deletion
or inferred bug resolution. The explicit repair authority and saves/failure holds remain. This records the latest explicit scope, not a new
permission, resolved bug, resume or waiver. Do not revive obsolete initial-repro
or Windows/Chromebook approval requirements. No image or personal absolute path
is committed. Models/settings remain unchanged; one integrator, no lane push.

Baseline source`f66c65c6` includes source-only temporal diagnoses`7b08e47c` and
`f66c65c6`; runtime remains published tree`ff06ce5f`,228files/35,188,315bytes.
Prior 233-hash release and double-only DOM proof are historical, not current visual
acceptance. Both rendering artifacts and whole-world motion stay open independently.

## Disjoint ownership

1. Astra: rendering/motion. Own `world.mjs`, `camera.mjs`, `river-render.mjs`,
   `materials.mjs`, `external-materials.mjs`, `daynight.mjs`, relevant existing
   camera/material/world checks, new render-repair check and receipt. Diagnose the
   actual geometry/material/depth order and camera framing with supplied assets.
   Repair demonstrated defects, not hypothetical screenshots. No fog concealment,
   blanket animation removal, quality/LOD/DPR/shadow reductions or unchanged GPU
   launch. Preserve diagnostics and actual geometry/asset provenance.
2. Sol: visible seeded terrain and save compatibility. Own `river-data.mjs`,
   `sim.mjs`, `sim-snapshot.mjs`, relevant river/save/seed tests and receipt. No
   native/UI/world/camera edits. Seed input currently changes economy, not river
   shape: trace all callers and fix the shared generation boundary.
3. Sol: compact HUD/onboarding. Own `ui.mjs`, `ui.css`, relevant UI/onboarding
   checks, new usability check and receipt. No native/index/native.css/simulation
   edits. Parent specifies layout and reviews wording/screenshots. No browser
   reservation retained by a worker.

Parent owns native/index/native.css/persistence integration, confirmation and
named tool feedback, visual-clock scheduler integration/check, canonical manual,
inventory, checkpoint, QA ownership and review. New modules only if unavoidable;
reuse existing helpers and native HTML controls. Worker paths do not overlap.

## Seed / renderer interface fixed before delegation

Extend `createRiverTerrain(size, layout = 'river-v1', terrainSeed = undefined)`.
Omitted seed must reproduce the exact old formula. Explicit seed0 also keeps its
original geometry for stable default fixtures; other unsigned seeds deterministically
vary visible river course/banks/layout, not only resource multipliers. Returned
terrain exposes `seed` when explicit. Keep layout names; existing river consumers
remain compatible. Protect the hall/starter footprint, usable banks and bounded
geometry for every size12..200. Never use mutable gameplay RNG as terrain RNG.

`createSimulation` accepts optional `terrainSeed`; persist optional
`state.terrainSeed` only when explicitly supplied. Saved value, including absence,
always wins on restore. Missing field means exact legacy terrain, NEVER derive
new terrain from old saved economy/event seeds. Validate new untrusted metadata
before roads/world mutation. Same seed/options reproduce, different seeds visibly
differ, save/Continue/restart preserve the original map despite RNG advancement.

Parent native passes `terrainSeed: options.seed` for NEW towns only. Renderer
`world.setTerrain(layout, terrainSeed)` rebuilds when either layout or seed changes,
retains the old string-only API, and uses the same authoritative generator.
Parent calls it with `sim.state.terrainLayout, sim.state.terrainSeed`. UI/minimap
cache must distinguish different seeded terrain, not layout name alone. No silent
regeneration of existing saves.

## HUD / new-town contract

Compact top HUD: brand/budget and essential small resident/capacity/jobs stats,
explicit utility available/needed labels with meaningful zero-demand state,
economy/research/progression expandable. One concise next-action line, not competing
large cards. Keep existing data selectors and authoritative values. Routine events
are compact and named; urgent errors/incident actions remain reachable. No empty
Events heading or generic Placed when a factual building/tool name is available.

Parent compacts native settings into existing Controls details, puts camera help/
buttons before long prose, preserves44px controls, focus and named placement errors.
Clearly distinguish selection from placement, left-click/drag building from camera
movement. No new decorative launch screen or theme replacement.

New town/restart must explicitly confirm replacement when an active/saved town
exists; cancelled operation preserves full town/models/roads/save bytes and menu.
Native uses the standard confirmation dialog. UI respects `onStart`/`onRestart`
returning false without dismissing or resetting. Continue bypasses new-town seed
parsing/confirmation and restores saved terrain; changing seed input alone does
not mutate a current town. Existing saves are not silently overwritten by New town.

## Verification / bounds

Read source and old checks before changes. Small deterministic regressions must
prove shared generation consistency, legacy JSON compatibility/corruption-before-
mutation, seed-dependent renderer rebuild/minimap, source-backed artifact repair,
stable camera input and temporal settling. The prior source diagnosis proved visual
clock can sleep before settling; any repair must preserve one native RAF owner,
full sim delta, hidden suspension and eventual sleep, not force endless frames.
Original500ms pause/5s completion assertions stay intact.

Target layout1367x910,1024x768,854x569 and390x844, both themes, no horizontal clipping,
meaningful labels/focus and44px actions. A reviewed DOM screenshot proves HUD only
if world/renderer is doubled. Actual terrain/artifact acceptance needs a responsive
native renderer; no source-only declaration of visual success. Do not repeat the
unchanged failed local GPU configurations just to claim a capture attempt.

Three bounded12-minute text-only lanes, <=1MB owned growth each; no installs,
exports, model copies, servers or browser workers. Root floor2,147,483,648 bytes;
initial preflight2,258,681,856; fresh lane preflight2,644,897,792. Shared headroom can change independently. Recheck before growth, stop safely
and escalate through guarded lifecycle if below floor. No cleanup/waiver/push.
Commit explicit owned paths; preserve all earlier failures, saves, source freezes
and supplied originals. Parent reviews actual diffs and final exact served scope
only after the sole serial release owner integrates an explicitly handed-off repair.

### Later bounded DOM admission, 2026-10-29

The explicit operator-relayed continuation superseded no-browser status for one
DOM-only pass, not a native/GPU retry or failed-gate waiver. Parent executed the
[documented actual pass](citisten-user-hud-visual-result.md) at frozen3bcc0748:
four viewports/both themes, four labelled JPEG contact sheets522,833bytes total,
8/8 checks, zero WebGL calls and verified own browser/profile/port closure/release.
System browser pinned; no installs, force-clicks, world/state grants, source changes
or push. Peak plus1MBreserve2,699,550<11MB. Default HUD text/hit-testing has actual
DOM evidence; short-landscape density and all native scene/artifact/motion/seed/
WaterSaveContinue/FPS holds remain. No additional browser admission is inferred.

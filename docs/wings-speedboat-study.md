# Wings speedboat study: storage HOLD

Baseline `e9768f7`, 2026-10-19. Study interrupted before design completion.
**Not an implementation contract or design approval. No geometry may follow yet.**
Only this tracked note changes; parent retains design approval/manual/inventory.
Configured provider/model: `openai-codex/gpt-6-astra`; thinking level not verified.

## Stop evidence

Initial free space: 2,148,413,440 bytes. Strict floor: 2,147,483,648.
Subsequent guard: 2,147,213,312, below floor by 270,336 bytes.
Pre-note guard: 2,147,127,296. Filesystem change is not task-attributed.
Stopped inspection at the breach; only this safe note/log/commit may grow disk.
No implementation, installation, acquisition, checkout, browser, deletion or push.
No fleet visits, screenshots, runtime checks or source edits in this lane.

## Completed reading and bounded findings

Read AGENTS, CODE_QUALITY, maintenance README/manual232, v2 resume/Phase 5,
Wings aircraft-quality-contract, models and repair-study. Listed patch boundaries
and nine existing pinned source files. Read aircraft schema/configuration and
converter through material merge/anchor construction; sampled combat/room hooks.
The supplied files are upstream pin `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`,
not a patched source tree. No current-built registry validation completed.

`src/render/aircraft.ts` schema: file, pivots, optional attach, stores, spinners,
afterburners, optional turret/ballPod/rollPod/rudders/doors, anchors, placeholder,
shadow. Store groups contain weapons seat/slot pairs and ordered node names;
spinners contain name/axis/speed/driver; afterburners name/axis/optional cone
(dir/sign/length); anchors key/node/optional tip; placeholder length/span/heli.
Turret fields: yaw/pitch/seat/yawMax/pitchMin/pitchMax; ballPod name/seat/maxUp;
rollPod name/seat; rudders names/gain/max; doors names(angle pairs)/axis/seat.
Current port schema extensions still require patch comparison.

F/A-18 (`fighter`, file `fa18`) pivots include gear, pilot_1/2,
targeting_pod_head, afterburner_L/R, missile_L1/L2/R1/R2 and wingtip_missile_L/R.
Pilot secondary [0,1] store order: L2, R2, wingtip L, wingtip R.
Officer [1,0]+[1,1] order: L1, R1. Visibility uses summed ammo/capacity,
ceil-scaled to store count; it is not necessarily one model per round.
Twin nozzle cones use local -Y, length 1.5; spinners are empty.
Ball pod uses seat 1/maxUp .15; gun anchor references gun_muzzle, with
nozzle/pod anchors. Placeholder length/span 17.5/13; blob shadow 14/18.
Gear visibility follows gearDown with smoothing. Camera values remain uninspected.

Converter removes root world transform via inverse, parents bones to nearest
configured pivot, supports mesh attachment overrides and rigid weight 1 per vertex.
It applies 55-degree creased normals, transforms geometry/normals and reverses
triangle winding for negative determinant. Paint/metal and other material buckets
merge; configured anchors follow bones. Missing pivots warn, not fabricate motion.
Current port preserves F-15/F-35 authored dark hulls per prior documentation;
boat palette preservation needs actual patch and built-converter verification.

Manual/resume identify Apache as selectable, not a new-class opportunity.
Pinned Apache config already has rotors, chin turret and Hellfire stores.
Speedboat must be a genuinely new water class, not a renamed aircraft.
Combat exposes weapon creation, muzzlePosition, fire dispatch, radial splash and
water/ground impact classification. RoomEngine validates spawn and calls stepFlight;
spawn is carrier-based. This partial reading does NOT prove depth-charge or ram
support, honest water handling, or that those mechanics can reuse existing branches.

## Required continuation before implementation

Finish actual built registry extraction without dumping minified lines; compare
all seven descriptors and current patch against the nine pinned files. Finish
toon/scene/camera, vehicles/combat/bots/room-engine/audio engines and patch reads.
Trace selection/validator/loopback/snapshots, muzzle aiming, ammo/regeneration,
bot weights, engine voices, water/terrain queries and carrier exclusion end to end.
Inspect build commands and existing caches only; tooling availability is unproven.
The nine-file staging lacks full authored source, including flight/types/geography,
weapon/UI/network consumers and package/build configuration. Inspect their exact
pinned source plus patch after authorized source recovery, not invented replacements.

Proposed review scope, NOT accepted design: nonmissile deck gun and stern timed
radial water depth charge. Optional wake-slam/ram only after collision/damage study;
otherwise defer it. Specify sea-level spawn away from carrier/land, water and
terrain sampling, coastline/beaching, yaw/drift/drag/reverse, no lift/flight roll.
Derive camera, muzzle and stern launch points from actual geometry. Preserve
original seven behavior; agree minimal disjoint source/model/verification lanes
only after the remaining dependency trace, not from this incomplete path list.

Model target: 12,000-18,000 triangles, >=40 meaningful material assignments,
dark hull with distinct warm/accent livery, nonempty propulsion/wake animation.
Measure total visible scene below 120,000 triangles in the renderer, not asset sums.
Require CPU regressions, at least two fresh visual angles and parent review;
then fresh unchanged full 125-game gate, normal-input boat spawn/every weapon,
verified state changes and restart before any release decision. None ran here.
Upstream engine LICENSE remains missing; Three/font notices do not license it.

Restore headroom before resuming. A few MB is not build/browser/fleet capacity:
prior largest game materialization was 195,853,427 bytes, plus overhead, above
the strict floor. Exact source/toolchain/build footprint remains unmeasured.
Logs: `.swarmforge-logs/wings-speedboat-study.log` and the timestamped worker log.

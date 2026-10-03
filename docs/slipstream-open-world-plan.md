# Owner follow-up: city first, progression, classified mounted gadgets

Direct owner order: more gadgets/customization, base cars unlocked by playing then further equipment; discreet/loud categories; begin driving in an open world before cops pursue; third or first person, general chase-game genre reference. This is existing original Slipstream only, no copied branding/assets or new game. Choose third person for this bounded pass. No first-person driving claim, game registration, push, install or full-catalog checkout. Preserve previous native/pure evidence as historical.

## Execution status: planned, model-policy blocked

**No city, mileage unlock, category, stripe/spoiler or additional gadget implementation has landed.** Current running source remains canonical profile2, garage/highway entry, paid fleet and two smoke/EMP kits from37228a8/00605e2. Prior natural checks/cockpit previews remain valid only for that delivered scope. This document is the new requested contract, not a completion claim.

Tasks117/118/119 first direct tool attempt each exited1 before work: qualified Astra ID was routed to opencode-go and400 `Model is unavailable.` Logs `worker-2026-10-03T06-48-36-{586,649,692}Z.log`. One known explicit-provider dispatcher retry used real delegate_to_worker with openai-codex/gpt-6-astra. Independently inspected assistant session metadata confirms openai-codex-responses/openai-codex/gpt-6-astra for all three. However workers exited0 **without implementation**, citing AGENTS' required current3D model openai-codex/gpt-6.1-sol. Logs `worker-2026-10-03T06-54-44-{384,410,427}Z.log`; source growth0, no worker commits, no world.js or native city tests. Do not equate exit0 refusal with delivery.

Those delegations were abandoned after the two failed task attempts; no third blind/model-substitution retry. Explicit host exited0/173.5157s, not implementation acceptance. Pending routing ticket `pi-912882-1791010169162`, host model-policy ticket `pi-1414141-1791010559582`, Main resolution ticket `pi-912882-1791010626671` received no answer after120s. Need a resolved operator model order (current AGENTS sol versus earlier owner Astra instruction) before new implementation delegation. No local Pi/provider configuration or project rule was rewritten to evade that block.

## Frozen shared worker contract

Main baseline6fec96f. Only Slipstream narrow checkout needed; Garage is present temporarily for existing pure regression and will be sparse-excluded at finish. Disk >=2e9 bytes, worker owned growth <=1MB, anonymous explicit-path commits; no vendor/shared factory/fleet edits. Three disjoint bounded mechanical tasks, Main integrates/reviews native UI and documentation. No worker weakens tests/waits or invents provenance. Existing HTTP/browser servers are bounded, no persistent dev server.

### Core worker ownership

ONLY `Games/Slipstream Borough/core.js`, NEW `Games/Slipstream Borough/world.js`, `scripts/test_slipstream_core.mjs`, NEW `scripts/test_slipstream_world.mjs`.

`world.js` exports deeply frozen `WORLD`: `{limit:165, grid:50, streetHalfWidth:11, blocks:[{x,z,width:28,depth:28,height},...]}`. Block centers form6x6 at-125,-75,-25,25,75,125; original deterministic heights. Renderer uses these exact collision rectangles. Export pure `blocked(x,z)` (finite/trust-boundary validation, vehicle radius included) and `stepWorld(run,input,dt)` if helpful. No DOM/Three imports. Core may call this helper for roaming; world does not import core (avoid cycles).

Profile canonical version3, same save key; exact current fields plus `{careerDistance,escapes}` bounded integers. Version1/2 migrate with zero new counters while preserving existing money/cars/upgrades/customizations/purchased kits. Do not derive fabricated distance from score. Per-owned customizations extend with `stripe` six-digit hex or null, `spoiler` boolean; old cosmetic records migrate to null/false. Canonical copied transactions and descriptor-before-read validation retained.

Export `CAR_UNLOCKS`, frozen map of16 current fleet IDs to distance: bricklet0,pip1200,parcel3000,finch6000,lantern10000,comet15000,orchard22000,pebble30000,dockside40000,horizon55000,morrow70000,gravel90000,relay115000,tempest140000,atlas170000,sunray200000. Existing fleet/tycoon prices unchanged. `settleRun` credits floor(run.distance) once into careerDistance and unlocks newly reached base cars for free with stock customizations/upgrades; increments escapes on escape. `buyCar` is now a free mileage-unlock claim for an eligible unowned car, not a cash deduction. Preserve existing owned cars on migration. Test mode retains its existing isolated all-car behavior.

`GADGETS` keeps existing data and adds fields `{category,unlockDistance}`; five purchasable kinds:
- smoke: discreet,unlock500,price150,charges3,duration5,cooldown10.
- decoy: discreet,unlock1500,price220,charges2,duration6,cooldown12.
- emp: loud,unlock2500,price250,charges2,duration3,cooldown9.
- boost: loud,unlock1000,price200,charges3,duration4,cooldown10.
- repair: utility,unlock3500,price350,charges2,duration0,cooldown15.
- none: no purchase, no charges/category utility/unlock0.
`fitGadget` checks mileage unlock only for NEW kit purchase (already owned old kits remain usable), then cash, one mounted kit, independent bought kits array maximum5. Loud deployment raises heat or starts pursuit in city; discreet effects do not raise heat. Repair restores20hp capped100, boost changes actual acceleration/speed, decoy gives cops a temporary false target. No gadget payouts/immunity or real-weapon construction advice. `customizeCar` accepts optional stripe/spoiler while retaining old paint/wheels input; apply customization fully copied, not a mutation. Cosmetics free for this pass.

`startRun(profile,'roam')` returns same reserved `{profile,run}` protocol. Existing cutup/race remain usable. All runs expose:
- `world:{x,z,heading}` finite; heading radians [-pi,pi], coordinates within WORLD limits in roam. In highway modes canonical world may stay zeros.
- `pursuit:'roaming'|'chased'` (highway cutup uses chased, race roaming).
- `escapeClock`:0..6; `gadgetTarget:{x,z}` for decoy, finite/in bounds.
- `appearance` includes paint/wheels/stripe/spoiler, mounted gadget counters/timers/latch as before.
Roam police entities additionally have own `world:{x,z,heading}`; legacy fields remain validated, copied, present. No traffic/rivals required for roam in this bounded pass. View uses nested world poses rather than pretending highway x/distance are world positions.

Roam starts physically in city at(0,0),heading0 (-Z forward),speed0. input throttle/brake/steer remains, dt<=.05. Real yaw/movement, city boundary/building collision and body damage/cooldown; no teleports or hidden position setters. Patrol begins after20 active seconds AND at least30m driven; a loud gadget may provoke it earlier. Explicit pursuit transition and actual moving cops, navigating around the same buildings (bounded street/Manhattan heuristic acceptable, document ceiling; do not ghost through walls). Player can escape by staying at least75m from all pursuers for6 active seconds after chase starts; then status escaped/reward/end/garage. Arrest near cops at low speed and body-zero bust remain. No distant parked cop counting as a chase; spawn a bounded accessible street position. Active-time deadline still bounded240s. Scene bounds are a real finite open city, not a highway labeled open-world.

Roam distance tracks traveled meters, not signed z. Give roam a large finite finishDistance (100000), no highway endpoint win. Add `parkRun(run)` returning copied status parked ONLY for running roam; allow settlement of parked distance earnings/progress once. This is normal UI parking, not a hidden preterminal test fixture. No parked completion bonus. Existing abandon of race/cutup remains no payout. Validate new terminal/capacity/boost/timer/pose fields and settlement appearance invariants. Expired boost must not leave an invalid above-limit speed. Pure tests cover collision/world-pose invariants, chase transition/escape/arrest, mileage migration/unlocks, categories/costs/effects/loud heat, parking one-shot and existing deterministic highway behavior. Label synthetic/funded/controller tests as such.

### Controller/UI worker ownership

ONLY `Games/Slipstream Borough/script.js`, `index.html`, `style.css`, NEW `scripts/test_slipstream_open_world.py`. Do not edit core/view/shared files or existing native ledgers.

Consume contract above, never invent alternate fields. Normal valid fresh/load boot auto-starts reserved roam after view loads (third-person initial game screen, not garage landing). If save cannot be safely read/written, retain visible garage recovery and no false movement/success. Start must save reservation first. Default mode selector first option roam; race/cutup optional garage actions. Cruise assist moved into driving controls so throttle/one-finger steering is discoverable on initial play. WASD/arrows/touch, pause/help/hidden tab behavior retained.

Garage button parks/settles a normal roam once; race/cutup still abandon unpaid. New runs receive fresh charges. HUD distinguishes exploring/patrol/chase/escape hold vs old highway stats. Show career meters, escaped runs, next free base-car unlock. Fleet cards show mileage locked/unlocked, not incorrect cash prices; auto unlocks reflected. Kit selector labels category, mileage lock, cash price/owned status and charge/cooldown; selectable only if unlocked/owned and affordable. Stripe color+enable and spoiler checkbox in cosmetic form, real saves. Native existing fields paint/wheelColor/applyFinish/gadget/fitGadget/deploy stable. No grants in positive native tests, no source secret printed.

Write one bounded runnable browser check using normal keyboard/buttons/touch/read-only snapshots: initial city/run visible, moving world positions/turning, patrol->real chase, park/one-shot bank/reload, mileage/cosmetic UI, category labels/lock denial, pause and mobile no overflow. Use actual normal earned progression where practical; do NOT seed funded/preterminal saves as natural proof. Keep20s default readiness; explicit existing race-finish110s/pursuit45s limits are not license for infinite waits. Test may exercise existing highway races to earn milestones, but explicitly distinguish that from city-escape acceptance. Main owns all subjective/current-source acceptance.

### Viewer worker ownership

ONLY `Games/Slipstream Borough/view.js`.

Consume WORLD from world.js. Keep factory createCar/disposeCars ownership intact, privately owned cloned body/wheel materials and pooled viewer geometry only. Genuine finite city roads/intersections/building geometry matching WORLD block collision footprints, visible border; stable world scene, not endlessly scrolling road in roam. Third-person camera follows actual world heading, player and cops use nested world positions/heading, wheels animate by actual traveled meters. Old highway/race view remains functional. Original style, no downloads.

Keep real mounts/effects for smoke/EMP; add distinguishable decoy beacon, boost hardware/flame-like nontextured exhaust, repair kit. Show stripe and spoiler as actual simple attached geometry respecting current model dimensions; do not modify shared factory buffers/materials or fabricate snapshot counts. Bounded viewer meshes/effects, owned teardown, paused effects driven by run elapsed/timers, no separate animation loop. Snapshot retains current fields and adds read-only `worldMode`, `cityBlocks`, current actual world pose and mounted gadget/customizations. Camera physically third person; no first-person or integrated showcase claim.

## Main acceptance/release boundaries

Workers commit owned bounded milestones, no push; Main checks actual provider metadata/exit status, Git diffs and contracts then freezes source. Main runs pure/syntax/source/privacy/inventory checks, fresh ordinary native test and opens actual city/customization/countermeasure/mobile images. Preserve any failures or timeout/noncompleted worker result; after two failed observations stop/escalate rather than guessing or enlarging acceptance waits. New source API/flow can supersede old UI expectations explicitly, not rewrite old failed results into success. Existing parked showcase20s/photographic acceptance and Garage reset/full-catalog/hardware/rights holds remain separate. Source-first proposals zeroGO, no extra game or ID reservation. Restore sparseassets/docs/scripts at finish. Update current manuals/inventory/handover with exactly delivered scope and remaining holds.

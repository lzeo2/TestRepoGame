<!-- maintenance-game: Games/Slipstream Borough -->
# Slipstream Borough maintenance manual

## Identity and status

Original, **unregistered and unpublished** 3D traffic/police driving game with racing inside the same game. The owner's explicit two-game exception and later follow-up authorization are recorded in [the plan](../../car-arcade-plan.md). Candidate225 is not reserved. Core build `446fd4b`, presentation `28abac3`, integration fixes `c090df0` and `801240a`. Current pins/counts are in the Git-backed inventory. Registration is held with the car milestone; no build+registration pair exists yet.

## Implementation map

`index.html` loads local shared skin, `style.css` and module `script.js`. Controller imports pure `core.js`, frozen shared fleet, scoped storage and `view.js`. The view imports local r160 and the original procedural factory. Main owns registration/manuals; model/shared changes affect both car games.

Core exports freshProfile, validateProfile, startRun, stepRun, settleRun, buyCar, selectCar, upgradeCar, upgradeCost, applyCode, carStats, GADGETS, customizeCar and fitGadget. Retain copied transactions; never mutate snapshots. `upgradeCost` is the same quote used by the purchase action, including zero-cost test mode. `window.slipstreamSnapshot` is a detached deep-frozen observation, not a setter. Key DOM anchors: viewport, mode, start, cruise, hud, upgrades, catalog, drive, result, radio, io, resetDialog. `setPhase` also sets the root phase attribute for full-width driving and compact mobile layout.

## Gameplay and controls

Fresh Bricklet80, zero cash, no test grant. Cutup evades real pursuing cops and traffic; Highway sprint races three actual moving rivals. Endpoint1200+150*level, level0..12. WASD/arrows steer/gas/brake, P/Escape pauses; held touch controls and normal cruise assist support one-finger steering. Garage orbit buttons/drag inspect cars. Controls dialog explains collision damage, once-only near misses, banking, abandon and restart.

Sixteen fictional cars can be bought/selected; engine, handling and armor0..5 change real mechanics. Damage/bust never locks the free starter behind repair/fuel payments. End results bank distance/near misses and completion prizes once; Retry reserves a new run. Police containment, zero body or240 active seconds busts; race placement uses actual crossing times. Current native evidence proves an ordinary first-place starter race and earned smoke/EMP purchases/deployments, not every difficulty or naturally earned fleet acquisition. Owner-requested [customization and mounted weapons](../../slipstream-gadgets.md): free saved body/wheel finishes, smoke150/EMP250 buy once per owned car, one mounted kit, visible canisters/emitter, Space/E or touch Deploy, bounded charges/cooldowns, real cop slowdown/tracking/containment effects and no damage immunity/payout. New-pursuit refills are free; racing disables use. These are fictional nonlethal arcade mechanics, not real equipment.

## State and persistence

Banked profile key `slipstream-borough-v1`, canonical schema2,128KiB shared boundary; schema1 migrates in memory to stock cosmetics/no kit through descriptor-safe validation. Fields include cash/owned/selected/upgrades/level/best/reservation/settlement counters/testMode and per-owned-car customizations `{paint,wheels,gadget,gadgets}`. Strict hex finishes and owned mounted-kit identity reject malformed saves; loaded raw bytes remain the original same-read token until a normal save. Runs remain memory-only; reload discards the run and pays nothing. Start must save its reserved profile before simulation, settlement occurs only at the terminal transition. Unknown/accessor fields, invalid values and inconsistent identities reject.

Shared storage loads same-read raw bytes and validates before parsing into the game; compares expected bytes before scoped writes. Denied/corrupt/quota/conflict errors visibly lock writes. Reset is nonblocking native dialog with explicit consent and a pre-dialog token; cancellation preserves bytes. Storage events lock cooperating tabs. No atomicity, ABA, tamper-proof ledger or noncooperating-writer guarantee. The unadvertised owner test path persists all cars/max money; it is never natural progression evidence and is not cryptographically secret.

## Dependencies and provenance

Original authored simulation, fictional names and procedural geometry, not OEM art or invented ingestion evidence. [Source record](../../car-arcade-sources.md) preserves local Three.js r160 MIT pin/notices; shared Bungee/Atkinson fonts have separate OFL records. No downloads, third-party runtime fetch, external models, audio or build tooling. Library licensing is not a blanket legal guarantee about every generic design.

## Audit findings

Price quotes and purchases previously needed a shared API; c090df0 removes duplicate guessing and adds executable cost/maximum/ownership checks. Driving previously left an unused desktop grid column;801240a uses full width, keeps mobile touch controls visible and preserves storage errors. Current native checks assert simultaneous model/control visibility at390 and320. Ordinary native smoke/EMP deployment and measured police slowdown now pass; full police contact/bust, high-level balancing and campaign acceptance remain incomplete. No rights/hardware/release certificate is supplied by screenshots.

## Safe iteration

Read [core ABI](../../slipstream-core.md), [presentation](../../slipstream-ui.md) and [integration checkpoint](../../car-arcade-integration.md). Trace every quote/action and phase caller before changes; never add a debug grant. Keep the secret absent from help/cards/reports/captures. Change fleet/models only with both consumers frozen; factory owns cached resource disposal. Preserve local vendor bytes. Pause/blur/cancel clear held inputs; retain one RAF and terminal settlement owner.

## Verification

Current37228a8/00605e2: pure15/15 groups pass; first ordinary gadget native run exits0/189.9259s, strengthened final exits0/205.6968s, zero recorded errors/local-only requests. Fresh starter earned904 cash, applied body/wheel finish through native inputs, bought/fitted both kits, reloaded preserved save, keyboard deployed smoke and real touch deployed EMP with actual police slowdown; pause froze timers, racing disabled use,320/390 no overflow and44px Deploy. No cheat/preterminal grants. Main opened all three [current gadget/game images](../../slipstream-gadgets.md). Historical evidence follows; whole campaign/hardware/release remains separate.

Main's four final pure suites exit0;11 authored/shared/vendor JS syntax checks pass. Frozen native c090df0: Slipstream exit0/102.07s. Frozen801240a: Slipstream exit0/142.16s, ordinary first place/1200m/body100/904 banked, retry/reload/reset cancellation, genuine held touch, both mobile layouts, separately labeled assisted unlock/free upgrade; no reported native errors and runtime hashes unchanged. These are scoped checks, not whole-fleet or whole-campaign proof.

Real model gallery exit0/33.98s, all16 actual factories, two contexts/cycles, cache/disposal assertions; see [gallery review](../../car-fleet-native-review.md). Main personally reviewed the listed car/game captures. Full115-catalog gate not run anew; registration/push held. No third-party rights or physical-device FPS certification.

## Future outlook

Newest owner [city-first/mileage progression/classified gadget plan](../../slipstream-open-world-plan.md) is **not implemented**. Direct delegation misrouted; explicit-provider retry verified actual Astra but workers refused the AGENTS sol-model requirement, returned0/no commits. Abandoned after two failed task attempts; operator model-resolution pending. Current game still highway/garage entry, schema2 and smoke/EMP only. No stripe/spoiler, five-kit catalog, free mileage fleet or open city is claimed by this manual.

[Later original car studies](../../car-realistic-studies.md) include an optimized higher-detail Pip and distinct Brindle, **showcase only**. Their fresh-resource disposal/current29k geometry differs from the shared cached8k gameplay factory; do not substitute them automatically or claim live fleet photorealism. Rounded/tinted bodies, workshop, original PBR finishes and real parked cockpit camera are implemented but current native/photo-quality checks are HELD; this is not yet a driving cockpit feature. No game/Core/catalog source changes belong to that study.

Latest separate studio checkpoint43e76d6 has [reviewed current exterior/cockpit previews](../../car-photo-previews/README.md), original plate maps and continuous lamp covers. Two-cycle geometry/resource checks pass; visual-only capture exits0/84.8389s, but unchanged20s focused gate exits1/41.1914s on first-frame readiness. Appearance remains stylized, not photographic; no live game/fleet bytes changed.

First clear the shared car milestone's Garage reset regression and full release gate/storage lease. Then add natural fleet purchase/performance upgrades, fuller police contact/bust, loss/retry and longer difficulty balance checks before claiming high-quality completion. Additional genres remain separate source/asset/quality decisions, not permission to clone brands or replace existing games.

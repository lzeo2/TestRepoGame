<!-- maintenance-game: Games/Garage Borough -->
# Garage Borough maintenance manual

## Identity and status

Original, **unregistered and unpublished** separate 3D car-business tycoon, not a third racing game or replacement. Explicit owner exception: [car plan](../../car-arcade-plan.md). Candidate226 remains unallocated. Core build83ce902, presentation e69f187, inspection camera c0d309b. Latest reset implementation7ee3910 is **not accepted by a fresh native run**. Current exact pins/counts are in the inventory. No registration/push or build+registration commit pair exists.

## Implementation map

`index.html` loads shared/local CSS and module `script.js`; imports pure `core.js`, shared fleet/storage and `view.js`. View uses the shared original car factory and local renderer. Actual inventory appears in bays; the inspection stand distinguishes owned stock from a supplier preview. DOM owners include scene, start, pause, cash, sales, rent, customers, inventory, catalog, hire, expand, continue, save-error and reset-dialog.

Pure exports: freshBusiness, validateBusiness, tickBusiness, buyStock, restoreCar, sellCar, wholesaleCar, hireStaff, expandGarage, continueBusiness. `window.garageSnapshot` returns detached deep-frozen observations. Controller retains returned transactions and owns one RAF/active-time clock. Help, blur/hidden tab and pause stop simulation; unload disposes renderer/RAF. No offline income.

## Gameplay and controls

Start with $800, one bay, no staff/stock and compact buyer. Buy Bricklet80 for200, restore45→70 for50, match buyer for500: one sale/reputation and net cash1050. Preview is not ownership or profit. All actions are buttons; scene drag, arrows and touch rotation inspect cars; close-up is optional and read-only.

Acquisition max(200,floor(fleetPrice/2)), repair+25/cost max(50,floor(acquisition*.15)), matched sale max(500,floor(acquisition*(100+condition)/100)). Wholesale50..100% acquisition frees space without a sale. Capacity2*bays, bays1..4, staff0..3; hire300+250*staff, expansion800*bays. Mechanics add one condition each3 active seconds, first damaged stock priority. Buyers expire45s, arrive15s, at most3; deterministic stocked demand. Rent every120s,150+50*staff. Unpaid rent closes; ten matched sales wins once, Continue gives no payout. Native full-ten-sale and unpaid-loss acceptance remain unverified.

## State and persistence

Key `garage-borough-v1`, schema1,128KiB shared boundary. Canonical fields: cash/inventory/bays/staff/reputation/sales/elapsed/rentClock/customerClock/customers/nextUid/status/achieved. UID space is unique across stock/buyers, capped and never recycled. Validators check descriptors, bounds, timer consistency and milestone identity before copying. Economic failures leave inputs unchanged; consumed identities cannot pay again against current state.

Loaded raw bytes are metadata from the same read; denied/corrupt/quota/stale writes are visible and preserve existing data. Original blocking confirm reset failed a real concurrent-writer fixture even after moving its token before consent. New7ee3910 implementation uses nonblocking native `<dialog>`, pre-open token, explicit Cancel/Confirm and storage-event lock. Opening reset pauses an active shop. Its revised regression exists but has **not been rerun**. No transaction, ABA or arbitrary client-state security claim; no cheat belongs to this game.

## Dependencies and provenance

Original authored game and fictional procedural fleet under the owner exception, no OEM logos or copied models. Local Three.js r160 MIT notice/pin, shared OFL fonts: [source evidence](../../car-arcade-sources.md). No build/dependency installation, downloaded art, external runtime requests or model binary export. Originality statements do not constitute blanket legal noninfringement guarantees.

## Audit findings

**HIGH GB-RESET:** two observations showed a concurrent writer's newer slot replaced after blocking native confirmation. Full negative test exited1; a separate diagnostic printed mismatch, not a pass. This is not cleared by ordinary sale screenshots. Root-directed nonblocking implementation7ee3910 is a source milestone, not accepted correctness. Escalation `pi-912882-1790949396005` remains pending; no blind timing, third repeat or weakened assertion. Storage help/operator gate is separate from owner implementation authorization.

Inspection originally showed tiny cars at workshop scale; c0d309b adds an accessible focused view, visibly labeled preview/owned. Actual hardware performance, full milestone/balance and reset/recovery acceptance remain held.

## Safe iteration

Read [core contract](../../garage-core.md), [presentation](../../garage-ui.md), [integration checkpoint](../../car-arcade-integration.md). Do not mutate business or inject positive progression. Keep dialog decisions separated from ticking/saving, preserve the pre-consent token, never clear origin storage. Test concurrent writers with negative fixtures and real UI consent. Shared factory resources are removed from scenes but disposed only by its owner after renderer cleanup; model changes require both games reviewed.

## Verification

Final pure model/driving/business/storage suites each exit0;11 new/shared JS files parse. Business suite covers ten-sale/continue, rent/closure, conservation, identities, staff/capacity and hostile fixtures; those are API simulations, not native campaign proof.

Frozen c090df0 native exit0/44.87s: natural buy/repair/one sale1050, pause, exact reload, cancel, keyboard/actual touch rotation and320/390/1280 captures. Frozen801240a native exit1/50.72s: same ordinary groups passed with no console/external/failed requests, then negative reset preservation assertion failed. Runtime hashes unchanged. Minimal diagnostic exit0 printed the repeated failure and did not assert success. Latest7ee3910 revised native test is pending, not passed. Real shared-fleet gallery exit0; Main reviewed listed workshop/close-up captures. No fresh all-catalog gate, registration or push.

## Future outlook

[Later original car studies](../../car-realistic-studies.md) live in a separate optimized studio, not this game's inventory/factory. Fresh per-group resource ownership and current24k meshes need explicit LOD/performance/integration review before any replacement. The rounded/tinted workshop and physical cockpit iteration is native-HELD after two failures; cockpit is a parked study, not an integrated game feature. This study adds no new game or registration and does not clear this game's reset hold.

Clear the updated consent race first, then natural loss/reset and ten-sale/Continue checks. Measure target-device performance and pacing with real input. Do not add a second-game cheat, real-money economy, backend, massive model files or unrelated original game under this lease. Additional ports require their own current quality/provenance gates.

# Modern supercar equipment: proposal only

Delegation **131**, 2026-10-03. Baseline `0cc4bb1`. Actual assistant session records: `openai-codex/gpt-6-astra`, thinking `high`, session `01a10389-0dec-77d4-a572-18a53f21356a`. Owner-selected model exception and path ownership: [modern contract](car-modern-supercars-plan.md#delegation131-mountsperkspowerups-design-only). This document is the worker's source/design log; no runtime implementation is authorized here.

**ALL NEW mounts, passives and pickups below are PROPOSED, UNIMPLEMENTED.** Nothing is fitted, spawned, granted or installed by this document. Calyx S (`calyx`), Serein R (`serein`) and Nacre V (`nacre`) are original closed modern mid-engine supercar studies, not GT/speedster/targa replacements. Existing 21 studies and 16 live cars remain protected. No new game, catalog entry, player-save change, physics change, purchase, registration or push. Fictional nonlethal arcade effects only: no real equipment construction, physical engineering or tactical instructions. Broad original shape language only; no OEM imagery, brands, logos or traced templates. No copyright, photographic-quality, physics or performance certification.

## Inspected source and current limits

Read complete HEAD Slipstream `core.js`, `view.js`, `world.js`, controller `script.js` through bounded read-only Git extracts; private-code text withheld. Read shared `fleet.js`, `models.js`, `storage.js`, showcase `detail-profiles.js`, `detailed.js`, `studio.js`, `realism.js`, and the Garage view factory consumer. Both exact maintenance manuals, including Future outlook, and the [21-study gallery](car-polished-previews/README.md) with both contact sheets were read. Gallery images are historical context, not new mount evidence. Both Games entry/tree identities match `docs/maintenance/inventory.json` at baseline.

Stable source references at `0cc4bb1`:

- `Games/Slipstream Borough/core.js`: `GADGETS` lines 9–16; profile/customization validation 49–94; purchase/fit 122–132; `startRun` 163–175; `checkRun` 186–230; stepping 279–355; `disrupted` 357–367; settlement 368–381. Blob `a24e3e8e141d4540fe7ca3c47152a194784eaa46`.
- `Games/Slipstream Borough/view.js`: kit primitives 78–106, `select` 115–157, draw/effects/cameras 167–252, final disposal. Blob `9c72d1c985cd404e351bfaeb75cbad1e4e44180d`.
- `Games/Slipstream Borough/world.js`: `WORLD`, `blocked`, `clearPath`, `chaseTarget`; blob `8115f70c25664c6b1553dfbd409673d1782efced`. Controller owns reservation-before-start, pause, input clearing, settlement and save conflicts, not the renderer.
- `assets/car-arcade/models.js`: `createCar`/`disposeCars`; cached factory ABI, blob `793a71e0e0fbab33e69ab4c8a1c6dc641aa992f7`. Both game views consume it. New studies are not members of `fleet.js`/`BY_ID`.

Current city-native process exit/natural escape/five-kit earned acceptance remain held; Garage reset regression and the unchanged 20s studio startup gate remain held. Historical PASS reports do not release these gates.

## Current five-kit rules, not new features

Normal earned path; no test-mode grants are admissible evidence. Distances are **banked career meters**, prices are cash, times are active simulation seconds.

| Purchased kit | Category | Eligibility / once-per-car price | Charges per new non-race run | Duration / cooldown | Actual current effect |
| --- | --- | --- | --- | --- | --- |
| Smoke screen | discreet | 500 m / 150 | 3 | 5 s / 10 s | Following wake: longitudinal gap `>=0 && <100`, lateral distance `<3.5`; affected cop speed target/cap `.35 * player stats.speed`. |
| Decoy beacon | discreet | 1,500 m / 220 | 2 | 6 s / 12 s | City captures the player's deployment world position as false target; highway steers toward `-player.x`. No radius or `disrupted` slowdown for decoy. |
| EMP pulse | loud | 2,500 m / 250 | 2 | 3 s / 9 s | Strict planar distance `<65`; affected cop speed target/cap `.08 * player stats.speed`. |
| Boost pack | loud | 1,000 m / 200 | 3 | 4 s / 10 s | Throttle acceleration multiplier 1.8; speed cap 1.35 times stats.speed. No collision immunity. |
| Repair kit | utility | 3,500 m / 350 | 2 | instant / 15 s | Adds 20 HP, capped at 100; consumes a charge even at full HP. No payout. |

City smoke wake is recomputed from **current player pose**, not persistent dropped smoke volumes: `gap=dx*sin(heading)+dz*cos(heading)`; `lateral=abs(dx*cos(heading)-dz*sin(heading))`. Highway gap is `player.distance-cop.distance`. EMP uses `hypot(dx,dz)` in city or `hypot(gap,lateral)` on highway. These checks have no building line-of-sight test. Rendered puffs and expanding rings are not authoritative hit volumes; current visible smoke does not depict the full 100 m simulation wake. Disrupted cops cannot add containment arrest, but contact damage remains possible. Decoy redirects without that disruption exemption.

Every loud deployment adds 1 heat, capped at 5. Discreet/utility does not mean immunity: city heat above zero starts pursuit, ordinary patrol also starts after 20 s AND 30 m; cutup heat has a distance/near-miss/level floor. No proposed perk waives these rules. City escape requires all cops at least 75 m away for 6 s; HP zero, 3 s arrest or 240 active seconds busts. World has 36 buildings, ±165 m boundary and 50 m grid; `blocked` uses a fixed 2 m radius, **not detailed car/mount mesh collision**.

`fitGadget` buys each kind once **per owned car**, saves it in `gadgets`, and selects one `gadget`. Selecting another purchased kit costs no second purchase; `none` removes the selected kit without refund/deleting purchases. Migration preserves previously purchased kits even below the new mileage threshold. Runtime `select` removes all kit groups before attaching the selected one. This is not five permanently mounted kits.

Start copies the loadout, reserves a fresh run ID and initializes capacity; racing has zero charges and rejects use. `charges + deployments === capacity`; deployment needs a rising input edge, remaining charge and zero cooldown. Timers freeze because paused/hidden/blocked controller does not step; terminal steps do not apply effects. Current fresh-run refills are free by design, not a new pickup entitlement. Reload abandons memory-only activity and pays nothing; it may reserve a **new** run, never restore/refill the old one. Settlement requires current run/level/car/stats/loadout and banks once. Free mileage unlocks run from Pip at 1,200 m to Sunray at 200,000 m; engine/handling/armor remain 0–5 paid upgrades. No current modern-car unlock exists.

## Proposed mount envelopes against observed modern source

The profiles and modern renderer appeared during this read-only review and were reread completely. The dimensions below match delegation 129's **in-progress source**, not measured bounds or frozen acceptance: `detail-profiles.js` SHA256 `be050d911145d0502041701ac4a2dfc54a60e25e419cc77cd33c97b657430622`; `detailed.js` SHA256 `6932e590254ccf428983c02736342004b5115d4689f9936dbeb762d103ce4030`. They match the earlier proposed nominal envelopes. Reconcile with the final commit before creating any mount. Units are model meters; origin is car center at ground, X lateral (left negative), Y up, **forward -Z**, rear +Z. No roof antenna, hood device or side pod: those compete with the narrow cockpit, lamps and cooling openings.

| Car | Nominal W / L / H / wheelbase / body belt | Proposed rear kit-root center X,Y,Z | Maximum static occupied box W,H,D |
| --- | --- | --- | --- |
| Calyx S | 2.08 / 4.58 / 1.15 / 2.83 / .70 | `(0, .420, 2.370)` | `.48, .08, .12` |
| Serein R | 2.11 / 4.73 / 1.12 / 2.90 / .70 | `(0, .420, 2.445)` | `.48, .08, .12` |
| Nacre V | 2.14 / 4.80 / 1.17 / 2.98 / .74 | `(0, .435, 2.480)` | `.48, .08, .12` |

Root Z is `L/2 + .08`; rear static extent is `L/2 + .14`. Reserve a **central rear fascia slot above the diffuser**, between the separated lamps, away from side intakes and rear-wheel arches. Current modern radius is `min(B*.46,W*.185)`, not the old `.39*B`; this raised the initial proposed mounts. Source-formula fin tops are .3465/.3465/.3603; mount-bottom gaps are .0335/.0335/.0347. Rear plate upper-edge gaps are .031/.031/.0322. These three arithmetic checks passed, but are not actual mesh/visibility acceptance. Lamp horizontal intervals stay outside the proposed ±.24 box in the inspected formulas; Nacre is tightest and needs final triangle checks. The current low deck lip and engine cooling partition stay above/forward of the slot. These coordinates are a layout choice, not a clearance pass. Minimum desired separation: .02 from rear fascia except a deliberate attachment tab, .03 from fins/lamp lenses/intake boundaries, .06 from the full wheel sweep, .10 from cabin/glass/eye space. If no such slot exists in final geometry, keep equipment unmounted and revise the proposal; do not cut fins, hide lamps or move cameras to manufacture acceptance.

All five variants use that same root, one at a time. Local primitive/art size limits, not real hardware specifications:

| Kit appearance proposal | Local center(s), relative to root | Combined bound / visual rule |
| --- | --- | --- |
| Smoke | `(-.16,0,0)` and `(.16,0,0)` | Two rounded `.10 × .08 × .12` abstract tiles; total width .42. Wake remains core-driven, not emitter collision. |
| Decoy | `(0,0,0)` | `.22 × .08 × .12` amber inset marker; no tall stalk or beacon above glass. |
| EMP | `(0,0,0)` | `.30 × .08 × .12` flat segmented arcade token, no physical coil design. |
| Boost | `(-.16,0,0)` and `(.16,0,0)` | Same .42-wide pair; optional drawn glow extends at most .35 behind the static rear bound, no solid/collision extension. |
| Repair | `(0,0,0)` | `.30 × .08 × .12` plain utility tile; no physical repair apparatus. |

Observed roof widths are 1.17/1.14/1.22. Current cockpit formula gives eyes approximately `(-.3536,.9565,-.4698)`, `(-.3587,.9394,-.6109)`, `(-.3638,.9851,-.5860)` respectively; no mount belongs in their view corridor. These are source-derived references, not camera/raycast results.

Mount validation must use final transformed triangles and sampled distances, not just profile boxes: fascia contact, rear lamps at oblique views, diffuser fins, recessed intake channels, wheel steering/rotation sweep, glass/pillars and cockpit eye-to-road/instrument rays. Check complete exterior orbit, physical cockpit look range and chase-camera obstruction rays. Keep optional spoiler/stripe geometry out of the slot; reject conflicting customization rather than silently overlapping it. Retain original broad sculpting: compact flowing Calyx, crisp Serein and broader sweeping Nacre.

## Proposed passives and optional pickups

These are future balance candidates, **not implemented stats or unlocks**. Each car has at most its own one purchased passive, garage-selected before reservation; never switch during a run. Gates require that car to become legitimately owned under a separately approved future integration, plus the listed banked mileage and cash payment. They do not grant the car or its kit. No passive applies in racing; no upgrades/ranks/stacking tree.

| Car passive | Proposed earned gate | Benefit, tradeoff and hard cap |
| --- | --- | --- |
| Calyx: Soft Trail | 10,000 m + 500 cash | With purchased smoke only: duration 5.25 s instead of 5; cooldown 11 s instead of 10. Same 3 charges, wake dimensions and cop factor. |
| Serein: Narrow Window | 20,000 m + 750 cash | With purchased EMP only: strict radius <67 m instead of <65; duration 2.85 s instead of 3. Same 2 charges, 9 s cooldown, slowdown and +1 loud heat. |
| Nacre: Patient Patch | 30,000 m + 1,000 cash | With purchased repair only: +22 HP instead of +20, still max 100; cooldown 17 s instead of 15. Same 2 charges and full-HP consumption. |

Small optional pickup experiment, separately gated: after 10,000 banked meters, at most **one** deterministic marker opportunity per new non-race run after 300 traveled meters. Choose one effect from run seed/identity; place only on a valid street path, never inside buildings. **Grip marker:** +3% steering response for 3 active seconds, -3% throttle acceleration during that interval. **Brake marker:** +5% brake deceleration for 3 active seconds, -3% throttle acceleration during that interval. No banked reward, top-speed increase, protection, HP refill, charges, cooldown reset, money or heat reduction. One opportunity total, not one of each; ignore overlapping/repeated contacts. Effects expire, cannot be carried to another run and are discarded on reload. No pickup assets or spawning code exist under this proposal.

## Integration mismatch and acceptance gates

1. **Factory ABI/lifetime:** current cached gameplay factory returns `carId`, dimensions, wheel meshes and `profile.wheelRadius`, named `body`/`trim-interior`/`glazing`; consumer clones paint/wheel materials and disposes shared geometry only at final teardown. Detailed studies return `id`, `showcaseOnly`, cockpit data and wheel groups with fresh per-instance geometry/materials, named material batches and finite UVs. Studio replacement individually disposes them and decorator maps. A direct factory swap breaks IDs, paint lookup, wheel material assumptions and ownership. Modern IDs currently fail `BY_ID` and the validator's 16-car ownership bound. Do not alter either game or shared ABI under this document.
2. **Placement mismatch:** current live viewer places smoke/boost at `(0,.36,measuredLength/2+.02)`, others at `(0,measuredHeight+.06,0)`. Current tall decoy, EMP ring and repair box exceed the new fascia proposal. Future compact variants/root placement require a separately reviewed viewer change; they are not already mounted by modern body generation.
3. **Conflict/resource budget:** proposed new study body target <=28,000 triangles leaves <=2,000 for one kit, within existing <=30,000/75-mesh ceiling. Propose <=4 extra kit meshes and zero extra textures; preserve decorator nine fresh maps/983,040 base RGBA bytes (mips extra). Measure real combined counts, transparency and exactly-once disposal through switch/remove/reselect/context teardown. Cached gameplay's historical 7 draws/5,516–5,996 triangles is a different budget, not authority to deploy a detailed fleet. Hardware/FPS and gameplay LOD acceptance remain separate.
4. **Core guards and balance:** current duration/cooldown/radius constants and `checkRun` exact stats do not support these proposals. A future authorized change must derive bounded effective kit rules in one place for step/validation/UI, preserve charge conservation/heat and ensure race-disable, pause/hidden/blocked freeze, zero-dt and all terminal states prevent pickup/deploy. Test threshold edges, full-HP waste, max-upgrade interactions, expiry ordering and no cooldown/refill shortcuts. Cap total simultaneous enhancement to one car passive plus one temporary marker; neither multiplies the other's quantity. Normal earned, matched-route balance comparisons must measure escape rate, arrest time, damage, elapsed time and banked cash, with zero grants and retained failures, before choosing final numbers.
5. **Identity/persistence:** no present save-schema change. Future optional passive ownership needs an explicit version migration preserving schema1/2/3 cash/cars/finishes/kits, defaulting new entitlements to absent, rejecting unknown/accessor/duplicate fields and respecting 128 KiB. Pickup identity must include reserved run ID plus a bounded monotonic entity ID; one contact consumes it once before effect application, never reuse on respawn/load. Preserve reservation-before-simulation, unbanked reload loss and once-only terminal settlement. Test denied/quota/corrupt storage, same-read byte tokens, conflicting tabs, loadout changes and counter exhaustion. No atomicity/ABA/tamper-proof guarantee is implied.
6. **Future proof, not permission:** freeze sources after all three workers finish; Main verifies final profile dimensions and all clearance/resource checks, then separately authorizes any implementation. Native earned mileage/purchase/switch/remove/reload/keyboard/touch proof, all-five effects and natural escape are later gates. No full/native suite or browser was run by this worker; no screenshots were produced. No player saves or runtime/data/catalog bytes changed. Main retains subjective render review and publication decisions.

## Worker verification ledger

Source/document checks only, no executed game simulation: both game inventory tree/entry pairs matched; three proposed vertical-envelope arithmetic checks passed; proposal/privacy/path checks passed without printing private text; catalog check passed for 115 records, unique IDs/schema and Git-backed URLs. `python3 -B scripts/check_maintenance_docs.py` printed `PASS: 122 game documents cover 115 registered + 7 unregistered games; Git inventory current.` Its coverage is not gameplay acceptance. Owned diff whitespace check passed. No script changed, so no worker script-syntax gate applies. Zero native/full-suite runs, zero new screenshots, zero new games. Other workers' source changes are neither owned nor accepted by this ledger.

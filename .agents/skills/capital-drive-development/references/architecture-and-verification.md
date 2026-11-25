# Capital Drive architecture and narrow verification

This is a source guide, not a PASS receipt. Paths and commands are relative to
the repository root. Run only the groups relevant to the change; inspect the
current runner for newly registered modules and suites.

## Follow state and context through the boundary

Start at the user-visible action in `script.js`/`street-ui.js`/`city-ui.js`, follow
its live context into the state owner, then trace the terminal event and save
writer. Find the render/physics adapter and cleanup path. A feature often needs
both a pure owner regression and one integration regression to catch a missing
context field or an obsolete VM mock.

| Responsibility | Primary modules | Required boundary |
| --- | --- | --- |
| Boot, input, mode, sole RAF, camera integration and persistence | `script.js`, `game-data.js`, `career-reset.js`, `protagonist-state.js`, `character-start.js` | Validate data/save inputs; preserve failed reads and overwrite-disable behavior; apply effects once through their actual owners |
| Directed roads, ordinary driving, parked/static/dynamic body queries | `simulation.js`, `road-network.js`, `driving-dynamics.js`, `navigation.js`, `navigation-guidance.js` | Keep road profiles/source geometry, vehicle dimensions, checked stop/exit and swept contacts; do not trade collision for speed |
| Player health, equipment, ammo, recovery and police | `gameplay.js`, `police.js`, `police-rooms.js`, `police-support.js`, `equipment.js`, `weapons.js` | Preserve live body/room identity, independent inventory and one recovery/respawn owner |
| Jobs, commerce, rentals, garage and saved cash | `progression.js`, `services.js`, `stores.js`, `car-rental.js`, `safehouse-storage.js` | Quote/admit/pay using real location, funds, ownership and matching fresh terminal outcomes |
| Campaign ordering, hero ownership and completion | `campaign.js`, `campaign-world.js`, `campaign-aftermath.js` | Strict prefixes and stable IDs; transient active attempts; exactly-once rewards through the existing career writer |
| Contract plans, action receipts and target state | `stealth-contracts.js`, `recon.js`, `contract-target.js`, `contract-stealth.js`, `assassination-mission.js` | Match mission/stage/target/room and fresh serial; preserve private retry progress and actual hit/scan/action ownership |
| Houses, rooms, activities and adults | `interiors.js`, `interior-navigation.js`, `interior-activities.js`, `interior-people.js`, `house-controller.js`, `burglary.js` | Same rendered entry, plan, collider, floor, adult and station/session; allocate on entry and dispose on exit |
| Street adults and live crew | `pedestrians.js`, `campaign-scenes.js`, `person-model.js` | One authoritative identity/health/body, bounded contacts and sight, no resurrection or reward from the view |
| Physical transport and projectiles | `buses.js`, `light-rail.js`, `ride-service.js`, `delivery-service.js`, `aircraft.js`, `watercraft.js`, `ordnance.js`, `ballistics.js`, `shot-obstacles.js` | Register actual moving hulls/people for movement and shots; preserve rooms, floor levels, boarding and terminal identity |
| Geographic composition and elevation | `map-expansion.js`, `north-west.js`, `regional-expansion.js`, `residential-expansion.js`, `airport.js`, `terrain.js` | Source-owned coordinates and tags, deterministic deduplication, terrain priority, bridge and water support |
| Defence depot | `defence-depot.js`, `defence-depot-view.js`, `depot-tank.js`, `aircraft.js` | Checked airport service-road seam, actual gateway clearance and vehicle ownership by stable ID |
| Pooled/streamed presentation | `world-view.js`, `neighbourhood.js`, `traffic-view.js`, `actor-view.js`, `interior-view.js`, feature `*-view.js` files | No economy, save writes, extra RAF or per-frame geometry; shared dimensions/support, bounded queues and disposal |
| Render cadence and offline delivery | `render-gate.js`, `graphics-diagnostics.js`, `cache-client.js`, `cache-launcher.js`, `service-worker.js`, generated `cache-manifest.js` | Separate simulation/RAF/renders; cache exact local closure and detect mixed builds without deleting unrelated data |

Names above identify boundaries, not permission to edit all listed files. The
controller is heavily shared; assign one integration owner during parallel work.
A source-only or test-only task must leave runtime/cache files untouched.

## Supplied time, authority and save behavior

Use injected time/context. Retain pause/hidden-tab/zero-dt behavior, finite input
validation and bounded update deltas. Rendering interpolation belongs to the
view; collisions, mission eligibility and persistence use the live body.

Campaign and Street Life may earn career progress. Free roam may permit map
travel and preview equipment, but cannot bank career rewards. Mode transitions
must cancel incompatible actions and release room/vehicle/actor presentation.
Never clear all localStorage, IndexedDB or origin caches to repair one save.
Read `career-reset.js` and the controller's current writer before changing keys,
reset behavior, migration or corrupt/denied-save handling.

Unknown/corrupt versions and denied storage are negative cases. Check that the
original bytes remain unwritten, that independent discovery/tutorial/career
state stays separate, and that transient activities cannot survive as replayable
payouts. Avoid pasting real save contents or credentials into reports.

## Campaign and retry regressions

The inspected story structure has six introductions, one meeting and seventeen
shared chapters. Derive IDs from the current journal when constructing new
fixtures; retain explicit old prefixes in migration regressions. Appending
chapters preserves old completions and optional receipts but can intentionally
relock new optional starts until the new shared prefix is complete. Report that
behavior explicitly. Do not rename a persisted ID to change a displayed title.

A completion must come from the actual domain predicate: matching school alarm,
work/packing terminal, robbery, evidence session, won fight, framed scan, kill
receipt or ordered contract action. Test wrong room/store/mission/stage/target,
stale or malformed serials, recovery, pause, vehicle/passenger modes and replay.
Escape requires real target arrival under its authored foot/drive/stop guards,
then the actual clear/search/hold conditions. Arrival is transient to the attempt
and stage; it resets on advance/retry, while clearing wanted remotely cannot
create arrival.

Campaign retries use opaque in-memory snapshots. Preserve attempt generation,
hero/crew state, planned contract and aircraft bindings; restore the selected
prior-stage start, reset held/arrival state and refresh receipt/respawn baselines.
A normal new attempt, cancellation/hero/mode change, saved progress change or
completion must invalidate inappropriate checkpoints. The controller owns body
rollback and recovery timing. A copied `active` object also needs its paired
`stealth-contracts.js` private cursor/credential snapshot; a Campaign snapshot
alone does not restore a WeakMap owned by another module.

The Gallery Ledger retains historical contract ID `replica-relay`. Its fictional
gallery anchors come from the actual authored interior helper/plan. In-room
objectives use exact room-tagged visibility and receipts; public extraction is
exterior-only. A world-building ray must not stand in for an interior collider.
Do not expose procedural gallery geometry as a real building's internal layout.

Focused selection:

```sh
node scripts/test_capital_campaign.mjs
node scripts/test_capital_campaign_resolution.mjs
node scripts/test_capital_campaign_retry_checkpoints.mjs
node scripts/test_capital_retry_controller.mjs
node scripts/test_capital_stealth_retry.mjs
node scripts/test_capital_gallery_contract.mjs
node scripts/test_capital_escape_objectives.mjs
node scripts/test_capital_escape_navigation.mjs
node scripts/test_capital_mission_hud.mjs
```

For a broad campaign change, inspect and run the source-domain audit:

```sh
node scripts/test_capital_campaign_playability.mjs --output "$CAPITAL_EVIDENCE/campaign-domain.json"
```

Its fixture builds real owner chains and uses explicitly placed travel/police
setup. A `DOMAIN_PASS` does not establish natural driving, survival, readability,
completion difficulty or a native win. Keep every reported hold. Historical
chapter counts in old audit JSON are not expected counts for new definitions.

## NPC, room, combat and vehicle regressions

Storefronts, rendered doors, room plans, people and action contexts must agree.
Use active-plan IDs and live adult callbacks, not caller assertions that a
person was threatened, hit or killed. Dead, distant, hidden or wrong-room adults
cannot authorize a handover. Refresh external body/vehicle contacts in the
controller's intended order before movement and shot queries.

Hero changes preserve each hero's actual checkpoint, health, ammo and owned car.
Live ally exchange must retain the same adults and their health/cooldowns on the
next ordinary tick. Checked companion catch-up is distinct from teleporting the
player, reviving a downed ally or moving crew when only the mission target changes.
Passengers, seated adults and vehicle occupants need explicit own-body exemptions
for foot probes; those exemptions must not disable car collision with people.

Heists, optional hostage standoffs, vault/case activities and paid shifts have
separate owners. Test their matching room/station/session, finite clocks,
release/cancel/recovery and single consumption. A timed standoff cannot make
police blind or authorize extra money. Railroad and exterior/interior contexts
remain distinct. Use the current rules and exact existing IDs in assertions.

```sh
node scripts/test_capital_protagonist_state.mjs
node scripts/test_capital_character_switching.mjs
node scripts/test_capital_campaign_scenes.mjs
node scripts/test_capital_crew_interiors.mjs
node scripts/test_capital_adult_shot_targets.mjs
node scripts/test_capital_dynamic_shot_cover.mjs
node scripts/test_capital_police_rooms.mjs
node scripts/test_capital_heist_activities.mjs
node scripts/test_capital_hostage_activities.mjs
node scripts/test_capital_heist_interiors.mjs
node scripts/test_capital_house_controller.mjs
node scripts/test_capital_burglary_session.mjs
node scripts/test_capital_delivery_transactions.mjs
```

For a shot fix, test vertical origin/direction, same-floor/room cover, body
identity and actual damage events. For movement, test full rotated vehicle
bodies, continuous turns/translations, corners, existing-contact escape,
external body refresh, bridge levels and bounded local query work.

## The verification ladder

1. Inspect changed owners/callers and run `node --check` on each touched JS/MJS.
   Parse changed Python without writing bytecode if only syntax is needed.
2. Run the smallest meaningful suites above or locate others with
   `rg --files scripts | rg 'test_capital_<topic>'`. Read their setup and evidence
   limits. Fix a stale fixture only when current and retained source establish
   the intended behavior; do not remove a real guard to satisfy old wording.
3. Run `git diff --check`. Audit new imports/loads for local closure. If behavior
   crosses the controller boundary, run its focused adapter test as well.
4. Once runtime edits settle, the integration owner regenerates/checks the
   cache and runs the bounded authored whole-game source gate if warranted.
   `--dry-run` lists commands without running suites or regenerating anything.
5. Use one relevant normal-input browser pass when requested or needed for a
   substantial visual/integration change. Use a fresh external evidence folder,
   keep failures and screenshots, and distinguish fixtures from earned progress.

Do not run multiple full-map gates, benchmarks or browsers simultaneously on a
shared constrained machine. Avoid a new test framework, package setup or a
whole-fleet run for a narrow local edit.

## Cache, version and release handoff

`build_capital_cache.py --write` regenerates the hashed local asset closure and
stamps the game HTML and worker build IDs. `cache-manifest.js` is generated;
never edit its entries or version manually. Run once after final runtime edits:

```sh
python3 -B scripts/build_capital_cache.py --write
python3 -B scripts/build_capital_cache.py --check
python3 -B scripts/test_capital_cache_manifest.py
node scripts/test_capital_cache.mjs
```

These commands are an integration step, not part of documentation edits or each
worker's feature patch. The worker/client must verify hashes, detect mixed
builds, reuse unchanged files safely and retain the game's scoped update rules.
Do not force `skipWaiting`, broaden worker scope, clear unrelated caches or erase
career progress. Warm cache, cold boot and a live session continuing during an
update are different scenarios.

Check `python3 -B scripts/test_capital_cache_browser.py --help` before a requested
native cache pass; the harness may be changing with the controller. The main
runner's browser flows require `--browser --output` with an external directory.
All browser/CPU-profile commands here are recipes, never claims of execution.

After source commits, the assigned integration owner reconciles the game manual
and inventory, then runs `python3 -B scripts/check_maintenance_docs.py`. Report
exact source revisions, owned files, verification outcomes, artifact locations
and holds. Check the runtime catalog and actual hosting configuration separately
when publication is in scope; merged files do not automatically add a portal
listing or prove that the intended host deployed them. Follow current explicit
release authorization rather than a historical source record's old push order.

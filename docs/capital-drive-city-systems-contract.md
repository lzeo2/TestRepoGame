# Capital Drive: city systems continuation

16 November 2026, Australia/Sydney. Continuation of the existing original game 245.
This changes no other game, catalogue registration, shared vehicle model, remote
runtime dependency or source map download. The [maintenance manual](maintenance/games/245-capital-drive.md)
and [verification receipt](verification/capital-drive-city-systems-2026-11-16.md)
separate source checks, native input and software-renderer measurements.

## Crime, vehicles and pursuit

Gameplay retains the only offence authority. Accumulated pressure thresholds are
1/4/9/16/25; an explicitly serious offence can establish its existing minimum.
Ordinary reports no longer add a star each time. Sightings refresh pursuit,
without manufacturing another crime. Pressure clears when pursuit or recovery
clears wanted; a partially decayed star is not immediately restored by old pressure.

The police owner supports at most six ground officers. Five stars uses stronger
SWAT officers. At four or five stars, at most two of the six patrol slots can form
a temporary roadblock at a checked clear placement at least150 m ahead. Placement
has a30second interval and a20second lifetime. It does not add an unbounded pool
or teleport the player. Roadblocks share real car collision and can be fought.
A police drone at three stars and a helicopter from four stars provide spotting,
not air gunfire. The two craft use throttled sight checks and existing supplied dt.

`security-cameras.js` owns at most six fictional camera locations on mapped shop
frontages. These are game placements, not a record of actual Canberra CCTV.
Its70 degree / 40 m sight cone checks physical cover at0.4 second intervals. Fresh
attributed attacks or hold-ups can trigger a report; already reported crimes
do not add pressure twice. Ordinary walking is not an offence. Wanted sightings
refresh the search. A shot can disable a camera while leaving its housing visible.

Shots select the nearest body or car hull, then dispatch to that live owner:
player/patrol Gameplay, traffic/parked Simulation, bus or Yoober service. Shotgun
pellets cannot debit the same car repeatedly for one trigger. Grenades use the
closest rotated hull point, physical cover and one event receipt. Wrecks stop,
retain collision and remain visible; the police wreck pool is bounded to six.
Offscreen successfully relocated ambient traffic can receive a new intact car.
Cars have health; this does not add deformation to every ambient vehicle.

Street civilian gunfire and grenade casualties remain down in the bounded live pool;
melee knockouts retain their existing recovery behavior. Casualties are not
serialized as permanent city history. Grenades produce a supplied-time burst and
optional bounded synthesized sound, with no downloaded audio or new clock.

## Surface ownership

Source-tagged bridge roads and connected abutments own their estimated decks.
Ground roads beneath them retain terrain height. Road rendering, traffic/player
poses, vehicle occupants, navigation arrows and bullet hulls use that same
road-aware support. Prepared bridge slabs retain physical shot cover above the
ground. Nearby vehicle interaction rejects vertically separated hull intervals;
legacy flat callers keep their prior behavior. This is bounded vehicle-level
support, not a general multi-floor pedestrian physics engine.

The pinned elevated Centre outline over Bunda uses one shared decomposition:
ground side pieces plus the upper mass above a4.8 m passage. Walking, cars,
rendering and shots use the same opening. Other building outlines stay solid.
No source polygon, footprint attribution or road coordinates are rewritten.

## Safehouses, stashes and crew

Phone → Safehouses lists up to eight actual rendered house doors. The original
two IDs, their order and their $15,000/$25,000 prices remain unchanged. Six added
offers prefer source-tagged Red Hill, Narrabundah, Barton, Kingston and Griffith
houses, then use the farthest remaining doors to spread access across the map.
The base-map selection also includes Yarralumla; a Civic house is not invented.
Added prices range from $22,000 to $42,000. Selection reads existing descriptors
without generating room plans. Buying requires a healthy player on foot within
3 m of the actual door with a clear approach. Ownership and stashes share the
existing strict v1 career writer. Owned houses and Milo's bound room are
safehouses; ordinary interiors still admit police.

Inside an owned safehouse, the phone transfers weapons, ammunition and loot cash.
The owners validate exact room, player context, ownership, integer amounts and
caps before synchronous inventory mutation. Cash and each ammunition unit are
conserved. Storing an equipped weapon unarms it; withdrawing one grants no
starter ammunition. Optional fields preserve old career saves.

The actual bed in an owned or story safehouse offers paid rest when injured.
Release the activity keys, then hold X through its three-second cue. The house
controller matches the live room, nearby bed, completed activity and fresh session
before Progression consumes one frozen receipt, charges $80 and returns a full
heal to Gameplay. A click, passive wait, remote room or repeated receipt cannot
heal or charge. Leaving or interrupting the task grants nothing. Free roam and
mission previews cannot bank paid rest.

A separate strict ammunition profile for Street Life and each of the three
heroes is saved with progression. It can capture inventory during wanted states
or missions without saving an unsafe body checkpoint. Resuming or switching
restores those exact pools after checked placement. Free roam and mission
previews cannot write them. Legacy careers initialize once from their existing
checkpoint or starter grant. This avoids duplicating stashed ammunition on reload.

Phone → Hire crew offers River for$1,200 and Stone for$1,800. At most two hires
coexist with two mission companions. Health, appearance and identity remain
authoritative. Living crew use checked door entry and the active room's bounded
navigation, car seat limits and existing combat owner. Current hired health is
saved; reloading does not resurrect a dead hire. A paid renewal issues one fresh
token. A pending renewal cannot be bought again while the menu pauses the world.

Indoor officer navigation retains six owner fields per room, matching the new
six-officer cap. The active room plus occupied officer rooms can retain at most
seven contexts. Increasing four to six fields costs at most112 KB across those
contexts. Crew has a separate single-room context. Furniture and walls still
govern the physical routes; no pathfinding bypass grants movement.

## House break-ins and source footprints

An unowned house door starts a six-cue X/Y/Up lock challenge with E. Moving away,
recovery, mode changes, jobs or active missions cancel or deny the attempt. Owned
safehouses remain directly accessible. Success issues one physically rechecked
entry permit, enters the real room and reports the alarm through the existing
police owner. It never grants an arbitrary house teleport.

Q at a house's visible valuables stations starts actual supplied-time search
sequences. Matching completed room/station/session receipts stage carried loot;
searching indoors pays nothing. After the player physically leaves through the
captured door, the burglary owner verifies a healthy exterior on-foot pose within
4 m. Progression consumes one frozen exited receipt for one to eight valuables.
Each contributes the house's deterministic $200–600 base value, capped at $1,200
for the whole exit. A saved 300-second per-house cooldown begins on payment.
At most 64 live cooldowns are stored; full wallets, remote/indoor contexts,
owned/story safehouses, invalid counts and repeated receipts cannot pay. Abandoned
carried loot is transient. Burglary retains one pending loot session and bounded
diagnostic events.

Houses now retain the actual source exterior polygon at original scale. Their
floor triangles and outer walls follow it, including angled/concave sides and
negative local bounds. Furniture and visible television/basin details fit inside
the outline. Deterministic internal rooms remain original procedural layouts,
not surveyed real interiors. Milo's safehouse retains its reachable ledger task
instead of the ordinary valuables search. Other shop/public room layouts remain
as before. Player, adult, crew, police navigation and room bullet boundaries
share the physical footprint. The navigation grid remains capped at2000 nodes;
small footprint houses use finer cells to retain physically clear narrow gaps.

## Player drone, headlights and time

An equipment dealer sells the player drone for$900. Launch from Phone outside
on foot; Free roam permits practice. WASD moves, Space rises, Shift lowers and
O recalls. Its90 second battery,150 m body tether and3–45 m altitude are bounded.
The original body stays vulnerable; world/police time continues. Camera travel
cannot complete recon, missions, jobs or shop reach. One pooled view and the
controller's existing loop handle presentation. It has no weapons.

N toggles player-car headlights; automatic lights use evening/night hours. L
remains the hero power. The headlights use two pooled draws and additive ground
art, with no real-time light/shadow work. The day/night cycle is48 minutes instead
of6; weather retains its separate120second transition behavior.

Two appended shared chapters, Closing time and Terminal transfer, follow the
existing four recon chapters. They bind actual robbery/evidence/car-theft/escape
owners and travel through the source road network. The campaign now has22missions:
six introductions, the meeting and fifteen shared chapters. Old save prefixes
remain valid. Native playability, human difficulty and police survival require
separate evidence from domain-chain fixtures.

## Physical food and weapon orders

Phone → Food & weapon deliveries dispatches one transient courier van on the
existing directed public-road graph. Food comes from the actual mapped food
service catalogue; weapons come from the three fictional street dealers and
respect each dealer's stock and price multiplier. Orders require a healthy player
outside on foot, compatible activity state and enough career cash. Prices include
$50 delivery. Wanted stars alone do not prevent ordering or collection.

Progression quotes the catalogue price, matches the live physical order identity
and debits one escrow payment. The courier owns road travel, collision, damage,
arrival and stopped handover; it cannot grant money or equipment. Walk beside the
stopped van and press E. Only its fresh frozen completed event can grant the
purchased healing or weapon/starter ammunition through the existing owners.
Failure, cancellation, recovery and mode resets refund that escrow once.

The van and pending order are transient. While an order is pending, the existing
v1 serializer includes the escrow in saved cash, so reload refunds an abandoned
order without restoring a van or granting its item. Successful handover saves the
actual charge and updated inventory. No remote storefront purchase is used to
bypass counter reach, and no new career-save version is introduced.

## Distinct paid delivery work

All four new jobs use real ordered pickup/handover markers, legal healthy vehicles
and contiguous stopped holds; long caller frames cannot skip the holds. Existing
job IDs, prerequisites, rewards and arrival rules remain unchanged. Ordinary paid
jobs permit zero through five wanted stars while police continue pursuit. Explicit
escape objectives still require clearing the real search.

- Lunch delivery round has two handovers. Freshness begins at pickup and falls
  by 0.2 percentage points per carried second, with a 60% floor. The final integer
  payment ranges from $372 to $620. Waiting before pickup cannot spoil food;
  repairs cannot restore freshness.
- Inner south document courier retains its fixed $780 fee for three ordered
  stops after Crescent parcel.
- Urgent medical supplies keeps its 100-second deadline and $900 reward. Loading
  and handover require at least 60% vehicle condition. More than 15 cumulative
  health loss after loading ruins the supplies.
- Workshop equipment delivery pays $700 after delivery and empty-case return.
  At least 25 cumulative health loss breaks the cargo. Repairing the car never
  removes recorded cargo damage.

Medical and equipment cargo bind the actual physical vehicle key after loading;
a same-model replacement cannot substitute for it. Cargo state, active reward and
stop progress are transient and pause with the supplied simulation clock. Cargo
failures, timeouts, respawn and cancellation grant no completion or reward. Job
instructions and live freshness/damage appear in the existing work interface.

The focused checks are `test_capital_jobs_rest.mjs`, `test_capital_job_cargo.mjs`,
`test_capital_delivery_transactions.mjs`, `test_capital_safehouse_commerce.mjs`
and `test_capital_burglary_economy.mjs` under `scripts/`. Their owner/adapter
fixtures establish state and transaction rules, not natural travel, native
collection, human difficulty or N100 performance.

## Repeatable work

Run the source gate after final runtime edits and regenerate its cache closure:

```sh
python3 -B scripts/build_capital_cache.py --write
python3 -B scripts/check_capital_drive.py
python3 -B scripts/test_capital_city_browser.py --scenario city --capture --output <fresh-external-output>
python3 -B scripts/test_capital_city_browser.py --scenario workplace --capture --output <different-fresh-external-output>
```

The native city fixture explicitly seeds unearned prior wealth/equipment. It
must purchase the house through the real UI, enter through its door and test
transfers and reload. The workplace fixture walks the real Bunda approach; no
teleport fallback may conceal an obstruction. Retain failures and explain fixes.
For other-area CPU evidence, run `profile_capital_areas.py --root <exact-export>
--scenario exteriors|interiors --output <fresh-external-output>`. Official map
arrivals control streaming; they are not natural driving. Run only one heavy
browser, full source gate or benchmark at a time. Record source hashes and actual
profile duration. Cloud SwiftShader results do not establish Intel N100 FPS.

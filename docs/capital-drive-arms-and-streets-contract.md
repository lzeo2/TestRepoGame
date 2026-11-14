# Arms contacts, street routines and parking clearance

14 November 2026, Australia/Sydney. Continuing existing Capital Drive245 under
the owner's push/merge-all order. No new game/catalog entry, real criminal person
or dealer location, installed package, source-geography rewrite or remote runtime
request. Source roads locate original fictional adult contacts; this is not a
claim about real people, businesses or illicit sales in Canberra.

## State owners and controls

`weapons.js` is the shared original arcade catalogue. Pistol, pump shotgun,
compact SMG and patrol carbine have different magazine/reserve limits, fire/reload
intervals, ranges, damage and bounded spread/pellet behavior. These are game
balance values, not real firearm specifications. Gameplay owns independent ammo
pools, current aliases, aim/fire/reload and clipped hits. Each pellet is clipped
against walls before targets are queried; police damage and offence emission are
bounded per trigger. Switching cannot refill ammo or evade a running reload.

Keys1–5 select fists/pistol/shotgun/SMG/carbine; R reloads, right mouse aims and
left fires. Touch cycles available weapons. Free roam unlocks all four and keeps
career money untouched. Street Life/Campaign ownership is validated through
Progression. Active-session ammo pools are independent; ownership persists, while
ammo resets to the existing starter-ammo behavior when restarting the mode.

Progression keeps strict legacy-compatible v1 equipment booleans. Old pistol-only
saves round-trip; optional known new weapon IDs are accepted, unknown/type-invalid
fields are rejected. Purchases and ammo use one existing wallet, with duplicate,
stock, cash, cap, on-foot, recovery, wanted, proximity and sight guards. The legacy
pistol shop reserve ceiling remains120, separate from its existing240 gameplay
addAmmo cap. Other stock uses catalogue caps. Any equipped owned firearm may
threaten a till, checked throughout the timed action. No separate save writer.

| Weapon | Price | Ammo pack | Pack price | Magazine |
| --- | --- | --- | --- | --- |
| Pistol | $450 | 24 | $60 | 12 |
| Pump shotgun | $900 | 12 | $90 | 6 |
| Compact SMG | $1,600 | 60 | $140 | 30 |
| Patrol carbine | $2,800 | 48 | $180 | 24 |

Dealer stock/multipliers can vary; whole-dollar costs are rounded upward from
the shared profiles. The shop adapter shows actual cost and disabled reasons.
K filters shops/contacts by type, Route leads to their public approach, and E
beside a contact opens its stock. No purchase is allowed from Free roam. Owned,
full-pack capacity, insufficient funds, wanted, distance and interrupted activity
have explicit feedback; disabled buttons use a not-allowed cursor, not a loading
cursor. Current Canalside coordinates remain unchanged because they are clear and
reachable in actual expanded-map physics.

## Fictional contacts and adult behavior

`street-dealers.js` owns three source-road-derived contact descriptors, health,
trade availability, panic, swept body contacts and strike/alert handling. The
controller injects their stock as validated extra services, aggregates ordinary
adult/dealer witnesses and hits, and owns the single loop/input/save path. The
three named contacts near Giles Street, Blackall Street and Bunda Street are
entirely fictional. Their read-only markers/search aliases identify game roles,
not real POIs. Dealer rendering is pooled, culled and uses no textures.

Exterior crowds are reduced from80/160 to36 suburban/64 nearby Civic adults.
Separated safe public sites support coffee/chairs, phones, work gestures and
walking routines. At most six seats and six workers are active. Site selection
excludes water/buildings/restricted paths and supplied known door approaches.
Props are actually rendered; coffee sitters have seats. Gunfire/danger interrupts
routines into running, then adults may return after the area is clear. Assertive
adults may retaliate against a close actual aggressor with sight and cooldown;
others flee. Ambient drivers cannot implicate the player. Firearm pellet hit
cooldowns prevent repeated same-frame victim damage. Paused dt0 freezes routines.

Adult pools use at most11 instance batches; three contacts use six batches and
fewer than1,500 triangles. Four selected gun silhouettes use original merged
geometry, shared hand sockets and bounded trace pools. These adapter limits do
not establish total frame cost, native GPU quality or Intel N100 FPS.

## Traffic defect and correction

The old decorative generator used road.width/2-.8 for curb cars even on7.5m
roads. In the retained merged map,2,065 parked cars physically overlapped public
moving lanes and2,102 lay within predictive braking clearance. A seeded40-car
60-second replay stopped36 cars; queues followed those static decorations.

`parking-layout.js` now places general vehicles beside source-tagged parking
aisles and only genuinely wide compatible curbs. It rejects narrow curb slots,
checks the entire car against public lanes, bounds and physical occupancy, and
keeps source/render/collider descriptors identical. The fictional mission wagon
stays near its old meeting point on clear ground. Source geometry is unchanged;
no traffic collision is ignored and no vehicle teleports to release a queue.

The actual current helper yields887 deterministic physical slots. Independent
whole-body sampling measured at least2.61m clearance from public lanes, with no
mutual overlaps. Same seeded60-second replay:17 stopped instead of36. Some are
legitimately waiting behind the stationary player, and separate turning/junction
or source-building failures remain distinct findings. This is not a claim of
universally free traffic. Existing bus, physical following, dt0 and local spatial
query protections stay in the tests.

A separate small ambient crossing-priority correction prevents the two reproduced
permanent turn/lead cycles. It distinguishes compatible lead headings and yields
before an actual projected conflict; physical sweeps and static/player/bus guards
remain. A fixed-parking actual-map replay improves17/26 stopped at60/120seconds
to7/18. With the new engine held constant, archived parking versus corrected
parking gives31 versus7 stopped at60seconds. The earlier36/17 figures remain
intermediate evidence from the old engine, not contradictory current results.
Source-building and some other traffic holds remain explicit limits.

## Reproduction and ownership

```sh
python3 -B scripts/check_capital_drive.py
python3 -B scripts/check_capital_drive.py --browser --store-browser --output <fresh-career-directory>
python3 -B scripts/check_capital_drive.py --browser --dealers-browser --output <fresh-equipment-directory>
node scripts/test_capital_traffic_queues.mjs
node scripts/test_capital_npc_routines.mjs
python3 -B scripts/check_maintenance_docs.py
python3 -B scripts/generate_sitemap.py --check
```

Root owns catalogue/controller/shop UI/parking helper/documentation/release.
M22 owns gun gameplay/pure tests, M23 economy, M24 contact people/view, M25 actor
art, M26 native QA, M27/M30 traffic reproduction/layout tests and M28 adult
routines. M29/M31 are read-only diagnosis/review. All workers use bounded disjoint
paths and explicit commits with exclusive index windows; none push.

Browser tests use actual normal inputs, temporary localhost servers and detached
observations. A purchase case spends the fresh career's actual starting money;
it does not grant cash or edit a save. Free-roam travel is exercised only in its
own mode. Retain failed runs and their cause. Native input, screenshots, pure
logic tests and hardware FPS are separate evidence; see the dated receipt.


M34's actual-map routine correction is required: simple axis-aligned fixtures
missed rejected diagonal sites. The real-map suite includes4,241known approaches
and verifies seated/work actors and physical props near the spawn, Kingston and
Civic. Native acceptance separately spends actual starting career cash (22checks)
and exercises free equipment/contact/routine graphics (26checks). Do not replace
these with an empty routine capacity or a synthetic-site-only fixture.

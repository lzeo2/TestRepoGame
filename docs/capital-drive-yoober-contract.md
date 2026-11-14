# Yoober, trading and Low graphics

14 November 2026, Australia/Sydney. This extends the existing original Capital
Drive 245. Yoober is an original fictional ride-service parody. No Uber account,
API, logo, real driver, live vehicle position or external runtime request is used.

## Phone rides

T opens the phone. On foot outside, choose a destination under Yoober and request
a ride. A quote uses a clear public-road pickup, a reachable directed route and
a fixed whole-dollar fare. The default Short local ride chooses a nearby reachable
road stop; landmark destinations use estimated public-road approaches rather than
claiming that a car can enter a building or exact private frontage.

One NPC-driven saloon approaches along the actual left-hand road graph. Walk beside
the stopped car and press E to board. Booking costs nothing; boarding charges the
quoted fare exactly once through Progression and the existing career save writer.
Insufficient funds cannot board. Free roam spends no career money. Active work,
interiors, recovery, wanted state or a Lemon hire prevents booking.

The car physically follows its directed route using the same canOccupy/moveVehicle
guards as other external vehicles. It stops for physical obstacles. There is no
Street Life teleport or collision bypass. The player is attached to the live car,
with a visible driver and passenger and a vehicle chase/orbit camera; foot movement,
jump, attacks and ordinary vehicle claims are excluded while aboard. Arrive, then
press E to step out into a swept clear local position. E during movement requests
a stop first. T also offers End ride safely. Cancellation before boarding is free;
after boarding it does not refund the fixed fare. A blocked pickup times out;
a blocked journey stops safely instead of jumping past the obstruction.

Only one booking exists at a time. Completed, cancelled and failed bookings release
the busy guard. The stopped car remains physical for three active seconds after
exit. Pause stops all clocks. Mode restart, Free-roam teleport/recovery and medical
respawn clear the transient service. Active bookings are not saved across reload.

## Driver fares

T's Drive for Yoober section and J's ordinary job list expose repeatable fares.
Use an owned, unstored, legal four-door saloon/wagon/SUV/tourer at least 50% healthy.
The starter Lantern qualifies. Utes, unknown/stolen cars, wanted state, Free roam,
recovery and overlapping work do not qualify. Stop below 0.8 m/s within 10 m of each
marker continuously for two seconds to pick up and drop off the passenger.

- Yoober Crescent local fare: sourced NSW Crescent vertices, about 40 m between
  pickup/drop, 120 seconds, $45. Pickup is about 11.36 m from the original spawn.
- Yoober Franklin fare: existing sourced Franklin Street vertices, 180 seconds, $110.

The waiting adult is placed on a clear source-road curb approach; the driving
marker remains in the road. The adult becomes a visible seated passenger at pickup.
The booked model binds at pickup. Leaving it, switching models, crime, recovery
or timeout interrupts the fare without pay. Only actual stopped completion pays;
remaining at the drop-off cannot replay the payment. Existing v1 completed-job
validation accepts the known fare IDs; legacy saves remain valid. Cash remains
capped by the existing wallet. Jobs/passengers are transient; completed IDs and
earned cash use the existing atomic career save.

## Wanted trading

Wanted stars alone no longer block food, weapon or ammo purchases. UI readiness,
the actual purchase authority and contact behaviour agree on this. Existing stock,
cash, ownership, ammo capacity, on-foot reach, sight, matching interior, recovery
and activity rules remain. Actual nearby gunfire, panic or an injured contact can
still interrupt trading. Stars continue to control police pursuit. Gym work,
legitimate jobs, garage service and Yoober still have their own safety rules.

## Performance boundaries

The normal constructor remains available to tests and callers. The game now boots
world/neighbourhood with lowGraphics:true. Low simplifies ordinary window bays,
roof subdivisions, tree crowns/shadows and tertiary garden ornaments; it shortens
detail visibility. The mapped bodies, exact terrain/wall/road/pavement/water
attributes, accepted tree positions, school identity, structural garden boundaries,
driveways and all 4,200 rendered house-door descriptors are retained. Landmark and
physics modules and source JSON are unchanged. Rendering selection changes target
rate/resolution; it does not rebuild city geometry during play. Low's render buffer
is capped at 960×540, down from 1100×650. Standard keeps the existing 1440×900 cap.

The paired actual merged base+north+terrain fixture measured:

| Geometry | Previous | Low |
| --- | ---: | ---: |
| World attribute bytes | 534,265,329 | 286,722,933 |
| World triangles | 8,513,470 | 4,155,544 |
| Neighbourhood attribute bytes | 36,342,540 | 19,630,188 |
| Neighbourhood triangles | 673,010 | 363,522 |
| Spawn world visible draws | 93 | 61 |
| Spawn world visible triangles | 433,881 | 181,728 |

These are Node geometry measurements, not total browser memory, whole-frame draw
counts, or N100 FPS. Source-building/traffic holds from the previous receipt remain.

## Reproduce

Run `python3 -B scripts/check_capital_drive.py` for the 51 modules, 51 pure suites
and diff check (154 commands). The new suites cover physical directed rides,
independent art resource ownership, fare/debit authority and paired Low geometry.
Run `node scripts/test_capital_low_detail.mjs --actual` for the larger actual-map
comparison and exact attribute/door/structural preservation checks.

The native phone flows use scripts/test_capital_yoober_browser.py with --scenario
passenger or driver, --capture and a fresh external --output directory. The common
runner's --browser --yoober-browser --output executes both under its 600 second
process-group watchdog. Normal controls/read-only observations prove live play;
never grant money, overwrite saves, teleport a career or replace real clocks.
Retain failed attempts and their causes. The dated verification receipt records
actual acceptance and hardware limits separately.

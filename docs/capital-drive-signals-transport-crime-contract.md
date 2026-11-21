# Signals, navigation, transport and hold-ups

14 November 2026, Australia/Sydney. This extends the existing original Capital
Drive 245. Source road/building/terrain data and shared vehicle artwork remain
unchanged. New traffic-signal positions are sourced; phases, stop bars, pole
offsets, transport services, characters and crime systems are game interpretations.

## Driving and collisions

A saved wrecked Lantern previously restarted at zero condition and the controller
continually applied its disabled-car brake. On an explicit new Street Life or
Campaign start, the starter alone receives roadside assistance to 35% if wrecked.
Working condition/paint/cash/completed jobs and other stored wrecks remain intact.
The repair is announced and saved normally; corrupt/denied saves remain unwritten.
The mapped spawn itself was physically clear before this change.

Vehicle collision dimensions now use the local fleet data with a small body
margin, tested against all six factory models. Explicit external dimensions still
govern buses and patrol/ride descriptors. The Yoober Lantern descriptor is updated
too. Walking uses swept circles against oriented full vehicle boxes, including
their ends/corners. Parked indexing covers rotated full bodies, with bounded local
queries. Driving checks translation and angular steps; both traffic and player
steering must retain clear bodies. Inactive claimed descriptors do not block.

Ambient traffic admission caches static whole-lane feasibility before spawn,
refresh and route choice. Building, fence and water conflicts are avoided without
changing their colliders or the player's source graph. Opposing clear lanes do
not incorrectly queue behind each other; crossing yields cap actual displacement.
Cars still stop for occupied lanes, real queues and signals. The game does not
teleport visible vehicles, ignore collision or promise congestion-free streets.

## Functional traffic signals

`data/traffic-signals.json` contains 339 exact OSM nodes, rebuilt from 34 existing
pinned south/north source tiles. It records source IDs, raw tags/coordinates,
projected coordinates, source URLs/hashes and unchanged base/north map hashes.
The builder is `scripts/build_capital_signals.py`; its `--help` describes explicit
external cache/output inputs. No raw cache or new runtime external request is used.
OpenStreetMap contributors, ODbL 1.0, remain credited.

347 approach heads form 96 estimated junction groups. One heading receives green
at a time: 24 seconds green, 3 amber, 4 all-red per heading. An isolated crossing
has a red hold phase. These are playable estimates, not actual ACT controller
timings or surveyed stop bars. Existing vehicle yielding/collision remains needed
for occupied junctions. Traffic, Yoober and buses query the same stop owner, brake
and cap actual travel before a red/amber stop line. Vehicles already committed
clear the crossing. The player's car remains under player control.

The simulation owns the only signal clock and reset. Indexed edge queries and a
64 m spatial index serve external buses/rides. The view shows the nearest 96 heads
within 350 m using at most five pooled draws, three geometries and five materials.
It adds no point lights, textures, independent clock or remote asset.

## GPS and live Yoober tracking

Choose a map destination and Set route. A yellow map/minimap turn arrow and HUD
show the next left/right/U-turn, continuation or destination, plus metres/kilometres
along the directed route. Dense gentle bends are filtered; compact changes are
combined. Progress/arrival is spatial, not timed, and repeated route assignments
preserve progress. No surveyed lane guidance or roundabout exit number is invented.

T → Yoober → Track driver opens live map following. A purple car marker shows the
actual vehicle; the minimap also points toward it when offscreen. The distance
uses remaining route segments and ETA is explicitly approximate. During live
follow the world advances while player input is held clear/braked. Ordinary map
and other dialogs still pause. Dragging/zooming/Find my car exits live follow;
Follow Yoober live resumes it. Hidden tabs stop clocks. This adds no Street Life
teleport or fare/progression shortcut.

The ride driver follows a continuous short lookahead rather than braking to zero
at each OSM vertex, while retaining careful corners, physical obstacles and lights.
Nearby user cancellation can sometimes provoke one fictional driver to step out
through a clear stopped exit and approach for a short non-graphic fight. Remote,
sandbox, recovery and mode cancellations do not provoke it. The adult uses bounded
damage/cooldown, sight, swept body contact and existing combat/witness owners;
the cancellation alone does not manufacture a player offence. The actor shares
the existing small adult batches and disappears/returns after bounded active time.

## Riding buses

Approach a bus's front-left door and press E within 10 m to request a stop.
Walk beside its stopped, clear door and E boards. While aboard, E requests braking;
press E again when stopped to leave through a swept clear exit. Busy activities,
interiors/recovery and another active ride prevent boarding. Model clocks and
collision remain active; no instant bus/player movement is used.

These two fictional circuits follow the mapped road graph; they are not actual
Transport Canberra routes or timetables. Rides are free gameplay, with no career
wallet change. The player has a visible seated passenger and chase/orbit camera;
there is no new interior-camera toggle. Foot movement/combat/garage/rentals/jobs
are excluded while aboard. Mode/recovery/Free-roam travel clears the attachment.
The view adds at most one passenger draw to the existing four bus draws.

## Equipment

Arms shops and the three fictional contacts sell a $500 police scanner and packs
of three flares for $120, with inventory capped at 12. Equipment shares the actual
purchase guards and wallet; wanted stars alone do not prevent buying. Strict
optional saved `gear` accepts only scanner boolean/flares integer; legacy v1 saves
remain valid and unknown/type-invalid data is rejected.

The scanner reveals nearby NPC patrol map markers within 1,200 m, including through
occluding buildings. Without it, police markers need wanted state, sight and 130 m
proximity. B on foot places a flare on a checked clear short throw ahead. Failed
placement does not consume one. At most three 20-active-second beacons exist;
they mark the map and render pooled lightless smoke/glow in four draws. Free roam
permits a no-cost preview and never writes career inventory. Beacons are transient.

## Employee hold-ups and mugging

Outside, equip an owned firearm or actually punch a living pedestrian, then E
nearby demands valuables. Inside a mapped shop, do the same to its actual living
cashier/shopkeeper/cook and E demands the till; K's Rob till action is also a
deliberate demand. F faces the looked-at direction for melee. Equipping a gun alone
does not automatically start a crime. Empty hands without a recent actual punch
do not authorize one. Threat flags expire after 12 active seconds.

Employee hold-ups require the matching loaded store/room and the actual employee
and counter within 4 m, with sight; behind-counter punch approaches work. Ordinary
purchases retain their stricter counter bubble. The employee raises hands, empties
the till and hands over a bag across five active seconds. Mugging binds one exterior
pedestrian within 2.6 m, uses four seconds and pays a modest deterministic $30–$100.
Only the bound target complies; other adults keep their own reactions.

E cancels an active hold-up. Death, lost threat, leaving, obstructed sight, recovery,
respawn or sandbox mode interrupts without pay. Live target callbacks are re-read;
callers cannot grant target facts. Completion pays once through the existing capped
wallet/save writer and applies a saved 180-second till/victim cooldown. Strict
optional `muggingCooldowns` accepts only known `ped:0`–`ped:159` IDs and bounded times.
No NPC view grants cash. Actual assault/hold-up witness events feed ordinary police
rules. Gameplay remains fictional and non-graphic.

## Verification and limits

Run `python3 -B scripts/check_capital_drive.py`: 57 modules, 65 pure suites and diff
check, 188 commands. New regressions retain old failing rotation, lane, yield and
contact fixtures; audit actual geometry and 7,200 simulation frames; test source
rebuilds, phases, navigation, transport, cash/save guards and pooled resources.

`--browser --signals-browser --output <fresh-external-directory>` runs the native
tracking/GPS/signals/transport/flare harness under the existing 600-second watchdog.
Its individual scenarios can be bounded separately. The crime harness separately
uses normal Street Life inputs; no position, wallet or save grants count as play.
The dated receipt records actual passes, retained failures and unexercised limits.
Cloud software WebGL, geometry counts and simulation seconds do not establish
N100/native-GPU frame rate, total RAM or touch acceptance.

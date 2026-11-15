# Capital Drive: indoor pursuit, driving starts and mission previews

15 November 2026, continuation after PR24. This changes existing game245 only.
The [story contract](capital-drive-story-and-streaming-contract.md),
[download/CPU contract](capital-drive-cache-and-performance-contract.md) and
[maintenance manual](maintenance/games/245-capital-drive.md) retain the existing
state owners. [Fresh verification](verification/capital-drive-indoor-pursuit-2026-11-15.md)
separates native input from source fixtures and hardware limits.

## Pursuit through real game doors

`police.js` still owns at most four patrols. The controller supplies its actual
entered room through `police-rooms.js`; Gameplay forwards that context without
creating another police clock. Officers need witnessed entry or a reported
indoor offence to discover a room. Merely entering an unseen building does not
give police its location.

Cars use the directed public-road graph towards the captured exterior doorway.
At a known ordinary-room approach, a patrol which arrives or stalls within90m
may dismount and walk. This permits the real Telopea gate-to-door distance; it
does not place a car or officer inside remotely. The school approach follows
`telopea-gate-11` from outside, through its opening, then to the same rendered
school door. Swept clearance and line of sight govern waypoint shortcuts.
Other outdoor pursuit retains its ordinary driving/foot choice.

An officer must physically reach within1.4m of the exterior doorway, with clear
landing and adult separation, before transitioning through it. Inside, its
`interiorId` identifies the logical room. Movement, sight, arrest, player shots,
police shots and allied damage require matching spaces. Officers cannot fire
through an exterior/room boundary simply because generated coordinates overlap.
On player exit, an indoor officer walks to the retained room exit and leaves
before resuming outdoor tactics. Outdoor crew members can still cover the street.

Only the resolved Milo safehouse room is protected. Other houses, shops, gyms,
the school and Centre remain ordinary rooms. Police may search/wait outside the
safehouse; entering it does not erase wanted stars. Protection is based on its
actual bound room ID, not all houses or a displayed name.

## Bounded room navigation and rendering

`interior-navigation.js` extracts the existing plan-bound wall/furniture collider
used by player movement. Pursuers retain that same geometry after the rendered
room is unloaded. Swept0.45m actor clearance, doorway anchors and no diagonal
corner cuts govern paths. Navigation is lazy, limited to2000nodes and four
owner fields per room. Ordinary spacing is0.75m; the large Centre uses2.25m with
explicit0.75m door anchors. These are local generated-room paths, not a whole-city
pedestrian navigation system.

`police-rooms.js` retains only the active room and rooms occupied by live
pursuers, at most five contexts. Pruning drops unoccupied old rooms. Mode/reset/
recovery cleanup releases all contexts. No distant interior meshes or population
are created. The active player also collides with visible officers.

The indoor `actor-view.js` pool uses `policeCars:false`: up to four articulated
officers, weapons and brief effects, without cloned patrol cars or car lights.
The normal outdoor pool retains parked patrol cars and excludes indoor bodies.
Only traces belonging to the active room are shown. Views own no damage, clocks
or rewards. Read-only snapshots expose room/navigation and indoor actor counts.

## Milo's car and work while wanted

A first visit to Milo now begins driving the existing Lantern Saloon. It does
not grant another car, ownership or cash; previously captured hero checkpoints
keep their chosen state. Touch grass retains the real home packing action,
followed by a short exit, a stopped driving stage at Coals and its actual stock
shift. Signed for retains foot pickup/handover with the middle leg driven.
The phone's Route to my car points to the actual parked player-car pose while
outside on foot. Entering returns guidance to the active job/mission target.

Ordinary deliveries/checkpoints, vehicle jobs, paid stock/noodle tasks and owned
legal Yoober driver fares can start, continue and pay at zero through five wanted
stars. Police continue pursuing. Explicit escape/clear-search objectives still
require zero wanted. Gym, garage, rental and passenger-hire restrictions remain
their own rules. Actual room/station/session, ownership, health, mode, recovery,
reach, sight, timer and once-only reward validation remain. Wanted stars alone
are no longer a blanket work denial. Protected job inputs still disable attacks.

## Direct stored map reads

After the active scoped worker confirms its revision and exact six allowlisted
map keys, `game-data.js` reads their verified Responses directly from CacheStorage.
A warm boot therefore need not issue page map-fetch requests. The descriptor is
provided only to a same-game controlled client and names the active revision;
the page does not combine its maps with a newly installing worker.

The combined descriptor/read attempt is limited to750ms. Missing responses,
denied storage, an unsupported old worker or an unavailable controller fall back
to all six ordinary local fetches. First boot still loads its maps normally.
The helper creates no cache and changes no career storage. Manifest installation,
hash verification, update waiting and old-scope cleanup remain worker-owned.
Map parsing, indexes and scene reconstruction still run on a new document.

## Optional developer mission selector

The existing collapsed Pause developer form accepts a separately configured
masked entry to reveal all thirteen missions for that session. The configured
input is excluded from game help, public reports and repository files; the
runtime contains a SHA256 matcher. This is a convenience in an offline client,
not an authentication boundary. Inputs clear before any picker or evidence capture.

`campaign.startDeveloper` admits a transient preview of the chosen chapter with
its real character, objectives and timers. It does not rewrite selected-career
character, unlock prefixes or completed chapters. Campaign rewards are zero.
`current()` supplies the real preview chapter to the HUD, even when it is absent
from the original hero's normal chapter list. Normal mission admission remains
unchanged. Preview completion, cancellation or failure restores the captured
mode, character, physical pose, car, health and ammunition through checked
placement. The sole career writer preserves the original campaign/checkpoints
while a preview is active. Ordinary repeatable work still follows its own wage
owner; zero campaign reward is not a promise that all activities are unpaid.
If live bodies block the bounded return candidates, the original snapshot is
retained. Pause > Developer offers Retry return; failed placement is not retried
every frame, and another preview, mission, hero or mode cannot overwrite it.

## Reproduce

```sh
node scripts/test_capital_police.mjs
node scripts/test_capital_gameplay.mjs
node scripts/test_capital_police_rooms.mjs
node scripts/test_capital_interior_navigation.mjs
node scripts/test_capital_actors.mjs
node scripts/test_capital_campaign.mjs
node scripts/test_capital_character_switching.mjs
node scripts/test_capital_work_jobs.mjs
node scripts/test_capital_progression.mjs
node scripts/test_capital_interior_activities.mjs
node scripts/test_capital_yoober_economy.mjs
node scripts/test_capital_game_data.mjs
node scripts/test_capital_cache.mjs
node scripts/test_capital_dev_missions.mjs
node scripts/test_capital_mission_hud.mjs
python3 -B scripts/build_capital_cache.py --check
python3 -B scripts/check_capital_drive.py
timeout 240s python3 -B scripts/test_capital_indoor_police_browser.py --scenario police --capture --output <fresh-external-police-directory>
timeout 120s python3 -B scripts/test_capital_indoor_police_browser.py --scenario milo --capture --output <fresh-external-milo-directory>
timeout 120s python3 -B scripts/test_capital_indoor_police_browser.py --scenario developer --code-file <external-private-code-file> --capture --output <fresh-external-preview-directory>
timeout 300s python3 -B scripts/test_capital_cache_browser.py --scenario native --output <fresh-external-cache-directory>
```

Use a fresh external directory for every native attempt. Do not publish configured
inputs in logs or screenshots. Keep failed approaches and their actual causes.
Native school entry does not establish safehouse exclusion, every room's pursuit,
full mission completion or naturally earned wanted-job wages. Hardware N100/8GB
performance and total memory remain unmeasured. No geography, proprietary imagery,
shared vehicle assets, new dependencies or third-party runtime loads are added.

# Capital Drive crew catch-up verification

15 November 2026. Existing original game245, continued from merged PR25
`81bac1f0c363bbfa83c4724818e263bc8bdc3b9c`. The owner explicitly requested
henchmen teleport to the player. The [story contract](../capital-drive-story-and-streaming-contract.md)
and [manual](../maintenance/games/245-capital-drive.md) record the behavior.
This supersedes the earlier no-teleport companion guideline, without granting
player teleport or changing ordinary career travel/reward rules.

## Change and bounds

`b5c0ee4c` changes the existing `campaign-scenes.js` owner and its regression.
Shared mission crew recruit near the actual player. Living allies over35m away
catch up, including during driving/passenger travel. On foot, an ally over10m
away with less than1m of closing progress over3active seconds may also catch up.
Nearby combat remains in place. Target changes alone cannot teleport the crew.

A shared1.25s retry gate limits both missing initial recruits and later catch-up.
Each of at most two actors tests no more than24local pads, with a maximum outer
radius14m based on nearby road width. Local road queries avoid the carriageway;
the actual vehicle/body/terrain barriers and four short foot sweeps reject unsafe
landings. Doors use an8m metadata index with1.4m exclusion, including all actual
house/shop/gym/school/Centre entry descriptors supplied by the controller.
No shared-mission retry scans or sorts the entire road/door registry.

Relocation retains health, identity, armed state and firing cooldown, while
removing that actor's stale shots/events. A downed retained identity is never
recruited again. Fully blocked fans keep existing positions for a later retry.
Normal nearby walking continues through the same swept colliders. Pause/zero dt,
interior hiding, recovery, mode exit and mission cleanup remain authoritative.
The fixed Kingston story meeting retains its original source-road placement.

`0f146512` passes the actual full interior entry list and explicit passenger
state from the controller, and regenerates the offline manifest. No meshes,
population, second clock, dependency, geography or career-save format is added.

## Source verification

The focused actual-map/Simulation/Three regression passes:

- Both allies for all six shared chapters recruit beside the player on the real
  expanded map, with parked cars/source barriers retained; subsequent actual-map
  travel catches them up independently of the objective.
- A real long-wall fixture exercises stuck catch-up below35m only after actual
  following time. Existing per-step ordinary wall/collision and target-only
  non-teleport assertions remain unchanged.
- Actual parked cars completely block the local fan; positions/health remain
  intact and no search occurs during the next12supplied0.1s ticks. Removing the
  cars permits later safe relocation. The fixture records at most50nearest-road
  queries per attempt for both actors, not a browser-time performance claim.
- Initially unavailable recruits use the same retry gate; supplied public-door
  descriptors are excluded. Adults, water, barriers, cars, player/crew separation,
  driving/passenger states, pause and indoor return retain their guards.
- Injury/death, close combat, firing cooldowns and stale shot removal are tested.
  The existing seven pooled view draws/resources/disposal remain unchanged.

Focused commands are `node --check` for the module and suite,
`node scripts/test_capital_campaign_scenes.mjs`, and `git diff --check`.
External source log `capital-crew-catchup-source.log` SHA256:
`e1585325a213104629168484159ba5332feb25ecda23c64efd87a3b25e1ff568`.
The actual source hash is
`99a07b210ecf5ef235f14c205f7e8e6858a04bc439a2e242b2675e40f773f9f9`;
the expanded suite hash is
`736f942b49009b8596ae43fe1b880bbe89ad205121b4de2bf591e6ed38510b13`.

The final `python3 -B scripts/check_capital_drive.py` run returned
**PASS Capital Drive:265/265 commands passed** at `0f146512`, including the
controller's full entrance list and explicit passenger state. The runner requires
78game modules,92Node suites,12JSON files and187required files total. Both cache
Python checks pass. Maintenance coverage remains140game documents,134registered
entries plus six unregistered projects; catalog and134URL sitemap checks pass.
The external full log is `capital-crew-full-265.log`.

## Offline closure and limits

The manifest has97files/15,648,142bytes, version
`8216803fce7d220366403df3ea03a14dedaa0ee05f16e185ad008a98ef207523`.
The Git-backed game tree stays96files and grows15,465,402→15,469,171bytes
(3769bytes). No game was added or registered; the catalog remains134entries.
The source map, addresses, terrain, shared cars/fonts, protected game and backend
are unchanged. Hash-verified storage and waiting-update behavior remain.

This is source/actual-map and Three adapter evidence, not a new normal-input
native heist, a new visual overhaul, an N100 benchmark or a full-fleet gate.
Crew remain outdoors and do not implicitly board a vehicle or enter a room.
No per-frame whole-city search or new ragdoll/crowd simulation is introduced.

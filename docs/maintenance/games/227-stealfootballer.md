<!-- maintenance-game: Games/StealFootballer -->
# Steal a Footballer maintenance manual

## Identity and status

Catalog 227, **Steal a Footballer for Your Team**, sports, entry
`Games/StealFootballer/index.html`. Owner-requested solo browser adaptation of
private `lzeo2/steal-a-footballer`, revision `30b0c28`. One addition; 118 entries.
On 11 October 2026 the owner stopped all game launching/testing, then requested
a push. This checkpoint follows that explicit exception to the usual full smoke
gate. Do not restart game/browser tests without a new owner instruction.
See [release evidence](../../verification/steal-footballer-web-2026-10-11.md).

## Implementation map

`index.html`, `style.css`, `js/app.js` own entry, menus/input, module integration,
spectator camera, on-screen commentary and synthesized crowd/referee audio.
`js/game.js` owns coins, market, roster, NPC theft, staff, progression and saves.
`js/match.js` owns the 22-player simulation, contacts, play calls, abilities,
offsides, injuries, restarts, substitutions, extra time, penalties and report.
`js/world.js`/`js/actors.js` present state with Three.js; they grant no coins.
`PORT_CONTRACT.md` records interfaces. `data/catalog.json` contains 125 source
identities; `data/world.json` contains 3,095 static primitives, a 261-part stadium
template, 12 plots, a practice rival plot, slots, pitches and NPC positions.
`tools/export-world.luau` is a read-only installed-world exporter; `tests/` retains
detached logic/geometry and browser checks. Tests are currently stopped.

## Gameplay and controls

Start with 150 coins, no automatic grants, 18 roster places and an 11-player XI.
Recruit from the conveyor, eggs or mystery stock; sell/develop players, steal
from NPC rivals and carry them home. Empty positions receive academy loans.
Recruits retain seeded variation, six 8% traits, levels 0 through 5 and five
mutations. Tactics support three formations/approaches and five presets.
WASD/arrows move, E interacts, Space jumps; drag to orbit and scroll to zoom.
Touch joystick/buttons are included but mobile acceptance is incomplete.
Home/pitch teleport is blocked while carrying. Home shields last 25 seconds;
whistle/baton repel NPC thieves. Individual coach assignments pause that player's
income; physio conditions or treats injuries. Managers unlock special plays.
Battles pause club income and include attack/defense calls, superstar abilities,
10-second Icon control with a 20-second cooldown, player/ball spectating,
substitutions, extra time and manual/automatic penalties. Reports include stats
and scaled compensation. Explicit `DEVTEAM` grants the local test squad once,
with no coin grant. Shops, limited events, kits and stadium upgrades are included.

## State and persistence

Game is state owner; UI/renderer consume snapshots. `team(tactics)` previews
unsaved tactics without changing the save. Saved UIDs are HTML-escaped and
market purchases guard expected identity. Kits/save fields are validated.
Key `steal-footballer:v1` has validated backup/damaged-save companions. Progress
belongs to this browser/origin; no cloud, offline coin payout or Roblox wallet
connection. Storage errors leave the session playable with a visible error.
Live matches, carry state and generated market/rivals do not resume on reload.
Rewards freeze permanent pre-match income, exclude temporary boosts, and scale
with the owned XI; forfeits pay zero and retain confirmed injuries. Practice
level increases slightly in the next match after wins by more than three goals,
capped at 3. Events rotate on a 40-minute cycle.

## Dependencies and provenance

Owner's original adaptation, not an open-source ingestion or an invented MIT
game. [CREDITS](../../../Games/StealFootballer/CREDITS.md) records source and terms.
Footballer names identify characters; ratings are fictional balance. World
primitives were exported read-only. Actors are original procedural approximations;
Roblox catalog meshes/clothing/faces are not bundled. Asset IDs are metadata.
Three.js r160 is local with its MIT notice. Local Bungee and Atkinson Hyperlegible
copies retain SIL OFL licenses; see [font evidence](../../portal-font-sources.md).
No new runtime third-party loads, sockets or backend are introduced.

## Audit findings

This is a solo preview with incomplete final browser acceptance. Earlier browser
checks reached purchases/selling, save reload, tactics, kit saving, staff,
stadium upgrade, events, match start, paused income, spectator/zoom, movement and
bench/ability UI. The run stopped before complete-match/debrief and mobile checks.
Final static fixes cover mystery stock, draft formation, UID escaping, idle panel
refresh, kit patterns/name and home labels; no renewed gameplay tests were run.
Known fidelity limits: procedural assets, NPC opponents, a reusable active home
stadium, HUD-only carry/thief/shield feedback and simplified proximity checks.
No claim of exact Roblox physics or complete visual parity.

## Safe iteration

Preserve economy/simulation/presentation boundaries and attribution. Use detached
fixtures, never the owner's live Roblox squad/wallet. Source commits do not save
a Roblox place. Commit explicit paths in this repository; refresh its Git-backed
inventory afterward. Respect the current stop on game launches and testing.

## Verification

Earlier worker regressions passed progression, match contacts/restarts,
practice scaling, injury/scorer identity and renderer geometry/movement/crowd.
These are detached fixtures, not browser, Studio or cloud-save acceptance.
For this push only JavaScript parsing, Python AST parsing, catalog/export/local
asset scans, Git diff and documentation/inventory checks are run. The unchanged
full smoke script was stopped, not passed. Desktop start/base captures are in
release evidence; mobile, complete-match, offline-reload and hardware acceptance
remain unverified. Final patches received syntax/static checks only.

## Future outlook

When testing is authorized again, finish normal-input matches/debriefs, manual
penalties, substitutions, theft/deposit and mobile acceptance; profile real-device
performance. Improve source fidelity before more scope. Network multiplayer and
cloud save require a separately authorized backend design.

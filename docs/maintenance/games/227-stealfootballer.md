<!-- maintenance-game: Games/StealFootballer -->
# Steal a Footballer maintenance manual

## Identity and status

Catalog 227, **Steal a Footballer for Your Team**, sports, entry
`Games/StealFootballer/index.html`. Owner-requested solo browser adaptation of
private `lzeo2/steal-a-footballer`, revision `30b0c28`. Its October registration
added one port to the then-118-entry catalog.
On 11 October 2026 the owner stopped all game launching/testing, then requested
a push. That checkpoint followed an explicit exception to the usual full smoke
gate. On 10 November the owner requested stylized human player models, harder
progression and better finishing/defense, and explicitly authorized playtesting
with low computer impact. Targeted checks resumed under that instruction; no
push or release was requested. See [October release evidence](../../verification/steal-footballer-web-2026-10-11.md)
and [November targeted evidence](../../verification/steal-footballer-2026-11-10.md).

## Implementation map

`index.html`, `style.css`, `js/app.js` own entry, menus/input, module integration,
spectator camera, on-screen commentary and synthesized crowd/referee audio.
`js/game.js` owns coins, market, roster, NPC theft, staff, progression and saves.
`js/match.js` owns the 22-player simulation, contacts, play calls, abilities,
offsides, injuries, restarts, substitutions, extra time, penalties and report.
`js/world.js`/`js/actors.js` present state with Three.js; they grant no coins.
`js/input.js` contains keyboard editing guards and focus restoration/trapping.
`PORT_CONTRACT.md` records interfaces. `data/catalog.json` contains 125 source
identities; `data/world.json` contains 3,095 static primitives, a 261-part stadium
template, 12 plots, a practice rival plot, slots, pitches and NPC positions.
`tools/export-world.luau` is a read-only installed-world exporter; `tests/` retains
detached logic/geometry and browser checks. The on-demand
`tests/actors-preview.html` fixture reviews any three source profiles without a
continuous render loop.

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
level now increases after every win, capped at 3, with stronger base opponents
and 12% stat scaling per tier. Events rotate on a 40-minute cycle.

Browser passive income is 60% of the exported rate; source prices stay unchanged.
Fresh rivals contain Common recruits. Later raid pools stay below the most
expensive owned recruit and cap at Rare, with 90-second refills and a 45-second
shield after a raid. Event Icon purchases require six squad wins; tokens can be
earned before unlock. Market/HUD income displays fractional rates. The owner's
20–30 minute first-superstar goal is a tuning target, not validated playtime.

AI carriers take central close chances before queued decisions or another duel.
Keeper location affects open-net finishing. Keepers cover the angle and can
collect a nearby carrier's ball inside their own area; practice defenders press
inside contact range. Controlled Icons keep manual shooting (V). HUD button
focus supports movement, and tactics rerenders preserve modal focus.

## Dependencies and provenance

Owner's original adaptation, not an open-source ingestion or an invented MIT
game. [CREDITS](../../../Games/StealFootballer/CREDITS.md) records source and terms.
Footballer names identify characters; ratings are fictional balance. World
primitives were exported read-only. Actors are original procedural approximations
with athletic human proportions, rounded heads/limbs and retained source hair,
skin, facial hair and kit details;
Roblox catalog meshes/clothing/faces are not bundled. Asset IDs are metadata.
Three.js r160 is local with its MIT notice. Local Bungee and Atkinson Hyperlegible
copies retain SIL OFL licenses; see [font evidence](../../portal-font-sources.md).
No new runtime third-party loads, sockets or backend are introduced.

## Audit findings

This is a solo preview with incomplete final browser acceptance. November's
bounded browser pass completed 42 checks with no retained browser exceptions or
missing assets, including native touch joystick movement, keyboard focus and
mobile panels. Two complete-match reward/debrief checks were explicitly skipped.
The model review covers six superstar/Icon examples; it does not certify exact
likeness for every profile. Earlier October browser
checks reached purchases/selling, save reload, tactics, kit saving, staff,
stadium upgrade, events, match start, paused income, spectator/zoom, movement and
bench/ability UI. The run stopped before complete-match/debrief and mobile checks.
Final static fixes cover mystery stock, draft formation, UID escaping, idle panel
refresh, kit patterns/name and home labels; no renewed gameplay tests were run
for that October push.
Known fidelity limits: procedural assets, NPC opponents, a reusable active home
stadium, HUD-only carry/thief/shield feedback and simplified proximity checks.
No claim of exact Roblox physics or complete visual parity.

## Safe iteration

Preserve economy/simulation/presentation boundaries and attribution. Use detached
fixtures, never the owner's live Roblox squad/wallet. Source commits do not save
a Roblox place. Commit explicit paths in this repository; refresh its Git-backed
inventory afterward. Use bounded targeted checks under the November owner
instruction. A full-fleet smoke/release gate still requires a requested push or
release.

## Verification

Earlier worker regressions passed progression, match contacts/restarts,
practice scaling, injury/scorer identity and renderer geometry/movement/crowd.
These are detached fixtures, not browser, Studio or cloud-save acceptance.
For the October push only JavaScript parsing, Python AST parsing, catalog/export/local
asset scans, Git diff and documentation/inventory checks are run. The unchanged
full smoke script was stopped, not passed. Desktop start/base captures are in
release evidence; mobile, complete-match, offline-reload and hardware acceptance
remained unverified in that checkpoint. Final October patches received
syntax/static checks only.

November: input, game, match, actor and world Node suites pass, including eight
complete seeded match simulations and regressions for urgent finishes on both
sides, open-net chances, keeper contests and raid/event progression. Actor
fixtures cover 125 profiles x three kits, with a maximum 2,826 triangles; world
fixtures report at most six meshes and 2,730 triangles. The single-browser quick
pass uses low graphics, mute and roughly 30fps callbacks: 42 PASS / 2 SKIP.
Desktop/mobile and static model captures were reviewed. The temporary server and
browser were closed. Full release, physical-device performance, complete-match
browser acceptance and long-session pacing remain open.

## Future outlook

Finish normal-input matches/debriefs, manual
penalties, substitutions, theft/deposit and mobile acceptance; profile real-device
performance. Validate first-superstar pacing with real sessions and refine
individual likenesses from approved references. This procedural style pass
requires no external model wishlist. Network multiplayer and
cloud save require a separately authorized backend design.

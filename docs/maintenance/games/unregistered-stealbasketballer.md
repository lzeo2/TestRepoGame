<!-- maintenance-game: Games/StealBasketballer -->
# Leo's Steal a Basketballer maintenance manual

## Identity and status

Owner-ordered original basketball sibling, local preview only, entry
`Games/StealBasketballer/index.html`. Exactly 100 real basketballer text names,
original arcade ratings, no official assets. No ID reserved or catalog entry,
push or publication. Real-name approval does not clear public identity rights.
Original footballer and portal catalog are unchanged. See
[credits](../../../Games/StealBasketballer/CREDITS.md) and
[local QA](../../steal-basketballer-local-qa.md).

## Implementation map

`js/game.js` owns roster/economy/progression/local saves and authoritative coins;
`js/match.js` owns seeded fixed-step five-on-five simulation;
`js/world.js` and `actors.js` present procedural generic blocks, court and ball.
`index.html/style.css/js/app.js` own menus, input, clocks, spectator, subtitles,
reports and synthesized local audio. `data/catalog.json` has 100 identities;
`data/world.json` preserves 12 plots/routes and has 3,333 total static primitives
including arena template. Copied Three.js and fonts remain local with licenses.
`PORT_CONTRACT.md` describes all interfaces. No build/install step.

## Gameplay and controls

Start with 150 coins, recruit from conveyor/store, earn income, steal from NPC
rivals and carry home on foot. Shields/tools repel thieves; staff train players,
upgrades improve income/arena. Roster cap12, starting five PG/SG/SF/PF/C, academy
loans fill gaps. Balanced/spread/inside spacing, three approaches, five presets.
WASD/arrows move, E interact, Space jump, drag orbit, scroll zoom; touch joystick
and buttons included. Album searches 100 text names/roles/generic teams.

Battles: ten actors, possession, pass/dribble/drive/steal/block, 2/3-point shots,
rebounds, fouls/free throws, 24-second clock (14 on offensive rebound), four
90-clock-second quarters at3x and tied overtime. Visible clock bar and commentary.
Z/X/C/V/B/N/M call attack plays, toggle defensive calls, F ready ability. Any home
player can be steered10s with shared20s cooldown; five stoppage substitutions with
no re-entry. Spectator ball/player/full-court cameras and actual reward report.

## State and persistence

Only `steal-basketballer:v1` plus `:backup`/`:damaged` are accessed. Never touch
football keys. Saves validate identities, caps, kits, coins and tactics; storage
failure leaves session playable with visible feedback. No offline payout,
accounts, cloud or multiplayer. Live battle/carry/market do not resume on reload.
Income pauses during battle; rewards recomputed from valid score and frozen
pre-match permanent income. Explicit DEVTEAM adds a test roster, not coins.

## Dependencies and provenance

Sibling source pin `31680023af77c580121bc9efc34698b8ed2bb58b`; football original by
lzeo2, private `lzeo2/steal-a-footballer` at `30b0c28`, owner-authorized adaptation,
not an open-source ingestion. Original basketball geometry/simulation/UI adaptation
under direct order. Real names manually curated from existing knowledge, not a
live-verified or date-pinned official snapshot; catalog explicitly states this.
No photos, logos, official jerseys, likeness meshes or measured ratings. Three.js
r160 MIT and Bungee/Atkinson SIL OFL notices retained with exact sibling copies.
Their licenses do not cover game/identity rights. Credits list hashes and rights
hold. No external runtime loads, downloads, packages or local model generation.

## Audit findings

Node fixtures establish detached engine and geometry behavior, not native play.
The single permitted optional system-Chromium pass timed out after10s waiting
for the bootstrap readiness predicate (snapshot function and enabled PLAY).
No page errors, HTTP failures or external loads were recorded, but console errors
were not captured, and absence of errors is not a load pass. No screenshots were
produced; phone phase not reached. Cause unknown. No second pass under the user's
single-pass budget. Native start/movement/full-match/report/touch/visual/performance
acceptance remains held. Hermes follow-up ticket `pi-3273687-1794449864222-14f2c074`.

Rules intentionally omit out-of-bounds adjudication, traveling, double-dribble,
disqualifications, injuries, and-one, held-ball and timeouts. Arcade proportions
and one-way substitution limit are not official rules. Read-only diagnostic
snapshot, not a state-grant API. Procedural bodies are not likenesses.

## Safe iteration

Keep preview unregistered; separate owner rights/publication decision required.
Never change original footballer for this task or share saves. Preserve same-style
exception and local vendor notices. Small source fixtures only, no full-fleet
smoke/mass simulations/downloads. Exact free disk must be >=2GiB before writes
and browser checks. System Chromium only, one shared slot and bounded server.
Source changes require this manual and Git inventory check. Do not mistake a
source PASS or mockup for rendered/browser acceptance.

## Verification

Current orchestrator rerun: all five authored JS and four fixture syntax checks,
Python browser-script AST, fixture entry (14 local dependencies, exact100 unique
IDs/names, six stats, rarity40/30/20/8/2, recruit/theft/deposit/5v5/reward/reload and
save isolation), match fixtures (one4:0 compressed match, fixed30/60fps comparison),
world fixtures (12 routes, aligned hoops/collision, ten actors, max6 meshes/488
triangles per actor), catalog schema/Git URLs132 unchanged, and whitespace PASS.
Integration additionally asserts matching visible/scoring arc radius48 and
free-throw x55, manual assigned roles and replacement-slot preservation.

Optional browser attempt is NOT PASS, as above. Only design mockup exists at
`docs/steal-basketballer-design/ui-mockup.png`, created before UI edits. Final
mockup/render comparison, desktop/phone captures and hardware checks unverified.
Full-fleet, downloads, mass simulations, release tests and publication skipped.
Maintenance checker runs after committed assembly/inventory refresh; local QA
records actual result and exact commits.

## Future outlook

With fresh authorization, one diagnostic browser startup pass should capture
snapshot-definition and button-disabled values separately, loading text, console
errors and script statuses. Do not assign a root cause from the timeout alone.
Then review real desktop/phone renders against mockup and test normal controls,
completion/report and touch. A separate rights decision is required before any
public build. Footballer AI/tactics/UI repairs remain a separate queued task.

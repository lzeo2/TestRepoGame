# Basketball sibling interfaces

Original standalone preview. Source sibling pinned at `31680023`; original
source `30b0c28`. The owner authorized polishing/testing and merging existing
PR #8 after Canberra PR #9. The owner's missing-site report subsequently
registered this existing preview as 246. No Footballer save migration.
`CREDITS.md` retains source attribution, dependencies and real-name rights hold.

## Data and authority

`data/catalog.json`: exactly 100 unique real names/stable IDs, six original arcade
axes `shooting/handling/passing/defense/rebounding/stamina`, five positions
PG/SG/SF/PF/C (G/F aliases in data), rarity 40 Common/30 Rare/20 Epic/8 Legendary/2 Icon.
Generic teams and bodies, no likeness assets. Names were manually curated, not
verified against a live official snapshot. `data/world.json` preserves 12 plots,
market routes and venue anchors, replacing football fields/goals with original
hardwood/markings/hoops. `basketballCourt` describes matching visible/simulated
bounds x +/-90, z +/-65, rims x +/-82/y10/z0, arc radius48, free-throw x +/-55.

## Game

`Game(data,{storage?,clock?,random?})`, `state`, `snapshot`, `subscribe`, `tick(dt)`,
`action(name,payload)`, `save`, `reset`, `team(tactics?)`, `practiceTeam`,
`ownedMembers`, `setLocation`. Economy and validation remain Game-owned.
Roster cap12; team() returns five PG/SG/SF/PF/C slots; vacant slots are generic
borrowed academy players with existing catalog IDs only as appearance references.
Member shape remains `{uid,id,name,role,roleLabel,power,stats,def,borrowed}`.
`role` is assigned slot; `stats.naturalRole` retains the player's natural role.
Formations `balanced/spread/inside`, mentality `balanced/pressing/counter`.

Actions retain recruit, sell, upgrade, eggs, mystery, staff, kits, presets, events,
NPC theft, carry/deposit/drop, shield/defense and battle boundaries. `beginBattle`
requires an owned recruit and freezes permanent-income reward scaling; `endBattle`
validates score, awards once and recomputes coins without trusting Match's estimate.
The app displays `state.lastBattle.reward`. Income pauses during battle.
The first delivered recruit starts one persisted 90-second theft grace period;
subsequent replacement signings cannot renew it. App injects an active-time clock
so explicit pause/hidden state freezes simulation, deadlines and income. Reload
uses the current real timestamp and grants no offline income. DEVTEAM
is explicit-only and adds the 12-player local test squad, never coins.

Save key `steal-basketballer:v1` with `:backup`/`:damaged` companions; never reads,
writes, clears or migrates football keys. Live matches/carry/market do not resume;
no offline payout. Storage failure preserves session play with visible feedback.

## Match

`Match(home,away,{data,formation,mentality,kit,practice,bench,seed,incomeRate,
quarterDuration=90,overtimeDuration=45,clockRate=3})` uses seeded 50ms fixed steps.
`update(dt)` returns snapshot; >10s stalled-tab catch-up is capped.
Exactly ten `players`, five per side. Side0 attacks +X; `ball.owner` indexes the
combined list. Shots use 2/3 points by release range and rim height10; free throws1.
Possession, passes, dribble movement, steals, blocks, fouls and rebounds are real
state transitions, not football relabeling. Offensive rebounds reset to14 seconds.
Four quarters, tied overtime, `finished/result` authoritative for score/stats;
Game remains coin authority. No soccer restarts, offside or penalty shootout.

Moving pass flights track their receiver. A called three-pointer received at
the selected perimeter spot launches its shot immediately on catch.

Calls: `callPlay(pass|drive|shoot|three|pickRoll|triangle|counter|press|zone|steal|block|surge)`,
`ability(hotHand|quickHandle)`, `control(index,vector)`, `releaseControl()`,
`substitute(index,member)`. Any home player can be steered for10s, shared20s
cooldown. Five changes at stoppages, no re-entry. Substitutes retain the replaced
slot. Snapshot includes `court`, `period` Q1-Q4/OTn, `quarter`, `shotClock`,
`shotClockFraction`, `clockRate`, `timeRemaining`, `score`, `stats`, `bench`,
`substitutions`, `commentary`, `events`, `control`, `abilities`, `celebration`.
Phase `basketCelebration` replaces source goal celebrations. See credits for
simplified/unimplemented rules; no injury lottery or disqualification.

## World, UI and assets

World/ActorFactory retain their original APIs and presentation-only boundary.
The app retains real active elapsed time up to one second per frame, feeding
Match's fixed 50ms steps and chunking Game updates at its 250ms bound. Avatar
movement uses bounded collision substeps; rendering time is separately bounded.
Slow rendering therefore does not discard most of the displayed match clock.
World receives actual Match; renders at most ten match actors, procedural seamed
ball, hoops, maple hardwood, generic articulated athletes and existing neighborhood.
A shared 512px canvas texture supplies original wood grain. Six arena-detail
draws add 1,248 triangles; exactly 44 non-colliding rim/net fragments are visually
replaced while all source data/colliders remain intact. Actor sampling stays at
1,284 triangles/six merged meshes plus an optional numbered badge. No real
likeness/official kit is inferred from catalog names. Full-court framing uses
viewport aspect; nearby world labels are smaller and hide in match views.
`pitchPosition`, `mode:'pitch'` remain internal compatibility names for court.
Avatar travel and theft routes preserve grounded collision handling.

`index.html/style.css/js/app.js` use the explicitly retained original palette,
local fonts, keyboard/touch controls, roster/album/search/store/tactics/staff/kits,
3x clock labels, spectator, substitutions and actual coin report. P/Escape or
the pause button opens a genuine pause; resume restores canvas keyboard focus.
Match dialog timers/availability update existing DOM nodes rather than replacing
the active controls every second; unchanged conveyor cards remain stable.
The first-signing card opens the real conveyor and unaffordable signings disable.
Desktop matches open in full-court view; portrait matches follow the ball so
athletes remain readable. Both views remain selectable. Control buttons wait
for live play. Saved kit changes rebuild matching athlete geometry, including
when the same lineup returns. Absent match/report diagnostics serialize as null.
`window.basketballerSnapshot()` returns detached, deeply frozen diagnostics only.
Vendor/fonts are sibling-local copies, notices retained; font binaries are
byte-identical, with three imported whitespace defects normalized in vendor/notice
text only. Credits list current binary/vendor hashes. The inherited read-only football exporter is excluded: grep
found no runtime/test consumer; only the superseded copied credits mentioned it.
No runtime import points into the football folder.

## Cheap checks only

`node tests/fixture.mjs` checks 100 identities, local dependency closure and reuses
`game.mjs`'s one bounded recruit/theft/deposit/match/report/reload flow.
`node tests/match.mjs` covers rules and one compressed seeded match, not a sweep.
`node tests/world.mjs` checks detached geometry/collision/render APIs, no WebGL.
`tests/browser.py` retains its historical optional start-only check. The
owner-requested polish pass uses `scripts/test_basketball_polish.py`: a bounded
normal-input desktop full match/report/reload plus phone layout/touch/camera
checks, installed system Chromium, no progression grants or clock acceleration.
It records software WebGL evidence, not native sandbox or target-hardware
acceptance. No browser download, mass simulation or new model asset.

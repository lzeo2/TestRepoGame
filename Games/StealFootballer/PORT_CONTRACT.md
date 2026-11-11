# Footballer browser port

Owner-authorized solo port from `lzeo2/steal-a-footballer` at `30b0c28`. Preserve source gameplay and 3D layout. Rivals are NPCs, saves are browser-local, runtime assets are local. Arrays and sides in JS are zero-based.

## Browser tuning, 10 November 2026

Catalog prices and identities remain source-derived. Passive income is now 60%
of the exported rate. Fresh rivals contain starters; later raid pools stay below
the most expensive owned recruit and cap at Rare. Refills take 90 seconds and a
raid activates a 45-second rival shield. Event Icon signings unlock at six wins;
tokens remain earnable before unlock. Every win raises the next practice tier,
capped at three, with stronger base opponents and 12% stat scaling per tier.
These are browser tuning decisions, not claims about original Roblox balance.
The owner's 20–30 minute first-superstar preference is a tuning target, not
verified session-length acceptance. Existing saves and owned players stay valid.

## Skills and rival development, 11 November 2026

`resolveAbilities(data)` exported by `match.js` returns 12 canonical signature
definitions merged with supplied source overrides. The six added skills are
Maradona's Slalom, Zidane's Roulette, Ronaldinho's Elastico, Henry's Finesse
Finish, Beckham's Bending Delivery and Maldini's Anticipation. Attacking skills
need home possession; Anticipation needs an opponent attack. Stamina, legal
phases and shared home cooldown still apply. `snapshot.opponentAbility` has
independent NPC stamina/cooldown; `snapshot.skillMove` is an array of
`{id,pose,playerIndex,side,remaining}`, using the global 22-player index.
`snapshot.abilities` includes player names, descriptions, cost and duration;
its `cooldown` is remaining home cooldown, not the configured duration.

Saved `npcActiveSeconds` counts clamped active club ticks, pauses in battles,
and caps at 900. One level takes 180 seconds; levels 0–5 grow generated recruits
and roster targets 3/4/5 at levels 0/2/4. Snapshot `npcDevelopment` and each
`rival.development` expose `{level,progress,nextLevelSeconds,rosterTarget,
activeSeconds,paused}`; progress is seconds into the current level. There is no
offline training grant. Delivered recruits leave automatic NPC training.
Practice XI adds 4% stats per development level and exposes
`stats.developmentLevel` to the opponent's skill timing. Match teams are frozen
when created.

The renderer uses short dribble strides and signature poses, with less than
half a unit of synchronized visual ball touch movement for grounded moving
carriers. Authoritative ball state, shots, flights and restarts stay in Match.
The model wishlist in `docs/steal-footballer-model-wishlist.md` is a proposed art
delivery contract; GLB import/rig integration is not implemented.

Push-preparation repair: `reconcileTacticsDraft(draft,roster,unavailableUid)` is a
pure exported helper from `game.js` used before applying/saving editor drafts.
It preserves edits while removing missing/contested starters/captain; strict
Game action validation remains. Actor-local accumulated gait and eased facing
replace global-time speed multiplication. Ball rendering shares the carrier's
gait phase; simulation coordinates and input response are unchanged.

## Exported catalog

`data/catalog.json`: `{config,players,traits,eggs,styles,abilities,signatures}`. Each player retains its final source definition plus baseline `stats`, `style` and `appearance` (hex colors). `worldData`: exported world base geometry, bases/pitch positions and static material/color transforms; root supplies after read-only Studio export. Three r160 locally vendored as `vendor/three.module.js`.

## Game engine

`js/game.js` exports `Game`. `new Game(data,{storage?,clock?,random?})`; `.state` internal canonical mutable state; `.subscribe(listener)` unsubscribe; `.tick(dt)`, `.action(name,payload={})` returns `{ok,message}`; `.save()`, `.snapshot()`, `.reset()`, `.team()`, `.practiceTeam()`.

State: `{version:1,coins:150,roster:[],teamUpgrade:0,stadiumLevel:0,shieldUntil:0,shieldReadyAt:0,practiceLevel:0,wins:0,steals:0,eventTokens:0,tactics:{formation,mentality,selectedUids:[],captainUid,presets:[]},kit:{enabled,primary,secondary,shorts,pattern,name},staff:{owned:[],slots:{},assignments:[]},settings:{lowGraphics:false,sound:true},market:[],rivals:[]}`. Recruit: `{uid,id,traitId,seed,level:0,mutationId:'ordinary',staff:{attackLevel:0,defenceLevel:0,conditionLevel:0,injuryUntil:0}}`. Team member: `{uid,id,name,role,roleLabel,power,stats,def,borrowed}`. Source prices, traits, levels, seeds and income formulas apply.

Actions: buy `{marketId}`, sell/upgradePlayer `{uid}`, egg `{id}`, mystery, upgradeTeam, upgradeStadium, shield, steal `{base,index}`, deposit, drop, defend `{tool}`, buyTool `{id}`, eventClaim/eventBuy `{id}`, hire `{id}`, assignStaff `{id,uid,kind}`, cancelTraining `{uid}`, tactics `{formation,mentality,selectedUids,captainUid}`, savePreset/loadPreset `{index}`, kit/colors, settings, beginBattle, endBattle `{result}`, developerCode `{code}`. No automatic developer grants. Income pauses during battles; training suppresses only assigned income; theft requires carrying home. App blocks travel while carrying.

## Match engine

`js/match.js` exports `Match`. `new Match(homeTeam,awayTeam,{data,formation='4-4-2',mentality='balanced',kit,opponentKit,practiceLevel=0,incomeRate=0,seed=1})`; `.update(dt)`, `.callPlay(id)`, `.ability(id)`, `.control(index,vector)`, `.releaseControl()`, `.substitute(index,member)`, `.penaltyInput({direction,saveDirection,manual,shoot})`, `.snapshot()`. `.finished`, `.result` authoritative report/reward; `.players`22 entries `{id,key,name,side,index,role,x,z,angle,pose,stats,def}`; `.ball` `{x,y,z,owner,flight}`; `.phase`, `.score` `[home,away]`; `.commentary` `{serial,text,important}` one sentence. Local pitch X length180/Z width130, side0 attacks +X, side1 -X. GK/DF/MF/ST roles. Renderer never resolves goals/rewards.

## Renderer

`js/world.js` exports `World`. `new World(canvas,{data,worldData,onInteract,onTravel})`; `.update(dt,{state,avatar,match,camera,lowGraphics})`, `.resize()`, `.dispose()`, `.interactions(position)`, `.basePosition(index)`, `.pitchPosition(index)`, `.setCamera({mode,index,zoom})`, `.moveAvatar(vector,dt)` returns grounded collision-checked position; `.avatar` position/facing; `.snapshot()` read-only render counters. Render original static geometry, local avatar, squads, conveyor, NPCs, mini formation, upgrade stadium, 22 match actors, crowds. Modes avatar/pitch/player/ball/icon/celebration. Own `js/actors.js` for player appearance/poses. No economy mutation.

## Ownership and checks

Game worker: game.js + tests/game.mjs. Match worker: match.js + tests/match.mjs. Renderer worker: world.js + actors.js. Root: app.js, HTML/CSS, data/export/vendor, portal/docs/runtime review. Read target AGENTS/CODE_QUALITY. Worker task20 minutes maximum, commit owned paths only after checks, never push. Portable Node is in workspace `.tools/node/node.exe`; game has no node_modules/build tool. Use meaningful Node regression tests and local imports.

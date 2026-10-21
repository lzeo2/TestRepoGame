# JANKOLOCK implementation interface

Active build resumed after measured root free space 2,670,514,176 bytes.
`docs/jankolock-design.md` remains the gameplay/art contract; this small interface
freezes lane boundaries. No network multiplayer. Read-only diagnostic is not a
state-setting API. All authored numeric inputs require finite/range validation.

## data.js

Exports `ARENA={width:960,height:600,zone:{x:480,y:300,radius:70},cover:[{x,y,w,h}],spawns:[{x,y}]}`;
cover rectangles at (250,130,90,90),(620,130,90,90),(250,380,90,90),(620,380,90,90).
Spawns (110,260),(110,340),(850,260),(850,340). Exports `HEROES` array with
`{id,name,description,shape,abilities:[{id,name,description,cooldown}]}`;
IDs `courier`, `postmaster`, `clerk`; ability IDs `rush`,`burst`; `shield`,`slam`;
`decoy`,`fan`. Exports `ITEMS` array `{id,name,description}` IDs `envelope`,
`soles`, `staple`, `forms`, `thermos`, `badge`.
`statsFor(items)` takes an array of item IDs, each capped at two, returns
`{maxHp,speed,damage,shotCooldown,abilityMultiplier,spawnShield}`. Defaults
100,150,14,0.24,1,0. Per-stack effects follow design, multiplicative percentages.
`draftOffers(seed,round,items)` returns three distinct eligible item IDs, no
mutation or clock randomness. `botItem(seed,round,actorId,items)` returns one
eligible ID. Export `RULES={roundSeconds:60,winInfluence:40,captureRate:2,captureWarmup:1,killInfluence:4,respawnSeconds:3,winsNeeded:3}`.

## engine.js

Imports data. `createMatch(heroId='courier',seed=240)` returns state phase `lobby`.
`startMatch(state)` starts round1 if lobby; `step(state,input,dt)` mutates and
returns the same state; dt finite clamped0..0.05, UI fixed step1/60.
`advanceRound(state)` only from nonfinal `roundResult`: prepares offers and phase
`draft`. `chooseItem(state,itemId)` only once during draft: apply chosen player
item and one bot item per bot, increment round, reset actors and start playing.
`setPaused(state,boolean)` toggles playing/paused. `snapshot(state)` returns a
fully detached serializable observation. Invalid actions return false, never
partially apply. Restart UI uses a new createMatch, no old state residue.

Input `{mx,my,aimX,aimY,fire,q,e}`: normalized movement intent, aim world point,
boolean fire and ability intents. Ability cooldown prevents held-key repeated
grants. UI must clear input on transitions/cancellation/blur.

State observation minimum: `{phase,heroId,seed,round,wins:[a,b],influence:[a,b],
time,actors,bullets,effects,capture:{team,warm,contested,counts:[a,b]},offers,
result,events}`. `result` null or `{winner,reason}` with team0/1. Events are a
bounded recent list of `{id,type,actorId,team}`; types include shot/ability/kill/
capture/round/item. Actors have `{id,team,heroId,x,y,aim,hp,maxHp,alive,respawn,
shield,cooldowns:[q,e],items,kills,captureSeconds,shotCooldown}`; id0 player,
id1 ally, id2/3 enemy. Bullets `{x,y,px,py,team,ownerId}` plus internal fields.
Effects support generic `{type,x,y,time}`; UI tolerates additional fields.

No DOM/audio/storage/renderer in core. Canvas uses ARENA geometry for drawing,
core owns collision/scoring. Bots share stats/cooldowns, bounded aim error and
reaction delay rather than hidden damage multipliers. Correctness before polish.

## UI and lobby

UI owns `index.html/style.css/ui.js`, global read-only
`window.jankolockSnapshot=()=>snapshot(privateState)`. Expose no mutable state.
Hero/item native buttons use `data-hero` / `data-item`; Start `#startBtn`, Restart
`#restartBtn`, result Continue `#continueBtn`, canvas `#arena`, status `#status`,
Hall `#hallBtn`, hall host `#portraitHost`. UI owns single fixed-step RAF, reduced
motion, mute, controls. No test-only grants. CPU snapshots can guide normal input.

Portrait exports `mountPortrait(host,{signal,reducedMotion=false}={})` resolving
`{status,dispose,setReducedMotion}`. Module loads config locally on Hall entry,
then lazy imports vendored core/loader only if enabled. It creates its own native
Back button and calls `host.dispatchEvent(new Event('portraitclose'))`; UI hides
hall/disposes handle. No shared CSS write by lobby lane. Own close abort prevents
late loads mounting; Start/Back/pagehide disposes. Failure must not block Canvas.
Config JSON guaranteed present, disabled if exact asset absent/invalid, enabled
includes relative url/hash/bytes. Lobby floor controls and pedestal collision
are local to module. Asset, license and notices untouched. Render provenance
must distinguish generated screenshot vs CPU preview vs supported GPU.

## Ownership and acceptance

Engine lane: engine.js + engine regression. Data lane: data.js, game package.json
(type:module only, no install), data regression. UI lane: HTML/CSS/ui.js only;
orchestrator assigns browser QA separately. Lobby lane: portrait.js/config,
assets/vendor, portrait regression and GLB receipt under its own paths.
Orchestrator owns catalog, all docs/manuals and integration fixes after handoff.
Use `git add --sparse` explicit paths, commit only owned files, never push.
Read-copy donor blobs with git show, no game checkout or sparse changes.
Logs under `.swarmforge-logs/`, compact; test temp/screenshots under `/dev/shm`,
CHROMIUM_PATH=/usr/bin/chromium, ports>=8910. Keep2GiB floor continuously.

# Circuit Ward: contact damage and motion investigation

Main independently inspected baseline5be686e `Games/Circuit Ward/script.js` lines1-215 completely (pure API/all damage branches) and695-802 (draw/RAF/host stepping). Also grepped all hp/cooldown/stepRun references. This is source evidence, NOT new native reproduction or an implemented fix. User confirms this is the shooter. User device is still unclear (`model` may mean mobile). No game source changed in this audit milestone.

## Actual damage flow

`createRun` starts each player at100hp. `spawnWave` creates `min(24, ceil((4+wave*2)*(1+(players.length-1)*.6)))` bots, with independent initial1..2s cooldowns. `stepRun` clones state, clampsdt<=.05, moves bodies, filters dead bots, and for EACH live bot chooses a nearest alive player. Attack range walker1.4m/drone4.6m; clear cover ray plus expired bot cooldown subtracts10/8hp. Cooldown then resets to .85/1.25s. There is **no per-player damage grace** and no limit on how many bots damage a player in the SAME tick. No code here says one touch instantly kills a full-health player.

Primed crowd numerical source cases (synthetic reasoning, not earned gameplay): solo wave1 has6bots (4walkers/2drones) ->56hp potential same-tick burst, then walkers can strike again after.85s. Solo wave4 has12 (8walkers/4drones) ->112hp possible same tick. Solo wave6 has16 (11walkers/5drones) ->150hp. Four-player wave1 has17 (12walkers/5drones) ->160hp if all target one actor. Thus full health CAN be wiped in one simulation tick by a crowd, though not one enemy. With fewer enemies it can still feel almost instantaneous when already damaged. LoS, actual approach, input/fps and wave conditions need real reproduction; do not pretend these placements happened naturally.

Health refill via repair cells adds25 up to100. `wire` excludes internal cooldown fields and broadcasts authoritative hp. `frame` advances `stepRun` on host/solo; clients send input and interpolate snapshots, not independent damage. Any guard belongs once in shared `stepRun`, must be recreated/reset by `createRun`, and must preserve host authority and attack cooldowns. Balance recommendation pending user's GrillMe answer: short per-player hurt grace, consume each attempted enemy attack cooldown even if grace blocks its damage, visible windup/attack feedback, separation so enemies cannot pile invisibly. Not invincibility, HP grants, arbitrary huge healing or merely lowering displayed damage.

## Animation and static appearance

`frame -> draw -> renderer.render` runs RAF; that alone is not animation. Lobby `live.time=0` does not advance via `stepRun`, fixed camera(0,2.8,9), fixed attract-bot positions. Walker bob `sin(live.time*7+id)*.025` is therefore frozen in lobby. During playing, bot x/z changes, drone y oscillates .22m, snapshots interpolate, weapon recoil/tracers/hit flashes/repair-cell bob change real properties. These do NOT establish walking limbs, skeletal clips, attack animations or satisfying feedback. No animation-mixer claim is supported by these inspected ranges. Robot/model assembly/loader branches require complete next review before choosing a limb-animation fix.

Also `frame` clamps visible dt to.05s, the same lost-frame-time pattern previously measured/fixed for Slipstream. This is a source risk, NOT a measured current Circuit Ward bottleneck or hardware benchmark. Diagnose actual dt/frames on user's device and bounded Main browser before changing its stepping.

## Checks before any claimed fix

Pure assert check: old-source crowd tick loses100hp; proposed guard permits one bounded hit, respects cooldown/time, avoids input/save/network mutation, can still lose/win, resets cleanly, detached previous state unchanged. This deliberately constructed fixture is NOT natural-play acceptance. Ordinary native: Solo start, genuine movement/aim/fire, observe attack windup/first contact hp and later hits, retreat/recovery/death/restart, HUD accuracy, mobile touch and camera, then unchanged all116registered gate before any push. User damage policy and necessary touch controls are still being grilled; no committed damage or animation patch is claimed.

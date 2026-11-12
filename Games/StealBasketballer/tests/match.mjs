import assert from 'node:assert/strict';
import {Match} from '../js/match.js';
import {readFile} from 'node:fs/promises';

const roles=['PG','SG','SF','PF','C'];
const team=side=>roles.map((role,index)=>({id:`${side}-${index}`,uid:`${side}-${index}`,name:`${side} ${role}`,role,power:65,
  stats:{naturalRole:role,shooting:65,handling:65,passing:65,defense:65,rebounding:65,stamina:65},def:{isIcon:index===0}}));
const reserve={...team('reserve')[0],uid:'reserve',id:'reserve',name:'Reserve'};
const create=options=>new Match(team('home'),team('away'),{seed:123,bench:[reserve],...options});
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
const live=match=>{
  match.phase='live';match.phaseUntil=0;match.nextDecision=100;match._give(match.players[0]);match.nextDecision=100;
  return match;
};
const isolateShooter=(match,x,z=0)=>{
  live(match);match.players[0].x=x;match.players[0].z=z;
  match.players.filter(p=>p.side===1).forEach(p=>{p.x=-80;p.z=-50;});
  match.ball.x=x;match.ball.z=z;
};

const initial=create(),s=initial.snapshot();
assert.equal(initial.players.length,10);
assert.deepEqual(initial.players.slice(0,5).map(p=>p.role),roles);
assert.deepEqual(initial.players.slice(5).map(p=>p.role),roles);
assert.equal(s.quarter,1);assert.equal(s.period,'Q1');assert.equal(s.shotClock,24);
const {basketballCourt}=JSON.parse(await readFile(new URL('../data/world.json',import.meta.url),'utf8'));
for(const key of ['bounds','rims','threePointRadius','freeThrowX'])assert.deepEqual(s.court[key],basketballCourt[key],'Visible and simulated court: '+key);
const manual=team('manual');manual[0].stats.naturalRole='C';
const assigned=new Match(manual,team('away'));assert.equal(assigned.players[0].role,'PG');assert.equal(assigned.players[0].stats.naturalRole,'C');
for(const [range,points] of [[47.99,2],[48,3]]) {
  const boundary=create();isolateShooter(boundary,82-range);boundary._shoot();assert.equal(boundary.ball.flight.points,points);
}
assert.equal(s.ball.radius,.84);assert.ok(initial.injuryUIDs instanceof Set);
for(const key of ['penalties','offside','indirect'])assert.ok(!(key in s),key);
assert.deepEqual(s.callPlays.map(p=>p.id),['pass','drive','shoot','three','press','zone','steal','block','pickRoll','triangle','counter','surge']);
assert.equal(initial.callPlay('throughBall').ok,false);
assert.equal(initial.callPlay('toString').ok,false);
assert.equal(initial.callPlay('__proto__').ok,false);
assert.equal(initial.control(9).ok,false);
const before=initial.snapshot();for(const dt of [NaN,Infinity,-1,0])initial.update(dt);
assert.deepEqual(initial.snapshot(),before);

// Same elapsed time, different render cadence, exactly the same simulation state and random draws.
const a=create(),b=create();
for(let i=0;i<90;i++)a.update(1/30);
for(let i=0;i<180;i++)b.update(1/60);
assert.deepEqual(a.snapshot(),b.snapshot());
assert.equal(a.seed,b.seed);
assert.equal(a.ticks,60);
assert.notEqual(a.players[0].x,initial.players[0].x);
assert.ok(a.shotClock<24&&a.shotClock>0);
close(a.snapshot().shotClockFraction,a.shotClock/24);

const clock=live(create());clock._auto=()=>{};clock.update(1);
close(clock.shotClock,21);close(clock.snapshot().timeRemaining,87);
clock.shotClock=.1;clock.update(.1);
assert.equal(clock.stats[0].shotClockViolations,1);assert.equal(clock.stats[0].turnovers,1);
assert.equal(clock.possession,1);assert.equal(clock.phase,'inbound');assert.equal(clock.shotClock,24);
const latePass=live(create());latePass._pass(latePass.players[1]);latePass.shotClock=.1;latePass.update(.05);
assert.equal(latePass.stats[0].shotClockViolations,1);assert.equal(latePass.ball.flight,null);assert.equal(latePass.possession,1);

const two=create();isolateShooter(two,65);two._roll=()=>.3;
assert.ok(two._shoot());assert.equal(two.ball.flight.points,2);assert.equal(two.ball.flight.to.x,82);assert.equal(two.ball.flight.to.y,10);
two.shotClock=.1;two.update(1);assert.equal(two.stats[0].shotClockViolations,0);assert.deepEqual(two.score,[2,0]);assert.equal(two.stats[0].twoPointersMade,1);
assert.equal(two.phase,'basketCelebration');assert.equal(two.snapshot().celebration.scorerIndex,0);
two.update(2);assert.equal(two.possession,1);

const three=create();isolateShooter(three,33);three._roll=()=>.2;
assert.equal(three.callPlay('three').ok,true);assert.equal(three.ball.flight.points,3);
three.update(1.5);assert.deepEqual(three.score,[3,0]);assert.equal(three.stats[0].threePointersMade,1);
assert.equal(three.stats[0].threePointersAttempted,1);

const away=create();live(away);away._give(away.players[5]);away.players[5].x=-65;away.players[5].z=0;
away.players.filter(p=>p.side===0).forEach(p=>{p.x=80;p.z=50;});away._roll=()=>.3;
away._shoot();assert.equal(away.ball.flight.to.x,-82);away.update(1);assert.deepEqual(away.score,[0,2]);

const blocked=create();isolateShooter(blocked,65);blocked.players[5].x=66;blocked.players[5].z=0;blocked._roll=()=>0;
blocked._shoot();assert.equal(blocked.ball.flight.blocked,true);blocked.update(1.3);
assert.equal(blocked.stats[1].blocks,1);assert.equal(blocked.score[0],0);
assert.equal(blocked.stats[0].rebounds+blocked.stats[1].rebounds,1);
assert.ok([14,24].includes(blocked.shotClock)||blocked.shotClock>13);

const pass=live(create());pass._roll=()=>.99;
assert.equal(pass.callPlay('pass').ok,true);assert.equal(pass.stats[0].passesAttempted,1);
assert.equal(pass.ball.flight.kind,'pass');pass.update(1);
assert.equal(pass.stats[0].passesCompleted,1);assert.equal(pass.possession,0);
const intercepted=live(create());intercepted._roll=()=>0;
intercepted._pass(intercepted.players[1]);intercepted.update(1);
assert.equal(intercepted.possession,1);assert.equal(intercepted.stats[1].interceptions,1);
assert.equal(intercepted.stats[0].turnovers,1);

const stolen=live(create());stolen.players[5].x=stolen.players[0].x;stolen.players[5].z=stolen.players[0].z;
const rolls=[.9,0];stolen._roll=()=>rolls.shift()??.9;stolen._challenge(true);
assert.equal(stolen.possession,1);assert.equal(stolen.stats[1].steals,1);assert.equal(stolen.shotClock,24);

const foul=create();isolateShooter(foul,65);foul._roll=()=>.2;
foul._foul(foul.players[5],foul.players[0],true);
assert.equal(foul.stats[1].fouls,1);assert.equal(foul.freeThrows.remaining,2);assert.equal(foul.players[0].x,55);
const remaining=foul.snapshot().timeRemaining;foul.update(4);
assert.equal(foul.stats[0].freeThrowsAttempted,2);assert.equal(foul.stats[0].freeThrowsMade,2);
assert.deepEqual(foul.score,[2,0]);close(foul.snapshot().timeRemaining,remaining);
assert.equal(foul.freeThrows,null);
const threeFoul=create();isolateShooter(threeFoul,33);threeFoul._foul(threeFoul.players[5],threeFoul.players[0],true);
assert.equal(threeFoul.freeThrows.remaining,3);
const queuedFoul=create();isolateShooter(queuedFoul,65);queuedFoul._roll=()=>.2;
queuedFoul.substitute(0,reserve);queuedFoul._foul(queuedFoul.players[5],queuedFoul.players[0],true);
assert.equal(queuedFoul.players[0].uid,'home-0');queuedFoul.update(4);
assert.equal(queuedFoul.stats[0].freeThrowsAttempted,2);assert.equal(queuedFoul.players[0].uid,'reserve');
assert.equal(queuedFoul.possession,1);assert.equal(queuedFoul.ball.owner,5);
const nonShooting=live(create());nonShooting._foul(nonShooting.players[5],nonShooting.players[0]);
assert.equal(nonShooting.phase,'inbound');assert.equal(nonShooting.possession,0);
nonShooting.teamFouls[1]=4;nonShooting._foul(nonShooting.players[5],nonShooting.players[0]);
assert.equal(nonShooting.freeThrows.remaining,2);

const sub=live(create());assert.equal(sub.substitute(0,reserve).ok,true);assert.ok(sub.snapshot().substitutions.pending);
assert.notEqual(sub.players[0].uid,'reserve');sub._inbound(1);
assert.equal(sub.players[0].uid,'reserve');assert.equal(sub.players.length,10);
assert.equal(sub.snapshot().substitutions.used,1);assert.equal(sub.bench.length,0);
assert.equal(sub.substitute(0,reserve).ok,false);
const crossRole=live(create());crossRole.substitute(4,reserve);crossRole._inbound(1);
assert.equal(crossRole.players[4].role,'C');assert.equal(crossRole.players[4].stats.naturalRole,'PG');

const controlled=live(create());assert.equal(controlled.control(0,{x:NaN,z:0}).ok,false);
assert.equal(controlled.control(0,{x:1,z:0}).ok,true);const oldX=controlled.players[0].x;
controlled.update(.5);assert.ok(controlled.players[0].x>oldX);assert.equal(controlled.releaseControl().ok,true);
assert.equal(controlled.controlState,null);
const ability=live(create());assert.equal(ability.ability('hotHand').ok,true);
assert.equal(ability.snapshot().abilities[0].active,true);assert.equal(ability.ability('hotHand').ok,false);

const horn=create();isolateShooter(horn,65);horn._roll=()=>.3;horn.periodElapsed=89.95;
horn._shoot();horn.update(1.1);assert.equal(horn.score[0],2);assert.equal(horn.quarter,2);
assert.equal(horn.period,'Q2');assert.equal(horn.phase,'quarterBreak');
const overtime=live(create());overtime.quarter=4;overtime.period='Q4';overtime.periodElapsed=89.95;
overtime.update(.1);assert.equal(overtime.period,'OT1');assert.equal(overtime.finished,false);
assert.equal(overtime.overtime,1);

// The only complete simulation: compressed quarters, no sweeps or browser dependencies.
const complete=create({quarterDuration:24,overtimeDuration:12,incomeRate:2});
for(let i=0;i<700&&!complete.finished;i++)complete.update(.5);
assert.equal(complete.finished,true,'short seeded match must finish');
assert.notEqual(complete.score[0],complete.score[1]);assert.equal(complete.result.winner,complete.score[0]>complete.score[1]?0:1);
assert.equal(complete.result.stats.length,2);assert.ok(complete.result.reward.total>0);
assert.equal(complete.result.reward.total,complete.result.reward.performance+complete.result.reward.incomeCompensation);
assert.equal(complete.players.length,10);assert.equal(complete.phase,'finished');
for(let side=0;side<2;side++) {
  const s=complete.stats[side];assert.equal(s.points,complete.score[side]);
  assert.equal(s.points,2*s.twoPointersMade+3*s.threePointersMade+s.freeThrowsMade);
  assert.equal(s.fieldGoalsMade,s.twoPointersMade+s.threePointersMade);
  assert.ok(s.passesCompleted<=s.passesAttempted);assert.ok(s.fieldGoalsMade<=s.shots);
}
assert.ok(complete.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=90&&Math.abs(p.z)<=65));
const final=complete.snapshot();complete.update(1);assert.deepEqual(complete.snapshot(),final);
final.players[0].x=999;assert.notEqual(complete.players[0].x,999);
console.log(`PASS basketball match fixtures; one short complete match ${complete.score.join(':')} (${complete.period}, ${complete.time.toFixed(1)}s); fixed-step 30/60fps identical`);

import assert from 'node:assert/strict';
import {Match} from '../js/match.js';

// Detached mathematical fixtures exercise the port; they never touch a save or live squad.
const makeTeam=(power=80,prefix='home')=>Array.from({length:18},(_,index)=>({
  uid:`${prefix}-${index}`,id:`${prefix}${index}`,name:`${prefix} ${index}`,power,
  role:index===0||index===17?'GK':index<5?'DF':index<9?'MF':'ST',
  stats:{power,attacking:power,passing:power,defending:power,pace:power,goalkeeping:power,stamina:power,level:2,
    naturalRole:index===0||index===17?'GK':'MF'},def:{id:`${prefix}${index}`,isIcon:index>0}}));
const fresh=(options={})=>new Match(makeTeam(),makeTeam(75,'away'),{seed:31,...options});
const advance=(match,seconds)=>{for(let i=0;i<Math.ceil(seconds*10);i++)match.update(.1);};
const open=match=>{advance(match,2.1);assert.equal(match.phase,'buildUp');};
const assertFinite=match=>{
  assert.equal(match.players.length,22);
  for(const p of match.players)for(const key of ['x','z','angle'])assert(Number.isFinite(p[key]),`${p.name} ${key}`);
  for(const key of ['x','y','z'])assert(Number.isFinite(match.ball[key]));
  assert(match.players.every(p=>Math.abs(p.x)<=88&&Math.abs(p.z)<=62));
};

{
  const team=makeTeam();const original=JSON.stringify(team);const match=new Match(team,makeTeam(60,'away'));
  open(match);advance(match,3);
  assert.equal(JSON.stringify(team),original,'actors must be detached from progression records');
  assert.equal(match.players.filter(p=>p.role==='GK').length,2);
  assert.equal(match.players.filter(p=>p.side===0&&p.role==='DF').length,4);
  assert.equal(match.players.filter(p=>p.side===0&&p.duty==='restDefence').length,3,'three players protect the turnover');
  assert(match.players.filter(p=>p.side===0&&p.role==='DF').every(p=>p.x<0),'backs retain role zones');
  assert.equal(match.score.reduce((s,n)=>s+n,0),0,'moving actors never awards goals');
  assertFinite(match);
}
{
  const match=fresh();open(match);
  assert(match.callPlay('lobbedBall').ok);assert.equal(match.ball.flight.kind,'pass');assert.equal(match.ball.flight.height,8);
  assert.equal(match.callPlay('throughBall').ok,false,'cannot replay a play during flight');
  advance(match,1.5);assert(match.stats[0].passesCompleted>=1,'pass arrival transfers actual possession');
  assert(match.ball.owner!==null);assert.equal(match.snapshot().cooldowns.plays>0,true);
}
{
  const match=fresh();open(match);const carrier=match.players[match.ball.owner],receiver=match.players[9];
  receiver.x=85;carrier.x=30;match.ball.x=30;
  match.players.filter(p=>p.side===1).forEach((p,i)=>{p.x=i===0?87:60-i;p.z=40;});
  match._pass(receiver);const captured=match.ball.flight.offside;assert(captured.positions[9].offside);
  receiver.x=10;match._stepFlight(3,true);
  assert.equal(match.phase,'freeKick');assert.equal(match.stats[0].offsides,1);
  assert(match.indirect,'offside awards an indirect restart at involvement');assert.equal(match.restart.x,10);
  const corner=fresh();open(corner);corner.players[9].x=85;
  assert.equal(corner._onside(0,1,'corner').positions[9].offside,false,'corners are exempt');
}
{
  const team=makeTeam();team[9].id='messi';team[9].def.id='messi';
  const match=new Match(team,makeTeam(60,'away'),{seed:3});open(match);
  assert(match.ability('dribbleGlue').ok);assert.equal(match.activeAbility.received,false);
  match._stepFlight(3,true);assert.equal(match.activeAbility.received,true);
  assert.equal(match.ball.owner,9);assert.equal(match.ability('dribbleGlue').ok,false);
  assert(match.control(9,{x:0,z:1}).ok);const z=match.players[9].z;
  advance(match,.2);assert(match.players[9].z>z,'Icon input moves the selected actor');
  match.releaseControl();assert.equal(match.control(9,{x:1,z:0}).ok,false,'twenty-second control cooldown persists');
  assert.equal(match.control(9,{x:NaN,z:0}).ok,false,'invalid input never corrupts physics');
}
{
  const slow=makeTeam(40),fast=makeTeam(120);slow[9].def.isIcon=true;fast[9].def.isIcon=true;
  const a=new Match(slow,makeTeam(20,'away')),b=new Match(fast,makeTeam(20,'away'));
  open(a);open(b);a.control(9,{x:0,z:1});b.control(9,{x:0,z:1});
  a._stepFlight(3,true);b._stepFlight(3,true);
  const za=a.players[9].z,zb=b.players[9].z;advance(a,.2);advance(b,.2);
  assert(b.players[9].z-zb>a.players[9].z-za,'pace changes actual travel distance');
}
{
  const match=fresh();open(match);const keeper=match.players[11];
  keeper.x=-20;keeper.z=0;
  const shooter=match.players[9];shooter.x=75;shooter.z=0;match._give(shooter);
  const defender=match.players[12];defender.x=82;defender.z=-3.7;defender.stats.defending=150;
  match.players.filter(p=>p.side===1&&p!==keeper&&p!==defender).forEach(p=>p.z=45);
  match._roll=()=>0;match._shoot();match._stepFlight(.8);
  assert.equal(match.stats[1].blocks,1,'a swept shot contact becomes a real defensive block');
  assert.equal(match.phase,'looseBall');assert.deepEqual(match.score,[0,0]);
}
{
  const match=fresh();open(match);const attacker=match.players[9],defender=match.players[12];
  attacker.x=40;attacker.z=0;defender.x=48;defender.z=0;match._give(attacker);
  match.players.filter(p=>p.side===1&&p!==defender).forEach(p=>{p.x=-60;p.z=50;});
  assert(match.callPlay('dribble').ok);assert.equal(match.phase,'duel');
  advance(match,.5);assert.equal(match.duel.phase,'feint');assert.equal(attacker.pose,'feint');
  assert.notEqual(attacker.z,0,'the feint moves a real actor instead of announcing a predetermined win');
  advance(match,1.5);assert.equal(match.duel,null);assert.equal(match.stats[0].dribblesAttempted,1);
}
{
  const found=new Set();
  for(let seed=1;seed<20;seed++) {
    const match=fresh({seed:seed*1000003});match.time=3;
    const f={side:0,keeper:11,fromIndex:9,outcome:'save',to:{z:2},strength:.6};
    match.ball.x=89;match._resolveShot(f);
    if(match.phase==='keeperRestart')found.add('catch');
    else if(match.ball.flight.to.x>90){found.add('wide');match._stepFlight(1,true);assert.equal(match.phase,'cornerSetup');}
    else found.add('parry');
  }
  assert.deepEqual([...found].sort(),['catch','parry','wide'],'save continuation includes catch, parry and boundary-awarded corner');
}
{
  const match=fresh();const incoming=match.bench[0];
  assert(match.substitute(6,incoming).ok);assert.equal(match.players[6].key,incoming.uid);
  assert.equal(match.substitutions,1);assert.equal(match.substitute(6,incoming).ok,false,'used reserves cannot re-enter');
  assert.equal(match.substitute(0,match.bench[0]).ok,false,'keeper role cannot be replaced by outfield reserve');
  for(let i=0;i<4;i++)assert(match.substitute(6,match.bench[0]).ok);
  assert.equal(match.substitutions,5);assert.equal(match.substitute(6,match.bench[0]).ok,false);
}
{
  const match=fresh({managerId:'guardiola'});open(match);
  assert(match.callPlay('triangle').ok);assert.equal(match.callPlay('triangle').ok,false);
  assert.equal(match.activeManager.id,'triangle');
  const unowned=fresh();open(unowned);assert.equal(unowned.callPlay('counter').ok,false);
}
{
  const match=fresh();open(match);match.periodElapsed=89.99;match._step(.05);
  assert.equal(match.period,'extra1');assert.equal(match.callPlay('shoot').ok,false,'whistle prevents new shots');
  match.phase='buildUp';match.periodElapsed=15;match._step(.05);assert.equal(match.period,'extra2');
  match.phase='buildUp';match.periodElapsed=15;match._step(.05);assert.equal(match.phase,'penalties');
  advance(match,2.2);assert.equal(match.penalties.phase,'setup');
  assert.equal(match.penaltyInput({direction:'right',manual:true}).ok,true);
  assert.equal(match.penaltyInput({shoot:true}).ok,false,'setup pass must finish first');
  advance(match,.8);assert(match.penaltyInput({shoot:true}).ok);advance(match,.1);
  assert.equal(match.penalties.phase,'flight');assert.equal(match.penalties.direction,'right');
  advance(match,180);assert(match.finished,'manual mode still has bounded automatic kick fallback');
  assert(match.penalties.taken.every(n=>n<=10));assert(match.result.stats.every(s=>Number.isFinite(s.possessionPercent)));
  const reward=match.result.reward;match.update(999);assert.equal(match.result.reward,reward,'settlement is idempotent');
}
{
  const match=fresh({incomeRate:20});match.score=[2,0];match._finish(0);
  assert.equal(match.result.rewardBreakdown.incomeCompensation,2250,'source uses frozen90-second income budget');
  assert.equal(match.result.rewardBreakdown.resultBonus,100);assert.equal(match.result.rewardBreakdown.cleanSheetBonus,20);
  assert.equal(match.result.rewardBreakdown.goalBonus,30);assert(match.result.reward>2250);
}
{
  const a=fresh({seed:8}),b=fresh({seed:8});advance(a,20);advance(b,20);
  assert.deepEqual(a.snapshot(),b.snapshot(),'seeded detached simulations are deterministic');
  for(let seed=1;seed<=8;seed++) {
    const match=fresh({seed});advance(match,300);assert(match.finished,`seed ${seed} must reach a bounded result`);
    assertFinite(match);assert(match.stats.reduce((s,q)=>s+q.passesCompleted,0)>0,'simulation plays actual passes');
    assert(match.result.stats[0].possessionPercent+match.result.stats[1].possessionPercent===100);
  }
}
console.log('PASS match: formation, flight contacts, offside, controls, pace, saves, subs, managers, periods, PKs, rewards and eight full seeded simulations');

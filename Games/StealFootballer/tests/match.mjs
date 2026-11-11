import assert from 'node:assert/strict';
import {Match,resolveAbilities} from '../js/match.js';

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
  const named=(id,index=9)=>{const team=makeTeam();team[index].id=id;team[index].def.id=id;return new Match(team,makeTeam(75,'away'),{seed:31});};
  const trajectories=[];
  for(const [id,move] of [['maradona','slalom'],['zidane','roulette'],['ronaldinho','elastico']]) {
    const match=named(id);open(match);const p=match.players[9];p.x=35;p.z=0;match._give(p);
    assert(match.ability(move).ok);const stamina=match.stamina[0];
    assert.equal(match.ability(move).ok,false,'signature cooldown prevents repeat spending');assert.equal(match.stamina[0],stamina);
    for(let i=0;i<8;i++){match.time+=.1;match._move(.1);}
    assert.equal(p.pose,move);assert(Math.abs(p.z)>0.1,'signature changes the actual carry route');
    trajectories.push([p.x,p.z]);assert.equal(match.snapshot().skillMove[0].id,move);
  }
  assert.equal(new Set(trajectories.map(p=>p.map(v=>v.toFixed(3)).join(','))).size,3,'turn, alternating slalom and outside-inside elastico use distinct routes');
  const shot=(enabled,z=8)=>{const match=named('henry');open(match);const p=match.players[9];p.x=65;p.z=z;match._give(p);
    match.players.filter(p=>p.side===1&&p.role!=='GK').forEach(p=>p.z=55);
    if(enabled)assert(match.ability('finesseFinish').ok);match._roll=()=>.99;match._shoot();return match;};
  const ordinary=shot(false),finesse=shot(true);assert(finesse.ball.flight.goalChance>ordinary.ball.flight.goalChance);
  assert.equal(finesse.players[9].pose,'finesse');assert(finesse.ball.flight.goalChance<100);
  assert.equal(shot(true,45).ball.flight.goalChance,shot(false,45).ball.flight.goalChance,'poor wide angle does not get finesse bonus');
  const bend=named('beckham');open(bend);bend.players[9].x=0;bend.players[9].z=10;bend.players[8].x=35;bend.players[8].z=10;
  bend._give(bend.players[9]);assert(bend.ability('bendingDelivery').ok);
  assert(bend.nextDecision<bend.activeAbility.endsAt,'delivery is queued before its skill window expires');bend._pass(bend.players[8]);
  const flight=bend.ball.flight;assert(Math.abs(flight.curve)>0);assert.equal(bend.players[9].pose,'bend');
  bend.players.filter(p=>p.side===1).forEach(p=>p.z=55);bend._stepFlight(flight.duration*.5);
  assert.notEqual(bend.ball.z,10,'bending delivery follows a real curved route');bend._stepFlight(flight.duration);
  assert.equal(bend.players[8].assistBonus,3,'completed bending delivery benefits receiver');
  const read=named('maldini',1);open(read);const defender=read.players[1],passer=read.players[20],receiver=read.players[19];
  assert.equal(read.ability('anticipation').ok,false,'anticipation is defensive only');
  assert.equal(read.snapshot().abilities.find(a=>a.id==='anticipation').available,false);
  read.players.forEach(p=>{p.x=-60;p.z=55;});passer.x=30;passer.z=0;receiver.x=-20;receiver.z=0;defender.x=20;defender.z=2.7;
  read._give(passer);const enemyDecision=read.nextDecision;assert(read.ability('anticipation').ok,'Maldini can activate while defending');
  assert.equal(read.nextDecision,enemyDecision,'defensive signature does not freeze opposition decisions');
  read._pass(receiver);read.ball.flight.duration=1;read._roll=()=>0;read._stepFlight(.3);
  assert.equal(read.ball.owner,1,'anticipation intercepts a nearby lane beyond normal 2.1-unit reach');
  assert.equal(read.stats[0].interceptions,1);
  const blocked=named('henry');open(blocked);blocked.stamina[0]=0;
  assert.equal(blocked.ability('finesseFinish').ok,false);assert.equal(blocked.activeAbility,null);
  blocked.phase='keeperRestart';blocked.stamina[0]=100;assert.equal(blocked.ability('finesseFinish').ok,false,'closed phases reject signatures');
  const merged=new Match(makeTeam(),makeTeam(75,'away'),{data:{abilities:[{id:'dribbleGlue',name:'Source override',playerId:'messi',duration:8,cooldown:25,cost:10}]}});
  assert.equal(merged.snapshot().abilities.length,12);assert.equal(merged.snapshot().abilities.find(a=>a.id==='dribbleGlue').name,'Source override');
  assert(merged.snapshot().abilities.every(a=>a.playerName&&a.description));
  const exposed=resolveAbilities();exposed[0].name='mutated';assert.notEqual(resolveAbilities()[0].name,'mutated','public definitions are detached');
  const malformed=resolveAbilities({abilities:[{id:'slalom',cost:-5,duration:Infinity,cooldown:NaN}]}).find(a=>a.id==='slalom');
  assert.deepEqual([malformed.cost,malformed.duration,malformed.cooldown],[10,5,27],'invalid numeric overrides use bounded defaults');
  const replacement=named('maldini',1);open(replacement);replacement._give(replacement.players[20]);assert(replacement.ability('anticipation').ok);
  const readyAt=replacement.abilityReadyAt;replacement.controlState={index:1};
  replacement.pendingSubstitution={index:1,member:replacement.bench[0]};replacement._applyPendingSubstitution();
  assert.equal(replacement.activeAbility,null,'reserve never inherits outgoing signature');assert.equal(replacement.controlState,null);
  assert.equal(replacement.abilityReadyAt,readyAt,'substitution preserves signature cooldown');
  const cadence=[0,5].map(level=>{const m=fresh();open(m);m.players.filter(p=>p.side===1).forEach(p=>p.stats.developmentLevel=level);m._roll=()=>.5;m.npcDecisionAt=0;m._npcAbility();return m.npcDecisionAt-m.time;});
  assert(Math.abs(cadence[0]-6.5)<1e-9&&Math.abs(cadence[1]-5)<1e-9,'development improves bounded NPC decision cadence without changing shared cooldown');
  const npc=named('maradona');open(npc);npc._give(npc.players[9]);assert(npc.ability('slalom').ok);const homeAbility=npc.activeAbility,homeStamina=npc.stamina[0];
  const beforeAway=npc.stamina[1];npc._give(npc.players[20]);npc.npcDecisionAt=0;npc._npcAbility();
  assert(npc.opponentAbility);assert.equal(npc.activeAbility,homeAbility,'opponent skill never overwrites home activation');
  assert.equal(npc.stamina[0],homeStamina);assert.equal(npc.stamina[1],beforeAway-10);assert.equal(npc.opponentAbility.playerIndex,20);
  const awayStamina=npc.stamina[1];npc.npcDecisionAt=0;npc._npcAbility();assert.equal(npc.stamina[1],awayStamina,'opponent has an independent bounded cooldown');
  npc.opponentAbilityReadyAt=0;npc.npcDecisionAt=0;npc.stamina[1]=0;npc.opponentAbility=null;npc._npcAbility();assert.equal(npc.opponentAbility,null);
  npc.stamina[1]=100;npc.npcDecisionAt=0;npc.phase='keeperRestart';npc._npcAbility();assert.equal(npc.opponentAbility,null,'NPC cannot activate during restarts');
  npc.phase='buildUp';npc.players[20].id='zidane';npc.npcDecisionAt=0;npc._npcAbility();assert.equal(npc.opponentAbility.id,'roulette','named NPC uses its own signature');
  npc.opponentAbilityReadyAt=0;npc.npcDecisionAt=0;npc.opponentAbility=null;npc._give(npc.players[9]);
  npc.players[12].x=npc.players[9].x+8;npc.players[12].z=npc.players[9].z;const beforeDefend=npc.nextDecision;npc._npcAbility();
  assert.equal(npc.opponentAbility.id,'anticipation');assert.equal(npc.nextDecision,beforeDefend,'NPC defensive skill does not delay home decisions');
  const moving=fresh();open(moving);moving._move(.1);assert.equal(moving.players[moving.ball.owner].pose,'dribble','ordinary carriers expose a natural dribble pose');
}

{
  for(const side of [0,1]) {
    const match=fresh();open(match);const sign=side===0?1:-1;
    const striker=match.players[side*11+9],keeper=match.players[(1-side)*11];
    striker.x=80*sign;striker.z=0;keeper.x=72*sign;keeper.z=0;
    match.players.filter(p=>p.side!==side&&p!==keeper).forEach(p=>{p.x=0;p.z=50;});
    match._give(striker);match.nextDecision=match.time+20;
    match.duel={attacker:side*11+9};match._roll=()=>.8;
    match._auto();assert.equal(match.ball.flight?.kind,'shot','close AI finish bypasses decision and duel delay on both sides');
    assert.equal(match.duel,null);assert.equal(match.ball.flight.outcome,'goal','beaten keeper cannot save open net');
    assert(match.ball.flight.goalChance<100,'open finishes remain fallible');
    const chance=match.ball.flight.goalChance;
    match.ball.flight=null;keeper.x=87*sign;match._give(striker);match._shoot();
    assert(match.ball.flight.goalChance<chance,'a keeper covering the line lowers finish likelihood');
    match.ball.flight=null;keeper.x=72*sign;match._give(striker);match._roll=()=>.99;match._shoot();
    assert.equal(match.ball.flight.outcome,'miss','beaten keeper does not magically save a missed finish');
  }
  const manual=fresh();open(manual);const p=manual.players[9];p.x=80;p.z=0;manual._give(p);
  manual.controlState={index:9};manual._auto();assert.equal(manual.ball.flight,null,'Icon finish remains manual');
  manual.controlState=null;manual.indirect={side:0,taker:9};manual._auto();
  assert.notEqual(manual.ball.flight?.kind,'shot','indirect taker cannot directly shoot');
  const wide=fresh();open(wide);wide.players[9].x=81;wide.players[9].z=40;wide._give(wide.players[9]);
  wide.nextDecision=wide.time+20;wide._auto();assert.equal(wide.ball.flight,null,'wide angle does not trigger urgent shot');
}
{
  const match=fresh({practice:true});open(match);
  const striker=match.players[9],keeper=match.players[11];
  striker.x=78;striker.z=5;keeper.x=80;keeper.z=5;
  match.players.filter(p=>p.side===1&&p!==keeper).forEach(p=>{p.x=0;p.z=50;});
  match._give(striker);striker.receivedAt=match.time-1;match._roll=()=>.3;
  match._contacts();assert.equal(match.ball.owner,11,'keeper can win a reachable ball using goalkeeping');
  assert.equal(match.phase,'keeperRestart');
  match._give(striker);striker.receivedAt=match.time-1;keeper.challengeAt=0;match._roll=()=>.99;
  match._contacts();assert.equal(match.ball.owner,9,'close keeper contest can fail');
  const distant=fresh();open(distant);distant.players[9].x=78;distant.players[9].z=5;
  distant.players[11].x=85;distant.players[11].z=5;distant._give(distant.players[9]);
  distant.players[9].receivedAt=distant.time-1;distant._roll=()=>0;distant._contacts();
  assert.equal(distant.ball.owner,9,'keeper cannot catch from outside contact range');
  distant._move(.1);assert(distant.players[11].vx<0,'keeper moves off line to close the attacker');
  const press=fresh({practice:true});open(press);const carrier=press.players[9],defender=press.players[12];
  carrier.x=40;carrier.z=0;defender.x=42;defender.z=0;
  press.players.filter(p=>p.side===1&&p!==defender).forEach(p=>{p.x=-50;p.z=50;});
  press._give(carrier);carrier.receivedAt=press.time-.7;press._roll=()=>.3;press._contacts();
  assert.equal(press.ball.owner,12,'practice pressure challenges after short receive protection');
  const close=fresh({practice:true});open(close);const c=close.players[9],d=close.players[12];
  c.x=40;c.z=0;d.x=49;d.z=0;close._give(c);c.receivedAt=close.time-2;
  close.players.filter(p=>p.side===1&&p!==d).forEach(p=>{p.x=-50;p.z=50;});
  close.controlState={index:9,vector:{x:0,z:0},lastInputAt:close.time};
  for(let i=0;i<30;i++)close._move(.1);
  assert(Math.hypot(c.x-d.x,c.z-d.z)<3.3,'practice presser closes into actual challenge reach');
}
{
  const match=fresh();open(match);match.time=10;match.nextDecision=0;
  const striker=match.players[9],keeper=match.players[11];
  striker.x=78;striker.z=5;keeper.x=80;keeper.z=5;
  match.players.filter(p=>p.side===1&&p!==keeper).forEach(p=>{p.x=0;p.z=50;});
  match._give(striker);striker.receivedAt=8;match._roll=()=>0;
  match._step(.05);
  assert.equal(match.phase,'keeperRestart','contact collection keeps its restart phase through the real step');
  assert.equal(match.ball.owner,11);assert.equal(match.ball.flight,null);
  const deadline=match.phaseUntil;
  while(match.time+.05<deadline)match._step(.05);
  assert.equal(match.phase,'keeperRestart','keeper holds the ball for the bounded collection delay');
  assert.equal(match.ball.owner,11);assert.equal(match.ball.flight,null);
  for(let i=0;i<12&&!match.ball.flight;i++)match._step(.05);
  assert.equal(match.ball.flight?.kind,'pass','keeper resumes distribution after its restart and decision delays');
  assert(match.time>=deadline&&match.time<deadline+.7);
}

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
  // Identical catalog identities and display names still identify the original kick by actor/key.
  for(const side of [0,1]) {
    const home=makeTeam(),away=makeTeam(75,'away');
    for(const team of [home,away])for(const index of [9,10]) {
      team[index].id='duplicate';team[index].name='Same Footballer';team[index].def.id='duplicate';
    }
    const match=new Match(home,away,{seed:5});open(match);
    const globalIndex=side*11+9,shooter=match.players[globalIndex],originalKey=shooter.key;
    shooter.x=side===0?70:-70;shooter.z=0;match._give(shooter);
    match.players.filter(p=>p.side!==side&&p.role!=='GK').forEach(p=>p.z=55);
    match._roll=()=>0;assert(match._shoot());assert.equal(match.ball.flight.shooterIndex,globalIndex);
    shooter.name='Changed after kick';match._stepFlight(2,true);
    assert.equal(match.phase,'goalCelebration');
    assert.equal(match.celebration.scorerIndex,globalIndex,'away indices include the11-player side offset');
    assert.equal(match.celebration.scorerKey,originalKey,'duplicate identities do not select another actor');
    assert.equal(match.celebration.scorer,'Same Footballer','the shot preserves its original shooter name');
    assert.notEqual(match.celebration.scorerKey,match.players[side*11+10].key);
    assert.equal(match.snapshot().celebration.scorerIndex,globalIndex);
  }
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
  // Detached confirmed-contact fixture; no Game action, save, wallet or roster is mutated.
  const match=fresh();open(match);const victim=match.players[9],offender=match.players[12];
  victim.x=40;victim.z=0;victim.angle=0;offender.x=39;offender.z=0;offender.angle=0;match._give(victim);
  let rolls=0;match._roll=()=>{rolls++;return 0;};
  assert(match._tryFoul(offender,victim),'grounded late contact produces a real confirmed foul');
  assert.equal(match.stats[1].fouls,1);assert.equal(match.phase,'freeKick');assert.equal(match.commentary.kind,'foul');
  assert.equal(victim.stats.pace,68);assert.equal(victim.stats.stamina,72);assert.equal(rolls,1);
  assert.equal(match._tryFoul(offender,victim),false,'the same whistle cannot apply twice');
  const prepare=()=>{match.time+=7;match.phase='buildUp';match.restart=null;match._give(victim);};
  prepare();assert(match._tryFoul(offender,victim));assert.equal(rolls,1,'only one injury roll per owned UID');
  assert.equal(victim.stats.pace,68);assert.equal(victim.stats.stamina,72,'injury multipliers do not stack');
  prepare();offender.x=41;assert.equal(match._tryFoul(offender,victim),false,'a fair front challenge does not cause an injury');
  assert.equal(match.stats[1].fouls,2);
  const frozen=match.snapshot();frozen.events[0].text='changed';assert.notEqual(match.events[0].text,'changed','audio events are detached');
  match._finish(0);assert.deepEqual(match.result.injuries,[victim.uid]);assert.equal(match.commentary.kind,'fullTime');
  assert.equal(match.result.events.at(-1).kind,'fullTime');
}
{
  const match=fresh();open(match);const loan=match.players[9],offender=match.players[12];
  loan.borrowed=true;loan.x=40;loan.z=0;loan.angle=0;offender.x=39;offender.z=0;offender.angle=0;match._give(loan);
  let rolls=0;match._roll=()=>{rolls++;return 0;};assert(match._tryFoul(offender,loan));
  assert.equal(rolls,0,'loans never receive injury rolls');assert.equal(loan.stats.pace,80);
  match._finish(0);assert.deepEqual(match.result.injuries,[]);
  const offside=fresh();open(offside);offside.players[9].x=85;offside.ball.x=30;
  const phase=offside._onside(0,1);offside._offside(offside.players[9],phase);
  assert.equal(offside.injuryRolls.size,0,'offside is not a foul injury event');
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
console.log('PASS match: 12 merged signatures, six distinct new skill mechanics, NPC cooldown/stamina isolation, dribble poses, formation, flight contacts, offside, controls, urgent finishes, keeper positioning/contests, practice pressure, pace, saves, subs, managers, periods, PKs, rewards, confirmed foul injuries, detached audio events and eight full seeded simulations');

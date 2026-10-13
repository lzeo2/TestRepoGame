// Browser adaptation of BattleService, MatchMovement, Offside and its match-only services.
// Coordinates are pitch local: X is the 180-unit length, Z the 130-unit width.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const dir = side => side === 0 ? 1 : -1;
const reply = (ok, message = '') => ({ok, message});
const clone = value => JSON.parse(JSON.stringify(value));
const FORMATIONS = {'4-4-2': [4,4,2], '4-3-3': [4,3,3], '3-5-2': [3,5,2]};
const PLAYS = {throughBall:5, overlap:6, highPress:8, shoot:4, dribble:7, recycle:3,
  forwardRuns:6, lobbedBall:6, contain:3, compact:4, slideTackle:6};
const ABILITIES = [
  {id:'dribbleGlue',name:'Dribble Glue',playerId:'messi',duration:8,cooldown:25,cost:10},
  {id:'rocketShot',name:'Rocket Shot',playerId:'ronaldo',duration:8,cooldown:30,cost:10},
  {id:'speedBurst',name:'Speed Burst',playerId:'mbappe',duration:8,cooldown:25,cost:10},
  {id:'sambaStep',name:'Samba Step',playerId:'neymar',duration:6,cooldown:25,cost:10},
  {id:'stepovers',name:'Stepovers',playerId:'r9',duration:7,cooldown:28,cost:10},
  {id:'wingWeave',name:'Wing Weave',playerId:'yamal_superstar',duration:6,cooldown:25,cost:10}
];
const MANAGERS = {triangle:{manager:'guardiola',cost:9,duration:8,cooldown:24},
  counter:{manager:'ancelotti',cost:11,duration:7,cooldown:24},
  surge:{manager:'klopp',cost:13,duration:6,cooldown:26}};
const STYLE_SIGNATURES = {runner:['firstBurst'],finisher:['drivenStrike'],powerFinisher:['drivenStrike'],
  dribbler:['closeTouch'],creator:['closeTouch'],controller:['lineSplitter'],anchor:['coverRead'],
  stopper:['coverRead'],sweeperGK:['keeperSweep']};
const STYLE_BY_PLAYER = {messi:'creator',r9:'powerFinisher',ronaldo:'powerFinisher',mbappe:'runner',
  neymar:'dribbler',yamal_superstar:'dribbler',rodri:'anchor',pedri:'controller',debruyne:'controller',
  ederson:'sweeperGK',maldini:'stopper',saliba:'stopper',haaland:'powerFinisher'};
const stat = (p, key) => clamp(finite(p.stats?.[key], finite(p.power, 40)), 0, 150);
const style = p => p.stats.playstyleId || p.def.playstyleId || p.def.style?.id || STYLE_BY_PLAYER[p.id] || 'balanced';
const signature = (p, id) => (p.def.signaturePlaystyles || STYLE_SIGNATURES[style(p)] || []).some(v => (v.id || v) === id);
const newStats = () => ({shots:0,shotsOnTarget:0,saves:0,passesAttempted:0,passesCompleted:0,
  possessionSeconds:0,tackles:0,interceptions:0,blocks:0,offsides:0,corners:0,fouls:0,
  dribblesAttempted:0,dribblesWon:0,penaltyTaken:0,penaltyGoals:0,penaltySaves:0});

export class Match {
  constructor(homeTeam = [], awayTeam = [], options = {}) {
    this.options = options;
    this.isPractice=options.practice===true||awayTeam.length>=11&&awayTeam.slice(0,11).every(p=>p.stats?.traitId==='practice');
    this.seed = (finite(options.seed, 1) >>> 0) || 1;
    this.time = 0; this.periodElapsed = 0; this.period = 'regulation'; this.periodDuration = 90;
    this.phase = 'kickoff'; this.phaseUntil = 2; this.score = [0,0]; this.finished = false; this.result = null;
    this.players = []; this.ball = {x:0,y:0.8,z:0,owner:null,flight:null};
    this.stats = [newStats(),newStats()]; this.commentary = {serial:0,text:'The teams prepare for kickoff.',important:true,kind:'kickoff'};
    this.events = []; this.controlState = null; this.controlReadyAt = 0;
    this.injuryRolls=new Set();this.injuryUIDs=new Set();this.foulCount=0;this.foulReadyAt=0;
    this.playReadyAt = 0; this.abilityReadyAt = 0; this.managerReadyAt = 0;
    this.activeAbility = null; this.activeManager = null; this.duel = null; this.offsidePhase = null;
    this.restart = null; this.indirect = null; this.celebration = null; this.penalties = null;
    this.substitutions = 0; this.pendingSubstitution = null; this.usedMembers = new Set();
    this.formation = FORMATIONS[options.formation] ? options.formation : '4-4-2';
    this.mentality = ['balanced','counter','pressing'].includes(options.mentality) ? options.mentality : 'balanced';
    this.stamina = [100,100]; this.tactics = [{},{}];
    const teams = [homeTeam, awayTeam];
    for (let side = 0; side < 2; side++) {
      const formation = side === 0 ? this.formation : '4-4-2';
      const anchors = this._anchors(formation, side);
      for (let index = 0; index < 11; index++) {
        const member = teams[side][index] || {id:`loan_${side}_${index}`,name:'Academy Loan',borrowed:true,power:30,stats:{}};
        const p = this._actor(member, side, index, anchors[index]);
        this.players.push(p);
        if (side === 0) this.usedMembers.add(p.key);
      }
    }
    this.bench = clone((options.bench || homeTeam.slice(11,18)).slice(0,7));
    this.rewardScaling = this._scaling(homeTeam.slice(0,11), options.incomeRate);
    this.managerId = options.managerId || options.manager || homeTeam.managerId || null;
    this.possession = 0; this.attackStarted = 2; this.nextDecision = 5.4; this.completedAttackPasses = 0;
    this._give(this.players[1]);
  }

  _roll() { this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0; return this.seed / 4294967296; }
  _say(text, important = false, kind = 'commentary') {
    this.commentary = {serial:this.commentary.serial+1,text:text.replace(/[.!?]+$/,'')+'.',important,kind};
    this.events.push({time:Math.round(this.time*10)/10,side:this.possession,...this.commentary});
    if (this.events.length > 100) this.events.shift();
  }
  _anchors(formation, side) {
    const out = [{role:'GK',x:-83*dir(side),z:0}];
    FORMATIONS[formation].forEach((count, row) => {
      for (let i = 0; i < count; i++) out.push({role:['DF','MF','ST'][row],
        x:[-48,-9,30][row]*dir(side),z:(i-(count-1)/2)*(count===2?27:count===3?31:count===5?21:26)});
    });
    return out;
  }
  _actor(member, side, index, anchor) {
    const def = clone(member.def || {}), stats = clone(member.stats || def.stats || {});
    return {id:member.id || def.id,uid:member.uid||null,key:member.uid || `${side}:${index}:${member.id || def.id}`,
      name:member.name || def.name || 'Footballer',side,index,role:anchor.role,roleLabel:member.roleLabel || anchor.role,
      x:anchor.x,z:anchor.z,anchor:{...anchor},angle:side===0?0:Math.PI,pose:'idle',
      power:finite(member.power,finite(stats.power,40)),stats,def,borrowed:!!member.borrowed,
      vx:0,vz:0,receivedAt:-100,challengeAt:0,duty:'hold',captain:!!member.captain};
  }
  _scaling(team, income) {
    const owned = team.filter(p => !p.borrowed); const count = owned.length;
    const average = count ? owned.reduce((s,p)=>s+clamp(finite(p.power,40),20,150),0)/count : 0;
    const level = count ? owned.reduce((s,p)=>s+clamp(finite(p.stats?.level),0,5),0)/count : 0;
    return {multiplier:Math.min(2.5,1+Math.max(0,average-20)*.01*count/11+level*.05*count/11),
      averageSkill:average,averageLevel:level,ownedPlayers:count,incomeRate:clamp(finite(income),0,1000000)};
  }
  _reward(label) {
    const s=this.rewardScaling, goals=this.score[0], conceded=this.score[1];
    const resultBonus=label==='win'?100:label==='draw'?50:25,goalBonus=goals*15;
    const cleanSheetBonus=label==='win'&&conceded===0?20:0;
    const coverage=label==='win'?1.25:label==='draw'?.60:.25,margin=label==='win'?.15:label==='draw'?.05:0;
    const incomeCompensation=Math.round(s.incomeRate*90*coverage);
    const incomeSkillBonus=Math.round(s.incomeRate*90*margin*(s.multiplier-1));
    const performance=Math.round((resultBonus+goalBonus+cleanSheetBonus)*s.multiplier);
    const cap=incomeCompensation+incomeSkillBonus+Math.round(250*s.multiplier);
    return {...s,resultLabel:label,resultBonus,goalBonus,cleanSheetBonus,incomeSeconds:90,incomeCoverage:coverage,
      incomeCompensation,incomeSkillBonus,performance,cap,total:Math.min(cap,incomeCompensation+incomeSkillBonus+performance)};
  }
  _give(p, kind) {
    this.ball.owner=this.players.indexOf(p); this.ball.flight=null; this.possession=p.side;
    this.ball.x=p.x+dir(p.side)*.85;this.ball.z=p.z;this.ball.y=p.role==='GK'?2.6:.8;
    p.receivedAt=this.time;
    if (kind==='interception') this.stats[p.side].interceptions++;
    if (kind==='tackle') this.stats[p.side].tackles++;
    if (this.activeAbility && this.activeAbility.playerIndex===this.ball.owner && !this.activeAbility.received) {
      this.activeAbility.received=true; this.activeAbility.startsAt=this.time;
      this.activeAbility.endsAt=this.time+this.activeAbility.duration;
    }
    if (this.indirect && p.side===this.indirect.side && p.index!==this.indirect.taker) this.indirect=null;
  }
  _open() { return !this.finished && this.periodElapsed < this.periodDuration &&
    ['buildUp','pass','lobbedPass','duel','shot','looseBall'].includes(this.phase); }
  _active(p) { const a=this.activeAbility; return a && a.playerIndex===this.players.indexOf(p) && a.received && this.time<a.endsAt ? a : null; }
  _nearest(side, point, excludeKeeper=true) {
    return this.players.filter(p=>p.side===side&&(!excludeKeeper||p.role!=='GK')).sort((a,b)=>dist(a,point)-dist(b,point)||a.index-b.index);
  }
  _onside(side, fromIndex, restartKind) {
    const direction=dir(side), depths=this.players.filter(p=>p.side!==side).map(p=>p.x*direction).sort((a,b)=>b-a);
    const line=Math.max(depths[1],this.ball.x*direction);
    const exempt=['corner','throwIn','goalKick'].includes(restartKind);
    return {side,fromIndex,lineX:line*direction,exempt,positions:this.players.filter(p=>p.side===side).map(p=>({
      index:p.index,x:p.x,z:p.z,offside:!exempt&&p.index!==fromIndex&&p.x*direction>.25&&p.x*direction>line+.25}))};
  }
  _offside(p, frozen=this.offsidePhase) {
    if (!frozen || frozen.exempt || p.side!==frozen.side || !frozen.positions[p.index]?.offside) return false;
    this.stats[p.side].offsides++;
    this._restart('freeKick',1-p.side,p.x,p.z,2.2);
    const taker=this._nearest(1-p.side,p)[0];
    this.indirect={side:1-p.side,taker:taker.index};
    this._say(`${p.name} is offside and the opposition receives an indirect free kick`,true,'offside');
    return true;
  }
  _pass(receiver, lob=false, restartKind=null) {
    const p=this.players[this.ball.owner]; if (!p || this.ball.flight || !receiver) return false;
    const from={x:this.ball.x,y:this.ball.y,z:this.ball.z};
    const distance=dist(from,receiver); const splitter=signature(p,'lineSplitter')&&receiver.x*dir(p.side)>p.x*dir(p.side)+8;
    const passSpeed=clamp(42*(.75+stat(p,'passing')*.005),36,56);
    let duration=clamp(distance/passSpeed,.4,1.7);
    if(splitter) duration=Math.max(.35,duration-.15);
    if(lob)duration=clamp(duration*1.35,1.4,2.4);
    if(this.activeManager?.id==='triangle'&&p.role==='MF'&&receiver.role==='MF') duration*=.88;
    this.offsidePhase=this._onside(p.side,p.index,restartKind);
    this.ball.flight={kind:'pass',from,to:{x:receiver.x,y:.8,z:receiver.z},elapsed:0,duration,
      height:lob?8:1,side:p.side,receiver:this.players.indexOf(receiver),fromIndex:p.index,offside:this.offsidePhase,splitter};
    this.ball.owner=null;this.phase=lob?'lobbedPass':'pass';this.stats[p.side].passesAttempted++;
    p.pose='pass';p.actionPose='pass';p.poseUntil=this.time+.35;this.nextDecision=this.time+duration+2.5;
    this._say(`${p.name} ${lob?'lifts the ball':'passes'} to ${receiver.name}`);
    return true;
  }
  _receiver(p, mode='forward') {
    const direction=dir(p.side); const candidates=this.players.filter(q=>q.side===p.side&&q!==p&&q.role!=='GK');
    const ordered=candidates.map(q=>{
      const progress=(q.x-p.x)*direction,gap=dist(p,q);
      const pressure=dist(this._nearest(1-p.side,q)[0],q);
      const forward=mode==='recycle'?-progress:progress;
      const roleBonus=p.role==='DF'&&q.role==='MF'?14:p.role==='MF'&&q.role==='ST'?10:0;
      return {q,weight:forward*.6-gap*.22+Math.min(15,pressure)*.6+roleBonus-(gap>60?20:0)+(style(q)==='controller'?4:0)};
    }).sort((a,b)=>b.weight-a.weight||a.q.index-b.q.index);
    return ordered[0]?.q;
  }
  _startDuel(p) {
    const defender=this._nearest(1-p.side,p)[0];if(!defender||dist(p,defender)>18||p.role==='GK') return false;
    this.duel={attacker:this.players.indexOf(p),defender:this.players.indexOf(defender),at:this.time,
      endsAt:this.time+1.8,origin:{x:p.x,z:p.z},direction:p.z>=defender.z?1:-1,phase:'approach'};
    this.phase='duel';this.stats[p.side].dribblesAttempted++;this.nextDecision=this.time+2.2;
    this._say(`${p.name} takes on ${defender.name}`);return true;
  }
  _shoot() {
    const p=this.players[this.ball.owner];if(!p||this.ball.flight||this.periodElapsed>=this.periodDuration)return false;
    if(this.indirect && p.side===this.indirect.side && p.index===this.indirect.taker) return false;
    const direction=dir(p.side), distance=91-p.x*direction,keeper=this.players.find(q=>q.side!==p.side&&q.role==='GK');
    const pressure=Math.min(12,this.players.filter(q=>q.side!==p.side&&q.role!=='GK'&&(q.x-p.x)*direction>=-1)
      .reduce((s,q)=>s+Math.max(0,1-dist(p,q)/12)*clamp(stat(q,'defending')/90,.25,1.4)*7,0));
    const a=this._active(p),rocket=a?.id==='rocketShot',driven=signature(p,'drivenStrike');
    const resist=a?.id==='dribbleGlue'?.3:['sambaStep','stepovers','wingWeave'].includes(a?.id)?.55:1;
    let cap,target;
    if(distance<=25){cap=80;target=90;}
    else if(distance<=40){cap=45-(distance-25)/15*20;target=85-(distance-25)/15*20;}
    else if(distance<=60){cap=25-(distance-40)/20*17;target=65-(distance-40)/20*30;}
    else{cap=Math.max(.5,5*Math.exp(-(distance-60)/25));target=Math.max(4,35*Math.exp(-(distance-60)/35));}
    if(distance>25)cap+= (driven?1.5:0)+(rocket?2:0);
    if(distance>60)cap=Math.min(5,cap);
    const support=distance<=25&&Math.abs(p.z)<=16&&pressure<6&&this.completedAttackPasses>0?clamp((25-distance)/2,0,8)*(1-pressure/6):0;
    const attackFormation=p.side===0?this.formation:'4-4-2',defenceFormation=p.side===0?'4-4-2':this.formation;
    const attackShape=attackFormation==='4-3-3'?3:attackFormation==='4-4-2'?1:0;
    const defenceShape=defenceFormation==='4-4-2'?3:defenceFormation==='4-3-3'?1:0;
    const average=(side,key)=>this.players.filter(q=>q.side===side).reduce((sum,q)=>sum+stat(q,key),0)/11;
    const mentality=p.side===0&&this.mentality==='pressing'?4-(1-this.stamina[0]/100)*10:
      p.side===0&&this.mentality==='counter'&&this.counterSide===0?7:0;
    const distancePenalty=clamp((distance-180*.24)*.13,0,10);
    const pressPenalty=this.time<(this.tactics[1-p.side].pressUntil||0)?3*resist:0;
    const chance=Math.min(cap,clamp(48+(stat(p,'attacking')-stat(keeper,'goalkeeping'))*.38+
      (average(p.side,'passing')-average(1-p.side,'defending'))*.1+attackShape-defenceShape+mentality+
      (p.captain?2:0)+(1-this.stamina[1-p.side]/100)*7+(rocket?6:0)+(driven?3:0)+
      (p.assistBonus||0)+support-pressure*resist-distancePenalty-pressPenalty,22,80));
    const roll=this._roll()*100,outcome=roll<chance?'goal':roll<target?'save':'miss';
    const aim=(this._roll()*2-1)*9;
    const to={x:direction*91,y:outcome==='goal'?1.1:.8,z:outcome==='miss'?(aim<0?-1:1)*(16+this._roll()*10):aim};
    this.ball.flight={kind:'shot',from:{x:this.ball.x,y:this.ball.y,z:this.ball.z},to,elapsed:-.32,
      duration:driven?.8:1,height:driven?1.6:2.4,side:p.side,fromIndex:p.index,outcome,keeper:this.players.indexOf(keeper),
      shooterIndex:this.players.indexOf(p),shooterKey:p.key,shooterName:p.name,
      shotDistance:distance,goalChance:chance,onTargetChance:target,pressure,strength:clamp(stat(p,'attacking')/150,0,1),driven};
    this.ball.owner=null;this.phase='shot';p.pose='shoot';p.actionPose='shoot';p.poseUntil=this.time+.65;this.stats[p.side].shots++;
    if(rocket)this.activeAbility=null;
    this.stamina[p.side]=Math.max(0,this.stamina[p.side]-6);this._say(`${p.name} shoots`);return true;
  }
  _restart(kind, side, x, z, delay=2) {
    this.ball.owner=null;this.ball.flight=null;this.ball.x=clamp(x,-89,89);this.ball.z=clamp(z,-64,64);this.ball.y=.8;
    this.duel=null;this.offsidePhase=null;this.releaseControl();
    this.possession=side;this.restart={kind,side,x:this.ball.x,z:this.ball.z};this.phase=kind==='corner'?'cornerSetup':kind;
    this.phaseUntil=this.time+delay;this._applyPendingSubstitution();
  }
  _turnover(p,kind) {
    this.offsidePhase=null;this.duel=null;this.indirect=null;this._give(p,kind);
    this.counterSide=p.side;
    this.phase='buildUp';this.attackStarted=this.time;this.completedAttackPasses=0;this.nextDecision=this.time+2;
    this._say(`${p.name} ${kind==='interception'?'intercepts the pass':'wins the ball'}`);
  }
  _tryFoul(offender,victim) {
    if(!this._open()||this.ball.flight||this.ball.owner!==this.players.indexOf(victim)||
      offender.side===victim.side||offender.role==='GK'||victim.role==='GK'||
      this.time<this.foulReadyAt||this.foulCount>=6)return false;
    const dx=offender.x-victim.x,dz=offender.z-victim.z,gap=Math.hypot(dx,dz);
    const forward={x:Math.cos(victim.angle),z:Math.sin(victim.angle)};
    const facing=Math.cos(offender.angle)*(-dx)+Math.sin(offender.angle)*(-dz);
    const ballAhead=(this.ball.x-victim.x)*forward.x+(this.ball.z-victim.z)*forward.z;
    // Source Law 12 approximation: grounded rear contact, not a shoulder duel or distant slide.
    if(gap>.2&&gap<=2.3&&this.ball.y<=1.35&&this.ball.y>=0&&
      dx*forward.x+dz*forward.z<-.3&&facing/gap>=.15&&ballAhead>=.1) {
      this.foulCount++;this.foulReadyAt=this.time+6;this.stats[offender.side].fouls++;
      const injured=this._foulInjury(victim);
      victim.actionPose='fall';victim.poseUntil=this.time+1.9;
      this.activeAbility=null;this.activeManager=null;this.indirect=null;
      this._restart('freeKick',victim.side,victim.x,victim.z,3);
      this._say(`Late challenge by ${offender.name} earns a free kick${injured?` and ${victim.name} is injured`:''}`,true,'foul');
      return true;
    }
    return false;
  }
  _foulInjury(victim) {
    if(victim.borrowed||!victim.uid||this.injuryRolls.has(victim.uid))return false;
    this.injuryRolls.add(victim.uid);
    if(this._roll()>=.15)return false;
    // Imported stats may already contain a timed injury; never apply its multiplier twice.
    if(!victim.stats.injured) {
      victim.stats.careBasePace=finite(victim.stats.careBasePace,stat(victim,'pace'));
      victim.stats.careBaseStamina=finite(victim.stats.careBaseStamina,stat(victim,'stamina'));
      victim.stats.pace=Math.round(victim.stats.careBasePace*.85*100)/100;
      victim.stats.stamina=Math.round(victim.stats.careBaseStamina*.9*100)/100;
      victim.stats.injured=true;
    }
    if(victim.side===0)this.injuryUIDs.add(victim.uid);
    return true;
  }
  _loose(from,to,side,duration=.65) {
    this.ball.owner=null;this.ball.flight={kind:'loose',from,to,elapsed:0,duration,height:1.6,side};this.phase='looseBall';
    this.looseUntil=this.time+5;
  }
  _resolveShot(f) {
    const keeper=this.players[f.keeper];
    if(f.outcome==='goal') {
      this.stats[f.side].shotsOnTarget++;this.score[f.side]++;
      this.ball.owner=null;this.ball.flight=null;this.phase='goalCelebration';this.phaseUntil=this.time+3.4;
      const scorerIndex=f.shooterIndex??f.side*11+f.fromIndex;
      const originalShooter=this.players[scorerIndex];
      this.celebration={side:f.side,scorer:f.shooterName??originalShooter.name,scorerIndex,
        scorerKey:f.shooterKey??originalShooter.key,stage:'runToCorner',endsAt:this.phaseUntil};
      this.players.filter(p=>p.side===f.side).forEach(p=>p.pose='celebrate');
      this._say(`${this.celebration.scorer} scores for ${f.side===0?'your team':'the opposition'}`,true,'goal');
      this.releaseControl();this._applyPendingSubstitution();
    } else if(f.outcome==='save') {
      this.stats[f.side].shotsOnTarget++;this.stats[1-f.side].saves++;keeper.pose='dive';keeper.actionPose='dive';keeper.poseUntil=this.time+.8;
      const safe=keeper.stats.traitId==='safeHands'||style(keeper)==='safeHands';
      const strength=Math.min(1,f.strength+(f.driven?.15:0));
      const chance=clamp(.25+stat(keeper,'goalkeeping')/150*.48-strength*.17+(safe?.08:0),.15,.82),roll=this._roll();
      const sign=f.to.z<0?-1:1;
      if(roll<chance) {
        this.offsidePhase=null;this._give(keeper);this.phase='keeperRestart';this.phaseUntil=this.time+1.3;
        this._say(`${keeper.name} catches the shot`,false,'save');
      } else if(roll<chance+(1-chance)*.58) {
        this._loose({...this.ball},{x:dir(f.side)*78,y:.8,z:sign*(5+this._roll()*4)},f.side);
        this._say(`${keeper.name} parries the ball into play`,false,'save');
      } else {
        this._loose({...this.ball},{x:dir(f.side)*96,y:.8,z:sign*(18+this._roll()*8)},f.side,.8);
        this.savedWideSide=f.side;this._say(`${keeper.name} tips the ball wide`,false,'save');
      }
    } else {
      this._restart('goalKick',1-f.side,dir(f.side)*82,0,1.8);this._say('The shot goes wide of the goal',false,'out');
    }
  }
  _stepFlight(dt, drain=false) {
    const f=this.ball.flight;if(!f)return;
    const old={x:this.ball.x,y:this.ball.y,z:this.ball.z};f.elapsed+=dt;
    if(f.elapsed<0)return;
    if(f.kind==='pass') {
      const receiver=this.players[f.receiver];f.to={x:receiver.x,y:.8,z:receiver.z};
    }
    const t=clamp(f.elapsed/f.duration,0,1);
    this.ball.x=f.from.x+(f.to.x-f.from.x)*t;this.ball.z=f.from.z+(f.to.z-f.from.z)*t;
    this.ball.y=f.from.y+(f.to.y-f.from.y)*t+Math.sin(Math.PI*t)*f.height;
    if(f.kind!=='loose'&&f.elapsed>.12&&this.ball.y<3.8) {
      const dx=this.ball.x-old.x,dz=this.ball.z-old.z,len2=dx*dx+dz*dz;
      for(const defender of this.players.filter(p=>p.side!==f.side&&p.role!=='GK')) {
        if(this.time<defender.challengeAt)continue;
        const u=len2?clamp(((defender.x-old.x)*dx+(defender.z-old.z)*dz)/len2,0,1):0;
        const gap=Math.hypot(defender.x-old.x-dx*u,defender.z-old.z-dz*u);
        if(gap>2.1)continue;
        defender.challengeAt=this.time+1.5;
        const passer=this.players[f.side*11+f.fromIndex];
        const skill=(stat(passer,'attacking')+stat(passer,'pace'))*.5;
        const control=this.controlState?.index===defender.index&&defender.side===0;
        const resistance=signature(passer,'closeTouch')?8:0;
        let chance=clamp(.42+(stat(defender,'defending')-skill)*.0042+(control?.12:0)+.08+
          (this.time<(this.tactics[defender.side].pressUntil||0)?.08:0)+(signature(defender,'coverRead')?.06:0)-resistance/100,.18,control?.78:.65);
        if(this.isPractice&&defender.side===1)chance*=.55;
        if(f.kind==='pass'&&this._roll()<chance)this._turnover(defender,'interception');
        else {
          this.stats[defender.side].blocks++;defender.pose='block';defender.actionPose='block';defender.poseUntil=this.time+.5;
          this._loose({...this.ball},{x:clamp(this.ball.x-dir(f.side)*(5+this._roll()*5),-88,88),y:.8,z:clamp(this.ball.z+(this._roll()*2-1)*9,-64,64)},f.side);
          this._say(`${defender.name} blocks the ${f.kind==='shot'?'shot':'pass'}`);
        }
        return;
      }
    }
    if(t<1)return;
    this.ball.flight=null;
    if(f.kind==='pass') {
      const receiver=this.players[f.receiver];
      if(this._offside(receiver,f.offside))return;
      this._give(receiver);this.stats[f.side].passesCompleted++;this.completedAttackPasses++;
      receiver.assistBonus=f.splitter?2:0;
      this.phase='buildUp';this.nextDecision=this.time+2.5;
    } else if(f.kind==='shot')this._resolveShot(f);
    else if(Math.abs(this.ball.x)>90) {
      const attacking=this.savedWideSide??f.side;this.savedWideSide=null;
      this.stats[attacking].corners++;this._restart('corner',attacking,dir(attacking)*88,this.ball.z<0?-62:62,2.8);
      this._say('A corner is awarded as both teams prepare in the box',true,'out');
    } else {this.phase='looseBall';this.looseUntil=this.time+5;}
  }

  _move(dt) {
    const carrier=this.players[this.ball.owner], attacking=carrier?.side??this.possession;
    const ball=this.ball, loose=this.phase==='looseBall';
    const hunters=[this._nearest(0,ball)[0],this._nearest(1,ball)[0]];
    const defending=attacking===null?null:1-attacking;
    const pressers=defending===null?[]:this._nearest(defending,ball);
    const supports=carrier?this.players.filter(p=>p.side===attacking&&p!==carrier&&p.role==='MF').sort((a,b)=>dist(a,carrier)-dist(b,carrier))
      .slice(0,attacking===0&&this.mentality==='counter'?1:2):[];
    const guards=carrier?this.players.filter(p=>p.side===attacking&&p!==carrier&&p.role==='DF'&&
      !(this.tactics[p.side].overlap===p.index&&this.time<(this.tactics[p.side].overlapUntil||0)))
      .sort((a,b)=>Math.abs(a.anchor.z)-Math.abs(b.anchor.z)).slice(0,3):[];
    for(const p of this.players) {
      const direction=dir(p.side), tactic=this.tactics[p.side];
      let x=p.anchor.x,z=p.anchor.z,duty='hold',speed=clamp(8+stat(p,'pace')*.06,8,17)*(.8+this.stamina[p.side]/100*.2);
      if(signature(p,'firstBurst')&&this.time-p.receivedAt<=1.5)speed=Math.min(16,speed+1.5);
      if(p.side===1&&this.isPractice)speed*=.68;
      if(p.role==='GK') {z=clamp(ball.z*.38,-10,10);x+=signature(p,'keeperSweep')?direction*(p.side===attacking?4:1.5):0;duty='goalkeeper';}
      else if(this.phase==='goalCelebration'&&p.side===this.celebration?.side) {
        x=direction*79-(p.index%3)*3*direction;z=-(45+(p.index%4)*3);duty='celebrate';
        this.celebration.stage=this.time>this.phaseUntil-1.5?'celebrate':'runToCorner';
      } else if(this.restart?.kind==='corner') {
        x=(p.side===this.restart.side?dir(p.side)*69:dir(this.restart.side)*77)+(p.index%3)*3;
        z=(p.index-5)*4;duty='prepareBox';
      } else if(loose&&p===hunters[p.side]) {x=ball.x;z=ball.z;duty='looseBall';}
      else if(carrier&&p===carrier&&this._open()) {
        const a=this._active(p);let drive=style(p)==='controller'?1.6:style(p)==='dribbler'?3:2.2;
        if(a?.id==='speedBurst')drive=6;
        x=p.x+direction*drive*2;z=p.z+Math.sin(this.time*1.1+p.index)*(a?.id==='dribbleGlue'?.12:['stepovers','sambaStep','wingWeave'].includes(a?.id)?4:style(p)==='dribbler'?2.8:.7);
        if(Math.abs(p.z)>12&&p.x*direction>35)z=p.z-Math.sign(p.z)*3;
        if(p.role==='DF')x=Math.min(x*direction,-13)*direction;
        if(p.role==='MF')x=Math.min(x*direction,49)*direction;
        speed*=.88+.12*clamp(stat(p,'attacking')/100,0,1);duty='carrier';
        const threat=pressers[0];
        if(threat&&dist(p,threat)<11&&!a)z=p.z+(p.z>=threat.z?1:-1)*6;
        if(this.duel?.attacker===this.ball.owner) {
          const q=this.duel,progress=(this.time-q.at)/1.8;
          q.phase=progress<.25?'approach':progress<.5?'feint':'exit';
          x=q.origin.x+direction*(progress<.25?1.2:progress<.5?2.6:7.5);
          z=q.origin.z+q.direction*(progress<.25?1.8:progress<.5?-1.6:4);duty='takeOn';
        }
        if(this.time<(tactic.recycleUntil||0)){x=p.x;z=p.z;duty='recycleCarrier';}
      } else if(this._open()&&p.side===attacking) {
        const shift=clamp(ball.x*direction*.28,-15,25);
        x=p.anchor.x+direction*shift;z=p.anchor.z+clamp(ball.z*.1,-7,7);
        if(guards.includes(p)||style(p)==='anchor'){x=Math.min(x*direction,ball.x*direction-15)*direction;duty='restDefence';}
        else if(supports.includes(p)) {
          const rank=supports.indexOf(p);x=clamp(ball.x*direction+(rank?7:-9),p.anchor.x*direction-18,p.anchor.x*direction+35)*direction;
          z=clamp(ball.z+(rank?13:-13),p.anchor.z-18,p.anchor.z+18);duty='support';
        } else if(p.role==='ST'||this.time<(tactic.runsUntil||0)||tactic.overlap===p.index&&this.time<(tactic.overlapUntil||0)) {
          x=Math.max(p.anchor.x*direction+shift,ball.x*direction+17)*direction;
          z=p.anchor.z;duty='runner';
        }
        if(this.activeManager&&this.time<this.activeManager.endsAt&&p.side===0) {
          if(this.activeManager.id==='triangle'&&p.role==='MF'&&!guards.includes(p)) {
            const offsets=[[-8,-13],[5,1],[-3,14]][p.index%3];x=(ball.x*direction+offsets[0])*direction;z=ball.z+offsets[1];duty='managerTriangle';
          }
          if(this.activeManager.id==='counter'&&!guards.includes(p)&&p.role==='ST') {x=(ball.x*direction+25)*direction;speed+=1.5;duty='managerOutlet';}
        }
        const line=this._onside(attacking,carrier?.index).lineX*direction;
        // Before release, supporting runs stay level; offside adjudication freezes at the kick.
        if(carrier&&p!==carrier)x=Math.min(x*direction,Math.max(ball.x*direction,line)-.7)*direction;
      } else if(this._open()&&p.side===defending) {
        const compact=this.time<(tactic.compactUntil||0),press=this.time<(tactic.pressUntil||0)||this.activeManager?.id==='surge';
        x=p.anchor.x+direction*clamp(ball.x*direction*.23,-19,12);z=p.anchor.z*(compact?.72:.9)+ball.z*.1;
        if(p===pressers[0]&&!(this.isPractice&&p.side===1&&carrier&&this.time-carrier.receivedAt<1.1)) {x=ball.x-direction*(this.time<(tactic.containUntil||0)?4:this.isPractice&&p.side===1?4.8:1.5);z=ball.z;duty='press';speed+=press?1.6:.7;}
        else if(p===pressers[1]&&!compact) {x=ball.x-direction*8;z=ball.z*.7;duty='cover';}
        else duty='shape';
      }
      const c=this.controlState;
      if(c?.index===p.index&&p.side===0&&this._open()) {
        const input=this.time-c.lastInputAt<.35?c.vector:{x:0,z:0};
        x=p.x+input.x*20;z=p.z+input.z*20;duty='controlled';
      }
      x=clamp(x,-87,87);z=clamp(z,-61,61);
      const dx=x-p.x,dz=z-p.z,gap=Math.hypot(dx,dz),desired=gap>.05?Math.min(speed,gap/dt):0;
      const targetVx=gap?dx/gap*desired:0,targetVz=gap?dz/gap*desired:0,blend=Math.min(1,dt*8);
      p.vx+=(targetVx-p.vx)*blend;p.vz+=(targetVz-p.vz)*blend;
      const travel=Math.hypot(p.vx,p.vz)*dt;
      if(travel>gap&&gap>0){p.x=x;p.z=z;p.vx=0;p.vz=0;}else{p.x=clamp(p.x+p.vx*dt,-87,87);p.z=clamp(p.z+p.vz*dt,-61,61);}
      if(Math.hypot(p.vx,p.vz)>.1)p.angle=Math.atan2(p.vz,p.vx);
      p.duty=duty;p.pose=duty==='celebrate'?'celebrate':this.duel?.attacker===this.players.indexOf(p)?'feint':Math.hypot(p.vx,p.vz)>.4?'run':'idle';
      if(this.time<(p.poseUntil||0))p.pose=p.actionPose;
    }
    // Formation actors separate, while direct-control actors retain the input route.
    for(let i=0;i<22;i++)for(let j=i+1;j<22;j++) {
      const a=this.players[i],b=this.players[j],gap=dist(a,b);
      if(gap<2.4) {
        const dx=gap>.01?(a.x-b.x)/gap:0,dz=gap>.01?(a.z-b.z)/gap:1,push=(2.4-gap)*.3;
        a.x=clamp(a.x+dx*push,-87,87);a.z=clamp(a.z+dz*push,-61,61);
        b.x=clamp(b.x-dx*push,-87,87);b.z=clamp(b.z-dz*push,-61,61);
      }
    }
    if(carrier&&this.ball.owner!==null) {
      const a=this._active(carrier),close=signature(carrier,'closeTouch')||a?.id==='dribbleGlue';
      this.ball.x=carrier.x+dir(carrier.side)*(close?.4:.85);this.ball.z=carrier.z;
      this.ball.y=carrier.role==='GK'?2.6:.8;
    }
  }
  _contacts() {
    const carrier=this.players[this.ball.owner];
    if(!carrier || carrier.role==='GK'||this.time-carrier.receivedAt<.85)return;
    for(const p of this._nearest(1-carrier.side,carrier)) {
      if(dist(p,carrier)>3.3)break;
      if(this.time<p.challengeAt)continue;
      p.challengeAt=this.time+1.7;
      const a=this._active(carrier),resistance=(signature(carrier,'closeTouch')?8:0)+
        (a?.id==='dribbleGlue'?18:['sambaStep','stepovers'].includes(a?.id)?10:a?.id==='wingWeave'?8:0);
      const control=this.controlState?.index===p.index&&p.side===0;
      const skill=(stat(carrier,'attacking')+stat(carrier,'pace'))*.5;
      let chance=clamp(.42+(stat(p,'defending')-skill)*.0042+(control?.12:0)+
        (this.time<(this.tactics[p.side].pressUntil||0)?.08:0)+(signature(p,'coverRead')?.06:0)-resistance/100-
        (this.duel?.attacker===this.ball.owner?.06:0),.18,control?.78:.65);
      if(this.isPractice&&p.side===1)chance*=.55;
      if(this._roll()<chance) {this._turnover(p,'tackle');return;}
      if(this._tryFoul(p,carrier))return;
      this._say(`${carrier.name} keeps the ball under pressure`);
    }
  }
  _auto() {
    if(this.ball.flight || this.time<this.nextDecision||this.duel)return;
    const p=this.players[this.ball.owner];if(!p)return;
    if(this.controlState&&p.side===0&&this.controlState.index===p.index)return;
    const distance=91-p.x*dir(p.side),elapsed=this.time-this.attackStarted;
    if(p.role==='ST'&&dist(this._nearest(1-p.side,p)[0],p)<12&&this.time-(p.lastDuelAt||-20)>8) {
      p.lastDuelAt=this.time;if(this._startDuel(p))return;
    }
    if(p.role==='ST'&&distance<58&&elapsed>5 || distance<35 || elapsed>17&&distance<85) {
      this._shoot();return;
    }
    this._pass(this._receiver(p));
  }
  callPlay(id) {
    if(!this._open()||this.ball.flight||this.duel)return reply(false,'Wait for open play and the ball to arrive.');
    if(this.time<this.playReadyAt)return reply(false,'Plays share a five-second cooldown.');
    const manager=MANAGERS[id];
    if(manager) {
      if(this.managerId!==manager.manager&&!(id==='counter'&&this.managerId==='elite'))return reply(false,'Equip this tactical manager before the match.');
      if(this.time<this.managerReadyAt)return reply(false,'Manager play is cooling down.');
      if((id==='surge')===(this.possession===0))return reply(false,id==='surge'?'Use this while defending.':'Win possession first.');
      if(this.stamina[0]<manager.cost)return reply(false,'Your team needs more stamina.');
      this.stamina[0]-=manager.cost;this.managerReadyAt=this.time+manager.cooldown;
      this.activeManager={id,endsAt:this.time+manager.duration};this._say(`${id==='triangle'?'Passing triangles':id==='counter'?'Counter attack':'Pressing surge'} is called`);
      return reply(true,this.commentary.text);
    }
    if(!(id in PLAYS))return reply(false,'Choose a valid play.');
    const defensive=['highPress','contain','compact','slideTackle'].includes(id);
    if(defensive===(this.possession===0))return reply(false,defensive?'Use this while defending.':'Your team needs possession.');
    if(this.stamina[0]<PLAYS[id])return reply(false,'Your team needs more stamina.');
    const p=this.players[this.ball.owner];
    if(id==='shoot'&&this.indirect)return reply(false,'The indirect free kick needs a teammate touch.');
    if(id==='dribble'&&!this._startDuel(p))return reply(false,'Move within range of an opponent first.');
    if(id==='slideTackle') {
      if(this.controlState)return reply(false,'Release direct control before calling a team tackle.');
      const tackler=this._nearest(0,this.ball)[0];
      if(!p||dist(tackler,p)>12)return reply(false,'Move a defender within tackle range.');
      tackler.pose='slide';tackler.actionPose='slide';tackler.poseUntil=this.time+1.1;
      if(dist(tackler,p)<=4&&this._roll()<clamp(.6+(stat(tackler,'defending')-stat(p,'attacking'))*.004,.25,.85))this._turnover(tackler,'tackle');
      else if(!this._tryFoul(tackler,p)) {tackler.x=clamp(tackler.x+(p.x-tackler.x)*.35,-87,87);tackler.z=clamp(tackler.z+(p.z-tackler.z)*.35,-61,61);}
    }
    if(id==='shoot')this._shoot();
    if(['throughBall','lobbedBall','recycle'].includes(id))this._pass(this._receiver(p,id==='recycle'?'recycle':'forward'),id==='lobbedBall');
    if(id==='overlap') {this.tactics[0].overlap=this.players.filter(q=>q.side===0&&q.role==='DF').sort((a,b)=>Math.abs(b.z)-Math.abs(a.z))[0].index;this.tactics[0].overlapUntil=this.time+8;}
    if(id==='forwardRuns')this.tactics[0].runsUntil=this.time+8;
    if(id==='recycle')this.tactics[0].recycleUntil=this.time+2;
    if(id==='highPress')this.tactics[0].pressUntil=this.time+8;
    if(id==='contain')this.tactics[0].containUntil=this.time+8;
    if(id==='compact')this.tactics[0].compactUntil=this.time+8;
    this.stamina[0]-=PLAYS[id];this.playReadyAt=this.time+5;
    return reply(true,`${id} called.`);
  }
  ability(id) {
    const definition=(this.options.data?.abilities||ABILITIES).find(a=>a.id===id);
    if(!definition)return reply(false,'Choose a valid superstar ability.');
    if(!this._open()||this.ball.flight||this.duel||this.possession!==0)return reply(false,'Control possession in open play first.');
    if(this.time<this.abilityReadyAt)return reply(false,'Superstar abilities share a cooldown.');
    const p=this.players.find(q=>q.side===0&&q.id===definition.playerId&&!q.borrowed);
    if(!p)return reply(false,'Select this owned superstar in your lineup.');
    if(this.stamina[0]<definition.cost)return reply(false,'Your team needs more stamina.');
    this.activeAbility={...definition,playerIndex:this.players.indexOf(p),received:this.ball.owner===this.players.indexOf(p),
      startsAt:this.time,endsAt:this.time+definition.duration+3};
    if(this.activeAbility.received)this.activeAbility.endsAt=this.time+definition.duration;
    else this._pass(p);
    this.abilityReadyAt=this.time+definition.cooldown;this.stamina[0]-=definition.cost;
    this.nextDecision=Math.max(this.nextDecision,this.time+definition.duration);
    this._say(`${p.name} activates ${definition.name}`);return reply(true,this.commentary.text);
  }
  control(index, vector={x:0,z:0}) {
    const p=this.players[index];
    if(!Number.isInteger(index)||!p||p.side!==0||p.borrowed||!p.def.isIcon||p.role==='GK')return reply(false,'Choose an owned outfield Icon.');
    if(!this._open()||this.duel||this.phase==='looseBall')return reply(false,'Wait for open play.');
    if(this.controlState&&this.controlState.index!==index)return reply(false,'Release your controlled Icon first.');
    const x=vector.x??vector.forward??0,z=vector.z??vector.lateral??0;
    if(!Number.isFinite(x)||!Number.isFinite(z))return reply(false,'Choose a valid movement direction.');
    if(!this.controlState) {
      if(this.time<this.controlReadyAt)return reply(false,'Icon control shares a twenty-second cooldown.');
      if(this.ball.flight)return reply(false,'Wait for the pass to arrive.');
      this.controlState={index,endsAt:this.time+10,vector:{x:0,z:0},lastInputAt:this.time};this.controlReadyAt=this.time+20;
      if(this.possession===0&&this.ball.owner!==index)this._pass(p);
      this._say(`You control ${p.name}`);
    }
    const length=Math.max(1,Math.hypot(x,z));this.controlState.vector={x:clamp(x,-1,1)/length,z:clamp(z,-1,1)/length};
    this.controlState.lastInputAt=this.time;return reply(true);
  }
  releaseControl() {this.controlState=null;return reply(true,'Icon control released.');}
  substitute(index, member) {
    if(this.finished||this.penalties)return reply(false,'Substitutions are closed.');
    if(this.substitutions>=5)return reply(false,'All five substitutions have been used.');
    if(this.pendingSubstitution)return reply(false,'A substitution is already queued.');
    const outgoing=this.players[index],key=member?.uid;
    const candidate=this.bench.find(p=>p.uid===key&&key);
    if(!outgoing||outgoing.side!==0||!candidate||this.usedMembers.has(key))return reply(false,'Choose an unused owned reserve from the bench.');
    const natural=candidate.stats?.naturalRole||candidate.role||candidate.def?.style?.naturalRole;
    if((outgoing.role==='GK')!==(natural==='GK'))return reply(false,'Goalkeepers must replace goalkeepers.');
    this.pendingSubstitution={index,member:clone(candidate)};
    if(!this._open()&&!this.ball.flight)this._applyPendingSubstitution();
    return reply(true,'Substitution queued for the next safe stoppage.');
  }
  _applyPendingSubstitution() {
    const pending=this.pendingSubstitution;if(!pending)return;
    const old=this.players[pending.index],p=this._actor(pending.member,0,pending.index,old.anchor);
    p.x=old.x;p.z=old.z;this.players[pending.index]=p;this.usedMembers.add(p.key);
    this.bench=this.bench.filter(q=>q.uid!==pending.member.uid);this.substitutions++;this.pendingSubstitution=null;
    this._say(`${p.name} replaces ${old.name}`);
  }
  _startPenalties() {
    this.phase='penalties';this.possession=null;this.ball.owner=null;this.ball.flight=null;
    const selections=[0,1].map(side=>this.players.filter(p=>p.side===side&&p.role!=='GK')
      .sort((a,b)=>Number(a.borrowed)-Number(b.borrowed)||stat(b,'attacking')-stat(a,'attacking')||a.index-b.index).slice(0,5).map(p=>this.players.indexOf(p)));
    this.penalties={phase:'positioning',turn:0,scores:[0,0],taken:[0,0],saves:[0,0],history:[],
      manual:false,selections};this._nextPenalty();
    this._say('Extra time finishes level and the penalty shootout begins',true);
  }
  _nextPenalty() {
    const p=this.penalties;p.turn++;p.side=(p.turn-1)%2;p.round=Math.floor((p.turn-1)/2)+1;
    p.shooter=p.selections[p.side][p.taken[p.side]%p.selections[p.side].length];
    p.keeper=this.players.findIndex(q=>q.side!==p.side&&q.role==='GK');
    p.phase='positioning';p.until=this.time+2.1;p.direction=null;p.saveDirection=null;p.outcome=null;p.shoot=false;
    this.ball.owner=null;this.ball.flight=null;
  }
  penaltyInput({direction,saveDirection,manual,shoot}={}) {
    const p=this.penalties;if(!p||this.finished)return reply(false,'Penalty controls are unavailable.');
    if(typeof manual==='boolean')p.manual=manual;
    const directions=['left','center','right'];
    if(direction!==undefined) {
      if(p.side!==0||p.phase!=='setup'||!directions.includes(direction))return reply(false,'Choose an aim during your penalty setup.');
      p.direction=direction;
    }
    if(saveDirection!==undefined) {
      if(p.side!==1||!['setup','flight'].includes(p.phase)||p.phase==='flight'&&this.time>p.reactUntil||!directions.includes(saveDirection))return reply(false,'Choose a valid save direction before the reaction window closes.');
      p.saveDirection=saveDirection;
    }
    if(shoot) {
      if(p.side!==0||p.phase!=='setup'||this.time<p.ballReadyAt)return reply(false,'Wait until the ball is ready.');
      p.shoot=true;
    }
    return reply(true);
  }
  _penaltyKick() {
    const p=this.penalties,directions=['left','center','right'];
    p.direction=p.direction||directions[Math.floor(this._roll()*3)];p.saveDirection=p.saveDirection||directions[Math.floor(this._roll()*3)];
    p.phase='flight';p.until=this.time+1.42;p.reactUntil=this.time+.67;
    p.accuracyRoll=this._roll();p.saveRoll=this._roll();
    this.ball.owner=null;this.ball.flight={kind:'penalty',from:{x:68,y:.8,z:0},
      to:{x:91,y:1.5,z:{left:-8,center:0,right:8}[p.direction]},elapsed:-.32,duration:1.1,height:1,side:p.side};
    this._say(`${this.players[p.shooter].name} takes penalty ${p.round}`);
  }
  _penaltyWinner() {
    const p=this.penalties;
    for(let side=0;side<2;side++)if(p.taken[0]<=5&&p.taken[1]<=5&&p.scores[side]>p.scores[1-side]+Math.max(0,5-p.taken[1-side]))return side;
    if(p.taken[0]===p.taken[1]&&p.taken[0]>=5) {
      if(p.scores[0]!==p.scores[1])return p.scores[0]>p.scores[1]?0:1;
      if(p.taken[0]>=10)return -1;
    }
    return null;
  }
  _stepPenalties(dt) {
    const p=this.penalties;
    for(const actor of this.players) {
      const active=this.players.indexOf(actor)===p.shooter,keeper=this.players.indexOf(actor)===p.keeper;
      const x=active?68:keeper?88:-12-(actor.index%3)*5,z=active||keeper?0:(actor.side===0?-1:1)*(8+Math.floor(actor.index/3)*6);
      const gap=Math.hypot(x-actor.x,z-actor.z),step=Math.min(gap,dt*24);
      if(gap){actor.x+=(x-actor.x)/gap*step;actor.z+=(z-actor.z)/gap*step;actor.angle=Math.atan2(z-actor.z,x-actor.x);}
      actor.pose=gap>1?'run':keeper&&p.phase==='flight'?'dive':'idle';
    }
    if(p.phase==='positioning'&&this.time>=p.until) {
      p.phase='setup';p.until=this.time+4;p.ballReadyAt=this.time+.7;
      this.ball.x=68;this.ball.y=.8;this.ball.z=0;this._say(`${this.players[p.shooter].name} prepares penalty ${p.round}`);
    } else if(p.phase==='setup'&&this.time>=p.ballReadyAt&&(p.shoot||this.time>=p.until))this._penaltyKick();
    else if(p.phase==='flight') {
      const f=this.ball.flight;f.elapsed+=dt;const t=clamp(f.elapsed/f.duration,0,1);
      this.ball.x=f.from.x+(f.to.x-f.from.x)*t;this.ball.z=f.to.z*t;this.ball.y=.8+Math.sin(Math.PI*t)*f.height;
      if(this.time>=p.until) {
        const difference=stat(this.players[p.shooter],'attacking')-stat(this.players[p.keeper],'goalkeeping');
        const accuracy=clamp(.93+difference*.0004,.86,.97);
        const goalChance=p.direction===p.saveDirection?clamp(.48+difference*.003,.25,.68):clamp(.9+difference*.001,.78,.96);
        p.outcome=p.accuracyRoll>accuracy?'miss':p.saveRoll<goalChance?'goal':'save';
        p.taken[p.side]++;this.stats[p.side].penaltyTaken++;
        if(p.outcome==='goal'){p.scores[p.side]++;this.stats[p.side].penaltyGoals++;this.players[p.shooter].pose='celebrate';}
        else if(p.outcome==='save'){p.saves[1-p.side]++;this.stats[1-p.side].penaltySaves++;this._give(this.players[p.keeper]);}
        else this.ball.z=(p.direction==='left'?-1:1)*15;
        p.history.push({side:p.side,result:p.outcome,direction:p.direction,saveDirection:p.saveDirection,turn:p.turn,round:p.round});
        this.ball.flight=null;p.phase='result';p.until=this.time+1.1;
        this._say(p.outcome==='goal'?'Penalty scored':p.outcome==='save'?'Penalty saved':'Penalty missed',true,
          p.outcome==='goal'?'goal':p.outcome==='save'?'save':'out');
      }
    } else if(p.phase==='result'&&this.time>=p.until) {
      const winner=this._penaltyWinner();if(winner!==null){p.phase='finished';p.winner=winner;this._finish(winner);}else this._nextPenalty();
    }
  }
  _periodBoundary() {
    this.releaseControl();this.duel=null;this.activeAbility=null;this.activeManager=null;
    if(this.period==='regulation'&&this.score[0]!==this.score[1]||this.period==='extra2'&&this.score[0]!==this.score[1]) {
      this._finish(this.score[0]>this.score[1]?0:1);return;
    }
    if(this.period==='extra2'){this._startPenalties();return;}
    this.period=this.period==='regulation'?'extra1':'extra2';this.periodElapsed=0;this.periodDuration=15;
    this.phase='periodBreak';this.phaseUntil=this.time+4;this.ball.flight=null;this.ball.owner=null;
    this._say(`Extra time half ${this.period==='extra1'?1:2} follows a short break`,true);
  }
  _finish(winner) {
    if(this.finished)return;
    this.finished=true;this.phase='finished';this.ball.flight=null;this.ball.owner=null;this.possession=null;this.releaseControl();
    const label=winner===0?'win':winner===1?'loss':'draw',reward=this._reward(label);
    const total=this.stats[0].possessionSeconds+this.stats[1].possessionSeconds;
    const report=this.stats.map((s,i)=>({...s,possessionPercent:total?Math.round(s.possessionSeconds/total*100):0,
      passAccuracy:s.passesAttempted?Math.round(s.passesCompleted/s.passesAttempted*100):0}));
    if(total)report[1].possessionPercent=100-report[0].possessionPercent;
    this._say(winner===0?'Your team wins the match':winner===1?'The opposition wins the match':'The shootout finishes level after ten kicks each',true,'fullTime');
    this.result={result:label,outcome:label,won:winner===0,winner:winner<0?null:winner,score:[...this.score],reward:reward.total,
      rewardBreakdown:reward,stats:report,home:report[0],away:report[1],penalties:this.penalties?clone(this.penalties):null,
      period:this.period,elapsed:this.time,events:clone(this.events),injuries:[...this.injuryUIDs]};
  }
  _step(dt) {
    this.time+=dt;
    if(this.controlState&&this.time>=this.controlState.endsAt)this.releaseControl();
    if(this.activeAbility&&this.time>=this.activeAbility.endsAt)this.activeAbility=null;
    if(this.activeManager&&this.time>=this.activeManager.endsAt)this.activeManager=null;
    if(this.penalties){this._stepPenalties(dt);return;}
    if(this.phase!=='periodBreak')this.periodElapsed+=dt;
    const draining=this.periodElapsed>=this.periodDuration;
    if(draining&&this.ball.flight) {
      this.phase='periodBoundary';this.releaseControl();this._stepFlight(dt,true);return;
    }
    if(draining){this._periodBoundary();return;}
    if(this.ball.owner!==null&&this._open())this.stats[this.players[this.ball.owner].side].possessionSeconds+=dt;
    this.stamina=this.stamina.map((s,side)=>clamp(s+dt*(this._open()?(side===0&&this.mentality==='pressing'?-.2:-.06):.35),0,100));
    this._move(dt);
    if(this.ball.flight){this._stepFlight(dt);return;}
    if(this.phase==='periodBreak'&&this.time>=this.phaseUntil) {
      this.phase='kickoff';this.phaseUntil=this.time+1.3;
      const side=this.period==='extra1'?0:1;this._give(this.players[side*11+1]);return;
    }
    if(this.phase==='kickoff'&&this.time>=this.phaseUntil) {
      this.phase='buildUp';this.attackStarted=this.time;this.nextDecision=this.time+3.4;return;
    }
    if(this.phase==='goalCelebration'&&this.time>=this.phaseUntil) {
      const side=1-this.celebration.side;this.celebration=null;
      this.players.forEach(p=>{p.x=p.anchor.x;p.z=p.anchor.z;p.pose='idle';});
      this._give(this.players[side*11+1]);this.phase='kickoff';this.phaseUntil=this.time+1.5;
      this.attackStarted=this.time;this.completedAttackPasses=0;return;
    }
    if(this.restart&&this.time>=this.phaseUntil) {
      const r=this.restart;this.restart=null;
      const p=r.kind==='goalKick'?this.players.find(q=>q.side===r.side&&q.role==='GK'):this._nearest(r.side,r)[0];
      // The taker walks to the restart spot during its bounded setup.
      p.x=r.x;p.z=r.z;this._give(p);this.phase='buildUp';this.attackStarted=this.time;this.completedAttackPasses=0;
      this._pass(this._receiver(p),r.kind==='corner',r.kind);return;
    }
    if(this.phase==='keeperRestart'&&this.time>=this.phaseUntil) {
      this.phase='buildUp';this.attackStarted=this.time;this.completedAttackPasses=0;this.nextDecision=this.time+.4;
    }
    if(this.phase==='looseBall') {
      const nearest=this.players.filter(p=>p.role!=='GK').sort((a,b)=>dist(a,this.ball)-dist(b,this.ball))[0];
      if(dist(nearest,this.ball)<2.8||this.time>=this.looseUntil) {
        if(this._offside(nearest))return;this._turnover(nearest,'recovery');
      }return;
    }
    if(this.duel&&this.time>=this.duel.endsAt) {
      const q=this.duel,p=this.players[q.attacker],defender=this.players[q.defender];
      if(dist(p,defender)>4||(p.x-defender.x)*dir(p.side)>1.5) {
        this.stats[p.side].dribblesWon++;this._say(`${p.name} beats the defender`);
      }else this._say(`${defender.name} contains the dribble`);
      this.duel=null;this.phase='buildUp';this.nextDecision=this.time+.6;
    }
    if(this._open()){this._contacts();this._auto();}
  }
  update(dt) {
    if(this.finished||!Number.isFinite(dt)||dt<=0)return this.snapshot();
    // A stalled tab cannot launch hundreds of seconds of catch-up work in one frame.
    let remaining=Math.min(dt,10);
    while(remaining>1e-8&&!this.finished){const step=Math.min(remaining,.05);this._step(step);remaining-=step;}
    return this.snapshot();
  }
  snapshot() {
    const abilities=(this.options.data?.abilities||ABILITIES).map(a=>{
      const star=this.players.find(p=>p.side===0&&p.id===a.playerId&&!p.borrowed);
      return {...a,available:!!star&&this._open()&&this.possession===0&&!this.ball.flight&&!this.duel&&this.time>=this.abilityReadyAt,
        cooldown:Math.max(0,this.abilityReadyAt-this.time),active:this.activeAbility?.id===a.id,
        remaining:this.activeAbility?.id===a.id?Math.max(0,this.activeAbility.endsAt-this.time):0};
    });
    return clone({players:this.players,ball:this.ball,phase:this.phase,score:this.score,finished:this.finished,result:this.result,
      commentary:this.commentary,events:this.events,period:this.period,elapsed:this.time,timeRemaining:Math.max(0,this.periodDuration-this.periodElapsed),
      possession:this.possession,stats:this.stats,stamina:this.stamina,formation:this.formation,mentality:this.mentality,
      cooldowns:{plays:Math.max(0,this.playReadyAt-this.time),ability:Math.max(0,this.abilityReadyAt-this.time),
        control:Math.max(0,this.controlReadyAt-this.time),manager:Math.max(0,this.managerReadyAt-this.time)},
      control:this.controlState,abilities,activeAbility:this.activeAbility,activeManager:this.activeManager,
      duel:this.duel,offside:this.offsidePhase,indirect:this.indirect,restart:this.restart,celebration:this.celebration,
      penalties:this.penalties,bench:this.bench,substitutions:{used:this.substitutions,max:5,pending:this.pendingSubstitution}});
  }
}

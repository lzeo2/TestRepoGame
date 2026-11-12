// Court-local units: x [-90,90], z [-65,65]; rims at (+/-82,10,0).
const STEP = .05, RIM = 82, ARC = 44, ROLES = ['PG','SG','SF','PF','C'];
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const finite = (n,fallback=0) => Number.isFinite(n)?n:fallback;
const clone = value => JSON.parse(JSON.stringify(value));
const direction = side => side===0?1:-1;
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const reply = (ok,message='') => ({ok,message});
const rating = (p,key) => clamp(finite(p.stats[key],p.power),0,130);
const PLAYS = {pass:3,drive:5,shoot:4,three:5,press:7,zone:4,steal:6,block:6,pickRoll:6,triangle:7,counter:7,surge:9};
const DEFENSIVE = ['press','zone','steal','block','surge'];
const ABILITIES = [{id:'hotHand',name:'Hot Hand',duration:7,cooldown:25,cost:10},
  {id:'quickHandle',name:'Quick Handle',duration:7,cooldown:25,cost:10}];
const newStats = () => ({points:0,shots:0,fieldGoalsMade:0,twoPointersMade:0,threePointersAttempted:0,
  threePointersMade:0,freeThrowsAttempted:0,freeThrowsMade:0,passesAttempted:0,passesCompleted:0,
  assists:0,possessionSeconds:0,steals:0,interceptions:0,blocks:0,rebounds:0,offensiveRebounds:0,
  fouls:0,turnovers:0,shotClockViolations:0,dribblesAttempted:0,dribblesWon:0});

export class Match {
  constructor(home=[],away=[],options={}) {
    this.options=options;this.seed=(finite(options.seed,1)>>>0)||1;
    this.ticks=0;this.accumulator=0;this.time=0;this.periodElapsed=0;
    // Arcade quarters run for 30 live seconds, with all basketball clocks visibly at 3x.
    this.clockRate=clamp(finite(options.clockRate,3),1,6);
    this.periodDuration=clamp(finite(options.quarterDuration,90),6,180);
    this.overtimeDuration=clamp(finite(options.overtimeDuration,45),6,90);
    this.quarter=1;this.overtime=0;this.period='Q1';this.horn=false;
    this.phase='inbound';this.phaseUntil=.7;this.score=[0,0];this.finished=false;this.result=null;
    this.ball={x:0,y:.84,z:0,radius:.84,owner:null,flight:null};
    this.players=[];this.stats=[newStats(),newStats()];this.stamina=[100,100];
    this.formation=['balanced','spread','inside'].includes(options.formation)?options.formation:'balanced';
    this.mentality=['balanced','counter','pressing'].includes(options.mentality)?options.mentality:'balanced';
    this.isPractice=options.practice===true;this.injuryUIDs=new Set();
    this.commentary={serial:0,text:'Five on five. Home has the opening possession.',important:true,kind:'tipoff'};
    this.events=[];this.celebration=null;this.controlState=null;this.controlReadyAt=0;
    this.playReadyAt=0;this.abilityReadyAt=0;this.activeAbility=null;
    this.tactics=[{},{}];this.substitutions=0;this.pendingSubstitution=null;
    this.usedMembers=new Set();this.teamFouls=[0,0];this.freeThrows=null;this.lastPass=null;
    for(let side=0;side<2;side++)for(let index=0;index<5;index++) {
      const member=[home,away][side][index]||{id:`academy_${side}_${index}`,name:`Academy ${ROLES[index]}`,borrowed:true,power:35};
      const actor=this._actor(member,side,index);this.players.push(actor);
      if(side===0)this.usedMembers.add(actor.key);
    }
    this.bench=clone((options.bench||home.slice(5,12)).slice(0,7));
    const owned=home.slice(0,5).filter(p=>!p.borrowed);
    const average=owned.reduce((s,p)=>s+clamp(finite(p.power,40),20,130),0)/Math.max(1,owned.length);
    this.rewardScaling={ownedPlayers:owned.length,averageSkill:average,
      multiplier:Math.min(2.5,1+Math.max(0,average-20)*.01*owned.length/5),incomeRate:clamp(finite(options.incomeRate),0,1000000)};
    this.possession=0;this.shotClock=24;this.attackStarted=0;this.nextDecision=2;
    this._inbound(0,.7,false);
  }

  _actor(member,side,index) {
    const def=clone(member.def||{}),stats=clone(member.stats||def.stats||{});
    const role=ROLES.includes(stats.naturalRole)?stats.naturalRole:ROLES.includes(member.role)?member.role:ROLES[index];
    const power=finite(member.power,finite(stats.power,40));
    for(const key of ['shooting','handling','passing','defense','rebounding','stamina'])stats[key]=clamp(finite(stats[key],power),0,130);
    stats.naturalRole=role;
    return {id:member.id||def.id||`academy_${side}_${index}`,uid:member.uid||null,
      key:member.uid||`${side}:${index}:${member.id||'academy'}`,name:member.name||def.name||'Basketballer',
      side,index,role,roleLabel:role,power,stats,def,borrowed:!!member.borrowed,
      x:0,z:0,angle:side===0?0:Math.PI,pose:'idle',speed:0,fatigue:0,fouls:0};
  }
  _roll() {this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0;return this.seed/4294967296;}
  _say(text,important=false,kind='commentary') {
    this.commentary={serial:this.commentary.serial+1,text:text.replace(/[.!?]+$/,'')+'.',important,kind};
    this.events.push({time:this.time,side:this.possession,...this.commentary});
    if(this.events.length>80)this.events.shift();
  }
  _nearest(side,point) {
    return this.players.filter(p=>p.side===side).sort((a,b)=>distance(a,point)-distance(b,point)||a.index-b.index)[0];
  }
  _live() {return ['live','pass','shot','rebound'].includes(this.phase);}
  _give(p,reset=false) {
    this.ball.owner=this.players.indexOf(p);this.ball.flight=null;this.possession=p.side;
    this.ball.x=p.x+direction(p.side);this.ball.z=p.z;this.ball.y=2.7;
    if(reset){this.shotClock=24;this.attackStarted=this.time;this.lastPass=null;}
    this.nextDecision=this.time+1.1;this.phase='live';
  }
  _inbound(side,delay=.7,announce=true) {
    this._applySubstitution();this.celebration=null;this.freeThrows=null;
    this.possession=side;this.shotClock=24;this.lastPass=null;this.attackStarted=this.time;
    this.players.forEach(p=>{
      const own=p.side===side,d=direction(side);
      p.x=(own?[-60,-34,-30,-14,-8][p.index]:[-8,4,10,20,27][p.index])*d;
      p.z=[0,-40,40,-19,19][p.index];p.pose='idle';p.speed=0;
    });
    this._give(this.players[side*5],true);this.phase='inbound';this.phaseUntil=this.time+delay;
    if(announce)this._say(`${side===0?'Home':'Away'} inbounds with 24 on the shot clock`,false,'inbound');
  }
  _turnover(winner,kind='steal') {
    const losing=this.possession;this.stats[losing].turnovers++;
    if(kind==='steal'){this.stats[winner.side].steals++;winner.pose='steal';}
    if(kind==='interception'){this.stats[winner.side].interceptions++;this.stats[winner.side].steals++;}
    this._give(winner,true);
    this._say(`${winner.name} ${kind==='interception'?'intercepts the pass':'steals the ball'}`,true,kind);
  }
  _receiver(p,mode='pass') {
    return this.players.filter(q=>q.side===p.side&&q!==p).sort((a,b)=>{
      const value=q=>rating(q,mode==='pickRoll'?'rebounding':'shooting')*.1+
        Math.min(15,distance(q,this._nearest(1-p.side,q)))+(mode==='three'?(distance(q,{x:RIM*direction(p.side),z:0})>=ARC?30:-30):0);
      return value(b)-value(a)||a.index-b.index;
    })[0];
  }
  _pass(receiver,thenShot=false) {
    const p=this.players[this.ball.owner];if(!p||this.ball.flight||!receiver)return false;
    const duration=clamp(distance(p,receiver)/70,.3,.85);
    this.ball.flight={kind:'pass',from:{x:this.ball.x,y:3,z:this.ball.z},to:{x:receiver.x,y:3,z:receiver.z},
      elapsed:0,duration,height:1.8,side:p.side,receiver:this.players.indexOf(receiver),shooter:this.players.indexOf(p),thenShot};
    this.ball.owner=null;this.phase='pass';this.stats[p.side].passesAttempted++;
    p.pose='pass';p.poseUntil=this.time+.4;this._say(`${p.name} passes to ${receiver.name}`,false,'pass');return true;
  }
  _shoot(free=false) {
    const p=this.players[this.ball.owner];if(!p||this.ball.flight)return false;
    const d=direction(p.side),rim={x:RIM*d,z:0},range=distance(p,rim);
    const points=free?1:range>=ARC?3:2,defender=this._nearest(1-p.side,p),gap=distance(p,defender);
    const boosted=this.activeAbility?.playerIndex===this.ball.owner&&this.time<this.activeAbility.endsAt;
    const chance=free?clamp(.48+rating(p,'shooting')*.004,.45,.94):clamp(.38+rating(p,'shooting')*.004-
      (points===3?.2:0)-Math.max(0,range-30)*.003-Math.max(0,12-gap)*.02-p.fatigue*.001+(boosted?.13:0),.08,.88);
    const blockChance=free?0:gap<12?clamp(.04+rating(defender,'defense')*.001+(this.tactics[defender.side].blockUntil>this.time?.2:0),0,.35):0;
    const blocked=!free&&this._roll()<blockChance;
    const made=!blocked&&this._roll()<chance;
    const stat=this.stats[p.side];if(free)stat.freeThrowsAttempted++;else {stat.shots++;if(points===3)stat.threePointersAttempted++;}
    if(blocked){this.stats[defender.side].blocks++;defender.pose='block';defender.poseUntil=this.time+.7;}
    this.ball.flight={kind:free?'freeThrow':'shot',from:{x:p.x,y:5.5,z:p.z},to:{x:rim.x,y:10,z:0},
      elapsed:0,duration:free?.85:clamp(range/52,.6,1.35),height:free?8:12,
      side:p.side,shooter:this.ball.owner,points,made,blocked,defender:this.players.indexOf(defender)};
    this.ball.owner=null;this.phase=free?'freeThrow':'shot';p.pose='shoot';p.poseUntil=this.time+.8;
    this._say(`${p.name} releases ${free?'a free throw':points===3?'a three-pointer':'a two-point shot'}`,false,'shot');return true;
  }
  _foul(defender,shooter,shooting=false) {
    defender.fouls++;this.stats[defender.side].fouls++;this.teamFouls[defender.side]++;
    // Keep a queued shooter's substitution pending until the free-throw sequence is over.
    // ponytail: no disqualifications or injury lottery; short arcade games keep five actors per side.
    if(shooting||this.teamFouls[defender.side]>=5) {
      const count=shooting&&distance(shooter,{x:RIM*direction(shooter.side),z:0})>=ARC?3:2;
      this.freeThrows={shooter:this.players.indexOf(shooter),remaining:count,total:count};
      shooter.x=57*direction(shooter.side);shooter.z=0;this._give(shooter);
      this.phase='freeThrowSetup';this.phaseUntil=this.time+.7;
      this._say(`${defender.name} fouls ${shooter.name}: ${count} free throws`,true,'foul');
    } else {
      const side=shooter.side;this._inbound(side,.7,false);
      this._say(`${defender.name} commits a reach-in foul; possession retained`,true,'foul');
    }
  }
  _challenge(forced=false) {
    const p=this.players[this.ball.owner];if(!p)return;
    const defender=this._nearest(1-p.side,p),gap=distance(p,defender);
    if(gap>(forced?18:10))return;
    const press=this.tactics[defender.side].pressUntil>this.time||(defender.side===0&&this.mentality==='pressing');
    if(this._roll()<(forced?.18:press?.1:.05)){this._foul(defender,p,false);return;}
    const boosted=this.activeAbility?.id==='quickHandle'&&this.activeAbility.playerIndex===this.ball.owner;
    if(this._roll()<clamp((forced?.45:press?.16:.08)+(rating(defender,'defense')-rating(p,'handling'))*.003-(boosted?.18:0),.02,.8))this._turnover(defender);
  }
  _rebound(side,blocked=false) {
    const rim={x:RIM*direction(side),z:0};
    const candidates=this.players.slice().sort((a,b)=>{
      const weight=p=>rating(p,'rebounding')*.55-distance(p,rim)*1.3+(p.side===side?0:12);
      return weight(b)-weight(a)||a.side-b.side||a.index-b.index;
    }).slice(0,4);
    const weights=candidates.map(p=>Math.max(1,rating(p,'rebounding')+30-distance(p,rim))),sum=weights.reduce((a,b)=>a+b,0);
    let roll=this._roll()*sum,winner=candidates[0];
    for(let i=0;i<candidates.length;i++){roll-=weights[i];if(roll<=0){winner=candidates[i];break;}}
    this.stats[winner.side].rebounds++;
    if(winner.side===side)this.stats[side].offensiveRebounds++;
    this._give(winner,winner.side!==side);this.lastPass=null;if(winner.side===side)this.shotClock=14;
    winner.pose='rebound';winner.poseUntil=this.time+.5;
    this._say(`${blocked?'Blocked shot. ':''}${winner.name} takes the ${winner.side===side?'offensive':'defensive'} rebound`,true,'rebound');
  }
  _finishShot(flight) {
    const p=this.players[flight.shooter],s=this.stats[flight.side],free=flight.kind==='freeThrow';
    if(flight.made) {
      this.score[flight.side]+=flight.points;s.points+=flight.points;
      if(free)s.freeThrowsMade++;
      else {s.fieldGoalsMade++;if(flight.points===3)s.threePointersMade++;else s.twoPointersMade++;
        if(this.lastPass?.receiver===flight.shooter&&this.time-this.lastPass.time<4)s.assists++;}
      this._say(`${p.name} scores ${flight.points===1?'a free throw':flight.points+' points'}${flight.points===3?' from beyond the arc':''}`,true,'basket');
    } else this._say(`${p.name}'s ${free?'free throw':'shot'} ${flight.blocked?'is blocked':'misses the rim target'}`,false,flight.blocked?'block':'miss');
    if(free&&--this.freeThrows.remaining>0) {
      this._give(p);this.phase='freeThrowSetup';this.phaseUntil=this.time+.5;return;
    }
    this.freeThrows=null;
    if(flight.made) {
      this._applySubstitution();this.celebration={side:flight.side,scorer:p.name,scorerIndex:flight.shooter,points:flight.points,endsAt:this.time+.9};
      this.phase='basketCelebration';this.phaseUntil=this.time+.9;
    } else {
      this.phase='rebound';this.phaseUntil=this.time+.45;this.reboundSide=flight.side;this.reboundBlocked=flight.blocked;
      this.ball.x=flight.to.x-direction(flight.side)*3;this.ball.y=5;this.ball.z=3;
    }
  }
  _flight() {
    const f=this.ball.flight;f.elapsed+=STEP;const t=Math.min(1,f.elapsed/f.duration);
    this.ball.x=f.from.x+(f.to.x-f.from.x)*t;this.ball.z=f.from.z+(f.to.z-f.from.z)*t;
    this.ball.y=f.from.y+(f.to.y-f.from.y)*t+Math.sin(t*Math.PI)*f.height;
    if(t<1)return;
    this.ball.flight=null;
    if(f.kind!=='pass'){this._finishShot(f);return;}
    const receiver=this.players[f.receiver],passer=this.players[f.shooter],defender=this._nearest(1-f.side,receiver);
    const chance=distance(defender,receiver)<12?clamp(.15+(rating(defender,'defense')-rating(passer,'passing'))*.002,.02,.4):.01;
    if(this._roll()<chance){this._turnover(defender,'interception');return;}
    this.stats[f.side].passesCompleted++;this._give(receiver);this.lastPass={receiver:f.receiver,time:this.time};
    if(f.thenShot)this.nextDecision=this.time+.2;
  }
  _move() {
    const owner=this.players[this.ball.owner],d=direction(this.possession);
    this.players.forEach(p=>{
      let target={x:p.x,z:p.z};const own=p.side===this.possession;
      const spacing=this.formation==='spread'?1.2:this.formation==='inside'?.7:1;
      if(own) {
        target={x:[38,48,48,66,72][p.index]*d,z:[0,-39,39,-17,17][p.index]*spacing};
        if(owner===p)target={x:(this.tactics[p.side].driveUntil>this.time||(p.side===0&&this.mentality==='counter')?75:55)*d,z:p.z*.7};
        if(this.tactics[p.side].pickUntil>this.time&&p.role==='C')target={x:70*d,z:3};
      } else {
        const marked=this.players[this.possession*5+p.index];
        const zone=this.tactics[p.side].zoneUntil>this.time;
        target=zone?{x:[48,48,58,70,70][p.index]*d,z:[-28,28,0,-15,15][p.index]}:
          {x:marked.x+d*6,z:marked.z*.95};
        if(owner&&(this.tactics[p.side].pressUntil>this.time||(p.side===0&&this.mentality==='pressing'))&&distance(p,owner)<28)target={x:owner.x,z:owner.z};
      }
      let dx=target.x-p.x,dz=target.z-p.z;
      if(this.controlState?.index===this.players.indexOf(p)) {
        dx=this.controlState.vector.x*50;dz=this.controlState.vector.z*50;
      }
      const len=Math.hypot(dx,dz),speed=(owner===p?25:22)*(1-p.fatigue*.002),step=Math.min(len,speed*STEP);
      if(len>.01){p.x=clamp(p.x+dx/len*step,-87,87);p.z=clamp(p.z+dz/len*step,-62,62);p.angle=Math.atan2(dz,dx);}
      p.speed=step/STEP;p.fatigue=clamp(p.fatigue+STEP*(.12+(100-rating(p,'stamina'))*.001),0,100);
      if(this.time>=finite(p.poseUntil))p.pose=owner===p?'dribble':step>.02?'run':'idle';
    });
    if(owner&&!this.ball.flight) {
      this.ball.x=owner.x+d*1.3;this.ball.z=owner.z+1;
      this.ball.y=.84+Math.abs(Math.sin(this.time*11))*2.3;
    }
  }
  _auto() {
    if(this.time<this.nextDecision)return;
    const p=this.players[this.ball.owner];if(!p)return;
    this._challenge();if(this.ball.owner!==this.players.indexOf(p)||this.phase!=='live')return;
    const range=distance(p,{x:RIM*direction(p.side),z:0});
    if(this.shotClock<5||range<36||this.time-this.attackStarted>5.3) {
      const defender=this._nearest(1-p.side,p);
      if(distance(p,defender)<12&&this._roll()<.12){this._foul(defender,p,true);return;}
      this._shoot();return;
    }
    if(this.controlState?.index===this.ball.owner){this.nextDecision=this.time+.5;return;}
    if(this._roll()<.56||this.tactics[p.side].triangleUntil>this.time)this._pass(this._receiver(p));
    else {this.stats[p.side].dribblesAttempted++;this.stats[p.side].dribblesWon++;this.nextDecision=this.time+1.1;}
  }
  callPlay(id) {
    if(typeof id!=='string'||!Object.hasOwn(PLAYS,id))return reply(false,'Choose a basketball play.');
    if(this.finished||!this._live()||this.ball.flight||this.phase==='rebound')return reply(false,'Wait for live possession.');
    if(this.time<this.playReadyAt)return reply(false,'Plays share a two-second cooldown.');
    const defensive=DEFENSIVE.includes(id);
    if(defensive===(this.possession===0))return reply(false,defensive?'Use this while defending.':'Win possession first.');
    if(this.stamina[0]<PLAYS[id])return reply(false,'Your team needs more stamina.');
    const p=this.players[this.ball.owner];
    if(id==='three'&&distance(p,{x:RIM,z:0})<ARC) {
      const receiver=this._receiver(p,'three');
      if(distance(receiver,{x:RIM,z:0})<ARC)return reply(false,'Move a shooter beyond the three-point arc.');
      this._pass(receiver,true);
    } else if(id==='shoot'||id==='three')this._shoot();
    else if(id==='pass'||id==='pickRoll'||id==='triangle') {
      if(id==='pickRoll')this.tactics[0].pickUntil=this.time+7;
      if(id==='triangle')this.tactics[0].triangleUntil=this.time+7;
      this._pass(this._receiver(p,id));
    } else if(id==='drive'||id==='counter') {
      this.tactics[0].driveUntil=this.time+6;this.stats[0].dribblesAttempted++;
      this.nextDecision=this.time+1.5;this._say(`${p.name} drives toward the basket`,false,'dribble');
    } else if(id==='steal')this._challenge(true);
    else if(id==='block'){this.tactics[0].blockUntil=this.time+6;this._say('Home contests the next shot',false,'block');}
    else {this.tactics[0][id==='zone'?'zoneUntil':'pressUntil']=this.time+7;this._say(`Home calls ${id}`,false,'tactic');}
    this.stamina[0]-=PLAYS[id];this.playReadyAt=this.time+2;
    return reply(true,this.commentary.text);
  }
  _abilityDefinitions() {
    return (this.options.data?.abilities?.length?this.options.data.abilities:ABILITIES).filter(a=>a&&typeof a.id==='string');
  }
  ability(id) {
    const a=this._abilityDefinitions().find(a=>a.id===id);
    if(!a)return reply(false,'Choose a basketball ability.');
    if(this.finished||this.phase!=='live'||this.possession!==0||this.ball.flight)return reply(false,'Control live possession first.');
    if(this.time<this.abilityReadyAt)return reply(false,'Abilities share a cooldown.');
    const p=a.playerId?this.players.find(p=>p.side===0&&p.id===a.playerId&&!p.borrowed):this.players[this.ball.owner];
    if(!p)return reply(false,'Put this player in the starting five.');
    const cost=clamp(finite(a.cost,10),0,50);if(this.stamina[0]<cost)return reply(false,'Your team needs more stamina.');
    this.activeAbility={...a,playerIndex:this.players.indexOf(p),endsAt:this.time+clamp(finite(a.duration,7),1,15)};
    this.abilityReadyAt=this.time+clamp(finite(a.cooldown,25),10,60);this.stamina[0]-=cost;
    if(this.ball.owner!==this.players.indexOf(p))this._pass(p);
    this._say(`${p.name} activates ${a.name||a.id}`,true,'ability');return reply(true,this.commentary.text);
  }
  control(index,vector={x:0,z:0}) {
    const p=this.players[index],x=vector?.x??vector?.forward??0,z=vector?.z??vector?.lateral??0;
    if(!Number.isInteger(index)||!p||p.side!==0)return reply(false,'Choose one of your five players.');
    if(!Number.isFinite(x)||!Number.isFinite(z))return reply(false,'Choose a finite movement direction.');
    if(this.finished||!this._live())return reply(false,'Wait for live play.');
    if(this.controlState&&this.controlState.index!==index)return reply(false,'Release the current player first.');
    if(!this.controlState) {
      if(this.time<this.controlReadyAt)return reply(false,'Player control is cooling down.');
      this.controlState={index,endsAt:this.time+10,vector:{x:0,z:0}};this.controlReadyAt=this.time+20;
    }
    const len=Math.max(1,Math.hypot(x,z));this.controlState.vector={x:x/len,z:z/len};return reply(true);
  }
  releaseControl() {this.controlState=null;return reply(true,'Player control released.');}
  substitute(index,member) {
    if(this.finished)return reply(false,'The match is over.');
    if(this.substitutions>=5)return reply(false,'All five changes have been used.');
    if(this.pendingSubstitution)return reply(false,'A change is already queued.');
    const reserve=this.bench.find(p=>p.uid&&p.uid===member?.uid),out=this.players[index];
    if(!Number.isInteger(index)||!out||out.side!==0||!reserve||this.usedMembers.has(reserve.uid))return reply(false,'Choose an unused reserve and a home player.');
    this.pendingSubstitution={index,member:clone(reserve)};
    if(!this._live()&&!this.ball.flight&&!this.freeThrows)this._applySubstitution();
    return reply(true,'Change queued for the next stoppage.');
  }
  _applySubstitution() {
    const pending=this.pendingSubstitution;if(!pending||this.freeThrows)return;
    const old=this.players[pending.index],p=this._actor(pending.member,0,pending.index);
    p.x=old.x;p.z=old.z;this.players[pending.index]=p;this.usedMembers.add(p.key);
    this.bench=this.bench.filter(q=>q.uid!==p.uid);this.substitutions++;this.pendingSubstitution=null;
    if(this.controlState?.index===pending.index)this.releaseControl();
    this._say(`${p.name} replaces ${old.name}`,false,'substitution');
  }
  _endPeriod() {
    this.horn=false;this.ball.owner=null;this.ball.flight=null;this.freeThrows=null;this.celebration=null;
    this._applySubstitution();this.releaseControl();
    if(this.quarter>=4&&this.score[0]!==this.score[1]){this._finish();return;}
    if(this.quarter<4){this.quarter++;this.period=`Q${this.quarter}`;}
    else {this.overtime++;this.period=`OT${this.overtime}`;this.periodDuration=this.overtimeDuration;}
    this.periodElapsed=0;this.teamFouls=[0,0];this.phase='quarterBreak';this.phaseUntil=this.time+1.2;
    this.shotClock=24;this.stamina=this.stamina.map(s=>Math.min(100,s+12));
    this._say(`${this.period} next${this.overtime?': tied game, overtime':''}`,true,'period');
  }
  _finish() {
    this.finished=true;this.phase='finished';this.ball.owner=null;this.ball.flight=null;
    const winner=this.score[0]>this.score[1]?0:1,outcome=winner===0?'win':'loss',scale=this.rewardScaling;
    const resultBonus=winner===0?100:25,pointBonus=Math.min(150,this.score[0]*3);
    const performance=Math.round((resultBonus+pointBonus)*scale.multiplier);
    const incomeCompensation=Math.round(scale.incomeRate*120*(winner===0?1.25:.25));
    const total=performance+incomeCompensation;
    const possession=this.stats.reduce((sum,s)=>sum+s.possessionSeconds,0);
    this.result={score:[...this.score],winner,outcome,quarter:this.quarter,overtime:this.overtime,injuries:[...this.injuryUIDs],
      stats:this.stats.map(s=>({...s,possessionPercent:possession?Math.round(s.possessionSeconds/possession*100):0,
        passAccuracy:s.passesAttempted?Math.round(s.passesCompleted/s.passesAttempted*100):0})),
      reward:{...scale,resultLabel:outcome,resultBonus,pointBonus,performance,incomeCompensation,total}};
    this._say(`Full time: Home ${this.score[0]}, Away ${this.score[1]}`,true,'fullTime');
  }
  _step() {
    this.time=++this.ticks*STEP;
    if(this.controlState&&this.time>=this.controlState.endsAt)this.releaseControl();
    if(this.activeAbility&&this.time>=this.activeAbility.endsAt)this.activeAbility=null;
    this.stamina=this.stamina.map(s=>clamp(s+STEP*(this._live()?-.09:.3),0,100));
    if(this._live()) {
      this.stats[this.possession].possessionSeconds+=STEP;
      this.periodElapsed=Math.min(this.periodDuration,this.periodElapsed+STEP*this.clockRate);
      this.shotClock=Math.max(0,this.shotClock-STEP*this.clockRate);
      this.horn=this.periodElapsed>=this.periodDuration-1e-8;
      this._move();
      // A released shot can beat the buzzer; a pass cannot extend a possession.
      if(!this.horn&&this.shotClock<=1e-8&&['live','pass'].includes(this.phase)) {
        this.stats[this.possession].shotClockViolations++;this.stats[this.possession].turnovers++;
        const side=1-this.possession;this._inbound(side,.8,false);
        this._say('24-second violation: possession changes',true,'violation');return;
      }
    }
    if(this.ball.flight){this._flight();return;}
    if(this.horn&&!this.freeThrows){this._endPeriod();return;}
    if(this.phase==='quarterBreak'&&this.time>=this.phaseUntil){this._inbound((this.quarter+this.overtime)%2);return;}
    if(this.phase==='inbound'&&this.time>=this.phaseUntil){this.phase='live';this.nextDecision=this.time+1.1;return;}
    if(this.phase==='basketCelebration'&&this.time>=this.phaseUntil){this._inbound(1-this.celebration.side);return;}
    if(this.phase==='freeThrowSetup'&&this.time>=this.phaseUntil){this._shoot(true);return;}
    if(this.phase==='rebound'&&this.time>=this.phaseUntil){this._rebound(this.reboundSide,this.reboundBlocked);return;}
    if(this.phase==='live')this._auto();
  }
  update(dt) {
    if(this.finished||!Number.isFinite(dt)||dt<=0)return this.snapshot();
    // Bound stalled-tab catch-up. Ordinary frame partitions share identical 50ms ticks.
    this.accumulator+=Math.min(dt,10);
    while(this.accumulator+1e-9>=STEP&&!this.finished) {this.accumulator-=STEP;this._step();}
    return this.snapshot();
  }
  snapshot() {
    const abilities=this._abilityDefinitions().map(a=>({...a,
      available:!this.finished&&this.phase==='live'&&this.possession===0&&!this.ball.flight&&this.time>=this.abilityReadyAt&&
        (!a.playerId||this.players.some(p=>p.side===0&&p.id===a.playerId&&!p.borrowed)),
      cooldown:Math.max(0,this.abilityReadyAt-this.time),active:this.activeAbility?.id===a.id,
      remaining:this.activeAbility?.id===a.id?Math.max(0,this.activeAbility.endsAt-this.time):0}));
    return clone({players:this.players,ball:this.ball,phase:this.phase,score:this.score,finished:this.finished,result:this.result,
      quarter:this.quarter,overtime:this.overtime,period:this.period,elapsed:this.time,
      timeRemaining:Math.max(0,this.periodDuration-this.periodElapsed),shotClock:this.shotClock,
      shotClockFraction:this.shotClock/24,clockRate:this.clockRate,possession:this.possession,
      stats:this.stats,stamina:this.stamina,formation:this.formation,mentality:this.mentality,
      commentary:this.commentary,events:this.events,audio:this.events,celebration:this.celebration,
      freeThrows:this.freeThrows,teamFouls:this.teamFouls,control:this.controlState,abilities,activeAbility:this.activeAbility,
      cooldowns:{plays:Math.max(0,this.playReadyAt-this.time),ability:Math.max(0,this.abilityReadyAt-this.time),control:Math.max(0,this.controlReadyAt-this.time)},
      callPlays:Object.keys(PLAYS).map(id=>({id,available:!this.finished&&this.phase==='live'&&this.time>=this.playReadyAt&&
        (DEFENSIVE.includes(id)?this.possession!==0:this.possession===0)})),
      bench:this.bench,substitutions:{used:this.substitutions,max:5,pending:this.pendingSubstitution}});
  }
}

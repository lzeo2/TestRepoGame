// Fictional adult occupants of the single loaded room. No clock, storage or economy owner.
import {rayTargetDistance} from './ballistics.js';
import {createInteriorCollider} from './interior-navigation.js';
const LIMIT = 16, BODY_RADIUS = .28, THROW_WINDUP = .75, THROW_FLIGHT = .55;
const FIGHT_WINDUP=.65, FIGHT_RECOVER=.85;
const finite = n => Number.isFinite(n);
const point = p => p && finite(p.x) && finite(p.z);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function local(origin, p) {
  const c = Math.cos(origin.yaw), s = Math.sin(origin.yaw), x = p.x - origin.x, z = p.z - origin.z;
  return { x: c*x-s*z, z: s*x+c*z };
}
function world(origin, x, z) {
  const c = Math.cos(origin.yaw), s = Math.sin(origin.yaw);
  return { x: origin.x+c*x+s*z, z: origin.z-s*x+c*z };
}
function touches(p, box, radius) {
  const q = local(box,p);
  return Math.hypot(Math.max(0,Math.abs(q.x)-box.width/2), Math.max(0,Math.abs(q.z)-box.depth/2)) < radius;
}
export function createInteriorPeople() {
  let plan = null, footprintBoundary=null, people = [], elapsed = 0, crime = null, reportCooldown = 0, encounterSerial = 0, encounterState = null;
  const events = [], shotBodies=[];
  const employee = p => ['cashier', 'shopkeeper', 'cook'].includes(p.role);
  function protectedPoint(p, staff = false) {
    const q = local(plan.origin,p);
    if (Math.abs(q.x) < (plan.type === 'mall' ? 1.1 : .96)) return true;
    if ((plan.doors || []).some(d => Math.hypot(d.x-p.x,d.z-p.z) < (d.width || 1.5)/2+.45)) return true;
    if (!staff && point(plan.counter) && Math.hypot(plan.counter.x-p.x,plan.counter.z-p.z) < 1.45) return true;
    if (point(plan.exercise) && Math.hypot(plan.exercise.x-p.x,plan.exercise.z-p.z) < 1.7) return true;
    return (plan.activities || []).some(a => Math.hypot(a.x-p.x,a.z-p.z) < Math.min(1.1,a.radius || 1));
  }
  function clearPoint(p, seat = null, staff = false) {
    if (!point(p) || protectedPoint(p, staff)) return false;
    const q = local(plan.origin,p);
    if (footprintBoundary ? !footprintBoundary.canOccupy(p,BODY_RADIUS+.15) : Math.abs(q.x)>plan.width/2-BODY_RADIUS-.15 || q.z < .6 || q.z>plan.depth-.5) return false;
    return ![...(plan.walls || []), ...(plan.furniture || [])].some(b => b !== seat && touches(p,b,seat ? .21 : BODY_RADIUS+.08));
  }
  function add(role, position, {seat = null, target = null, yaw = plan.origin.yaw, gesture = 'idle', character = null, staff = false} = {}) {
    if (people.length >= LIMIT || !clearPoint(position,seat,staff && employee({role})) || people.some(p=>Math.hypot(p.x-position.x,p.z-position.z)<.8)) return false;
    if (target) {
      for (let i=0;i<=8;i++) if (!clearPoint({x:position.x+(target.x-position.x)*i/8,z:position.z+(target.z-position.z)*i/8})) return false;
    }
    const index = people.length;
    people.push({id:`${plan.id}-adult-${index}`, role, adult:true, x:position.x,z:position.z,y:plan.floorY,
      yaw, radius:BODY_RADIUS, seated:Boolean(seat), seatHeight:seat ? (seat.kind === 'stool' ? .69 : seat.kind === 'banquette' ? .55 : .45) : 0,
      character, earmuffs:character==='booth-guest', palette:index%6, hair:character==='booth-guest'?3:index%4, apron:role==='cook'||role==='cashier'||role==='shopkeeper',
      noodleThrow:null, fightPhase:null, fightTime:0, health:100, reaction:'calm', fear:0, anger:0, angerOffender:null, retaliationCooldown:0, attackTimer:0, attackSerial:0, stun:0, knockdown:0, reactionTimer:0, hitCooldown:0, playerHitTimer:0, crimePhase:null,
      roomId:plan.id, storeId:plan.storeId || null,
      gesture, phase:index*1.73, speed:0, home:{x:position.x,z:position.z},target,progress:0,direction:1});
    return true;
  }
  function counterStaff(counter) {
    // Source shop variants place counters against a wall. Check the rear end
    // first, then the exposed serving edge; the player interaction circle is
    // not a solid, but every real prop, doorway and activity keeps its clearance.
    const positions = [[0, counter.depth/2+.65], [0, counter.depth/2+.4]];
    for (const sign of [-1, 1]) for (const z of [0, -.6, .6]) positions.push([sign*(counter.width/2+.4), z]);
    for (const [x,z] of positions) if (add('shopkeeper',world(counter,x,z),
      {yaw:counter.yaw+Math.PI,gesture:'serve',staff:true})) return true;
    return false;
  }
  function pocket(role, x, z, walk = false, gesture = 'idle') {
    const a = world(plan.origin,x,z), b = walk ? world(plan.origin,x,z+.65) : null;
    return add(role,a,{target:b,gesture});
  }
  function load(value) {
    clear();
    if (!value || !point(value.origin) || !finite(value.origin.yaw) || !finite(value.floorY) || !finite(value.width) || !finite(value.depth)) return snapshot();
    plan = value;
    footprintBoundary=plan.footprint?createInteriorCollider({...plan,walls:[],furniture:[]}):null;
    const furniture = plan.furniture || [];
    if (plan.variant === 'noodles') {
      const booth = furniture.find(f=>f.kind==='banquette');
      if (booth && point(plan.boothGuest)) add('diner',plan.boothGuest,{seat:booth,yaw:plan.boothGuest.yaw,gesture:'eat',character:'booth-guest'});
      for (const chair of furniture.filter(f=>f.kind==='padded-chair'||f.kind==='stool')) add('diner',chair,{seat:chair,yaw:chair.yaw,gesture:'eat'});
      const pass = furniture.find(f=>f.kind==='kitchen-pass');
      const prep = furniture.find(f=>f.kind==='prep-bench');
      const station = furniture.find(f=>f.kind==='noodle-station');
      if (pass && prep && station) {
        const front = local(plan.origin,pass), back = local(plan.origin,station);
        const staffX = (front.x-pass.width/2+back.x+station.width/2)/2;
        const staffYaw = plan.origin.yaw+Math.PI/2;
        add('cashier',world(plan.origin,staffX,local(plan.origin,plan.counter || station).z),{yaw:staffYaw,gesture:'serve'});
        const cook = point(plan.noodleCook) ? plan.noodleCook : world(plan.origin,staffX,local(plan.origin,prep).z+prep.depth*.16);
        add('cook',cook,{yaw:finite(cook.yaw)?cook.yaw:staffYaw,gesture:point(plan.noodleCook)?'pull-noodles':'prepare',character:'noodle-puller'});
      }
    } else if (plan.type === 'house') {
      const sofa = furniture.find(f=>f.kind==='sofa');
      if (sofa) add('resident',sofa,{seat:sofa,yaw:plan.origin.yaw+Math.PI,gesture:'rest'});
    } else if (plan.type === 'mall') {
      for (const side of [-1,1]) for (const z of [4,9,17,21]) pocket('visitor',side*1.85,z,true);
      for (const counter of furniture.filter(f=>f.kind==='counter')) {
        counterStaff(counter);
      }
    } else if (plan.type === 'school') {
      for (const side of [-1,1]) {
        for (const z of [3,7.5,12]) {
          if (pocket(side<0?'custodian':'school-staff',side*2.6,z,true)) break;
        }
      }
    } else if (plan.type === 'gym') {
      let count = 0;
      for (let z=3;z<plan.depth-1 && count<5;z+=2.2) for (const side of [-1,1]) {
        if (pocket(count ? 'exerciser' : 'trainer', side*(plan.width/2-1.35),z,count===0,count ? 'exercise':'coach')) count++;
        if (count>=5) break;
      }
    } else {
      const counter = furniture.find(f=>f.kind==='counter');
      if (counter) counterStaff(counter);
      for (const side of [-1,1]) {
        for (const z of [2.8,4.8,6.3]) if (pocket('customer',side*1.45,z,true,'browse')) break;
      }
    }
    const guest=people.find(p=>p.character==='booth-guest');
    encounterState=guest ? {roomId:plan.id,storeId:plan.storeId||null,personId:guest.id,character:'booth-guest',phase:'idle',outcome:null,scriptedFight:false,explicitFight:false,throwEmitted:false,victoryRequired:false,victory:false,meleeHits:0,fightActive:false,missionId:null,session:0} : null;
    for(const p of people) shotBodies.push(Object.freeze({id:p.id,get x(){return p.x;},get z(){return p.z;},feetY:plan.floorY,height:1.8,radius:.36,interiorId:plan.id,get health(){return p.health;}}));
    return snapshot();
  }
  function update(dt,{actor,activity,hasLineOfSight} = {}) {
    const step = finite(dt) ? clamp(dt,0,.1) : 0;
    if (!plan || !step) return;
    elapsed += step;
    reportCooldown = Math.max(0, reportCooldown - step);
    for (const p of people) {
      p.phase += step; p.speed = 0;
      for (const key of ['hitCooldown', 'playerHitTimer', 'stun', 'knockdown', 'reactionTimer', 'retaliationCooldown', 'attackTimer']) p[key] = Math.max(0, p[key] - step);
      if (p.reactionTimer <= 0 && p.stun <= 0 && p.knockdown <= 0) {
        p.reaction = 'calm'; p.fear = 0; p.anger=0; p.angerOffender=null;
        if(!(encounterState?.personId===p.id && encounterState.victoryRequired)) p.health = Math.min(100, p.health + step * 10);
      } else p.reaction = p.knockdown > 0 ? 'knockdown' : p.stun > 0 ? 'stunned' : p.anger ? 'angry' : 'panic';
      const coerced = p.health > 0 && p.crimePhase;
      if (coerced) {
        p.fear = Math.max(p.fear, .8);
        if (p.stun <= 0 && p.knockdown <= 0) p.reaction = 'compliant';
      }
      if(coerced || p.health<=0 || p.stun>0 || p.knockdown>0 || p.reaction!=='angry')p.attackTimer=0;
      updateNoodleThrow(p,step,actor,hasLineOfSight);
      if(encounterState?.personId===p.id && encounterState.victoryRequired && encounterState.fightActive) {
        updateFight(p,step,actor,hasLineOfSight);
        continue;
      }
      if (encounterState?.personId===p.id && (encounterState.scriptedFight || encounterState.explicitFight) && encounterState.phase==='angry' && p.reaction==='calm') {
        encounterState.phase='interrupted';encounterState.throwEmitted=false;
      }
      if (!p.noodleThrow && !coerced && p.health>0 && p.reaction==='angry' && p.angerOffender==='player' && p.retaliationCooldown<=0 &&
          liveThrowTarget(p,actor,hasLineOfSight)) {
        if(emit({type:'retaliation',kind:'melee',x:p.x,z:p.z,personId:p.id,targetId:'player',damage:5})) {
          p.retaliationCooldown=2.2;p.attackTimer=.65;p.attackSerial++;
          p.yaw=Math.atan2(actor.x-p.x,actor.z-p.z);
          if (encounterState?.personId===p.id && encounterState.phase==='angry') {
            if (!encounterState.scriptedFight) completeEncounter('confrontation');
            else if (encounterState.throwEmitted) completeEncounter('noodle-fight');
          }
        }
      }
      if (coerced || p.reaction !== 'calm' || !p.target) continue;
      // Side pockets have short prevalidated paths. Pause for nearby actors rather than entering the aisle.
      if ((point(actor) && Math.hypot(actor.x-p.x,actor.z-p.z)<1.15) || activity?.kind === 'bench') continue;
      const length = Math.hypot(p.target.x-p.home.x,p.target.z-p.home.z);
      let next = p.progress+p.direction*step*.28/length;
      if (next>1 || next<0) { p.direction *= -1; next = clamp(next,0,1); }
      const candidate = {x:p.home.x+(p.target.x-p.home.x)*next,z:p.home.z+(p.target.z-p.home.z)*next};
      if (people.some(other=>other!==p && Math.hypot(candidate.x-other.x,candidate.z-other.z)<.75)) continue;
      p.progress = next; p.x = candidate.x; p.z = candidate.z; p.speed = .28;
      p.yaw = Math.atan2((p.target.x-p.home.x)*p.direction,(p.target.z-p.home.z)*p.direction);
    }
  }
  function liveThrowTarget(p,actor,hasLineOfSight) {
    return p.health>0 && p.stun<=0 && p.knockdown<=0 && !p.crimePhase && point(actor) &&
      (actor.interiorId==null || actor.interiorId===plan.id) &&
      (!finite(actor.health) || actor.health>0) && Math.hypot(actor.x-p.x,actor.z-p.z)<=2.1 &&
      typeof hasLineOfSight==='function' && hasLineOfSight(p,actor);
  }
  function sameRoomActor(actor) {
    if(!point(actor) || (actor.interiorId!=null && actor.interiorId!==plan.id) || (finite(actor.health)&&actor.health<=0)) return false;
    const q=local(plan.origin,actor);
    return footprintBoundary?footprintBoundary.canOccupy(actor,.1):Math.abs(q.x)<=plan.width/2+.1 && q.z>=-.1 && q.z<=plan.depth+.1;
  }
  function retryFight(p,reason) {
    encounterState.phase='retry';encounterState.fightActive=false;encounterState.throwEmitted=false;encounterState.victory=false;
    encounterState.message=reason;p.fightPhase=null;p.fightTime=0;p.attackTimer=0;p.anger=0;p.angerOffender=null;
  }
  function updateFight(p,step,actor,hasLineOfSight) {
    if(p.health<=0) {retryFight(p,'No win yet. Talk to Dot and choose Rematch to restart the fist fight.');return;}
    if(!sameRoomActor(actor)) {retryFight(p,'Fight interrupted. Return and talk to Dot for a fresh rematch.');return;}
    p.reactionTimer=Math.max(p.reactionTimer,2);p.anger=1;p.angerOffender='player';
    if(p.noodleThrow) return;
    if(!encounterState.throwEmitted) {retryFight(p,'The bowl throw was interrupted. Talk to Dot for a fresh rematch.');return;}
    if(p.stun>0 || p.knockdown>0) {p.fightPhase='stagger';p.fightTime=0;encounterState.phase='stagger';return;}
    p.reaction='angry';
    const distance=Math.hypot(actor.x-p.x,actor.z-p.z), visible=typeof hasLineOfSight==='function'&&hasLineOfSight(p,actor);
    p.yaw=Math.atan2(actor.x-p.x,actor.z-p.z);
    if(p.fightPhase==='windup') {
      p.fightTime=Math.max(0,p.fightTime-step);encounterState.phase='windup';
      if(p.fightTime>1e-6)return;
      if(distance<=1.65&&visible)emit({type:'retaliation',kind:'melee',x:p.x,z:p.z,personId:p.id,targetId:'player',damage:7});
      p.attackSerial++;p.attackTimer=.65;p.fightPhase='recover';p.fightTime=FIGHT_RECOVER;encounterState.phase='recover';return;
    }
    if(p.fightPhase==='recover') {
      p.fightTime=Math.max(0,p.fightTime-step);encounterState.phase='recover';
      if(p.fightTime>1e-6)return;
    }
    p.fightPhase='guard';encounterState.phase='guard';
    if(distance<=1.65&&visible) {p.fightPhase='windup';p.fightTime=FIGHT_WINDUP;encounterState.phase='windup';return;}
    // Follow only the actual room floor, never stepping through furniture or adults.
    if(distance>1.2&&visible) {
      const travel=Math.min(distance-1.2,step*1.35),dx=(actor.x-p.x)/distance*travel,dz=(actor.z-p.z)/distance*travel;
      const candidate={x:p.x+dx,z:p.z+dz};
      const q=local(plan.origin,candidate);
      if((footprintBoundary?footprintBoundary.canOccupy(candidate,BODY_RADIUS):Math.abs(q.x)<plan.width/2-BODY_RADIUS&&q.z>.4&&q.z<plan.depth-.4)&&
        !(plan.walls||[]).some(b=>touches(candidate,b,BODY_RADIUS))&&
        !(plan.furniture||[]).some(b=>touches(candidate,b,BODY_RADIUS))&&
        !people.some(other=>other!==p&&Math.hypot(candidate.x-other.x,candidate.z-other.z)<BODY_RADIUS+other.radius)) {
        p.x=candidate.x;p.z=candidate.z;p.speed=1.35;p.seated=false;
      }
    }
  }
  function updateNoodleThrow(p,step,actor,hasLineOfSight) {
    const flight=p.noodleThrow;
    if (!flight || encounterState?.personId!==p.id) return;
    const interrupted=p.health<=0 || p.stun>0 || p.knockdown>0 || p.crimePhase || p.reaction!=='angry';
    if (interrupted) {
      if(encounterState.victoryRequired) {
        if(!encounterState.victory&&encounterState.phase!=='retry')retryFight(p,'The bowl throw was interrupted. Talk to Dot and choose Rematch.');
      } else {encounterState.phase='interrupted';encounterState.throwEmitted=false;}
      if (flight.phase==='windup') {p.noodleThrow=null;return;}
    }
    // A released bowl follows its captured trajectory even if its target moves away.
    if (flight.phase==='windup') {
      if (!liveThrowTarget(p,actor,hasLineOfSight)) return;
      p.yaw=Math.atan2(actor.x-p.x,actor.z-p.z);
    }
    flight.time=Math.min(flight.duration,flight.time+step);
    if (flight.time<flight.duration) return;
    if (flight.phase==='windup') {
      if (!emit({type:'noodles-throw',kind:'noodles',personId:p.id,targetId:'player',x:p.x,z:p.z})) return;
      encounterState.throwEmitted=true;encounterState.phase='noodle-flight';
      flight.phase='flight';flight.time=0;flight.duration=THROW_FLIGHT;
      const y=p.y+(p.seated?p.seatHeight-.90:0)+1.34;
      flight.from={x:p.x+Math.sin(p.yaw)*.4,y,z:p.z+Math.cos(p.yaw)*.4};
      flight.to={x:actor.x,y:p.y+1.2,z:actor.z};
    } else {
      p.noodleThrow=null;
      if (encounterState.phase==='noodle-flight') {encounterState.phase='angry';p.retaliationCooldown=.35;}
    }
  }
  function emit(event) { if(events.length>=32)return false;events.push(Object.freeze(event));return true; }
  function encounter() {
    const {scriptedFight,explicitFight,throwEmitted,...state}=encounterState||{},p=people.find(person=>person.id===encounterState?.personId);
    return Object.freeze({serial:encounterSerial,...(encounterState?state:{roomId:null,storeId:null,personId:null,character:'booth-guest',phase:'idle',outcome:null}),
      playerHits:encounterState?.meleeHits||0,health:p?.health??0,dotHealth:p?.health??0,windup:p?.fightPhase==='windup'?p.fightTime:0,won:encounterState?.victory===true});
  }
  function dialoguePerson(id, actor, hasLineOfSight) {
    return plan && point(actor) && typeof hasLineOfSight==='function' && people.find(p=>p.id===id && p.character==='booth-guest' &&
      ((encounterState.victoryRequired && ['retry','dialogue'].includes(encounterState.phase)) || (p.health>0 && p.stun<=0 && p.knockdown<=0 && !p.crimePhase && p.reaction==='calm')) &&
      (actor.interiorId==null || actor.interiorId===plan.id) &&
      Math.hypot(actor.x-p.x,actor.z-p.z)<=2.1 && hasLineOfSight(actor,p));
  }
  function nearestDialogue(actor,{hasLineOfSight}={}) {
    if(!['idle','dialogue','interrupted','retry'].includes(encounterState?.phase)) return null;
    const p=dialoguePerson(encounterState.personId,actor,hasLineOfSight);
    return p ? Object.freeze({id:p.id,character:p.character,label:'Talk to the booth guest',x:p.x,z:p.z,radius:2.1}) : null;
  }
  function startDialogue(id,{actor,hasLineOfSight,scriptedFight,victoryRequired,missionId}={}) {
    if(!['idle','dialogue','interrupted','retry'].includes(encounterState?.phase) || !dialoguePerson(id,actor,hasLineOfSight)) return Object.freeze({ok:false,reason:'Move close to the booth guest.'});
    const rematch=encounterState.phase==='retry';
    if(encounterState.phase!=='dialogue') {
      encounterState.victoryRequired=victoryRequired===true || rematch;
      encounterState.missionId=typeof missionId==='string'?missionId:null;
      encounterState.rematch=rematch;
    }
    if (encounterState.phase==='interrupted') {encounterState.throwEmitted=false;encounterState.outcome=null;}
    if (typeof scriptedFight==='boolean') {
      encounterState.scriptedFight=scriptedFight;
      if (!scriptedFight) encounterState.throwEmitted=false;
    }
    encounterState.phase='dialogue';
    return Object.freeze({ok:true,dialogue:Object.freeze({id,title:'Booth guest',line:'You left your bag on the floor! Pick it up! Want to argue about it?',
      choices:Object.freeze([Object.freeze({id:'apologise',label:'Sorry, I will move it.'}),Object.freeze({id:'confront',label:'Back off.'}),Object.freeze({id:'fight',label:rematch?'Rematch':'Fight'})])})});
  }
  function completeEncounter(outcome) {
    encounterState.phase='complete';encounterState.outcome=outcome;encounterSerial++;
    emit({type:'encounter-complete',...encounter()});
  }
  function respondDialogue(id,choice,{actor,hasLineOfSight}={}) {
    const p=dialoguePerson(id,actor,hasLineOfSight);
    if(encounterState?.phase!=='dialogue' || !p || !['apologise','confront','fight'].includes(choice)) return Object.freeze({ok:false,reason:'The conversation has ended.'});
    encounterState.explicitFight=choice==='fight';
    if(encounterState.rematch && choice!=='fight') return Object.freeze({ok:false,reason:'Choose Rematch to restart the fist fight.'});
    if (encounterState.scriptedFight || encounterState.explicitFight) {
      encounterState.session++;encounterState.meleeHits=0;encounterState.victory=false;encounterState.outcome=null;encounterState.fightActive=true;
      if(encounterState.rematch) {p.health=100;p.stun=0;p.knockdown=0;p.hitCooldown=0;p.reactionTimer=0;encounterState.rematch=false;}
      p.fightPhase='guard';p.fightTime=0;
      if(encounterState.victoryRequired&&p.seated) {
        let best=null,bestDistance=Infinity;
        for(const offset of [0,Math.PI/2,-Math.PI/2,Math.PI/4,-Math.PI/4]) {
          const distance=Math.abs(offset)===Math.PI/4?1.35:.95,angle=p.yaw+offset;
          const stand={x:p.x+Math.sin(angle)*distance,z:p.z+Math.cos(angle)*distance};
          const toActor=Math.hypot(stand.x-actor.x,stand.z-actor.z);
          if(toActor<bestDistance&&clearPoint(stand)&&!people.some(other=>other!==p&&Math.hypot(stand.x-other.x,stand.z-other.z)<.65)) {best=stand;bestDistance=toActor;}
        }
        if(best){p.x=best.x;p.z=best.z;p.seated=false;}
      }
      encounterState.throwEmitted=false;encounterState.phase='noodle-windup';if(clearPoint(p))p.seated=false;p.anger=1;p.angerOffender='player';p.reaction='angry';p.reactionTimer=encounterState.scriptedFight?12:20;
      p.noodleThrow={actorId:p.id,targetId:'player',phase:'windup',time:0,duration:THROW_WINDUP,from:null,to:null};
      return Object.freeze({ok:true,message:choice==='apologise'?'Too late! Watch the bowl!':'You want an argument? Here it comes!',outcome:null});
    }
    if(choice==='apologise') {
      completeEncounter('peaceful');
      return Object.freeze({ok:true,message:'Keep the walkway clear next time.',outcome:'peaceful'});
    }
    encounterState.phase='angry';p.anger=1;p.angerOffender='player';p.reaction='angry';p.reactionTimer=6;p.retaliationCooldown=.7;
    return Object.freeze({ok:true,message:'Then come over here and say that!',outcome:null});
  }
  function clipMovement(actor,dx,dz,radius=.45) {
    if (!point(actor) || ![dx,dz,radius].every(finite) || radius<=0) return {dx:0,dz:0,blocked:true};
    if (!plan || !people.length) return {dx,dz,blocked:false};
    let fraction = 1;
    const a = dx*dx+dz*dz;
    if (a<1e-16) return {dx,dz,blocked:false};
    for (const p of people) {
      const x=actor.x-p.x,z=actor.z-p.z,r=clamp(radius,.1,2)+p.radius,c=x*x+z*z-r*r,b=x*dx+z*dz;
      if (c<=0) { if (b<0) fraction=0; continue; }
      const discriminant=b*b-a*c;
      if (b>=0 || discriminant<0) continue;
      const t=(-b-Math.sqrt(discriminant))/a;
      if (t>=0 && t<=fraction) fraction=Math.max(0,t-.001/Math.sqrt(a));
    }
    return {dx:dx*fraction,dz:dz*fraction,blocked:fraction<1};
  }
  function crimeDescriptor(p) {
    return Object.freeze({ id:p.id, kind:'employee', roomId:p.roomId, storeId:p.storeId,
      x:p.x, z:p.z, health:p.health, threatened:p.playerHitTimer>0, lastPlayerHit:p.playerHitTimer>0 });
  }
  function getCrimeTarget(id) {
    const p = people.find(person => person.id === id && employee(person));
    return p ? crimeDescriptor(p) : null;
  }
  function setCrime(activity) {
    crime = activity && ['robbery','mugging'].includes(activity.type) && ['intimidation','emptying','handover'].includes(activity.phase)
      ? { targetId:String(activity.targetId), phase:activity.phase } : null;
    for (const p of people) p.crimePhase = p.health>0 && crime?.targetId===p.id && employee(p) ? crime.phase : null;
  }
  function report(source, kind, witness) {
    if (reportCooldown>0 || !witness || events.length>=32) return;
    events.push(Object.freeze({ type:'witness', kind, x:source.x, z:source.z, witnessId:witness.id,
      offenderId:source.offenderId, roomId:plan.id }));
    reportCooldown = .8;
  }
  function frighten(p, duration = 6) {
    p.fear = 1; p.reactionTimer = Math.max(p.reactionTimer, duration);
    p.reaction = p.knockdown>0 ? 'knockdown' : p.stun>0 ? 'stunned' : 'panic';
  }
  function alert({x,z,radius=28,kind='gunshot',hasLineOfSight,offenderId='player'} = {}) {
    if (!plan || ![x,z,radius].every(finite)) return 0;
    const reach = clamp(radius,0,100);
    let witness = null, count = 0;
    for (const p of people) {
      if (p.health<=0 || Math.hypot(p.x-x,p.z-z)>reach || (hasLineOfSight && !hasLineOfSight({x,z},p))) continue;
      p.anger=0;p.angerOffender=null;p.attackTimer=0;frighten(p); witness ||= p; count++;
    }
    report({x,z,offenderId},kind,witness);
    return count;
  }
  function strike({x,z,yaw=0,range=2,damage=20,kind='melee',hasLineOfSight,offenderId='player',interiorId} = {}) {
    const hits = [];
    if (!plan || ![x,z,yaw,range,damage].every(finite)) return {hits:0,people:hits};
    const explosion=kind==='explosion';
    if(explosion && typeof hasLineOfSight!=='function') return {hits:0,people:hits};
    const reach=clamp(range,0,explosion?8:100), power=clamp(damage,0,100);
    const gun=['pistol','gunshot','firearm','shot','fire'].includes(kind);
    const candidates=people.map(p=>({p,distance:Math.hypot(p.x-x,p.z-z)})).filter(({p,distance})=>{
      const forward=(p.x-x)*-Math.sin(yaw)+(p.z-z)*-Math.cos(yaw);
      const lateral=Math.abs((p.x-x)*Math.cos(yaw)-(p.z-z)*Math.sin(yaw));
      return power>0 && p.health>0 && p.hitCooldown<=0 && distance<=reach &&
        (explosion ? distance<reach : forward>=-.3 && (gun ? lateral<=.55 : forward>=distance*.25)) &&
        (explosion || !hasLineOfSight || hasLineOfSight({x,z},p));
    }).sort((a,b)=>a.distance-b.distance);
    let witness=null;
    for (const {p,distance} of candidates.slice(0,explosion?12:gun?1:3)) {
      if(explosion && hasLineOfSight({x,z},p)!==true) continue;
      const dealt=explosion?power*(1-distance/reach):power;
      applyHit(p,dealt,kind,offenderId,{x,z,interiorId},!explosion&&typeof hasLineOfSight==='function'&&hasLineOfSight({x,z},p)===true);
      if(!explosion || p.health>0) witness ||= p;
      hits.push(Object.freeze({id:p.id,x:p.x,z:p.z,health:p.health,reaction:p.reaction}));
    }
    if (hits.length) report({x,z,offenderId},kind,witness);
    return {hits:hits.length,people:hits};
  }
  function applyHit(p,dealt,kind,offenderId,source,visible) {
    const gun=['pistol','gunshot','firearm','shot','fire'].includes(kind);
    p.health=Math.max(0,p.health-dealt);p.hitCooldown=.4;p.stun=.65;p.attackTimer=0;
    if(offenderId==='player'&&kind==='melee')p.playerHitTimer=12;
    if(p.health===0||dealt>=35)p.knockdown=2.8;
    if(p.health===0)p.crimePhase=null;
    p.anger=!gun&&p.character==='booth-guest'&&p.health>0&&Math.hypot(p.x-source.x,p.z-source.z)<=2.6?1:0;
    p.angerOffender=p.anger?offenderId:null;frighten(p,10);
    if(encounterState?.personId!==p.id || !encounterState.fightActive)return;
    const validMelee=offenderId==='player'&&kind==='melee'&&encounterState.throwEmitted&&sameRoomActor(source)&&visible;
    if(validMelee)encounterState.meleeHits++;
    if(p.health===0) {
      if(validMelee&&encounterState.meleeHits>=2&&p.knockdown>0) {
        encounterState.victory=true;encounterState.fightActive=false;p.fightPhase='down';
        completeEncounter('noodle-victory');
      } else if(encounterState.victoryRequired)retryFight(p,'No win yet. Land at least two fist hits after the bowl throw. Talk to Dot and choose Rematch.');
    } else if(encounterState.victoryRequired && (gun||kind==='explosion'||!validMelee)) {
      retryFight(p,'Fists only for this fight. Talk to Dot and choose Rematch.');
    }
  }
  function shotTargets() { return Object.freeze(shotBodies.slice()); }
  function hitByShot(id,damage,ray) {
    if(!plan||!finite(damage)||damage<=0||damage>100||!ray||ray.interiorId!==plan.id||
      (ray.targetId!=null&&ray.targetId!==id)||![ray.x,ray.y,ray.z,ray.dx,ray.dy,ray.dz,ray.range].every(finite)||
      ray.range<=0||ray.range>500||Math.abs(Math.hypot(ray.dx,ray.dy,ray.dz)-1)>.001)return false;
    const index=people.findIndex(p=>p.id===id&&p.health>0&&p.hitCooldown<=0);
    if(index<0||!finite(rayTargetDistance(ray,shotBodies[index])))return false;
    const p=people[index];applyHit(p,damage,'firearm','player',ray,true);
    report({x:ray.x,z:ray.z,offenderId:'player'},'firearm',p);
    return true;
  }
  function snapshot() { return people.map(({home,target,progress,direction,playerHitTimer,noodleThrow,...p})=>Object.freeze({...p,
    noodleThrow:noodleThrow ? Object.freeze({...noodleThrow,from:noodleThrow.from?Object.freeze({...noodleThrow.from}):null,to:noodleThrow.to?Object.freeze({...noodleThrow.to}):null}) : null,
    threatened:playerHitTimer>0,lastPlayerHit:playerHitTimer>0,crimePhase:p.health>0?p.crimePhase:null})); }
  function clear() { plan=null;footprintBoundary=null;people=[];shotBodies.length=0;elapsed=0;crime=null;reportCooldown=0;events.length=0;encounterState=null; }
  return {load,update,nearestDialogue,startDialogue,respondDialogue,get encounter(){return encounter();},clipMovement,snapshot,clear,strike,shotTargets,hitByShot,alert,setCrime,getCrimeTarget,
    drainEvents(){return events.splice(0);},get stats(){return Object.freeze({active:plan?.id || null,count:people.length,limit:LIMIT,elapsed});}};
}

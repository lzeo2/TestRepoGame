// Fictional adult occupants of the single loaded room. No clock, storage or economy owner.
const LIMIT = 16, BODY_RADIUS = .28;
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
  let plan = null, people = [], elapsed = 0, crime = null, reportCooldown = 0, encounterSerial = 0, encounterState = null;
  const events = [];
  const employee = p => ['cashier', 'shopkeeper', 'cook'].includes(p.role);
  function protectedPoint(p) {
    const q = local(plan.origin,p);
    if (Math.abs(q.x) < (plan.type === 'mall' ? 1.1 : .96)) return true;
    if ((plan.doors || []).some(d => Math.hypot(d.x-p.x,d.z-p.z) < (d.width || 1.5)/2+.45)) return true;
    if (point(plan.counter) && Math.hypot(plan.counter.x-p.x,plan.counter.z-p.z) < 1.45) return true;
    if (point(plan.exercise) && Math.hypot(plan.exercise.x-p.x,plan.exercise.z-p.z) < 1.7) return true;
    return (plan.activities || []).some(a => Math.hypot(a.x-p.x,a.z-p.z) < Math.min(1.1,a.radius || 1));
  }
  function clearPoint(p, seat = null) {
    if (!point(p) || protectedPoint(p)) return false;
    const q = local(plan.origin,p);
    if (Math.abs(q.x)>plan.width/2-BODY_RADIUS-.15 || q.z < .6 || q.z>plan.depth-.5) return false;
    return ![...(plan.walls || []), ...(plan.furniture || [])].some(b => b !== seat && touches(p,b,seat ? .21 : BODY_RADIUS+.08));
  }
  function add(role, position, {seat = null, target = null, yaw = plan.origin.yaw, gesture = 'idle', character = null} = {}) {
    if (people.length >= LIMIT || !clearPoint(position,seat) || people.some(p=>Math.hypot(p.x-position.x,p.z-position.z)<.8)) return false;
    if (target) {
      for (let i=0;i<=8;i++) if (!clearPoint({x:position.x+(target.x-position.x)*i/8,z:position.z+(target.z-position.z)*i/8})) return false;
    }
    const index = people.length;
    people.push({id:`${plan.id}-adult-${index}`, role, adult:true, x:position.x,z:position.z,y:plan.floorY,
      yaw, radius:BODY_RADIUS, seated:Boolean(seat), seatHeight:seat ? (seat.kind === 'stool' ? .69 : seat.kind === 'banquette' ? .55 : .45) : 0,
      character, earmuffs:character==='booth-guest', palette:index%6, hair:character==='booth-guest'?3:index%4, apron:role==='cook'||role==='cashier'||role==='shopkeeper',
      health:100, reaction:'calm', fear:0, anger:0, angerOffender:null, retaliationCooldown:0, stun:0, knockdown:0, reactionTimer:0, hitCooldown:0, playerHitTimer:0, crimePhase:null,
      roomId:plan.id, storeId:plan.storeId || null,
      gesture, phase:index*1.73, speed:0, home:{x:position.x,z:position.z},target,progress:0,direction:1});
    return true;
  }
  function pocket(role, x, z, walk = false, gesture = 'idle') {
    const a = world(plan.origin,x,z), b = walk ? world(plan.origin,x,z+.65) : null;
    return add(role,a,{target:b,gesture});
  }
  function load(value) {
    clear();
    if (!value || !point(value.origin) || !finite(value.origin.yaw) || !finite(value.floorY) || !finite(value.width) || !finite(value.depth)) return snapshot();
    plan = value;
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
        const p = world(counter,0,counter.depth/2+.65); add('shopkeeper',p,{yaw:counter.yaw+Math.PI,gesture:'serve'});
      }
    } else if (plan.type === 'gym') {
      let count = 0;
      for (let z=3;z<plan.depth-1 && count<5;z+=2.2) for (const side of [-1,1]) {
        if (pocket(count ? 'exerciser' : 'trainer', side*(plan.width/2-1.35),z,count===0,count ? 'exercise':'coach')) count++;
        if (count>=5) break;
      }
    } else {
      const counter = furniture.find(f=>f.kind==='counter');
      if (counter) add('shopkeeper',world(counter,0,counter.depth/2+.65),{yaw:counter.yaw+Math.PI,gesture:'serve'});
      for (const side of [-1,1]) {
        for (const z of [2.8,4.8,6.3]) if (pocket('customer',side*1.45,z,true,'browse')) break;
      }
    }
    const guest=people.find(p=>p.character==='booth-guest');
    encounterState=guest ? {roomId:plan.id,storeId:plan.storeId||null,personId:guest.id,character:'booth-guest',phase:'idle',outcome:null} : null;
    return snapshot();
  }
  function update(dt,{actor,activity,hasLineOfSight} = {}) {
    const step = finite(dt) ? clamp(dt,0,.1) : 0;
    if (!plan || !step) return;
    elapsed += step;
    reportCooldown = Math.max(0, reportCooldown - step);
    for (const p of people) {
      p.phase += step; p.speed = 0;
      for (const key of ['hitCooldown', 'playerHitTimer', 'stun', 'knockdown', 'reactionTimer', 'retaliationCooldown']) p[key] = Math.max(0, p[key] - step);
      if (p.reactionTimer <= 0 && p.stun <= 0 && p.knockdown <= 0) {
        p.reaction = 'calm'; p.fear = 0; p.anger=0; p.angerOffender=null;
        p.health = Math.min(100, p.health + step * 10);
      } else p.reaction = p.knockdown > 0 ? 'knockdown' : p.stun > 0 ? 'stunned' : p.anger ? 'angry' : 'panic';
      const coerced = p.health > 0 && p.crimePhase;
      if (coerced) {
        p.fear = Math.max(p.fear, .8);
        if (p.stun <= 0 && p.knockdown <= 0) p.reaction = 'compliant';
      }
      if (!coerced && p.health>0 && p.reaction==='angry' && p.angerOffender==='player' && p.retaliationCooldown<=0 &&
          point(actor) && Math.hypot(actor.x-p.x,actor.z-p.z)<=2.1 && typeof hasLineOfSight==='function' && hasLineOfSight(p,actor)) {
        if(emit({type:'retaliation',kind:'melee',x:p.x,z:p.z,personId:p.id,targetId:'player',damage:5})) {
          p.retaliationCooldown=2.2;
          if (encounterState?.personId===p.id && encounterState.phase==='angry') completeEncounter('confrontation');
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
  function emit(event) { if(events.length>=32)return false;events.push(Object.freeze(event));return true; }
  function encounter() { return Object.freeze({serial:encounterSerial,...(encounterState||{roomId:null,storeId:null,personId:null,character:'booth-guest',phase:'idle',outcome:null})}); }
  function dialoguePerson(id, actor, hasLineOfSight) {
    return plan && point(actor) && typeof hasLineOfSight==='function' && people.find(p=>p.id===id && p.character==='booth-guest' &&
      p.health>0 && p.stun<=0 && p.knockdown<=0 && !p.crimePhase && p.reaction==='calm' &&
      Math.hypot(actor.x-p.x,actor.z-p.z)<=2.1 && hasLineOfSight(actor,p));
  }
  function nearestDialogue(actor,{hasLineOfSight}={}) {
    if(encounterState?.phase!=='idle') return null;
    const p=dialoguePerson(encounterState.personId,actor,hasLineOfSight);
    return p ? Object.freeze({id:p.id,character:p.character,label:'Talk to the booth guest',x:p.x,z:p.z,radius:2.1}) : null;
  }
  function startDialogue(id,{actor,hasLineOfSight}={}) {
    if(encounterState?.phase!=='idle' || !dialoguePerson(id,actor,hasLineOfSight)) return Object.freeze({ok:false,reason:'Move close to the booth guest.'});
    encounterState.phase='dialogue';
    return Object.freeze({ok:true,dialogue:Object.freeze({id,title:'Booth guest',line:'You left your bag on the floor! Pick it up! Want to argue about it?',
      choices:Object.freeze([Object.freeze({id:'apologise',label:'Sorry, I will move it.'}),Object.freeze({id:'confront',label:'Back off.'})])})});
  }
  function completeEncounter(outcome) {
    encounterState.phase='complete';encounterState.outcome=outcome;encounterSerial++;
    emit({type:'encounter-complete',...encounter()});
  }
  function respondDialogue(id,choice,{actor,hasLineOfSight}={}) {
    const p=dialoguePerson(id,actor,hasLineOfSight);
    if(encounterState?.phase!=='dialogue' || !p || !['apologise','confront'].includes(choice)) return Object.freeze({ok:false,reason:'The conversation has ended.'});
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
      p.anger=0;p.angerOffender=null;frighten(p); witness ||= p; count++;
    }
    report({x,z,offenderId},kind,witness);
    return count;
  }
  function strike({x,z,yaw=0,range=2,damage=20,kind='melee',hasLineOfSight,offenderId='player'} = {}) {
    const hits = [];
    if (!plan || ![x,z,yaw,range,damage].every(finite)) return {hits:0,people:hits};
    const reach=clamp(range,0,100), power=clamp(damage,0,100);
    const gun=['pistol','gunshot','firearm','shot','fire'].includes(kind);
    const candidates=people.map(p=>({p,distance:Math.hypot(p.x-x,p.z-z)})).filter(({p,distance})=>{
      const forward=(p.x-x)*-Math.sin(yaw)+(p.z-z)*-Math.cos(yaw);
      const lateral=Math.abs((p.x-x)*Math.cos(yaw)-(p.z-z)*Math.sin(yaw));
      return power>0 && p.health>0 && p.hitCooldown<=0 && distance<=reach && forward>=-.3 &&
        (gun ? lateral<=.55 : forward>=distance*.25) && (!hasLineOfSight || hasLineOfSight({x,z},p));
    }).sort((a,b)=>a.distance-b.distance);
    for (const {p} of candidates.slice(0,gun?1:3)) {
      p.health=Math.max(0,p.health-power); p.hitCooldown=.4; p.stun=.65;
      if (offenderId==='player' && kind==='melee') p.playerHitTimer=12;
      if (p.health===0 || power>=35) p.knockdown=2.8;
      if (p.health===0) p.crimePhase=null;
      p.anger=!gun && p.character==='booth-guest' && p.health>0 && Math.hypot(p.x-x,p.z-z)<=2.6 ? 1 : 0;
      p.angerOffender=p.anger?offenderId:null;
      frighten(p,10);
      hits.push(Object.freeze({id:p.id,x:p.x,z:p.z,health:p.health,reaction:p.reaction}));
    }
    if (hits.length) report({x,z,offenderId},kind,candidates[0].p);
    return {hits:hits.length,people:hits};
  }
  function snapshot() { return people.map(({home,target,progress,direction,playerHitTimer,...p})=>Object.freeze({...p,
    threatened:playerHitTimer>0,lastPlayerHit:playerHitTimer>0,crimePhase:p.health>0?p.crimePhase:null})); }
  function clear() { plan=null;people=[];elapsed=0;crime=null;reportCooldown=0;events.length=0;encounterState=null; }
  return {load,update,nearestDialogue,startDialogue,respondDialogue,get encounter(){return encounter();},clipMovement,snapshot,clear,strike,alert,setCrime,getCrimeTarget,
    drainEvents(){return events.splice(0);},get stats(){return Object.freeze({active:plan?.id || null,count:people.length,limit:LIMIT,elapsed});}};
}

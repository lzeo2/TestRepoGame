// Original fictional game job. Symbol cues and authored encounters are game
// rules; this module has no wallet, persistence, combat or aircraft authority.
export const SKYLINE_JOB_ID='skyline-retrieval';
const SYMBOLS=Object.freeze(['x','up','y']);
const DROP_HEIGHT=600, DROP_APPROACH=120, DROP_STEER_SPEED=24;
const FREEFALL_SPEED=46, LANDING_HEIGHT=24, LANDING_SPEED=8;
const RESPONSE_SECONDS=4;
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const clamp=n=>Math.max(-1,Math.min(1,Number.isFinite(n)?n:0));

export function createSkylineJob({site={x:0,z:0,yaw:0,groundY:0},groundHeightAt}={}){
  if(!finite(site))throw new TypeError('Skyline job requires a finite fictional site.');
  const yaw=Number.isFinite(site.yaw)?site.yaw:0,c=Math.cos(yaw),s=Math.sin(yaw);
  const ground=(x,z)=>{const y=groundHeightAt?.(x,z);return Number.isFinite(y)?y:Number.isFinite(site.groundY)?site.groundY:0;};
  const point=(x,z)=>{const wx=site.x+c*x+s*z,wz=site.z-s*x+c*z;return{x:wx,z:wz,y:ground(wx,wz),yaw};};
  const station=(id,label,x,z,radius=2.2)=>freeze({id,label,...point(x,z),radius});
  const landing=station('skyline-landing','Marked drop zone',-140,-150,28);
  const dropStart=point(-140,-150+DROP_APPROACH);
  const searches=freeze([
    station('skyline-relay','Relay cache',115,-145),
    station('skyline-manifest','Manifest cache',-125,55),
    station('skyline-key','Cipher cache',125,120),
  ]);
  const safe=station('skyline-safe','Symbol safe',5,0),loot=station('skyline-loot','Retrieve the sealed case',5,2.8,1.8);
  const helipad=station('skyline-helipad','Extraction helipad',-155,155,10);
  const airRoute=freeze([station('skyline-flight-1','Fly through the first air marker',-150,-650,75),station('skyline-flight-2','Fly through the second air marker',650,-1150,75),station('skyline-flight-3','Reach the extraction air marker',1050,-400,90)].map(p=>({...p,y:p.y+80,altitude:80})));
  const layout=freeze({id:'skyline-temporary-yard',name:'Skylark freight yard',fictional:true,origin:{...point(0,0)},width:400,depth:400,landing,searches,safe,loot,helipad,airRoute,
    briefing:'Drop into the fictional Skylark yard. Clear each cache, trigger its alert, defeat the response crew and capture it. Match the safe symbols, collect the case and defeat the foreman. Pilot the extraction helicopter through the air markers.',
    targetDurationSeconds:900,reward:8500});
  let attempt=0,eventSerial=0,current=null,events=[],cached=null;
  const dirty=()=>{cached=null;};
  const emit=(type,data={})=>events.push(freeze({type,jobId:SKYLINE_JOB_ID,missionId:current?.missionId,attempt,serial:++eventSerial,...data}));
  const usable=ctx=>current&&ctx.paused!==true&&ctx.recovering!==true&&ctx.dead!==true;
  const near=(ctx,p,r=p.radius)=>ctx.onFoot===true&&finite(ctx.player)&&distance(ctx.player,p)<=r&&(!Number.isFinite(ctx.player.y)||Math.abs(ctx.player.y-p.y)<3);
  const result=(ok,message)=>({ok,message});
  const active=()=>current&&!['complete','failed','cancelled'].includes(current.stage);
  function setStage(stage){current.stage=stage;dirty();}
  function fail(reason='Job failed.'){
    if(!active())return result(false,'No active job.');
    current.reason=reason;setStage('failed');emit('failed',{reason});return result(false,reason);
  }
  function start(){
    if(active())return result(false,'Finish or cancel the active retrieval.');
    attempt++;
    current={missionId:`${SKYLINE_JOB_ID}:${attempt}`,stage:'freefall',elapsed:0,leg:0,enemies:[],defeated:new Set(),alerted:new Set(),reinforced:new Set(),responseRemaining:0,encounterKind:null,
      pose:{...dropStart,y:dropStart.y+DROP_HEIGHT,verticalSpeed:-FREEFALL_SPEED},safeRound:0,safeIndex:0,safeRemaining:0,safeMistakes:0,safeSequence:[],loot:false,
      flightIndex:0,controlledSeconds:0,flightDistance:0,lastFlight:null,reason:'',extractionId:`skyline-extraction:${attempt}`};
    dirty();emit('started',{pose:{...current.pose}});return result(true,'Steer into the marked drop zone and release the controls over the ring.');
  }
  function encounter(boss=false,reinforcement=false){
    const center=boss?point(-45,20):searches[current.leg],id=`${current.missionId}:${boss?'boss':`${reinforcement?'reinforcement':'wave'}-${current.leg+1}`}`;
    const offsets=[[-13,-8],[13,8],[-10,12]],count=boss?1:reinforcement?(current.leg===0?2:3):4;
    current.enemies=freeze(Array.from({length:count},(_,i)=>{
      const angle=yaw+i*Math.PI/2,[dx,dz]=offsets[(i+current.leg)%offsets.length];
      const p=reinforcement?{x:center.x+c*dx+s*dz,z:center.z-s*dx+c*dz}:{x:center.x+Math.cos(angle)*(boss?6:12),z:center.z+Math.sin(angle)*(boss?6:12)};
      const targetId=`${id}:${i+1}`;
      return {id:targetId,targetId,missionId:current.missionId,encounterId:id,...p,y:ground(p.x,p.z),yaw,
        health:boss?220:reinforcement?90+current.leg*10:100,label:boss?'Foreman Vale':`Skylark ${reinforcement?'response':'crew'} ${i+1}`,appearanceId:boss?'contract:skyline-foreman':reinforcement?'contract:skyline-response':'contract:skyline-crew',boss,reinforcement};
    }));
    current.encounterId=id;current.encounterKind=boss?'boss':reinforcement?'reinforcement':'initial';current.defeated=new Set();setStage(boss?'boss':'encounter');emit('encounter-start',{encounterId:id,enemies:current.enemies,boss,reinforcement});
  }
  function beginSafeRound(){
    const length=4+current.safeRound;
    const pattern=[0,2,1,2,0,1];
    current.safeSequence=freeze(Array.from({length},(_,i)=>SYMBOLS[(attempt+current.safeRound+pattern[i])%SYMBOLS.length]));
    current.safeIndex=0;current.safeRemaining=length*2.4;dirty();
  }
  function symbol(value,ctx={}){
    if(!usable(ctx)||current.stage!=='safe'||!near(ctx,safe)||!SYMBOLS.includes(value))return result(false,'Use the safe from beside its panel.');
    if(value!==current.safeSequence[current.safeIndex]){
      current.safeMistakes++;beginSafeRound();return result(false,'Wrong symbol. Try this row again.');
    }
    current.safeIndex++;
    if(current.safeIndex===current.safeSequence.length){
      current.safeRound++;
      if(current.safeRound===3){setStage('loot');emit('safe-opened');return result(true,'Safe open. Take the sealed case.');}
      beginSafeRound();return result(true,'Row matched. Match the next row.');
    }
    dirty();return result(true,'Symbol matched.');
  }
  function extractionMatches(e){return e&&e.active===true&&e.vehicleId===current.extractionId&&finite(e)&&Number.isFinite(e.y);}
  function interact(ctx={}){
    if(!usable(ctx)||!active())return result(false,'No available job interaction.');
    if(current.stage==='search'&&near(ctx,searches[current.leg])){
      if(current.alerted.has(current.leg))return result(false,'Clear the response crew before capturing this cache.');
      current.alerted.add(current.leg);current.responseRemaining=RESPONSE_SECONDS;
      setStage('response');emit('reinforcement-alert',{stationId:searches[current.leg].id,cacheIndex:current.leg+1,responseSeconds:RESPONSE_SECONDS});
      return result(true,'Cache alert triggered. Response crew arrives in 4 seconds.');
    }
    if(current.stage==='capture'&&current.reinforced.has(current.leg)&&near(ctx,searches[current.leg])){
      emit('cache-searched',{stationId:searches[current.leg].id,captured:true});current.leg++;
      setStage(current.leg<searches.length?'approach':'safe-approach');
      return result(true,current.leg<searches.length?'Cache captured. Reach the next cache.':'Final cache captured. Reach the symbol safe.');
    }
    if(current.stage==='safe-approach'&&near(ctx,safe)){beginSafeRound();setStage('safe');return result(true,'Match each visible symbol before its row timer expires.');}
    if(current.stage==='loot'&&near(ctx,loot)){
      current.loot=true;emit('loot-picked',{lootId:loot.id});encounter(true);return result(true,'Case secured. Resolve the foreman encounter.');
    }
    if(current.stage==='helipad'&&near(ctx,helipad)){
      const e=ctx.extraction;
      if(!extractionMatches(e)||distance(e,helipad)>helipad.radius||Math.abs(e.y-helipad.y)>3||distance(ctx.player,e)>3.5)return result(false,'Approach the active extraction helicopter on its pad.');
      setStage('boarding');emit('board-request',{vehicleId:current.extractionId});return result(true,'Board the extraction helicopter.');
    }
    return result(false,'Reach the marked objective on foot.');
  }
  function step(dt,ctx={},input={}){
    if(!active()||ctx.paused===true||!Number.isFinite(dt)||dt<=0)return;
    if(ctx.dead===true||ctx.recovering===true){fail('The retrieval was interrupted.');return;}
    // Fixed-step callers normally supply 1/60. Long suspended frames cannot
    // skip the drop, safe or moving-flight checks.
    dt=Math.min(dt,.25);current.elapsed+=dt;dirty();
    if(current.stage==='freefall'||current.stage==='flare'){
      const p=current.pose;
      let dx=clamp(input.steerX),dz=clamp(input.steerZ),length=Math.hypot(dx,dz);if(length>1){dx/=length;dz/=length;}
      const speed=current.stage==='flare'?LANDING_SPEED:DROP_STEER_SPEED;
      p.x+=dx*speed*dt;p.z+=dz*speed*dt;
      if(length>.01)p.yaw=Math.atan2(-dx,-dz);
      const floor=ground(p.x,p.z);
      const inZone=distance(p,landing)<=landing.radius;
      if(current.stage==='freefall'&&inZone&&p.y-floor<=LANDING_HEIGHT&&p.y>=floor){
        p.verticalSpeed=-LANDING_SPEED;
        setStage('flare');emit('landing-flare');
      }
      p.y+=p.verticalSpeed*dt;
      if(p.y<=floor){
        p.y=floor;
        if(current.stage!=='flare'||!inZone){fail('Missed the drop zone. Steer into the ring before reaching the ground.');return;}
        p.verticalSpeed=0;setStage('landing');emit('landed',{pose:{...p}});
      }
      return;
    }
    if(current.stage==='landing'&&near(ctx,landing)){setStage('approach');return;}
    if(current.stage==='approach'&&near(ctx,searches[current.leg],32)){encounter();return;}
    if(current.stage==='response'){
      current.responseRemaining=Math.max(0,current.responseRemaining-dt);
      if(!current.responseRemaining)encounter(false,true);
      return;
    }
    if(current.stage==='encounter'||current.stage==='boss'){
      for(const receipt of Array.isArray(ctx.enemyOutcomes)?ctx.enemyOutcomes:[]){
        if(receipt?.type!=='defeated'||receipt.missionId!==current.missionId||receipt.outcome!=='killed'||!Number.isSafeInteger(receipt.serial)||receipt.serial<=0||receipt.encounterId!==current.encounterId)continue;
        if(current.enemies.some(e=>e.targetId===receipt.targetId))current.defeated.add(receipt.targetId);
      }
      if(current.enemies.every(e=>current.defeated.has(e.targetId))){
        const boss=current.stage==='boss',reinforcement=current.encounterKind==='reinforcement';emit('encounter-cleared',{encounterId:current.encounterId,boss,reinforcement});current.enemies=[];
        if(reinforcement)current.reinforced.add(current.leg);
        setStage(boss?'helipad':reinforcement?'capture':'search');
        if(boss)emit('extraction-ready',{vehicleId:current.extractionId,pad:helipad});
      }
      return;
    }
    if(current.stage==='safe'){
      if(!near(ctx,safe)){setStage('safe-approach');return;}
      current.safeRemaining-=dt;
      if(current.safeRemaining<=0){current.safeMistakes++;beginSafeRound();}
      if(input.confirmSymbol!==undefined)symbol(input.confirmSymbol,ctx);
      return;
    }
    const e=ctx.extraction;
    if(current.stage==='boarding'){
      if(extractionMatches(e)&&e.boarded===true&&distance(e,helipad)<=helipad.radius&&Math.abs(e.y-helipad.y)<5){
        current.lastFlight={x:e.x,y:e.y,z:e.z};setStage('flight');emit('flight-start',{vehicleId:current.extractionId});
      }
      return;
    }
    if(current.stage==='flight'){
      if(!extractionMatches(e)||e.boarded!==true){current.lastFlight=null;return;}
      const previous=current.lastFlight;current.lastFlight={x:e.x,y:e.y,z:e.z};
      const moved=previous?Math.hypot(e.x-previous.x,e.y-previous.y,e.z-previous.z):0;
      const flying=e.pilotControlled===true&&Number.isFinite(e.speed)&&Math.abs(e.speed)>=5&&e.y-ground(e.x,e.z)>=25&&previous&&moved<=120*dt+2&&moved>.01;
      if(!flying)return;
      current.controlledSeconds+=dt;current.flightDistance+=moved;
      const target=airRoute[current.flightIndex];
      const airDistance=p=>Math.hypot(e.x-p.x,e.y-p.y,e.z-p.z);
      if(target&&airDistance(target)<=target.radius){current.flightIndex++;emit('air-marker',{index:current.flightIndex});}
      if(current.flightIndex===airRoute.length&&current.controlledSeconds>=45&&current.flightDistance>=1500&&airDistance(airRoute.at(-1))<=airRoute.at(-1).radius){
        setStage('complete');emit('complete',{reward:layout.reward,elapsed:current.elapsed,controlledFlightSeconds:current.controlledSeconds,flightDistance:current.flightDistance,lootId:loot.id});
      }
    }
  }
  function marker(){
    if(!current)return null;
    if(['freefall','flare','landing'].includes(current.stage))return landing;
    if(['approach','search','response','encounter','capture'].includes(current.stage))return searches[current.leg];
    if(['safe-approach','safe'].includes(current.stage))return safe;
    if(current.stage==='loot')return loot;
    if(current.stage==='boss')return current.enemies[0]||null;
    if(['helipad','boarding'].includes(current.stage))return helipad;
    if(current.stage==='flight')return airRoute[Math.min(current.flightIndex,airRoute.length-1)];
    return null;
  }
  const objective=()=>({freefall:'Steer into the marked drop zone.',flare:'Landing. Stay inside the ring.',landing:'Drop zone reached.',approach:'Reach the next marked cache.',encounter:current?.encounterKind==='reinforcement'?'Defeat the cache response crew.':'Defeat the crew guarding this cache.',search:'Use the cleared cache to trigger its alert.',response:`Response crew arrives in ${Math.ceil(current?.responseRemaining||0)}s.`,capture:'Response crew cleared. Capture the cache on foot.',
    'safe-approach':'Reach the symbol safe on foot.',safe:'Match the visible symbol row before its timer expires.',loot:'Take the sealed case from the open safe.',boss:'Defeat foreman Vale.',helipad:'Reach the helipad and board the extraction helicopter.',boarding:'Board the active extraction helicopter.',flight:'Pilot through the air markers. Keep moving above the flight floor.',complete:'Retrieval complete.',failed:current?.reason,cancelled:'Retrieval cancelled.'})[current?.stage]||'Start the Skylark retrieval.';
  function snapshot(){
    if(!cached)cached=freeze({active:Boolean(active()),jobId:SKYLINE_JOB_ID,missionId:current?.missionId||null,attempt,stage:current?.stage||'idle',objective:objective(),layout,marker:marker(),elapsed:current?.elapsed||0,
      pose:current?{...current.pose}:null,enemies:current?.enemies||[],encounterId:current?.encounterId||null,defeated:current?[...current.defeated]:[],lootCollected:current?.loot||false,
      encounterKind:current?.encounterKind||null,responseRemaining:current?.responseRemaining||0,
      caches:searches.map((cache,i)=>({stationId:cache.id,alerted:current?.alerted.has(i)||false,reinforcementsCleared:current?.reinforced.has(i)||false,captured:(current?.leg||0)>i})),
      safe:{sequence:current?.safeSequence||[],index:current?.safeIndex||0,round:current?.safeRound||0,rounds:3,remaining:Math.max(0,current?.safeRemaining||0),mistakes:current?.safeMistakes||0},
      extraction:{vehicleId:current?.extractionId||null,pad:helipad,route:airRoute,markerIndex:current?.flightIndex||0,controlledSeconds:current?.controlledSeconds||0,requiredSeconds:45,distance:current?.flightDistance||0,requiredDistance:1500},
      targetDurationSeconds:layout.targetDurationSeconds});
    return cached;
  }
  function cancel(){if(!active())return false;setStage('cancelled');emit('cancelled');return true;}
  return {start,step,interact,symbol,fail,cancel,snapshot,drainEvents(){const out=events;events=[];return out;},layout};
}

import * as THREE from '../vendor/three.module.js';
import { AbilityFX, createHeroVisual } from './hero-visuals.mjs';
import { isFlyingDigits, flyingDigitDirections, flyingDigitStep } from './flying-digits.mjs';
import { END_SHIFT_SPRINT, isEndShiftSprint, endShiftEligible, endShiftClock } from './end-shift-sprint.mjs';
import { SPEED_TRAP, isSpeedTrap, speedTrapEligible, speedTrapClock } from './speed-trap.mjs';
import { isOfficePlantsSupport, officePlantsClock, officePlantsEligible } from './office-plants.mjs';
import { SHEEN_WALL, isSheenWall, sheenWallBounds } from './sheen-wall.mjs';
import { KEEP_CLEAR, isKeepClear, keepClearAxis, keepClearBounds } from './keep-clear.mjs';
import { TAPE_SNAG, isTapeSnag, tapeSnagEligible, tapeSnagClock } from './tape-snag.mjs';
import { isBadRewind } from './cassette-slice.mjs';
import { RECORDED_ASSEMBLY, isRecordedAssembly, recordedAssemblyClock, recordedAssemblyEligible } from './recorded-assembly.mjs';
import { SIDE_A, isSideA, sideAEligible } from './side-a.mjs';
import { isWideMargin, isCleanBreak } from './whitespace-slice.mjs';
import { isLaminatedSprint, isApprovedOnly } from './laminate-slice.mjs';
import { PERMANENT_RECORD, isPermanentRecord, permanentRecordClock, permanentRecordEligible } from './permanent-record.mjs';
import { UNPRINTED_PASSAGE, isUnprintedPassage, passageDirection, passageCenters, passageZoneIndex, passageClock } from './unprinted-passage.mjs';

const vec = p => new THREE.Vector3(p.x, p.y, p.z);
const box3 = b => b.min ? b : new THREE.Box3(new THREE.Vector3(b.minX,b.minY,b.minZ),new THREE.Vector3(b.maxX,b.maxY,b.maxZ));
const UP = new THREE.Vector3(0,1,0);
const SHOT_VISUAL_WINDOW = .12;
const SLOT_VISUAL_WINDOWS = Object.freeze({volley:.8,glue:.8,slam:1,longshot:.65});
const CAST_IDS = new Set(['windowpatch','patientgrowth','sheenwall','keepclear','tapesnag','badrewind','recordedassembly','sidea','approvedonly','permanentrecord','laminatedsprint','unprintedpassage','cleanbreak','widemargin','speedtrap','endshiftsprint','flyingdigits','fastlane','hook','volley','glue','slam','overtime','headshot','xray','chaingun','aura','turret','barricade','grenade','missionbomb','longshot','tether','puddle']);
const PAYLOAD_CAST_IDS = new Set(['volley','glue','slam','longshot','tether','turret','grenade','missionbomb','puddle']);
const PERIODIC_CAST_IDS = new Set(['turret','puddle','aura','chaingun']);
const TIMED_CAST_IDS = new Set(['overtime','headshot','xray','chaingun','aura','turret','barricade','grenade','missionbomb','tether','puddle']);
const hasValidSlowDuration = a => !('slowDuration' in a)||Number.isFinite(a.slowDuration)&&a.slowDuration>0&&a.slowDuration<=3600;
const isPureSlowDefinition = a => a.damageType==='none'&&a.baseDamage===0&&
  (a.baseHeal??0)===0&&(a.spiritScale??0)===0&&Number.isFinite(a.slow)&&a.slow>0&&a.slow<=.9&&
  Number.isFinite(a.duration)&&a.duration>0&&a.duration<=3600&&Number.isFinite(a.range)&&a.range>0&&a.range<=10000&&
  !a.invulnerable&&(a.speedMultiplier??1)===1&&(a.headshotMultiplier??1)===1;
const hasValidAnchoredSlow = a => !('anchoredSlow' in a)||typeof a.anchoredSlow==='boolean'&&(!a.anchoredSlow||a.id==='puddle'&&isPureSlowDefinition(a)&&Number.isFinite(a.radius)&&a.radius>0&&a.radius<=10000);
const hasValidApplicationBudget = a => !('maxApplicationsPerTarget' in a)||a.anchoredSlow===true&&Number.isSafeInteger(a.maxApplicationsPerTarget)&&a.maxApplicationsPerTarget>0;

/** Visual/ability intent layer, not a damage authority. Targets have id, team,
 * position (feet), alive, radius?, height?, optional readonly autoTargetable
 * (false excludes automatic acquisition). onEffect receives IDs and unscaled
 * kit values; systems owns HP, armor, shop scaling and status enforcement.
 * Remote impacts include a plain origin {x,y,z} snapshot: deployment/explosion
 * center for areas, turret muzzle for shots, never the owner's later position.
 * Call update after controller.update; aim(camera) before fire/cast. Owns only
 * its temporary barricade colliders; clear/dispose removes those from boxes.
 * Active reveals read current targets/positions on every FX update, including
 * replaced records; membership uses the caster's current team, position and range.
 * setModifiers accepts the systems-derived cooldown/fire/reload multipliers,
 * magazine size and move multiplier. Defaults are the JSON baseline.
 */
export class HeroRuntime {
  constructor({scene,controller,kit,targets=[],boxes=controller.boxes,team='carbon',source='player',onEffect=()=>{}}) {
    this.scene=scene;this.controller=controller;this.kit=kit;this.targets=targets;this.boxes=boxes;
    this.team=team;this.source=source;this.onEffect=onEffect;
    this.visual=createHeroVisual(kit.id);scene.add(this.visual.group);this.fx=new AbilityFX(scene);
    this.modifiers={cooldown:1,fire:1,reload:1,magazine:kit.weapon.magazine,move:1};
    this.camera=null;this.acceptedAction=null;this.deploymentSequence=0;this.burstSequence=0;this.bursts=new Map();this.reset();
  }
  get weaponAction() { return this.acceptedAction?.kind==='weapon'?this.acceptedAction:null; }
  setModifiers(values) {
    const entries=Object.entries(values);
    for(const [key,value] of entries) {
      if(!Object.hasOwn(this.modifiers,key)||!Number.isFinite(value)||value<=0||value>100) throw new RangeError('Invalid hero modifier');
      if(key==='magazine'&&!Number.isInteger(value)) throw new RangeError('Magazine must be an integer');
    }
    for(const [key,value] of entries)this.modifiers[key]=value;
    this.ammo=Math.min(this.ammo,this.modifiers.magazine);
  }
  aim(camera) { this.camera=camera; }
  get origin() { const c=this.controller;return c.position.clone().addScaledVector(UP,1.25).add(new THREE.Vector3(Math.cos(c.yaw)*.55,0,-Math.sin(c.yaw)*.55)); }
  get direction() {
    const c=this.controller;
    return new THREE.Vector3(-Math.sin(c.yaw)*Math.cos(c.pitch),Math.sin(c.pitch),-Math.cos(c.yaw)*Math.cos(c.pitch));
  }
  trace(origin,direction,range,targets=true,ignorePanelId=null) {
    const ray=new THREE.Ray(origin,direction.clone().normalize()),point=new THREE.Vector3();
    let result={distance:range,point:ray.at(range,new THREE.Vector3()),target:null,wall:null};
    for(const wall of this.boxes) if(wall.panelTarget?.alive!==false&&!(ignorePanelId!==null&&wall.panelTarget?.id===ignorePanelId)&&ray.intersectBox(box3(wall),point)) {
      const distance=origin.distanceTo(point);
      if(distance<result.distance) result={distance,point:point.clone(),target:wall.panelTarget??null,wall};
    }
    if(targets) for(const target of this.targets) {
      if(target.kind==='panel'||target.alive===false||target.team===this.team) continue;
      const p=target.position,r=target.radius??.6,h=target.height??1.8;
      const bounds=new THREE.Box3(new THREE.Vector3(p.x-r,p.y,p.z-r),new THREE.Vector3(p.x+r,p.y+h,p.z+r));
      if(ray.intersectBox(bounds,point)) {
        const distance=origin.distanceTo(point);
        if(distance<result.distance) result={distance,point:point.clone(),target,wall:null,headshot:point.y>p.y+h*.76};
      }
    }
    return result;
  }
  aimHit(range) {
    // Resolve the reticle ray, then trace from the muzzle: no shooting through
    // cover merely because the shoulder camera can see around it.
    let direction=this.direction;
    if(this.camera) {
      const sight=this.trace(this.camera.position,this.camera.getWorldDirection(new THREE.Vector3()),range+8);
      direction=sight.point.sub(this.origin).normalize();
    }
    return this.trace(this.origin,direction,range);
  }
  visible(from,target) {
    const destination=vec(target.position).addScaledVector(UP,(target.height??1.8)*.5);
    const delta=destination.sub(from),distance=delta.length();
    return this.trace(from,delta.normalize(),distance,false,target.kind==='panel'?target.id:null).distance>=distance-.01;
  }
  emit(kind,ability,target=null,extra={}) {
    return this.onEffect({kind,source:this.source,target:target?.id??null,ability:ability.id??ability.name,
      baseDamage:ability.baseDamage??0,baseHeal:ability.baseHeal??0,damageType:ability.damageType??'none',
      spiritScale:ability.spiritScale??0,slow:ability.slow??0,duration:ability.duration??0,...extra});
  }
  hit(ability,target,extra={}) {
    if(ability.id==='sheenwall'&&(this.bursts.get(extra.burstId)?.definition!==ability||!Number.isInteger(extra.projectileIndex)||extra.projectileIndex<0||extra.projectileIndex>=SHEEN_WALL.projectileCount))return;
    if(ability.id==='speedtrap'||ability.id==='unprintedpassage'||ability.id==='tapesnag')return; // Only the owned field may dispatch anchored slow/reveal.
    if(!hasValidSlowDuration(ability)||!hasValidAnchoredSlow(ability)||!hasValidApplicationBudget(ability)||!target||target.alive===false||target.team===this.team) return;
    if(ability.baseDamage>0){this.emit('damage',ability,target,extra);return;}
    if(!this.kit.abilities.includes(ability)||!isPureSlowDefinition(ability)||!['hero','trooper'].includes(target.kind))return;
    if(ability.anchoredSlow===true) {
      const origin=extra.origin,id=extra.deploymentId;
      if(!Number.isSafeInteger(id)||id<=0||!origin||Object.getPrototypeOf(origin)!==Object.prototype||!['x','y','z'].every(k=>Number.isFinite(origin[k])))return;
      const deploy=this.deployments.find(d=>d.deploymentId===id&&d.definition===ability);
      if(!deploy||deploy.left<=0||!['x','y','z'].every(k=>origin[k]===deploy.position[k]))return;
      const center=vec(origin);
      if(center.distanceTo(vec(target.position))>ability.radius||!this.visible(center.clone().addScaledVector(UP,.7),target))return;
      const limit=ability.maxApplicationsPerTarget;
      const counts=limit===undefined?null:(deploy.applicationCounts??=new Map());
      if(counts){const count=counts.get(target.id)??0;if(count>=limit)return;counts.set(target.id,count+1);}
      let acknowledged=false;
      try {
        const result=this.emit('status',ability,target,{anchoredSlow:true,deploymentId:id,origin:{x:origin.x,y:origin.y,z:origin.z}});
        acknowledged=result!==null&&typeof result==='object'&&result.ok===true;
      } finally {
        if(counts&&!acknowledged){const left=(counts.get(target.id)??1)-1;if(left>0)counts.set(target.id,left);else counts.delete(target.id);}
      }
    } else if(this.controller.position.distanceTo(vec(target.position))<=ability.range&&this.visible(this.origin,target))this.emit('status',ability,target);
  }
  area(ability,center,{cone=false,heal=false,deploymentId,owner}={}) {
    const ownsPulse=()=>!owner||!this.closed&&owner.definition===ability&&owner.left>0&&(this.buffs[ability.id]===owner||this.deployments.includes(owner));
    const extra={origin:{x:center.x,y:center.y,z:center.z}};
    if(deploymentId!==undefined)extra.deploymentId=deploymentId;
    for(const target of this.targets) {
      if(!ownsPulse())return;
      if(target.alive===false||target.id===this.source) continue;
      const delta=vec(target.position).sub(center),distance=delta.length();
      if(distance>(ability.radius??ability.range)||!this.visible(center.clone().addScaledVector(UP,.7),target)) continue;
      if(cone&&distance>.01&&delta.normalize().dot(this.direction)<Math.cos(ability.coneRadians??.8)) continue;
      if(target.team===this.team) { if(heal&&ability.baseHeal>0&&!['structure','panel'].includes(target.kind)) this.emit('heal',ability,target,extra); }
      else this.hit(ability,target,extra);
    }
    if(!ownsPulse())return;
    if(heal&&ability.baseHeal>0&&center.distanceTo(this.controller.position)<=(ability.radius??0)) this.emit('heal',ability,{id:this.source},extra);
  }
  clearAcceptedAction() {
    if(!this.acceptedAction)return false;
    this.acceptedAction=null;this.visual.clearAction?.();
    const c=this.controller;
    this.visual.update(0,{state:c.state,speed:c.velocity.length(),worldVelocity:c.velocity,yaw:c.yaw,aiming:c.aiming,recoil:this.recoil});
    return true;
  }
  sampleAcceptedAction() {
    const action=this.acceptedAction;
    if(!action)return;
    const phase=THREE.MathUtils.clamp((this.time-action.acceptedAt)/action.duration,0,1);
    if(phase===1){this.clearAcceptedAction();return;}
    this.visual.setAcceptedAction({accepted:true,kind:action.kind,...(action.kind==='slot'?{slot:action.slot}:{}),phase});
  }
  fire() {
    if(this.closed||this.resetting||this.fireWait>0||this.reload>0) return false;
    if(this.ammo<=0&&!this.controller.infiniteAmmo) { this.startReload();return false; }
    const ability=this.kit.weapon,hit=this.aimHit(ability.range);
    if(!this.controller.infiniteAmmo) this.ammo--;
    this.shots++;
    this.fireWait=ability.interval*this.modifiers.fire;
    if(typeof this.visual.setAcceptedAction==='function') {
      this.acceptedAction={kind:'weapon',acceptedAt:this.time,duration:SHOT_VISUAL_WINDOW};
      this.sampleAcceptedAction();
    }
    const c=this.controller;
    this.recoil=1;this.visual.group.position.copy(c.position);
    this.visual.update(0,{state:c.state,speed:c.velocity.length(),worldVelocity:c.velocity,yaw:c.yaw,aiming:c.aiming,recoil:this.recoil});
    // Cosmetic emitter follows the real held assembly; covered damage ray stays unchanged.
    const muzzle=this.visual.muzzle.getWorldPosition(new THREE.Vector3());
    this.fx.emit('shot',{origin:muzzle,target:hit.point,impact:!!(hit.target||hit.wall),color:this.kit.id==='gooey'?'#b7df73':'#ffe6a3',duration:SHOT_VISUAL_WINDOW});
    this.hit(ability,hit.target,{headshot:!!hit.headshot,headshotMultiplier:hit.headshot?(this.buffs.headshot?.definition.headshotMultiplier??ability.headshotMultiplier):1});
    if(this.ammo===0&&!this.controller.infiniteAmmo) this.startReload();
    return true;
  }
  startReload() { if(this.closed||this.resetting)return; if(!this.reload&&this.ammo<this.modifiers.magazine)this.reload=this.kit.weapon.reload*this.modifiers.reload; }
  melee() {
    if(this.closed||this.resetting||!this.kit.melee||this.meleeWait>0)return false;
    this.meleeWait=this.kit.melee.cooldown;this.clearAcceptedAction();
    this.fx.emit('melee',{origin:this.controller.position.clone(),direction:this.direction,duration:.4});
    this.area(this.kit.melee,this.controller.position,{cone:true});return true;
  }
  parry() {
    if(this.closed||this.resetting||this.parryWait>0)return false;
    this.parryWait=3;this.clearAcceptedAction();this.fx.emit('parry',{origin:this.controller.position.clone(),direction:this.direction,duration:.65,color:'#4e80a7'});
    this.emit('parry',{id:'parry',duration:.65});return true;
  }
  groundPoint(range) {
    const hit=this.aimHit(range),p=hit.point.clone();
    // Ground cast is bounded by the first solid surface, never behind a wall.
    const delta=p.clone().sub(this.origin);delta.y=0;
    if(delta.length()>range) delta.setLength(range);
    p.copy(this.controller.position).add(delta);
    p.y=this.controller.floorHeight(p.x,p.z,this.controller.position.y+2);
    if(!Number.isFinite(p.y))p.y=this.controller.position.y;
    return p;
  }
  cast(slot) {
    if(this.closed||this.resetting||this.pendingCast)return false;
    const definition=this.kit.abilities.find(a=>a.slot===slot);
    if(!definition||!CAST_IDS.has(definition.id)||this.cooldowns[slot]>0)return false;
    if(definition.id==='fastlane'&&(this.kit.id!=='odometer'||this.kit.partialSlice!==true||slot!==1||definition.windup!==.1||definition.cooldown!==6||definition.duration!==2||definition.speedMultiplier!==1.7||definition.invulnerable!==false||definition.baseDamage!==0||definition.baseHeal!==0||definition.spiritScale!==0||definition.slow!==0||definition.range!==0||definition.damageType!=='none'))return false;
    if(definition.id==='flyingdigits'&&(this.kit.id!=='odometer'||this.kit.partialSlice!==true||!isFlyingDigits(definition)||this.burstSequence>=Number.MAX_SAFE_INTEGER))return false;
    if(definition.id==='endshiftsprint'&&(this.kit.id!=='odometer'||this.kit.partialSlice!==true||!isEndShiftSprint(definition)||this.deploymentSequence>=Number.MAX_SAFE_INTEGER))return false;
    if(definition.id==='speedtrap'&&(this.kit.id!=='odometer'||this.kit.partialSlice!==true||!isSpeedTrap(definition)||this.deploymentSequence>=Number.MAX_SAFE_INTEGER))return false;
    if(definition.id==='widemargin'&&(this.kit.id!=='whitespace'||this.kit.partialSlice!==true||!isWideMargin(definition)))return false;
    if(definition.id==='cleanbreak'&&(this.kit.id!=='whitespace'||this.kit.partialSlice!==true||!isCleanBreak(definition)))return false;
    if(definition.id==='unprintedpassage'&&(this.kit.id!=='whitespace'||this.kit.partialSlice!==true||!isUnprintedPassage(definition)||this.deploymentSequence>=Number.MAX_SAFE_INTEGER))return false;
    if(definition.id==='laminatedsprint'&&(this.kit.id!=='laminate'||this.kit.partialSlice!==true||!isLaminatedSprint(definition)))return false;
    if(definition.id==='permanentrecord'&&(this.kit.id!=='laminate'||this.kit.partialSlice!==true||!isPermanentRecord(definition)||this.deploymentSequence>=Number.MAX_SAFE_INTEGER))return false;
    if(['windowpatch','patientgrowth'].includes(definition.id)&&(this.kit.id!=='office-plants'||this.kit.partialSlice!==true||!isOfficePlantsSupport(definition)||this.deploymentSequence>=Number.MAX_SAFE_INTEGER))return false;
    if(definition.id==='sheenwall'&&(this.kit.id!=='laminate'||this.kit.partialSlice!==true||!isSheenWall(definition)||this.deploymentSequence>=Number.MAX_SAFE_INTEGER||this.burstSequence>=Number.MAX_SAFE_INTEGER))return false;
    if(definition.id==='keepclear'&&(this.kit.id!=='whitespace'||this.kit.partialSlice!==true||!isKeepClear(definition)||this.deploymentSequence>=Number.MAX_SAFE_INTEGER))return false;
    if(definition.id==='tapesnag'&&(this.kit.id!=='cassette'||this.kit.partialSlice!==true||!isTapeSnag(definition)||this.deploymentSequence>=Number.MAX_SAFE_INTEGER))return false;
    if(definition.id==='badrewind'&&(this.kit.id!=='cassette'||this.kit.partialSlice!==true||!isBadRewind(definition)))return false;
    if(definition.id==='recordedassembly'&&(this.kit.id!=='cassette'||this.kit.partialSlice!==true||!isRecordedAssembly(definition)||this.deploymentSequence>=Number.MAX_SAFE_INTEGER))return false;
    if(definition.id==='sidea'&&(this.kit.id!=='cassette'||this.kit.partialSlice!==true||!isSideA(definition)||this.deploymentSequence>=Number.MAX_SAFE_INTEGER))return false;
    if(definition.id==='approvedonly'&&(this.kit.id!=='laminate'||this.kit.partialSlice!==true||!isApprovedOnly(definition)))return false;
    if(!hasValidSlowDuration(definition)||!hasValidAnchoredSlow(definition)||!hasValidApplicationBudget(definition))return false;
    if(TIMED_CAST_IDS.has(definition.id)&&(!Number.isFinite(definition.duration)||definition.duration<0||definition.duration>3600))return false;
    if(PERIODIC_CAST_IDS.has(definition.id)&&(!Number.isFinite(definition.interval)||definition.interval<=0))return false;
    // Definition admission, not hit confirmation: valid misses and utilities remain casts.
    if(PAYLOAD_CAST_IDS.has(definition.id)&&!(definition.baseDamage>0)&&
      !(definition.id==='puddle'&&definition.baseHeal>0)&&!isPureSlowDefinition(definition))return false;
    const a=definition,c=this.controller,origin=this.origin,ground=c.position.clone();
    const routeDirection=a.id==='unprintedpassage'?passageDirection(c.yaw):null;
    if(routeDirection&&!this.passagePlacement(routeDirection))return false;
    const panelAxis=['keepclear','sheenwall'].includes(a.id)?keepClearAxis(c.yaw):null;
    if(panelAxis&&!this.keepClearPlacement(panelAxis,a))return false;
    const hit=['windowpatch','patientgrowth','sheenwall','keepclear','badrewind','recordedassembly','sidea','approvedonly','permanentrecord','laminatedsprint','unprintedpassage','cleanbreak','widemargin','fastlane','endshiftsprint','speedtrap'].includes(a.id)?null:this.aimHit(a.range??30),direction=hit?hit.point.clone().sub(origin).normalize():this.direction;
    if(a.id==='tapesnag'&&(!tapeSnagEligible(hit.target,c.position,this.team,TAPE_SNAG.range)||!this.visible(this.origin,hit.target)))return false;
    const barricadePoint=a.id==='barricade'?this.groundPoint(a.range):null;
    if(barricadePoint&&Math.abs(c.position.x-barricadePoint.x)<2.3&&Math.abs(c.position.z-barricadePoint.z)<.8)return false;
    // Commit only validated casts, before effect callbacks can reenter cast().
    if(routeDirection||panelAxis||a.id==='tapesnag'||this.lastPlacementFailure?.slot===3)this.lastPlacementFailure=null;
    this.cooldowns[slot]=a.cooldown*this.modifiers.cooldown;
    this.lastAbility=a.id;this.castCount[a.id]=(this.castCount[a.id]??0)+1;
    const visualWindow=SLOT_VISUAL_WINDOWS[a.id];
    if(visualWindow&&typeof this.visual.setAcceptedAction==='function') {
      this.acceptedAction={kind:'slot',slot,acceptedAt:this.time,duration:visualWindow};
      this.sampleAcceptedAction();
      this.visual.update(0,{state:c.state,speed:c.velocity.length(),worldVelocity:c.velocity,yaw:c.yaw,aiming:c.aiming,recoil:this.recoil});
    } else this.clearAcceptedAction();
    switch(a.id) {
      case 'sheenwall':this.sheenResolution=null;this.pendingCast={definition:a,left:a.windup,axis:panelAxis,direction:new THREE.Vector3(-Math.sin(c.yaw),0,-Math.cos(c.yaw))};break;
      case 'keepclear':this.pendingCast={definition:a,left:a.windup,axis:panelAxis};break;
      case 'tapesnag':this.pendingCast={definition:a,left:a.windup,targetId:hit.target.id};break;
      case 'unprintedpassage':this.pendingCast={definition:a,left:a.windup,direction:routeDirection};break;
      case 'flyingdigits':this.pendingCast={definition:a,left:a.windup,direction:direction.clone()};break;
      case 'windowpatch':case 'patientgrowth':case 'badrewind':case 'recordedassembly':case 'sidea':case 'approvedonly':case 'permanentrecord':case 'laminatedsprint':case 'cleanbreak':case 'widemargin':case 'fastlane':case 'endshiftsprint':case 'speedtrap':this.pendingCast={definition:a,left:a.windup};break;
      case 'hook': {
        this.fx.emit(a.id,{origin,target:hit.point,duration:.55});
        if(hit.wall||hit.target) {
          const destination=hit.point.clone().addScaledVector(direction,-1.1);destination.y=hit.target?hit.target.position.y:Math.max(c.position.y,destination.y-1.25);
          c.hookTo(destination);this.hit(a,hit.target);
        }
        break;
      }
      case 'volley':case 'glue':
        this.fx.emit(a.id,{origin,target:hit.point,duration:SLOT_VISUAL_WINDOWS[a.id]});this.area(a,ground,{cone:true});break;
      case 'slam':
        this.fx.emit(a.id,{origin:ground,duration:SLOT_VISUAL_WINDOWS.slam,radius:a.radius});this.area(a,ground);break;
      case 'overtime':case 'headshot':case 'xray':case 'chaingun':case 'aura': {
        const handle=this.fx.emit(a.id,{origin:a.id==='chaingun'?origin:ground,direction,targets:a.id==='xray'?()=>this.targets.filter(t=>t.team!==this.team&&t.alive!==false&&c.position.distanceTo(vec(t.position))<=(a.range??100)).map(t=>t.position):[],duration:a.duration,radius:a.radius});
        this.buffs[a.id]?.handle.dispose();
        this.buffs[a.id]={left:a.duration,definition:a,next:0,handle};
        this.emit('buff',a,{id:this.source},{invulnerable:!!a.invulnerable,speedMultiplier:a.speedMultiplier??1});break;
      }
      case 'turret': {
        const p=this.groundPoint(3),side=p.clone().add(new THREE.Vector3(Math.cos(c.yaw)*1.5,0,-Math.sin(c.yaw)*1.5));
        if(this.visible(origin,{position:side}))p.copy(side);
        this.registerDeployment({definition:a,position:p,left:a.duration,next:0,handle:this.fx.emit(a.id,{origin:p,direction,duration:a.duration})});break;
      }
      case 'barricade': {
        const p=barricadePoint;this.replaceDeploy(a.id);
        // Axis-aligned folders deliberately match the solid collision footprint.
        const wall={minX:p.x-1.8,maxX:p.x+1.8,minY:p.y,maxY:p.y+2,minZ:p.z-.25,maxZ:p.z+.25};
        this.boxes.push(wall);
        this.deployments.push({definition:a,position:p,left:a.duration,wall,handle:this.fx.emit(a.id,{origin:p,direction:new THREE.Vector3(0,0,-1),duration:a.duration})});break;
      }
      case 'grenade':case 'missionbomb': {
        this.projectiles.push({definition:a,position:origin.clone(),velocity:direction.multiplyScalar(12).addScaledVector(UP,6),left:a.duration,bounces:0,handle:this.fx.emit(a.id,{origin,duration:a.duration,radius:a.radius})});break;
      }
      case 'longshot':
        this.fx.emit(a.id,{origin,target:hit.point,duration:SLOT_VISUAL_WINDOWS.longshot});
        this.hit(a,hit.target,{headshot:!!hit.headshot,headshotMultiplier:hit.headshot?(this.buffs.headshot?.definition.headshotMultiplier??this.kit.weapon.headshotMultiplier):1});break;
      case 'tether': {
        const previous=this.tether;
        const handle=this.fx.emit(a.id,{origin,target:hit.point,duration:hit.target?a.duration:.6});
        const pending=hit.target?{targetId:hit.target.id,definition:a,left:a.duration,handle,length:origin.distanceTo(hit.point)}:null;
        this.tether=pending;
        if(previous){previous.handle.dispose();this.emit('tether-end',previous.definition,{id:previous.targetId});}
        if(this.tether===pending&&hit.target)this.hit(a,hit.target);
        break;
      }
      case 'puddle': {
        const p=this.groundPoint(a.range);
        this.registerDeployment({definition:a,position:p,left:a.duration,next:0,handle:this.fx.emit(a.id,{origin:p,duration:a.duration,radius:a.radius})});break;
      }
    }
    return true;
  }
  keepClearPlacement(axis,definition=KEEP_CLEAR) {
    const c=this.controller,origin=this.groundPoint(definition.range),bounds=definition.id==='sheenwall'?[sheenWallBounds(origin,axis)]:keepClearBounds(origin,axis);
    const overlaps=(a,b)=>a.minX<b.maxX-1e-9&&a.maxX>b.minX+1e-9&&a.minY<b.maxY-1e-9&&a.maxY>b.minY+1e-9&&a.minZ<b.maxZ-1e-9&&a.maxZ>b.minZ+1e-9;
    const solids=this.boxes.filter(b=>b.panelTarget?.alive!==false).map(b=>b.min?{minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z}:b);
    const self=this.targets.find(t=>t.id===this.source)??{id:this.source,kind:'hero'};
    for(const view of [...this.targets.filter(t=>t.id!==this.source),{...self,position:c.position}]) {
      if((view.living??view.alive)===false||view.kind==='panel'||!view.position)continue;
      const p=view.position,r=view.radius??(view.kind==='structure'?3:.6),height=view.height??(view.kind==='structure'?12:1.8);
      solids.push({minX:p.x-r,maxX:p.x+r,minY:p.y,maxY:p.y+height,minZ:p.z-r,maxZ:p.z+r});
    }
    const supported=b=>[b.minX,b.maxX].every(x=>[b.minZ,b.maxZ].every(z=>{const y=c.floorHeight(x,z,origin.y+.05);return Number.isFinite(y)&&Math.abs(y-origin.y)<=.05+1e-9;}));
    if(bounds.every(b=>supported(b)&&!solids.some(other=>overlaps(b,other))))return origin;
    this.lastPlacementFailure={slot:definition.slot,at:this.time,reason:definition.id==='sheenwall'?'Panel blocked':'Panels blocked'};return null;
  }
  startSheenWall(pending) {
    if(this.closed||this.resetting)return;
    this.sheenResolution=pending;
    try {
      this.startKeepClear(pending);
      // Independent raw components, but reset/close/new Sheen acceptance cancels this resolution.
      if(this.sheenResolution===pending&&!this.closed&&!this.resetting)this.startBurst(pending);
    } finally {if(this.sheenResolution===pending)this.sheenResolution=null;}
  }
  startKeepClear(pending) {
    if(this.closed||this.resetting)return;
    const position=this.keepClearPlacement(pending.axis,pending.definition);if(!position)return;
    // Host owns durability; KeepClearLayer owns the real meshes/shared colliders.
    const field={definition:pending.definition,position,axis:pending.axis,left:4,age:0,handle:{dispose(){}}};
    try {
      const ack=this.registerDeployment(field,{axis:pending.axis});
      if(this.closed||!this.deployments.includes(field))return;
      if(!ack||typeof ack!=='object'||ack.ok!==true){this.lastPlacementFailure={slot:pending.definition.slot,at:this.time,reason:pending.definition.id==='sheenwall'?'Panel blocked':'Panels blocked'};this.removeDeployment(field);return;}
      field.started=true;
    } catch(error) {
      try{this.removeDeployment(field);}catch(cleanupError){this.lastFieldCleanupError={deploymentId:field.deploymentId,error:cleanupError};}
      throw error;
    }
  }
  updateKeepClear(field,dt) {
    if(this.closed||this.resetting||field.started!==true||!this.deployments.includes(field))return;
    field.age+=dt;field.left=Math.max(0,KEEP_CLEAR.duration-field.age);
    if(field.left<1e-12)this.removeDeployment(field);
  }
  tapeSnagTarget(id,range=TAPE_SNAG.breakDistance) {
    const target=this.targets.find(t=>t.id===id);
    return tapeSnagEligible(target,this.controller.position,this.team,range)&&this.visible(this.origin,target)?target:null;
  }
  startTapeSnag(pending) {
    if(this.closed||this.resetting)return;
    const target=this.tapeSnagTarget(pending.targetId,TAPE_SNAG.range);
    if(!target){this.lastPlacementFailure={slot:3,at:this.time,reason:'Link lost'};return;}
    const a=pending.definition,origin=this.origin,end=vec(target.position).addScaledVector(UP,.9);
    const link={definition:a,position:this.controller.position.clone(),targetId:target.id,age:0,left:3,pulseIndex:-1,ackIndices:new Set(),
      initialLength:origin.distanceTo(end),handle:this.fx.emit('tether',{origin,target:end,duration:3.1,color:a.fx?.color??'#89717e'})};
    try {
      const ack=this.registerDeployment(link,{linkedTarget:target.id});
      if(this.closed||!this.deployments.includes(link))return;
      if(!ack||typeof ack!=='object'||ack.ok!==true){this.lastPlacementFailure={slot:3,at:this.time,reason:'Link lost'};this.removeDeployment(link);return;}
      link.started=true;this.updateTapeSnag(link,0);
    } catch(error) {
      try{this.removeDeployment(link);}catch(cleanupError){this.lastFieldCleanupError={deploymentId:link.deploymentId,error:cleanupError};}
      throw error;
    }
  }
  updateTapeSnag(link,dt) {
    if(this.closed||this.resetting||link.started!==true||!this.deployments.includes(link)||link.left<=0)return;
    const target=this.tapeSnagTarget(link.targetId);
    if(!target){this.removeDeployment(link);return;} // Recheck even at dt=0; accepted slow tails belong to Host.
    link.age+=dt;link.left=Math.max(0,TAPE_SNAG.duration-link.age);
    const clock=tapeSnagClock(link.age);if(clock.expired){this.removeDeployment(link);return;}
    link.position.copy(this.controller.position);
    const origin=this.origin,delta=vec(target.position).addScaledVector(UP,.9).sub(origin);
    link.handle.position.copy(origin);link.handle.group.quaternion.setFromUnitVectors(UP,delta.clone().normalize());
    link.handle.group.scale.y=delta.length()/Math.max(.01,link.initialLength);
    if(clock.pulseIndex<=link.pulseIndex)return;
    const pulseIndex=clock.pulseIndex;link.pulseIndex=pulseIndex;link.ackIndices.add(pulseIndex);let acknowledged=false;
    try {
      const result=this.emit('status',link.definition,target,{deploymentId:link.deploymentId,pulseIndex,
        origin:{x:link.position.x,y:link.position.y,z:link.position.z},slowDuration:TAPE_SNAG.slowDuration});
      acknowledged=result!==null&&typeof result==='object'&&result.ok===true;
    } finally {if(!acknowledged)link.ackIndices.delete(pulseIndex);}
  }
  startOfficePlantsSupport(a) {
    if(this.closed||this.resetting)return;
    const position=this.groundPoint(a.range).clone();
    const field={definition:a,position,left:a.duration,age:0,effectIndex:-1,zoneIndex:-1,applicationIndices:new Map(),zoneCounts:new Map(),
      handle:this.fx.emit('passage',{origin:position,targets:[position],radius:a.radius,duration:a.duration+.1,color:a.fx?.color??'#6f8050'})};
    try {
      const ack=this.registerDeployment(field);
      if(this.closed||!this.deployments.includes(field))return;
      if(!ack||typeof ack!=='object'||ack.ok!==true){this.removeDeployment(field);return;}
      field.started=true;this.updateOfficePlantsSupport(field,0);
    } catch(error) {
      try{this.removeDeployment(field);}catch(cleanupError){this.lastFieldCleanupError={deploymentId:field.deploymentId,error:cleanupError};}
      throw error;
    }
  }
  updateOfficePlantsSupport(field,dt) {
    const owns=()=>!this.closed&&!this.resetting&&field.started===true&&this.deployments.includes(field)&&field.left>0;
    if(!owns())return;
    const a=field.definition;field.age+=dt;field.left=Math.max(0,a.duration-field.age);
    const clock=officePlantsClock(field.age,a);if(clock.expired){this.removeDeployment(field);return;}
    for(const marker of field.handle.group.children){marker.material.transparent=true;marker.material.opacity=clock.bright?1:.2;}
    const effect=clock.effectIndex>field.effectIndex,zone=clock.zoneIndex>field.zoneIndex;
    field.effectIndex=clock.effectIndex;field.zoneIndex=clock.zoneIndex; // Reserve global samples before callbacks; never entry-triggered.
    if(!effect&&!zone)return;
    const ward=a.id==='patientgrowth',cap=ward?a.wardMaxApplicationsPerTarget:a.speedMaxApplicationsPerTarget;
    const self=this.targets.find(t=>t.id===this.source)??{id:this.source,kind:'hero',team:this.team},seen=new Set();
    for(const view of [...this.targets.filter(t=>t.id!==this.source),self]) {
      if(!owns()||field.effectIndex!==clock.effectIndex||field.zoneIndex!==clock.zoneIndex)return;
      if(seen.has(view.id))continue;seen.add(view.id);
      const target=view===self?{...view,position:this.controller.position}:view;
      if(!officePlantsEligible(target,field.position,this.team,a))continue;
      if(zone)field.zoneCounts.set(target.id,Math.min(a.zoneMaxTicksPerTarget,(field.zoneCounts.get(target.id)??0)+1));
      if(!effect)continue;
      const indices=field.applicationIndices.get(target.id)??new Set(),index=clock.effectIndex;
      if(indices.has(index)||indices.size>=cap)continue;
      indices.add(index);field.applicationIndices.set(target.id,indices);let acknowledged=false;
      try {
        const result=this.emit(ward?'ward':'speed',a,target,{deploymentId:field.deploymentId,
          origin:{x:field.position.x,y:field.position.y,z:field.position.z},
          ...(ward?{pulseIndex:index,invulnerabilityDuration:a.invulnerabilityDuration}:{applicationIndex:index,speedMultiplier:a.speedMultiplier,speedDuration:a.speedDuration})});
        acknowledged=result!==null&&typeof result==='object'&&result.ok===true;
      } finally {if(!acknowledged){indices.delete(index);if(!indices.size)field.applicationIndices.delete(target.id);}}
    }
  }
  startRecordedAssembly(a) {
    if(this.closed||this.resetting)return;
    const position=this.groundPoint(RECORDED_ASSEMBLY.range).clone();
    const field={definition:a,position,left:4,age:0,wardIndex:-1,applicationIndex:-1,wardApplications:new Map(),speedApplications:new Map(),
      handle:this.fx.emit('passage',{origin:position,targets:[position],radius:7,duration:4.1,color:a.fx?.color??'#89717e'})};
    try {
      const ack=this.registerDeployment(field);
      if(this.closed||!this.deployments.includes(field))return;
      if(!ack||typeof ack!=='object'||ack.ok!==true){this.removeDeployment(field);return;}
      field.started=true;this.updateRecordedAssembly(field,0);
    } catch(error) {
      try{this.removeDeployment(field);}catch(cleanupError){this.lastFieldCleanupError={deploymentId:field.deploymentId,error:cleanupError};}
      throw error;
    }
  }
  updateRecordedAssembly(field,dt) {
    const owns=()=>!this.closed&&!this.resetting&&field.started===true&&this.deployments.includes(field)&&field.left>0;
    if(!owns())return;
    field.age+=dt;field.left=Math.max(0,RECORDED_ASSEMBLY.duration-field.age);
    const clock=recordedAssemblyClock(field.age);if(clock.expired){this.removeDeployment(field);return;}
    for(const marker of field.handle.group.children){marker.material.transparent=true;marker.material.opacity=clock.bright?1:.2;}
    const ward=clock.wardIndex>field.wardIndex,speed=clock.applicationIndex>field.applicationIndex;
    field.wardIndex=clock.wardIndex;field.applicationIndex=clock.applicationIndex; // Reserve both global clocks before callbacks.
    if(!ward&&!speed)return;
    const self=this.targets.find(t=>t.id===this.source)??{id:this.source,kind:'hero',team:this.team},seen=new Set();
    for(const view of [...this.targets.filter(t=>t.id!==this.source),self]) {
      if(!owns())return;
      if(seen.has(view.id))continue;seen.add(view.id);
      for(const kind of ['ward','speed']) {
        if(!owns()||field.wardIndex!==clock.wardIndex||field.applicationIndex!==clock.applicationIndex)return;
        if(kind==='ward'?!ward:!speed)continue;
        const target=view===self?{...view,position:this.controller.position}:view;
        if(!recordedAssemblyEligible(target,field.position,this.team))continue;
        const index=kind==='ward'?clock.wardIndex:clock.applicationIndex,counts=kind==='ward'?field.wardApplications:field.speedApplications;
        const indices=counts.get(target.id)??new Set();if(indices.has(index)||indices.size>=(kind==='ward'?4:16))continue;
        indices.add(index);counts.set(target.id,indices);let acknowledged=false;
        try {
          const result=this.emit(kind,field.definition,target,{deploymentId:field.deploymentId,
            origin:{x:field.position.x,y:field.position.y,z:field.position.z},
            ...(kind==='ward'?{pulseIndex:index,invulnerabilityDuration:.2}:{applicationIndex:index,speedMultiplier:1.2,speedDuration:1})});
          acknowledged=result!==null&&typeof result==='object'&&result.ok===true;
        } finally {if(!acknowledged){indices.delete(index);if(!indices.size)counts.delete(target.id);}}
      }
    }
  }
  startSideA(a) {
    if(this.closed||this.resetting)return;
    const position=this.groundPoint(SIDE_A.range).clone();
    const field={definition:a,position,left:SIDE_A.duration,age:0,pulsed:false,speedTargets:new Set(),
      handle:this.fx.emit('passage',{origin:position,targets:[position],radius:SIDE_A.radius,duration:SIDE_A.duration+.1,color:a.fx?.color??'#89717e'})};
    try {
      const ack=this.registerDeployment(field);
      if(this.closed||!this.deployments.includes(field))return;
      if(!ack||typeof ack!=='object'||ack.ok!==true){this.removeDeployment(field);return;}
      field.started=true;this.updateSideA(field,0);
    } catch(error) {
      try{this.removeDeployment(field);}catch(cleanupError){this.lastFieldCleanupError={deploymentId:field.deploymentId,error:cleanupError};}
      throw error;
    }
  }
  updateSideA(field,dt) {
    const owns=()=>!this.closed&&!this.resetting&&field.started===true&&this.deployments.includes(field)&&field.left>0;
    if(!owns())return;
    field.age+=dt;field.left=Math.max(0,SIDE_A.duration-field.age);
    if(field.left<1e-12){this.removeDeployment(field);return;}
    if(field.pulsed)return;
    field.pulsed=true; // Reserve the single global pulse before any external callback.
    const self=this.targets.find(t=>t.id===this.source)??{id:this.source,kind:'hero',team:this.team};
    const targets=[...this.targets.filter(t=>t.id!==this.source),self],seen=new Set();
    for(const view of targets) {
      if(!owns())return;
      if(seen.has(view.id))continue;seen.add(view.id);
      const target=view===self?{...view,position:this.controller.position}:view;
      if(!sideAEligible(target,field.position,this.team)||field.speedTargets.has(target.id))continue;
      field.speedTargets.add(target.id);let acknowledged=false;
      try {
        const result=this.emit('speed',field.definition,target,{deploymentId:field.deploymentId,pulseIndex:0,
          origin:{x:field.position.x,y:field.position.y,z:field.position.z},speedMultiplier:SIDE_A.speedMultiplier,speedDuration:SIDE_A.speedDuration});
        acknowledged=result!==null&&typeof result==='object'&&result.ok===true;
      } finally {if(!acknowledged)field.speedTargets.delete(target.id);}
    }
  }
  startPermanentRecord(a) {
    if(this.closed||this.resetting)return;
    const position=this.controller.position.clone();
    const field={definition:a,position,left:4,age:0,pulseIndex:-1,wardApplications:new Map(),
      handle:this.fx.emit('passage',{origin:position,targets:[position],radius:9,duration:4.1,color:a.fx?.color??'#3f7f6f'})};
    try {
      const ack=this.registerDeployment(field);
      if(this.closed||!this.deployments.includes(field))return;
      if(!ack||typeof ack!=='object'||ack.ok!==true){this.removeDeployment(field);return;}
      field.started=true;this.updatePermanentRecord(field,0);
    } catch(error) {
      try{this.removeDeployment(field);}catch(cleanupError){this.lastFieldCleanupError={deploymentId:field.deploymentId,error:cleanupError};}
      throw error;
    }
  }
  updatePermanentRecord(field,dt) {
    const owns=()=>!this.closed&&!this.resetting&&field.started===true&&this.deployments.includes(field)&&field.left>0;
    if(!owns())return;
    field.age+=dt;field.left=Math.max(0,PERMANENT_RECORD.duration-field.age);
    const clock=permanentRecordClock(field.age);if(clock.expired){this.removeDeployment(field);return;}
    field.position.copy(this.controller.position);field.handle.position.copy(field.position);
    for(const marker of field.handle.group.children) {
      marker.material.transparent=true;marker.material.opacity=clock.bright?1:.2;
    }
    if(clock.pulseIndex<=field.pulseIndex)return;
    const pulseIndex=clock.pulseIndex;field.pulseIndex=pulseIndex; // Global reservation, no entry-triggered retries.
    const self=this.targets.find(t=>t.id===this.source)??{id:this.source,team:this.team,kind:'hero'};
    const targets=[...this.targets.filter(t=>t.id!==this.source),self],seen=new Set();
    for(const view of targets) {
      if(!owns()||field.pulseIndex!==pulseIndex)return;
      if(seen.has(view.id))continue;seen.add(view.id);
      field.position.copy(this.controller.position);field.handle.position.copy(field.position);
      const target=view===self?{...view,position:this.controller.position}:view;
      if(!permanentRecordEligible(target,field.position,this.team))continue;
      const indices=field.wardApplications.get(target.id)??new Set();
      if(indices.has(pulseIndex)||indices.size>=4)continue;
      indices.add(pulseIndex);field.wardApplications.set(target.id,indices);let acknowledged=false;
      try {
        const result=this.emit('ward',field.definition,target,{deploymentId:field.deploymentId,pulseIndex,
          origin:{x:field.position.x,y:field.position.y,z:field.position.z},invulnerabilityDuration:PERMANENT_RECORD.invulnerabilityDuration});
        acknowledged=result!==null&&typeof result==='object'&&result.ok===true;
      } finally {
        if(!acknowledged){indices.delete(pulseIndex);if(!indices.size)field.wardApplications.delete(target.id);}
      }
    }
  }
  passagePlacement(direction) {
    const c=this.controller,centers=passageCenters(c.position,direction,(x,z,maxY)=>c.floorHeight(x,z,maxY));
    if(centers.every(position=>this.visible(this.origin,{position,height:1.4})))return centers;
    this.lastPlacementFailure={slot:4,at:this.time,reason:'Route blocked'};return null;
  }
  startPassage(pending) {
    if(this.closed||this.resetting)return;
    const centers=this.passagePlacement(pending.direction);if(!centers)return;
    const a=pending.definition,position=this.controller.position.clone();
    const field={definition:a,position,centers,direction:{...pending.direction},left:5,age:0,effectTick:-1,zoneTick:-1,
      speedCounts:new Map(),slowCounts:new Map(),zoneCounts:new Map(),
      handle:this.fx.emit('passage',{origin:position,targets:centers,radius:3,duration:5.1,color:a.fx?.color??'#6c8589'})};
    try {
      const ack=this.registerDeployment(field,{direction:{...field.direction},centers:centers.map(p=>({...p}))});
      if(this.closed||!this.deployments.includes(field))return;
      if(!ack||typeof ack!=='object'||ack.ok!==true){this.removeDeployment(field);return;}
      field.started=true;this.updatePassage(field,0);
    } catch(error) {
      try{this.removeDeployment(field);}catch(cleanupError){this.lastFieldCleanupError={deploymentId:field.deploymentId,error:cleanupError};}
      throw error;
    }
  }
  updatePassage(field,dt) {
    const owns=()=>!this.closed&&!this.resetting&&field.started===true&&this.deployments.includes(field)&&field.left>0;
    if(!owns())return;
    field.age+=dt;field.left=Math.max(0,UNPRINTED_PASSAGE.duration-field.age);
    const clock=passageClock(field.age);if(clock.expired){this.removeDeployment(field);return;}
    const effects=clock.effectTick>field.effectTick,zone=clock.zoneTick>field.zoneTick;
    field.effectTick=clock.effectTick;field.zoneTick=clock.zoneTick;if(!effects&&!zone)return;
    const self=this.targets.find(t=>t.id===this.source)??{id:this.source,kind:'hero',team:this.team};
    const seen=new Set();
    for(const view of [...this.targets.filter(t=>t.id!==this.source),self]) {
      if(!owns())return;
      if(seen.has(view.id))continue;seen.add(view.id);
      const target=view===self?{...view,position:this.controller.position}:view;
      if((target.living??target.alive)===false||!['hero','trooper'].includes(target.kind))continue;
      const zoneIndex=passageZoneIndex(target.position,field.centers);if(zoneIndex<0)continue;
      if(zone)field.zoneCounts.set(target.id,Math.min(10,(field.zoneCounts.get(target.id)??0)+1));
      if(!effects)continue;
      const friendly=target.team===this.team,counts=friendly?field.speedCounts:field.slowCounts;
      const count=counts.get(target.id)??0;if(count>=20)continue;
      counts.set(target.id,count+1);let acknowledged=false;
      try {
        const result=this.emit(friendly?'speed':'status',field.definition,target,{deploymentId:field.deploymentId,zoneIndex,origin:{...field.centers[zoneIndex]},
          ...(friendly?{speedMultiplier:1.35,speedDuration:.5}:{slowDuration:.5})});
        acknowledged=result!==null&&typeof result==='object'&&result.ok===true;
      } finally {
        if(!acknowledged){const remaining=(counts.get(target.id)??1)-1;if(remaining>0)counts.set(target.id,remaining);else counts.delete(target.id);}
      }
    }
  }
  startSpeedTrap(a) {
    if(this.closed||this.resetting)return;
    // Explicit point-cast binding: covered current ground reticle at resolution.
    const position=this.groundPoint(SPEED_TRAP.range).clone();
    const field={definition:a,position,left:SPEED_TRAP.duration,age:0,effectTick:-1,zoneTick:-1,
      slowCounts:new Map(),revealCounts:new Map(),zoneCounts:new Map(),
      handle:this.fx.emit('puddle',{origin:position,radius:SPEED_TRAP.radius,duration:SPEED_TRAP.duration+.1,color:a.fx?.color??'#73834e'})};
    try {
      const ack=this.registerDeployment(field);
      if(this.closed||!this.deployments.includes(field))return;
      if(!ack||typeof ack!=='object'||ack.ok!==true){this.removeDeployment(field);return;}
      field.started=true;this.updateSpeedTrap(field,0);
    } catch(error) {
      try{this.removeDeployment(field);}catch(cleanupError){this.lastFieldCleanupError={deploymentId:field.deploymentId,error:cleanupError};}
      throw error;
    }
  }
  updateSpeedTrap(field,dt) {
    const owns=()=>!this.closed&&!this.resetting&&field.started===true&&this.deployments.includes(field)&&field.left>0;
    if(!owns())return;
    field.age+=dt;field.left=Math.max(0,SPEED_TRAP.duration-field.age);
    const clock=speedTrapClock(field.age);
    if(clock.expired){this.removeDeployment(field);return;}
    const effects=clock.effectTick>field.effectTick,zone=clock.zoneTick>field.zoneTick;
    field.effectTick=clock.effectTick;field.zoneTick=clock.zoneTick;
    if(!effects&&!zone)return;
    for(const target of this.targets) {
      if(!owns())return;
      if(target.id===this.source||!speedTrapEligible(target,field.position,this.team))continue;
      if(zone)field.zoneCounts.set(target.id,Math.min(SPEED_TRAP.zoneMaxTicksPerTarget,(field.zoneCounts.get(target.id)??0)+1));
      if(!effects)continue;
      for(const kind of ['status','reveal']) {
        // Slow callbacks may reset/dispose the field before its paired reveal.
        if(!owns())return;
        if(!speedTrapEligible(target,field.position,this.team,kind))continue;
        const counts=kind==='status'?field.slowCounts:field.revealCounts;
        const cap=kind==='status'?SPEED_TRAP.slowMaxApplicationsPerTarget:SPEED_TRAP.revealMaxApplicationsPerTarget;
        const count=counts.get(target.id)??0;if(count>=cap)continue;
        counts.set(target.id,count+1);let acknowledged=false;
        try {
          const result=this.emit(kind,field.definition,target,{deploymentId:field.deploymentId,
            origin:{x:field.position.x,y:field.position.y,z:field.position.z},
            ...(kind==='status'?{slowDuration:SPEED_TRAP.slowDuration}:{revealDuration:SPEED_TRAP.revealDuration,revealMode:SPEED_TRAP.revealMode})});
          acknowledged=result!==null&&typeof result==='object'&&result.ok===true;
        } finally {
          if(!acknowledged){const remaining=(counts.get(target.id)??1)-1;if(remaining>0)counts.set(target.id,remaining);else counts.delete(target.id);}
        }
      }
    }
  }
  startEndShift(a) {
    if(this.closed||this.resetting)return;
    const position=this.controller.position.clone();
    const field={definition:a,position,left:a.duration,age:0,speedTick:-1,zoneTick:-1,
      speedCounts:new Map(),zoneCounts:new Map(),
      handle:this.fx.emit('aura',{origin:position,radius:a.radius,duration:a.duration+.1,color:a.fx?.color??'#73834e'})};
    try {
      const ack=this.registerDeployment(field);
      if(this.closed||!this.deployments.includes(field))return;
      if(!ack||typeof ack!=='object'||ack.ok!==true){this.removeDeployment(field);return;}
      field.started=true;this.updateEndShift(field,0);
    } catch(error) {
      try{this.removeDeployment(field);}catch(cleanupError){this.lastFieldCleanupError={deploymentId:field.deploymentId,error:cleanupError};}
      throw error;
    }
  }
  updateEndShift(field,dt) {
    const owns=()=>!this.closed&&!this.resetting&&field.started===true&&this.deployments.includes(field)&&field.left>0;
    if(!owns())return;
    field.age+=dt;field.left=Math.max(0,END_SHIFT_SPRINT.duration-field.age);
    const clock=endShiftClock(field.age);
    if(clock.expired){this.removeDeployment(field);return;}
    field.position.copy(this.controller.position);field.handle.position.copy(field.position);
    const speed=clock.speedTick>field.speedTick,zone=clock.zoneTick>field.zoneTick;
    field.speedTick=clock.speedTick;field.zoneTick=clock.zoneTick; // Reserve clock before callbacks.
    if(!speed&&!zone)return;
    const self=this.targets.find(t=>t.id===this.source)??{id:this.source,kind:'hero',team:this.team,position:this.controller.position};
    const targets=[...this.targets.filter(t=>t.id!==this.source),self];
    for(const target of targets) {
      if(!owns())return;
      // Center and eligibility are current even after a prior target callback moves us.
      field.position.copy(this.controller.position);field.handle.position.copy(field.position);
      // Game's self descriptor can predate movement, including a prior callback warp.
      if(!endShiftEligible(target===self?{...target,position:this.controller.position}:target,field.position,this.team))continue;
      if(zone)field.zoneCounts.set(target.id,Math.min(END_SHIFT_SPRINT.zoneMaxTicksPerTarget,(field.zoneCounts.get(target.id)??0)+1));
      const count=field.speedCounts.get(target.id)??0;
      if(!speed||count>=END_SHIFT_SPRINT.speedMaxApplicationsPerTarget)continue;
      field.speedCounts.set(target.id,count+1);
      let acknowledged=false;
      try {
        const result=this.emit('speed',field.definition,target,{deploymentId:field.deploymentId,
          origin:{x:field.position.x,y:field.position.y,z:field.position.z},
          speedMultiplier:END_SHIFT_SPRINT.speedMultiplier,speedDuration:END_SHIFT_SPRINT.speedDuration});
        acknowledged=result!==null&&typeof result==='object'&&result.ok===true;
      } finally {
        // Roll back only this captured owner's reservation, never its replacement.
        if(!acknowledged){const remaining=(field.speedCounts.get(target.id)??1)-1;if(remaining>0)field.speedCounts.set(target.id,remaining);else field.speedCounts.delete(target.id);}
      }
    }
  }
  startBurst(pending) {
    if(this.closed||this.resetting||this.burstSequence>=Number.MAX_SAFE_INTEGER)return;
    const a=pending.definition,origin=this.origin;
    const burst={burstId:++this.burstSequence,definition:a,counts:new Map()};
    this.bursts.set(burst.burstId,burst); // Publish cancellable ownership before Host callback.
    try {
      const ack=this.emit('burst-start',a,null,{burstId:burst.burstId,origin:{x:origin.x,y:origin.y,z:origin.z}});
      if(this.closed||this.bursts.get(burst.burstId)!==burst)return;
      if(!ack||typeof ack!=='object'||ack.ok!==true){this.endBurst(burst);return;}
      for(const [projectileIndex,heading] of flyingDigitDirections(pending.direction,a).entries()) {
        if(this.closed||this.bursts.get(burst.burstId)!==burst)return;
        const direction=vec(heading),handle=this.fx.emit('shot',{origin,target:origin.clone().addScaledVector(direction,.45),color:a.fx?.color??'#73834e',duration:(a.id==='sheenwall'?a.projectileDuration:a.duration)*2});
        if(this.closed||this.bursts.get(burst.burstId)!==burst){handle.dispose();return;}
        // Existing shot geometry is a moving narrow dash, not a full-range ray.
        handle.group.scale.set(.5,.5,1);
        this.projectiles.push({definition:a,position:origin.clone(),direction,velocity:direction.clone().multiplyScalar(a.projectileSpeed),travelled:0,left:a.id==='sheenwall'?a.projectileDuration:a.duration,bornAt:this.time,burstId:burst.burstId,projectileIndex,handle,burst});
      }
    } catch(error) {
      // Keep the primary callback/factory error; ownership is still consumed once.
      try{this.endBurst(burst);}catch(cleanupError){
        this.lastBurstCleanupError={burstId:burst.burstId,error:cleanupError};
      }
      throw error;
    }
  }
  endBurst(burst) {
    if(!burst||this.bursts.get(burst.burstId)!==burst)return false;
    this.bursts.delete(burst.burstId);
    for(const projectile of [...this.projectiles])if(projectile.burst===burst) {
      this.projectiles.splice(this.projectiles.indexOf(projectile),1);projectile.handle.dispose();
    }
    this.emit('burst-end',burst.definition,null,{burstId:burst.burstId});return true;
  }
  advanceDigit(projectile,dt) {
    const burst=projectile.burst;
    if(this.closed||this.resetting||!this.projectiles.includes(projectile)||this.bursts.get(projectile.burstId)!==burst||projectile.bornAt===this.time||dt===0)return;
    const step=flyingDigitStep(projectile,dt,this.boxes,this.targets,this.team);
    projectile.position.copy(step.position);projectile.travelled=step.travelled;
    projectile.left=Math.max(0,((projectile.definition.id==='sheenwall'?projectile.definition.projectileRange:projectile.definition.range)-step.travelled)/projectile.definition.projectileSpeed);
    projectile.handle.position.copy(projectile.position);
    if(!step.done)return;
    // Contact consumes the bullet before damage callbacks can update/reset/recast.
    this.projectiles.splice(this.projectiles.indexOf(projectile),1);projectile.handle.dispose();
    let failed=false;
    try {
      const target=step.contact?.target,count=target?(burst.counts.get(target.id)??0):0;
      if(target&&count<projectile.definition.maxHitsPerTarget) {
        burst.counts.set(target.id,count+1); // Physical reservations survive NACK/lost ACK.
        this.hit(projectile.definition,target,{burstId:projectile.burstId,projectileIndex:projectile.projectileIndex,origin:{...step.position}});
      }
    } catch(error) {
      failed=true;throw error;
    } finally {
      if(!this.projectiles.some(p=>p.burst===burst)) {
        try{this.endBurst(burst);}catch(cleanupError){
          if(!failed)throw cleanupError;
          this.lastBurstCleanupError={burstId:burst.burstId,error:cleanupError};
        }
      }
    }
  }
  removeBuff(id,buff=this.buffs?.[id]) {
    if(!buff||this.buffs?.[id]!==buff)return false;
    delete this.buffs[id];
    if(id==='approvedonly')this.controller.movementStopped=false;
    buff.handle.dispose();
    this.emit('buff-end',buff.definition,{id:this.source});return true;
  }
  endTether() {
    const tether=this.tether;if(!tether)return;
    this.tether=null;tether.handle.dispose();
    this.emit('tether-end',tether.definition,{id:tether.targetId});
  }
  registerDeployment(deploy,extra={}) {
    this.deployments.push(deploy); // Cleanup callbacks can see/cancel this real pending owner.
    this.replaceDeploy(deploy.definition.id,deploy);
    if(!this.deployments.includes(deploy))return;
    deploy.deploymentId=++this.deploymentSequence;
    return this.emit('deployment-start',deploy.definition,null,{deploymentId:deploy.deploymentId,origin:{x:deploy.position.x,y:deploy.position.y,z:deploy.position.z},...extra});
  }
  removeDeployment(deploy) {
    const index=this.deployments.indexOf(deploy);if(index===-1)return false;
    if(deploy.wall){const wallIndex=this.boxes.indexOf(deploy.wall);if(wallIndex!==-1)this.boxes.splice(wallIndex,1);}
    deploy.handle.dispose();this.deployments.splice(index,1);
    if(deploy.deploymentId!==undefined)this.emit('deployment-end',deploy.definition,null,{deploymentId:deploy.deploymentId});
    return true;
  }
  replaceDeploy(id,keep=null) { for(const deploy of [...this.deployments])if(deploy!==keep&&deploy.definition.id===id)this.removeDeployment(deploy); }
  update(dt) {
    if(this.closed||this.resetting)return;
    dt=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
    const pendingAtStart=this.pendingCast,digitsAtStart=new Set(this.projectiles.filter(p=>['flyingdigits','sheenwall'].includes(p.definition.id)));
    const fieldsAtStart=new Set(this.deployments.filter(d=>['windowpatch','patientgrowth','sheenwall','keepclear','tapesnag','recordedassembly','sidea','endshiftsprint','speedtrap','unprintedpassage','permanentrecord'].includes(d.definition.id)));
    this.time+=dt;this.fireWait=Math.max(0,this.fireWait-dt);this.meleeWait=Math.max(0,this.meleeWait-dt);this.parryWait=Math.max(0,this.parryWait-dt);
    if(this.reload>0){this.reload=Math.max(0,this.reload-dt);if(this.reload===0)this.ammo=this.modifiers.magazine;}
    for(const key of Object.keys(this.cooldowns))this.cooldowns[key]=Math.max(0,this.cooldowns[key]-dt);
    const c=this.controller;
    for(const [id,buff] of Object.entries(this.buffs)) {
      if(this.closed||this.buffs[id]!==buff)continue;
      buff.left-=dt;buff.next-=dt;
      if((id==='widemargin'||id==='cleanbreak'||id==='laminatedsprint'||id==='approvedonly'||id==='badrewind')&&buff.left<1e-12)buff.left=0;
      if(buff.left<=0){this.removeBuff(id,buff);continue;}
      buff.handle.position.copy(id==='chaingun'?this.origin:c.position);
      if(id==='chaingun') {
        buff.handle.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),this.direction);
        if(buff.next<=0){buff.next+=buff.definition.interval;const hit=this.aimHit(buff.definition.range);this.fx.emit('longshot',{origin:this.origin,target:hit.point,duration:.09,color:'#8c68a1'});this.hit(buff.definition,hit.target);}
      }
      if(id==='aura'&&buff.next<=0){buff.next+=buff.definition.interval;this.area(buff.definition,c.position,{heal:true,owner:buff});}
    }
    if(this.closed)return;
    const pending=this.pendingCast;
    if(pending&&pending===pendingAtStart) {
      pending.left=Math.max(0,pending.left-dt);
      if(pending.left<=1e-12) {
        this.pendingCast=null;
        if(['windowpatch','patientgrowth'].includes(pending.definition.id))this.startOfficePlantsSupport(pending.definition);
        else if(pending.definition.id==='sheenwall')this.startSheenWall(pending);
        else if(pending.definition.id==='keepclear')this.startKeepClear(pending);
        else if(pending.definition.id==='tapesnag')this.startTapeSnag(pending);
        else if(pending.definition.id==='flyingdigits')this.startBurst(pending);
        else if(pending.definition.id==='endshiftsprint')this.startEndShift(pending.definition);
        else if(pending.definition.id==='speedtrap')this.startSpeedTrap(pending.definition);
        else if(pending.definition.id==='unprintedpassage')this.startPassage(pending);
        else if(pending.definition.id==='recordedassembly')this.startRecordedAssembly(pending.definition);
        else if(pending.definition.id==='sidea')this.startSideA(pending.definition);
        else if(pending.definition.id==='permanentrecord')this.startPermanentRecord(pending.definition);
        else {
          const a=pending.definition,handle=this.fx.emit('aura',{origin:c.position.clone(),duration:a.duration,color:this.kit.accent});
          this.buffs[a.id]?.handle.dispose();
          this.buffs[a.id]={left:a.duration,definition:a,next:0,handle};
          if(a.id==='approvedonly'){c.movementStopped=true;c.update(0,{yaw:c.yaw,pitch:c.pitch,aim:c.aiming});}
          this.emit('buff',a,{id:this.source},{invulnerable:!!a.invulnerable,speedMultiplier:a.speedMultiplier,
            ...(a.id==='approvedonly'?{movementStopped:true}:{}),
            ...(['cleanbreak','laminatedsprint','badrewind'].includes(a.id)?{invulnerabilityDuration:a.invulnerabilityDuration}:{})});
        }
      }
    }
    if(this.closed)return;
    c.movementStopped=!!this.buffs.approvedonly;
    c.speedMultiplier=this.modifiers.move*Math.max(this.buffs.overtime?.definition.speedMultiplier??1,this.buffs.fastlane?.definition.speedMultiplier??1,this.buffs.widemargin?.definition.speedMultiplier??1,this.buffs.cleanbreak?.definition.speedMultiplier??1,this.buffs.laminatedsprint?.definition.speedMultiplier??1,this.buffs.badrewind?.definition.speedMultiplier??1);
    for(const deploy of [...this.deployments]) {
      if(this.closed||!this.deployments.includes(deploy))continue;
      const a=deploy.definition;
      if(['windowpatch','patientgrowth','sheenwall','keepclear','tapesnag','recordedassembly','sidea','endshiftsprint','speedtrap','unprintedpassage','permanentrecord'].includes(a.id)) {
        if(fieldsAtStart.has(deploy)) {
          if(['windowpatch','patientgrowth'].includes(a.id))this.updateOfficePlantsSupport(deploy,dt);
          else if(a.id==='keepclear'||a.id==='sheenwall')this.updateKeepClear(deploy,dt);
          else if(a.id==='tapesnag')this.updateTapeSnag(deploy,dt);
          else if(a.id==='recordedassembly')this.updateRecordedAssembly(deploy,dt);
          else if(a.id==='sidea')this.updateSideA(deploy,dt);
          else if(a.id==='permanentrecord')this.updatePermanentRecord(deploy,dt);
          else if(a.id==='unprintedpassage')this.updatePassage(deploy,dt);
          else if(a.id==='speedtrap')this.updateSpeedTrap(deploy,dt);else this.updateEndShift(deploy,dt);
        }
        continue;
      }
      deploy.left-=dt;deploy.next-=dt;
      if(deploy.left<=0){this.removeDeployment(deploy);continue;}
      if(deploy.next>0||a.id==='barricade')continue;
      deploy.next+=a.interval;
      if(a.id==='puddle')this.area(a,deploy.position,{heal:true,deploymentId:deploy.deploymentId,owner:deploy});
      if(a.id==='turret') {
        const origin=deploy.position.clone().addScaledVector(UP,.9);
        const target=this.targets.filter(t=>t.team!==this.team&&t.alive!==false&&t.autoTargetable!==false&&origin.distanceTo(vec(t.position))<=a.range&&this.visible(origin,t)).sort((a,b)=>origin.distanceToSquared(vec(a.position))-origin.distanceToSquared(vec(b.position)))[0];
        if(target){const end=vec(target.position).addScaledVector(UP,.8);deploy.handle.aimAt(end);this.fx.emit('longshot',{origin:deploy.handle.muzzle.getWorldPosition(new THREE.Vector3()),target:end,duration:.16,color:'#b55043'});this.hit(a,target,{deploymentId:deploy.deploymentId,origin:{x:origin.x,y:origin.y,z:origin.z}});}
      }
    }
    if(this.closed)return;
    for(const projectile of [...this.projectiles]) {
      if(this.closed||!this.projectiles.includes(projectile))continue;
      if(['flyingdigits','sheenwall'].includes(projectile.definition.id)) {
        if(digitsAtStart.has(projectile))this.advanceDigit(projectile,dt);
        continue;
      }
      const old=projectile.position.clone();projectile.left-=dt;projectile.velocity.y-=16*dt;
      const motion=projectile.velocity.clone().multiplyScalar(dt),distance=motion.length();
      const wall=distance>0?this.trace(old,motion.clone().normalize(),distance,false):null;
      if(wall?.wall){projectile.velocity.x*=-.65;projectile.velocity.z*=-.65;projectile.bounces++;}
      else projectile.position.add(motion);
      let floor=c.floorHeight(projectile.position.x,projectile.position.z,old.y+.2);if(!Number.isFinite(floor))floor=-50;
      if(projectile.position.y<floor+.2){projectile.position.y=floor+.2;projectile.velocity.y=Math.abs(projectile.velocity.y)*.55;projectile.bounces++;}
      projectile.handle.position.copy(projectile.position);
      if(projectile.left<=0){
        const index=this.projectiles.indexOf(projectile);if(index===-1)continue;
        this.projectiles.splice(index,1);
        const a=projectile.definition;projectile.handle.dispose();this.fx.emit('explosion',{origin:projectile.position,duration:.65,color:a.fx.color,radius:a.radius*.5});this.area(a,projectile.position);
      }
    }
    if(this.closed)return;
    if(this.tether) {
      const t=this.tether,target=this.targets.find(target=>target.id===t.targetId);t.left-=dt;
      if(t.left<=0||!target||target.alive===false||target.team===this.team||this.origin.distanceTo(vec(target.position))>t.definition.range||!this.visible(this.origin,target)){
        this.endTether();
      } else {
        const delta=vec(target.position).addScaledVector(UP,.9).sub(this.origin);
        t.handle.position.copy(this.origin);t.handle.group.quaternion.setFromUnitVectors(UP,delta.clone().normalize());
        t.handle.group.scale.y=delta.length()/Math.max(.01,t.length);
      }
    }
    if(this.closed)return;
    if(c.state!==this.lastState) {
      if(['dash','jump','slide'].includes(c.state))this.fx.emit(c.state,{origin:c.position.clone(),direction:this.direction,duration:.55});
      this.lastState=c.state;
    }
    this.recoil=Math.max(0,this.recoil-dt/SHOT_VISUAL_WINDOW);this.sampleAcceptedAction();
    this.visual.group.position.copy(c.position);this.visual.update(dt,{state:c.state,speed:c.velocity.length(),worldVelocity:c.velocity,yaw:c.yaw,aiming:c.aiming,recoil:this.recoil});this.fx.update(dt);
  }
  reset() {
    if(this.resetting)return;
    this.resetting=true;this.sheenResolution=null;
    try {
      this.pendingCast=null;this.lastPlacementFailure=null;
      for(const burst of [...this.bursts.values()])this.endBurst(burst);
      this.endTether();
      if(this.deployments)for(const deploy of [...this.deployments])this.removeDeployment(deploy);
      if(this.buffs)for(const [id,buff] of Object.entries(this.buffs))this.removeBuff(id,buff);
      this.fx.clear();this.cooldowns={};this.buffs={};this.projectiles=[];this.deployments=[];this.tether=null;
      this.ammo=this.modifiers.magazine;this.reload=0;this.fireWait=0;this.meleeWait=0;this.parryWait=0;this.recoil=0;
      this.castCount={};this.shots=0;this.lastAbility=null;this.lastState='idle';this.time=0;this.controller.speedMultiplier=this.modifiers.move;this.controller.movementStopped=false;
      if(this.clearAcceptedAction())this.visual.reset?.();
    } finally {
      this.resetting=false;
    }
  }
  snapshot() { return {hero:this.kit.id,ammo:this.ammo,shots:this.shots,reload:this.reload,cooldowns:{...this.cooldowns},casts:{...this.castCount},lastAbility:this.lastAbility,windup:this.pendingCast?.left??0,fx:this.fx.count,deployments:this.deployments.length,projectiles:this.projectiles.length,buffs:Object.keys(this.buffs),tether:this.tether?{targetId:this.tether.targetId,left:this.tether.left}:null}; }
  dispose() {
    this.closed=true;
    if(this.disposing||this.disposed)return;
    this.disposing=true;
    try {
      this.reset();this.fx.dispose();this.visual.dispose();
      this.disposed=true;
    } finally {
      this.disposing=false;
    }
  }
}

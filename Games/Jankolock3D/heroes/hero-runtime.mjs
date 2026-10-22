import * as THREE from '../vendor/three.module.js';
import { AbilityFX, createHeroVisual } from './hero-visuals.mjs';

const vec = p => new THREE.Vector3(p.x, p.y, p.z);
const box3 = b => b.min ? b : new THREE.Box3(new THREE.Vector3(b.minX,b.minY,b.minZ),new THREE.Vector3(b.maxX,b.maxY,b.maxZ));
const UP = new THREE.Vector3(0,1,0);

/** Visual/ability intent layer, not a damage authority. Targets have id, team,
 * position (feet), alive, radius?, height?. onEffect receives IDs and unscaled
 * kit values; systems owns HP, armor, shop scaling and status enforcement.
 * Remote impacts include a plain origin {x,y,z} snapshot: deployment/explosion
 * center for areas, turret muzzle for shots, never the owner's later position.
 * Call update after controller.update; aim(camera) before fire/cast. Owns only
 * its temporary barricade colliders; clear/dispose removes those from boxes.
 * setModifiers accepts the systems-derived cooldown/fire/reload multipliers,
 * magazine size and move multiplier. Defaults are the JSON baseline.
 */
export class HeroRuntime {
  constructor({scene,controller,kit,targets=[],boxes=controller.boxes,team='carbon',source='player',onEffect=()=>{}}) {
    this.scene=scene;this.controller=controller;this.kit=kit;this.targets=targets;this.boxes=boxes;
    this.team=team;this.source=source;this.onEffect=onEffect;
    this.visual=createHeroVisual(kit.id);scene.add(this.visual.group);this.fx=new AbilityFX(scene);
    this.modifiers={cooldown:1,fire:1,reload:1,magazine:kit.weapon.magazine,move:1};
    this.camera=null;this.reset();
  }
  setModifiers(values) {
    for(const [key,value] of Object.entries(values)) {
      if(!Object.hasOwn(this.modifiers,key)||!Number.isFinite(value)||value<=0||value>100) throw new RangeError('Invalid hero modifier');
      if(key==='magazine'&&!Number.isInteger(value)) throw new RangeError('Magazine must be an integer');
      this.modifiers[key]=value;
    }
    this.ammo=Math.min(this.ammo,this.modifiers.magazine);
  }
  aim(camera) { this.camera=camera; }
  get origin() { const c=this.controller;return c.position.clone().addScaledVector(UP,1.25).add(new THREE.Vector3(Math.cos(c.yaw)*.55,0,-Math.sin(c.yaw)*.55)); }
  get direction() {
    const c=this.controller;
    return new THREE.Vector3(-Math.sin(c.yaw)*Math.cos(c.pitch),Math.sin(c.pitch),-Math.cos(c.yaw)*Math.cos(c.pitch));
  }
  trace(origin,direction,range,targets=true) {
    const ray=new THREE.Ray(origin,direction.clone().normalize()),point=new THREE.Vector3();
    let result={distance:range,point:ray.at(range,new THREE.Vector3()),target:null,wall:null};
    for(const wall of this.boxes) if(ray.intersectBox(box3(wall),point)) {
      const distance=origin.distanceTo(point);
      if(distance<result.distance) result={distance,point:point.clone(),target:null,wall};
    }
    if(targets) for(const target of this.targets) {
      if(target.alive===false||target.team===this.team) continue;
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
    return this.trace(from,delta.normalize(),distance,false).distance>=distance-.01;
  }
  emit(kind,ability,target=null,extra={}) {
    this.onEffect({kind,source:this.source,target:target?.id??null,ability:ability.id??ability.name,
      baseDamage:ability.baseDamage??0,baseHeal:ability.baseHeal??0,damageType:ability.damageType??'none',
      spiritScale:ability.spiritScale??0,slow:ability.slow??0,duration:ability.duration??0,...extra});
  }
  hit(ability,target,extra={}) {
    if(!target||target.alive===false||target.team===this.team) return;
    this.emit('damage',ability,target,extra);
  }
  area(ability,center,{cone=false,heal=false}={}) {
    const extra={origin:{x:center.x,y:center.y,z:center.z}};
    for(const target of this.targets) {
      if(target.alive===false) continue;
      const delta=vec(target.position).sub(center),distance=delta.length();
      if(distance>(ability.radius??ability.range)||!this.visible(center.clone().addScaledVector(UP,.7),target)) continue;
      if(cone&&distance>.01&&delta.normalize().dot(this.direction)<Math.cos(ability.coneRadians??.8)) continue;
      if(target.team===this.team) { if(heal) this.emit('heal',ability,target,extra); }
      else this.hit(ability,target,extra);
    }
    if(heal&&center.distanceTo(this.controller.position)<=(ability.radius??0)) this.emit('heal',ability,{id:this.source},extra);
  }
  fire() {
    if(this.fireWait>0||this.reload>0) return false;
    if(this.ammo<=0&&!this.controller.infiniteAmmo) { this.startReload();return false; }
    const ability=this.kit.weapon,hit=this.aimHit(ability.range);
    if(!this.controller.infiniteAmmo) this.ammo--;
    this.shots++;
    this.fireWait=ability.interval*this.modifiers.fire;
    this.fx.emit('longshot',{origin:this.origin,target:hit.point,color:this.kit.id==='gooey'?'#70884c':'#c1a16a',duration:.12});
    this.hit(ability,hit.target,{headshot:!!hit.headshot,headshotMultiplier:hit.headshot?(this.buffs.headshot?.definition.headshotMultiplier??ability.headshotMultiplier):1});
    if(this.ammo===0&&!this.controller.infiniteAmmo) this.startReload();
    return true;
  }
  startReload() { if(!this.reload&&this.ammo<this.modifiers.magazine)this.reload=this.kit.weapon.reload*this.modifiers.reload; }
  melee() {
    if(this.meleeWait>0)return false;
    this.meleeWait=this.kit.melee.cooldown;
    this.fx.emit('melee',{origin:this.controller.position.clone(),direction:this.direction,duration:.4});
    this.area(this.kit.melee,this.controller.position,{cone:true});return true;
  }
  parry() {
    if(this.parryWait>0)return false;
    this.parryWait=3;this.fx.emit('parry',{origin:this.controller.position.clone(),direction:this.direction,duration:.65,color:'#4e80a7'});
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
    const definition=this.kit.abilities.find(a=>a.slot===slot);
    if(!definition||this.cooldowns[slot]>0)return false;
    const a=definition,c=this.controller,origin=this.origin,ground=c.position.clone();
    const hit=this.aimHit(a.range??30),direction=hit.point.clone().sub(origin).normalize();
    this.cooldowns[slot]=a.cooldown*this.modifiers.cooldown;
    this.lastAbility=a.id;this.castCount[a.id]=(this.castCount[a.id]??0)+1;
    switch(a.id) {
      case 'hook': {
        this.fx.emit(a.id,{origin,target:hit.point,duration:.55});
        if(hit.wall||hit.target) {
          const destination=hit.point.clone().addScaledVector(direction,-1.1);destination.y=hit.target?hit.target.position.y:Math.max(c.position.y,destination.y-1.25);
          c.hookTo(destination);this.hit(a,hit.target);
        }
        break;
      }
      case 'volley':case 'glue':
        this.fx.emit(a.id,{origin,target:hit.point,duration:.8});this.area(a,ground,{cone:true});break;
      case 'slam':
        this.fx.emit(a.id,{origin:ground,duration:1,radius:a.radius});this.area(a,ground);break;
      case 'overtime':case 'headshot':case 'xray':case 'chaingun':case 'aura': {
        this.buffs[a.id]={left:a.duration,definition:a,next:0,handle:this.fx.emit(a.id,{origin:a.id==='chaingun'?origin:ground,direction,targets:this.targets.filter(t=>t.team!==this.team&&t.alive!==false&&ground.distanceTo(vec(t.position))<=(a.range??100)).map(t=>t.position),duration:a.duration,radius:a.radius})};
        this.emit('buff',a,{id:this.source},{invulnerable:!!a.invulnerable,speedMultiplier:a.speedMultiplier??1});break;
      }
      case 'turret': {
        const p=this.groundPoint(3),side=p.clone().add(new THREE.Vector3(Math.cos(c.yaw)*1.5,0,-Math.sin(c.yaw)*1.5));
        if(this.visible(origin,{position:side}))p.copy(side);
        this.replaceDeploy(a.id);
        this.deployments.push({definition:a,position:p,left:a.duration,next:0,handle:this.fx.emit(a.id,{origin:p,direction,duration:a.duration})});break;
      }
      case 'barricade': {
        const p=this.groundPoint(a.range);this.replaceDeploy(a.id);
        // Axis-aligned folders deliberately match the solid collision footprint.
        const wall={minX:p.x-1.8,maxX:p.x+1.8,minY:p.y,maxY:p.y+2,minZ:p.z-.25,maxZ:p.z+.25};
        if(Math.abs(c.position.x-p.x)<2.3&&Math.abs(c.position.z-p.z)<.8){this.cooldowns[slot]=0;return false;}
        this.boxes.push(wall);
        this.deployments.push({definition:a,position:p,left:a.duration,wall,handle:this.fx.emit(a.id,{origin:p,direction:new THREE.Vector3(0,0,-1),duration:a.duration})});break;
      }
      case 'grenade':case 'missionbomb': {
        this.projectiles.push({definition:a,position:origin.clone(),velocity:direction.multiplyScalar(12).addScaledVector(UP,6),left:a.duration,bounces:0,handle:this.fx.emit(a.id,{origin,duration:a.duration,radius:a.radius})});break;
      }
      case 'longshot':
        this.fx.emit(a.id,{origin,target:hit.point,duration:.65});
        this.hit(a,hit.target,{headshot:!!hit.headshot,headshotMultiplier:hit.headshot?(this.buffs.headshot?.definition.headshotMultiplier??this.kit.weapon.headshotMultiplier):1});break;
      case 'tether': {
        this.tether?.handle.dispose();
        const handle=this.fx.emit(a.id,{origin,target:hit.point,duration:hit.target?a.duration:.6});
        if(hit.target){this.hit(a,hit.target);this.tether={target:hit.target,definition:a,left:a.duration,handle,length:origin.distanceTo(hit.point)};}
        break;
      }
      case 'puddle': {
        const p=this.groundPoint(a.range);this.replaceDeploy(a.id);
        this.deployments.push({definition:a,position:p,left:a.duration,next:0,handle:this.fx.emit(a.id,{origin:p,duration:a.duration,radius:a.radius})});break;
      }
    }
    return true;
  }
  removeDeployment(deploy) {
    if(deploy.wall){const index=this.boxes.indexOf(deploy.wall);if(index!==-1)this.boxes.splice(index,1);}
    deploy.handle.dispose();this.deployments.splice(this.deployments.indexOf(deploy),1);
  }
  replaceDeploy(id) { for(const deploy of [...this.deployments])if(deploy.definition.id===id)this.removeDeployment(deploy); }
  update(dt) {
    dt=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
    this.time+=dt;this.fireWait=Math.max(0,this.fireWait-dt);this.meleeWait=Math.max(0,this.meleeWait-dt);this.parryWait=Math.max(0,this.parryWait-dt);
    if(this.reload>0){this.reload=Math.max(0,this.reload-dt);if(this.reload===0)this.ammo=this.modifiers.magazine;}
    for(const key of Object.keys(this.cooldowns))this.cooldowns[key]=Math.max(0,this.cooldowns[key]-dt);
    const c=this.controller;
    for(const [id,buff] of Object.entries(this.buffs)) {
      buff.left-=dt;buff.next-=dt;
      if(buff.left<=0){buff.handle.dispose();delete this.buffs[id];this.emit('buff-end',buff.definition,{id:this.source});continue;}
      buff.handle.position.copy(id==='chaingun'?this.origin:c.position);
      if(id==='chaingun') {
        buff.handle.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),this.direction);
        if(buff.next<=0){buff.next+=buff.definition.interval;const hit=this.aimHit(buff.definition.range);this.fx.emit('longshot',{origin:this.origin,target:hit.point,duration:.09,color:'#8c68a1'});this.hit(buff.definition,hit.target);}
      }
      if(id==='aura'&&buff.next<=0){buff.next+=buff.definition.interval;this.area(buff.definition,c.position,{heal:true});}
    }
    c.speedMultiplier=this.modifiers.move*(this.buffs.overtime?.definition.speedMultiplier??1);
    for(const deploy of [...this.deployments]) {
      const a=deploy.definition;deploy.left-=dt;deploy.next-=dt;
      if(deploy.left<=0){this.removeDeployment(deploy);continue;}
      if(deploy.next>0||a.id==='barricade')continue;
      deploy.next+=a.interval;
      if(a.id==='puddle')this.area(a,deploy.position,{heal:true});
      if(a.id==='turret') {
        const origin=deploy.position.clone().addScaledVector(UP,.9);
        const target=this.targets.filter(t=>t.team!==this.team&&t.alive!==false&&origin.distanceTo(vec(t.position))<=a.range&&this.visible(origin,t)).sort((a,b)=>origin.distanceToSquared(vec(a.position))-origin.distanceToSquared(vec(b.position)))[0];
        if(target){const end=vec(target.position).addScaledVector(UP,.8);deploy.handle.aimAt(end);this.fx.emit('longshot',{origin:deploy.handle.muzzle.getWorldPosition(new THREE.Vector3()),target:end,duration:.16,color:'#b55043'});this.hit(a,target,{origin:{x:origin.x,y:origin.y,z:origin.z}});}
      }
    }
    for(const projectile of [...this.projectiles]) {
      const old=projectile.position.clone();projectile.left-=dt;projectile.velocity.y-=16*dt;
      const motion=projectile.velocity.clone().multiplyScalar(dt),distance=motion.length();
      const wall=distance>0?this.trace(old,motion.clone().normalize(),distance,false):null;
      if(wall?.wall){projectile.velocity.x*=-.65;projectile.velocity.z*=-.65;projectile.bounces++;}
      else projectile.position.add(motion);
      let floor=c.floorHeight(projectile.position.x,projectile.position.z,old.y+.2);if(!Number.isFinite(floor))floor=-50;
      if(projectile.position.y<floor+.2){projectile.position.y=floor+.2;projectile.velocity.y=Math.abs(projectile.velocity.y)*.55;projectile.bounces++;}
      projectile.handle.position.copy(projectile.position);
      if(projectile.left<=0){const a=projectile.definition;projectile.handle.dispose();this.fx.emit('explosion',{origin:projectile.position,duration:.65,color:a.fx.color,radius:a.radius*.5});this.area(a,projectile.position);this.projectiles.splice(this.projectiles.indexOf(projectile),1);}
    }
    if(this.tether) {
      const t=this.tether;t.left-=dt;
      if(t.left<=0||t.target.alive===false||this.origin.distanceTo(vec(t.target.position))>t.definition.range||!this.visible(this.origin,t.target)){
        t.handle.dispose();this.emit('tether-end',t.definition,t.target);this.tether=null;
      } else {
        const delta=vec(t.target.position).addScaledVector(UP,.9).sub(this.origin);
        t.handle.position.copy(this.origin);t.handle.group.quaternion.setFromUnitVectors(UP,delta.clone().normalize());
        t.handle.group.scale.y=delta.length()/Math.max(.01,t.length);
      }
    }
    if(c.state!==this.lastState) {
      if(['dash','jump','slide'].includes(c.state))this.fx.emit(c.state,{origin:c.position.clone(),direction:this.direction,duration:.55});
      this.lastState=c.state;
    }
    this.visual.group.position.copy(c.position);this.visual.update(dt,{state:c.state,speed:c.velocity.length(),yaw:c.yaw,aiming:c.aiming});this.fx.update(dt);
  }
  reset() {
    if(this.deployments)for(const deploy of [...this.deployments])this.removeDeployment(deploy);
    this.fx.clear();this.cooldowns={};this.buffs={};this.projectiles=[];this.deployments=[];this.tether=null;
    this.ammo=this.modifiers.magazine;this.reload=0;this.fireWait=0;this.meleeWait=0;this.parryWait=0;
    this.castCount={};this.shots=0;this.lastAbility=null;this.lastState='idle';this.time=0;this.controller.speedMultiplier=this.modifiers.move;
  }
  snapshot() { return {hero:this.kit.id,ammo:this.ammo,shots:this.shots,reload:this.reload,cooldowns:{...this.cooldowns},casts:{...this.castCount},lastAbility:this.lastAbility,fx:this.fx.count,deployments:this.deployments.length,projectiles:this.projectiles.length,buffs:Object.keys(this.buffs)}; }
  dispose() { this.reset();this.fx.dispose();this.visual.dispose(); }
}

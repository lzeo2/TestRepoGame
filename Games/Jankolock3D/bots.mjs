import * as THREE from './vendor/three.module.js';
import { HeroRuntime } from './heroes/hero-runtime.mjs';
import { PlayerController } from './heroes/player-controller.mjs';
import { surfaceHeight } from './traversal.mjs';
import { ITEMS } from './systems.mjs';
import { panelSegment } from './heroes/keep-clear.mjs';

const distance = (a, b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
const SHOP_ITEMS = ITEMS.filter(item => !item.active);

// Horizontal lane route, including safe cross-base corridors for side lanes.
function laneRoute(sim, lane, team) {
  const base = sim.bases[team], enemy = sim.bases[team === 'carbon' ? 'ivory' : 'carbon'];
  const points = lane.waypoints.map(p => ({...p}));
  if (points[0].z > points.at(-1).z) points.reverse();
  if (team === 'ivory') points.reverse();
  points.unshift({...base}, {x:lane.x, y:base.y, z:base.z});
  points.push({x:lane.x, y:enemy.y, z:enemy.z}, {...enemy});
  const segments = [];
  let length = 0;
  for (let i=1; i<points.length; i++) {
    const a=points[i-1], b=points[i], size=Math.hypot(b.x-a.x, b.z-a.z);
    if (size > 0) { segments.push({a,b,size,start:length}); length+=size; }
  }
  const at = progress => {
    const s = segments.find(s => s.start+s.size >= progress) ?? segments.at(-1);
    const t = Math.max(0, Math.min(1, (progress-s.start)/s.size));
    return {x:s.a.x+(s.b.x-s.a.x)*t, y:s.a.y+(s.b.y-s.a.y)*t, z:s.a.z+(s.b.z-s.a.z)*t};
  };
  const project = p => {
    let best=Infinity, progress=0;
    for (const s of segments) {
      const dx=s.b.x-s.a.x, dz=s.b.z-s.a.z;
      const t=Math.max(0, Math.min(1, ((p.x-s.a.x)*dx+(p.z-s.a.z)*dz)/(s.size*s.size)));
      const d=Math.hypot(p.x-s.a.x-dx*t, p.z-s.a.z-dz*t);
      if (d<best) { best=d; progress=s.start+s.size*t; }
    }
    return progress;
  };
  return {at, project, entry:project(points[2]), length};
}

/** Five shared-scene bots. Carbon human occupies midway; bot-1/2 are carbon
 * graft/greenhedge, bot-3/4/5 ivory graft/midway/greenhedge. kits is the JSON
 * heroes array. Host steps sim, then calls update with seconds (capped at .05).
 * runtimes is an array of five HeroRuntime instances; snapshot() returns copies.
 * Do not update runtimes separately. Pass the host's mutable collision array as
 * boxes so human movement also respects bot barricades.
 * update(dt,{passive:true}) is an explicit QA pause of bot decisions/effects,
 * not a production difficulty switch. Timers/visuals still advance. No RAF,
 * renderer, asset loads or sim.step here. dispose leaves sim hero records;
 * discard the simulation too when resetting a match.
 */
export function createBots({sim, scene, world, kits, boxes, onEffect, floorHeight}) {
  if (!Array.isArray(kits) || !kits.length) throw new TypeError('kits must be the hero array');
  if (sim.phase === 'finished' || sim.heroes.some(h => /^bot-[1-5]$/.test(h.id))) throw new Error('Bots already registered or match finished');
  boxes ??= [...world.boxes]; // Runtime barricades require a mutable shared array.
  floorHeight ??= (x,z,maxY) => surfaceHeight(world,x,z,maxY);
  const effect = onEffect ?? (event => sim.applyHeroEffect(event));
  const lineup = [['carbon','graft',0], ['carbon','greenhedge',3], ['ivory','graft',1], ['ivory','midway',2], ['ivory','greenhedge',0]];
  for (const [,lane] of lineup) if (!sim.lanes.some(l => l.id === lane)) throw new Error(`Missing lane ${lane}`);
  let disposed=false, passive=false;
  let targets=[], byId=new Map();
  const bots = lineup.map(([team,lane,index], i) => {
    const kit=kits[index%kits.length], hero=sim.addHero({id:`bot-${i+1}`, team, lane});
    const configured=sim.configureHeroKit(hero.id,kit);
    if (!configured.ok) throw new Error(`Bot kit rejected: ${configured.reason}`);
    const controller=new PlayerController({position:hero.position,boxes,ramps:world.ramps,floorHeight});
    const bot={hero,controller,route:laneRoute(sim,sim.lanes.find(l => l.id===lane),team), alive:true,retreating:false,targetId:null,mode:'rally'};
    bot.runtime=new HeroRuntime({scene,controller,kit,boxes,source:hero.id,team,onEffect:event => {
      // Systems validates source/kit/target; cleanup must survive death/pause/disposal.
      if (event.kind==='tether-end'||event.kind==='deployment-end'||event.kind==='buff-end'||event.kind==='burst-end') return effect(event);
      if (disposed || passive || !hero.alive || sim.phase==='pregame' || sim.phase==='finished') return;
      const target=byId.get(event.target);
      if (['damage','status'].includes(event.kind) && target && !visible(bot,target,event.origin)) return;
      return effect(event);
    }});
    bot.runtime.visual.group.position.copy(controller.position);
    return bot;
  });
  const runtimes=bots.map(b => b.runtime);

  function refreshTargets() {
    // ponytail: normal 3v3 ceiling: six heroes, 38 structures, <=888 troopers
    // spawned over 15 active minutes. O(n) live-actor scans, no all-pairs bot
    // search. Spatial bins if population/match length grows.
    targets=[...sim.heroes,...sim.troopers,...sim.structures].map(entity => ({
      id:entity.id, team:entity.team, kind:entity.kind,
      radius:entity.kind==='structure'?3:.6, height:entity.kind==='structure'?10:1.8,
      get position() { return entity.position; }, get alive() { return entity.alive; },
      get vulnerable() { return entity.vulnerable; }, get cloakUntil() { return entity.cloakUntil; },
      get autoTargetable() { return !(entity.cloakUntil>sim.time); }
    })).concat(sim.wallPanels?.()??[]);
    byId=new Map(targets.map(t => [t.id,t]));
    for (const runtime of runtimes) runtime.targets=targets;
  }
  function visible(bot,target,from=bot.runtime.origin) {
    const origin=new THREE.Vector3(from.x,from.y,from.z);
    if (!bot.runtime.visible(origin,target)) return false;
    const end={...target.position,y:target.position.y+(target.height??1.8)*.5};
    if(target.kind==='panel'&&target.bounds) {
      const face=panelSegment(origin,end,target.bounds);
      if(face!==null)for(const axis of ['x','y','z'])end[axis]=origin[axis]+(end[axis]-origin[axis])*face;
    }
    const count=Math.max(1,Math.ceil(distance(origin,end)));
    // Conservative terrain check also excludes shots through ramps/pit edges.
    for (let i=1;i<count;i++) {
      const t=i/count, x=origin.x+(end.x-origin.x)*t, z=origin.z+(end.z-origin.z)*t;
      if (floorHeight(x,z,Infinity)>origin.y+(end.y-origin.y)*t+.02) return false;
    }
    return true;
  }
  function aim(bot,target) {
    const c=bot.controller, p=target.position;
    for (let i=0;i<2;i++) {
      const origin=bot.runtime.origin;
      c.yaw=Math.atan2(origin.x-p.x,origin.z-p.z);
    }
    const origin=bot.runtime.origin;
    c.pitch=THREE.MathUtils.clamp(Math.atan2(p.y+(target.height??1.8)*.5-origin.y,Math.hypot(p.x-origin.x,p.z-origin.z)),-1.2,1.2);
  }
  function shop(bot) {
    if (!sim.shopAvailable(bot.hero.id)) return;
    for (const item of SHOP_ITEMS) {
      if (bot.hero.souls>=item.cost && !bot.hero.items.includes(item.id)) sim.buyItem(bot.hero.id,item.id);
    }
  }
  function enemyFor(bot) {
    let best=null, score=Infinity;
    const range=Math.max(bot.runtime.kit.weapon.range,...bot.runtime.kit.abilities.map(a => a.range??a.radius??0));
    for (const target of targets) {
      if (!target.alive || target.team===bot.hero.team || target.autoTargetable===false || target.kind==='structure'&&!target.vulnerable) continue;
      const d=distance(bot.hero.position,target.position);
      const priority=target.kind==='hero'?0:target.kind==='trooper'?1:2;
      if (d>range || priority*1000+d>=score || !visible(bot,target)) continue;
      best=target; score=priority*1000+d;
    }
    return best;
  }
  function orbFor(bot,type) {
    let best=null, nearest=type==='ground'?8:Math.min(60,bot.runtime.kit.weapon.range);
    for (const orb of sim.orbs) {
      if (orb.claimed || orb.type!==type || orb.expiresAt<=sim.time || type==='ground'&&orb.team!==bot.hero.team) continue;
      const d=distance(bot.hero.position,orb.position);
      if (d<nearest && visible(bot,{position:orb.position,height:0})) { best=orb; nearest=d; }
    }
    return best;
  }
  function shootOrb(bot,orb) {
    const r=bot.runtime;
    if (r.reload>0 || r.fireWait>0) return false;
    if (r.ammo<=0) { r.startReload(); return false; }
    aim(bot,{position:orb.position,height:0});
    if (!visible(bot,{position:orb.position,height:0})) return false;
    // The runtime owns one ammo/timer gate for both weapons and soul shots.
    if (!sim.shootOrb(bot.hero.id,orb.id,{kitShot:true}).ok) return false;
    r.ammo--; r.shots++; r.fireWait=r.kit.weapon.interval*r.modifiers.fire;
    r.fx.emit('longshot',{origin:r.origin,target:new THREE.Vector3(orb.position.x,orb.position.y,orb.position.z),duration:.12});
    if (!r.ammo) r.startReload();
    return true;
  }
  function update(dt,options={}) {
    if (disposed) return;
    dt=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
    passive=options.passive===true;
    refreshTargets();
    for (const bot of bots) {
      const h=bot.hero,c=bot.controller,r=bot.runtime;
      if (h.alive!==bot.alive || distance(c.position,h.position)>.25) {
        c.warp(h.position); r.reset(); bot.alive=h.alive;
        bot.retreating=false; bot.targetId=null;
      }
      r.visual.group.visible=h.alive;
      if (!passive) shop(bot);
      if (!h.alive) { bot.mode='dead'; continue; }
      const stats=sim.stats(h.id);
      r.setModifiers({magazine:stats.maxAmmo,fire:stats.fireInterval/r.kit.weapon.interval});
      if (passive || sim.phase==='finished' || dt===0) {
        c.velocity.set(0,0,0); bot.mode=passive?'passive':'idle';
        if (dt>0) r.update(dt);
        continue;
      }
      const base=sim.bases[h.team], atBase=distance(h.position,base)<18;
      if (h.hp<stats.maxHp*.3) bot.retreating=true;
      if (atBase && h.hp>=stats.maxHp*.85) bot.retreating=false;
      const enemy=sim.phase==='pregame'?null:enemyFor(bot);
      const shopping=h.souls>=1600 && h.items.length<6+h.flexSlots && SHOP_ITEMS.some(item => !h.items.includes(item.id)&&item.cost<=h.souls);
      if (shopping && !enemy) bot.retreating=true;
      bot.targetId=!bot.retreating?enemy?.id??null:null;
      let goal=bot.route.entry;
      if (bot.retreating) { goal=0; bot.mode='retreat'; }
      else if (sim.phase==='pregame') bot.mode='rally';
      else {
        let front=-Infinity;
        for (const trooper of sim.troopers) if (trooper.alive && trooper.team===h.team && trooper.lane===h.lane) front=Math.max(front,bot.route.project(trooper.position));
        if (front===-Infinity) for (const structure of sim.structures) if (structure.alive && structure.team===h.team && structure.lane===h.lane) front=Math.max(front,bot.route.project(structure.position));
        goal=Math.max(bot.route.entry,front-8); bot.mode='lane';
      }
      const progress=bot.route.project(h.position);
      const waypoint=bot.route.at(Math.max(progress-8,Math.min(progress+8,goal)));
      const ground=!bot.retreating?orbFor(bot,'ground'):null;
      let destination=ground?.position??waypoint;
      if (bot.retreating && atBase) destination=h.position;
      if (enemy && !bot.retreating && distance(h.position,enemy.position)<r.kit.weapon.range*.75 && progress<=goal+1 && !ground) destination=h.position;
      let dx=destination.x-h.position.x,dz=destination.z-h.position.z;
      const length=Math.hypot(dx,dz);
      if (length>.4) { dx/=length; dz/=length; } else dx=dz=0;
      if (enemy && !bot.retreating) aim(bot,enemy);
      else if (length>.4) { c.yaw=Math.atan2(-dx,-dz); c.pitch=0; }
      // Systems speed already includes Overtime/slow. Runtime's visual buff
      // must not multiply it again on the next controller update.
      c.speedMultiplier=stats.moveSpeed/8;
      c.update(dt,{forward:-Math.sin(c.yaw)*dx-Math.cos(c.yaw)*dz,side:Math.cos(c.yaw)*dx-Math.sin(c.yaw)*dz,aim:!!enemy&&!bot.retreating});
      const moved=sim.moveHero(h.id,c.position);
      if (!moved.ok) { c.warp(h.position); continue; }
      r.update(dt);
      if (sim.phase==='pregame' || bot.retreating || !h.alive) continue;
      const orb=orbFor(bot,'floating');
      if (orb && shootOrb(bot,orb)) continue;
      if (!enemy?.alive || !visible(bot,enemy)) continue;
      aim(bot,enemy);
      r.fire();
      if (!enemy.alive) continue;
      const range=distance(h.position,enemy.position);
      for (const ability of r.kit.abilities) {
        if ((r.cooldowns[ability.slot]??0)<=0 && range<=(ability.range??ability.radius??r.kit.weapon.range) && enemy.alive && visible(bot,enemy)) r.cast(ability.slot);
      }
    }
  }
  function dispose() {
    if (disposed) return;
    disposed=true;
    for (const bot of bots) { sim.setRetreat(bot.hero.id,false); bot.runtime.dispose(); }
  }
  function snapshot() {
    return bots.map(b => ({id:b.hero.id,team:b.hero.team,lane:b.hero.lane,kit:b.runtime.kit.id,alive:b.hero.alive,hp:b.hero.hp,moveSpeed:sim.stats(b.hero.id).moveSpeed,position:{...b.hero.position},retreating:b.retreating,mode:b.mode,targetId:b.targetId,runtime:b.runtime.snapshot()}));
  }
  return {update,runtimes,dispose,snapshot};
}

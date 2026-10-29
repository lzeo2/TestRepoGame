// Explicit loopback-only QA policies. These are API fixtures, NOT native play.
// No HP, soul, objective lock, phase or winner assignments are used here.
export function runChain(sim,team='carbon',until=600) {
  if(!Number.isFinite(until)||until<sim.time||until>600)throw new RangeError('Invalid fixture end time');
  const enemy=team==='carbon'?'ivory':'carbon';
  const attackers=sim.heroes.filter(h=>h.team===team);
  const human=sim.heroes.find(h=>h.id==='player');
  const expected=team===human?.team?7:3;
  if(!human||sim.heroes.length!==10||attackers.length!==expected)throw new Error('Chain fixture requires seven friendly heroes and three foes.');
  const events=[],actions=[];
  const collect=()=>events.push(...sim.drainEvents());
  const strike=(h,target,raw)=>{
    const position={...target.position,x:target.position.x+1};
    const moved=sim.moveHero(h.id,position);if(!moved.ok)throw new Error(moved.reason);
    const result=sim.damage(target.id,raw,h.id,{kind:'ability'});
    if(!result.ok)throw new Error(result.reason);
    actions.push({time:sim.time,source:h.id,target:target.id,position,raw,amount:result.amount});
  };
  while(sim.time<until) {
    sim.step(Math.min(until,Math.floor(sim.time+1e-7)+1)-sim.time);collect();
    if(sim.time<65||sim.winner)continue;
    for(let i=0;i<sim.lanes.length;i++) {
      const h=attackers[i],lane=sim.lanes[i];if(!h.alive)continue;
      for(const t of sim.troopers.filter(t=>t.alive&&t.team===enemy&&t.lane===lane.id&&(enemy==='ivory'?t.position.z<100:t.position.z>-100)))strike(h,t,180);
      if(sim.time>=180&&sim.time%5===0) {
        const target=sim.structures.find(s=>s.team===enemy&&s.lane===lane.id&&s.type!=='patron'&&s.alive&&s.vulnerable);
        if(target)strike(h,target,250);
      }
      sim.moveHero(h.id,sim.bases[team]);
    }
    const patron=sim.structures.find(s=>s.team===enemy&&s.type==='patron');
    if(sim.time>=570&&patron.vulnerable) {
      const h=attackers.find(h=>h.alive);if(h){strike(h,patron,200);sim.moveHero(h.id,sim.bases[team]);}
    }
    collect();
  }
  return {policy:'600-second API fixture: passive hero bots; logged reposition/180 wave-clear/250 structure assist every 5s from t180; 200 Patron hits from t570. Not native combat or traversal.',team,winner:sim.winner,time:sim.time,events,actions};
}
export function mountFixtures(host) {
  const {sim,hero,controller,traveler,view,actors,world,ui,history}=host;
  let preview=null;
  const sync=()=>{actors.sync(sim);view.syncStructures(sim.structures);ui.update({runtime:host.runtime,controller});view.renderCamera();};
  function place(position,yaw=Math.PI,pitch=-.06) {
    sim.moveHero(hero.id,position);controller.warp(position);controller.yaw=yaw;controller.pitch=pitch;
    traveler.mode='free';traveler.cooldown=0;traveler.ride=null;Object.assign(traveler,position);host.runtime.update(0);controller.updateCamera(view.camera,0);host.runtime.aim(view.camera);sync();
  }
  return {
    start(){host.start();},
    freeze(value=true){host.setPaused(value);},
    advance(seconds){if(!Number.isFinite(seconds)||seconds<0||seconds>600)throw new RangeError('0..600 seconds');for(let t=0;t<seconds;t+=.05)host.tick(Math.min(.05,seconds-t));sync();},
    place, // Recorded API reposition, not proof that geometry is walkable.
    overview(){view.camera.position.set(0,480,0);view.camera.lookAt(0,0,.1);preview={position:view.camera.position.clone(),quaternion:view.camera.quaternion.clone()};view.renderCamera();},
    renderPreview(){if(preview){view.camera.position.copy(preview.position);view.camera.quaternion.copy(preview.quaternion);}},
    clearPreview(){preview=null;},
    inspectHero(){
      const p=controller.position,yaw=controller.yaw;
      view.camera.position.set(p.x-Math.sin(yaw)*2.8+Math.cos(yaw)*1.15,p.y+1.15,p.z-Math.cos(yaw)*2.8-Math.sin(yaw)*1.15);
      view.camera.lookAt(p.x,p.y+1.05,p.z);
      preview={position:view.camera.position.clone(),quaternion:view.camera.quaternion.clone()};view.renderCamera();
    },
    waves(){host.setPaused(true);sim.step(Math.max(0,75-sim.time));sync();return sim.troopers.length;},
    orbs(killerTeam='carbon') {
      host.setPaused(true);sim.step(Math.max(0,75-sim.time));
      const killer=sim.heroes.find(h=>h.team===killerTeam&&h.alive),trooper=sim.troopers.find(t=>t.team!==killerTeam&&t.alive);
      if(!killer||!trooper)throw new Error('No orb fixture actors');
      sim.moveHero(killer.id,{...trooper.position,x:trooper.position.x+1});
      const result=sim.damage(trooper.id,1000,killer.id,{kind:'ability'});if(!result.ok)throw new Error(result.reason);
      const orb=sim.orbs.filter(o=>o.type==='floating'&&!o.claimed).at(-1);
      place({x:orb.position.x,y:orb.position.y-2,z:orb.position.z-16},Math.PI,.03);
      history.push({time:sim.time,fixture:'orbs',killer:killer.id,target:trooper.id,raw:1000});sync();return orb.id;
    },
    aimAt(id){
      const orb=sim.orbs.find(o=>o.id===id);
      const target=orb??[...sim.heroes,...sim.troopers,...sim.structures].find(e=>e.id===id);
      if(!target)throw new Error('Unknown QA aim target');
      // Keep soul aim unchanged; combat bounds use 1.8m bodies / 12m structures.
      const center=orb?0:target.kind==='structure'?6:.9;
      const point=controller.position.clone().set(target.position.x,target.position.y+center,target.position.z);
      for(let i=0;i<40;i++) {
        controller.updateCamera(view.camera,.25);
        view.camera.updateMatrixWorld(); // Projection must use this iteration's camera pose, not the last draw.
        const projected=point.clone().project(view.camera);
        controller.yaw-=projected.x*.35;controller.pitch+=projected.y*.25;
      }
      controller.updateCamera(view.camera,.25);host.runtime.aim(view.camera);sync();
    },
    secure(id){const result=sim.shootOrb(hero.id,id,{kitShot:true});history.push({fixture:'API soul shot',id,result});sync();return result;},
    ground(){const orb=sim.orbs.find(o=>o.type==='ground'&&o.team===hero.team&&!o.claimed);if(!orb)throw new Error('No ground soul');place({...orb.position,x:orb.position.x+3});sim.step(.5);sync();return hero.souls;},
    zip(lane){const station=world.stations.find(s=>s.lane===lane);if(!station)throw new Error('Unknown lane');place(station.a);return Object.freeze({time:sim.time,cooldown:traveler.cooldown,position:Object.freeze({x:traveler.x,y:traveler.y,z:traveler.z})});},
    chain(team='carbon',until=600){host.setPaused(true);const receipt=runChain(sim,team,until);history.push(...receipt.events);controller.warp(hero.position);sync();return receipt;},
    sync
  };
}

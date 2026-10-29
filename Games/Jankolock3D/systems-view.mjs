import * as THREE from './vendor/three.module.js';
import { cloneCharacter } from './character-assets.mjs';
import { AbilityFX } from './heroes/hero-visuals.mjs';

// Shared-scene actor layer; the host preloads the real trooper GLB once.
export function createSystemsLayer(scene,{team='carbon'}={}) {
  const actors=new Map(),markers=new Map(),warnings=new Map(),orbGeometry=new THREE.IcosahedronGeometry(.65,2);
  const ring=new THREE.RingGeometry(.65,.8,24),diamond=new THREE.RingGeometry(.65,.8,4),bar=new THREE.PlaneGeometry(1,1);
  const ally=new THREE.MeshBasicMaterial({color:0x365a74}),foe=new THREE.MeshBasicMaterial({color:0xb55043});
  const backing=new THREE.MeshBasicMaterial({color:0x20201f}),warning=new THREE.MeshBasicMaterial({color:0xd19b35,side:THREE.DoubleSide});
  const soul=new THREE.MeshBasicMaterial({color:0x365a74});
  const edge=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.BackSide});
  let disposed=false,revealFX=null,revealHandle=null;
  const revealPoints=[];
  function makeTrooper(t) {
    // All squads reuse cached GPU geometry; each owns its pose/material state.
    const asset=cloneCharacter('trooper',{shareGeometry:true}),group=asset.group;
    const head=group.getObjectByName('candle');
    if(!head)throw new Error('Trooper candle base pivot missing');
    const joints=['leg-left','leg-right','arm-left','arm-right'].map(n=>group.getObjectByName(n));
    const rests=joints.map(j=>j?.rotation.clone());
    group.traverse(o=>{
      if(!o.isMesh)return;
      if(o.material.name.includes('canvas'))o.material.color.lerp(new THREE.Color(t.team==='carbon'?0x365a74:0xf1e8d6),.16);
      o.userData.baseEmission=o.material.emissiveIntensity;
    });
    group.userData={id:t.id,kind:'trooper',head,joints,rests,asset,model:asset.metadata};
    return group;
  }
  function makeOrb(o) {
    const mesh=new THREE.Mesh(orbGeometry,soul),outline=new THREE.Mesh(orbGeometry,edge);
    outline.scale.setScalar(1.09);mesh.add(outline);mesh.userData={id:o.id,kind:'orb'};return mesh;
  }
  function sync(sim,camera) {
    if(disposed)return;
    const present=new Set();
    for(const entity of [...sim.troopers.filter(t=>t.alive),...sim.orbs.filter(o=>!o.claimed&&sim.time<o.expiresAt)]) {
      present.add(entity.id);let actor=actors.get(entity.id);
      if(!actor){actor=entity.kind==='trooper'?makeTrooper(entity):makeOrb(entity);actors.set(entity.id,actor);scene.add(actor);}
      const p=entity.position;actor.position.set(p.x,p.y+(entity.kind==='orb'&&entity.type==='ground'?.4:0),p.z);
      if(entity.kind==='trooper') {
        const scale=entity.candleScale??1,data=actor.userData;
        data.head.scale.y=scale; // Source pivot y1.45 stays fixed: wax shrinks from bottom.
        data.head.traverse(o=>{if(o.isMesh)o.material.emissiveIntensity=(o.userData.baseEmission??0)*(entity.emissiveScale??scale);});
        const step=entity.targetId?0:Math.sin((entity.distanceMarched??0)*1.7)*.2;
        data.joints.forEach((joint,i)=>{if(joint){joint.rotation.copy(data.rests[i]);joint.rotation.x+=step*(i%2?1:-1)*(i<2?1:.6);}});
        actor.rotation.y=entity.team==='carbon'?Math.PI:0;
      } else actor.scale.setScalar(entity.type==='ground'?.6:1);
    }
    for(const [id,actor] of actors)if(!present.has(id)){actor.userData.asset?.dispose();actor.removeFromParent();actors.delete(id);}
    // Shapes distinguish teams without color alone; all markers still depth-test against cover.
    const liveHeroes=new Set();
    for(const h of sim.heroes)if(h.id!=='player'&&h.alive&&(h.team===team||!(h.cloakUntil>sim.time)||sim.isRevealedTo?.(h.id,team))) {
      liveHeroes.add(h.id);let marker=markers.get(h.id);
      if(!marker) {
        marker=new THREE.Group();marker.userData={id:h.id,kind:'hero-marker'};
        const shape=new THREE.Mesh(h.team===team?ring:diamond,h.team===team?ally:foe);shape.rotation.x=-Math.PI/2;shape.position.y=.04;marker.add(shape);
        const health=new THREE.Group(),bg=new THREE.Mesh(bar,backing),fill=new THREE.Mesh(bar,h.team===team?ally:foe);
        health.position.y=2.35;bg.scale.set(1.4,.12,1);fill.position.z=.002;health.add(bg,fill);marker.add(health);
        marker.userData.health=health;marker.userData.fill=fill;markers.set(h.id,marker);scene.add(marker);
      }
      marker.position.set(h.position.x,h.position.y,h.position.z);
      if(camera)marker.userData.health.quaternion.copy(camera.quaternion);
      const width=1.4*Math.max(0,Math.min(1,h.hp/Math.max(1,h.maxHp)));
      marker.userData.fill.scale.set(width,.1,1);marker.userData.fill.position.x=(width-1.4)/2;
    }
    for(const [id,marker]of markers)if(!liveHeroes.has(id)){marker.removeFromParent();markers.delete(id);}
    const preparing=new Set();
    for(const source of [...sim.heroes,...sim.troopers,...sim.structures]) {
      const intent=source.pendingAttack??source.aiTelegraph;
      if(!source.alive||source.team===team||!intent||!(intent.releaseAt>sim.time))continue;
      preparing.add(source.id);let cue=warnings.get(source.id);
      if(!cue){cue=new THREE.Mesh(ring,warning);cue.rotation.x=-Math.PI/2;cue.userData={id:source.id,kind:'attack-warning'};warnings.set(source.id,cue);scene.add(cue);}
      cue.position.set(source.position.x,source.position.y+.055,source.position.z);cue.scale.setScalar(source.kind==='structure'?4:1.25);
    }
    for(const [id,cue]of warnings)if(!preparing.has(id)){cue.removeFromParent();warnings.delete(id);}
    // Host owns both membership and time; this is only a zero-dt visual mirror.
    revealPoints.length=0;
    for(const entity of [...sim.heroes,...sim.troopers,...sim.structures])if(sim.isRevealedTo?.(entity.id,team)===true)revealPoints.push(entity.position);
    if(revealPoints.length) {
      revealFX??=new AbilityFX(scene);
      revealHandle??=revealFX.emit('xray',{origin:revealPoints[0],targets:()=>revealPoints,duration:1,color:'#73834e'});
      revealHandle.position.copy(revealPoints[0]);
      revealFX.update(0);
    } else if(revealHandle){revealHandle.dispose();revealHandle=null;}
  }
  return {sync,
    shoot(sim,heroId,raycaster) {
      for(const hit of raycaster.intersectObjects([...actors.values()],true)) {
        let actor=hit.object;while(actor.parent&&!actor.userData.id)actor=actor.parent;
        if(actor.userData.kind==='orb') {
          const entity=sim.orbs.find(o=>o.id===actor.userData.id);
          if(entity?.type==='floating')return sim.shootOrb(heroId,entity.id);
        } else if(actor.userData.kind==='trooper')return sim.damage(actor.userData.id,24,heroId);
      }
      return {ok:false,reason:'No shootable target under the pointer.'};
    },
    projections(camera) {
      return [...actors].map(([id,actor])=>{const v=actor.position.clone();if(actor.userData.kind==='trooper')v.y+=.9;v.project(camera);return {id,kind:actor.userData.kind,x:v.x,y:v.y,z:v.z};});
    },
    dispose(){
      if(disposed)return;disposed=true;
      try{for(const actor of actors.values()){actor.userData.asset?.dispose();actor.removeFromParent();}actors.clear();}
      finally{for(const item of [...markers.values(),...warnings.values()])item.removeFromParent();markers.clear();warnings.clear();revealPoints.length=0;revealHandle=null;revealFX?.dispose();for(const resource of [orbGeometry,ring,diamond,bar,soul,edge,ally,foe,backing,warning])resource.dispose();}
    }
  };
}

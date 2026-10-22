import * as THREE from './vendor/three.module.js';
import { cloneCharacter } from './character-assets.mjs';

// Shared-scene actor layer; the host preloads the real trooper GLB once.
export function createSystemsLayer(scene) {
  const actors=new Map(),orbGeometry=new THREE.IcosahedronGeometry(.65,2);
  const soul=new THREE.MeshBasicMaterial({color:0x365a74});
  const edge=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.BackSide});
  let disposed=false;
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
  function sync(sim) {
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
    dispose(){if(disposed)return;disposed=true;for(const actor of actors.values()){actor.userData.asset?.dispose();actor.removeFromParent();}actors.clear();orbGeometry.dispose();soul.dispose();edge.dispose();}
  };
}

import { cloneCharacter } from '../character-assets.mjs';
import { Vector3, Quaternion } from '../vendor/three.module.js';

// Also used by the raw-GLB regression, independently of the asset cache.
export function bindHeroRig(group, rig) {
  if(rig?.schema!=='rigid_parts_v2'||!rig.movable_nodes?.length)throw new Error('Missing rigid_parts_v2 hero rig');
  const nodes=new Map(),axis=new Vector3(1,0,0),delta=new Quaternion();
  group.updateWorldMatrix(true,true);
  const inverse=group.matrixWorld.clone().invert();
  for(const spec of rig.movable_nodes) {
    const matches=[];group.traverse(node=>{if(node.name===spec.name)matches.push(node);});
    if(matches.length!==1||nodes.has(spec.name))throw new Error(`Ambiguous/missing rig node: ${spec.name}`);
    const node=matches[0];
    if(spec.parent!==null&&node.parent?.name!==spec.parent)throw new Error(`Rig hierarchy mismatch: ${spec.name}`);
    if(spec.parent===null&&node!==group&&node.parent!==group)throw new Error(`Rig root hierarchy mismatch: ${spec.name}`);
    if(node.position.distanceTo(new Vector3(...spec.pivot_position))>1e-5||
       node.getWorldPosition(new Vector3()).applyMatrix4(inverse).distanceTo(new Vector3(...spec.pivot_model_position))>1e-5)
      throw new Error(`Rig pivot mismatch: ${spec.name}`);
    for(const limits of [spec.rotation_deg,spec.translation_m])for(const key of ['x','y','z']) {
      const range=limits?.[key];
      if(range!=='free'&&(!Array.isArray(range)||range.length!==2||!range.every(Number.isFinite)||range[0]>0||range[1]<0))
        throw new Error(`Invalid rest-relative rig limits: ${spec.name}/${key}`);
    }
    nodes.set(spec.name,{node,spec,position:node.position.clone(),quaternion:node.quaternion.clone()});
  }
  if(!nodes.has('root'))throw new Error('Missing rig root');
  const twoHanded=nodes.has('ruler_rifle')||nodes.has('stapler_carbine');
  const gooey=rig.model==='gooey_sticky';
  let clock=0;
  function hinge(name,degrees) {
    const joint=nodes.get(name);if(!joint)return;
    const range=joint.spec.rotation_deg.x;
    const angle=range==='free'?degrees:Math.max(range[0],Math.min(range[1],degrees));
    joint.node.quaternion.copy(joint.quaternion).multiply(delta.setFromAxisAngle(axis,angle*Math.PI/180));
  }
  return {
    update(dt,{state='idle',speed=0,aiming=false}={}) {
      clock=(clock+Math.max(0,Number.isFinite(dt)?dt:0)%(Math.PI*2))%(Math.PI*2);
      // Never animate the caller-owned root. All joint deltas start at author rest.
      for(const [name,joint] of nodes)if(name!=='root') {
        joint.node.position.copy(joint.position);joint.node.quaternion.copy(joint.quaternion);
      }
      const moving=Math.min(1,Math.abs(Number.isFinite(speed)?speed:0)/8);
      const stride=Math.sin(clock*9)*moving;
      const sliding=state==='slide',air=state==='jump'||state==='fall';
      const lean=sliding?-10:state==='dash'?-7:state==='jump'?-4:state==='fall'?3:aiming||state==='aim'?-3:0;
      hinge('pelvis',sliding?-2:0);hinge('torso',lean);hinge('head',-lean*.35);
      for(const side of ['l','r']) {
        const step=sliding||air?0:stride*(side==='l'?1:-1);
        const thigh=sliding?-12:state==='jump'?-8:state==='fall'?3:step*12;
        const shin=sliding?20:state==='jump'?12:state==='fall'?4:Math.max(0,-step)*14;
        hinge(`thigh_${side}`,thigh);hinge(`shin_${side}`,shin);
        hinge(`foot_${side}`,gooey?(sliding?-8:air?-4:step*7):-(thigh+shin)*.65);
        // Keep both rifle/carbine grip chains at rest relative to the torso.
        // ponytail: no IK; torso aiming preserves support grip, not full aim pitch.
        if(!twoHanded) {
          hinge(`upper_arm_${side}`,-step*(gooey?4:6)+(aiming?-4:0));
          hinge(`forearm_${side}`,aiming?-2:Math.abs(step)*-2);
          hinge(`hand_${side}`,gooey?(aiming?-2:step):0);
        }
        hinge(`coat_tail_${side}`,Math.abs(step)*4+(sliding?4:0));
        hinge(`folder_panel_${side}`,Math.abs(step)*2);
      }
      for(const name of ['dispatch_satchel','tool_satchel','audit_folio'])hinge(name,Math.abs(stride)*2);
      hinge('satchel_flap',-Math.abs(stride));hinge('lid',gooey?-Math.abs(stride)*2:0);
      group.userData.pose=state;
    }
  };
}

// Runtime pose adapter over the actual committed GLB, not a second primitive hero.
export function createHeroVisual(id) {
  if(!['stampead','turretina','snipeoff','gooey'].includes(id))throw new RangeError(`Unknown hero: ${id}`);
  const asset=cloneCharacter(id),group=asset.group;
  let pose;
  try {pose=bindHeroRig(group,asset.rig);}catch(error){asset.dispose();throw error;}
  let disposed=false;
  return {group,metadata:asset.metadata,
    update(dt,options={}) {
      if(disposed)return;
      // HeroRuntime supplies absolute controller yaw; omitted/invalid yaw leaves placement alone.
      if(Number.isFinite(options.yaw))group.rotation.y=options.yaw;
      pose.update(dt,options);
    },
    dispose(){if(disposed)return;disposed=true;asset.dispose();}
  };
}

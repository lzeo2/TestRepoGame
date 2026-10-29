import { cloneCharacter, TRIO_HERO_IDS } from '../character-assets.mjs';
import { Vector3, Quaternion, Euler, Object3D } from '../vendor/three.module.js';
import { bindExpansionRig, isExpansionHero } from './expansion-rigs.mjs';

// Also used by the raw-GLB regression, independently of the asset cache.
export function bindHeroRig(group, rig) {
  if(isExpansionHero(rig?.model))return bindExpansionRig(group,rig);
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
    nodes.set(spec.name,{node,spec,position:node.position.clone(),quaternion:node.quaternion.clone(),angles:new Euler()});
  }
  if(!nodes.has('root'))throw new Error('Missing rig root');
  const twoHanded=nodes.has('ruler_rifle')||nodes.has('stapler_carbine');
  const gooey=rig.model==='gooey_sticky';
  const stampead=rig.model==='stampead';
  let clock=0,gait=0,pressPhase=1;
  function hinge(name,degrees,component='x') {
    const joint=nodes.get(name);if(!joint)return;
    const range=joint.spec.rotation_deg[component];
    const angle=range==='free'?degrees:Math.max(range[0],Math.min(range[1],degrees));
    if(stampead) {
      // Compose all clamped local axes once from author rest, never overwrite a prior axis.
      joint.angles[component]=angle*Math.PI/180;
      joint.node.quaternion.copy(joint.quaternion).multiply(delta.setFromEuler(joint.angles));
    } else {
      axis.set(0,0,0)[component]=1;
      joint.node.quaternion.copy(joint.quaternion).multiply(delta.setFromAxisAngle(axis,angle*Math.PI/180));
    }
  }
  return {
    ...(stampead?{
      setAcceptedAction(event) {
        if(event?.accepted!==true||!Number.isFinite(event.phase)||event.phase<0||event.phase>1||
          event.kind!=='weapon'&&(event.kind!=='slot'||!Number.isInteger(event.slot)||event.slot<1||event.slot>4))return false;
        // Runtime owns acceptance, phase and expiry. Slots cancel, not invent a clip.
        pressPhase=event.kind==='weapon'?event.phase:1;return true;
      },
      clearAction(){pressPhase=1;},
      reset(){clock=gait=0;pressPhase=1;this.update(0);}
    }:{}),
    update(dt,{state='idle',speed=0,aiming=false,recoil=0,worldVelocity}={}) {
      clock=(clock+Math.max(0,Number.isFinite(dt)?dt:0)%(Math.PI*2))%(Math.PI*2);
      // Never animate the caller-owned root. All joint deltas start at author rest.
      for(const [name,joint] of nodes)if(name!=='root') {
        joint.node.position.copy(joint.position);joint.node.quaternion.copy(joint.quaternion);joint.angles.set(0,0,0);
      }
      const moving=Math.min(1,Math.abs(Number.isFinite(speed)?speed:0)/8);
      let stride=Math.sin(clock*9)*moving;
      const sliding=state==='slide',air=state==='jump'||state==='fall';
      const groundedGait=stampead&&worldVelocity!==undefined;
      if(groundedGait) {
        // ponytail: cosmetic 100m/s cap and rigid no-IK gait; calibrate stride/contact against native captures before adding foot planting.
        const horizontal=Number.isFinite(worldVelocity?.x)&&Number.isFinite(worldVelocity?.z)?
          Math.min(100,Math.hypot(worldVelocity.x,worldVelocity.z)):0;
        const walking=['idle','walk','sprint','aim'].includes(state)&&horizontal>0;
        const elapsed=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
        // One cycle per 2.4m; frozen phase at rest, in air, dash and slide.
        if(walking)gait=(gait+horizontal*elapsed*(Math.PI*2/2.4))%(Math.PI*2);
        stride=walking?Math.sin(gait)*Math.min(1,horizontal/8):0;
      }
      // Stampead's authored takeoff/descent poses fade through the apex, not a state snap.
      // 9 m/s is full pose strength, not a change to jump physics; omit motion for static previews.
      const verticalSpeed=worldVelocity?.y;
      const airPose=rig.model==='stampead'&&air&&Number.isFinite(verticalSpeed)?Math.min(1,Math.abs(verticalSpeed)/9):1;
      const lean=sliding?-10:state==='dash'?-7:state==='jump'?-4*airPose:state==='fall'?3*airPose:aiming||state==='aim'?-3:0;
      const kick=Number.isFinite(recoil)?Math.max(0,Math.min(1,recoil))*6:0;
      if(rig.model==='ribbon-seraph') {
        hinge('hover_core',lean-kick);hinge('optic_mask',aiming?-5:0);
        hinge('spool_rotation',stride*35,'z');hinge('crown_loop_tilt',sliding?-8:0);
        for(const side of ['L','R']) {
          hinge(`${side}_wing_bank`,(side==='L'?1:-1)*(moving*8+stride*3),'z');
          hinge(`${side}_wingtip_curl`,sliding?10:stride*5);
          hinge(`${side}_cephalic_ribbon`,aiming?-8:stride*3);
        }
        for(const i of [-1,0,1]) {
          hinge(`trailing_ribbon_${i}_upper`,sliding?12:stride*7);
          hinge(`trailing_ribbon_${i}_curl`,air?-8:-stride*9);
        }
        group.userData.pose=state;return;
      }
      if(rig.model==='spoollash') {
        hinge('reel_body',lean-kick);hinge('reel_crank',stride*20,'z');
        for(const side of ['left','right']) {
          const step=sliding||air?0:stride*(side==='left'?1:-1);
          hinge(`${side}_hip`,sliding?-18:air?-8:step*14);
          hinge(`${side}_knee`,sliding?-26:air?-14:-Math.abs(step)*16);
          hinge(`${side}_ankle`,sliding?15:air?8:Math.abs(step)*8-step*7);
          hinge(`${side}_shoulder`,aiming?-4:-step*4);
        }
        // Cosmetic cable flex only; damage never follows whip mesh contacts.
        for(let i=1;i<=10;i++)hinge(`whip_joint_${String(i).padStart(2,'0')}`,stride*1.5+kick*.4);
        group.userData.pose=state;return;
      }
      if(rig.model==='checkmate-regent') {
        hinge('body_sway',lean-kick);hinge('head_look',-lean*.35);
        for(const side of ['L','R']) {
          const step=sliding||air?0:stride*(side==='L'?1:-1);
          hinge(`hip_${side}`,sliding?-16:air?-8:step*12);
          hinge(`knee_${side}`,sliding?-24:air?-12:-Math.abs(step)*14);
          hinge(`ankle_${side}`,sliding?16:air?8:Math.abs(step)*8-step*6);
          hinge(`cape_${side}`,Math.abs(step)*4+(sliding?8:0));
        }
        hinge('checker_guard',aiming?-10:0);hinge('rook_sceptre',-kick);
        group.userData.pose=state;return;
      }
      if(rig.model==='prism-warden') {
        hinge('BODY_SUSPENSION',lean-kick);hinge('HEAD_GIMBAL',aiming?-6:0);
        hinge('IRIS_ROTATOR',stride*12,'z');hinge('COMPASS_ARM',-kick);
        for(const side of ['LEFT','RIGHT','REAR']) {
          const step=sliding||air?0:stride*(side==='LEFT'?1:side==='RIGHT'?-1:.5);
          hinge(`LEG_${side}_HIP`,sliding?-12:air?-8:step*6);
          hinge(`LEG_${side}_KNEE`,sliding?22:air?14:-step*8);
          hinge(`LEG_${side}_FOOT`,sliding?-10:air?-6:step*2);
        }
        hinge('COMPASS_SCRIBE_BLADE',aiming?6:0,'z');hinge('COMPASS_PROJECTOR_BLADE',aiming?-6:0,'z');
        group.userData.pose=state;return;
      }
      // Torso kick moves both grips together and stays inside the authored hinge limits.
      hinge('pelvis',sliding?-2:0);hinge('torso',lean-kick);hinge('head',-lean*.35);
      if(groundedGait) {
        const counter=aiming||state==='aim'?0:stride*2.5;
        hinge('pelvis',counter,'y');hinge('torso',-counter,'y');
      }
      for(const side of ['l','r']) {
        const step=sliding||air?0:stride*(side==='l'?1:-1);
        const thigh=sliding?-12:state==='jump'?-8*airPose:state==='fall'?3*airPose:step*(groundedGait?18:12);
        const shin=sliding?20:state==='jump'?12*airPose:state==='fall'?4*airPose:Math.max(0,-step)*(groundedGait?24:14);
        hinge(`thigh_${side}`,thigh);hinge(`shin_${side}`,shin);
        hinge(`foot_${side}`,gooey?(sliding?-8:air?-4:step*7):-(thigh+shin)*(groundedGait&&!air&&!sliding?1:.65));
        // Keep both rifle/carbine grip chains at rest relative to the torso.
        // ponytail: no IK; torso aiming preserves support grip, not full aim pitch.
        if(!twoHanded) {
          const steady=groundedGait&&(aiming||state==='aim');
          hinge(`upper_arm_${side}`,(steady?0:-step*(gooey?4:groundedGait&&side==='r'?2:6))+(aiming?-4:0));
          const press=stampead&&side==='r'?(1-pressPhase)*(12+10*Math.sin(Math.PI*pressPhase)):0;
          hinge(`forearm_${side}`,(aiming?-2:steady?0:Math.abs(step)*(groundedGait&&side==='r'?-.5:-2))-press);
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
  if(!isExpansionHero(id)&&!['stampead','turretina','snipeoff','gooey','ribbon-seraph',...TRIO_HERO_IDS].includes(id))throw new RangeError(`Unknown hero: ${id}`);
  const asset=cloneCharacter(id),group=asset.group;
  let pose;
  try {pose=bindHeroRig(group,asset.rig);}catch(error){asset.dispose();throw error;}
  if(isExpansionHero(id)) {
    // ART adapter only: no kit registration or collision/target-volume change.
    const box=asset.metadata.bodyBounds;
    if(asset.metadata.unlit!==true||![box?.min,box?.max].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite))||box.max.some((v,i)=>v<=box.min[i])) {
      pose.dispose();asset.dispose();throw new Error(`Missing measured clean expansion bounds: ${id}`);
    }
    group.scale.setScalar(1.8/(box.max[1]-box.min[1]));
    let disposed=false;
    return {group,metadata:asset.metadata,muzzle:pose.muzzle,limitations:pose.limitations,
      get motion(){return pose.motion;},
      setAcceptedAction(event){return disposed?false:pose.setAcceptedAction(event);},
      clearAction(){if(!disposed)pose.clearAction();},
      reset(){if(!disposed)pose.reset();},
      update(dt,options={}){
        if(disposed)return;
        if(Number.isFinite(options.yaw))group.rotation.y=options.yaw;
        pose.update(dt,options);
      },
      dispose(){if(disposed)return;disposed=true;pose.dispose();asset.dispose();}
    };
  }
  // 2.466m authored crown becomes 1.8m; wings remain cosmetic outside the
  // unchanged controller capsule/hit volume. The asset's hover is not flight.
  if(id==='ribbon-seraph')group.scale.setScalar(.73);
  // Match the standard 1.8m target height, excluding Spoollash's cosmetic lash.
  if(id==='checkmate-regent')group.scale.setScalar(.7175);
  if(id==='prism-warden')group.scale.setScalar(.6823);
  let disposed=false;
  // Seraph has no authored socket. Add a cosmetic emitter beyond its front face;
  // damage rays and collision still use the existing controller, never wing meshes.
  const emitters={spoollash:['whip_grip',-.45],'checkmate-regent':['rook_sceptre',-.4],'prism-warden':['COMPASS_PROJECTOR_BLADE',-.8]};
  const emitter=emitters[id],socket=id==='ribbon-seraph'||emitter?new Object3D():null;
  if(socket){socket.name=id==='ribbon-seraph'?'typebar_muzzle':'weapon_muzzle';socket.position.set(0,0,emitter?.[1]??-.75);group.getObjectByName(emitter?.[0]??'hover_core').add(socket);}
  const muzzle=socket??group.getObjectByName({stampead:'stamp_face_relief',turretina:'muzzle',snipeoff:'muzzle001',gooey:'hand_r'}[id]);
  return {group,metadata:asset.metadata,muzzle,
    ...(id==='stampead'?{
      setAcceptedAction(event){return disposed?false:pose.setAcceptedAction(event);},
      clearAction(){if(!disposed)pose.clearAction();},
      reset(){if(!disposed)pose.reset();}
    }:{}),
    update(dt,options={}) {
      if(disposed)return;
      // HeroRuntime supplies absolute controller yaw; omitted/invalid yaw leaves placement alone.
      if(Number.isFinite(options.yaw))group.rotation.y=options.yaw;
      pose.update(dt,options);
    },
    dispose(){if(disposed)return;disposed=true;asset.dispose();}
  };
}

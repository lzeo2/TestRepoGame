import { Box3, Quaternion, Vector3 } from '../vendor/three.module.js';

// Recipe DATA promoted from the independently retained docs/jank40/animation-plan-test.mjs.
// Production rolling corrects that plan's sign: omega X = -forward / radius.
// Y-up rigid controls only: 31 bipeds, 3 tripods, 6 wheeled bodies, ZERO floating rigs.
// No skins/IK, foot planting, terrain adaptation or gameplay/collision authority.
const rows = `
ballista|tripod|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle rear_hip/rear_knee/rear_ankle|range_sight:y:2|upper_jaw:x:-6|range_sight:y:8|upper_jaw:x:-8|magazine_slide:z:3|upper_jaw:x:-12,range_sight:y:-4
bindery|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|head:y:2|right_elbow:x:8,right_stapler_jaw:x:-8|left_elbow:x:10,left_stapler_jaw:x:-10|torso:y:4,left_elbow:x:12|left_wrist:z:6,right_wrist:z:-6|torso:y:8,right_stapler_jaw:x:-12
blotting-paper|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|head:y:2|right_arm_shoulder:x:-6|left_cape_hinge:z:8,right_cape_hinge:z:-8|absorbent_bib_hinge:x:5|decoder_paddle_hinge:z:8|left_cape_hinge:z:12,right_cape_hinge:z:-12
calendar|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|reminder_bell:x:2|date_stamp_mount:x:-6|front_page_hinge:x:12|left_shoulder:x:-8|clock_hands:z:25|page_stack_hinge:x:18,reminder_bell:x:6
carbon-copy|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|head:y:2|R_elbow:x:8|copy_fan:y:10|copy_fan:y:-8|L_wrist:z:6|copy_fan:y:15,torso:y:5
carbon-struct|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|head:y:2|brace_driver:z:-6|folding_barricade:z:12|L_elbow:x:12,R_elbow:x:12|L_wrist:z:6|folding_barricade:z:18,brace_driver:z:8
cassette|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|L_reel_spin:z:3,R_reel_spin:z:-3|R_elbow:x:8|tape_feed:y:8|L_reel_spin:z:-15,R_reel_spin:z:-15|L_wrist:z:8|carry_handle:x:12,tape_feed:y:-10
claude-lampe|tripodZ|L_stabilizer/L_foot_hinge R_stabilizer/R_foot_hinge B_stabilizer/B_foot_hinge|louver_expression:z:2|shade_pitch:x:-5|shade_pitch:x:-8|R_task_clamp:z:8|R_wrist:z:6|lower_boom:z:5,upper_boom:z:-5,shade_pitch:x:-10
curriculum|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|head:y:2|right_arm_shoulder:x:-6|left_lesson_leaf:y:8,right_lesson_leaf:y:-8|right_arm_elbow:x:10|left_arm_shoulder:x:-8|lesson_spine:x:8,left_lesson_leaf:y:12,right_lesson_leaf:y:-12
department|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|upper_left_head:y:2,lower_right_head:y:-2|upper_right_arm_shoulder:x:-6|upper_left_arm_elbow:x:10,upper_right_arm_elbow:x:10|lower_left_arm_shoulder:x:-8|upper_left_head:y:6,upper_right_head:y:-6|lower_left_arm_elbow:x:12,lower_right_arm_elbow:x:12
draftsman|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|head:y:2|right_elbow:x:8|left_wrist:z:8|compass_hinge:z:8,compass_pencil:z:-5|right_wrist:z:6|compass_fixed:z:8,compass_pencil:z:-8
envelope|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|head:y:2|slot_launcher:x:-6|left_cape_fold:z:8,right_cape_fold:z:-8|slot_launcher:x:-10|L_elbow:x:10|left_cape_fold:z:12,right_cape_fold:z:-12,slot_launcher:x:-8
filter|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|head:y:2|right_elbow:x:8|left_wrist:z:10|right_wrist:z:-8|head:y:8|torso:y:8,left_elbow:x:12
fridge|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|head:y:1|R_elbow:x:8|magnet_yoke:z:8|pantry_door_hinge:y:15|pantry_door_hinge:y:8|pantry_door_hinge:y:22,L_elbow:x:10
holepuncher|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|head:y:2|R_punch_plunger:ty:-0.03|press_handle_hinge:x:-8|L_punch_plunger:ty:-0.03,R_punch_plunger:ty:-0.03|R_wrist:z:5|press_handle_hinge:x:-12,L_elbow:x:10
ink-station|wheel|L_front_wheel_spin L_rear_wheel_spin R_front_wheel_spin R_rear_wheel_spin|head:y:2|ink_nozzle_tilt:x:-6|ink_nozzle_tilt:x:-10|torso:y:8,ink_nozzle_tilt:x:-8|left_elbow:x:10|ink_nozzle_tilt:x:-12,right_elbow:x:12
inktracer|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|head:y:2|R_elbow:x:8|coat_tail_L:x:6,coat_tail_R:x:6|R_wrist:z:6|L_elbow:x:10|torso:y:8,coat_tail_L:x:10,coat_tail_R:x:10
intercom|tripod|tripod_0_hip/tripod_0_knee tripod_1_hip/tripod_1_knee tripod_2_hip/tripod_2_knee|broadcast_dial:z:3|broadcast_head:x:-5|main_horn_swivel:y:8,left_horn_swivel:y:5,right_horn_swivel:y:-5|microphone_boom_elbow:x:10|broadcast_head:x:-8|control_box_tilt:x:6,broadcast_dial:z:15
kompressor|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|gauge_needle:z:3|R_elbow:x:8|vice_jaw_L:z:8,vice_jaw_R:z:-8|gauge_needle:z:12|L_wrist:z:8|gauge_needle:z:18,R_elbow:x:12
laminate|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|head:y:2|R_elbow:x:8|shield_deploy:y:12|shield_deploy:y:18,L_elbow:x:12|shield_deploy:y:-8|shield_deploy:y:20,torso:y:6
meter|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|record_gauge_needle_pivot:z:3|right_arm_shoulder:x:-6|scan_neck:y:8|receipt_feed:x:10|right_arm_wrist:z:8|record_gauge_needle_pivot:z:15,receipt_reel:x:20
notarize|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|head:y:2|enforcement_stamp_plunger:y:6|right_arm_elbow:x:10|legal_seal:z:8|press_screw:y:15|press_screw:y:25,enforcement_stamp_plunger:y:10
odometer|wheel|rear_L_wheel rear_R_wheel front_wheel|head:y:2|dispatch_blaster:x:-6|rear_airmail_fin:x:6|L_elbow:x:10|dispatch_blaster:x:-10|rear_airmail_fin:x:10,L_wrist:z:8
office-plants|wheel|front_L_caster front_R_caster rear_L_caster rear_R_caster|crown_frond:z:2,L_frond:z:2,R_frond:z:-2|watering_can:z:-6|watering_can:z:-10|L_elbow:x:10|crown_frond:z:6|window_shade:x:5,watering_can:z:-12
outbox|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|head:y:2|right_arm_shoulder:x:-6|right_arm_elbow:x:10|folded_coat_tails:x:6|left_arm_wrist:z:8|left_tray_hinge_0:z:8,right_tray_hinge_0:z:-8,right_arm_elbow:x:12
paper-jam|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|head:y:2|right_roller:x:15|left_elbow:x:10|left_roller:x:20,right_roller:x:-20|clearing_crank:x:20|left_roller:x:30,right_roller:x:-30,clearing_crank:x:25
photocopy|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|head:y:2|right_elbow:x:8|scanner_lid_hinge:x:12|left_shoulder:z:6|scanner_lid_hinge:x:8|scanner_lid_hinge:x:18,left_elbow:x:10
phrase-marker|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|head:y:2|right_arm_shoulder:x:-6|right_arm_elbow:x:10|selection_bracket:z:10|left_arm_wrist:z:8|selection_bracket:z:15,ribbon_tails:x:8
regolith|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|head:y:2|cornerweight_grip:z:-6|L_elbow:x:10|R_shoulder:x:-8|L_elbow:x:12,R_elbow:x:12|cornerweight_grip:z:-10,torso:y:8
rewind|wheel|L_roller_0 L_roller_1 R_roller_0 R_roller_1|head:y:2|R_shoulder:x:-6|return_ribbon:x:6|hand_crank:x:20|rewind_crank:z:10|L_paper_drum:x:20,R_paper_drum:x:-20,return_ribbon:x:8
shred|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|head:y:2|right_elbow:x:8|torso:y:5|right_wrist:z:-10|left_elbow:x:10|torso:y:10,right_elbow:x:12
std-lib|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|index_card_fan:y:2|R_elbow:x:8|drawer_0_slide:tz:-0.04|index_card_fan:y:10|L_file_thumb:z:8|drawer_0_slide:tz:-0.06,drawer_1_slide:tz:-0.06
stencil|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|head:y:2|paint_roller:x:15|roller_handle:z:8|paint_tin:z:8|L_elbow:x:10|paint_roller:x:30,roller_handle:z:12
sticky-note|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|head:y:2|note_peel:x:-8|L_wrist:z:8|pad_backpack:x:6|note_peel:x:-12|note_peel:x:-18,pad_backpack:x:8
transcriber|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|left_reel_spin:z:3,right_reel_spin:z:-3|right_elbow:x:8|right_wrist:z:8|left_elbow:x:10|torso:y:5|left_reel_spin:z:20,right_reel_spin:z:-20,right_elbow:x:12
transit|wheel|left_front_axle left_back_axle right_front_axle right_back_axle|head:y:2|right_sorter_shoulder:x:-6|belt_drive:x:20|left_claw_finger_0:z:8,left_claw_finger_1:z:-8|loading_ramp:x:8|belt_drive:x:30,parcel_cradle:x:5
value-error|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|head:y:2|right_elbow:x:8|left_wrist:z:8,right_wrist:z:-4|right_wrist:z:-8|left_elbow:x:10|torso:y:10,right_elbow:x:12
vortex-prime|wheel|caster_0 caster_1 caster_2|head:y:2|R_shoulder:x:-6|index_hoop:z:10|upper_rotor:y:8|L_wrist:z:8|lower_rotor:y:12,upper_rotor:y:-12,index_hoop:z:15
weigh|biped|left_hip/left_knee/left_ankle right_hip/right_knee/right_ankle|balance_beam:z:2,left_pan_swing:z:-2,right_pan_swing:z:-2|right_elbow:x:8|left_elbow:x:10|balance_beam:z:5,left_pan_swing:z:-5,right_pan_swing:z:-5|left_wrist:z:8|balance_beam:z:8,left_pan_swing:z:-8,right_pan_swing:z:-8
whitespace|biped|L_hip/L_knee/L_ankle R_hip/R_knee/R_ankle|head:y:2|R_shoulder:x:-6|left_sheet_tail:x:6,right_sheet_tail:x:6|margin_square:z:12|ruling_staff:z:8|margin_square:z:15,left_sheet_tail:x:8,right_sheet_tail:x:8
`;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const EXPANSION_RIG_RECIPES=freeze(Object.fromEntries(rows.trim().split('\n').map(row=>{
  const [id,kind,contacts,idle,weapon,...abilities]=row.trim().split('|');
  const decode=text=>text.split(',').map(t=>{const [name,axis,value]=t.split(':');return {name,axis,value:Number(value)};});
  return [id,{id,kind,contacts:contacts.split(' ').map(c=>c.split('/')),idle:decode(idle),weapon:decode(weapon),abilities:abilities.map(decode)}];
})));
export const isExpansionHero=id=>Object.hasOwn(EXPANSION_RIG_RECIPES,id);
// Existing actual mesh origins, not invented sockets/aim directions. Tracers ONLY.
// Meter/Phrase Marker forward remains unverified. These anchors do not resolve it.
export const EXPANSION_MUZZLES=Object.freeze({
  ballista:'driver_gap',bindery:'right_staple_driver','blotting-paper':'right_blotter_ink',calendar:'date_stamp_rubber',
  'carbon-copy':'stylus_point','carbon-struct':'brace_muzzle',cassette:'rewind_baton_head','claude-lampe':'lamp_mouth',
  curriculum:'instruction_ruler',department:'upper_right_stamp',draftsman:'compass_pencil_point',envelope:'launcher_muzzle',
  filter:'envelope_blade_0_body',fridge:'magnet_north',holepuncher:'R_punch_plate','ink-station':'nozzle_mouth',
  inktracer:'dash_nib',intercom:'main_horn_mouth',kompressor:'airtool_nozzle',laminate:'corner_lance_blade',
  meter:'proof_probe_tip',notarize:'stamp_enforcement_sole',odometer:'receipt_muzzle','office-plants':'sprinkler_rose',
  outbox:'paper_dart_1','paper-jam':'right_paper_roll',photocopy:'copy_fan_front','phrase-marker':'marker_chisel_nib',
  regolith:'cornerweight_head',rewind:'return_to_sender_sheet',shred:'gauntlet_mouth','std-lib':'index_key_tooth_3',
  stencil:'roller_sponge','sticky-note':'lifted_sticky_note',transcriber:'microphone_grille',transit:'right_claw_jaw_0',
  'value-error':'correction_pad','vortex-prime':'index_hoop',weigh:'right_counterweight_fist',whitespace:'margin_tool_T'
});
const TAU=Math.PI*2,DEG=Math.PI/180;
const wrap=degrees=>((degrees+180)%360+360)%360-180;
const finiteVector=v=>v&&['x','y','z'].every(k=>Number.isFinite(v[k]));

export function bindExpansionRig(group,rig) {
  const recipe=EXPANSION_RIG_RECIPES[rig?.model];
  if(!isExpansionHero(rig?.model)||rig.schema!=='rigid_parts_v2'||!rig.movable_nodes?.length)throw new Error('Invalid expansion rigid rig');
  const named=new Map(),joints=new Map(),axis=new Vector3(),delta=new Quaternion();
  group.updateWorldMatrix(true,true);
  group.traverse(n=>{if(n.name){if(named.has(n.name))throw new Error(`Ambiguous expansion node: ${n.name}`);named.set(n.name,n);}});
  const inverse=group.matrixWorld.clone().invert();
  for(const spec of rig.movable_nodes){
    const node=named.get(spec.name);
    if(!node||joints.has(spec.name))throw new Error(`Missing/duplicate expansion joint: ${spec.name}`);
    if(spec.parent===null?(spec.name!=='root'||node!==group&&node.parent!==group):node.parent?.name!==spec.parent)throw new Error(`Expansion hierarchy: ${spec.name}`);
    if(![spec.pivot_position,spec.pivot_model_position].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))||
      node.position.distanceTo(new Vector3(...spec.pivot_position))>1e-5||
      node.getWorldPosition(new Vector3()).applyMatrix4(inverse).distanceTo(new Vector3(...spec.pivot_model_position))>1e-5)throw new Error(`Expansion pivot: ${spec.name}`);
    for(const limits of [spec.rotation_deg,spec.translation_m])for(const k of ['x','y','z']){
      const r=limits?.[k];if(r!=='free'&&(!Array.isArray(r)||r.length!==2||!r.every(Number.isFinite)||r[0]>0||r[1]<0))throw new Error(`Expansion limits: ${spec.name}/${k}`);
    }
    let vertices=0;node.traverse(n=>{vertices+=n.isMesh?(n.geometry?.attributes.position?.count??0):0;});
    if(!vertices)throw new Error(`Empty expansion joint: ${spec.name}`);
    if(![...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()].every(Number.isFinite)||Math.abs(node.quaternion.length()-1)>1e-5)throw new Error(`Expansion transform: ${spec.name}`);
    joints.set(spec.name,{node,spec,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()});
  }
  const root=joints.get('root')?.node;if(!root)throw new Error('Missing expansion root');
  function requireJoint(name){if(name==='root'||!joints.has(name))throw new Error(`Missing required expansion control: ${name}`);return joints.get(name);}
  recipe.contacts.flat().forEach(requireJoint);
  [recipe.idle,recipe.weapon,...recipe.abilities].flat().forEach(t=>requireJoint(t.name));
  const muzzle=named.get(EXPANSION_MUZZLES[rig.model]);
  if(!muzzle)throw new Error(`Missing expansion cosmetic anchor: ${rig.model}`);
  const radii={};
  if(recipe.kind==='wheel')for(const [name] of recipe.contacts){
    const wheel=requireJoint(name).node,box=new Box3(),point=new Vector3(),inverse=wheel.matrixWorld.clone().invert();
    wheel.traverse(n=>{if(n.isMesh){const p=n.geometry.attributes.position;for(let i=0;i<p.count;i++)box.expandByPoint(point.fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld).applyMatrix4(inverse));}});
    radii[name]=Math.max(Math.abs(box.min.y),Math.abs(box.max.y),Math.abs(box.min.z),Math.abs(box.max.z));
    if(!(radii[name]>.02&&radii[name]<.5))throw new Error(`Expansion wheel radius: ${name}`);
  }
  let cycle=0,idleClock=0,action=null,disposed=false;
  const distances=Object.fromEntries(recipe.contacts.map(([name])=>[name,0])),headings={};
  let motion={forward:0,lateral:0,lateralSlip:0};
  function restore(){for(const [name,j] of joints)if(name!=='root'){j.node.position.copy(j.position);j.node.quaternion.copy(j.quaternion);j.node.scale.copy(j.scale);}}
  function apply(name,component,value){
    const j=requireJoint(name),translation=component.startsWith('t'),k=component.at(-1);
    const r=(translation?j.spec.translation_m:j.spec.rotation_deg)[k];
    const amount=r==='free'?value:Math.max(r[0],Math.min(r[1],value));
    if(translation)j.node.position[k]=j.position[k]+amount;
    else{axis.set(0,0,0)[k]=1;j.node.quaternion.multiply(delta.setFromAxisAngle(axis,amount*DEG));}
  }
  function gesture(targets,amount){for(const t of targets)apply(t.name,t.axis,t.value*amount);}
  const worldScale=new Vector3(),localVelocity=new Vector3(),inverseRotation=new Quaternion();
  return {
    recipe,muzzle,wheelRadii:Object.freeze(radii),
    limitations:Object.freeze({footPlanting:false,terrainContacts:false,forwardVerified:!['meter','phrase-marker'].includes(rig.model),floating:false,fixedWheelLateralScrub:recipe.kind==='wheel'&&rig.model!=='ink-station'}),
    get motion(){return {...motion};},
    // Explicit visual sampling of an ALREADY ACCEPTED authoritative event.
    // Caller owns phase/lifetime/cancellation. No timers, damage, cooldown or recoil inference.
    // A rejected new request cannot erase an already accepted gesture.
    setAcceptedAction(event){
      if(disposed||event?.accepted!==true)return false;
      if(!Number.isFinite(event.phase)||event.phase<0||event.phase>1||
        event.kind!=='weapon'&&(event.kind!=='slot'||!Number.isInteger(event.slot)||event.slot<1||event.slot>4))throw new RangeError('Invalid accepted expansion action');
      action={kind:event.kind,slot:event.slot,phase:event.phase};return true;
    },
    clearAction(){action=null;},
    update(dt,{state='idle',speed=0,worldVelocity}={}){
      if(disposed)return;
      const elapsed=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
      let forward=Number.isFinite(speed)?Math.max(-100,Math.min(100,speed)):0,lateral=0;
      if(worldVelocity!==undefined){
        if(!finiteVector(worldVelocity))throw new RangeError('Invalid expansion worldVelocity');
        root.getWorldQuaternion(inverseRotation).invert();
        localVelocity.set(Math.max(-100,Math.min(100,worldVelocity.x)),0,Math.max(-100,Math.min(100,worldVelocity.z))).applyQuaternion(inverseRotation);
        forward=Math.max(-100,Math.min(100,-localVelocity.z));lateral=Math.max(-100,Math.min(100,localVelocity.x));
      }
      const ground=!['jump','fall','slide'].includes(state),speedXZ=ground?Math.hypot(forward,lateral):0;
      const moving=Math.min(1,speedXZ/8),direction=speedXZ?forward/speedXZ:0;
      cycle=(cycle+speedXZ*elapsed*9/8)%TAU;idleClock=(idleClock+elapsed*2.5)%TAU;
      restore();motion={forward,lateral,lateralSlip:recipe.kind==='wheel'?Math.abs(lateral):0};
      if(recipe.kind==='wheel'){
        group.getWorldScale(worldScale);const scale=Math.abs(worldScale.y);
        if(!Number.isFinite(scale)||scale<1e-6)throw new RangeError('Invalid expansion visual scale');
        for(const [name] of recipe.contacts){
          // Fixed wheel axes cannot roll sideways. Lateral travel is explicit scrub,
          // not fake forward rotation. Ink Station can steer its real free-Y casters.
          let travel=ground?forward:0;
          if(rig.model==='ink-station'){
            if(speedXZ){
              let heading=Math.atan2(-lateral,forward);travel=speedXZ;
              if(Math.abs(heading)>Math.PI/2){heading-=Math.sign(heading)*Math.PI;travel=-speedXZ;}
              headings[name]=heading/DEG;
            }
            apply(name.replace('_wheel_spin','_caster'),'y',headings[name]??0);motion.lateralSlip=0;
          }
          distances[name]=(distances[name]+travel*elapsed/scale)%(TAU*radii[name]);
          apply(name,'x',wrap(-distances[name]/radii[name]/DEG));
        }
      }else if(moving){
        recipe.contacts.forEach((chain,i)=>{
          const s=Math.sin(cycle+i*(recipe.kind==='biped'?Math.PI:TAU/3))*moving;
          if(recipe.kind==='tripodZ'){apply(chain[0],'z',s*3*direction);apply(chain[1],'x',s*2);}
          else{const hip=s*8*direction,knee=-Math.max(0,s)*8;apply(chain[0],'x',hip);apply(chain[1],'x',knee);if(chain[2])apply(chain[2],'x',-(hip+knee)*.5);}
        });
      }
      if(action)gesture(action.kind==='weapon'?recipe.weapon:recipe.abilities[action.slot-1],Math.sin(action.phase*Math.PI));
      else if(!moving)gesture(recipe.idle,Math.sin(idleClock));
      group.userData.pose=state;
    },
    reset(){if(disposed)return;cycle=idleClock=0;action=null;for(const name of Object.keys(distances)){distances[name]=0;headings[name]=0;}motion={forward:0,lateral:0,lateralSlip:0};restore();group.userData.pose='idle';},
    dispose(){if(disposed)return;restore();action=null;disposed=true;}
  };
}

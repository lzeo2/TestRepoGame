import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import {PERSON_MODEL, appearanceForPerson} from './person-model.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';

const LIMIT = 16, NOODLE_SEGMENTS = 36, THROW_SEGMENTS = 12, ACCESSORY_CAPACITY = LIMIT+10+NOODLE_SEGMENTS+8+6+THROW_SEGMENTS+5;
const finite = n => Number.isFinite(n) ? n : 0;
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);

// Six shared instance batches are created only while a room is loaded.
export function createInteriorPeopleView(scene,heightAt = () => 0) {
  let root = null, plan = null, material = null, meshes = [], disposed = false;
  const body = new THREE.Object3D(), part = new THREE.Object3D(), matrix = new THREE.Matrix4(), color = new THREE.Color();
  let count = 0, draws = 0, exerciseFocus = null;
  const appearances=new Map();
  let playerAppearance=appearanceForPerson('player');
  function setPlayerAppearance(personId) {
    if(disposed || !['player','player:student','player:corporate','player:basement'].includes(personId))return false;
    playerAppearance=appearanceForPerson(personId);appearances.delete('player');return true;
  }
  function geometry(parts) {
    const sources = parts.map(([size,position,tint=0xffffff,shape='box']) => {
      const g = shape==='sphere' ? new THREE.SphereGeometry(1,6,4) : shape==='capsule' ? new THREE.CapsuleGeometry(1,1,2,5) : new THREE.BoxGeometry(1,1,1);
      g.scale(...size);g.translate(...position);
      const colors = new Float32Array(g.attributes.position.count*3),rgb = new THREE.Color(tint);
      for (let i=0;i<colors.length;i+=3) rgb.toArray(colors,i);
      g.setAttribute('color',new THREE.BufferAttribute(colors,3));return g;
    });
    const result = mergeGeometries(sources,false); sources.forEach(g=>g.dispose());return result;
  }
  function batch(name,parts,capacity) {
    const mesh = new THREE.InstancedMesh(geometry(parts),material,capacity);
    mesh.name=name; mesh.count=0; mesh.visible=false;mesh.frustumCulled=false;root.add(mesh);meshes.push(mesh);return mesh;
  }
  function load(value) {
    clear();if (disposed || !value || !Number.isFinite(value.floorY)) return;
    plan=value;root=new THREE.Group();root.name='Active interior adults';scene.add(root);
    material=new THREE.MeshLambertMaterial({vertexColors:true});
    const shape=(name,kind)=>{const d=PERSON_MODEL[name];return [[d.sx,d.sy,d.sz],[d.x,d.y,d.z],0xffffff,kind];};
    batch('Adult shirts',[shape('torso','capsule')],LIMIT+1);
    batch('Adult faces',[shape('head','sphere'),[[.035,.03,.015],[-.06,1.65,.126],0x171b1b],[[.035,.03,.015],[.06,1.65,.126],0x171b1b]],LIMIT+1);
    batch('Adult hair',[shape('hair','sphere')],LIMIT+1);
    batch('Adult trouser limbs',[[[1,1,1],[0,0,0]]],(LIMIT+1)*6);
    batch('Adult arm limbs',[[[1/2,1/3,1/2],[0,0,0],0xffffff,'capsule']],(LIMIT+1)*4);
    batch('Aprons and exercise bar',[[[1,1,1],[0,0,0]]],ACCESSORY_CAPACITY);
  }
  function put(index,position,rotation,scale,tint) {
    const mesh=meshes[index];if(mesh.count>=mesh.instanceMatrix.count)return;const i=mesh.count++;
    part.position.set(...position);part.rotation.set(...rotation);part.scale.set(...scale);part.updateMatrix();
    matrix.multiplyMatrices(body.matrix,part.matrix);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,color.setHex(tint));
  }
  function limb(a,b,tint) {
    const dy=b[1]-a[1],dz=b[2]-a[2];
    put(4,[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],[Math.atan2(dz,dy),0,0],[.12,Math.hypot(dy,dz),.13],tint);
  }
  function person(p,lying=false) {
    let appearance=appearances.get(p.id);
    if(!appearance){appearance=p.id==='player'?playerAppearance:appearanceForPerson(p.id||'player');if(appearances.size<LIMIT+1)appearances.set(p.id,appearance);}
    const skin=appearance.skin,shirt=appearance.shirt;
    const phase=finite(p.phase),coerced=p.health>0 && p.crimePhase,down=finite(p.knockdown)>0 || p.health===0;
    const moving=!coerced && finite(p.speed)>0,gesture=p.gesture || 'idle',seated=!coerced && !down && Boolean(p.seated);
    body.position.set(p.x,Number.isFinite(p.y)?p.y:finite(heightAt(p.x,p.z)),p.z);
    body.rotation.set(0,finite(p.yaw),0);body.scale.set(1,1,1);
    if (lying) {
      body.rotation.x=Math.PI/2;body.position.x-=Math.sin(finite(p.yaw))*.83;body.position.z-=Math.cos(finite(p.yaw))*.83;
    } else if (down) {body.rotation.x=Math.PI/2;body.position.y+=.18;}
    else if (seated) body.position.y+=finite(p.seatHeight)-.90;
    else if (coerced && p.crimePhase==='emptying') body.rotation.x=.20;
    else if (finite(p.stun)>0) {body.rotation.z=.12;body.scale.y=.88;}
    body.updateMatrix();
    put(0,[0,0,0],[0,0,0],[1,1,1],shirt);
    put(1,[0,0,0],[0,0,0],[1,1,1],skin);
    put(2,[0,0,0],[0,0,0],[1,1,1],appearance.hair);
    if(p.earmuffs) {
      put(5,[0,1.58,-.10],[0,0,0],[.27,.30,.08],appearance.hair);
      for(const sign of [-1,1]) {
        put(5,[sign*.17,1.65,0],[0,0,0],[.09,.15,.14],0xe892bd);
        put(5,[sign*.13,1.79,0],[0,0,-sign*.4],[.035,.16,.035],0xe892bd);
      }
      put(5,[0,1.85,0],[0,0,0],[.22,.035,.035],0xe892bd);
    }
    const throwing=p.noodleThrow && (p.noodleThrow.phase==='flight' || (!coerced && !down && p.stun<=0 && p.reaction==='angry')) ? p.noodleThrow : null;
    const pulling=gesture==='pull-noodles' && !coerced && !down && p.reaction==='calm';
    const spread=.25+(Math.sin(phase*2)+1)*.10,handY=1.23+Math.cos(phase*2)*.10;
    if(pulling) {
      for(let strand=0;strand<6;strand++) for(let segment=0;segment<6;segment++) {
        const a=segment/6,b=(segment+1)/6,sag=.15+strand*.012;
        const ax=(a*2-1)*spread,bx=(b*2-1)*spread,ay=handY-Math.sin(a*Math.PI)*sag,by=handY-Math.sin(b*Math.PI)*sag;
        put(5,[(ax+bx)/2,(ay+by)/2,.40+(strand-2.5)*.009],[0,0,Math.atan2(by-ay,bx-ax)],[Math.hypot(bx-ax,by-ay)+.006,.009,.009],0xead8a4);
      }
    }
    for(let side=0;side<2;side++) {
      const sign=side?1:-1,stride=gesture==='treadmill' ? finite(p.lift)*.30*sign*(p.reps%2?-1:1) : moving?Math.sin(phase*8)*.21*sign:0;
      if (seated) {
        put(3,[sign*.115,.91,.20],[0,0,0],[.17,.17,.42],appearance.trousers);
        put(3,[sign*.115,gesture==='rower'?.75:.90-finite(p.seatHeight)/2,gesture==='rower'?.60:.39],[0,0,0],[.15,gesture==='rower'?.32:Math.max(.20,finite(p.seatHeight)-.12),.16],appearance.trousers);
        put(3,[sign*.115,gesture==='rower'?.62:.96-finite(p.seatHeight),gesture==='rower'?.60:.45],[0,0,0],[.19,.11,.29],0x252b2d);
      } else {
        put(3,[sign*.115,.49,0],[stride,0,0],[.17,.83,.19],appearance.trousers);
        put(3,[sign*.115,.07,gesture==='treadmill'?stride*.55:.055],[0,0,0],[.19,.13,.30],0x252b2d);
      }
      if (coerced && !down && !lying) {
        if (p.crimePhase==='intimidation') {
          put(4,[sign*.34,1.53,0],[0,0,-sign*.3],[.13,.36,.14],skin);
          put(4,[sign*.41,1.84,.03],[0,0,sign*.12],[.12,.30,.13],skin);
        } else {
          const emptying=p.crimePhase==='emptying';
          const reach=emptying ? .28+Math.sin(phase*3)*.06 : .38;
          put(4,[sign*.29,1.25,.15],[1.0,0,0],[.13,.36,.14],skin);
          put(4,[sign*.25,emptying?1.02:1.18,reach],[Math.PI/2,0,0],[.12,.34,.13],skin);
        }
        continue;
      }
      const amount=Math.max(0,Math.min(1,finite(p.lift)));
      if(gesture==='curls') {
        const curling=(p.reps%2===side),lift=curling?amount:0;
        const hand=[sign*.29,.86+lift*.48,.12+Math.sin(lift*Math.PI)*.22];
        limb([sign*.29,1.34,0],[sign*.29,1.03,.06],skin);limb([sign*.29,1.03,.06],hand,skin);
        put(5,hand,[0,0,0],[.30,.045,.045],0xaeb6b7);
        for(const end of [-1,1])put(5,[hand[0]+end*.14,hand[1],hand[2]],[0,0,0],[.09,.18,.18],0x343a3e);
        continue;
      }
      if(gesture==='rower') {
        const handZ=.94-amount*.55,handY=1.15;
        limb([sign*.29,1.34,0],[sign*.29,1.20,.38-amount*.17],skin);
        limb([sign*.29,1.20,.38-amount*.17],[sign*.23,handY,handZ],skin);
        if(side===0)put(5,[0,handY,handZ],[0,0,0],[.65,.045,.045],0xaeb6b7);
        continue;
      }
      if(throwing && !coerced && !down && p.stun<=0) {
        const progress=Math.min(1,Math.max(0,finite(throwing.time)/throwing.duration));
        const handY=throwing.phase==='windup'?1.1+progress*.36:1.4-progress*.15;
        const handZ=throwing.phase==='windup'?.35-progress*.48:.48;
        limb([sign*.29,1.34,0],[sign*.29,1.30,.1],skin);
        limb([sign*.29,1.30,.1],[sign*.18,handY,handZ],skin);
        continue;
      }
      const attacking=!coerced&&!down&&p.stun<=0&&p.reaction==='angry'&&finite(p.attackTimer)>0;
      if(attacking) {
        const progress=1-Math.min(1,p.attackTimer/.65),extension=progress<.25 ? -.10*progress/.25 : progress<.55 ? (progress-.25)/.30 : (1-progress)/.45;
        const punch=(p.attackSerial%2===side),reach=punch?.27+extension*.43:.22;
        limb([sign*.29,1.34,0],[sign*.29,1.28,.16+Math.max(0,extension)*.13],skin);
        limb([sign*.29,1.28,.16+Math.max(0,extension)*.13],[sign*.23,1.35,reach],skin);
        continue;
      }
      let reach=0,lift=0;
      if(pulling) {
        put(4,[sign*.29,1.32,.15],[.6,0,sign*.25],[.13,.36,.14],skin);
        put(4,[sign*spread,handY,.33],[Math.PI/2,0,0],[.12,.25,.13],skin);
        continue;
      }
      if(p.reaction==='angry' && !down) {reach=.22;lift=.22;}
      else if (gesture==='eat') {reach=.18;lift=.06+Math.sin(phase*2+side)*.09;}
      else if (gesture==='serve'||gesture==='prepare'||gesture==='browse') {reach=.18;lift=Math.sin(phase*2+side)*.06;}
      else if (gesture==='exercise'||gesture==='coach') {lift=.16+Math.sin(phase*2)*.15;}
      else if (lying) {reach=.20;lift=.25;}
      if(lying) {
        const press=Math.max(0,Math.min(1,finite(p.lift)));
        put(4,[sign*.29,1.3,-.16],[Math.PI/2,0,0],[.13,.33,.14],skin);
        put(4,[sign*.29,1.3,-.40-press*.19],[Math.PI/2,0,0],[.12,.35+press*.38,.13],skin);
        continue;
      }
      put(4,[sign*.29,1.22+lift,reach],[moving?-stride:0,0,sign*.08],[.13,.36,.14],skin);
      put(4,[sign*.27,1.05+lift,.10+reach],[seated?-Math.PI/3:-.3,0,0],[.12,.29,.13],skin);
    }
    if(throwing) {
      const progress=Math.min(1,Math.max(0,finite(throwing.time)/throwing.duration));
      let centre=[0,1.1+progress*.36,.35-progress*.48];
      if(throwing.phase==='flight' && valid(throwing.from) && valid(throwing.to)) {
        const from=throwing.from,to=throwing.to;
        body.position.set(from.x+(to.x-from.x)*progress,finite(from.y)+(finite(to.y)-finite(from.y))*progress+Math.sin(progress*Math.PI)*.45,from.z+(to.z-from.z)*progress);
        body.rotation.set(progress*3,finite(p.yaw),progress*2);body.scale.set(1,1,1);body.updateMatrix();centre=[0,0,0];
      }
      put(5,centre,[0,0,0],[.34,.045,.27],0xe7e1d2);
      for(const sign of [-1,1]) {
        put(5,[centre[0]+sign*.17,centre[1]+.05,centre[2]],[0,0,0],[.035,.10,.27],0xe7e1d2);
        put(5,[centre[0],centre[1]+.05,centre[2]+sign*.135],[0,0,0],[.34,.10,.035],0xe7e1d2);
      }
      for(let i=0;i<THROW_SEGMENTS;i++) {
        const scatter=throwing.phase==='flight'?progress:0;
        put(5,[centre[0]+((i%4)-1.5)*(.055+scatter*.07),centre[1]+.08-Math.floor(i/4)*scatter*.055,centre[2]+(Math.floor(i/4)-1)*.06],[scatter*(i%3),i*.7,scatter*i],[.13,.012,.012],0xead8a4);
      }
    }
    if(coerced && !down && p.crimePhase==='handover') put(5,[0,1.08,.57],[0,0,0],[.24,.24,.15],0x997a50);
    if(p.apron) put(5,[0,1.05,.143],[0,0,0],[.33,.63,.025],p.role==='cook'?0xddd5bd:0xb9ad89);
  }
  function update(people,dt,{activity} = {}) {
    if (disposed || !plan) return;
    for(const mesh of meshes) mesh.count=0;
    count=0;
    const list=Array.isArray(people)?people:people?.snapshot?.() || [];
    for(const p of list) {if (count>=LIMIT) break;if(!valid(p))continue;person(p);count++;}
    exerciseFocus=null;
    const station=activity?.active===true && (plan.activities||[]).find(s=>s.id===activity.station?.id && s.kind===activity.kind && s.kind===activity.exercisePose);
    const workout=station && ['bench','treadmill','curls','rower'].includes(station.kind) ? station.kind : null;
    if(workout && workout!=='bench') {
      const equipment=(plan.furniture||[]).find(f=>f.kind===workout);
      if(workout==='curls'||equipment) {
        let x=station.x,z=station.z,y=plan.floorY,yaw=finite(station.yaw)+Math.PI;
        if(equipment) {
          const offset=workout==='rower'?-.3:-.1;
          yaw=finite(equipment.yaw);x=equipment.x+Math.sin(yaw)*offset;z=equipment.z+Math.cos(yaw)*offset;
          y+=workout==='treadmill'?.31:0;
        }
        person({id:'player',x,z,y,yaw,phase:0,lift:activity.lift,reps:activity.reps||0,gesture:workout,
          seated:workout==='rower',seatHeight:workout==='rower'?.53:0});
        exerciseFocus=Object.freeze({x,z,y:plan.floorY+1});
      }
    }
    const bench=plan.exercise;
    if (valid(bench)) {
      const exercising=workout==='bench';
      if(exercising) {
      exerciseFocus=Object.freeze({x:bench.x,z:bench.z,y:plan.floorY+1});
      person({id:'player',x:bench.x,z:bench.z,y:plan.floorY+finite(bench.height)+.13,yaw:finite(bench.yaw),palette:0,hair:0,phase:0,lift:activity.lift,gesture:'bench'},true);
      }
      body.position.set(bench.x,plan.floorY+(exercising ? finite(bench.height)+.60+Math.max(0,Math.min(1,finite(activity.lift)))*.38 : 1.48),bench.z);
      body.rotation.set(0,finite(bench.yaw),0);body.updateMatrix();
      put(5,[0,0,.60],[0,0,0],[1.65,.045,.045],0xaeb6b7);
      for(const side of [-1,1]) put(5,[side*.64,0,.60],[0,0,0],[.13,.32,.32],0x343a3e);
    }
    draws=0;
    for(const mesh of meshes) {mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;if(mesh.visible)draws++;}
  }
  function clear() {
    if(root) {scene.remove(root);for(const mesh of meshes){mesh.dispose();mesh.geometry.dispose();}material.dispose();}
    root=null;plan=null;material=null;meshes=[];count=draws=0;appearances.clear();exerciseFocus=null;
  }
  return {load,update,clear,setPlayerAppearance,get exerciseFocus(){return exerciseFocus;},get stats(){return Object.freeze({active:plan?.id || null,people:count,limit:LIMIT,drawCalls:draws,geometryCount:meshes.length,materialCount:material?1:0,disposed,accessoryCapacity:ACCESSORY_CAPACITY,noodleSegmentLimit:NOODLE_SEGMENTS,throwSegmentLimit:THROW_SEGMENTS,sharedModel:true,exerciseFocus});},
    dispose(){if(disposed)return;clear();disposed=true;}};
}

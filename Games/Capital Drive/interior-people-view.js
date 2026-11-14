import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';

const LIMIT = 16;
const PALETTES = [0x31516a,0x9d543b,0x627b52,0x895975,0xc3a45f,0x506d78];
const SKINS = [0xd6a17a,0xa96f4f,0xe1b892,0x78503e,0xbb8966,0x926045];
const HAIR = [0x302a26,0x76513b,0x1d2226,0xaaa498];
const finite = n => Number.isFinite(n) ? n : 0;
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);

// Six shared instance batches are created only while a room is loaded.
export function createInteriorPeopleView(scene,heightAt = () => 0) {
  let root = null, plan = null, material = null, meshes = [], disposed = false;
  const body = new THREE.Object3D(), part = new THREE.Object3D(), matrix = new THREE.Matrix4(), color = new THREE.Color();
  let count = 0, draws = 0;
  function geometry(parts) {
    const sources = parts.map(([size,position,tint=0xffffff]) => {
      const g = new THREE.BoxGeometry(...size); g.translate(...position);
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
    batch('Adult shirts',[[[.43,.54,.25],[0,1.18,0]],[[.56,.15,.26],[0,1.36,0]]],LIMIT+1);
    batch('Adult faces',[[[.26,.29,.24],[0,1.66,0]],[[.04,.035,.015],[-.065,1.69,.127],0x171b1b],[[.04,.035,.015],[.065,1.69,.127],0x171b1b]],LIMIT+1);
    batch('Adult hair',[[[.28,.09,.25],[0,1.82,-.005]],[[.28,.17,.06],[0,1.72,-.108]]],LIMIT+1);
    batch('Adult trouser limbs',[[[1,1,1],[0,0,0]]],(LIMIT+1)*6);
    batch('Adult arm limbs',[[[1,1,1],[0,0,0]]],(LIMIT+1)*4);
    batch('Aprons and exercise bar',[[[1,1,1],[0,0,0]]],LIMIT+10);
  }
  function put(index,position,rotation,scale,tint) {
    const mesh=meshes[index],i=mesh.count++;
    part.position.set(...position);part.rotation.set(...rotation);part.scale.set(...scale);part.updateMatrix();
    matrix.multiplyMatrices(body.matrix,part.matrix);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,color.setHex(tint));
  }
  function person(p,lying=false) {
    const index=Math.abs(Math.trunc(finite(p.palette)))%6,skin=SKINS[index],shirt=PALETTES[index];
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
    put(2,[0,0,0],[0,0,0],[1,1+Math.abs(Math.trunc(finite(p.hair)))%3*.2,1],HAIR[Math.abs(Math.trunc(finite(p.hair)))%4]);
    for(let side=0;side<2;side++) {
      const sign=side?1:-1,stride=moving?Math.sin(phase*8)*.21*sign:0;
      if (seated) {
        put(3,[sign*.115,.91,.20],[0,0,0],[.17,.17,.42],0x364452);
        put(3,[sign*.115,.90-finite(p.seatHeight)/2,.39],[0,0,0],[.15,Math.max(.20,finite(p.seatHeight)-.12),.16],0x364452);
        put(3,[sign*.115,.96-finite(p.seatHeight),.45],[0,0,0],[.19,.11,.29],0x252b2d);
      } else {
        put(3,[sign*.115,.49,0],[stride,0,0],[.17,.83,.19],0x364452);
        put(3,[sign*.115,.07,.055],[0,0,0],[.19,.13,.30],0x252b2d);
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
      let reach=0,lift=0;
      if (gesture==='eat') {reach=.18;lift=.06+Math.sin(phase*2+side)*.09;}
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
    if(coerced && !down && p.crimePhase==='handover') put(5,[0,1.08,.57],[0,0,0],[.24,.24,.15],0x997a50);
    if(p.apron) put(5,[0,1.05,.143],[0,0,0],[.33,.63,.025],p.role==='cook'?0xddd5bd:0xb9ad89);
  }
  function update(people,dt,{activity} = {}) {
    if (disposed || !plan) return;
    for(const mesh of meshes) mesh.count=0;
    count=0;
    const list=Array.isArray(people)?people:people?.snapshot?.() || [];
    for(const p of list) {if (count>=LIMIT) break;if(!valid(p))continue;person(p);count++;}
    const bench=plan.exercise;
    if (valid(bench)) {
      const exercising=activity?.active===true&&activity?.kind==='bench';
      if(exercising) {
      person({x:bench.x,z:bench.z,y:plan.floorY+finite(bench.height)+.13,yaw:finite(bench.yaw),palette:0,hair:0,phase:0,lift:activity.lift,gesture:'bench'},true);
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
    root=null;plan=null;material=null;meshes=[];count=draws=0;
  }
  return {load,update,clear,get stats(){return Object.freeze({active:plan?.id || null,people:count,limit:LIMIT,drawCalls:draws,geometryCount:meshes.length,materialCount:material?1:0,disposed});},
    dispose(){if(disposed)return;clear();disposed=true;}};
}

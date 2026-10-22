// Original Snipeoff clothing/weapon over the project's original Stampead human anatomy.
import * as THREE from '../../vendor/three.module.js';
import { mergeGeometries, mergeVertices } from '../../vendor/addons/BufferGeometryUtils.js';
import { buildModel as humanBase } from '../stampead/build.mjs';
import { exportModel, measureModel } from '../model-build.mjs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const V=a=>new THREE.Vector3(...a), TAU=Math.PI*2, mix=(a,b,t)=>a+(b-a)*t;
function surface(n,m,fn,flip=false) {
  n=Math.max(3,Math.round(n*.62));m=Math.max(2,Math.round(m*.62));
  const p=[],uv=[],ix=[];
  for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){p.push(...fn(i/n,j/m));uv.push(i/n,j/m);}
  for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+1,c=a+n+1,d=c+1;ix.push(...(flip?[a,c,b,b,c,d]:[a,b,c,b,d,c]));}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function buildModel(){
  const root=new THREE.Group();root.name='Snipeoff';root.userData={front:'-Z',units:'metres',provenance:'Original procedural Snipeoff; reuses project-authored Stampead human anatomy',pose:'Rigid joint groups, not a skinned mesh'};
  const mat=(name,color,roughness,metalness=0)=>new THREE.MeshStandardMaterial({name,color,roughness,metalness,side:THREE.DoubleSide});
  const M={cream:mat('cream woven coat',0xbeb299,.96),cloth:mat('charcoal wool',0x30302d,.97),red:mat('oxblood coat lining',0x54262a,.94),ochre:mat('ochre hood canvas',0x87632e,.97),leather:mat('worn brown leather',0x443024,.82),black:mat('glove leather',0x252323,.77),brass:mat('aged ruler brass',0xa08145,.38,.78),steel:mat('blued rifle steel',0x353b3b,.31,.85),wood:mat('walnut rifle stock',0x69452f,.67),thread:mat('linen stitching',0xaa9773,.94),hair:mat('dark brown hair',0x29221d,.93)};
  const G={},B=new Map();
  for(const [name,p]of Object.entries({torso:[0,1.15,0],head:[0,1.69,0],'arm-left':[-.23,1.55,0],'arm-right':[.23,1.55,0],'leg-left':[-.13,.99,0],'leg-right':[.13,.99,0],cape:[0,1.17,.05]})){const g=new THREE.Group();g.name=name;g.position.copy(V(p));G[name]=g;B.set(g,new Map());root.add(g);}
  function add(group,key,geo,p=[0,0,0],s=[1,1,1],rot=[0,0,0]){
    geo.applyMatrix4(new THREE.Matrix4().compose(V(p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),V(s)));
    geo.translate(...G[group].position.clone().negate().toArray());geo.clearGroups();
    if(!geo.index)geo.setIndex(Array.from({length:geo.attributes.position.count},(_,i)=>i));
    const b=B.get(G[group]);if(!b.has(key))b.set(key,[]);b.get(key).push(geo);
  }
  function ball(g,k,p,s,n=24,m=16){add(g,k,new THREE.SphereGeometry(1,n,m),p,s);}
  function tube(g,k,pts,r,n=24,radial=8){add(g,k,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(V)),n,r,radial,false));}
  function rod(g,k,a,b,r,r2=r,n=24){const d=V(b).sub(V(a)),geo=new THREE.CylinderGeometry(r2,r,d.length(),n,1);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V([0,1,0]),d.clone().normalize()));add(g,k,geo,V(a).add(V(b)).multiplyScalar(.5).toArray());}
  function box(g,k,p,size,rot=[0,0,0]){add(g,k,new THREE.BoxGeometry(...size),p,[1,1,1],rot);}
  function buckle(g,x,y,z,w=.04,h=.05){for(const s of [-1,1]){rod(g,'brass',[x+s*w/2,y-h/2,z],[x+s*w/2,y+h/2,z],.003);rod(g,'brass',[x-w/2,y+s*h/2,z],[x+w/2,y+s*h/2,z],.003);}rod(g,'brass',[x,y-h/2,z-.002],[x,y+h*.3,z-.002],.002);}
  function loft(g,k,rows,n=64,m=44,fold=.0){const curve=new THREE.CatmullRomCurve3(rows.map(r=>V(r.slice(0,3))));const radii=new THREE.CatmullRomCurve3(rows.map(r=>V([r[3],r[4],0])));const frames=g.startsWith('arm')?curve.computeFrenetFrames(100,false):null;add(g,k,surface(n,m,(u,v)=>{const c=curve.getPoint(v),r=radii.getPoint(v),a=u*TAU,f=fold*Math.sin(v*65+3*Math.sin(a*3))*Math.sin(v*Math.PI);if(frames)return c.addScaledVector(frames.normals[Math.round(v*100)],(r.x+f)*Math.sin(a)).addScaledVector(frames.binormals[Math.round(v*100)],(r.y+f*.7)*Math.cos(a)).toArray();return [c.x+(r.x+f)*Math.sin(a),c.y,c.z-(r.y+f*.7)*Math.cos(a)];},true));}
  // Retain the authored human face, ears, neck, articulated glove fingers and lace boots.
  // Remove the officer cap, hammer, heavy torso armor and original cape entirely.
  const base=humanBase();base.updateMatrixWorld(true);
  for(const part of ['head','leg-left','leg-right','arm-left','arm-right']){
    const src=base.getObjectByName(part),side=part.endsWith('left')?-1:1;
    for(const mesh of src.children){
      if(!mesh.isMesh)continue;
      const key=mesh.name.substring(part.length+1),geo=mesh.geometry.clone();geo.applyMatrix4(mesh.matrixWorld);
      const p=geo.attributes.position,keep=[];
      for(let i=0;i<geo.index.count;i+=3){const ids=[0,1,2].map(j=>geo.index.getX(i+j));let yes=true;
        if(part==='head'&&['black','leather','brass','steel'].includes(key))yes=ids.every(j=>p.getY(j)<1.875);
        if(part.startsWith('arm'))yes=['black'].includes(key)&&ids.every(j=>p.getY(j)<.86&&p.getY(j)>.70);
        if(yes)keep.push(...ids);
      }
      if(!keep.length){geo.dispose();continue;}geo.setIndex(keep);
      for(let i=0;i<p.count;i++){
        let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
        if(part.startsWith('leg')){x=x*.87;z*=.88;}
        if(part.startsWith('arm')){x=(x-side*.409)*.9+(side<0?-.06:.34);y=(y-.80)*.95+(side<0?1.29:1.15);z=(z+.025)+(side<0?-.27:-.31);}
        p.setXYZ(i,x,y,z);
      }
      geo.computeVertexNormals();let target=key;
      if(part.startsWith('leg'))target=({cream:'steel',edge:'brass',stitch:'thread'})[key]??key;
      if(!M[target]){M[target]=mesh.material.clone();M[target].name=`human ${target}`;}
      add(part,target,geo);
    }
  }
  // Close-fitted waistcoat, tapering ribcage, overlapping cream lapels.
  loft('torso','cloth',[[0,.99,.015,.12,.085],[0,1.13,.01,.15,.10],[0,1.33,0,.19,.115],[0,1.48,0,.215,.11],[0,1.59,0,.12,.075]],72,50,.003);
  for(const side of [-1,1]){
    add('torso','cream',surface(28,44,(u,v)=>{const y=1.57-v*.43,x=side*(.065+v*.075+u*(.09-v*.025));return [x,y,-.092-.026*Math.sin(v*Math.PI)-.018*Math.sin(u*Math.PI)];}));
    tube('torso','thread',[[side*.068,1.57,-.097],[side*.08,1.43,-.134],[side*.12,1.25,-.133],[side*.14,1.14,-.108]],.0018,34);
    for(let j=0;j<5;j++)ball('torso','brass',[side*.065,1.19+j*.058,-.123],[.007,.007,.004],16,12);
  }
  loft('torso','leather',[[0,1.10,0,.164,.116],[0,1.155,0,.165,.118]],64,6);buckle('torso',0,1.128,-.126,.073,.048);
  // Swept split-tail coat. Both exposed outer cloth and red lining have real folds.
  const tail=(side,u,v,lining=0)=>{const a=side*mix(.48,Math.PI-.10,u),r=mix(.164,.37,v)+.035*Math.sin(v*Math.PI);const folds=(.012+.025*v)*Math.sin(u*TAU*5+v*1.7)+.005*Math.sin(u*TAU*11-v*3);return [(r+folds+lining)*Math.sin(a),1.17-.83*v+.065*Math.cos(u*Math.PI)*v+.023*Math.sin(u*15)*v*v,.02-(mix(.115,.24,v)+folds+lining)*Math.cos(a)+.065*v*v];};
  for(const side of [-1,1]){
    add('cape',side<0?'cream':'cloth',surface(112,72,(u,v)=>tail(side,u,v)));
    add('cape','red',surface(112,72,(u,v)=>tail(side,u,v,-.004),true));
    for(const u of [0,1])tube('cape','cream',Array.from({length:42},(_,i)=>tail(side,u,i/41)),.006,64,8);
    tube('cape','cream',Array.from({length:55},(_,i)=>tail(side,i/54,1)),.008,64,8);
    for(let j=0;j<7;j++){const p=tail(side,.01,j/7);ball('cape','brass',[p[0],p[1],p[2]-.006],[.005,.005,.003],12,8);}
  }
  // Ochre hood is down around the neck, not a helmet over the human face.
  const hood=(u,v)=>{const a=mix(.58,TAU-.58,u),r=.108+.04*Math.sin(v*Math.PI)+.018*Math.sin(u*33+v*4)*Math.sin(v*Math.PI);return [r*Math.sin(a),1.61+.20*v-.035*Math.cos(a),.025-r*Math.cos(a)+.025*v];};
  add('torso','ochre',surface(96,48,hood));
  tube('torso','ochre',Array.from({length:65},(_,i)=>hood(i/64,1)),.008,88,10);
  for(const side of [-1,1])tube('torso','ochre',[[side*.10,1.80,-.065],[side*.13,1.70,-.09],[side*.09,1.61,-.10]],.012,32,12);
  // Hair mass and separated swept locks replace the base officer cap.
  add('head','hair',surface(64,36,(u,v)=>{const a=u*TAU,t=v*Math.PI*.54;return [.086*Math.cos(t)*Math.sin(a),1.897+.071*Math.sin(t)+.004*Math.sin(a*7)*Math.cos(t),.006-.076*Math.cos(t)*Math.cos(a)];},true));
  for(let i=0;i<31;i++){const a=i/31*TAU,x=.076*Math.sin(a),z=.006-.069*Math.cos(a);tube('head','hair',[[x,1.903,z],[x*.92+.008,1.943,z*.8],[x*.63+.016,1.974,z*.45],[x*.24+.027,1.957,z*.12-.007]],.0035+(i%3)*.0007,18,6);}
  // Bent sleeves follow shoulder, elbow and wrist; silhouette is lean, not armor blocks.
  for(const side of [-1,1]){
    const arm=side<0?'arm-left':'arm-right';
    const rows=side<0?[[-.23,1.55,0,.075,.075],[-.31,1.43,-.015,.071,.068],[-.35,1.35,-.055,.065,.063],[-.22,1.32,-.18,.058,.059],[-.07,1.30,-.26,.042,.044]]:[[.23,1.55,0,.077,.076],[.30,1.43,.01,.07,.067],[.34,1.29,-.04,.061,.058],[.35,1.20,-.19,.05,.05],[.34,1.16,-.29,.04,.043]];
    loft(arm,side<0?'cloth':'cream',rows,64,56,.004);
    const start=V(rows[2].slice(0,3)),end=V(rows[4].slice(0,3));
    const curve=new THREE.LineCurve3(start,end),frames=curve.computeFrenetFrames(32,false);
    add(arm,'steel',surface(48,32,(u,v)=>{const a=mix(-1.5,1.5,u),c=curve.getPoint(v),r=mix(.069,.048,v);return c.addScaledVector(frames.normals[Math.round(v*32)],Math.sin(a)*r).addScaledVector(frames.binormals[Math.round(v*32)],Math.cos(a)*r).toArray();}));
    for(const t of [.08,.9]){const c=curve.getPoint(t);rod(arm,'brass',c.clone().addScaledVector(end.clone().sub(start).normalize(),-.006).toArray(),c.clone().addScaledVector(end.clone().sub(start).normalize(),.006).toArray(),mix(.073,.052,t),mix(.073,.052,t),40);}
  }
  // Baldric, back cross strap, pouch straps and a shaped leather satchel.
  for(const back of [false,true]){const points=[[-.17,1.56,back?.09:-.10],[-.09,1.42,back?.13:-.13],[.03,1.27,back?.12:-.14],[.15,1.13,back?.10:-.12]],c=new THREE.CatmullRomCurve3(points.map(V));add('torso','leather',surface(6,40,(u,v)=>{const p=c.getPoint(v);return [p.x+(u-.5)*.044,p.y+(u-.5)*.032,p.z];}));for(const s of [-1,1])tube('torso','thread',points.map(([x,y,z])=>[x+s*.018,y+s*.013,z+(back?.002:-.002)]),.0013,36);}
  buckle('torso',-.07,1.39,-.144);
  loft('torso','leather',[[-.245,.81,-.01,.06,.045],[-.245,.84,-.015,.095,.06],[-.245,.98,-.01,.10,.06],[-.245,1.07,-.005,.08,.055]],48,36,.001);
  for(const x of [-.29,-.21]){box('torso','leather',[x,.97,-.075],[.022,.19,.012]);buckle('torso',x,.98,-.085,.026,.035);tube('torso','thread',[[x-.01,.86,-.083],[x-.01,1.055,-.07]],.0013,16);}
  for(let i=0;i<4;i++){const x=.08+i*.043;loft('torso','leather',[[x,.96,-.106,.019,.022],[x,1.06,-.11,.024,.026],[x,1.10,-.105,.018,.02]],24,14);ball('torso','brass',[x,1.065,-.14],[.004,.004,.003],12,8);}
  for(let i=0;i<6;i++)rod('torso','brass',[.12+i*.018,.91,-.15],[.12+i*.018,1.00,-.15],.006,.004,16);
  for(let i=0;i<3;i++){rod('torso','cream',[-.27+i*.026,1.03,.01],[-.29+i*.025,1.22,.01],.012,.012,20);rod('torso','brass',[-.27+i*.026,1.03,.01],[-.27+i*.026,1.05,.01],.014,.014,20);}
  // Long original brass-ruler / walnut-pencil rifle, carried diagonally across torso.
  const A=V([-.30,1.44,-.28]),D=V([1,-.60,-.08]).normalize(),N=V([-.0,.0,-1]),UP=new THREE.Vector3().crossVectors(N,D).normalize();
  const wp=(t,h=0,z=0)=>A.clone().addScaledVector(D,t).addScaledVector(UP,h).addScaledVector(N,z).toArray();
  const stock=new THREE.CatmullRomCurve3([wp(-.08),wp(.04),wp(.18),wp(.36)] .map(V));
  const frames=stock.computeFrenetFrames(48,false);
  add('torso','wood',surface(48,48,(u,v)=>{const a=u*TAU,c=stock.getPoint(v),r=.046-.02*v+.012*Math.sin(v*Math.PI);return c.addScaledVector(frames.normals[Math.round(v*48)],Math.sin(a)*r).addScaledVector(frames.binormals[Math.round(v*48)],Math.cos(a)*r*.55).toArray();}));
  rod('torso','steel',wp(.20,.025),wp(1.48,.025),.014,.009,48);
  rod('torso','wood',wp(.35,-.005),wp(.98,-.005),.025,.016,6);
  // Ruler strip has real brass ticks, no text/image decal.
  tube('torso','brass',[wp(.34,0,.027),wp(.98,0,.022)],.009,8,4);
  for(let i=0;i<46;i++){const t=.36+i*.013;rod('torso','steel',wp(t,-.005,.034),wp(t,i%5===0?.022:.010,.034),.001,.001,6);}
  for(const t of [.21,.34,.64,.93,1.18,1.43]){rod('torso','brass',wp(t-.009,.025),wp(t+.009,.025),t<1?.027:.018,t<1?.027:.018,32);for(let j=0;j<6;j++){const a=j*TAU/6;ball('torso','brass',wp(t,Math.sin(a)*.028+.025,Math.cos(a)*.028),[.004,.004,.004],12,8);}}
  // Scope, two mounting saddles, adjustment turrets and trigger guard.
  rod('torso','steel',wp(.20,.09),wp(.64,.09),.023,.023,40);
  for(const t of [.20,.27,.53,.64])rod('torso','brass',wp(t-.009,.09),wp(t+.009,.09),.029,.029,40);
  for(const t of [.30,.53])rod('torso','brass',wp(t,.025),wp(t,.09),.009,.009,16);
  rod('torso','steel',wp(.43,.09),wp(.43,.13),.019,.019,32);
  rod('torso','brass',wp(.43,.125),wp(.43,.139),.023,.023,32);
  tube('torso','brass',[wp(.24,-.025),wp(.25,-.077),wp(.34,-.078),wp(.38,-.025)],.004,32,10);
  tube('torso','steel',[wp(.29,-.025),wp(.30,-.054),wp(.32,-.061)],.003,16,8);
  tube('torso','brass',[wp(.40,.035,.02),wp(.43,.055,.055),wp(.47,.03,.07)],.005,20,10);ball('torso','wood',wp(.47,.03,.07),[.012,.012,.012],20,12);
  // Pencil-like muzzle ferrule and recessed dark bore.
  rod('torso','brass',wp(1.44,.025),wp(1.50,.025),.02,.016,32);rod('torso','black',wp(1.501,.025),wp(1.503,.025),.009,.009,24);
  for(const [group,bucket]of B)for(const [key,geos]of bucket){const geo=mergeGeometries(geos,false);assert(geo);const compact=mergeVertices(geo,1e-6);geo.dispose();const mesh=new THREE.Mesh(compact,M[key]);mesh.name=`${group.name}-${key}`;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);for(const g of geos)g.dispose();}
  return root;
}
function check(){
  const bytes=readFileSync(new URL('./model.glb',import.meta.url)),r=JSON.parse(readFileSync(new URL('./receipt.json',import.meta.url),'utf8'));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const j=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12))),ps=j.meshes.flatMap(m=>m.primitives),tris=ps.reduce((n,p)=>n+j.accessors[p.indices].count/3,0);
  assert.equal(tris,r.triangles);assert(tris>=120000&&tris<=250000);assert(ps.length<=64);assert(bytes.length<6000000);assert.equal(bytes.length,r.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);assert(!j.images&&!j.textures);assert.equal(j.materials.length,r.materials.length);
  const fresh=measureModel(buildModel());assert.equal(fresh.triangles,tris);assert.deepEqual(fresh.bounds,r.bounds);
  const bounds=new THREE.Box3(),bin=28+bytes.readUInt32LE(12);
  function visit(i,parent){const n=j.nodes[i],m=new THREE.Matrix4();if(n.matrix)m.fromArray(n.matrix);else m.compose(V(n.translation??[0,0,0]),new THREE.Quaternion(...(n.rotation??[0,0,0,1])),V(n.scale??[1,1,1]));m.premultiply(parent);if(n.mesh!==undefined)for(const p of j.meshes[n.mesh].primitives){assert(p.attributes.NORMAL!==undefined&&p.attributes.TEXCOORD_0!==undefined);const a=j.accessors[p.attributes.POSITION],v=j.bufferViews[a.bufferView],o=bin+(v.byteOffset??0)+(a.byteOffset??0);for(let k=0;k<a.count;k++){const xyz=[0,1,2].map(c=>bytes.readFloatLE(o+k*(v.byteStride??12)+c*4));assert(xyz.every(Number.isFinite));bounds.expandByPoint(V(xyz).applyMatrix4(m));}}for(const c of n.children??[])visit(c,m);}
  for(const n of j.scenes[j.scene??0].nodes)visit(n,new THREE.Matrix4());
  for(const side of ['min','max'])for(let i=0;i<3;i++)assert(Math.abs(bounds[side].getComponent(i)-r.bounds[side][i])<1e-6);
  assert(Math.abs(bounds.min.y)<.001);assert(bounds.max.y>=1.8&&bounds.max.y<=2.1);
  const total=['build.mjs','model.glb','receipt.json','README.md'].reduce((n,f)=>n+statSync(new URL(f,import.meta.url)).size,0);assert(total<6000000);
  console.log(JSON.stringify({check:'actual GLB topology/materials/hash/bounds, deterministic source metrics, folder cap',triangles:tris,drawables:ps.length,materials:j.materials.length,bytes:bytes.length,total,bounds:r.bounds,sha256:r.sha256}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.includes('--check'))check();
  else if(process.argv.includes('--measure'))console.log(JSON.stringify(measureModel(buildModel())));
  else await exportModel(buildModel(),new URL('./model.glb',import.meta.url),{label:'Snipeoff: original procedural audit marksman, authored human-base reuse'});
}

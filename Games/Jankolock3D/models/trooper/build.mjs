// Original candle-headed supply infantry. Offline build only; no runtime imports.
import * as THREE from '../../vendor/three.module.js';
import { mergeGeometries } from '../../vendor/addons/BufferGeometryUtils.js';
import { GLTFLoader } from '../../vendor/addons/GLTFLoader.js';
import { exportModel, measureModel } from '../model-build.mjs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const TAU=Math.PI*2;
const V=a=>new THREE.Vector3(...a);
const bell=(x,c,w)=>Math.exp(-(((x-c)/w)**2));
function surface(n,m,fn) {
  const p=[],uv=[],ix=[];
  for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){p.push(...fn(i/n,j/m));uv.push(i/n,j/m);}
  for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+1,c=a+n+1;ix.push(a,c,b,b,c,c+1);}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
// Rows are y, half-width, half-depth, center-x, center-z. Catmull profiles
// define muscle/joint volumes; longitudinal wrinkles follow the cloth, not noise.
function rowAt(rows,t){
  const q=t*(rows.length-1),i=Math.min(rows.length-2,Math.floor(q)),f=q-i;
  return rows[0].map((_,k)=>{const a=rows[Math.max(0,i-1)][k],b=rows[i][k],c=rows[i+1][k],d=rows[Math.min(rows.length-1,i+2)][k];return .5*(2*b+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f);});
}
function loft(rows,n,m,{fold=0,shape=1,deform}={}){
  // Face carving keeps its samples; broad cloth/armor profiles need fewer.
  if(!deform){n=Math.max(8,Math.round(n*.8));m=Math.max(3,Math.round(m*.85));}
  const g=surface(n,m,(u,v)=>{
    const [y,rx,rz,x,z]=rowAt(rows,v),a=u*TAU;
    const w=fold*Math.sin(v*39+Math.sin(a*3)*2)*Math.sin(Math.PI*v)**2;
    const p=[x+Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**shape*(rx+w),y,z-Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**shape*(rz+w*.7)];
    return deform?deform(p,a,v):p;
  });
  // Flat caps get independent normals/UVs rather than collapsed pole triangles.
  const cap=(r,top)=>{
    const [y,rx,rz,x,z]=r,p=[x,y,z],uv=[.5,.5],ix=[];
    for(let i=0;i<n;i++){const a=i/n*TAU;p.push(x+Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**shape*rx,y,z-Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**shape*rz);uv.push(.5+.5*Math.sin(a),.5-.5*Math.cos(a));}
    for(let i=0;i<n;i++){const a=i+1,b=(i+1)%n+1;ix.push(...(top?[0,b,a]:[0,a,b]));}
    const c=new THREE.BufferGeometry();c.setAttribute('position',new THREE.Float32BufferAttribute(p,3));c.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));c.setIndex(ix);c.computeVertexNormals();return c;
  };
  return mergeGeometries(deform?[g,cap(rows[0],false)]:[g,cap(rows[0],false),cap(rows.at(-1),true)]);
}
function rounded(w,h,d,r=.01){
  r=Math.min(r,w/4,h/4,d/4);const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  return new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r*.5,bevelSegments:1,curveSegments:2,steps:1}).translate(0,0,-d/2+r);
}
function tube(points,r,segments=16,radial=6){return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(V)),segments,r,radial,false);}
// A curved plate has thickness and bevelled boundary, not a floating plane.
function plate(w,h,d,n=28,m=12){
  return loft([[-h/2,w*.33,d*.3,0,0],[-h*.4,w*.48,d*.7,0,0],[0,w*.5,d,0,0],[h*.36,w*.44,d*.8,0,0],[h/2,w*.3,d*.25,0,0]],n,m,{shape:.72});
}

export function buildModel(){
  const root=new THREE.Group();root.name='Candle supply trooper';
  root.userData={front:'-Z',units:'metres',original:true,rig:'Rigid shoulder/hip pivots; no skin',candleBase:1.45};
  const materials={
    cloth:new THREE.MeshStandardMaterial({name:'matte canvas leather rubber',vertexColors:true,roughness:.91,metalness:0}),
    armor:new THREE.MeshStandardMaterial({name:'aged enamel brass steel',vertexColors:true,roughness:.52,metalness:.48}),
    wax:new THREE.MeshStandardMaterial({name:'carved ivory wax',vertexColors:true,roughness:.73,metalness:0}),
    flame:new THREE.MeshStandardMaterial({name:'restrained solid amber flame',vertexColors:true,roughness:.65,metalness:0,emissive:0xb45c12,emissiveIntensity:.22})
  };
  const C={cloth:0x555346,leather:0x48352a,rubber:0x282b28,cream:0xbab198,steel:0x414847,brass:0x977644,red:0x713d30,wax:0xd8bd83,dark:0x4b3c2a};
  const groups={},batches=new Map();
  for(const [name,p] of Object.entries({body:[0,0,0],'leg-left':[-.125,.91,0],'leg-right':[.125,.91,0],'arm-left':[-.255,1.35,0],'arm-right':[.255,1.35,0],candle:[0,1.45,0]})){
    const g=new THREE.Group();g.name=name;g.position.copy(V(p));root.add(g);groups[name]=g;batches.set(g,new Map());
  }
  const flame=new THREE.Group();flame.name='flame';groups.candle.add(flame);groups.flame=flame;batches.set(flame,new Map());
  function add(group,mat,g,color,p=[0,0,0],rot=[0,0,0]){
    const target=groups[group];g.applyMatrix4(new THREE.Matrix4().compose(V(p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),new THREE.Vector3(1,1,1)));
    // Author in world metres; candle/flame both use candle-base local coordinates.
    g.translate(...(group==='flame'?groups.candle.position:target.position).clone().negate().toArray());
    if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));g.clearGroups();
    const c=new THREE.Color(color),colors=new Float32Array(g.attributes.position.count*3);
    for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));const bucket=batches.get(target);if(!bucket.has(mat))bucket.set(mat,[]);bucket.get(mat).push(g);
  }
  const box=(group,mat,color,p,size,rot=[0,0,0])=>add(group,mat,rounded(...size),color,p,rot);
  const seam=(group,mat,color,points,r=.003,segments=16)=>add(group,mat,tube(points,r,segments),color);
  // Tapered pelvis/rib cage, shoulder slope and fitted cloth waist.
  add('body','cloth',loft([[.80,.15,.10,0,.005],[.91,.18,.115,0,0],[1.02,.157,.105,0,0],[1.17,.20,.12,0,0],[1.31,.23,.12,0,.015],[1.40,.17,.085,0,.015],[1.44,.075,.065,0,0]],48,26,{fold:.006}),C.cloth);
  for(const s of [-1,1]){
    add('body','armor',plate(.205,.255,.035,32,14),C.cream,[s*.108,1.255,-.117],[0,s*-.22,s*.06]);
    seam('body','armor',C.brass,[[s*.024,1.36,-.145],[s*.11,1.38,-.15],[s*.20,1.32,-.12]],.005,12);
    add('body','cloth',loft([[.77,.085,.025,s*.105,0],[.81,.105,.028,s*.11,-.02],[.9,.10,.032,s*.095,-.06],[1,.075,.025,s*.09,-.08]],24,12,{fold:.005,shape:.55}),C.cloth);
    box('body','cloth',C.leather,[s*.16,.965,-.115],[.10,.125,.055],[0,s*-.25,0]);
    box('body','armor',C.brass,[s*.16,1.00,-.147],[.032,.026,.009]);
    // Backpack shoulder straps and front harness are physically rounded strips.
    seam('body','cloth',C.leather,[[s*.14,1.01,-.12],[s*.18,1.20,-.15],[s*.16,1.405,-.04],[s*.14,1.37,.15],[s*.14,1.10,.18]],.016,22);
  }
  add('body','cloth',loft([[.975,.17,.117,0,0],[1,.173,.12,0,0],[1.027,.17,.117,0,0]],40,3,{shape:.8}),C.leather);
  box('body','armor',C.brass,[0,1.001,-.133],[.072,.047,.018]);box('body','cloth',C.rubber,[0,1.001,-.144],[.047,.025,.005]);
  // Rucksack shaped canvas, rolled flap and two buckled webbing straps.
  add('body','cloth',loft([[1.02,.11,.055,0,.16],[1.08,.16,.075,0,.17],[1.25,.16,.082,0,.18],[1.35,.12,.06,0,.17]],32,16,{fold:.004,shape:.48}),C.cloth);
  box('body','cloth',C.leather,[0,1.30,.245],[.28,.11,.035]);
  for(const s of [-1,1]){
    box('body','cloth',C.leather,[s*.085,1.17,.266],[.028,.25,.015]);box('body','armor',C.brass,[s*.085,1.18,.28],[.043,.035,.012]);
    seam('body','cloth',C.leather,[[s*.15,1.08,.23],[s*.17,1.18,.25],[s*.15,1.27,.24]],.004,12);
  }
  // Neck/collar remains outside the HP-scaled candle assembly.
  add('body','cloth',loft([[1.38,.082,.067,0,0],[1.44,.086,.073,0,0],[1.462,.079,.067,0,0]],32,4),C.leather);
  for(const s of [-1,1]){
    const leg=s<0?'leg-left':'leg-right',arm=s<0?'arm-left':'arm-right',x=s*.125;
    add(leg,'cloth',loft([[.48,.070,.069,x,-.015],[.57,.084,.083,x,.006],[.72,.102,.096,x,.018],[.87,.105,.10,x,0],[.94,.087,.078,x,0]],32,19,{fold:.006}),C.cloth);
    add(leg,'cloth',loft([[.17,.052,.054,x,.01],[.28,.063,.07,x,.03],[.38,.074,.083,x,.025],[.49,.065,.063,x,-.005],[.54,.063,.06,x,-.01]],28,15,{fold:.004}),C.leather);
    add(leg,'armor',plate(.133,.15,.029,28,12),C.cream,[x,.51,-.084]);
    add(leg,'armor',plate(.092,.22,.021,24,10),C.steel,[x,.325,-.051]);
    // Anatomical heel/instep/toe and separate tread contacts at y=0.
    add(leg,'cloth',loft([[.024,.068,.131,x,-.055],[.06,.074,.144,x,-.062],[.11,.07,.123,x,-.05],[.16,.058,.076,x,-.005],[.22,.052,.055,x,.01]],32,12,{shape:.62}),C.leather);
    for(let j=0;j<6;j++)for(const side of [-1,1])box(leg,'cloth',C.rubber,[x+side*.044,.0185,-.176+j*.044],[.052,.03,.028]);
    for(let j=0;j<4;j++)seam(leg,'cloth',C.rubber,[[x-.045,.12+j*.014,-.086+j*.016],[x,.13+j*.014,-.10+j*.016],[x+.045,.12+j*.014,-.086+j*.016]],.003,8);
    // Upper arm tapers at elbow; forearm turns gently forward toward the hand.
    add(arm,'cloth',loft([[1.025,.057,.058,s*.29,-.018],[1.10,.065,.068,s*.30,0],[1.23,.082,.081,s*.29,.005],[1.35,.087,.08,s*.25,0]],28,16,{fold:.005}),C.cloth);
    add(arm,'cloth',loft([[.825,.043,.043,s*.31,-.085],[.91,.061,.059,s*.31,-.062],[1,.063,.065,s*.30,-.027],[1.06,.053,.052,s*.29,-.013]],28,13,{fold:.003}),C.cloth);
    add(arm,'armor',plate(.17,.17,.058,32,12),C.cream,[s*.26,1.335,-.012],[0,0,s*-.35]);
    add(arm,'armor',plate(.10,.17,.027,24,10),C.cream,[s*.315,.953,-.10],[.20,0,0]);
    add(arm,'armor',plate(.092,.073,.022,20,6),C.steel,[s*.3,1.055,.055]);
    add(arm,'cloth',loft([[.755,.044,.027,s*.31,-.10],[.78,.048,.034,s*.31,-.1],[.83,.043,.039,s*.31,-.085],[.857,.038,.035,s*.31,-.08]],24,9,{shape:.7}),C.leather);
    // Four individually bent fingers, knuckles and opposing thumb, not mittens.
    for(let f=0;f<4;f++){
      const fx=s*.31+(f-1.5)*.021,base=.77-Math.abs(f-1.5)*.006;
      seam(arm,'cloth',C.leather,[[fx,base,-.12],[fx,base-.032,-.134],[fx,base-.05,-.118],[fx,base-.045,-.102]],.010,9);
      box(arm,'armor',C.steel,[fx,base+.009,-.132],[.016,.021,.009]);
    }
    seam(arm,'cloth',C.leather,[[s*.266,.811,-.10],[s*.251,.78,-.131],[s*.267,.755,-.141]],.013,10);
  }
  // Compact ribbed stapler carbine carried muzzle-down with the right hand.
  box('arm-right','armor',C.steel,[.33,.80,-.17],[.074,.12,.19],[.22,0,0]);
  box('arm-right','armor',C.cream,[.33,.845,-.20],[.08,.047,.24],[.22,0,0]);
  box('arm-right','cloth',C.leather,[.33,.755,-.104],[.052,.08,.054],[.22,0,0]);
  box('arm-right','armor',C.brass,[.33,.793,-.30],[.065,.035,.03]);
  for(let i=0;i<9;i++)box('arm-right','armor',i%2?C.steel:C.brass,[.33,.816+i*.003,-.255+i*.014],[.084,.01,.006]);
  seam('arm-right','armor',C.steel,[[.30,.77,-.14],[.30,.73,-.18],[.30,.755,-.22]],.006,10);

  // Candle shell: tall recognisable wax cylinder, not a human head wearing a cap.
  // Facial planes are carved into the same continuous shell; melt lips vary in y.
  add('candle','wax',loft([[1.45,.080,.072,0,0],[1.49,.087,.077,0,0],[1.57,.092,.079,0,0],[1.67,.087,.077,0,0],[1.75,.088,.079,0,0],[1.775,.079,.071,0,0]],64,32,{deform:(p,a,v)=>{
    const front=Math.max(0,Math.cos(a))**5,x=p[0],y=p[1];
    p[2]+=front*(.018*(bell(x,-.035,.020)+bell(x,.035,.020))*bell(y,1.659,.018)-.025*bell(x,0,.014)*bell(y,1.635,.033)-.010*(bell(x,-.046,.023)+bell(x,.046,.023))*bell(y,1.619,.022)+.010*bell(x,0,.043)*bell(y,1.584,.006)-.009*bell(x,0,.04)*bell(y,1.56,.012));
    p[0]+=.002*Math.sin(a*7+v*9)*Math.sin(Math.PI*v);p[1]+=.010*Math.sin(a*3+.4)*v**12;return p;
  }}),C.wax);
  // Melt pool annulus, shallow central well and lopsided scalloped rim.
  add('candle','wax',surface(64,5,(u,v)=>{const a=u*TAU;return [Math.sin(a)*(.079-v*.070),1.764+(1-v)*(.011+.010*Math.sin(a*3+.4)),-Math.cos(a)*(.071-v*.062)];}),0xc5a971);
  add('candle','wax',new THREE.CircleGeometry(.009,16).rotateX(-Math.PI/2),0xc5a971,[0,1.764,0]);
  for(let i=0;i<8;i++){
    const a=i/8*TAU+.16,len=.045+(i%3)*.025,r=.087;
    seam('candle','wax',C.wax,[[Math.sin(a)*r,1.77,-Math.cos(a)*r],[Math.sin(a+.04)*(r+.003),1.75-len*.4,-Math.cos(a+.04)*(r+.003)],[Math.sin(a+.06)*r,1.75-len,-Math.cos(a+.06)*r]],.006+(i%2)*.002,12);
  }
  for(const s of [-1,1]){
    seam('candle','wax',0xb89a68,[[s*.015,1.674,-.076],[s*.033,1.679,-.075],[s*.053,1.671,-.066]],.005,10);
    seam('candle','wax',C.dark,[[s*.021,1.655,-.066],[s*.034,1.652,-.064],[s*.047,1.655,-.060]],.0025,8);
  }
  seam('candle','wax',C.dark,[[-.026,1.585,-.076],[0,1.581,-.081],[.027,1.585,-.076]],.002,12);
  seam('candle','wax',0x342e22,[[0,1.766,0],[.001,1.794,0],[.008,1.809,0]],.0045,10);
  // Solid tear profile, small and opaque: no particles, billboard or bloom.
  add('flame','flame',loft([[1.795,.009,.008,0,0],[1.812,.021,.014,0,0],[1.838,.017,.012,.003,0],[1.868,.009,.007,.012,0],[1.896,.001,.001,.023,0]],24,12),0xd5a24a);
  for(const [group,bucket] of batches)for(const [mat,geometries] of bucket){const mesh=new THREE.Mesh(mergeGeometries(geometries),materials[mat]);mesh.name=`${group.name}-${mat}`;group.add(mesh);}
  return root;
}

async function checkGLB(){
  const bytes=readFileSync(new URL('./model.glb',import.meta.url));
  const receipt=JSON.parse(readFileSync(new URL('./receipt.json',import.meta.url),'utf8'));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert(!json.images?.length&&!json.textures?.length,'No embedded or external images');assert(json.buffers.every(b=>!b.uri),'Embedded geometry only');
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const metrics=measureModel(gltf.scene),source=measureModel(buildModel());
  assert(metrics.triangles>=15000&&metrics.triangles<=40000);assert(metrics.meshes<=12);assert(bytes.length<2000000);
  assert.equal(metrics.triangles,source.triangles);assert.equal(metrics.triangles,receipt.triangles);assert.equal(bytes.length,receipt.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),receipt.sha256);
  assert(Math.abs(metrics.bounds.min[1])<.001);assert(metrics.bounds.max[1]>=1.8&&metrics.bounds.max[1]<=2.0);
  for(const name of ['arm-left','arm-right','leg-left','leg-right','candle'])assert(gltf.scene.getObjectByName(name),name);
  const candle=gltf.scene.getObjectByName('candle');assert.equal(candle.position.y,1.45);
  candle.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.computeBoundingBox();assert(mesh.geometry.boundingBox.min.y>=-1e-6,'Wax/flame must grow up from base');}});
  for(let i=0;i<3;i++)for(const end of ['min','max'])assert(Math.abs(metrics.bounds[end][i]-source.bounds[end][i])<1e-5);
  gltf.scene.traverse(mesh=>{if(mesh.isMesh){
    assert(mesh.material.isMeshStandardMaterial);const g=mesh.geometry;
    for(const name of ['position','normal','uv','color'])assert(Array.from(g.attributes[name].array).every(Number.isFinite),name);
    const p=g.attributes.position,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    for(let i=0;i<g.index.count;i+=3){a.fromBufferAttribute(p,g.index.getX(i));b.fromBufferAttribute(p,g.index.getX(i+1));c.fromBufferAttribute(p,g.index.getX(i+2));assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-18,'No degenerate/padding triangles');}
  }});
  const before=new THREE.Box3().setFromObject(candle);candle.scale.y=.35;gltf.scene.updateMatrixWorld(true);
  const after=new THREE.Box3().setFromObject(candle);
  assert(Math.abs(before.min.y-1.45)<1e-6&&Math.abs(after.min.y-1.45)<1e-6,'Bottom anchored HP scale');
  assert(Math.abs((after.max.y-1.45)/(before.max.y-1.45)-.35)<1e-6);
  console.log(JSON.stringify({check:'PASS actual GLB / source / receipt / pivots / UV / bounds / hash',triangles:metrics.triangles,bytes:bytes.length,drawables:metrics.meshes,materials:metrics.materials.length,bounds:metrics.bounds,sha256:receipt.sha256}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(!process.argv.includes('--check'))await exportModel(buildModel(),new URL('./model.glb',import.meta.url),{minimum:15000,maximum:40000,maxBytes:2000000,label:'Original candle supply trooper'});
  await checkGLB();
}

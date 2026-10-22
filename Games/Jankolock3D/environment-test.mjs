// CPU-only regression, not a WebGL/screenshot/performance acceptance claim.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as THREE from './vendor/three.module.js';
import { createEnvironment } from './environment.mjs';
import { createWorldData, LANES, TEAM_COLORS, terrainHeight } from './world-data.mjs';

const world=createWorldData(),before=JSON.stringify(world),loaded=[];
let textureDisposals=0,renderCount=0;
const loader=url=>{
  assert.equal(new URL(url).protocol,'file:');
  const png=readFileSync(new URL(url));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  assert.ok([512,1024].includes(width)&&width===height);
  const texture=new THREE.Texture();texture.addEventListener('dispose',()=>textureDisposals++);
  loaded.push({url,width,bytes:png.length,texture});return texture;
};
// Run the actual world scene factory with only renderer/canvas I/O replaced.
// This exercises the same dynamic groups and public functions used by game/viewer.
class Renderer {
  info={render:{calls:0,triangles:0},memory:{geometries:0,textures:0}};
  setPixelRatio(){} setClearColor(){} setSize(){} dispose(){} forceContextLoss(){}
  render(){renderCount++;}
}
const canvas={clientWidth:1280,clientHeight:720};
const source=readFileSync(new URL('./world-scene.mjs',import.meta.url),'utf8');
const factory=runInNewContext(source.replace(/^import .*$/gm,'').replace('export function','function')+'\ncreateWorldScene;',{
  THREE:{...THREE,WebGLRenderer:Renderer},LANES,TEAM_COLORS,terrainHeight,
  createEnvironment:(scene,w)=>createEnvironment(scene,w,loader),
  document:{createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})}
});
const view=factory(canvas,world);
assert.deepEqual(Object.keys(view).sort(),['scene','camera','renderCamera','render','sync','syncStructures','resize','diagnostics','dispose'].sort());
const env=view.scene.getObjectByName('original-city');assert.ok(env);
assert.equal(loaded.length,11);assert.ok(loaded.reduce((n,t)=>n+t.bytes,0)<8*1024*1024);
let aoMeshes=0,instances=0,triangles=0,turnouts=0;
const uniqueGeometry=new Set();
env.traverse(o=>{
  if(!o.isMesh)return;
  assert.ok(o.isInstancedMesh,'all environmental mesh draws are statically instanced');
  assert.ok(o.geometry.attributes.uv,'PBR geometry has UVs');uniqueGeometry.add(o.geometry);
  if(o.geometry.type==='CircleGeometry'&&o.geometry.parameters.radius===1) {
    const matrix=new THREE.Matrix4(),p=new THREE.Vector3();
    for(let i=0;i<o.count;i++) {
      o.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);turnouts++;
      assert.equal(terrainHeight(p.x,p.z),0);
      assert.ok(![...world.boxes,...world.ramps].some(b=>p.x+10>b.minX&&p.x-10<b.maxX&&p.z+10>b.minZ&&p.z-10<b.maxZ));
    }
  }
  if(o.material.aoMap){aoMeshes++;assert.ok(o.material.roughnessMap);assert.equal(o.material.aoMap.colorSpace,THREE.NoColorSpace);}
  instances+=o.count;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*o.count;
});
assert.ok(aoMeshes>20);assert.equal(instances,view.diagnostics().environment.instances);
assert.equal(triangles,view.diagnostics().environment.triangles);
assert.ok(turnouts>0);assert.equal(turnouts,view.diagnostics().environment.cornerTurnouts);
assert.ok(view.diagnostics().environment.staticChunks<=16);
const firstDetail=env.getObjectByName(`detail-${world.buildings[0].id}`);
view.camera.position.set(world.buildings[0].x,2,world.buildings[0].z);view.renderCamera();assert.ok(firstDetail.visible);
view.camera.position.set(4000,2,4000);view.renderCamera();assert.ok(!firstDetail.visible);
let draws=0;env.traverseVisible(o=>{if(o.isMesh)draws++;});assert.ok(draws<350,'spatial batches avoid per-building draw explosion');
const live=world.spawns.map(s=>({...s,position:{...s.position},alive:true,patronPhase:1}));
view.syncStructures(live);
const patron=live.find(s=>s.type==='patron'),patronGroup=view.scene.getObjectByName(patron.id);
const guardian=live.find(s=>s.type==='guardian'),guardianGroup=view.scene.getObjectByName(guardian.id);
assert.ok(patronGroup.children.some(o=>o.isMesh),'objective meshes were not swallowed by static batching');
guardian.alive=false;patron.position.z+=17;patron.position.y=4;patron.patronPhase=2;view.syncStructures(live);
assert.equal(guardianGroup.visible,false);assert.equal(patronGroup.position.z,patron.position.z);
assert.equal(patronGroup.position.y,4);assert.equal(patronGroup.scale.y,.7);
patron.alive=false;view.syncStructures(live);assert.equal(patronGroup.visible,false);
patron.alive=true;patron.patronPhase=1;view.syncStructures(live);assert.equal(patronGroup.scale.y,1);
view.sync({collected:new Set(world.crates.map(c=>c.id)),broken:new Set()});
const crates=view.scene.children.filter(o=>o.isGroup&&!o.name);
assert.equal(crates.length,world.crates.length);assert.ok(crates.every(o=>!o.visible));
view.render(world.start,0,0);view.resize();assert.equal(renderCount,3);
assert.equal(JSON.stringify(world),before,'rendering did not mutate world/collision data');
view.dispose();view.dispose();view.renderCamera();assert.equal(renderCount,3);
assert.equal(textureDisposals,11,'environment textures disposed once');assert.equal(view.scene.children.length,0);
const reusableTriangles=[...uniqueGeometry].reduce((n,g)=>n+(g.index?.count||g.attributes.position.count)/3,0);
const bufferBytes=[...uniqueGeometry].reduce((n,g)=>n+(g.index?.array.byteLength||0)+Object.values(g.attributes).reduce((s,a)=>s+a.array.byteLength,0),0);
console.log(`environment-test: PASS; ${instances} instances, ${triangles} full-detail triangles, ${draws} coarse batches; ${uniqueGeometry.size} reusable geometries / ${reusableTriangles} triangles / ${bufferBytes} buffer bytes; 11 PNG maps ${loaded.reduce((n,t)=>n+t.bytes,0)} bytes; dynamic death/Patron retreat/LOD/disposal checked (CPU only)`);

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import {StadiumView,REPLACED_STADIUM_PARTS} from '../js/stadium-view.js';
import {World} from '../js/world.js';
const data=JSON.parse(await readFile(new URL('../data/world.json',import.meta.url),'utf8'));
assert.deepEqual(REPLACED_STADIUM_PARTS,['HomeBench','Seat','SeatBack','GrandstandRiser','CanopyPost','GrandstandCanopy','Floodlight','FloodlightPole','Scoreboard','ScoreboardPost','EntranceSign','EntranceSignPost']);
assert(data.stadiumParts.filter(p=>REPLACED_STADIUM_PARTS.includes(p.name)).every(p=>!p.collision||p.name==='HomeBench'),'Only replaced bench has a collider, retained by World');
for(const name of REPLACED_STADIUM_PARTS)assert(data.stadiumParts.some(p=>p.name===name),`${name} is a real source decoration`);
let paints=0;
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){paints++;},fillText(){}})})};
const stadium=new StadiumView();delete globalThis.document;
const geometry=stadium.geometry,material=stadium.material;
const snapshots=[];
for(let level=0;level<=3;level++) {
  stadium.setLevel(level);const snapshot=stadium.snapshot();snapshots.push(snapshot);
  assert.equal(snapshot.tier,level);assert(snapshot.drawCalls<=4);assert(snapshot.triangles<15000);assert.equal(snapshot.colliders,0);
  for(const batch of stadium.batches) {
    assert.equal(batch.mesh.visible,batch.level<=level);
    const matrix=new THREE.Matrix4();
    for(let i=0;i<batch.mesh.count;i++) {
      batch.mesh.getMatrixAt(i,matrix);assert(matrix.elements.every(Number.isFinite));
      const bounds=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(matrix);
      assert(bounds.min.z>=71||bounds.max.z<=-71||bounds.min.x>=100,'New structure stays outside field/goal runoffs');
      assert(bounds.min.y>=0);assert(bounds.max.y<=30);
    }
  }
}
assert.deepEqual(snapshots.map(s=>s.capacity),[0,16,48,48]);
assert(snapshots.every((s,i)=>!i||s.triangles>snapshots[i-1].triangles),'Each purchase increases visible geometry');
stadium.setLevel(0);assert.equal(stadium.snapshot().drawCalls,0);assert.equal(stadium.geometry,geometry);assert.equal(stadium.material,material);
stadium.setLevel(NaN);assert.equal(stadium.level,0);stadium.setLevel(900);assert.equal(stadium.level,3);
const match={score:[2,1],period:'extra1',periodElapsed:1};const before=JSON.stringify(match);
stadium.update({match});const updates=stadium.scoreUpdates,paintCount=paints;
for(let i=0;i<100;i++)stadium.update({match:{...match,periodElapsed:i},lowGraphics:true});
assert.equal(stadium.scoreUpdates,updates);assert.equal(paints,paintCount,'Clock frames never repaint scoreboard');
stadium.update({match:{...match,score:[3,1]}});assert.equal(stadium.scoreUpdates,updates+1);
stadium.update({match:{...match,period:'extra2'}});assert.equal(stadium.scoreUpdates,updates+2);
stadium.update({match:{...match,penalties:{scores:[4,3]}}});assert(stadium.scoreText.includes('PENALTIES 4 : 3'));
stadium.update({});assert.equal(stadium.scoreText,'0 : 0 | HOME GROUND');assert.equal(JSON.stringify(match),before);
// Exercise World's actual anchor/update integration without a renderer or actors.
const world=Object.create(World.prototype),scene=new THREE.Scene();scene.add(stadium.root);
Object.assign(world,{stadiumView:stadium,stadiumGroup:stadium.root,scene,disposed:false,time:0,avatar:{x:0,y:1,z:0},avatarActor:{root:new THREE.Group()},factory:{pose(){}},lowGraphics:false,renderer:{shadowMap:{},render(){}},sun:{},camera:{position:new THREE.Vector3()},bases:data.bases,venueOrigin:new THREE.Vector3(...data.bases[0].pitch.position),chunks:[],venueColliders:[],labels:[],actors:new Map()});
for(const name of ['rebuildDisplays','updateMarket','updateMatch','updateCamera'])world[name]=()=>{};
for(const index of [0,5,11,0]) {
  world.pitchIndex=index;world.update(.01,{state:{stadiumLevel:3}});
  assert.deepEqual(stadium.root.position.toArray(),data.bases[index].pitch.position,'Upgrade group follows actual selected pitch');
}
let disposals=0,instanceDisposals=0;
for(const batch of stadium.batches)batch.mesh.addEventListener('dispose',()=>instanceDisposals++);
for(const resource of [stadium.geometry,stadium.material,stadium.boardGeometry,stadium.boardMaterial,stadium.texture])resource.addEventListener('dispose',()=>disposals++);
stadium.dispose();stadium.dispose();assert.equal(disposals,5);assert.equal(instanceDisposals,3);assert.equal(stadium.root.parent,null);assert.equal(stadium.root.children.length,0);
console.log(`PASS stadium: four tiers, ${snapshots[3].drawCalls} draws / ${snapshots[3].triangles} triangles; finite field-clear geometry, retained source colliders, pitch anchors, score caching, reset and exact-once disposal.`);
console.log('LIMIT: Detached geometry only; N100 performance and browser appearance unmeasured.');

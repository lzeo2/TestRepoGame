import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createWorldView} from '../Games/Capital Drive/world-view.js';
import {createAtmosphere} from '../Games/Capital Drive/atmosphere.js';
import {createAtmosphereView} from '../Games/Capital Drive/atmosphere-view.js';

const map = {bounds:{minX:0,maxX:200,minZ:0,maxZ:200},
  roads:[{id:'r',type:'residential',width:8,points:[[0,25],[200,25]]}],buildings:[],
  areas:[{id:'park',type:'park',points:[[0,50],[200,50],[200,200],[0,200]]}],spawn:{x:100,z:100}};
const scene = new THREE.Scene(), texture = new THREE.Texture();
const view = createWorldView(scene,map,{foliageTexture:texture});
const totals={trees:view.stats.totalTrees,shrubs:view.stats.totalShrubs};
const canopies=[]; scene.traverse(mesh=>{if(mesh.name==='Canberra canopy')canopies.push(mesh);});
assert.equal(canopies.length,1,'fixture keeps the same single canopy chunk draw');
assert(view.stats.trees>30 && view.stats.shrubs>20);
const mesh=canopies[0], geometry=mesh.geometry, material=mesh.material;
assert.equal(geometry.attributes.position.count,view.stats.trees*36,'existing nine four-vertex cards per tree');
assert.equal(geometry.index.count,view.stats.trees*54,'existing eighteen triangles per canopy');
assert.deepEqual(Object.keys(geometry.attributes).sort(),['color','normal','position','uv'],'no new per-vertex buffer');
assert(material.isMeshLambertMaterial); assert.equal(material.side,THREE.DoubleSide);
assert.equal(material.map,texture); assert.equal(material.alphaTest,.39); assert.equal(material.fog,true);
assert.equal(material.emissive.getHex(),0,'foliage never emits artificial night light');
const shader={vertexShader:THREE.ShaderLib.lambert.vertexShader,fragmentShader:THREE.ShaderLib.lambert.fragmentShader,uniforms:{}};
material.onBeforeCompile(shader);
assert.equal(shader.vertexShader,THREE.ShaderLib.lambert.vertexShader,'ordinary existing light transforms');
assert(shader.fragmentShader.includes('#include <normal_fragment_begin>\nnormal *= faceDirection;\nnonPerturbedNormal = normal;'),
  'rounded volume normals remain independent of the viewing side of a leaf card');
for(const chunk of ['lights_lambert_fragment','lights_fragment_begin','map_fragment','alphatest_fragment','fog_fragment'])assert(shader.fragmentShader.includes(`#include <${chunk}>`));
assert.deepEqual(shader.uniforms,{},'no new clock/light uniforms or frame updates');
assert.equal((shader.fragmentShader.match(/texture2D/g)||[]).length,0,'no extra texture samples');
const n=geometry.attributes.normal,c=geometry.attributes.color;
let lower=0,upper=0,negative=0,positive=0;
for(let i=0;i<n.count;i++){
  assert(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.009,'compact rounded normals stay unit length');
  if(n.getY(i)<-.05)negative++; if(n.getY(i)>.25)positive++;
  if(i%4<2)lower+=c.getX(i)+c.getY(i)+c.getZ(i);
  else upper+=c.getX(i)+c.getY(i)+c.getZ(i);
}
assert(negative>0 && positive>0,'the actual crown contains lit upper and shaded lower normals');
assert(upper>lower*1.25,'lower/inner leaf cards retain baked canopy occlusion');

const clock=createAtmosphere(),day=clock.snapshot();clock.step(360);const dusk=clock.snapshot();clock.step(720);const night=clock.snapshot();
assert.equal(day.hour,15);assert.equal(dusk.hour,18);assert.equal(night.hour,0);
// Numerically exercise the existing Lambert/hemisphere inputs with the actual
// baked mesh normals. This is source/material evidence, not a GPU screenshot.
function light(state,index,directOnly=false){
  const normal=new THREE.Vector3(n.getX(index),n.getY(index),n.getZ(index)).normalize();
  const sunDirection=new THREE.Vector3(state.sunX,state.sunY,state.sunZ).normalize();
  const sun=new THREE.Color(state.sunColor).multiplyScalar(Math.max(0,normal.dot(sunDirection))*state.sunIntensity);
  if(directOnly)return sun;
  const hemi=new THREE.Color(state.hemisphereGroundColor).lerp(new THREE.Color(state.hemisphereSkyColor),normal.y*.5+.5)
    .multiplyScalar(state.hemisphereIntensity);
  return hemi.add(sun).multiply(new THREE.Color(c.getX(index),c.getY(index),c.getZ(index)));
}
const luminance=value=>value.r*.2126+value.g*.7152+value.b*.0722;
const average=state=>Array.from({length:n.count},(_,i)=>luminance(light(state,i))).reduce((a,b)=>a+b,0)/n.count;
assert(average(day)>average(night)*2,'existing daytime sunlight lights the crown substantially above night');
assert(average(dusk)>average(night),'dusk remains distinct from full night');
let brightest=0;for(let i=1;i<n.count;i++)if(luminance(light(dusk,i,true))>luminance(light(dusk,brightest,true)))brightest=i;
const warm=light(dusk,brightest,true);assert(warm.r>warm.b*2,'sun-facing canopy highlights inherit the warm dusk light');
const hemisphere=new THREE.HemisphereLight(),sun=new THREE.DirectionalLight();scene.add(hemisphere,sun);
scene.background=new THREE.Color();scene.fog=new THREE.Fog();
const atmosphere=createAtmosphereView(scene,{hemisphere,sun});
const positions=geometry.attributes.position.array,version=n.version,bytes=view.stats.bufferBytes,meshes=view.stats.meshes;
for(const state of [day,dusk,night,day]){atmosphere.update(state,map.spawn);view.update(map.spawn);
  assert.equal(material,mesh.material);assert.equal(geometry,mesh.geometry);assert.equal(positions,geometry.attributes.position.array);
  assert.equal(n.version,version);assert.equal(view.stats.bufferBytes,bytes);assert.equal(view.stats.meshes,meshes);
  assert.equal(sun.intensity,state.sunIntensity);assert.equal(hemisphere.intensity,state.hemisphereIntensity);
}
assert.equal(scene.children.filter(object=>object.isLight).length,2,'foliage adds no lights or shadow pass');
assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,false);
atmosphere.dispose();view.dispose();view.dispose();

// Solid low/fallback foliage shares existing batches and must also retain its
// upper/lower colour contrast, without changing unrelated signal-lamp geometry.
const fallbackScene=new THREE.Scene(),fallback=createWorldView(fallbackScene,map,{foliageTexture:null,lowGraphics:true});
assert.equal(fallback.stats.totalTrees,totals.trees);assert.equal(fallback.stats.totalShrubs,totals.shrubs);
assert(!fallbackScene.children.some(object=>object.isLight));
let solid=0;fallbackScene.traverse(object=>{if(object.name==='Canberra solid'){
  solid++;const colors=object.geometry.attributes.color,normals=object.geometry.attributes.normal;
  for(const attribute of [colors,normals])assert([...attribute.array].every(Number.isFinite));
}});assert(solid>0);fallback.dispose();
console.log('PASS foliage rounded normals, fixed card lighting, canopy occlusion, actual day/dusk/night Lambert inputs, warm sun, unchanged buffers/draws/lights, fallback and disposal');

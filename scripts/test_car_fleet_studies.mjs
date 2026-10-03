// Source/geometry ownership only: stub canvas records text calls, not real typography.
import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createCar as pip } from '../assets/car-arcade/showcase/pip.js';
import { createCar as brindle } from '../assets/car-arcade/showcase/brindle.js';
import { PASSENGER_STUDIES, createDetailedCar } from '../assets/car-arcade/showcase/detailed.js';
import { UTILITY_STUDIES, SPORT_STUDIES } from '../assets/car-arcade/showcase/detail-profiles.js';
import { decorateCar } from '../assets/car-arcade/showcase/realism.js';

const ids = 'pip brindle bricklet finch lantern comet orchard horizon morrow relay tempest sunray parcel pebble dockside gravel atlas kestrel vesper aerolume riftline calyx serein nacre'.split(' ');
const modernIds = ['calyx', 'serein', 'nacre'];
const profiles = {...PASSENGER_STUDIES, ...UTILITY_STUDIES, ...SPORT_STUDIES};
const factories = {pip, brindle, ...Object.fromEntries(Object.keys(profiles).map(id => [id, () => createDetailedCar(id)]))};
assert.deepEqual(Object.keys(factories).sort(), [...ids].sort());
assert.deepEqual(Object.keys(SPORT_STUDIES).slice(-3), modernIds);
const fields = 'id name color roofColor width length height wheelbase bodyHeight cabinFront cabinRear roofFront roofRear roofWidth form doors plate'.split(' ').sort();
for (const map of [PASSENGER_STUDIES, UTILITY_STUDIES, SPORT_STUDIES]) {
  assert(Object.isFrozen(map));
  for (const [id, p] of Object.entries(map)) {
    assert(Object.isFrozen(p)); assert.equal(p.id, id);
    assert.deepEqual(Object.keys(p).sort(), fields);
    assert(/^#[0-9a-f]{6}$/i.test(p.color) && /^#[0-9a-f]{6}$/i.test(p.roofColor));
    for (const key of ['width','length','height','wheelbase','bodyHeight','roofWidth']) assert(Number.isFinite(p[key]) && p[key] > 0);
    assert(p.wheelbase < p.length && p.bodyHeight < p.height && p.roofWidth < p.width);
    assert(p.cabinFront <= p.roofFront && p.roofFront < p.roofRear && p.roofRear <= p.cabinRear);
    assert(['saloon','coupe','fastback','wagon','roadster','rally','van','panel','pickup','utility','hyper','prototype'].includes(p.form));
    assert([2,4].includes(p.doors)); assert(/^[A-Z0-9 -]{1,8}$/.test(p.plate));
  }
}
for (const id of ['unknown', '__proto__', 'constructor', 'toString']) assert.throws(() => createDetailedCar(id));

globalThis.document = {createElement(tag) {
  assert.equal(tag, 'canvas');
  const text = [];
  return {width:0, height:0, text, getContext:() => ({
    fillRect(){}, strokeRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, arc(){}, fill(){},
    fillText(value){text.push(value);}
  })};
}};
// Inspect actual indexed aero faces within a spatial region of a material batch.
function regionBounds(mesh, includes) {
  const {position} = mesh.geometry.attributes, index = mesh.geometry.index;
  assert(index, 'Indexed aero geometry required');
  const bounds = new THREE.Box3();
  let triangles = 0;
  for (let i = 0; i < index.count; i += 3) {
    const points = [0,1,2].map(j => new THREE.Vector3().fromBufferAttribute(position, index.getX(i+j)));
    if (points.every(includes)) { points.forEach(p => bounds.expandByPoint(p)); triangles++; }
  }
  assert(triangles >= 100, 'Missing substantial physical aero faces');
  return bounds;
}
// A sculpted nose need not use the older coupe's corner formula. Require actual
// shared indices incident to outward side, deck and end faces at all four joins.
function modernJunctions(mesh, profile) {
  const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal;
  const incident = new Map(), copies = new Map();
  const key = i => [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v * 1e6)).join(',');
  for (let i = 0; i < p.count; i++) copies.set(key(i), (copies.get(key(i)) ?? 0) + 1);
  for (let i = 0; i < g.index.count; i += 3) {
    const ids = [0,1,2].map(j => g.index.getX(i+j));
    const [a,b,c] = ids.map(j => new THREE.Vector3().fromBufferAttribute(p,j));
    const normal = b.sub(a).cross(c.sub(a));
    if (normal.lengthSq() < 1e-16) continue;
    normal.normalize();
    for (const j of ids) { if (!incident.has(j)) incident.set(j, []); incident.get(j).push(normal); }
  }
  for (const end of [-1,1]) for (const side of [-1,1]) {
    const joins = [...incident].filter(([i, faces]) =>
      p.getX(i)*side > profile.width*.3 && p.getZ(i)*end > profile.length*.43 &&
      p.getY(i) > profile.bodyHeight*.5 && p.getY(i) < profile.bodyHeight+.08 &&
      faces.some(f => f.x*side > .5) && faces.some(f => f.y > .5) && faces.some(f => f.z*end > .5));
    assert(joins.length, profile.id+' missing shared sculpted side/deck/end boundary');
    for (const [i, faces] of joins) {
      const normal = new THREE.Vector3().fromBufferAttribute(n,i);
      assert.equal(copies.get(key(i)), 1, profile.id+' duplicate sculpted junction');
      assert(normal.x*side > 0 && normal.y > 0 && normal.z*end > 0, profile.id+' inward sculpted junction');
      assert(faces.every(f => f.dot(normal) > 0), profile.id+' reversed sculpted face winding');
    }
  }
}
const seen = new Set(), hyperShapes = new Map(), modernShapes = new Map();
let checked = 0;
for (let cycle = 1; cycle <= 2; cycle++) for (const id of ids) {
  const car = factories[id](), geometries = new Set(), materials = new Set();
  let triangles = 0, meshes = 0;
  car.traverse(node => {
    if (!node.isMesh) return;
    meshes++; geometries.add(node.geometry);
    for (const mat of Array.isArray(node.material) ? node.material : [node.material]) materials.add(mat);
    const g = node.geometry, p = g.attributes.position;
    assert(p && p.count > 0);
    triangles += (g.index?.count ?? p.count) / 3;
    for (const attribute of Object.values(g.attributes)) assert(Array.from(attribute.array).every(Number.isFinite));
    assert.equal(g.attributes.normal?.count, p.count); assert.equal(g.attributes.uv?.count, p.count);
    if (g.index) assert(Array.from(g.index.array).every(i => Number.isInteger(i) && i >= 0 && i < p.count));
  });
  assert(triangles > 0 && triangles <= 30000 && meshes <= 75, id + ' geometry budget');
  assert.equal(car.userData.front, '-Z'); assert.equal(car.userData.showcaseOnly, true);
  const wheels = car.userData.wheels;
  assert.equal(wheels.length, 4); assert.equal(new Set(wheels).size, 4);
  const bounds = new THREE.Box3().setFromObject(car);
  assert(Math.abs(bounds.min.y) < .015, id + ' ground');
  for (const wheel of wheels) {
    assert(wheel.isGroup && wheel.parent === car);
    assert(Math.abs(new THREE.Box3().setFromObject(wheel).min.y) < .015);
  }
  const {eye, target} = car.userData.cockpit;
  for (const v of [eye, target]) assert(Array.isArray(v) && v.length === 3 && v.every(Number.isFinite));
  assert(bounds.containsPoint(new THREE.Vector3(...eye)) && target[2] < eye[2]);
  const profile = profiles[id];
  if (profile) {
    assert(Math.abs(eye[0]) < profile.roofWidth / 2);
    assert(eye[1] > profile.bodyHeight && eye[1] < profile.height);
    assert(eye[2] > profile.cabinFront * profile.length && eye[2] < profile.cabinRear * profile.length);
  } else assert.deepEqual(eye, [id === 'pip' ? -.34 : -.36, 1.14, .16]);
  const named = name => {
    const matches = [...materials].filter(m => m.name === name);
    assert(matches.length, id + ' missing ' + name); return matches;
  };
  // Project actual physical instrument faces from the driver camera, not metadata alone.
  const camera=new THREE.PerspectiveCamera(62,1280/691.2,.025,60);
  camera.position.fromArray(eye);camera.lookAt(new THREE.Vector3(...target));camera.updateMatrixWorld();
  car.traverse(node=>{
    if(!node.isMesh||!['dial-speed','dial-rpm','console-radio'].includes(node.material.name))return;
    const b=new THREE.Box3().setFromObject(node);
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y]){
      const projected=new THREE.Vector3(x,y,b.max.z).project(camera);
      assert(Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&Math.abs(projected.z)<1,id+' clipped physical instruments');
    }
  });
  if(profile){
    const paintMesh=car.getObjectByName('body-paint'),p=paintMesh.geometry.attributes.position;
    let center=Infinity,corner=Infinity;
    for(let i=0;i<p.count;i++){
      const x=Math.abs(p.getX(i)),z=p.getZ(i);
      if(x<profile.width*.05)center=Math.min(center,z);
      if(x>profile.width*.32)corner=Math.min(corner,z);
    }
    assert(corner>center+.025,id+' flat block nose');
    if (modernIds.includes(id)) modernJunctions(paintMesh, profile);
    else {
    // Actual shared skin/deck/cap corner vertices, not a claimed smooth flag.
    const {width:W,length:L,bodyHeight:B,form,wheelbase}=profile;
    const sport=['coupe','fastback','roadster','hyper','prototype'].includes(form);
    const g=paintMesh.geometry,n=g.attributes.normal;
    // A raised hood crown must not amplify the end rounding into a dent.
    const crownY=B-(sport?.18:.065)+.04,crownZ=-L/2+.07;
    assert(Array.from({length:p.count},(_,i)=>i).some(i=>Math.hypot(p.getX(i),p.getY(i)-crownY,p.getZ(i)-crownZ)<1e-6),id+' recessed hood crown');
    for(const end of form==='pickup'?[-1]:[-1,1])for(const side of [-1,1]){
      const z=end*L/2,hip=Math.exp(-Math.pow((z-wheelbase/2)/(L*.12),2));
      const half=W/2*(1-(sport?.19:.09))+(['hyper','prototype'].includes(form)?.07:sport?.025:0)*hip;
      const x=side*(half-.045),y=B-(sport?.18:.065);
      const joinedZ=z-end*((sport?.18:.13)*Math.pow(Math.abs(x)/half,4)+.07);
      const matches=[];
      for(let i=0;i<p.count;i++)if(Math.hypot(p.getX(i)-x,p.getY(i)-y,p.getZ(i)-joinedZ)<1e-6)matches.push(i);
      assert.equal(matches.length,1,id+' unwelded stamping junction');
      const i=matches[0];
      assert(n.getX(i)*side>0&&n.getY(i)>0&&n.getZ(i)*end>0,id+' inward stamping junction');
      assert(Array.from(g.index.array).filter(j=>j===i).length>=3,id+' disconnected stamping junction');
    }
    }
    // UV-duplicated bevel vertices must have the same analytic normal. Per-face
    // computeVertexNormals after box deformation fails this exact seam check.
    const cloth=car.getObjectByName('seat-fabric').geometry,cp=cloth.attributes.position,cn=cloth.attributes.normal,seams=new Map();
    let duplicates=0;
    for(let i=0;i<cp.count;i++){
      const key=[cp.getX(i),cp.getY(i),cp.getZ(i)].map(v=>Math.round(v*1e6)).join(',');
      const normal=new THREE.Vector3().fromBufferAttribute(cn,i);
      assert(Math.abs(normal.length()-1)<1e-5,id+' invalid bevel normal');
      if(seams.has(key)){assert(normal.dot(seams.get(key))>.99999,id+' split bevel shading');duplicates++;}
      else seams.set(key,normal);
    }
    assert(duplicates>100,id+' missing rounded cabin seams');
  }
  if (id === 'aerolume' || id === 'riftline') {
    const {width:W,length:L,height:H,bodyHeight:B} = profile;
    const roof = new THREE.Box3().setFromObject(car.getObjectByName('roof-paint'));
    const body = new THREE.Box3().setFromObject(car.getObjectByName('body-paint'));
    const roofSize = roof.getSize(new THREE.Vector3()), bodySize = body.getSize(new THREE.Vector3());
    assert(W > 2.1 && H < 1.2 && profile.roofWidth / W < .6, id + ' hyper proportions');
    assert(roof.max.y / bodySize.x < .55 && roofSize.x / bodySize.x < .6, id + ' physical low narrow canopy');
    assert(bodySize.z / bodySize.x > 1.8 && bodySize.x > 2.1, id + ' physical wide long body');
    const wing = regionBounds(car.getObjectByName('body-paint'), p => p.z > L*.30 && p.y > B+.10);
    const wingSize = wing.getSize(new THREE.Vector3());
    assert(wingSize.x > W*.7 && wingSize.z > .2 && wing.max.z < L/2+.05, id + ' attached rear aero bounds');
    assert(id === 'aerolume' ? wing.max.y < roof.max.y : wing.max.y > roof.max.y, id + ' distinct low bridge / raised wing');
    const clearance = Math.min(B*.39,W*.185)*.75;
    const skinMeshes=[car.getObjectByName('body-paint'),car.getObjectByName('cab-plastic')];
    const cf=profile.cabinFront*L,cr=profile.cabinRear*L;
    // Actual rays must see one hull, not near-coplanar intake overlays.
    for(const [origin,direction] of [
      [[W+1,(B+clearance)/2,cr-.10],[-1,0,0]],
      [[W*.29,clearance+.16,-L],[0,0,1]],
    ]){
      const ray=new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction));
      const hits=ray.intersectObjects(skinMeshes);
      assert(hits.length,id+' missing cooling skin');
      assert.equal(hits[0].object.material.name,'cab-plastic',id+' cooling not on actual hull');
      assert(hits.filter(h=>h.distance<hits[0].distance+.03).every(h=>h.object.material.name==='cab-plastic'),id+' overlapping paint/intake skin');
    }
    // The narrow canopy's dashboard must not emerge onto the outer shoulder.
    const ray=new THREE.Raycaster(new THREE.Vector3(profile.roofWidth/2+.205,H+1,cf+.13),new THREE.Vector3(0,-1,0));
    const shoulder=ray.intersectObjects(skinMeshes)[0];
    assert(shoulder&&shoulder.object.material.name==='body-paint',id+' dashboard outside physical cabin');
    const diffuser = regionBounds(car.getObjectByName('cab-plastic'), p => p.z > L*.31 && p.y < clearance+.05);
    const diffuserSize = diffuser.getSize(new THREE.Vector3());
    assert(diffuserSize.x > W*.6 && diffuserSize.z > L*.15 && diffuserSize.y > .05, id + ' physical rear diffuser');
    assert(diffuser.min.y > 0 && diffuser.max.z < L/2+.1, id + ' diffuser ground / rear bounds');
    const shape = [roofSize.x/bodySize.x, roofSize.z/bodySize.z, wing.max.y/roof.max.y];
    if (cycle === 1) hyperShapes.set(id, shape);
    else assert.deepEqual(shape, hyperShapes.get(id), id + ' deterministic physical shape');
    if (id === 'riftline') assert(shape.some((v,i) => Math.abs(v-hyperShapes.get('aerolume')[i]) > .1), 'Hyper concepts are not scaled shape clones');
  }
  if (modernIds.includes(id)) {
    const {width:W,length:L,height:H,bodyHeight:B,roofWidth} = profile;
    const cf=profile.cabinFront*L, cr=profile.cabinRear*L;
    const body=car.getObjectByName('body-paint'), trim=car.getObjectByName('cab-plastic');
    const roof=new THREE.Box3().setFromObject(car.getObjectByName('roof-paint'));
    const bodyBounds=new THREE.Box3().setFromObject(body), size=bodyBounds.getSize(new THREE.Vector3());
    const roofSize=roof.getSize(new THREE.Vector3());
    assert(W >= 2.05 && H < 1.2 && roofWidth/W < .59 && profile.doors === 2, id+' closed modern proportions');
    assert(size.x > 2 && size.z/size.x > 1.8 && roof.max.y/size.x < .57, id+' actual low wide body');
    assert(roofSize.x/size.x < .59 && roofSize.z/size.z < .22, id+' actual compact narrow canopy');
    assert(L/2-cr > cf+L/2+.3, id+' rear engine deck must exceed short nose');
    assert(bodyBounds.max.y < roof.max.y+.05, id+' oversized bolt-on aero');
    const clearance=wheels[0].position.y*.75;
    const skinMeshes=[body,trim];
    const topAt=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,H+1,z),new THREE.Vector3(0,-1,0)).intersectObject(body)[0];
    const nose=topAt(0,-L*.43), haunch=topAt(W*.35,-profile.wheelbase/2);
    assert(nose && haunch && nose.point.y<haunch.point.y-.035,id+' physical nose must fall below wheel shoulder');
    for (const side of [-1,1]) {
      const flank = v => {
        const ray=new THREE.Raycaster(new THREE.Vector3(side*(W+1),clearance+(B-clearance)*v,cr-.10),new THREE.Vector3(-side,0,0));
        const hits=ray.intersectObjects(skinMeshes);
        assert(hits.length,id+' missing physical flank');
        return hits;
      };
      const cooling=flank(.5), lower=flank(.1)[0], upper=flank(.9)[0];
      assert.equal(cooling[0].object.material.name,'cab-plastic',id+' cooling must be actual hull');
      assert(cooling.filter(h=>h.distance<cooling[0].distance+.03).every(h=>h.object===trim),id+' overlapping cooling/paint skin');
      assert(Math.abs(cooling[0].point.x) < (Math.abs(lower.point.x)+Math.abs(upper.point.x))/2-.025,id+' non-recessed cooling channel');
      const shoulder=new THREE.Raycaster(new THREE.Vector3(side*(roofWidth/2+.205),H+1,cf+.13),new THREE.Vector3(0,-1,0)).intersectObjects(skinMeshes)[0];
      assert(shoulder && shoulder.object===body,id+' dashboard outside physical cabin');
    }
    const cloth=car.getObjectByName('seat-fabric').geometry.attributes.position;
    let upperCabin=0;
    for(let i=0;i<cloth.count;i++) if(cloth.getY(i)>B+.03) {
      upperCabin++;
      assert(Math.abs(cloth.getX(i))<roofWidth/2+.12 && cloth.getY(i)<roof.max.y && cloth.getZ(i)>cf && cloth.getZ(i)<cr,id+' upholstery outside narrow cabin');
    }
    assert(upperCabin>100,id+' missing physical upper seats');
    const forward=new THREE.Raycaster(new THREE.Vector3(...eye),new THREE.Vector3(...target).sub(new THREE.Vector3(...eye)).normalize());
    const windshield=forward.intersectObject(car.getObjectByName('window-glass'))[0];
    assert(windshield && windshield.distance>.1,id+' eye does not see through physical windshield');
    const obstruction=forward.intersectObjects(skinMeshes)[0];
    assert(!obstruction || obstruction.distance>windshield.distance-.025,id+' opaque cabin blocks driver sightline');
    const shape=[roofSize.x/size.x,roofSize.z/size.z,roof.max.y/size.x,(roof.min.z+roof.max.z)/size.z];
    if(cycle===1) {
      for(const [other,previous] of modernShapes) assert(shape.some((v,i)=>Math.abs(v-previous[i])>.01),id+' scaled modern clone of '+other);
      modernShapes.set(id,shape);
    } else assert.deepEqual(shape,modernShapes.get(id),id+' deterministic modern shape');
  }
  for (const name of ['body-paint','cab-plastic','seat-fabric','rubber','chrome','window-glass','lamp-lens','dial-speed','dial-rpm','console-radio','registration-plate']) named(name);
  if (profile?.form !== 'roadster') named('roof-paint');
  assert([...materials].every(m => !Object.values(m).some(v => v?.isTexture)), id + ' map-free factory');
  for (const m of named('window-glass')) assert(m.transparent && m.transmission === 0 && m.forceSinglePass);
  decorateCar(car);
  for (const [name, text, height] of [['registration-plate', profile?.plate ?? (id === 'pip' ? 'PIP 08' : 'BRD 16'), 64], ['dial-speed','km/h',256], ['dial-rpm','rpm',256], ['console-radio','AM',64]]) {
    for (const m of named(name)) {
      assert.equal(m.map.image.width, 256); assert.equal(m.map.image.height, height);
      assert.equal(m.map.colorSpace, THREE.SRGBColorSpace);
      assert(m.map.image.text.some(t => t === text || (name === 'console-radio' && t.startsWith(text))));
      if (name === 'registration-plate') assert.equal(m.userData.label, text);
    }
  }
  const textures = new Set([...materials].flatMap(m => Object.values(m).filter(v => v?.isTexture)));
  const bytes = [...textures].reduce((sum, t) => sum + t.image.width * t.image.height * 4, 0);
  assert(bytes > 0 && bytes <= 1048576, id + ' map budget');
  assert.equal(textures.size,9,id+' decorator map count');
  assert.equal(bytes,983040,id+' decorator base bytes');
  const resources = [...geometries, ...materials, ...textures], counts = resources.map(() => 0);
  resources.forEach((r, i) => {
    assert(!seen.has(r), id + ' shared GPU resource'); seen.add(r);
    r.addEventListener('dispose', () => counts[i]++);
  });
  resources.forEach(r => r.dispose()); assert(counts.every(n => n === 1));
  checked++;
  console.log(`PASS ${id} cycle${cycle}: ${triangles} triangles / ${meshes} meshes / ${textures.size} textures / ${bytes} base RGBA bytes`);
}
assert.equal(checked, 48);
console.log('PASS 24 factories, two fresh cycles, disjoint once-disposed resources. Source/stub check only; real cabin visibility and typography require native review.');

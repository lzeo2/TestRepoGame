// Source/geometry ownership only: stub canvas records text calls, not real typography.
import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createCar as pip } from '../assets/car-arcade/showcase/pip.js';
import { createCar as brindle } from '../assets/car-arcade/showcase/brindle.js';
import { PASSENGER_STUDIES, createDetailedCar } from '../assets/car-arcade/showcase/detailed.js';
import { UTILITY_STUDIES, SPORT_STUDIES } from '../assets/car-arcade/showcase/detail-profiles.js';
import { POLICE_STUDIES, createPoliceCar } from '../assets/car-arcade/showcase/police.js';
import { decorateCar } from '../assets/car-arcade/showcase/realism.js';

const ids = 'pip brindle bricklet finch lantern comet orchard horizon morrow relay tempest sunray parcel pebble dockside gravel atlas kestrel vesper aerolume riftline calyx serein nacre wardline strake'.split(' ');
const modernIds = ['calyx', 'serein', 'nacre'];
const policeBases = {wardline: 'lantern', strake: 'serein'};
const profiles = {...PASSENGER_STUDIES, ...UTILITY_STUDIES, ...SPORT_STUDIES};
const factories = {pip, brindle, ...Object.fromEntries(Object.keys(profiles).map(id => [id, () => createDetailedCar(id)])),
  ...Object.fromEntries(Object.keys(POLICE_STUDIES).map(id => [id, () => createPoliceCar(id)]))};
Object.assign(profiles, POLICE_STUDIES);
assert.deepEqual(Object.keys(POLICE_STUDIES), ['wardline', 'strake']);
for (const [id, base] of Object.entries(policeBases)) {
  for (const key of Object.keys(profiles[base])) if (!['id','name','color','roofColor','plate'].includes(key)) {
    assert.equal(profiles[id][key], profiles[base][key], id+' changed base profile '+key);
  }
  assert.notEqual(profiles[id].name, profiles[base].name);
  assert.notEqual(profiles[id].plate, profiles[base].plate);
}
assert.deepEqual(Object.keys(factories).sort(), [...ids].sort());
assert.deepEqual(Object.keys(SPORT_STUDIES).slice(-3), modernIds);
const fields = 'id name color roofColor width length height wheelbase bodyHeight cabinFront cabinRear roofFront roofRear roofWidth form doors plate'.split(' ').sort();
for (const map of [PASSENGER_STUDIES, UTILITY_STUDIES, SPORT_STUDIES, POLICE_STUDIES]) {
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
for (const id of ['unknown', '__proto__', 'constructor', 'toString', 'lantern', 'serein', '', null, undefined, 1, {}, ['wardline'], new String('strake')]) {
  assert.throws(() => createPoliceCar(id), RangeError);
}

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
// Inspect actual world-space triangles, including material-array partitions.
function materialTriangles(root, name) {
  const faces = [];
  root.updateWorldMatrix(true, true);
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const g = mesh.geometry, mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const groups = Array.isArray(mesh.material) ? g.groups : [{start:0,count:g.index?.count ?? g.attributes.position.count,materialIndex:0}];
    for (const group of groups) if (mats[group.materialIndex]?.name === name) {
      for (let i=group.start;i<group.start+group.count;i+=3) {
        const indices = [0,1,2].map(j => g.index ? g.index.getX(i+j) : i+j);
        faces.push({points:indices.map(j => new THREE.Vector3().fromBufferAttribute(g.attributes.position,j).applyMatrix4(mesh.matrixWorld)),
          uv:indices.map(j => new THREE.Vector2().fromBufferAttribute(g.attributes.uv,j))});
      }
    }
  });
  assert(faces.length, 'Missing physical '+name);
  return faces;
}
const seen = new Set(), hyperShapes = new Map(), modernShapes = new Map(), baseCars = new Map();
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
  const profile = profiles[id], police = Object.hasOwn(policeBases, id);
  if (police) {
    assert.equal(car.userData.id, id); assert.equal(car.userData.name, profile.name);
    const base = baseCars.get(policeBases[id]);
    assert(base, id+' missing inspected original base');
    assert.deepEqual(car.userData.cockpit, base.userData.cockpit, id+' changed physical eye');
    for (const name of ['body-paint', 'roof-paint', 'window-glass']) {
      const actual = car.getObjectByName(name).geometry, original = base.getObjectByName(name).geometry;
      for (const key of ['position', 'normal', 'uv']) assert.deepEqual(actual.attributes[key].array, original.attributes[key].array, id+' changed base '+name+' '+key);
      const faces = g => Array.from({length:g.index.count/3}, (_,i) => Array.from(g.index.array.slice(i*3,i*3+3)).join(',')).sort();
      assert.deepEqual(faces(actual), faces(original), id+' changed base triangles '+name);
    }
  }
  if (id === 'lantern' || id === 'serein') baseCars.set(id, car);
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
    if (modernIds.includes(id) || policeBases[id] === 'serein') modernJunctions(paintMesh, profile);
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
    // Real outward rays must reach each lamp cover before the surrounding cap.
    for(const end of [-1,1])for(const side of [-1,1]){
      const ray=new THREE.Raycaster(new THREE.Vector3(side*W*.245,B*.69,end*(L+1)),new THREE.Vector3(0,0,-end));
      const hit=ray.intersectObjects([...skinMeshes,car.getObjectByName('lamp-lens'),car.getObjectByName('chrome'),car.getObjectByName('rear-reflector')])[0];
      assert(hit&&hit.object.material.name==='lamp-lens',id+' lamp buried in cap');
    }
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
  if (police) {
    const body = car.getObjectByName('body-paint'), g = body.geometry;
    assert(Array.isArray(body.material), id+' livery must partition actual body triangles');
    const coverage = new Uint8Array(g.index.count), colors = new Map();
    for (const group of g.groups) {
      assert(group.start%3===0 && group.count>=3 && group.count%3===0 && group.start+group.count<=g.index.count);
      const material = body.material[group.materialIndex]; assert(material?.color);
      for (let i=group.start;i<group.start+group.count;i++) assert.equal(coverage[i]++,0,id+' overlapping body groups');
      const color = material.color;
      colors.set(color.getHex(), {luma:(color.r+color.g+color.b)/3,count:(colors.get(color.getHex())?.count ?? 0)+group.count});
    }
    assert(coverage.every(n=>n===1),id+' unpainted body triangles');
    assert([...colors.values()].some(c=>c.luma>.6&&c.count>=18) && [...colors.values()].some(c=>c.luma<.08&&c.count>=18),id+' missing physical black/white livery');
    const roof = car.getObjectByName('roof-paint'), roofBounds = new THREE.Box3().setFromObject(roof);
    assert.equal(roof.material.color.getHex(),new THREE.Color(profile.roofColor).getHex(),id+' contrasting roof finish');
    assert.notEqual(roof.material.color.getHex(),new THREE.Color(profile.color).getHex(),id+' roof lacks livery contrast');
    const glass = car.getObjectByName('window-glass'), glassBounds = new THREE.Box3().setFromObject(glass);
    const boundsOf = faces => new THREE.Box3().setFromPoints(faces.flatMap(f=>f.points));
    const red = boundsOf(materialTriangles(car,'police-light-red')), blue = boundsOf(materialTriangles(car,'police-light-blue'));
    for (const [name, bounds] of [['police-light-red',red],['police-light-blue',blue]]) {
      assert(bounds.min.y>=roofBounds.max.y-.002 && bounds.min.y>glassBounds.max.y,id+' lightbar crosses roof/glazing');
      assert(bounds.min.x>=roofBounds.min.x && bounds.max.x<=roofBounds.max.x && bounds.min.z>=roofBounds.min.z && bounds.max.z<=roofBounds.max.z,id+' unsupported roof lightbar');
      const size=bounds.getSize(new THREE.Vector3()); assert(size.x>.1 && size.y>.015 && size.z>.02,id+' missing physical lens volume');
      for (const m of named(name)) assert(name.endsWith('red') ? m.color.r>m.color.b*2 : m.color.b>m.color.r*2,id+' incorrect lens color');
    }
    assert(!red.intersectsBox(blue),id+' overlapping red/blue lenses');
    const mountFaces=materialTriangles(car,'police-mount'), mountBounds=boundsOf(mountFaces);
    assert(mountBounds.max.y>=Math.min(red.min.y,blue.min.y)-.003,id+' floating lightbar');
    // Downward rays test real support vertices against the actual crowned roof.
    const contacts = new Set();
    for (const point of mountFaces.flatMap(f=>f.points)) {
      const hit=new THREE.Raycaster(new THREE.Vector3(point.x,profile.height+1,point.z),new THREE.Vector3(0,-1,0)).intersectObject(roof)[0];
      assert(hit && point.y>=hit.point.y-.006,id+' mount penetrates roof or glazing');
      if(Math.abs(point.y-hit.point.y)<.006) contacts.add(Math.sign(point.x));
    }
    assert(contacts.has(-1)&&contacts.has(1),id+' feet do not touch both roof sides');
    let textSurfaces=0;
    car.traverse(node=>{if(node.isMesh && (Array.isArray(node.material)?node.material:[node.material]).some(m=>m.name==='police-lettering'))textSurfaces++;});
    assert.equal(textSurfaces,2,id+' two physical lettering surfaces');
    const lettering=materialTriangles(car,'police-lettering'), sides=new Set(), textAreas=new Map();
    for(const {points:[a,b,c],uv:[ua,ub,uc]} of lettering) {
      const center=a.clone().add(b).add(c).multiplyScalar(1/3), side=Math.sign(center.x);
      const ab=b.clone().sub(a), ac=c.clone().sub(a), cross=ab.clone().cross(ac), normal=cross.clone().normalize();
      textAreas.set(side,(textAreas.get(side)??0)+cross.length()/2);
      assert(Math.abs(center.x)>profile.width*.3 && normal.x*side>.8,id+' inward side lettering');
      assert(Math.max(a.y,b.y,c.y)<glassBounds.min.y,id+' lettering overlaps glazing');
      for(const uv of [ua,ub,uc]) assert(uv.x>=0&&uv.x<=1&&uv.y>=0&&uv.y<=1,id+' invalid lettering UV');
      const du=ub.clone().sub(ua), dv=uc.clone().sub(ua), determinant=du.x*dv.y-du.y*dv.x;
      assert(Math.abs(determinant)>1e-8,id+' collapsed lettering UV');
      const right=ab.clone().multiplyScalar(dv.y).addScaledVector(ac,-du.y).divideScalar(determinant).normalize();
      const up=ac.clone().multiplyScalar(du.x).addScaledVector(ab,-dv.x).divideScalar(determinant).normalize();
      assert(right.z*-side>.8 && up.y>.8,id+' mirrored or inverted POLICE lettering');
      const inward=new THREE.Raycaster(center.clone().add(new THREE.Vector3(side*.02,0,0)),new THREE.Vector3(-side,0,0)).intersectObject(body)[0];
      assert(inward && inward.distance>=.015 && inward.distance<.08,id+' lettering detached from body panel');
      sides.add(side);
    }
    assert.deepEqual([...sides].sort(),[-1,1],id+' two outward lettering surfaces');
    assert([...textAreas.values()].every(area=>area>.05),id+' insufficient physical lettering area');
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
  if (police) {
    const lettering=named('police-lettering');
    assert.equal(new Set(lettering.map(m=>m.map)).size,1,id+' lettering map must be shared within root');
    for(const m of lettering) {
      assert(m.map?.isCanvasTexture && m.map.flipY,id+' actual canvas lettering orientation');
      assert.equal(m.map.image.width,256); assert.equal(m.map.image.height,64);
      assert.equal(m.map.colorSpace,THREE.SRGBColorSpace);
      assert(m.map.image.text.includes('POLICE'),id+' missing canvas POLICE text');
    }
  }
  const textures = new Set([...materials].flatMap(m => Object.values(m).filter(v => v?.isTexture)));
  const bytes = [...textures].reduce((sum, t) => sum + t.image.width * t.image.height * 4, 0);
  assert(bytes > 0 && bytes <= 1048576, id + ' map budget');
  if (police) {
    assert.equal(textures.size,10,id+' decorator map count');
    assert.equal(bytes,1048576,id+' decorator base bytes');
  } else {
    assert.equal(textures.size,9,id+' decorator map count');
    assert.equal(bytes,983040,id+' decorator base bytes');
  }
  const resources = [...geometries, ...materials, ...textures], counts = resources.map(() => 0);
  resources.forEach((r, i) => {
    assert(!seen.has(r), id + ' shared GPU resource'); seen.add(r);
    r.addEventListener('dispose', () => counts[i]++);
  });
  resources.forEach(r => r.dispose()); assert(counts.every(n => n === 1));
  checked++;
  console.log(`PASS ${id} cycle${cycle}: ${triangles} triangles / ${meshes} meshes / ${textures.size} textures / ${bytes} base RGBA bytes`);
}
assert.equal(checked, 52);
console.log('PASS 26 factories, two fresh cycles, disjoint once-disposed resources. Source/stub check only; real cabin visibility and typography require native review.');

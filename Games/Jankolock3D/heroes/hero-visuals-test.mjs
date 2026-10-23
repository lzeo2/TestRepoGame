import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { AbilityFX, createHeroVisual } from './hero-visuals.mjs';
import { preloadHeroes, disposeCharacterAssets } from '../character-assets.mjs';
await preloadHeroes();

const kits = JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json', import.meta.url)));
const abilities = kits.heroes.flatMap(hero => hero.abilities);
assert.equal(abilities.length, 16);
const vector = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const near = (a, b) => assert.ok(a.distanceTo(b) < 1e-6, `${a.toArray()} != ${b.toArray()}`);
const meshes = group => { const result = []; group.traverse(p => { if (p.isMesh) result.push(p); }); return result; };
const signature = group => meshes(group).map(p => `${p.geometry.type}:${p.scale.toArray().map(v => v.toFixed(3))}`).sort().join('|');
function checkSolid(group, depthTest = true) {
  const parts = meshes(group); assert.ok(parts.length > 0, group.name);
  for (const p of parts) {
    assert.ok(p.geometry.getAttribute('position').count > 0);
    assert.equal(p.material.depthTest, depthTest, group.name);
    assert.equal(p.material.depthWrite, depthTest, group.name);
    assert.equal(p.material.emissive.getHex(), 0);
    assert.equal(p.material.flatShading, true);
    assert.equal(p.material.transparent, false);
    assert.equal(p.material.map, null);
    assert.ok([...p.position.toArray(), ...p.scale.toArray(), ...p.quaternion.toArray()].every(Number.isFinite));
  }
}
function countDisposals(resources) {
  const counts = new Map([...resources].map(resource => [resource, 0]));
  for (const resource of counts.keys()) resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
  return expected => { for (const count of counts.values()) assert.equal(count, expected); };
}

const silhouettes = new Set();
for (const { id } of kits.heroes) {
  const hero = createHeroVisual(id), parts = meshes(hero.group);
  silhouettes.add(hero.metadata.sha256);
  const manifest=JSON.parse(readFileSync(new URL(`../models/${id}/manifest.json`,import.meta.url)));
  const rig=JSON.parse(readFileSync(new URL(`../models/${id}/rig.json`,import.meta.url)));
  const palette=JSON.parse(readFileSync(new URL(`../models/${id}/palette.json`,import.meta.url)));
  assert.equal(hero.metadata.origin,'operator-external');assert.equal(hero.metadata.triangles,manifest.tri_count_LOD0);
  assert.ok(hero.metadata.triangles>0&&hero.metadata.triangles<=250000);
  assert.equal(hero.metadata.bytes,manifest.size_bytes);assert.ok(hero.metadata.bytes<8388608);
  assert.equal(parts.length,hero.metadata.meshes);assert.deepEqual(hero.metadata.unmatchedPaletteSlots,[]);
  let triangles=0;
  for(const part of parts) {
    triangles+=(part.geometry.index?.count??part.geometry.attributes.position.count)/3;
    assert.ok(part.material.isMeshStandardMaterial);
    assert.equal(part.material.map.image.width,512);assert.equal(part.material.normalMap.image.height,512);
    assert.ok(part.geometry.attributes.normal&&part.geometry.attributes.uv);
    assert.ok(part.material.roughness>=0&&part.material.roughness<=1&&part.material.metalness>=0&&part.material.metalness<=1);
    const slot=palette.material_slots.find(s=>s.name===part.material.name);assert.ok(slot,part.material.name);
    for(const [i,key]of ['r','g','b'].entries())assert.ok(Math.abs(part.material.color[key]-slot.base_color_linear_rgba[i])<1e-6,`${id}/${slot.name}: linear palette`);
    assert.equal(part.material.userData.paletteSlot,slot.name);
  }
  assert.equal(triangles,hero.metadata.triangles);
  const bounds = new THREE.Box3().setFromObject(hero.group,true);
  assert.ok(Math.abs(bounds.min.y) < 1e-6, `${id}: feet at zero`);
  assert.ok(Math.abs(bounds.max.y-manifest.bounds_gltf_m.max[1])<1e-4,`${id}: delivered height, no fabricated scaling`);
  for(const node of rig.movable_nodes)assert.ok(hero.group.getObjectByName(node.name),`${id}/${node.name}`);
  assert.equal(hero.metadata.movableNodes,rig.movable_nodes.length);
  const geometryDisposed = countDisposals(new Set(parts.map(p => p.geometry)));
  const materialDisposed = countDisposals(new Set(parts.map(p => p.material)));
  hero.group.position.set(12, 3, 7);
  for (const state of ['idle', 'walk', 'dash', 'slide', 'jump', 'fall']) {
    hero.update(0.1, { state, speed: 8, yaw: 0.7, aiming: true });
    near(hero.group.position, vector(12, 3, 7)); assert.equal(hero.group.rotation.y, 0.7);
  }
  assert.equal(hero.group.children[0].scale.y, 1);
  hero.update(0.1, { state: 'slide' });
  hero.group.updateMatrixWorld(true);
  for(const part of meshes(hero.group))assert.ok(part.matrixWorld.elements.every(Number.isFinite));
  hero.update(0); assert.equal(hero.group.children[0].scale.y, 1);
  hero.dispose(); hero.dispose(); hero.update(1);
  geometryDisposed(1); materialDisposed(1); assert.equal(hero.group.children.length, 0);
}
assert.equal(silhouettes.size, 4); assert.throws(() => createHeroVisual('missing'), RangeError);

const scene = new THREE.Scene(), fx = new AbilityFX(scene), shapes = new Set(), handles = new Map();
const origin = vector(10, 2, 5), target = vector(1, 5, -9), direction = vector(0.3, 0.1, -1);
const targets = [vector(3, 0, -8), vector(-4, 2, -12)];
const unchanged = [origin, target, direction, ...targets].map(v => v.clone());
const geometryDisposed = countDisposals(Object.values(fx.kit));
for (const ability of abilities) {
  const handle = fx.emit(ability.id, { origin, target, direction, targets, color: ability.fx.color, duration: 1 });
  if(ability.id==='turret') {
    assert.equal(handle.group.userData.model.id,'deployed_stapler');assert.equal(handle.group.userData.model.triangles,3248);
    const base=handle.group.getObjectByName('base'),yawHead=handle.group.getObjectByName('yaw_head'),pitchHead=handle.group.getObjectByName('head_pitch');
    const baseRest=base.quaternion.clone(),rootYaw=handle.group.rotation.y;
    handle.aimAt(new THREE.Vector3(1,10,-1));assert.equal(handle.group.rotation.y,rootYaw);assert.ok(base.quaternion.equals(baseRest));
    assert.ok(Math.abs(yawHead.rotation.y)>0);assert.ok(pitchHead.rotation.x<=Math.PI/4+1e-6);
    assert.ok(meshes(handle.group).every(m=>m.material.isMeshStandardMaterial&&m.material.map.image.width===512));
  } else checkSolid(handle.group, ability.id !== 'xray');
  shapes.add(signature(handle.group));
  assert.equal(handle.position, handle.group.position); assert.equal(handle.remaining, 1);
  near(handle.position, origin); handles.set(ability.id, handle);
}
assert.equal(shapes.size, 16, 'distinct geometry/scale signatures for every kit effect');
assert.equal(fx.count, 16); assert.equal(scene.children.length, 16);
assert.ok(new Set(scene.children.filter(g=>g.name!=='turret').flatMap(meshes).map(p=>p.geometry)).size<=6,'non-model FX share the geometry kit');
const turretParts=meshes(handles.get('turret').group),turretGeometryDisposed=countDisposals(new Set(turretParts.map(p=>p.geometry)));
const duplicateTurret=fx.emit('turret'),duplicateParts=meshes(duplicateTurret.group);
assert.equal(duplicateParts.length,turretParts.length);
for(let i=0;i<turretParts.length;i++){assert.equal(duplicateParts[i].geometry,turretParts[i].geometry);assert.notEqual(duplicateParts[i].material,turretParts[i].material);}
const duplicateMaterialsDisposed=countDisposals(new Set(duplicateParts.map(p=>p.material)));
duplicateTurret.dispose();duplicateMaterialsDisposed(1);turretGeometryDisposed(0);
assert.equal(handles.get('xray').group.renderOrder, 1000);
[origin, target, direction, ...targets].forEach((v, i) => near(v, unchanged[i]));
for (const id of ['hook', 'tether']) {
  const group = handles.get(id).group; group.updateMatrixWorld(true);
  near(group.localToWorld(vector(0, origin.distanceTo(target), 0)), target);
}
// Every tether cylinder meets the next one, from origin right through to target.
const tether = handles.get('tether').group;
let last = origin.clone(); tether.updateMatrixWorld(true);
for (const segment of tether.children) {
  near(vector(0, -0.5, 0).applyMatrix4(segment.matrixWorld), last);
  last = vector(0, 0.5, 0).applyMatrix4(segment.matrixWorld);
}
near(last, target);
const hookLinks = handles.get('hook').group.children;
const step = origin.distanceTo(target) / hookLinks.length;
for (let i = 0; i < hookLinks.length; i++) {
  assert.ok(hookLinks[i].children[0].scale.y >= step);
  assert.ok(Math.abs(hookLinks[i].position.y - (i + 0.5) * step) < 1e-6);
}
assert.equal(handles.get('volley').group.children.length, 5);
assert.equal(handles.get('barricade').group.children.length, 5);
assert.equal(meshes(handles.get('chaingun').group).filter(p => p.geometry.type === 'CylinderGeometry').length, 13);
const cages = meshes(handles.get('xray').group).filter(p => p.material.wireframe && p.geometry.type === 'BoxGeometry');
assert.equal(cages.length, targets.length);
cages.forEach((cage, i) => near(cage.getWorldPosition(vector()), targets[i].clone().add(vector(0, 0.95, 0))));
for (const id of ['shot', 'melee', 'parry', 'dash', 'jump', 'slide', 'explosion']) checkSolid(fx.emit(id).group);

for (const id of ['turret', 'barricade', 'grenade', 'tether']) handles.get(id).group.position.set(42, 8, -14);
fx.update(-1); fx.update(NaN); assert.equal(handles.get('hook').remaining, 1);
fx.update(0.25);
for (const id of ['turret', 'barricade', 'grenade', 'tether']) near(handles.get(id).position, vector(42, 8, -14));
assert.equal(handles.get('hook').remaining, 0.75);
const early = handles.get('volley'), materialDisposed = countDisposals(new Set(meshes(early.group).map(p => p.material)));
early.dispose(); early.dispose(); assert.equal(early.group.parent, null); assert.equal(early.remaining, 0); materialDisposed(1);
geometryDisposed(0); fx.update(0.75); assert.equal(fx.count, 0); assert.equal(scene.children.length, 0); geometryDisposed(0);

{
  let live = [];
  const reveal = fx.emit('xray', {origin, targets: () => live, duration: .25});
  const boxes = () => meshes(reveal.group).filter(p => p.material.wireframe && p.geometry.type === 'BoxGeometry');
  assert.equal(boxes().length, 0, 'casting without enemies still admits later entrants');
  live = [vector(1, 2, 3)]; fx.update(0);
  checkSolid(reveal.group, false);
  live = []; fx.update(.0625); assert.ok(boxes().every(p => !p.visible));
  live = [vector(4, 5, 6), vector(7, 8, 9)]; fx.update(.0625);
  const pooled = [...reveal.group.children], materials = new Set(meshes(reveal.group).map(p => p.material));
  const disposed = countDisposals(materials), resources = pooled.map(p => [p.geometry, p.material]);
  for (let i = 0; i < 40; i++) {
    live = [vector(i, 0, -i)]; reveal.position.set(i / 2, 1, 2); fx.update(0);
    assert.deepEqual(reveal.group.children, pooled); assert.equal(boxes().filter(p => p.visible).length, 1);
    pooled.forEach((part, index) => {
      assert.equal(part.geometry, resources[index][0]); assert.equal(part.material, resources[index][1]);
    });
    near(boxes()[0].getWorldPosition(vector()), live[0].clone().add(vector(0, .95, 0)));
    disposed(0); assert.equal(reveal.remaining, .125);
  }
  fx.update(.125); disposed(1); assert.equal(fx.count, 0); assert.equal(reveal.group.children.length, 0);
  const direct = fx.emit('xray', {target, duration: .25});
  near(meshes(direct.group).find(p => p.geometry.type === 'BoxGeometry').getWorldPosition(vector()), target.clone().add(vector(0, .95, 0)));
  direct.dispose(); assert.equal(fx.count, 0);
}
const oldest = fx.emit('shot');
for (let i = 0; i < 100; i++) fx.emit('shot');
assert.equal(fx.count, 100); assert.equal(oldest.remaining, 0); assert.equal(oldest.group.parent, null);
assert.throws(() => fx.emit('missing'), RangeError); assert.equal(fx.count, 100);
const clearedMaterials = countDisposals(new Set(meshes(scene).map(p => p.material)));
fx.clear(); fx.clear(); clearedMaterials(1); assert.equal(fx.count, 0); assert.equal(scene.children.length, 0);
for (const { id } of abilities) {
  const handle=fx.emit(id,{origin:vector(),target:vector(),duration:NaN});
  if(id==='turret')assert.equal(handle.group.userData.model.id,'deployed_stapler');else checkSolid(handle.group,id!=='xray');
}
fx.update(2); assert.equal(fx.count, 0);
const finalHandle = fx.emit('aura');
const finalMaterials = countDisposals(new Set(meshes(finalHandle.group).map(p => p.material)));
fx.dispose(); fx.dispose(); fx.clear(); fx.update(1); finalMaterials(1);
geometryDisposed(1); assert.equal(fx.count, 0); assert.equal(scene.children.length, 0);
assert.throws(() => fx.emit('shot'), /disposed/);
turretGeometryDisposed(0);disposeCharacterAssets();turretGeometryDisposed(1);
console.log('PASS: 4 manifest-pinned external GLB heroes/linear palettes/PBR512/real rigid nodes; deployed stapler bearing/pitch;16 unique kit FX+7 generic FX; lifecycle/links/expiry/cap; live xray pooling and direct-point compatibility');

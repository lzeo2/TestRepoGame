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
  assert.ok(hero.metadata.triangles>=120000&&hero.metadata.triangles<=250000);
  assert.ok(hero.metadata.bytes<8388608&&parts.length<=64);
  let triangles=0;
  for(const part of parts) {
    triangles+=(part.geometry.index?.count??part.geometry.attributes.position.count)/3;
    assert.ok(part.material.isMeshStandardMaterial);
    assert.equal(part.material.map.image.width,512);assert.equal(part.material.normalMap.image.height,512);
    assert.ok(part.geometry.attributes.normal&&part.geometry.attributes.uv);
    assert.ok(part.material.roughness>=0&&part.material.roughness<=1&&part.material.metalness>=0&&part.material.metalness<=1);
  }
  assert.equal(triangles,hero.metadata.triangles);
  const bounds = new THREE.Box3().setFromObject(hero.group);
  assert.ok(Math.abs(bounds.min.y) < 1e-6, `${id}: feet at zero`);
  assert.ok(bounds.max.y > 1.5 && bounds.max.y < 2.2, `${id}: body height`);
  for(const name of ['head','torso','arm-left','arm-right','leg-left','leg-right','cape'])assert.ok(hero.group.getObjectByName(name),`${id}/${name}`);
  const geometryDisposed = countDisposals(new Set(parts.map(p => p.geometry)));
  const materialDisposed = countDisposals(new Set(parts.map(p => p.material)));
  hero.group.position.set(12, 3, 7);
  for (const state of ['idle', 'walk', 'dash', 'slide', 'jump', 'fall']) {
    hero.update(0.1, { state, speed: 8, yaw: 0.7, aiming: true });
    near(hero.group.position, vector(12, 3, 7)); assert.equal(hero.group.rotation.y, 0.7);
  }
  assert.equal(hero.group.children[0].scale.y, 1);
  hero.update(0.1, { state: 'slide' }); assert.ok(hero.group.children[0].rotation.x<0);
  assert.equal(hero.group.children[0].userData.pose,'slide');
  hero.update(0); assert.equal(hero.group.children[0].scale.y, 1);assert.equal(hero.group.children[0].rotation.x,0);
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
  checkSolid(handle.group, ability.id !== 'xray'); shapes.add(signature(handle.group));
  assert.equal(handle.position, handle.group.position); assert.equal(handle.remaining, 1);
  near(handle.position, origin); handles.set(ability.id, handle);
}
assert.equal(shapes.size, 16, 'distinct geometry/scale signatures for every kit effect');
assert.equal(fx.count, 16); assert.equal(scene.children.length, 16);
assert.ok(new Set(meshes(scene).map(p => p.geometry)).size <= 6, 'shared geometry kit');
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

const oldest = fx.emit('shot');
for (let i = 0; i < 100; i++) fx.emit('shot');
assert.equal(fx.count, 100); assert.equal(oldest.remaining, 0); assert.equal(oldest.group.parent, null);
assert.throws(() => fx.emit('missing'), RangeError); assert.equal(fx.count, 100);
const clearedMaterials = countDisposals(new Set(meshes(scene).map(p => p.material)));
fx.clear(); fx.clear(); clearedMaterials(1); assert.equal(fx.count, 0); assert.equal(scene.children.length, 0);
for (const { id } of abilities) checkSolid(fx.emit(id, { origin: vector(), target: vector(), duration: NaN }).group, id !== 'xray');
fx.update(2); assert.equal(fx.count, 0);
const finalHandle = fx.emit('aura');
const finalMaterials = countDisposals(new Set(meshes(finalHandle.group).map(p => p.material)));
fx.dispose(); fx.dispose(); fx.clear(); fx.update(1); finalMaterials(1);
geometryDisposed(1); assert.equal(fx.count, 0); assert.equal(scene.children.length, 0);
assert.throws(() => fx.emit('shot'), /disposed/);
disposeCharacterAssets();
console.log('PASS: 4 real120k-250k GLB heroes/PBR512 surfaces/pivots/disposal,16 unique kit FX+7 generic FX; positions/depth/links/expiry/cap');

import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import { createSystems } from './systems.mjs';
import { createObjectiveGuide } from './objective-guide.mjs';

let groups = 0;
function fixture(team = 'carbon') {
  const sim = createSystems();
  const hero = sim.addHero({ id: 'player', team, lane: 'midway' });
  const scene = new THREE.Scene(), labels = [];
  const guide = createObjectiveGuide(scene, { label: (readout, anchor) => labels.push({ readout, anchor }) });
  const camera = new THREE.PerspectiveCamera(70, 16 / 9, .1, 1400);
  const sync = options => guide.sync(sim, camera, { hero, ...options });
  const start = () => { assert.ok(sim.step(30).ok); sim.drainEvents(); };
  const hit = (goal, amount = 1e6) => {
    assert.ok(sim.moveHero(hero.id, { ...goal.position, x: goal.position.x + 1 }).ok);
    const result = sim.damage(goal.id, amount, hero.id, { kind: 'ability' });
    assert.ok(result.ok, result.reason);
    return result;
  };
  return { sim, hero, scene, labels, guide, camera, sync, start, hit };
}
const goalFor = (f, readout) => f.sim.structures.find(s => s.id === readout.goalId);

for (const team of ['carbon', 'ivory']) {
  const f = fixture(team);
  assert.equal(f.sync().goalId, null, 'pregame has no legal target');
  assert.equal(f.scene.children[0].visible, false);
  f.start();
  const readout = f.sync(), goal = goalFor(f, readout);
  assert.equal(goal.lane, 'midway'); assert.equal(goal.type, 'guardian');
  assert.notEqual(goal.team, team); assert.equal(readout.progress, 0);
  const before = JSON.stringify(f.sim.structures);
  f.sync(); assert.equal(JSON.stringify(f.sim.structures), before, 'guide is observational');
  f.hit(goal, 100);
  const damaged = f.sync();
  assert.equal(damaged.hp, goal.hp); assert.equal(damaged.maxHp, goal.maxHp);
  assert.equal(damaged.progress, 1 - goal.hp / goal.maxHp);
  assert.equal(damaged.vulnerable, true); assert.equal(damaged.completion, null);
  assert.equal(f.scene.children[0].children[1].children[1].scale.x, 5 * damaged.hpFraction);
  f.hit(goal);
  const fall = f.sim.events.find(e => e.type === 'objective_fall' && e.id === goal.id);
  assert.ok(fall, 'actual public Host damage produces objective_fall');
  const complete = f.sync();
  assert.equal(complete.completion.event, fall, 'preserve actual event reference for parent cue');
  assert.equal(goalFor(f, complete).type, 'walker');
  assert.equal(f.sync().completion, null, 'same event reference cannot replay');
  assert.equal(f.sync({ events: [{ ...fall }] }).completion, null, 'cloned objective event cannot replay');
  assert.equal(f.sim.winner, null, 'no winner grant');
  f.guide.dispose(); groups++;
}

{
  const f = fixture(); f.start(); const first = f.sync();
  const other = f.sim.structures.find(s => s.team !== f.hero.team && s.lane === 'graft' && s.type === 'guardian');
  f.hit(other);
  assert.equal(f.sync().completion, null, 'unrelated objective fall is not current-goal completion');
  const changed = f.sync({ lane: 'graft' });
  assert.notEqual(changed.goalId, first.goalId); assert.equal(changed.completion, null);
  assert.equal(goalFor(f, changed).type, 'walker');
  const hp = goalFor(f, changed).hp;
  assert.equal(f.sync({ lane: 'midway' }).completion, null, 'lane switch alone never completes a goal');
  assert.equal(goalFor(f, changed).hp, hp);
  f.guide.dispose(); groups++;
}

// Actual Host chain reaches a locked lane: both local shrines must fall, then
// other lanes remain authoritative until all six shrines unlock the Patron.
{
  const f = fixture(); f.start();
  for (let i = 0; i < 6; i++) {
    const readout = f.sync(), goal = goalFor(f, readout);
    assert.equal(goal.lane, 'midway');
    assert.ok(goal.vulnerable); f.hit(goal);
  }
  const readout = f.sync(), goal = goalFor(f, readout);
  assert.notEqual(goal.lane, 'midway'); assert.equal(goal.type, 'guardian');
  assert.ok(goal.alive && goal.vulnerable);
  const patron = f.sim.structures.find(s => s.team !== f.hero.team && s.type === 'patron');
  assert.equal(patron.vulnerable, false);
  while (f.sim.structures.some(s => s.team !== f.hero.team && s.type !== 'patron' && s.alive)) {
    const next = goalFor(f, f.sync()); assert.notEqual(next.type, 'patron'); f.hit(next);
  }
  const p1 = f.sync(); assert.equal(p1.goalId, patron.id); assert.equal(p1.patronPhase, 1);
  f.hit(patron, 1);
  const p2 = f.sync(); assert.equal(p2.patronPhase, 2); assert.equal(p2.completion, null, 'phase retreat is not destruction');
  assert.equal(p2.hp, patron.hp); assert.equal(p2.maxHp, patron.maxHp);
  f.hit(patron);
  const won = f.sync(); assert.equal(f.sim.winner, f.hero.team);
  assert.equal(won.goalId, null); assert.equal(won.completion.goalId, patron.id);
  assert.equal(won.completion.event.type, 'objective_fall'); assert.equal(f.sync().completion, null);
  f.guide.dispose(); groups++;
}

{
  const f = fixture(); f.start();
  const goal = goalFor(f, f.sync()); f.hit(goal);
  const events = f.sim.drainEvents();
  const readout = f.sync({ events: [] });
  assert.equal(readout.completion.goalId, goal.id);
  assert.equal(readout.completion.observedDestruction, true);
  assert.equal(readout.completion.event, null);
  assert.equal(f.sync({ events }).completion, null, 'late actual fall is not a second cue');
  f.guide.dispose(); groups++;
}

{
  const f = fixture(); f.start();
  const readout = f.sync(), goal = goalFor(f, readout);
  f.camera.position.set(goal.position.x, goal.position.y + 16, goal.position.z + 40);
  f.camera.lookAt(goal.position.x, goal.position.y + 16, goal.position.z);
  const on = f.sync(); assert.equal(on.offscreenDirection, null); assert.ok(Math.abs(on.ndc.x) < 1e-6);
  assert.equal(on.occluded, null); assert.match(on.routeHint, /route not checked/);
  const marker = f.scene.children[0];
  assert.equal(marker.position.y, goal.position.y + 16);
  const label = f.labels.at(-1); assert.equal(label.readout.goalId, goal.id);
  assert.ok(label.anchor.equals(marker.position));
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 2), new THREE.MeshBasicMaterial());
  wall.position.copy(marker.position).add(new THREE.Vector3(0, 0, 20)); wall.updateMatrixWorld();
  const ray = new THREE.Raycaster();
  const isOccluded = ({ from, to }) => {
    ray.set(from, to.clone().sub(from).normalize()); ray.far = from.distanceTo(to);
    return ray.intersectObject(wall).length > 0;
  };
  assert.equal(f.sync({ isOccluded }).occluded, true);
  assert.match(f.sync({ isOccluded }).routeHint, /Blocked view/);
  wall.position.x += 100; wall.updateMatrixWorld(); assert.equal(f.sync({ isOccluded }).occluded, false);
  f.camera.lookAt(goal.position.x + 200, goal.position.y + 16, goal.position.z);
  assert.ok(f.sync().offscreenDirection.x < 0, 'offscreen bearing is camera-relative');
  f.camera.lookAt(goal.position.x, goal.position.y + 16, goal.position.z + 80);
  const behind = f.sync(); assert.ok(behind.offscreenDirection);
  assert.ok(Number.isFinite(behind.offscreenDirection.x));
  marker.traverse(o => { if (o.isMesh) assert.equal(o.material.depthTest, true); });
  let releases = 0;
  const resources = new Set(); marker.traverse(o => { if (o.isMesh) { resources.add(o.geometry); resources.add(o.material); } });
  for (const resource of resources) resource.addEventListener('dispose', () => releases++);
  f.guide.dispose(); f.guide.dispose(); assert.equal(releases, 4); assert.equal(f.scene.children.length, 0);
  assert.equal(f.labels.at(-1).readout, null); assert.equal(f.sync(), null);
  wall.geometry.dispose(); wall.material.dispose(); groups++;
}

{
  const f = fixture(); f.start(); const goal = goalFor(f, f.sync()); f.hit(goal);
  const event = f.sim.events.find(e => e.type === 'objective_fall');
  event.eventId = 'receipt-1';
  assert.equal(f.sync().completion.event, event);
  assert.equal(f.sync({ events: [{ ...event }] }).completion, null);
  // Reusing a guide with a fresh actual host resets event/destruction history.
  const fresh = createSystems(), hero = fresh.addHero({ id: 'player', team: 'carbon', lane: 'midway' });
  fresh.step(30);
  const readout = f.guide.sync(fresh, f.camera, { hero });
  assert.equal(readout.goalId, goal.id); assert.equal(readout.completion, null);
  f.guide.dispose(); groups++;
}
console.log(`objective-guide-test: ${groups} groups passed; actual Host chain/HP/falls/Patron phases, locked-lane fallback, event dedup, projection, injected wall occlusion and disposal (Node Scene CPU, not native visuals)`);

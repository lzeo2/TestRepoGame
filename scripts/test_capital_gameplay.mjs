import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = async url => {
  let source = await readFile(url, 'utf8');
  for (const match of [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)]) source = source.replace(match[1], await moduleURL(new URL(match[1], url)));
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};
const moduleFrom = async path => import(await moduleURL(new URL(path, import.meta.url)));
const { createGameplay } = await moduleFrom('../Games/Capital Drive/gameplay.js');
const { createSimulation } = await moduleFrom('../Games/Capital Drive/simulation.js');
const map = { bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 },
  roads: [{ id: 'main', points: [[-400, 0], [400, 0]], nodes: [1, 2], width: 12, speed: 40 }],
  buildings: [{ id: 'wall', points: [[15, -30], [18, -30], [18, 30], [15, 30]], height: 8 }],
  spawn: { x: 0, z: 0, yaw: 0 }, landmarks: [] };
const simulation = createSimulation(map, { trafficCount: 0 });
let strikeArgs, respawns = [], changes = [], events = [];
const pedestrians = { snapshot: () => [{ x: 4, z: 4, health: 100 }],
  strike: args => { strikeArgs = args; return { hits: 1, people: [{ id: 1 }] }; },
  alert() {}, drainEvents: () => events.splice(0) };
const game = createGameplay(map, simulation, { pedestrians, hasPistol: () => true, onRespawn: reason => respawns.push(reason), onVehicleChanged: v => changes.push(v) });
const tick = (seconds, input = {}) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) game.step(1 / 60, input); };
assert.equal(game.focus(), simulation.player);
simulation.player.speed = 8;
assert.equal(game.interact(), false); assert.equal(simulation.player.speed, 0);
assert.equal(game.interact(), true); assert.equal(game.state.mode, 'foot');
assert.equal(game.focus(), game.state.actor);
const start = { ...game.state.actor }; tick(1, { moveZ: -1 });
const walked = Math.hypot(game.state.actor.x - start.x, game.state.actor.z - start.z);
assert(walked > 3.4 && walked < 3.8);
const walkEnd = game.state.actor.z; tick(1, { moveZ: -1, sprint: true });
assert(walkEnd - game.state.actor.z > 6.5);
tick(0.2, { jump: true }); assert(game.state.actor.jumpHeight > 0); tick(1); assert.equal(game.state.actor.jumpHeight, 0);
const frozen = JSON.stringify(game.snapshot()); game.step(0, { fire: true, jump: true }); assert.equal(JSON.stringify(game.snapshot()), frozen);
// Position a fixture actor before a real polygon, aim through it, and verify clipped hit adapter.
Object.assign(game.state.actor, { x: 10, z: 0, yaw: -Math.PI / 2 });
game.addAmmo(84); game.setWeapon('pistol'); game.step(1 / 60, { aim: true, aimYaw: -Math.PI / 2, fire: true });
assert(strikeArgs.range > 4.8 && strikeArgs.range < 5);
assert.equal(game.state.ammo, 11); assert.equal(game.state.shots.length, 1);
game.step(1 / 60, { fire: true }); assert.equal(game.state.ammo, 11, 'fire cooldown');
assert(game.reload()); tick(1.5); assert.equal(game.state.ammo, 12); assert.equal(game.state.reserveAmmo, 71);
assert.equal(game.state.wanted > 0, true);
// Police on the opposite side of the building must search and cannot arrest through it.
game.state.police.splice(0, game.state.police.length, ...Array.from({ length: 4 }, (_, i) => ({ id: `test${i}`, x: 23, z: i, yaw: 0, speed: 0, health: 100, searchTime: 0 })));
game.state.wanted = 5; game.step(1 / 60);
assert(game.state.police.every(p => !p.seesPlayer)); assert.equal(game.state.pursuit, 'search');
assert(game.state.police.length <= 4);
const heat = game.state.heat; tick(1); assert(game.state.heat < heat);
game.reportOffence('theft', 1, { witnessed: true }); assert(game.state.heat > heat - 1);
// A lost-sight fixture cannot retain pursuit indefinitely.
game.state.police.forEach(p => { p.health = 0; }); tick(75); assert.equal(game.state.wanted, 0); assert.equal(game.state.police.length, 0);
// Nearby adult retaliation changes health once per cooldown, never through the wall.
events.push({ type: 'retaliation', kind: 'melee', x: 11, z: 0, damage: 5 });
game.step(1 / 60); assert.equal(game.state.health, 95);
events.push({ type: 'retaliation', kind: 'melee', x: 11, z: 0, damage: 5 });
game.step(1 / 60); assert.equal(game.state.health, 95);
// A stationary driver can be arrested by visible officers after a real hold period.
game.reset(); game.reportOffence('fixture arrest', 1, { witnessed: true });
game.state.police.splice(0, game.state.police.length, ...Array.from({ length: 4 }, (_, i) => ({ id: `arrest${i}`,
  x: simulation.player.x + 3, z: simulation.player.z, yaw: 0, speed: 0, health: 100, mode: 'foot', searchTime: 0 })));
const serial = game.state.respawnSerial; tick(3.6);
assert(game.state.recovery); assert.equal(game.state.respawnSerial, serial); tick(3.5);
assert.equal(game.state.respawnSerial, serial + 1); assert.equal(respawns.at(-1), 'arrest');
assert.equal(game.state.wanted, 0); assert.equal(game.state.arrestProgress, 0);
respawns.length = 0;
// Explicitly unwitnessed and sandbox offences do not raise police.
game.reset(); assert.equal(game.reportOffence('theft', 1, { witnessed: false }), false);
game.reset({ sandbox: true }); assert.equal(game.reportOffence('gunfire', 3, { witnessed: true }), false);
simulation.player.crashes += 7; tick(0.1); assert.equal(respawns.length, 0); assert.equal(game.state.wanted, 0);
game.reset({ sandbox: false });
// Scraping and small bumps cannot send a healthy driver to hospital.
simulation.player.lastImpactSpeed = 3;
for (let i = 0; i < 30; i++) { simulation.player.crashes++; tick(0.05); }
assert.equal(game.state.vehicleHealth, 100); assert.equal(game.state.health, 100);
simulation.player.lastImpactSpeed = 10; simulation.player.crashes++; tick(0.05);
const dented = game.state.vehicleHealth;
assert(dented < 100 && dented >= 90); assert.equal(game.state.health, 100);
for (let i = 0; i < 10; i++) { simulation.player.crashes++; game.step(0); }
assert.equal(game.state.vehicleHealth, dented, 'pause freezes crash damage and its cooldown');
for (let i = 0; i < 10; i++) { simulation.player.crashes++; tick(0.05); }
assert.equal(game.state.vehicleHealth, dented, 'pinned-wall contacts share a brief cooldown');
// Repeated moderate impacts can disable the car without injuring its driver.
for (let i = 0; i < 16; i++) { tick(0.9); simulation.player.crashes++; tick(0.05); }
assert.equal(game.state.vehicleHealth, 0); assert.equal(game.state.health, 100);
assert.equal(game.state.recovery, null); assert.equal(respawns.length, 0);
simulation.player.speed = 5; tick(0.05); assert.equal(simulation.player.speed, 0);
assert(game.interact(), 'healthy driver can leave a disabled car');
game.reset(); simulation.player.lastImpactSpeed = 36;
for (let i = 0; i < 3; i++) { tick(0.9); simulation.player.crashes++; tick(0.05); }
assert(game.state.recovery); assert.equal(respawns.length, 0);
const recovering = game.snapshot(); game.step(0); assert.deepEqual(game.snapshot(), recovering);
tick(3.5);
assert.equal(respawns.at(-1), 'knockout'); assert.equal(respawns.length, 1);
assert.equal(game.state.health, 100); assert.equal(game.state.vehicleHealth, 100);
// Enter source with exact metadata and preserve claim state.
simulation.setParkedCars([{ id: 'test-parked', x: 8, z: 0, yaw: 0, modelId: 'orchard', color: 0xabcdef }]);
simulation.teleport({ x: 0, z: 0 }); game.reset(); game.interact(); Object.assign(game.state.actor, { x: 6, z: 0 });
assert(game.interact()); assert.equal(game.state.vehicle.modelId, 'orchard'); assert.equal(game.state.vehicle.color, 0xabcdef); assert.equal(changes.length, 1);
assert.equal(game.state.vehicle.stolen, true); assert.equal(game.state.mode, 'vehicle');
const snap = game.snapshot(); assert(Object.isFrozen(snap.actor)); assert.throws(() => { snap.health = 0; });
// Full source map exercises actual indexed collision/LOS and finite long-run police movement.
const actual = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url), 'utf8'));
const realSimulation = createSimulation(actual, { trafficCount: 0 });
const realGame = createGameplay(actual, realSimulation);
assert(realGame.interact(), 'can exit the actual spawn car');
const realStart = { ...realGame.state.actor };
for (let i = 0; i < 600; i++) realGame.step(1 / 60, { moveX: Math.cos(i / 80), moveZ: Math.sin(i / 80), sprint: true });
assert(Math.hypot(realGame.state.actor.x - realStart.x, realGame.state.actor.z - realStart.z) < 70);
realGame.reportOffence('fixture report', 5, { witnessed: true });
for (let i = 0; i < 1800; i++) {
  realGame.step(1 / 60, { moveZ: 1 });
  for (const p of realGame.state.police) {
    assert(Number.isFinite(p.x) && Number.isFinite(p.z));
    if (p.seesPlayer) assert(realSimulation.hasLineOfSight(p, realGame.focus()));
    assert(p.x >= actual.bounds.minX && p.x <= actual.bounds.maxX);
    assert(p.z >= actual.bounds.minZ && p.z <= actual.bounds.maxZ);
  }
  assert(realGame.state.police.length <= 4);
}
console.log('Capital gameplay: foot collision/sprint/jump, entry/theft, combat occlusion/ammo, wanted/search, sandbox, respawn and actual-map finite police PASS');

// Reproduce innocent stationary player beside frightened adults on the real map.
const threeText = await readFile(new URL('../assets/car-arcade/vendor/three.module.js', import.meta.url), 'utf8');
const threeURL = `data:text/javascript;base64,${Buffer.from(threeText).toString('base64')}`;
const THREE = await import(threeURL);
const pedestrianText = (await readFile(new URL('../Games/Capital Drive/pedestrians.js', import.meta.url), 'utf8'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL));
const { createPedestrians } = await import(`data:text/javascript;base64,${Buffer.from(pedestrianText).toString('base64')}`);
const attributionSimulation = createSimulation(actual, { trafficCount: 0 });
const actualAdults = createPedestrians(new THREE.Scene(), actual, () => 0);
const innocentGame = createGameplay(actual, attributionSimulation, { pedestrians: actualAdults });
assert(innocentGame.interact());
const adult = actualAdults.snapshot()[0];
actualAdults.update(innocentGame.focus(), 0.1, [{ id: 'traffic:23', x: adult.x, z: adult.z, speed: 25 }]);
assert.notEqual(actualAdults.snapshot()[0].reaction, 'calm');
innocentGame.step(1 / 60);
assert.equal(innocentGame.state.wanted, 0, 'actual-map AI reckless driving cannot implicate a stationary on-foot player');
assert.equal(innocentGame.state.health, 100);
actualAdults.resetPopulation(actual.spawn);
actualAdults.alert({ x: adult.x, z: adult.z, kind: 'gunshot' });
innocentGame.step(1 / 60);
assert(innocentGame.state.wanted > 0, 'player gunfire witnesses still report the offence');
actualAdults.dispose();
// Defensive event consumer also rejects external NPC offence/retaliation descriptors.
game.reset(); game.interact();
events.push({ type: 'witness', kind: 'reckless', offenderId: 'traffic:9' },
  { type: 'offence', kind: 'assault', offenderId: 'traffic:9' },
  { type: 'retaliation', targetId: 'traffic:9', x: game.state.actor.x, z: game.state.actor.z, damage: 20 });
game.step(1 / 60);
assert.equal(game.state.wanted, 0); assert.equal(game.state.health, 100);
assert.equal(game.reportOffence('reckless', 1, { witnessed: true, offenderId: 'traffic:9' }), false);
events.push({ type: 'witness', kind: 'reckless', offenderId: 'player' });
game.step(1 / 60); assert(game.state.wanted > 0, 'explicit player reckless report still raises wanted');
console.log('Capital gameplay: actual-map AI panic leaves innocent player clear; explicit player offences still report PASS');

// Reckless reporting has its own long cooldown, with combat still immediate.
game.reset();
events.push({ type: 'witness', kind: 'reckless', offenderId: 'player' });
game.step(1 / 60); assert.equal(game.state.wanted, 1);
events.push({ type: 'witness', kind: 'gunshot', offenderId: 'player' });
game.step(1 / 60); assert.equal(game.state.wanted, 2, 'reckless reporting cannot delay witnessed gunfire');
tick(1.1);
events.push({ type: 'witness', kind: 'reckless', offenderId: 'player' });
game.step(1 / 60); assert.equal(game.state.wanted, 2, 'multiple adults cannot rapidly stack reckless reports');
for (let i = 0; i < 600; i++) game.step(0);
events.push({ type: 'witness', kind: 'reckless', offenderId: 'player' });
game.step(1 / 60); assert.equal(game.state.wanted, 2, 'pause preserves reckless cooldown');
events.push({ type: 'witness', kind: 'assault', offenderId: 'player' });
game.step(1 / 60); assert.equal(game.state.wanted, 3, 'actual assault remains promptly reported');
console.log('Capital gameplay: independent reckless/combat report cooldowns and pause PASS');

// Regenerate the real sim-event fixture; no DOM, renderer, UI or state grants.
import assert from 'node:assert/strict';
import { readFileSync, statfsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createSimulation } from '../../Games/Citisten3D/sim.mjs';

const sim = createSimulation({ size: 24, mode: 'defense', seed: 8 });
sim.roads.place({ x: 0, z: 11 }, { x: 23, z: 11 });
sim.roads.place({ x: 13, z: 0 }, { x: 13, z: 23 });
const towers = [[9, 9], [15, 9], [9, 15], [15, 15]];
for (const [x, z] of towers) assert(sim.place('watchtower', x, z).ok);
for (const [x, z] of [[12, 11], [13, 12], [12, 13], [11, 12]]) {
  sim.roads.set(x, z, false); assert(sim.place('wall', x, z).ok);
}
const fixture = {
  scope: 'Deterministic FX event replay, not agent trajectories or gameplay acceptance',
  size: 24, lotSize: 10, seed: 8, stepSeconds: 0.25,
  sourceSha256: Object.fromEntries(['sim.mjs', 'roads.mjs'].map(name => [name,
    createHash('sha256').update(readFileSync(new URL(`../../Games/Citisten3D/${name}`, import.meta.url))).digest('hex')])),
  roads: [...sim.roads.cells].map(k => sim.roads.cell(k)),
  buildings: sim.state.buildings.map(b => ({ id: b.id, type: b.type, x: b.x, z: b.z, hp: b.hp, maxHp: b.maxHp })),
  events: []
};
sim.drainEvents();
const types = new Set(['wave', 'shot', 'kill', 'damaged', 'destroyed', 'removed', 'repaired', 'night-survived', 'lost']);
for (let step = 0; step < 4000 && sim.state.phase !== 'lost'; step++) {
  sim.update(0.25);
  fixture.events.push(...sim.drainEvents().filter(e => types.has(e.type)));
  if (sim.state.score === 2 && sim.state.buildings.some(b => b.type === 'watchtower')) {
    for (const [x, z] of towers) assert(sim.bulldoze(x, z).ok);
    for (const b of sim.state.buildings) if (b.hp < b.maxHp) assert(sim.repair(b.id).ok);
  }
}
const waves = fixture.events.filter(e => e.type === 'wave').map(e => e.count);
const hallDamage = fixture.events.filter(e => e.type === 'damaged' && e.id === 1).reduce((n, e) => n + e.amount, 0);
const shots = fixture.events.filter(e => e.type === 'shot').length;
assert.deepEqual(waves, [12, 14, 16]);
assert.equal(shots, 104); assert.equal(hallDamage, 600);
assert.equal(sim.state.score, 2); assert.equal(sim.state.kills, 26);
assert.equal(sim.state.phase, 'lost'); assert.equal(sim.state.townHallHp, 0);
fixture.expected = { waves, shots, hallDamage, score: sim.state.score, kills: sim.state.kills, townHallHp: sim.state.townHallHp, endTime: sim.state.time };
const disk = statfsSync(new URL('../../', import.meta.url), { bigint: true });
assert(disk.bavail * disk.bsize >= 2178940928n, 'Disk guard: stop growing below floor');
writeFileSync(new URL('./sim-fx-replay.json', import.meta.url), JSON.stringify(fixture, null, 2) + '\n');
console.log(`FX replay: ${fixture.events.length} events, ${shots} shots, ${hallDamage} hall damage, score ${sim.state.score}, kills ${sim.state.kills}, loss at ${sim.state.time}s`);

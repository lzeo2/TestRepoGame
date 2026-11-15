import assert from 'node:assert/strict';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';

const map = { bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 },
  roads: [], buildings: [], spawn: { x: 200, z: 200, yaw: 0 } };
function fixture({ sandbox = false, buildings = [], room = null, clip } = {}) {
  const world = { ...map, buildings }, simulation = createSimulation(world, { trafficCount: 0 }), events = [];
  const actorSimulation = { ...simulation, drainVehicleImpacts: () => events.splice(0) };
  if (clip) actorSimulation.moveActor = (actor, dx, dz, radius) => {
    const clipped = clip(actor, dx, dz, radius);
    const result = simulation.moveActor(actor, clipped.dx, clipped.dz, radius);
    return { ...result, blocked: result.blocked || clipped.blocked };
  };
  const gameplay = createGameplay(world, actorSimulation, { sandbox, getInterior: () => room });
  gameplay.reset({ sandbox, onFoot: true, startPose: { x: 0, z: 0, yaw: 0 } });
  const hit = (speed = 28, extra = {}) => events.push({ targetId: 'player-body', offenderId: 'traffic:1',
    speed, vx: speed, vz: 0, interiorId: null, ...extra });
  const tick = (seconds, input = {}) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) gameplay.step(1 / 60, input); };
  return { gameplay, simulation, events, hit, tick };
}

const fast = fixture(); fast.hit(); fast.gameplay.step(1 / 60);
assert(fast.gameplay.state.actor.jumpHeight > 0, 'high-speed impact enters existing jump physics');
assert(fast.gameplay.state.actor.x > .1, 'actual actor moves horizontally, not just a pose effect');
assert(fast.gameplay.state.health < 100 && !fast.gameplay.state.recovery);
assert.equal(fast.gameplay.state.wanted, 0, 'being hit does not accuse the victim');
assert.equal(fast.gameplay.interact(), false, 'airborne player cannot board a nearby vehicle');
const paused = fast.gameplay.snapshot(); fast.hit(); fast.gameplay.step(0);
assert.deepEqual(fast.gameplay.snapshot(), paused, 'pause freezes launch, health and cooldown');
assert.equal(fast.events.length, 1, 'pause does not drain pending contacts');
fast.gameplay.step(1 / 60); assert.equal(fast.gameplay.state.health, paused.health, 'blocked repeated contacts cannot stack damage');
fast.tick(2.8);
assert.equal(fast.gameplay.state.actor.jumpHeight, 0, 'launched actor lands');
assert.equal(fast.gameplay.state.actor.impactTime, 0, 'bounded recovery releases normal controls');
assert(fast.gameplay.state.actor.x > 4 && fast.gameplay.state.actor.x < 15, 'flight has visible bounded travel');
const landedX = fast.gameplay.state.actor.x; fast.tick(.5, { moveX: -1 });
assert(fast.gameplay.state.actor.x < landedX - 1.7, 'walking resumes after landing');
const gettingUp = fixture(); gettingUp.hit(); gettingUp.tick(1.5);
assert.equal(gettingUp.gameplay.state.actor.jumpHeight, 0);
assert(gettingUp.gameplay.state.actor.impactTime > 1, 'get-up remains bounded after landing');
const gettingUpX = gettingUp.gameplay.state.actor.x, impactSerial = gettingUp.gameplay.state.actor.impactSerial;
gettingUp.hit(3); gettingUp.tick(.2, { moveX: -1, melee: true, jump: true });
assert(gettingUp.gameplay.state.actor.x >= gettingUpX, 'ordinary movement remains blocked through get-up');
assert.equal(gettingUp.gameplay.state.attackSerial, 0, 'attacks remain blocked through get-up');
assert.equal(gettingUp.gameplay.state.actor.jumpHeight, 0, 'jump cannot bypass get-up');
assert.equal(gettingUp.gameplay.state.actor.impactSerial, impactSerial, 'a mild contact cannot restart or shorten an ongoing tumble');
assert.equal(gettingUp.gameplay.interact(), false);

const slow = fixture(); slow.hit(3); slow.tick(.5);
assert.equal(slow.gameplay.state.actor.jumpHeight, 0, 'low-speed contact stays grounded');
assert.equal(slow.gameplay.state.health, 100, 'gentle bumps do not injure');
assert(slow.gameplay.state.actor.x > 0 && slow.gameplay.state.actor.x < .2, 'low-speed bump remains mild');
const sandbox = fixture({ sandbox: true }); sandbox.hit(); sandbox.tick(.2);
assert(sandbox.gameplay.state.actor.jumpHeight > 0 && sandbox.gameplay.state.actor.x > 1);
assert.equal(sandbox.gameplay.state.health, 100, 'Free roam preserves invulnerability while showing impact');

const wall = fixture({ buildings: [{ id: 'wall', height: 4, points: [[2, -5], [2.05, -5], [2.05, 5], [2, 5]] }] });
wall.hit(1000); wall.tick(2.8);
assert(wall.gameplay.state.actor.x <= 1.550001, 'flight sweeps stop at a thin wall');
assert.equal(wall.gameplay.state.actor.jumpHeight, 0, 'blocked flight still lands');
const person = fixture({ clip: (actor, dx, dz, radius) => {
  const allowed = Math.max(0, 2 - radius - .35 - actor.x);
  return { dx: Math.min(dx, allowed), dz, blocked: dx > allowed };
} });
person.hit(); person.tick(2.8);
assert(person.gameplay.state.actor.x <= 1.200001, 'injected shared adult clipping stops knockback');
assert.equal(person.gameplay.state.actor.jumpHeight, 0);

for (const extra of [{ targetId: 'other' }, { speed: NaN }, { vx: Infinity }, { vx: 0, vz: 0 },
  { interiorId: 'other-room' }, { offenderId: null }]) {
  const invalid = fixture(); invalid.hit(28, extra); invalid.tick(.1);
  assert.equal(invalid.gameplay.state.actor.x, 0); assert.equal(invalid.gameplay.state.health, 100);
}
const indoors = fixture({ room: { id: 'inside' } }); indoors.hit(); indoors.tick(.1);
assert.equal(indoors.gameplay.state.actor.x, 0, 'outdoor car cannot hit an overlapping indoor player');
const driving = fixture(); driving.gameplay.reset(); driving.hit(); driving.tick(.1);
assert.equal(driving.gameplay.state.health, 100); assert.equal(driving.gameplay.state.actor.impactTime, 0);
const clampA = fixture(), clampB = fixture(); clampA.hit(); clampB.hit();
clampA.gameplay.step(10); clampB.gameplay.step(.05);
assert.deepEqual(clampA.gameplay.snapshot(), clampB.gameplay.snapshot(), 'supplied dt clamps to the existing active-step maximum');
const reset = fixture(); reset.hit(); reset.gameplay.step(.05); reset.gameplay.reset({ onFoot: true, startPose: { x: 0, z: 0 } }); reset.tick(.2);
assert.equal(reset.gameplay.state.actor.x, 0); assert.equal(reset.gameplay.state.actor.jumpHeight, 0);
assert.equal(reset.gameplay.state.actor.impactStrength, 0, 'reset clears transient momentum and pose');
const knockout = fixture(); knockout.gameplay.state.health = 1; knockout.hit(); knockout.gameplay.step(.05);
assert.equal(knockout.gameplay.state.health, 0);
assert.equal(knockout.gameplay.state.recovery, null, 'lethal vehicle hit still shows its real bounded fall');
assert(knockout.gameplay.state.actor.jumpHeight > 0);
knockout.tick(1.5, { melee: true, jump: true, moveZ: 1 });
assert.equal(knockout.gameplay.state.actor.jumpHeight, 0);
assert.equal(knockout.gameplay.state.attackSerial, 0);
assert.equal(knockout.gameplay.state.recovery, null, 'fallen body settles before transfer');
knockout.tick(1.2);
assert(knockout.gameplay.state.recovery); assert.equal(knockout.gameplay.state.actor.impactTime, 0);
const recovery = knockout.gameplay.snapshot(); knockout.hit(); knockout.tick(.1);
assert.equal(knockout.gameplay.state.health, recovery.health, 'recovery ignores newly queued impacts');

// Integration: an actual swept external car contact must reach Gameplay before
// braking erases the impact speed. Source-level event guards are tested above.
const simulation = createSimulation(map, { trafficCount: 0 });
const game = createGameplay(map, simulation);
game.reset({ onFoot: true, startPose: { x: 0, z: 0 } });
const car = { id: 'yoober', x: 0, z: 6, yaw: 0, speed: 28, vx: 0, vz: -28, length: 4.5, width: 1.8, active: true };
simulation.setExternalVehicles([car]);
simulation.setExternalPeople([{ id: 'player-body', x: 0, z: 0, radius: .35 }]);
assert(simulation.moveVehicle(car, 0, -5).blocked);
car.speed = 0; car.vz = 0;
game.step(1 / 60);
assert(game.state.actor.jumpHeight > 0 && game.state.actor.z < 0, 'real physical contact launches the on-foot player using captured pre-stop velocity');
for (let i = 0; i < 120; i++) game.step(1 / 60);
assert.equal(game.state.actor.jumpHeight, 0);
console.log('Capital vehicle impacts: physical contact launch/landing, mild bumps, swept walls/adults, attribution, sandbox, pause/dt clamp, reset/recovery and room guards PASS');

// Source-domain crime actions. Explicit placements are fixtures, never natural travel.
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { pointOnLane } from '../Games/Capital Drive/simulation.js';

function progressionHandoff(source, environment) {
  const start = source.indexOf('  for (const event of progression.drainEvents()) {', source.indexOf('function updateCareer()'));
  const end = source.indexOf('  finishDeveloperPreview();', start);
  assert(start >= 0 && end > start, 'actual controller Progression event handoff exists');
  const helperStart = source.indexOf('function recordCameraWorkEvent(');
  const helperEnd = source.indexOf('\n}', helperStart) + 2;
  assert(helperStart >= 0 && helperEnd > helperStart, 'actual camera work-report adapter exists');
  // Real camera detection is covered by the city controller suite. This receipt
  // fixture records its notification without adding a second world simulation.
  const cameraReports = [];
  const environmentCopy = { workCompletion: { serial: 0 }, heistOutcome: { serial: 0 }, cameraReports,
    recordCameraCrime(kind, point, alreadyReported) { cameraReports.push({ kind, point, alreadyReported }); },
    clearInput() {}, notify() {}, saveCareer() {}, isSandbox: () => false, ...environment };
  return () => { runInNewContext(source.slice(helperStart, helperEnd)+'\n'+source.slice(start, end), environmentCopy); return environmentCopy; };
}

export async function executeCampaignCrime({ kind, target, fixture, ctx, active, tick,
  source, progression, people, actor, plan, gameplay }) {
  assert(gameplay && typeof tick === 'function', 'real Gameplay and campaign clock required');
  const { simulation, interiors, map } = fixture;
  let elapsed = 0, inputEdges = 0;
  const limits = ['Explicit actor/vehicle placements are fixture setup; natural driving, pursuit escape and survival are unverified.'];
  const advance = (dt, update) => { update?.(); elapsed += dt; tick(dt); };
  if (kind === 'stolen') {
    interiors.reset();
    // Select a checked lane near the live context, then add an occupied traffic
    // descriptor. Simulation derives occupancy from membership, never a test flag.
    const origin = ctx.pose;
    const edges = simulation.graph.edges.filter(edge => edge.length > 12)
      .map(edge => ({ edge, position: Math.min(edge.length / 2, 12), gap: Math.hypot(edge.from.x - origin.x, edge.from.z - origin.z) }))
      .sort((a, b) => a.gap - b.gap);
    let setup = null;
    for (const item of edges) {
      const car = { ...pointOnLane(item.edge, item.position), id: `crime-fixture:${active.id}:${active.stage}`,
        modelId: 'lantern', color: 0xd4d7d3, speed: 0, active: true, edge: item.edge, position: item.position };
      if (!simulation.canOccupy(car)) continue;
      for (const sign of [1, -1]) {
        const body = { x: car.x + Math.cos(car.yaw) * 3 * sign,
          z: car.z - Math.sin(car.yaw) * 3 * sign, yaw: car.yaw };
        const exit={x:car.x+Math.cos(car.yaw)*2*sign,z:car.z-Math.sin(car.yaw)*2*sign,yaw:car.yaw};
        if (Math.hypot(body.x - simulation.player.x, body.z - simulation.player.z) > 7 &&
          !simulation.moveActor({ ...body }, 0, 0, .45).blocked && simulation.hasLineOfSight(body, car) &&
          !simulation.moveActor({...exit},0,0,.45).blocked && simulation.hasLineOfSight(car,exit)) { setup = { car, body }; break; }
      }
      if (setup) break;
    }
    assert(setup, 'checked occupied vehicle and adjacent on-foot approach available');
    simulation.traffic.push(setup.car);
    gameplay.state.mode = 'foot'; Object.assign(gameplay.state.actor, setup.body);
    const sync = () => Object.assign(ctx, { pose: gameplay.focus(), onFoot: gameplay.state.mode === 'foot',
      vehicle: { ...gameplay.state.vehicle }, vehicleHealth: gameplay.state.vehicleHealth,
      health: gameplay.state.health, wanted: gameplay.state.wanted, respawnSerial: gameplay.state.respawnSerial, interior: null });
    const live = simulation.nearbyVehicles(setup.body.x, setup.body.z, 7).find(car => car.id === setup.car.id);
    assert(live?.occupied, 'actual Simulation reports fixture as occupied');
    assert(gameplay.interact(),'normal interaction takes the actual stopped occupied fixture');
    sync();
    assert.equal(gameplay.state.mode, 'vehicle');
    assert.equal(gameplay.state.carjacking, null);
    assert.equal(gameplay.state.vehicle.stolen, true, 'stolen state comes from real claimVehicle result');
    assert.equal(setup.car.active, false, 'Simulation consumed exactly the occupied fixture');
    return { status: 'DOMAIN_PASS', simulatedSeconds: elapsed, inputEdges,
      domainReceipt: { vehicle: { ...gameplay.state.vehicle }, consumedVehicleId: setup.car.id },
      gates: ['checked occupied traffic placement', 'actual Gameplay interact with clear driver exit', 'Simulation claimVehicle consumption', 'authoritative stolen vehicle state'], limitations: limits };
  }
  assert.equal(kind, 'robbery');
  assert(plan && people && actor && interiors.active === plan, 'actual live entered room and people required');
  const order = { cashier: 0, shopkeeper: 1, cook: 2 };
  const employee = people.snapshot().filter(p => p.role in order && p.health > 0)
    .sort((a, b) => order[a.role] - order[b.role] || Math.hypot(a.x - actor.x, a.z - actor.z) - Math.hypot(b.x - actor.x, b.z - actor.z))[0];
  assert(employee, 'live employee exists');
  // Probe real room-clear approach positions rather than place inside a counter.
  let placement = null;
  placementSearch: for (const radius of [1.4, 1.9, 2.2]) for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    const body = { x: employee.x + Math.cos(angle) * radius, z: employee.z + Math.sin(angle) * radius };
    if (!interiors.moveActor({ ...body }, 0, 0, .45).blocked && interiors.hasLineOfSight(body, employee) &&
      Math.hypot(body.x - plan.counter.x, body.z - plan.counter.z) <= 4) { placement = body; break placementSearch; }
  }
  assert(placement, 'clear employee approach within service and melee range exists');
  Object.assign(actor, placement, { yaw: Math.atan2(actor.x - employee.x, actor.z - employee.z), interiorId: plan.id });
  // Recompute after placement, then use the actual adult-hit threat owner.
  actor.yaw = Math.atan2(actor.x - employee.x, actor.z - employee.z);
  const strike = people.strike({ ...actor, range: 2.3, damage: 25, kind: 'melee', hasLineOfSight: interiors.hasLineOfSight });
  assert(strike.people.some(p => p.id === employee.id), 'actual melee confronts live employee'); inputEdges++;
  const liveTarget = () => people.getCrimeTarget(employee.id);
  assert(liveTarget()?.threatened && liveTarget().health > 0, 'owner-derived living threatened target');
  Object.assign(ctx, { pose: actor, onFoot: true, interior: { storeId: plan.storeId, roomId: plan.id, atCounter: true } });
  progression ||= createProgression(map, null, { interactiveRobbery: true,
    crimeTarget: id => people.getCrimeTarget(id), robberyTarget: () => liveTarget(),
    servicePosition: site => site.id === plan.storeId ? plan.counter : null,
    canUseService: site => site.id === plan.storeId, hasLineOfSight: interiors.hasLineOfSight });
  const handoff = progressionHandoff(source, { progression, gameplay, simulation, focus: () => actor,
    heistOutcome: ctx.heist || { serial: 0 } });
  const before = ctx.heist?.serial || 0, cash = progression.state.cash;
  const admitted = progression.startActivity(target.storeId, 'robbery', ctx);
  assert(admitted.ok, admitted.message); inputEdges++;
  const startEnvironment = handoff(); ctx.wanted = gameplay.state.wanted;
  assert.equal(startEnvironment.cameraReports.length, 1, 'a witnessed robbery is available to camera surveillance');
  assert.equal(startEnvironment.cameraReports[0].alreadyReported, true, 'the camera adapter tags the observation to avoid duplicate pressure');
  assert.equal(startEnvironment.heistOutcome.serial, before, 'starting crime does not award till receipt');
  while (progression.state.activity && elapsed < 6) {
    people.setCrime(progression.state.activity);
    people.update(.05, { actor, hasLineOfSight: interiors.hasLineOfSight });
    progression.update(.05, ctx);
    advance(.05);
  }
  const terminal = handoff(); ctx.heist = terminal.heistOutcome; ctx.wanted = gameplay.state.wanted;
  assert.equal(ctx.heist.serial, before + 1, 'actual updateCareer handoff produces fresh receipt');
  assert.equal(ctx.heist.storeId, target.storeId); assert.equal(ctx.heist.kind, 'robbery');
  assert(progression.state.cash > cash, 'actual till reward paid');
  assert.equal(progression.state.robberyCooldowns[target.storeId], 180);
  people.setCrime(null);
  return { status: 'DOMAIN_PASS', simulatedSeconds: elapsed, inputEdges, domainReceipt: { ...ctx.heist },
    gates: ['live employee', 'real room collider and LOS', 'actual melee threat owner', 'Progression robbery admission', 'five-second live handover', 'actual updateCareer receipt handoff'],
    limitations: [...limits, 'Employee confrontation calls real InteriorPeople strike directly; Gameplay melee admission and retaliation damage are not measured.'] };
}

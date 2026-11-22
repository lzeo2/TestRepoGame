// Normal campaign chains with explicitly labelled fixture travel and real domain actions.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import {createBurglary} from '../Games/Capital Drive/burglary.js';
import { createCampaignFixture } from './capital-campaign-fixture.mjs';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { createInteriorActivities, isWorkoutKind } from '../Games/Capital Drive/interior-activities.js';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { createInteriorPeople } from '../Games/Capital Drive/interior-people.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createRecon } from '../Games/Capital Drive/recon.js';

const args = process.argv.slice(2), outputIndex = args.indexOf('--output');
if (args.includes('--help')) { console.log('node scripts/test_capital_campaign_playability.mjs [--output report.json]\nNormal campaign chains with real domain inputs and fixture travel; no native beatability claim.'); process.exit(0); }
if (outputIndex >= 0 && !args[outputIndex + 1]) throw new Error('--output needs a JSON filename');
const source = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
function extract(name) {
  const start = source.indexOf(`function ${name}(`), body = source.indexOf('){', start) + 1;
  assert(start >= 0 && body > start, `actual controller ${name} exists`);
  let depth = 1, end = body + 1;
  for (; depth && end < source.length; end++) depth += (source[end] === '{') - (source[end] === '}');
  assert.equal(depth, 0); return source.slice(start, end);
}
const handoffStart = source.indexOf('for(const event of activities.drainEvents()){', source.indexOf('function updateMini(){'));
const handoffEnd = source.indexOf('  let previous=activities.snapshot();', handoffStart);
assert(handoffStart >= 0 && handoffEnd > handoffStart);
const handoff = source.slice(handoffStart, handoffEnd);
const incident = extract('reportCampaignIncident');
for (const caller of ['startCampaignMission','updateCareer']) {
  assert(extract(caller).includes("if(event.type==='started')reportCampaignIncident(event)"), 'actual controller campaign incident handoff');
}
function reportIncident(event, gameplay, campaignAftermath = null, developerReturn = null) {
  runInNewContext(`${incident};reportCampaignIncident(event);`, { event, gameplay, campaignAftermath, developerReturn });
}
const fixture = await createCampaignFixture();
const { map, interiors, guide } = fixture;
const catalogue = createCampaign(map, null, fixture.campaignOptions), chapters = catalogue.developerChapters();
assert.equal(chapters.length, 24);
const rows = [];
const journal = catalogue.journal();
function prefixFor(descriptor) {
  const intros = Object.fromEntries(journal.introductions.map(item => [item.character, []]));
  const own = journal.introductions.find(item => item.chapters.some(c => c.id === descriptor.id));
  if (own) intros[own.character] = own.chapters.slice(0, own.chapters.findIndex(c => c.id === descriptor.id)).map(c => c.id);
  else for (const item of journal.introductions) intros[item.character] = item.chapters.map(c => c.id);
  const sharedIndex = journal.shared.findIndex(c => c.id === descriptor.id);
  return { version: 2, character: descriptor.character, intros, meeting: sharedIndex >= 0, legacy: false,
    completed: sharedIndex >= 0 ? journal.shared.slice(0, sharedIndex).map(c => c.id) : [] };
}
let crimeModule;
try { crimeModule = await import('./capital-crime-playability.mjs'); } catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
const baseContext = () => ({ pose: { ...map.spawn, speed: 0 }, onFoot: true, health: 100, vehicleHealth: 100,
  wanted: 0, respawnSerial: 0, campaign: true, sandbox: false });
{
  const reports = [];
  const gameplay = { reportOffence: (label, severity, { witnessed }) => reports.push({ label, severity, witnessed }) };
  const started = { type: 'started', incident: true, wantedLevel: 3 };
  const aftermath = { scrutiny: () => 2 };
  reportIncident(started, gameplay, aftermath);
  reportIncident(started, gameplay, aftermath, {});
  reportIncident({ ...started, incident: false }, gameplay, aftermath);
  assert.deepEqual(reports, [
    { label: 'suspect vehicle · linked witness report', severity: 4, witnessed: true },
    { label: 'suspect vehicle', severity: 3, witnessed: true },
  ], 'retained witness scrutiny affects the next real incident, excludes previews, and caps the boost');
}
for (const descriptor of chapters) {
  const priorSave = prefixFor(descriptor), campaign = createCampaign(map, priorSave, fixture.campaignOptions), ctx = baseContext();
  assert.equal(campaign.current().id, descriptor.id);
  ctx.pose = { ...descriptor.start, speed: 0 };
  const gameplay = createGameplay(map, fixture.simulation);
  assert(campaign.start(ctx).ok);
  const started = campaign.drainEvents().find(event => event.type === 'started');
  if (started.incident) {
    reportIncident(started, gameplay);
    ctx.wanted = gameplay.state.wanted;
  }
  const receipts = {}, reconOwner = createRecon();
  const tick = dt => { campaign.update(dt, ctx); };
  const chapter = campaign.current(), stages = [], holds = new Set(fixture.limits);
  if (ctx.wanted > 0) tick(.05); // normal controller tick observes the actual incident before later fixture evasion
  let previous = descriptor.start, seconds = 0, inputs = 0;
  function finishStage(stage) {
    Object.assign(ctx, receipts);
    for (let frames = 0; campaign.state.active?.stage === stage.index && frames < 200; frames++) { tick(.05); stage.simulatedSeconds += .05; }
    assert.equal(campaign.state.failed, false, 'mission must not fail while completing a stage');
    assert(!campaign.state.active || campaign.state.active.stage > stage.index, `stage ${stage.index} did not advance from real context`);
    stage.status = 'DOMAIN_PASS'; stages.push(stage);
  }
  for (const [index, target] of chapter.stages.entries()) {
    const stage = { index, kind: target.kind, gates: [], status: 'HOLD', simulatedSeconds: 0, inputEdges: 0 };
    assert.equal(campaign.state.active?.stage, index, 'previous real stage must finish before the next action');
    const active = campaign.state.active;
    try {
      if (interiors.active) interiors.leave(ctx.pose);
      interiors.reset();
      const directions = guide.guide(active, { pose: previous });
      const destination = target.anywhere ? ctx.pose : directions?.point ?? target;
      stage.route = fixture.routeProof(previous, destination, target.radius || 20);
      previous = destination;
      if (!stage.route.connected) holds.add(`stage ${index}: directed road route absent`);
      if (['drive', 'foot', 'escape', 'stolen'].includes(target.kind)) {
        stage.gates.push('actual directed road graph', 'static whole-car vertex checks');
        ctx.interior = null;
        if (target.kind === 'stolen') {
          assert(crimeModule?.executeCampaignCrime, 'crime helper is not yet available');
          Object.assign(stage, await crimeModule.executeCampaignCrime({ kind: 'stolen', target, fixture, ctx, active, tick, source, gameplay }));
          previous = { ...ctx.pose };
        } else {
          // Explicit unit-fixture placement. Travel budgets are reported separately.
          const travel = 0; // fixture placement; budget scenarios below retain real graph distance
          const arrival = { ...destination, speed: 0 };
          Object.assign(ctx, { onFoot: target.kind === 'foot' || target.foot === true });
          if (target.kind === 'drive') { ctx.onFoot = false; ctx.vehicle ||= { ...gameplay.state.vehicle }; }
          for (let remaining = travel; remaining > 0 && campaign.state.active?.stage === index; remaining -= .1) {
            tick(Math.min(.1, remaining)); stage.simulatedSeconds += Math.min(.1, remaining);
          }
          ctx.pose = arrival;
          if (target.clear || target.kind === 'escape') {
            stage.fixturePoliceClear = true; ctx.wanted = 0;
            holds.add('Wanted clearing is an explicit fixture assumption; actual police evasion is not established.');
          }
          stage.fixturePlacement = true;
        }
        finishStage(stage); continue;
      }
      ctx.interior = null; ctx.onFoot = false;
      if (target.kind === 'recon') {
        const recon = reconOwner, subject = directions?.recon;
        assert(subject, 'actual mission guide supplies scan descriptor');
        let pose;
        searchView: for (const radius of [4, 6, 8, 12, 16]) for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
          const candidate = { x: subject.x + Math.sin(angle) * radius, z: subject.z + Math.cos(angle) * radius, speed: 0 };
          if (!fixture.simulation.moveActor({ ...candidate }, 0, 0, .45).blocked && fixture.simulation.hasLineOfSight(candidate, subject)) { pose = candidate; break searchView; }
        }
        assert(pose, 'checked clear exterior scan standpoint with actual LOS');
        const yaw = Math.atan2(pose.x - subject.x, pose.z - subject.z);
        Object.assign(ctx, { pose, onFoot: true, interior: null });
        const live = { ...ctx, pose, yaw, pitch: 0, missionId: chapter.id, stage: index, space: null,
          scan: false, hasLineOfSight: fixture.simulation.hasLineOfSight };
        recon.setObjective(active, subject);
        for (let frame = 0; frame < 15; frame++) { recon.step(.1, live); tick(.1); }
        assert.equal(recon.snapshot().receipt, null, 'passive framing does not award receipt');
        recon.step(.1, { ...live, scan: true }); tick(.1);
        const [receipt] = recon.drainEvents(); assert(receipt, recon.snapshot().reason);
        assert.equal(receipt.missionId, chapter.id); assert.equal(receipt.stage, index);
        stage.simulatedSeconds += 1.6; stage.inputEdges = 1; stage.domainReceipt = receipt;
        stage.gates.push(`${subject.hold}s steady view`, 'actual exterior solid LOS', 'fresh scan edge', 'real recon owner receipt');
        stage.status = 'DOMAIN_PASS'; receipts.recon = receipt; holds.add(`stage ${index}: exterior scanning pose is a fixture placement; full boot sight obstacles absent`);
        finishStage(stage); continue;
      }
      const entry = interiors.entries.find(e => target.roomId ? e.id === target.roomId : e.storeId === target.storeId);
      assert(entry, `matching boot-derived entry for ${target.roomId || target.storeId}`);
      const actor = { x: entry.x - Math.sin(entry.yaw) * 1.5, z: entry.z - Math.cos(entry.yaw) * 1.5, yaw: entry.yaw, health: 100 };
      stage.approachClear = !fixture.simulation.moveActor({ ...actor }, 0, 0, .45).blocked;
      if (!stage.approachClear) holds.add(`stage ${index}: exterior standing body is blocked; fixture room entry is not natural entry proof`);
      const plan = interiors.enter(entry, actor); assert(plan, 'actual enter admits exterior pose');
      Object.assign(ctx, { pose: actor, onFoot: true, interior: { storeId: plan.storeId, roomId: plan.id, atCounter: false } });
      stage.gates.push('matching actual door descriptor', 'real enter and generated room');
      const activities = createInteriorActivities(); activities.load(plan);
      const people = createInteriorPeople(); people.load(plan);
      const location = guide.guide(active, { pose: actor, plan, people: people.snapshot() });
      assert(location?.indoors, 'actual indoor target descriptor');
      const actionStation = plan.activities.find(s => s.id === location.stationId);
      const reach = ['fight', 'encounter'].includes(target.kind) ? 2.1 : actionStation?.radius ?? plan.counter?.radius ?? 1.3;
      stage.interiorPath = fixture.interiorPath(actor, location.point, reach);
      assert(stage.interiorPath.reachable, 'room collider connects entry to action range');
      stage.gates.push('entry-to-target room collider flood');
      if (target.kind === 'interior') {
        Object.assign(actor, plan.counter); ctx.interior.atCounter = true;
        finishStage(stage); continue;
      }
      if (target.kind === 'robbery') {
        assert(crimeModule?.executeCampaignCrime, 'crime helper is not yet available');
        const result = await crimeModule.executeCampaignCrime({ kind: 'robbery', target, fixture, ctx, active, tick, source, gameplay, people, actor, plan });
        const approachSeconds = stage.simulatedSeconds; Object.assign(stage, result); stage.simulatedSeconds += approachSeconds; receipts.heist = result.domainReceipt;
        finishStage(stage); continue;
      }
      if (['fight', 'encounter'].includes(target.kind)) {
        const guest = people.snapshot().find(p => p.character === 'booth-guest'); assert(guest);
        Object.assign(actor, stage.interiorPath.pose, { interiorId: plan.id });
        const live = { actor, hasLineOfSight: interiors.hasLineOfSight };
        assert(people.startDialogue(guest.id, { ...live, victoryRequired: true, scriptedFight: true, missionId: chapter.id }).ok);
        assert(people.respondDialogue(guest.id, 'fight', live).ok);
        for (let frame = 0; frame < 14; frame++) { people.update(.1, live); tick(.1); }
        assert(people.drainEvents().some(e => e.type === 'noodles-throw'), 'actual bowl throw precedes melee');
        for (let hit = 0; hit < 4; hit++) {
          const p = people.snapshot().find(p => p.id === guest.id);
          const result = people.strike({ ...actor, yaw: Math.atan2(actor.x - p.x, actor.z - p.z), range: 2.3, damage: 25, kind: 'melee', hasLineOfSight: interiors.hasLineOfSight });
          assert(result.people.some(p => p.id === guest.id));
          for (let frame = 0; frame < 7; frame++) { people.update(.1, live); tick(.1); }
        }
        assert.equal(people.encounter.victory, true); assert.equal(people.encounter.playerHits, 4);
        receipts.encounter = people.encounter;
        stage.domainReceipt = people.encounter; stage.status = 'DOMAIN_PASS'; stage.simulatedSeconds += 4.2; stage.inputEdges = 5;
        stage.gates.push('dialogue fight response', 'actual noodle throw', 'four timed melee hits', 'authoritative KO receipt');
        holds.add(`stage ${index}: supplied strikes bypass Gameplay player melee cooldown and real player retaliation damage`);
        finishStage(stage); continue;
      }
      const station = plan.activities.find(s => s.id === location.stationId); assert(station);
      Object.assign(actor, stage.interiorPath.pose);
      ctx.planId = plan.id; ctx.visible = interiors.hasLineOfSight(actor, station);
      const progression = createProgression(map, null, { workSession: () => ({ plan: interiors.active, session: activities.snapshot() }),
        canUseService: site => interiors.active?.storeId === site.id, hasLineOfSight: interiors.hasLineOfSight });
      assert(activities.start(station.id, ctx), `activity ${station.id} admission: ${JSON.stringify({
        distance: Math.hypot(actor.x-station.x, actor.z-station.z), radius: station.radius,
        visible: ctx.visible, wanted: ctx.wanted, health: ctx.health, onFoot: ctx.onFoot, planId: ctx.planId })}`);
      if (target.kind === 'work') assert(progression.startShift(target.storeId, ctx).ok, 'real paid shift admission');
      let elapsed = 0, edges = 0, neutral = true;
      while (activities.snapshot().active && elapsed < 60) {
        const s = activities.snapshot(); let input = {};
        if (neutral) neutral = false;
        else if (['recipe', 'repeat', 'edit'].includes(s.phase)) { input = { [s.expectedKey]: true }; neutral = true; edges++; }
        else if (station.kind === 'alarm') {
          if (s.phase === 'arm' || s.phase === 'hold') input = { x: true };
          if (s.phase === 'confirm') { input = { y: true }; edges++; }
        } else if (station.kind === 'evidence' && s.phase === 'dial') {
          const key = s.dialValue === s.evidenceCode[s.channel] ? 'up' : 'x';
          input = { [key]: true }; neutral = true; edges++;
        }
        activities.step(.05, input, ctx); progression.update(.05, ctx); tick(.05); elapsed += .05;
      }
      assert.equal(activities.snapshot().phase, 'complete', activities.snapshot().reason || 'activity timed out');
      const env = { houseController:null,burglary:createBurglary({canApproach:()=>false}),burglaryContext:()=>ctx,activities, progression, interiors, map, campaign: { state: { active } },
        gameplay: { state: { mode: 'foot', health: 100, passenger: false, recovery: null }, reportOffence() { ctx.wanted = 1; }, heal() {} },
        presentationOutcome: receipts.presentation || { serial: 0 }, schoolAlarmOutcome: receipts.schoolAlarm || { serial: 0 }, homeActionOutcome: receipts.homeAction || { serial: 0 }, evidenceOutcome: receipts.evidence || { serial: 0 }, evidenceSessionKey: '',
        isSandbox: () => false, isWorkoutKind, careerContext: () => ctx, saveCareer() {}, notify() {}, playSchoolAlarm() {},
        roomPeople: { alert() {} }, focus: () => actor };
      runInNewContext(`${extract('recordEvidence')}\n${handoff}`, env);
      const key = { presentation: 'presentationOutcome', 'school-alarm': 'schoolAlarmOutcome', 'home-action': 'homeActionOutcome', evidence: 'evidenceOutcome' }[target.kind];
      if (key) {
        assert.equal(env[key].serial, (receipts[{ presentation: 'presentation', 'school-alarm': 'schoolAlarm', 'home-action': 'homeAction', evidence: 'evidence' }[target.kind]]?.serial || 0) + 1, 'actual controller terminal handoff awards one fresh receipt');
        stage.domainReceipt = env[key]; receipts[{ presentation: 'presentation', 'school-alarm': 'schoolAlarm', 'home-action': 'homeAction', evidence: 'evidence' }[target.kind]] = env[key];
      }
      if (target.kind === 'work') {
        const events = progression.drainEvents().filter(e => e.type === 'work-complete'); assert.equal(events.length, 1);
        stage.domainReceipt = events[0]; assert.equal(progression.state.cash, 1000 + events[0].reward);
        stage.gates.push('Progression terminal finishShift', 'exact once paid shift cash');
        const assignment = source.match(/if\(event.type==='work-complete'\)workCompletion=\{[^;]+;/)?.[0];
        assert(assignment, 'actual controller work receipt assignment');
        const workEnv = { event: events[0], workCompletion: receipts.workCompletion || { serial: 0 } };
        runInNewContext(assignment, workEnv); receipts.workCompletion = workEnv.workCompletion;
      }
      stage.status = 'DOMAIN_PASS'; stage.simulatedSeconds += elapsed; stage.inputEdges = edges;
      stage.gates.push('real activity cue inputs', 'actual controller updateMini terminal handoff');
      finishStage(stage);
    } catch (error) { stage.error = error.message; holds.add(`stage ${index}: ${error.message}`); stages.push(stage); break; }
  }
  const completionEvents = campaign.drainEvents().filter(event => event.type === 'complete');
  const completed = campaign.state.active === null && completionEvents.length === 1;
  let serialized = campaign.serialize();
  if (completed) {
    assert.equal(completionEvents[0].id, chapter.id); assert.equal(completionEvents[0].reward, chapter.reward);
    assert.notDeepEqual(serialized, priorSave);
    assert.deepEqual(createCampaign(map, serialized, fixture.campaignOptions).serialize(), serialized, 'normal progress survives reload');
    for (let i = 0; i < 20; i++) tick(.1);
    assert.equal(campaign.drainEvents().filter(e => e.type === 'complete').length, 0, 'reward cannot replay');
  }
  let retryEvidence = null;
  if (descriptor.id === 'student-paper-chase' && receipts.schoolAlarm) {
    const retryCampaign = createCampaign(map, priorSave, fixture.campaignOptions);
    const recovered = { ...baseContext(), schoolAlarm: receipts.schoolAlarm };
    assert(retryCampaign.start(recovered).ok);
    for (let attempt = 0; attempt < 2; attempt++) {
      retryCampaign.update(.1, { ...recovered, recovering: true });
      assert.equal(retryCampaign.state.active, null);
      recovered.respawnSerial++;
      assert(retryCampaign.start(recovered).ok);
      assert.equal(retryCampaign.state.active.baselines.schoolAlarm, receipts.schoolAlarm.serial);
      for (let frame = 0; frame < 20; frame++) retryCampaign.update(.1, { ...recovered,
        interior: { roomId: receipts.schoolAlarm.roomId }, onFoot: true });
      assert.equal(retryCampaign.state.active.stage, 0, 'real old alarm receipt cannot complete a repeated retry');
    }
    assert.deepEqual(retryCampaign.serialize(), priorSave);
    retryEvidence = { repeatedFailures: 2, realReceiptSerial: receipts.schoolAlarm.serial, freshBaselinePreserved: true, staleReceiptRejected: true };
  }
  const fullGraphDistance = stages.reduce((sum, s) => sum + (s.route?.distanceMetres || 0), 0);
  // Driving arrivals stop at the first objective-disc intersection; other stages still
  // need the public approach/door and retain the complete graph route estimate.
  const distance = stages.reduce((sum, s) => sum + ((s.kind === 'drive' || chapter.stages[s.index].drive === true) && s.route?.firstDistanceAlongRouteEnteringRadius !== null ?
    s.route.firstDistanceAlongRouteEnteringRadius : s.route?.distanceMetres || 0), 0);
  seconds = stages.reduce((sum, s) => sum + s.simulatedSeconds, 0); inputs = stages.reduce((sum, s) => sum + s.inputEdges, 0);
  rows.push({ id: chapter.id, character: descriptor.character, status: completed ? 'DOMAIN_PASS' : 'HOLD', campaignCompleted: completed, nativeCompleted: false, retryEvidence, completionReward: completionEvents[0]?.reward ?? null,
    domainChain: completed ? 'PASS' : 'HOLD', roadConnectivity: stages.every(s => s.route?.connected) ? 'PASS' : 'HOLD',
    driveEndpointReach: stages.filter(s => (s.kind === 'drive' || chapter.stages[s.index].drive === true)).every(s => s.route?.reachesRadius) ? 'PASS' : 'HOLD',
    driveRouteRadiusReach: stages.filter(s => (s.kind === 'drive' || chapter.stages[s.index].drive === true)).every(s => s.route?.reachesRouteRadius) ? 'PASS' : 'HOLD',
    fullGraphDistanceMetres: fullGraphDistance,
    allGuideEndpointReach: stages.every(s => s.route?.reachesRadius) ? 'PASS' : 'HOLD',
    carVertexClearance: stages.every(s => s.route?.clearCarVertices === s.route?.carVertices) ? 'PASS' : 'HOLD',
    naturalTravel: 'UNVERIFIED', native: 'UNVERIFIED', fixtureTravelSeconds: 0,
    budgetScenarios: [12, 16, 20].map(speed => ({ assumedAverageMetresPerSecond: speed, travelSeconds: distance / speed,
      domainActionAndHoldSeconds: seconds, marginSeconds: chapter.time - seconds - distance / speed })),
    timeBudgetSeconds: chapter.time, measuredDomainSeconds: seconds, inputEdges: inputs, routeDistanceMetres: distance,
    optimisticTravelAt12MetresPerSecond: distance / 12, optimisticBudgetRemaining: chapter.time - seconds - distance / 12,
    domainStagesPassed: stages.filter(s => s.status === 'DOMAIN_PASS').length, totalStages: chapter.stages.length, attemptedStages: stages.length, indoorPathDistanceMetres: stages.reduce((sum, stage) => sum + (stage.interiorPath?.distanceMetres || 0), 0), holds: [...holds], stages });
  campaign.cancel(); interiors.reset();
}
const report = { schemaVersion: 1, evidence: 'normal campaign owner chains with source-domain action inputs and explicitly scoped fixture travel/police clearing; no native completion claim',
  missions: rows.length, completeCampaignPaths: rows.filter(row => row.campaignCompleted).length, limits: fixture.limits, rows };
assert.equal(rows.length, 24);
const json = JSON.stringify(report, null, 2) + '\n';
if (outputIndex >= 0) await writeFile(args[outputIndex + 1], json); else process.stdout.write(json);
if (report.completeCampaignPaths !== report.missions) process.exitCode = 1;

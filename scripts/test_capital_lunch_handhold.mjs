import assert from 'node:assert/strict';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { createInteriorPeople } from '../Games/Capital Drive/interior-people.js';
import { createInteriors } from '../Games/Capital Drive/interiors.js';

// 1. Lunch breakpoint encounter tuning: trivial Dot damage, single-hit victory, rematch intact.
const plan = { id: 'lunch-room', storeId: 'noodle-store', type: 'shop', variant: 'noodles', floorY: 3,
  origin: { x: 0, z: 0, yaw: 0 }, width: 10, depth: 14, walls: [], doors: [], activities: [],
  boothGuest: { x: 3, z: 8, yaw: -Math.PI / 2 }, furniture: [{ kind: 'banquette', x: 3, z: 8, yaw: 0, width: .6, depth: .6 }] };
const seen = () => true;
function fight(missionId) {
  const pool = createInteriorPeople(); pool.load(plan);
  const actor = { x: 3, z: 6.8, health: 100, interiorId: plan.id };
  const context = { actor, hasLineOfSight: seen };
  const id = pool.snapshot().find(p => p.character === 'booth-guest').id;
  const tick = (count, ctx = context) => { for (let n = 0; n < count; n++) pool.update(.1, ctx); };
  assert(pool.startDialogue(id, { ...context, scriptedFight: true, victoryRequired: true, missionId }).ok);
  assert(pool.respondDialogue(id, 'fight', context).ok);
  return { pool, actor, context, id, tick,
    strike: (damage = 100, extra = {}) => {
      const p = pool.snapshot().find(person => person.id === id);
      return pool.strike({ ...actor, yaw: Math.atan2(actor.x - p.x, actor.z - p.z), range: 2.3,
        damage, kind: 'melee', hasLineOfSight: seen, ...extra });
    } };
}
{
  const lunch = fight('corporate-lunch-breakpoint');
  lunch.tick(14);
  assert(lunch.pool.drainEvents().some(e => e.type === 'noodles-throw'));
  lunch.tick(60);
  const swings = lunch.pool.drainEvents().filter(e => e.type === 'retaliation' && e.kind === 'melee');
  assert(swings.length > 0, 'tutorial fight still swings so the step-back cue is teachable');
  assert(swings.every(e => e.damage === 1), 'Dot deals trivial damage in the lunch tutorial fight');
  const punch = lunch.strike();
  assert.equal(punch.hits, 1);
  assert.equal(punch.deferReport, true, 'the scripted punch is reported when Rowan leaves');
  assert(!lunch.pool.drainEvents().some(event => event.type === 'witness'));
  const won = lunch.pool.encounter;
  assert.equal(won.victory, true, 'one clean knockdown punch wins the hand-held lunch fight');
  assert.equal(won.outcome, 'noodle-victory');
  assert.equal(won.playerHits, 1);
}
{
  const rematch = fight('earmuffs-rematch');
  rematch.tick(74);
  const swings = rematch.pool.drainEvents().filter(e => e.type === 'retaliation' && e.kind === 'melee');
  assert(swings.length > 0 && swings.every(e => e.damage === 7), 'the separate CASES rematch keeps its real fight damage');
  const punch = rematch.strike();
  assert.equal(punch.hits, 1);
  assert.equal(punch.deferReport, false, 'the rematch uses ordinary assault reporting');
  assert(rematch.pool.drainEvents().some(event => event.type === 'witness'));
  const after = rematch.pool.encounter;
  assert.equal(after.victory, false, 'the rematch still requires two clean fist hits');
  assert.equal(after.phase, 'retry');
}

// 2. Lunch timer is advisory only; every other timed mission still fails on expiry.
const map = { spawn: { x: 0, z: 0 }, landmarks: [
  { id: 'coals', name: 'Coals', store: true, x: 100, z: 10 },
  { id: 'canberra-centre', x: 200, z: -400 },
  { id: 'store-5656111023', name: 'Lambzhou 1919', x: 300, z: -420 },
] };
const base = { pose: { x: 0, z: 0, speed: 0 }, onFoot: true, wanted: 0, vehicle: { stolen: true },
  vehicleHealth: 100, respawnSerial: 0, campaign: true, sandbox: false };
const tickSeconds = (campaign, context, seconds) => { for (let n = 0; n < seconds * 10; n++) campaign.update(.1, context); };
{
  const campaign = createCampaign(map);
  campaign.selectCharacter('corporate', base);
  const office = campaign.current();
  assert.equal(office.id, 'corporate-present-tense');
  assert.equal(campaign.start({ ...base, presentation: { serial: 0, roomId: 'interior-canberra-centre' } }).ok, true);
  const stages = campaign.state.active.stageCount;
  tickSeconds(campaign, { ...base, interior: { roomId: 'interior-canberra-centre' },
    presentation: { roomId: 'interior-canberra-centre', outcome: 'outage', serial: 1 } }, 6);
  tickSeconds(campaign, { ...base, pose: { ...campaign.state.active.target, speed: 0 } }, 8);
  assert.equal(campaign.state.active, null, 'present tense completes through its live predicates');
  const lunch = campaign.current();
  assert.equal(lunch.id, 'corporate-lunch-breakpoint');
  assert.equal(lunch.advisoryTime, true, 'lunch breakpoint flags its clock as advisory');
  assert.equal(lunch.stages.every(stage => !stage.time), true);
  assert.equal(campaign.start(base).ok, true);
  assert.equal(campaign.state.active.advisoryTime, true);
  tickSeconds(campaign, base, 600);
  assert(campaign.state.active && campaign.state.active.id === 'corporate-lunch-breakpoint',
    'the advisory lunch clock can reach zero without failing the mission');
  assert.equal(campaign.state.failed, false);
  assert.equal(campaign.state.active.remaining, 0);
  const target=campaign.state.active.target;
  tickSeconds(campaign,{...base,interior:{roomId:'lunch-room',storeId:target.storeId,atCounter:false}},2);
  assert.equal(campaign.state.active.stage,0,'entering the restaurant alone does not reach the counter checkpoint');
  tickSeconds(campaign,{...base,interior:{roomId:'lunch-room',storeId:target.storeId,atCounter:true}},2);
  assert.equal(campaign.state.active.stage,1,'standing at the counter advances lunch without an invented order receipt');
}
{
  const campaign = createCampaign(map);
  campaign.selectCharacter('student', base);
  assert.equal(campaign.current().advisoryTime, undefined, 'timed missions outside lunch keep a failing clock');
  assert.equal(campaign.start(base).ok, true);
  tickSeconds(campaign, base, 520);
  assert.equal(campaign.state.active, null, 'ordinary mission time limits still fail on expiry');
  assert.equal(campaign.state.failed, true);
  assert.equal(campaign.state.message, 'Mission time expired.');
}

// 3. Enlarged Lambzhou floor: bigger clamps, aisle, entrance clearance, rear-right booth, reachable counter.
function restaurant(frontWidth) {
  const yaw = .7, building = { id: 'b', type: 'retail', height: 4, points: [[-12, 0], [12, 0], [12, 30], [-12, 30]] };
  const interiors = createInteriors({ buildings: [building], interiorEntries: [{ buildingId: 'b', x: 0, z: 0, nx: Math.sin(yaw), nz: Math.cos(yaw) }] },
    { heightAt: () => 3, stores: [{ id: 's', buildingId: 'b', name: 'Lambzhou 1919', frontage: { x: 0, z: 0, yaw, width: frontWidth }, interiorType: 'noodle-shop' }] });
  const entry = interiors.entries[0], actor = { x: entry.x - Math.sin(yaw), z: entry.z - Math.cos(yaw), y: 3, yaw };
  const plan = interiors.enter(entry, actor);
  return { interiors, plan, actor };
}
for (const frontWidth of [6.2, 7.5, 9]) {
  const { interiors, plan, actor } = restaurant(frontWidth);
  assert.equal(plan.depth, 16, 'Lambzhou is deepened to 16 m');
  assert(plan.width >= 7.2 && plan.width <= 8.5, `enlarged width clamp holds for frontage ${frontWidth}`);
  const c = Math.cos(plan.origin.yaw), s = Math.sin(plan.origin.yaw);
  const local = f => ({ x: c * (f.x - plan.origin.x) - s * (f.z - plan.origin.z), z: s * (f.x - plan.origin.x) + c * (f.z - plan.origin.z) });
  for (const f of plan.furniture) {
    const p = local(f);
    assert(Math.abs(p.x) - f.width / 2 >= 1.05, 'enlarged furniture keeps the full central 2.1 m aisle clear');
    assert(p.z - f.depth / 2 >= 2, 'the first two metres by the public door stay clear');
    if (['kitchen-pass', 'noodle-station', 'prep-bench'].includes(f.kind)) assert(p.x < -1.05, 'service kitchen stays left of the aisle');
    if (['noodle-table', 'communal-table', 'padded-chair', 'stool', 'banquette'].includes(f.kind)) assert(p.x > 1.05, 'dining stays right of the aisle');
  }
  const booth = local(plan.furniture.find(f => f.kind === 'banquette'));
  assert(booth.z > 9 && booth.x > 0, 'the orange booth remains at the back right');
  const guest = local(plan.boothGuest);
  assert(guest.z > 12 && guest.x > 0, 'Dot keeps her rear-right corner booth seat');
  const counter = local(plan.counter);
  assert(counter.x < 0 && counter.z > 2 && counter.z < 6, 'the order counter keeps its left-of-aisle serving spot');
  assert(plan.details.filter(d => d.kind === 'noodle-bowl').length >= 4, 'place settings survive the enlargement');
  const world = (x, z) => ({ x: plan.origin.x + c * x + s * z, z: plan.origin.z - s * x + c * z });
  const walker = { ...actor };
  for (const [x, z] of [[0, 2.2], [0, 4.2], [-0.55, 4.2]]) {
    const target = world(x, z), dx = target.x - walker.x, dz = target.z - walker.z;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .3));
    for (let n = 0; n < steps; n++) {
      const step = interiors.moveActor(walker, dx / steps, dz / steps, .45);
      assert.equal(step.blocked, false, 'the walk from the door to the order counter stays clear');
    }
  }
  assert(Math.hypot(walker.x - plan.counter.x, walker.z - plan.counter.z) < .01, 'the counter is reachable on foot');
  assert(interiors.leave(walker));
}

// 4. Maximum hand-holding across every mission: instructional briefings and stage labels everywhere.
{
  const campaign = createCampaign(map);
  const seen = new Set();
  for (const hero of ['student', 'corporate', 'basement']) {
    campaign.selectCharacter(hero, base);
    for (const chapter of campaign.chapters) {
      if (seen.has(chapter.id)) continue;
      seen.add(chapter.id);
      assert(typeof chapter.briefing === 'string' && chapter.briefing.length >= 120,
        `${chapter.id} keeps a full step-by-step briefing`);
      assert(!chapter.briefing.includes('—'), `${chapter.id} briefing avoids em-dashes`);
      assert(/press [EFQI]|Campaign \(J\)|hold Space|SCAN/i.test(chapter.briefing),
        `${chapter.id} briefing names the actual key for its actions`);
      for (const [index, stage] of chapter.stages.entries()) {
        assert(typeof stage.label === 'string' && stage.label.length >= 25, `${chapter.id} stage ${index} label is explicit`);
        assert(!stage.label.includes('—'), `${chapter.id} stage ${index} label avoids em-dashes`);
        assert(/press [EFQI]|drive|walk|stand|frame|steal|speak|hold/i.test(stage.label),
          `${chapter.id} stage ${index} says how, not just what`);
      }
    }
  }
  const aviation = campaign.optionalChapters.find(chapter => chapter.id === 'above-the-paperwork');
  assert(aviation && /press E/i.test(aviation.briefing) && aviation.stages.every(stage => /press|hold/i.test(stage.label)),
    'the optional flight chapter is instructional too');
  assert.equal(seen.has('three-receipts'), true, 'the three-receipts meeting is covered');
  assert.equal(seen.size, 24, 'every story chapter is audited');
  campaign.selectCharacter('corporate', base);
  const lunch = campaign.chapters.find(chapter => chapter.id === 'corporate-lunch-breakpoint');
  assert(lunch.stages[0].label.includes('service counter') && lunch.stages[0].label.includes('press E'));
  assert.match(lunch.stages[0].label,/stand beside.*counter.*until the booth objective appears/);
  assert(!/press E (there|at the service counter).*order/i.test(lunch.briefing+' '+lunch.stages[0].label),'counter guidance matches its reach-and-hold authority');
  assert(lunch.stages[1].label.includes('press F to punch') && lunch.stages[1].label.includes('Dot'));
  assert(lunch.stages[1].label.toLowerCase().includes('step back'));
  assert(lunch.briefing.includes('never fails you'), 'the lunch briefing states its own no-fail clock');
  assert(lunch.briefing.includes('Lambzhou 1919') && lunch.briefing.includes('Bunda Street'));
}

// Longer driving budgets retain the same chapter order and ordinary failing
// clocks. Preview and normal launch both read the chapter's single time value.
{
  const campaign=createCampaign(map,{version:1,completed:[]});
  const shared=campaign.chapters;
  for(const [id,seconds,routeMetres,actionSeconds]of [['quiet-streets',720,7175.800888,2],['shelf-life',1320,13162.525083,6.2]]){
    const index=shared.findIndex(chapter=>chapter.id===id),normal=createCampaign(map,{version:1,completed:shared.slice(0,index).map(chapter=>chapter.id)});
    assert.equal(normal.current().id,id);assert.equal(normal.current().time,seconds);
    assert(normal.start(base).ok);assert.equal(normal.state.active.remaining,seconds);assert.equal(normal.state.active.advisoryTime,false);
    assert(seconds-routeMetres/12-actionSeconds>100,'authored driving budget leaves over100s at the audited optimistic12m/s route estimate');
    const preview=createCampaign(map);assert(preview.startDeveloper(id,{...base,developer:true}).ok);assert.equal(preview.current().time,seconds);assert.equal(preview.state.active.remaining,seconds);
  }
}
console.log('PASS capital lunch hand-holding: trivial tutorial fight damage with single-hit victory and intact CASES rematch, advisory-only lunch clock, enlarged 7.2-8.5 x 16 Lambzhou with clear aisle/entrance/rear booth/reachable counter, and instructional briefings and stage labels across all 24 story chapters plus the optional flight');

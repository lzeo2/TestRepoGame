import { expansionPlaces } from './map-expansion.js';

// Original fiction. Mission rooms and encounters are authored, not surveyed private spaces.
const clone = value => JSON.parse(JSON.stringify(value));
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

export function createCampaign(map, saved = null, { meetingPoint } = {}) {
  if (meetingPoint !== undefined && !finitePoint(meetingPoint)) throw new Error('Campaign meeting point must be finite.');
  const place = (id, fallback) => map.landmarks.find(p => p.id === id) || fallback;
  const shop = map.landmarks.find(p => p.store && /coals/i.test(p.name));
  if (!finitePoint(map.spawn) || !finitePoint(shop)) throw new Error('Campaign requires the mapped spawn and Coals.');
  const centre = place('canberra-centre', { x: -456, z: -4500, name: 'Canberra Centre' });
  const kingston = place('kingston', { x: 923, z: 285, name: 'Kingston' });
  const home = map.storyHomes?.basement || { roomId: 'story-milo-home', name: "Milo's safehouse", street: 'Kingston', x: kingston.x, z: kingston.z };
  if (!finitePoint(home) || typeof home.roomId !== 'string' || !home.roomId) throw new Error('Campaign home requires a finite entry and room identity.');
  const homeApproach = finitePoint(home.approach) ? home.approach : home;
  const homeName = home.name || "Milo's safehouse";
  const homeLocation = `${homeName} on ${home.street || 'the Kingston public approach'}`;
  const homeTask = { roomId: home.roomId, stationId: `${home.roomId}-stash`, hold: 0 };
  const redHill = place('redhill', { x: -1770, z: 1740, name: 'Red Hill' });
  const sourceBridge = map.roads?.length ? expansionPlaces(map).find(point => point.id === 'commonwealth-bridge') : null;
  const bridge = sourceBridge || place('commonwealth-bridge', { x: -1230, z: -2840, name: 'Commonwealth Avenue Bridge' });
  // Flynn Drive has a sourced public sidewalk. Recruit on its closest source
  // vertex rather than inventing a foot approach on the trunk bridge deck.
  const approachRoad = map.roads?.find(road => road.sourceId === 'way/5640616');
  const approachVertex = sourceBridge && approachRoad?.points.reduce((best, point) => !best || Math.hypot(point[0] - bridge.x, point[1] - bridge.z) < Math.hypot(best[0] - bridge.x, best[1] - bridge.z) ? point : best, null);
  const bridgeApproach = approachVertex ? { x: approachVertex[0], z: approachVertex[1] } : null;
  const school = map.schoolEntry || map.spawn;
  if (!finitePoint(school)) throw new Error('Campaign school entry must be finite.');
  const schoolRoomId = school.roomId || 'interior-telopea-school';
  const scene = (id, title, ...lines) => ({ id, title, lines: lines.map(([speaker, text]) => ({ speaker, text, duration: 3.5 })) });
  const crew = owner => ['student', 'corporate', 'basement'].filter(id => id !== owner);
  const target = (point, label, kind = 'drive', extra = {}) => ({ x: point.x, z: point.z, label, kind, radius: 26, hold: 1, ...extra });
  const shared = freeze([
    { id: 'late-parcel', character: 'basement', name: '1. Depot interception', contact: 'Mara, local fixer', reward: 350, time: 360, incident: true, wantedLevel: 3,
      cutscene: scene('late-parcel', 'The debt changes hands', ['Milo', 'The depot sold my debt twice. We need a getaway car before we intercept its collection.'], ['Mara', 'Kit and Rowan can cover you on foot outside. Get the vehicle to Coals and shake the search.']),
      briefing: 'Milo, the fraudulent depot is moving its collection case. Take an occupied street vehicle and deliver it outside Coals. Kit and Rowan can cover you on foot outside. Lose the police before the handover.',
      outro: 'Milo: Their getaway car is ours. The case names a ledger hidden behind the Coals counter.',
      stages: [target(map.spawn, 'Intercept an occupied vehicle; crew covers on foot', 'stolen', { anywhere: true }), target(shop, 'Bring the stolen vehicle to Coals and lose the police', 'drive', { stolen: true, clear: true, stop: true })] },
    { id: 'under-the-awning', character: 'student', name: '2. Ledger robbery', contact: 'Mara', reward: 450, time: 300,
      cutscene: scene('under-the-awning', 'A receipt for every lie', ['Kit', 'The depot kept our club refund in a second set of books. The ledger is at Coals.'], ['Mara', 'Rowan and Milo will cover the street outside. Complete the counter robbery, then leave in a car.']),
      briefing: 'Kit, rob the counter at Coals while Rowan and Milo cover the street outside. Complete the till handover to recover the depot ledger, then return to a car outside and lose any police attention.',
      outro: 'Kit: The ledger has every double charge. Jules can match the depot vehicles to these entries.',
      stages: [target(shop, 'Complete the Coals counter robbery while the crew covers outside', 'robbery', { storeId: shop.id, hold: 0 }), target(shop, 'Leave Coals in a car with the recovered ledger', 'drive', { clear: true, stop: true })] },
    { id: 'borrowed-wheels', character: 'corporate', name: '3. Borrowed wheels', contact: 'Jules, garage mechanic', reward: 700, time: 480,
      cutscene: scene('borrowed-wheels', 'Hostile acquisition', ['Rowan', 'My employer signed off on this depot. Its fleet is the missing link.'], ['Jules', 'Take a live street vehicle. Kit and Milo cover the street on foot. Bring it to Kingston with no patrol on your tail.']),
      briefing: 'Rowan, carjack an occupied street vehicle, then bring it to Kingston. Kit and Milo can cover you on foot outside. Stop for Jules and lose the police before handover.',
      outro: 'Rowan: The fleet and the false accounts match. The depot knows we have its evidence.',
      stages: [target(shop, 'Carjack an occupied street vehicle; crew covers on foot', 'stolen', { anywhere: true }), target(kingston, 'Deliver the stolen vehicle in Kingston', 'drive', { stolen: true, clear: true, stop: true })] },
    { id: 'quiet-streets', character: 'corporate', name: '4. Armed getaway', contact: 'Jules', reward: 800, time: 540, incident: true, wantedLevel: 3,
      cutscene: scene('quiet-streets', 'The handover was a trap', ['Rowan', 'They traced the handover. We are leaving together.'], ['Jules', 'Your crew is armed. Cover each other, reach Red Hill and lose the search.']),
      briefing: 'Rowan, the depot handover has become an armed getaway. Kit and Milo will defend the crew against nearby threats. Reach Red Hill and lose the police before regrouping.',
      outro: 'Rowan: Everyone is here. The ledger points to one final account across the lake.',
      stages: [target(redHill, 'Escape with the crew and regroup at Red Hill', 'escape', { clear: true, hold: 7, radius: 45 })] },
    { id: 'across-the-water', character: 'student', name: '5. Bridge score', contact: 'Mara', reward: 1000, time: 660, incident: true, wantedLevel: 3,
      cutscene: scene('across-the-water', 'The last account', ['Kit', 'The Centre drop is the last escape route for the depot accountant. We get the ledger there first.'], ['Mara', 'Regroup with Rowan and Milo on Flynn Drive. They cover you on foot outside. Cross the bridge, then lose the police before the drop.']),
      briefing: 'Kit, regroup at the Flynn Drive public approach, then drive the recovered ledger across Commonwealth Avenue Bridge. Rowan and Milo can cover you on foot outside. Evade the police and stop at the Canberra Centre public approach to close the depot account.',
      outro: 'Kit: The evidence is delivered. The depot cannot collect those false debts again. Time to split the score.',
      stages: [...(bridgeApproach ? [target(bridgeApproach, 'Flynn Drive public approach: stop and regroup with the crew', 'drive', { stop: true })] : []), target(bridge, 'Carry the ledger across Commonwealth Avenue Bridge', 'drive', { radius: 75, hold: 0 }), target(centre, 'Lose the police and stop at Canberra Centre', 'drive', { stop: true, clear: true, radius: 40 })] },
    { id: 'home-by-the-lake', character: 'basement', name: '6. Split the score', contact: 'Mara', reward: 1200, time: 720,
      cutscene: scene('home-by-the-lake', 'Three shares, no debt', ['Milo', 'We started with a missing refund, a broken presentation and a debt collector.'], ['Mara', `Return to ${homeLocation}. Pack the recovered ledger inside, then meet us outside to split the money.`]),
      briefing: `Milo, drive to ${homeLocation} and park at its public approach. Enter your home and finish packing the recovered ledger at the case table. Leave through the same door and lose any police outside before the final split. Kit and Rowan cover the street.`,
      outro: 'Mara: Three equal shares. The fake debts are gone. Campaign complete.',
      stages: [target(homeApproach, `Park outside ${homeLocation}`, 'drive', { clear: true, stop: true }), target(home, `Inside ${homeLocation}: pack the recovered ledger at the case table`, 'home-action', homeTask), target(homeApproach, `Leave ${homeLocation} on foot and clear the search for the split`, 'foot', { clear: true, hold: 3, radius: 12 })] },
  ].map(chapter => ({ ...chapter, companions: crew(chapter.character) })));
  const noodle = place('store-5656111023', { x: -367.096, z: -4406.948, name: 'Lambzhou 1919' });
  const mall = { x: -248.655, z: -4172.87 };
  const characters = freeze([
    { id: 'student', name: 'Kit Vale', age: 18, tagline: 'A Telopea student with one last errand and very little patience.', appearance: 'student', start: { ...map.spawn }, onFoot: true },
    { id: 'corporate', name: 'Rowan Pike', age: 29, tagline: 'A Civic analyst whose career depends on a slideshow.', appearance: 'corporate', start: { ...mall }, onFoot: true },
    { id: 'basement', name: 'Milo Finch', age: 26, tagline: 'A basement regular trying a radical new strategy: going outside.', appearance: 'basement', start: { x: homeApproach.x, z: homeApproach.z }, onFoot: false },
  ]);
  const intros = freeze({
    student: [
      { id: 'student-paper-chase', name: 'False start', contact: 'Kit Vale', reward: 100, time: 480, combat: false,
        cutscene: scene('student-paper-chase', 'After hours', ['Kit', 'The depot took our club money and called the missing refund a delivery fee.'], ['Kit', 'I am back after hours. Trigger the alarm, get outside and lose the search. No fighting.']),
        briefing: 'The depot kept your school club refund. Enter the Telopea after-hours wing and set off the alarm as a diversion. Leave the room and evade the police outside. Attacks are disabled during this mission.',
        outro: 'Kit: Clear of the search. The depot refund has a Coals stock reference. Mara can get me inside.',
        stages: [target(school, 'Telopea after-hours wing: enter and trigger the alarm panel', 'school-alarm', { roomId: schoolRoomId, hold: 0 }), target(school, 'Leave the Telopea after-hours wing and lose the search outside', 'escape', { foot: true, clear: true, radius: 30, hold: 3 })] },
      { id: 'student-extra-credit', name: 'Extra credit', combat: false, cutscene: scene('student-extra-credit', 'The stock reference', ['Mara', 'That refund went through Coals. Work a real stock shift and find the depot receipt.'], ['Kit', 'A quiet shift first. Then we find where the money went.']), contact: 'Mara, local courier', reward: 150, time: 660,
        briefing: 'Mara found the depot refund reference in a Coals stock order. Cover a real stock task to trace it. Drive over, enter the shop and finish a stock activity.',
        outro: 'Kit: Shift finished. Mara wants the depot receipt brought to Kingston.',
        stages: [target(shop, 'Park outside Coals', 'drive', { stop: true }), target(shop, 'Inside Coals: finish a stock shift', 'work', { storeId: shop.id, hold: 0 })] },
    ],
    corporate: [
      { id: 'corporate-present-tense', name: 'Present tense', combat: false, cutscene: scene('corporate-present-tense', 'Margin Parade', ['Rowan', 'The promotion depends on one slideshow. My employer says the depot account is clean.'], ['Rowan', 'One presentation, then lunch. How hard can that be?']), contact: 'Rowan Pike, analyst', reward: 100, time: 480,
        briefing: 'Margin Parade, your employer, has scheduled a crucial slideshow. Enter the Capitol Centre office and try the PowerPunt presentation station before lunch.',
        outro: 'Rowan: PowerPunt lost every slide. My manager called that an opportunity. I am taking lunch.',
        stages: [target(mall, 'Enter the Capitol Centre office and try the PowerPunt presentation', 'presentation', { roomId: 'interior-canberra-centre', hold: 0 }), target(mall, 'Leave the Capitol Centre office and step outside after the outage', 'foot', { radius: 18, hold: 2 })] },
      { id: 'corporate-lunch-breakpoint', name: 'Lunch breakpoint', cutscene: scene('corporate-lunch-breakpoint', 'Out to lunch', ['Rowan', 'PowerPunt lost the slides. My manager called it an opportunity.'], ['Rowan', 'I need lunch and five minutes without office politics.']), contact: 'Rowan Pike', reward: 150, time: 540,
        briefing: 'Walk along Bunda Street to Lambzhou 1919. Visit the counter, then talk to Dot at the corner booth. She throws noodles at you, then attacks. Face the dispute, then leave and lose any police attention.',
        outro: 'Rowan: A broken slideshow, thrown noodles and a fistfight. Lunch is over. Mara has work that leaves a receipt.',
        stages: [target(noodle, 'Lambzhou 1919: enter and reach the service counter', 'interior', { storeId: noodle.id || 'store-5656111023', radius: 2.5 }), target(noodle, 'Lambzhou 1919 booth: talk to Dot, then face her noodle throw and attack', 'encounter', { storeId: 'store-5656111023', hold: 0 }), target(noodle, 'Leave Lambzhou 1919 and cool off outside on Bunda Street', 'foot', { radius: 18, hold: 3, clear: true })] },
    ],
    basement: [
      { id: 'basement-touch-grass', name: 'Touch grass', combat: false, cutscene: scene('basement-touch-grass', 'The overdue notice', ['Milo', 'A depot collector says I owe for parcels I never received. Staying in the basement is getting expensive.'], ['Milo', `My saloon is ready. First, pack my case at ${homeLocation}, then drive to Coals for paid work.`]), contact: 'Milo Finch', reward: 100, time: 540,
        briefing: `Start in your saloon near ${homeLocation}. Stop and press E to exit, then enter your home and pack your case at the case table. Leave through the same door. Press E beside your car to get in, drive to Coals and stop outside. Press E to exit, enter the shop and complete a stock shift. Attacks are disabled during this job.`,
        outro: 'Milo: Actual work. Actual wages. Disturbingly effective.',
        stages: [target(home, `Inside ${homeLocation}: pack your case at the case table`, 'home-action', homeTask), target(homeApproach, `Step outside ${homeLocation} through the same door; E beside your car to get in`, 'foot', { radius: 12, hold: 1 }), target(shop, 'Drive your car to Coals and stop outside; E exits', 'drive', { stop: true }), target(shop, 'Inside Coals: complete the stock shift', 'work', { storeId: shop.id, hold: 0 })] },
      { id: 'basement-first-delivery', name: 'Signed for', cutscene: scene('basement-first-delivery', 'A real receipt', ['Mara', 'One parcel, one signature. Keep the receipt this time.'], ['Milo', 'If the depot tries charging twice, I want proof.']), contact: 'Mara, local courier', reward: 150, time: 600,
        briefing: 'Collect Mara\'s sealed parcel outside Coals on foot. Press E beside your car to get in, then drive to Kingston and stop before handover. Press E to exit and deliver the parcel on foot.',
        outro: 'Milo: The parcel has the same depot code as two other receipts. Mara wants all three people together.',
        stages: [target(shop, 'Collect the sealed parcel outside Coals', 'foot', { radius: 12 }), target(kingston, 'Drive to the Kingston meeting approach and stop; E exits', 'drive', { stop: true }), target(kingston, 'Hand over the parcel on foot', 'foot', { radius: 16, hold: 2 })] },
    ],
  });
  const meeting = freeze({ id: 'three-receipts', name: 'Three receipts', cutscene: scene('three-receipts', 'One fraudulent depot', ['Mara', 'Kit lost a club refund. Rowan approved the account. Milo got the fake debt. The same depot charged all three.'], ['Mara', 'Meet at Kingston. We take back the money and the ledger together.']), contact: 'Kit, Rowan, Milo and Mara', reward: 200, time: 600,
    briefing: 'All three introductions are complete. Meet on foot at the Kingston public approach. Kit has the missing refund reference, Rowan has the failed depot presentation and Milo has the double-charged delivery receipt. Mara can connect the depot code.',
    outro: 'Mara: Three people, one fraudulent depot. We take back the money together. Meet on the Crescent for the interception.',
    stages: [target(meetingPoint || kingston, 'Meet the three couriers at the Kingston public approach', 'foot', { radius: 16, hold: 5 }), target(map.spawn, 'Drive to the Crescent for the late shift', 'drive', { stop: true })] });
  const ids = characters.map(c => c.id);
  const emptyIntros = () => Object.fromEntries(ids.map(id => [id, []]));
  const state = { character: null, intros: emptyIntros(), meeting: false, legacy: false, completed: [], active: null, message: 'Choose a character to begin.', failed: false };
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const keys = (value, allowed) => object(value) && Object.keys(value).length === allowed.length && Object.keys(value).every(k => allowed.includes(k));
  const prefix = (value, chapters) => Array.isArray(value) && value.length <= chapters.length && value.every((id, index) => chapters[index]?.id === id);
  if (saved !== null) {
    if (keys(saved, ['version', 'completed']) && saved.version === 1 && prefix(saved.completed, shared)) {
      state.character = 'legacy'; state.legacy = true; state.completed = [...saved.completed];
    } else {
      if (!keys(saved, ['version', 'character', 'intros', 'meeting', 'legacy', 'completed']) || saved.version !== 2 ||
          ![null, 'legacy', ...ids].includes(saved.character) || typeof saved.meeting !== 'boolean' || typeof saved.legacy !== 'boolean' ||
          !keys(saved.intros, ids) || ids.some(id => !prefix(saved.intros[id], intros[id])) || !prefix(saved.completed, shared) ||
          (saved.character === 'legacy' && !saved.legacy) || (saved.character === null && (saved.legacy || saved.meeting || saved.completed.length || ids.some(id => saved.intros[id].length))) ||
          (saved.meeting && ids.some(id => saved.intros[id].length !== intros[id].length)) ||
          (saved.completed.length && !saved.legacy && !saved.meeting)) throw new Error('Unsupported or corrupt campaign progress.');
      state.character = saved.character; state.intros = clone(saved.intros); state.meeting = saved.meeting; state.legacy = saved.legacy; state.completed = [...saved.completed];
    }
  }
  const events = [];
  const allIntroduced = () => ids.every(id => state.intros[id].length === intros[id].length);
  const current = () => {
    if (!state.character) return null;
    if (state.character === 'legacy') return shared[state.completed.length] || null;
    const opening = intros[state.character][state.intros[state.character].length];
    if (opening) return opening;
    if (!allIntroduced()) return null;
    if (!state.meeting) return meeting;
    const chapter = shared[state.completed.length];
    return chapter?.character === state.character ? chapter : null;
  };
  const chapters = () => state.character === 'legacy' ? shared : [...(intros[state.character] || []), meeting, ...shared.filter(chapter => chapter.character === state.character)];
  const nextRequiredCharacter = () => {
    if (state.character === 'legacy' || !allIntroduced() || !state.meeting) return null;
    const chapter = shared[state.completed.length];
    return chapter && chapter.character !== state.character ? characters.find(hero => hero.id === chapter.character) : null;
  };
  const requiredMessage = () => {
    const hero = nextRequiredCharacter();
    return hero ? `Switch to ${hero.name} for ${shared[state.completed.length].name}.` : null;
  };
  const isCompleted = id => state.completed.includes(id) || (id === meeting.id && state.meeting) || ids.some(hero => state.intros[hero].includes(id));
  function validContext(ctx) {
    return ctx && finitePoint(ctx.pose) && typeof ctx.onFoot === 'boolean' && Number.isSafeInteger(ctx.respawnSerial) && Number.isFinite(ctx.wanted) && ctx.wanted >= 0 && ctx.wanted <= 5;
  }
  function canSelectCharacter(id) {
    return ids.includes(id) && !state.active;
  }
  function selectCharacter(id, ctx) {
    if (!validContext(ctx) || ctx.sandbox || ctx.recovering || !ctx.campaign) return { ok: false, message: 'Campaign unavailable here.' };
    if (!ids.includes(id)) return { ok: false, message: 'Choose an available character.' };
    if (!canSelectCharacter(id)) return { ok: false, message: 'Finish or cancel the active mission before switching characters.' };
    state.character = id; state.failed = false; state.message = `${characters.find(c => c.id === id).name}: ${current()?.briefing || requiredMessage() || (allIntroduced() && state.meeting ? 'Campaign complete.' : 'Choose another character to bring the three stories together.')}`;
    return { ok: true, message: state.message };
  }
  const serial = value => Number.isSafeInteger(value?.serial) && value.serial >= 0 ? value.serial : 0;
  const baselines = (ctx, previous = {}) => Object.fromEntries(Object.entries({ presentation: serial(ctx.presentation), encounter: serial(ctx.encounter), work: serial(ctx.workCompletion), schoolAlarm: serial(ctx.schoolAlarm), heist: serial(ctx.heist), homeAction: serial(ctx.homeAction) }).map(([kind, value]) => [kind, Math.max(value, previous[kind] || 0)]));
  function start(ctx) {
    if (!validContext(ctx) || ctx.sandbox || ctx.recovering || !ctx.campaign) return { ok: false, message: 'Campaign unavailable here.' };
    if (state.active) return { ok: false, message: 'Mission already active.' };
    const chapter = current();
    if (!chapter) return { ok: false, message: !state.character ? 'Choose a character first.' : requiredMessage() || (!allIntroduced() && state.character !== 'legacy' ? 'Choose another character to complete their introduction.' : 'Campaign complete.') };
    state.active = { id: chapter.id, name: chapter.name, reward: chapter.reward, combat: chapter.combat !== false, companions: clone(chapter.companions || []), cutscene: chapter.cutscene ? clone(chapter.cutscene) : null, stage: 0, target: clone(chapter.stages[0]), remaining: chapter.time, elapsed: 0, held: 0, serial: ctx.respawnSerial, sawWanted: ctx.wanted > 0, baselines: baselines(ctx) };
    state.failed = false; state.message = chapter.briefing;
    events.push({ type: 'started', id: chapter.id, incident: Boolean(chapter.incident), wantedLevel: chapter.wantedLevel || 0 });
    return { ok: true, message: chapter.name };
  }
  function fail(message) {
    if (!state.active) return false;
    state.active = null; state.failed = true; state.message = message;
    events.push({ type: 'failed', message }); return true;
  }
  function update(dt, ctx) {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Campaign dt must be finite and nonnegative.');
    const active = state.active;
    if (!active || !validContext(ctx) || ctx.sandbox || !ctx.campaign || dt === 0) return;
    if (ctx.respawnSerial !== active.serial || ctx.recovering) { fail('Mission failed. Completed chapters kept. Open Campaign to retry.'); return; }
    const step = Math.min(dt, .1), chapter = current(), goal = active.target;
    active.remaining = Math.max(0, active.remaining - step); active.elapsed += step; active.sawWanted ||= ctx.wanted > 0;
    if (!active.remaining) { fail('Time expired. Open Campaign to retry.'); return; }
    let eligible = goal.anywhere || distance(ctx.pose, goal) <= goal.radius;
    if (goal.kind === 'interior') eligible = ctx.onFoot && ctx.interior?.storeId === goal.storeId && ctx.interior?.atCounter === true;
    else if (goal.kind === 'home-action') eligible = ctx.onFoot && ctx.interior?.roomId === goal.roomId && ctx.homeAction?.roomId === goal.roomId && ctx.homeAction?.outcome === 'packed' && serial(ctx.homeAction) > active.baselines.homeAction;
    else if (goal.kind === 'school-alarm') eligible = ctx.onFoot && ctx.interior?.roomId === goal.roomId && ctx.schoolAlarm?.roomId === goal.roomId && ctx.schoolAlarm?.outcome === 'triggered' && serial(ctx.schoolAlarm) > active.baselines.schoolAlarm;
    else if (goal.kind === 'robbery') eligible = ctx.onFoot && ctx.interior?.storeId === goal.storeId && ctx.heist?.storeId === goal.storeId && ctx.heist?.kind === 'robbery' && serial(ctx.heist) > active.baselines.heist;
    else if (goal.kind === 'presentation') eligible = ctx.onFoot && ctx.interior?.roomId === goal.roomId && ctx.presentation?.roomId === goal.roomId && ctx.presentation?.outcome === 'outage' && serial(ctx.presentation) > active.baselines.presentation;
    else if (goal.kind === 'encounter') eligible = ctx.onFoot && ctx.interior?.storeId === goal.storeId && ctx.encounter?.storeId === goal.storeId && ctx.encounter?.roomId === ctx.interior?.roomId && ctx.encounter?.character === 'booth-guest' && ctx.encounter?.phase === 'complete' && ctx.encounter?.outcome === 'noodle-fight' && serial(ctx.encounter) > active.baselines.encounter;
    else if (goal.kind === 'work') eligible = ctx.onFoot && ctx.interior?.storeId === goal.storeId && ctx.workCompletion?.storeId === goal.storeId && serial(ctx.workCompletion) > active.baselines.work;
    else if (goal.kind === 'foot') eligible &&= ctx.onFoot && !ctx.interior;
    else if (goal.kind === 'stolen') eligible &&= !ctx.onFoot && ctx.vehicle?.stolen === true;
    else if (goal.kind === 'escape') eligible &&= active.sawWanted && ctx.wanted === 0;
    else eligible &&= !ctx.onFoot && ctx.vehicleHealth > 0;
    if (goal.foot) eligible &&= ctx.onFoot && !ctx.interior;
    if (goal.stop) eligible &&= Math.abs(ctx.pose.speed || 0) < 1.2;
    if (goal.stolen) eligible &&= ctx.vehicle?.stolen === true;
    if (goal.clear) eligible &&= ctx.wanted === 0;
    active.held = eligible ? active.held + step : 0;
    if (!eligible || active.held + 1e-9 < goal.hold || active.elapsed < .5) return;
    if (active.stage + 1 < chapter.stages.length) {
      active.stage++; active.target = clone(chapter.stages[active.stage]); active.held = 0; active.baselines = baselines(ctx, active.baselines);
      events.push({ type: 'stage', message: active.target.label });
    } else {
      if (ids.includes(state.character) && intros[state.character].some(item => item.id === chapter.id)) state.intros[state.character].push(chapter.id);
      else if (chapter.id === meeting.id) state.meeting = true;
      else state.completed.push(chapter.id);
      state.active = null; state.message = chapter.outro; state.failed = false;
      events.push({ type: 'complete', id: chapter.id, reward: chapter.reward, message: chapter.outro });
    }
  }
  return { state, characters, get chapters() { return chapters(); }, current, nextRequiredCharacter, start, update, selectCharacter, canSelectCharacter, isCompleted,
    cancel: () => fail('Mission cancelled. Open Campaign to retry.'),
    serialize: () => clone({ version: 2, character: state.character, intros: state.intros, meeting: state.meeting, legacy: state.legacy, completed: state.completed }),
    journal: () => freeze(clone({ character: state.character, introductions: ids.map(id => ({ character: id, chapters: intros[id].map(item => ({ id: item.id, name: item.name, complete: isCompleted(item.id) })) })), meeting: state.meeting, shared: shared.map(item => ({ id: item.id, character: item.character, name: item.name, complete: isCompleted(item.id) })) })),
    snapshot: () => freeze(clone({ ...state, next: current()?.id || null, switching: ids.filter(canSelectCharacter) })), drainEvents: () => events.splice(0) };
}

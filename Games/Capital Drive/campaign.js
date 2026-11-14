// Original missions. Targets are public approaches, never surveyed private rooms.
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
  const redHill = place('redhill', { x: -1770, z: 1740, name: 'Red Hill' });
  const bridge = place('commonwealth-bridge', { x: -1230, z: -2840, name: 'Commonwealth Avenue Bridge' });
  const target = (point, label, kind = 'drive', extra = {}) => ({ x: point.x, z: point.z, label, kind, radius: 26, hold: 1, ...extra });
  const shared = freeze([
    { id: 'late-parcel', name: '1. Late parcel', contact: 'Mara, local courier', reward: 350, time: 360,
      briefing: 'A replacement driver has not shown up. Take the sealed parcel from the Crescent to the Manuka shopfront. Keep the car in one piece.',
      outro: 'Mara: You know these streets. There is more work if you want it.',
      stages: [target(map.spawn, 'Collect the parcel on the Crescent'), target(shop, 'Stop outside Coals', 'drive', { stop: true })] },
    { id: 'under-the-awning', name: '2. Under the awning', contact: 'Mara', reward: 450, time: 300,
      briefing: 'The shopkeeper has a ledger for Mara. Park nearby, walk inside Coals and collect it at the counter. Then return to your car.',
      outro: 'Mara: Those missing deliveries all passed through the same depot.',
      stages: [target(shop, 'Enter Coals and reach its counter', 'interior', { storeId: shop.id, radius: 2.5, hold: 2 }), target(shop, 'Return to a car outside Coals', 'drive')] },
    { id: 'borrowed-wheels', name: '3. Borrowed wheels', contact: 'Jules, garage mechanic', reward: 700, time: 480,
      briefing: 'Jules wants a working example of the depot fleet. Take an occupied vehicle on the street, then bring it to the Kingston meeting point. Police must lose you before handover.',
      outro: 'Jules: Same depot markings. Someone has been selling the parcels twice.',
      stages: [target(shop, 'Take an occupied street vehicle', 'stolen', { anywhere: true }), target(kingston, 'Deliver the stolen vehicle in Kingston', 'drive', { stolen: true, clear: true, stop: true })] },
    { id: 'quiet-streets', name: '4. Quiet streets', contact: 'Jules', reward: 800, time: 540, incident: true,
      briefing: 'The handover has drawn attention. Leave the patrols behind, reach the Red Hill meeting point and stay out of sight until the search ends.',
      outro: 'Jules: We are clear. Mara has found the final delivery address across the lake.',
      stages: [target(redHill, 'Lose the police and wait at Red Hill', 'escape', { clear: true, hold: 7, radius: 45 })] },
    { id: 'across-the-water', name: '5. Across the water', contact: 'Mara', reward: 1000, time: 660,
      briefing: 'Take the recovered ledger to the city. Follow the route across Commonwealth Avenue Bridge, then stop at the Canberra Centre public approach.',
      outro: 'Mara: Delivered. The missing stock is accounted for, and the depot cannot pin it on us.',
      stages: [target(bridge, 'Cross Commonwealth Avenue Bridge', 'drive', { radius: 75, hold: 0 }), target(centre, 'Stop at Canberra Centre', 'drive', { stop: true, radius: 40 })] },
    { id: 'home-by-the-lake', name: '6. Home by the lake', contact: 'Mara', reward: 1200, time: 720,
      briefing: 'One last run home. Return to Manuka, park outside Coals and meet Mara on foot. The rest of Canberra is yours after that.',
      outro: 'Mara: Good driving. The next shift is yours to choose. Campaign complete.',
      stages: [target(shop, 'Return to Manuka', 'drive', { stop: true }), target(shop, 'Meet Mara outside Coals on foot', 'foot', { hold: 3, radius: 12 })] },
  ]);
  const noodle = place('store-5656111023', { x: -367.096, z: -4406.948, name: 'Lambzhou 1919' });
  const mall = { x: -248.655, z: -4172.87 };
  const characters = freeze([
    { id: 'student', name: 'Kit Vale', age: 18, tagline: 'A Telopea student with one last errand and very little patience.', appearance: 'student', start: { ...map.spawn }, onFoot: true },
    { id: 'corporate', name: 'Rowan Pike', age: 29, tagline: 'A Civic analyst whose career depends on a slideshow.', appearance: 'corporate', start: { ...mall }, onFoot: true },
    { id: 'basement', name: 'Milo Finch', age: 26, tagline: 'A basement regular trying a radical new strategy: going outside.', appearance: 'basement', start: { x: kingston.x, z: kingston.z }, onFoot: true },
  ]);
  const intros = freeze({
    student: [
      { id: 'student-paper-chase', name: 'Paper chase', contact: 'Kit Vale', reward: 100, time: 480,
        briefing: 'Your club flyers went to the wrong gate. Collect both bundles, then take them to the Crescent. The prank is a fake timetable for the chess club.',
        outro: 'Kit: Three delivery stickers. One fictional depot. Apparently even a harmless prank needs logistics.',
        stages: [target({ x: -337.147, z: -385.029 }, 'Collect the club flyers at the west path gate', 'foot', { radius: 7 }), target({ x: -137.704, z: -225.963 }, 'Collect the second bundle at the park path gate', 'foot', { radius: 7 }), target(map.spawn, 'Bring the flyers to the Crescent', 'foot', { radius: 12 })] },
      { id: 'student-extra-credit', name: 'Extra credit', contact: 'Mara, local courier', reward: 150, time: 660,
        briefing: 'Mara will carry the flyers if you cover a stock task at Coals. Drive over, enter the shop and finish a stock activity.',
        outro: 'Kit: Shift finished. Mara wants the depot stickers brought to Kingston.',
        stages: [target(shop, 'Park outside Coals', 'drive', { stop: true }), target(shop, 'Enter Coals and finish a stock shift', 'work', { storeId: shop.id, hold: 0 })] },
    ],
    corporate: [
      { id: 'corporate-present-tense', name: 'Present tense', contact: 'Rowan Pike, fictional analyst', reward: 100, time: 480,
        briefing: 'Margin Parade, your fictional employer, has scheduled a crucial slideshow. Enter Capitol Centre and try the PowerPunt presentation station before lunch.',
        outro: 'Rowan: PowerPunt lost every slide. My manager called that an opportunity. I am taking lunch.',
        stages: [target(mall, 'Enter Capitol Centre and try the PowerPunt presentation', 'presentation', { roomId: 'interior-canberra-centre', hold: 0 }), target(mall, 'Step outside after the PowerPunt outage', 'foot', { radius: 18, hold: 2 })] },
      { id: 'corporate-lunch-breakpoint', name: 'Lunch breakpoint', contact: 'Rowan Pike', reward: 150, time: 540,
        briefing: 'Walk along Bunda Street to Lambzhou 1919. Visit the counter, then talk to Dot, the fictional adult diner in pink earmuffs. Resolve the booth dispute and leave.',
        outro: 'Rowan: A broken slideshow and a noodle-shop argument. Enough office politics. Mara has work that leaves a receipt.',
        stages: [target(noodle, 'Enter Lambzhou 1919 and reach the counter', 'interior', { storeId: noodle.id || 'store-5656111023', radius: 2.5 }), target(noodle, 'Talk to the pink-earmuff diner and resolve the dispute', 'encounter', { storeId: 'store-5656111023', hold: 0 }), target(noodle, 'Leave the shop and cool off outside', 'foot', { radius: 18, hold: 3, clear: true })] },
    ],
    basement: [
      { id: 'basement-touch-grass', name: 'Touch grass', contact: 'Milo Finch', reward: 100, time: 540,
        briefing: 'The basement has excellent reception and terrible prospects. Step into daylight, walk to the park path, then drive to Coals and finish a stock task. Temp work beats refreshing the inbox.',
        outro: 'Milo: Actual work. Actual wages. Disturbingly effective.',
        stages: [target({ x: -137.704, z: -225.963 }, 'Walk to the daylight park path', 'foot', { radius: 9, hold: 2 }), target(shop, 'Finish a stock shift inside Coals', 'work', { storeId: shop.id, hold: 0 })] },
      { id: 'basement-first-delivery', name: 'Signed for', contact: 'Mara, local courier', reward: 150, time: 600,
        briefing: 'Pick up Mara\'s sealed parcel outside Coals and deliver it to Kingston. Stop before handover, then step out. No browser refresh can do this shift for you.',
        outro: 'Milo: The parcel has the same depot code as two other receipts. Mara wants all three people together.',
        stages: [target(shop, 'Collect the sealed parcel outside Coals', 'foot', { radius: 12 }), target(kingston, 'Stop at the Kingston meeting approach', 'drive', { stop: true }), target(kingston, 'Hand over the parcel on foot', 'foot', { radius: 16, hold: 2 })] },
    ],
  });
  const meeting = freeze({ id: 'three-receipts', name: 'Three receipts', contact: 'Kit, Rowan, Milo and Mara', reward: 200, time: 600,
    briefing: 'All three introductions are complete. Meet on foot at the Kingston public approach. Kit has the stickers, Rowan has a ruined presentation and Milo has the delivery receipt. Mara can connect the depot code.',
    outro: 'Mara: Three strangers, one depot. We follow the parcels together. The late shift starts on the Crescent.',
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
          (saved.completed.length && !saved.legacy && !saved.meeting) ||
          (ids.filter(id => saved.intros[id].length > 0 && saved.intros[id].length < intros[id].length).some(id => id !== saved.character))) throw new Error('Unsupported or corrupt campaign progress.');
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
    return !state.meeting ? meeting : shared[state.completed.length] || null;
  };
  const chapters = () => state.character === 'legacy' ? shared : [...(intros[state.character] || []), meeting, ...shared];
  const isCompleted = id => state.completed.includes(id) || (id === meeting.id && state.meeting) || ids.some(hero => state.intros[hero].includes(id));
  function validContext(ctx) {
    return ctx && finitePoint(ctx.pose) && typeof ctx.onFoot === 'boolean' && Number.isSafeInteger(ctx.respawnSerial) && Number.isFinite(ctx.wanted) && ctx.wanted >= 0 && ctx.wanted <= 5;
  }
  function canSelectCharacter(id) {
    return ids.includes(id) && !state.active && (state.character === null || state.character === 'legacy' || state.intros[state.character].length === intros[state.character].length);
  }
  function selectCharacter(id, ctx) {
    if (!validContext(ctx) || ctx.sandbox || ctx.recovering || !ctx.campaign || !canSelectCharacter(id)) return { ok: false, message: 'Finish this character\'s introduction before switching.' };
    state.character = id; state.failed = false; state.message = `${characters.find(c => c.id === id).name}: ${current()?.briefing || 'Choose another character to bring the three stories together.'}`;
    return { ok: true, message: state.message };
  }
  const serial = value => Number.isSafeInteger(value?.serial) && value.serial >= 0 ? value.serial : 0;
  const baselines = ctx => ({ presentation: serial(ctx.presentation), encounter: serial(ctx.encounter), work: serial(ctx.workCompletion) });
  function start(ctx) {
    if (!validContext(ctx) || ctx.sandbox || ctx.recovering || !ctx.campaign) return { ok: false, message: 'Campaign unavailable here.' };
    if (state.active) return { ok: false, message: 'Mission already active.' };
    const chapter = current();
    if (!chapter) return { ok: false, message: !state.character ? 'Choose a character first.' : !allIntroduced() && state.character !== 'legacy' ? 'Choose another character to complete their introduction.' : 'Campaign complete.' };
    state.active = { id: chapter.id, name: chapter.name, reward: chapter.reward, stage: 0, target: clone(chapter.stages[0]), remaining: chapter.time, elapsed: 0, held: 0, serial: ctx.respawnSerial, sawWanted: ctx.wanted > 0, baselines: baselines(ctx) };
    state.failed = false; state.message = chapter.briefing;
    events.push({ type: 'started', id: chapter.id, incident: Boolean(chapter.incident) });
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
    else if (goal.kind === 'presentation') eligible = ctx.onFoot && ctx.interior?.roomId === goal.roomId && ctx.presentation?.roomId === goal.roomId && ctx.presentation?.outcome === 'outage' && serial(ctx.presentation) > active.baselines.presentation;
    else if (goal.kind === 'encounter') eligible = ctx.onFoot && ctx.interior?.storeId === goal.storeId && ctx.encounter?.storeId === goal.storeId && ctx.encounter?.roomId === ctx.interior?.roomId && ctx.encounter?.character === 'booth-guest' && ctx.encounter?.phase === 'complete' && ['peaceful', 'confrontation'].includes(ctx.encounter?.outcome) && serial(ctx.encounter) > active.baselines.encounter;
    else if (goal.kind === 'work') eligible = ctx.onFoot && ctx.interior?.storeId === goal.storeId && ctx.workCompletion?.storeId === goal.storeId && serial(ctx.workCompletion) > active.baselines.work;
    else if (goal.kind === 'foot') eligible &&= ctx.onFoot && !ctx.interior;
    else if (goal.kind === 'stolen') eligible &&= !ctx.onFoot && ctx.vehicle?.stolen === true;
    else if (goal.kind === 'escape') eligible &&= active.sawWanted && ctx.wanted === 0;
    else eligible &&= !ctx.onFoot && ctx.vehicleHealth > 0;
    if (goal.stop) eligible &&= Math.abs(ctx.pose.speed || 0) < 1.2;
    if (goal.stolen) eligible &&= ctx.vehicle?.stolen === true;
    if (goal.clear) eligible &&= ctx.wanted === 0;
    active.held = eligible ? active.held + step : 0;
    if (!eligible || active.held + 1e-9 < goal.hold || active.elapsed < .5) return;
    if (active.stage + 1 < chapter.stages.length) {
      active.stage++; active.target = clone(chapter.stages[active.stage]); active.held = 0; active.baselines = baselines(ctx);
      events.push({ type: 'stage', message: active.target.label });
    } else {
      if (ids.includes(state.character) && intros[state.character].some(item => item.id === chapter.id)) state.intros[state.character].push(chapter.id);
      else if (chapter.id === meeting.id) state.meeting = true;
      else state.completed.push(chapter.id);
      state.active = null; state.message = chapter.outro; state.failed = false;
      events.push({ type: 'complete', id: chapter.id, reward: chapter.reward, message: chapter.outro });
    }
  }
  return { state, characters, get chapters() { return chapters(); }, current, start, update, selectCharacter, canSelectCharacter, isCompleted,
    cancel: () => fail('Mission cancelled. Open Campaign to retry.'),
    serialize: () => clone({ version: 2, character: state.character, intros: state.intros, meeting: state.meeting, legacy: state.legacy, completed: state.completed }),
    journal: () => freeze(clone({ character: state.character, introductions: ids.map(id => ({ character: id, chapters: intros[id].map(item => ({ id: item.id, name: item.name, complete: isCompleted(item.id) })) })), meeting: state.meeting, shared: shared.map(item => ({ id: item.id, name: item.name, complete: isCompleted(item.id) })) })),
    snapshot: () => freeze(clone({ ...state, next: current()?.id || null, switching: ids.filter(canSelectCharacter) })), drainEvents: () => events.splice(0) };
}

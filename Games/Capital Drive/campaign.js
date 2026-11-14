// Original missions. Targets are public approaches, never surveyed private rooms.
const clone = value => JSON.parse(JSON.stringify(value));
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

export function createCampaign(map, saved = null) {
  const place = (id, fallback) => map.landmarks.find(p => p.id === id) || fallback;
  const shop = map.landmarks.find(p => p.store && /coals/i.test(p.name));
  if (!finitePoint(map.spawn) || !finitePoint(shop)) throw new Error('Campaign requires the mapped spawn and Coals.');
  const centre = place('canberra-centre', { x: -456, z: -4500, name: 'Canberra Centre' });
  const kingston = place('kingston', { x: 923, z: 285, name: 'Kingston' });
  const redHill = place('redhill', { x: -1770, z: 1740, name: 'Red Hill' });
  const bridge = place('commonwealth-bridge', { x: -1230, z: -2840, name: 'Commonwealth Avenue Bridge' });
  const target = (point, label, kind = 'drive', extra = {}) => ({ x: point.x, z: point.z, label, kind, radius: 26, hold: 1, ...extra });
  const chapters = freeze([
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
  const state = { completed: [], active: null, message: '', failed: false };
  if (saved !== null) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved) || Object.keys(saved).some(k => !['version', 'completed'].includes(k)) || saved.version !== 1 || !Array.isArray(saved.completed) || saved.completed.length > chapters.length || saved.completed.some((id, index) => chapters[index]?.id !== id)) throw new Error('Unsupported or corrupt campaign progress.');
    state.completed = [...saved.completed];
  }
  const events = [];
  const current = () => chapters[state.completed.length] || null;
  function validContext(ctx) {
    return ctx && finitePoint(ctx.pose) && typeof ctx.onFoot === 'boolean' && Number.isSafeInteger(ctx.respawnSerial) && Number.isFinite(ctx.wanted) && ctx.wanted >= 0 && ctx.wanted <= 5;
  }
  function start(ctx) {
    if (!validContext(ctx) || ctx.sandbox || ctx.recovering) return { ok: false, message: 'Campaign unavailable here.' };
    if (state.active) return { ok: false, message: 'Mission already active.' };
    const chapter = current();
    if (!chapter) return { ok: false, message: 'Campaign complete.' };
    state.active = { id: chapter.id,name:chapter.name,reward:chapter.reward, stage: 0, target: clone(chapter.stages[0]), remaining: chapter.time, elapsed: 0, held: 0, serial: ctx.respawnSerial, sawWanted: ctx.wanted > 0 };
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
    else if (goal.kind === 'foot') eligible &&= ctx.onFoot && !ctx.interior;
    else if (goal.kind === 'stolen') eligible &&= !ctx.onFoot && ctx.vehicle?.stolen === true;
    else if (goal.kind === 'escape') eligible &&= active.sawWanted && ctx.wanted === 0;
    else eligible &&= !ctx.onFoot && ctx.vehicleHealth > 0;
    if (goal.stop) eligible &&= Math.abs(ctx.pose.speed || 0) < 1.2;
    if (goal.stolen) eligible &&= ctx.vehicle?.stolen === true;
    if (goal.clear) eligible &&= ctx.wanted === 0;
    active.held = eligible ? active.held + step : 0;
    if (!eligible || active.held < goal.hold || active.elapsed < .5) return;
    if (active.stage + 1 < chapter.stages.length) {
      active.stage++; active.target = clone(chapter.stages[active.stage]); active.held = 0;
      events.push({ type: 'stage', message: active.target.label });
    } else {
      state.completed.push(chapter.id); state.active = null; state.message = chapter.outro; state.failed = false;
      events.push({ type: 'complete', id: chapter.id, reward: chapter.reward, message: chapter.outro });
    }
  }
  return { state, chapters, current, start, update, cancel: () => fail('Mission cancelled. Open Campaign to retry.'),
    serialize: () => ({ version: 1, completed: [...state.completed] }),
    snapshot: () => freeze(clone({ ...state, next: current()?.id || null })), drainEvents: () => events.splice(0) };
}

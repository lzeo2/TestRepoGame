// Supplied-time observation owner. Only a fresh scan edge after a steady view
// creates a mission-bound receipt; this module never pays or stores progress.
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const frozen = value => Object.freeze({ ...value });
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export function createRecon() {
  let objective = null, key = null, held = 0, previousScan = true, anchor = null;
  let respawn = null, serial = 0, receipt = null, reason = 'No reconnaissance objective.';
  const events = [];
  function reset() { held = 0; anchor = null; previousScan = true; }
  function setObjective(active, descriptor = active?.target) {
    const goal = active?.target;
    const nextKey = goal?.kind === 'recon' && typeof active.id === 'string' && Number.isSafeInteger(active.stage) &&
      point(descriptor) && (descriptor.y == null || Number.isFinite(descriptor.y)) && typeof goal.targetId === 'string' && descriptor.targetId === goal.targetId ?
      `${active.id}:${active.stage}:${goal.targetId}` : null;
    if (nextKey === key) return;
    key = nextKey; reset(); receipt = null; respawn = null; events.length = 0;
    const minDistance = Math.max(2, Math.min(18, Number.isFinite(descriptor?.minDistance) ? descriptor.minDistance : 2));
    objective = key ? frozen({ ...descriptor, missionId: active.id, stage: active.stage, targetId: goal.targetId,
      space: descriptor.space ?? null, y: descriptor.y ?? 1.6,
      minDistance,
      maxDistance: Math.max(minDistance, Math.min(18, Number.isFinite(descriptor.maxDistance) ? descriptor.maxDistance : 18)), hold: Number.isFinite(descriptor.hold) ? Math.max(.5, descriptor.hold) : 1.1 }) : null;
    reason = key ? 'Stand still, frame the marker, then press I to scan.' : 'No reconnaissance objective.';
  }
  function step(dt, context = {}) {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Recon dt must be finite and nonnegative.');
    const c = context, scan = c.scan === true;
    if (!objective || receipt) { previousScan = scan; return; }
    if (!dt || c.paused || c.recovering || c.sandbox || c.campaign !== true || c.onFoot !== true ||
        !point(c.pose) || !Number.isFinite(c.yaw) || !Number.isFinite(c.pitch) || (c.eyeHeight != null && !Number.isFinite(c.eyeHeight)) ||
        !Number.isFinite(c.health) || c.health <= 0 || (c.space ?? null) !== objective.space || c.missionId !== objective.missionId || c.stage !== objective.stage) {
      reset(); reason = 'Recon unavailable. Resume on foot at the marked place.'; return;
    }
    if (!Number.isSafeInteger(c.respawnSerial) || (respawn !== null && c.respawnSerial !== respawn)) { respawn = c.respawnSerial; reset(); reason = 'Recovery interrupted the view. Frame a fresh scan.'; return; }
    respawn = c.respawnSerial;
    const dx = objective.x - c.pose.x, dz = objective.z - c.pose.z, range = Math.hypot(dx, dz);
    const targetPitch = Math.atan2((objective.y ?? 1.6) - (c.eyeHeight ?? 1.6), range);
    const looking = Math.abs(wrap(c.yaw - Math.atan2(-dx, -dz))) <= .15 && Math.abs(c.pitch - targetPitch) <= .15;
    const stable = !anchor || (Math.hypot(c.pose.x - anchor.x, c.pose.z - anchor.z) <= .35 &&
      Math.abs(wrap(c.yaw - anchor.yaw)) <= .07 && Math.abs(c.pitch - anchor.pitch) <= .07);
    const inRange = Number.isFinite(range) && range >= objective.minDistance && range <= objective.maxDistance;
    const eligible = inRange && Math.abs(c.pose.speed || 0) < .35 && looking && stable;
    // Physical sight traverses terrain and solids. Never trace during travel or reframing.
    const visible = eligible && typeof c.hasLineOfSight === 'function' && c.hasLineOfSight(c.pose, objective) === true;
    if (!visible) {
      held = 0; anchor = null;
      reason = !inRange ? `Stand ${objective.minDistance} to ${objective.maxDistance} m from the marked subject.` :
        !eligible ? 'Stand still and frame the marked subject.' : 'View blocked.';
    }
    else {
      if (!anchor) anchor = { x: c.pose.x, z: c.pose.z, yaw: c.yaw, pitch: c.pitch };
      held = Math.min(objective.hold, held + Math.min(dt, .1));
      reason = held >= objective.hold ? 'Ready. Release I, then press I to scan.' : 'Hold the view steady.';
      if (held + 1e-9 >= objective.hold && scan && !previousScan) {
        receipt = frozen({ serial: ++serial, missionId: objective.missionId, stage: objective.stage,
          targetId: objective.targetId, space: objective.space, kind: 'recon', outcome: 'documented' });
        events.push(receipt); reason = 'Recon documented.';
      }
    }
    previousScan = scan;
  }
  function clear() { key = null; objective = null; receipt = null; events.length = 0; reset(); reason = 'No reconnaissance objective.'; }
  return Object.freeze({ setObjective, step, clear, drainEvents: () => events.splice(0),
    snapshot: () => frozen({ active: Boolean(objective && !receipt), objective, held, ready: Boolean(objective && held >= objective.hold), reason, receipt }) });
}

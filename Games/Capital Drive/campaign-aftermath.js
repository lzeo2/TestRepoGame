const CASES = new Set(['corporate-lunch-breakpoint', 'earmuffs-rematch']);
const DECISIONS = new Set(['cooperated', 'declined', 'avoided']);
const DISTANCE = 36;
const usablePoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.z);
const copy = record => Object.freeze({ ...record });

function validate(saved) {
  if (saved === undefined || saved === null) return {};
  if (typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid campaign witness files.');
  const records = {};
  for (const [id, record] of Object.entries(saved)) {
    if (!CASES.has(id) || !record || Object.keys(record).sort().join() !== 'civilianHarm,decision,witnesses' ||
      !DECISIONS.has(record.decision) || typeof record.civilianHarm !== 'boolean' ||
      !Number.isInteger(record.witnesses) || record.witnesses < 0 || record.witnesses > 3) throw new Error('Invalid campaign witness file.');
    records[id] = copy(record);
  }
  return records;
}

export function createCampaignAftermath(saved) {
  let records = validate(saved), pending = null;
  function begin(id, point, { witnesses = 0, civilianHarm = false } = {}) {
    if (!CASES.has(id) || pending || records[id] || !usablePoint(point)) return false;
    pending = { id, point: copy(point), witnesses: Math.max(0, Math.min(3, Math.floor(Number(witnesses) || 0))), civilianHarm: civilianHarm === true };
    return true;
  }
  function settle(decision) {
    const { id, point, witnesses, civilianHarm } = pending;
    pending = null;
    records[id] = copy({ decision, witnesses, civilianHarm });
    const message = decision === 'cooperated' ? 'Officer filed your statement.' : decision === 'declined' ? 'Officer logged that you declined to answer.' : 'You left before speaking to the officer.';
    const severity = decision === 'cooperated' ? Number(civilianHarm) :
      civilianHarm || decision === 'avoided' && witnesses > 0 ? 2 : Number(witnesses > 0);
    return { id, point, message, severity };
  }
  function canSpeak(pose) {
    return Boolean(pending && usablePoint(pose) && Math.hypot(pose.x - pending.point.x, pose.z - pending.point.z) <= 4);
  }
  function choose(decision, context) {
    if (!pending || !['cooperated', 'declined'].includes(decision) || !context?.onFoot || context.indoors || !canSpeak(context.pose)) return null;
    return settle(decision);
  }
  function step({ pose, indoors, recovering } = {}) {
    if (!pending || recovering || !usablePoint(pose)) return null;
    const distance = Math.hypot(pose.x - pending.point.x, pose.z - pending.point.z);
    if (distance > DISTANCE || (indoors && distance > 12)) return settle('avoided');
    return null;
  }
  function scrutiny() {
    return Object.values(records).some(record => record.civilianHarm || (record.witnesses > 0 && record.decision !== 'cooperated')) ? 1 : 0;
  }
  return { begin, canSpeak, choose, step, scrutiny,
    isCase: id => CASES.has(id), recorded: id => Object.hasOwn(records, id),
    current: () => pending ? copy(pending) : null,
    serialize: () => ({ ...records }), restore(value) { records = validate(value); pending = null; },
  };
}

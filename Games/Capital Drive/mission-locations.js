// Read-only mission directions. Live campaign/gameplay owners decide completion.
const point = value => value && Number.isFinite(value.x) && Number.isFinite(value.z);
const identity = value => (typeof value === 'string' && value.length > 0) || (typeof value === 'number' && Number.isFinite(value));
const name = (value, fallback = '') => typeof value === 'string' && value.trim() ? value : fallback;
const copyPoint = value => Object.freeze({ x: value.x, z: value.z });
const approach = entry => Object.freeze({ x: entry.x - Math.sin(entry.yaw) * 1.8,
  z: entry.z - Math.cos(entry.yaw) * 1.8 });
const validEntry = entry => point(entry) && typeof entry.id === 'string' && entry.id.length > 0 &&
  identity(entry.buildingId) && Number.isFinite(entry.yaw);
function copyEntry(entry) {
  return Object.freeze({ id: entry.id, buildingId: entry.buildingId, type: entry.type,
    name: name(entry.name, 'the mission location'), storeId: entry.storeId ?? null,
    x: entry.x, z: entry.z, yaw: entry.yaw,
    approach: point(entry.approach) ? copyPoint(entry.approach) : approach(entry) });
}

export function selectStoryHomes(map, entries, { canApproach = () => true, roadName = () => '' } = {}) {
  const kingston = point(map?.kingston) ? map.kingston :
    (Array.isArray(map?.landmarks) ? map.landmarks.find(p => point(p) && p.id === 'kingston') : null);
  if (!kingston || !Array.isArray(entries) || typeof canApproach !== 'function' || typeof roadName !== 'function')
    return Object.freeze({ basement: null });
  const sourceIds = Array.isArray(map.buildings) ? new Set(map.buildings.map(b => b?.id).filter(identity)) : null;
  const candidates = [];
  for (const entry of entries) {
    if (!validEntry(entry) || entry.type !== 'house' || (sourceIds && !sourceIds.has(entry.buildingId))) continue;
    const distance = Math.hypot(entry.x - kingston.x, entry.z - kingston.z);
    if (Number.isFinite(distance)) candidates.push({ entry, distance });
  }
  candidates.sort((a, b) => a.distance - b.distance ||
    (a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0));
  // Physical clearance can query the whole local world. Stop at the first
  // clear door rather than paying that cost for every house in the export.
  let best = null, outside = null;
  for (const { entry } of candidates) {
    const probe = approach(entry);
    if (canApproach(probe) !== true) continue;
    best = copyEntry(entry); outside = probe;
    break;
  }
  if (!best) return Object.freeze({ basement: null });
  return Object.freeze({ basement: Object.freeze({ id: best.id, roomId: best.id,
    buildingId: best.buildingId, type: 'house', name: "Milo's safehouse", street: name(roadName(best)),
    x: best.x, z: best.z, yaw: best.yaw, approach: outside }) });
}

const INTERIOR_KINDS = new Set(['school-alarm', 'presentation', 'home-action', 'work', 'robbery', 'interior', 'encounter', 'fight', 'evidence']);
const STATION_KINDS = { 'school-alarm': 'alarm', presentation: 'presentation', 'home-action': 'stock', work: 'stock', evidence: 'evidence' };

export function createMissionGuide(entries, storyHomes = {}) {
  const byId = new Map(), byStore = new Map(), homes = new Map();
  for (const entry of (Array.isArray(entries) ? entries : []).filter(validEntry).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    const copy = copyEntry(entry);
    if (!byId.has(copy.id)) byId.set(copy.id, copy);
    if (identity(copy.storeId) && !byStore.has(copy.storeId)) byStore.set(copy.storeId, copy);
  }
  for (const home of Object.values(storyHomes || {})) {
    const entry = byId.get(home?.roomId);
    if (entry?.type === 'house' && entry.buildingId === home.buildingId && point(home) &&
        entry.x === home.x && entry.z === home.z) homes.set(entry.id, Object.freeze({
      name: name(home.name, entry.name), street: name(home.street),
      approach: point(home.approach) ? copyPoint(home.approach) : entry.approach }));
  }

  function guide(active, context = {}) {
    const { pose, plan, people } = context || {};
    const goal = active?.target;
    if (!goal) return null;
    function result(instruction, location, target, indoors = false, entryId = null, stationId = null) {
      if (!point(target)) return null;
      const distance = point(pose) ? Math.hypot(pose.x - target.x, pose.z - target.z) : NaN;
      return Object.freeze({ instruction, location, point: copyPoint(target),
        distance: Number.isFinite(distance) ? distance : null,
        indoors, entryId, stationId });
    }
    if(goal.kind==='escape' && active.escapeReached===true)return Object.freeze({
      instruction: goal.aftermath && context.aftermathResolved === false && !plan ?
        'Walk out (E leaves) and speak to the officer outside, or simply leave the area.' : context.wanted>0?'Location reached. Keep moving until the police search bar empties.':'Location reached. Stay clear of the police.',
      location:'Escape the police',point:null,distance:null,indoors:false,entryId:null,stationId:null,escaping:true});
    const findVehicle = goal.kind === 'stolen' && goal.anywhere;
    if (goal.kind==='stealth-contract' && goal.roomId) {
      const entry = byId.get(goal.roomId);
      if (!entry) return null;
      if (plan?.id===entry.id) return result(name(goal.label),entry.name,goal,true,entry.id);
      if (!plan) return result(`Walk to the marked door of ${entry.name} and press E to go inside.`,entry.name,entry.approach,false,entry.id);
    }
    if((findVehicle||goal.kind==='escape'||goal.kind==='stealth-contract')&&plan&&point(plan.exit))return result('Walk to the marked exit door and press E to leave the building.',name(plan.name,'the building'),plan.exit,true,plan.id);
    if(findVehicle)return Object.freeze({
      instruction:'Find any parked street vehicle, walk to its door and press E to get in.',location:'Find a vehicle',
      point:null,distance:null,indoors:false,entryId:null,stationId:null,roaming:true});
    const fallback = () => result(name(goal.label), name(goal.location, name(goal.label)), goal);
    if (goal.kind === 'recon') {
      const entry = byStore.get(goal.storeId);
      const subject = entry ? (goal.subject === 'departure' ? entry.approach : { x: entry.x - Math.sin(entry.yaw) * .25, z: entry.z - Math.cos(entry.yaw) * .25 }) : goal;
      if (!point(subject) || typeof goal.targetId !== 'string') return fallback();
      const directions = result(name(goal.label), entry?.name || name(goal.location, goal.label), subject);
      const hold = goal.settleSeconds ?? 1.1;
      return Object.freeze({ ...directions, recon: Object.freeze({ targetId: goal.targetId, x: subject.x, z: subject.z, y: 1.6, space: null, minDistance: 2, maxDistance: 18, hold }) });
    }
    if (!INTERIOR_KINDS.has(goal.kind)) return fallback();
    const entry = identity(goal.roomId) ? byId.get(goal.roomId) : byStore.get(goal.storeId);
    if (!entry || (identity(goal.storeId) && entry.storeId !== goal.storeId)) return fallback();
    const home = homes.get(entry.id);
    const location = home ? `${home.name}${home.street ? ` on ${home.street}` : ''}` : entry.name;
    const matchingRoom = plan?.id === entry.id && (!identity(goal.storeId) || plan.storeId === goal.storeId);
    if (!matchingRoom) return result(`Walk to the marked door of ${location} and press E to go inside.`, location,
      home?.approach || entry.approach, false, entry.id);

    const stationKind = goal.kind === 'work' && goal.stationKind === 'noodle' ? 'noodle' : STATION_KINDS[goal.kind];
    if (stationKind) {
      const stationId = identity(goal.stationId) ? goal.stationId :
        goal.kind === 'home-action' ? `${entry.id}-stash` : null;
      const station = (Array.isArray(plan.activities) ? plan.activities : []).find(s => point(s) &&
        s.kind === stationKind && (stationId === null || s.id === stationId));
      if (!station || !identity(station.id)) return fallback();
      return result(`Walk to the marked station (${name(station.label, 'the marked station')}) and press E or Q to start it.`, location,
        station, true, entry.id, station.id);
    }
    if (goal.kind === 'encounter' || goal.kind === 'fight') {
      const guest = (Array.isArray(people) ? people : []).find(p => point(p) && p.roomId === plan.id &&
        p.character === 'booth-guest' && Number.isFinite(p.health) && (p.health > 0 || (goal.victory === true && p.health === 0)) &&
        (!identity(goal.storeId) || p.storeId === goal.storeId));
      if (!guest) return fallback();
      return result(goal.kind === 'fight' ? `Walk to the marked booth inside ${location} and press E to talk to Pink Earmuffs, choose Fight, dodge her bowl, then press F to punch her down.` : `Walk to Dot's marked corner booth inside ${location} and press E to talk. She throws her bowl and attacks: dodge it, press F to punch, and step back when she winds up.`, location, guest, true, entry.id);
    }
    if (!point(plan.counter)) return fallback();
    const instruction = goal.kind === 'robbery' ?
      'Stand near the employee, aim your pistol to threaten them, then press E to demand the till handover.' :
      `Walk down the aisle to the service counter inside ${location} and stand beside it.`;
    return result(instruction, location, plan.counter, true, entry.id);
  }
  return Object.freeze({ guide });
}

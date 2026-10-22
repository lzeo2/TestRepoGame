// All native pointer paths share budget and occupancy checks here.
export function applyTool(sim, tool, from, to = from) {
  const roads = sim.roads;
  if (sim.state.phase === 'lost') return { ok: false, reason: 'Town hall lost' };
  if (!from || !to || !roads.valid(from.x, from.z) || !roads.valid(to.x, to.z)) return { ok: false, reason: 'Choose a lot' };
  if (tool === 'road') {
    const lots = roads.line(from, to);
    if (lots.some(p => sim.state.buildings.some(b => b.x === p.x && b.z === p.z))) return { ok: false, reason: 'Road blocked by a building' };
    const cost = lots.filter(p => !roads.has(p.x, p.z)).length * 10;
    if (!sim.spend(cost)) return { ok: false, reason: 'Insufficient budget' };
    roads.place(from, to);
    return { ok: true, reason: `Road: $${cost}` };
  }
  if (tool === 'bulldoze' && roads.has(to.x, to.z)) {
    roads.set(to.x, to.z, false); return { ok: true, reason: 'Road removed' };
  }
  if (tool === 'repair') {
    const building = sim.state.buildings.find(b => b.x === to.x && b.z === to.z);
    return sim.repair(building?.id);
  }
  return tool === 'bulldoze' ? sim.bulldoze(to.x, to.z) : sim.place(tool, to.x, to.z);
}

// Stable IDs prevent per-frame model recreation; restarts pass a fresh cache.
export function syncModels(world, state, cache) {
  const live = new Set();
  for (const [kind, agents] of [['building', state.buildings], ['car', state.cars], ['zombie', state.zombies], ['citizen', state.defenders]]) {
    for (const agent of agents) {
      const key = `${kind}:${agent.id}`, type = kind === 'building' ? agent.type : kind;
      const pose = { ...world.roads.center(agent.x, agent.z), rotation: agent.heading || 0 };
      live.add(key);
      if (!cache.has(key)) cache.set(key, world.buildings.spawn(type, pose));
      else if (kind !== 'building') world.buildings.transform(cache.get(key), pose);
    }
  }
  for (const [key, handle] of cache) if (!live.has(key)) { world.buildings.remove(handle); cache.delete(key); }
}

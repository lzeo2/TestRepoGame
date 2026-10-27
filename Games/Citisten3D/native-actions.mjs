import { deriveWallTopology } from './wall-topology.mjs';

// All native pointer paths share budget and occupancy checks here.
export function applyTool(sim, tool, from, to = from) {
  const roads = sim.roads;
  if (sim.state.phase === 'lost') return { ok: false, reason: 'Town hall lost' };
  if (!from || !to || !roads.valid(from.x, from.z) || !roads.valid(to.x, to.z)) return { ok: false, reason: 'Choose a lot' };
  if (tool === 'road' || tool === 'bridge') {
    const lots = roads.line(from, to), water = p => sim.terrain?.isWater(p.x, p.z) || false;
    if (tool === 'bridge' && (from.z !== to.z || water(from) || water(to) || !lots.some(water))) return { ok: false, reason: 'Drag a straight bridge across the river, from dry bank to dry bank' };
    if (tool === 'road' && lots.some(water)) return { ok: false, reason: 'Water needs a bridge: drag from bank to bank' };
    if (lots.some(p => sim.buildingAt(p.x, p.z))) return { ok: false, reason: 'Road blocked by a building' };
    const cost = lots.filter(p => !roads.has(p.x, p.z)).reduce((n, p) => n + (water(p) ? 90 : 10), 0);
    if (!sim.spend(cost)) return { ok: false, reason: 'Insufficient budget' };
    roads.place(from, to);
    return { ok: true, reason: `${tool === 'bridge' ? 'Bridge' : 'Road'}: $${cost}` };
  }
  if (tool === 'bulldoze' && roads.has(to.x, to.z)) {
    const deck = [to, { x: to.x - 1, z: to.z }, { x: to.x + 1, z: to.z }].find(p => roads.has(p.x, p.z) && sim.terrain?.isWater(p.x, p.z));
    if (deck) {
      // Deck and either immediate approach are atomic; every saved span has two banks.
      let x = deck.x;
      while (roads.has(x - 1, to.z) && sim.terrain.isWater(x - 1, to.z)) x--;
      while (roads.has(x, to.z) && sim.terrain.isWater(x, to.z)) roads.set(x++, to.z, false);
      roads.set(to.x, to.z, false);
      return { ok: true, reason: 'Bridge removed' };
    }
    roads.set(to.x, to.z, false); return { ok: true, reason: 'Road removed' };
  }
  if (tool === 'upgrade') {
    const result = sim.upgrade(to.x, to.z);
    return { ...result, reason: result.reason || (result.ok ? `Upgrade: $${result.cost}, ${result.duration}s` : 'Cannot upgrade') };
  }
  if (tool === 'rotate-wall') return sim.rotateWall(to.x, to.z);
  if (tool === 'repair') {
    const building = sim.buildingAt(to.x, to.z);
    return sim.repair(building?.id, to);
  }
  return tool === 'bulldoze' ? sim.bulldoze(to.x, to.z) : sim.place(tool, to.x, to.z);
}

// Stable IDs prevent per-frame model recreation; restarts pass a fresh cache.
export function syncModels(world, state, cache) {
  const live = new Set(), walls = deriveWallTopology(state.buildings);
  for (const [kind, agents] of [['building', state.buildings], ['car', state.cars], ['zombie', state.zombies], ['citizen', state.defenders]]) {
    for (const agent of agents) {
      const key = `${kind}:${agent.id}`;
      const siteStage = agent.constructionRemaining > 0 ? Math.min(2, Math.floor((1 - agent.constructionRemaining / agent.constructionTotal) * 3)) : -1;
      const wall = kind === 'building' ? walls.get(agent.id) : null;
      const type = kind === 'building' ? siteStage >= 0 ? `construction_site_${siteStage}` : wall?.type || agent.type : kind === 'car' ? agent.vehicleType || 'car' : kind;
      const pose = { ...world.roads.center(agent.x, agent.z), rotation: wall ? wall.rotation * Math.PI / 2 : agent.heading || 0 };
      live.add(key);
      if (cache.has(key) && cache.get(key).type !== type) { world.buildings.remove(cache.get(key)); cache.delete(key); }
      if (!cache.has(key)) cache.set(key, world.buildings.spawn(type, pose));
      else if (kind !== 'building' || wall && cache.get(key).pose?.rotation !== pose.rotation) world.buildings.transform(cache.get(key), pose);
    }
  }
  for (const [key, handle] of cache) if (!live.has(key)) { world.buildings.remove(handle); cache.delete(key); }
}

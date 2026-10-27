// Original local-only scenario. Native RoomEngine retains aircraft, launch decks and world.
// These measured escorts are AI capital objectives, not player vehicles or inferred ASW fits.
import repairs from './model-repairs.json' with { type: 'json' };

export const LOCAL_MODEL_ASSETS = repairs.models.map((descriptor, i) => ({
  id: i === 0 ? 'type45' : 'type054a', url: descriptor.file, descriptor,
}));

export function createLocalFleetConfig() {
  const aircraft = ['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'f15', 'f35'];
  return {
    mode: 'factions',
    arena: { minX: -1800, maxX: 2000, minZ: 2600, maxZ: 3200,
      bottomY: -40, cell: 20, obstacles: [] },
    geometry: LOCAL_MODEL_ASSETS.map(({ id, descriptor }) => ({ id, descriptor: structuredClone(descriptor) })),
    units: LOCAL_MODEL_ASSETS.map(({ id, descriptor }, team) => ({
      id: team === 0 ? 'home' : 'enemy', modelId: id, team, kind: 'surface', capital: true,
      position: [team === 0 ? -1200 : 1600, 0, 2926],
      heading: team === 0 ? -Math.PI / 2 : Math.PI / 2,
      half: descriptor.bounds.max.map((n, i) => Math.max(Math.abs(n), Math.abs(descriptor.bounds.min[i]))),
      hp: 1000, speed: 12, route: [[team === 0 ? -180 : 180, 0, 3100]],
      // Arcade shell parameters; main_gun binds the descriptor's actual signed node frames.
      weapons: [{ id: 'mainGun', mount: 'main_gun', medium: 'surface', range: 1200,
        speed: 240, ttlMs: 10000, cooldownMs: 500, damage: 10, depths: ['surfaced'], ammo: 400 }],
      sensor: null, depth: 'surfaced', depthPlan: [],
    })),
    aircraft: [0, 1].map(() => aircraft.map(id => ({ id, weapons: [] }))),
    matchMs: 180000, intermissionMs: 15000,
  };
}

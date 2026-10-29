// Original local-only scenario. Native RoomEngine retains aircraft, launch decks and world.
// These measured vessels are AI fleet objectives, not player vehicles or inferred ASW fits.
import repairs from './model-repairs.json' with { type: 'json' };
import escorts from './extended-escort-models.json' with { type: 'json' };
import { coalitionPair } from './coalition-rosters.mjs';

export const LOCAL_MODEL_ASSETS = repairs.models.map((descriptor, i) => ({
  id: i === 0 ? 'type45' : 'type054a', url: descriptor.file, descriptor,
}));

const sourceIds = new Map([
  ['wings.original.wings_type45_daring_class.v1', 'type45'],
  ['wings.original.wings_type054a_jiangkai_ii.v1', 'type054a'],
  ['wings.original.wings_aquitaine_fremm.v1', 'aquitaine'],
  ['wings.original.wings_type055_renhai.v1', 'type055'],
  ['wings.original.wings_cb90_h.v1', 'cb90'],
  ['wings.original.wings_type022_houbei.v1', 'type022'],
  ['wings.original.wings_charles_de_gaulle_r91.v1', 'cdg'],
  ['wings.original.wings_queen_elizabeth_class.v1', 'qe'],
  ['wings.original.wings_liaoning_type001.v1', 'liaoning'],
  ['wings.original.wings_admiral_kuznetsov_project1143_5.v1', 'kuz'],
]);
const escortModels = escorts.models;
if (!Array.isArray(escortModels) || escortModels.length !== 8)
  throw new TypeError('Eight measured coalition extension descriptors required');
export const COALITION_MODEL_ASSETS = [...LOCAL_MODEL_ASSETS, ...escortModels.map(descriptor => ({
  id: sourceIds.get(descriptor.source_model_id), url: descriptor.file, descriptor,
}))];
if (COALITION_MODEL_ASSETS.length !== 10 ||
    new Set(COALITION_MODEL_ASSETS.map(asset => asset.id)).size !== 10 ||
    COALITION_MODEL_ASSETS.some(asset => !asset.id || sourceIds.get(asset.descriptor.source_model_id) !== asset.id))
  throw new TypeError('Unknown or duplicate coalition model binding');

export function createLocalFleetConfig(coalition) {
  const profiles = coalition === undefined ? null : coalitionPair(coalition);
  const aircraft = ['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'f15', 'f35'];
  const models = profiles ? profiles.flatMap((profile, team) => profile.vessels.map(vessel => {
    const asset = COALITION_MODEL_ASSETS.find(asset => asset.id === vessel.id);
    if (!asset || asset.descriptor.source_model_id !== vessel.source)
      throw new TypeError('Coalition vessel source mismatch');
    return { ...asset, team, capital: vessel.capital };
  })) : LOCAL_MODEL_ASSETS.map((asset, team) => ({ ...asset, team, capital: true }));
  const carrier = id => ['cdg', 'qe', 'liaoning', 'kuz'].includes(id);
  models.sort((a, b) => Number(carrier(a.id)) - Number(carrier(b.id)));
  if (profiles && (models.length !== 10 || new Set(models.map(asset => asset.id)).size !== 10 ||
      [0, 1].some(team => models.filter(asset => asset.team === team && asset.capital).length !== 1)))
    throw new TypeError('Invalid coalition fleet composition');
  return {
    mode: 'factions',
    // Only named compositions expand eligibility for the outer objective lanes.
    arena: { minX: profiles ? -2350 : -1800, maxX: profiles ? 2750 : 2000,
      minZ: profiles ? 2500 : 2600, maxZ: profiles ? 3300 : 3200,
      bottomY: -40, cell: 20, obstacles: [] },
    geometry: (profiles ? COALITION_MODEL_ASSETS : LOCAL_MODEL_ASSETS)
      .map(({ id, descriptor }) => ({ id, descriptor: structuredClone(descriptor) })),
    units: models.map(({ id, descriptor, team, capital }) => {
      if (carrier(id)) {
        const x = team === 0 ? -2100 : 2500, z = ['cdg', 'liaoning'].includes(id) ? 2720 : 3080;
        return {
          id: `${team === 0 ? 'home' : 'enemy'}-${id}`, modelId: id, team, kind: 'surface', capital: false,
          position: [x, 0, z], heading: team === 0 ? -Math.PI / 2 : Math.PI / 2,
          half: descriptor.bounds.max.map((n, i) => Math.max(Math.abs(n), Math.abs(descriptor.bounds.min[i]))),
          // Generic arcade objectives, not real-class performance or operational carriers.
          hp: 1000, speed: 12, route: [[x + (team === 0 ? 200 : -200), 0, z]],
          weapons: [], sensor: null, depth: 'surfaced', depthPlan: [],
        };
      }
      return ({
      id: (team === 0 ? 'home' : 'enemy') + (capital ? '' : id === 'cb90' ? '-cb90' : id === 'type022' ? '-type022' : '-escort'), modelId: id, team, kind: 'surface', capital,
      position: [id === 'type022' ? (team === 0 ? -1340 : 1740) : team === 0 ? -1200 : 1600, 0, capital ? 2926 : id === 'cb90' ? 2610 : id === 'type022' ? 2630 : 2696],
      heading: team === 0 ? -Math.PI / 2 : Math.PI / 2,
      half: descriptor.bounds.max.map((n, i) => Math.max(Math.abs(n), Math.abs(descriptor.bounds.min[i]))),
      hp: 1000, speed: 12, route: [[(team === 0 ? -1 : 1) * (capital ? 180 : id === 'cb90' ? 300 : id === 'type022' ? 400 : 260), 0, capital ? 3100 : id === 'cb90' ? 2610 : id === 'type022' ? 2630 : 2696]],
      // Arcade shell parameters; main_gun binds the descriptor's actual signed node frames.
      weapons: id === 'cb90' || id === 'type022' ? [] : [{ id: 'mainGun', mount: 'main_gun', medium: 'surface', range: 1200,
        speed: 240, ttlMs: 10000, cooldownMs: 500, damage: 10, depths: ['surfaced'], ammo: 400 }],
      sensor: null, depth: 'surfaced', depthPlan: [],
    }); }),
    aircraft: [0, 1].map(team => (profiles ? profiles[team].aircraft : aircraft).map(id => ({ id, weapons: [] }))),
    matchMs: 180000, intermissionMs: 15000,
  };
}

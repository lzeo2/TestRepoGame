// Named starter rosters from the supplied lookup, never substitutes for unavailable aircraft.
import lookup from './supplied-fighters/roster_lookup.json' with { type: 'json' };
import pair from './native-fighter-pair.json' with { type: 'json' };
import bomber from './native-tu160.json' with { type: 'json' };
import helicopters from './native-helicopter-pair.json' with { type: 'json' };
const models = { ...pair.models, ...bomber.models, ...helicopters.models };

const standard = new Set(lookup.standard.map(row => row.model_id));
const definitions = [
  { id: 'nato', side: 'A', name: 'NATO-inspired coalition', shortName: 'NATO-inspired',
    aircraft: ['f16c', 'typhoon', 'rafale', 'gripen', 'mirage2000', 'fa50', 'hawkt2', 'a10c', 'f35a', 'ah64d'], vessels: [
      { id: 'type45', source: 'wings.original.wings_type45_daring_class.v1', name: 'Type 45 Daring-class', capital: true },
      { id: 'aquitaine', source: 'wings.original.wings_aquitaine_fremm.v1', name: 'Aquitaine-class FREMM', capital: false },
      { id: 'cb90', source: 'wings.original.wings_cb90_h.v1', name: 'CB90 H', capital: false },
      { id: 'cdg', source: 'wings.original.wings_charles_de_gaulle_r91.v1', name: 'Charles de Gaulle', capital: false },
      { id: 'qe', source: 'wings.original.wings_queen_elizabeth_class.v1', name: 'Queen Elizabeth class', capital: false },
    ] },
  { id: 'eastern', side: 'B', name: 'Eastern-inspired coalition', shortName: 'Eastern-inspired',
    aircraft: ['mig29', 'su35s', 'jf17', 'mig31', 'su34', 'yak130', 'su25sm', 'j20', 'tu160', 'mi28n'], vessels: [
      { id: 'type054a', source: 'wings.original.wings_type054a_jiangkai_ii.v1', name: 'Type 054A Jiangkai II-class', capital: true },
      { id: 'type055', source: 'wings.original.wings_type055_renhai.v1', name: 'Type 055 Renhai-class', capital: false },
      { id: 'type022', source: 'wings.original.wings_type022_houbei.v1', name: 'Type 022 Houbei-class', capital: false },
      { id: 'liaoning', source: 'wings.original.wings_liaoning_type001.v1', name: 'Liaoning Type 001', capital: false },
      { id: 'kuz', source: 'wings.original.wings_admiral_kuznetsov_project1143_5.v1', name: 'Admiral Kuznetsov Project 1143.5', capital: false },
    ] },
];
export const COALITIONS = Object.freeze(definitions.map(profile => {
  const slots = lookup.factions.filter(row => row.faction === profile.side);
  const aircraftModels = slots.filter(row => standard.has(row.model_id)).map(row => row.model_id);
  const vesselModels = slots.filter(row => !standard.has(row.model_id)).map(row => row.model_id);
  if (aircraftModels.length !== 10 || vesselModels.length !== 5 || profile.vessels.some(vessel => !vesselModels.includes(vessel.source)) ||
      profile.aircraft.some(kind => !aircraftModels.includes(models[kind]?.source_model_id)))
    throw new TypeError('Supplied coalition membership mismatch');
  return Object.freeze({ ...profile, aircraft: Object.freeze(profile.aircraft),
    vessels: Object.freeze(profile.vessels.map(vessel => Object.freeze(vessel))),
    // Retain the capital-only ABI used by dated checks and ordinary-mode consumers.
    vessel: profile.vessels[0].id, vesselSource: profile.vessels[0].source, vesselName: profile.vessels[0].name,
    aircraftModels: Object.freeze(aircraftModels), vesselModels: Object.freeze(vesselModels) });
}));

export function coalitionPair(id) {
  const own = COALITIONS.find(profile => profile.id === id);
  if (!own) throw new TypeError('Unknown coalition');
  return Object.freeze([own, COALITIONS.find(profile => profile !== own)]);
}

import { readFile } from 'node:fs/promises';
import { GAME_DATA_FILES } from '../Games/Capital Drive/game-data.js';
import { composeCapitalMap, decodeCapitalMapResponses, appendCapitalHighwayBarriers } from '../Games/Capital Drive/map-source.js';

const gameRoot = new URL('../Games/Capital Drive/', import.meta.url);

// Production source packs and canonical static decorations, including highway
// barriers, source fences, water and stunt exclusions. This is not a live world:
// scene-generated civic/noodle/campus/local/neighbourhood obstacles, services,
// police/heist sites, parked vehicles, actors and room state are not fabricated.
export async function loadCapitalMap() {
  const responses = GAME_DATA_FILES.map(file => ({
    json: async () => JSON.parse(await readFile(new URL(file, gameRoot), 'utf8')),
  }));
  const packs = await decodeCapitalMapResponses(responses, { includeAddresses: false });
  return appendCapitalHighwayBarriers(composeCapitalMap(packs).map);
}

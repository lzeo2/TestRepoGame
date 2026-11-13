// Real anchors projected with the same local equirectangular origin as canberra.json.
const project = (lat, lon) => ({ x: (lon - 149.137) * 111320 * Math.cos(-35.318 * Math.PI / 180), z: -(lat + 35.318) * 111320 });
const place = (id, name, lat, lon, radius, description) => Object.freeze({ id, name, lat, lon, radius, description, ...project(lat, lon) });
export const LANDMARKS = Object.freeze([
  place('parliament-house', 'Parliament House', -35.3081, 149.1245, 220, 'Capital Hill, grass roof, curved pale walls and the central flag mast.'),
  place('old-parliament-house', 'Old Parliament House', -35.3021, 149.1297, 120, 'The white stripped classical home of the Museum of Australian Democracy.'),
  place('manuka-oval', 'Manuka Oval', -35.3183, 149.1348, 130, 'Oval ground, grandstands and six tall floodlight towers.'),
  place('kingston-powerhouse', 'Kingston Powerhouse', -35.3115975, 149.1436952, 65, 'Historic industrial halls, now Canberra Glassworks, beside the former chimney base.'),
]);

// Inspected ACT footprints only. Never use proximity to erase neighbouring buildings.
const REPLACED_IDS = Object.freeze([
  'act-130946-0', 'act-82956-0', 'act-104361-0', 'act-123850-0', 'act-85758-0',
  'act-86145-0', 'act-83409-0', 'act-133856-0', 'act-116798-0',
  'act-97135-0', 'act-133342-0', 'act-120773-0',
]);
export function replacedBuildingIds(map) {
  const available = new Set((map.buildings || []).map(building => building.id));
  return new Set(REPLACED_IDS.filter(id => available.has(id)));
}

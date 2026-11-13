// Real anchors projected with the same local equirectangular origin as canberra.json.
const project = (lat, lon) => ({ x: (lon - 149.137) * 111320 * Math.cos(-35.318 * Math.PI / 180), z: -(lat + 35.318) * 111320 });
const place = (id, name, lat, lon, radius, description) => Object.freeze({ id, name, lat, lon, radius, description, ...project(lat, lon) });
export const LANDMARKS = Object.freeze([
  place('parliament-house', 'Parliament House', -35.3081, 149.1245, 220, 'Capital Hill, grass roof, curved pale walls and the central flag mast.'),
  place('old-parliament-house', 'Old Parliament House', -35.3021, 149.1297, 120, 'The white stripped classical home of the Museum of Australian Democracy.'),
  place('manuka-oval', 'Manuka Oval', -35.3183, 149.1348, 130, 'Oval ground, grandstands and six tall floodlight towers.'),
  place('manuka-pool', 'Manuka Pool', -35.3170181, 149.1355791, 40, 'Outdoor swimming basin with original coping and entrance details.'),
  place('kingston-powerhouse', 'Kingston Powerhouse', -35.3115975, 149.1436952, 65, 'Historic industrial halls, now Canberra Glassworks, beside the former chimney base.'),
]);

// Inspected ACT footprints only. Never use proximity to erase neighbouring buildings.
const REPLACED_IDS = Object.freeze([
  'act-130946-0', 'act-82956-0', 'act-104361-0', 'act-123850-0', 'act-85758-0',
  'act-86145-0', 'act-83409-0', 'act-133856-0', 'act-116798-0',
  'act-97135-0', 'act-133342-0', 'act-120773-0', 'act-75267-0',
]);
export function replacedBuildingIds(map) {
  const available = new Set((map.buildings || []).map(building => building.id));
  return new Set(REPLACED_IDS.filter(id => available.has(id)));
}

// OSM way58851110 v11,2024-04-18: basin corners projected from the cached source.
export const MANUKA_POOL_BASIN = Object.freeze([
  [-35.3168694,149.1356152],[-35.3169403,149.1357385],
  [-35.3171668,149.1355430],[-35.3170959,149.1354197],
].map(([lat,lon]) => { const p=project(lat,lon); return Object.freeze([p.x,p.z]); }));

// Exact art clearings in world metres, independent of building suppression.
const parliament = LANDMARKS[0], oval = LANDMARKS[2];
const clearing = points => Object.freeze(points.map(point => Object.freeze(point)));
const parliamentPoint = ([x,z]) => [parliament.x + Math.cos(-0.615)*x + Math.sin(-0.615)*z, parliament.z - Math.sin(-0.615)*x + Math.cos(-0.615)*z];
export const LANDMARK_CLEARINGS = Object.freeze([
  clearing([[-80,-235],[80,-235],[80,-145],[-80,-145]].map(parliamentPoint)),
  clearing(Array.from({length:32},(_,i) => [oval.x + Math.cos(i/32*Math.PI*2)*80, oval.z + Math.sin(i/32*Math.PI*2)*94])),
  MANUKA_POOL_BASIN,
]);

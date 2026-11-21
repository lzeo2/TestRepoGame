// OSM retail landuse way 31974923. Original geographic snapshot is unchanged.
// x east, z south, projected from the shared Canberra origin.
const project = ([lat, lon]) => Object.freeze([(lon - 149.137) * 111320 * Math.cos(-35.318 * Math.PI / 180), -(lat + 35.318) * 111320]);
export const MANUKA_RETAIL_POLYGON = Object.freeze([
  [-35.3195470,149.1324262], [-35.3199892,149.1329094],
  [-35.3202647,149.1336133], [-35.3211667,149.1334423],
  [-35.3210262,149.1329195], [-35.3207481,149.1323220],
  [-35.3203557,149.1317888], [-35.3200078,149.1315069],
].map(project));
export function inManukaRetail(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  let inside = false;
  for (let i = 0, j = MANUKA_RETAIL_POLYGON.length - 1; i < MANUKA_RETAIL_POLYGON.length; j = i++) {
    const a = MANUKA_RETAIL_POLYGON[i], b = MANUKA_RETAIL_POLYGON[j];
    const cross = (x - a[0]) * (b[1] - a[1]) - (z - a[1]) * (b[0] - a[0]);
    if (Math.abs(cross) < 1e-7 && x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]) && z >= Math.min(a[1], b[1]) && z <= Math.max(a[1], b[1])) return true;
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function retailDistrict(map, x, z, { aprons = false } = {}) {
  if (inManukaRetail(x, z)) return 'manuka';
  for (const l of map.landmarks || []) {
    if (!(aprons ? /^(kingston)$/ : /^(kingston|griffith|narrabundah)$/).test(l.id)) continue;
    if (Math.hypot(x - l.x, z - l.z) < (l.radius || 120)) return l.id;
  }
  return null;
}

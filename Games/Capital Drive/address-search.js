// Local search only. An address denotes an OSM tag location, not a safe arrival point.
const SUFFIXES = { st: 'street', rd: 'road', ave: 'avenue', av: 'avenue', cres: 'crescent',
  cr: 'crescent', cct: 'circuit', cir: 'circuit', dr: 'drive', pl: 'place', ct: 'court',
  tce: 'terrace', pde: 'parade', ln: 'lane', hwy: 'highway', cl: 'close', sq: 'square',
  gr: 'grove', gdns: 'gardens', pkwy: 'parkway' };
// These public venues have retained building outlines but no separate map pin.
const VENUE_FOOTPRINTS = new Set([
  'osm-4970449', 'osm-5035476', 'osm-5954392', 'osm-210305032',
  'osm-30160608', 'osm-217376654', 'osm-663660535',
]);

function footprintLocation(building) {
  const outer = building.points;
  if (!Array.isArray(outer) || outer.length < 3) return null;
  const rings = [outer, ...(building.innerRings || []).map(hole => hole.points || hole)];
  let minZ = Infinity, maxZ = -Infinity;
  for (const [, z] of outer) {
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const z = (minZ + maxZ) / 2;
  const crossings = [];
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j], b = ring[i];
      if ((a[1] > z) !== (b[1] > z)) {
        crossings.push(a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]));
      }
    }
  }
  // Even-odd spans keep the result inside a wing of a concave building and
  // out of any courtyard. A vertex average can place a pin on the pavement.
  crossings.sort((a, b) => a - b);
  let widest = 0, point = null;
  for (let i = 1; i < crossings.length; i += 2) {
    const span = crossings[i] - crossings[i - 1];
    if (span > widest) {
      widest = span;
      point = { x: crossings[i - 1] + span / 2, z };
    }
  }
  return point;
}

function normalize(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).map(word => SUFFIXES[word] || word).join(' ');
}

export function createAddressSearch(map, addresses = []) {
  const records = [], roads = new Map();
  function add(result, text, exact = '') {
    if (!Number.isFinite(result.x) || !Number.isFinite(result.z)) return;
    records.push({ result: Object.freeze(result), text: normalize(text), exact: normalize(exact) });
  }
  for (const a of Array.isArray(addresses) ? addresses : addresses.addresses || []) {
    if (!a.number || !a.street) continue;
    add({ id: a.id, label: a.label, x: a.x, z: a.z, kind: 'address',
      detail: 'OSM tagged address, approximate location' }, `${a.number} ${a.street} ${a.suburb || ''}`, `${a.number} ${a.street}`);
  }
  for (const road of map.roads || []) {
    if (!road.name || !road.points?.length) continue;
    let length = 0;
    for (let i = 1; i < road.points.length; i++) length += Math.hypot(road.points[i][0] - road.points[i - 1][0], road.points[i][1] - road.points[i - 1][1]);
    const key = normalize(road.name);
    if (!roads.has(key) || roads.get(key).length < length) roads.set(key, { road, length });
  }
  for (const { road, length } of roads.values()) {
    let remaining = length / 2, point = road.points[0];
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], span = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (remaining <= span) {
        const t = span ? remaining / span : 0;
        point = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; break;
      }
      remaining -= span;
    }
    add({ id: `street:${road.id}`, label: road.name, x: point[0], z: point[1], kind: 'street',
      detail: 'Street location, no house number' }, road.name, road.name);
  }
  for (const landmark of [...(map.landmarks || []),...(map.searchPlaces || [])]) {
    add({ id: `landmark:${landmark.id}`, label: landmark.name, x: landmark.x, z: landmark.z,
      kind: landmark.store?'store':'landmark', detail: landmark.description || 'Mapped landmark' }, [landmark.name,...(landmark.aliases||[])].join(' '), landmark.name);
  }
  for (const building of map.buildings || []) {
    if (!VENUE_FOOTPRINTS.has(building.id) || !building.name) continue;
    const point = footprintLocation(building);
    if (point) add({ id: `building:${building.id}`, label: building.name, ...point,
      kind: 'landmark', detail: 'Mapped building footprint' }, building.name, building.name);
  }
  function search(query, limit = 10) {
    const q = normalize(query);
    if (!q) return [];
    const words = q.split(' '), boundedLimit = Number.isFinite(limit) ? Math.max(0, Math.min(50, Math.floor(limit))) : 10;
    const hasNumber = /^\d/.test(q);
    const seen = new Set();
    return records.map(record => {
      let score = record.exact === q ? 100 : record.text === q ? 95 : record.text.startsWith(q) ? 65 : 0;
      if (!score && words.every(word => record.text.split(' ').some(token => token.startsWith(word)))) score = 35;
      if (score && hasNumber && record.result.kind === 'address') score += 10;
      return { record, score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score ||
      a.record.result.label.localeCompare(b.record.result.label) || String(a.record.result.id).localeCompare(String(b.record.result.id)))
      .filter(item => {
        const key = `${item.record.result.kind}:${normalize(item.record.result.label)}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
      }).slice(0, boundedLimit).map(item => item.record.result);
  }
  return { search };
}

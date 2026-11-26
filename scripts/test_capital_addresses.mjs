import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const source = await readFile(new URL('../Games/Capital Drive/address-search.js', import.meta.url), 'utf8');
const { createAddressSearch } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const payload = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/addresses.json', import.meta.url), 'utf8'));
const map = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url), 'utf8'));
assert.equal(payload.meta.license, 'ODbL-1.0');
assert.equal(payload.meta.count, payload.addresses.length);
assert(payload.addresses.length > 3000, 'bounded district has substantial real address coverage');
assert.equal(new Set(payload.addresses.map(a => a.id)).size, payload.addresses.length);
assert(payload.meta.sourceHashes && Object.values(payload.meta.sourceHashes).every(hash => /^[a-f0-9]{64}$/.test(hash)));
const mx = 111320 * Math.cos(-35.318 * Math.PI / 180);
for (const a of payload.addresses) {
  assert(a.number && a.street && a.label.startsWith(`${a.number} ${a.street}`));
  assert(a.lon >= 149.103 && a.lon <= 149.174 && a.lat >= -35.352 && a.lat <= -35.298);
  assert(Math.abs(a.x - (a.lon - 149.137) * mx) < 0.02);
  assert(Math.abs(a.z - (-35.318 - a.lat) * 111320) < 0.02);
  assert([a.x, a.z].every(Number.isFinite));
}
const fixture = createAddressSearch({ roads: [{ id: 'r', name: 'Canberra Avenue', points: [[0, 0], [100, 0]] }],
  landmarks: [{ id: 'p', name: 'Parliament House', x: 4, z: 5 }] }, [
  { id: 'a', label: '12 Canberra Avenue, Griffith', number: '12', street: 'Canberra Avenue', suburb: 'Griffith', x: 1, z: 2 },
  { id: 'b', label: '120 Canberra Avenue', number: '120', street: 'Canberra Avenue', x: 3, z: 4 }
]);
assert.equal(fixture.search('12 CANBERRA AVE.')[0].id, 'a', 'exact house number outranks numeric prefixes');
assert.equal(fixture.search('12, Canberra Av Griffith')[0].id, 'a');
assert.equal(fixture.search('Canberra Ave')[0].kind, 'street');
assert.equal(fixture.search('Canberra Ave')[0].detail, 'Street location, no house number');
assert.equal(fixture.search('PARLIAMENT')[0].kind, 'landmark');
assert.equal(fixture.search('Parliament House')[0].x, 4);
assert.deepEqual(fixture.search('999 Unknown Road'), [], 'missing house numbers do not invent addresses');
assert.deepEqual(fixture.search(''), []);
assert.deepEqual(fixture.search('Canberra', 0), []);
assert.equal(fixture.search('Canberra', 1).length, 1);
assert(Object.isFrozen(fixture.search('12 Canberra Avenue')[0]));
const actual = createAddressSearch(map, payload);
for (const address of payload.addresses.filter((_, i) => i % 97 === 0)) {
  assert(actual.search(`${address.number} ${address.street}`, 50).some(result => result.label === address.label), `actual explicit address searchable: ${address.id} ${address.label}`);
}
// Cross-check each venue against the retained source building and a transit
// result with the venue as an alias. Each expected point is inside the mapped
// ring, rounded to two decimals for comparison with source coordinates.
const venues = [
  ['osm-4970449', 'Shine Dome', -1303.26, -3819.37],
  ['osm-5035476', 'National Museum of Australia', -1420.87, -2790.03],
  ['osm-5954392', 'National Library of Australia', -680.22, -2394.90],
  ['osm-210305032', 'National Convention Centre', -237.57, -3708.47],
  ['osm-30160608', 'Canberra Outlet Centre', 3744.22, 2084.42],
  ['osm-217376654', 'Royal Australian Mint', -4010.28, 83.38],
  ['osm-663660535', 'National Arboretum Canberra Village Centre', -6154.94, -3346.22],
];
const buildings = [];
for (const pack of ['canberra-north', 'airport', 'region-south', 'region-molonglo']) {
  const file = new URL(`../Games/Capital Drive/data/${pack}.json`, import.meta.url);
  buildings.push(...JSON.parse(await readFile(file, 'utf8')).buildings);
}
const searchPlaces = venues.map(([id, name]) => ({
  id: `stop-${id}`, name: `Bus stop near ${name}`, aliases: [name], x: 0, z: 0,
}));
const landmarks = [];
const venueSearch = createAddressSearch({ buildings, searchPlaces, landmarks });
for (const [id, name, x, z] of venues) {
  const [venue, stop] = venueSearch.search(name, 2);
  assert.equal(venue.id, `building:${id}`, name);
  assert.equal(venue.label, name);
  assert.equal(venue.kind, 'landmark');
  assert.equal(venue.detail, 'Mapped building footprint');
  assert(Math.abs(venue.x - x) < .011 && Math.abs(venue.z - z) < .011, name);
  assert.equal(stop.id, `landmark:stop-${id}`);
}
assert.equal(landmarks.length, 0, 'searching a footprint never creates a world or minimap pin');
assert.equal(searchPlaces.length, venues.length);
assert.deepEqual(createAddressSearch({}).search('Shine Dome'), []);
const specimen = {
  id:'osm-4970449', name:'Uneven courtyard', points:[[0,0],[30,0],[30,10],[0,10]],
  innerRings:[{points:[[6,1],[10,1],[10,9],[6,9]]}],
};
const courtyard = createAddressSearch({ buildings:[specimen] }).search(specimen.name)[0];
assert.deepEqual([courtyard.x,courtyard.z], [20,5]);
assert.deepEqual(createAddressSearch({ buildings:[{...specimen, id:'other'}] }).search(specimen.name), []);
// Exercise importer geometry and omission rules without requiring the external cache.
const python = spawnSync('python3', ['-B', '-c', `import importlib.util
spec=importlib.util.spec_from_file_location('addresses','scripts/build_capital_drive_addresses.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
nodes={1:{'lon':149.12,'lat':-35.32},2:{'lon':149.121,'lat':-35.32},3:{'lon':149.121,'lat':-35.321},4:{'lon':149.12,'lat':-35.321}}
p=m.location({'type':'way','nodes':[1,2,3,4,1]},nodes)
assert abs(p[0]-149.1205)<1e-10 and abs(p[1]+35.3205)<1e-10
assert m.location({'type':'relation'},nodes) is None
assert m.location({'type':'way','nodes':[999]},nodes) is None
assert m.location({'type':'node','lon':149.12,'lat':-35.32},nodes)==(149.12,-35.32)
import tempfile,json
from pathlib import Path
with tempfile.TemporaryDirectory() as directory:
 cache=Path(directory)
 (cache/'osm.json').write_text(json.dumps({'sourceFiles':['tile.json']}))
 (cache/'tile.json').write_text(json.dumps({'elements':[
  {'type':'node','id':1,'lon':149.12,'lat':-35.32,'tags':{'addr:housenumber':'7','addr:street':'Test Street'}},
  {'type':'node','id':2,'lon':149.12,'lat':-35.32,'tags':{'addr:interpolation':'even','addr:street':'Test Street'}},
  {'type':'node','id':3,'lon':150,'lat':-35.32,'tags':{'addr:housenumber':'99','addr:street':'Test Street'}},
  {'type':'relation','id':4,'tags':{'addr:housenumber':'9','addr:street':'Test Street'}}]}))
 result=m.build(cache,'2026-11-13')
 assert len(result['addresses'])==1 and result['addresses'][0]['number']=='7'
 assert result['meta']['skippedUnsupported']==1
 assert len(result['meta']['sourceHashes']['tile.json'])==64
print('PASS importer geometry, source hashes, bounded explicit tags, no invented/interpolated numbers')`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
assert.equal(python.status, 0, python.stderr);
console.log(python.stdout.trim());
console.log(`PASS ${payload.addresses.length} sourced addresses, bounds/projection, matching/suffixes, exact numbers, street/landmark distinctions; sha256 ${createHash('sha256').update(JSON.stringify(payload.addresses)).digest('hex')}`);

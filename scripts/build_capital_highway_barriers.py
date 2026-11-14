#!/usr/bin/env python3
"""Export guard rails from the eighteen hash-pinned south OSM tiles; no network."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from build_capital_street_assets import nearest

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'Games/Capital Drive'
WIDTH, HEIGHT = 0.14, 0.75


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def clip(a, b, bounds):
    """Liang-Barsky clipping: shorten source lines at map edges without moving them."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    lo, hi = 0.0, 1.0
    for p, q in [(-dx, a[0]-bounds['minX']), (dx, bounds['maxX']-a[0]),
                 (-dz, a[1]-bounds['minZ']), (dz, bounds['maxZ']-a[1])]:
        if abs(p) < 1e-12:
            if q < 0:
                return None
        elif p < 0:
            lo = max(lo, q/p)
        else:
            hi = min(hi, q/p)
        if lo > hi:
            return None
    return ([a[0]+lo*dx, a[1]+lo*dz], [a[0]+hi*dx, a[1]+hi*dz], lo, hi)


def build(cache):
    map_raw = (GAME / 'data/canberra.json').read_bytes()
    world = json.loads(map_raw)
    lon0, lat0 = world['meta']['origin']
    def project(node):
        return [(node['lon']-lon0)*111320*math.cos(math.radians(lat0)), (lat0-node['lat'])*111320]
    manifest = sorted((name, expected) for name, expected in world['meta']['sourceHashes'].items()
                      if name.startswith('osm-tile-') and name.endswith('.json'))
    elements, files, locations = {}, [], {}
    for name, expected in manifest:
        raw = (cache / name).read_bytes()
        if sha(raw) != expected:
            raise ValueError('Source hash mismatch: ' + name)
        files.append({'file': name, 'sha256': expected})
        for entry in json.loads(raw)['elements']:
            key = entry['type'], int(entry['id'])
            clean = {k: entry[k] for k in ('type', 'id', 'version', 'timestamp', 'lat', 'lon', 'nodes', 'tags') if k in entry}
            prior = elements.get(key)
            if prior and prior.get('version', 0) == clean.get('version', 0) and prior != clean:
                raise ValueError('Conflicting same-version source: ' + str(key))
            if prior is None or clean.get('version', 0) >= prior.get('version', 0):
                elements[key] = clean
            locations.setdefault(key, []).append(name)
    roads = [(road, a, b) for road in world['roads'] if road['type'] in ('primary', 'trunk', 'motorway', 'primary_link', 'trunk_link')
             for a, b in zip(road['points'], road['points'][1:])]
    paths, barriers, rejected = [], [], []
    ways = sorted((e for e in elements.values() if e['type'] == 'way' and e.get('tags', {}).get('barrier') == 'guard_rail'), key=lambda e: int(e['id']))
    for way in ways:
        node_ids = way.get('nodes', [])
        nodes = [elements.get(('node', int(n))) for n in node_ids]
        if len(nodes) < 2 or any(n is None for n in nodes):
            rejected.append({'id': way['id'], 'reason': 'missing source nodes'})
            continue
        source_points = [project(n) for n in nodes]
        source = {k: way[k] for k in ('type', 'id', 'version', 'timestamp') if k in way}
        exported = []
        for i, (a, b) in enumerate(zip(source_points, source_points[1:])):
            result = clip(a, b, world['bounds'])
            if result is None:
                continue
            start, end, lo, hi = result
            length = math.dist(start, end)
            if length < 0.05:
                continue
            centre = [(start[0]+end[0])/2, (start[1]+end[1])/2]
            distance, road = min(((nearest(centre, p, q)[0], road) for road, p, q in roads), key=lambda item: item[0]) if roads else (None, None)
            nx, nz = -(end[1]-start[1])/length*WIDTH/2, (end[0]-start[0])/length*WIDTH/2
            points = [[start[0]+nx, start[1]+nz], [end[0]+nx, end[1]+nz], [end[0]-nx, end[1]-nz], [start[0]-nx, start[1]-nz]]
            descriptor = {'id': f'osm-guard-rail-{way["id"]}-{i}', 'type': 'guard_rail', 'sourceId': str(way['id']),
                          'sourceSegment': i, 'sourceNodeIds': node_ids[i:i+2], 'sourceFraction': [lo, hi],
                          'a': start, 'b': end, 'points': points, 'width': WIDTH, 'height': HEIGHT,
                          'material': way.get('tags', {}).get('material', 'unknown'), 'sourceLayer': way.get('tags', {}).get('layer', '0'), 'sourceBridge': way.get('tags', {}).get('bridge', 'no'),
                          'roadContext': {'id': road['id'], 'name': road.get('name', ''), 'type': road['type'], 'distance': distance} if road and distance <= 30 else None}
            barriers.append(descriptor); exported.append(descriptor['id'])
        if exported:
            paths.append({'source': source, 'sourceTags': way.get('tags', {}), 'sourceFiles': sorted(set(locations[('way', int(way['id']))])),
                          'nodeIds': node_ids, 'sourcePoints': source_points, 'segments': exported})
    barriers.sort(key=lambda b: (not (b['roadContext'] and b['roadContext']['name'] == 'Hindmarsh Drive'), int(b['sourceId']), b['sourceSegment']))
    unsupported = sum(b['sourceLayer'] != '0' or b['sourceBridge'] not in ('no', 'false', '0') for b in barriers)
    return {'meta': {'licence': 'ODbL-1.0', 'attribution': '© OpenStreetMap contributors', 'projection': world['meta']['projection'],
                     'origin': world['meta']['origin'], 'mapSHA256': sha(map_raw), 'sourceFiles': files,
                     'sourceGuardRailWays': len(ways), 'exportedWays': len(paths), 'segments': len(barriers), 'physicalSegments': len(barriers)-unsupported, 'omittedUnsupportedLevelSegments': unsupported, 'rejected': rejected,
                     'dimensions': 'Original estimated 0.14m collision width and 0.75m overall height; source only establishes rail paths/material tags. Terrain follows the game sampler; nonzero-layer/bridge-tagged paths remain source evidence but are omitted from both runtime collision and rendering because vertical survey/deck support is unavailable.'},
            'paths': paths, 'barriers': barriers}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', required=True, type=Path)
    parser.add_argument('--output', type=Path, default=GAME / 'data/highway-barriers.json')
    parser.add_argument('--module-output', type=Path, default=GAME / 'highway-barriers.js')
    args = parser.parse_args()
    result = build(args.cache)
    raw = json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n'
    args.output.write_text(raw)
    prefix = "// Generated source paths: © OpenStreetMap contributors, ODbL 1.0.\n// Run scripts/build_capital_highway_barriers.py; dimensions are estimates.\nconst freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };\n"
    args.module_output.write_text(prefix + 'export const HIGHWAY_BARRIER_DATA = freeze(' + raw.strip() + ');\n' + RUNTIME)
    hindmarsh = sum(bool(b['roadContext'] and b['roadContext']['name'] == 'Hindmarsh Drive') for b in result['barriers'])
    print(json.dumps({'ways': len(result['paths']), 'segments': len(result['barriers']), 'hindmarshSegments': hindmarsh, 'jsonBytes': len(raw.encode()), 'sha256': sha(raw.encode())}, sort_keys=True))


RUNTIME = r'''
// The current collision engine has one ground plane. Keep elevated source
// paths in the evidence but do not create a phantom wall below their bridges.
export const HIGHWAY_BARRIERS = Object.freeze(HIGHWAY_BARRIER_DATA.barriers.filter(b=>b.sourceLayer==='0' && ['no','false','0'].includes(b.sourceBridge))); 
export const HIGHWAY_BARRIER_VIEW_LIMITS = Object.freeze({range:500, panels:200, posts:400, maxInstances:600, maxDrawCalls:2});
const CELL = 100, index = new Map();
const panels = [];
for (const rail of HIGHWAY_BARRIERS) {
  const length = Math.hypot(rail.b[0]-rail.a[0],rail.b[1]-rail.a[1]), steps = Math.ceil(length/5);
  for(let i=0;i<steps;i++) {
    const point=t=>[rail.a[0]+(rail.b[0]-rail.a[0])*t,rail.a[1]+(rail.b[1]-rail.a[1])*t];
    const a=point(i/steps),b=point((i+1)/steps),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
    const panel=Object.freeze({id:`${rail.id}-panel-${i}`,rail,a:Object.freeze(a),b:Object.freeze(b),x,z});
    panels.push(panel);const key=`${Math.floor(x/CELL)},${Math.floor(z/CELL)}`;
    if(!index.has(key))index.set(key,[]);index.get(key).push(panel);
  }
}
export const HIGHWAY_BARRIER_PANELS = Object.freeze(panels);
export function selectHighwayBarrierPanels(focus, range=HIGHWAY_BARRIER_VIEW_LIMITS.range, limit=HIGHWAY_BARRIER_VIEW_LIMITS.panels) {
  if(!focus || !Number.isFinite(focus.x) || !Number.isFinite(focus.z))return [];
  range=Math.max(0,Math.min(HIGHWAY_BARRIER_VIEW_LIMITS.range,Number.isFinite(range)?range:0));
  limit=Math.max(0,Math.min(HIGHWAY_BARRIER_VIEW_LIMITS.panels,Number.isFinite(limit)?Math.floor(limit):0));
  const found=[];
  for(let x=Math.floor((focus.x-range)/CELL);x<=Math.floor((focus.x+range)/CELL);x++)for(let z=Math.floor((focus.z-range)/CELL);z<=Math.floor((focus.z+range)/CELL);z++) {
    for(const panel of index.get(`${x},${z}`)||[])if(Math.hypot(panel.x-focus.x,panel.z-focus.z)<=range)found.push(panel);
  }
  found.sort((a,b)=>Math.hypot(a.x-focus.x,a.z-focus.z)-Math.hypot(b.x-focus.x,b.z-focus.z)||a.id.localeCompare(b.id));
  return found.slice(0,limit);
}
'''
if __name__ == '__main__':
    main()

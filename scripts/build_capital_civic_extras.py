#!/usr/bin/env python3
"""Rebuild bounded Civic extras from retained OSM and ACT caches; no downloads."""
import argparse
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'Games/Capital Drive'
ACT_HASHES = {'act-city-skate-polygon.json': 'b25d5425907a7803a384a632cc883ea4b83e00b783bb52d5544a71de431045a8',
              'act-skate-item.json': 'dfd66a408903e278850666e2584e4e67abc542f779a1bc3c4838383d2bf5eca6'}
SELECTION = [(890228732, 'Wham Comics', 'retail'), (10679626475, 'Landspin Records', 'retail'),
             (8196052995, 'Via Doughce', 'food'), (14065555895, 'Decent Games', 'retail'),
             (2161998101, "Chappy's", 'food')]
WALKS = [209690340, 657448084, 657448082, 713193434, 713194420, 206041785,
         1280738322, 729070590, 1280755262]


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def inside(p, points):
    hit = False
    for a, b in zip(points, points[1:] + points[:1]):
        if (a[1] > p[1]) != (b[1] > p[1]) and p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]:
            hit = not hit
    return hit


def closest(p, a, b):
    dx, dz = b[0]-a[0], b[1]-a[1]
    t = max(0, min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz))) if dx or dz else 0
    return [a[0]+dx*t, a[1]+dz*t]


def build(cache, act_cache):
    north_raw = (GAME/'data/canberra-north.json').read_bytes()
    north = json.loads(north_raw)
    origin = north['meta']['origin']
    def project(lon, lat):
        return [round((lon-origin[0])*111320*math.cos(math.radians(origin[1])), 6), round((origin[1]-lat)*111320, 6)]
    elements, files = {}, []
    for record in north['meta']['source']['files']:
        if not record['file'].startswith('osm-map-'):
            continue
        raw = (cache/record['file']).read_bytes()
        if digest(raw) != record['sha256']:
            raise ValueError('Unpinned OSM cache: '+record['file'])
        files.append(record)
        for e in json.loads(raw)['elements']:
            elements[e['type'], e['id']] = e
    for name, sha in ACT_HASHES.items():
        if digest((act_cache/name).read_bytes()) != sha:
            raise ValueError('Unpinned ACT cache: '+name)
    asset = json.loads((act_cache/'act-city-skate-polygon.json').read_bytes())
    item = json.loads((act_cache/'act-skate-item.json').read_bytes())
    assert asset['attributes']['ASSET_ID'] == 'SKPK6'
    assert 'Attribution 4.0' in item['licenseInfo']
    walks = []
    for wid in WALKS:
        source = elements['way', wid]
        walks.append({'id': 'civic-walk-'+str(wid), 'sourceId': 'way/'+str(wid),
                      'name': source['tags'].get('name', 'Civic pedestrian path'), 'sourceTags': source['tags'],
                      'area': source['tags'].get('area') == 'yes', 'width': 3,
                      'points': [project(elements['node', n]['lon'], elements['node', n]['lat']) for n in source['nodes']]})
    stores = []
    for index, (nid, name, kind) in enumerate(SELECTION):
        source = elements['node', nid]
        point = project(source['lon'], source['lat'])
        matches = [b for b in north['buildings'] if inside(point, b['points'])]
        if len(matches) != 1:
            raise ValueError('Ambiguous source footprint: '+str(nid))
        building = matches[0]
        candidates = []
        for a, b in zip(building['points'], building['points'][1:]):
            wall = closest(point, a, b)
            length = math.dist(a, b)
            if length < 3:
                continue
            for sign in (-1, 1):
                normal = [sign*(b[1]-a[1])/length, -sign*(b[0]-a[0])/length]
                face = [wall[i]+normal[i]*.22 for i in (0, 1)]
                approach = [wall[i]+normal[i]*2.7 for i in (0, 1)]
                if any(inside(approach, q['points']) or inside(face, q['points']) for q in north['buildings']):
                    continue
                candidates.append((math.dist(point, wall), a, b, wall, normal, face, approach))
        _, a, b, wall, normal, face, approach = min(candidates)
        paths = [w for w in walks if not w['area']]
        _, walk, public = min((math.dist(approach, closest(approach, p, q)), w, closest(approach, p, q))
                               for w in paths for p, q in zip(w['points'], w['points'][1:]))
        width = min(6.2, math.dist(a, wall)*2-.5, math.dist(b, wall)*2-.5)
        if width < 2.5:
            raise ValueError('Source frontage too near a corner: '+str(nid))
        rnd = lambda n: round(n, 3)
        stores.append({'id': 'store-'+str(nid), 'name': name, 'sourceName': source['tags']['name'],
                       'aliases': [name.lower(), source['tags']['name']], 'type': kind, 'district': 'Civic',
                       'x': rnd(approach[0]), 'z': rnd(approach[1]), 'radius': 4.8, 'price': 35, 'heal': 35,
                       'robbery': 245+index*15, 'buildingId': building['id'],
                       'building': {'height': building['height'], 'points': building['points']},
                       'buildingMatch': {'distance': 0, 'method': 'containing footprint'},
                       'sourcePosition': dict(zip(['x', 'z'], map(rnd, point))),
                       'source': {key: source[key] for key in ['type', 'id', 'version', 'timestamp', 'lat', 'lon']},
                       'frontage': {'x': rnd(face[0]), 'z': rnd(face[1]), 'yaw': rnd(math.atan2(-normal[0], -normal[1])),
                                    'width': rnd(width), 'confidence': 'estimated', 'allocation': 'nearest clear mapped facade'},
                       'publicApproach': dict(zip(['x', 'z'], map(rnd, public))), 'road': 'Bunda Street' if nid == 8196052995 else 'Garema Place',
                       'roadId': walk['id'], 'entranceNote': 'Estimated frontage beside an exact tagged pedestrian path; not a surveyed entrance.'})
    polygon = [project(*p) for p in asset['geometry']['rings'][0]]
    return {'meta': {'origin': origin, 'northMapSha256': digest(north_raw), 'sourceFiles': files,
                     'osm': {'source': 'OpenStreetMap contributors', 'license': 'ODbL-1.0', 'url': 'https://www.openstreetmap.org/copyright'},
                     'act': {'source': 'Australian Capital Territory', 'license': 'CC-BY-4.0', 'itemId': item['id'],
                             'url': item['url'], 'files': ACT_HASHES},
                     'geometryNote': 'Exact source boundaries and paths; original ramp positions/heights interpret published features, not a measured park survey.'},
            'stores': stores, 'pedestrianPaths': walks,
            'skatepark': {'id': 'civic-skatepark', 'name': 'Civic Skate Park', 'sourceId': 'SKPK6',
                          'osmSourceId': 'way/647898558', 'sourceAttributes': asset['attributes'],
                          'polygon': polygon, 'geographicPolygon': asset['geometry']['rings'][0],
                          'openingBuildingId': 'osm-584970594',
                          'featureReferences': ['https://skatermaps.com/the-yard-skate-park/', 'https://blog.skateboard.com.au/skateparks/australia/the-yard-skate-park/'],
                          'featureNote': 'Published mini ramp, hip/curved extension, banks, rails and ledges; model placement, dimensions and heights are original interpretations.'}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--act-cache', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=GAME/'data/civic-extras.json')
    parser.add_argument('--module-output', type=Path, default=GAME/'civic-extras.js')
    args = parser.parse_args()
    payload = build(args.cache, args.act_cache)
    encoded = json.dumps(payload, indent=2, sort_keys=True)+'\n'
    # Keep authored pure geometry helpers below a stable generated-data boundary.
    existing = args.module_output.read_text() if args.module_output.exists() else (GAME/'civic-extras.js').read_text()
    helpers = existing.split('// END GENERATED DATA\n', 1)[1]
    args.output.write_text(encoded)
    args.module_output.write_text('// Generated data: scripts/build_capital_civic_extras.py.\nconst DATA = '+encoded.rstrip()+';\n// END GENERATED DATA\n'+helpers)
    print(f'Civic extras: {len(payload["stores"])} stores / {len(payload["pedestrianPaths"])} pedestrian features / ACT SKPK6')


if __name__ == '__main__':
    main()

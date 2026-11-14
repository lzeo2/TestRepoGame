#!/usr/bin/env python3
"""Extract mapped road traffic signals from the already pinned official OSM tiles.

Raw caches remain external. This importer needs only Python's standard library;
it neither fetches network data nor modifies either geographic snapshot.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'Games/Capital Drive/data'
LON0, LAT0 = 149.137, -35.318
MX = 111320 * math.cos(math.radians(LAT0))
TAGS = {'highway', 'crossing', 'traffic_signals', 'traffic_signals:direction'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build(south_cache, north_cache):
    maps = [(name, json.loads((DATA / name).read_text()))
            for name in ('canberra.json', 'canberra-north.json')]
    road_nodes = {str(node) for _, data in maps for road in data['roads']
                  for node in road.get('nodes', [])}
    inputs = []
    for name, expected in maps[0][1]['meta']['sourceHashes'].items():
        if name.startswith('osm-tile-') and name.endswith('.json'):
            inputs.append((south_cache / name, expected))
    for record in maps[1][1]['meta']['source']['files']:
        if record['file'].startswith('osm-map-'):
            inputs.append((north_cache / record['file'], record['sha256']))
    records, sources = {}, []
    for path, expected in sorted(inputs, key=lambda item: item[0].name):
        assert digest(path) == expected, f'Pinned cache mismatch: {path.name}'
        raw = json.loads(path.read_text())
        bounds = raw['bounds']
        bbox = ','.join(str(bounds[key]) for key in ('minlon', 'minlat', 'maxlon', 'maxlat'))
        sources.append({'file': path.name, 'sha256': expected,
                        'url': 'https://api.openstreetmap.org/api/0.6/map.json?' + urlencode({'bbox': bbox})})
        for node in raw['elements']:
            if node.get('type') != 'node' or node.get('tags', {}).get('highway') != 'traffic_signals':
                continue
            if str(node['id']) not in road_nodes:
                continue
            record = {'id': str(node['id']), 'sourceId': f"node/{node['id']}",
                      'lon': node['lon'], 'lat': node['lat'],
                      'x': round((node['lon'] - LON0) * MX, 2),
                      'z': round((LAT0 - node['lat']) * 111320, 2),
                      'tags': {key: value for key, value in sorted(node['tags'].items()) if key in TAGS},
                      'sourceFiles': [path.name]}
            previous = records.get(record['id'])
            if previous:
                assert (previous['lon'], previous['lat'], previous['tags']) == (record['lon'], record['lat'], record['tags'])
                previous['sourceFiles'].append(path.name)
            else:
                records[record['id']] = record
    assert 200 < len(records) < 600, 'Unexpected source signal count; inspect sources before accepting'
    return {'version': 1, 'meta': {
        'source': 'OpenStreetMap contributors', 'license': 'ODbL-1.0',
        'attributionUrl': 'https://www.openstreetmap.org/copyright',
        'projection': 'Local equirectangular metres; x east, z south', 'origin': [LON0, LAT0],
        'mapHashes': {name: digest(DATA / name) for name, _ in maps}, 'files': sources,
        'limitations': ['Only highway=traffic_signals nodes on retained road node IDs are included.',
                         'OSM positions and direction tags are source data; coverage may be incomplete.',
                         'Junction grouping, sidewalk heads, stop lines and phase timings are game estimates, not surveyed controller data.']},
        'signals': sorted(records.values(), key=lambda record: int(record['id']))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--south-cache', type=Path, required=True)
    parser.add_argument('--north-cache', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=DATA / 'traffic-signals.json')
    args = parser.parse_args()
    result = build(args.south_cache, args.north_cache)
    args.output.write_text(json.dumps(result, separators=(',', ':')) + '\n')
    print(f"signals: {len(result['signals'])}; pinned source tiles: {len(result['meta']['files'])}")


if __name__ == '__main__':
    main()

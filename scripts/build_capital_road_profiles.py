#!/usr/bin/env python3
"""Extract exact exported OSM road tags without rewriting geographic source data."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', required=True, type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'Games/Capital Drive/data/road-profiles.json')
    args = parser.parse_args()
    map_path = ROOT / 'Games/Capital Drive/data/canberra.json'
    map_bytes = map_path.read_bytes()
    mapped = json.loads(map_bytes)
    expected = mapped['meta']['sourceHashes']
    sources = []
    ways = {}
    for name, digest in sorted(expected.items()):
        if not name.startswith('osm-tile-') or not name.endswith('.json'):
            continue
        source = args.cache / name
        raw = source.read_bytes()
        if hashlib.sha256(raw).hexdigest() != digest:
            raise ValueError('Pinned source hash mismatch: ' + name)
        elements = json.loads(raw)['elements']
        sources.append({'file': source.name, 'sha256': hashlib.sha256(raw).hexdigest()})
        for item in elements:
            if item.get('type') == 'way':
                ways[str(item['id'])] = item.get('tags', {})
    roads = mapped['roads']
    keys = ('service', 'access', 'vehicle', 'motor_vehicle', 'bus', 'width', 'lanes',
        'lanes:forward', 'lanes:backward', 'maxspeed', 'sidewalk', 'sidewalk:left', 'sidewalk:right',
        'cycleway', 'cycleway:left', 'cycleway:right', 'barrier', 'guard_rail',
        'bridge', 'layer', 'tunnel', 'covered')
    profiles = {}
    matched = 0
    for road in roads:
        osm_id = road['id'].split('-')[0]
        if osm_id not in ways:
            raise ValueError('Missing source way: ' + osm_id)
        matched += 1
        tags = {key: ways[osm_id][key] for key in keys if key in ways[osm_id]}
        if tags:
            profiles[road['id']] = tags
    result = {'version': 1, 'source': {'name': 'OpenStreetMap contributors', 'license': 'ODbL-1.0',
        'url': 'https://www.openstreetmap.org/copyright', 'files': sources, 'mapSha256': hashlib.sha256(map_bytes).hexdigest(),
        'matchedRoads': matched}, 'roads': profiles}
    args.output.write_text(json.dumps(result, separators=(',', ':'), sort_keys=True) + '\n')
    print(f'{matched} exact exported roads matched; {len(profiles)} tagged profiles')

if __name__ == '__main__':
    main()

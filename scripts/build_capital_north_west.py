#!/usr/bin/env python3
"""Build bounded OSM north/west streets; raw pinned API responses remain external.

This adds source road runs and named place nodes, not invented street connectors,
building layouts or survey elevations. Existing map snapshots stay unchanged.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode

from build_capital_north import ALLOWED, ROAD_TAGS, get, xy

ROOT = Path(__file__).resolve().parents[1]
BOXES = {'north': [149.110, -35.272, 149.153, -35.235],
         'west': [149.075, -35.322, 149.112, -35.268]}
PLACE_NAMES = {'Lyneham', 'Dickson', 'Turner', 'O’Connor', "O'Connor", 'Acton',
               'Black Mountain', 'Yarralumla'}


def fetch(cache):
    cache.mkdir(parents=True, exist_ok=True)
    if (cache / 'manifest.json').exists():
        return
    tiles = []
    for name, (west, south, east, north) in BOXES.items():
        for x in range(2):
            for z in range(3):
                bbox = [west+(east-west)*x/2, south+(north-south)*z/3,
                        west+(east-west)*(x+1)/2, south+(north-south)*(z+1)/3]
                url = 'https://api.openstreetmap.org/api/0.6/map.json?' + urlencode({'bbox': ','.join(map(str, bbox))})
                tiles.append((url, cache / f'{name}-{x}-{z}.json'))
    def tile(item):
        result = get(*item)
        print(result['file'], flush=True)
        return result
    with ThreadPoolExecutor(max_workers=2) as pool:
        files = list(pool.map(tile, tiles))
    manifest = dict(source='OpenStreetMap contributors', license='ODbL-1.0',
                    licenseUrl='https://opendatacommons.org/licenses/odbl/1-0/',
                    attributionUrl='https://www.openstreetmap.org/copyright',
                    snapshotDate='2026-11-21', files=files)
    (cache / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')


def segment(nodes, i):
    return tuple(sorted((nodes[i], nodes[i+1])))


def build(cache, existing):
    manifest = json.loads((cache / 'manifest.json').read_text())
    objects = {}
    for source in manifest['files']:
        raw = (cache / source['file']).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == source['sha256'], f'Changed source: {source["file"]}'
        for item in json.loads(raw)['elements']:
            key = item['type'], item['id']
            if item.get('version', 0) >= objects.get(key, {}).get('version', 0):
                objects[key] = item
    nodes = {ident: item for (kind, ident), item in objects.items() if kind == 'node'}
    def inside(node):
        return any(w <= node['lon'] <= e and s <= node['lat'] <= n for w, s, e, n in BOXES.values())
    used, pins, lake_points = set(), [], []
    for path in existing:
        raw = path.read_bytes()
        pins.append(dict(file=path.name, sha256=hashlib.sha256(raw).hexdigest()))
        snapshot = json.loads(raw)
        lake_points.extend(point for area in snapshot.get('areas', []) if area.get('sourceId') == 'relation/3400115' for point in area['points'])
        for road in snapshot['roads']:
            refs = road.get('nodes', [])
            used.update(segment(refs, i) for i in range(len(refs)-1))
    roads = []
    for (kind, ident), way in sorted(objects.items()):
        if kind != 'way' or way.get('tags', {}).get('highway') not in ALLOWED:
            continue
        refs, tags = way['nodes'], way['tags']
        if not all(ref in nodes for ref in refs):
            continue
        runs, run = [], []
        for i in range(len(refs)-1):
            key = segment(refs, i)
            if key not in used and (inside(nodes[refs[i]]) or inside(nodes[refs[i+1]])):
                used.add(key)
                if not run: run = [i]
                run.append(i+1)
            elif run:
                runs.append(run); run = []
        if run: runs.append(run)
        try: width = float(tags.get('width', '').replace(' m', ''))
        except ValueError:
            try: width = float(tags.get('lanes', 1 if tags['highway'] == 'service' else 2))*3.25+1
            except ValueError: width = 7.5
        try: speed = int(tags['maxspeed'])
        except (KeyError, ValueError): speed = None
        for indices in runs:
            roads.append(dict(id=f'{ident}-north-west-{indices[0]}', sourceId=f'way/{ident}',
                name=tags.get('name', ''), type=tags['highway'], width=round(max(2.5, min(24, width)), 1),
                **({'speed': speed} if speed is not None else {}), oneway=-1 if tags.get('oneway') == '-1' else 1 if tags.get('oneway') in {'yes', '1', 'true'} or tags.get('junction') == 'roundabout' else 0,
                roundabout=tags.get('junction') == 'roundabout', sourceTags={k: v for k, v in tags.items() if k in ROAD_TAGS | {'maxspeed:forward', 'maxspeed:backward'}},
                nodes=[refs[i] for i in indices], points=[xy(nodes[refs[i]]) for i in indices]))
    landmarks = []
    for ident, node in sorted(nodes.items()):
        tags = node.get('tags', {})
        if inside(node) and tags.get('name') in PLACE_NAMES and (tags.get('place') or tags.get('natural') == 'peak'):
            x, z = xy(node)
            landmarks.append(dict(id=f'north-west-place-{ident}', name=tags['name'], x=x, z=z,
                radius=200, sourceId=f'node/{ident}', sourceTags=tags,
                description='Source place label; not a verified building entrance or road arrival.',
                anchorType='exact OSM named place node'))
    points = [point for road in roads for point in road['points']]
    assert points and {'Lyneham', 'Dickson'} <= {place['name'] for place in landmarks}, 'Northern source places missing'
    bounds = dict(minX=min(p[0] for p in points+lake_points)-30, maxX=max(p[0] for p in points)+30,
                  minZ=min(p[1] for p in points)-30, maxZ=max(p[1] for p in points)+30)
    return dict(meta=dict(title='Lyneham, Dickson and western Canberra source streets',
        origin=[149.137, -35.318], projection='Local equirectangular metres; x east, z south',
        source=manifest, sourceBoxes=BOXES, existingSnapshots=pins,
        notes=['Exact source nodes and tags; only segments absent from pinned existing snapshots are appended.',
               'No buildings or connecting streets are invented. Historical shared nodes retain their source identities.',
               'Road widths and default speeds are estimates where source tags are absent.']),
        bounds=bounds, roads=roads, buildings=[], areas=[], landmarks=landmarks,
        terrainRequirements=dict(status='required-before-north-west-runtime', source='ACT 2020 LiDAR-derived 2m contours',
            sourceSha256='b8090f3ab023c2821747a760470eb8e53173c6d1b7a35dbb2a306885da7981b9'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--fetch', action='store_true')
    parser.add_argument('--output', type=Path, default=ROOT/'Games/Capital Drive/data/north-west.json')
    args = parser.parse_args()
    if args.fetch: fetch(args.cache)
    result = build(args.cache, [ROOT/f'Games/Capital Drive/data/{name}.json' for name in ['canberra', 'canberra-north', 'airport']])
    args.output.write_text(json.dumps(result, separators=(',', ':'))+'\n')
    print(json.dumps(dict(roads=len(result['roads']), points=sum(len(road['points']) for road in result['roads']),
                         landmarks=[place['name'] for place in result['landmarks']], bytes=args.output.stat().st_size)))


if __name__ == '__main__':
    main()

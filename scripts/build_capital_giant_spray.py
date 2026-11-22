#!/usr/bin/env python3
"""Pinned OSM geometry for the fictional Giant Spray reuse of Big Splash.

Fetch is developer-only; the game consumes the checked JSON offline. Keep exact
source node pairs and directed public connections, without invented connectors.
"""
import argparse
import hashlib
import heapq
import json
import math
from pathlib import Path

from build_capital_north import ALLOWED, ROAD_TAGS, contains, get, xy

ROOT = Path(__file__).resolve().parents[1]
BOX = [149.0605, -35.271, 149.086, -35.246]
PERIMETER = 27480300
POOL_IDS = [716007093, 716007094, 716007095, 716007096]
SLIDE_IDS = [716007097, 716007098, 716007102, 716007103, 716007104, 716007105]
EXISTING = ['canberra', 'canberra-north', 'airport', 'north-west']


def pair(a, b):
    return tuple(sorted((a, b)))


def fetch(cache):
    cache.mkdir(parents=True, exist_ok=True)
    if (cache/'manifest.json').exists():
        return
    source = get('https://api.openstreetmap.org/api/0.6/map.json?bbox='+','.join(map(str, BOX)), cache/'macquarie.json')
    manifest = dict(source='OpenStreetMap contributors', license='ODbL-1.0',
                    licenseUrl='https://opendatacommons.org/licenses/odbl/1-0/',
                    attributionUrl='https://www.openstreetmap.org/copyright',
                    snapshotDate='2026-11-22', files=[source])
    (cache/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')


def build(cache, existing):
    manifest = json.loads((cache/'manifest.json').read_text())
    objects = {}
    for source in manifest['files']:
        raw = (cache/source['file']).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == source['sha256'], 'Changed source: '+source['file']
        for item in json.loads(raw)['elements']:
            key = item['type'], item['id']
            if item.get('version', 0) >= objects.get(key, {}).get('version', 0):
                objects[key] = item
    nodes = {i: n for (kind, i), n in objects.items() if kind == 'node'}
    ways = {i: w for (kind, i), w in objects.items() if kind == 'way'}
    def feature(ident):
        way = ways[ident]
        return dict(sourceId=f'way/{ident}', sourceVersion=way['version'],
                    sourceTimestamp=way['timestamp'], sourceTags=way.get('tags', {}),
                    nodes=way['nodes'], points=[xy(nodes[n]) for n in way['nodes']])
    perimeter = feature(PERIMETER)
    ring = perimeter['points']
    assert ring[0] == ring[-1], 'Source perimeter is not closed'
    center = [sum(p[d] for p in ring[:-1])/(len(ring)-1) for d in [0, 1]]
    def distance(a, b):
        return math.hypot(a[0]-b[0], a[1]-b[1])
    used, prior_nodes, pins = set(), set(), []
    for path in existing:
        raw = path.read_bytes()
        pins.append(dict(file=path.name, sha256=hashlib.sha256(raw).hexdigest()))
        for road in json.loads(raw)['roads']:
            refs = road.get('nodes', [])
            prior_nodes.update(refs)
            used.update(pair(a, b) for a, b in zip(refs, refs[1:]))
    def public(tags):
        return tags.get('highway') in ALLOWED and all(tags.get(k) not in {'no', 'private'} for k in ['access', 'vehicle', 'motor_vehicle', 'motorcar']) and tags.get('service') not in {'driveway', 'parking_aisle'}
    graph, segments = {}, {}
    for ident, way in sorted(ways.items()):
        tags = way.get('tags', {})
        if not public(tags) or not all(n in nodes for n in way['nodes']):
            continue
        direction = -1 if tags.get('oneway') == '-1' else 1 if tags.get('oneway') in {'yes', '1', 'true'} or tags.get('junction') == 'roundabout' else 0
        for a, b in zip(way['nodes'], way['nodes'][1:]):
            key = pair(a, b)
            segments.setdefault(key, (ident, a, b))
            length = distance(xy(nodes[a]), xy(nodes[b]))
            if direction != -1: graph.setdefault(a, []).append((b, length, key))
            if direction != 1: graph.setdefault(b, []).append((a, length, key))
    approach = min((n for n in graph if any(ways[segments[k][0]].get('tags', {}).get('name') for _, _, k in graph[n])), key=lambda n: distance(xy(nodes[n]), center))
    seams = prior_nodes.intersection(graph)
    assert seams, 'No retained source road seam'
    def path_to_seam(reverse=False):
        adjacency = graph
        if reverse:
            adjacency = {}
            for a, edges in graph.items():
                for b, cost, key in edges: adjacency.setdefault(b, []).append((a, cost, key))
        queue, costs, parent = [(0, approach)], {approach: 0}, {}
        while queue:
            cost, a = heapq.heappop(queue)
            if cost != costs[a]: continue
            if a in seams:
                keys = set()
                while a != approach:
                    a, key = parent[a]
                    keys.add(key)
                return keys
            for b, length, key in adjacency.get(a, []):
                new = cost+length
                if new < costs.get(b, math.inf):
                    costs[b] = new; parent[b] = (a, key); heapq.heappush(queue, (new, b))
        raise AssertionError('No public directed connection between park and retained roads')
    selected = path_to_seam() | path_to_seam(True)
    nearby = {k for k, (_, a, b) in segments.items() if min(distance(xy(nodes[a]), center), distance(xy(nodes[b]), center)) < 240}
    # Keep the small precinct connected to the checked approach, never add
    # geometric shortcuts between unshared source nodes.
    linked = {approach}; changed = True
    while changed:
        changed = False
        for key in nearby | selected:
            if linked.intersection(key) and not set(key) <= linked:
                linked.update(key); changed = True
    selected |= {k for k in nearby if set(k) <= linked}
    roads = []
    for ident, way in sorted(ways.items()):
        refs, tags = way.get('nodes', []), way.get('tags', {})
        if not public(tags): continue
        runs, run = [], []
        for i, (a, b) in enumerate(zip(refs, refs[1:])):
            if pair(a, b) in selected and pair(a, b) not in used:
                used.add(pair(a, b))
                if not run: run = [i]
                run.append(i+1)
            elif run: runs.append(run); run = []
        if run: runs.append(run)
        try: width = float(tags.get('width', '').replace(' m', ''))
        except ValueError:
            try: width = float(tags.get('lanes', 1 if tags['highway'] == 'service' else 2))*3.25+1
            except ValueError: width = 7.5
        try: speed = int(tags['maxspeed'])
        except (KeyError, ValueError): speed = None
        for indices in runs:
            roads.append(dict(id=f'{ident}-giant-spray-{indices[0]}', sourceId=f'way/{ident}',
                sourceVersion=way['version'], sourceTimestamp=way['timestamp'],
                name=tags.get('name', ''), type=tags['highway'], width=round(max(2.5, min(24, width)), 1),
                **({'speed': speed} if speed is not None else {}),
                oneway=-1 if tags.get('oneway') == '-1' else 1 if tags.get('oneway') in {'yes', '1', 'true'} or tags.get('junction') == 'roundabout' else 0,
                roundabout=tags.get('junction') == 'roundabout', sourceTags={k: v for k, v in tags.items() if k in ROAD_TAGS | {'maxspeed:forward', 'maxspeed:backward'}},
                nodes=[refs[i] for i in indices], points=[xy(nodes[refs[i]]) for i in indices]))
    site = dict(id='giant-spray', name='Giant Spray', sourceName='Big Splash', **perimeter,
                x=round(center[0], 2), z=round(center[1], 2),
                pools=[feature(i) for i in POOL_IDS], slides=[feature(i) for i in SLIDE_IDS],
                approach=dict(x=xy(nodes[approach])[0], z=xy(nodes[approach])[1], sourceId=f'node/{approach}'),
                fiction='Abandoned-waterpark game styling and Giant Spray name are original fiction; source geometry is retained.')
    assert all(contains(ring, p['points'][0]) for p in site['pools']), 'Pool outside source precinct'
    points = ring+[p for road in roads for p in road['points']]
    bounds = {k: round(fn(p[d] for p in points)+pad, 2) for k, d, fn, pad in [('minX', 0, min, -30), ('maxX', 0, max, 30), ('minZ', 1, min, -30), ('maxZ', 1, max, 30)]}
    return dict(meta=dict(title='Giant Spray source precinct and public road connector', origin=[149.137, -35.318],
        projection='Local equirectangular metres; x east, z south', source=manifest, sourceBox=BOX, existingSnapshots=pins,
        notes=['Exact OSM node geometry, feature versions and directed public roads. No invented road links.', 'Only selected connected public streets are added; private pools and residential buildings are excluded.']),
        bounds=bounds, roads=roads, buildings=[], areas=[], landmarks=[dict(id=site['id'], name=site['name'], x=site['x'], z=site['z'], radius=100, sourceId=site['sourceId'], description='Fictional abandoned waterpark on the sourced Big Splash precinct.')], site=site,
        terrainRequirements=dict(status='required-before-runtime', source='ACT 2020 LiDAR-derived 2m contours', sourceSha256='b8090f3ab023c2821747a760470eb8e53173c6d1b7a35dbb2a306885da7981b9'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--fetch', action='store_true')
    parser.add_argument('--output', type=Path, default=ROOT/'Games/Capital Drive/data/giant-spray.json')
    args = parser.parse_args()
    if args.fetch: fetch(args.cache)
    result = build(args.cache, [ROOT/f'Games/Capital Drive/data/{name}.json' for name in EXISTING])
    args.output.write_text(json.dumps(result, separators=(',', ':'))+'\n')
    print(json.dumps(dict(roads=len(result['roads']), segments=sum(len(r['nodes'])-1 for r in result['roads']), bounds=result['bounds'], site=result['site']['approach'], bytes=args.output.stat().st_size)))


if __name__ == '__main__': main()

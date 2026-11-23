#!/usr/bin/env python3
"""Extract Canberra light rail from the existing verified OSM snapshots."""
import argparse
from collections import defaultdict
import hashlib
import heapq
import math
import json
from pathlib import Path

from build_capital_north import xy

ROOT = Path(__file__).resolve().parents[1]
# Station and direction-specific tagged stop_position nodes, south to north.
STATIONS = (
    ('rail-alinga', 6355817336, 6355817317, 6355817318),
    ('rail-elouera', 6355817340, 6355817320, 6355817319),
    ('rail-ipima', 6355817332, 6355817322, 6355817321),
    ('rail-macarthur', 6355817331, 6355817324, 6355817323),
    ('rail-dickson', 6355817338, 6355817325, 6355817326),
    ('rail-swinden', 6355817339, 6354101270, 6354101421),
    ('rail-phillip', 6355817337, 6354101235, 6305033612),
    ('rail-epic', 6355817329, 6354101184, 6354101857),
    ('rail-sandford', 12730214896, 9153593204, 9153593205),
    ('rail-well-station', 6355817341, 6354101082, 6354101750),
    ('rail-nullarbor', 6355817335, 6354101035, 6354101703),
    ('rail-mapleton', 6355817333, 6354101002, 6354101566),
    ('rail-manning-clark', 6355817334, 6354100951, 6220951534),
    ('rail-gungahlin', 6355817330, 6355817327, 6355817328),
)
ROUTE_RELATIONS = {'north': 10271385, 'south': 10271386}


def extract(caches):
    objects, origins, pins = {}, {}, {}
    for cache in caches:
        manifest = json.loads((cache / 'manifest.json').read_text())
        for source in manifest['files']:
            raw = (cache / source['file']).read_bytes()
            digest = hashlib.sha256(raw).hexdigest()
            if digest != source['sha256']:
                raise ValueError(f"OSM snapshot hash mismatch for {source['file']}")
            filename = f"{cache.name}/{source['file']}"
            pins[filename] = {'file': filename, 'sha256': digest, 'url': source['url']}
            for item in json.loads(raw)['elements']:
                key = (item['type'], item['id'])
                if item.get('version', 0) >= objects.get(key, {}).get('version', 0):
                    objects[key], origins[key] = item, filename
    nodes = {ident: node for (kind, ident), node in objects.items() if kind == 'node'}
    directed, connected = defaultdict(list), defaultdict(list)
    for (kind, ident), obj in sorted(objects.items()):
        tags = obj.get('tags', {})
        if kind != 'way' or tags.get('railway') != 'tram':
            continue
        main = tags.get('usage') == 'main'
        if not main and tags.get('service') != 'crossover':
            continue
        for left, right in zip(obj['nodes'], obj['nodes'][1:]):
            if left not in nodes or right not in nodes:
                continue
            a, b = xy(nodes[left]), xy(nodes[right])
            distance = math.dist(a, b)
            connected[left].append((right, distance, ident))
            connected[right].append((left, distance, ident))
            if main:
                directed[left].append((right, distance, ident))
                if tags.get('oneway') == 'alternating':
                    directed[right].append((left, distance, ident))

    def route(graph, first, last):
        queue, seen = [(0, first, [], [])], set()
        while queue:
            metres, node, path, ways = heapq.heappop(queue)
            if node in seen:
                continue
            path = path + [node]
            if node == last:
                return path, ways
            seen.add(node)
            for neighbour, distance, way in graph[node]:
                if neighbour not in seen:
                    heapq.heappush(queue, (metres+distance, neighbour, path, ways+[way]))
        raise ValueError(f'No joined mapped tram path from {first} to {last}')

    # The public route relations establish stop order and exact platform plans.
    # Construction/proposed tracks never enter the railway=tram running graph.
    platforms = {}
    for direction, relation_id in ROUTE_RELATIONS.items():
        relation = objects['relation', relation_id]
        expected = [stop[2 if direction == 'north' else 3] for stop in STATIONS]
        if direction == 'south':
            expected.reverse()
        stops = [member['ref'] for member in relation['members'] if member['role'] == 'stop']
        if stops != expected:
            raise ValueError(f'Unexpected {direction} operating route stop order in relation {relation_id}')
        current_stop = None
        for member in relation['members']:
            if member['role'] == 'stop':
                current_stop = member['ref']
            elif member['role'] == 'platform':
                way = objects['way', member['ref']]
                if current_stop is None or way['nodes'][0] != way['nodes'][-1] or any(node not in nodes for node in way['nodes']):
                    raise ValueError(f'Incomplete {direction} platform way {member["ref"]}')
                platforms[direction, current_stop] = {
                    'sourceId': f'way/{way["id"]}', 'nodes': list(way['nodes']),
                    'points': [xy(nodes[node]) for node in way['nodes']],
                }

    start, end = STATIONS[0], STATIONS[-1]
    used = {origins['node', ident] for _, *refs in STATIONS for ident in refs}
    used.update(origins['relation', ident] for ident in ROUTE_RELATIONS.values())
    result = {'stops': [], 'lines': []}
    for key, station, north, south in STATIONS:
        item = nodes[station]
        result['stops'].append(dict(id=key, name=item['tags']['name'], station=station,
                                   coordinates=xy(item), north=north, south=south,
                                   platforms={direction: platforms[direction, stop] for direction, stop in [('north', north), ('south', south)]}))
        for direction, stop in [('north', north), ('south', south)]:
            platform = platforms[direction, stop]
            used.add(origins['way', int(platform['sourceId'].split('/')[1])])
            used.update(origins['node', node] for node in platform['nodes'])
    for ident, graph, first, last, direction in (
        ('northbound', directed, start[2], end[2], 1),
        ('gungahlin-turn', connected, end[2], end[3], 0),
        ('southbound', directed, end[3], start[3], -1),
        ('alinga-turn', connected, start[3], start[2], 0),
    ):
        path, ways = route(graph, first, last)
        if direction:
            expected = [stop[2 if direction == 1 else 3] for stop in STATIONS]
            if direction == -1:
                expected.reverse()
            sequence = [node for node in path if node in expected]
            if sequence != expected:
                raise ValueError(f'Running {ident} path misses or reorders a station marker')
        used.update(origins['node', node] for node in path)
        used.update(origins['way', way] for way in ways)
        result['lines'].append(dict(id=ident, direction=direction, nodes=path,
                                    ways=list(dict.fromkeys(ways)), points=[xy(nodes[node]) for node in path]))
    result['source'] = dict(authority='OpenStreetMap contributors', license='ODbL-1.0',
                            attributionUrl='https://www.openstreetmap.org/copyright',
                            routeRelations=[f'relation/{ident}' for ident in ROUTE_RELATIONS.values()],
                            operatingSection='Stage 1: Alinga Street to Gungahlin Place',
                            note='Exact mapped track and platform plan geometry. Platform heights, service timing and fleet are fictional gameplay; unopened southern extensions are excluded.',
                            inputs=[pins[file] for file in sorted(used)])
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', action='append', required=True, type=Path,
                        help='Verified raw OSM cache directory. Pass Civic and north/west directories.')
    parser.add_argument('--output', type=Path,
                        default=ROOT / 'Games/Capital Drive/light-rail-source.js')
    args = parser.parse_args()
    data = extract(args.cache)
    rows = ['// Generated by scripts/build_capital_light_rail.py from pinned OSM snapshots.',
            'export const LIGHT_RAIL_SOURCE = {',
            '  stops: ' + json.dumps(data['stops'], separators=(',', ':')) + ',',
            '  lines: [']
    rows.extend('    ' + json.dumps(line, separators=(',', ':')) + ',' for line in data['lines'])
    rows.extend(['  ],', '  source: ' + json.dumps(data['source'], separators=(',', ':')), '};', ''])
    args.output.write_text('\n'.join(rows))
    print(f"{len(data['stops'])} stations, {len(data['lines'])} connected track sections, "
          f"{sum(len(line['points']) for line in data['lines'])} track nodes, "
          f"{len(data['source']['inputs'])} verified OSM inputs.")


if __name__ == '__main__':
    main()

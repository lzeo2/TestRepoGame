#!/usr/bin/env python3
"""Restore selected Western Lake and Yarralumla links from SHA-pinned OSM tiles."""
import argparse
import hashlib
import json
from pathlib import Path
from math import dist

from build_capital_north import ROAD_TAGS, xy

ROOT = Path(__file__).resolve().parents[1]
SCRIVENER = {
    'file': 'capital-scrivener-local-2026-11-26.json',
    'url': 'https://api.openstreetmap.org/api/0.6/map.json?bbox=149.068,-35.310,149.081,-35.286',
    'sha256': '5fea1e39e1828ea1ac62ce3484cae55561fcf9862baa366b1fa203fe6741ed38',
}
WEST_TILES = {
    'west-0-0.json': '9b7090dd1b407715826e39366a52043c396d5bb1bab33ef0bd6d2cf728b0da79',
    'west-0-1.json': '69f3a2f18c3c14a65ef2a6f94d81b9622f05fc94dafa48ca255df0c39a623106',
    'west-1-0.json': '470807cf5f4d976d313a11138846f0bb4ee70d4aae405066792223362462f58e',
    'west-1-1.json': '89e05ca409bcf1db321b369fcdf9d6b6ac1c9a6b7a0167bb2e2dcf628bf7a047',
}
# These index ranges end at the source nodes already shipped in north-west and Molonglo.
ROAD_SLICES = {50845453: (9, 30), 76997565: (0, 1), 546708906: (0, 1), 76997563: (8, 31)}
# Retain public crossings from the lake path, Yarralumla's neighbourhood and Kent Street.
# Surrounding restricted zoo/customer paths and unconnected/private spans are omitted.
PATH_BRIDGES = {
    38013588, 253136767, 253145172, 253145175, 253145177, 253145179, 253145180, 253145181,
    77004600, 707561704, 707946474, 707946477, 707949280, 906946052, 906946058,
    1136952546, 61158741, 61158747, 707561696, 907180798, 38013556, 51181655,
}
PATH_TYPES = {'cycleway', 'footway', 'path', 'pedestrian', 'bridleway', 'steps'}
RESTRICTED = {'no', 'private', 'customers', 'permit', 'destination'}
APPROACH = 55


def public_path(tags):
    return (tags.get('highway') in PATH_TYPES and tags.get('access') not in RESTRICTED
            and tags.get('foot') not in RESTRICTED and tags.get('tunnel') in {None, 'no'})


def read_tile(source, path, elements):
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != source['sha256']:
        raise ValueError(f'Changed source: {source["file"]}')
    for item in json.loads(raw)['elements']:
        key = item['type'], item['id']
        if item.get('version', 0) >= elements.get(key, {}).get('version', 0):
            elements[key] = item


def build(west_cache, scrivener_file):
    manifest = json.loads((west_cache / 'manifest.json').read_bytes())
    pins = {r['file']: r for r in manifest['files']}
    sources = [dict(pins[file], sha256=sha) for file, sha in WEST_TILES.items()]
    elements = {}
    for source in sources:
        read_tile(source, west_cache / source['file'], elements)
    read_tile(SCRIVENER, scrivener_file, elements)
    ways = {ident: row for (kind, ident), row in elements.items() if kind == 'way'}
    nodes = {ident: xy(row) for (kind, ident), row in elements.items() if kind == 'node'}
    approaches = {}
    for ident, way in ways.items():
        tags = way.get('tags', {})
        if not public_path(tags) or tags.get('bridge') not in {None, 'no'}:
            continue
        if not all(node in nodes for node in way['nodes']):
            continue
        for index, node in enumerate(way['nodes']):
            approaches.setdefault(node, []).append((ident, index))

    path_segments = {}
    for ident in sorted(PATH_BRIDGES):
        way = ways[ident]
        refs = way['nodes']
        if not public_path(way['tags']) or way['tags'].get('bridge') in {None, 'no'}:
            raise ValueError(f'Expected a public tagged bridge for way/{ident}')
        path_segments.setdefault(ident, set()).update(range(len(refs)-1))
        for endpoint in (refs[0], refs[-1]):
            choices = approaches.get(endpoint, ())
            if not choices:
                raise ValueError(f'Missing public mapped approach for way/{ident} at node/{endpoint}')
            for approach_id, anchor_index in choices:
                approach_refs = ways[approach_id]['nodes']
                for step in (-1, 1):
                    travelled, index = 0, anchor_index
                    while travelled < APPROACH and 0 <= index+step < len(approach_refs):
                        path_segments.setdefault(approach_id, set()).add(min(index,index+step))
                        travelled += dist(nodes[approach_refs[index]], nodes[approach_refs[index+step]])
                        index += step

    def record(ident, first, last, path=False):
        way = ways[ident]
        tags = way['tags']
        width = 3 if tags['highway'] in {'cycleway','bridleway'} else 2.5
        if not path:
            width = 7.5
        refs = way['nodes'][first:last+1]
        selected = {k: v for k, v in tags.items() if k in ROAD_TAGS | {'bridge_number'}}
        return dict(id=f'west-bridge-{ident}-{first}', sourceId=f'way/{ident}', sourceVersion=way['version'],
                    name='' if path else tags.get('name', ''), type=tags['highway'], width=width, oneway=0,
                    **({'standalonePath': True} if path else {}),
                    sourceTags=selected, nodes=refs, points=[nodes[n] for n in refs])

    roads = [record(ident, *limits) for ident, limits in ROAD_SLICES.items()]
    for ident, indices in sorted(path_segments.items()):
        start = end = None
        for segment in sorted(indices):
            if end is not None and segment != end:
                roads.append(record(ident,start,end,path=True))
                start = end = None
            if start is None:
                start = segment
            end = segment+1
        roads.append(record(ident,start,end,path=True))
    points = [p for road in roads for p in road['points']]
    return dict(meta=dict(origin=[149.137,-35.318], title='Yarralumla and Western Lake bridge links',
                          source='OpenStreetMap contributors',license='ODbL-1.0',
                          attributionUrl='https://www.openstreetmap.org/copyright',files=[*sources,SCRIVENER]),
                bounds=dict(minX=min(p[0] for p in points)-20, maxX=max(p[0] for p in points)+20,
                            minZ=min(p[1] for p in points)-20, maxZ=max(p[1] for p in points)+20),
                roads=roads, buildings=[], areas=[])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--west-cache', type=Path, required=True)
    parser.add_argument('--scrivener-file', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    data = build(args.west_cache, args.scrivener_file)
    header = '// Generated by scripts/build_capital_west_bridge_links.py from SHA-pinned OSM tiles.\n'
    args.output.write_text(header+'export const WEST_BRIDGE_LINKS = '+json.dumps(data,separators=(',', ':'))+';\n')
    print(f'{len(data["roads"])} runs; {sum(len(r["points"])-1 for r in data["roads"])} source segments')


if __name__ == '__main__':
    main()

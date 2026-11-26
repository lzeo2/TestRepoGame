#!/usr/bin/env python3
"""Restore selected Western Lake and Yarralumla links from SHA-pinned OSM tiles."""
import argparse
import hashlib
from heapq import heappop, heappush
import json
from pathlib import Path
from math import dist, hypot, floor, ceil
from urllib.parse import urlencode

from build_capital_north import ROAD_TAGS, xy

ROOT = Path(__file__).resolve().parents[1]
SCRIVENER = {
    'file': 'capital-scrivener-local-2026-11-26.json',
    'url': 'https://api.openstreetmap.org/api/0.6/map.json?bbox=149.068,-35.310,149.081,-35.286',
    'sha256': '5fea1e39e1828ea1ac62ce3484cae55561fcf9862baa366b1fa203fe6741ed38',
}
PACK_CACHES = {
    'canberra':'canberra-data', 'canberra-north':'canberra-north-data',
    'airport':'capital-airport-osm', 'north-west':'capital-north-west-osm',
    'giant-spray':'capital-giant-spray-osm', 'region-belconnen':'capital-regions-belconnen',
    'region-north':'capital-regions-north', 'region-south':'capital-regions-south',
    'region-molonglo':'capital-molonglo-osm', 'region-west-belconnen':'capital-west-belconnen-osm',
}
# These index ranges end at the source nodes already shipped in north-west and Molonglo.
ROAD_SLICES = {50845453: (9, 30), 76997565: (0, 1), 546708906: (0, 1), 76997563: (8, 31)}
DRIVEWAY_BRIDGES = (625052743, 625052746, 762160136)
PATH_TYPES = {'cycleway', 'footway', 'path', 'pedestrian', 'bridleway', 'steps'}
TERRAIN_PACKS = ['canberra','north-terrain','airport-terrain','north-west-terrain',
                 'region-belconnen','region-north','region-south','region-molonglo','region-west-belconnen']
INVALID_DECK = {None, 'no', 'abandoned', 'proposed', 'ruins', 'collapsed', 'construction'}
RESTRICTED = {'no', 'private', 'customers', 'permit', 'destination'}
APPROACH = 55


def public_path(tags):
    private_motor = tags.get('motor_vehicle') in {'no','private'} or tags.get('motorcar') in {'no','private'}
    track = tags.get('highway') == 'track'
    pedestrian_service = tags.get('highway') == 'service' and private_motor and tags.get('foot') in {'yes','designated'}
    trail = track or pedestrian_service
    return ((tags.get('highway') in PATH_TYPES or trail) and tags.get('access') not in RESTRICTED
            and tags.get('foot') not in RESTRICTED and tags.get('tunnel') in {None, 'no'} and tags.get('area') != 'yes')


def read_tile(source, path, elements):
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != source['sha256']:
        raise ValueError(f'Changed source: {source["file"]}')
    tile = json.loads(raw)
    if not source.get('url'):
        bounds = tile['bounds']
        box = ','.join(str(bounds[key]) for key in ('minlon','minlat','maxlon','maxlat'))
        source['url'] = 'https://api.openstreetmap.org/api/0.6/map.json?' + urlencode({'bbox': box})
    for item in tile['elements']:
        key = item['type'], item['id']
        if item.get('version', 0) >= elements.get(key, {}).get('version', 0):
            elements[key] = item


def load_map(name):
    return json.loads((ROOT / f'Games/Capital Drive/data/{name}.json').read_bytes())


def read_pinned_tiles(regional_cache, west_cache, scrivener_file):
    sources, elements, motor_roads, motor_nodes = [], {}, [], set()
    profiles = load_map('road-profiles')['roads']
    for pack, folder in PACK_CACHES.items():
        data = load_map(pack)
        meta = data['meta']
        if pack == 'canberra':
            records = [{'file':name,'sha256':digest} for name,digest in meta['sourceHashes'].items()
                       if name.startswith('osm-tile-')]
        elif pack == 'giant-spray':
            raw_source = meta.get('source') or {}
            records = raw_source.get('files',[]) if isinstance(raw_source,dict) else []
            if not records:
                records = json.loads((regional_cache / folder / 'manifest.json').read_bytes())['files']
        else:
            records = meta.get('files') or meta['source']['files']
        base = west_cache if pack == 'north-west' else regional_cache / folder
        for pin in records:
            record = {key:pin[key] for key in ('file','url','sha256') if key in pin}
            read_tile(record, base / record['file'], elements)
            sources.append({**record, 'pack':pack})
        for road in data.get('roads', ()):
            tags = {**profiles.get(str(road['id']),{}), **road.get('sourceTags',{})}
            if tags.get('bridge') not in INVALID_DECK and road['type'] not in PATH_TYPES:
                motor_roads.append((road,tags))
            if tags.get('foot') not in RESTRICTED and tags.get('access') not in RESTRICTED and (
                tags.get('sidewalk') not in {'none','no'} and road['type'] not in {'motorway','motorway_link','service'}
            ):
                motor_nodes.update(road.get('nodes',()))
    read_tile(SCRIVENER, scrivener_file, elements)
    sources.append({**SCRIVENER,'pack':'scrivener'})
    return sources,elements,motor_roads,motor_nodes


def sidewalk_index(motor_roads):
    cells = {}
    for road,tags in motor_roads:
        pavement = 0 if road['type'] in {'motorway','motorway_link'} or tags.get('sidewalk') in {'no','none'} else (
            .75 if road['type'] == 'service' else 1.65)
        width = max(2.5,min(24,metres(tags.get('width'),road['width'])))
        for a,b in zip(road['points'],road['points'][1:]):
            dx,dz=b[0]-a[0],b[1]-a[1]
            length=hypot(dx,dz)
            if length == 0:
                continue
            radius=width/2+pavement
            deck=(a,dx,dz,length,radius,tags.get('layer') or '1')
            for ix in range(floor((min(a[0],b[0])-radius)/128),floor((max(a[0],b[0])+radius)/128)+1):
                for iz in range(floor((min(a[1],b[1])-radius)/128),floor((max(a[1],b[1])+radius)/128)+1):
                    cells.setdefault((ix,iz),[]).append(deck)
    return cells


def metres(value, fallback):
    try:
        return float(str(value).removesuffix(' m'))
    except ValueError:
        return fallback


def covered_by_motor_deck(points,tags,cells):
    if tags.get('bridge') == 'boardwalk':
        return False
    width = max(2.5,metres(tags.get('width'),3 if tags['highway']=='cycleway' else 2.5))
    for a,b in zip(points,points[1:]):
        dx,dz=b[0]-a[0],b[1]-a[1]
        length=hypot(dx,dz)
        if length == 0:
            continue
        steps=ceil(length/4)
        for step in range(steps+1):
            t=step/steps
            x,z=a[0]+dx*t,a[1]+dz*t
            for side in (-1,1):
                px,pz=x-side*dz/length*width/2,z+side*dx/length*width/2
                nearby=cells.get((floor(px/128),floor(pz/128)),())
                for c,ex,ez,span,radius,layer in nearby:
                    alignment=abs(dx*ex+dz*ez)/(length*span)
                    if alignment < .96 or layer != (tags.get('layer') or '1'):
                        continue
                    u=min(1,max(0,((px-c[0])*ex+(pz-c[1])*ez)/(span*span)))
                    if hypot(px-c[0]-u*ex,pz-c[1]-u*ez) <= radius:
                        break
                else:
                    return False
    return True


def build(west_cache, scrivener_file, regional_cache):
    sources,elements,motor_roads,motor_nodes=read_pinned_tiles(regional_cache,west_cache,scrivener_file)
    terrain = [load_map(name)['terrain'] for name in TERRAIN_PACKS]
    bounds = [(tile['minX'],tile['maxX'],tile['minZ'],tile['maxZ']) for tile in terrain]

    def in_terrain(p):
        return any(x0 <= p[0] <= x1 and z0 <= p[1] <= z1 for x0,x1,z0,z1 in bounds)

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

    path_segments, deck_ends, admitted = {}, {}, set()
    covered_nodes = {node for node,p in nodes.items() if in_terrain(p)}
    excluded = {'restricted or inactive':[],'incomplete geometry':[], 'off retained terrain':[],
                'already covered by an existing road deck':[]}
    cells = sidewalk_index(motor_roads)
    for ident,way in sorted(ways.items()):
        tags=way.get('tags',{})
        if tags.get('highway') not in PATH_TYPES|{'track','service'} or not tags.get('bridge') or tags['bridge']=='no':
            continue
        refs=way['nodes']
        if not public_path(tags) or tags['bridge'] in INVALID_DECK:
            if tags['highway'] in PATH_TYPES or tags['highway']=='track':
                excluded['restricted or inactive'].append(ident)
            continue
        if len(refs)<2 or not all(node in nodes for node in refs):
            excluded['incomplete geometry'].append(ident)
            continue
        if any(node not in covered_nodes for node in refs):
            excluded['off retained terrain'].append(ident)
            continue
        if covered_by_motor_deck([nodes[node] for node in refs],tags,cells):
            excluded['already covered by an existing road deck'].append(ident)
            continue
        admitted.add(ident)
        for endpoint in (refs[0], refs[-1]):
            deck_ends.setdefault(endpoint,set()).add(ident)
    # Source-only decks are still real structures. Label one-sided access
    # without drawing a connection where the data has none.
    partial = {}
    for ident in admitted:
        refs = ways[ident]['nodes']
        ends = (refs[0],refs[-1])
        absent = [node for node in set(ends) if node not in approaches and node not in motor_nodes and len(deck_ends[node])==1]
        if absent:
            partial[ident] = sorted(absent)
        path_segments[ident] = set(range(len(refs)-1))
    for endpoint, bridges in deck_ends.items():
        if not bridges:
            continue
        # Expand each contiguous approach along the same original node chain.
        # A short separate mapped ramp should not truncate access to the next way.
        queue = [(0,endpoint)]
        distances = {endpoint:0}
        while queue:
            travelled, node = heappop(queue)
            if travelled != distances[node]:
                continue
            for ident,index in approaches.get(node,()):
                refs = ways[ident]['nodes']
                for step in (-1,1):
                    next_index = index+step
                    if not (0 <= next_index < len(refs)):
                        continue
                    next_node = refs[next_index]
                    if next_node not in covered_nodes:
                        continue
                    path_segments.setdefault(ident,set()).add(min(index,next_index))
                    total = travelled + dist(nodes[node],nodes[next_node])
                    if total < APPROACH and total < distances.get(next_node,float('inf')):
                        distances[next_node] = total
                        heappush(queue,(total,next_node))

    def record(ident, first, last, path=False):
        way = ways[ident]
        tags = way['tags']
        width = 3 if tags['highway'] in {'cycleway','bridleway'} else 2.5
        if not path:
            width = 3.2 if tags.get('service')=='driveway' else 7.5
        refs = way['nodes'][first:last+1]
        selected = {k: v for k, v in tags.items() if k in ROAD_TAGS | {'bridge_number'}}
        highway = 'path' if path and tags['highway'] in {'track','service'} else tags['highway']
        return dict(id=f'west-bridge-{ident}-{first}', sourceId=f'way/{ident}', sourceVersion=way['version'],
                    name='' if path else tags.get('name', ''), type=highway, width=width,
                    oneway=-1 if tags.get('oneway')=='-1' else 1 if tags.get('oneway') in {'yes','1','true'} else 0,
                    **({'standalonePath': True} if path else {}),
                    sourceTags=selected, nodes=refs, points=[nodes[n] for n in refs])

    roads = [record(ident, *limits) for ident, limits in ROAD_SLICES.items()]
    for ident in DRIVEWAY_BRIDGES:
        way = ways[ident]
        tags = way['tags']
        if tags.get('access') in RESTRICTED or tags.get('service') != 'driveway' or tags.get('bridge') in INVALID_DECK:
            raise ValueError(f'Unexpected source driveway for way/{ident}')
        if not all(node in covered_nodes for node in way['nodes']):
            raise ValueError(f'Driveway bridge is off retained terrain: way/{ident}')
        roads.append(record(ident,0,len(way['nodes'])-1))
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
    return dict(meta=dict(origin=[149.137,-35.318], title='Canberra public bridge links',
                          source='OpenStreetMap contributors',license='ODbL-1.0',
                          attributionUrl='https://www.openstreetmap.org/copyright',files=sources,
                          pathCoverage=dict(bridges=len(admitted), partialApproaches={k:partial[k] for k in sorted(partial)},
                                            excluded={key:sorted(ids) for key,ids in excluded.items()})),
                bounds=dict(minX=min(p[0] for p in points)-20, maxX=max(p[0] for p in points)+20,
                            minZ=min(p[1] for p in points)-20, maxZ=max(p[1] for p in points)+20),
                roads=roads, buildings=[], areas=[])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--west-cache', type=Path, required=True)
    parser.add_argument('--scrivener-file', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--regional-cache', type=Path, required=True,
                        help='Directory containing the pinned regional source caches.')
    args = parser.parse_args()
    data = build(args.west_cache, args.scrivener_file, args.regional_cache)
    header = '// Generated by scripts/build_capital_west_bridge_links.py from SHA-pinned OSM tiles.\n'
    args.output.write_text(header+'export const WEST_BRIDGE_LINKS = '+json.dumps(data,separators=(',', ':'))+';\n')
    print(f'{len(data["roads"])} runs; {sum(len(r["points"])-1 for r in data["roads"])} source segments')


if __name__ == '__main__':
    main()

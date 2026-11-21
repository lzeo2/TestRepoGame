#!/usr/bin/env python3
"""Build the independent Civic/lake OSM overlay; raw API snapshots stay outside Git.

Requires curl and externally installed Shapely for the developer overlap audit.
--fetch obtains bounded map tiles and the complete lake multipolygon. Later builds
verify every pinned hash. No terrain is fabricated: terrainRequirements is a gate
for the integration owner. No Python package is needed by the game at runtime.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import math
from pathlib import Path
import subprocess
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
API = 'https://api.openstreetmap.org/api/0.6/'
WEST, SOUTH, EAST, NORTH = 149.103, -35.303, 149.157, -35.268
LON0, LAT0 = 149.137, -35.318
MX, MZ = 111320 * math.cos(math.radians(LAT0)), 111320
ALLOWED = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential',
           'unclassified', 'service', 'living_street', 'motorway_link', 'trunk_link',
           'primary_link', 'secondary_link', 'tertiary_link'}
ROAD_TAGS = {'highway', 'name', 'ref', 'oneway', 'junction', 'lanes', 'lanes:forward',
             'lanes:backward', 'width', 'maxspeed', 'access', 'vehicle', 'motor_vehicle',
             'motorcar', 'bus', 'psv', 'bicycle', 'foot', 'service', 'bridge', 'tunnel',
             'layer', 'covered', 'surface', 'sidewalk', 'sidewalk:both', 'sidewalk:left',
             'sidewalk:right'}
BUILDING_TAGS = {'building', 'building:levels', 'building:part', 'height', 'min_height',
                 'roof:levels', 'roof:height', 'name', 'layer', 'covered', 'level',
                 'shop', 'wikidata'}


def xy(node):
    return [round((node['lon'] - LON0) * MX, 2), round((LAT0 - node['lat']) * MZ, 2)]


def get(url, path):
    if not path.exists():
        partial = path.with_suffix('.part')
        subprocess.run(['curl', '-fsSL', '--retry', '1', '--max-time', '55', url,
                        '-o', str(partial)], check=True)
        assert isinstance(json.loads(partial.read_text())['elements'], list)
        partial.replace(path)
    return {'file': path.name, 'url': url,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def fetch(cache):
    cache.mkdir(parents=True, exist_ok=True)
    def tile(index):
        ix, iz = index
        west, east = WEST + (EAST - WEST) * ix / 4, WEST + (EAST - WEST) * (ix + 1) / 4
        south, north = SOUTH + (NORTH - SOUTH) * iz / 4, SOUTH + (NORTH - SOUTH) * (iz + 1) / 4
        url = API + 'map.json?' + urlencode({'bbox': f'{west},{south},{east},{north}'})
        result = get(url, cache / f'osm-map-{ix}-{iz}.json')
        print(result['file'], flush=True)
        return result
    with ThreadPoolExecutor(max_workers=2) as pool:
        files = list(pool.map(tile, [(x, z) for x in range(4) for z in range(4)]))
    files.append(get(API + 'relation/3400115/full.json', cache / 'lake-relation-3400115.json'))
    manifest = {'source': 'OpenStreetMap contributors', 'license': 'ODbL-1.0',
                'licenseUrl': 'https://opendatacommons.org/licenses/odbl/1-0/',
                'attributionUrl': 'https://www.openstreetmap.org/copyright', 'files': files}
    (cache / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')


def rings(relation, ways, role):
    """Join exact endpoint node IDs. An incomplete/open shoreline is an error."""
    remaining = [(m['ref'], list(ways[m['ref']]['nodes'])) for m in relation['members']
                 if m['type'] == 'way' and m.get('role', 'outer') == role]
    complete = []
    while remaining:
        ident, chain = remaining.pop(0)
        ids = [ident]
        while chain[0] != chain[-1]:
            for i, (part, nodes) in enumerate(remaining):
                if chain[-1] == nodes[0]:
                    chain.extend(nodes[1:])
                elif chain[-1] == nodes[-1]:
                    chain.extend(reversed(nodes[:-1]))
                elif chain[0] == nodes[-1]:
                    chain = nodes[:-1] + chain
                elif chain[0] == nodes[0]:
                    chain = list(reversed(nodes[1:])) + chain
                else:
                    continue
                remaining.pop(i)
                ids.append(part)
                break
            else:
                raise ValueError(f'Unclosed {role} ring in relation {relation["id"]}: {ids}')
        complete.append((chain, ids))
    return complete


def contains(ring, point):
    x, z = point
    inside = False
    for a, b in zip(ring, ring[1:]):
        if (a[1] > z) != (b[1] > z) and x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]:
            inside = not inside
    return inside


def overlap_metadata(buildings, base_path):
    """Pin source-paired suppression evidence without deleting any source geometry.

    ACT/base footprints retain priority in the small snapshot overlap. Elevated
    roof/connector parts remain separate source features. Polygon intersections,
    rather than centroids or generous distance radii, identify duplicate bodies.
    """
    from shapely.geometry import Polygon
    from shapely.strtree import STRtree
    raw = base_path.read_bytes()
    base = json.loads(raw)['buildings']
    base_ids = {building['id'] for building in base}
    def footprint(points):
        ring = [tuple(point) for point in points]
        if ring[0] == ring[-1]:
            ring.pop()
        first = min(range(len(ring)), key=lambda i: ring[i])
        ring = ring[first:] + ring[:first]
        return min(tuple(ring), tuple([ring[0]] + list(reversed(ring[1:]))))
    exact = {footprint(building['points']) for building in base}
    polygons = [Polygon(building['points']) for building in base]
    assert all(p.is_valid for p in polygons), 'Invalid base polygon needs explicit source review'
    tree = STRtree(polygons)
    suppressions, retained_parts = [], []
    new_count = 0
    for building in buildings:
        if building['id'] in base_ids or footprint(building['points']) in exact:
            continue
        new_count += 1
        polygon = Polygon(building['points'])
        assert polygon.is_valid, f'Invalid north polygon: {building["id"]}'
        pairs = []
        for index in tree.query(polygon, predicate='intersects'):
            other = polygons[index]
            intersection = polygon.intersection(other).area
            ratio = intersection / min(polygon.area, other.area)
            iou = intersection / (polygon.area + other.area - intersection)
            if ratio > .5 or iou > .35:
                pairs.append(dict(baseId=base[index]['id'], baseSource=base[index]['source'],
                                  baseAreaSquareMetres=round(other.area, 2),
                                  intersectionSquareMetres=round(intersection, 2),
                                  minAreaRatio=round(ratio, 5), iou=round(iou, 5)))
        if not pairs:
            continue
        tags = building['sourceTags']
        elevated = tags.get('building') == 'roof' or (tags.get('covered') == 'yes' and tags.get('level') not in {None, '0'})
        if elevated:
            retained_parts.append(dict(northId=building['id'], reason='Mapped roof or elevated connector part'))
            continue
        suppressions.append(dict(northId=building['id'], sourceId=building['sourceId'],
                                 northAreaSquareMetres=round(polygon.area, 2),
                                 pairs=sorted(pairs, key=lambda pair: pair['baseId'])))
    return dict(baseSha256=hashlib.sha256(raw).hexdigest(),
                method='Shapely polygon intersection of exact projected source outlines; base source has priority',
                rule='intersection/min(area)>0.5 OR intersection/union>0.35; paired base ID must be present at merge',
                newFootprintsBeforeSuppression=new_count, suppressions=suppressions,
                retainedSourceParts=retained_parts)


def build(cache, base_path):
    manifest = json.loads((cache / 'manifest.json').read_text())
    objects = {}
    for file in manifest['files']:
        raw = (cache / file['file']).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == file['sha256'], f'Changed source: {file["file"]}'
        for element in json.loads(raw)['elements']:
            key = (element['type'], element['id'])
            if element.get('version', 0) >= objects.get(key, {}).get('version', 0):
                objects[key] = element
    nodes = {ident: e for (kind, ident), e in objects.items() if kind == 'node'}
    ways = {ident: e for (kind, ident), e in objects.items() if kind == 'way'}
    roads, buildings, areas = [], [], []
    def within(node):
        return WEST <= node['lon'] <= EAST and SOUTH <= node['lat'] <= NORTH
    for ident, way in sorted(ways.items()):
        tags, refs = way.get('tags', {}), way['nodes']
        if not all(ref in nodes for ref in refs):
            continue
        if tags.get('highway') in ALLOWED:
            # Keep source segments touching the box, never connect clipped gaps.
            runs, run = [], []
            for i in range(len(refs) - 1):
                if within(nodes[refs[i]]) or within(nodes[refs[i + 1]]):
                    if not run:
                        run = [i]
                    run.append(i + 1)
                elif run:
                    runs.append(run)
                    run = []
            if run:
                runs.append(run)
            for indices in runs:
                try:
                    width = float(tags.get('width', '').replace(' m', ''))
                except ValueError:
                    try:
                        width = float(tags.get('lanes', 1 if tags['highway'] == 'service' else 2)) * 3.25 + 1
                    except ValueError:
                        width = 7.5
                try:
                    speed = int(tags.get('maxspeed', 50))
                except ValueError:
                    speed = 50
                oneway = -1 if tags.get('oneway') == '-1' else 1 if tags.get('oneway') in {'yes', '1', 'true'} or tags.get('junction') == 'roundabout' else 0
                roads.append(dict(id=f'{ident}-north-{indices[0]}', sourceId=f'way/{ident}',
                                  name=tags.get('name', ''), type=tags['highway'],
                                  width=round(max(2.5, min(24, width)), 1), speed=speed,
                                  oneway=oneway, roundabout=tags.get('junction') == 'roundabout',
                                  sourceTags={k: v for k, v in tags.items() if k in ROAD_TAGS},
                                  nodes=[refs[i] for i in indices],
                                  points=[xy(nodes[refs[i]]) for i in indices]))
        if tags.get('building') and refs[0] == refs[-1] and any(within(nodes[n]) for n in refs):
            try:
                height = float(tags['height'].replace(' m', '')) if 'height' in tags else float(tags.get('building:levels', 2)) * 3.2
            except ValueError:
                height = 6.4
            buildings.append(dict(id=f'osm-{ident}', sourceId=f'way/{ident}', source='osm',
                                  sourceTags={k: v for k, v in tags.items() if k in BUILDING_TAGS},
                                  name=tags.get('name', ''), type=tags['building'],
                                  height=max(2, min(120, height)),
                                  heightSource='OSM height' if 'height' in tags else 'OSM levels estimate' if 'building:levels' in tags else 'visual estimate',
                                  points=[xy(nodes[n]) for n in refs]))
    lake = objects[('relation', 3400115)]
    outer = [(refs, ids, [xy(nodes[n]) for n in refs]) for refs, ids in rings(lake, ways, 'outer')]
    inner = [(refs, ids, [xy(nodes[n]) for n in refs]) for refs, ids in rings(lake, ways, 'inner')]
    assigned = set()
    for i, (refs, ids, points) in enumerate(outer):
        holes = []
        for j, (hole_refs, hole_ids, hole) in enumerate(inner):
            if contains(points, hole[0]):
                holes.append(dict(points=hole, nodes=hole_refs, sourceWayIds=hole_ids))
                assigned.add(j)
        areas.append(dict(id=f'osm-relation-3400115-{i}', sourceId='relation/3400115',
                          sourceTags=lake['tags'], source='osm', name='Lake Burley Griffin',
                          type='water', points=points, nodes=refs, sourceWayIds=ids,
                          holes=[h['points'] for h in holes], innerRings=holes))
    assert len(assigned) == len(inner), 'Every island must belong to a lake outer ring'
    centre = [b for b in buildings if b['name'] == 'Canberra Centre']
    assert centre, 'Canberra Centre source footprint missing'
    # The anchor is a source footprint centroid, not an asserted entrance.
    points = max(centre, key=lambda b: len(b['points']))['points'][:-1]
    x, z = [round(sum(p[i] for p in points) / len(points), 2) for i in range(2)]
    landmark = dict(id='canberra-centre', name='Canberra Centre', x=x, z=z, radius=150,
                    description='Mapped Civic shopping-centre footprint; approach and interior are authored.',
                    sourceBuildingIds=[b['id'] for b in centre], source='OpenStreetMap contributors',
                    anchorType='source footprint vertex mean, not verified entrance')
    minx, minz = xy({'lon': WEST, 'lat': NORTH})
    maxx, maxz = xy({'lon': EAST, 'lat': SOUTH})
    return dict(meta=dict(title='Civic and Lake Burley Griffin source overlay',
                          projection='Local equirectangular metres; x east, z south', origin=[LON0, LAT0],
                          source=manifest, sourceExtent=[WEST, SOUTH, EAST, NORTH],
                          lakeRelation=3400115, lakeComplete=True,
                          buildingOverlap=overlap_metadata(buildings, base_path),
                          notes=['Full lake relation outer and inner rings use exact shared OSM node IDs.',
                                 'Road/access/bridge tags retained; these are not surveyed road deck heights.',
                                 'Building heights and destination approach require separate interpretation.']),
                bounds=dict(minX=minx, maxX=maxx, minZ=minz, maxZ=maxz), roads=roads,
                buildings=buildings, areas=areas, landmarks=[landmark],
                terrainRequirements=dict(status='required-before-north-runtime',
                    extent=[WEST, -35.352, 149.174, NORTH], verticalDatum='AHD', heightOffsetMetres=550,
                    source='ACT 2020 LiDAR-derived 2m contours',
                    sourceSha256='b8090f3ab023c2821747a760470eb8e53173c6d1b7a35dbb2a306885da7981b9',
                    method='Expand contour sampling with margin; finite triangulated grid; no clamped or nearest fill.',
                    bridges='Source bridge=yes/layer tags require deck profiles above lake; do not follow lake-bed terrain.'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--fetch', action='store_true')
    parser.add_argument('--base', type=Path, default=ROOT / 'Games/Capital Drive/data/canberra.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'Games/Capital Drive/data/canberra-north.json')
    args = parser.parse_args()
    if args.fetch:
        fetch(args.cache)
    overlay = build(args.cache, args.base)
    args.output.write_text(json.dumps(overlay, separators=(',', ':')) + '\n')
    print(json.dumps({key: len(overlay[key]) for key in ('roads', 'buildings', 'areas', 'landmarks')}))


if __name__ == '__main__':
    main()

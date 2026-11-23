#!/usr/bin/env python3
"""Rebuild regional streets and landmarks from pinned, external OSM caches."""

import argparse
import collections
import hashlib
import json
import math
from pathlib import Path

from build_capital_north import ALLOWED, BUILDING_TAGS, ROAD_TAGS, contains, rings, xy
from capital_region_landmarks import REGIONS

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'Games/Capital Drive/data'
GET_TAGS = ROAD_TAGS | {'maxspeed:forward', 'maxspeed:backward'}
MAX_BUILDINGS = 2100
CELL_SIZE = 250


def load_source(cache):
    manifest = json.loads((cache / 'manifest.json').read_text())
    elements = {}
    for record in manifest['files']:
        raw = (cache / record['file']).read_bytes()
        if hashlib.sha256(raw).hexdigest() != record['sha256']:
            raise ValueError(f'Changed source tile: {record["file"]}')
        for item in json.loads(raw)['elements']:
            key = f'{item["type"]}/{item["id"]}'
            if item.get('version', 0) >= elements.get(key, {}).get('version', 0):
                elements[key] = item
    return manifest, elements


def snapshot_history(paths):
    nodes, segments, edges, buildings, pins = {}, set(), set(), [], []
    for path in paths:
        raw = path.read_bytes()
        data = json.loads(raw)
        pins.append({'file': path.name, 'sha256': hashlib.sha256(raw).hexdigest()})
        buildings.extend(data.get('buildings', ()))
        for road in data['roads']:
            refs, points = road.get('nodes', ()), road['points']
            for ref, point in zip(refs, points):
                nodes.setdefault(ref, point)
            segments.update(tuple(sorted(pair)) for pair in zip(refs, refs[1:]))
            edges.update(tuple(sorted((tuple(a), tuple(b)))) for a, b in zip(points, points[1:]))
    return nodes, segments, edges, buildings, pins


def in_boxes(node, boxes, margin=0):
    return any(west-margin <= node['lon'] <= east+margin and south-margin <= node['lat'] <= north+margin
               for west, south, east, north in boxes)


def road_runs(region, boxes, ways, nodes, projected, history):
    _, used, edges, _, _ = history
    roads = []
    inside = {key for key, node in nodes.items() if in_boxes(node, boxes)}
    fringe = {key for key, node in nodes.items() if in_boxes(node, boxes, .004)}
    for way_id, way in sorted(ways.items()):
        tags, refs = way.get('tags', {}), way['nodes']
        road_type = tags.get('highway')
        if road_type not in ALLOWED or len(refs) < 2 or not all(ref in nodes for ref in refs):
            continue
        access = tags.get('motor_vehicle', tags.get('vehicle', tags.get('access')))
        if access in {'no', 'private'} or road_type == 'service' and tags.get('service') in {'driveway', 'parking_aisle', 'drive-through', 'emergency_access'}:
            continue
        runs, start = [], None
        for i, (a, b) in enumerate(zip(refs, refs[1:])):
            pair = tuple(sorted((a, b)))
            edge = tuple(sorted((tuple(projected[a]), tuple(projected[b]))))
            fresh = a != b and edge[0] != edge[1] and a in fringe and b in fringe and (a in inside or b in inside) and pair not in used and edge not in edges
            if fresh:
                used.add(pair)
                edges.add(edge)
                if start is None:
                    start = i
            elif start is not None:
                runs.append((start, i+1))
                start = None
        if start is not None:
            runs.append((start, len(refs)))
        if not runs:
            continue
        oneway = tags.get('oneway')
        roundabout = tags.get('junction') == 'roundabout'
        direction = -1 if oneway == '-1' else 1 if oneway in {'yes', '1', 'true'} or (roundabout or road_type == 'motorway') and oneway != 'no' else 0
        width = tagged_number(tags.get('width'))
        if not width:
            width = 3.25*(tagged_number(tags.get('lanes')) or (1 if road_type == 'service' else 2))+1
        speed = tagged_number(tags.get('maxspeed'))
        for first, last in runs:
            path = refs[first:last]
            roads.append(dict(id=f'{way_id}-{region}-{first}', sourceId=f'way/{way_id}',
                name=tags.get('name', ''), type=road_type, width=round(max(2.5, min(width, 24)), 1),
                oneway=direction, roundabout=roundabout,
                **({'speed': speed} if speed and 5 <= speed <= 130 else {}),
                sourceTags={k: v for k, v in tags.items() if k in GET_TAGS}, nodes=path,
                points=[projected[ref] for ref in path]))
    return roads


def tagged_number(value):
    try:
        number = float(str(value).strip().removesuffix(' m'))
        return number if math.isfinite(number) and number > 0 else None
    except ValueError:
        return None


def midpoint(points):
    if points[0] == points[-1] and len(points) > 1:
        points = points[:-1]
    return [sum(p[i] for p in points) / len(points) for i in (0, 1)]


def nearest_site(point, centres):
    return min((math.hypot(point[0]-x, point[1]-z) for x, z in centres), default=0)


def make_buildings(boxes, ways, nodes, centres, requested, earlier):
    from shapely.geometry import Polygon
    from shapely.strtree import STRtree

    prior = [Polygon(body['points']) for body in earlier]
    prior = [shape for shape in prior if shape.is_valid and shape.area > 0]
    index = STRtree(prior)
    earlier_by_source = {body.get('sourceId'): body['id'] for body in earlier}
    prior_ids = {body['id'] for body in earlier}
    promoted, zones, invalid = [], collections.defaultdict(list), 0
    for way_id, way in sorted(ways.items()):
        source = f'way/{way_id}'
        # An OSM building multipolygon can carry its tags on the parent only.
        tags = {**requested.get(source, {}), **way.get('tags', {})}
        refs = way['nodes']
        building = tags.get('building')
        if building in {None, 'no', 'roof', 'shed', 'garage', 'garages', 'carport'} or len(refs) < 4 or len(refs) > 450 or refs[0] != refs[-1] or not all(ref in nodes for ref in refs):
            continue
        if source in earlier_by_source or f'osm-{way_id}' in prior_ids:
            continue
        force = source in requested
        if not force and not any(in_boxes(nodes[ref], boxes) for ref in refs):
            continue
        points = [xy(nodes[ref]) for ref in refs]
        point = midpoint(points)
        shape = Polygon(points)
        if not shape.is_valid or shape.area < 20:
            invalid += 1
            continue
        if any(shape.intersection(prior[int(other)]).area > .5*min(shape.area, prior[int(other)].area)
               for other in index.query(shape, predicate='intersects')):
            continue
        height = tagged_number(tags.get('height'))
        levels = tagged_number(tags.get('building:levels'))
        height_source = 'OSM height tag' if height else 'OSM level estimate' if levels else 'Original massing estimate'
        height = height or (levels*3.2 if levels else (4 if building in {'house', 'detached', 'residential'} else 6.4))
        if height > 250:
            continue
        body = dict(id=f'osm-{way_id}', sourceId=source, source='osm', name=tags.get('name',''),
                    type=building, height=round(height, 2), heightSource=height_source, points=points,
                    sourceTags={k: v for k, v in tags.items() if k in BUILDING_TAGS})
        if force:
            promoted.append(body)
        else:
            distance = nearest_site(point, centres)
            cell = tuple(math.floor(coord/CELL_SIZE) for coord in point)
            # Keep centres filled before sparse suburbs. The quota also spreads
            # houses along the road network instead of filling a single block.
            priority = 0 if building in {'retail','commercial','apartments','school','hospital','public'} else 1
            zones[cell].append((priority, -shape.area, way_id, distance, body))
    for bucket in zones.values():
        bucket.sort(key=lambda row: row[:3])
    zone_order = sorted(zones.values(), key=lambda bucket: min(row[3] for row in bucket[:4]))
    chosen = list(promoted)
    for depth in range(8):
        for bucket in zone_order:
            if len(chosen) == MAX_BUILDINGS:
                break
            if depth < len(bucket):
                chosen.append(bucket[depth][-1])
    return sorted(chosen, key=lambda body: body['id']), invalid


def source_points(element, nodes, ways):
    if element['type'] == 'node':
        return [xy(element)]
    if element['type'] == 'way':
        return [xy(nodes[ref]) for ref in element['nodes']]
    # Non-spatial route/administrative relations are deliberately excluded.
    return [xy(nodes[ref]) for member in element['members'] if member['type'] == 'way' and member.get('role','') in {'outer',''}
            for ref in ways[member['ref']]['nodes']]


def water_areas(slug, name, source, elements, nodes, ways):
    feature = elements[source]
    if feature['type'] == 'relation':
        outer = rings(feature, ways, 'outer')
        inner = rings(feature, ways, 'inner')
    else:
        outer, inner = [(feature['nodes'], [feature['id']])], []
    holes = [(ids, [xy(nodes[ref]) for ref in chain]) for chain, ids in inner]
    source_height = tagged_number(feature.get('tags', {}).get('ele'))
    results = []
    for position, (chain, ids) in enumerate(outer):
        if chain[0] != chain[-1] or len(chain) < 4:
            raise ValueError(f'Unclosed regional water source {source}')
        points = [xy(nodes[ref]) for ref in chain]
        results.append(dict(id=f'{slug}-{position}', name=name, type='water', sourceId=source, points=points,
            sourceWayIds=[str(ident) for ident in ids],
            **({'surfaceY': round(source_height-550,2), 'surfaceSource':'OSM elevation tag'} if source_height else {}),
            innerRings=[dict(points=ring, sourceWayIds=[str(ident) for ident in refs]) for refs,ring in holes if contains(points, ring[0])]))
    if sum(len(area['innerRings']) for area in results) != len(holes):
        raise ValueError(f'Unexpected island ownership in {source}')
    return results


def build(region, cache, existing):
    spec = REGIONS[region]
    manifest, elements = load_source(cache)
    boxes = manifest['sourceBoxes']
    boxes = list(boxes.values()) if isinstance(boxes, dict) else boxes
    nodes = {item['id']: item for item in elements.values() if item['type']=='node'}
    ways = {item['id']: item for item in elements.values() if item['type']=='way'}
    history = snapshot_history(existing)
    projected = {key: history[0].get(key) or xy(node) for key, node in nodes.items()}
    roads = road_runs(region, boxes, ways, nodes, projected, history)
    requested = {ref: {k:v for k,v in elements[row[2]].get('tags',{}).items() if k in BUILDING_TAGS}
                 if row[2].startswith('relation/') else {} for row in spec['sites'] for ref in row[4]}
    sites = [(row, midpoint(source_points(elements[row[2]], nodes, ways))) for row in spec['sites']]
    buildings, invalid = make_buildings(boxes, ways, nodes, [point for _, point in sites], requested, history[3])
    building_ids = {body.get('sourceId'):body['id'] for body in history[3]+buildings}
    landmarks = []
    seen_names = set()
    named_nodes = [node for node in nodes.values() if node.get('tags',{}).get('name') in spec['places']]
    # OSM can tag the broad district and its town-centre suburb with the same
    # name. Use the local suburb marker when both are present.
    named_nodes.sort(key=lambda node: (node['tags'].get('place') != 'suburb', node['id']))
    for node in named_nodes:
        tags = node.get('tags', {})
        name = tags.get('name')
        if not tags.get('place') or name in seen_names or not in_boxes(node, boxes):
            continue
        seen_names.add(name)
        x, z = xy(node)
        landmarks.append(dict(id=f'{region}-place-{node["id"]}', name=name, x=x, z=z, radius=175,
                              sourceId=f'node/{node["id"]}', sourceTags={'place':tags['place']}))
    areas = []
    for (slug, name, source, design, refs), (x, z) in sites:
        parts = [building_ids[ref] for ref in refs if ref in building_ids]
        place = dict(id=slug, name=name, x=round(x,2), z=round(z,2), radius=130, sourceId=source,
                     sourceVersion=elements[source].get('version'), description=f'Mapped landmark in {spec["title"]}.')
        if design and parts:
            place.update(design=design, buildingId=parts[0], buildingIds=parts)
        landmarks.append(place)
        feature = elements[source]
        leisure = feature.get('tags',{}).get('leisure')
        if feature['type']=='way' and leisure in {'park','pitch'} and feature['nodes'][0]==feature['nodes'][-1]:
            areas.append(dict(id=f'{slug}-grounds',name=name,type=leisure,sourceId=source,
                              points=source_points(feature,nodes,ways)))
    for slug,name,source in spec['waters']:
        water = water_areas(slug,name,source,elements,nodes,ways)
        areas.extend(water)
        x,z = midpoint(water[0]['points'])
        landmarks.append(dict(id=slug,name=name,x=round(x,2),z=round(z,2),radius=230,sourceId=source,
                              description=f'Mapped lake in {spec["title"]}.'))
    points = [p for road in roads for p in road['points']]+[p for area in areas+buildings for p in area['points']]
    points += [[place['x'],place['z']] for place in landmarks]
    if not roads or not landmarks:
        raise ValueError(f'{region} source has no roads or landmarks')
    xs, zs = zip(*points)
    bounds=dict(minX=math.floor(min(xs)-32),maxX=math.ceil(max(xs)+32),minZ=math.floor(min(zs)-32),maxZ=math.ceil(max(zs)+32))
    meta = dict(origin=[149.137,-35.318],regionId=region,title=spec['title'],source=manifest['source'],
                license=manifest['license'],licenseUrl=manifest['licenseUrl'],attributionUrl=manifest['attributionUrl'],
                snapshotDate=manifest['snapshotDate'],sourceBoxes=boxes,
                files=[{key: record[key] for key in ('file','url','sha256')} for record in manifest['files']],
                priorSnapshots=history[4],invalidFootprintsSkipped=invalid,buildingLimit=MAX_BUILDINGS)
    return dict(meta=meta,bounds=bounds,roads=roads,buildings=buildings,areas=areas,landmarks=sorted(landmarks,key=lambda place:place['id']))


def attach_terrain(result, filename):
    import statistics

    raw = filename.read_bytes()
    tile = json.loads(raw)['terrain']
    bounds = result['bounds']
    dx = (tile['maxX']-tile['minX'])/(tile['cols']-1)
    dz = (tile['maxZ']-tile['minZ'])/(tile['rows']-1)
    x0 = math.floor((bounds['minX']-tile['minX'])/dx)
    z0 = math.floor((bounds['minZ']-tile['minZ'])/dz)
    x1 = math.ceil((bounds['maxX']-tile['minX'])/dx)
    z1 = math.ceil((bounds['maxZ']-tile['minZ'])/dz)
    if not (0 <= x0 < x1 < tile['cols'] and 0 <= z0 < z1 < tile['rows']):
        raise ValueError('Regional streets extend beyond validated contour grid')
    samples = tile['heights']
    def elevation(point):
        sx = (point[0]-tile['minX']) / dx
        sz = (point[1]-tile['minZ']) / dz
        x, z = math.floor(sx), math.floor(sz)
        fx, fz = sx-x, sz-z
        a, b = z*tile['cols']+x, (z+1)*tile['cols']+x
        return (samples[a]*(1-fx)+samples[a+1]*fx)*(1-fz)+(samples[b]*(1-fx)+samples[b+1]*fx)*fz
    for area in result['areas']:
        if area['type']=='water' and 'surfaceY' not in area:
            area['surfaceY'] = round(statistics.median(elevation(point) for point in area['points'][:-1]), 2)
            area['surfaceSource'] = 'Median shore level estimated from ACT contours'
    result['terrain'] = dict(tile, cols=x1-x0+1, rows=z1-z0+1,
        minX=tile['minX']+x0*dx,maxX=tile['minX']+x1*dx,minZ=tile['minZ']+z0*dz,maxZ=tile['minZ']+z1*dz,
        heights=[value for z in range(z0,z1+1) for value in samples[z*tile['cols']+x0:z*tile['cols']+x1+1]],
        gridSha256=hashlib.sha256(raw).hexdigest())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--region', required=True, choices=REGIONS)
    parser.add_argument('--source-cache', required=True, type=Path)
    parser.add_argument('--earlier-region', action='append', type=Path, default=[])
    parser.add_argument('--terrain-grid', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    base = [DATA/file for file in ('canberra.json','canberra-north.json','airport.json','north-west.json','giant-spray.json')]
    result = build(args.region,args.source_cache,base+args.earlier_region)
    attach_terrain(result,args.terrain_grid)
    args.output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
    print(args.region, {key:len(result[key]) for key in ('roads','buildings','areas','landmarks')}, result['bounds'])


if __name__ == '__main__':
    main()

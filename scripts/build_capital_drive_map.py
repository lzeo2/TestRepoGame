#!/usr/bin/env python3
"""Rebuild the local Canberra snapshot from OSM, ACT footprints and terrain tiles.

Developer-only network import. The game itself reads only the resulting local JSON.
Keep raw downloads outside the checkout. Requires Pillow and Shapely.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import gzip
import json
import math
from pathlib import Path
import subprocess
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
SOUTH, WEST, NORTH, EAST = -35.352, 149.103, -35.298, 149.174
LAT0, LON0 = -35.318, 149.137
MX, MZ = 111320 * math.cos(math.radians(LAT0)), 111320
ACT = 'https://services1.arcgis.com/E5n4f1VY84i0xSjy/ArcGIS/rest/services/ACTGOV_BUILDING_FOOTPRINTS/FeatureServer/0/query'
MICROSOFT_TILE = 'https://minedbuildings.z5.web.core.windows.net/global-buildings/2026-02-03/global-buildings.geojsonl/RegionName=Australia/quadkey=311230302/part-00130-4feead82-d499-422b-94cb-c036c212127a.c000.csv.gz'
ACT_CONTOURS = 'https://actmapi-open-data.s3.amazonaws.com/DataDownload/GIS/Contours/2020/Contour_2m.gdb.zip'


def xy(lon, lat):
    return [round((lon - LON0) * MX, 2), round((LAT0 - lat) * MZ, 2)]


def download(url, path):
    if not path.exists():
        subprocess.run(['curl', '-fsSL', '--retry', '1', '--max-time', '100', url, '-o', str(path)], check=True)
    return path


def prepare_details(cache):
    """Import additional actual outlines and a terrain model from 2020 LiDAR contours.

    Requires NumPy, Shapely, SciPy, Pyogrio/OpenFileGDB and Pyproj for this optional
    developer import. None are browser dependencies. Keep their installation external.
    """
    import numpy as np
    import shapely
    from pyogrio.raw import read
    from pyproj import Transformer
    from scipy.interpolate import LinearNDInterpolator
    raw = download(MICROSOFT_TILE, cache / 'ms-311230302.geojsonl.gz')
    features = []
    with gzip.open(raw, 'rt') as stream:
        for index, line in enumerate(stream):
            if not line.strip():
                continue
            feature = json.loads(line)
            ring = feature['geometry']['coordinates'][0]
            if any(WEST <= p[0] <= EAST and SOUTH <= p[1] <= NORTH for p in ring):
                feature['id'] = f'ms-311230302-{index}'
                features.append(feature)
    (cache / 'microsoft-buildings.json').write_text(json.dumps(dict(type='FeatureCollection', features=features), separators=(',', ':')))
    raw = download(ACT_CONTOURS, cache / 'Contour_2m.gdb.zip')
    transform = Transformer.from_crs(4326, 7855, always_xy=True)
    x0, y0 = transform.transform(WEST, SOUTH)
    x1, y1 = transform.transform(EAST, NORTH)
    _, _, wkbs, values = read('/vsizip/' + str(raw.resolve()), bbox=(x0 - 300, y0 - 300, x1 + 300, y1 + 300), columns=['ELEVATION'])
    points, heights, eligible = [], [], []
    for wkb, height in zip(wkbs, values[0]):
        geom = shapely.from_wkb(wkb)
        for line in geom.geoms if geom.geom_type == 'MultiLineString' else [geom]:
            for distance in np.arange(0, line.length, 10):
                p = line.interpolate(distance)
                if x0 - 350 <= p.x <= x1 + 350 and y0 - 350 <= p.y <= y1 + 350:
                    points.append((p.x, p.y))
                    heights.append(float(height))
                    # Hold out interior samples of long lines; retain small hilltop rings.
                    eligible.append(line.length > 100 and 20 <= distance <= line.length - 20)
    points, heights = np.asarray(points), np.asarray(heights)
    _, indices = np.unique(np.round(points, 2), axis=0, return_index=True)
    points, heights = points[indices], heights[indices]
    held_out = (np.arange(len(points)) % 11 == 0) & np.asarray(eligible)[indices]
    test_model = LinearNDInterpolator(points[~held_out], heights[~held_out])
    predicted = test_model(points[held_out])
    finite = np.isfinite(predicted)
    residual = np.abs(predicted[finite] - heights[held_out][finite])
    cols = rows = 513
    lon, lat = np.meshgrid(np.linspace(WEST, EAST, cols), np.linspace(NORTH, SOUTH, rows))
    x, y = transform.transform(lon, lat)
    # The final terrain includes every source sample; validation never removes peaks.
    grid = LinearNDInterpolator(points, heights)(x, y)
    assert np.isfinite(grid).all(), 'Contour convex hull does not cover map; do not fabricate missing terrain.'
    assert 500 < float(grid.min()) < float(grid.max()) < 1000, 'Implausible Canberra elevation range.'
    result = dict(cols=cols, rows=rows, heights=np.round(grid.ravel() - 550, 2).tolist(),
                  source='ACT 2020 LiDAR-derived 2m contours; linear Delaunay interpolation',
                  nativeContourIntervalMetres=2, verticalDatum='AHD', pointSpacingMetres=10,
                  validation=dict(features=len(wkbs), trainingPoints=len(points), heldOutPoints=int(finite.sum()),
                                  heldOutMedianAbsoluteMetres=float(np.median(residual)),
                                  heldOutP95AbsoluteMetres=float(np.percentile(residual, 95)),
                                  heldOutMaxAbsoluteMetres=float(residual.max()), nearestFillCells=0),
                  extent=[WEST, SOUTH, EAST, NORTH])
    (cache / 'act-contour-grid.json').write_text(json.dumps(result, separators=(',', ':')))
    print(f'Details: {len(features)} Microsoft candidates; {len(points)} contour samples; {cols}x{rows} terrain; held-out p95={np.percentile(residual, 95):.2f}m')


def fetch(cache):
    cache.mkdir(parents=True, exist_ok=True)
    # Small official map-API tiles avoid the public Overpass service's query queue.
    if not (cache / 'osm.json').exists():
        tiles = [(ix, iz) for ix in range(3) for iz in range(3)]
        def osm_bbox(west, south, east, north, name, depth=0):
            path = cache / f'osm-tile-{name}.json'
            if path.exists():
                return [path]
            partial = path.with_suffix('.part')
            url = 'https://api.openstreetmap.org/api/0.6/map.json?' + urlencode({'bbox': f'{west},{south},{east},{north}'})
            response = subprocess.run(['curl', '-sSL', '--retry', '1', '--max-time', '100',
                                       '-w', '%{http_code}', url, '-o', str(partial)],
                                      capture_output=True, text=True)
            if response.returncode == 0 and response.stdout == '200':
                # Validate before admitting a cached response to subsequent builds.
                assert isinstance(json.loads(partial.read_text())['elements'], list)
                partial.replace(path)
                print(f'OSM {name}: downloaded', flush=True)
                return [path]
            detail = partial.read_text(errors='replace')[:300] if partial.exists() else response.stderr[:300]
            partial.unlink(missing_ok=True)
            if response.stdout == '400' and 'too many nodes' in detail.lower() and depth < 3:
                midx, midy = (west + east) / 2, (south + north) / 2
                print(f'OSM {name}: subdividing API node limit', flush=True)
                files = []
                for i, box in enumerate(((west, south, midx, midy), (midx, south, east, midy),
                                         (west, midy, midx, north), (midx, midy, east, north))):
                    files.extend(osm_bbox(*box, f'{name}-{i}', depth + 1))
                return files
            raise RuntimeError(f'OSM tile {name}: HTTP {response.stdout}, curl {response.returncode}: {detail}')

        def osm_tile(tile):
            ix, iz = tile
            west, east = WEST + (EAST - WEST) * ix / 3, WEST + (EAST - WEST) * (ix + 1) / 3
            south, north = SOUTH + (NORTH - SOUTH) * iz / 3, SOUTH + (NORTH - SOUTH) * (iz + 1) / 3
            return osm_bbox(west, south, east, north, f'{ix}-{iz}')
        with ThreadPoolExecutor(max_workers=2) as pool:
            files = [file for group in pool.map(osm_tile, tiles) for file in group]
        objects = {}
        for file in files:
            for item in json.loads(file.read_text())['elements']:
                objects[(item['type'], item['id'])] = item
        nodes = {ident: item for (kind, ident), item in objects.items() if kind == 'node'}
        ways = []
        for (kind, ident), item in objects.items():
            if kind != 'way' or not all(n in nodes for n in item.get('nodes', [])):
                continue
            item['geometry'] = [{'lon': nodes[n]['lon'], 'lat': nodes[n]['lat']} for n in item['nodes']]
            # Only retain runs in the selected district; do not invent links across clipped gaps.
            if 'highway' in item.get('tags', {}):
                run = []
                for index, point in enumerate(item['geometry']):
                    if WEST <= point['lon'] <= EAST and SOUTH <= point['lat'] <= NORTH:
                        run.append(index)
                    elif run:
                        if len(run) > 1:
                            ways.append(dict(item, id=f'{ident}-{run[0]}', geometry=[item['geometry'][i] for i in run], nodes=[item['nodes'][i] for i in run]))
                        run = []
                if len(run) > 1:
                    ways.append(dict(item, id=f'{ident}-{run[0]}', geometry=[item['geometry'][i] for i in run], nodes=[item['nodes'][i] for i in run]))
            elif all(WEST - .002 <= p['lon'] <= EAST + .002 and SOUTH - .002 <= p['lat'] <= NORTH + .002 for p in item['geometry']):
                ways.append(item)
        (cache / 'osm.json').write_text(json.dumps({'elements': ways, 'generator': 'OpenStreetMap v0.6 map API, adaptive 3x3 tile snapshot',
                                                  'sourceFiles': [p.name for p in files], 'sourceElements': len(objects)}))
    common = dict(f='geojson', where='1=1', geometry=f'{WEST},{SOUTH},{EAST},{NORTH}',
                  geometryType='esriGeometryEnvelope', inSR=4326, outSR=4326,
                  spatialRel='esriSpatialRelIntersects', outFields='OBJECTID,BUILDING_TYPE,USE_DESCRIPTION,DIVISION',
                  resultRecordCount=1000, orderByFields='OBJECTID ASC')
    def page(offset):
        return download(ACT + '?' + urlencode(dict(common, resultOffset=offset)), cache / f'act-buildings-{offset}.json')
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(page, range(0, 5000, 1000)))
    zoom = 13
    def tile(lon, lat):
        return ((lon + 180) / 360 * 2**zoom,
                (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2**zoom)
    x0, y0 = tile(WEST, NORTH)
    x1, y1 = tile(EAST, SOUTH)
    tiles = [(x, y) for x in range(int(x0), int(x1) + 1) for y in range(int(y0), int(y1) + 1)]
    def terrain_tile(t):
        x, y = t
        return download(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{zoom}/{x}/{y}.png', cache / f'terrain-{zoom}-{x}-{y}.png')
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(terrain_tile, tiles))


def build(cache):
    from PIL import Image
    source = json.loads((cache / 'osm.json').read_text())
    elements = source['elements']
    roads, buildings, areas = [], [], []
    allowed = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'service', 'living_street',
               'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'}
    for e in elements:
        tags = e.get('tags', {})
        geometry = e.get('geometry', [])
        if not geometry or any(p is None for p in geometry):
            continue
        points = [xy(p['lon'], p['lat']) for p in geometry]
        kind = tags.get('highway')
        if kind in allowed and len(points) >= 2 and tags.get('access') != 'no':
            major = kind in {'primary', 'secondary', 'trunk'}
            oneway = -1 if tags.get('oneway') == '-1' else 1 if tags.get('oneway') in {'yes', '1'} or tags.get('junction') == 'roundabout' else 0
            try:
                width = float(tags.get('width', '').replace(' m', ''))
            except ValueError:
                try:
                    lanes = int(tags.get('lanes', 2 if kind != 'service' else 1))
                except ValueError:
                    lanes = 2
                width = lanes * 3.25 + (1.5 if major else 1)
            try:
                speed = int(tags.get('maxspeed', 60 if major else 40 if kind == 'service' else 50))
            except ValueError:
                speed = 50
            roads.append(dict(id=str(e['id']), name=tags.get('name', ''), type=kind,
                              width=round(max(4.5, min(width, 18)), 1), speed=speed,
                              oneway=oneway, points=points, nodes=e.get('nodes', []),
                              roundabout=tags.get('junction') == 'roundabout'))
        area_type = tags.get('natural') or tags.get('leisure') or tags.get('landuse')
        if area_type in {'water', 'wood', 'scrub', 'grassland', 'park', 'pitch', 'golf_course', 'nature_reserve', 'forest', 'recreation_ground', 'grass', 'meadow'} and len(points) > 3:
            areas.append(dict(id=str(e['id']), name=tags.get('name', ''), type=area_type, points=points))
    seen = set()
    for file in sorted(cache.glob('act-buildings-*.json')):
        for f in json.loads(file.read_text()).get('features', []):
            props = f['properties']
            oid = props['OBJECTID']
            if oid in seen:
                continue
            seen.add(oid)
            geom = f.get('geometry') or {}
            polygons = geom.get('coordinates', [])
            if geom.get('type') == 'Polygon':
                polygons = [polygons]
            for part, poly in enumerate(polygons):
                if not poly:
                    continue
                points = [xy(*p[:2]) for p in poly[0]]
                # ACT footprints do not carry heights. These heights are explicit visual estimates.
                area = abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(points, points[1:]))) / 2
                kind = str(props.get('BUILDING_TYPE') or props.get('USE_DESCRIPTION') or 'building').lower()
                height = 3.8 if area < 350 else 6.5 if area < 1500 else 10
                buildings.append(dict(id=f'act-{oid}-{part}', points=points, height=height,
                                      type=kind, suburb=props.get('DIVISION', '')))
    # Compare actual polygon overlap, not centre proximity: two adjacent houses or
    # detached garages can legitimately have centres less than fifteen metres apart.
    from shapely.geometry import Polygon
    polygon_index, indexed = {}, []
    overlap_rejected = dict(osm=0, microsoft=0)
    def cells(poly):
        x0, z0, x1, z1 = poly.bounds
        return [(x, z) for x in range(math.floor(x0 / 50), math.floor(x1 / 50) + 1)
                for z in range(math.floor(z0 / 50), math.floor(z1 / 50) + 1)]

    def admit_footprint(building, layer, check=True):
        building['source'] = layer
        poly = Polygon(building['points'])
        if not poly.is_valid or poly.area < 4:
            return False
        keys = cells(poly)
        if check:
            nearby = {i for key in keys for i in polygon_index.get(key, [])}
            for i in nearby:
                other = indexed[i]
                overlap = poly.intersection(other).area
                if overlap / min(poly.area, other.area) > .35:
                    overlap_rejected[layer] += 1
                    return False
        for key in keys:
            polygon_index.setdefault(key, []).append(len(indexed))
        indexed.append(poly)
        return True

    for building in buildings:
        admit_footprint(building, 'act', check=False)
    for e in elements:
        tags = e.get('tags', {})
        if 'building' not in tags or not e.get('geometry'):
            continue
        pts = [xy(p['lon'], p['lat']) for p in e['geometry'] if p]
        if len(pts) < 4:
            continue
        try:
            height = float(tags.get('height', float(tags.get('building:levels', 1)) * 3.2))
        except ValueError:
            height = 4
        if not math.isfinite(height) or height <= 0:
            height = 4
        building = dict(id='osm-' + str(e['id']), name=tags.get('name', ''), points=pts,
                        height=min(45, height), type=tags['building'])
        if admit_footprint(building, 'osm'):
            buildings.append(building)
    microsoft_file = cache / 'microsoft-buildings.json'
    microsoft_candidates = 0
    if microsoft_file.exists():
        for feature in json.loads(microsoft_file.read_text())['features']:
            microsoft_candidates += 1
            pts = [xy(*p[:2]) for p in feature['geometry']['coordinates'][0]]
            estimate = feature.get('properties', {}).get('height', -1)
            height = estimate if isinstance(estimate, (int, float)) and 0 < estimate < 100 else 4
            building = dict(id=feature['id'], points=pts, height=round(height, 2), type='building',
                            heightSource='satellite-derived estimate' if height == estimate else 'visual estimate')
            if admit_footprint(building, 'microsoft'):
                buildings.append(building)
    minx, minz = xy(WEST, NORTH)
    maxx, maxz = xy(EAST, SOUTH)
    zoom, cols, rows = 13, 129, 129
    images = {}
    heights = []
    for iz in range(rows):
        lat = NORTH + (SOUTH - NORTH) * iz / (rows - 1)
        for ix in range(cols):
            lon = WEST + (EAST - WEST) * ix / (cols - 1)
            tx = (lon + 180) / 360 * 2**zoom
            ty = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2**zoom
            key = (int(tx), int(ty))
            if key not in images:
                images[key] = Image.open(cache / f'terrain-{zoom}-{key[0]}-{key[1]}.png').convert('RGB')
            r, g, b = images[key].getpixel((min(255, int((tx % 1) * 256)), min(255, int((ty % 1) * 256))))
            heights.append(round(r * 256 + g + b / 256 - 32768 - 550, 2))
    terrain_details = {}
    contour_file = cache / 'act-contour-grid.json'
    if contour_file.exists():
        terrain_details = json.loads(contour_file.read_text())
        assert terrain_details['extent'] == [WEST, SOUTH, EAST, NORTH], 'Contour import extent changed.'
        cols, rows, heights = terrain_details['cols'], terrain_details['rows'], terrain_details['heights']
        assert len(heights) == cols * rows and all(math.isfinite(h) for h in heights)
    def landmark(ident, name, lon, lat, radius, description):
        x, z = xy(lon, lat)
        return dict(id=ident, name=name, x=x, z=z, radius=radius, description=description, lat=lat, lon=lon)
    landmarks = [
        landmark('telopea', 'Telopea Park School', 149.13438, -35.31417, 125, 'Heritage school and the leafy Telopea Park streets.'),
        landmark('manuka', 'Manuka shops', 149.1336, -35.32025, 120, 'Franklin Street, Bougainville Street and the Manuka shopping streets.'),
        landmark('kingston', 'Kingston shops', 149.14125, -35.3159, 110, 'Green Square, Giles Street and the Kingston village blocks.'),
        # OSM node 102279215 on Eastlake Parade; keep the destination reachable by road.
        landmark('foreshore', 'Kingston Foreshore', 149.1436164, -35.3105565, 150, 'Eastlake Parade and the lakeside apartment precinct.'),
        landmark('redhill', 'Red Hill', 149.1304, -35.3373, 180, 'Leafy residential streets below the Red Hill reserve.'),
        landmark('griffith', 'Griffith shops', 149.1412, -35.3277, 100, 'Barker Street and Griffith neighbourhood shops.'),
        landmark('narrabundah', 'Narrabundah', 149.1541, -35.3325, 130, 'Neighbourhood streets around Iluka Street and Boolimba Crescent.'),
    ]
    # Start on a real named road beside Telopea, facing along that road on its left lane.
    candidates = [r for r in roads if r['name'] in {'New South Wales Crescent', 'Telopea Park', 'Telopea Park East', 'Telopea Park West'}]
    anchor = landmarks[0]
    choices = []
    for road in candidates or roads:
        for a, b in zip(road['points'], road['points'][1:]):
            dx, dz = b[0] - a[0], b[1] - a[1]
            length = math.hypot(dx, dz)
            if length < 12:
                continue
            x, z = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            choices.append((math.hypot(x - anchor['x'], z - anchor['z']), x + dz / length * 2, z - dx / length * 2, math.atan2(-dx, -dz)))
    _, x, z, yaw = min(choices)
    inputs = {cache / 'osm.json', cache / 'act-item.json', cache / 'terrain-attribution.md', cache / 'terrain-sources.md'}
    inputs.update(cache / name for name in source.get('sourceFiles', []))
    inputs.update(cache.glob('act-buildings-*.json'))
    inputs.update(cache.glob('terrain-*.png'))
    inputs.update(p for p in (microsoft_file, cache / 'ms-311230302.geojsonl.gz', cache / 'ms-links-old.txt',
                              cache / 'ms-license.txt', cache / 'microsoft-readme.txt') if p.exists())
    inputs.update(p for p in (contour_file, cache / 'Contour_2m.gdb.zip', cache / 'act-tiles-item.txt', cache / 'cdla-permissive-2.txt') if p.exists())
    snapshot_date = datetime.fromtimestamp((cache / 'osm.json').stat().st_mtime, timezone.utc).date().isoformat()
    result = dict(meta=dict(title='Capital Drive', date=snapshot_date,
                            projection='Local equirectangular metres; x east, z south', origin=[LON0, LAT0],
                            sourceHashes={p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(inputs) if p.is_file()},
                            sourceCounts=dict(osmObjects=source.get('sourceElements'), osmTiles=len(source.get('sourceFiles', [])),
                                              actFeatures=len(seen), actPolygonParts=sum(b['id'].startswith('act-') for b in buildings),
                                              microsoftCandidates=microsoft_candidates,
                                              buildingSources={kind: sum(b.get('source') == kind for b in buildings) for kind in ['act', 'osm', 'microsoft']},
                                              overlappingCandidatesRejected=overlap_rejected),
                            heightNote=('Terrain interpolated from actual ACT 2020 LiDAR-derived 2m AHD contours, not a native 1m DEM. ' if terrain_details else 'Sampled Mapzen terrain. ') + 'Building heights and facade details are estimates.'),
                  bounds=dict(minX=minx, maxX=maxx, minZ=minz, maxZ=maxz),
                  roads=roads, buildings=buildings, areas=areas, landmarks=landmarks,
                  terrain=dict(cols=cols, rows=rows, minX=minx, maxX=maxx, minZ=minz, maxZ=maxz, heights=heights,
                               **{k: v for k, v in terrain_details.items() if k not in {'cols', 'rows', 'heights', 'extent'}}),
                  spawn=dict(x=round(x, 2), z=round(z, 2), yaw=round(yaw, 5)))
    assert roads and buildings and len(heights) == cols * rows
    target = ROOT / 'Games/Capital Drive/data/canberra.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, separators=(',', ':')) + '\n')
    print(f'{len(roads)} OSM roads; {len(buildings)} footprints; {len(areas)} green/water areas; terrain {min(heights):.1f}..{max(heights):.1f}m relative to 550m datum; {target.stat().st_size:,} bytes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--fetch', action='store_true')
    parser.add_argument('--fetch-details', action='store_true', help='Import Microsoft outlines and ACT 2020 2m contours; external geodata libraries required.')
    args = parser.parse_args()
    if args.fetch:
        fetch(args.cache)
    if args.fetch_details:
        prepare_details(args.cache)
    build(args.cache)

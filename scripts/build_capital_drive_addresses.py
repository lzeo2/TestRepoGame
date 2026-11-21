#!/usr/bin/env python3
"""Extract explicit OSM addresses from the map import's external raw cache.

No network or third-party Python packages. Run build_capital_drive_map.py --fetch
first to obtain that cache; keep raw source objects outside the repository.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

WEST, SOUTH, EAST, NORTH = 149.103, -35.352, 149.174, -35.298
LON0, LAT0 = 149.137, -35.318
MX, MZ = 111320 * math.cos(math.radians(LAT0)), 111320
ROOT = Path(__file__).resolve().parents[1]


def location(element, nodes):
    if element['type'] == 'node':
        return element.get('lon'), element.get('lat')
    if element['type'] != 'way':
        return None
    ring = [nodes.get(ident) for ident in element.get('nodes', [])]
    if not ring or any(p is None for p in ring):
        return None
    points = [(p['lon'], p['lat']) for p in ring]
    # Work relative to the first vertex to avoid cancellation in tiny polygons.
    ox, oy = points[0]
    local = [(x - ox, y - oy) for x, y in points]
    if len(local) >= 4 and points[0] == points[-1]:
        area = cx = cy = 0
        for (x, y), (u, v) in zip(local, local[1:]):
            cross = x * v - u * y
            area += cross
            cx += (x + u) * cross
            cy += (y + v) * cross
        if abs(area) > 1e-15:
            return ox + cx / (3 * area), oy + cy / (3 * area)
    if points[0] == points[-1]:
        points.pop()
    return sum(p[0] for p in points) / len(points), sum(p[1] for p in points) / len(points)


def build(cache, date):
    index = json.loads((cache / 'osm.json').read_text())
    filenames = sorted(index['sourceFiles'])
    objects, hashes = {}, {}
    for name in filenames:
        if Path(name).name != name:
            raise ValueError('Source filenames must stay inside the external cache')
        raw = (cache / name).read_bytes()
        hashes[name] = hashlib.sha256(raw).hexdigest()
        for element in json.loads(raw)['elements']:
            objects[(element['type'], element['id'])] = element
    nodes = {ident: value for (kind, ident), value in objects.items() if kind == 'node'}
    addresses, skipped = [], 0
    for (_, ident), element in sorted(objects.items()):
        tags = element.get('tags', {})
        number, street = tags.get('addr:housenumber', '').strip(), tags.get('addr:street', '').strip()
        if not number or not street or tags.get('addr:interpolation'):
            continue
        point = location(element, nodes)
        if not point:
            skipped += 1
            continue
        lon, lat = point
        if not (WEST <= lon <= EAST and SOUTH <= lat <= NORTH):
            continue
        suburb = tags.get('addr:suburb', '').strip()
        label = f'{number} {street}' + (f', {suburb}' if suburb else '')
        addresses.append(dict(id=f"osm:{element['type']}:{ident}", label=label, street=street,
                              number=number, suburb=suburb, x=round((lon - LON0) * MX, 2),
                              z=round((LAT0 - lat) * MZ, 2), lat=round(lat, 7), lon=round(lon, 7)))
    return dict(meta=dict(date=date, source='OpenStreetMap contributors', license='ODbL-1.0',
                         sourceURL='https://api.openstreetmap.org/api/0.6/map.json',
                         licenseURL='https://www.openstreetmap.org/copyright', sourceHashes=hashes,
                         bounds=[WEST, SOUTH, EAST, NORTH], origin=[LON0, LAT0],
                         projection='Local equirectangular metres; x east, z south',
                         location='Tagged nodes or approximate tagged-way centroid; not entrances or surveyed address points',
                         skippedUnsupported=skipped, count=len(addresses)), addresses=addresses)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--date', default='2026-11-13', help='Snapshot extraction date (YYYY-MM-DD)')
    parser.add_argument('--output', type=Path, default=ROOT / 'Games/Capital Drive/data/addresses.json')
    args = parser.parse_args()
    payload = build(args.cache, args.date)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f"PASS {payload['meta']['count']} explicit OSM addresses; {payload['meta']['skippedUnsupported']} unsupported tagged relations omitted")


if __name__ == '__main__':
    main()

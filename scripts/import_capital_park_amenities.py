#!/usr/bin/env python3
"""Build Capital Drive public park equipment from pinned ACTmapi point layers."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from build_capital_drive_map import xy

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'Games' / 'Capital Drive'
BASE = 'https://services1.arcgis.com/E5n4f1VY84i0xSjy/ArcGIS/rest/services/ACTGOV_'
SOURCES = {
    'Barbecue': '2f83b231f260c66ee938d680f969980b741277dad5d5d65a326817ed756fac48',
    'Drinking_Fountain': '7d3aefb61a16556fdb0dce6d065a59a0cc4b4d86662d6d150bc474724424c4b2',
}
PUBLIC_AREA = re.compile(r'\b(PARK|PARKLAND|GARDENS|FORESHORE|PICNIC|SHOPPING CENTRE|'
                         r'COMMERCIAL CENTRE|TOWN CENTRE|PLAZA|PLAYGROUND)\b')


def read_source(folder, kind, fetch):
    path = folder / (kind + '.geojson')
    if fetch and not path.exists():
        query = urlencode({'f':'geojson', 'where':'1=1', 'outFields':'*', 'outSR':'4326',
                           'orderByFields':'ASSET_ID', 'returnGeometry':'true'})
        url = BASE + kind + '_Assets/FeatureServer/1/query?' + query
        with urlopen(Request(url, headers={'User-Agent':'CapitalDriveGeoImporter/1.0'}), timeout=60) as response:
            raw = response.read()
    else:
        raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCES[kind]:
        raise ValueError(f'{path.name} does not match the reviewed ACTmapi snapshot.')
    if fetch and not path.exists():
        path.write_bytes(raw)
    data = json.loads(raw)
    if data.get('type') != 'FeatureCollection' or data.get('exceededTransferLimit'):
        raise ValueError('Incomplete ArcGIS point collection')
    return data['features']


def coverage():
    # Use the component source extents rather than the world-sized rectangle
    # joining the outermost districts across unpublished road/terrain gaps.
    packs = ['canberra','canberra-north','airport','north-west','region-belconnen',
             'region-north','region-south','region-molonglo','region-west-belconnen']
    bounds = []
    for pack in packs:
        data = json.loads((GAME/'data'/(pack + '.json')).read_bytes())
        boxes = data['meta'].get('sourceBoxes')
        if boxes:
            for west,south,east,north in boxes.values() if isinstance(boxes,dict) else boxes:
                x1,z1 = xy(west, north)
                x2,z2 = xy(east, south)
                bounds.append((x1,z1,x2,z2))
        else:
            bounds.append(tuple(data['bounds'][key] for key in ('minX','minZ','maxX','maxZ')))
    return bounds


def select(feature, kind, bounds):
    p = feature['properties']
    location = p['LOCATION'] or ''
    if p['OPERATIONAL_STATE'] != 'ACTIVE' or not PUBLIC_AREA.search(location):
        return None
    if 'SCHOOL' in location or 'ENCLOSED' in location:
        return None
    if p['OWNERSHIP'] not in ('PLACE MANAGEMENT','PARKS AND CONSERVATION SERVICE','CITY RENEWAL AUTHORITY'):
        return None
    if feature['geometry']['type'] != 'Point':
        raise ValueError('Expected an asset point')
    x,z = xy(*feature['geometry']['coordinates'][:2])
    if not any(left<=x<=right and top<=z<=bottom for left,top,right,bottom in bounds):
        return None
    row = dict(id=p['ASSET_ID'], kind=kind, name=location.title(), suburb=p['SUBURB'].title(), x=x, z=z)
    if kind == 'bbq':
        plates = {'SINGLE HOTPLATE':1, 'DOUBLE HOTPLATE':2}.get(p['HOTPLATE_COMBINATION'])
        if p['ASSET_SUB_TYPE'] != 'ELECTRIC' or not plates:
            return None
        row['plates'] = plates
        if p['BENCH_TYPE']:
            row['bench'] = p['BENCH_TYPE'].lower()
    else:
        if p['MATERIAL'] != 'METAL' or p['DOG_BOWL'] not in ('NO DOG BOWL','INCLUDES DOG BOWL'):
            return None
        row['refill'] = p['ASSET_SUB_TYPE'] == 'REFILL STATION'
        row['dogBowl'] = p['DOG_BOWL'] == 'INCLUDES DOG BOWL'
    return row


def build(cache, fetch):
    bounds = coverage()
    candidates = []
    for source in SOURCES:
        kind = 'bbq' if source == 'Barbecue' else 'fountain'
        for feature in read_source(cache, source, fetch):
            row = select(feature, kind, bounds)
            if row:
                candidates.append(row)
    candidates.sort(key=lambda r: (r['kind'], int(re.search(r'\d+$',r['id']).group())))
    if len({row['id'] for row in candidates}) != len(candidates):
        raise ValueError('Duplicate ACT asset IDs')
    check = subprocess.run(['node','scripts/filter_capital_park_amenities.mjs'], cwd=ROOT,
                           input=json.dumps(candidates), text=True, capture_output=True)
    if check.returncode:
        raise RuntimeError(check.stderr)
    rows = json.loads(check.stdout)
    encoded = ',\n'.join('  ' + json.dumps(row, ensure_ascii=False, separators=(',',':')) for row in rows)
    print(f'{len(candidates)} supported government points screened; kept {len(rows)} '
          f'({sum(r["kind"] == "bbq" for r in rows)} barbecues, '
          f'{sum(r["kind"] == "fountain" for r in rows)} drinking fountains).')
    return ('// Generated by scripts/import_capital_park_amenities.py from ACTmapi.\n'
            '// © Australian Capital Territory, CC BY 4.0. See docs/capital-drive-park-amenities.md.\n'
            'export const PARK_AMENITIES = Object.freeze([\n' + encoded + '\n].map(Object.freeze));\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', required=True, type=Path, help='External directory for pinned ACTmapi downloads')
    parser.add_argument('--fetch', action='store_true', help='Download missing source responses into the cache')
    parser.add_argument('--output', type=Path, default=GAME/'park-amenities.js')
    parser.add_argument('--check', action='store_true', help='Compare without writing the output')
    args = parser.parse_args()
    cache = args.cache.resolve()
    if cache == ROOT or ROOT in cache.parents:
        parser.error('Store source responses outside the repository')
    if args.fetch:
        cache.mkdir(parents=True, exist_ok=True)
    generated = build(cache, args.fetch)
    if args.check:
        if args.output.read_text() != generated:
            raise SystemExit('Retained park amenities differ. Review the source and rebuild.')
    else:
        args.output.write_text(generated)


if __name__ == '__main__':
    main()

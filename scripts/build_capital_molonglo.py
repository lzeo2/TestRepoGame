#!/usr/bin/env python3
"""Build a bounded Molonglo street/footprint overlay from pinned OSM snapshots.

Raw extracts stay outside Git. Terrain must be generated separately from the
pinned ACT contour archive with build_capital_region_terrain.py. Runtime uses
the ordinary regional-expansion ABI; no source node or road is invented.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
from urllib.parse import urlencode

import build_capital_regions as core
from build_capital_north import API, get

BOX = [149.010, -35.337, 149.071, -35.280]
NORTH_SEAM = [149.010, -35.280, 149.071, -35.266]
SOURCE_BOXES = [BOX, NORTH_SEAM]
SPEC = dict(title='Molonglo Valley: Coppins Crossing, Coombs, Wright and Denman source overlay',
    places={'Coombs', 'Wright', 'Molonglo', 'Molonglo Valley', 'Denman Prospect'},
    sites=(
        ('coppins-crossing', 'Coppins Crossing', 'way/73201646', None, ()),
        ('denman-prospect-shops', 'Denman Prospect Shops', 'way/672428316', 'mall', ('way/672428316',)),
        ('coombs-shops', 'Coombs Shops', 'way/697244279', 'mall', ('way/697244279',)),
        ('charles-weston-school', 'Charles Weston School', 'way/548101844', None, ()),
        ('evelyn-scott-school', 'Evelyn Scott School', 'way/771746220', None, ()),
        ('coombs-community-centre', 'Coombs Community Centre', 'way/1134389463', None, ('way/1134389463',)),
    ),
    waters=(('coppins-molonglo-river', 'Molonglo River at Coppins Crossing', 'relation/8316669'),
            ('coombs-pond', 'Coombs Pond', 'way/251681896')))


def fetch_source(cache, groups, relations=(), snapshot_date='2026-11-25'):
    """Fetch named (group, W/S/E/N box, columns, rows) official API tiles."""
    cache.mkdir(parents=True, exist_ok=True)
    jobs = []
    boxes = {}
    for group, box, columns, rows in groups:
        boxes[group] = box
        west, south, east, north = box
        for x in range(columns):
            for z in range(rows):
                bbox = [round(west+(east-west)*x/columns, 8), round(south+(north-south)*z/rows, 8),
                        round(west+(east-west)*(x+1)/columns, 8), round(south+(north-south)*(z+1)/rows, 8)]
                url = API+'map.json?'+urlencode({'bbox': ','.join(map(str, bbox))})
                jobs.append((url, cache/f'{group}-{x}-{z}.json'))
    for ident in relations:
        jobs.append((API+f'relation/{ident}/full.json', cache/f'relation-{ident}-full.json'))
    with ThreadPoolExecutor(max_workers=2) as pool:
        files = list(pool.map(lambda job: get(*job), jobs))
    manifest = dict(source='OpenStreetMap contributors', license='ODbL-1.0',
        licenseUrl='https://opendatacommons.org/licenses/odbl/1-0/',
        attributionUrl='https://www.openstreetmap.org/copyright', snapshotDate=snapshot_date,
        sourceBoxes=boxes, files=files)
    (cache/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')


def build_overlay(region, spec, source_boxes, cache, terrain, output):
    # The shared importer keeps exact source seams, source-paired overlap gates,
    # bounded generic selection and all earlier map owners. This process-local
    # spec does not change the three established regional packs.
    core.REGIONS[region] = spec
    earlier = [core.DATA/name for name in ('canberra.json', 'canberra-north.json', 'airport.json',
        'north-west.json', 'giant-spray.json', 'region-belconnen.json', 'region-north.json', 'region-south.json')]
    supplement = core.DATA/'residential-supplement.json'
    if supplement.exists():
        earlier.append(supplement)
    result = core.build(region, cache, earlier)
    result['meta']['clipPolicy'] = dict(sourceBoxes=source_boxes, sourceNodeFringeDegrees=.004,
        rule='Only exact source-node segments touching the source box with both endpoints in its 0.004-degree fringe; no invented boundary vertices.')
    result['meta']['coverageNote'] = 'Bounded source streets and selected exact footprints; not complete suburb housing, surveyed architecture or verified entrances. Water, when selected, retains complete source rings; no river course or shore is reconstructed.'
    core.attach_terrain(result, terrain)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'))+'\n')
    print({key: len(result[key]) for key in ('roads', 'buildings', 'areas', 'landmarks')}, result['bounds'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-cache', type=Path, required=True)
    parser.add_argument('--fetch-source', action='store_true')
    parser.add_argument('--terrain-grid', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.fetch_source:
        fetch_source(args.source_cache, [('molonglo', BOX, 3, 4), ('north-seam', NORTH_SEAM, 3, 1)], [8316669])
    if args.output:
        if not args.terrain_grid:
            parser.error('--output requires a verified --terrain-grid')
        build_overlay('molonglo', SPEC, SOURCE_BOXES, args.source_cache, args.terrain_grid, args.output)
    elif not args.fetch_source:
        parser.error('Use --fetch-source or --output with --terrain-grid')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Rebuild bounded West Belconnen from pinned OSM and observed ACT contours.

Uses the shared staged-overlay builder. Raw API files remain in an external
cache; their exact URLs and hashes are recorded in that cache's manifest.
"""
import argparse
from pathlib import Path

from build_capital_molonglo import build_overlay, fetch_source

ROOT = Path(__file__).resolve().parents[1]
BOX = [149.015, -35.250, 149.060, -35.190]
SPEC = dict(
    title='West Belconnen: Higgins, Latham, Charnwood and Kippax source overlay',
    places={'Higgins', 'Latham', 'Charnwood'},
    sites=(
        ('latham-shopping-hub', 'Latham Shopping Hub', 'way/815187745', 'mall', ('way/815187745',)),
        ('charnwood-shops', 'Charnwood Shops', 'way/24785037', None, ('way/372148527',)),
        ('kippax-public-library', 'Kippax Public Library', 'way/27243629', 'library', ('way/27243629',)),
        # The shopping-centre multipolygon has open member ways. Its source
        # landmark is retained without inventing a closed building carrier.
        ('kippax-fair', 'Kippax Fair Shopping Centre', 'relation/9912221', None, ()),
        ('latham-oval', 'Latham Oval', 'way/51245171', None, ()),
        ('charnwood-district-playing-fields', 'Charnwood District Playing Fields', 'way/122237056', None, ()),
    ),
    waters=(),
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-cache', type=Path, required=True)
    parser.add_argument('--fetch-source', action='store_true')
    parser.add_argument('--terrain-grid', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.fetch_source:
        fetch_source(args.source_cache, [('west-belconnen', BOX, 3, 4)])
    if args.terrain_grid:
        output = args.output or ROOT/'Games/Capital Drive/data/region-west-belconnen.json'
        build_overlay('west-belconnen', SPEC, [BOX], args.source_cache, args.terrain_grid, output)
    elif args.output or not args.fetch_source:
        parser.error('Use --fetch-source or provide --terrain-grid for the offline rebuild')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Sample the street sidecar's bounds from the retained pinned ACT contours.

Uses the same interpolation and source validation as the northern terrain import,
with a bounded 75–125 m grid for the wider, sparsely detailed street extension.
Developer geospatial packages and the ACT archive remain outside the repository.
"""
import argparse
import hashlib
import json
from pathlib import Path

import build_capital_north_terrain as contours

ROOT = Path(__file__).resolve().parents[1]


def build(source, overlay, output, cell_metres):
    assert 75 <= cell_metres <= 125, 'Keep the sparse extension terrain bounded to 75–125 metre cells.'
    raw = overlay.read_bytes()
    bounds = json.loads(raw)['bounds']
    # Small outer margin covers round-off and keeps road endpoints inside the grid.
    contours.WEST = contours.LON0 + (bounds['minX']-50)/contours.MX
    contours.EAST = contours.LON0 + (bounds['maxX']+50)/contours.MX
    contours.NORTH = contours.LAT0 - (bounds['minZ']-50)/contours.MZ
    contours.SOUTH = contours.LAT0 - (bounds['maxZ']+50)/contours.MZ
    contours.build(source, output, cell_metres)
    result = json.loads(output.read_text())
    result['terrain']['streetSidecarSha256'] = hashlib.sha256(raw).hexdigest()
    result['terrain']['note'] += ' Sparse north/west street extension uses roughly 100m cells; existing higher-resolution terrain tiles retain priority.'
    output.write_text(json.dumps(result, separators=(',', ':'))+'\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--overlay', type=Path, default=ROOT/'Games/Capital Drive/data/north-west.json')
    parser.add_argument('--output', type=Path, default=ROOT/'Games/Capital Drive/data/north-west-terrain.json')
    parser.add_argument('--cell-metres', type=float, default=100)
    args = parser.parse_args()
    build(args.source, args.overlay, args.output, args.cell_metres)


if __name__ == '__main__':
    main()

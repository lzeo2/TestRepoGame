#!/usr/bin/env python3
"""Sample the Civic extension from pinned ACT 2020 LiDAR-derived 2m contours.

Developer dependencies (NumPy, Shapely, Pyogrio, Pyproj, SciPy) and the original
source archive must be provided outside the repository. No runtime downloads.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEST, SOUTH, EAST, NORTH = 149.103, -35.303, 149.174, -35.268
LON0, LAT0 = 149.137, -35.318
MX, MZ = 111320 * math.cos(math.radians(LAT0)), 111320
SOURCE_URL = 'https://actmapi-open-data.s3.amazonaws.com/DataDownload/GIS/Contours/2020/Contour_2m.gdb.zip'
SOURCE_SHA256 = 'b8090f3ab023c2821747a760470eb8e53173c6d1b7a35dbb2a306885da7981b9'


def build(source, output, cell_metres):
    import numpy as np
    import shapely
    from pyogrio.raw import read
    from pyproj import Transformer
    from scipy.interpolate import LinearNDInterpolator

    digest = hashlib.sha256()
    with source.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    assert digest.hexdigest() == SOURCE_SHA256, 'ACT source archive does not match the pinned snapshot.'
    project = Transformer.from_crs(4326, 7855, always_xy=True)
    x0, y0 = project.transform(WEST, SOUTH)
    x1, y1 = project.transform(EAST, NORTH)
    margin = 500
    _, _, wkbs, values = read('/vsizip/' + str(source.resolve()),
                             bbox=(x0 - margin, y0 - margin, x1 + margin, y1 + margin),
                             columns=['ELEVATION'])
    points, heights, eligible = [], [], []
    for wkb, elevation in zip(wkbs, values[0]):
        geom = shapely.from_wkb(wkb)
        for line in geom.geoms if geom.geom_type == 'MultiLineString' else [geom]:
            distances = np.arange(0, line.length, 10)
            samples = shapely.line_interpolate_point(line, distances)
            xs, ys = shapely.get_x(samples), shapely.get_y(samples)
            keep = (xs >= x0 - margin) & (xs <= x1 + margin) & (ys >= y0 - margin) & (ys <= y1 + margin)
            points.extend(zip(xs[keep], ys[keep]))
            heights.extend([float(elevation)] * int(keep.sum()))
            eligible.extend(((line.length > 100) & (distances[keep] >= 20) & (distances[keep] <= line.length - 20)).tolist())
    points, heights = np.asarray(points), np.asarray(heights)
    _, unique = np.unique(np.round(points, 2), axis=0, return_index=True)
    points, heights = points[unique], heights[unique]
    held_out = (np.arange(len(points)) % 11 == 0) & np.asarray(eligible)[unique]
    predicted = LinearNDInterpolator(points[~held_out], heights[~held_out])(points[held_out])
    finite = np.isfinite(predicted)
    residual = np.abs(predicted[finite] - heights[held_out][finite])
    cols = math.ceil((EAST - WEST) * MX / cell_metres) + 1
    rows = math.ceil((NORTH - SOUTH) * MZ / cell_metres) + 1
    lon, lat = np.meshgrid(np.linspace(WEST, EAST, cols), np.linspace(NORTH, SOUTH, rows))
    x, y = project.transform(lon, lat)
    grid = LinearNDInterpolator(points, heights)(x, y)
    assert np.isfinite(grid).all(), 'Source convex hull misses grid cells; do not fill with invented elevations.'
    assert 500 < float(grid.min()) < float(grid.max()) < 1000
    base_north_z = round((LAT0 - -35.298) * MZ, 2)
    terrain = dict(cols=cols, rows=rows,
                   minX=round((WEST - LON0) * MX, 2), maxX=round((EAST - LON0) * MX, 2),
                   minZ=round((LAT0 - NORTH) * MZ, 2), maxZ=round((LAT0 - SOUTH) * MZ, 2),
                   heights=np.round(grid.ravel() - 550, 2).tolist(),
                   blendSouthZ=base_north_z + 100, blendNorthZ=base_north_z,
                   extent=[WEST, SOUTH, EAST, NORTH],
                   source='ACT 2020 LiDAR-derived 2m contours; linear Delaunay interpolation',
                   sourceUrl=SOURCE_URL, sourceSha256=SOURCE_SHA256,
                   attribution='Australian Capital Territory', license='CC-BY-4.0',
                   projection='Local equirectangular metres; x east, z south', origin=[LON0, LAT0],
                   interpolationCRS='EPSG:7855', verticalDatum='AHD', datumOffsetMetres=550,
                   nativeContourIntervalMetres=2, pointSpacingMetres=10,
                   cellSpacingMetres=[(EAST - WEST) * MX / (cols - 1), (NORTH - SOUTH) * MZ / (rows - 1)],
                   note='Resampled contour terrain, not a native DEM or surveyed road/deck heights. Water interiors interpolate shore contours; no bathymetry claim.',
                   validation=dict(features=len(wkbs), trainingPoints=len(points), heldOutPoints=int(finite.sum()),
                                   heldOutMissing=int((~finite).sum()), heldOutMedianAbsoluteMetres=float(np.median(residual)),
                                   heldOutP95AbsoluteMetres=float(np.percentile(residual, 95)),
                                   heldOutMaxAbsoluteMetres=float(residual.max()), nearestFillCells=0,
                                   note='Held-out contour numerical consistency, not independent survey accuracy.'))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(dict(schemaVersion=1, terrain=terrain), separators=(',', ':')) + '\n')
    print(f'{cols}x{rows} grid, {len(points)} source samples, {int(finite.sum())} held-out, p95={np.percentile(residual, 95):.3f}m; {output.stat().st_size} bytes')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True, help='Pinned ACT contour archive outside the repository')
    parser.add_argument('--output', type=Path, default=ROOT / 'Games/Capital Drive/data/north-terrain.json')
    parser.add_argument('--cell-metres', type=float, default=25)
    args = parser.parse_args()
    assert 15 <= args.cell_metres <= 30, 'Keep the bounded extension grid between 15 and 30 metre cells.'
    build(args.source, args.output, args.cell_metres)


if __name__ == '__main__':
    main()

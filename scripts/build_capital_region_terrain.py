#!/usr/bin/env python3
"""Build coarse regional terrain from the pinned ACT 2020 contour archive.

Requires external NumPy, Shapely, Pyogrio, Pyproj and SciPy. No downloads, imagery,
nearest-height fill or runtime changes. Output uses the existing terrain tile ABI.
An overlay contributes its world-space bounds; multiple overlays form one extent.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import build_capital_north_terrain as source_spec


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def extent_from_overlays(paths, margin):
    bounds = None
    inputs = []
    for path in paths:
        raw = path.read_bytes()
        item = json.loads(raw)['bounds']
        if not all(isinstance(item.get(k), (int, float)) and math.isfinite(item[k])
                   for k in ('minX', 'maxX', 'minZ', 'maxZ')) or not (item['minX'] < item['maxX'] and item['minZ'] < item['maxZ']):
            raise ValueError('Overlay requires finite increasing world-space bounds.')
        inputs.append({'file': path.name, 'sha256': hashlib.sha256(raw).hexdigest()})
        if bounds is None:
            bounds = dict(item)
        else:
            for key in ('minX', 'minZ'):
                bounds[key] = min(bounds[key], item[key])
            for key in ('maxX', 'maxZ'):
                bounds[key] = max(bounds[key], item[key])
    if bounds is None:
        raise ValueError('Supply --extent or at least one --overlay.')
    return [source_spec.LON0 + (bounds['minX'] - margin) / source_spec.MX,
            source_spec.LAT0 - (bounds['maxZ'] + margin) / source_spec.MZ,
            source_spec.LON0 + (bounds['maxX'] + margin) / source_spec.MX,
            source_spec.LAT0 - (bounds['minZ'] - margin) / source_spec.MZ], inputs


def build(args):
    import numpy as np
    import shapely
    from pyogrio import read_info
    from pyogrio.raw import read
    from pyproj import Transformer
    from scipy.interpolate import LinearNDInterpolator
    from scipy.spatial import ConvexHull, Delaunay, cKDTree

    if not 75 <= args.cell_metres <= 100:
        raise ValueError('Regional cells must be 75–100 metres.')
    if not 10 <= args.point_spacing <= 50 or not 0 <= args.margin_metres <= 150:
        raise ValueError('Use 10–50 metre source sampling and a 0–150 metre overlay margin.')
    if not 250 <= args.max_source_gap <= 1500:
        raise ValueError('Use a 250–1500 metre maximum supported contour distance.')
    if sha256(args.source) != source_spec.SOURCE_SHA256:
        raise ValueError('ACT contour archive does not match the retained pinned SHA256.')
    extent, inputs = (list(args.extent), []) if args.extent else extent_from_overlays(args.overlay, args.margin_metres)
    west, south, east, north = extent
    if not all(math.isfinite(v) for v in extent) or not (148 < west < east < 151 and -37 < south < north < -34):
        raise ValueError('Extent must be an increasing bounded Canberra-region W S E N rectangle.')
    cols = math.ceil((east - west) * source_spec.MX / args.cell_metres) + 1
    rows = math.ceil((north - south) * source_spec.MZ / args.cell_metres) + 1
    if cols * rows > 120000:
        raise ValueError('Grid exceeds 120,000 samples; split the region into staged overlays.')
    project = Transformer.from_crs(4326, 7855, always_xy=True)
    unproject = Transformer.from_crs(7855, 4326, always_xy=True)
    dataset = '/vsizip/' + str(args.source.resolve())
    info = read_info(dataset)
    if info['crs'] != 'EPSG:7855':
        raise ValueError('Unexpected ACT contour coordinate system.')
    dataset_extent = list(unproject.transform_bounds(*info['total_bounds'], densify_pts=41))
    x0, y0, x1, y1 = project.transform_bounds(west, south, east, north, densify_pts=41)
    margin = max(500, args.max_source_gap)
    _, _, wkbs, values = read(dataset, bbox=(x0 - margin, y0 - margin, x1 + margin, y1 + margin), columns=['ELEVATION'])
    chunks, elevations = [], []
    for wkb, elevation in zip(wkbs, values[0]):
        if not math.isfinite(float(elevation)):
            raise ValueError('Non-finite source contour elevation.')
        geom = shapely.from_wkb(wkb)
        for line in geom.geoms if geom.geom_type == 'MultiLineString' else [geom]:
            distances = np.arange(0, line.length, args.point_spacing)
            samples = shapely.line_interpolate_point(line, distances)
            xs, ys = shapely.get_x(samples), shapely.get_y(samples)
            keep = (xs >= x0 - margin) & (xs <= x1 + margin) & (ys >= y0 - margin) & (ys <= y1 + margin)
            if keep.any():
                chunks.append(np.column_stack((xs[keep], ys[keep])))
                elevations.append(np.full(int(keep.sum()), float(elevation)))
    if not chunks:
        raise ValueError('No retained contour observations cover this region.')
    points, heights = np.concatenate(chunks), np.concatenate(elevations)
    _, unique = np.unique(np.round(points, 2), axis=0, return_index=True)
    points, heights = points[unique], heights[unique]
    if len(points) < 3 or len(points) > 2500000:
        raise ValueError('Source point budget exceeded; split this region into stages or use coarser source sampling.')
    lon, lat = np.meshgrid(np.linspace(west, east, cols), np.linspace(north, south, rows))
    x, y = project.transform(lon, lat)
    query = np.column_stack((x.ravel(), y.ravel()))
    nearest, _ = cKDTree(points).query(query)
    # The dataset rectangle alone is insufficient: reject cells outside the
    # actual observation hull or too far from any source contour observation.
    hull = ConvexHull(points)
    outside = np.zeros(len(query), dtype=bool)
    for normal in hull.equations:
        outside |= query @ normal[:2] + normal[2] > .01
    unsupported = outside | (nearest > args.max_source_gap)
    coverage = dict(datasetExtent=dataset_extent, requestedExtent=extent,
                    gridSamples=rows * cols, sourceFeatures=len(wkbs), sourceSamples=len(points),
                    outsideSourceHullCells=int(outside.sum()), distantContourCells=int((nearest > args.max_source_gap).sum()),
                    unsupportedCells=int(unsupported.sum()), maximumNearestContourMetres=float(nearest.max()),
                    p95NearestContourMetres=float(np.percentile(nearest, 95)),
                    allowedNearestContourMetres=args.max_source_gap, nearestFillCells=0,
                    note='Observation-hull and contour-distance support checks; not native DEM accuracy or proof of complete contour coverage.')
    if unsupported.any():
        unsupported_lon, unsupported_lat = lon.ravel()[unsupported], lat.ravel()[unsupported]
        coverage['unsupportedExtent'] = [float(unsupported_lon.min()), float(unsupported_lat.min()), float(unsupported_lon.max()), float(unsupported_lat.max())]
    report = dict(schemaVersion=1, sourceUrl=source_spec.SOURCE_URL, sourceSha256=source_spec.SOURCE_SHA256,
                  coverage=coverage, inputs=inputs)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
    print(json.dumps(coverage, separators=(',', ':'), allow_nan=False), flush=True)
    if unsupported.any():
        raise ValueError('Unsupported regional cells; crop/split the overlay or obtain separately attributed observed coverage. No fill was written.')
    if args.check_coverage:
        return report
    if args.output is None:
        raise ValueError('Supply --output for a terrain build, or --check-coverage.')
    # No nearest fallback. Delaunay remains the same interpolation family as the
    # retained Civic/north-west tiles, with explicit coarser source sampling.
    triangulation = Delaunay(points)
    grid = LinearNDInterpolator(triangulation, heights)(query)
    if not np.isfinite(grid).all():
        raise ValueError('Source triangulation misses regional grid cells; no fill was written.')
    if not 100 < float(grid.min()) <= float(grid.max()) < 2500:
        raise ValueError('Interpolated terrain is outside plausible ACT AHD bounds.')
    terrain = dict(cols=cols, rows=rows,
                   minX=round((west - source_spec.LON0) * source_spec.MX, 2), maxX=round((east - source_spec.LON0) * source_spec.MX, 2),
                   minZ=round((source_spec.LAT0 - north) * source_spec.MZ, 2), maxZ=round((source_spec.LAT0 - south) * source_spec.MZ, 2),
                   heights=np.round(grid - 550, 2).tolist(), extent=extent,
                   source='ACT 2020 LiDAR-derived 2m contours; linear Delaunay interpolation',
                   sourceUrl=source_spec.SOURCE_URL, sourceSha256=source_spec.SOURCE_SHA256,
                   attribution='Australian Capital Territory', license='CC-BY-4.0',
                   projection='Local equirectangular metres; x east, z south', origin=[source_spec.LON0, source_spec.LAT0],
                   interpolationCRS='EPSG:7855', verticalDatum='AHD', datumOffsetMetres=550,
                   nativeContourIntervalMetres=2, pointSpacingMetres=args.point_spacing,
                   cellSpacingMetres=[(east - west) * source_spec.MX / (cols - 1), (north - south) * source_spec.MZ / (rows - 1)],
                   blendPreviousMetres=150, regionSidecars=inputs, validation=coverage,
                   note='Coarse contour-derived ground, not a native DEM, bathymetry or road/deck survey. Existing finer tiles must retain priority. A 150m transition outside previous coverage is an authored seam, not a new elevation observation.')
    result = dict(schemaVersion=1, terrain=terrain)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, separators=(',', ':'), allow_nan=False) + '\n')
    print(f'{cols}x{rows}; AHD {float(grid.min()):.2f}..{float(grid.max()):.2f}m; {args.output.stat().st_size} bytes', flush=True)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True, help='Retained pinned Contour_2m.gdb.zip')
    bounds = parser.add_mutually_exclusive_group(required=True)
    bounds.add_argument('--overlay', type=Path, action='append', help='Staged map sidecar; repeat to cover a union of bounds')
    bounds.add_argument('--extent', type=float, nargs=4, metavar=('WEST', 'SOUTH', 'EAST', 'NORTH'))
    parser.add_argument('--cell-metres', type=float, default=100)
    parser.add_argument('--point-spacing', type=float, default=25)
    parser.add_argument('--margin-metres', type=float, default=50, help='Padding around overlay bounds; explicit extents are unchanged')
    parser.add_argument('--max-source-gap', type=float, default=1000)
    parser.add_argument('--check-coverage', action='store_true')
    parser.add_argument('--report', type=Path, help='External diagnostic report; also written on unsupported-cell rejection')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    try:
        build(args)
    except (ValueError, KeyError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()

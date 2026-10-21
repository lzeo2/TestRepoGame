#!/usr/bin/env python3
"""Deterministic supplied-relief reduction. Run with source GLB, or --self-test.

Requires existing numpy only. Outputs beside this script; never overwrites source.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess

import numpy as np

ROOT = Path(__file__).resolve().parent
SOURCE_SHA = 'abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9'
CAP = 8_388_608
FLOOR = 2_147_483_648


def sha(data):
    return hashlib.sha256(data).hexdigest()


def unpack(data):
    magic, version, length = struct.unpack_from('<III', data)
    assert (magic, version, length) == (0x46546C67, 2, len(data))
    size, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A
    doc = json.loads(data[20:20 + size])
    size2, kind2 = struct.unpack_from('<II', data, 20 + size)
    start = 28 + size
    assert kind2 == 0x004E4942 and start + size2 == len(data)
    assert len(doc['meshes']) == 1 and len(doc['meshes'][0]['primitives']) == 1
    primitive = doc['meshes'][0]['primitives'][0]
    assert primitive.get('mode', 4) == 4 and len(doc['buffers']) == 1
    assert 'uri' not in doc['buffers'][0]

    def read(index, dtype, shape, component):
        acc = doc['accessors'][index]
        view = doc['bufferViews'][acc['bufferView']]
        assert acc['componentType'] == component and acc['type'] == shape
        assert not acc.get('sparse') and not view.get('byteStride') and view['buffer'] == 0
        width = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[shape]
        offset = acc.get('byteOffset', 0)
        count = acc['count'] * width
        assert offset + count * np.dtype(dtype).itemsize <= view['byteLength']
        return np.frombuffer(data, dtype=dtype, count=count,
                             offset=start + view.get('byteOffset', 0) + offset).reshape(-1, width)

    attrs = primitive['attributes']
    return (read(attrs['POSITION'], '<f4', 'VEC3', 5126),
            read(attrs['NORMAL'], '<f4', 'VEC3', 5126),
            read(attrs['COLOR_0'], 'u1', 'VEC4', 5121),
            read(primitive['indices'], '<u4', 'SCALAR', 5125).reshape(-1, 3))


def cluster(pos, normal, color, faces, grid):
    assert grid > 0 and np.isfinite(grid)
    assert len(pos) == len(normal) == len(color) and np.isfinite(pos).all()
    assert np.isfinite(normal).all() and faces.max() < len(pos)
    cells = np.floor((pos.astype('f8') - pos.min(axis=0)) / grid).astype('i8')
    _, inverse = np.unique(cells, axis=0, return_inverse=True)
    counts = np.bincount(inverse)

    def average(array):
        return np.column_stack([np.bincount(inverse, weights=col) / counts for col in array.T])

    points = average(pos).astype('<f4')
    normals = average(normal)
    lengths = np.linalg.norm(normals, axis=1)
    normals[lengths == 0] = (0, 0, 1)
    normals /= np.linalg.norm(normals, axis=1)[:, None]
    colors = np.rint(average(color)).clip(0, 255).astype('u1')
    distance = np.linalg.norm(pos.astype('f8') - points[inverse], axis=1)
    remapped = inverse[faces]
    distinct = ((remapped[:, 0] != remapped[:, 1]) &
                (remapped[:, 1] != remapped[:, 2]) & (remapped[:, 0] != remapped[:, 2]))
    remapped = remapped[distinct]
    _, keep = np.unique(np.sort(remapped, axis=1), axis=0, return_index=True)
    unique = remapped[np.sort(keep)]
    edges1 = points[unique[:, 1]] - points[unique[:, 0]]
    edges2 = points[unique[:, 2]] - points[unique[:, 0]]
    nonzero = np.any(np.cross(edges1, edges2) != 0, axis=1)
    unique = unique[nonzero]
    used, compact = np.unique(unique, return_inverse=True)
    stats = {
        'collapsed_triangles_removed': int((~distinct).sum()),
        'duplicate_triangles_removed': int(len(remapped) - len(keep)),
        'zero_area_triangles_removed': int((~nonzero).sum()),
        'error_metric': {
            'name': 'source vertex to assigned float32 cluster centroid displacement',
            'units': 'm', 'max': float(distance.max()),
            'rms': float(np.sqrt(np.mean(distance ** 2))),
            'scope': 'All source vertices before unused-cluster pruning; not surface Hausdorff error.'
        }
    }
    return (points[used], normals[used].astype('<f4'), colors[used],
            compact.reshape(-1, 3).astype('<u4')), stats


def pack(arrays):
    pos, normal, color, faces = arrays
    binary = bytearray()
    views, accessors = [], []
    for array, kind, component, target in [
        (pos, 'VEC3', 5126, 34962), (normal, 'VEC3', 5126, 34962),
        (color, 'VEC4', 5121, 34962), (faces.ravel(), 'SCALAR', 5125, 34963)
    ]:
        payload = array.tobytes()
        views.append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(payload), 'target': target})
        binary.extend(payload)
        binary.extend(b'\0' * (-len(binary) % 4))
        acc = {'bufferView': len(views) - 1, 'componentType': component,
               'type': kind, 'count': len(array)}
        if component == 5121:
            acc['normalized'] = True
        if len(accessors) == 0:
            acc.update(min=pos.min(axis=0).tolist(), max=pos.max(axis=0).tolist())
        accessors.append(acc)
    doc = {
        'asset': {'version': '2.0', 'generator': 'optimize-portrait.py vertex clustering v1'},
        'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0}],
        'meshes': [{'name': 'supplied_photo_relief', 'extras': {'units': 'm'}, 'primitives': [{
            'attributes': {'POSITION': 0, 'NORMAL': 1, 'COLOR_0': 2},
            'indices': 3, 'mode': 4, 'material': 0}]}],
        'materials': [{'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1],
                        'metallicFactor': 0, 'roughnessFactor': 1}, 'alphaMode': 'OPAQUE'}],
        'buffers': [{'byteLength': len(binary)}], 'bufferViews': views, 'accessors': accessors
    }
    text = json.dumps(doc, separators=(',', ':'), sort_keys=True).encode()
    text += b' ' * (-len(text) % 4)
    return (struct.pack('<III', 0x46546C67, 2, 28 + len(text) + len(binary)) +
            struct.pack('<II', len(text), 0x4E4F534A) + text +
            struct.pack('<II', len(binary), 0x004E4942) + binary)


def guarded_write(path, data):
    # Check both df evidence and available-to-user blocks immediately before each write.
    subprocess.run(['df', '-B1', str(ROOT)], check=True)
    disk = os.statvfs(ROOT)
    available = disk.f_bavail * disk.f_frsize
    if available - len(data) < FLOOR:
        raise RuntimeError(f'disk guard: {available} available, {len(data)} planned')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def self_test():
    p = np.array([[0, 0, 0], [.01, 0, 0], [1, 0, 0], [0, 1, 0]], dtype='<f4')
    n = np.tile([0, 0, 1], (4, 1)).astype('<f4')
    c = np.tile([20, 40, 60, 255], (4, 1)).astype('u1')
    f = np.array([[0, 2, 3], [1, 2, 3], [0, 1, 2]], dtype='<u4')
    result, stats = cluster(p, n, c, f, .1)
    assert len(result[0]) == 3 and len(result[3]) == 1
    assert stats['collapsed_triangles_removed'] == stats['duplicate_triangles_removed'] == 1
    assert pack(result) == pack(cluster(p, n, c, f, .1)[0])
    assert all(np.array_equal(a, b) for a, b in zip(result, unpack(pack(result))))
    print('PASS: deterministic clustering, collapsed/duplicate removal, GLB round-trip')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, nargs='?')
    parser.add_argument('--grid', type=float, default=.0015, help='Grid spacing in metres')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if args.source is None:
        parser.error('source GLB required')
    output = ROOT / 'models/portrait_relief.glb'
    assert args.source.resolve() != output.resolve(), 'source must remain immutable'
    source = args.source.read_bytes()
    assert sha(source) == SOURCE_SHA and len(source) == 10_972_672, 'unexpected source'
    original = unpack(source)
    optimized, stats = cluster(*original, args.grid)
    derived = pack(optimized)
    assert len(derived) <= CAP, f'asset exceeds {CAP} bytes'
    assert all(np.array_equal(a, b) for a, b in zip(optimized, unpack(derived)))
    assert sha(args.source.read_bytes()) == SOURCE_SHA, 'source changed during reduction'
    config = {'enabled': True, 'url': 'models/portrait_relief.glb',
              'bytes': len(derived), 'sha256': sha(derived)}
    receipt = {
        'source': {'label': 'operator-supplied photo-derived portrait relief',
                   'bytes': len(source), 'sha256': SOURCE_SHA,
                   'vertices': len(original[0]), 'triangles': len(original[3])},
        'derived': dict(config, vertices=len(optimized[0]), triangles=len(optimized[3]),
                        bounds_m={'min': optimized[0].min(axis=0).tolist(),
                                  'max': optimized[0].max(axis=0).tolist()}),
        'method': {'name': 'deterministic vertex clustering v1', 'grid_m': args.grid,
                   'details': 'Floor grid anchored at source minimum; mean positions, normalized mean normals, rounded mean RGBA; remove collapsed, duplicate and zero-area faces; compact indices.'},
        'measurements': stats,
        'acceptance': {'visual_recognizability': 'unverified; no browser or visual review',
                       'lobby_integration': 'unverified; host owns placement and scale',
                       'source_unchanged': True}
    }
    guarded_write(output, derived)
    for name, value in [('portrait-config.json', config), ('portrait-receipt.json', receipt)]:
        guarded_write(ROOT / name, (json.dumps(value, indent=2, sort_keys=True) + '\n').encode())
    print(json.dumps(receipt, indent=2, sort_keys=True))


if __name__ == '__main__':
    main()

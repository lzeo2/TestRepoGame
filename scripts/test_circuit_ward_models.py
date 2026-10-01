#!/usr/bin/env python3
"""Stdlib audit of the five supplied GLBs and the local loader import closure.

Run from any directory: python3 scripts/test_circuit_ward_models.py
Assertions intentionally enforce this delivery's static, uncompressed subset,
not every possible glTF feature. Do not run with python -O.
"""
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'Games/Circuit Ward'
REVISION = 'bc57a17'
MODELS = {
    'cover-console.glb': (2000, 828),
    'sentry-walker.glb': (2500, 1564),
    'buzzer-drone.glb': (1500, 1220),
    'coil-blaster.glb': (2000, 936),
    'repair-cell.glb': (600, 308),
}
VENDOR_HASHES = {
    'GLTFLoader.js': '1f9b02acfbf219a6ebb77f09e355500449a3ba9e6a77d87e0de72c0b9315ea4e',
    'BufferGeometryUtils.js': '3a6701d824adfe05dc28c09b6c1d64aeab9a183bc3b944d85f15f596e5c6c2b3',
    'three.module.js': '76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495',
    'LICENSE': '852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d',
}


def no_resources(value):
    if isinstance(value, dict):
        assert not set(value).intersection({'uri', 'extensions', 'skin', 'targets'})
        for child in value.values():
            no_resources(child)
    elif isinstance(value, list):
        for child in value:
            no_resources(child)


def audit(path, ceiling, expected):
    blob = path.read_bytes()
    assert blob == subprocess.check_output(
        ['git', 'show', f'{REVISION}:{path.relative_to(ROOT).as_posix()}'], cwd=ROOT
    ), f'{path.name}: changed since supplied commit'
    assert len(blob) >= 28
    assert struct.unpack_from('<4sII', blob) == (b'glTF', 2, len(blob))
    chunks, offset = [], 12
    while offset < len(blob):
        assert offset + 8 <= len(blob)
        size, kind = struct.unpack_from('<II', blob, offset)
        offset += 8
        assert size % 4 == 0 and offset + size <= len(blob)
        chunks.append((kind, blob[offset:offset + size]))
        offset += size
    assert [kind for kind, _ in chunks] == [0x4E4F534A, 0x004E4942]
    doc, binary = json.loads(chunks[0][1]), chunks[1][1]
    assert doc['asset']['version'] == '2.0'
    no_resources(doc)
    for key in ('images', 'textures', 'samplers', 'skins', 'animations',
                'extensionsRequired', 'extensionsUsed'):
        assert not doc.get(key), key
    assert len(doc['buffers']) == 1
    length = doc['buffers'][0]['byteLength']
    assert length <= len(binary) <= length + 3
    assert len(doc['meshes']) == len(doc['nodes']) == len(doc['scenes']) == 1
    assert doc.get('scene', 0) == 0 and doc['scenes'][0]['nodes'] == [0]
    node = doc['nodes'][0]
    assert node['mesh'] == 0 and not node.get('children')
    assert node.get('translation', [0, 0, 0]) == [0, 0, 0]
    assert node.get('rotation', [0, 0, 0, 1]) == [0, 0, 0, 1]
    assert node.get('scale', [1, 1, 1]) == [1, 1, 1]
    assert node.get('matrix', [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) == [
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    assert 1 <= len(doc['materials']) <= 2
    for material in doc['materials']:
        assert material.get('alphaMode', 'OPAQUE') == 'OPAQUE'
        pbr = material['pbrMetallicRoughness']
        assert pbr['metallicFactor'] == 0 and pbr['roughnessFactor'] >= 0.5
    for view in doc['bufferViews']:
        assert view['buffer'] == 0
        assert 0 <= view.get('byteOffset', 0) <= length
        assert 0 <= view['byteLength'] <= length - view.get('byteOffset', 0)

    def values(index, components):
        accessor = doc['accessors'][index]
        assert accessor['componentType'] == 5126 and not accessor.get('normalized')
        assert accessor['type'] == f'VEC{components}' and not accessor.get('sparse')
        view = doc['bufferViews'][accessor['bufferView']]
        stride = view.get('byteStride', components * 4)
        start = accessor.get('byteOffset', 0)
        count = accessor['count']
        assert count > 0 and stride >= components * 4 and stride % 4 == start % 4 == 0
        assert start + (count - 1) * stride + components * 4 <= view['byteLength']
        rows = [struct.unpack_from('<' + 'f' * components, binary,
                view.get('byteOffset', 0) + start + i * stride) for i in range(count)]
        assert all(math.isfinite(v) for row in rows for v in row)
        return rows

    triangles, positions = 0, []
    for primitive in doc['meshes'][0]['primitives']:
        assert primitive.get('mode', 4) == 4 and 'indices' not in primitive
        assert 0 <= primitive['material'] < len(doc['materials'])
        attributes = primitive['attributes']
        assert set(attributes) == {'POSITION', 'NORMAL', 'COLOR_0'}
        pos = values(attributes['POSITION'], 3)
        normals = values(attributes['NORMAL'], 3)
        colors = values(attributes['COLOR_0'], 4)
        assert len(pos) == len(normals) == len(colors) and len(pos) % 3 == 0
        assert all(abs(sum(v * v for v in n) - 1) < 1e-4 for n in normals)
        assert all(all(0 <= v <= 1 for v in color) and color[3] == 1 for color in colors)
        assert len(set(colors)) > 1
        accessor = doc['accessors'][attributes['POSITION']]
        for axis in range(3):
            assert math.isclose(min(p[axis] for p in pos), accessor['min'][axis], abs_tol=1e-6)
            assert math.isclose(max(p[axis] for p in pos), accessor['max'][axis], abs_tol=1e-6)
        triangles += len(pos) // 3
        positions.extend(pos)
    assert 0 < triangles <= ceiling and triangles == expected
    dimensions = [max(p[i] for p in positions) - min(p[i] for p in positions) for i in range(3)]
    print(f'{path.name}: bytes={len(blob)} sha256={hashlib.sha256(blob).hexdigest()} '
          f'triangles={triangles}/{ceiling} dimensionsXYZ=' +
          'x'.join(f'{v:.6f}' for v in dimensions) + 'm mesh=1 materials=' +
          str(len(doc['materials'])) + ' static vertex-colors normals transforms=identity PASS')


def imports():
    vendor = GAME / 'vendor'
    for name, digest in VENDOR_HASHES.items():
        assert hashlib.sha256((vendor / name).read_bytes()).hexdigest() == digest, name
    pending, visited = ['GLTFLoader.js'], set()
    while pending:
        name = pending.pop()
        if name in visited:
            continue
        visited.add(name)
        source = (vendor / name).read_text()
        # These pinned upstream files have no dynamic imports or re-exports.
        assert not re.search(r'\bimport\s*\(', source)
        specs = re.findall(r'\b(?:import|export)\s+(?:[^;]*?\bfrom\s+)?[\'\"]([^\'\"]+)[\'\"]\s*;', source)
        for spec in specs:
            assert spec.startswith('./') and '/' not in spec[2:], spec
            assert (vendor / spec[2:]).is_file(), spec
            pending.append(spec[2:])
        print(f'{name} static imports: {specs}')
    assert visited == {'GLTFLoader.js', 'BufferGeometryUtils.js', 'three.module.js'}
    print('local static import closure + vendor/license hashes: PASS')


if __name__ == '__main__':
    assert __debug__, 'Assertions must be enabled'
    imports()
    for name, (ceiling, expected) in MODELS.items():
        audit(GAME / 'models' / name, ceiling, expected)
    assert not (GAME / 'models/arena-wall.glb').exists()
    print('arena-wall.glb: ABSENT; ceiling=2000; not a pass, no fabricated asset')
    print('supplied GLBs: 5/5 structural PASS; redistribution terms still pending')

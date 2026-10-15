"""Structural/size/determinism regression, stdlib only; does not prove rendering."""
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('generator', ROOT / 'generate-models.py')
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)

for make in (generator.interceptor, generator.trainer):
    generated = make()
    name = generated.doc['nodes'][0]['name']
    data = (ROOT.parent / 'models' / (name + '.glb')).read_bytes()
    assert data == generated.finish(), f'{name}: regenerate committed GLB'
    assert len(data) <= 200_000
    magic, version, total = struct.unpack_from('<4sII', data)
    assert (magic, version, total) == (b'glTF', 2, len(data))
    size, kind = struct.unpack_from('<I4s', data, 12)
    assert kind == b'JSON' and size % 4 == 0
    doc = json.loads(data[20:20+size])
    binary_size, kind = struct.unpack_from('<I4s', data, 20+size)
    assert kind == b'BIN\0' and binary_size % 4 == 0
    binary = data[28+size:]
    assert len(binary) == binary_size == doc['buffers'][0]['byteLength']
    assert not any(k in doc for k in ('images','textures','extensionsRequired'))
    assert all('uri' not in b for b in doc['buffers'])
    assert doc['extras']['forward'] == '-Z' and doc['extras']['up'] == '+Y'
    names = [n['name'] for n in doc['nodes']]
    assert len(names) == len(set(names))
    assert {'cockpit','gun_muzzle','wing_L','wing_R'} <= set(names)
    assert ('propeller' in names) == (name == 'astra-trainer')
    seen = set()
    def visit(i):
        assert i not in seen, 'cycle or multiply parented node'
        seen.add(i)
        for child in doc['nodes'][i].get('children', []):
            visit(child)
    visit(0)
    assert len(seen) == len(doc['nodes'])
    def values(index):
        a = doc['accessors'][index]
        view = doc['bufferViews'][a['bufferView']]
        width = {'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']]
        fmt = {5123:'H',5126:'f'}[a['componentType']]
        assert view['byteOffset'] % 4 == 0
        assert view['byteLength'] == a['count'] * width * struct.calcsize(fmt)
        assert view['byteOffset'] + view['byteLength'] <= len(binary)
        v = struct.unpack_from('<' + fmt * a['count'] * width, binary, view['byteOffset'])
        assert all(math.isfinite(n) for n in v)
        if 'min' in a:
            for k in range(width):
                assert abs(a['min'][k] - min(v[k::width])) < 1e-5
                assert abs(a['max'][k] - max(v[k::width])) < 1e-5
        return v
    triangles = 0
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            assert p['mode'] == 4
            positions = values(p['attributes']['POSITION'])
            normals = values(p['attributes']['NORMAL'])
            uv = values(p['attributes']['TEXCOORD_0'])
            idx = values(p['indices'])
            assert len(idx) % 3 == 0 and max(idx) < len(positions)//3
            assert len(normals) == len(positions) and len(uv)*3 == len(positions)*2
            for i in range(0,len(normals),3):
                assert abs(sum(x*x for x in normals[i:i+3])-1) < 1e-5
            for i in range(0,len(idx),3):
                a,b,c = [positions[j*3:j*3+3] for j in idx[i:i+3]]
                u,v = [[point[k]-a[k] for k in range(3)] for point in (b,c)]
                cross = (u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
                n = normals[idx[i]*3:idx[i]*3+3]
                assert sum(x*y for x,y in zip(cross,n)) > 1e-9, 'degenerate or inverted face'
            triangles += len(idx)//3
    assert triangles < 2000
    print(f'PASS {name}: {len(data)} bytes, {triangles} triangles, SHA256 {hashlib.sha256(data).hexdigest()}')

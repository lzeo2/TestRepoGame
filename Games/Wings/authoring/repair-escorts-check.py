#!/usr/bin/env python3
"""CPU geometry/material/pose regression, not a renderer or visual-realism gate."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import runpy
import struct
import zipfile
import zlib

HERE = Path(__file__).resolve().parent
WINGS = HERE.parent
G = runpy.run_path(str(HERE/'repair-escorts.py'))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def decode(data):
    magic, version, length = struct.unpack_from('<4sII', data)
    assert (magic, version, length) == (b'glTF', 2, len(data))
    size, kind = struct.unpack_from('<I4s', data, 12)
    assert kind == b'JSON'
    doc = json.loads(data[20:20+size])
    offset = 20+size
    size, kind = struct.unpack_from('<I4s', data, offset)
    assert kind == b'BIN\0' and offset+8+size == len(data)
    return doc, data[offset+8:]


def values(doc, binary, index):
    a = doc['accessors'][index]
    view = doc['bufferViews'][a['bufferView']]
    fmt = '<' + {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}[a['componentType']] * {
        'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'SCALAR': 1}[a['type']]
    size = struct.calcsize(fmt)
    stride = view.get('byteStride', size)
    start = view.get('byteOffset', 0)+a.get('byteOffset', 0)
    assert start+(a['count']-1)*stride+size <= view.get('byteOffset', 0)+view['byteLength']
    return [struct.unpack_from(fmt, binary, start+i*stride) for i in range(a['count'])]


def close(a, b, tolerance=2e-5):
    assert len(a) == len(b) and all(abs(x-y) < tolerance for x, y in zip(a, b)), (a, b)


def cross(a, b):
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]


def subtract(a, b):
    return [x-y for x, y in zip(a, b)]


def rotate(q, p):
    # Independent quaternion-vector implementation, not the generator's matrices.
    u = cross(q[:3], p)
    v = cross(q[:3], u)
    return [p[i]+2*(q[3]*u[i]+v[i]) for i in range(3)]


def world(doc, index, p):
    parents = {child: i for i, n in enumerate(doc['nodes']) for child in n.get('children', [])}
    while True:
        n = doc['nodes'][index]
        p = rotate(n.get('rotation', [0, 0, 0, 1]),
                   [x*y for x, y in zip(p, n.get('scale', [1, 1, 1]))])
        p = [x+y for x, y in zip(p, n.get('translation', [0, 0, 0]))]
        if index not in parents:
            return p
        index = parents[index]


def image_payload(doc, binary, image):
    assert 'uri' not in image and image['mimeType'] == 'image/png'
    view = doc['bufferViews'][image['bufferView']]
    start = view.get('byteOffset', 0)
    return binary[start:start+view['byteLength']]


def check_png(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    pos, packed, header, ended = 8, bytearray(), None, False
    while pos < len(data):
        size = struct.unpack_from('>I', data, pos)[0]
        kind = data[pos+4:pos+8]
        payload = data[pos+8:pos+8+size]
        assert len(payload) == size
        assert zlib.crc32(kind+payload) & 0xffffffff == struct.unpack_from('>I', data, pos+8+size)[0]
        if kind == b'IHDR':
            header = struct.unpack('>IIBBBBB', payload)
        elif kind == b'IDAT':
            packed.extend(payload)
        elif kind == b'IEND':
            ended = True
        pos += 12+size
    assert ended and pos == len(data)
    w, h, depth, color, compression, filtering, interlace = header
    assert w > 0 and h > 0 and depth == 8 and color in (2, 6)
    assert (compression, filtering, interlace) == (0, 0, 0)
    assert len(zlib.decompress(packed)) == h*(1+w*{2: 3, 6: 4}[color])


def segment_hits(a, b, box):
    low, high = 0, 1
    for i in range(3):
        delta = b[i]-a[i]
        if abs(delta) < 1e-9:
            if not box['min'][i] <= a[i] <= box['max'][i]:
                return False
        else:
            ends = sorted(((box['min'][i]-a[i])/delta, (box['max'][i]-a[i])/delta))
            low, high = max(low, ends[0]), min(high, ends[1])
            if low > high:
                return False
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    args = parser.parse_args()
    before_archive = digest(args.archive.read_bytes())
    before_models = {p.name: digest(p.read_bytes()) for p in (WINGS/'models').glob('*.glb')}
    first, second = G['generate'](args.archive), G['generate'](args.archive)
    assert first == second
    for relative, data in first.items():
        assert (WINGS/relative).read_bytes() == data, relative
    manifest = json.loads(first['authoring/model-repairs.json'])
    assert manifest['existing_model_sha256'] == before_models
    assert before_archive == manifest['archive_sha256'] == G['ARCHIVE_SHA256']
    assert manifest['permission']['basis'] == 'operator_report_and_scoped_authorization'
    expected_derivatives = {slug+'.glb' for slug in G['SOURCES']}
    actual_derivatives = {p.name for p in (WINGS/'models/derived').iterdir()}
    assert expected_derivatives <= actual_derivatives
    assert set(first) == {'authoring/model-repairs.json'} | {
        'models/derived/'+name for name in expected_derivatives}
    # Other workers own unrelated derived assets; they neither expand nor invalidate this check's scope.
    owned_names = lambda names: set(names) & expected_derivatives
    assert owned_names(actual_derivatives | {'unrelated-artifact.glb'}) == expected_derivatives
    triangles, images, poses = 0, 0, 0
    with zipfile.ZipFile(args.archive) as archive:
        for model in manifest['models']:
            source = archive.read(model['source_member'])
            assert digest(source) == model['source_sha256']
            original, source_bin = decode(source)
            data = first[model['file']]
            doc, binary = decode(data)
            assert digest(data) == model['sha256'] and len(data) == model['bytes']
            assert doc['buffers'] == original['buffers']
            assert 'uri' not in doc['buffers'][0] and len(binary) >= doc['buffers'][0]['byteLength']
            for view in doc['bufferViews']:
                assert view.get('buffer', 0) == 0
                assert view.get('byteOffset', 0)+view['byteLength'] <= len(binary)
            for i, a in enumerate(doc['accessors']):
                vs = values(doc, binary, i)
                assert all(math.isfinite(x) for v in vs for x in v)
                if 'min' in a:
                    close(a['min'], [min(v[j] for v in vs) for j in range(len(vs[0]))])
                    close(a['max'], [max(v[j] for v in vs) for j in range(len(vs[0]))])
            for material, old_material in zip(doc['materials'], original['materials']):
                pbr, old_pbr = material['pbrMetallicRoughness'], old_material['pbrMetallicRoughness']
                assert pbr['baseColorFactor'] == [1, 1, 1, 1]
                assert pbr['metallicFactor'] == pbr['roughnessFactor'] == 1
                for key in ['baseColorTexture', 'metallicRoughnessTexture']:
                    assert pbr[key] == old_pbr[key]
                assert material['normalTexture'] == old_material['normalTexture']
                assert material['alphaMode'] == 'OPAQUE'  # Mixed-atlas glass explicitly held, not faked.
            assert doc['textures'] == original['textures']
            assert doc['images'] == original['images']
            for image, old_image in zip(doc['images'], original['images']):
                payload = image_payload(doc, binary, image)
                assert payload == image_payload(original, source_bin, old_image)
                check_png(payload)
                images += 1
            names = {n['name']: i for i, n in enumerate(doc['nodes'])}
            root = doc['nodes'][names[model['root']]]
            assert root.get('translation', [0, 0, 0]) == [0, 0, 0]
            assert root.get('rotation', [0, 0, 0, 1]) == [0, 0, 0, 1]
            assert root.get('scale', [1, 1, 1]) == [1, 1, 1]
            assert model['waterline_y'] == 0 and not model['runtime_consumed']
            assert model['supported_runtime_weapon_capabilities'] == []
            all_points = []
            for i, old_node in enumerate(original['nodes']):
                node = doc['nodes'][i]
                close(node.get('translation', [0, 0, 0]),
                      G['reflect'](old_node.get('translation', [0, 0, 0])))
                if 'mesh' not in node:
                    continue
                for pr, old_pr in zip(doc['meshes'][node['mesh']]['primitives'],
                                      original['meshes'][old_node['mesh']]['primitives']):
                    ps = values(doc, binary, pr['attributes']['POSITION'])
                    old_ps = values(original, source_bin, old_pr['attributes']['POSITION'])
                    normals = values(doc, binary, pr['attributes']['NORMAL'])
                    old_normals = values(original, source_bin, old_pr['attributes']['NORMAL'])
                    assert values(doc, binary, pr['attributes']['TEXCOORD_0']) == values(
                        original, source_bin, old_pr['attributes']['TEXCOORD_0'])
                    for p, old_p, normal, old_normal in zip(ps, old_ps, normals, old_normals):
                        close(p, [old_p[0], old_p[1], -old_p[2]])
                        close(normal, [old_normal[0], old_normal[1], -old_normal[2]])
                        assert abs(sum(v*v for v in normal)-1) < .001
                        wp = world(doc, i, p)
                        op = world(original, i, old_p)
                        close(wp, [op[0], op[1], -op[2]])
                        all_points.append(wp)
                    ids = [v[0] for v in values(doc, binary, pr['indices'])]
                    old_ids = [v[0] for v in values(original, source_bin, old_pr['indices'])]
                    assert max(ids) < len(ps)
                    for j in range(0, len(ids), 3):
                        assert ids[j:j+3] == [old_ids[j], old_ids[j+2], old_ids[j+1]]
                        a, b, c = [ps[k] for k in ids[j:j+3]]
                        oa, ob, oc = [old_ps[k] for k in old_ids[j:j+3]]
                        old_cross = cross(subtract(ob, oa), subtract(oc, oa))
                        close(cross(subtract(b, a), subtract(c, a)),
                              [old_cross[0], old_cross[1], -old_cross[2]], .001)
                    triangles += len(ids)//3
            for key, fun in [('min', min), ('max', max)]:
                close(model['bounds'][key], [fun(p[j] for p in all_points) for j in range(3)])
            assert model['collision']['hull']['min'][1] < 0
            assert model['collision']['island_components']
            gun = model['main_gun_geometry']
            muzzle_index = names[gun['muzzle_node']]
            pitch_index, yaw_index = names[gun['pitch_node']], names[gun['yaw_node']]
            close(world(doc, muzzle_index, [0, 0, 0]), gun['muzzle_rest_root'])
            pitch_points = [p for pr in doc['meshes'][doc['nodes'][pitch_index]['mesh']]['primitives']
                            for p in values(doc, binary, pr['attributes']['POSITION'])]
            terminal = set(p for p in pitch_points if p[2] < min(q[2] for q in pitch_points)+.03)
            assert len(terminal) == 8
            close(gun['muzzle_pitch_local'], [sum(p[j] for p in terminal)/8 for j in range(3)])
            controls = {a['node']: a for a in model['articulation']}
            for yaw in [-.6, 0, .6]:
                for pitch in [-.45, -.225, 0]:
                    for index, angle in [(yaw_index, yaw), (pitch_index, pitch)]:
                        axis = controls[doc['nodes'][index]['name']]['axis_local']
                        doc['nodes'][index]['rotation'] = [x*math.sin(angle/2) for x in axis]+[math.cos(angle/2)]
                    muzzle = world(doc, muzzle_index, [0, 0, 0])
                    breech = world(doc, pitch_index, gun['breech_pitch_local'])
                    direction = G['unit'](subtract(muzzle, breech))
                    end = [muzzle[j]+direction[j]*10 for j in range(3)]
                    boxes = [model['collision']['hull'], model['collision']['deck']]+model['collision']['island_components']
                    for box in boxes:
                        assert not segment_hits(breech, end, box)
                    for p in pitch_points:
                        wp = world(doc, pitch_index, p)
                        assert not any(all(box['min'][j] <= wp[j] <= box['max'][j] for j in range(3)) for box in boxes)
                    if pitch < 0:
                        assert muzzle[1] > gun['muzzle_rest_root'][1]
                    poses += 1
            for name in ['port_propeller_1', 'starboard_propeller_2']:
                index = names[name]
                rest = doc['nodes'][index]['translation']
                assert (rest[0] < 0) == name.startswith('port_')
                assert rest[2] > 0 and rest[1] < 0
                axis = controls[name]['axis_local']
                assert axis == [0, 0, 1]
                doc['nodes'][index]['rotation'] = [x*math.sin(.4) for x in axis]+[math.cos(.4)]
                close(world(doc, index, [0, 0, 0]), rest)
                local = values(doc, binary, doc['meshes'][doc['nodes'][index]['mesh']]['primitives'][0]['attributes']['POSITION'])[0]
                posed = subtract(world(doc, index, local), rest)
                assert abs(sum(x*x for x in posed)-sum(x*x for x in local)) < .0001
                poses += 1
    assert digest(args.archive.read_bytes()) == before_archive
    assert {p.name: digest(p.read_bytes()) for p in (WINGS/'models').glob('*.glb')} == before_models
    print(f'PASS: 2 byte-reproducible derivatives; {triangles} triangles reflected/winding checked; {images} PNG maps byte-exact/CRC/decode checked; {poses} articulated poses/clearance checks; {len(before_models)} existing models and archive unchanged.')
    print('HOLD: mixed-atlas glass/material adapter, source-built FC/render integration, native/visual realism and gameplay acceptance. No weapons enabled.')


if __name__ == '__main__':
    main()

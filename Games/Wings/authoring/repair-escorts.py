#!/usr/bin/env python3
"""Deterministic, stdlib-only escort derivatives. Supply --archive; never extract it.

Run: python3 -B Games/Wings/authoring/repair-escorts.py --archive SOURCE_ZIP
Add --check for a write-free reproducibility check.
No runtime registration or weapon capability is enabled by this authoring tool.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import struct
import zipfile

HERE = Path(__file__).resolve().parent
WINGS = HERE.parent
ARCHIVE_SHA256 = '4e37a104ba356790f6f9a0632c99d34b77dc023649e3cab830d895ec55c471d8'
SOURCES = {
    'wings_type45_daring_class': 'd89013ab670d4669123efb69dcdd665ff5f18f9ee972569c999e3dc7725e4681',
    'wings_type054a_jiangkai_ii': 'a2afdbbd52f55420a29630f84643335ebec58504abe06100a70f98d58c5251ae',
}
FORMATS = {5121: 'B', 5123: 'H', 5125: 'I', 5126: 'f'}
WIDTHS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def unpack_glb(data):
    assert struct.unpack_from('<4sII', data) == (b'glTF', 2, len(data))
    size, kind = struct.unpack_from('<I4s', data, 12)
    assert kind == b'JSON'
    doc = json.loads(data[20:20 + size])
    offset = 20 + size
    size, kind = struct.unpack_from('<I4s', data, offset)
    assert kind == b'BIN\0' and offset + 8 + size == len(data)
    return doc, bytearray(data[offset + 8:])


def pack_glb(doc, binary):
    text = json.dumps(doc, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode()
    text += b' ' * (-len(text) % 4)
    binary = bytes(binary) + b'\0' * (-len(binary) % 4)
    return (struct.pack('<4sII', b'glTF', 2, 28 + len(text) + len(binary))
            + struct.pack('<I4s', len(text), b'JSON') + text
            + struct.pack('<I4s', len(binary), b'BIN\0') + binary)


def accessor(doc, binary, index):
    a = doc['accessors'][index]
    assert 'sparse' not in a
    view = doc['bufferViews'][a['bufferView']]
    fmt = '<' + FORMATS[a['componentType']] * WIDTHS[a['type']]
    stride = view.get('byteStride', struct.calcsize(fmt))
    start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    assert start + (a['count'] - 1) * stride + struct.calcsize(fmt) <= view.get('byteOffset', 0) + view['byteLength']
    return [struct.unpack_from(fmt, binary, start + i * stride) for i in range(a['count'])]


def store_accessor(doc, binary, index, values):
    a = doc['accessors'][index]
    view = doc['bufferViews'][a['bufferView']]
    fmt = '<' + FORMATS[a['componentType']] * WIDTHS[a['type']]
    stride = view.get('byteStride', struct.calcsize(fmt))
    start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    assert len(values) == a['count']
    for i, value in enumerate(values):
        struct.pack_into(fmt, binary, start + i * stride, *value)
    if 'min' in a or 'max' in a:
        a['min'] = [min(v[j] for v in values) for j in range(len(values[0]))]
        a['max'] = [max(v[j] for v in values) for j in range(len(values[0]))]


def reflect(v):
    return [v[0], v[1], -v[2]]


def unit(v):
    length = math.sqrt(sum(x * x for x in v))
    assert length > 0
    return [x / length for x in v]


def bounds(points):
    return {'min': [min(p[j] for p in points) for j in range(3)],
            'max': [max(p[j] for p in points) for j in range(3)]}


def node_matrix(node):
    assert 'matrix' not in node, 'TRS-only input contract'
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    sx, sy, sz = node.get('scale', [1, 1, 1])
    tx, ty, tz = node.get('translation', [0, 0, 0])
    return [[(1-2*y*y-2*z*z)*sx, (2*x*y-2*z*w)*sy, (2*x*z+2*y*w)*sz, tx],
            [(2*x*y+2*z*w)*sx, (1-2*x*x-2*z*z)*sy, (2*y*z-2*x*w)*sz, ty],
            [(2*x*z-2*y*w)*sx, (2*y*z+2*x*w)*sy, (1-2*x*x-2*y*y)*sz, tz],
            [0, 0, 0, 1]]


def multiply(a, b):
    return [[sum(a[i][k]*b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def point(matrix, p):
    return [sum(matrix[j][k]*p[k] for k in range(3)) + matrix[j][3] for j in range(3)]


def world_matrices(doc):
    parents = {child: i for i, n in enumerate(doc['nodes']) for child in n.get('children', [])}
    cache = {}
    def world(i):
        if i not in cache:
            local = node_matrix(doc['nodes'][i])
            cache[i] = multiply(world(parents[i]), local) if i in parents else local
        return cache[i]
    return [world(i) for i in range(len(doc['nodes']))]


def node_points(doc, binary, node):
    return [p for pr in doc['meshes'][node['mesh']]['primitives']
            for p in accessor(doc, binary, pr['attributes']['POSITION'])]


def component_bounds(doc, binary, node):
    # ponytail: exact position welds fit these two pinned meshes; authored partitions if topology changes.
    result = []
    for pr in doc['meshes'][node['mesh']]['primitives']:
        ps = accessor(doc, binary, pr['attributes']['POSITION'])
        ids = [v[0] for v in accessor(doc, binary, pr['indices'])]
        parent = list(range(len(ps)))
        def root(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i
        def join(i, j):
            parent[root(i)] = root(j)
        seen = {}
        for i, p in enumerate(ps):
            if p in seen:
                join(i, seen[p])
            else:
                seen[p] = i
        for i in range(0, len(ids), 3):
            join(ids[i], ids[i+1])
            join(ids[i], ids[i+2])
        groups = {}
        for i, p in enumerate(ps):
            groups.setdefault(root(i), []).append(p)
        result.extend(bounds(ps) for ps in groups.values())
    return result


def derive(source, slug):
    doc, binary = unpack_glb(source)
    assert not doc.get('skins') and not doc.get('animations')
    assert len(doc['buffers']) == 1 and 'uri' not in doc['buffers'][0]
    attributes, indices = {}, set()
    for mesh in doc['meshes']:
        for pr in mesh['primitives']:
            assert pr.get('mode', 4) == 4 and not pr.get('targets')
            for name, index in pr['attributes'].items():
                if index in attributes:
                    assert attributes[index] == name
                attributes[index] = name
            indices.add(pr['indices'])
    for index, name in attributes.items():
        values = accessor(doc, binary, index)
        if name in ('POSITION', 'NORMAL'):
            assert doc['accessors'][index]['componentType'] == 5126
            store_accessor(doc, binary, index, [reflect(v) for v in values])
        elif name == 'TANGENT':
            store_accessor(doc, binary, index, [reflect(v[:3]) + [-v[3]] for v in values])
        else:
            assert name.startswith('TEXCOORD_'), name
    # The propellers share an index accessor: reverse each unique accessor only once.
    for index in indices:
        values = accessor(doc, binary, index)
        assert len(values) % 3 == 0
        for i in range(0, len(values), 3):
            values[i+1], values[i+2] = values[i+2], values[i+1]
        store_accessor(doc, binary, index, values)
    for n in doc['nodes']:
        assert 'matrix' not in n
        if 'translation' in n:
            n['translation'] = reflect(n['translation'])
        if 'rotation' in n:
            x, y, z, w = n['rotation']
            n['rotation'] = [-x, -y, z, w]
    # Explicit glTF defaults preserve atlas response; do not tint or destroy its mixed finishes.
    for material in doc['materials']:
        pbr = material.setdefault('pbrMetallicRoughness', {})
        pbr.setdefault('baseColorFactor', [1, 1, 1, 1])
        pbr.setdefault('metallicFactor', 1)
        pbr.setdefault('roughnessFactor', 1)
        material.setdefault('alphaMode', 'OPAQUE')
        material.setdefault('extras', {})['repair_role'] = 'mixed_naval_atlas_preserve_maps'
    nodes = {n['name']: n for n in doc['nodes']}
    root = nodes['vessel_root_waterline']
    assert node_matrix(root) == node_matrix({})
    root.setdefault('extras', {}).update(asset_forward='glTF -Z',
                                        repair_source_id='wings.original.' + slug + '.v1')
    pitch = nodes['main_turret_pitch']
    ps = node_points(doc, binary, pitch)
    # These pinned barrels have an eight-point terminal ring; average UNIQUE ring points, not extrema.
    front = min(p[2] for p in ps)
    ring = sorted(set(p for p in ps if p[2] < front + .03))
    assert len(ring) == 8
    muzzle = [sum(p[j] for p in ring)/len(ring) for j in range(3)]
    breech_ring = sorted(set(p for p in ps if abs(p[2]) < .02))
    assert len(breech_ring) == 8
    breech = [sum(p[j] for p in breech_ring)/len(breech_ring) for j in range(3)]
    direction = unit([muzzle[j]-breech[j] for j in range(3)])
    pitch.setdefault('children', []).append(len(doc['nodes']))
    doc['nodes'].append({'name': 'main_gun_muzzle', 'translation': muzzle,
                         'extras': {'repair_role': 'geometry_derived_anchor_not_weapon_registration'}})
    matrices = world_matrices(doc)
    world_ps = [point(matrices[i], p) for i, n in enumerate(doc['nodes']) if 'mesh' in n
                for p in node_points(doc, binary, n)]
    static = nodes['static_hull_deck_superstructure']
    components = component_bounds(doc, binary, static)
    extent = bounds(world_ps)
    length = extent['max'][2]-extent['min'][2]
    hulls = [b for b in components if b['min'][1] < 0 < b['max'][1]
             and b['max'][2]-b['min'][2] > length*.9]
    assert len(hulls) == 1
    hull = hulls[0]
    deck_y = hull['max'][1]
    decks = [b for b in components if b['min'][1] >= deck_y-.3
             and b['max'][1]-b['min'][1] < .5 and b['max'][2]-b['min'][2] > length*.9]
    assert len(decks) == 1
    # Conservative major above-deck solid boxes, not claimed semantic sensor identification.
    islands = [b for b in components if b['min'][1] >= deck_y-.001
               and all(b['max'][j]-b['min'][j] >= 2 for j in range(3))]
    assert islands
    articulation = []
    for name, axis, limits in [('main_turret_yaw', [0, -1, 0], [-.6, .6]),
                               ('main_turret_pitch', [-1, 0, 0], [-.45, 0]),
                               ('port_propeller_1', [0, 0, 1], None),
                               ('starboard_propeller_2', [0, 0, 1], None)]:
        node = nodes[name]
        entry = {'node': name, 'axis_local': axis,
                 'rest_translation': node.get('translation', [0, 0, 0]),
                 'bounds_local': bounds(node_points(doc, binary, node))}
        if limits is not None:
            entry['limits_rad'] = limits
            entry['limits_basis'] = 'conservative_authoring_test_envelope_not_real_mechanical_limits'
        articulation.append(entry)
    payload = pack_glb(doc, binary)
    descriptor = {
        'source_model_id': 'wings.original.' + slug + '.v1',
        'source_member': 'models/' + slug + '.glb', 'source_sha256': sha(source),
        'file': 'models/derived/' + slug + '.glb', 'sha256': sha(payload), 'bytes': len(payload),
        'axes': {'forward': '-Z', 'up': '+Y', 'right': '+X', 'meters': True},
        'root': 'vessel_root_waterline', 'waterline_y': 0,
        'objective_only': True, 'player_vehicle_kind': None, 'runtime_consumed': False,
        'bounds': extent, 'articulation': articulation,
        'main_gun_geometry': {
            'yaw_node': 'main_turret_yaw', 'pitch_node': 'main_turret_pitch',
            'muzzle_node': 'main_gun_muzzle', 'muzzle_pitch_local': muzzle,
            'breech_pitch_local': breech, 'bore_direction_pitch_local': direction,
            'muzzle_rest_root': point(matrices[-1], [0, 0, 0]),
            'derivation': 'centers_of_eight_unique_terminal_and_breech_ring_vertices',
            'proposed_adapter_binding': 'gun_fwd', 'capability_enabled': False,
            'clearance_scope': 'test_envelope_barrel_and_forward_bore_clear_of_static_hull_and_major_islands',
        },
        'collision': {'basis': 'geometry_component_aabbs_conservative_not_exact_hull',
                      'hull': hull, 'deck': decks[0], 'island_components': islands,
                      'island_bounds': bounds([p for b in islands for p in [b['min'], b['max']]]),
                      'held': 'fine_fittings_and_posed_turret_collision_need_adapter_policy'},
        'materials': {'role': 'mixed_naval_atlas', 'embedded_maps_preserved': True,
                      'factor_change': 'explicit_gltf_defaults_only',
                      'glass': 'held_mixed_opaque_atlas_requires_authored_partition_or_converter',
                      'existing_fleet_converter': 'held_discards_uv_and_maps'},
        'supported_runtime_weapon_capabilities': [],
        'holds': ['source_built_render_and_FC_adapter_not_delivered',
                  'no_inferred_AA_ASW_missile_sensor_or_torpedo_capability',
                  'no_visual_realism_native_performance_or_gameplay_acceptance'],
    }
    return payload, descriptor


def generate(archive):
    archive_data = Path(archive).read_bytes()
    assert sha(archive_data) == ARCHIVE_SHA256, 'unexpected supplied archive'
    outputs, models = {}, []
    with zipfile.ZipFile(archive) as z:
        for slug, expected in SOURCES.items():
            source = z.read('models/' + slug + '.glb')
            assert sha(source) == expected
            payload, descriptor = derive(source, slug)
            outputs[descriptor['file']] = payload
            models.append(descriptor)
    manifest = {
        'schema': 'wings_derived_escort_assets_v1', 'archive_name': 'Wings_Base_30_Models.zip',
        'archive_sha256': ARCHIVE_SHA256,
        'permission': {'basis': 'operator_report_and_scoped_authorization',
                       'report': 'Operator reports creating supplied models with GPT and grants scoped Wings use.',
                       'limits': 'Not independent originality verification or upstream game-code rights clearance.'},
        'conversion': {'positions_normals': '[x,y,-z]', 'tangent': '[x,y,-z,-w]',
                       'winding': 'swap_triangle_indices_1_2_once_per_accessor',
                       'local_transform': 'C*M*C; C=diag(1,1,-1,1)',
                       'quaternion_xyzw': '[-qx,-qy,qz,qw]', 'signed_axis': '[-ax,-ay,az]'},
        'existing_model_sha256': {p.name: sha(p.read_bytes()) for p in sorted((WINGS/'models').glob('*.glb'))},
        'models': models,
    }
    outputs['authoring/model-repairs.json'] = (json.dumps(manifest, indent=2, allow_nan=False) + '\n').encode()
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', required=True, type=Path)
    parser.add_argument('--check', action='store_true', help='compare in memory; write nothing')
    args = parser.parse_args()
    outputs = generate(args.archive)
    size = sum(map(len, outputs.values()))
    assert size < 4_000_000
    if args.check:
        for relative, data in outputs.items():
            assert (WINGS/relative).read_bytes() == data, relative
        print('PASS: two escort derivatives and descriptor reproduce byte-exact; no writes')
        return
    assert shutil.disk_usage(WINGS).free - size >= 2**31, '2 GiB floor would be crossed'
    for relative, data in outputs.items():
        path = WINGS/relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    print(f'WROTE: two escort derivatives and descriptor; {size} bytes total')


if __name__ == '__main__':
    main()

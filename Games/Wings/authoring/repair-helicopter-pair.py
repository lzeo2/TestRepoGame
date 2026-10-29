#!/usr/bin/env python3
"""Pinned helicopter intake. Default preflight refuses known source collisions.

No derivative/manifest is emitted. --intake-only preserves originals and blocker
record, not clearance acceptance. Stdlib only; no supplied code is executed.
"""
import argparse
import importlib.util
import json
import math
from pathlib import Path
import shutil
import sys
import zipfile

HERE = Path(__file__).resolve().parent
WINGS = HERE.parent
spec = importlib.util.spec_from_file_location('fighters', HERE/'repair-fighter-pair.py')
f = importlib.util.module_from_spec(spec)
spec.loader.exec_module(f)
g = f.g
SOURCES = {
    'ah64d': ('ah-64d-apache', '01965a9e0fd16e57483f6bbda7ffadb2299f773396bb3c3045351acee4ea0a59', 172724, 3588, 4),
    'mi28n': ('mi-28n', 'dc193d170b343ec1ca8075684b2eb5ec418b833ffbd8d1ae063be3d7ab7d0634', 169772, 3296, 5),
}
POSES = {
    'ah64d': [('tail_rotor_spin', 'x', math.radians(40), 'horizontal_tail')],
    'mi28n': [('main_rotor_spin', 'y', math.radians(55), 'vertical_fin'),
              ('tail_rotor_spin', 'x', 0., 'horizontal_tail')],
}
INTAKE = frozenset({'authoring/supplied-helicopters/repair-record.json'} |
    {'models/supplied/'+v[0]+'.glb' for v in SOURCES.values()} |
    {'authoring/supplied-helicopters/rigs/'+v[0]+'.json' for v in SOURCES.values()})
FORBIDDEN = ('authoring/native-helicopter-pair.json', 'models/derived/wings_ah64d.glb',
             'models/derived/wings_mi28n.glb')
# Literal pins from 1a1f674d. Reuse the existing 54-GLB map, but pin the map itself.
assert g.sha(f.encoded(f.RETAINED_BASELINES)) == '7cd59750d840218141ced0986d5c3447a0ff8aa3c7e963f4d3ba053e4e652f2a'
FROZEN = {'models/'+name: sha for name, sha in f.RETAINED_BASELINES.items()}
FROZEN.update({
    'models/supplied/j-20.glb': '9d70ac66e30c70a69c76b8e0c7c0151a74a4e5ab9f12691cef738b816707b862',
    'models/derived/wings_j20.glb': '5fcabcc098e29d6c844b0b44f3c8ead56925553ce2b005850e84828d27863b1c',
    'models/supplied/wings_admiral_kuznetsov_project1143_5.glb': '566d2422ca21b208a37b0d11f929ac4058613912e4a78aa12f6f70a6e19143d4',
    'models/derived/wings_admiral_kuznetsov_project1143_5.glb': '922e49409191a903830a72e38c9f082d30613648ac91efb6ad92a24d43697ff7',
    'models/supplied/wings_charles_de_gaulle_r91.glb': '710d89240f0493d66d7e0982fc8cad4d9e5485a4ca6cd819420ff3452dd50610',
    'models/derived/wings_charles_de_gaulle_r91.glb': 'c29b71d3299927d13198a1c7b61abb77d3959203d506b2c95c9056b1347b55f7',
    'models/supplied/wings_liaoning_type001.glb': '62efc4a166bf3d53a197aa43dd92f7a4e21cd3b2eccb49fa0a0f4b24a0ee116a',
    'models/derived/wings_liaoning_type001.glb': '3d0f0f05afc77ff7a1b5069a4da1634adf6779f13c76b1bd33cc0199f4ecd1d3',
    'models/supplied/wings_queen_elizabeth_class.glb': 'e631d38a98fff7c75220d818ab5ed6f20dc9097d56749ae7bdd5cbf536ed23e7',
    'models/derived/wings_queen_elizabeth_class.glb': 'a11cdaedf40116d9ae92bad1cfa07a71c8ccbb5d5e2273ca2a646bdd9b855661',
    'authoring/native-fighter-pair.json': '572f734f275113528ac39f495215329d8500819ee213fb04e9f063102d88d7ee',
    'authoring/supplied-fighters/repair-record.json': 'c3e462ff6fdd004fd590cd819d0b9d5ab0367082d862eb5fcea0f14471822c4b',
    'authoring/extended-escort-models.json': '1268b5c4a6928374c46f532cfb8b5e2348395722bb3c8353a8b4862d7b316afa',
    '../../docs/wings-local-native/declared-rafale-yak-flight.json': '716ea1930603c814d99451edc6a5d84907b2a3e13831929332bbc0ec91169d3b',
    '../../docs/wings-local-native/eight-aircraft-coalition-flight.json': 'd44fe4c62dd668d14efd78d8054b57191c09323fa9345df1d4ba54b9a64f84e2',
    '../../docs/wings-local-native/expanded-coalition-flight.json': '1217053e46f801b5c32ac62cf7452310adbee1c33eb4766c1e5e326dd36bd495',
    '../../docs/wings-local-native/fifteen-aircraft-coalition-flight.json': '116adc7b5cd60db66f7fb098303019a351d68823847ff58e68468abfc8e052a4',
    '../../docs/wings-local-native/five-vessel-coalition-flight.json': 'f2ea0d441b840b5d8369ba6321d8c9181962899cf11c2b3b0f2fb0f4195940aa',
    '../../docs/wings-local-native/four-vessel-coalition-flight.json': '337a8b7d46a93c2d46aa0c411f331e807b5636a130b5c4472d3887e4fcaf75d2',
    '../../docs/wings-local-native/fourteen-aircraft-coalition-flight.json': 'c618ab2c038dcfda3de238f782d963dc7157cfa9346b4733e1724d7f5e79b042',
    '../../docs/wings-local-native/named-coalition-flight.json': '336a364d963c444ae776384e5f48cb14316e7302ddae6c0a183625b970ed6875',
    '../../docs/wings-local-native/six-aircraft-coalition-flight.json': '3af0e56be119b8d741fc3cc6699a31467f5ecf10798bdeba2d3c662618603fc7',
    '../../docs/wings-local-native/six-vessel-coalition-flight.json': '39ed270b768b420960375d2dcff4bce8a3723446ad4de5261135292e3a9984a8',
    '../../docs/wings-local-native/sixteen-aircraft-coalition-flight.json': '996e2591e6d96f2e10ce8e77cffefe3ea1e66df8b29b86c23623b3730fc4af52',
    '../../docs/wings-local-native/ten-aircraft-coalition-flight.json': 'f0f56c58e3ee0ac49ebf109767916e9edb1806db1d776b2651e38ff3891bf5c9',
    '../../docs/wings-local-native/thirteen-aircraft-coalition-flight.json': '18a55cea665f0110a67b4a2e61ecdca2a98abc55369d1f75ad2fdd162954a477',
    '../../docs/wings-local-native/twelve-aircraft-coalition-flight.json': '10506035b63e57da90a51b9accb976bdf8dc04abcf87e11cd5191bb6e1f4a0ec',
})
PINNED_INTAKE = {
    'models/supplied/ah-64d-apache.glb': SOURCES['ah64d'][1],
    'models/supplied/mi-28n.glb': SOURCES['mi28n'][1],
    'authoring/supplied-helicopters/rigs/ah-64d-apache.json': 'bdf811d33a26909e59a1aca3ebd69fe77a9818d1878e9d509b1590706a2a9788',
    'authoring/supplied-helicopters/rigs/mi-28n.json': 'af901c10cff01b8b6f23431844ecec592a49b396d443d7bd3d9e37d18cd04c57',
    'authoring/supplied-helicopters/repair-record.json': '59dac119590a4f6fbb0c3f1e66a539f98ec8b0cd930fadf9b9b09c875e9f9aed',
}
TOL = 1e-7


def dot(a, b):
    return sum(x*y for x, y in zip(a, b))


def subtract(a, b):
    return [x-y for x, y in zip(a, b)]


def segment_triangle(a, b, tri):
    """Plane intersection plus barycentric containment; excludes edge endpoints."""
    p, q, r = tri
    u, v, direction = subtract(q, p), subtract(r, p), subtract(b, a)
    normal = f.cross(u, v)
    denominator = dot(normal, direction)
    if abs(denominator) < 1e-12:
        return None
    t = dot(normal, subtract(p, a))/denominator
    if not TOL < t < 1-TOL:
        return None
    point = [a[j]+t*direction[j] for j in range(3)]
    w = subtract(point, p)
    uu, uv, vv, wu, wv = dot(u, u), dot(u, v), dot(v, v), dot(w, u), dot(w, v)
    det = uu*vv-uv*uv
    if abs(det) < 1e-16:
        return None
    s, h = (vv*wu-uv*wv)/det, (uu*wv-uv*wu)/det
    return point if s >= -TOL and h >= -TOL and s+h <= 1+TOL else None


def within(tri, bounds):
    return all(bounds['min'][j]-1e-6 <= p[j] <= bounds['max'][j]+1e-6
               for p in tri for j in range(3))


def world_triangles(doc, binary, index):
    matrix = g.world_matrices(doc)[index]
    return [[g.point(matrix, p) for p in tri]
            for tri in f.triangles(doc, binary, doc['nodes'][index])]


def target_component(doc, binary, static, region, side):
    paint = [p for p in doc['meshes'][static['mesh']]['primitives'] if p['material'] == 0]
    temp = dict(doc, meshes=[{'primitives': paint}])
    candidates = []
    for box in g.component_bounds(temp, binary, {'mesh': 0}):
        dims = subtract(box['max'], box['min'])
        if box['min'][2] <= 5:
            continue
        if region == 'vertical_fin' and dims[0] < .2 and dims[1] > 1.5:
            candidates.append(box)
        elif region == 'horizontal_tail' and dims[0] > 1.5 and dims[1] < .2 and dims[2] > 1:
            if (box['min'][0] < 0) == (side < 0):
                candidates.append(box)
    assert len(candidates) == 1, (region, candidates)
    return candidates[0]


def collision_witness(doc, binary, rotor, axis, angle, region):
    names = {n['name']: i for i, n in enumerate(doc['nodes'])}
    node = doc['nodes'][names[rotor]]
    assert 'rotation' not in node
    pivot = g.point(g.world_matrices(doc)[names[rotor]], [0, 0, 0])
    target = target_component(doc, binary, doc['nodes'][names['airframe_static']], region, pivot[0])
    body = world_triangles(doc, binary, names['airframe_static'])
    targets = [(i, t) for i, t in enumerate(body) if within(t, target)]
    assert targets
    q = [0., 0., 0., math.cos(angle/2)]
    q['xyz'.index(axis)] = math.sin(angle/2)
    node['rotation'] = q
    try:
        child = node['children'][0]
        for ri, tri in enumerate(world_triangles(doc, binary, child)):
            rb = g.bounds(tri)
            for bi, bodytri in targets:
                bb = g.bounds(bodytri)
                if any(rb['max'][j] < bb['min'][j] or rb['min'][j] > bb['max'][j] for j in range(3)):
                    continue
                for edge_mesh, edges, surface in [('rotor', tri, bodytri), ('static', bodytri, tri)]:
                    for edge, (a, b) in enumerate(zip(edges, edges[1:]+edges[:1])):
                        point = segment_triangle(a, b, surface)
                        if point is not None:
                            return {'rotor': rotor, 'axis': axis, 'angle_rad': angle,
                                    'pivot_root_m': pivot, 'static_component': region,
                                    'static_component_bounds': target,
                                    'rotor_mesh_node': doc['nodes'][child]['name'],
                                    'rotor_triangle_index': ri, 'static_triangle_index': bi,
                                    'edge_mesh': edge_mesh, 'edge_index': edge,
                                    'rotor_triangle_root_m': tri, 'static_triangle_root_m': bodytri,
                                    'intersection_root_m': point}
    finally:
        node.pop('rotation')
    raise AssertionError('pinned source collision no longer reproduced: '+rotor)


def inspect(source, rig_bytes, kind):
    slug, expected, size, triangles, blades = SOURCES[kind]
    assert len(source) == size and g.sha(source) == expected, kind
    doc, binary = g.unpack_glb(source)
    assert not doc.get('skins') and not doc.get('animations')
    assert all('uri' not in r for r in doc['buffers']+doc['images'])
    assert sum(len(g.accessor(doc, binary, p['indices']))//3
               for m in doc['meshes'] for p in m['primitives']) == triangles
    rig = json.loads(rig_bytes)
    assert rig['model_id'] == 'wings.original.'+slug+'.v1'
    names = {n['name']: i for i, n in enumerate(doc['nodes'])}
    assert set(names) == {'vehicle_root', 'airframe_static', 'main_rotor_spin', 'main_rotor_blade_assembly',
                          'tail_rotor_spin', 'tail_rotor_blade_assembly', 'main_wheel_L', 'main_wheel_R', 'tailwheel'}
    root = names['vehicle_root']
    assert doc['scenes'][doc.get('scene', 0)]['nodes'] == [root]
    assert set(doc['nodes'][root]['children']) == {names[n] for n in names
        if n not in ('vehicle_root', 'main_rotor_blade_assembly', 'tail_rotor_blade_assembly')}
    for prefix in ('main', 'tail'):
        assert doc['nodes'][names[prefix+'_rotor_spin']]['children'] == [names[prefix+'_rotor_blade_assembly']]
    assert g.node_matrix(doc['nodes'][root]) == g.node_matrix({})
    assert all(n.get('scale', [1, 1, 1]) == [1, 1, 1] for n in doc['nodes'])
    f.orient(doc, binary)  # Shared reflection, axial axes, winding and accessor helpers.
    matrices = g.world_matrices(doc)
    assert {c['node'] for c in rig['controls']} == {'main_rotor_spin', 'tail_rotor_spin', 'main_wheel_L', 'main_wheel_R', 'tailwheel'}
    for control in rig['controls']:
        node = doc['nodes'][names[control['node']]]
        assert node['translation'] == g.reflect(control['pivot_world_m'])
        axis = control['suggested_local_rotation_axis']
        assert node['extras']['control_axis_gltf'] == [-axis[0], -axis[1], axis[2]]
    for prefix, count in [('main', blades), ('tail', 4)]:
        components = g.component_bounds(doc, binary, doc['nodes'][names[prefix+'_rotor_blade_assembly']])
        if prefix == 'main':
            actual = sum(b['max'][1]-b['min'][1] < .1 and
                         max(b['max'][j]-b['min'][j] for j in (0, 2)) > 3 for b in components)
        else:
            actual = sum(b['max'][0]-b['min'][0] < .04 and
                         max(b['max'][j]-b['min'][j] for j in (1, 2)) > 1 for b in components)
        assert actual == count, (kind, prefix, actual)
    sweeps = []
    for rotor, axis in [('main_rotor_spin', 'y'), ('tail_rotor_spin', 'x')]:
        ni = names[rotor]
        pivot = g.point(matrices[ni], [0, 0, 0])
        points = [p for t in world_triangles(doc, binary, doc['nodes'][ni]['children'][0]) for p in t]
        fixed = 'xyz'.index(axis)
        radial = [j for j in range(3) if j != fixed]
        radius = max(math.hypot(*(p[j]-pivot[j] for j in radial)) for p in points)
        bounds = g.bounds(points)
        for j in radial:
            bounds['min'][j], bounds['max'][j] = pivot[j]-radius, pivot[j]+radius
        sweeps.append({'node': rotor, 'axis': axis, 'pivot_root_m': pivot,
                       'continuous_360_bounds_root_m': bounds})
    witnesses = [collision_witness(doc, binary, *pose) for pose in POSES[kind]]
    return {'source_model_id': rig['model_id'], 'source_sha256': expected,
            'rig_sha256': g.sha(rig_bytes), 'source_bytes': size, 'source_triangles': triangles,
            'main_blades': blades, 'tail_blades': 4, 'rotor_sweeps': sweeps,
            'clearance': 'FAIL_SOURCE_ROTOR_BODY_COLLISION', 'witnesses': witnesses}


def generate_intake(archive):
    # Reuse the existing complete archive validator: pinned size/SHA, safe paths,
    # CRC, every manifest hash; only data is read, never supplied code.
    assert Path(archive).stat().st_size == 3_114_212, 'archive size'
    f.archive_members(archive)
    outputs, reports = {}, {}
    with zipfile.ZipFile(archive) as z:
        for kind, (slug, *_) in SOURCES.items():
            source, rig = z.read('models/'+slug+'.glb'), z.read('rigs/'+slug+'.json')
            reports[kind] = inspect(source, rig, kind)
            outputs['models/supplied/'+slug+'.glb'] = source
            outputs['authoring/supplied-helicopters/rigs/'+slug+'.json'] = rig
    outputs['authoring/supplied-helicopters/repair-record.json'] = f.encoded({
        'schema': 'wings_helicopter_blocked_intake_v1', 'status': 'BLOCKED_SOURCE_CLEARANCE',
        'archive_sha256': f.ARCHIVE_SHA256, 'frozen_source_pin': '1a1f674d',
        'frame': 'meters; +X right; +Y up; -Z forward; positive right-handed axis radians',
        'intersection_tolerance': TOL,
        'method': 'actual posed edge/triangle plane intersection and barycentric containment; continuous rotor envelopes recorded separately',
        'qualification': 'User reports GPT-generated originals and scoped use/repair permission; no independent rights, accuracy, native or hardware acceptance.',
        'resolution': 'Corrected supplied geometry or explicit contract change required. No blade trimming, pivot moves, gun/turret/gear/sensor invention or collision waiver.',
        'not_published': list(FORBIDDEN), 'models': reports})
    assert set(outputs) == INTAKE
    assert sum(map(len, outputs.values())) < 1_300_000
    return outputs


def validate_outputs(outputs):
    assert set(outputs) == INTAKE, 'intake output allowlist mismatch'
    assert all(isinstance(data, bytes) for data in outputs.values()), 'bytes required'
    assert sum(map(len, outputs.values())) < 1_300_000, 'intake size exceeded'
    for name, data in outputs.items():
        assert g.sha(data) == PINNED_INTAKE[name], 'corrupt intake output: '+name
        assert not name.endswith('.glb') or len(data) < 512_000, 'GLB size exceeded'
        p = WINGS/name
        assert not any(parent.is_symlink() for parent in [p, *p.parents]), 'symlink destination'
        assert not p.exists() or p.read_bytes() == data, 'refusing different existing intake: '+name
    for name, expected in FROZEN.items():
        assert g.sha((WINGS/name).read_bytes()) == expected, 'retained file changed: '+name
    present = [name for name in FORBIDDEN if (WINGS/name).exists()]
    if present:
        assert set(present) == set(FORBIDDEN), 'partial helicopter consumables'
        # Only the distinct clearance generator's literal SHA/size-approved
        # manifest and two derivatives may coexist. Raw default stays BLOCKED.
        spec = importlib.util.spec_from_file_location('accepted_helicopter_clearance', HERE/'repair-helicopter-clearance.py')
        accepted = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(accepted)
        accepted.validate_accepted_existing()
    assert shutil.disk_usage(WINGS).free-sum(map(len, outputs.values())) >= 2**31, 'disk floor'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--intake-only', action='store_true')
    args = parser.parse_args()
    # Check disk before archive allocation or output preparation; never create dirs here.
    assert shutil.disk_usage(WINGS).free >= 2**31, 'disk floor'
    outputs = generate_intake(args.archive)
    validate_outputs(outputs)
    if not args.intake_only:
        print('BLOCKED: source rotor/body collision: AH64D tail at 40deg; Mi28N main at 55deg and tail at rest. No mkdir/write.', file=sys.stderr)
        return 1
    for name, data in outputs.items():
        p = WINGS/name
        if p.exists():
            continue
        # Recheck the floor immediately before each growth operation.
        assert shutil.disk_usage(WINGS).free-len(data) >= 2**31, 'disk floor'
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
    print(f'INTAKE ONLY: {len(outputs)} exact originals/rigs/blocker-record files; source clearance FAIL; no native manifest or derivatives')
    return 0


if __name__ == '__main__':
    sys.exit(main())

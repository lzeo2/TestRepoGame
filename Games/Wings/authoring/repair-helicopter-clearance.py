#!/usr/bin/env python3
"""Reproduce the distinct connected-source repair, fitted stores and native manifest.

--check is byte-exact/read-only. --diagnostic reproduces the historical FAILED
fin-only record, never overwriting it. Acceptance uses continuous geometry proof,
not rotor-angle sampling, and does not certify real aircraft or native gameplay.
"""
import argparse
import copy
import importlib.util
import math
import json
from pathlib import Path
import shutil
import sys

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('helicopter_intake', HERE/'repair-helicopter-pair.py')
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
f, g, WINGS = h.f, h.g, h.WINGS
RECORD = 'authoring/supplied-helicopters/clearance-record.json'
REPAIR_RECORD = 'authoring/supplied-helicopters/clearance-repair-record.json'
MANIFEST = 'authoring/native-helicopter-pair.json'
DERIVATIVES = {kind: 'models/derived/wings_'+kind+'.glb' for kind in h.SOURCES}
ALLOWLIST = frozenset({REPAIR_RECORD, MANIFEST, *DERIVATIVES.values()})
# Literal reviewed deterministic output pins. Never learn a baseline from inputs.
APPROVED_OUTPUTS = {
    'models/derived/wings_ah64d.glb': ('c1ffe65d10b30145a35e2ebddc55f4e6e831b4aac6d01fc703a0d862a0d33dee', 203936),
    'models/derived/wings_mi28n.glb': ('2f0e870a2ec6d74e4df9c01a3e13eb0278ccf33ac6e6e37ee64d927663640637', 201000),
    'authoring/native-helicopter-pair.json': ('8065ce22e1a2f7a21c7d99746a863d43288873ca51d3334993392be840430eed', 18066),
    'authoring/supplied-helicopters/clearance-repair-record.json': ('30b49ee586008cfab2aa7cc053488eaf27ccf34d9b73c2ff808311c70cc8028a', 110283),
}
DIAGNOSTIC_PIN = ('4cc3b260a2f6b142b9121fa80f10ca6a4abfd5634265ba19627281c9f041d097', 95334)
CANDIDATE = 'authoring/supplied-helicopters/blocked-native-candidate.patch.gz'
CANDIDATE_SHA = 'f94b4be7dc2667b66e025820c8db603742ded6c48f9eff6df49c5293bca0a81f'
EXTRA_PINS = {
    'models/supplied/tu-160.glb': '705f494bc379b7371c7acd0dde80f18e5002874cc7b498ff27a684b1509f6b0e',
    'models/derived/wings_tu160.glb': '83cfe2e45141d6917520d89b6aa579dbecf5756518cdbed1151a280f4718e791',
    'authoring/native-tu160.json': '6e4cc5225141e8f38064ddb64959a1366183559511128e1548ca55df7879b774',
    'authoring/supplied-bomber/repair-record.json': '0083cdb6a06282536a4704fcdf551782b4fbdacd741177bb74ce0c7727aecd12',
}
FLOOR = 2147483648
GAP = .02


def components(doc, binary, node):
    """Actual triangle connectivity, welding identical positions across face seams."""
    result = []
    for primitive, pr in enumerate(doc['meshes'][node['mesh']]['primitives']):
        ai = pr['attributes']['POSITION']
        points = g.accessor(doc, binary, ai)
        ids = [v[0] for v in g.accessor(doc, binary, pr['indices'])]
        parent = list(range(len(points)))
        def root(i):
            while i != parent[i]:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i
        def join(i, j):
            parent[root(i)] = root(j)
        seen = {}
        for i, p in enumerate(points):
            if p in seen:
                join(i, seen[p])
            seen[p] = i
        for a, b, c in zip(ids[::3], ids[1::3], ids[2::3]):
            join(a, b)
            join(a, c)
        groups = {}
        for i in range(len(points)):
            groups.setdefault(root(i), []).append(i)
        for indices in groups.values():
            result.append({'primitive': primitive, 'material': pr['material'],
                           'position_accessor': ai, 'vertex_indices': indices,
                           'bounds': g.bounds([points[i] for i in indices])})
    return result


def select(items, predicate, label):
    matches = [c for c in items if predicate(c)]
    assert len(matches) == 1, (label, matches)
    return matches[0]


def component_triangles(doc, binary, node, component):
    pr = doc['meshes'][node['mesh']]['primitives'][component['primitive']]
    points = g.accessor(doc, binary, pr['attributes']['POSITION'])
    ids = [v[0] for v in g.accessor(doc, binary, pr['indices'])]
    selected = set(component['vertex_indices'])
    return [[points[a], points[b], points[c]] for a, b, c in zip(ids[::3], ids[1::3], ids[2::3])
            if a in selected and b in selected and c in selected]


def first_intersection(left, right):
    """Actual posed edge/triangle witness, not AABB overlap as acceptance."""
    boxes = [g.bounds(t) for t in right]
    for li, a in enumerate(left):
        ab = g.bounds(a)
        for ri, b in enumerate(right):
            bb = boxes[ri]
            if any(ab['max'][j] < bb['min'][j] or ab['min'][j] > bb['max'][j] for j in range(3)):
                continue
            for owner, edges, surface in [('left', a, b), ('right', b, a)]:
                for ei, (p, q) in enumerate(zip(edges, edges[1:]+edges[:1])):
                    hit = h.segment_triangle(p, q, surface)
                    if hit is not None:
                        return {'left_triangle_index': li, 'right_triangle_index': ri,
                                'edge_mesh': owner, 'edge_index': ei,
                                'left_triangle_root_m': a, 'right_triangle_root_m': b,
                                'intersection_root_m': hit}
    return None


def sweep(doc, binary, names, prefix):
    ni = names[prefix+'_rotor_spin']
    axis = 1 if prefix == 'main' else 0
    pivot = g.point(g.world_matrices(doc)[ni], [0, 0, 0])
    points = [p for t in h.world_triangles(doc, binary, names[prefix+'_rotor_blade_assembly']) for p in t]
    radial = [j for j in range(3) if j != axis]
    radius = max(math.hypot(*(p[j]-pivot[j] for j in radial)) for p in points)
    box = g.bounds(points)
    for j in radial:
        box['min'][j], box['max'][j] = pivot[j]-radius, pivot[j]+radius
    return {'axis': 'xyz'[axis], 'pivot_root_m': pivot, 'radius_m': radius,
            'continuous_360_bounds_root_m': box}


def edit_component(doc, binary, component, transform):
    ai = component['position_accessor']
    values = g.accessor(doc, binary, ai)
    before = [values[i] for i in component['vertex_indices']]
    for i in component['vertex_indices']:
        values[i] = transform(values[i])
    g.store_accessor(doc, binary, ai, values)
    actual = g.accessor(doc, binary, ai)  # Serialized float32, not idealized doubles.
    return {'component': component, 'after_bounds': g.bounds([actual[i] for i in component['vertex_indices']]),
            'vertex_edits': [{'index': i, 'before': list(p), 'after': list(actual[i])}
                             for i, p in zip(component['vertex_indices'], before) if tuple(actual[i]) != tuple(p)]}


def inspect(kind, accepted=False):
    slug, sha, size, triangles, blades = h.SOURCES[kind]
    source = (WINGS/('models/supplied/'+slug+'.glb')).read_bytes()
    rig = (WINGS/('authoring/supplied-helicopters/rigs/'+slug+'.json')).read_bytes()
    raw = h.inspect(source, rig, kind)  # Reproduces ALL original collision witnesses.
    doc, binary = g.unpack_glb(source)
    f.orient(doc, binary)
    oriented_doc, oriented_binary = copy.deepcopy(doc), bytes(binary)
    names = {n['name']: i for i, n in enumerate(doc['nodes'])}
    static = doc['nodes'][names['airframe_static']]
    cs = components(doc, binary, static)
    boom = select(cs, lambda c: c['material'] == 0 and c['bounds']['min'][2] > 2
                  and c['bounds']['max'][2] > 9 and c['bounds']['max'][0] < 1
                  and c['bounds']['max'][1] < 1.5, 'existing tapered tail boom')
    fin = select(cs, lambda c: c['material'] == 0 and c['bounds']['min'][2] > 7
                 and c['bounds']['max'][0]-c['bounds']['min'][0] < .2
                 and c['bounds']['max'][1]-c['bounds']['min'][1] > 1.5, 'vertical fin')
    tail_before = sweep(doc, binary, names, 'tail')
    forward_limit = tail_before['pivot_root_m'][2]-tail_before['radius_m']-GAP
    tails = [c for c in cs if c['material'] == 0 and c['bounds']['min'][2] > 5
             and c['bounds']['max'][0]-c['bounds']['min'][0] > 1.5
             and c['bounds']['max'][1]-c['bounds']['min'][1] < .2]
    assert len(tails) == 2
    # One rigid forward translation for BOTH existing stabilizer components.
    distance = max(c['bounds']['max'][2] for c in tails)-forward_limit
    moved = []
    changed_accessors = set()
    for c in tails:
        entry = edit_component(doc, binary, c, lambda p: [p[0], p[1], p[2]-distance])
        entry['translation_root_m'] = [0, 0, -distance]
        assert entry['after_bounds']['max'][2] <= forward_limit+1e-6, 'float32 tail separation'
        entry['actual_full_disk_Z_gap_m'] = tail_before['pivot_root_m'][2]-tail_before['radius_m']-entry['after_bounds']['max'][2]
        # Intersections establish actual embedded mating, not overlapping aggregate boxes.
        original_mating = first_intersection(component_triangles(oriented_doc, oriented_binary, static, c),
                                             component_triangles(doc, binary, static, boom))
        mating = first_intersection(component_triangles(doc, binary, static, c),
                                    component_triangles(doc, binary, static, boom))
        assert original_mating and mating, 'disconnected stabilizer/boom'
        entry['original_boom_mating_witness'] = original_mating
        entry['repaired_boom_mating_witness'] = mating
        moved.append(entry)
        changed_accessors.add(c['position_accessor'])
    main_before = sweep(doc, binary, names, 'main')
    main_node = doc['nodes'][names['main_rotor_spin']]
    original_pivot = list(main_node['translation'])
    mast_edit = None
    lift = 0.
    if kind == 'mi28n':
        blade_components = components(doc, binary, doc['nodes'][names['main_rotor_blade_assembly']])
        blade_boxes = [c['bounds'] for c in blade_components if c['material'] == 2]
        assert len(blade_boxes) == blades
        # Child and pivot translations cancel in the pinned rest pose.
        blade_min = min(c['min'][1] for c in blade_boxes)
        target_top = (tail_before['continuous_360_bounds_root_m']['max'][1]
                      if accepted else fin['bounds']['max'][1])
        lift = target_top+GAP-blade_min
        if accepted:
            # Round outward at double precision. Geometry stays source float32;
            # pivot translation carries the coherent assembly lift, not vertices.
            lift = math.nextafter(lift, math.inf)
            assert abs(lift-.667406191251) < 1e-10
        assert lift > 0
        main_node['translation'][1] += lift
        mast = select(cs, lambda c: c['material'] == 3 and c['bounds']['min'][1] > 1.8
                      and c['bounds']['max'][0]-c['bounds']['min'][0] < .3
                      and c['bounds']['max'][1]-c['bounds']['min'][1] > .8, 'existing main mast shaft')
        lo, hi = mast['bounds']['min'][1], mast['bounds']['max'][1]
        # Existing cylinder only: fixed lower cap; upper cap moves by the hub lift.
        mast_edit = edit_component(doc, binary, mast,
                                  lambda p: [p[0], lo+(p[1]-lo)*(hi+lift-lo)/(hi-lo), p[2]])
        mast_edit['rationale'] = 'Extend the existing cylinder axially; keep lower mounting plane and original upper-cap/hub relative mating. No new part. Side normals are horizontal and cap normals axial, so original normals remain valid.'
        mast_edit['fixed_lower_plane_y_m'] = lo
        mast_edit['upper_plane_delta_m'] = lift
        changed_accessors.add(mast['position_accessor'])
        # This exact component has two axial rings only and unchanged radial coordinates.
        original_ps = g.accessor(oriented_doc, oriented_binary, mast['position_accessor'])
        assert all(abs(original_ps[i][1]-lo) < 1e-6 or abs(original_ps[i][1]-hi) < 1e-6
                   for i in mast['vertex_indices'])
    main_after = sweep(doc, binary, names, 'main')
    assert sweep(doc, binary, names, 'tail') == tail_before, 'tail pivot/geometry changed'
    # Check EVERY original non-position accessor byte for byte after reflection.
    for ai in range(len(doc['accessors'])):
        if ai not in changed_accessors:
            assert g.accessor(doc, binary, ai) == g.accessor(oriented_doc, oriented_binary, ai), ('unscoped accessor edit', ai)
    assert doc['meshes'] == oriented_doc['meshes'] and doc['images'] == oriented_doc['images']
    assert doc['materials'] == oriented_doc['materials'], 'diagnostic must not change livery/glass'
    # A single actual intersecting pose disproves mandatory continuous 360 clearance.
    pair_witness = None
    if kind == 'mi28n' and not accepted:
        for prefix, axis, degrees in [('main', 1, -87), ('tail', 0, 5)]:
            angle = math.radians(degrees)
            q = [0., 0., 0., math.cos(angle/2)]
            q[axis] = math.sin(angle/2)
            doc['nodes'][names[prefix+'_rotor_spin']]['rotation'] = q
        pair_witness = first_intersection(h.world_triangles(doc, binary, names['main_rotor_blade_assembly']),
                                          h.world_triangles(doc, binary, names['tail_rotor_blade_assembly']))
        assert pair_witness, 'exact-transform counterexample must reproduce; do not claim failure from envelope overlap alone'
        pair_witness.update({'main_pose': {'axis': 'y', 'angle_degrees': -87},
                             'tail_pose': {'axis': 'x', 'angle_degrees': 5},
                             'composition': 'parent spin quaternion then unchanged blade child TRS; independent rotor angles',
                             'main_lift_m': lift, 'intersection_tolerance': h.TOL,
                             'failure': 'Mi28N nonjoint main-rotor/tail-rotor continuous-360 clearance'})
    proposed_lift = None
    if kind == 'mi28n':
        proposed_lift = tail_before['continuous_360_bounds_root_m']['max'][1]+GAP-blade_min
    report = {'raw_failure': raw, 'stabilizer_forward_distance_m': distance,
            'stabilizer_edits': moved, 'boom_component': boom, 'fin_component': fin,
            'main_rotor_before': main_before, 'main_rotor_after': main_after,
            'main_pivot_before_m': original_pivot, 'main_pivot_delta_m': [0, lift, 0],
            'tail_rotor_before_and_after': tail_before, 'mast_edit': mast_edit,
            'source_topology_UV_normals_images_materials': 'UNCHANGED_AFTER_SHARED_Z_REFLECTION',
            'prescribed_repair_counterexample': pair_witness,
            'proposed_distinct_repair_NOT_APPLIED': None if proposed_lift is None else {
                'method': 'Raise the ENTIRE original main assembly until blade slab clears BOTH fin and tail swept top by .02m; extend SAME static mast coherently. This exceeds the prescribed fin-only minimum and needs an explicit revised transform order.',
                'total_main_lift_m': proposed_lift, 'additional_lift_m': proposed_lift-lift,
                'required_blade_min_y_m': tail_before['continuous_360_bounds_root_m']['max'][1]+GAP,
                'scope': 'Analytic vertical blade/tail separation proposal only, not full accepted nonjoint geometry validation.'}}
    if accepted:
        report.pop('proposed_distinct_repair_NOT_APPLIED')
        report.pop('prescribed_repair_counterexample')
        return doc, binary, report
    return report


def protected():
    for name, expected in {**h.FROZEN, **h.PINNED_INTAKE, **EXTRA_PINS, CANDIDATE: CANDIDATE_SHA}.items():
        assert g.sha((WINGS/name).read_bytes()) == expected, 'protected bytes changed: '+name
    assert g.sha((WINGS/RECORD).read_bytes()) == DIAGNOSTIC_PIN[0], 'historical diagnostic changed'
    for name in ALLOWLIST:
        p = WINGS/name
        assert not any(v.is_symlink() for v in [p, *p.parents]), 'symlink destination'
        if p.exists():
            assert name in APPROVED_OUTPUTS, 'unapproved existing output: '+name
            sha, size = APPROVED_OUTPUTS[name]
            data = p.read_bytes()
            assert len(data) == size and g.sha(data) == sha, 'foreign/unaccepted consumable: '+name


def generate_diagnostic():
    protected()
    models = {kind: inspect(kind) for kind in h.SOURCES}
    assert sum(len(row['raw_failure']['witnesses']) for row in models.values()) == 3
    assert models['mi28n']['prescribed_repair_counterexample']
    data = f.encoded({'schema': 'wings_helicopter_clearance_diagnostic_v1',
        'status': 'FAIL_PRESCRIBED_REPAIR_NONJOINT_ROTOR_PAIR',
        'accepted_derivatives': False, 'manifest_published': False,
        'frame': 'meters; +X right; +Y up; -Z forward; positive right-handed radians',
        'provenance': 'User-reported GPT originals and scoped repair permission, not independent rights or aircraft accuracy certification.',
        'scope': 'Exact prescribed connected-component transforms and actual counterexample. No accepted GLB, store/camera/glass adaptation or native integration is claimed.',
        'method': 'Exact-position welded triangle components; float32 reserialization; actual stabilizer/boom edge-triangle intersections; analytic continuous rotor bounds; decisive posed nonjoint rotor-pair triangle intersection.',
        'remaining_gate': 'Full body/gear/stores/rotor-pair analytic clearance and independent acceptance cannot pass while this counterexample exists. Not run as an exhaustive PASS gate.',
        'not_written': list(h.FORBIDDEN), 'quarantined_candidate_sha256': CANDIDATE_SHA,
        'protected_file_count': len(set(h.FROZEN)|set(h.PINNED_INTAKE)|set(EXTRA_PINS)|{CANDIDATE}),
        'command': 'python3 -B Games/Wings/authoring/repair-helicopter-clearance.py --check',
        'models': models})
    assert len(data) < 250_000, 'diagnostic record size'
    return {RECORD: data}


def independent_checker():
    spec = importlib.util.spec_from_file_location('independent_clearance', HERE/'repair-helicopter-clearance-check.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fit_equipment(doc, binary):
    names = {n['name']: i for i, n in enumerate(doc['nodes'])}
    root = names['vehicle_root']
    static = doc['nodes'][names['airframe_static']]
    cs = components(doc, binary, static)
    glass = sorted([c for c in cs if c['material'] == 1 and
                    c['bounds']['max'][2]-c['bounds']['min'][2] > 1],
                   key=lambda c: c['bounds']['min'][2])
    assert len(glass) == 2, 'two actual cabin glass components, not optic'
    cb = glass[1]['bounds']  # Rear/pilot cabin; no modeled interior claimed.
    eye = [0, cb['min'][1]+.7*(cb['max'][1]-cb['min'][1]),
           (cb['min'][2]+cb['max'][2])/2]
    # The supplied canopy has an opaque inner shell and no interior. Derive
    # a qualified eye 5mm behind the actual windscreen, ahead of that shell.
    end = [eye[0], eye[1], eye[2]-10]
    hits = [hit for tri in component_triangles(doc, binary, static, glass[1])
            if (hit := h.segment_triangle(eye, end, tri)) is not None]
    assert hits, 'actual rear-cabin windscreen intersection'
    eye[2] = max(hit[2] for hit in hits)+.005
    f.anchor(doc, 'cockpit_eye', eye, root)
    doc['materials'][1]['alphaMode'] = 'BLEND'
    doc['materials'][1]['pbrMetallicRoughness']['metallicFactor'] = 0
    doc['materials'][1]['pbrMetallicRoughness']['baseColorFactor'][3] = .26
    paint = len(doc['materials'])
    doc['materials'].append({'name': 'generic_arcade_external_store',
        'pbrMetallicRoughness': {'baseColorFactor': [.025, .029, .032, 1],
                               'metallicFactor': .15, 'roughnessFactor': .6}})
    stations, missiles, rockets = [], [], []
    # Actual supplied pylons at |X|=1.7/2.3, Z=.625 end at Y=-.45.
    # Generic 1.6m rails/rounds touch their lower plane; no real loadout claim.
    for number, x in [(1, 1.7), (2, 2.3)]:
        for side, sign in [('L', -1), ('R', 1)]:
            name = 'hellfire_'+side+str(number)
            mount = select(cs, lambda c: c['material'] == 0
                           and abs((c['bounds']['min'][0]+c['bounds']['max'][0])/2-sign*x) < 1e-5
                           and abs(c['bounds']['min'][1]+.45) < 1e-5, name+' source pylon')
            # f.tube serializes .1 to this float32 radius. Use that exact
            # value so the upper tangent meets, never penetrates, the pylon.
            position = [sign*x, mount['bounds']['min'][1]-.10000000149011612, .625]
            ni = f.add_mesh(doc, binary, name, f.tube(.1, [(-.8, 0), (-.6, 1), (.8, 1)]), paint, position, root)
            f.anchor(doc, name+'_launch', [0, 0, -.8], ni)
            launch = [position[0], position[1], position[2]-.8]
            missiles.append(launch)
            stations.append({'node': name, 'launch_node': name+'_launch', 'weapon': 'hellfire',
                             'source_attachment_component': mount, 'position_root_m': position,
                             'radius_m': .1, 'length_m': 1.6})
    # One pod per wing, forward of the rounds. A small adapter ends inside the
    # measured wing underside. Only this genuine fixed mount may mate the wing.
    wing_faces = [t for c in cs if c['material'] == 0 and
                  1.5 < c['bounds']['max'][0]-c['bounds']['min'][0] < 2 and
                  c['bounds']['min'][2] < 0 and c['bounds']['max'][2] < 2
                  for t in component_triangles(doc, binary, static, c)]
    assert wing_faces
    for side, sign in [('L', -1), ('R', 1)]:
        name = 'rocket_pod_'+side
        x, y, z = sign*2, -.6, -.7
        underside = f.surface_y(wing_faces, x, 0)[0]
        f.add_mesh(doc, binary, name+'_mount', f.box([-.04, y+.17, -.3], [.04, underside+.005, .15]),
                   3, [x, 0, 0], root)
        ni = f.add_mesh(doc, binary, name, f.tube(.17, [(-.5, 1), (.5, 1)]), paint, [x, y, z], root)
        f.anchor(doc, name+'_launch', [0, 0, -.5], ni)
        rockets.append([x, y, z-.5])
        stations.append({'node': name, 'launch_node': name+'_launch', 'weapon': 'rockets',
                         'wing_attachment_root_m': [x, underside, 0],
                         'position_root_m': [x, y, z], 'radius_m': .17, 'length_m': 1.})
    return eye, missiles, rockets, stations, glass


def repaired_document(kind):
    """Actual complete fitted document/binary for independent geometry consumers."""
    doc, binary, _ = inspect(kind, accepted=True)
    fit_equipment(doc, binary)
    doc['buffers'][0]['byteLength'] = len(binary)
    return doc, binary


def derive(kind, checker):
    doc, binary, record = inspect(kind, accepted=True)
    eye, missiles, rockets, stations, glass = fit_equipment(doc, binary)
    doc['buffers'][0]['byteLength'] = len(binary)
    payload = g.pack_glb(doc, binary)
    # Reopen serialized data before acceptance. No idealized pre-write geometry.
    source = (WINGS/'models/supplied'/(h.SOURCES[kind][0]+'.glb')).read_bytes()
    d, b, sd, sb, _ = checker.source_preservation(source, payload, kind)
    attached = checker.tail_attachment(d, b, sd, sb)
    envs, checks, joints, pairs = checker.continuous_clearance(d, b, kind, sd, sb)
    names = {n['name']: i for i, n in enumerate(d['nodes'])}
    # All store surfaces against every body/wheel surface, plus one another.
    # The two wing adapters are attachment hardware, not weapon volumes.
    store_parts = [checker.components(d, b, names[s['node']])[0] for s in stations]
    originals = [comp for i, n in enumerate(d['nodes'][:9]) if 'mesh' in n and
                 n['name'] not in ('main_rotor_blade_assembly', 'tail_rotor_blade_assembly')
                 for comp in checker.components(d, b, i)]
    store_checks = 0
    for index, store in enumerate(store_parts):
        for other in originals+store_parts[index+1:]:
            store_checks += 1
            if checker.separated_boxes(store['bounds'], other['bounds']):
                continue
            station = next(s for s in stations if s['node'] == store['node'])
            mount = station.get('source_attachment_component')
            if (mount and other['node'] == 'airframe_static' and other['accessor'] == mount['position_accessor']
                    and other['indices'] == mount['vertex_indices']):
                assert abs(store['bounds']['max'][1]-other['bounds']['min'][1]) < 1e-12, 'pylon tangent plane'
                continue  # Only exact source pylon/tangent mating, no volume overlap.
            assert not first_intersection([t for _, t in store['triangles']], [t for _, t in other['triangles']]), (
                'store surface collision', kind, store['node'], other['node'])
            raise AssertionError(('unproven store volume clearance', kind, store['node'], other['node']))
    points = f.world_points(d, b)
    for prefix in ('main', 'tail'):
        box = sweep(d, b, names, prefix)['continuous_360_bounds_root_m']
        points.extend([box['min'], box['max']])
    bounds = g.bounds(points)
    rotors = [{'node': 'main_rotor_spin', 'axis': 'y', 'speed': -30, 'driver': 'rotor'},
              {'node': 'tail_rotor_spin', 'axis': 'x', 'speed': -70, 'driver': 'rotor'}]
    order = ['hellfire_L1', 'hellfire_R1', 'hellfire_L2', 'hellfire_R2']
    triangles = sum(len(g.accessor(d, b, pr['indices']))//3 for m in d['meshes'] for pr in m['primitives'])
    descriptor = {'source_model_id': 'wings.original.'+h.SOURCES[kind][0]+'.v1',
        'source_sha256': h.SOURCES[kind][1], 'file': DERIVATIVES[kind], 'sha256': g.sha(payload),
        'bounds': bounds, 'cockpit': eye, 'hardpoints': {'missiles': [[], missiles], 'rockets': rockets},
        'controls': rotors, 'rotors': rotors, 'native_pivots': ['main_rotor_spin', 'tail_rotor_spin', *order],
        'fixed_gear': ['main_wheel_L', 'main_wheel_R', 'tailwheel'], 'exhausts': [],
        'cameras': {'cockpit_eye': eye, 'qualification': '5mm behind actual rear cabin windscreen triangles, ahead of opaque shell; no actual interior.'},
        'stores': stations, 'stats': {'bytes': len(payload), 'triangles': triangles},
        'dimensions_m': [bounds['max'][j]-bounds['min'][j] for j in range(3)]}
    record.update({'bytes': len(payload), 'triangles': triangles, 'sha256': g.sha(payload),
        'file': DERIVATIVES[kind], 'connected_attachments': attached,
        'continuous_clearance': {'static_triangle_checks': checks, 'source_joint_triangle_checks': joints,
            'independent_rotor_component_pairs': pairs, 'store_component_checks': store_checks,
            'method': 'Independent annular cylinders, axial triangle clipping and exact projected radial bounds for all angles; disjoint rotor envelope boxes for independent phases. Only source coaxial mast/main hub mating is exempt.'},
        'cabin_glass_components': glass, 'cockpit_eye_root_m': eye, 'stations': stations,
        'source_topology_UV_normals_images_materials': 'Source topology/UV/normals/images retained after shared reflection; only cabin glass alpha/dielectric adaptation. Generic stores appended.'})
    return payload, descriptor, record


def generate():
    protected()
    checker = independent_checker()
    outputs, models, records = {}, {}, {}
    for kind in h.SOURCES:
        payload, models[kind], records[kind] = derive(kind, checker)
        outputs[DERIVATIVES[kind]] = payload
    notice = ('User-reported GPT originals and scoped use/repair permission, not independent rights verification. '
              'Qualified simplified exteriors, not official aircraft accuracy or mechanism certificates. '
              'Generic external four-Hellfire/two-rocket-pod arcade fit; Mi28N Hellfire is fictional compatibility. '
              'No gun, turret, wheel animation, exhaust or real cabin interior. Native gameplay/pixels/performance remain separate gates.')
    outputs[MANIFEST] = f.encoded({'schema': 'wings_native_helicopter_pair_v1', 'notice': notice, 'models': models})
    outputs[REPAIR_RECORD] = f.encoded({'schema': 'wings_helicopter_clearance_repair_v1',
        'status': 'PASS_CONTINUOUS_GEOMETRY', 'accepted_derivatives': True, 'manifest_published': True,
        'frame': 'meters; +X right; +Y up; -Z forward; right-handed radians', 'qualification': notice,
        'historical_failed_fin_only': {'file': RECORD, 'sha256': DIAGNOSTIC_PIN[0], 'commit': 'a721305b',
            'failure': 'Independent mainY=-87deg/tailX=5deg rotor-pair intersection; historical record retained byte-exact.'},
        'transform_order': 'Shared Z reflection; both connected stabilizers forward by disk+.02; Mi28N entire main pivot + tail swept top+.02 minus original blade minimum, same mast lower cap fixed/upper cap +lift; fit generic equipment.',
        'models': records})
    return outputs


def validate_outputs(outputs, diagnostic=False):
    pins = {RECORD: DIAGNOSTIC_PIN} if diagnostic else APPROVED_OUTPUTS
    assert set(outputs) == ({RECORD} if diagnostic else ALLOWLIST), 'output allowlist mismatch'
    assert all(isinstance(data, bytes) for data in outputs.values()), 'bytes required'
    assert sum(map(len, outputs.values())) < (250_000 if diagnostic else 1_500_000), 'output budget'
    for name, data in outputs.items():
        assert name in pins, 'missing literal output pin: '+name
        sha, size = pins[name]
        assert len(data) == size and g.sha(data) == sha, 'unapproved output SHA/size: '+name
        p = WINGS/name
        assert not any(parent.is_symlink() for parent in [p, *p.parents]), 'symlink destination'
        assert not p.exists() or p.read_bytes() == data, 'refusing corrupt/foreign existing output: '+name
    present = sum((WINGS/name).exists() for name in outputs)
    assert present in (0, len(outputs)), 'partial approved output set'
    protected()
    assert shutil.disk_usage(WINGS).free-sum(map(len, outputs.values())) >= FLOOR, 'disk floor'


def validate_accepted_existing():
    """Narrow raw-intake coexistence ABI, never a blanket FORBIDDEN exception."""
    assert set(APPROVED_OUTPUTS) == ALLOWLIST, 'missing approved output pins'
    assert all((WINGS/name).is_file() for name in h.FORBIDDEN), 'partial helicopter consumables'
    protected()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--diagnostic', action='store_true')
    args = parser.parse_args()
    assert shutil.disk_usage(WINGS).free >= FLOOR, 'disk floor'
    outputs = generate_diagnostic() if args.diagnostic else generate()
    validate_outputs(outputs, diagnostic=args.diagnostic)  # ALL pins before ANY mkdir/open.
    for name, data in outputs.items():
        p = WINGS/name
        if args.check:
            assert p.read_bytes() == data, 'byte reproduction mismatch: '+name
        elif not p.exists():
            assert shutil.disk_usage(WINGS).free-len(data) >= FLOOR, 'disk floor'
            p.parent.mkdir(parents=True, exist_ok=True)
            with p.open('xb') as out:
                out.write(data)
    if args.diagnostic:
        print('REPRODUCED historical FAILED fin-only repair; no accepted outputs written.')
        return 1
    print('PASS: four byte-exact accepted outputs; two connected stabilizers/model; Mi28N lift=.667406191251m; continuous static/store/independent rotor-phase clearance.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

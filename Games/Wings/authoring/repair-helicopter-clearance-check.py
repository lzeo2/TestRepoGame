#!/usr/bin/env python3
"""Independent, read-only continuous helicopter geometry proof. Stdlib only.

No sampled angle establishes clearance. Each connected rotor component is
contained in an analytic annular cylinder for EVERY angle. Static triangles
are clipped to its axial slab before exact projected radial bounds are tested.
Unresolved overlap fails, including overlap between the two rotor envelopes.
"""
import argparse
import contextlib
import copy
import importlib.util
import io
import json
import math
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parent


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE/filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


old = load('raw_helicopter_check', 'repair-helicopter-pair-check.py')
h, g, c = old.h, old.g, old.c
EPS = 3e-6
# Reviewed serialized candidate. Independent of generator's mutable map/ABI.
ACCEPTED_PINS = {
    'models/derived/wings_ah64d.glb': ('c1ffe65d10b30145a35e2ebddc55f4e6e831b4aac6d01fc703a0d862a0d33dee', 203936),
    'models/derived/wings_mi28n.glb': ('2f0e870a2ec6d74e4df9c01a3e13eb0278ccf33ac6e6e37ee64d927663640637', 201000),
    'authoring/native-helicopter-pair.json': ('8065ce22e1a2f7a21c7d99746a863d43288873ca51d3334993392be840430eed', 18066),
    'authoring/supplied-helicopters/clearance-repair-record.json': ('30b49ee586008cfab2aa7cc053488eaf27ccf34d9b73c2ff808311c70cc8028a', 110283),
}


def check_output_pins(outputs):
    assert set(outputs) == set(ACCEPTED_PINS), 'independent accepted output allowlist'
    for name, (sha, size) in ACCEPTED_PINS.items():
        data = outputs[name]
        assert isinstance(data, bytes) and len(data) == size and g.sha(data) == sha, ('independent accepted SHA/size', name)
        path = h.WINGS/name
        assert not any(p.is_symlink() for p in [path, *path.parents]), ('symlink accepted output', name)
        assert path.read_bytes() == data, ('foreign/missing accepted output', name)
    record = json.loads(outputs['authoring/supplied-helicopters/clearance-repair-record.json'])
    assert record['schema'] == 'wings_helicopter_clearance_repair_v1'
    assert record['status'] == 'PASS_CONTINUOUS_GEOMETRY' and record['accepted_derivatives'] and record['manifest_published']
    assert record['historical_failed_fin_only']['sha256'] == '4cc3b260a2f6b142b9121fa80f10ca6a4abfd5634265ba19627281c9f041d097'
    print('PASS independent literal authentication: complete current manifest/2GLBs/new record, SHA+size+no symlinks; historical failed record separate')


def cross2(a, b):
    return a[0]*b[1]-a[1]*b[0]


def radial_bounds(polygon, pivot, axis):
    """Exact min/max distance from origin to a convex projected polygon."""
    radial = [j for j in range(3) if j != axis]
    ps = [[p[j]-pivot[j] for j in radial] for p in polygon]
    maximum = max(math.hypot(*p) for p in ps)
    minimum = maximum
    signs = []
    for a, b in zip(ps, ps[1:]+ps[:1]):
        v = [b[j]-a[j] for j in range(2)]
        vv = sum(x*x for x in v)
        t = max(0., min(1., -sum(a[j]*v[j] for j in range(2))/vv)) if vv else 0.
        minimum = min(minimum, math.hypot(*(a[j]+t*v[j] for j in range(2))))
        signs.append(cross2(a, b))
    # Degenerate projections are line segments, not infinite half-planes.
    area = sum(cross2(a, b) for a, b in zip(ps, ps[1:]+ps[:1]))
    if abs(area) > 1e-12 and (all(s >= -1e-12 for s in signs) or all(s <= 1e-12 for s in signs)):
        minimum = 0.
    return minimum, maximum


def clip(polygon, axis, bound, lower):
    result = []
    if not polygon:
        return result
    for a, b in zip(polygon, polygon[1:]+polygon[:1]):
        da, db = a[axis]-bound, b[axis]-bound
        ina, inb = (da >= 0, db >= 0) if lower else (da <= 0, db <= 0)
        if ina:
            result.append(a)
        if ina != inb:
            t = da/(da-db)
            result.append([a[j]+t*(b[j]-a[j]) for j in range(3)])
    return result


def components(doc, binary, ni):
    """Independent position-weld/triangle connectivity, retaining source indices."""
    node = doc['nodes'][ni]
    matrix = g.world_matrices(doc)[ni]
    result, triangle_offset = [], 0
    for pi, pr in enumerate(doc['meshes'][node['mesh']]['primitives']):
        ps = g.accessor(doc, binary, pr['attributes']['POSITION'])
        ids = [v[0] for v in g.accessor(doc, binary, pr['indices'])]
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
            seen[p] = i
        for i in range(0, len(ids), 3):
            join(ids[i], ids[i+1])
            join(ids[i], ids[i+2])
        groups = {}
        for i in range(len(ps)):
            groups.setdefault(root(i), []).append(i)
        for ci, indices in enumerate(groups.values()):
            selected = set(indices)
            tris = [(triangle_offset+i//3, [g.point(matrix, ps[k]) for k in ids[i:i+3]])
                    for i in range(0, len(ids), 3) if ids[i] in selected]
            assert tris
            points = [g.point(matrix, ps[k]) for k in indices]
            result.append({'node': node['name'], 'primitive': pi, 'component': ci,
                           'material': pr['material'], 'accessor': pr['attributes']['POSITION'],
                           'indices': indices, 'points': points, 'triangles': tris,
                           'bounds': g.bounds(points)})
        triangle_offset += len(ids)//3
    return result


def envelope(component, pivot, axis):
    points = component['points']
    return dict(component, pivot=pivot, axis=axis,
                lo=min(p[axis] for p in points), hi=max(p[axis] for p in points),
                inner=min(radial_bounds(t, pivot, axis)[0] for _, t in component['triangles']),
                outer=max(radial_bounds(t, pivot, axis)[1] for _, t in component['triangles']))


def outside(triangle, env):
    polygon = clip(triangle, env['axis'], env['lo']-EPS, True)
    polygon = clip(polygon, env['axis'], env['hi']+EPS, False)
    if not polygon:
        return True
    low, high = radial_bounds(polygon, env['pivot'], env['axis'])
    return low > env['outer']+EPS or high < env['inner']-EPS


def cylinder_box(env):
    lo = [v-env['outer'] for v in env['pivot']]
    hi = [v+env['outer'] for v in env['pivot']]
    lo[env['axis']], hi[env['axis']] = env['lo'], env['hi']
    return {'min': lo, 'max': hi}


def separated_boxes(a, b):
    return any(a['max'][j]+EPS < b['min'][j] or b['max'][j]+EPS < a['min'][j] for j in range(3))


def label(component):
    return f'{component["node"]}/primitive{component["primitive"]}/component{component["component"]}'


def main_joint(kind, static, rotor, source_components, pivot):
    """Only pinned coaxial source shaft vs pinned central main hub can mate.

    The source has a radius .13m mast (AH also has a radius .12m upper
    radar shaft). Their same source triangle IDs must survive. No airframe,
    fin, blade, pitch-link, tail hub, store or wheel is exempted.
    """
    allowed = (5, 6) if kind == 'ah64d' else (5,)
    if not (static['node'] == 'airframe_static' and static['primitive'] == 3
            and static['component'] in allowed and rotor['node'] == 'main_rotor_blade_assembly'
            and rotor['primitive'] == 1 and rotor['component'] == 0):
        return False
    source = next(s for s in source_components if s['primitive'] == 3 and s['component'] == static['component'])
    assert [i for i, _ in source['triangles']] == [i for i, _ in static['triangles']]
    # Bounded radial mating domain, derived from the actual source shaft.
    radius = max(math.hypot(p[0]-pivot[0], p[2]-pivot[2]) for p in source['points'])
    assert .119 < radius < .131
    assert all(math.hypot(p[0]-pivot[0], p[2]-pivot[2]) <= radius+EPS for p in static['points'])
    assert all(abs(p[j]-q[j]) < EPS for p, q in zip(static['points'], source['points']) for j in (0, 2))
    assert max(p[1] for p in static['points']) >= rotor['lo']-EPS
    assert min(p[1] for p in static['points']) < rotor['hi']
    assert abs((rotor['bounds']['min'][0]+rotor['bounds']['max'][0])/2-pivot[0]) < EPS
    assert abs((rotor['bounds']['min'][2]+rotor['bounds']['max'][2])/2-pivot[2]) < EPS
    return True


def continuous_clearance(doc, binary, kind, source_doc, source_binary):
    names = {n['name']: i for i, n in enumerate(doc['nodes'])}
    source_names = {n['name']: i for i, n in enumerate(source_doc['nodes'])}
    source_static = components(source_doc, source_binary, source_names['airframe_static'])
    moving = {'main_rotor_blade_assembly', 'tail_rotor_blade_assembly'}
    statics = [comp for i, n in enumerate(doc['nodes']) if 'mesh' in n and n['name'] not in moving
               for comp in components(doc, binary, i)]
    envelopes = {}
    for prefix, axis in [('main', 1), ('tail', 0)]:
        spin = names[prefix+'_rotor_spin']
        pivot = g.point(g.world_matrices(doc)[spin], [0, 0, 0])
        assert doc['nodes'][spin]['children'] == [names[prefix+'_rotor_blade_assembly']]
        envelopes[prefix] = [envelope(comp, pivot, axis) for comp in components(doc, binary, names[prefix+'_rotor_blade_assembly'])]
    checked = joints = 0
    for prefix, envs in envelopes.items():
        for env in envs:
            for static in statics:
                box = cylinder_box(env)
                if separated_boxes(box, static['bounds']):
                    checked += len(static['triangles'])
                    continue
                # Surface separation alone cannot rule out an entire swept
                # component hidden inside a closed body. Fail conservatively.
                assert not all(static['bounds']['min'][j]-EPS <= box['min'][j]
                               and box['max'][j] <= static['bounds']['max'][j]+EPS for j in range(3)), (
                    'UNPROVEN closed-volume containment', kind, label(env), label(static))
                for index, triangle in static['triangles']:
                    checked += 1
                    if outside(triangle, env):
                        continue
                    if prefix == 'main' and main_joint(kind, static, env, source_static, env['pivot']):
                        joints += 1
                        continue
                    raise AssertionError(f'UNPROVEN 360 clearance {kind}: {label(env)} against {label(static)} '
                                         f'static_triangle={index} triangle={triangle}; '
                                         f'axis={env["axis"]} slab={[env["lo"],env["hi"]]} '
                                         f'radius={[env["inner"],env["outer"]]}; no joint exemption')
    rotor_pairs = 0
    for main in envelopes['main']:
        for tail in envelopes['tail']:
            assert separated_boxes(cylinder_box(main), cylinder_box(tail)), (
                'UNPROVEN independent rotor phases', kind, label(main), label(tail),
                cylinder_box(main), cylinder_box(tail))
            rotor_pairs += 1
    return envelopes, checked, joints, rotor_pairs


def triangle_contact(a, b):
    """Independent actual surface witness, never an angle-sampling PASS."""
    if separated_boxes(g.bounds(a), g.bounds(b)):
        return None
    for side, edges, surface in [('first', a, b), ('second', b, a)]:
        for ei in range(3):
            start, end = edges[ei], edges[(ei+1)%3]
            direction = [end[j]-start[j] for j in range(3)]
            t = c.ray_hit(start, direction, surface)
            if t is not None and EPS < t < 1-EPS:
                return dict(edge_mesh=side, edge=ei, intersection=[start[j]+t*direction[j] for j in range(3)])
    return None


def rotor_pair_witness(doc, binary):
    """Bounded diagnostic after analytic failure; no mesh-matrix allocation."""
    d = copy.deepcopy(doc)
    names = {n['name']: i for i, n in enumerate(d['nodes'])}
    main, tail = [d['nodes'][names[p+'_rotor_spin']] for p in ('main', 'tail')]
    pivot = g.point(g.world_matrices(d)[names['main_rotor_spin']], [0, 0, 0])
    blades = [s for s in components(d, binary, main['children'][0]) if s['primitive'] == 0]
    lo = min(s['bounds']['min'][1] for s in blades)
    hi = max(s['bounds']['max'][1] for s in blades)
    blade = blades[0]
    center = [sum(p[j] for p in blade['points'])/len(blade['points']) for j in range(3)]
    rest_angle = math.atan2(center[0]-pivot[0], center[2]-pivot[2])
    for td in range(0, 360, 15):
        angle = math.radians(td)
        tail['rotation'] = [math.sin(angle/2), 0, 0, math.cos(angle/2)]
        tts = c.world_triangles(d, binary, tail['children'])
        for ti, tt in enumerate(tts):
            polygon = clip(clip(tt, 1, lo, True), 1, hi, False)
            if not polygon:
                continue
            target = [sum(p[j] for p in polygon)/len(polygon) for j in range(3)]
            angle = math.atan2(target[0]-pivot[0], target[2]-pivot[2])-rest_angle
            for offset in (0, -.02, .02):
                a = angle+offset
                main['rotation'] = [0, math.sin(a/2), 0, math.cos(a/2)]
                mts = c.world_triangles(d, binary, main['children'])
                for mi, mt in enumerate(mts):
                    contact = triangle_contact(mt, tt)
                    if contact:
                        return dict(main_degrees=math.degrees(a), tail_degrees=td,
                                    main_triangle=mi, tail_triangle=ti,
                                    main_triangle_root_m=mt, tail_triangle_root_m=tt, **contact)
    return None


def tail_attachment(doc, binary, source_doc, source_binary):
    names = {n['name']: i for i, n in enumerate(doc['nodes'])}
    parts = components(doc, binary, names['airframe_static'])
    boom = next(s for s in parts if s['primitive'] == 0 and s['component'] == 2)
    tails = [s for s in parts if s['primitive'] == 0 and s['component'] in (14, 24)]
    for tail in tails:
        witness = next((dict(tail_triangle=ti, boom_triangle=bi, **hit)
                        for ti, t in tail['triangles'] for bi, b in boom['triangles']
                        if (hit := triangle_contact(t, b))), None)
        assert witness is not None, ('floating stabilizer: no actual boom surface attachment', label(tail))
    return len(tails)


def source_preservation(source, payload, kind):
    raw, rb = g.unpack_glb(source)
    d, b = g.unpack_glb(payload)
    oriented, ob = copy.deepcopy(raw), bytearray(rb)
    h.f.orient(oriented, ob)
    assert d['images'] == raw['images'] and d['textures'] == raw['textures'] and d['samplers'] == raw['samplers']
    assert c.image(d, b, 0) == c.image(raw, rb, 0)
    old.decode_png(c.image(d, b, 0))
    assert not d.get('skins') and not d.get('animations')
    for i, material in enumerate(raw['materials']):
        target = copy.deepcopy(material)
        if i == 1:
            target['alphaMode'] = 'BLEND'
            target['pbrMetallicRoughness']['metallicFactor'] = 0
            target['pbrMetallicRoughness']['baseColorFactor'][3] = .26
        assert d['materials'][i] in (material, target), ('source material changed', i)
    assert all('uri' not in r for r in d['buffers']+d['images'])
    names = {n['name']: i for i, n in enumerate(oriented['nodes'])}
    static = components(oriented, ob, names['airframe_static'])
    tails = [s for s in static if s['primitive'] == 0 and s['component'] in (14, 24)]
    assert len(tails) == 2 and all(s['bounds']['min'][2] > 6 for s in tails)
    mast = next(s for s in static if s['primitive'] == 3 and s['component'] == 5)
    allowed = {(s['accessor'], i) for s in tails for i in s['indices']}
    mast_allowed = {(mast['accessor'], i) for i in mast['indices']} if kind == 'mi28n' else set()
    tail_deltas, mast_deltas = [], []
    for mi, mesh in enumerate(oriented['meshes']):
        assert d['meshes'][mi] == mesh, ('source topology/material assignments', kind, mi)
        for pr in mesh['primitives']:
            assert g.accessor(d, b, pr['indices']) == g.accessor(oriented, ob, pr['indices'])
            for attribute, ai in pr['attributes'].items():
                before, after = g.accessor(oriented, ob, ai), g.accessor(d, b, ai)
                assert len(before) == len(after)
                for i, (p, q) in enumerate(zip(before, after)):
                    if attribute == 'POSITION' and (ai, i) in allowed:
                        c.close(p[:2], q[:2], 1e-7)
                        tail_deltas.append(q[2]-p[2])
                    elif attribute == 'POSITION' and (ai, i) in mast_allowed:
                        c.close([p[0], p[2]], [q[0], q[2]], 1e-7)
                        mast_deltas.append((p[1], q[1]))
                    else:
                        assert p == q, ('unauthorized source accessor edit', kind, attribute, ai, i, p, q)
    assert tail_deltas and max(tail_deltas)-min(tail_deltas) < EPS and max(tail_deltas) < 0
    for i, node in enumerate(oriented['nodes']):
        actual = copy.deepcopy(d['nodes'][i])
        target = copy.deepcopy(node)
        if node['name'] == 'vehicle_root':
            actual.pop('children', None)
            target.pop('children', None)
        if kind == 'mi28n' and node['name'] == 'main_rotor_spin':
            a, z = actual.pop('translation'), target.pop('translation')
            c.close([a[0], a[2]], [z[0], z[2]], 1e-7)
            assert a[1] > z[1]
        # Authoring extras do not alter source geometry or rig transforms.
        actual.pop('extras', None)
        target.pop('extras', None)
        assert actual == target, ('source node changed', kind, node['name'], actual, target)
    original_children = oriented['nodes'][names['vehicle_root']]['children']
    children = d['nodes'][names['vehicle_root']]['children']
    assert all(children.count(i) == 1 for i in original_children), 'detached original component'
    assert all(i in original_children or i >= len(oriented['nodes']) for i in children), 'foreign root child'
    for ai, accessor in enumerate(oriented['accessors']):
        actual, target = copy.deepcopy(d['accessors'][ai]), copy.deepcopy(accessor)
        if any(a == ai for a, _ in allowed | mast_allowed):
            actual.pop('min', None); actual.pop('max', None)
            target.pop('min', None); target.pop('max', None)
        assert actual == target, ('source accessor layout changed', kind, ai)
    if kind == 'mi28n':
        lo = min(y for y, _ in mast_deltas)
        hi = max(y for y, _ in mast_deltas)
        new_hi = max(y for _, y in mast_deltas)
        assert new_hi > hi
        lift = d['nodes'][names['main_rotor_spin']]['translation'][1]-oriented['nodes'][names['main_rotor_spin']]['translation'][1]
        assert abs(new_hi-hi-lift) < EPS, 'mast top does not follow whole assembly lift'
        for before, after in mast_deltas:
            assert abs(after-(lo+(before-lo)*(new_hi-lo)/(hi-lo))) < EPS, 'mast not coherently extended'
    return d, b, oriented, ob, sum(tail_deltas)/len(tail_deltas)


def self_check():
    pivot = [0., 0., 0.]
    assert radial_bounds([[1, 0, -1], [1, 0, 1], [2, 0, 0]], pivot, 1)[0] == 1
    assert radial_bounds([[-1, 0, -1], [1, 0, -1], [0, 0, 1]], pivot, 1)[0] == 0
    assert radial_bounds([[2, 0, 0], [2, 0, 0], [2, 0, 0]], pivot, 1) == (2., 2.)
    env = dict(axis=1, lo=-.1, hi=.1, pivot=pivot, inner=0., outer=1.)
    # All vertices outside the disk, but the triangle crosses it. Must FAIL.
    assert not outside([[-2, 0, -2], [2, 0, -2], [0, 0, 2]], env)
    assert outside([[2, 0, 0], [3, 0, 0], [2, 0, 1]], env)
    assert outside([[0, 1, 0], [1, 1, 0], [0, 1, 1]], env)
    assert not outside([[0, -1, 0], [0, 1, 0], [1, 1, 0]], env)
    annulus = dict(env, inner=.5)
    assert outside([[0, 0, 0], [.1, 0, 0], [0, 0, .1]], annulus)
    assert not outside([[0, 0, 0], [.8, 0, 0], [0, 0, .8]], annulus)
    assert not main_joint('mi28n', {'node': 'rocket_pod', 'primitive': 3, 'component': 5}, {}, [], pivot)
    print('PASS analytic math: convex radial minimum, degenerate projection, axial clipping, annuli, edge/interior crossings, nonjoint rejection')


def immutable_check():
    assert g.sha(h.f.encoded(h.FROZEN)) == '1fa12c87f861cf6d1d40eac939e7bc68b2e769d346e5a318486c6c78dace7ce9', 'Tu160 FROZEN map ABI changed'
    pins = {**h.FROZEN, **h.PINNED_INTAKE,
            'models/supplied/tu-160.glb': '705f494bc379b7371c7acd0dde80f18e5002874cc7b498ff27a684b1509f6b0e',
            'models/derived/wings_tu160.glb': '83cfe2e45141d6917520d89b6aa579dbecf5756518cdbed1151a280f4718e791',
            'authoring/native-tu160.json': '6e4cc5225141e8f38064ddb64959a1366183559511128e1548ca55df7879b774',
            'authoring/supplied-bomber/repair-record.json': '0083cdb6a06282536a4704fcdf551782b4fbdacd741177bb74ce0c7727aecd12',
            'authoring/supplied-bomber/rigs/tu-160.json': 'f0a7dc6edd03ab1ac2a303b31aa0ce68169dfc4984c203abea73244eb9058d02',
            'authoring/supplied-helicopters/blocked-native-candidate.patch.gz': 'f94b4be7dc2667b66e025820c8db603742ded6c48f9eff6df49c5293bca0a81f',
            'authoring/supplied-helicopters/clearance-record.json': '4cc3b260a2f6b142b9121fa80f10ca6a4abfd5634265ba19627281c9f041d097'}
    for name, expected in pins.items():
        assert g.sha((h.WINGS/name).read_bytes()) == expected, ('immutable bytes changed', name)
    assert sum(name.endswith('.glb') for name in pins) == 68
    assert len(json.loads((HERE/'native-fighter-pair.json').read_bytes())['models']) == 17
    assert len(json.loads((HERE/'extended-escort-models.json').read_bytes())['models']) == 8
    print('PASS immutable: all68 older GLBs, Tu160,17 fighter/8 fleet entries, all historical receipts, raw rigs/blocked record/quarantined candidate exact')


def writer_checks(cg, outputs):
    """Virtualize only destinations. All negatives trap mkdir and output opens.

    The absent-set positive exercises the real default writer using in-memory
    exclusive files. No real output, directory, or temporary GLB is written.
    """
    paths = {cg.WINGS/name: data for name, data in outputs.items()}
    real_exists, real_read, real_open = Path.exists, Path.read_bytes, Path.open
    def invoke(replacement, *, existing=None, reject=False, disk=None, check=False, write_ok=False):
        state = dict(paths if existing is None else existing)
        attempts, written = [], {}
        def exists(path):
            return path in state if path in paths else real_exists(path)
        def read(path):
            if path not in paths:
                return real_read(path)
            if path not in state:
                raise FileNotFoundError(str(path))
            return state[path]
        class Sink(io.BytesIO):
            def __init__(self, path):
                super().__init__(); self.path = path
            def close(self):
                written[self.path] = self.getvalue()
                super().close()
        def opened(path, mode='r', *args, **kwargs):
            if any(flag in mode for flag in 'wax+'):
                attempts.append((path, mode))
                assert write_ok and path in paths and mode == 'xb', 'unexpected output open'
                assert path not in state, 'overwriting existing destination'
                return Sink(path)
            return real_open(path, mode, *args, **kwargs)
        with contextlib.ExitStack() as stack:
            stack.enter_context(patch('sys.argv', ['repair-helicopter-clearance.py']+(['--check'] if check else [])))
            stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
            stack.enter_context(contextlib.redirect_stderr(io.StringIO()))
            stack.enter_context(patch.object(cg, 'generate', return_value=replacement))
            stack.enter_context(patch.object(Path, 'exists', exists))
            stack.enter_context(patch.object(Path, 'read_bytes', read))
            stack.enter_context(patch.object(Path, 'open', opened))
            mkdir = stack.enter_context(patch.object(Path, 'mkdir'))
            write = stack.enter_context(patch.object(Path, 'write_bytes'))
            if disk is not None:
                stack.enter_context(patch.object(cg.shutil, 'disk_usage', return_value=disk))
            if reject:
                try:
                    cg.main()
                except (AssertionError, FileNotFoundError):
                    pass
                else:
                    raise AssertionError('writer accepted invalid generated/existing set')
            else:
                assert cg.main() == 0, 'accepted writer must return zero'
            write.assert_not_called()
            if write_ok:
                assert written == paths and len(attempts) == len(paths), 'default writer did not emit exact approved set'
                assert mkdir.call_count == len(paths)
            else:
                mkdir.assert_not_called()
                assert not attempts, attempts
    invoke(outputs)
    invoke(outputs, check=True)
    invoke(outputs, existing={}, write_ok=True)
    negatives = 0
    for name in [*h.FROZEN, *h.PINNED_INTAKE, '../../escape', '/escape']:
        invoke({name: b'bad'}, reject=True, existing={})
        negatives += 1
    invoke({}, reject=True, existing={}); negatives += 1
    for name in outputs:
        # Literal output SHA AND size must authenticate before mkdir, even if
        # every destination is absent. Same-size damage defeats size-only guards.
        for data in (b'corrupt', bytes([outputs[name][0]^1])+outputs[name][1:],
                     'not bytes', b'x'*2_000_001):
            damaged = dict(outputs, **{name: data})
            invoke(damaged, reject=True, existing={})
            negatives += 1
        foreign = dict(paths); foreign[cg.WINGS/name] = b'foreign existing file'
        invoke(outputs, reject=True, existing=foreign); negatives += 1
        partial = dict(paths); partial.pop(cg.WINGS/name)
        invoke(outputs, reject=True, existing=partial); negatives += 1
    invoke(outputs, reject=True, existing={}, check=True); negatives += 1
    disk = cg.shutil.disk_usage(cg.WINGS)
    for free in (2**31-1, 2**31+sum(map(len, outputs.values()))-1):
        invoke(outputs, reject=True, disk=disk._replace(free=free)); negatives += 1
    with patch.object(Path, 'is_symlink', return_value=True):
        invoke(outputs, reject=True); negatives += 1
    print(f'PASS new writer: 3 exact-approved positives (existing default/--check, absent exclusive write); {negatives} pre-mkdir/open negatives: corrupt manifest/GLBs/record including absent/same-size, foreign/nonbytes/symlink/disk/oversize/partial sets; --check writes zero')
    return negatives


def historical_check(intake):
    data = (HERE/'supplied-helicopters/clearance-record.json').read_bytes()
    assert g.sha(data) == '4cc3b260a2f6b142b9121fa80f10ca6a4abfd5634265ba19627281c9f041d097'
    record = json.loads(data)
    assert record['status'] == 'FAIL_PRESCRIBED_REPAIR_NONJOINT_ROTOR_PAIR'
    assert not record['accepted_derivatives'] and not record['manifest_published']
    print('PASS historical reproduction: immutable fin-only diagnostic record, never rewritten as acceptance')
    failures = 0
    for kind, row in record['models'].items():
        source = intake['models/supplied/'+h.SOURCES[kind][0]+'.glb']
        d, b = g.unpack_glb(source)
        h.f.orient(d, b)
        names = {n['name']: i for i, n in enumerate(d['nodes'])}
        # Consume the ACTUAL generator record, not a guessed transform or ABI.
        for edit in [*row['stabilizer_edits'], *([row['mast_edit']] if row['mast_edit'] else [])]:
            ai = edit['component']['position_accessor']
            values = g.accessor(d, b, ai)
            for vertex in edit['vertex_edits']:
                assert list(values[vertex['index']]) == vertex['before']
                values[vertex['index']] = vertex['after']
            g.store_accessor(d, b, ai, values)
        spin = d['nodes'][names['main_rotor_spin']]
        spin['translation'] = [v+delta for v, delta in zip(spin['translation'], row['main_pivot_delta_m'])]
        payload = g.pack_glb(d, b)
        d, b, sd, sb, shift = source_preservation(source, payload, kind)
        attached = tail_attachment(d, b, sd, sb)
        source_names = {n['name']: i for i, n in enumerate(sd['nodes'])}
        pivot = g.point(g.world_matrices(sd)[source_names['tail_rotor_spin']], [0, 0, 0])
        tail_envs = [envelope(s, pivot, 0) for s in components(sd, sb, source_names['tail_rotor_blade_assembly'])]
        radius = max(e['outer'] for e in tail_envs)
        source_parts = components(sd, sb, source_names['airframe_static'])
        trailing = max(s['bounds']['max'][2] for s in source_parts if s['primitive'] == 0 and s['component'] in (14, 24))
        expected_shift = pivot[2]-radius-.02-trailing
        assert abs(shift-expected_shift) < EPS, ('not minimum full-disk+.02 tail translation', shift, expected_shift)
        if kind == 'mi28n':
            blade_min = min(s['bounds']['min'][1] for s in components(sd, sb, source_names['main_rotor_blade_assembly']) if s['primitive'] == 0)
            fin_max = next(s['bounds']['max'][1] for s in source_parts if s['primitive'] == 0 and s['component'] == 25)
            lift = row['main_pivot_delta_m'][1]
            assert abs(lift-(fin_max+.02-blade_min)) < EPS, 'not exact fin-only minimum lift'
        print(f'PASS {kind} prescribed geometry: original accessors/UV/PNG/topology/blade counts retained; {attached} actual boom attachments; tail shift={shift:.12g}m')
        try:
            _, checks, joints, pairs = continuous_clearance(d, b, kind, sd, sb)
        except AssertionError as error:
            assert kind == 'mi28n', str(error)
            print('FAIL '+str(error))
            failures += 1
            witness = row['prescribed_repair_counterexample']
            for prefix in ('main', 'tail'):
                pose = witness[prefix+'_pose']
                angle = math.radians(pose['angle_degrees'])
                q = [0., 0., 0., math.cos(angle/2)]
                q['xyz'.index(pose['axis'])] = math.sin(angle/2)
                d['nodes'][names[prefix+'_rotor_spin']]['rotation'] = q
            mt = c.world_triangles(d, b, d['nodes'][names['main_rotor_spin']]['children'])[witness['left_triangle_index']]
            tt = c.world_triangles(d, b, d['nodes'][names['tail_rotor_spin']]['children'])[witness['right_triangle_index']]
            for actual, expected in zip(mt, witness['left_triangle_root_m']):
                c.close(actual, expected)
            for actual, expected in zip(tt, witness['right_triangle_root_m']):
                c.close(actual, expected)
            edges, surface = (mt, tt) if witness['edge_mesh'] == 'left' else (tt, mt)
            i = witness['edge_index']
            start, end = edges[i], edges[(i+1)%3]
            direction = [end[j]-start[j] for j in range(3)]
            hit = c.ray_hit(start, direction, surface)
            assert hit is not None and 0 < hit < 1
            point = [start[j]+hit*direction[j] for j in range(3)]
            c.close(point, witness['intersection_root_m'])
            print(f'REPRODUCED independent rotor-pair witness {kind}: mainY={witness["main_pose"]["angle_degrees"]}deg tailX={witness["tail_pose"]["angle_degrees"]}deg; triangles={witness["left_triangle_index"]}/{witness["right_triangle_index"]}; point={point}')
            for prefix in ('main', 'tail'):
                d['nodes'][names[prefix+'_rotor_spin']].pop('rotation')
            different = rotor_pair_witness(d, b)
            assert different is not None
            print('REPRODUCED second independent pose: '+json.dumps(different, sort_keys=True))
            total = pivot[1]+radius+.02-blade_min
            print(f'DISTINCT minimal vertical disk/slab repair, NOT APPLIED: total Mi28N main lift={total:.12g}m; additional={total-lift:.12g}m; blade minimum Y={pivot[1]+radius+.02:.12g}m; coherently extend same mast. Full recheck required.')
        else:
            print(f'PASS {kind} continuous360: {checks} component/triangle bounds; {joints} narrow source coaxial shaft/hub joint triangle checks; {pairs} rotor-envelope pairs separated. Not native acceptance.')
    assert failures == 1, 'expected exact prescribed-candidate failure not reproduced'
    print('PASS immutable fin-only regression: AH64D clear, Mi28N blocked; two actual independent-phase contacts reproduced')


def launch_and_camera(doc, binary, entry, envelopes, kind):
    names = {n['name']: i for i, n in enumerate(doc['nodes'])}
    matrices = g.world_matrices(doc)
    def origin(name):
        return g.point(matrices[names[name]], [0, 0, 0])
    order = ['hellfire_L1', 'hellfire_R1', 'hellfire_L2', 'hellfire_R2']
    assert entry['hardpoints']['missiles'][0] == []
    assert len(entry['hardpoints']['missiles'][1]) == 4
    assert len(entry['hardpoints']['rockets']) == 2
    moving = {'main_rotor_blade_assembly', 'tail_rotor_blade_assembly'}
    static_triangles = [(n['name'], t) for i, n in enumerate(doc['nodes'])
                        if 'mesh' in n and n['name'] not in moving
                        for t in c.world_triangles(doc, binary, [i])]
    ray_checks = rotor_checks = 0
    for name, wanted in zip(order+['rocket_pod_L', 'rocket_pod_R'],
                            entry['hardpoints']['missiles'][1]+entry['hardpoints']['rockets']):
        anchor = names[name+'_launch']
        node = doc['nodes'][names[name]]
        assert anchor in node['children'] and 'mesh' in node, ('launch hierarchy', name)
        start = origin(name+'_launch')
        c.close(start, wanted, 1e-7)
        points = c.vertices(doc, binary, name)
        bounds = g.bounds(points)
        c.close(start, [(bounds['min'][0]+bounds['max'][0])/2,
                        (bounds['min'][1]+bounds['max'][1])/2, bounds['min'][2]], EPS)
        direction = [0, 0, -1]
        for owner, triangle in static_triangles:
            hit = c.ray_hit(start, direction, triangle)
            assert hit is None or hit <= EPS, ('BLOCKED launch ray', kind, name, owner, hit, triangle,
                                               'repair store position/actual anchor, not body or wheel exemptions')
            ray_checks += 1
        for envs in envelopes.values():
            for env in envs:
                # Clip the entire semi-infinite ray to a finite segment ending
                # strictly past the swept cylinder. Beyond it Z alone separates.
                end = [start[0], start[1], min(start[2], cylinder_box(env)['min'][2])-1]
                assert outside([start, end], env), ('UNPROVEN continuous launch ray', kind, name, label(env),
                                                    'move actual store/anchor clear of full swept envelope')
                rotor_checks += 1
    eye = origin('cockpit_eye')
    c.close(eye, entry['cockpit'], 1e-7)
    glass = [comp for comp in components(doc, binary, names['airframe_static']) if comp['material'] == 1]
    assert glass and doc['materials'][1]['alphaMode'] == 'BLEND'
    assert 0 < doc['materials'][1]['pbrMetallicRoughness']['baseColorFactor'][3] < 1
    # Source glazing is OPEN: side panels and windscreen, no roof/floor/rear
    # closure or interior. Do not invent a closed-cabin/inside-volume claim.
    # Require real triangles on both sides and ahead of the model-derived eye.
    cabins = sorted([comp for comp in glass if comp['bounds']['max'][2]-comp['bounds']['min'][2] > 1],
                    key=lambda comp: comp['bounds']['min'][2])
    assert len(cabins) == 2
    cabin = cabins[1]
    box = cabin['bounds']
    probe = [0, box['min'][1]+.7*(box['max'][1]-box['min'][1]),
             (box['min'][2]+box['max'][2])/2]
    probe_glass = min(t for _, tri in cabin['triangles']
                      if (t := c.ray_hit(probe, [0, 0, -1], tri)) is not None and t > EPS)
    c.close(eye, [probe[0], probe[1], probe[2]-probe_glass+.005], 1e-7)
    for direction in ([-1, 0, 0], [1, 0, 0], [0, 0, -1]):
        hits = [t for _, tri in cabin['triangles']
                if (t := c.ray_hit(eye, direction, tri)) is not None and t > EPS]
        assert hits, ('camera not bounded by actual side/windscreen triangles', kind, eye, direction)
    forward = min(t for _, tri in cabin['triangles']
                  if (t := c.ray_hit(eye, [0, 0, -1], tri)) is not None and t > EPS)
    blockers = [(t, label(comp), ti) for comp in components(doc, binary, names['airframe_static'])
                if comp['material'] != 1 for ti, tri in comp['triangles']
                if (t := c.ray_hit(eye, [0, 0, -1], tri)) is not None and EPS < t < forward-EPS]
    assert not blockers, ('opaque before actual windscreen', kind, eye, forward, sorted(blockers),
                          'repair model-derived camera, not source geometry or sightline exemptions')
    # The earlier AABB-derived eye is a concrete negative. Never weaken the
    # actual opaque-surface test just because the source has no modeled cabin.
    old_blockers = [(t, label(comp), ti) for comp in components(doc, binary, names['airframe_static'])
                    if comp['material'] != 1 for ti, tri in comp['triangles']
                    if (t := c.ray_hit(probe, [0, 0, -1], tri)) is not None and EPS < t < probe_glass-EPS]
    assert old_blockers, ('old opaque camera negative lost', kind)
    assert abs(forward-.005) < EPS
    print(f'PASS {kind} anchors/glass placement ONLY: 4 Hellfire +2 pod real tip/child origins; {ray_checks} all-static body/wheel/store ray tests; {rotor_checks} full-turn annulus ray proofs; eye={eye}, real side-panel/windscreen hits, 5mm glass gap, no opaque surface ahead; old eye negative has {len(old_blockers)} blockers. Qualified near-glass camera, NOT cabin containment/pilot-eye/native visibility acceptance.')
    return ray_checks, rotor_checks


def store_clearance(doc, binary, kind):
    names = {n['name']: i for i, n in enumerate(doc['nodes'])}
    order = ['hellfire_L1', 'hellfire_R1', 'hellfire_L2', 'hellfire_R2', 'rocket_pod_L', 'rocket_pod_R']
    stores = [components(doc, binary, names[name])[0] for name in order]
    body = [comp for i, n in enumerate(doc['nodes'][:9]) if 'mesh' in n
            and n['name'] not in ('main_rotor_blade_assembly', 'tail_rotor_blade_assembly')
            for comp in components(doc, binary, i)]
    checks = 0
    for index, store in enumerate(stores):
        for other in body+stores[index+1:]:
            a, b = store['bounds'], other['bounds']
            # Exact interval separation proves disjoint volume interiors even
            # at the genuine pylon/round tangent. ZERO tolerance or exemption.
            assert any(a['max'][j] <= b['min'][j] or b['max'][j] <= a['min'][j] for j in range(3)), (
                'UNPROVEN store/body-wheel-store volume separation', kind, label(store), label(other), a, b,
                'repair actual store position, never exempt the source component')
            checks += 1
    print(f'PASS {kind} stores: {checks} exact source-body/wheel/store volume separations, including pylon tangency; no EPS/exemptions')
    return checks


def accepted_geometry(outputs, manifest):
    totals = dict(triangles=0, joints=0, pairs=0, rays=0, rotor_rays=0, store_pairs=0)
    assert set(manifest['models']) == set(h.SOURCES)
    for kind, (slug, *_) in h.SOURCES.items():
        entry = manifest['models'][kind]
        source = (h.WINGS/'models/supplied'/(slug+'.glb')).read_bytes()
        filename = 'models/derived/wings_'+kind+'.glb'
        assert entry['file'] in (filename, filename.removeprefix('models/'))
        assert entry['sha256'] == g.sha(outputs[filename])
        d, b, sd, sb, shift = source_preservation(source, outputs[filename], kind)
        attached = tail_attachment(d, b, sd, sb)
        totals['store_pairs'] += store_clearance(d, b, kind)
        names = {n['name']: i for i, n in enumerate(sd['nodes'])}
        pivot = g.point(g.world_matrices(sd)[names['tail_rotor_spin']], [0, 0, 0])
        tail_envs = [envelope(s, pivot, 0) for s in components(sd, sb, names['tail_rotor_blade_assembly'])]
        radius = max(e['outer'] for e in tail_envs)
        statics = components(sd, sb, names['airframe_static'])
        trailing = max(s['bounds']['max'][2] for s in statics if s['primitive'] == 0 and s['component'] in (14, 24))
        assert abs(shift-(pivot[2]-radius-.02-trailing)) < EPS, 'not exact connected-stabilizer translation'
        if kind == 'mi28n':
            blade_min = min(s['bounds']['min'][1] for s in components(sd, sb, names['main_rotor_blade_assembly']) if s['primitive'] == 0)
            required = pivot[1]+radius+.02-blade_min
            lift = d['nodes'][names['main_rotor_spin']]['translation'][1]-sd['nodes'][names['main_rotor_spin']]['translation'][1]
            assert abs(required-.667406191251) < 1e-12
            assert abs(lift-required) < 1e-12, ('not authorized total whole-assembly lift', lift, required)
            print(f'PASS Mi28N physical correction: total main lift={lift:.12g}m = tail full swept TOP+.02-original blade MIN; same mast fixed bottom/coherent hub. Geometry correction, NOT mechanical certification.')
        envs, checks, joints, pairs = continuous_clearance(d, b, kind, sd, sb)
        if kind == 'mi28n':
            gap = min(e['lo'] for e in envs['main'] if e['primitive'] == 0)-max(cylinder_box(e)['max'][1] for e in envs['tail'])
            assert abs(gap-.02) < EPS, ('new blade/tail full-phase vertical gap', gap)
            print(f'PASS Mi28N exact independent-phase blade/tail vertical separation: {gap:.12g}m for ALL angles, not sampled poses')
        rays, rotor_rays = launch_and_camera(d, b, entry, envs, kind)
        totals['triangles'] += checks; totals['joints'] += joints; totals['pairs'] += pairs
        totals['rays'] += rays; totals['rotor_rays'] += rotor_rays
        print(f'PASS {kind} continuous360: {checks} component/triangle bounds, {joints} unchanged narrow shaft/hub mating checks, {pairs} independent-phase rotor envelope pairs exactly separated; {attached} connected original stabilizers. ALL static body/gear/added-store components, both rotors; EPS={EPS:g}.')
    return totals


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    args = parser.parse_args()
    self_check()
    intake = h.generate_intake(args.archive)
    for name, data in intake.items():
        assert (h.WINGS/name).read_bytes() == data, name
    historical_check(intake)
    immutable_check()
    cg = load('accepted_helicopter_generator', 'repair-helicopter-clearance.py')
    outputs = cg.generate()
    cg.validate_outputs(outputs)
    assert outputs == cg.generate(), 'accepted generator is not reproducible'
    check_output_pins(outputs)
    assert set(h.FORBIDDEN) < set(outputs), 'no complete accepted assets generated'
    manifest = json.loads(outputs['authoring/native-helicopter-pair.json'])
    assert manifest['schema'] == 'wings_native_helicopter_pair_v1'
    totals = accepted_geometry(outputs, manifest)
    guards = writer_checks(cg, outputs)
    # Recheck ALL three raw contacts and default raw refusal even while exact
    # accepted derivatives coexist. Never bypass the raw writer's own guard.
    assert old.main() == 1, 'raw checker must retain explicit BLOCKED exit1'
    immutable_check()
    print('PASS independent clearance acceptance: historical raw contacts=3, old fin-only rotor contacts=2; '+
          ', '.join(f'{k}={v}' for k, v in totals.items())+f'; new writer negatives={guards}. Read-only checker; native/hardware/rights acceptance held.')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print('FAIL independent clearance: '+str(error))
        print('ACTION: repair the reported actual component/anchor or authenticated output/storage guard; retain original witnesses and rerun. No acceptance.')
        raise SystemExit(1)

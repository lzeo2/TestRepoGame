#!/usr/bin/env python3
"""Decode actual submarine buffers, topology, joints and clearance; CPU evidence only.
Run: python3 -B Games/Wings/authoring/submarine-model-check.py
No dependencies, runtime build, browser or output writes. No visual/native PASS.
"""
import hashlib
import json
import math
from pathlib import Path
import runpy
import struct

HERE = Path(__file__).resolve().parent
WINGS = HERE.parent
G = runpy.run_path(str(HERE/'generate-submarine.py'))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def close(a, b, tolerance=3e-5):
    assert len(a) == len(b) and all(abs(x-y) <= tolerance for x, y in zip(a, b)), (a, b)


def cross(a, b):
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]


def minus(a, b):
    return [x-y for x, y in zip(a, b)]


def extent(points):
    return {key: [func(p[j] for p in points) for j in range(3)]
            for key, func in [('min', min), ('max', max)]}


def decode(data):
    assert struct.unpack_from('<4sII', data) == (b'glTF', 2, len(data))
    size, kind = struct.unpack_from('<I4s', data, 12)
    assert kind == b'JSON' and size % 4 == 0
    doc = json.loads(data[20:20+size])
    offset = 20+size
    size, kind = struct.unpack_from('<I4s', data, offset)
    assert kind == b'BIN\0' and size % 4 == 0 and offset+8+size == len(data)
    return doc, data[offset+8:]


def values(doc, binary, index):
    a = doc['accessors'][index]
    assert not a.get('normalized') and 'sparse' not in a
    view = doc['bufferViews'][a['bufferView']]
    assert view['buffer'] == 0
    width = {'VEC3': 3, 'SCALAR': 1}[a['type']]
    fmt = '<'+{5126: 'f', 5123: 'H'}[a['componentType']]*width
    step = struct.calcsize(fmt)
    assert view.get('byteStride', step) == step
    start = view.get('byteOffset', 0)+a.get('byteOffset', 0)
    assert a['count'] > 0 and start % {5126: 4, 5123: 2}[a['componentType']] == 0
    assert start+a['count']*step <= view.get('byteOffset', 0)+view['byteLength'] <= len(binary)
    return list(struct.iter_unpack(fmt, binary[start:start+a['count']*step]))


def matmul(a, b):
    return [[sum(a[i][k]*b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def apply(m, p):
    return [sum(m[i][j]*p[j] for j in range(3)) for i in range(3)]


def rotation(q):
    x, y, z, w = q
    assert abs(sum(v*v for v in q)-1) < 1e-6
    return [[1-2*y*y-2*z*z, 2*x*y-2*z*w, 2*x*z+2*y*w],
            [2*x*y+2*z*w, 1-2*x*x-2*z*z, 2*y*z-2*x*w],
            [2*x*z-2*y*w, 2*y*z+2*x*w, 1-2*x*x-2*y*y]]


def axis_rotation(axis, angle):
    # Independent Rodrigues matrix: generator uses quaternion multiplication.
    x, y, z = axis
    c, s, t = math.cos(angle), math.sin(angle), 1-math.cos(angle)
    return [[t*x*x+c, t*x*y-s*z, t*x*z+s*y],
            [t*x*y+s*z, t*y*y+c, t*y*z-s*x],
            [t*x*z-s*y, t*y*z+s*x, t*z*z+c]]


def triangles_intersect(a, b):
    """Separating-axis test including coplanar triangle edge normals."""
    ae = [minus(a[(i+1) % 3], a[i]) for i in range(3)]
    be = [minus(b[(i+1) % 3], b[i]) for i in range(3)]
    an, bn = cross(ae[0], ae[1]), cross(be[0], be[1])
    axes = [an, bn]+[cross(x, y) for x in ae for y in be]
    axes += [cross(an, e) for e in ae]+[cross(bn, e) for e in be]
    for axis in axes:
        length = math.sqrt(sum(x*x for x in axis))
        if length < 1e-10:
            continue
        axis = [x/length for x in axis]
        ap = [sum(p[j]*axis[j] for j in range(3)) for p in a]
        bp = [sum(p[j]*axis[j] for j in range(3)) for p in b]
        if max(ap) < min(bp)-1e-7 or max(bp) < min(ap)-1e-7:
            return False
    return True


def main():
    originals = {p.name: digest(p.read_bytes()) for p in (WINGS/'models').glob('*.glb')}
    assert originals == G['ORIGINALS'], 'Existing original models changed'
    data = (WINGS/G['MODEL']).read_bytes()
    manifest_data = (WINGS/G['DESCRIPTOR']).read_bytes()
    manifest = json.loads(manifest_data)
    assert G['generate']() == G['generate']() == (data, manifest_data), 'Nonreproducible or stale outputs'
    doc, binary = decode(data)
    assert len(data) <= 1000000 and len(binary) >= doc['buffers'][0]['byteLength']
    assert doc['buffers'] == [{'byteLength': len(binary)}]
    assert not any(key in doc for key in ['textures', 'images', 'skins', 'animations', 'extensionsUsed', 'extensionsRequired'])
    assert all('uri' not in b for b in doc['buffers'])
    assert 'uri' not in json.dumps(doc)  # No dormant external-resource references.
    assert doc['scene'] == 0 and doc['scenes'] == [{'nodes': [0]}]
    nodes = doc['nodes']
    names = {n['name']: i for i, n in enumerate(nodes)}
    assert len(names) == len(nodes) and names[manifest['root']] == 0
    root = nodes[0]
    assert root['translation'] == [0, 0, 0] and root['rotation'] == [0, 0, 0, 1] and root['scale'] == [1, 1, 1]
    parents = {}
    for i, n in enumerate(nodes):
        assert 'matrix' not in n and n.get('scale', [1, 1, 1]) == [1, 1, 1]
        rotation(n.get('rotation', [0, 0, 0, 1]))
        for c in n.get('children', []):
            assert 0 < c < len(nodes) and c not in parents and c != i
            parents[c] = i
    assert set(parents) == set(range(1, len(nodes)))
    for i in parents:
        seen = set()
        while i != 0:
            assert i not in seen
            seen.add(i)
            i = parents[i]
    controls = {c['node']: c for c in manifest['articulation']}
    assert set(controls) == {'propulsion_rotor', 'stern_dive_port', 'stern_dive_starboard',
                             'steering_upper', 'steering_lower', 'bow_dive_port', 'bow_dive_starboard'}

    def world(i, p, poses=None):
        while True:
            n = nodes[i]
            m = rotation(n.get('rotation', [0, 0, 0, 1]))
            if poses and n['name'] in poses:
                m = matmul(m, axis_rotation(controls[n['name']]['axis_local'], poses[n['name']]))
            p = [x+y for x, y in zip(apply(m, p), n.get('translation', [0, 0, 0]))]
            if i == 0:
                return p
            i = parents[i]

    geometry, faces = {}, {}
    triangles, vertices, used_materials, used_accessors = 0, 0, set(), set()
    for i, n in enumerate(nodes):
        if 'mesh' not in n:
            continue
        mesh = doc['meshes'][n['mesh']]
        assert mesh['name'] == n['name'] and len(mesh['primitives']) == 1
        pr = mesh['primitives'][0]
        assert pr['mode'] == 4 and set(pr['attributes']) == {'POSITION', 'NORMAL'}
        used_accessors.update([pr['indices'], *pr['attributes'].values()])
        used_materials.add(pr['material'])
        ps = values(doc, binary, pr['attributes']['POSITION'])
        ns = values(doc, binary, pr['attributes']['NORMAL'])
        ids = [v[0] for v in values(doc, binary, pr['indices'])]
        assert len(ps) == len(ns) and len(ids) % 3 == 0
        assert set(ids) == set(range(len(ps))) and len(set(ps)) == len(ps), n['name']
        assert all(math.isfinite(v) for p in ps+ns for v in p)
        assert all(abs(sum(x*x for x in v)-1) < 2e-6 for v in ns)
        for ai, vs in [(pr['attributes']['POSITION'], ps), (pr['attributes']['NORMAL'], ns)]:
            for key in ['min', 'max']:
                close(doc['accessors'][ai][key], extent(vs)[key])
        edges, volume = {}, 0
        for j in range(0, len(ids), 3):
            a, b, c = ids[j:j+3]
            face = cross(minus(ps[b], ps[a]), minus(ps[c], ps[a]))
            area2 = math.sqrt(sum(v*v for v in face))
            assert area2 > 1e-9, ('Degenerate triangle', n['name'], j//3)
            average = [ns[a][k]+ns[b][k]+ns[c][k] for k in range(3)]
            assert sum(face[k]*average[k] for k in range(3))/area2 > .05, ('Winding/normal mismatch', n['name'])
            volume += sum(ps[a][k]*cross(ps[b], ps[c])[k] for k in range(3))/6
            for u, v in [(a, b), (b, c), (c, a)]:
                key = tuple(sorted((u, v)))
                edges.setdefault(key, []).append((u, v))
        assert volume > 1e-8, ('Inside-out volume', n['name'], volume)
        assert all(len(v) == 2 and v[0] == v[1][::-1] for v in edges.values()), ('Open/nonmanifold mesh', n['name'])
        geometry[n['name']] = ps
        faces[n['name']] = [[ps[k] for k in ids[j:j+3]] for j in range(0, len(ids), 3)]
        triangles += len(ids)//3
        vertices += len(ps)
    assert used_accessors == set(range(len(doc['accessors'])))
    assert len(geometry) == len(doc['meshes'])
    assert used_materials == set(range(len(doc['materials']))) == set(range(7))
    for view in doc['bufferViews']:
        assert view['buffer'] == 0 and view['byteOffset'] % 4 == 0
        assert view['byteOffset']+view['byteLength'] <= len(binary)
    for m in doc['materials']:
        pbr = m['pbrMetallicRoughness']
        assert set(pbr) == {'baseColorFactor', 'metallicFactor', 'roughnessFactor'}
        assert len(pbr['baseColorFactor']) == 4 and all(0 <= x <= 1 for x in pbr['baseColorFactor'])
        assert 0 <= pbr['metallicFactor'] <= 1 and .4 <= pbr['roughnessFactor'] <= 1
        assert m['alphaMode'] == 'OPAQUE' and not m['doubleSided']
        if 'coating' in m['name']:
            assert pbr['metallicFactor'] == 0 and pbr['roughnessFactor'] >= .8
    assert manifest['triangles'] == triangles and 8000 <= triangles <= 18000
    assert manifest['sha256'] == digest(data) and manifest['bytes'] == len(data)
    assert manifest['original_existing_models_sha256'] == originals
    assert manifest['waterline_y'] == 0 and manifest['axes'] == {'meters': True, 'forward': '-Z', 'up': '+Y', 'right': '+X'}
    assert manifest['objective_only'] and manifest['faction_slots'] == 2
    assert manifest['player_vehicle_kind'] is None and not manifest['runtime_consumed']
    assert manifest['supported_runtime_weapon_capabilities'] == []
    assert manifest['creation']['third_party_code_mesh_texture_inputs'] == []
    rest = [world(names[name], p) for name, ps in geometry.items() for p in ps]
    for key in ['min', 'max']:
        close(manifest['static_bounds_root'][key], extent(rest)[key])
    assert extent(rest)['min'][1] < 0 < extent(rest)['max'][1]

    # Hull envelope comes from SERIALIZED vertices, not the generator's profile function.
    hull = geometry['pressure_hull_fairing']
    sections = {}
    for x, y, z in hull:
        sections.setdefault(z, []).append((x, y))
    assert len(sections) >= 74 and max(x for x, y, z in hull) > 4.7
    assert max(z for x, y, z in hull)-min(z for x, y, z in hull) > 78
    ordered = sorted(sections)

    def max_radius(zlow, zhigh):
        # Include both bracketing rings: enclosing slab of the actual piecewise-linear loft.
        zs = [z for z in ordered if zlow <= z <= zhigh]
        if any(z <= zlow for z in ordered):
            zs.append(max(z for z in ordered if z <= zlow))
        if any(z >= zhigh for z in ordered):
            zs.append(min(z for z in ordered if z >= zhigh))
        return (max((abs(x) for z in zs for x, y in sections[z]), default=0),
                max((abs(y-manifest['hull_center_y']) for z in zs for x, y in sections[z]), default=0))

    # Blade components are rigid relative to one another, so rest separation proves all spin phases.
    blade_faces = [[(face, extent(face)) for face in faces['propeller_blade_'+str(i)]] for i in range(1, 8)]
    narrow_checks = 0
    for i, aa in enumerate(blade_faces):
        for bb in blade_faces[i+1:]:
            for a, ab in aa:
                for b, box in bb:
                    if any(ab['max'][j] < box['min'][j] or box['max'][j] < ab['min'][j] for j in range(3)):
                        continue
                    narrow_checks += 1
                    assert not triangles_intersect(a, b), 'Propeller blades intersect'
    # Sanity checks keep the collision test honest for coplanar, crossed and separated faces.
    face = [[0, 0, 0], [1, 0, 0], [0, 1, 0]]
    assert triangles_intersect(face, [[.1, .1, 0], [.8, .1, 0], [.1, .8, 0]])
    assert triangles_intersect(face, [[.2, .2, -1], [.2, .2, 1], [.8, .2, 0]])
    assert not triangles_intersect(face, [[2, 2, 0], [3, 2, 0], [2, 3, 0]])
    full_sweep = list(rest)
    poses_checked = 0
    minimum_plane_gap = math.inf
    for name, c in controls.items():
        idx = names[name]
        assert parents[idx] == 0 and 'mesh' in nodes[idx]
        close(c['rest_translation'], nodes[idx]['translation'])
        close(c['rest_rotation'], nodes[idx]['rotation'])
        assert sum(a*a for a in c['axis_local']) == 1
        expected_axis = [0, 0, 1] if name == 'propulsion_rotor' else ([0, 1, 0] if name.startswith('steering_') else [1, 0, 0])
        close(apply(rotation(c['rest_rotation']), c['axis_local']), expected_axis)
        assert c['mapping']['status'] == 'proposed_adapter_channel_not_existing_FC_field'
        assert c['mapping']['source'].startswith('adapter.authoritative_')
        descendants = []
        for gn in geometry:
            i = names[gn]
            while i != idx and i in parents:
                i = parents[i]
            if i == idx:
                descendants.append(gn)
        points = [world(names[gn], p) for gn in descendants for p in geometry[gn]]
        for key in ['min', 'max']:
            close(c['rest_bounds_root'][key], extent(points)[key])
        if name == 'propulsion_rotor':
            assert len(descendants) == 8 and c['limits_rad'] is None
            assert len(nodes[idx]['children']) == 7
            assert c['mapping']['at_rest_rad_s'] == 0 and c['mapping']['maximum_rad_s'] == 8
            angles = [2*math.pi*j/180 for j in range(181)]
        else:
            assert c['limits_rad'] == [-.30, .30]
            angles = [-.30+.60*j/30 for j in range(31)]
        baseline = points
        moved = False
        for angle in angles:
            posed = [world(names[gn], p, {name: angle}) for gn in descendants for p in geometry[gn]]
            posed_box = extent(posed)
            full_sweep.extend(posed)
            moved |= any(sum((a[j]-b[j])**2 for j in range(3)) > .001 for a, b in zip(posed, baseline))
            for j in range(3):
                assert posed_box['min'][j] >= c['swept_bounds_root']['min'][j]-3e-5
                assert posed_box['max'][j] <= c['swept_bounds_root']['max'][j]+3e-5
            if name != 'propulsion_rotor':
                rx, ry = max_radius(posed_box['min'][2], posed_box['max'][2])
                if 'steering_' in name:
                    gap = min(abs(p[1]-manifest['hull_center_y']) for p in posed)-ry
                else:
                    gap = min(abs(p[0]) for p in posed)-rx
                assert gap > .15, ('Plane/hull clearance', name, angle, gap)
                minimum_plane_gap = min(minimum_plane_gap, gap)
                # Other static assemblies have disjoint AABBs, except the deliberate hinge boundary.
                for static, ps in geometry.items():
                    if static in descendants or static in ['pressure_hull_fairing', name+'_hinge_support']:
                        continue
                    if static in controls or static.startswith('propeller_blade_'):
                        continue  # Other moving joints checked by their disjoint stern/bow spans below.
                    sb = extent([world(names[static], p) for p in ps])
                    assert any(posed_box['max'][j] <= sb['min'][j]+1e-5 or
                               posed_box['min'][j] >= sb['max'][j]-1e-5 for j in range(3)), (name, static)
            else:
                assert posed_box['min'][2] > 38.9  # Behind the static hull end at Z37 and all planes.
                for gn in descendants:
                    if gn == name:
                        continue  # Shaft intentionally seats inside hub, never inside blades.
                    for p in geometry[gn]:
                        q = world(names[gn], p, {name: angle})
                        assert math.hypot(q[0], q[1]-manifest['hull_center_y']) > .50
            poses_checked += 1
        assert moved, ('Static-only false rig', name)
        assert [world(names[gn], p, {name: 0}) for gn in descendants for p in geometry[gn]] == baseline
    # Every joint has independent geometry: cross-plane envelopes do not overlap at any pose.
    joints = list(controls)
    for i, a in enumerate(joints):
        for b in joints[i+1:]:
            ab, bb = controls[a]['swept_bounds_root'], controls[b]['swept_bounds_root']
            assert any(ab['max'][j] < bb['min'][j] or bb['max'][j] < ab['min'][j] for j in range(3)), (a, b)
    sb = extent(full_sweep)
    for j in range(3):
        promised = manifest['continuous_swept_bounds_root']
        assert sb['min'][j] >= promised['min'][j]-3e-5 and sb['max'][j] <= promised['max'][j]+3e-5
        assert abs(sb['min'][j]-promised['min'][j]) < .005
        assert abs(sb['max'][j]-promised['max'][j]) < .005

    ray_samples = 0
    for origin in manifest['launch_origins']:
        idx, cuff = names[origin['node']], names[origin['geometry_node']]
        assert parents[idx] == cuff and not origin['capability_enabled']
        ps = geometry[origin['geometry_node']]
        ring = [p for p in ps if abs(p[2]+.55) < 1e-6 and abs(math.hypot(p[0], p[1])-.36) < 1e-6]
        assert len(ring) == 24
        center = [sum(p[j] for p in ring)/len(ring) for j in range(3)]
        close(origin['origin_local'], [center[0], center[1], center[2]-.05])
        actual = world(idx, [0, 0, 0])
        close(actual, origin['origin_rest_root'])
        end = world(cuff, [0, 0, -1.60])
        direction = minus(end, actual)
        close(direction, origin['direction_rest_root'])
        assert direction[2] < -.9 and abs(direction[0]) > .3
        assert .25 < min(math.hypot(p[0], p[1]) for p in ring)-.10
        for k in range(121):
            point = [actual[j]+direction[j]*k*.1 for j in range(3)]
            rx, _ = max_radius(point[2]-.25, point[2]+.25)
            assert abs(point[0]) > rx+.25, ('Launch/hull clipping', origin['node'], k)
            ray_samples += 1
        # Arbitrary world translation/yaw/pitch must transform a real child anchor, not reuse root coordinates.
        old_t, old_q = root['translation'], root['rotation']
        yaw, pitch = .91, -.23
        # Independent composed Y*X quaternion for the root fixture.
        root['rotation'] = [math.cos(yaw/2)*math.sin(pitch/2), math.sin(yaw/2)*math.cos(pitch/2),
                            -math.sin(yaw/2)*math.sin(pitch/2), math.cos(yaw/2)*math.cos(pitch/2)]
        root['translation'] = [17, -23, 41]
        x, y, z = actual
        py, pz = y*math.cos(pitch)-z*math.sin(pitch), y*math.sin(pitch)+z*math.cos(pitch)
        expected = [17+x*math.cos(yaw)+pz*math.sin(yaw), -23+py, 41-x*math.sin(yaw)+pz*math.cos(yaw)]
        close(world(idx, [0, 0, 0]), expected)
        root['translation'], root['rotation'] = old_t, old_q
    assert len(manifest['launch_origins']) == 2
    assert {p.name: digest(p.read_bytes()) for p in (WINGS/'models').glob('*.glb')} == originals
    print(f'PASS submarine: {triangles} triangles; {vertices} vertices; {len(geometry)} closed manifold components; 7/7 materials used')
    print(f'PASS joints: 7 geometry-backed controls; {poses_checked} poses; continuous swept bounds; minimum plane/hull gap {minimum_plane_gap:.3f}m')
    print(f'PASS launch: 2 terminal-ring-derived origins; {ray_samples} clearance samples; rotated world transforms')
    print(f'PASS seven propeller blades mutually disjoint; {narrow_checks} narrow triangle-pair checks; signed world axes verified')
    print(f'PASS reproducible GLB/descriptor; {len(data)} bytes; SHA256 {digest(data)}; original models unchanged {len(originals)}/{len(originals)}')
    print('CPU geometry/pose evidence only; no runtime, visual-realism, native, contact/depth or weapon-capability acceptance.')


if __name__ == '__main__':
    main()

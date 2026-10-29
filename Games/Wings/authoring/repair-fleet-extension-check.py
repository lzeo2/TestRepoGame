#!/usr/bin/env python3
"""Independent serialized geometry/pose regression. CPU only, not native acceptance."""
import argparse
import copy
import json
import math
from pathlib import Path
import runpy
import subprocess
from unittest.mock import patch
import zipfile

HERE = Path(__file__).resolve().parent
F = runpy.run_path(str(HERE/'repair-fleet-extension.py'))
C = runpy.run_path(str(HERE/'repair-escorts-check.py'))
# Reuse the independent checker, not generator matrices/accessor implementations.
decode, values, world = (C[n] for n in ('decode', 'values', 'world'))
close, cross, sub = (C[n] for n in ('close', 'cross', 'subtract'))
sha = C['digest']


def box(points):
    return {key: [fun(p[j] for p in points) for j in range(3)]
            for key, fun in [('min', min), ('max', max)]}


def points(d, b, node):
    return [p for pr in d['meshes'][node['mesh']]['primitives']
            for p in values(d, b, pr['attributes']['POSITION'])]


def components(d, b, node):
    # Independent adjacency traversal over position-welded triangle edges.
    result = []
    for pr in d['meshes'][node['mesh']]['primitives']:
        ps = values(d, b, pr['attributes']['POSITION'])
        ids = [v[0] for v in values(d, b, pr['indices'])]
        edges = {p: set() for p in ps}
        for i in range(0, len(ids), 3):
            a, c, e = [ps[k] for k in ids[i:i+3]]
            edges[a].update((c, e)); edges[c].update((a, e)); edges[e].update((a, c))
        while edges:
            pending, group = [next(iter(edges))], []
            while pending:
                p = pending.pop()
                if p not in edges:
                    continue
                pending.extend(edges.pop(p)); group.append(p)
            result.append(box(group))
    return result


def segment_triangle(a, end, triangle):
    # Independent Moller-Trumbore segment test against actual static triangles.
    p, q, r = triangle
    direction, e1, e2 = sub(end, a), sub(q, p), sub(r, p)
    h = cross(direction, e2)
    det = sum(x*y for x, y in zip(e1, h))
    if abs(det) < 1e-10:
        return False
    s = sub(a, p)
    u = sum(x*y for x, y in zip(s, h))/det
    vq = cross(s, e1)
    v = sum(x*y for x, y in zip(direction, vq))/det
    t = sum(x*y for x, y in zip(e2, vq))/det
    return u >= -1e-8 and v >= -1e-8 and u+v <= 1+1e-8 and 1e-7 < t <= 1


def check_type022(d, b, raw, m, rig, names, comp):
    assert set(names) == {'vessel_root_waterline', 'static_hull_deck_superstructure'}
    assert rig['controls'] == rig['animations_included'] == m['articulation'] == []
    assert m['main_gun_geometry'] is None and m['launch_origins'] == []
    assert not any(token in name for name in names for token in ['gun', 'ramp', 'missile', 'propeller', 'sensor'])
    assert len(d['nodes']) == len(raw['nodes']) == 2
    restored = copy.deepcopy(d['nodes'])
    root_extras = restored[names[m['root']]]['extras']
    root_extras['asset_forward'] = raw['nodes'][names[m['root']]]['extras']['asset_forward']
    assert root_extras.pop('repair_source_id') == m['source_model_id']
    assert restored == raw['nodes'], 'static rest nodes/hierarchy changed beyond orientation metadata'
    assert m['static_bounds_root'] == m['continuous_swept_bounds_root'] == m['bounds']
    close(m['bounds']['min'], [-5.935983180999756, -1.5, -21.299999237060547])
    close(m['bounds']['max'], [5.935983180999756, 14.067999839782715, 21.51300048828125])
    length = m['bounds']['max'][2]-m['bounds']['min'][2]
    hulls = sorted([c for c in comp if c['min'][1] < 0 < c['max'][1]
                    and c['max'][2]-c['min'][2] > .9*length], key=lambda c: c['min'][0])
    assert len(hulls) == 2 and hulls[0]['max'][0] < -2.9 < 0 < 2.9 < hulls[1]['min'][0]
    collision = m['collision']
    assert collision['hull'] == hulls[0] and collision['island_components'][0] == hulls[1]
    decks = [c for c in comp if c['min'][0] < 0 < c['max'][0]
             and 2 < c['min'][1] < 2.2 and 2.8 < c['max'][1] < 2.9
             and c['max'][2]-c['min'][2] > .7*length]
    assert decks == [collision['deck']]
    cabins = [c for c in comp if c['min'][0] < 0 < c['max'][0]
              and c['min'][1] >= 2.79 and c['max'][1] < 7
              and all(c['max'][j]-c['min'][j] > size for j, size in enumerate([2, 1, 3]))]
    assert len(cabins) == 2 and collision['island_components'][1:] == cabins
    additional = collision['island_components']
    assert collision['island_bounds'] == box([p for c in additional for p in [c['min'], c['max']]])
    assert 'second_pontoon' in collision['island_components_basis']
    boxes = [collision['hull'], collision['deck']]+additional
    assert all(c in comp for c in boxes) and len(boxes) == 5
    static_i = names['static_hull_deck_superstructure']
    triangles = []
    for pr in d['meshes'][d['nodes'][static_i]['mesh']]['primitives']:
        ps = values(d, b, pr['attributes']['POSITION'])
        ids = [v[0] for v in values(d, b, pr['indices'])]
        triangles.extend([[world(d, static_i, ps[k]) for k in ids[j:j+3]] for j in range(0, len(ids), 3)])
    probes = []
    # Longitudinal tunnel rays must not see an aggregate waterline hull.
    for x in [-2, -1, 0, 1, 2]:
        for y in [-1, 0, 1, 2]:
            probes.append(([x, y, -30], [x, y, 30], False))
    # Both actual pontoons, connecting deck, lower cabin and upper cabin.
    for x, y in [(-4.392, 0), (4.392, 0), (0, 2.5), (0, 4), (0, 6.5)]:
        probes.append(([x, y, -30], [x, y, 30], True))
    def posed(p, yaw):
        c, s = math.cos(yaw), math.sin(yaw)
        return [123+c*p[0]+s*p[2], 7+p[1], -321-s*p[0]+c*p[2]]
    def local(p, yaw):
        c, s = math.cos(yaw), math.sin(yaw)
        x, z = p[0]-123, p[2]+321
        return [c*x-s*z, p[1]-7, s*x+c*z]
    rays = gaps = 0
    for yaw in [0, .37, -1.2, math.pi/2, math.pi]:
        posed_triangles = [[posed(p, yaw) for p in tri] for tri in triangles]
        for a, end, expected in probes:
            pa, pe = posed(a, yaw), posed(end, yaw)
            hit = any(C['segment_hits'](local(pa, yaw), local(pe, yaw), c) for c in boxes)
            actual = any(segment_triangle(pa, pe, tri) for tri in posed_triangles)
            assert hit == actual == expected, (yaw, a, end, hit, actual, expected)
            rays += 1; gaps += not expected
    assert gaps == 100
    print(f'PASS wings_type022_houbei: 2988 triangles; 2 exact static nodes; controls/gun/launches absent; 5 source-component boxes; {rays} rotated triangle/box rays, {gaps} tunnel misses / zero phantom hits')
    return rays


def check_carrier(d, b, raw, rb, m, rig, names, comp, slug):
    # Independent calibration from the authenticated meshes, not another hull's scale.
    calibration = {
        'wings_charles_de_gaulle_r91': (304, [229, 230, 265], [], 2, 18, 42),
        'wings_queen_elizabeth_class': (338, [243, 244, 274, 282, 283, 313], [203, 204], 4, 20, 45),
        'wings_liaoning_type001': (303, [232, 233, 270], [192, 193], 4, 18, 42),
        'wings_admiral_kuznetsov_project1143_5': (326, [232, 233, 270], [192, 193], 4, 18, 42),
    }
    count, island_ids, ramp_ids, prop_count, deck_top, solid_top = calibration[slug]
    assert len(comp) == count
    collision = m['collision']
    assert collision['hull'] == comp[0] and collision['deck'] == comp[1]
    assert collision['deck']['max'][1] == deck_top
    assert collision['source_component_calibration'] == {
        'total': count, 'hull': 0, 'deck': 1, 'island_solids': island_ids, 'static_ramps': ramp_ids}
    boxes = [comp[0], comp[1]]+[comp[i] for i in island_ids+ramp_ids]
    assert collision['island_components'] == boxes[2:]
    assert collision['island_bounds'] == box([p for c in boxes[2:] for p in [c['min'], c['max']]])
    assert max(c['max'][1] for c in boxes) == solid_top < m['bounds']['max'][1]-5
    assert m['main_gun_geometry'] is None and m['launch_origins'] == []
    assert rig['animations_included'] == [] and len(rig['controls']) == len(m['articulation']) == prop_count
    props = {c['node']: c for c in m['articulation']}
    assert set(names) == set(props) | {'vessel_root_waterline', 'static_hull_deck_superstructure'}
    assert all('propeller' in name for name in props)
    static_i = names['static_hull_deck_superstructure']
    assert m['static_bounds_root'] == box(points(d, b, d['nodes'][static_i]))
    # No synthetic anchors, moving decks or renamed mesh hierarchy.
    restored = copy.deepcopy(d['nodes'])
    for i, node in enumerate(restored):
        if 'translation' in node:
            node['translation'][2] *= -1
        if 'rotation' in node:
            node['rotation'][0] *= -1; node['rotation'][1] *= -1
    extras = restored[names[m['root']]]['extras']
    extras['asset_forward'] = raw['nodes'][names[m['root']]]['extras']['asset_forward']
    assert extras.pop('repair_source_id') == m['source_model_id']
    assert restored == raw['nodes']
    sweeps, pose_count = [], 0
    for rc in rig['controls']:
        c = props[rc['node']]; i = names[c['node']]; n = d['nodes'][i]
        assert rc['parent'] == m['root'] and rc['influenced_mesh_nodes'] == [c['node']]
        assert rc['suggested_local_rotation_axis'] == c['axis_local'] == [0, 0, -1]
        close(c['rest_translation'], [rc['pivot_world_m'][0], rc['pivot_world_m'][1], -rc['pivot_world_m'][2]])
        assert n['translation'] == c['rest_translation'] and 'limits_rad' not in c
        ps = points(d, b, n); local = box(ps)
        assert c['bounds_local'] == local
        radius = max(math.hypot(p[0], p[1]) for p in ps); pivot = n['translation']
        swept = {'min': [pivot[0]-radius, pivot[1]-radius, pivot[2]+local['min'][2]],
                 'max': [pivot[0]+radius, pivot[1]+radius, pivot[2]+local['max'][2]]}
        assert c['swept_bounds_root'] == swept
        sweeps.append(swept)
        # Regular and per-vertex extremal angles prove the analytic continuous envelope.
        extremal = max(ps, key=lambda p: math.hypot(p[0], p[1]))
        angles = [k*math.tau/16 for k in range(16)] + [math.atan2(extremal[1], extremal[0])+k*math.pi/2 for k in range(4)]
        attained = []
        for angle in angles:
            n['rotation'] = [0, 0, -math.sin(angle/2), math.cos(angle/2)]
            close(world(d, i, [0, 0, 0]), pivot)
            posed = [world(d, i, p) for p in ps]; attained.extend(posed)
            for p, wp in zip(ps, posed):
                q = sub(wp, pivot)
                assert abs(sum(v*v for v in q)-sum(v*v for v in p)) < 1e-4
                assert all(swept['min'][j]-1e-6 <= wp[j] <= swept['max'][j]+1e-6 for j in range(3))
            pose_count += 1
        close(box(attained)['min'], swept['min']); close(box(attained)['max'], swept['max'])
        del n['rotation']
    assert m['continuous_swept_bounds_root'] == box([p for c in [m['static_bounds_root']]+sweeps for p in [c['min'], c['max']]])
    # QE's islands stay disjoint in Z. Its inter-island deck must not become a filled wall.
    if slug == 'wings_queen_elizabeth_class':
        assert comp[243]['max'][2] < comp[282]['min'][2]
    def triangles(doc, binary):
        result = []
        for pr in doc['meshes'][doc['nodes'][static_i]['mesh']]['primitives']:
            ps = values(doc, binary, pr['attributes']['POSITION'])
            ids = [v[0] for v in values(doc, binary, pr['indices'])]
            result.extend([[world(doc, static_i, ps[k]) for k in ids[j:j+3]] for j in range(0, len(ids), 3)])
        return result
    tris, source_tris = triangles(d, b), triangles(raw, rb)
    def top_at(ts, x, z):
        top = None
        for a, q, r in ts:
            ux, uz, vx, vz = q[0]-a[0], q[2]-a[2], r[0]-a[0], r[2]-a[2]
            det = ux*vz-vx*uz
            if abs(det) < 1e-10:
                continue
            dx, dz = x-a[0], z-a[2]
            u, v = (dx*vz-vx*dz)/det, (ux*dz-dx*uz)/det
            if u >= -1e-8 and v >= -1e-8 and u+v <= 1+1e-8:
                y = a[1]+u*(q[1]-a[1])+v*(r[1]-a[1])
                top = y if top is None else max(top, y)
        return top
    def fitted(x, z):
        return max((c['max'][1] for c in boxes if c['min'][0] <= x <= c['max'][0]
                    and c['min'][2] <= z <= c['max'][2]), default=None)
    def posed(p, yaw):
        c, s = math.cos(yaw), math.sin(yaw)
        return [123+c*p[0]+s*p[2], 7+p[1], -321-s*p[0]+c*p[2]]
    def local(p, yaw):
        c, s = math.cos(yaw), math.sin(yaw)
        x, z = p[0]-123, p[2]+321
        return [c*x-s*z, p[1]-7, s*x+c*z]
    hull, deck = boxes[:2]
    probes = [(x, z) for x in [-40, -10, 0, 10, 40] for z in [-170, -100, 0, 70, 170]]
    probes += [((c['min'][0]+c['max'][0])/2, (c['min'][2]+c['max'][2])/2) for c in boxes]
    if slug == 'wings_queen_elizabeth_class':
        probes.append((24.5, 0))
        assert fitted(24.5, 0) == deck_top and top_at(tris, 24.5, 0) < 21
    # The ramps have a real changing surface, not just a tall box or runway authority.
    for index in ramp_ids[1:]:
        ramp = comp[index]; x = (ramp['min'][0]+ramp['max'][0])/2
        heights = [top_at(tris, x, ramp['min'][2]+(ramp['max'][2]-ramp['min'][2])*t) for t in [.1, .5, .9]]
        assert all(h is not None for h in heights) and max(heights)-min(heights) > 2
        probes += [(x, ramp['min'][2]+(ramp['max'][2]-ramp['min'][2])*t) for t in [.1, .5, .9]]
    heights = [(top_at(tris, x, z), fitted(x, z)) for x, z in probes]
    for (x, z), (actual, _) in zip(probes, heights):
        original = top_at(source_tris, x, -z)
        assert (original is None) == (actual is None)
        if actual is not None:
            assert abs(original-actual) < 1e-5
    rays = 0
    for yaw in [0, .37, -1.2, math.pi/2, math.pi]:
        rotated = [[posed(p, yaw) for p in tri] for tri in tris]
        for (x, z), (actual, fitted_top) in zip(probes, heights):
            a, end = posed([x, 100, z], yaw), posed([x, -30, z], yaw)
            measured = top_at(rotated, a[0], a[2])
            assert (measured is None) == (actual is None)
            if actual is not None:
                assert abs(measured-(actual+7)) < 1e-4
            lx, _, lz = local(a, yaw)
            # Strict interior probes avoid roundoff at inclusive AABB edges.
            assert fitted(lx, lz) == fitted_top
            assert any(C['segment_hits'](local(a, yaw), local(end, yaw), c) for c in boxes) == (fitted_top is not None)
            rays += 1
    print(f'PASS {slug}: {count} source components; hull/deck + {len(island_ids)} island solids + {len(ramp_ids)} ramp solids; {prop_count} actual propellers; {pose_count} spin poses; {rays} rotated full-triangle height/fitted-footprint rays; deck {deck_top} m / solid top {solid_top} m / visual top {m["bounds"]["max"][1]:.6f} m')
    return rays, pose_count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    args = parser.parse_args()
    before_archive = sha(args.archive.read_bytes())
    outputs = F['generate'](args.archive)
    assert outputs == F['generate'](args.archive)
    for name, data in outputs.items():
        assert (F['WINGS']/name).read_bytes() == data, name
    manifest = json.loads(outputs[F['MANIFEST']])
    assert manifest['schema'] == 'wings_derived_escort_assets_v1'
    assert before_archive == manifest['archive_sha256'] == F['ARCHIVE_SHA256']
    assert manifest['existing_model_sha256'] == F['BASELINES'] and len(F['BASELINES']) == 26
    assert len(F['RETAINED_BASELINES']) == 60
    assert sha(F['f'].encoded(manifest['models'][:2])) == F['RETAINED_ENTRIES_SHA256']
    assert len(manifest['models']) == 8
    assert sha(F['f'].encoded(manifest['models'][:4])) == F['RETAINED_FOUR_SHA256']
    assert sha(F['f'].encoded(manifest['models'][:3])) == F['RETAINED_THREE_SHA256']
    old = (HERE/'model-repairs.json').read_bytes()
    assert sha(old) == F['RETAINED_MANIFEST_SHA256']
    assert len(json.loads(old)['models']) == 2
    assert [m['source_model_id'] for m in manifest['models']] == [
        'wings.original.'+slug+'.v1' for slug in F['SOURCES']]
    total_triangles = images = poses = rays = 0
    with zipfile.ZipFile(args.archive) as archive:
        # Whole-package metadata is referenced, not duplicated into this selection.
        for name in ['README.txt', 'manifest.json', 'models.json', 'palette.json', 'roster_lookup.json']:
            assert (HERE/'supplied-fighters'/name).read_bytes() == archive.read(name)
        for m, (slug, (source_sha, size, triangles, rig_sha)) in zip(manifest['models'], F['SOURCES'].items()):
            source = archive.read(m['source_member'])
            rig_bytes = archive.read('rigs/'+slug+'.json')
            assert sha(source) == source_sha == m['source_sha256'] and len(source) == size
            assert sha(rig_bytes) == rig_sha
            assert outputs['models/supplied/'+slug+'.glb'] == source
            assert outputs['authoring/supplied-vessels/rigs/'+slug+'.json'] == rig_bytes
            raw, rb = decode(source)
            payload = outputs[m['file']]
            d, b = decode(payload)
            assert sha(payload) == m['sha256'] and len(payload) == m['bytes'] < 1_000_000
            assert d['buffers'] == raw['buffers'] and len(d['buffers']) == 1
            assert 'uri' not in d['buffers'][0] and len(b) >= d['buffers'][0]['byteLength']
            assert d['meshes'] == raw['meshes'] and d['bufferViews'] == raw['bufferViews']
            assert not d.get('animations') and not d.get('skins')
            assert len(d['images']) == 3
            for v in d['bufferViews']:
                assert v.get('buffer', 0) == 0 and v.get('byteOffset', 0)+v['byteLength'] <= len(b)
            for i, a in enumerate(d['accessors']):
                vs = values(d, b, i)
                assert all(math.isfinite(x) for v in vs for x in v)
                if 'min' in a:
                    close(a['min'], [min(v[j] for v in vs) for j in range(len(vs[0]))])
                    close(a['max'], [max(v[j] for v in vs) for j in range(len(vs[0]))])
            for actual, original in zip(d['materials'], raw['materials']):
                restored = copy.deepcopy(actual)
                assert restored['extras'].pop('repair_role') == 'mixed_naval_atlas_preserve_maps'
                if not restored['extras'] and 'extras' not in original:
                    del restored['extras']
                for key, default in [('baseColorFactor', [1, 1, 1, 1]), ('metallicFactor', 1), ('roughnessFactor', 1)]:
                    assert restored['pbrMetallicRoughness'][key] == original['pbrMetallicRoughness'].get(key, default)
                    if key not in original['pbrMetallicRoughness']:
                        del restored['pbrMetallicRoughness'][key]
                assert restored['alphaMode'] == original.get('alphaMode', 'OPAQUE')
                if 'alphaMode' not in original:
                    del restored['alphaMode']
                assert restored == original
            for key in ['images', 'textures', 'samplers']:
                assert d.get(key) == raw.get(key)
            for image in d['images']:
                data = C['image_payload'](d, b, image)
                assert data == C['image_payload'](raw, rb, image)
                C['check_png'](data); images += 1
            names = {n['name']: i for i, n in enumerate(d['nodes'])}
            unarmed = slug in ('wings_cb90_h', 'wings_type022_houbei') or slug in F['CARRIERS']
            assert len(names) == len(d['nodes']) == len(raw['nodes'])+(0 if unarmed else 1)
            root = names[m['root']]
            assert d['scenes'][d.get('scene', 0)]['nodes'] == [root]
            assert d['nodes'][root].get('translation', [0, 0, 0]) == [0, 0, 0]
            assert d['nodes'][root].get('rotation', [0, 0, 0, 1]) == [0, 0, 0, 1]
            assert d['nodes'][root].get('scale', [1, 1, 1]) == [1, 1, 1]
            assert m['axes'] == {'forward': '-Z', 'up': '+Y', 'right': '+X', 'meters': True}
            assert m['objective_only'] and m['player_vehicle_kind'] is None and m['waterline_y'] == 0
            assert not m['runtime_consumed'] and m['supported_runtime_weapon_capabilities'] == []
            if unarmed:
                assert m['objective_only'] is True and m['runtime_consumed'] is False
                assert m['main_gun_geometry'] is None and m['launch_origins'] == []
            else:
                assert not m['main_gun_geometry']['capability_enabled'] and not m.get('launch_origins')
            all_points, count = [], 0
            for i, n in enumerate(raw['nodes']):
                actual = d['nodes'][i]
                assert actual['name'] == n['name'] and 'matrix' not in actual
                close(actual.get('translation', [0, 0, 0]), [v*(-1 if j == 2 else 1) for j, v in enumerate(n.get('translation', [0, 0, 0]))])
                x, y, z, w = n.get('rotation', [0, 0, 0, 1])
                close(actual.get('rotation', [0, 0, 0, 1]), [-x, -y, z, w])
                assert actual.get('scale', [1, 1, 1]) == n.get('scale', [1, 1, 1]) == [1, 1, 1]
                if 'mesh' not in n:
                    continue
                for pr in d['meshes'][actual['mesh']]['primitives']:
                    ps = values(d, b, pr['attributes']['POSITION'])
                    old_ps = values(raw, rb, pr['attributes']['POSITION'])
                    for name, ai in pr['attributes'].items():
                        for av, ov in zip(values(d, b, ai), values(raw, rb, ai)):
                            expected = [ov[0], ov[1], -ov[2]] if name in ('POSITION', 'NORMAL', 'TANGENT') else list(ov)
                            if name == 'TANGENT':
                                expected.append(-ov[3])
                            close(av, expected, 1e-7)
                            if name == 'NORMAL':
                                assert abs(sum(x*x for x in av)-1) < .001
                    for p, op in zip(ps, old_ps):
                        wp, ow = world(d, i, p), world(raw, i, op)
                        close(wp, [ow[0], ow[1], -ow[2]]); all_points.append(wp)
                    ids = [v[0] for v in values(d, b, pr['indices'])]
                    old_ids = [v[0] for v in values(raw, rb, pr['indices'])]
                    assert len(ids) % 3 == 0 and min(ids) >= 0 and max(ids) < len(ps)
                    for j in range(0, len(ids), 3):
                        assert ids[j:j+3] == [old_ids[j], old_ids[j+2], old_ids[j+1]]
                        a, c, e = [ps[k] for k in ids[j:j+3]]
                        oa, oc, oe = [old_ps[k] for k in old_ids[j:j+3]]
                        normal = cross(sub(oc, oa), sub(oe, oa))
                        close(cross(sub(c, a), sub(e, a)), [normal[0], normal[1], -normal[2]], .001)
                    count += len(ids)//3
            assert count == triangles
            assert box(all_points) == m['bounds']
            static_i = names['static_hull_deck_superstructure']
            comp = components(d, b, d['nodes'][static_i])
            collision = m['collision']
            if slug in F['CARRIERS']:
                carrier_rays, carrier_poses = check_carrier(d, b, raw, rb, m, json.loads(rig_bytes), names, comp, slug)
                rays += carrier_rays; poses += carrier_poses; total_triangles += count
                continue
            if slug == 'wings_type022_houbei':
                rays += check_type022(d, b, raw, m, json.loads(rig_bytes), names, comp)
                total_triangles += count; poses += 1
                continue
            length = m['bounds']['max'][2]-m['bounds']['min'][2]
            hulls = [c for c in comp if c['min'][1] < 0 < c['max'][1] and c['max'][2]-c['min'][2] > .9*length]
            assert hulls == [collision['hull']]
            deck_y = collision['hull']['max'][1]
            assert [c for c in comp if c['min'][1] >= deck_y-.3 and c['max'][1]-c['min'][1] < .5 and c['max'][2]-c['min'][2] > .9*length] == [collision['deck']]
            if unarmed:
                islands = [c for c in comp if c['min'][1] >= deck_y-.001
                           and all(c['max'][j]-c['min'][j] > size for j, size in enumerate([2, 1, 3]))]
                assert len(islands) == 2 and islands == collision['island_components']
            else:
                assert [c for c in comp if c['min'][1] >= deck_y-.001 and all(c['max'][j]-c['min'][j] >= 2 for j in range(3))] == collision['island_components']
            static_triangles = []
            for pr in d['meshes'][d['nodes'][static_i]['mesh']]['primitives']:
                ps = values(d, b, pr['attributes']['POSITION'])
                ids = [v[0] for v in values(d, b, pr['indices'])]
                static_triangles.extend([[world(d, static_i, ps[k]) for k in ids[j:j+3]] for j in range(0, len(ids), 3)])
            if unarmed:
                assert set(names) == {'vessel_root_waterline', 'static_hull_deck_superstructure', 'bow_ramp_pitch'}
                rig = json.loads(rig_bytes)
                assert len(rig['controls']) == len(m['articulation']) == 1
                raw_control, control = rig['controls'][0], m['articulation'][0]
                assert raw_control['node'] == control['node'] == 'bow_ramp_pitch'
                assert raw_control['suggested_local_rotation_axis'] == [1, 0, 0]
                assert control['axis_local'] == [-1, 0, 0] and control['limits_rad'] == [0, 0]
                ramp_i = names['bow_ramp_pitch']
                ramp = d['nodes'][ramp_i]
                assert control['rest_translation'] == ramp['translation']
                close(control['rest_translation'], [v*(-1 if j == 2 else 1)
                      for j, v in enumerate(raw_control['pivot_world_m'])])
                assert control['bounds_local'] == box(points(d, b, ramp))
                assert control['swept_bounds_root'] == box([world(d, ramp_i, p) for p in points(d, b, ramp)])
                assert m['static_bounds_root'] == box([world(d, static_i, p) for p in points(d, b, d['nodes'][static_i])])
                assert m['continuous_swept_bounds_root'] == m['bounds']
                assert collision['hull']['max'][1] < 1.11
                assert max(c['max'][1] for c in islands) < 3.10 < m['bounds']['max'][1]
                assert collision['island_bounds'] == box([p for c in islands for p in [c['min'], c['max']]])
                assert not any(token in name for name in names for token in ['gun', 'propeller', 'missile', 'sensor'])
                # Frozen limits imply a single exact continuous pose, not a sampled moving-ramp claim.
                poses += 1; total_triangles += count
                print(f'PASS {slug}: {count} triangles; raw {size} B / derived {len(payload)} B; 3 exact PNG maps; 1 frozen ramp pose; gun null / launches empty; 4 measured collision layers')
                continue
            gun = m['main_gun_geometry']
            pi, yi, mi = [names[gun[k]] for k in ['pitch_node', 'yaw_node', 'muzzle_node']]
            barrel = points(d, b, d['nodes'][pi])
            terminal = set(p for p in barrel if p[2] < min(q[2] for q in barrel)+.03)
            breech_ring = set(p for p in barrel if abs(p[2]) < .02)
            assert len(terminal) == len(breech_ring) == 8
            for ring, key in [(terminal, 'muzzle_pitch_local'), (breech_ring, 'breech_pitch_local')]:
                close(gun[key], [sum(p[j] for p in ring)/8 for j in range(3)])
            delta = sub(gun['muzzle_pitch_local'], gun['breech_pitch_local'])
            close(gun['bore_direction_pitch_local'], [v/math.sqrt(sum(x*x for x in delta)) for v in delta])
            close(world(d, mi, [0, 0, 0]), gun['muzzle_rest_root'])
            controls = {c['node']: c for c in m['articulation']}
            for control in json.loads(rig_bytes)['controls']:
                c = controls[control['node']]
                x, y, z = control['suggested_local_rotation_axis']
                assert c['axis_local'] == [-x, -y, z]
                node = d['nodes'][names[c['node']]]
                assert c['rest_translation'] == node['translation']
                assert c['bounds_local'] == box(points(d, b, node))
            assert controls[gun['yaw_node']]['limits_rad'] == [-.6, .6]
            assert controls[gun['pitch_node']]['limits_rad'] == [-.45, 0]
            boxes = [collision['hull'], collision['deck']]+collision['island_components']
            max_y, min_y = -math.inf, math.inf
            for yaw in [-.6, -.3, 0, .3, .6]:
                for pitch in [-.45, -.3375, -.225, -.1125, 0]:
                    for index, angle in [(yi, yaw), (pi, pitch)]:
                        axis = controls[d['nodes'][index]['name']]['axis_local']
                        d['nodes'][index]['rotation'] = [v*math.sin(angle/2) for v in axis]+[math.cos(angle/2)]
                    muzzle, breech = world(d, mi, [0, 0, 0]), world(d, pi, gun['breech_pitch_local'])
                    bore = sub(muzzle, breech); length_bore = math.sqrt(sum(v*v for v in bore))
                    direction = [v/length_bore for v in bore]
                    end = [muzzle[j]+direction[j]*10 for j in range(3)]
                    assert all(not C['segment_hits'](breech, end, c) for c in boxes)
                    assert not any(segment_triangle(breech, end, tri) for tri in static_triangles)
                    for p in barrel:
                        wp = world(d, pi, p)
                        assert not any(all(c['min'][j] <= wp[j] <= c['max'][j] for j in range(3)) for c in boxes)
                    assert (direction[0] > 0) == (yaw > 0) if yaw != 0 else abs(direction[0]) < 1e-6
                    assert muzzle[1] >= gun['muzzle_rest_root'][1]-1e-6
                    min_y, max_y = min(min_y, muzzle[1]), max(max_y, muzzle[1])
                    poses += 1; rays += 1
            for name in ['port_propeller_1', 'starboard_propeller_2']:
                i = names[name]; rest = d['nodes'][i]['translation']
                assert (rest[0] < 0) == name.startswith('port_') and rest[1] < 0 < rest[2]
                axis = controls[name]['axis_local']; assert axis == [0, 0, -1]
                for angle in [-math.pi, -.8, 0, .8, math.pi]:
                    d['nodes'][i]['rotation'] = [v*math.sin(angle/2) for v in axis]+[math.cos(angle/2)]
                    close(world(d, i, [0, 0, 0]), rest)
                    for p in points(d, b, d['nodes'][i]):
                        q = sub(world(d, i, p), rest)
                        assert abs(sum(v*v for v in q)-sum(v*v for v in p)) < .0001
                    poses += 1
            total_triangles += count
            print(f'PASS {slug}: {count} triangles; raw {size} B / derived {len(payload)} B; 3 exact PNG maps; 35 poses; muzzle Y {min_y:.6f}..{max_y:.6f} m')
    guard_count = 0
    for name in F['RETAINED_BASELINES']:
        guard_count += 1
        corrupt = dict(outputs, **{'models/'+name: b'bad replacement'})
        with patch.object(Path, 'write_bytes') as write, patch.object(Path, 'mkdir') as mkdir:
            try:
                F['write_outputs'](corrupt)
            except AssertionError as error:
                assert 'retained GLB overwrite' in str(error)
            else:
                raise AssertionError('retained GLB replacement accepted: '+name)
            write.assert_not_called(); mkdir.assert_not_called()
    for name in outputs:
        if name == F['MANIFEST']:
            continue
        guard_count += 1
        corrupt = dict(outputs, **{name: b'bad replacement'})
        with patch.object(Path, 'write_bytes') as write, patch.object(Path, 'mkdir') as mkdir:
            try:
                F['write_outputs'](corrupt)
            except AssertionError as error:
                # Integrated CB90 GLBs now reject at the earlier retained-byte guard.
                expected = 'retained GLB overwrite' if name.removeprefix('models/') in F['RETAINED_BASELINES'] else 'corrupt '
                assert expected in str(error)
            else:
                raise AssertionError('corrupt vessel output accepted: '+name)
            write.assert_not_called(); mkdir.assert_not_called()
    # Corrupt descriptor fields and coherently rehashed derivatives must also fail closed.
    for index, model in enumerate(manifest['models']):
        bad = copy.deepcopy(manifest); bad['models'][index]['bytes'] += 1
        corrupt = dict(outputs, **{F['MANIFEST']: F['f'].encoded(bad)})
        with patch.object(Path, 'write_bytes') as write, patch.object(Path, 'mkdir') as mkdir:
            try:
                F['write_outputs'](corrupt)
            except AssertionError:
                pass
            else:
                raise AssertionError('corrupt descriptor accepted')
            write.assert_not_called(); mkdir.assert_not_called()
        guard_count += 1
        if index < 4:
            continue
        bad = copy.deepcopy(manifest); payload = outputs[model['file']]+b'bad'
        bad['models'][index]['bytes'] = len(payload); bad['models'][index]['sha256'] = sha(payload)
        corrupt = dict(outputs, **{model['file']: payload, F['MANIFEST']: F['f'].encoded(bad)})
        with patch.object(Path, 'write_bytes') as write, patch.object(Path, 'mkdir') as mkdir:
            try:
                F['write_outputs'](corrupt)
            except AssertionError as error:
                assert 'corrupt carrier' in str(error)
            else:
                raise AssertionError('coherently rehashed carrier accepted')
            write.assert_not_called(); mkdir.assert_not_called()
        guard_count += 1
    corrupt = dict(outputs, **{'models/derived/unowned.glb': b'bad replacement'})
    guard_count += 1
    with patch.object(Path, 'write_bytes') as write, patch.object(Path, 'mkdir') as mkdir:
        try:
            F['write_outputs'](corrupt)
        except AssertionError as error:
            assert 'unowned output path' in str(error)
        else:
            raise AssertionError('unowned output accepted')
        write.assert_not_called(); mkdir.assert_not_called()
    assert sha(args.archive.read_bytes()) == before_archive
    assert (HERE/'model-repairs.json').read_bytes() == old
    F['retained']()
    repo, pin = HERE.parents[2], '0edc4834'
    paths = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', pin, '--',
        'Games/Wings/authoring/supplied-fighters', 'docs/wings-local-native'], cwd=repo, text=True).splitlines()
    frozen = [p for p in paths if p.startswith('Games/Wings/authoring/supplied-fighters/')
              or p.endswith('-coalition-flight.json')]
    receipts = [p for p in frozen if p.endswith('-coalition-flight.json')]
    assert len(receipts) == 13
    for path in frozen:
        assert (repo/path).read_bytes() == subprocess.check_output(['git', 'show', pin+':'+path], cwd=repo), path
    print(f'PASS immutable: {len(frozen)} supplied-fighter metadata/rig/evidence files including 13 historical flight receipts exact against {pin}')
    print(f'PASS: {total_triangles} triangles; {images} exact/CRC/decoded PNGs; {poses} poses; {rays} actual-static-triangle heights/box/bore-or-catamaran rays; {guard_count} pre-write no-mkdir/no-write negatives; all 60 retained GLBs, 17 fighter entries plus Tu160 metadata, prior four extension entries and old vessel descriptor bytes exact; reproducible outputs')
    print('HOLD: mixed-atlas glass, real mechanical limits, native PBR/pixels/performance/gameplay and real-class realism unverified. No weapon capability enabled.')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Independent, stdlib-only bounded archive/GLB intake. Never executes archive code.
Run --self-test, then ARCHIVE [--ingest]. Without --ingest no files are written.
"""
import argparse
import copy
import hashlib
import itertools
import json
import math
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import struct
import zipfile

ROOT = 'Jankolock_40_Hero_Expansion/'
OUT = Path(__file__).resolve().parent
FLOOR = 2147483648
CAP = 25000000
LIMIT = 50000000
TOL = 0.00002
SELECT = ('model.glb', 'manifest.json', 'rig.json', 'palette.json', 'effects.json')
IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]


def require(ok, message):
    if not ok:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def parse(data):
    def bad(value):
        raise ValueError('nonfinite JSON: ' + value)
    def unique(pairs):
        obj = {}
        for key, value in pairs:
            require(key not in obj, 'duplicate JSON key: ' + key)
            obj[key] = value
        return obj
    return json.loads(data, parse_constant=bad, object_pairs_hook=unique)


def archive_guard(z):
    entries = z.infolist()
    require(0 < len(entries) <= 1000, 'member count')
    seen = set()
    total = 0
    for i in entries:
        n = i.filename
        require(n == i.orig_filename and 0 < len(n) <= 240, 'member name length/NUL')
        require(n.startswith(ROOT) and not n.startswith('/') and '\\' not in n,
                'absolute/foreign/backslash path')
        require(not re.search(r'[\x00-\x1f\x7f:]', n), 'control/drive path')
        require(all(p not in ('', '.', '..') for p in n.split('/')) and
                len(PurePosixPath(n).parts) <= 6, 'traversal/path depth')
        require(n.casefold() not in seen, 'duplicate member')
        seen.add(n.casefold())
        require(not i.is_dir() and stat.S_IFMT(i.external_attr >> 16) in
                (0, stat.S_IFREG), 'symlink/special/directory member')
        require(not i.flag_bits & 0x41, 'encrypted member')
        require(i.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), 'compression')
        require(0 <= i.file_size <= 5000000 and 0 <= i.compress_size <= 5000000,
                'member size')
        require(i.file_size <= max(1, i.compress_size) * 1000, 'compression ratio')
        total += i.file_size
    require(total <= LIMIT, 'expanded total')
    return entries, total


def near(a, b, label):
    require(len(a) == len(b) and all(abs(x-y) <= TOL for x, y in zip(a, b)), f'{label}: measured={a}, claimed={b}')


def finite(values, label):
    require(all(isinstance(x, (float, int)) and math.isfinite(x) for x in values), label)


def multiply(a, b):
    return [sum(a[k*4+r] * b[c*4+k] for k in range(4))
            for c in range(4) for r in range(4)]


def point(m, v):
    return [sum(m[c*4+r] * v[c] for c in range(3)) + m[12+r] for r in range(3)]


def matrix(node):
    if 'matrix' in node:
        require(not any(k in node for k in ('translation', 'rotation', 'scale')), 'matrix plus TRS')
        m = node['matrix']
        require(len(m) == 16, 'matrix width')
        finite(m, 'nonfinite matrix')
        near([m[3], m[7], m[11], m[15]], [0, 0, 0, 1], 'nonaffine matrix')
        return m
    t, q, s = node.get('translation', [0, 0, 0]), node.get('rotation', [0, 0, 0, 1]), node.get('scale', [1, 1, 1])
    require(len(t) == 3 and len(q) == 4 and len(s) == 3, 'TRS width')
    finite(t + q + s, 'nonfinite TRS')
    require(abs(sum(x*x for x in q)-1) < 0.00001, 'nonunit quaternion')
    require(all(abs(x) > 1e-10 for x in s), 'singular scale')
    x, y, z, w = q
    m = [1-2*(y*y+z*z), 2*(x*y+z*w), 2*(x*z-y*w), 0,
         2*(x*y-z*w), 1-2*(x*x+z*z), 2*(y*z+x*w), 0,
         2*(x*z+y*w), 2*(y*z-x*w), 1-2*(x*x+y*y), 0, *t, 1]
    for c in range(3):
        for r in range(3):
            m[c*4+r] *= s[c]
    return m


def bounds(points):
    require(bool(points), 'empty geometry')
    return {'min': [min(p[k] for p in points) for k in range(3)],
            'max': [max(p[k] for p in points) for k in range(3)]}


def decode(data):
    require(len(data) >= 28, 'short GLB')
    magic, version, length = struct.unpack_from('<III', data)
    require(magic == 0x46546c67 and version == 2 and length == len(data), 'GLB header')
    chunks = []
    offset = 12
    while offset < length:
        require(offset + 8 <= length, 'chunk header')
        size, kind = struct.unpack_from('<II', data, offset)
        offset += 8
        require(size % 4 == 0 and offset + size <= length, 'chunk size')
        chunks.append((kind, data[offset:offset+size]))
        offset += size
    require([x[0] for x in chunks] == [0x4e4f534a, 0x004e4942], 'GLB chunks')
    d, binary = parse(chunks[0][1]), chunks[1][1]
    require(d['asset']['version'] == '2.0', 'asset version')
    # This intake accepts the observed simple rigid/unlit format, not arbitrary glTF.
    def refs(value):
        if isinstance(value, dict):
            require('uri' not in value, 'external or data URI reference')
            for child in value.values():
                refs(child)
        elif isinstance(value, list):
            for child in value:
                refs(child)
    refs(d)
    require(set(d.get('extensionsUsed', [])) <= {'KHR_materials_unlit'} and
            set(d.get('extensionsRequired', [])) <= {'KHR_materials_unlit'}, 'unsupported extension')
    require(not any(d.get(k) for k in ('skins', 'animations', 'images', 'textures')), 'unexpected skin/animation/image/texture')
    require(len(d['buffers']) == 1 and 0 <= len(binary)-d['buffers'][0]['byteLength'] <= 3,
            'embedded buffer size')
    blen = d['buffers'][0]['byteLength']
    for v in d['bufferViews']:
        require(v['buffer'] == 0 and v.get('byteOffset', 0) >= 0 and v['byteLength'] > 0 and
                v.get('byteOffset', 0)+v['byteLength'] <= blen, 'bufferView bounds')
    arrays = []
    widths = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
    components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
    for a in d['accessors']:
        require(not a.get('sparse') and a['componentType'] in widths and a['type'] in components,
                'unsupported accessor')
        code, width = widths[a['componentType']]
        count, n = a['count'], components[a['type']]
        require(isinstance(count, int) and 0 < count <= 1000000, 'accessor count')
        v = d['bufferViews'][a['bufferView']]
        start, stride = a.get('byteOffset', 0), v.get('byteStride', n*width)
        require(start >= 0 and start % width == 0 and stride >= n*width and stride % width == 0 and
                start + (count-1)*stride + n*width <= v['byteLength'], 'accessor bounds/alignment')
        start += v.get('byteOffset', 0)
        require(start % width == 0, 'absolute accessor alignment')
        values = [struct.unpack_from('<'+code*n, binary, start+j*stride) for j in range(count)]
        for row in values:
            finite(row, 'nonfinite accessor')
        for key, fn in [('min', min), ('max', max)]:
            if key in a:
                near(a[key], [fn(row[k] for row in values) for k in range(n)], 'accessor '+key)
        arrays.append(values)
    geometry = []
    for mesh in d['meshes']:
        prims = []
        require(not mesh.get('weights'), 'morph weights')
        for p in mesh['primitives']:
            require(p.get('mode', 4) == 4 and not p.get('targets') and not p.get('extensions'), 'primitive format')
            attrs = p['attributes']
            pa = d['accessors'][attrs['POSITION']]
            require(pa['componentType'] == 5126 and pa['type'] == 'VEC3' and not pa.get('normalized'), 'POSITION format')
            positions = arrays[attrs['POSITION']]
            for semantic, index in attrs.items():
                require(len(arrays[index]) == len(positions), 'attribute counts')
                if semantic == 'NORMAL':
                    require(d['accessors'][index]['type'] == 'VEC3', 'normal format')
                    require(all(abs(sum(x*x for x in row)-1) < .001 for row in arrays[index]), 'normal length')
            require('NORMAL' in attrs, 'missing normals')
            if 'indices' in p:
                ia = d['accessors'][p['indices']]
                require(ia['type'] == 'SCALAR' and ia['componentType'] in (5121, 5123, 5125) and
                        not ia.get('normalized'), 'index format')
                indices = [x[0] for x in arrays[p['indices']]]
            else:
                indices = list(range(len(positions)))
            require(len(indices) % 3 == 0 and all(0 <= x < len(positions) for x in indices), 'index range/triangles')
            require(0 <= p['material'] < len(d['materials']), 'material reference')
            prims.append((positions, indices, p['material']))
        geometry.append(prims)
    nodes = d['nodes']
    names = {n['name']: i for i, n in enumerate(nodes)}
    require(len(names) == len(nodes), 'duplicate node names')
    parents = {}
    for i, n in enumerate(nodes):
        matrix(n)
        for child in n.get('children', []):
            require(isinstance(child, int) and 0 <= child < len(nodes) and child not in parents,
                    'node hierarchy/multiple parents')
            parents[child] = i
    worlds, nodepoints, nodetri, isfx = {}, {}, {}, {}
    transformed_boxes = []
    def walk(i, parent_matrix, fx, visiting):
        require(i not in visiting and i not in worlds, 'cycle/repeated scene node')
        world = multiply(parent_matrix, matrix(nodes[i]))
        finite(world, 'nonfinite world transform')
        worlds[i] = world
        fx = fx or nodes[i]['name'] == 'FX_ROOT'
        isfx[i] = fx
        points, triangles = [], 0
        if 'mesh' in nodes[i]:
            require(0 <= nodes[i]['mesh'] < len(geometry), 'mesh reference')
            for positions, indices, material in geometry[nodes[i]['mesh']]:
                # Every actual POSITION is transformed; indices checked separately above.
                points.extend(point(world, v) for v in positions)
                local_box = bounds(positions)
                transformed_boxes.extend(point(world, c) for c in itertools.product(*zip(local_box['min'], local_box['max'])))
                triangles += len(indices)//3
        nodepoints[i], nodetri[i] = points, triangles
        for child in nodes[i].get('children', []):
            walk(child, world, fx, visiting | {i})
    roots = d['scenes'][d.get('scene', 0)]['nodes']
    require(all(i not in parents for i in roots), 'scene root has parent')
    for i in roots:
        walk(i, IDENTITY, False, set())
    require(len(worlds) == len(nodes), 'unreachable nodes')
    allpoints = [p for points in nodepoints.values() for p in points]
    finite([v for p in allpoints for v in p], 'nonfinite world geometry')
    body = [p for i, pts in nodepoints.items() if not isfx[i] for p in pts]
    fxpoints = [p for i, pts in nodepoints.items() if isfx[i] for p in pts]
    def descendants(i):
        result = [i]
        for child in nodes[i].get('children', []):
            result.extend(descendants(child))
        return result
    materials = []
    for m in d['materials']:
        pbr = m.get('pbrMetallicRoughness', {})
        color = pbr.get('baseColorFactor', [1, 1, 1, 1])
        finite(color, 'material color')
        require(len(color) == 4 and all(0 <= v <= 1 for v in color), 'material color range')
        for key, default in [('metallicFactor', 1), ('roughnessFactor', 1)]:
            v = pbr.get(key, default)
            require(math.isfinite(v) and 0 <= v <= 1, 'PBR range')
        require('KHR_materials_unlit' in m.get('extensions', {}), 'non-unlit material')
        materials.append({'name': m['name'], 'rgba_linear': color,
                          'roughness': pbr.get('roughnessFactor', 1), 'metalness': pbr.get('metallicFactor', 1),
                          'double_sided': m.get('doubleSided', False), 'unlit': True})
    require(len(set(m['name'] for m in materials)) == len(materials), 'duplicate material name')
    result = {'bytes': len(data), 'sha256': sha(data), 'triangles': sum(nodetri.values()),
              'body_triangles': sum(v for i, v in nodetri.items() if not isfx[i]),
              'fx_triangles': sum(v for i, v in nodetri.items() if isfx[i]),
              'mesh_nodes': sum('mesh' in n for n in nodes), 'meshes': len(geometry),
              'drawables': sum(len(geometry[n['mesh']]) for n in nodes if 'mesh' in n),
              'nodes': len(nodes), 'accessors': len(arrays), 'decoded_accessor_elements': sum(map(len, arrays)),
              'bounds': bounds(allpoints), 'transformed_local_aabb_bounds': bounds(transformed_boxes),
              'body_bounds': bounds(body), 'fx_bounds': bounds(fxpoints) if fxpoints else None,
              'materials': materials, 'uri_count': 0, 'embedded_buffers': 1, 'images': 0, 'textures': 0,
              'skins': 0, 'animations': 0, 'extensions_used': d.get('extensionsUsed', [])}
    return result, d, names, parents, worlds, nodepoints, nodetri, descendants


def validate_variant(data, manifest, rig, palette, effects, variant):
    result, d, names, parents, worlds, nodepoints, nodetri, descendants = decode(data)
    nodes = d['nodes']
    for key in ('size_bytes', 'glb_bytes'):
        if key in manifest:
            require(result['bytes'] == manifest[key], key)
    for key in ('sha256', 'glb_sha256'):
        if key in manifest:
            require(result['sha256'] == manifest[key], key)
    for key in ('triangles', 'tri_count_LOD0', 'mesh_nodes'):
        if key in manifest:
            require(result['triangles' if key == 'tri_count_LOD0' else key] == manifest[key], key)
    require(manifest['external_dependencies'] == [], 'manifest dependencies')
    require(manifest['material_slots'] == [m['name'] for m in result['materials']], 'material slots')
    exact_bounds = all(abs(a-b) <= TOL for key in ('min', 'max')
                       for a, b in zip(result['bounds'][key], manifest['bounds_gltf'][key]))
    comparison_bounds = result['bounds'] if exact_bounds else result['transformed_local_aabb_bounds']
    for key in ('min', 'max'):
        near(comparison_bounds[key], manifest['bounds_gltf'][key], 'manifest world bounds '+key)
    near([b-a for a, b in zip(comparison_bounds['min'], comparison_bounds['max'])],
         manifest['bounds_gltf']['dimensions'], 'manifest dimensions')
    result['manifest_bounds_method'] = 'exact vertices' if exact_bounds else 'conservative transformed local AABBs (not exact vertex bounds)'
    result['manifest_bounds_max_delta_m'] = max(abs(a-b) for key in ('min', 'max')
                                               for a, b in zip(result['bounds'][key], manifest['bounds_gltf'][key]))
    require(manifest['rig_nodes'] == [x['name'] for x in rig['movable_nodes']], 'manifest rig nodes')
    if 'movable_nodes' in manifest:
        require(manifest['movable_nodes'] == len(rig['movable_nodes']), 'movable count')
    joints = []
    for joint in rig['movable_nodes']:
        name = joint['name']
        require(name in names, 'missing joint '+name)
        i = names[name]
        require(joint['gltf_node_index'] == i, 'joint index '+name)
        actual_parent = nodes[parents[i]]['name'] if i in parents else None
        require(actual_parent == joint['parent'], 'joint parent '+name)
        near(nodes[i].get('translation', [0, 0, 0]), joint['pivot_position'], 'local pivot '+name)
        near(worlds[i][12:15], joint['pivot_model_position'], 'world pivot '+name)
        desc = descendants(i)
        geometry_nodes = [j for j in desc if nodepoints[j]]
        require(bool(geometry_nodes) and sum(nodetri[j] for j in desc) > 0, 'dummy joint '+name)
        for field in ('rotation_deg', 'translation_m'):
            require(set(joint[field]) == {'x', 'y', 'z'}, 'guide axes')
            for value in joint[field].values():
                require(value == 'free' or (isinstance(value, list) and len(value) == 2 and
                        all(isinstance(v, (int, float)) and math.isfinite(v) for v in value) and value[0] <= value[1]), 'guide range')
        joints.append({'name': name, 'index': i, 'parent': actual_parent,
                       'local_pivot': nodes[i].get('translation', [0, 0, 0]), 'world_pivot': worlds[i][12:15],
                       'descendant_mesh_nodes': len(geometry_nodes), 'descendant_triangles': sum(nodetri[j] for j in desc)})
    require(len(set(x['name'] for x in joints)) == len(joints), 'duplicate guide joint')
    for name in rig['static_nodes']:
        require(name in names and bool(nodepoints[names[name]]), 'static node missing geometry '+name)
    if variant == 'clean':
        require('FX_ROOT' not in names, 'clean includes FX')
        for slot in palette['slots'].values():
            for i in slot['gltf_material_indices']:
                require(result['materials'][i]['name'] == slot['material_name'], 'palette name')
                near(result['materials'][i]['rgba_linear'], slot['rgba_linear'], 'palette linear')
            rgb = [int(slot['hex_srgb'][k:k+2], 16)/255 for k in (1, 3, 5)]
            linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb] + [1]
            near(linear, slot['rgba_linear'], 'sRGB conversion')
        require(len(palette['slots']) == 4 and len(result['materials']) == 4, 'clean four slots')
    else:
        require(effects['toggle_root'] == 'FX_ROOT' and 'FX_ROOT' in names, 'FX root')
        fxmeshes = {nodes[i]['name'] for i in descendants(names['FX_ROOT']) if nodepoints[i]}
        require(fxmeshes == set(effects['mesh_nodes']) == set(manifest['fx_mesh_nodes']), 'FX node claims')
        require(len(palette['materials']) == len(result['materials']), 'variant palette count')
        for m in palette['materials']:
            actual = result['materials'][m['gltf_material_index']]
            require(actual['name'] == m['name'] and actual['unlit'] == m['unlit'], 'variant palette name/unlit')
            near(actual['rgba_linear'], m['rgba_linear'], 'variant palette factors')
        for v in rig['visibility_nodes']:
            require(names[v['name']] == v['gltf_node_index'], 'visibility node')
    result['joints'] = joints
    result['sidecar_comparison'] = 'PASS: hash/bytes/triangles/materials/rig indices, parents, pivots, real geometry; bounds method recorded separately'
    result['coordinate_evidence'] = {
        'format': 'glTF 2.0 uses metres and +Y up; forward direction is an author convention, not glTF metadata',
        'supplier_declaration': rig['coordinate_system'],
        'body_ground_y': result['body_bounds']['min'][1],
        'body_height_y': result['body_bounds']['max'][1]-result['body_bounds']['min'][1],
        'negative_z_landmarks': [{'name': n['name'], 'world_origin': worlds[i][12:15]}
                                 for i, n in enumerate(nodes) if re.search('eye|face|muzzle|nose|front', n['name'], re.I)
                                 and worlds[i][14] < 0][:12],
        'qualification': 'Y grounding and plausible metre-scale dimensions measured; -Z supported only where semantic front landmarks agree. No Blender source-axis verification.'}
    require(abs(result['body_bounds']['min'][1]) < .0001, 'body not Y-grounded')
    require(.5 < result['coordinate_evidence']['body_height_y'] < 5, 'implausible metre body height')
    return result


def run(archive, ingest):
    before = shutil.disk_usage(OUT).free
    require(before >= FLOOR, 'disk floor before work')
    archive_path = Path(archive)
    with archive_path.open('rb') as stream:
        archive_hash = hashlib.file_digest(stream, 'sha256').hexdigest()
    with zipfile.ZipFile(archive_path) as z:
        entries, total = archive_guard(z)
        # CRC and byte/hash receipt for EVERY member, including unselected variants and sources.
        members = []
        for i in entries:
            data = z.read(i)
            require(len(data) == i.file_size, 'member bytes')
            members.append({'member': i.filename.removeprefix(ROOT), 'bytes': len(data), 'sha256': sha(data)})
        heroes = sorted(n[len(ROOT+'assets/'):].split('/')[0] for n in z.namelist()
                        if n.startswith(ROOT+'assets/') and n.endswith('/model.glb'))
        require(len(heroes) == len(set(heroes)) == 40 and all(re.fullmatch('[a-z0-9-]+', h) for h in heroes), '40 hero IDs')
        require(sum(n.endswith('/model_fx.glb') for n in z.namelist()) == 40 and
                sum(n.endswith('/model_cel.glb') for n in z.namelist()) == 6, 'variant counts')
        results = {}
        selected = {}
        for hero in heroes:
            base = ROOT+'assets/'+hero+'/'
            load = lambda name: parse(z.read(base+name))
            effects = load('effects.json')
            require(z.read(base+'manifest.rig.json') == z.read(base+'rig.json'), 'rig alias')
            variants = {}
            for variant, suffix in [('clean', ''), ('fx', '_fx'), ('cel', '_cel')]:
                fn = 'model'+suffix+'.glb'
                if base+fn not in z.namelist():
                    continue
                try:
                    variants[variant] = validate_variant(z.read(base+fn), load('manifest'+suffix+'.json'),
                                                         load('rig'+suffix+'.json'), load('palette'+suffix+'.json'), effects, variant)
                except ValueError as error:
                    raise ValueError(f'{hero}/{variant}: {error}') from error
            for variant in ('fx', 'cel'):
                if variant in variants:
                    for key in ('min', 'max'):
                        near(variants['clean']['body_bounds'][key], variants[variant]['body_bounds'][key], 'variant body bounds')
                    require(variants['clean']['body_triangles'] == variants[variant]['body_triangles'], 'variant body triangles')
            baseline = effects.get('baseline_sha256', {})
            for name, digest in baseline.items():
                require(sha(z.read(base+name)) == digest, 'effect baseline hash '+name)
            results[hero] = {'selected_variant': 'clean', 'selection_reason': 'Minimal body-only rigid assembly; FX/cel remain optional cosmetic concepts in retained archive.', 'variants': variants}
            for name in SELECT:
                selected[hero+'/'+name] = z.read(base+name)
        selected['RECEIVED_README.txt'] = z.read(ROOT+'README.txt')
        report = {'schema': 'independent-jank40-intake-v1', 'archive_basename': archive_path.name,
                  'archive_sha256': archive_hash, 'archive_bytes': archive_path.stat().st_size,
                  'archive_retained': True, 'archive_members': len(entries), 'expanded_bytes': total,
                  'archive_guards': 'PASS: paths, duplicates (casefold), types/symlinks, encryption, compression, counts, member/total sizes, every-member CRC',
                  'tolerance_metres': TOL, 'selected_files': [{'path': k, 'bytes': len(v), 'sha256': sha(v)} for k, v in selected.items()],
                  'selected_supplied_bytes': sum(map(len, selected.values())), 'heroes': results,
                  'all_archive_members': members,
                  'limitations': ['Originality and Blender authorship are supplier/operator declarations, not independently established.',
                                  'No supplied code execution, Blender, rendering, browser, runtime integration, skin/IK, collision or animation clearance acceptance.',
                                  'Only clean GLBs and listed metadata copied unchanged. Manifest references to sources/portraits/variants describe retained archive, not local file presence.',
                                  'No Monk model supplied or invented. Named rigid guides are not baked animations. FX meshes are cosmetic, not damage or hitboxes.']}
        encoded = (json.dumps(report, indent=2, allow_nan=False)+'\n').encode()
        growth = sum(map(len, selected.values())) + len(encoded)
        existing = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
        require(existing + growth <= CAP, 'lane added byte cap')
        if ingest:
            require(shutil.disk_usage(OUT).free - growth >= FLOOR, 'disk floor before ingest')
            # Refuse overwrites and symlink ancestors; all validation above precedes these writes.
            targets = list(selected) + ['intake-receipt.json']
            for relative in targets:
                target = OUT/relative
                require(not target.exists() and not target.is_symlink(), 'destination exists '+relative)
                require(all(not p.is_symlink() for p in target.parents), 'destination symlink')
            for relative, data in selected.items():
                require(shutil.disk_usage(OUT).free - len(data) >= FLOOR, 'disk floor during ingest')
                target = OUT/relative
                target.parent.mkdir(parents=True, exist_ok=True)
                with target.open('xb') as stream:
                    stream.write(data)
            with (OUT/'intake-receipt.json').open('xb') as stream:
                stream.write(encoded)
            for relative, data in selected.items():
                require((OUT/relative).read_bytes() == data, 'copy readback '+relative)
        elif (OUT/'intake-receipt.json').exists():
            require((OUT/'intake-receipt.json').read_bytes() == encoded, 'receipt differs from independent recomputation')
            for relative, data in selected.items():
                require((OUT/relative).read_bytes() == data, 'existing copy differs '+relative)
            print('PASS existing intake readback: every supplied byte and recomputed receipt unchanged')
        print(f'PASS all40 clean / 40 FX / 6 cel: independent decoded geometry, hierarchy, materials, body/FX world bounds and sidecars')
        print(f'PASS archive: {len(entries)} members, {total} expanded bytes, all CRCs; SHA256 {archive_hash}')
        print(f'{"INGESTED" if ingest else "VALIDATED ONLY"}: {len(selected)} supplied files, {report["selected_supplied_bytes"]} bytes; receipt {len(encoded)} bytes')
        print(f'disk before={before} after={shutil.disk_usage(OUT).free}; no staging/commit/runtime changes')


def self_test():
    def reject(fn, label):
        try:
            fn()
        except (ValueError, IndexError, KeyError, struct.error):
            return
        raise AssertionError('guard accepted '+label)
    def archive(infos):
        return type('TestArchive', (), {'infolist': lambda self: infos})()
    good = zipfile.ZipInfo(ROOT+'assets/test/model.glb')
    good.file_size = good.compress_size = 100
    good.external_attr = (stat.S_IFREG | 0o644) << 16
    archive_guard(archive([good]))
    tests = 0
    for name in [ROOT+'../escape', '/absolute', ROOT+'a\\b', ROOT+'C:/drive', ROOT+'a//b', ROOT+'a/./b']:
        bad = copy.copy(good)
        bad.filename = bad.orig_filename = name
        reject(lambda: archive_guard(archive([bad])), name)
        tests += 1
    for field, value in [('external_attr', (stat.S_IFLNK | 0o777) << 16), ('flag_bits', 1),
                         ('file_size', 5000001), ('compress_type', 99)]:
        bad = copy.copy(good)
        setattr(bad, field, value)
        reject(lambda: archive_guard(archive([bad])), field)
        tests += 1
    reject(lambda: archive_guard(archive([good, good])), 'duplicate')
    bulk = []
    for i in range(11):
        item = copy.copy(good)
        item.filename = item.orig_filename = ROOT+str(i)
        item.file_size = item.compress_size = 5000000
        bulk.append(item)
    reject(lambda: archive_guard(archive(bulk)), 'expanded total')
    reject(lambda: matrix({'translation': [float('nan'), 0, 0]}), 'nonfinite transform')
    reject(lambda: matrix({'rotation': [0, 0, 0, 2]}), 'nonunit rotation')
    reject(lambda: decode(b'not a GLB'), 'bad header')
    reject(lambda: parse('{"x":1,"x":2}'), 'duplicate JSON key')
    reject(lambda: parse('{"x":NaN}'), 'nonfinite JSON')
    # Actual tiny binary triangle: prove index and accessor guards do not merely trust metadata.
    binary = struct.pack('<18f3H', 0, 0, 0, 1, 0, 0, 0, 1, 0, *([0, 0, 1]*3), 0, 1, 2)
    d = {'asset': {'version': '2.0'}, 'buffers': [{'byteLength': len(binary)}],
         'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': 36},
                         {'buffer': 0, 'byteOffset': 36, 'byteLength': 36},
                         {'buffer': 0, 'byteOffset': 72, 'byteLength': 6}],
         'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': 3, 'type': 'VEC3'},
                       {'bufferView': 1, 'componentType': 5126, 'count': 3, 'type': 'VEC3'},
                       {'bufferView': 2, 'componentType': 5123, 'count': 3, 'type': 'SCALAR'}],
         'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1}, 'indices': 2, 'material': 0}]}],
         'materials': [{'name': 'm', 'extensions': {'KHR_materials_unlit': {}}}],
         'nodes': [{'name': 'root', 'mesh': 0}], 'scenes': [{'nodes': [0]}]}
    def pack(doc, buf):
        text = json.dumps(doc).encode()
        text += b' ' * (-len(text) % 4)
        buf += b'\0' * (-len(buf) % 4)
        return struct.pack('<III', 0x46546c67, 2, 28+len(text)+len(buf)) + struct.pack('<II', len(text), 0x4e4f534a) + text + struct.pack('<II', len(buf), 0x004e4942) + buf
    require(decode(pack(d, binary))[0]['triangles'] == 1, 'positive binary fixture')
    bad_binary = binary[:-2] + struct.pack('<H', 9)
    reject(lambda: decode(pack(d, bad_binary)), 'out of range actual index')
    bad = copy.deepcopy(d)
    bad['accessors'][0]['count'] = 4
    reject(lambda: decode(pack(bad, binary)), 'accessor overrun')
    bad = copy.deepcopy(d)
    bad['buffers'][0]['uri'] = 'https://invalid.example/remote.bin'
    reject(lambda: decode(pack(bad, binary)), 'external reference')
    bad = copy.deepcopy(d)
    bad['nodes'][0]['children'] = [0]
    reject(lambda: decode(pack(bad, binary)), 'cycle')
    reject(lambda: decode(pack(d, struct.pack('<f', float('inf'))+binary[4:])), 'nonfinite actual vertex')
    d['materials'] = [{'name': str(i), 'extensions': {'KHR_materials_unlit': {}}} for i in range(4)]
    guide = {'name': 'root', 'gltf_node_index': 0, 'parent': None, 'pivot_position': [0, 0, 0],
             'pivot_model_position': [0, 0, 0], 'rotation_deg': {k: [0, 0] for k in 'xyz'},
             'translation_m': {k: 'free' for k in 'xyz'}}
    rig = {'coordinate_system': 'fixture Y-up metres', 'movable_nodes': [guide], 'static_nodes': []}
    manifest = {'external_dependencies': [], 'material_slots': ['0', '1', '2', '3'], 'rig_nodes': ['root'],
                'bounds_gltf': {'min': [0, 0, 0], 'max': [1, 1, 0], 'dimensions': [1, 1, 0]}}
    palette = {'slots': {str(i): {'gltf_material_indices': [i], 'material_name': str(i),
                                 'rgba_linear': [1, 1, 1, 1], 'hex_srgb': '#ffffff'} for i in range(4)}}
    validate_variant(pack(d, binary), manifest, rig, palette, {}, 'clean')
    bad_rig = copy.deepcopy(rig)
    bad_rig['movable_nodes'][0]['parent'] = 'not-parent'
    reject(lambda: validate_variant(pack(d, binary), manifest, bad_rig, palette, {}, 'clean'), 'wrong joint hierarchy')
    bad_rig['movable_nodes'][0]['parent'] = None
    bad_rig['movable_nodes'][0]['pivot_model_position'] = [4, 0, 0]
    reject(lambda: validate_variant(pack(d, binary), manifest, bad_rig, palette, {}, 'clean'), 'false joint pivot')
    d['nodes'][0]['children'] = [1]
    d['nodes'].append({'name': 'dummy'})
    dummy = copy.deepcopy(guide)
    dummy.update(name='dummy', gltf_node_index=1, parent='root')
    rig['movable_nodes'].append(dummy)
    manifest['rig_nodes'].append('dummy')
    reject(lambda: validate_variant(pack(d, binary), manifest, rig, palette, {}, 'clean'), 'dummy joint without descendant geometry')
    print(f'PASS self-test: positive binary triangle/rig + {tests+15} negative archive/GLB/JSON/transform/rig guards')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', nargs='?')
    parser.add_argument('--ingest', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
    if args.archive:
        run(args.archive, args.ingest)
    elif not args.self_test:
        parser.error('archive or --self-test required')

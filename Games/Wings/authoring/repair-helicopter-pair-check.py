#!/usr/bin/env python3
"""Read-only regression of BLOCKED helicopter intake, not a clearance PASS.

python3 -B Games/Wings/authoring/repair-helicopter-pair-check.py --archive SOURCE_ZIP
"""
import argparse
import contextlib
import copy
import importlib.util
import io
import json
import math
from pathlib import Path
import struct
from unittest.mock import patch
import zlib

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('helicopters', HERE/'repair-helicopter-pair.py')
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
spec = importlib.util.spec_from_file_location('fighter_check', HERE/'repair-fighter-pair-check.py')
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
g = h.g


def decode_png(data):
    c.check_png(data)  # Existing CRC/chunk/header and decompression validation.
    width, height = struct.unpack_from('>II', data, 16)
    channels = {2: 3, 6: 4}[data[25]]
    pos, packed = 8, bytearray()
    while pos < len(data):
        size = struct.unpack_from('>I', data, pos)[0]
        if data[pos+4:pos+8] == b'IDAT':
            packed.extend(data[pos+8:pos+8+size])
        pos += size+12
    raw, rows, previous = zlib.decompress(packed), bytearray(), bytearray(width*channels)
    stride = width*channels
    for y in range(height):
        mode = raw[y*(stride+1)]
        assert mode in range(5)
        row = bytearray(raw[y*(stride+1)+1:(y+1)*(stride+1)])
        for i in range(stride):
            a = row[i-channels] if i >= channels else 0
            b = previous[i]
            upper_left = previous[i-channels] if i >= channels else 0
            estimate = a+b-upper_left
            distances = [abs(estimate-v) for v in (a, b, upper_left)]
            paeth = (a, b, upper_left)[distances.index(min(distances))]
            predictor = (0, a, b, (a+b)//2, paeth)[mode]
            row[i] = (row[i]+predictor)&255
        rows.extend(row)
        previous = row
    assert len(rows) == width*height*channels
    return bytes(rows)


def no_write_main(archive, outputs=None, intake=False, error=None, disk=None):
    argv = ['repair-helicopter-pair.py', '--archive', str(archive)] + (['--intake-only'] if intake else [])
    with contextlib.ExitStack() as stack:
        stack.enter_context(patch('sys.argv', argv))
        stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
        stack.enter_context(contextlib.redirect_stderr(io.StringIO()))
        write = stack.enter_context(patch.object(Path, 'write_bytes'))
        mkdir = stack.enter_context(patch.object(Path, 'mkdir'))
        real_open, attempted = Path.open, []
        def readonly_open(path, mode='r', *args, **kwargs):
            if any(flag in mode for flag in 'wax+'):
                attempted.append((str(path), mode))
                raise AssertionError('raw checker attempted output open')
            return real_open(path, mode, *args, **kwargs)
        stack.enter_context(patch.object(Path, 'open', readonly_open))
        if outputs is not None:
            stack.enter_context(patch.object(h, 'generate_intake', return_value=outputs))
        if disk is not None:
            stack.enter_context(patch.object(h.shutil, 'disk_usage', return_value=disk))
        if error is None:
            assert h.main() == 1  # Expected default refusal of actual source geometry.
        else:
            try:
                h.main()
            except AssertionError as e:
                assert str(e).startswith(error), (str(e), error)
            else:
                raise AssertionError('prewrite guard accepted bad input')
        write.assert_not_called()
        mkdir.assert_not_called()
        assert not attempted, attempted


def consumable_state():
    """Only exact authenticated current assets may coexist with BLOCKED raws.

    Historical collisions and raw default refusal remain mandatory. Coexistence
    does not convert the originals into collision-free or native-accepted models.
    """
    present = [name for name in h.FORBIDDEN if (h.WINGS/name).exists()]
    if not present:
        return 'no accepted manifest or derivatives'
    assert set(present) == set(h.FORBIDDEN), 'partial helicopter consumables'
    spec = importlib.util.spec_from_file_location('helicopter_clearance_check', HERE/'repair-helicopter-clearance-check.py')
    independent = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(independent)
    generator = independent.load('accepted_helicopter_generator', 'repair-helicopter-clearance.py')
    accepted = generator.generate()
    assert set(h.FORBIDDEN) <= set(accepted), 'generator has no accepted consumables'
    generator.validate_outputs(accepted)
    independent.check_output_pins(accepted)
    independent.accepted_geometry(accepted, json.loads(accepted['authoring/native-helicopter-pair.json']))
    return 'exact authenticated independently proven current derivatives coexist; raw originals still BLOCKED'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    args = parser.parse_args()
    outputs = h.generate_intake(args.archive)
    h.validate_outputs(outputs)
    for name, data in outputs.items():
        assert (h.WINGS/name).read_bytes() == data, name
    assert sum(map(len, outputs.values())) < 1_300_000
    print('PASS intake: pinned archive SHA/size, 65 safe paths/CRC/member hashes; two exact GLBs/rigs and blocker record reproduce; no supplied code executed')
    record = json.loads(outputs['authoring/supplied-helicopters/repair-record.json'])
    assert record['status'] == 'BLOCKED_SOURCE_CLEARANCE'
    assert set(record['models']) == {'ah64d', 'mi28n'}
    poses = witnesses = 0
    for kind, (slug, expected, size, tri_count, blades) in h.SOURCES.items():
        source = outputs['models/supplied/'+slug+'.glb']
        raw, rb = g.unpack_glb(source)
        d, b = copy.deepcopy(raw), bytearray(rb)
        assert g.sha(source) == expected and len(source) == size
        h.f.orient(d, b)
        assert raw['materials'] == d['materials']
        assert raw['images'] == d['images'] and raw['textures'] == d['textures'] and raw['samplers'] == d['samplers']
        assert all('uri' not in r for r in d['buffers']+d['images'])
        png = c.image(d, b, 0)
        assert png == c.image(raw, rb, 0)
        pixels = decode_png(png)
        assert len(set(pixels)) > 1
        broken = bytearray(png)
        broken[-5] ^= 1
        try:
            decode_png(broken)
        except AssertionError:
            pass
        else:
            raise AssertionError('PNG CRC damage accepted')
        triangles = 0
        for i, mesh in enumerate(raw['meshes']):
            assert d['meshes'][i] == mesh
            for pr in mesh['primitives']:
                ps = g.accessor(d, b, pr['attributes']['POSITION'])
                normals = g.accessor(d, b, pr['attributes']['NORMAL'])
                assert len(ps) == len(normals)
                assert all(math.isfinite(v) for p in ps+normals for v in p)
                assert all(abs(sum(v*v for v in n)-1) < 2e-5 for n in normals)
                for name, ai in pr['attributes'].items():
                    before, after = g.accessor(raw, rb, ai), g.accessor(d, b, ai)
                    if name in ('POSITION', 'NORMAL'):
                        target = [[v[0], v[1], -v[2]] for v in before]
                    elif name == 'TANGENT':
                        target = [[v[0], v[1], -v[2], -v[3]] for v in before]
                    else:
                        assert name.startswith('TEXCOORD_')
                        target = before
                    for actual, wanted in zip(after, target):
                        c.close(actual, wanted, 1e-7)
                old = g.accessor(raw, rb, pr['indices'])
                ids = g.accessor(d, b, pr['indices'])
                assert len(ids)%3 == 0 and max(v[0] for v in ids) < len(ps)
                for j in range(0, len(ids), 3):
                    assert ids[j:j+3] == [old[j], old[j+2], old[j+1]]
                triangles += len(ids)//3
        assert triangles == tri_count
        oldms, newms = g.world_matrices(raw), g.world_matrices(d)
        for i, node in enumerate(raw['nodes']):
            if 'mesh' in node:
                for p, q in zip(g.node_points(raw, rb, node), g.node_points(d, b, d['nodes'][i])):
                    before = g.point(oldms[i], p)
                    c.close(g.point(newms[i], q), [before[0], before[1], -before[2]])
        names = {n['name']: i for i, n in enumerate(d['nodes'])}
        report = record['models'][kind]
        assert report['main_blades'] == blades and report['tail_blades'] == 4
        assert report['clearance'] == 'FAIL_SOURCE_ROTOR_BODY_COLLISION'
        for sweep in report['rotor_sweeps']:
            node = d['nodes'][names[sweep['node']]]
            child = node['children'][0]
            rest = c.vertices(d, b, d['nodes'][child]['name'])
            axis = 'xyz'.index(sweep['axis'])
            pivot = sweep['pivot_root_m']
            # Bounds/rig proof only. Sampled poses are NOT asserted collision-free.
            for step in range(73):
                angle = -step*math.tau/72
                q = [0., 0., 0., math.cos(angle/2)]
                q[axis] = math.sin(angle/2)
                node['rotation'] = q
                actual = c.vertices(d, b, d['nodes'][child]['name'])
                for before, after in zip(rest, actual):
                    p = h.subtract(before, pivot)
                    av = [1 if j == axis else 0 for j in range(3)]
                    tangent = h.f.cross(av, p)
                    target = [p[j]*math.cos(angle)+tangent[j]*math.sin(angle)+av[j]*p[axis]*(1-math.cos(angle))+pivot[j] for j in range(3)]
                    c.close(after, target)
                    bounds = sweep['continuous_360_bounds_root_m']
                    assert all(bounds['min'][j]-2e-6 <= after[j] <= bounds['max'][j]+2e-6 for j in range(3))
                poses += 1
            node.pop('rotation')
            for before, after in zip(rest, c.vertices(d, b, d['nodes'][child]['name'])):
                c.close(before, after)
        for witness in report['witnesses']:
            node = d['nodes'][names[witness['rotor']]]
            angle = witness['angle_rad']
            q = [0., 0., 0., math.cos(angle/2)]
            q['xyz'.index(witness['axis'])] = math.sin(angle/2)
            node['rotation'] = q
            rt = c.world_triangles(d, b, node['children'])[witness['rotor_triangle_index']]
            bt = c.world_triangles(d, b, [names['airframe_static']])[witness['static_triangle_index']]
            for actual, wanted in zip(rt, witness['rotor_triangle_root_m']):
                c.close(actual, wanted)
            for actual, wanted in zip(bt, witness['static_triangle_root_m']):
                c.close(actual, wanted)
            edges, surface = (rt, bt) if witness['edge_mesh'] == 'rotor' else (bt, rt)
            a = edges[witness['edge_index']]
            end = edges[(witness['edge_index']+1)%3]
            direction = h.subtract(end, a)
            hit = c.ray_hit(a, direction, surface)  # Independent Moller-Trumbore method.
            assert hit is not None and 0 < hit < 1
            c.close([a[j]+hit*direction[j] for j in range(3)], witness['intersection_root_m'])
            node.pop('rotation')
            witnesses += 1
            print(f'REPRODUCED BLOCKER {kind}: {witness["rotor"]} {angle:.16g}rad intersects {witness["static_component"]}; triangle {witness["rotor_triangle_index"]}/{witness["static_triangle_index"]}')
        print(f'PASS {kind} intake integrity: {size}B/{tri_count}tri; original geometry/UV/PNG/PBR and fixed wheel/source rig bytes preserved')
    assert witnesses == 3 and poses == 292
    assert sum(name.endswith('.glb') for name in h.FROZEN) == 64
    assert sum(name.endswith('-coalition-flight.json') for name in h.FROZEN) == 13
    assert len(json.loads((HERE/'native-fighter-pair.json').read_bytes())['models']) == 17
    assert len(json.loads((HERE/'extended-escort-models.json').read_bytes())['models']) == 8
    for name, expected in h.FROZEN.items():
        assert g.sha((h.WINGS/name).read_bytes()) == expected, name
    print('PASS immutable: 64 old GLBs, all 17 fighter descriptor/repair entries, 8 fleet entries, 13 random receipts and declared Rafale/Yak receipt exact to literal 1a1f674d pins; no runtime git')
    no_write_main(args.archive)
    negatives = 0
    for name in [*h.FROZEN, *h.FORBIDDEN, '../../escape', '/escape']:
        no_write_main(args.archive, {name: b'bad'}, True, 'intake output allowlist mismatch')
        negatives += 1
    for name in outputs:
        damaged = dict(outputs)
        damaged[name] = b'corrupt'
        no_write_main(args.archive, damaged, True, 'corrupt intake output: '+name)
        negatives += 1
    no_write_main(args.archive, {}, True, 'intake output allowlist mismatch')
    nonbytes = dict(outputs)
    nonbytes[next(iter(nonbytes))] = 'not bytes'
    no_write_main(args.archive, nonbytes, True, 'bytes required')
    huge = dict(outputs)
    huge[next(iter(huge))] = b'x'*1_300_000
    no_write_main(args.archive, huge, True, 'intake size exceeded')
    disk = h.shutil.disk_usage(h.WINGS)
    no_write_main(args.archive, outputs, True, 'disk floor', disk._replace(free=2**31-1))
    no_write_main(args.archive, outputs, True, 'disk floor', disk._replace(free=2**31+sum(map(len, outputs.values()))-1))
    with patch.object(Path, 'is_symlink', return_value=True):
        no_write_main(args.archive, outputs, True, 'symlink destination')
    negatives += 6
    print(f'PASS fail-closed writer: actual default exit1 without mkdir/write; {negatives} corrupt/foreign/retained/symlink/size/disk cases refused before mkdir/write')
    state = consumable_state()
    actual_exists, actual_read = Path.exists, Path.read_bytes
    coexist_negatives = 0
    if state == 'no accepted manifest or derivatives':
        # Preserve the historical absent-state partial/forged-set negatives.
        for virtual in ({h.FORBIDDEN[0]}, set(h.FORBIDDEN)):
            def exists(path):
                for name in h.FORBIDDEN:
                    if path == h.WINGS/name:
                        return name in virtual
                return actual_exists(path)
            with patch.object(Path, 'exists', exists), patch.object(Path, 'mkdir') as mkdir, patch.object(Path, 'write_bytes') as write:
                try:
                    consumable_state()
                except AssertionError:
                    pass
                else:
                    raise AssertionError('unaccepted/partial consumables bypassed authentication')
                mkdir.assert_not_called(); write.assert_not_called()
            coexist_negatives += 1
    for missing in (h.FORBIDDEN if state != 'no accepted manifest or derivatives' else ()):
        def exists(path):
            return False if path == h.WINGS/missing else actual_exists(path)
        with patch.object(Path, 'exists', exists), patch.object(Path, 'mkdir') as mkdir, patch.object(Path, 'write_bytes') as write:
            try:
                consumable_state()
            except AssertionError:
                pass
            else:
                raise AssertionError('partial consumables bypassed independent authentication')
            mkdir.assert_not_called(); write.assert_not_called()
        coexist_negatives += 1
    for corrupt in (h.FORBIDDEN if state != 'no accepted manifest or derivatives' else ()):
        def read(path):
            return b'foreign consumable' if path == h.WINGS/corrupt else actual_read(path)
        with patch.object(Path, 'read_bytes', read), patch.object(Path, 'mkdir') as mkdir, patch.object(Path, 'write_bytes') as write:
            try:
                consumable_state()
            except AssertionError:
                pass
            else:
                raise AssertionError('foreign consumable bypassed independent authentication')
            mkdir.assert_not_called(); write.assert_not_called()
        coexist_negatives += 1
    print(f'PASS coexistence: {coexist_negatives} partial/foreign sets rejected; {state}')
    print(f'PASS raw blocked-state regression: {poses} signed full-turn bound/rest poses and 3 independent triangle collision witnesses; {state}; raw clearance FAIL, no native acceptance')
    print('BLOCKED: raw source contacts remain; default raw writer exit1/no mkdir/write/open, even with accepted derivatives. Checker exits1 intentionally.')
    return 1


if __name__ == '__main__':
    raise SystemExit(main())

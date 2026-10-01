#!/usr/bin/env python3
"""Read-only audit of three pending Circuit Ward deliveries; no rights clearance."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import sys

from audit_monster_archive import audit_glb, decode, need, self_test as shared_self_test, unpack_glb

VEHICLES = (
    ('cv-scout-hover-runner.glb', 1060, 1600, (1.65, 0.65, 2.40)),
    ('cv-rail-van.glb', 1776, 2400, (2.05, 0.90, 3.00)),
    ('cv-aegis-goliath.glb', 2476, 4000, (2.80, 1.25, 3.90)),
)
ROOT = Path(__file__).resolve().parent.parent
ERRORS = (OSError, ValueError, KeyError, TypeError, IndexError, struct.error, OverflowError)


def validate_counts(actual, expected, cap):
    failures = []
    if type(actual) is not int or actual <= 0:
        failures.append('invalid triangle count')
    else:
        if actual != expected:
            failures.append('triangle count differs from operator report')
        if actual > cap:
            failures.append('triangle cap exceeded')
    return failures


def audit_model(path, expected, cap, target):
    row = {'path': path.relative_to(ROOT).as_posix(), 'expected_triangles': expected,
           'triangle_cap': cap, 'concept_dimensions': target, 'failures': []}
    try:
        data = path.read_bytes()
        row.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
        try:
            row.update(audit_glb(data))
        except ERRORS as error:
            row['failures'].append('shared strict contract rejection: ' + str(error))
        # Diagnostic counts/bounds even when the shared indexed-only contract rejects.
        # No bytes or GLB JSON are changed; reuse its unpacker and accessor decoder.
        g, binary = unpack_glb(data)
        for index in range(len(g['accessors'])):
            decode(g, binary, index)
        need(len(g['meshes']) == 1 and len(g['meshes'][0]['primitives']) == 1,
             'expected one mesh/primitive for diagnostic counts')
        primitive = g['meshes'][0]['primitives'][0]
        need(primitive.get('mode', 4) == 4, 'expected triangle mode')
        _, positions = decode(g, binary, primitive['attributes']['POSITION'])
        count = len(decode(g, binary, primitive['indices'])[1]) if 'indices' in primitive else len(positions)
        need(count % 3 == 0, 'triangle vertex/index count not divisible by three')
        row['triangles'] = count // 3
        row['failures'].extend(validate_counts(row['triangles'], expected, cap))
        lo = [min(v[j] for v in positions) for j in range(3)]
        hi = [max(v[j] for v in positions) for j in range(3)]
        row.update(local_bounds=[lo, hi], local_dimensions=[hi[j] - lo[j] for j in range(3)],
                   indexed='indices' in primitive, nodes=len(g['nodes']), meshes=len(g['meshes']),
                   primitives=len(g['meshes'][0]['primitives']), materials=len(g['materials']),
                   attributes=sorted(primitive['attributes']),
                   resource_counts={k: len(g.get(k, [])) for k in
                                    ('textures', 'images', 'skins', 'animations')},
                   asset_metadata_assertions=g['asset'], material=g['materials'][0])
        if any(abs(a-b) > 1e-5 for a, b in zip(row['local_dimensions'], target)):
            row['failures'].append('decoded dimensions differ from concept targets')
        if g['materials'][0].get('pbrMetallicRoughness', {}).get('roughnessFactor', 1) != 1:
            row['failures'].append('roughness differs from shared strict contract (1)')
        if 'front -Z' in g['asset'].get('extras', {}).get('coordinateSystem', ''):
            row['failures'].append('declared front -Z differs from concept +Z (assertion, not geometric proof)')
        if re.search(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|/home/|[A-Za-z]:\\|(?:sk-|ghp_)[A-Za-z0-9_-]{12,}', json.dumps(g)):
            row['failures'].append('sensitive string pattern in GLB JSON; do not publish')
        row['bytes_unchanged'] = path.read_bytes() == data
        if not row['bytes_unchanged']:
            row['failures'].append('delivery bytes changed during audit')
    except ERRORS as error:
        row['failures'].append('delivery audit failed: ' + str(error))
    row['failures'] = sorted(set(row['failures']))
    return row


def self_test():
    shared_self_test()
    assert len(VEHICLES) == len({v[0] for v in VEHICLES}) == 3
    assert [v[1] for v in VEHICLES] == [1060, 1776, 2476]
    assert [v[2] for v in VEHICLES] == [1600, 2400, 4000]
    for _, expected, cap, _ in VEHICLES:
        assert not validate_counts(expected, expected, cap)
        assert validate_counts(expected + 1, expected, cap)
        assert 'triangle cap exceeded' in validate_counts(cap + 1, cap + 1, cap)
    assert validate_counts(None, 1, 1) and validate_counts(0, 1, 1)
    print('PASS: three unique vehicle declarations; reported counts; cap/mismatch/invalid-count rejection')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    models = [audit_model(ROOT / 'Games/Circuit Ward/models' / name, expected, cap, target)
              for name, expected, cap, target in VEHICLES]
    passed = sum(not row['failures'] for row in models)
    result = {'models': models, 'structural_pass': passed, 'model_count': len(models),
              'exit_code': int(passed != len(models)),
              'limits': ['Metadata is unverified assertion, not rights clearance.',
                         'Shared strict rejection prevents a complete flat-normal/material audit.',
                         'No browser, visual family/tier, gameplay or performance verification.']}
    print(json.dumps(result, indent=2))
    return result['exit_code']


if __name__ == '__main__':
    sys.exit(main())

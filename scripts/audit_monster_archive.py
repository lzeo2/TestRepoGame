#!/usr/bin/env python3
"""Read-only, stdlib ZIP/GLB delivery audit. No extraction or importer execution."""
import argparse
from collections import Counter
import hashlib
import io
import json
import math
from pathlib import Path
import re
import stat
import struct
import sys
import zipfile

LIMIT = 32 * 1024 * 1024
BUDGET = {"basic": 799, "evolved": 1499, "boss": 2599}


def need(ok, message):
    if not ok:
        raise ValueError(message)


def integer(value, minimum=0):
    need(type(value) is int and value >= minimum, "invalid nonnegative integer")
    return value


def ref(items, index):
    integer(index)
    need(index < len(items), "reference out of range")
    return items[index]


def load_json(data):
    def pairs(rows):
        result = {}
        for key, value in rows:
            need(key not in result, "duplicate JSON key")
            result[key] = value
        return result
    def constant(value):
        raise ValueError("nonfinite JSON constant: " + value)
    result = json.loads(data, object_pairs_hook=pairs, parse_constant=constant)
    def finite(value):
        if isinstance(value, float):
            need(math.isfinite(value), "nonfinite JSON number")
        elif isinstance(value, dict):
            for child in value.values():
                finite(child)
        elif isinstance(value, list):
            for child in value:
                finite(child)
    finite(result)
    return result


def preflight(infos):
    need(len(infos) <= 4096, "too many ZIP members")
    total = sum(integer(i.file_size) for i in infos)
    need(total < LIMIT, "ZIP expansion must be below 32 MiB")
    seen, folded = set(), set()
    for i in infos:
        name = i.filename
        parts = name.rstrip('/').split('/')
        need(name and not name.startswith('/') and '\\' not in name
             and ':' not in name and not any(ord(c) < 32 for c in name)
             and all(p not in ('', '.', '..') for p in parts), "unsafe ZIP path")
        need(name not in seen, "duplicate ZIP path")
        need(name.casefold() not in folded, "case-colliding ZIP path")
        seen.add(name)
        folded.add(name.casefold())
        kind = stat.S_IFMT(i.external_attr >> 16)
        need(kind in (0, stat.S_IFREG, stat.S_IFDIR), "ZIP symlink/special file")
        need(not i.flag_bits & 1, "encrypted ZIP member")
        need(i.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED),
             "unsupported ZIP compression")
        need(i.file_size <= 8 * 1024 * 1024, "ZIP member exceeds 8 MiB")
        need(i.file_size <= max(1, i.compress_size) * 1000, "ZIP expansion ratio exceeds 1000")
    # Also reject file-as-directory aliases, even though nothing is extracted.
    files = {i.filename.casefold() for i in infos if not i.is_dir()}
    for i in infos:
        parts = i.filename.rstrip('/').casefold().split('/')
        need(not any('/'.join(parts[:n]) in files for n in range(1, len(parts))),
             "ZIP file/directory path collision")
    return total


def unpack_glb(data):
    need(len(data) >= 12, "truncated GLB header")
    magic, version, size = struct.unpack_from('<4sII', data)
    need(magic == b'glTF' and version == 2, "not glTF 2 GLB")
    need(size == len(data), "GLB exact length mismatch")
    chunks, offset = [], 12
    while offset < size:
        need(offset + 8 <= size, "truncated GLB chunk header")
        length, kind = struct.unpack_from('<II', data, offset)
        offset += 8
        need(length % 4 == 0 and offset + length <= size, "invalid GLB chunk length")
        chunks.append((kind, data[offset:offset + length]))
        offset += length
    need([k for k, _ in chunks] == [0x4E4F534A, 0x004E4942], "expected exact JSON + BIN chunks")
    g = load_json(chunks[0][1])
    need(g['asset']['version'] == '2.0', "asset version is not 2.0")
    buffers = g.get('buffers', [])
    need(len(buffers) == 1 and 'uri' not in buffers[0], "one embedded buffer required")
    n = integer(buffers[0]['byteLength'], 1)
    binary = chunks[1][1]
    need(n <= len(binary) <= n + 3 and not any(binary[n:]), "BIN length/padding mismatch")
    return g, binary[:n]


def decode(g, binary, index):
    a = ref(g['accessors'], index)
    need('sparse' not in a, "sparse accessor unsupported by static contract")
    fmt, size = {5121: ('B', 1), 5123: ('H', 2), 5126: ('f', 4)}[a['componentType']]
    width = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
    v = ref(g['bufferViews'], a['bufferView'])
    need(v['buffer'] == 0, "external bufferView")
    start, length = integer(v.get('byteOffset', 0)), integer(v['byteLength'], 1)
    offset, count = integer(a.get('byteOffset', 0)), integer(a['count'], 1)
    stride = integer(v.get('byteStride', width * size), 1)
    need(stride >= width * size and stride % size == 0, "invalid accessor stride")
    if 'byteStride' in v:
        need(4 <= stride <= 252 and stride % 4 == 0, "invalid glTF byteStride")
    need(start + length <= len(binary) and offset + (count - 1) * stride + width * size <= length,
         "accessor outside bufferView/BIN")
    need((start + offset) % size == 0, "misaligned accessor")
    need(not a.get('normalized') or a['componentType'] in (5121, 5123), "invalid normalization")
    rows = [struct.unpack_from('<' + fmt * width, binary, start + offset + n * stride)
            for n in range(count)]
    need(all(math.isfinite(x) for row in rows for x in row), "nonfinite accessor")
    if a.get('normalized'):
        maximum = {5121: 255, 5123: 65535}[a['componentType']]
        rows = [tuple(x / maximum for x in row) for row in rows]
    return a, rows


def matrix(node):
    if 'matrix' in node:
        need(not any(k in node for k in ('translation', 'rotation', 'scale')), "matrix plus TRS")
        m = node['matrix']
        need(len(m) == 16 and m[3] == m[7] == m[11] == 0 and m[15] == 1, "invalid affine matrix")
        return m
    t, q, s = node.get('translation', [0, 0, 0]), node.get('rotation', [0, 0, 0, 1]), node.get('scale', [1, 1, 1])
    need(len(t) == 3 and len(q) == 4 and len(s) == 3, "invalid TRS")
    x, y, z, w = q
    need(abs(sum(v*v for v in q) - 1) < 1e-5, "nonunit quaternion")
    return [(1-2*y*y-2*z*z)*s[0], (2*x*y+2*z*w)*s[0], (2*x*z-2*y*w)*s[0], 0,
            (2*x*y-2*z*w)*s[1], (1-2*x*x-2*z*z)*s[1], (2*y*z+2*x*w)*s[1], 0,
            (2*x*z+2*y*w)*s[2], (2*y*z-2*x*w)*s[2], (1-2*x*x-2*y*y)*s[2], 0, *t, 1]


def audit_glb(data, expected=None):
    g, binary = unpack_glb(data)
    failures = []
    def check(ok, message):
        if not ok:
            failures.append(message)
    def features(value):
        if isinstance(value, dict):
            check(not value.get('extensions'), "extensions present (including compression)")
            for k, child in value.items():
                if k != 'extras':
                    features(child)
        elif isinstance(value, list):
            for child in value:
                features(child)
    features(g)
    check(not g.get('extensionsRequired') and not g.get('extensionsUsed'), "extensions declared")
    for key in ('textures', 'images', 'samplers', 'skins', 'animations', 'cameras'):
        check(not g.get(key), key + " present")
    need(len(g['nodes']) == len(g['meshes']) == len(g['materials']) == 1, "not one node/mesh/material")
    node = g['nodes'][0]
    need(node.get('mesh') == 0 and not node.get('children'), "not one joined mesh node")
    check('skin' not in node and not node.get('weights'), "skin/morph weights present")
    need(len(g['scenes']) == 1 and g.get('scene', 0) == 0 and g['scenes'][0]['nodes'] == [0], "invalid single scene")
    mesh = g['meshes'][0]
    need(len(mesh['primitives']) == 1, "not one primitive")
    p = mesh['primitives'][0]
    need(p.get('mode', 4) == 4 and p.get('material') == 0, "not mode 4/material 0")
    check(not p.get('targets') and not mesh.get('weights'), "morph targets/weights present")
    need(set(p['attributes']) == {'POSITION', 'NORMAL', 'COLOR_0'}, "attributes differ from POSITION/NORMAL/COLOR_0")
    for view in g['bufferViews']:
        need(view['buffer'] == 0 and integer(view.get('byteOffset', 0)) + integer(view['byteLength'], 1) <= len(binary), "bufferView outside BIN")
    # Decode every accessor, not just the primitive's referenced subset.
    for n in range(len(g['accessors'])):
        decode(g, binary, n)
    pa, positions = decode(g, binary, p['attributes']['POSITION'])
    na, normals = decode(g, binary, p['attributes']['NORMAL'])
    ca, colors = decode(g, binary, p['attributes']['COLOR_0'])
    ia, rows = decode(g, binary, p['indices'])
    need(pa['type'] == na['type'] == 'VEC3' and pa['componentType'] == na['componentType'] == 5126, "position/normal must be float VEC3")
    need(ca['type'] in ('VEC3', 'VEC4') and (ca['componentType'] == 5126 or ca.get('normalized')), "invalid vertex colors")
    need(ia['type'] == 'SCALAR' and ia['componentType'] == 5123 and not ia.get('normalized'), "indices must be uint16")
    indices = [r[0] for r in rows]
    need(len(indices) % 3 == 0 and max(indices) < len(positions), "invalid triangle indices")
    need(len(positions) == len(normals) == len(colors), "attribute counts differ")
    count = len(indices) // 3
    check(all(abs(sum(x*x for x in n) - 1) < 1e-4 for n in normals), "nonunit normals")
    check(all(0 <= x <= 1 for c in colors for x in c), "vertex color outside 0..1")
    check(all(len(c) == 3 or abs(c[3]-1) < 1e-6 for c in colors), "nonopaque vertex alpha")
    for n in range(0, len(indices), 3):
        a, b, c = [positions[i] for i in indices[n:n+3]]
        u, v = [b[j]-a[j] for j in range(3)], [c[j]-a[j] for j in range(3)]
        cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
        length = math.sqrt(sum(x*x for x in cross))
        if length <= 1e-12 or any(sum((normals[i][j]-cross[j]/length)**2 for j in range(3)) > 1e-6 for i in indices[n:n+3]):
            failures.append("degenerate triangle or nonflat/winding-inconsistent normal")
            break
    material = g['materials'][0]
    pb = material.get('pbrMetallicRoughness', {})
    check(material.get('alphaMode', 'OPAQUE') == 'OPAQUE' and pb.get('metallicFactor', 1) == 0 and pb.get('roughnessFactor', 1) == 1, "material not opaque matte")
    check(pb.get('baseColorFactor', [1, 1, 1, 1]) == [1, 1, 1, 1] and material.get('emissiveFactor', [0, 0, 0]) == [0, 0, 0], "material tints/emits")
    check(not any('Texture' in k for k in material) and not any('Texture' in k for k in pb), "material texture dependency")
    m = matrix(node)
    need(all(isinstance(x, (int, float)) and math.isfinite(x) for x in m), "nonfinite transform")
    identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    check(all(abs(a-b) < 1e-7 for a, b in zip(m, identity)), "node transforms not applied")
    world = [tuple(sum(m[j+4*k]*v[k] for k in range(3)) + m[j+12] for j in range(3)) for v in positions]
    need(all(math.isfinite(x) for v in world for x in v), "nonfinite world positions")
    lo = [min(v[j] for v in world) for j in range(3)]
    hi = [max(v[j] for v in world) for j in range(3)]
    dims = [hi[j]-lo[j] for j in range(3)]
    check(all(x > 0 for x in dims), "zero dimensions")
    check(abs(lo[1]) < 1e-5 and abs(lo[0]+hi[0]) < 1e-5 and abs(lo[2]+hi[2]) < 1e-5, "not ground/XZ centered")
    for key, actual in (('min', [min(v[j] for v in positions) for j in range(3)]), ('max', [max(v[j] for v in positions) for j in range(3)])):
        declared = pa.get(key, [])
        check(len(declared) == 3 and all(abs(a-b) < 1e-5 for a, b in zip(declared, actual)), "POSITION declared " + key + " differs from decoded bounds")
    extras = g['asset'].get('extras', {})
    if expected:
        check(count <= BUDGET[expected['tier']], "triangle budget exceeded")
        check(all(abs(a/b-1) <= .05 for a, b in zip(dims, expected['dims'])), "roster dimensions outside +/-5%")
        check(extras.get('species') == expected['name'] and extras.get('family') == expected['family'] and extras.get('modelFlag') == expected['flag'] and extras.get('tier') == expected['tier'], "embedded identity differs from roster")
        palette = []
        for hue in expected['palette']:
            rgb = [int(hue[j:j+2], 16)/255 for j in (1, 3, 5)]
            palette.append([x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4 for x in rgb])
        check(all(any(max(abs(c[j]-h[j]) for j in range(3)) < 1e-6 for h in palette) for c in colors), "colors differ from roster linear palette")
    return {'triangles': count, 'dimensions': dims, 'bounds': [lo, hi], 'failures': sorted(set(failures)),
            'identity': {k: extras.get(k) for k in ('species', 'family', 'modelFlag', 'retainedBaseHash')}}


def roster(path):
    data = path.read_bytes()
    text = data.decode('utf-8')
    result = {}
    batches = {}
    for line in text.splitlines():
        cells = [c.strip() for c in line.strip('|').split('|')]
        if re.match(r'^\| \d{2} \|', line):
            name, family, tier, flag = cells[1], cells[3], cells[4].split(';')[0], cells[6]
            need(name.lower() not in result, "duplicate roster species")
            result[name.lower()] = dict(name=name, family=family, tier=tier, flag=flag)
        elif len(cells) == 4 and re.fullmatch(r'[0-9.]+ × [0-9.]+ × [0-9.]+', cells[1]):
            batches[cells[0].lower()] = ([float(x) for x in cells[1].split(' × ')], re.findall(r'#[0-9A-F]{6}', cells[2]) + ['#181818'])
    need(len(result) == 80 and len(batches) == 80, "roster/batch table count differs from 80")
    for name, row in result.items():
        row['dims'], row['palette'] = batches[name]
        prompt = re.search(r'^Generate ' + re.escape(name) + r'\.glb:.*$', text, re.M)
        need(prompt is not None, "missing roster prompt")
        dims = [float(x) for x in re.findall(r'[XYZ] (?:width|height|depth) ([0-9.]+) m', prompt[0])]
        need(dims == row['dims'] and f"at most {BUDGET[row['tier']]} triangles" in prompt[0], "prompt/table mismatch")
    return result, hashlib.sha256(data).hexdigest()


def file_hash(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(65536), b''):
            h.update(block)
    return h.hexdigest()


def audit(path, roster_path):
    expected, roster_sha = roster(roster_path)
    before = file_hash(path)
    report = dict(archive_sha256=before, archive_bytes=Path(path).stat().st_size,
                  roster_sha256=roster_sha, errors=[], metadata={}, models=[], crc_pass=0)
    counts = Counter()
    with zipfile.ZipFile(path) as z:
        infos = z.infolist()
        report['members'] = len(infos)
        report['uncompressed_bytes'] = preflight(infos)
        for info in infos:
            try:
                # Bounded by preflight, one member at a time; read to EOF checks CRC.
                data = z.read(info)
                need(len(data) == info.file_size, "ZIP expanded length mismatch")
                report['crc_pass'] += 1
                if info.filename.endswith('.json'):
                    parsed = load_json(data)
                    if info.filename in ('manifest.json', 'provenance.json'):
                        report['metadata'][info.filename] = parsed
                elif info.filename == 'README.md':
                    report['metadata']['README.md'] = data.decode('utf-8')
                if not info.filename.lower().endswith('.glb'):
                    continue
                name = Path(info.filename).stem.lower()
                row = expected.get(name)
                classification = 'unexpected/pending'
                if row:
                    classification = row['flag']
                    counts[name] += 1
                    need(info.filename == f"glb/{row['family']}/{name}.glb", "species path differs from roster")
                model = dict(path=info.filename, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), classification=classification)
                report['models'].append(model)
                try:
                    model.update(audit_glb(data, row))
                    identity = model['identity']
                    family = identity['family']
                    if not row and identity['modelFlag'] == 'RETAINED-BASE-PROTOTYPE' and family in {r['family'] for r in expected.values()} and info.filename == f"prototypes/{family.lower()}_base.glb":
                        model['classification'] = 'family-base prototype'
                except (ValueError, KeyError, TypeError, IndexError, struct.error, OverflowError) as e:
                    model['failures'] = ['malformed/contract GLB: ' + str(e)]
            except (ValueError, zipfile.BadZipFile, RuntimeError, UnicodeError, NotImplementedError) as e:
                report['errors'].append(info.filename + ': ' + str(e))
    report['missing'] = [r['name'] for n, r in expected.items() if counts[n] == 0]
    report['duplicate_species'] = {n: c for n, c in counts.items() if c > 1}
    report['unexpected'] = [m['path'] for m in report['models'] if m['classification'] == 'unexpected/pending']
    manifest = report['metadata'].get('manifest.json', {}).get('species', [])
    declared = {s['path']: s for s in manifest}
    if len(manifest) != 80 or len(declared) != 80:
        report['errors'].append('manifest species count/uniqueness differs from 80')
    for model in report['models']:
        if model['classification'] in ('FAMILY-SHARED', 'BOSS/UNIQUE-GLB'):
            s = declared.get(model['path'], {})
            if s.get('sha256') != model['sha256'] or s.get('bytes') != model['bytes'] or s.get('triangleCount') != model.get('triangles'):
                model.setdefault('failures', []).append('manifest hash/bytes/triangles mismatch')
    prototypes = Counter(m.get('identity', {}).get('family') for m in report['models'] if m['classification'] == 'family-base prototype')
    report['prototype_coverage'] = dict(prototypes)
    if prototypes != Counter({r['family']: 1 for r in expected.values()}):
        report['errors'].append('family-base coverage differs from one prototype per family')
    report['archive_unchanged'] = file_hash(path) == before
    report['classification_counts'] = dict(Counter(m['classification'] for m in report['models']))
    report['structural_pass'] = sum(not m.get('failures') for m in report['models'])
    report['exit_code'] = int(bool(report['errors'] or report['missing'] or report['duplicate_species'] or report['unexpected'] or not report['archive_unchanged'] or report['structural_pass'] != len(report['models'])))
    report['warnings'] = ['Provider/creator identity and permission claims unverified; delivery is not publication clearance.',
                          'Structural audit only: no loader, WebGL, browser, visual or gameplay QA performed.',
                          'Horror easter-egg model NOT DELIVERED: no explicit delivery documentation identifies one.',
                          'Family topology reuse and unique boss silhouettes require review; embedded hashes are assertions, not geometric proof.']
    return report


def self_test():
    def fails(fn, message):
        try:
            fn()
        except (ValueError, zipfile.BadZipFile) as e:
            need(message in str(e), 'wrong rejection: ' + str(e))
        else:
            raise AssertionError('accepted malformed input: ' + message)
    for name in ('../escape', '/absolute', 'a\\b', 'a/./b', 'C:drive'):
        fails(lambda: preflight([zipfile.ZipInfo(name)]), 'unsafe ZIP path')
    fails(lambda: preflight([zipfile.ZipInfo('a'), zipfile.ZipInfo('a')]), 'duplicate ZIP path')
    fails(lambda: preflight([zipfile.ZipInfo('a'), zipfile.ZipInfo('A')]), 'case-colliding')
    bomb = zipfile.ZipInfo('bomb'); bomb.file_size = LIMIT
    fails(lambda: preflight([bomb]), '32 MiB')
    link = zipfile.ZipInfo('link'); link.external_attr = (stat.S_IFLNK | 0o777) << 16
    fails(lambda: preflight([link]), 'symlink')
    encrypted = zipfile.ZipInfo('secret'); encrypted.flag_bits = 1
    fails(lambda: preflight([encrypted]), 'encrypted')
    fails(lambda: zipfile.ZipFile(io.BytesIO(b'not a zip')), 'not a zip')
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        z.writestr('safe', b'CRC sentinel')
    raw = buf.getvalue().replace(b'CRC sentinel', b'CRC sentineX')
    def crc():
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            z.read('safe')
    fails(crc, 'CRC')
    def glb(g, binary=b'\0\0\0\0'):
        j = json.dumps(g).encode(); j += b' ' * (-len(j) % 4)
        return struct.pack('<4sII', b'glTF', 2, 28+len(j)+len(binary)) + struct.pack('<II', len(j), 0x4E4F534A) + j + struct.pack('<II', len(binary), 0x004E4942) + binary
    good = glb({'asset': {'version': '2.0'}, 'buffers': [{'byteLength': 4}]})
    unpack_glb(good)
    fails(lambda: unpack_glb(good+b'x'), 'exact length')
    fails(lambda: unpack_glb(good[:8]), 'truncated GLB header')
    bad = bytearray(good); struct.pack_into('<I', bad, 12, 0xFFFFFFFC)
    fails(lambda: unpack_glb(bad), 'chunk length')
    fails(lambda: unpack_glb(glb({'asset': {'version': '2.0'}, 'buffers': [{'byteLength': 4, 'uri': 'remote'}]})), 'embedded buffer')
    fails(lambda: load_json(b'{"x":1,"x":2}'), 'duplicate JSON key')
    fails(lambda: load_json(b'{"x":NaN}'), 'nonfinite')
    g = {'bufferViews': [{'buffer': 0, 'byteLength': 4}], 'accessors': [{'bufferView': 0, 'componentType': 5126, 'type': 'VEC3', 'count': 1}]}
    fails(lambda: decode(g, b'\0'*4, 0), 'outside bufferView')
    print('PASS: malformed ZIP paths/collisions/expansion/symlink/encryption/CRC; GLB exact length/chunks/external buffer/accessor bounds; JSON duplicates/nonfinite')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', nargs='?', help='operator-supplied ZIP (never extracted)')
    parser.add_argument('--roster', type=Path, default=Path('docs/monster-roster-glbs.md'))
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if not args.archive:
        parser.error('ARCHIVE argument required unless --self-test')
    try:
        result = audit(args.archive, args.roster)
    except (OSError, ValueError, KeyError, TypeError, IndexError, zipfile.BadZipFile, UnicodeError) as e:
        print(json.dumps({'exit_code': 1, 'errors': [str(e)]}))
        return 1
    print(json.dumps(result, indent=2))
    return result['exit_code']


if __name__ == '__main__':
    sys.exit(main())

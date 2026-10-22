#!/usr/bin/env python3
"""Audit supplier delivery without third-party packages or modifying supplier bytes.

Initial intake: python3 -B docs/citisten-design/check-external-assets.py --copy --write-report
Replay: python3 -B docs/citisten-design/check-external-assets.py
After parent removes staging: add --canonical-only (checks recorded SHA256s).
This is a bounded GLB2 structural/metadata audit, not rendering or legal acceptance.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import struct
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
STAGE = ROOT / 'external-art'
CANON = ROOT / 'Games/Citisten3D/models'
REPORT = ROOT / 'docs/maintenance/audits/citisten-external/intake.json'
FLOOR = 2178940928
# Heuristic detection, not a proof that arbitrary secrets cannot be present.
SENSITIVE = re.compile(
    r'(?i)(?:/(?:home|Users|root|tmp|private|mnt|workspace)/[^\s"\\]+'
    r'|[A-Z]:[\\/][^\s"]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}'
    r'|(?:sk-|ghp_|github_pat_|AKIA)[A-Za-z0-9_-]{16,}'
    r'|-----BEGIN [A-Z ]*PRIVATE KEY-----'
    r'|(?:password|api[_-]?key|secret|access[_-]?token)\s*[:=]\s*["\x27][^"\x27\s]{8,})')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def scan(text, label):
    require(not SENSITIVE.search(text), f'STOP: sensitive-text candidate in {label}; supplier bytes not altered')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def local_uri(uri, directory, root):
    parsed = urlsplit(uri)
    require(not parsed.scheme and not parsed.netloc and not parsed.query and not parsed.fragment,
            'remote, data, or ambiguous URI: ' + uri)
    decoded = unquote(parsed.path)
    require(not decoded.startswith('/') and '\\' not in decoded, 'nonrelative URI')
    target = (directory / decoded).resolve()
    require(target.is_relative_to(root.resolve()) and target.is_file(), 'missing/out-of-tree URI: ' + uri)
    return target


def walk_uris(value, directory, root):
    if isinstance(value, dict):
        for key, item in value.items():
            if key == 'uri':
                local_uri(item, directory, root)
            else:
                walk_uris(item, directory, root)
    elif isinstance(value, list):
        for item in value:
            walk_uris(item, directory, root)


def image_size(data):
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        require(len(data) >= 33 and data[12:16] == b'IHDR', 'invalid PNG header')
        return struct.unpack_from('>II', data, 16)
    require(data.startswith(b'\xff\xd8'), 'unsupported image (expected PNG/JPEG)')
    offset = 2
    while offset < len(data):
        require(data[offset] == 255, 'invalid JPEG marker')
        while offset < len(data) and data[offset] == 255:
            offset += 1
        marker = data[offset]
        offset += 1
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            continue
        length = struct.unpack_from('>H', data, offset)[0]
        require(length >= 2 and offset + length <= len(data), 'JPEG segment range')
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            height, width = struct.unpack_from('>HH', data, offset + 3)
            return width, height
        offset += length
    raise ValueError('JPEG dimensions missing')


def inspect_glb(path, root, raw=None):
    raw = path.read_bytes() if raw is None else raw
    require(20 <= len(raw) <= 8000000, 'GLB byte limit/header')
    require(struct.unpack_from('<4sII', raw) == (b'glTF', 2, len(raw)), 'GLB2 header/length')
    chunks = []
    offset = 12
    while offset < len(raw):
        require(offset + 8 <= len(raw), 'truncated chunk header')
        length, kind = struct.unpack_from('<II', raw, offset)
        offset += 8
        require(length % 4 == 0 and offset + length <= len(raw), 'chunk alignment/range')
        chunks.append((kind, raw[offset:offset + length]))
        offset += length
    require([c[0] for c in chunks] in ([0x4E4F534A], [0x4E4F534A, 0x004E4942]), 'unexpected GLB chunks')
    text = chunks[0][1].decode('utf8')
    scan(text, str(path.relative_to(root)))
    doc = json.loads(text, parse_constant=lambda x: (_ for _ in ()).throw(ValueError('nonfinite JSON')))
    require(doc['asset']['version'] == '2.0', 'glTF asset version')
    require(not doc.get('extensionsRequired'), 'required extension needs separate validator')
    walk_uris(doc, path.parent, root)
    buffers = []
    for i, buf in enumerate(doc.get('buffers', [])):
        if 'uri' in buf:
            data = local_uri(buf['uri'], path.parent, root).read_bytes()
        else:
            require(i == 0 and len(chunks) == 2, 'missing BIN chunk')
            data = chunks[1][1]
            require(0 <= len(data) - buf['byteLength'] <= 3, 'BIN padding/declared length')
        require(0 <= buf['byteLength'] <= len(data), 'buffer byteLength')
        buffers.append(data[:buf['byteLength']])
    views = doc.get('bufferViews', [])
    for view in views:
        require(0 <= view['buffer'] < len(buffers), 'bufferView buffer index')
        start, size = view.get('byteOffset', 0), view['byteLength']
        require(start >= 0 and size > 0 and start + size <= len(buffers[view['buffer']]), 'bufferView range')
        if 'byteStride' in view:
            require(4 <= view['byteStride'] <= 252 and view['byteStride'] % 4 == 0, 'byteStride')
    accessors = doc.get('accessors', [])
    component = {5120: (1, 'b'), 5121: (1, 'B'), 5122: (2, 'h'), 5123: (2, 'H'), 5125: (4, 'I'), 5126: (4, 'f')}
    dimensions = {'SCALAR': (1, 1), 'VEC2': (1, 2), 'VEC3': (1, 3), 'VEC4': (1, 4), 'MAT2': (2, 2), 'MAT3': (3, 3), 'MAT4': (4, 4)}
    # ponytail: reject sparse accessors absent from this delivery; add sparse decoding if a future delivery uses them.
    for acc in accessors:
        require('sparse' not in acc, 'sparse accessor needs separate validator')
        require(acc['componentType'] in component and acc['type'] in dimensions, 'accessor type')
        size, _ = component[acc['componentType']]
        columns, rows = dimensions[acc['type']]
        element = columns * (((rows * size + 3) // 4) * 4 if columns > 1 else rows * size)
        require(isinstance(acc['count'], int) and acc['count'] > 0, 'accessor count')
        require(0 <= acc['bufferView'] < len(views), 'accessor bufferView')
        view = views[acc['bufferView']]
        start = acc.get('byteOffset', 0)
        stride = view.get('byteStride', element)
        require(start >= 0 and start % size == 0 and (view.get('byteOffset', 0) + start) % size == 0,
                'accessor offset/alignment')
        require(stride >= element and stride % size == 0 and start + (acc['count'] - 1) * stride + element <= view['byteLength'], 'accessor range/stride')

    def accessor(index):
        require(isinstance(index, int) and 0 <= index < len(accessors), 'accessor index')
        return accessors[index]

    mesh_triangles = []
    for mesh in doc.get('meshes', []):
        triangles = 0
        for primitive in mesh['primitives']:
            require(not primitive.get('extensions'), 'primitive extension needs separate validator')
            position = accessor(primitive['attributes']['POSITION'])
            require(position['type'] == 'VEC3' and position['componentType'] == 5126, 'POSITION format')
            for index in primitive['attributes'].values():
                require(accessor(index)['count'] == position['count'], 'attribute count mismatch')
            count = position['count']
            if 'indices' in primitive:
                acc = accessor(primitive['indices'])
                require(acc['type'] == 'SCALAR' and acc['componentType'] in (5121, 5123, 5125), 'index format')
                count = acc['count']
                view = views[acc['bufferView']]
                size, fmt = component[acc['componentType']]
                begin = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
                data = buffers[view['buffer']]
                stride = view.get('byteStride', size)
                require(all(struct.unpack_from('<' + fmt, data, begin + j * stride)[0] < position['count'] for j in range(count)), 'vertex index out of range')
            mode = primitive.get('mode', 4)
            require(mode in range(7), 'primitive mode')
            if mode == 4:
                require(count % 3 == 0, 'triangle index count')
                triangles += count // 3
            elif mode in (5, 6):
                triangles += max(0, count - 2)
            if 'material' in primitive:
                require(0 <= primitive['material'] < len(doc.get('materials', [])), 'material index')
        mesh_triangles.append(triangles)
    nodes = doc.get('nodes', [])
    for node in nodes:
        for child in node.get('children', []):
            require(0 <= child < len(nodes), 'child node index')
        if 'mesh' in node:
            require(0 <= node['mesh'] < len(mesh_triangles), 'node mesh index')
    for animation in doc.get('animations', []):
        for sampler in animation['samplers']:
            accessor(sampler['input'])
            accessor(sampler['output'])
        for channel in animation['channels']:
            require(0 <= channel['sampler'] < len(animation['samplers']), 'animation sampler index')
            require(0 <= channel['target']['node'] < len(nodes), 'animation target node')
    images = []
    for image in doc.get('images', []):
        if 'uri' in image:
            data = local_uri(image['uri'], path.parent, root).read_bytes()
        else:
            require(0 <= image['bufferView'] < len(views), 'image bufferView')
            view = views[image['bufferView']]
            start = view.get('byteOffset', 0)
            data = buffers[view['buffer']][start:start + view['byteLength']]
        width, height = image_size(data)
        require(width > 0 and height > 0, 'image dimensions')
        images.append({'name': image.get('name'), 'width': width, 'height': height, 'bytes': len(data), 'mimeType': image.get('mimeType')})
    textures = doc.get('textures', [])
    for texture in textures:
        require(0 <= texture['source'] < len(images), 'texture image source')
    materials = []
    for material in doc.get('materials', []):
        pbr = material.get('pbrMetallicRoughness', {})
        channels = {}
        for owner in (material, pbr):
            for name, value in owner.items():
                if name.endswith('Texture'):
                    require(0 <= value['index'] < len(textures), 'material texture index')
                    channels[name] = {'texture': value['index'], 'image': textures[value['index']]['source'], 'texCoord': value.get('texCoord', 0)}
        materials.append({'name': material.get('name'), 'channels': channels,
                          'baseColorFactor': pbr.get('baseColorFactor', [1, 1, 1, 1]),
                          'metallicFactor': pbr.get('metallicFactor', 1), 'roughnessFactor': pbr.get('roughnessFactor', 1),
                          'emissiveFactor': material.get('emissiveFactor', [0, 0, 0])})
    return {'bytes': len(raw), 'triangles': sum(mesh_triangles),
            'node_instanced_triangles': sum(mesh_triangles[n['mesh']] for n in nodes if 'mesh' in n),
            'nodes': len(nodes), 'node_names': [n.get('name', '') for n in nodes],
            'animations': len(doc.get('animations', [])),
            'animation_names': [a.get('name', '') for a in doc.get('animations', [])],
            'skins': len(doc.get('skins', [])), 'bufferViews': len(views), 'accessors': len(accessors),
            'images': images, 'materials': materials}


def self_test():
    path = CANON / 'citizen/model.glb'
    raw = path.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + length])
    doc['accessors'][0]['count'] = 1000000000
    text = json.dumps(doc).encode()
    text += b' ' * (-len(text) % 4)
    body = struct.pack('<II', len(text), 0x4E4F534A) + text + raw[20 + length:]
    bad_range = struct.pack('<4sII', b'glTF', 2, 12 + len(body)) + body
    checks = [lambda: inspect_glb(path, CANON, b'BAD!' + raw[4:]),
              lambda: inspect_glb(path, CANON, bad_range),
              lambda: local_uri('https://example.invalid/model.glb', path.parent, CANON),
              lambda: scan('person' + '@' + 'example.invalid', 'synthetic fixture')]
    for check in checks:
        try:
            check()
        except ValueError:
            continue
        raise ValueError('self-test failed to reject invalid fixture')
    require(image_size(b'\x89PNG\r\n\x1a\n' + struct.pack('>I', 13) + b'IHDR' + struct.pack('>II', 256, 128) + b'\0' * 9) == (256, 128), 'PNG dimension self-test')
    print('PASS: self-test rejects bad GLB header, accessor overflow, remote URI and sensitive text; reads PNG dimensions')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--copy', action='store_true')
    parser.add_argument('--write-report', action='store_true')
    parser.add_argument('--canonical-only', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    require(not (args.copy and args.canonical_only), 'cannot copy canonical-only')
    source = CANON if args.canonical_only else STAGE
    require(source.is_dir(), 'source missing; use --canonical-only only after intake')
    files = sorted(p for p in source.rglob('*') if p.is_file())
    require(files and not any(p.is_symlink() for p in source.rglob('*')), 'empty delivery or symlink')
    inventory, glbs, documents = {}, {}, {}
    # Scan all text and GLB JSON before any asset copy or report write.
    for path in files:
        name = path.relative_to(source).as_posix()
        raw = path.read_bytes()
        inventory[name] = {'bytes': len(raw), 'sha256': sha(raw)}
        if path.suffix == '.glb':
            glbs[name] = inspect_glb(path, source)
        else:
            text = raw.decode('utf8')
            scan(text, name)
            if path.suffix == '.json':
                documents[name] = json.loads(text)
    total = sum(x['bytes'] for x in inventory.values())
    require(total < 34000000, 'delivery exceeds total budget')
    findings, summaries = [], {}

    def mismatch(label, claimed, actual):
        # Named texture inventories have no ordering contract; glTF indices still use original order.
        if label.endswith((':texture_resolution', ':texture_resolutions')) and claimed and isinstance(claimed[0], dict):
            claimed = sorted(claimed, key=lambda x: x['name'])
            actual = sorted(actual, key=lambda x: x['name'])
        if claimed != actual:
            findings.append({'kind': 'manifest_mismatch', 'field': label, 'claimed': claimed, 'actual': actual})

    for name, manifest in documents.items():
        if not name.endswith('/manifest.json'):
            continue
        directory = name.split('/')[0]
        lods = {k: v for k, v in glbs.items() if k.startswith(directory + '/')}
        base = glbs[directory + '/model.glb']
        claims = {k: v for k, v in manifest.items() if k.startswith('provenance')}
        summaries[directory] = {'supplier_claims_not_independently_verified': claims,
                                'glbs': len(lods), 'glb_bytes': sum(x['bytes'] for x in lods.values())}
        for key, actual in [('size_bytes', base['bytes']), ('tri_count_LOD0', base['triangles'])]:
            if key in manifest:
                mismatch(name + ':' + key, manifest[key], actual)
        for key in ('aggregate_glb_size_bytes', 'all_lods_bytes', 'total_LOD_payload_bytes'):
            if key in manifest:
                mismatch(name + ':' + key, manifest[key], summaries[directory]['glb_bytes'])
        for lod in manifest.get('lods', []):
            key = directory + '/' + lod['file']
            require(key in glbs, 'missing declared LOD: ' + key)
            actual = glbs[key]
            for field, actual_key in [('size_bytes', 'bytes'), ('bytes', 'bytes'), ('triangles', 'triangles'), ('tri_count', 'triangles'), ('nodes', 'nodes'), ('animation_clips', 'animation_names')]:
                if field in lod:
                    mismatch(name + ':' + lod['file'] + ':' + field, lod[field], actual[actual_key])
            if 'materials' in lod:
                mismatch(key + ':materials', lod['materials'], len(actual['materials']))
            if 'texture_resolutions' in lod:
                mismatch(key + ':texture_resolutions', lod['texture_resolutions'], [{k: i[k] for k in ('name', 'width', 'height')} for i in actual['images']])
        resolution = manifest.get('texture_resolution', [])
        if resolution and isinstance(resolution[0], dict):
            mismatch(name + ':texture_resolution', resolution, [{k: i[k] for k in ('name', 'width', 'height')} for i in base['images']])
        elif resolution:
            mismatch(name + ':texture_resolution', [] if resolution == [0, 0] else [resolution], [list(x) for x in sorted({(i['width'], i['height']) for i in base['images']})])
        for lod_name, actual in lods.items():
            level = '0' if lod_name.endswith('/model.glb') else lod_name.split('_LOD')[-1].split('.')[0]
            slots = manifest.get('material_slots_by_lod', {}).get(level, manifest.get('material_slots'))
            if slots is not None:
                mismatch(lod_name + ':material_slots', slots, [m['name'] for m in actual['materials']])
            required = set(manifest.get('rig_nodes', []))
            movable = set(required)
            for rig_file in ('rig.json', 'manifest.rig.json'):
                rig = documents.get(directory + '/' + rig_file, {})
                movable.update(n['name'] for n in rig.get('movable_nodes', []))
                required.update(movable)
                required.update(n['name'] if isinstance(n, dict) else n for n in rig.get('static_nodes', []))
                required.update(rig.get('rigid_geometry_nodes', []))
                if rig.get('root'):
                    required.add(rig['root'])
            missing = sorted(required - set(actual['node_names']))
            actual['rig_nodes_checked'] = len(required)
            actual['missing_declared_rig_nodes'] = missing
            actual['missing_movable_rig_nodes'] = sorted(movable - set(actual['node_names']))
            if missing:
                findings.append({'kind': 'missing_rig_nodes', 'file': lod_name, 'nodes': missing})
        for field in ('source', 'receipt'):
            if isinstance(manifest.get(field), str) and directory + '/' + manifest[field] not in inventory:
                findings.append({'kind': 'undelivered_metadata_reference', 'file': name, 'field': field, 'reference': manifest[field]})
        for ref in manifest.get('evidence_files', []):
            if directory + '/' + ref not in inventory:
                findings.append({'kind': 'undelivered_evidence_reference', 'file': name, 'reference': ref})
    dependencies = []
    for name, document in documents.items():
        if name.endswith('/assembly.json'):
            for node in document.get('nodes', []):
                target = local_uri(node['asset'], source / Path(name).parent, source)
                dependencies.append({'assembly': name, 'asset': node['asset'], 'resolved': target.relative_to(source).as_posix()})
    terrain = glbs.get('terrain_water_materials/model.glb', {})
    gaps = {
        'standalone_town_hall_door_delivered': any(k.startswith('town_hall_door/') for k in inventory),
        'town_hall_embedded_door_nodes': [n for n in glbs.get('town_hall/model.glb', {}).get('node_names', []) if 'door' in n],
        'terrain_occlusionTexture_materials': [m['name'] for m in terrain.get('materials', []) if 'occlusionTexture' in m['channels']],
        'terrain_texture_dimensions': [list(x) for x in sorted({(i['width'], i['height']) for i in terrain.get('images', [])})],
        'note': 'Missing standalone door is not replaced by embedded door. Terrain AO is absent; 256px maps are not upgraded. No supplier bytes changed.'}
    report = {'schema': 1, 'status': 'structural audit passed; findings and integration holds remain',
              'scope': 'Byte preservation and GLB2 structure/metadata only; no rendering, FPS, gameplay, license or originality verification.',
              'provenance': 'Operator supplied delivery and authorized runtime import. Supplier originality statements are claims, not independently verified facts. No license invented or inferred.',
              'security_scan': 'All delivered UTF-8 text and decoded GLB JSON scanned for host paths, emails and common secret patterns; zero candidates. Heuristic, not a complete secret detector.',
              'counts': {'directories': len(summaries), 'files': len(inventory), 'glbs': len(glbs), 'copied_bytes': total, 'max_glb_bytes': max(x['bytes'] for x in glbs.values())},
              'known_gaps': gaps, 'assembly_dependencies': dependencies, 'manifest_summaries': summaries,
              'findings': findings, 'files': inventory, 'glbs': glbs}
    encoded = (json.dumps(report, indent=2, sort_keys=True) + '\n').encode()
    footprint = total + len(encoded) + Path(__file__).stat().st_size
    require(footprint < 34000000, 'copy + audit + checker exceeds 34MB')
    if args.canonical_only:
        previous = json.loads(REPORT.read_text())
        require(inventory == previous['files'], 'canonical SHA256 inventory differs from intake')
    if args.copy or args.write_report:
        require(shutil.disk_usage(ROOT).free >= FLOOR, 'disk below required intake floor; no writes')
    if args.copy:
        for name in inventory:
            target = CANON / name
            require(not target.exists() or sha(target.read_bytes()) == inventory[name]['sha256'], 'refusing differing canonical overwrite: ' + name)
        for name in inventory:
            target = CANON / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(STAGE / name, target)
    for name, item in inventory.items():
        target = CANON / name
        require(target.is_file() and sha(target.read_bytes()) == item['sha256'], 'canonical SHA256 mismatch: ' + name)
    if args.write_report:
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_bytes(encoded)
    elif REPORT.exists():
        require(REPORT.read_bytes() == encoded, 'audit report stale; inspect changes before --write-report')
    print(f"PASS: {len(inventory)} SHA256 matches; {len(glbs)} GLB2 containers, bufferViews/accessor ranges and index values validated")
    print(f"PASS: text/GLB metadata security scan; {len(summaries)} directories; max GLB {report['counts']['max_glb_bytes']} bytes")
    print(f"BYTES: delivery={total} audit={len(encoded)} checker={Path(__file__).stat().st_size} total={footprint}")
    print(f"FINDINGS: {len(findings)} metadata/rig discrepancies; standalone door={gaps['standalone_town_hall_door_delivered']}; terrain AO={len(gaps['terrain_occlusionTexture_materials'])}; terrain sizes={gaps['terrain_texture_dimensions']}")
    for directory, summary in summaries.items():
        rows = [v for k, v in glbs.items() if k.startswith(directory + '/')]
        print(f"{directory}: triangles={[r['triangles'] for r in rows]} nodes={[r['nodes'] for r in rows]} animations={[r['animations'] for r in rows]} bytes={summary['glb_bytes']}")


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, IndexError, TypeError, OSError, struct.error) as error:
        print('FAIL:', error, file=sys.stderr)
        sys.exit(1)

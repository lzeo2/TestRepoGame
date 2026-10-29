#!/usr/bin/env python3
"""Scoped supplied fighter derivatives. Stdlib only; never execute supplied code.

python3 -B Games/Wings/authoring/repair-fighter-pair.py --archive SOURCE_ZIP
Use --check for write-free reproduction, including retained pristine metadata.
"""
import argparse
import copy
import importlib.util
import json
import math
from pathlib import Path, PurePosixPath
import shutil
import stat
import struct
import zipfile

HERE = Path(__file__).resolve().parent
WINGS = HERE.parent
spec = importlib.util.spec_from_file_location('escort_glb', HERE / 'repair-escorts.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
ARCHIVE_SHA256 = g.ARCHIVE_SHA256
SOURCES = {
    'f16c': ('f-16c', 'b2c38684cd1f7d904e6d076f600f0233a3b481b8ea5434fc186411d31fa1cf30', 2236, 104032),
    'mig29': ('mig-29', 'b94eb1885dd2119ff135a824f2879b94f792340e684d51ded704a552d64d88c8', 2904, 122000),
    'typhoon': ('eurofighter-typhoon', 'cae157180c649ac6d4c3b43dd7ae1a5322d7cc2985f961fdbcf6effa4b99b835', 2654, 115688),
    'su35s': ('su-35s', '858eda509c102f2079a2af96fdfd6c7e8027d289bfd7d2797be38ba17a636433', 3058, 126788),
    'rafale': ('rafale-c', 'e547d577a3a533ad6c8cadaed6f53d1b5e0850bcbf985ac6dc631488f5100561', 2642, 114880),
    'jf17': ('jf-17-block-iii', 'b6bb06bbbf51c6af467e0e636a703d85cc53cff8b8b8b3f757e68db11aebb52a', 2708, 116228),
    'gripen': ('jas-39c-gripen', 'f996e62f23cf56027b885767fcb30ae954824b198254dd8a644a14fcacd9e789', 2388, 108908),
    'mig31': ('mig-31bm', 'dd4b8a9741ff4fb325c4a5534d1a0264148c1f0f91078f9dfcca565435e9c82f', 2626, 123644),
    'mirage2000': ('mirage-2000c', '5e17fb6db155a50fccaa52ccb4ec1989293441d0346769c43774dc370ce1f4dd', 2428, 107820),
    'su34': ('su-34', '8c2f3633dd39e47a0259b0954c831bee5f8531ed38db48a9e383c277166ff50a', 3194, 131032),
    'fa50': ('fa-50', 'adf3e81efc5c5841bc30b9fa526ae7bdf83f0ccbad8fa12a142f43b73b7484f6', 2652, 115524),
    'yak130': ('yak-130', '0bff616f2330806c42860c8d705f7ae05616f2a84e05d44530da4538da44505e', 3050, 124716),
    'hawkt2': ('hawk-t2', '9289e2d589b8a295392b2d100c1c3462ee935f1e4837e937e0fea5240bfb54e7', 2540, 114272),
    'su25sm': ('su-25sm', 'cf231893435e7283a5950bd7ca15591bb2ff9159ab29c001ea7b9412204b4663', 2972, 125092),
    'a10c': ('a-10c', '74c58cd536be3705b347d7c32fa76b54a0692a992fadde65f82772037187d623', 3698, 148464),
    'f35a': ('f-35a', '956550b4cba4a7e4bf4f6bccd71609673f46705a7f249b18adf8f38f2a646e01', 2278, 108228),
    'j20': ('j-20', '9d70ac66e30c70a69c76b8e0c7c0151a74a4e5ab9f12691cef738b816707b862', 2346, 111048),
}
METADATA = ['README.txt', 'manifest.json', 'models.json', 'palette.json', 'roster_lookup.json',
            'rigs/f-16c.json', 'rigs/mig-29.json', 'rigs/eurofighter-typhoon.json', 'rigs/su-35s.json',
            'rigs/rafale-c.json', 'rigs/jf-17-block-iii.json',
            'rigs/jas-39c-gripen.json', 'rigs/mig-31bm.json',
            'rigs/mirage-2000c.json', 'rigs/su-34.json', 'rigs/fa-50.json', 'rigs/yak-130.json',
            'rigs/hawk-t2.json', 'rigs/su-25sm.json', 'rigs/a-10c.json', 'rigs/f-35a.json', 'rigs/j-20.json']
BASELINES = {
    'a10.glb': 'f9f4392f4de4dea95558c16738ff02fd89ae1ca10d0d960655fb967df64b9d24',
    'ac130.glb': '1a53da510144bbcd28903ad407c067e4128af7d7a52afe4994e17826344f1f9e',
    'apache.glb': 'bd6a9677f8f469dceac601aef4fd2ec7b5a42f66f12c5493159004bfa6ca47ac',
    'b2.glb': '3e271a320ef39720c445ed379b72dcdf40b32c38b58d1df09d356be119ee826b',
    'carrier.glb': 'd1e20c4d0a6e13e4de6d1ec0ebbf1cd4ce7a563f2a14601c681b2159822ce9b0',
    'destroyer.glb': '5dfb334aa4496edb0c6358cdf7f8025f71dca563daad2b425d792b41c279eeef',
    'f15.glb': '5c1bf64dc21962dc822dc44edd91186aa4a6932034b06a405d3170518fc135bf',
    'f35.glb': 'ce19018414037e3cef949a99ae08a1d035b25fbd20601e1835c2426bc32db197',
    'fa18.glb': '78bb2fb9f542daaa607e850f7444018fc2f996cd247d67e3ad3761df58efab09',
    'speedboat.glb': '7fee0b74e7c746a2dff2b7c4b5bed58c39b9ddbbc0c55592f1eb27941b4f2aee',
    'yf12.glb': '5f49376fbace30d888e6972850833af28d101427f66f12bdf128c889966f6769',
    'derived/wings_type45_daring_class.glb': '34f5f85ab3e31b11187e967b85c0ebac1787ad8c9c06de250535f5a90866351f',
    'derived/wings_type054a_jiangkai_ii.glb': '52347c718b6aa6a0f6466a60fdc9a87df60234a146e6782af28186993c31fdc4',
    'derived/generic-attack-submarine.glb': '6898dd746f03d05a9d1205ab93b72083fa8ac3d6b2e7045198f3d9f786960724',
    'supplied/f-16c.glb': 'b2c38684cd1f7d904e6d076f600f0233a3b481b8ea5434fc186411d31fa1cf30',
    'supplied/mig-29.glb': 'b94eb1885dd2119ff135a824f2879b94f792340e684d51ded704a552d64d88c8',
    'derived/wings_f16c.glb': 'fc4dcefc1d16064ab8be6eaa386fe2ef45401bf645dbd2d43165e34ccd4e234e',
    'derived/wings_mig29.glb': 'c36c880521436792f18e1860ba51295f8b5c57e2dc05fa6081086e7d646edb83',
    'supplied/eurofighter-typhoon.glb': 'cae157180c649ac6d4c3b43dd7ae1a5322d7cc2985f961fdbcf6effa4b99b835',
    'supplied/su-35s.glb': '858eda509c102f2079a2af96fdfd6c7e8027d289bfd7d2797be38ba17a636433',
    'derived/wings_typhoon.glb': '8d5efa85820f46ea541d5f4fbc84c6d68185307da282643ac44cd25125d36754',
    'derived/wings_su35s.glb': '16be50931ebcb09a2161bbe7c2171079e4c3b3837261f467d4e5d67e996c7bed',
}
# BASELINES is imported by the frozen fleet generator; retain that historical ABI.
RETAINED_BASELINES = dict(BASELINES, **{
    'supplied/rafale-c.glb': 'e547d577a3a533ad6c8cadaed6f53d1b5e0850bcbf985ac6dc631488f5100561',
    'supplied/jf-17-block-iii.glb': 'b6bb06bbbf51c6af467e0e636a703d85cc53cff8b8b8b3f757e68db11aebb52a',
    'derived/wings_rafale.glb': 'fbf1d3ba66d37d6a63523700c9602901c5a545bf014a70f1546fc8c8e0e1677f',
    'derived/wings_jf17.glb': 'f8f80f2e9472a2bfb2754f8d6f9100303ecedc49d6f4ca8d234350a407c6bbd9',
    'supplied/wings_aquitaine_fremm.glb': 'cb8c3a46ab4bc4e0fd34633d0747664a371bff02dcb768635e3b5448bf489068',
    'supplied/wings_type055_renhai.glb': '7066833e6c8307e0d64906da35233ac4435fceda18f29acb7e82e219c968620b',
    'derived/wings_aquitaine_fremm.glb': 'e3675fa8736cd1b0d98880936662f8554bdeab0dc83ea62b3067df6632482f9e',
    'derived/wings_type055_renhai.glb': '261dcdaee62082df2e47f13d7afbb246ba35dc87f55fb07fa9f1fc600f7de01c',
    'supplied/jas-39c-gripen.glb': 'f996e62f23cf56027b885767fcb30ae954824b198254dd8a644a14fcacd9e789',
    'supplied/mig-31bm.glb': 'dd4b8a9741ff4fb325c4a5534d1a0264148c1f0f91078f9dfcca565435e9c82f',
    'derived/wings_gripen.glb': '49f9336f7e1c2075f27bbe676791a1eb80ab00f52ab1827df2ec2b7ebfff627d',
    'derived/wings_mig31.glb': 'c220c9afd4caf065fc8d84f15060d2b5341b16aa638d4ae88677df19409765b4',
    'supplied/wings_cb90_h.glb': '46aaa3e428309ad927402589a5b35243bedfa7511ee18849c50e48a45b84cfcc',
    'derived/wings_cb90_h.glb': 'c8e959a7cd618ce589c547780657b1cb9308d421a5149279d5e66816d4dac578',
    'supplied/mirage-2000c.glb': '5e17fb6db155a50fccaa52ccb4ec1989293441d0346769c43774dc370ce1f4dd',
    'supplied/su-34.glb': '8c2f3633dd39e47a0259b0954c831bee5f8531ed38db48a9e383c277166ff50a',
    'derived/wings_mirage2000.glb': '52a7af241805d4faaf35df163fae70d49149720b2437ea7d08e37f590068631f',
    'derived/wings_su34.glb': '60ca4edcf7453fe1f7fe25893ee5564888349a258ede977243dc8fbaff7b66ab',
    'supplied/fa-50.glb': 'adf3e81efc5c5841bc30b9fa526ae7bdf83f0ccbad8fa12a142f43b73b7484f6',
    'supplied/yak-130.glb': '0bff616f2330806c42860c8d705f7ae05616f2a84e05d44530da4538da44505e',
    'derived/wings_fa50.glb': '68f02d6ff28d5f54c2181031b7faf2e8cba06839925ccaf6836b28c6cd28b079',
    'derived/wings_yak130.glb': 'b1b4f0d3569386cba10e2574dfb29b3135899fbb0b5c8a2d30dd81a55be0fce6',
    'supplied/wings_type022_houbei.glb': 'f259a65fb5a43a6647e3e740d307aba23e77ff060db8d4881a9dcb853772bdca',
    'derived/wings_type022_houbei.glb': '80fd1b8287e8adb16844df2e7760bb34d7484ab15f59db057a949496a321898a',
    'supplied/hawk-t2.glb': '9289e2d589b8a295392b2d100c1c3462ee935f1e4837e937e0fea5240bfb54e7',
    'derived/wings_hawkt2.glb': '7dc2868e30f4f9f68be8425e04aac5e00d9145d3fe3b590b84f707827f235734',
    'supplied/su-25sm.glb': 'cf231893435e7283a5950bd7ca15591bb2ff9159ab29c001ea7b9412204b4663',
    'derived/wings_su25sm.glb': '2fe458ed79d9de72b3e122c7149ab859f64142e435f023b993bb0b50a602a767',
    'supplied/a-10c.glb': '74c58cd536be3705b347d7c32fa76b54a0692a992fadde65f82772037187d623',
    'derived/wings_a10c.glb': '897cd0cc6407cebdddaddd05224e925f577870f6f961e0903f11de367708f00e',
    'supplied/f-35a.glb': '956550b4cba4a7e4bf4f6bccd71609673f46705a7f249b18adf8f38f2a646e01',
    'derived/wings_f35a.glb': '1dfd31db6e01e7604c4145617a3a0afb3b880bc28a8017b5e61ea6b061221ce5',
})


def encoded(value):
    return (json.dumps(value, indent=2, allow_nan=False) + '\n').encode()


def archive_members(path):
    data = Path(path).read_bytes()
    assert len(data) == 3_114_212 and g.sha(data) == ARCHIVE_SHA256
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        assert len(names) == len(set(names)) == 65
        for i in z.infolist():
            p = PurePosixPath(i.filename)
            assert not p.is_absolute() and '..' not in p.parts and '\\' not in i.filename
            assert str(p) == i.filename and ':' not in i.filename
            assert not stat.S_ISLNK(i.external_attr >> 16) and not i.is_dir()
        assert z.testzip() is None
        manifest = json.loads(z.read('manifest.json'))
        assert set(manifest['files']) == set(names)
        for name, entry in manifest['files'].items():
            data = z.read(name)
            assert len(data) == entry['bytes']
            if name == 'manifest.json':
                assert entry['sha256'] is None and entry['self_reference'] is True
            else:
                assert g.sha(data) == entry['sha256'], name
        selected = METADATA + ['models/' + v[0] + '.glb' for v in SOURCES.values()]
        return {n: z.read(n) for n in selected}


def orient(doc, binary):
    attributes, indices = {}, set()
    for mesh in doc['meshes']:
        for pr in mesh['primitives']:
            assert pr.get('mode', 4) == 4
            for name, index in pr['attributes'].items():
                assert index not in attributes or attributes[index] == name
                attributes[index] = name
            indices.add(pr['indices'])
    for index, name in attributes.items():
        values = g.accessor(doc, binary, index)
        if name in ('POSITION', 'NORMAL'):
            g.store_accessor(doc, binary, index, [g.reflect(v) for v in values])
        elif name == 'TANGENT':
            g.store_accessor(doc, binary, index, [g.reflect(v[:3]) + [-v[3]] for v in values])
        else:
            assert name.startswith('TEXCOORD_')
    for index in indices:
        values = g.accessor(doc, binary, index)
        for i in range(0, len(values), 3):
            values[i+1], values[i+2] = values[i+2], values[i+1]
        g.store_accessor(doc, binary, index, values)
    for n in doc['nodes']:
        assert 'matrix' not in n
        if 'translation' in n:
            n['translation'] = g.reflect(n['translation'])
        if 'rotation' in n:
            x, y, z, w = n['rotation']
            n['rotation'] = [-x, -y, z, w]
        if 'control_axis_gltf' in n.get('extras', {}):
            x, y, z = n['extras']['control_axis_gltf']
            n['extras']['control_axis_gltf'] = [-x, -y, z]


def triangles(doc, binary, node):
    for pr in doc['meshes'][node['mesh']]['primitives']:
        ps = g.accessor(doc, binary, pr['attributes']['POSITION'])
        ids = [v[0] for v in g.accessor(doc, binary, pr['indices'])]
        for i in range(0, len(ids), 3):
            yield [ps[j] for j in ids[i:i+3]]


def surface_y(tris, x, z):
    hits = []
    for a, b, c in tris:
        det = (b[0]-a[0])*(c[2]-a[2])-(c[0]-a[0])*(b[2]-a[2])
        if abs(det) < 1e-10:
            continue
        u = ((x-a[0])*(c[2]-a[2])-(c[0]-a[0])*(z-a[2]))/det
        v = ((b[0]-a[0])*(z-a[2])-(x-a[0])*(b[2]-a[2]))/det
        if u >= -1e-7 and v >= -1e-7 and u+v <= 1+1e-7:
            hits.append(a[1]+u*(b[1]-a[1])+v*(c[1]-a[1]))
    assert hits, (x, z)
    return min(hits), max(hits)


def cross(a, b):
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]


def tube(radius, rings, segments=12):
    """Closed lathed geometry along Z. Rings are (z, radius multiplier)."""
    faces = []
    rs = [[[radius*r*math.cos(i*math.tau/segments), radius*r*math.sin(i*math.tau/segments), z]
           for i in range(segments)] for z, r in rings]
    for a, b in zip(rs, rs[1:]):
        for i in range(segments):
            j = (i+1) % segments
            faces.extend([[a[i], a[j], b[j]], [a[i], b[j], b[i]]])
    for ring, sign in [(rs[0], -1), (rs[-1], 1)]:
        center = [0, 0, ring[0][2]]
        for i in range(segments):
            j = (i+1) % segments
            faces.append([center, ring[j], ring[i]] if sign < 0 else [center, ring[i], ring[j]])
    return faces


def box(lo, hi):
    ps = [[hi[0] if i&1 else lo[0], hi[1] if i&2 else lo[1], hi[2] if i&4 else lo[2]] for i in range(8)]
    return [[ps[a], ps[b], ps[c]] for a,b,c in [(0,2,3),(0,3,1),(4,5,7),(4,7,6),
            (0,1,5),(0,5,4),(2,6,7),(2,7,3),(0,4,6),(0,6,2),(1,3,7),(1,7,5)]]


def add_mesh(doc, binary, name, faces, material, position, parent):
    ps, ns = [], []
    for a, b, c in faces:
        n = cross([b[j]-a[j] for j in range(3)], [c[j]-a[j] for j in range(3)])
        if sum(v*v for v in n) < 1e-18:
            continue
        ps.extend([a,b,c]); ns.extend([g.unit(n)]*3)
    def add(values, component, kind):
        binary.extend(b'\0' * (-len(binary) % 4))
        start = len(binary)
        fmt = '<' + g.FORMATS[component]*len(values[0])
        binary.extend(b''.join(struct.pack(fmt, *v) for v in values))
        vi = len(doc['bufferViews'])
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': start, 'byteLength': len(binary)-start})
        ai = len(doc['accessors'])
        doc['accessors'].append({'bufferView': vi, 'componentType': component, 'count': len(values), 'type': kind,
                                 'min': [min(v[j] for v in values) for j in range(len(values[0]))],
                                 'max': [max(v[j] for v in values) for j in range(len(values[0]))]})
        return ai
    attrs = {'POSITION': add(ps, 5126, 'VEC3'), 'NORMAL': add(ns, 5126, 'VEC3')}
    ids = add([(i,) for i in range(len(ps))], 5123, 'SCALAR')
    mi = len(doc['meshes'])
    doc['meshes'].append({'name': name, 'primitives': [{'attributes': attrs, 'indices': ids, 'material': material}]})
    ni = len(doc['nodes'])
    doc['nodes'].append({'name': name, 'mesh': mi, 'translation': position,
                         'extras': {'authorship': 'original_arcade_equipment_not_operational_replica'}})
    doc['nodes'][parent].setdefault('children', []).append(ni)
    return ni


def anchor(doc, name, position, parent):
    ni = len(doc['nodes'])
    doc['nodes'].append({'name': name, 'translation': position})
    doc['nodes'][parent].setdefault('children', []).append(ni)
    return ni


def world_points(doc, binary):
    ms = g.world_matrices(doc)
    return [g.point(ms[i], p) for i,n in enumerate(doc['nodes']) if 'mesh' in n for p in g.node_points(doc,binary,n)]


def derive(source, slug, rig):
    doc, binary = g.unpack_glb(source)
    original_triangles = sum(len(g.accessor(doc,binary,pr['indices']))//3 for m in doc['meshes'] for pr in m['primitives'])
    orient(doc, binary)
    nodes = {n['name']: i for i,n in enumerate(doc['nodes'])}
    root = nodes['vehicle_root']
    assert g.node_matrix(doc['nodes'][root]) == g.node_matrix({})
    doc['nodes'][root]['extras']['coordinates'] = 'meters; -Z forward; +Y up; +X right; identity root'
    original_bounds = g.bounds(world_points(doc, binary))
    static = doc['nodes'][nodes['airframe_static']]
    tris = list(triangles(doc, binary, static))
    # Isolate actual alloy nozzle components, not the full airframe or fin bounds.
    alloy = [pr for pr in doc['meshes'][static['mesh']]['primitives'] if pr['material'] == 3]
    temp = copy.copy(doc); temp['meshes'] = [{'primitives': alloy}]
    outlets = sorted(g.component_bounds(temp, binary, {'mesh': 0}), key=lambda b:b['min'][0])
    if slug == 'a-10c':
        # The pinned source also has 26 front fan/hub alloy components. Only the
        # two rearmost connected components are outlets; keep all source meshes.
        assert len(outlets) == 28
        by_rear = sorted(outlets, key=lambda b:b['max'][2])
        assert by_rear[-3]['max'][2] < 2 and by_rear[-2]['min'][2] > 4.8
        outlets = sorted(by_rear[-2:], key=lambda b:b['min'][0])
    assert len(outlets) == (1 if slug in ('f-16c', 'jf-17-block-iii', 'jas-39c-gripen', 'mirage-2000c', 'fa-50', 'hawk-t2', 'f-35a') else 2)
    # Visual opt-out only: F-35A/J-20 real engine afterburner mechanics are not modeled here.
    static_core = slug in ('yak-130', 'hawk-t2', 'su-25sm', 'a-10c', 'f-35a', 'j-20')
    paint = len(doc['materials'])
    doc['materials'].extend([
        {'name': 'arcade_store_dark_paint', 'pbrMetallicRoughness': {'baseColorFactor': [.025,.029,.032,1], 'metallicFactor': .15, 'roughnessFactor': .6}},
        {'name': 'arcade_exhaust_core' if static_core else 'arcade_afterburner_disc',
         'emissiveFactor': [.12,.045,.012] if static_core else [1,.22,.035],
         'pbrMetallicRoughness': {'baseColorFactor':[.035,.022,.016,1] if static_core else [.16,.04,.01,1], 'metallicFactor':0, 'roughnessFactor':.5}},
    ])
    # Retain the supplied map and identities; make the closed glazing intentionally dielectric/translucent.
    doc['materials'][4]['alphaMode'] = 'BLEND'
    doc['materials'][4]['pbrMetallicRoughness']['metallicFactor'] = 0
    doc['materials'][4]['pbrMetallicRoughness']['baseColorFactor'][3] = .26
    canopy = doc['nodes'][nodes['canopy']]
    cp = [g.point(g.node_matrix(canopy),p) for p in g.node_points(doc,binary,canopy)]
    cb = g.bounds(cp)
    # Eye from measured canopy center section: above fuselage, inside the closed shell, not the hinge.
    cz = (cb['min'][2]+cb['max'][2])/2
    floor, roof = surface_y(list(triangles(doc,binary,canopy)), 0, cz-canopy['translation'][2])
    roof += canopy['translation'][1]
    body_roof = surface_y(tris,0,cz)[1]
    cockpit = [0, body_roof + (roof-body_roof)*.7, cz]
    assert body_roof < cockpit[1] < roof
    anchor(doc,'cockpit_eye',cockpit,root)
    stores, hardpoints, stations = [], [], []
    span = original_bounds['max'][0]
    # Placement ratios are authored choices. Attachment height is an exact wing-surface ray hit.
    for seat, number, ratio in [(0,2,.72),(1,1,.46)]:
        pair = []
        for side, sign in [('L',-1),('R',1)]:
            x = sign*span*ratio
            section = []
            for tri in tris:
                for a,b in zip(tri,tri[1:]+tri[:1]):
                    if min(a[0],b[0]) <= x <= max(a[0],b[0]) and abs(a[0]-b[0]) > 1e-8:
                        t = (x-a[0])/(b[0]-a[0])
                        section.append(a[2]+t*(b[2]-a[2]))
            assert section
            z = (min(section)+max(section))/2
            underside, top = surface_y(tris,x,z)
            strike = slug in ('f-16c', 'su-35s', 'rafale-c', 'jf-17-block-iii', 'jas-39c-gripen', 'su-34', 'yak-130', 'hawk-t2', 'su-25sm', 'a-10c', 'j-20') and seat == 1
            radius, length = (.16,2.25) if strike else (.10,2.7)
            y = underside - .28 - radius*2
            faces = tube(radius,[(-length/2,0),(-length/2+.32,1),(length/2,1)])
            for angle in [0,math.pi/2,math.pi,math.pi*1.5]:
                fin = [[radius,0,length*.10],[radius+.23,0,length*.36],[radius,0,length*.43]]
                transformed = [[p[0]*math.cos(angle),p[0]*math.sin(angle),p[2]] for p in fin]
                faces += [transformed, list(reversed(transformed))]
            name = 'missile_'+side+str(number)
            ni = add_mesh(doc,binary,name,faces,paint,[x,y,z],root)
            local = g.node_points(doc,binary,doc['nodes'][ni])
            front = min(p[2] for p in local)
            tip = sorted(set(p for p in local if abs(p[2]-front)<1e-6))
            launch = [sum(p[j] for p in tip)/len(tip) for j in range(3)]
            ai = anchor(doc,name+'_launch',launch,ni)
            pair.append(g.point(g.world_matrices(doc)[ai],[0,0,0]))
            stores.append(name)
            add_mesh(doc,binary,'pylon_'+side+str(number),box([-.045,y+radius,-.22],[.045,underside+.015,.32]),3,[x,0,z],root)
            stations.append({'node':name,'seat':seat,'slot':1 if seat==0 else 0,'weapon':'maverick' if strike else ('tvmissile' if slug in ('su-35s', 'j-20') or (slug in ('eurofighter-typhoon', 'mig-31bm', 'mirage-2000c', 'fa-50', 'f-35a') and seat==1) else 'aim9'),
                             'attachment':[x,underside,z],'launch_node':name+'_launch'})
        hardpoints.append(pair)
    # A visible under-nose barrel terminates at a measured ring, with its anchor on that face.
    gz = cb['min'][2]
    gy = surface_y(tris,0,gz)[0]-.07
    barrel = add_mesh(doc,binary,'gun_barrel',tube(.055,[(-.55,1),(.30,1)]),3,[0,gy,gz],root)
    ring = sorted(set(p for p in g.node_points(doc,binary,doc['nodes'][barrel]) if abs(p[2]+.55)<1e-6))
    muzzle = [sum(p[j] for p in ring)/len(ring) for j in range(3)]
    gun = anchor(doc,'gun_muzzle',muzzle,barrel)
    gun_point = g.point(g.world_matrices(doc)[gun],[0,0,0])
    exhausts = []
    for index,b in enumerate(outlets):
        suffix = '' if len(outlets)==1 else ('_L' if index==0 else '_R')
        x,y = [(b['min'][j]+b['max'][j])/2 for j in [0,1]]
        radius = min(b['max'][j]-b['min'][j] for j in [0,1])*.42
        z = b['max'][2]+.008
        name = ('exhaust_core' if static_core else 'afterburner')+suffix
        ni = add_mesh(doc,binary,name,tube(radius,[(0,1),(.012,1)],20),paint+1,[x,y,z],root)
        ai = anchor(doc,'exhaust'+suffix,[0,0,0],ni)
        exhausts.append({'node':name,'anchor':'exhaust'+suffix,'position':g.point(g.world_matrices(doc)[ai],[0,0,0])})
    controls = []
    for c in rig['controls']:
        name = c['node']
        if name == 'canopy':
            continue  # preserve supplied closed rest pose; no invented flight-control driver
        if name.startswith('vertical_stabilizer'):
            assert c['suggested_local_rotation_axis'] == [0, 1, 0], name
            assert doc['nodes'][nodes[name]]['extras']['control_axis_gltf'] == [0, -1, 0], name
        axis = 'y' if name.startswith(('rudder', 'vertical_stabilizer')) else 'x'
        driver = 'yaw' if axis=='y' else ('roll' if name.startswith(('flaperon', 'elevon', 'aileron')) else 'pitch')
        gain = (-1 if name.endswith('_L') else 1) if driver=='roll' else -1
        control = {'node':name,'axis':axis,'driver':driver,'gain':gain,'max_rad':.28 if driver=='yaw' else .22}
        if slug == 'mirage-2000c' and driver == 'roll':
            control['pitch_gain'] = -1  # One real elevon pivot, clamped pitch+roll sum.
        controls.append(control)
    doc['buffers'][0]['byteLength'] = len(binary)
    payload = g.pack_glb(doc,binary)
    kind = next(k for k,v in SOURCES.items() if v[0] == slug)
    descriptor = {'source_model_id': 'wings.original.'+slug+'.v1', 'source_sha256': g.sha(source),
                  'file':'models/derived/wings_'+kind+'.glb',
                  'sha256':g.sha(payload),'bounds':g.bounds(world_points(doc,binary)),
                  'hardpoints':{'gun':gun_point,'missiles':hardpoints},'cockpit':cockpit,'exhausts':exhausts,
                  'controls':controls,'native_pivots':[c['node'] for c in controls]+stores+[e['node'] for e in exhausts]}
    if static_core:
        descriptor['afterburning'] = False
    record = {'body_bounds':original_bounds,'closed_canopy_bounds':cb,'cockpit_derivation':'canopy_center_Z_section; eye_70_percent_between_actual_body_roof_and_glazing_roof',
              'stations':stations,'outlet_component_bounds':outlets,'bytes':len(payload),
              'original_triangles':original_triangles,
              'triangles':sum(len(g.accessor(doc,binary,pr['indices']))//3 for m in doc['meshes'] for pr in m['primitives'])}
    return payload,descriptor,record


def generate(archive):
    members = archive_members(archive)
    outputs = {'authoring/supplied-fighters/'+n:members[n] for n in METADATA}
    models, records = {}, {}
    for kind,(slug,expected,tri,size) in SOURCES.items():
        source = members['models/'+slug+'.glb']
        assert len(source)==size and g.sha(source)==expected
        payload,descriptor,record = derive(source,slug,json.loads(members['rigs/'+slug+'.json']))
        assert record['original_triangles']==tri and len(payload)<512_000
        outputs['models/supplied/'+slug+'.glb'] = source
        outputs[descriptor['file']] = payload
        models[kind],records[kind] = descriptor,record
    outputs['authoring/native-fighter-pair.json'] = encoded({'schema':'wings_native_fighter_pair_v1','archive_sha256':ARCHIVE_SHA256,'models':models})
    outputs['authoring/supplied-fighters/repair-record.json'] = encoded({
        'archive_sha256':ARCHIVE_SHA256,'existing_model_sha256':RETAINED_BASELINES,
        'provenance':'User reports generating the supplied assets with GPT and authorizes scoped Wings use/repair; not independently verified originality or a license claim.',
        'conversion':'C=diag(1,1,-1); all positions/normals/rest translations reflected; C*M*C rotations; winding reversed once; tangent W negated; signed axes axial-reflected.',
        'materials':'Original identities/maps/UV/image bytes retained. Closed canopy changed to dielectric BLEND alpha .26. Other source material values unchanged. Native converter texture parity is separate.',
        'control_limits':'Conservative original arcade visual gains/limits, not certified aircraft mechanics; source approximate hinges retained.',
        'fits':'Original arcade equipment: F16 pilot cannon20/aim9, officer maverick; MiG29 pilot cannon20/aim9, officer aim9; Typhoon pilot cannon20/aim9, officer tvmissile; Su35S pilot cannon20/tvmissile, officer maverick; Rafale C, JF17 Block III and Gripen pilot cannon20/aim9, officer maverick; MiG31BM and Mirage2000C pilot cannon20/aim9, officer tvmissile; Su34 pilot cannon20/aim9, officer maverick; FA50 pilot cannon20/aim9, officer tvmissile; Yak130, HawkT2 and Su25SM pilot cannon20/aim9, officer maverick; A10C pilot gau8/aim9, officer maverick; F35A pilot cannon20/aim9, officer tvmissile, four generic EXTERNAL ammo-linked stores. F35A generic under-nose barrel adapter is not real caliber or an internal GAU-22 installation. A10C uses the existing gau8 game weapon with a generic measured under-nose barrel/muzzle, not real rotary GAU-8 geometry or a certified installation; no source gun pivot or invented spin rig. No BVR or simultaneous bomb fit claim. Two stores per missile slot, four total per aircraft; Su35S is a bounded arcade fit, not the full six-missile wish. No caliber or real operational fit claim.',
        'notice':'Qualified supplied base art, not photorealistic or native accepted. Historical pair filename/schema retained as ABI; seventeen models. Mirage uses actual elevons with roll gain L=-1/R=+1 and pitch_gain=-1, clamped summed native rates; no tailplane/canard fabricated. Su34 actual canards and tailplanes both drive pitch, two rudders yaw. Approximate hinges, clearance samples and closed-shell cockpit are not certified mechanisms or native pixels/performance/license acceptance. FA50 has one measured afterburning outlet; Yak130 has two non-afterburning turbofans, dim static warm exhaust cores, no flame/cone/boost emission or stretch. HawkT2 has one measured non-afterburning outlet with a single exhaust_core node/exhaust anchor and the same faint static warm material; no flame/cone/boost emission or stretch. Su25SM uses actual ailerons for roll, elevators for pitch and central rudder for yaw, with two measured non-afterburning alloy outlets and the same static warm cores. Source Su25 exterior is an SM simplification, not a certified exact SM revision or real GSh caliber/operational loadout. Native boost is an arcade speed setting, not an afterburner claim. No supplied scripts executed; only twenty-two metadata entries and seventeen GLBs selectively retained. A10C has actual aileron/elevator/twin-rudder controls and two measured raised non-afterburning rear outlets, excluding front fan alloy components; existing dim static warm cores only. Source A10 family exterior does not certify variant-specific avionics or mechanics. Legacy a10.glb/Warthog rotary gun, rockets and stats remain untouched. F35A is the distinct supplied land-based A exterior with actual flaperons, tailplanes, twin canted fins/rudders and ONE measured exhaust_core/exhaust. Its afterburning:false is a VISUAL opt-out only: real F35A afterburner mechanics/visuals are not modeled in this bounded unit, not a claim the real aircraft lacks an afterburner. Existing dim static warm core only; no new flame, shader, clock or nozzle mechanics. No stealth, bay, lift-fan, VTOL, gear or naval capability claim. Original F35 model/weapons/stealth/bays remain untouched. J20 is the distinct supplied public-silhouette exterior, not J20S/naval or certified dimensions: approximate art length/span 20.4/13.5. Actual elevon_L/R roll, canard_L/R pitch and vertical_stabilizer_1/2 yaw retain supplied names and +Y source axes. Two measured outlets reuse static cores; afterburning:false is VISUAL ONLY, not real engine capability. No new flame/shader/clock/nozzle mechanics. Pilot cannon20/tvmissile and officer maverick/null use four generic EXTERNAL arcade stores. Generic under-nose cannon adapter is NOT a real J20 gun/caliber/internal-bay fit or operational capability; no verified gun/bay geometry. No stealth/bay doors/gear/naval fit.',
        'models':records})
    assert sum(map(len,outputs.values()))<5_100_000  # Seventeen models: about 5.04 MB; bounded aggregate, per-GLB ceiling unchanged.
    return outputs


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',required=True,type=Path)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    outputs=generate(args.archive)
    if args.check:
        for name,data in outputs.items():
            assert (WINGS/name).read_bytes()==data,name
        print('PASS: seventeen raw fighters, seventeen derivatives, twenty-two pristine metadata files and descriptors reproduce byte-exact')
    else:
        size=sum(map(len,outputs.values()))
        assert shutil.disk_usage(WINGS).free-size >= 2**31
        # Preflight before any writes: a generator mistake must not touch retained GLBs.
        for name,expected in RETAINED_BASELINES.items():
            assert g.sha((WINGS/'models'/name).read_bytes()) == expected, name
            relative = 'models/'+name
            if relative in outputs:
                assert g.sha(outputs[relative]) == expected, 'refusing to overwrite retained GLB: '+relative
        # Historical descriptors/repair entries and pristine metadata are immutable too.
        for name in ('authoring/native-fighter-pair.json', 'authoring/supplied-fighters/repair-record.json'):
            if name not in outputs:
                continue
            previous = json.loads((WINGS/name).read_bytes())['models']
            generated = json.loads(outputs[name])['models']
            for kind in SOURCES.keys()-{'j20'}:
                assert generated.get(kind) == previous[kind], 'refusing to overwrite retained entry: '+name+':'+kind
        for metadata in METADATA[:-1]:
            name = 'authoring/supplied-fighters/'+metadata
            if name in outputs:
                assert outputs[name] == (WINGS/name).read_bytes(), 'refusing to overwrite retained metadata: '+name
        for name,data in outputs.items():
            p=WINGS/name
            if p.exists() and p.read_bytes()==data:
                continue
            assert name not in {'models/'+n for n in RETAINED_BASELINES}, 'refusing to overwrite retained GLB: '+name
            p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
        print(f'WROTE: {len(outputs)} selected/generated files, {size} bytes; no supplied code executed')


if __name__=='__main__':
    main()

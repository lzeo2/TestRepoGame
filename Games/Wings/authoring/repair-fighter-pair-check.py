#!/usr/bin/env python3
"""One stdlib-only serialized fighter check. No browser, dependencies or writes.

python3 -B Games/Wings/authoring/repair-fighter-pair-check.py --archive SOURCE_ZIP
"""
import argparse
import ast
import copy
import importlib.util
import json
import math
import struct
import subprocess
import zipfile
import zlib
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('fighters', HERE/'repair-fighter-pair.py')
f = importlib.util.module_from_spec(spec)
spec.loader.exec_module(f)
g = f.g


def close(a,b,tol=2e-6):
    assert len(a)==len(b) and all(abs(x-y)<tol for x,y in zip(a,b)),(a,b)


def image(doc,binary,index):
    v=doc['bufferViews'][doc['images'][index]['bufferView']]
    return bytes(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])


def check_png(data):
    assert data[:8]==b'\x89PNG\r\n\x1a\n'
    pos,packed,header,ended=8,bytearray(),None,False
    while pos<len(data):
        size=struct.unpack_from('>I',data,pos)[0]
        kind=data[pos+4:pos+8];payload=data[pos+8:pos+8+size]
        assert len(payload)==size
        assert zlib.crc32(kind+payload)&0xffffffff==struct.unpack_from('>I',data,pos+8+size)[0]
        if kind==b'IHDR':header=struct.unpack('>IIBBBBB',payload)
        elif kind==b'IDAT':packed.extend(payload)
        elif kind==b'IEND':ended=True
        pos+=12+size
    assert ended and pos==len(data)
    w,h,depth,color,compression,filtering,interlace=header
    assert (w,h,depth,compression,filtering,interlace)==(256,256,8,0,0,0) and color in (2,6)
    assert len(zlib.decompress(packed))==h*(1+w*{2:3,6:4}[color])


def vertices(doc,binary,name):
    i=next(i for i,n in enumerate(doc['nodes']) if n['name']==name)
    m=g.world_matrices(doc)[i]
    return [g.point(m,p) for p in g.node_points(doc,binary,doc['nodes'][i])]


def world_triangles(doc,binary,indices):
    ms=g.world_matrices(doc)
    return [[g.point(ms[i],p) for p in tri] for i in indices
            for tri in f.triangles(doc,binary,doc['nodes'][i])]


def ray_hit(origin,direction,tri):
    a,b,c=tri
    e1=[b[j]-a[j] for j in range(3)];e2=[c[j]-a[j] for j in range(3)]
    h=f.cross(direction,e2); det=sum(e1[j]*h[j] for j in range(3))
    if abs(det)<1e-10:return None
    s=[origin[j]-a[j] for j in range(3)]
    u=sum(s[j]*h[j] for j in range(3))/det
    if u < -1e-7 or u > 1+1e-7:return None
    q=f.cross(s,e1);v=sum(direction[j]*q[j] for j in range(3))/det
    if v < -1e-7 or u+v > 1+1e-7:return None
    t=sum(e2[j]*q[j] for j in range(3))/det
    return t if t>1e-5 else None


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',type=Path,required=True)
    args=parser.parse_args()
    outputs=f.generate(args.archive)
    for relative,data in outputs.items():assert (f.WINGS/relative).read_bytes()==data,relative
    print('PASS archive: pinned SHA, 65 safe unique paths, CRC, 64 member hashes, exact selected raw/metadata bytes; no supplied code executed')
    with zipfile.ZipFile(args.archive) as z:
        assets=json.loads(z.read('models.json'))['assets']
        lookup=json.loads(z.read('roster_lookup.json'))
        assert len(assets)==30 and len({a['model_id'] for a in assets})==30
        ids={a['model_id'] for a in assets}
        assert len(lookup['standard'])==20 and len(lookup['factions'])==30
        for slot in lookup['standard']+lookup['factions']:assert slot['model_id'] in ids
        for a in assets:
            d,b=g.unpack_glb(z.read(a['model_file']))
            rig=json.loads(z.read(a['rig_file']))
            names={n['name'] for n in d['nodes']}
            assert rig['model_id']==a['model_id']
            for c in rig['controls']:assert c['node'] in names
            assert not d.get('skins') and not d.get('animations')
            for buf in d['buffers']:assert 'uri' not in buf
            for img in d.get('images',[]):assert 'uri' not in img
    print('PASS archive metadata: 30 GLB/JSON rigs, 20 standard and 30 faction slots; no external resource URIs')
    descriptor=json.loads((HERE/'native-fighter-pair.json').read_text())
    record=json.loads((HERE/'supplied-fighters/repair-record.json').read_text())
    assert descriptor['schema']=='wings_native_fighter_pair_v1'
    assert descriptor['archive_sha256']==f.ARCHIVE_SHA256
    assert set(descriptor['models'])==set(f.SOURCES)=={'f16c','mig29','typhoon','su35s','rafale','jf17','gripen','mig31','mirage2000','su34','fa50','yak130','hawkt2','su25sm','a10c','f35a','j20'}
    # Freeze every historical descriptor value, including fields absent from the GLB.
    for kind,expected in {
        'f16c':'77cdf82310eb50e68629905b4b41ab37db249bff9db14e59cec0b03219d9a83c',
        'mig29':'c85b1aed5882518d712dc3e09a9fa2af6c7b9633fc6a72bf0474998a54f49a7c',
        'typhoon':'cf6d90b5c53aec453f20e69e580c788f2954fcf453e4b29ac37b3a93759a6227',
        'su35s':'0b18145bc752f089f835be726afc0354c5fec618cf6cbf4ee7ea53ff66218c3a',
        'rafale':'364be4f71d60853f6bc6038455f4113cf73364826c5c22570ced8538cf60beb3',
        'jf17':'9ed9f0c08d1186b3567022aff2b2f7e2f04816adabff0781cda6e8f97668d9d1',
        'gripen':'dd78a46f498430acd84227d269f09dee3238a67d5fae5f0390dddf5dd78bfc4c',
        'mig31':'3e484e2202d8e55be2309475e69eb5ab2a60e5832c0878e477ae6d2941d44ec1',
        'mirage2000':'fbbb6bdddc3184b1bcca8fa7ed836959a831a3e70d7dbc089b9b5de01d6fd008',
        'su34':'f8ca5c812344254809ea079468da46a93f6e08be833dcb72bf06ae98e64b19be',
        'fa50':'32eb0c769e268651030e3160a12c4b7eba977cee332f1a721cae36f396cc9bec',
        'yak130':'c3f8b961d6246a394b403cd1bcc6ceb6797155239ea6ee23646aec5d87d0ff6b',
        'hawkt2':'890056bf9466c77dcbcfe7cdd39127df3f53ee550bc73c2f6f54dc0060249681',
        'su25sm':'80cfcfb97a603e6173b6a7232467526750c878659b097ce3e4ae43990bda1a36',
        'a10c':'ea6c4ec0e25d87e0440a64fbc62cc0831734ee2dd88414fc5db8ed76c3bba834',
        'f35a':'d112b8847b8662a5a7685dd41489be24968e4f74409ea1b11358fa7e3bda088d',
    }.items():assert g.sha(f.encoded(descriptor['models'][kind]))==expected,kind
    expected_controls={
        'f16c': {'roll': ['flaperon_L','flaperon_R'], 'pitch': ['tailplane_L','tailplane_R'], 'yaw': ['rudder_1']},
        'mig29': {'roll': ['flaperon_L','flaperon_R'], 'pitch': ['tailplane_L','tailplane_R'], 'yaw': ['rudder_1','rudder_2']},
        'typhoon': {'roll': ['elevon_L','elevon_R'], 'pitch': ['canard_L','canard_R'], 'yaw': ['rudder_1']},
        'su35s': {'roll': ['elevon_L','elevon_R'], 'pitch': ['tailplane_L','tailplane_R'], 'yaw': ['rudder_1','rudder_2']},
        'rafale': {'roll': ['elevon_L','elevon_R'], 'pitch': ['canard_L','canard_R'], 'yaw': ['rudder_1']},
        'jf17': {'roll': ['elevon_L','elevon_R'], 'pitch': ['tailplane_L','tailplane_R'], 'yaw': ['rudder_1']},
        'gripen': {'roll': ['elevon_L','elevon_R'], 'pitch': ['canard_L','canard_R'], 'yaw': ['rudder_1']},
        'mig31': {'roll': ['elevon_L','elevon_R'], 'pitch': ['tailplane_L','tailplane_R'], 'yaw': ['rudder_1','rudder_2']},
        'mirage2000': {'roll': ['elevon_L','elevon_R'], 'pitch': [], 'yaw': ['rudder_1']},
        'su34': {'roll': ['elevon_L','elevon_R'], 'pitch': ['canard_L','canard_R','tailplane_L','tailplane_R'], 'yaw': ['rudder_1','rudder_2']},
        'fa50': {'roll': ['elevon_L','elevon_R'], 'pitch': ['tailplane_L','tailplane_R'], 'yaw': ['rudder_1']},
        'yak130': {'roll': ['elevon_L','elevon_R'], 'pitch': ['tailplane_L','tailplane_R'], 'yaw': ['rudder_1']},
        'hawkt2': {'roll': ['elevon_L','elevon_R'], 'pitch': ['tailplane_L','tailplane_R'], 'yaw': ['rudder_1']},
        'su25sm': {'roll': ['aileron_L','aileron_R'], 'pitch': ['elevator_L','elevator_R'], 'yaw': ['rudder_center']},
        'a10c': {'roll': ['aileron_L','aileron_R'], 'pitch': ['elevator_L','elevator_R'], 'yaw': ['rudder_L','rudder_R']},
        'f35a': {'roll': ['flaperon_L','flaperon_R'], 'pitch': ['tailplane_L','tailplane_R'], 'yaw': ['rudder_1','rudder_2']},
        'j20': {'roll': ['elevon_L','elevon_R'], 'pitch': ['canard_L','canard_R'], 'yaw': ['vertical_stabilizer_1','vertical_stabilizer_2']},
    }
    expected_fits={'f16c':['aim9','maverick'], 'mig29':['aim9','aim9'],
                   'typhoon':['aim9','tvmissile'], 'su35s':['tvmissile','maverick'],
                   'rafale':['aim9','maverick'], 'jf17':['aim9','maverick'],
                   'gripen':['aim9','maverick'], 'mig31':['aim9','tvmissile'],
                   'mirage2000':['aim9','tvmissile'], 'su34':['aim9','maverick'],
                   'fa50':['aim9','tvmissile'], 'yak130':['aim9','maverick'], 'hawkt2':['aim9','maverick'], 'su25sm':['aim9','maverick'], 'a10c':['aim9','maverick'], 'f35a':['aim9','tvmissile'], 'j20':['tvmissile','maverick']}
    for slug,expected in {
        'rafale-c':'1e2dd40c6709cfcfbb18d275d88c6baa1f238e43b1346c3a754cfd7396939a64',
        'jf-17-block-iii':'4b8b918f0f8a340eaf4b41be7084549f7eab5f2439dd73a044c5052e8963b4db',
        'jas-39c-gripen':'d66473633eb738774f3b2f85f1548bd78c153df705a7a3194dd6d797645d4c06',
        'mig-31bm':'cbfc6b6b684285363d26b9c5da9a9a0d1a7abf2b5264dc5645fbfd6fee9d92fb',
        'mirage-2000c':'4b7533d7fd2873df0161459a81e1719e8b66416dac64801b77b2f261000e5feb',
        'su-34':'ff87075cd5dae7b5fadb76879ba4d2478d5f504464174b82bedec3c009e3dd54',
    }.items():assert g.sha((HERE/'supplied-fighters/rigs'/(slug+'.json')).read_bytes())==expected,slug
    pose_count=clearance_count=surface_clearance_count=0
    for kind,(slug,expected,tri,size) in f.SOURCES.items():
        source=(f.WINGS/'models/supplied'/ (slug+'.glb')).read_bytes()
        raw,rb=g.unpack_glb(source)
        entry=descriptor['models'][kind]
        payload=(f.WINGS/entry['file']).read_bytes()
        d,b=g.unpack_glb(payload)
        assert len(source)==size and g.sha(source)==expected==entry['source_sha256']
        assert len(payload)<512_000 and g.sha(payload)==entry['sha256']
        assert len(d['buffers'])==1 and len(d['images'])==1
        assert all('uri' not in resource for resource in d['buffers']+d['images'])
        assert d['images']==raw['images'] and d['textures']==raw['textures'] and d['samplers']==raw['samplers']
        png=image(d,b,0)
        check_png(png)
        assert png==image(raw,rb,0) and struct.unpack_from('>II',png,16)==(256,256)
        assert g.sha(png)=='27ffab1da309304f5097c3d54796dadb7f765aa43a40c339316b03939dac89ff'
        for i,m in enumerate(raw['materials']):
            actual=copy.deepcopy(d['materials'][i])
            if i==4:
                assert actual.pop('alphaMode')=='BLEND'
                assert actual['pbrMetallicRoughness']['metallicFactor']==0
                assert actual['pbrMetallicRoughness']['baseColorFactor'][3]==.26
                actual['pbrMetallicRoughness']=copy.deepcopy(m['pbrMetallicRoughness'])
            assert actual==m
        # Independently verify every ORIGINAL accessor, including exact UV and reversed winding.
        for i,m in enumerate(raw['meshes']):
            assert d['meshes'][i]==m
            for pr in m['primitives']:
                for name,ai in pr['attributes'].items():
                    before=g.accessor(raw,rb,ai);after=g.accessor(d,b,ai)
                    assert len(before)==len(after)
                    if name in ('POSITION','NORMAL'):target=[g.reflect(v) for v in before]
                    elif name=='TANGENT':target=[g.reflect(v[:3])+[-v[3]] for v in before]
                    else:target=before
                    for a,c in zip(after,target):close(a,c,1e-7)
                before=g.accessor(raw,rb,pr['indices']);after=g.accessor(d,b,pr['indices'])
                for j in range(0,len(before),3):assert after[j:j+3]==[before[j],before[j+2],before[j+1]]
        oldms,newms=g.world_matrices(raw),g.world_matrices(d)
        for i,n in enumerate(raw['nodes']):
            assert d['nodes'][i].get('scale',[1,1,1])==n.get('scale',[1,1,1])==[1,1,1]
            close(g.point(newms[i],[0,0,0]),g.reflect(g.point(oldms[i],[0,0,0])))
            if 'mesh' in n:
                for p,q in zip(g.node_points(raw,rb,n),g.node_points(d,b,d['nodes'][i])):
                    close(g.point(newms[i],q),g.reflect(g.point(oldms[i],p)))
        names={n['name']:i for i,n in enumerate(d['nodes'])}
        assert len(names)==len(d['nodes'])
        root=names['vehicle_root'];assert g.node_matrix(d['nodes'][root])==g.node_matrix({})
        assert d['scenes'][d.get('scene',0)]['nodes']==[root]
        reachable=set()
        def visit(i):
            assert i not in reachable
            reachable.add(i)
            for child in d['nodes'][i].get('children',[]):visit(child)
        visit(root);assert len(reachable)==len(d['nodes'])
        points=f.world_points(d,b);bb=g.bounds(points)
        for key in ['min','max']:close(bb[key],entry['bounds'][key])
        dims=[bb['max'][j]-bb['min'][j] for j in range(3)]
        if kind=='su35s':
            assert 14<dims[0]<16 and 4<dims[1]<5 and 21<dims[2]<23
        elif kind=='gripen':
            assert 8<dims[0]<9 and 4<dims[1]<5 and 14<dims[2]<16
        elif kind=='mig31':
            assert 13<dims[0]<14 and 5<dims[1]<6 and 22<dims[2]<24
        elif kind=='su34':
            assert 14<dims[0]<16 and 4<dims[1]<5 and 23<dims[2]<25
        elif kind=='fa50':
            assert 9<dims[0]<10 and 3<dims[1]<5 and 13<dims[2]<14
        elif kind=='yak130':
            assert 9<dims[0]<10 and 3<dims[1]<5 and 11<dims[2]<12
        elif kind=='hawkt2':
            assert 9<dims[0]<10 and 3<dims[1]<4 and 12<dims[2]<13
        elif kind=='su25sm':
            assert 14<dims[0]<15 and 3<dims[1]<5 and 15<dims[2]<16
            assert not any(n.startswith(('elevon','flaperon','tailplane')) for n in names)
        elif kind=='f35a':
            assert 10<dims[0]<11 and 3<dims[1]<4 and 15<dims[2]<16
            assert not any(any(tag in n.lower() for tag in ('bay','liftfan','lift_fan','gear','nozzle_pivot')) for n in names)
            assert 'gun_barrel' not in entry['native_pivots'] and 'gun_muzzle' not in entry['native_pivots']
            assert g.sha(source) != f.BASELINES['f35.glb']
        elif kind=='j20':
            assert 13<dims[0]<14 and 3<dims[1]<5 and 20<dims[2]<21
            assert not any(any(tag in n.lower() for tag in ('rudder','bay','gear','nozzle_pivot')) for n in names)
            assert 'gun_barrel' not in entry['native_pivots'] and 'gun_muzzle' not in entry['native_pivots']
        elif kind=='a10c':
            assert 17<dims[0]<18 and 4<dims[1]<4.1 and 16<dims[2]<17
            assert not any(n.startswith(('elevon','flaperon','tailplane','gau8','gun_spin')) for n in names)
            assert 'gun_barrel' not in entry['native_pivots'] and 'gun_muzzle' not in entry['native_pivots']
        else:
            assert 9<dims[0]<12 and 3<dims[1]<5 and 14<dims[2]<18
        source_bounds=g.bounds([g.reflect(p) for p in f.world_points(raw,rb)])
        for key in ['min','max']:close(source_bounds[key],record['models'][kind]['body_bounds'][key])
        total=0
        for mi,m in enumerate(d['meshes']):
            for pr in m['primitives']:
                ps=g.accessor(d,b,pr['attributes']['POSITION']);ns=g.accessor(d,b,pr['attributes']['NORMAL'])
                assert len(ps)==len(ns)
                assert all(math.isfinite(v) for p in ps+ns for v in p)
                assert all(abs(sum(v*v for v in n)-1)<2e-5 for n in ns)
                ids=[v[0] for v in g.accessor(d,b,pr['indices'])]
                assert len(ids)%3==0 and max(ids)<len(ps);total+=len(ids)//3
                if mi>=len(raw['meshes']):
                    for j in range(0,len(ids),3):
                        a,c,e=[ps[k] for k in ids[j:j+3]]
                        normal=f.cross([c[k]-a[k] for k in range(3)],[e[k]-a[k] for k in range(3)])
                        assert sum(normal[k]*ns[ids[j]][k] for k in range(3))>1e-9
        assert total==record['models'][kind]['triangles'] and record['models'][kind]['original_triangles']==tri
        # Arcade signed controls: geometry at source rest pivot; test both signed limits and return.
        rig=json.loads((HERE/'supplied-fighters/rigs'/(slug+'.json')).read_text())
        rigmap={c['node']:c for c in rig['controls']}
        if kind=='j20':
            for fin in ('vertical_stabilizer_1','vertical_stabilizer_2'):
                damaged=copy.deepcopy(rig)
                next(c for c in damaged['controls'] if c['node']==fin)['suggested_local_rotation_axis']=[1,0,0]
                try:f.derive(source,slug,damaged)
                except AssertionError as error:assert str(error)==fin
                else:raise AssertionError('non-Y vertical stabilizer axis accepted: '+fin)
        assert {c['node'] for c in entry['controls']}=={n for ns in expected_controls[kind].values() for n in ns}
        assert 'canopy' not in entry['native_pivots']
        assert len(entry['controls'])==len({c['node'] for c in entry['controls']})
        if kind=='mirage2000':
            assert not any(n.startswith(('tailplane','canard')) for n in names)
        elif kind=='su34':
            assert {c['node'] for c in entry['controls'] if c['driver']=='pitch'}=={'canard_L','canard_R','tailplane_L','tailplane_R'}
        for control in entry['controls']:
            ni=names[control['node']];n=d['nodes'][ni]
            assert 'mesh' in n and control['axis'] in ['x','y'] and control['driver'] in ['roll','pitch','yaw']
            close(n['translation'],g.reflect(rigmap[n['name']]['pivot_world_m']))
            driver=next(k for k,ns in expected_controls[kind].items() if n['name'] in ns)
            if kind in ('gripen','mig31','mirage2000','su34','fa50','yak130','hawkt2'):
                region=g.bounds(vertices(d,b,n['name']))
                if n['name'].endswith('_L'):assert region['max'][0]<0
                if n['name'].endswith('_R'):assert region['min'][0]>0
                if n['name'].startswith('canard'):assert region['max'][2]<-1
                elif n['name'].startswith('elevon'):assert region['min'][2]>(1.9 if kind=='hawkt2' else (2 if kind in ('fa50','yak130') else 3))
                elif n['name'].startswith(('tailplane','rudder')):assert region['min'][2]>(3 if kind in ('fa50','yak130','hawkt2') else 4)
            if kind=='su25sm':
                region=g.bounds(vertices(d,b,n['name']))
                if n['name'].endswith('_L'):assert region['max'][0]<0
                if n['name'].endswith('_R'):assert region['min'][0]>0
                if driver=='roll':assert region['min'][2]>1 and abs(n['translation'][0])==2.25
                elif driver=='pitch':assert region['min'][2]>4 and n['translation'][2]>5.6
                else:assert region['min'][2]>6 and n['translation'][0]==0
            if kind=='a10c':
                region=g.bounds(vertices(d,b,n['name']))
                if n['name'].endswith('_L'):assert region['max'][0]<0
                if n['name'].endswith('_R'):assert region['min'][0]>0
                if driver=='roll':assert region['min'][2]>.9 and abs(n['translation'][0])>7.8
                elif driver=='pitch':assert region['min'][2]>5.6 and n['translation'][2]>6.7
                else:assert region['min'][2]>6.8 and abs(n['translation'][0])>2.7
            if kind=='f35a':
                region=g.bounds(vertices(d,b,n['name']))
                if n['name'].endswith('_L') or n['name']=='rudder_1':assert region['max'][0]<0
                else:assert region['min'][0]>0
                if driver=='roll':assert region['min'][2]>2.7 and abs(n['translation'][0])>2.1
                elif driver=='pitch':assert region['min'][2]>4.1 and n['translation'][2]>5.8
                else:
                    assert region['min'][2]>6.2 and n['translation'][2]>6.5
                    # Actual canted fin/rudder geometry widens outboard above its root.
                    ps=vertices(d,b,n['name'])
                    low=[abs(p[0]) for p in ps if p[1]<.5]
                    high=[abs(p[0]) for p in ps if p[1]>2.6]
                    assert min(high)>max(low)+.7
            if kind=='j20':
                region=g.bounds(vertices(d,b,n['name']))
                if n['name'].endswith('_L') or n['name']=='vertical_stabilizer_1':assert region['max'][0]<0
                else:assert region['min'][0]>0
                if driver=='roll':
                    assert 5.27<region['min'][2]<5.28 and n['translation'][2]>6.5
                    assert 7.18<region['max'][2]<7.19
                elif driver=='pitch':assert region['max'][2]<-1 and n['translation'][2]<-3
                else:
                    assert 4.69<region['min'][2]<4.71 and n['translation'][2]>6.8
                    assert region['max'][2]==9
                    assert rigmap[n['name']]['suggested_local_rotation_axis']==[0,1,0]
                    assert n['extras']['control_axis_gltf']==[0,-1,0]
            assert control['driver']==driver
            assert control['axis']==('y' if driver=='yaw' else 'x')
            assert control['gain']==(1 if driver=='roll' and n['name'].endswith('_R') else -1)
            assert control['max_rad']==(.28 if driver=='yaw' else .22)
            if kind=='mirage2000' and driver=='roll':assert control['pitch_gain']==-1
            else:assert 'pitch_gain' not in control
            ax=rigmap[n['name']]['suggested_local_rotation_axis']
            close(n['extras']['control_axis_gltf'],[-ax[0],-ax[1],ax[2]])
            local=g.node_points(d,b,n)
            axis='xyz'.index(control['axis'])
            # Exact continuous full-angle envelope: each coordinate is A*cos(t)+B*sin(t)+translation.
            envelope=[[],[],[]]
            for p in local:
                for coord in range(3):
                    candidates=[-control['max_rad'],control['max_rad']]
                    if axis==0: a,beta=(p[1],-p[2]) if coord==1 else ((p[2],p[1]) if coord==2 else (p[0],0))
                    else: a,beta=(p[0],p[2]) if coord==0 else ((p[2],-p[0]) if coord==2 else (p[1],0))
                    if coord==axis:
                        envelope[coord].append(p[coord]+n['translation'][coord]);continue
                    for k in range(-2,3):
                        t=math.atan2(beta,a)+k*math.pi
                        if abs(t)<=control['max_rad']:candidates.append(t)
                    envelope[coord].extend(a*math.cos(t)+beta*math.sin(t)+n['translation'][coord] for t in candidates)
            original=copy.deepcopy(n)
            for value in [-1,-.75,-.5,-.25,0,.25,.5,.75,1,0]:
                angle=value*control['gain']*control['max_rad']
                q=[0.,0.,0.,math.cos(angle/2)];q[axis]=math.sin(angle/2);n['rotation']=q
                posed=vertices(d,b,n['name'])
                assert all(math.isfinite(v) for p in posed for v in p)
                for p in posed:
                    for j in range(3):assert min(envelope[j])-1e-6<=p[j]<=max(envelope[j])+1e-6
                for p,q in zip(local,posed):
                    # Independent signed Rodrigues rotation, not just a radius/envelope test.
                    axis_vector=[1 if j==axis else 0 for j in range(3)]
                    tangent=f.cross(axis_vector,p)
                    target=[p[j]*math.cos(angle)+tangent[j]*math.sin(angle)+axis_vector[j]*p[axis]*(1-math.cos(angle))+n['translation'][j] for j in range(3)]
                    close(q,target)
                    assert abs(sum(x*x for x in p)-sum((q[j]-n['translation'][j])**2 for j in range(3)))<1e-4
                if value==0:
                    for p,q in zip(local,posed):close(q,[p[j]+n['translation'][j] for j in range(3)])
                pose_count+=1
            n.clear();n.update(original)
        # Resolve anchors through actual hierarchy; sample launch bore and store radius ahead of face.
        ms=g.world_matrices(d)
        def origin(name):return g.point(ms[names[name]],[0,0,0])
        close(origin('gun_muzzle'),entry['hardpoints']['gun'])
        gunps=vertices(d,b,'gun_barrel')
        front=min(p[2] for p in gunps)
        ring=sorted(set(tuple(p) for p in gunps if abs(p[2]-front)<1e-6))
        close([sum(p[j] for p in ring)/len(ring) for j in range(3)],entry['hardpoints']['gun'])
        close(origin('cockpit_eye'),entry['cockpit'])
        cp=entry['cockpit'];canopy=d['nodes'][names['canopy']]
        cs=list(f.triangles(d,b,canopy));floor,roof=f.surface_y(cs,cp[0],cp[2]-canopy['translation'][2])
        bodytris=list(f.triangles(d,b,d['nodes'][names['airframe_static']]))
        assert f.surface_y(bodytris,cp[0],cp[2])[1]<cp[1]<roof+canopy['translation'][1]
        clear_origins=[(entry['hardpoints']['gun'],[0,0,-1],.04)]
        for seat,number in [(0,2),(1,1)]:
            for side_index,side in enumerate(['L','R']):
                name='missile_'+side+str(number)
                ps=vertices(d,b,name);tip=entry['hardpoints']['missiles'][seat][side_index]
                close(origin(name+'_launch'),tip)
                assert abs(tip[2]-min(p[2] for p in ps))<1e-6
                assert (tip[0]<0)==(side=='L') and 'mesh' in d['nodes'][names[name]]
                station=next(s for s in record['models'][kind]['stations'] if s['node']==name)
                assert station['seat']==seat and station['slot']==(1 if seat==0 else 0)
                assert station['weapon']==expected_fits[kind][seat] and station['launch_node']==name+'_launch'
                # Assert the actual store fit, not just its metadata weapon label.
                radius,length=(.16,2.25) if station['weapon']=='maverick' else (.10,2.7)
                store_bounds=g.bounds(ps)
                close([store_bounds['max'][j]-store_bounds['min'][j] for j in range(3)],
                      [2*(radius+.23),2*(radius+.23),length])
                attachment=station['attachment']
                assert abs(f.surface_y(bodytris,attachment[0],attachment[2])[0]-attachment[1])<1e-6
                pylon=g.bounds(vertices(d,b,'pylon_'+side+str(number)))
                assert pylon['min'][1]<attachment[1]<pylon['max'][1]
                clear_origins.append((tip,[0,0,-1],.16 if kind in ('f16c','su35s','rafale','jf17','gripen','su34','yak130','hawkt2','su25sm','a10c','j20') and seat==1 else .10))
        static=d['nodes'][names['airframe_static']]
        alloy=[pr for pr in d['meshes'][static['mesh']]['primitives'] if pr['material']==3]
        temp=copy.copy(d);temp['meshes']=[{'primitives':alloy}]
        outlets=sorted(g.component_bounds(temp,b,{'mesh':0}),key=lambda bb:bb['min'][0])
        if kind=='a10c':
            assert len(outlets)==28
            front=[bb for bb in outlets if bb['max'][2]<2]
            outlets=[bb for bb in outlets if bb['min'][2]>4.8]
            assert len(front)==26 and len(outlets)==2
            for bb in outlets:
                assert .7<bb['min'][1]<.72 and 1.88<bb['max'][1]<1.90
                close([bb['max'][j]-bb['min'][j] for j in (0,1)],[1.18,1.18])
        assert len(entry['exhausts'])==len(outlets)==(1 if kind in ('f16c','jf17','gripen','mirage2000','fa50','hawkt2','f35a') else 2)
        assert ('afterburning' in entry)==(kind in ('yak130','hawkt2','su25sm','a10c','f35a','j20'))
        if kind in ('yak130','hawkt2','su25sm','a10c','f35a','j20'):
            assert entry['afterburning'] is False
            assert [e['node'] for e in entry['exhausts']]==(['exhaust_core'] if kind in ('hawkt2','f35a') else ['exhaust_core_L','exhaust_core_R'])
            assert [e['anchor'] for e in entry['exhausts']]==(['exhaust'] if kind in ('hawkt2','f35a') else ['exhaust_L','exhaust_R'])
            assert not any('afterburner' in n or 'flame' in n for n in names)
            assert not any('afterburner' in m['name'] or 'flame' in m['name'] for m in d['materials'])
            # Existing converter classifies exhaust_* as static glow, not AB/flame.
            # No serialized throttle/boost/stretch/cone driver is introduced.
            assert set(entry)=={'source_model_id','source_sha256','file','sha256','bounds','hardpoints','cockpit','exhausts','controls','native_pivots','afterburning'}
            core=d['materials'][-1]
            assert core['name']=='arcade_exhaust_core'
            close(core['emissiveFactor'],[.12,.045,.012])
            assert max(core['emissiveFactor'])*.35<.05
            for e in entry['exhausts']:
                assert set(e)=={'node','anchor','position'}
                assert set(d['nodes'][names[e['node']]])=={'name','mesh','translation','extras','children'}
                assert d['nodes'][names[e['node']]]['children']==[names[e['anchor']]]
        for index,e in enumerate(entry['exhausts']):
            close(origin(e['anchor']),e['position'])
            # Local +Z is actual rearward direction, including arbitrary world yaw.
            frame=ms[names[e['node']]]
            close([g.point(frame,[0,0,1])[j]-g.point(frame,[0,0,0])[j] for j in range(3)],[0,0,1])
            ps=vertices(d,b,e['node']);bb=g.bounds(ps)
            close(e['position'],[(bb['min'][0]+bb['max'][0])/2,(bb['min'][1]+bb['max'][1])/2,bb['min'][2]])
            assert bb['max'][2]-bb['min'][2]<.013
            outlet=outlets[index]
            assert outlet==record['models'][kind]['outlet_component_bounds'][index]
            close(e['position'],[(outlet['min'][0]+outlet['max'][0])/2,(outlet['min'][1]+outlet['max'][1])/2,outlet['max'][2]+.008])
            assert all(outlet['min'][j]<bb['min'][j]<bb['max'][j]<outlet['max'][j] for j in [0,1])
            clear_origins.append((e['position'],[0,0,1],.2))
        for o,direction,radius in clear_origins:
            for step in range(8):
                angle=step*math.tau/8
                start=[o[0]+radius*math.cos(angle),o[1]+radius*math.sin(angle),o[2]+direction[2]*.002]
                assert all(ray_hit(start,direction,t) is None for t in bodytris),(kind,o,start)
                clearance_count+=1
        # Static-only clearance misses forward canards. Include every ORIGINAL mesh and
        # each real control at signed/rest poses, never replacing the existing static test.
        source_indices=[i for i,n in enumerate(raw['nodes']) if 'mesh' in n]
        resttris=world_triangles(d,b,source_indices)
        posed_surfaces=[resttris]
        for control in entry['controls']:
            ni=names[control['node']];node=d['nodes'][ni];original=copy.deepcopy(node)
            axis='xyz'.index(control['axis'])
            for value in [-1,-.5,.5,1]:
                angle=value*control['gain']*control['max_rad']
                q=[0.,0.,0.,math.cos(angle/2)];q[axis]=math.sin(angle/2);node['rotation']=q
                posed_surfaces.append(world_triangles(d,b,[ni]))
            node.clear();node.update(original)
        if kind=='mirage2000':
            # Actual serialized elevons: independent pure pitch/roll, saturated sum,
            # and return to exact source-rest geometry, without duplicate pivots.
            elevons=[c for c in entry['controls'] if c['driver']=='roll']
            assert [c['node'] for c in elevons]==['elevon_L','elevon_R']
            for roll,pitch in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(-1,1),(1,-1),(-1,-1),(.8,.7),(0,0)]:
                angles=[];saved={}
                for c in elevons:
                    node=d['nodes'][names[c['node']]];saved[c['node']]=copy.deepcopy(node)
                    mixed=roll*c['gain']+pitch*c['pitch_gain']
                    angle=max(-1,min(1,mixed))*c['max_rad'];angles.append(angle)
                    node['rotation']=[math.sin(angle/2),0,0,math.cos(angle/2)]
                    local=g.node_points(d,b,node);posed=vertices(d,b,c['node'])
                    for p,q in zip(local,posed):
                        close(q,[p[0]+node['translation'][0],
                                 p[1]*math.cos(angle)-p[2]*math.sin(angle)+node['translation'][1],
                                 p[1]*math.sin(angle)+p[2]*math.cos(angle)+node['translation'][2]])
                    assert abs(angle)<=c['max_rad']
                    pose_count+=1
                if roll==0:assert angles[0]==angles[1]
                if pitch==0:assert angles[0]==-angles[1]
                if abs(roll)==abs(pitch)==1:assert sorted(map(abs,angles))==[0,.22]
                posed_surfaces.append(world_triangles(d,b,[names[c['node']] for c in elevons]))
                for c in elevons:
                    node=d['nodes'][names[c['node']]];node.clear();node.update(saved[c['node']])
            print('PASS Mirage mix: pure pitch symmetric, pure roll antisymmetric, summed clamp and source-rest geometry; no fabricated pitch surface')
        if kind in ('hawkt2','su25sm','a10c','f35a','j20'):
            # Pure native input contracts: non-driven surfaces stay at exact source rest.
            for roll,pitch,yaw in [(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1),(0,0,0)]:
                rates={'roll':roll,'pitch':pitch,'yaw':yaw};angles={};saved={}
                for c in entry['controls']:
                    node=d['nodes'][names[c['node']]];saved[c['node']]=copy.deepcopy(node)
                    angle=rates[c['driver']]*c['gain']*c['max_rad'];angles[c['node']]=angle
                    axis='xyz'.index(c['axis']);q=[0.,0.,0.,math.cos(angle/2)];q[axis]=math.sin(angle/2)
                    node['rotation']=q
                    for p,actual in zip(g.node_points(d,b,node),vertices(d,b,c['node'])):
                        if axis==0:rotated=[p[0],p[1]*math.cos(angle)-p[2]*math.sin(angle),p[1]*math.sin(angle)+p[2]*math.cos(angle)]
                        else:rotated=[p[0]*math.cos(angle)+p[2]*math.sin(angle),p[1],-p[0]*math.sin(angle)+p[2]*math.cos(angle)]
                        close(actual,[rotated[j]+node['translation'][j] for j in range(3)])
                        if rates[c['driver']]==0:close(actual,[p[j]+node['translation'][j] for j in range(3)])
                    pose_count+=1
                roll_node,pitch_node,rudder_node=('elevon','canard','vertical_stabilizer_1') if kind=='j20' else ('aileron','elevator','rudder_L') if kind=='a10c' else (('aileron','elevator','rudder_center') if kind=='su25sm' else (('flaperon','tailplane','rudder_1') if kind=='f35a' else ('elevon','tailplane','rudder_1')))
                assert angles[roll_node+'_L']==-angles[roll_node+'_R']==-roll*.22
                assert angles[pitch_node+'_L']==angles[pitch_node+'_R']==-pitch*.22
                assert angles[rudder_node]==-yaw*.28
                if kind=='a10c':assert angles['rudder_L']==angles['rudder_R']==-yaw*.28
                if kind=='f35a':assert angles['rudder_1']==angles['rudder_2']==-yaw*.28
                if kind=='j20':assert angles['vertical_stabilizer_1']==angles['vertical_stabilizer_2']==-yaw*.28
                posed_surfaces.append(world_triangles(d,b,[names[c['node']] for c in entry['controls']]))
                for name,original in saved.items():
                    node=d['nodes'][names[name]];node.clear();node.update(original)
            print(f'PASS {kind} pure inputs: signed {roll_node} roll differential, {pitch_node} pitch symmetric, {rudder_node} yaw; inactive surfaces and return match source rest')
        for o,direction,radius in clear_origins:
            for step in range(8):
                angle=step*math.tau/8
                start=[o[0]+radius*math.cos(angle),o[1]+radius*math.sin(angle),o[2]+direction[2]*.002]
                for surfaces in posed_surfaces:
                    assert all(ray_hit(start,direction,t) is None for t in surfaces),(kind,'posed source surface',o,start)
                    surface_clearance_count+=1
        # Independent arbitrary aircraft-world transform confirms composed origins stay finite and rigid.
        world=g.node_matrix({'translation':[31,102,-27],'rotation':[0,math.sin(.43),0,math.cos(.43)]})
        for name in ['gun_muzzle','cockpit_eye']+[s['launch_node'] for s in record['models'][kind]['stations']]+[e['anchor'] for e in entry['exhausts']]:
            close(g.point(g.multiply(world,ms[names[name]]),[0,0,0]),g.point(world,origin(name)))
        assert set(entry['native_pivots'])=={c['node'] for c in entry['controls']}|{'missile_'+s+str(i) for s in ['L','R'] for i in [1,2]}|{e['node'] for e in entry['exhausts']}
        print(f'PASS {kind}: {tri} original / {total} total triangles; {len(payload)} B; measured XYZ {dims}; {len(entry["controls"])} controls / {len(entry["exhausts"])} nozzles; original UV/image/material identities and reflected rig preserved')
    for name,expected in f.RETAINED_BASELINES.items():assert g.sha((f.WINGS/'models'/name).read_bytes())==expected,name
    print(f'PASS rig: {pose_count} signed/rest poses with continuous vertex envelopes; {clearance_count} geometry-clear launch/exhaust rays; composed gun/store/exhaust/cockpit world origins')
    print(f'PASS source surfaces: {surface_clearance_count} rest/signed-control launch/exhaust rays, including actual Typhoon/Rafale/Gripen canards')
    # Inject bad generator output without touching disk: every retained GLB must
    # fail before the writer attempts even its first write.
    for name in f.RETAINED_BASELINES:
        relative='models/'+name
        with patch.object(f,'generate',return_value={relative:b'bad generator output'}), \
             patch('sys.argv',['repair-fighter-pair.py','--archive',str(args.archive)]), \
             patch.object(Path,'write_bytes',side_effect=AssertionError('unexpected write')) as write, \
             patch.object(Path,'mkdir') as mkdir:
            try:f.main()
            except AssertionError as error:
                assert str(error)=='refusing to overwrite retained GLB: '+relative,str(error)
            else:raise AssertionError('retained GLB replacement accepted: '+relative)
            write.assert_not_called();mkdir.assert_not_called()
    metadata_negatives=0
    for name in ('authoring/native-fighter-pair.json','authoring/supplied-fighters/repair-record.json'):
        for kind in f.SOURCES.keys()-{'j20'}:
            damaged=json.loads(outputs[name]);damaged['models'][kind]['corrupt']=True
            with patch.object(f,'generate',return_value={name:f.encoded(damaged)}), \
                 patch('sys.argv',['repair-fighter-pair.py','--archive',str(args.archive)]), \
                 patch.object(Path,'write_bytes') as write, patch.object(Path,'mkdir') as mkdir:
                try:f.main()
                except AssertionError as error:
                    assert str(error)=='refusing to overwrite retained entry: '+name+':'+kind,str(error)
                else:raise AssertionError('retained entry replacement accepted')
                write.assert_not_called();mkdir.assert_not_called()
            metadata_negatives+=1
    for metadata in f.METADATA[:-1]:
        name='authoring/supplied-fighters/'+metadata
        with patch.object(f,'generate',return_value={name:b'corrupt metadata'}), \
             patch('sys.argv',['repair-fighter-pair.py','--archive',str(args.archive)]), \
             patch.object(Path,'write_bytes') as write, patch.object(Path,'mkdir') as mkdir:
            try:f.main()
            except AssertionError as error:
                assert str(error)=='refusing to overwrite retained metadata: '+name,str(error)
            else:raise AssertionError('retained metadata replacement accepted')
            write.assert_not_called();mkdir.assert_not_called()
        metadata_negatives+=1
    print(f'PASS writer: {len(f.RETAINED_BASELINES)} bad-generation GLBs and {metadata_negatives} corrupt historical entries/metadata refused before any mkdir/write')
    # Compare the complete old asset set and immutable evidence to the agreed source pin.
    repo=HERE.parents[2]
    pin='87c4ed04'
    old_generator=ast.parse(subprocess.check_output(['git','show',pin+':Games/Wings/authoring/repair-fighter-pair.py'],cwd=repo,text=True))
    old_baselines=next(n.value for n in old_generator.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='BASELINES' for t in n.targets))
    assert f.BASELINES==ast.literal_eval(old_baselines), 'legacy BASELINES ABI changed'
    frozen=0
    old_glbs=0
    paths=subprocess.check_output(['git','ls-tree','-r','--name-only',pin,'--',
        'Games/Wings/models','Games/Wings/authoring/supplied-fighters','docs/wings-local-native'],cwd=repo,text=True).splitlines()
    for path in paths:
        if path.startswith('Games/Wings/models/'):
            if not path.endswith('.glb'):continue
            old_glbs+=1
            assert path.removeprefix('Games/Wings/models/') in f.RETAINED_BASELINES,path
        elif path.endswith(('supplied-fighters/README.md','supplied-fighters/repair-record.json')):continue
        expected=subprocess.check_output(['git','show',pin+':'+path],cwd=repo)
        assert (repo/path).read_bytes()==expected,path
        frozen+=1
    assert old_glbs==len(f.RETAINED_BASELINES)==54
    receipts=[p for p in paths if p.endswith('-coalition-flight.json')]
    assert len(receipts)==13,receipts
    old_record=json.loads(subprocess.check_output(['git','show',pin+':Games/Wings/authoring/supplied-fighters/repair-record.json'],cwd=repo))
    for kind,old in old_record['models'].items():assert record['models'][kind]==old,kind
    print(f'PASS immutable: {frozen} historical GLB/metadata/rig/evidence files exact against {pin}; sixteen old model repair records and thirteen flight receipts exact')
    assert {k for k,v in descriptor['models'].items() if v.get('afterburning') is False}=={'yak130','hawkt2','su25sm','a10c','f35a','j20'}
    print('PASS Hawk: five real controls, four measured arcade stores, one measured static exhaust_core/exhaust; afterburning:false, no flame/cone/boost drivers')
    print('PASS Su25SM: five real aileron/elevator/central-rudder controls, four measured arcade stores, two measured static exhaust_core_L/R and exhaust_L/R; afterburning:false, no flame/cone/boost drivers')
    print('PASS A10C: six real aileron/elevator/twin-rudder controls, four measured arcade stores, two raised measured static exhaust_core_L/R and exhaust_L/R; afterburning:false; generic gun muzzle, no fabricated rotary rig')
    print('PASS F35A: six actual flaperon/tailplane/twin-rudder controls, four external arcade aim9/TV stores, one measured static exhaust_core/exhaust; afterburning:false is VISUAL opt-out only, not real engine certification; no new flame or nozzle mechanics')
    print('PASS J20: six actual elevon/canard/vertical_stabilizer controls, four external arcade TV/Maverick stores, two measured static cores; VISUAL afterburning:false only, no real gun/bay/engine capability claim')
    print('PASS boundaries: all 54 preexisting GLBs unchanged, all sixteen historical descriptors exact, seventeen derivatives <512KB each, reproducible outputs; native rendering/gameplay UNVERIFIED')


if __name__=='__main__':main()

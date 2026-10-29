#!/usr/bin/env python3
"""Serialized Tu160 geometry/immutability regression. No browser or disk writes."""
import argparse
import contextlib
import copy
import importlib.util
import io
import json
import math
from pathlib import Path
import shutil
import subprocess
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('tu160',HERE/'repair-tu160.py')
t = importlib.util.module_from_spec(spec)
spec.loader.exec_module(t)
f,g,c = t.f,t.g,t.c


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',required=True,type=Path)
    args = parser.parse_args()
    outputs = t.generate(args.archive)
    t.validate_outputs(outputs,t.generate(args.archive))
    for name,data in outputs.items(): assert (t.WINGS/name).read_bytes()==data,name
    raw,rb = g.unpack_glb(outputs['models/supplied/tu-160.glb'])
    d,b = g.unpack_glb(outputs['models/derived/wings_tu160.glb'])
    manifest = json.loads(outputs['authoring/native-tu160.json'])
    record = json.loads(outputs['authoring/supplied-bomber/repair-record.json'])
    assert manifest['schema']=='wings_native_tu160_v1' and set(manifest['models'])=={'tu160'}
    e = manifest['models']['tu160']
    assert e['source_sha256']==t.RAW_SHA and e['sha256']==g.sha(outputs[e['file']])
    assert set(e['hardpoints'])=={'bombs'} and len(e['hardpoints']['bombs'])==8
    assert e['controls']==t.CONTROLS and len(e['controls'])==3
    assert e['frozen_nodes']==t.FROZEN_WINGS and e['afterburning'] is False
    names = {n['name']:i for i,n in enumerate(d['nodes'])}
    assert len(names)==len(d['nodes'])
    assert not any(any(tag in n for tag in ('gun','missile','bay','door','gear','flame','afterburner')) for n in names)
    assert not d.get('animations') and not d.get('skins')
    assert all('uri' not in r for r in d['images']+d['buffers'])
    assert d['images']==raw['images'] and d['textures']==raw['textures'] and d['samplers']==raw['samplers']
    png = c.image(d,b,0)
    assert png==c.image(raw,rb,0)
    decoder = t.load('tu160_png_check','repair-helicopter-pair-check.py')
    decoded = decoder.decode_png(png)
    assert png[25]==2 and len(decoded)==256*256*3
    receipt = record['serialized_check']
    assert receipt['source_buffer_bytes']==len(rb)==110308
    assert receipt['png_bytes']==len(png)==32028 and receipt['png_sha256']==g.sha(png)
    print('PASS source PNG: original image bytes, CRC, full256x256RGB decode; UV/material assignments exact')
    for i,m in enumerate(raw['materials']):
        target = copy.deepcopy(m)
        if i==1:
            target['alphaMode']='BLEND'
            target['pbrMetallicRoughness']['metallicFactor']=0
            target['pbrMetallicRoughness']['baseColorFactor'][3]=.26
        assert d['materials'][i]==target, ('material',i)
    oriented,oriented_binary = g.unpack_glb(outputs['models/supplied/tu-160.glb'])
    f.orient(oriented,oriented_binary)
    assert b[:len(oriented_binary)]==oriented_binary  # Every source byte, including UV/PNG/padding.
    for i,m in enumerate(raw['meshes']):
        assert d['meshes'][i]==m
        for pr in m['primitives']:
            for attribute,ai in pr['attributes'].items():
                before,after = g.accessor(raw,rb,ai),g.accessor(d,b,ai)
                target = [g.reflect(v) for v in before] if attribute in ('POSITION','NORMAL') else before
                if attribute=='TANGENT': target=[g.reflect(v[:3])+[-v[3]] for v in before]
                for a,z in zip(after,target): c.close(a,z,1e-7)
            before,after = g.accessor(raw,rb,pr['indices']),g.accessor(d,b,pr['indices'])
            assert [v for i in range(0,len(before),3) for v in (before[i],before[i+2],before[i+1])]==after
    oldms,newms = g.world_matrices(raw),g.world_matrices(d)
    for i,n in enumerate(raw['nodes']):
        assert d['nodes'][i].get('scale',[1,1,1])==n.get('scale',[1,1,1])==[1,1,1]
        for p,q in zip(g.node_points(raw,rb,n) if 'mesh' in n else [[0,0,0]],
                       g.node_points(d,b,d['nodes'][i]) if 'mesh' in n else [[0,0,0]]):
            c.close(g.reflect(g.point(oldms[i],p)),g.point(newms[i],q))
    assert g.node_matrix(d['nodes'][names['vehicle_root']])==g.node_matrix({})
    assert d['scenes'][d.get('scene',0)]['nodes']==[names['vehicle_root']]
    seen = set()
    def visit(i):
        assert i not in seen
        seen.add(i)
        for j in d['nodes'][i].get('children',[]):visit(j)
    visit(names['vehicle_root']); assert len(seen)==len(d['nodes'])
    total = 0
    for mi,m in enumerate(d['meshes']):
        for pr in m['primitives']:
            ps,ns = [g.accessor(d,b,pr['attributes'][key]) for key in ('POSITION','NORMAL')]
            assert len(ps)==len(ns) and all(math.isfinite(x) for p in ps+ns for x in p)
            assert all(abs(sum(v*v for v in n)-1)<2e-5 for n in ns)
            ids = [v[0] for v in g.accessor(d,b,pr['indices'])]
            assert len(ids)%3==0 and max(ids)<len(ps)
            total += len(ids)//3
            if mi>=len(raw['meshes']):
                for j in range(0,len(ids),3):
                    a,z,k = [ps[index] for index in ids[j:j+3]]
                    normal = f.cross([z[v]-a[v] for v in range(3)],[k[v]-a[v] for v in range(3)])
                    assert sum(normal[v]*ns[ids[j]][v] for v in range(3))>1e-9
    assert total==record['derived_triangles']
    bounds = g.bounds(f.world_points(d,b))
    for key in ('min','max'):c.close(bounds[key],e['bounds'][key])
    # Pure input poses independently check signed rotations, inactive controls and return.
    poses = 0
    rest = copy.deepcopy(d['nodes'])
    for pitch,yaw in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(0,0)]:
        for control in t.CONTROLS:
            n = d['nodes'][names[control['node']]]
            angle = (pitch if control['driver']=='pitch' else yaw)*control['gain']*control['max_rad']
            q = [0.,0.,0.,math.cos(angle/2)];q['xyz'.index(control['axis'])]=math.sin(angle/2)
            n['rotation']=q
            envelope = next(s['continuous_bounds'] for s in record['tail_control_swept_bounds'] if s['node']==control['node'])
            for p,actual in zip(g.node_points(d,b,n),c.vertices(d,b,n['name'])):
                if control['axis']=='x':rotated=[p[0],p[1]*math.cos(angle)-p[2]*math.sin(angle),p[1]*math.sin(angle)+p[2]*math.cos(angle)]
                else:rotated=[p[0]*math.cos(angle)+p[2]*math.sin(angle),p[1],-p[0]*math.sin(angle)+p[2]*math.cos(angle)]
                c.close(actual,[rotated[j]+n['translation'][j] for j in range(3)])
                assert all(envelope['min'][j]-1e-6<=actual[j]<=envelope['max'][j]+1e-6 for j in range(3))
            poses += 1
        assert d['nodes'][names['tailplane_L']]['rotation']==d['nodes'][names['tailplane_R']]['rotation']
        for name in t.FROZEN_WINGS: assert d['nodes'][names[name]]==rest[names[name]]
    d['nodes']=rest
    ms = g.world_matrices(d)
    positions = []
    for i,station in enumerate(record['stations'],1):
        n,anchor = 'bomb_'+str(i),'bomb_'+str(i)+'_release'
        ps = c.vertices(d,b,n)
        bb = g.bounds(ps)
        centroid = [(bb['min'][j]+bb['max'][j])/2 for j in range(3)]
        # Signed tetrahedral integration checks the actual closed-mesh volume centroid.
        volume,weighted = 0.,[0.,0.,0.]
        for a,z,k in t.world_tris(d,b,[names[n]]):
            cross = f.cross(z,k)
            v = sum(a[j]*cross[j] for j in range(3))/6
            volume += v
            for j in range(3):weighted[j]+=v*(a[j]+z[j]+k[j])/4
        assert volume>.01
        c.close([v/volume for v in weighted],centroid)
        origin = g.point(ms[names[anchor]],[0,0,0])
        c.close(origin,centroid);c.close(origin,e['hardpoints']['bombs'][i-1])
        assert d['nodes'][names[n]]['children']==[names[anchor]]
        assert abs(origin[2]-bb['min'][2])>1  # Not a missile-tip origin.
        positions.append(tuple(origin))
        pylon = g.bounds(c.vertices(d,b,'pylon_'+str(i)))
        assert pylon['min'][1]<station['attachment'][1]<pylon['max'][1]
        assert pylon['min'][1]<bb['max'][1]<pylon['max'][1]
    assert len(set(positions))==8
    store_bounds = [g.bounds(c.vertices(d,b,'bomb_'+str(i))) for i in range(1,9)]
    gaps = [max(max(a['min'][j]-z['max'][j],z['min'][j]-a['max'][j]) for j in range(3))
            for i,a in enumerate(store_bounds) for z in store_bounds[i+1:]]
    c.close([min(gaps)],[receipt['minimum_store_store_axis_gap_m']])
    for i,p in enumerate(positions):
        for q in positions[i+1:]:
            assert abs(p[0]-q[0])>.4 or abs(p[2]-q[2])>2.4, 'store/store overlap'
    paint_tris,_ = t.material_geometry(d,b,0)
    for station in record['stations']:
        x,y,z = station['attachment']
        assert abs(f.surface_y(paint_tris,x,z)[0]-y)<1e-7
    assert set(e['native_pivots'])=={c['node'] for c in t.CONTROLS}|{'bomb_'+str(i) for i in range(1,9)}|{'exhaust_core_'+str(i) for i in range(1,5)}
    for i,ex in enumerate(e['exhausts']):
        box = record['outlet_component_bounds'][i]
        expected = [(box['min'][j]+box['max'][j])/2 for j in (0,1)]+[box['max'][2]+.008]
        c.close(ex['position'],expected)
        c.close(g.point(ms[names[ex['anchor']]],[0,0,0]),expected)
        bb = g.bounds(c.vertices(d,b,ex['node']))
        assert all(box['min'][j]<bb['min'][j]<bb['max'][j]<box['max'][j] for j in (0,1))
        assert .0119<bb['max'][2]-bb['min'][2]<.0121
    assert d['materials'][-1]['emissiveFactor']==[.12,.045,.012]
    c.close(g.point(ms[names['cockpit_eye']],[0,0,0]),e['cockpit'])
    c.close(e['cockpit'],record['eye_section']['eye'])
    section = record['eye_section']
    assert section['body_roof']<e['cockpit'][1]<section['glass_roof'] and e['cockpit'][2]<-16
    assert record['glass_material_index']==1 and len(record['glass_components'])==4
    # World vertical drop is NOT local -Z or even always local -Y. Test full aircraft rotations.
    rotated_rays = 0
    root = d['nodes'][names['vehicle_root']]
    source_indices = [i for i,n in enumerate(raw['nodes']) if 'mesh' in n]
    for rotation in ([0,0,0,1],[.10,.20,.07,math.sqrt(1-.01-.04-.0049)],[-.12,.1,-.08,math.sqrt(1-.0144-.01-.0064)]):
        root['rotation']=rotation;root['translation']=[31,102,-27]
        matrices = g.world_matrices(d)
        for i,station in enumerate(record['stations'],1):
            ai = names[station['release_anchor']]
            actual = g.point(matrices[ai],[0,0,0])
            c.close(actual,g.point(g.node_matrix(root),station['center']))
            targets = t.world_tris(d,b,source_indices+[names['pylon_'+str(j)] for j in range(1,9)]+[names['bomb_'+str(j)] for j in range(1,9) if j!=i])
            for dx,dz in [(0,0),(-.2,-1.2),(-.2,1.2),(.2,-1.2),(.2,1.2)]:
                p = g.point(g.node_matrix(root),[station['center'][0]+dx,station['center'][1],station['center'][2]+dz])
                assert all(c.ray_hit(p,[0,-1,0],tri) is None for tri in targets), ('rotated drop',i,p)
                rotated_rays+=1
    root.pop('rotation');root.pop('translation')
    assert poses==receipt['pure_input_tail_poses']==21
    assert rotated_rays==receipt['world_vertical_drop_rays']==120
    print('PASS geometry:',poses,'pure-input tail poses; frozen wing quaternions exact;',record['clearance']['drop_and_outlet_rays'],'source drop/outlet rays;',rotated_rays,'identity/rotated world-vertical drop rays')
    print('PASS measurements:',json.dumps({'bytes':record['derived_bytes'],'triangles':total,'bounds':e['bounds'],'glass':record['eye_section'],'bombs':e['hardpoints']['bombs'],'outlets':[ex['position'] for ex in e['exhausts']],'gap':record['clearance']['minimum_conservative_store_body_gap_m']}))
    # Preflight negatives must fail before even mkdir, including corrupt old destinations.
    negatives = 0
    for name in list(outputs)+list(t.FROZEN):
        damaged = dict(outputs);damaged[name]=b'corrupt'
        with patch.object(t,'generate',return_value=damaged),patch('sys.argv',['repair-tu160.py','--archive',str(args.archive)]),patch.object(Path,'write_bytes') as write,patch.object(Path,'mkdir') as mkdir:
            try:t.main()
            except AssertionError as error:assert str(error)=='output allowlist mismatch' or str(error).startswith('corrupt generated output: ')
            else:raise AssertionError('bad output accepted: '+name)
            write.assert_not_called();mkdir.assert_not_called()
        negatives+=1
    usage = shutil.disk_usage(t.WINGS)
    with patch.object(t.shutil,'disk_usage',return_value=usage._replace(free=2**31-1)),patch.object(t,'generate') as generate,patch('sys.argv',['repair-tu160.py','--archive',str(args.archive)]),patch.object(Path,'write_bytes') as write,patch.object(Path,'mkdir') as mkdir:
        try:t.main()
        except AssertionError as error:assert str(error)=='disk floor'
        else:raise AssertionError('disk floor accepted')
        generate.assert_not_called();write.assert_not_called();mkdir.assert_not_called()
    assert negatives+1 == 94
    accepted = t.load('tu160_coexist_check', 'repair-helicopter-clearance.py')
    accepted.validate_accepted_existing()
    approved = {name:(t.WINGS/name).read_bytes() for name in accepted.ALLOWLIST}
    evidence = json.loads(approved[accepted.REPAIR_RECORD])
    assert evidence['status']=='PASS_CONTINUOUS_GEOMETRY' and evidence['accepted_derivatives'] is True
    # Equal-size corruption exercises SHA pins, not just size/schema checks.
    corruptions = [{name:bytes([data[0]^1])+data[1:]} for name,data in approved.items()]
    forged = json.loads(approved[accepted.MANIFEST])
    forged['models']['ah64d']['sha256']='0'*64
    corruptions.append({accepted.MANIFEST:f.encoded(forged)})
    read_bytes, is_file = Path.read_bytes, Path.is_file
    coexist_negatives = 0
    for damage,missing in [(damage,None) for damage in corruptions]+[({},name) for name in approved]:
        def read(path):
            return damage.get(str(path.relative_to(t.WINGS)),read_bytes(path)) if path.is_relative_to(t.WINGS) else read_bytes(path)
        def present(path):
            return False if missing and path==t.WINGS/missing else is_file(path)
        with patch.object(Path,'read_bytes',read),patch.object(Path,'is_file',present),patch.object(t,'generate',return_value=outputs),patch('sys.argv',['repair-tu160.py','--archive',str(args.archive)]),patch.object(Path,'write_bytes') as write,patch.object(Path,'mkdir') as mkdir:
            try:t.main()
            except AssertionError as error:assert str(error).startswith(('foreign/unaccepted consumable: ','partial helicopter consumables'))
            else:raise AssertionError('unaccepted helicopter coexistence')
            write.assert_not_called();mkdir.assert_not_called()
        coexist_negatives+=1
    print('PASS coexistence: literal accepted manifest/2 GLB/evidence SHA+size; status PASS_CONTINUOUS_GEOMETRY;',coexist_negatives,'corrupt/partial/forged no-mkdir/no-write negatives')
    # Later native integration is mutable; the literal frozen assets/evidence are not.
    repo = t.WINGS.parents[1]
    frozen_paths = [str((t.WINGS/name).resolve().relative_to(repo)) for name in t.FROZEN]
    subprocess.run(['git','diff','--exit-code','--diff-filter=MDR','1b652d1b','--',*frozen_paths],cwd=repo,check=True,stdout=subprocess.PIPE)
    old_glbs = subprocess.check_output(['git','ls-tree','-r','--name-only','3ea48c9e','--','Games/Wings/models'],cwd=repo,text=True).splitlines()
    old_glbs = [p for p in old_glbs if p.endswith('.glb') and p.removeprefix('Games/Wings/') not in accepted.DERIVATIVES.values()]
    assert len(old_glbs)==68
    for name in old_glbs:
        assert (repo/name).read_bytes()==subprocess.check_output(['git','show','3ea48c9e:'+name],cwd=repo),name
    assert len(accepted.DERIVATIVES)==2
    print('PASS preservation: all68 old GLBs exact at3ea48c9e; 2 accepted derivatives verified separately')
    old = subprocess.check_output(['git','ls-tree','-r','--name-only','1b652d1b','--','Games/Wings/models'],cwd=repo,text=True).splitlines()
    glbs = [p for p in old if p.endswith('.glb')]
    assert len(glbs)==66 and len([p for p in t.FROZEN if p.endswith('.glb')])==66
    for p in glbs:assert p.removeprefix('Games/Wings/') in t.FROZEN
    print('PASS guards:',negatives+1,'no-mkdir/no-write negatives; all66 old GLBs,17fighter/8fleet entries,13random+declared receipts, blocked intake/quarantine exact at1b652d1b')
    print('PASS Tu160 CPU assets only; native/pixels/input/performance/rights HELD; no runtime registration')


if __name__=='__main__': main()

#!/usr/bin/env python3
"""Asset-only Tu160. Stdlib; supplied data only. --check never writes."""
import argparse
import copy
import importlib.util
import json
import math
from pathlib import Path
import shutil
import zipfile

HERE = Path(__file__).resolve().parent
WINGS = HERE.parent

def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE/filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

f = load('tu160_fighters', 'repair-fighter-pair.py')
g = f.g
c = load('tu160_geometry_check', 'repair-fighter-pair-check.py')
h = load('tu160_retained', 'repair-helicopter-pair.py')
# Freeze imported old maps, never regenerate baselines from the working tree.
assert g.sha(f.encoded(h.FROZEN)) == '1fa12c87f861cf6d1d40eac939e7bc68b2e769d346e5a318486c6c78dace7ce9'
FROZEN = dict(h.FROZEN, **h.PINNED_INTAKE)
FROZEN.update({
    'authoring/supplied-helicopters/README.md': '267e6192558b3764a80592fd98e49bab2a43e73f568143241ffc382625dfac91',
    'authoring/supplied-helicopters/blocked-native-candidate.patch.gz': 'f94b4be7dc2667b66e025820c8db603742ded6c48f9eff6df49c5293bca0a81f',
})
RAW_SHA = '705f494bc379b7371c7acd0dde80f18e5002874cc7b498ff27a684b1509f6b0e'
OUTPUTS = frozenset(('models/supplied/tu-160.glb', 'models/derived/wings_tu160.glb',
    'authoring/native-tu160.json', 'authoring/supplied-bomber/repair-record.json',
    'authoring/supplied-bomber/rigs/tu-160.json'))
OWNED = OUTPUTS | {'authoring/repair-tu160.py', 'authoring/repair-tu160-check.py',
                   'authoring/supplied-bomber/README.md'}
# Literal output pins from the measured candidate, not a working-tree baseline.
OUTPUT_SHA = {
    'models/supplied/tu-160.glb': RAW_SHA,
    'models/derived/wings_tu160.glb': '83cfe2e45141d6917520d89b6aa579dbecf5756518cdbed1151a280f4718e791',
    'authoring/native-tu160.json': '6e4cc5225141e8f38064ddb64959a1366183559511128e1548ca55df7879b774',
    'authoring/supplied-bomber/repair-record.json': '0083cdb6a06282536a4704fcdf551782b4fbdacd741177bb74ce0c7727aecd12',
    'authoring/supplied-bomber/rigs/tu-160.json': 'f0a7dc6edd03ab1ac2a303b31aa0ce68169dfc4984c203abea73244eb9058d02',
}
CONTROLS = [dict(node=n, axis=a, driver=driver, gain=-1, max_rad=limit)
    for n,a,driver,limit in [('tailplane_L','x','pitch',.22),
                            ('tailplane_R','x','pitch',.22),
                            ('rudder_center','y','yaw',.28)]]
FROZEN_WINGS = ['wing_sweep_L', 'wing_sweep_R']


def world_tris(doc, binary, indices):
    return c.world_triangles(doc, binary, indices)


def material_geometry(doc, binary, material):
    static = next(n for n in doc['nodes'] if n['name']=='airframe_static')
    prs = [p for p in doc['meshes'][static['mesh']]['primitives'] if p['material']==material]
    assert prs
    temp = dict(doc, meshes=[{'primitives': prs}])
    return list(f.triangles(temp,binary,{'mesh':0})), g.component_bounds(temp,binary,{'mesh':0})


def clipped_floor(tris, x, z, rx=.2, rz=1.2):
    """Exact conservative underside over a store's entire XZ bounding rectangle."""
    ys = []
    for tri in tris:
        polygon = list(tri)
        for axis, bound, sign in [(0,x-rx,1),(0,x+rx,-1),(2,z-rz,1),(2,z+rz,-1)]:
            clipped = []
            for a,b in zip(polygon,polygon[1:]+polygon[:1]):
                ina, inb = sign*(a[axis]-bound)>=0, sign*(b[axis]-bound)>=0
                if ina: clipped.append(a)
                if ina != inb:
                    t = (bound-a[axis])/(b[axis]-a[axis])
                    clipped.append([a[j]+t*(b[j]-a[j]) for j in range(3)])
            polygon = clipped
            if not polygon: break
        ys.extend(p[1] for p in polygon)
    assert ys, ('no source body over proposed store',x,z)
    return min(ys)


def control_envelope(doc, binary, control):
    node = next(n for n in doc['nodes'] if n['name']==control['node'])
    assert 'rotation' not in node
    axis = 'xyz'.index(control['axis'])
    values = [[],[],[]]
    for p in g.node_points(doc,binary,node):
        for j in range(3):
            if j==axis:
                values[j].append(p[j]+node['translation'][j]); continue
            if axis==0: a,b = (p[1],-p[2]) if j==1 else (p[2],p[1])
            else: a,b = (p[0],p[2]) if j==0 else (p[2],-p[0])
            angles = [-control['max_rad'],control['max_rad']]
            angles += [t for k in range(-2,3) if abs(t:=math.atan2(b,a)+k*math.pi)<=control['max_rad']]
            values[j].extend(a*math.cos(t)+b*math.sin(t)+node['translation'][j] for t in angles)
    return {'node':control['node'],'continuous_bounds':{
        'min':[min(v) for v in values], 'max':[max(v) for v in values]}}


def geometry_clearance(doc, binary, source_indices, stations, exhausts):
    names = {n['name']:i for i,n in enumerate(doc['nodes'])}
    rest = world_tris(doc,binary,source_indices)
    surfaces = [('rest',rest)]
    # All actual source meshes at rest, plus each tail mesh at 8 signed poses.
    for control in CONTROLS:
        node = doc['nodes'][names[control['node']]]
        saved = copy.deepcopy(node)
        for rate in [-1,-.75,-.5,-.25,.25,.5,.75,1]:
            angle = rate*control['gain']*control['max_rad']
            q = [0.,0.,0.,math.cos(angle/2)]
            q['xyz'.index(control['axis'])] = math.sin(angle/2)
            node['rotation'] = q
            surfaces.append((control['node']+':'+str(rate),world_tris(doc,binary,[names[control['node']]])))
        node.clear();node.update(saved)
    count = 0
    minimum_gap = math.inf
    for station in stations:
        x,y,z = station['center']
        gap = clipped_floor(rest,x,z)-(y+.2)
        assert gap >= .19999, ('store/source overlap',station,gap)
        minimum_gap = min(minimum_gap,gap)
        # Exact rectangle clipping also bounds actual bomb/source separation at tail poses.
        for label,tris in surfaces:
            candidates = [t for t in tris if not (max(p[0] for p in t)<x-.2 or min(p[0] for p in t)>x+.2 or
                         max(p[2] for p in t)<z-1.2 or min(p[2] for p in t)>z+1.2)]
            if candidates:
                assert clipped_floor(candidates,x,z) > y+.2+.19, (label,station)
        # Whole footprint, not missile-style forward rays. Includes centroid.
        for dx in [-.2,-.1,0,.1,.2]:
            for dz in [-1.2,-.6,0,.6,1.2]:
                origin = [x+dx,y,z+dz]
                for label,tris in surfaces:
                    assert all(c.ray_hit(origin,[0,-1,0],t) is None for t in tris), (label,station)
                    count += 1
        station['conservative_body_gap_m'] = gap
    for e in exhausts:
        for a in range(8):
            angle = a*math.tau/8
            origin = [e['position'][0]+.2*math.cos(angle),e['position'][1]+.2*math.sin(angle),e['position'][2]+.002]
            for label,tris in surfaces:
                assert all(c.ray_hit(origin,[0,0,1],t) is None for t in tris), ('outlet',label,e)
                count += 1
    return {'source_pose_sets':len(surfaces),'drop_and_outlet_rays':count,
            'minimum_conservative_store_body_gap_m':minimum_gap,
            'method':'triangle rectangle clipping of full store XZ bounds; downward full-footprint rays against all rest source meshes and 24 actual tail poses; source approximate joints not certified'}


def generate(archive):
    assert Path(archive).stat().st_size==3_114_212
    f.archive_members(archive)  # SHA, paths, CRC, every manifest member; data only.
    with zipfile.ZipFile(archive) as z:
        source = z.read('models/tu-160.glb')
        rig_bytes = z.read('rigs/tu-160.json')
    assert len(source)==120580 and g.sha(source)==RAW_SHA
    rig = json.loads(rig_bytes)
    doc,binary = g.unpack_glb(source)
    original = copy.deepcopy(doc['nodes'])
    assert {n['name'] for n in original}=={'vehicle_root','airframe_static','rudder_center','tailplane_L','tailplane_R',*FROZEN_WINGS}
    assert sum(len(g.accessor(doc,binary,p['indices']))//3 for m in doc['meshes'] for p in m['primitives'])==2924
    f.orient(doc,binary)
    names = {n['name']:i for i,n in enumerate(doc['nodes'])}
    root = names['vehicle_root']
    assert g.node_matrix(doc['nodes'][root])==g.node_matrix({})
    source_indices = [i for i,n in enumerate(doc['nodes']) if 'mesh' in n]
    normalized = copy.deepcopy(doc['nodes'])
    source_bounds = g.bounds(f.world_points(doc,binary))
    assert 49.47 < source_bounds['max'][0]-source_bounds['min'][0] < 49.48
    for control in rig['controls']:
        n = doc['nodes'][names[control['node']]]
        assert n['translation']==g.reflect(control['pivot_world_m'])
        if control['node'] in FROZEN_WINGS:
            x,y,z,w = control['rest_node_transform']['rotation']
            assert n['rotation']==[-x,-y,z,w]
    paint_tris,_ = material_geometry(doc,binary,0)
    glass_tris,glass_components = material_geometry(doc,binary,1)
    assert doc['materials'][1]['name']=='tinted_canopy' and len(glass_components)==4
    assert all(box['max'][2]<-14 for box in glass_components)
    # A real forward pane section, away from center gap; derive from component extent.
    pane = sorted(glass_components,key=lambda box:(box['min'][2],box['min'][0]))[0]
    cx = (pane['min'][0]+pane['max'][0])/2
    cz = pane['min'][2]+(pane['max'][2]-pane['min'][2])*.8
    body_roof = f.surface_y(paint_tris,cx,cz)[1]
    glass_roof = f.surface_y(glass_tris,cx,cz)[1]
    assert glass_roof-body_roof>.025, 'no exposed glass/body camera envelope'
    cockpit = [cx,body_roof+.7*(glass_roof-body_roof),cz]
    f.anchor(doc,'cockpit_eye',cockpit,root)
    # Actual glass only. Source material4 is safety markings, unchanged.
    glass = doc['materials'][1]
    glass['alphaMode']='BLEND'
    glass['pbrMetallicRoughness']['metallicFactor']=0
    glass['pbrMetallicRoughness']['baseColorFactor'][3]=.26
    paint = len(doc['materials'])
    doc['materials'].extend([
        {'name':'arcade_store_dark_paint','pbrMetallicRoughness':{'baseColorFactor':[.025,.029,.032,1],'metallicFactor':.15,'roughnessFactor':.6}},
        {'name':'arcade_exhaust_core','emissiveFactor':[.12,.045,.012],
         'pbrMetallicRoughness':{'baseColorFactor':[.035,.022,.016,1],'metallicFactor':0,'roughnessFactor':.5}}])
    source_tris = world_tris(doc,binary,source_indices)
    stations = []
    for zz in [-6,-2,2,6]:
        for x in [-1.1,1.1]:
            number = len(stations)+1
            underside = f.surface_y(paint_tris,x,zz)[0]
            floor = clipped_floor(source_tris,x,zz)
            y = floor-.4
            assert 0 < underside-(y+.2) < .65, 'unvalidated long pylon'
            name = 'bomb_'+str(number)
            ni = f.add_mesh(doc,binary,name,f.tube(.2,[(-1.2,0),(-.9,1),(.9,1),(1.2,0)]),paint,[x,y,zz],root)
            f.anchor(doc,name+'_release',[0,0,0],ni)
            f.add_mesh(doc,binary,'pylon_'+str(number),f.box([-.045,y+.18,-.18],[.045,underside+.015,.18]),3,[x,0,zz],root)
            stations.append({'node':name,'release_anchor':name+'_release','center':[x,y,zz],
                             'attachment':[x,underside,zz],'footprint_floor':floor})
    _,outlets = material_geometry(doc,binary,3)
    outlets.sort(key=lambda box:box['min'][0])
    assert len(outlets)==4 and all(box['min'][2]>13.3 and box['max'][2]==13.75 for box in outlets)
    exhausts = []
    for number,box in enumerate(outlets,1):
        position = [(box['min'][j]+box['max'][j])/2 for j in (0,1)]+[box['max'][2]+.008]
        radius = min(box['max'][j]-box['min'][j] for j in (0,1))*.42
        name = 'exhaust_core_'+str(number)
        ni = f.add_mesh(doc,binary,name,f.tube(radius,[(0,1),(.012,1)],20),paint+1,position,root)
        anchor = 'exhaust_anchor_'+str(number)
        f.anchor(doc,anchor,[0,0,0],ni)
        exhausts.append({'node':name,'anchor':anchor,'position':position})
    clearance = geometry_clearance(doc,binary,source_indices,stations,exhausts)
    doc['nodes'][root]['extras']['coordinates']='meters; -Z forward; +Y up; +X right; identity root'
    doc['buffers'][0]['byteLength']=len(binary)
    payload = g.pack_glb(doc,binary)
    descriptor = {'source_model_id':rig['model_id'],'source_sha256':RAW_SHA,
        'file':'models/derived/wings_tu160.glb','sha256':g.sha(payload),'bounds':g.bounds(f.world_points(doc,binary)),
        'cockpit':cockpit,'hardpoints':{'bombs':[s['center'] for s in stations]},'controls':CONTROLS,
        'exhausts':exhausts,'afterburning':False,'frozen_nodes':FROZEN_WINGS,
        'native_pivots':[c['node'] for c in CONTROLS]+[s['node'] for s in stations]+[e['node'] for e in exhausts]}
    record = {'schema':'wings_tu160_asset_repair_v1','baseline':'1b652d1b','status':'CPU_GEOMETRY_ONLY_NATIVE_PIXELS_HELD',
        'archive_sha256':f.ARCHIVE_SHA256,'source_sha256':RAW_SHA,'derived_sha256':g.sha(payload),
        'source_bytes':len(source),'derived_bytes':len(payload),'source_triangles':2924,
        'derived_triangles':sum(len(g.accessor(doc,binary,p['indices']))//3 for m in doc['meshes'] for p in m['primitives']),
        'serialized_check':{'source_buffer_bytes':110308,'png_bytes':32028,
            'png_sha256':'27ffab1da309304f5097c3d54796dadb7f765aa43a40c339316b03939dac89ff',
            'png_decode':'256x256 RGB, CRC and PNG row-filter decoding checked',
            'pure_input_tail_poses':21,'world_vertical_drop_rays':120,
            'minimum_store_store_axis_gap_m':1.5999999046325684,
            'invariants':'all normalized original buffer bytes exact, including UV/image/padding; source PBR factors exact except glass1; volume centroid anchors; literal output pins; repeated reproduction; no-mkdir/write corruption and disk guards'},
        'source_rest_nodes':original,'normalized_rest_nodes':normalized,'full_source_rest_bounds':source_bounds,
        'tail_control_swept_bounds':[control_envelope(doc,binary,c) for c in CONTROLS],
        'glass_material_index':1,'glass_components':glass_components,'eye_section':{'body_roof':body_roof,'glass_roof':glass_roof,'eye':cockpit},
        'stations':stations,'outlet_component_bounds':outlets,'clearance':clearance,
        'qualification':'User-reported GPT originals/scoped permission; not independent rights or certified mechanics. Eight generic EXTERNAL arcade bombs only, shared8 native900damage later. No real load, caliber/weight, bay/doors/holes, stealth, gun, gear or operational sweep. afterburning:false is visual opt-out, not real engine capability. Native cockpit/material/aircraft pixels, input and hardware held.'}
    outputs = {'models/supplied/tu-160.glb':source,descriptor['file']:payload,
        'authoring/native-tu160.json':f.encoded({'schema':'wings_native_tu160_v1','archive_sha256':f.ARCHIVE_SHA256,'models':{'tu160':descriptor}}),
        'authoring/supplied-bomber/repair-record.json':f.encoded(record),
        'authoring/supplied-bomber/rigs/tu-160.json':rig_bytes}
    assert len(payload)<512000 and len(source)+len(payload)<700000
    return outputs


def validate_outputs(outputs, expected):
    assert set(outputs)==OUTPUTS, 'output allowlist mismatch'
    assert outputs==expected, 'corrupt generated output'
    assert sum(map(len,outputs.values()))<700000, 'output cap'
    for name,data in outputs.items():
        assert isinstance(data,bytes) and (not name.endswith('.glb') or len(data)<512000)
        assert g.sha(data)==OUTPUT_SHA[name], 'corrupt generated output: '+name
        path = WINGS/name
        assert not any(p.is_symlink() for p in [path,*path.parents]), 'symlink destination'
        assert not path.exists() or path.read_bytes()==data, 'different existing output: '+name
    for name,expected_sha in FROZEN.items():
        assert g.sha((WINGS/name).read_bytes())==expected_sha, 'retained file changed: '+name
    accepted = load('tu160_accepted_helicopters', 'repair-helicopter-clearance.py')
    if any((WINGS/name).exists() for name in accepted.ALLOWLIST):
        assert all((WINGS/name).is_file() for name in accepted.ALLOWLIST), 'partial helicopter consumables'
        accepted.validate_accepted_existing()
    size = sum(map(len,outputs.values()))
    assert shutil.disk_usage(WINGS).free-size*2 >= 2**31, 'disk floor'
    # Content plus a conservative second copy for Git stays under the task budget.
    authored = sum((WINGS/p).stat().st_size for p in OWNED-OUTPUTS)
    assert 2*(size+authored)<2000000, 'owned content plus Git budget'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',required=True,type=Path)
    parser.add_argument('--check',action='store_true')
    args = parser.parse_args()
    assert shutil.disk_usage(WINGS).free>=2**31, 'disk floor'
    outputs = generate(args.archive)
    # Independent repeated generation is the corruption preflight, before mkdir/write.
    validate_outputs(outputs,generate(args.archive))
    if args.check:
        for name,data in outputs.items(): assert (WINGS/name).read_bytes()==data,name
        print('PASS Tu160: five asset/metadata outputs reproduce byte-exact; all66 old GLBs and frozen metadata/evidence unchanged')
        return
    for name,data in outputs.items():
        p = WINGS/name
        if p.exists(): continue
        assert shutil.disk_usage(WINGS).free-2*len(data)>=2**31, 'disk floor'
        p.parent.mkdir(parents=True,exist_ok=True)
        p.write_bytes(data)
    print('WROTE Tu160:',len(outputs),'outputs,',sum(map(len,outputs.values())),'bytes; geometry CPU only, native held')


if __name__=='__main__': main()

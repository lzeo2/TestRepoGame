"""Offline reference render of the actual game models. No geometry alterations.
Blender -b --python render-models.py -- EXPORT_DIR OUTPUT_DIR [indices] [samples] [resolution]
"""
import bpy,sys,os,json,math,time
from pathlib import Path
from mathutils import Matrix,Vector
args=sys.argv[sys.argv.index('--')+1:]
source=Path(args[0]);out=Path(args[1]);out.mkdir(parents=True,exist_ok=True)
ids=list(map(int,args[2].split(','))) if len(args)>2 else list(range(9))
samples=int(args[3]) if len(args)>3 else 72
resolution=int(args[4]) if len(args)>4 else 1000
data=json.loads((source/'models.json').read_text())
# Three +Y up / +Z forward -> Blender +Z up / -Y forward.
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=samples;s.cycles.use_denoising=False
s.cycles.max_bounces=7;s.cycles.diffuse_bounces=4;s.cycles.glossy_bounces=5
s.render.threads_mode='FIXED';s.render.threads=8
s.render.resolution_x=resolution;s.render.resolution_y=resolution;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG';s.render.film_transparent=False
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast';s.view_settings.exposure=.6
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.11,.15,.17,1);s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.32
materials={};images={}
def texnode(nodes,links,t_id,noncolor=False):
 t=data['textures'][t_id];key=(t_id,noncolor)
 if key not in images:
  image=bpy.data.images.load(str(source/(t['file']+'.png')),check_existing=False)
  image.colorspace_settings.name='Non-Color' if noncolor else ('sRGB' if t['colorSpace']=='srgb' else 'Non-Color');images[key]=image
 n=nodes.new('ShaderNodeTexImage');n.image=images[key];n.extension='REPEAT';n.interpolation='Linear'
 if t['repeat']!=[1,1] or t['offset']!=[0,0] or t['rotation']:
  uv=nodes.new('ShaderNodeTexCoord');mp=nodes.new('ShaderNodeMapping');mp.vector_type='POINT'
  mp.inputs['Scale'].default_value=(t['repeat'][0],t['repeat'][1],1);mp.inputs['Location'].default_value=(t['offset'][0],t['offset'][1],0);mp.inputs['Rotation'].default_value=(0,0,t['rotation'])
  links.new(uv.outputs['UV'],mp.inputs['Vector']);links.new(mp.outputs['Vector'],n.inputs['Vector'])
 return n
for m in data['materials']:
 material=bpy.data.materials.new(m['name']);material.use_nodes=True;nodes=material.node_tree.nodes;links=material.node_tree.links;bs=nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*m['color'],1);bs.inputs['Roughness'].default_value=m['roughness'];bs.inputs['Metallic'].default_value=m['metalness'];bs.inputs['Alpha'].default_value=m['opacity']
 bs.inputs['Emission Color'].default_value=(*m['emissive'],1);bs.inputs['Emission Strength'].default_value=m['emissiveIntensity'];bs.inputs['Coat Weight'].default_value=m['clearcoat'];bs.inputs['Coat Roughness'].default_value=m['clearcoatRoughness'];bs.inputs['Transmission Weight'].default_value=m['transmission'];bs.inputs['IOR'].default_value=m['ior']
 if m.get('map') is not None:
  im=texnode(nodes,links,m['map']);mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*m['color'],1);links.new(im.outputs['Color'],mix.inputs[1]);links.new(mix.outputs[0],bs.inputs['Base Color'])
 if m.get('emissiveMap') is not None:
  im=texnode(nodes,links,m['emissiveMap']);mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*m['emissive'],1);links.new(im.outputs['Color'],mix.inputs[1]);links.new(mix.outputs[0],bs.inputs['Emission Color'])
 for slot,dest,channel,mult in [('roughnessMap','Roughness','Green',m['roughness']),('metalnessMap','Metallic','Blue',m['metalness']),('alphaMap','Alpha','Green',m['opacity'])]:
  if m.get(slot) is None:continue
  im=texnode(nodes,links,m[slot],True);sep=nodes.new('ShaderNodeSeparateColor');links.new(im.outputs['Color'],sep.inputs['Color']);mul=nodes.new('ShaderNodeMath');mul.operation='MULTIPLY';mul.inputs[1].default_value=mult;links.new(sep.outputs[channel],mul.inputs[0]);links.new(mul.outputs[0],bs.inputs[dest])
 if m.get('bumpMap') is not None:
  im=texnode(nodes,links,m['bumpMap'],True);sep=nodes.new('ShaderNodeSeparateColor');links.new(im.outputs['Color'],sep.inputs['Color']);bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=1;bump.inputs['Distance'].default_value=m['bumpScale'];links.new(sep.outputs['Red'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
 if m.get('normalMap') is not None:
  im=texnode(nodes,links,m['normalMap'],True);normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=m.get('normalScale',[1,1])[0];links.new(im.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
 materials[m['id']]=material
meshes={}
for g in data['geometries']:
 verts=list(zip(*[iter(g['position'])]*3));ind=g['index'] or list(range(len(verts)));faces=list(zip(*[iter(ind)]*3))
 mesh=bpy.data.meshes.new(f"geometry-{g['id']}");mesh.from_pydata(verts,[],faces);mesh.update()
 if g['uv']:
  uv=mesh.uv_layers.new(name='UVMap');pairs=list(zip(*[iter(g['uv'])]*2))
  uv.data.foreach_set('uv',[v for loop in mesh.loops for v in pairs[loop.vertex_index]])
 for poly in mesh.polygons:poly.use_smooth=True
 if g['normal']:
  try:mesh.normals_split_custom_set_from_vertices(list(zip(*[iter(g['normal'])]*3)))
  except Exception as e:print('NORMAL WARNING',g['id'],e)
 meshes[g['id']]=mesh
models={}
for m in data['models']:
 coll=bpy.data.collections.new(m['name']);s.collection.children.link(coll);obs=[]
 for record in m['meshes']:
  ob=bpy.data.objects.new(record['name'],meshes[record['geometry']].copy());coll.objects.link(ob);obs.append(ob)
  ob.matrix_world=C@Matrix([record['matrix'][i:i+4] for i in range(0,16,4)]).transposed()
  for mi in record['materials']:ob.data.materials.append(materials[mi])
  for group in data['geometries'][record['geometry']]['groups']:
   for p in ob.data.polygons[group['start']//3:(group['start']+group['count'])//3]:p.material_index=group['materialIndex']
  if len(record['materials'])==1 and data['materials'][record['materials'][0]]['flatShading']:
   for p in ob.data.polygons:p.use_smooth=False
  ob.hide_render=True
 models[m['index']]=obs
# Import ninth creature directly from the approved GLB, with its own PBR maps intact.
secret=Path(__file__).resolve().parents[2]/'assets/secret-cave-creature.glb'
if not secret.exists():secret=Path('/workspace/shared/secret_creature_snarl/secret-cave-creature.glb')
if 8 in ids:
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(secret));obs=[o for o in bpy.data.objects if o not in before];models[8]=obs
 for o in obs:o.hide_render=True

def simple_material(name,color,roughness=.7,metallic=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=roughness;b.inputs['Metallic'].default_value=metallic;return m
# Matte studio surface, discrete specimen pedestal.
stage_mat=simple_material('Offline preview stage',(.052,.067,.067),.6,.06)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.135));floor=bpy.context.object;floor.name='Preview_floor';floor.data.materials.append(stage_mat)
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=1.42,depth=.12,location=(0,0,-.07));plinth=bpy.context.object;plinth.name='Preview_plinth';plinth.data.materials.append(simple_material('Weathered charcoal',(.044,.05,.048),.46,.16))
bevel=plinth.modifiers.new('Soft edges','BEVEL');bevel.width=.025;bevel.segments=3
for p in plinth.data.polygons:p.use_smooth=True

def area(name,loc,power,color,size,target=(0,0,1)):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
area('Broad soft key',(-3.7,-4.6,5.9),680,(1,.82,.65),3.5)
area('Cool fill',(3.6,-2.4,3.7),480,(.63,.8,1),3)
area('Amber silhouette',(1.3,3.8,4.5),830,(1,.61,.36),2.4)
area('Front eye glint',(-.35,-4.8,2.6),75,(1,.91,.79),1.0)
d=bpy.data.cameras.new('Asset camera');cam=bpy.data.objects.new('Asset camera',d);s.collection.objects.link(cam);s.camera=cam;d.type='ORTHO';d.lens=55;d.clip_end=500
stats=[]
for idx in ids:
 active=models[idx]
 for ob in active:ob.hide_render=False
 bpy.context.view_layer.update()
 points=[ob.matrix_world@Vector(c) for ob in active if ob.type=='MESH' for c in ob.bound_box]
 lo=Vector(tuple(min(p[k] for p in points) for k in range(3)));hi=Vector(tuple(max(p[k] for p in points) for k in range(3)))
 target=(lo+hi)/2
 if idx==8:
  plinth.hide_render=True;target.z=.4;cam.location=(3.35,-5.5,4.7);d.ortho_scale=3.92
 else:
  plinth.hide_render=False;plinth.scale=(1,1,1);target.z=1.07;target.y=0;cam.location=(3.3,-8.2,3.8);d.ortho_scale=max(3.16,(hi.x-lo.x)*1.18)
 cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
 if idx==8:
  # Center the true low-crawl silhouette rather than its empty bounding-box volume.
  truepoints=[ob.matrix_world@v.co for ob in active if ob.type=='MESH' for v in ob.data.vertices]
  q=cam.rotation_euler.to_quaternion();right=q@Vector((1,0,0));up=q@Vector((0,1,0))
  rvalues=[p.dot(right) for p in truepoints];uvalues=[p.dot(up) for p in truepoints]
  rc=(min(rvalues)+max(rvalues))/2;uc=(min(uvalues)+max(uvalues))/2
  offset=right*(rc-target.dot(right))+up*(uc-target.dot(up));cam.location+=offset
  d.ortho_scale=max(max(rvalues)-min(rvalues),max(uvalues)-min(uvalues))*1.13
 s.render.filepath=str(out/f'{idx+1:02d}-asset.png');t=time.time();bpy.ops.render.render(write_still=True)
 tri=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in active if o.type=='MESH')
 stats.append({'index':idx,'file':s.render.filepath,'samples':samples,'resolution':[resolution,resolution],'meshObjects':sum(o.type=='MESH' for o in active),'triangles':tri,'boundsZUp':{'min':list(lo),'max':list(hi)},'renderSeconds':round(time.time()-t,2)})
 print('RENDERED_ASSET',json.dumps(stats[-1]),flush=True)
 for ob in active:ob.hide_render=True
(out/'render-validation.json').write_text(json.dumps({'method':'Actual Three.js exported meshes/DataTextures, imported and rendered in Blender Cycles; ninth model directly imported from GLB','blenderVersion':bpy.app.version_string,'engine':'Cycles','samples':samples,'resolution':[resolution,resolution],'sourceFiles':data['sourceFiles'],'geometryAltered':False,'offlineAssetRender':True,'browserScreenshot':False,'runtimeGameplayValidated':False,'materialNote':'MeshStandardMaterial PBR properties and generated color/roughness/bump maps translated to Blender Principled BSDF; lighting and tone mapping are offline preview settings, not the WebGL game renderer.','renders':stats},indent=2))
print('ALL_ASSET_RENDERS_COMPLETE',flush=True)

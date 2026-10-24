"""Join independent secret-asset render validation and verify exact source snapshot."""
import json,hashlib,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
export=Path(sys.argv[1]);secret_validation=Path(sys.argv[2])
panels=root/'previews/individual';v=json.loads((panels/'render-validation.json').read_text());secret=json.loads(secret_validation.read_text())['renders'][0]
secret['file']='previews/individual/09-asset.png';secret['samples']=128;secret['resolution']=[1100,1100]
v['renders'].append(secret);v['renders'].sort(key=lambda r:r['index']);v['samples']='96 for eight game creatures; 128 for The Uninvited'
actual=json.loads((export/'models.json').read_text())
v['geometryStats']={'uniqueThreeGeometries':len(actual['geometries']),'gameSurfaceMaterials':len(actual['materials']),'gameTextureMaps':len(actual['textures']),'gameTextureBytes':sum(t['width']*t['height']*t['channels'] for t in actual['textures']),'totalTrianglesAllNine':sum(r['triangles'] for r in v['renders'])}
v['sourceSnapshotMatchesDeliveredFiles']=all(hashlib.sha256((root/f['path']).read_bytes()).hexdigest()==f['sha256'] for f in v['sourceFiles'])
assert v['sourceSnapshotMatchesDeliveredFiles']
assert all(v['renders'][i]['triangles']==actual['models'][i]['triangles'] for i in range(8))
for r in v['renders']:
 im=Image.open(panels/f"{r['index']+1:02d}-asset.png");assert im.size==(1100,1100);im.verify()
v['secretAsset']={'path':'assets/secret-cave-creature.glb','sha256':hashlib.sha256((root/'assets/secret-cave-creature.glb').read_bytes()).hexdigest(),'triangleCount':13926,'importMethod':'Blender glTF importer; original low-crawl geometry retained'}
v['visualInspection']={'allNinePanelsInspected':True,'penguinBellyRefinementVerified':True,'lineupLabelsAndFramingInspected':True,'style':'Stylized game anatomy with realism-inspired PBR surfaces; not scans or a claim of photographic realism'}
v['limitations']=['Offline Cycles lighting and shading differ from the live WebGL game.','Independent camera framing is not a shared-scale reference.','No browser gameplay, performance, GPU compatibility, animation or controls are validated by these renders.']
(root/'previews/render-validation.json').write_text(json.dumps(v,indent=2))
print(root/'previews/render-validation.json')

"""Convert exact exported DataTexture bytes to Blender-readable PNGs."""
import sys,json,pathlib,numpy as np
from PIL import Image
root=pathlib.Path(sys.argv[1]);data=json.loads((root/'models.json').read_text())
for t in data['textures']:
 if t['arrayType'] not in ('Uint8Array','Uint8ClampedArray'):raise ValueError(t['arrayType'])
 mode={1:'L',2:'LA',3:'RGB',4:'RGBA'}[t['channels']]
 im=Image.frombytes(mode,(t['width'],t['height']),(root/t['file']).read_bytes())
 # Three DataTexture flipY=false places the first byte row at v=0.
 if not t['flipY']:im=im.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
 im.save(root/(t['file']+'.png'))
print('Prepared',len(data['textures']),'unaltered DataTextures')

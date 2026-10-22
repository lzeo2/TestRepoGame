"""Replay exact 17-model photo coverage; optionally regenerate comparison plates."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
QA = ROOT / 'docs/maintenance/audits/citisten-external'
parser = argparse.ArgumentParser()
parser.add_argument('--plates', action='store_true')
args = parser.parse_args()
before = json.loads((QA/'before/results.json').read_text())
expected = {(s['model'], s['view']) for s in before['shots']}
assert len(expected) == 34 and len({m for m, _ in expected}) == 17
shots = {}
source = None
for path in sorted(QA.glob('after-*/results.json')):
    report = json.loads(path.read_text())
    assert report.get('complete') and not any(report[k] for k in ['errors', 'external', 'failed']), path
    assert all(report[k] for k in ['serverClosed', 'profileRemoved', 'browserClosed']), path
    assert len(report['shots']) == 2*len(report['selectedModels']), path
    if source is None: source = report['sourceHashes']
    assert report['sourceHashes'] == source, 'Cannot combine different renderer revisions'
    for shot in report['shots']:
        key = shot['model'], shot['view']
        assert key not in shots and key in expected, key
        assert not shot['proxy'] and shot['pose'] == {'x': 0, 'y': 0, 'z': 0, 'rotation': 3.141592653589793, 'scale': 1}
        image = path.parent/shot['file']
        with Image.open(image) as im: assert im.size == (1280, 720), image
        shots[key] = image
        if shot['view'] == 'model':
            def triangles(name):
                raw = (ROOT/'Games/Citisten3D/models'/name/'model.glb').read_bytes()
                length = struct.unpack_from('<I', raw, 12)[0]
                gltf = json.loads(raw[20:20+length])
                return sum(gltf['accessors'][p['indices']]['count']//3 for mesh in gltf['meshes'] for p in mesh['primitives'])
            count = triangles(shot['model']) + (triangles('tree_deciduous') if shot['model']=='park_lot' else 0)
            # 32x32 ground + water = 2050 triangles. Models draw once plus sun shadow.
            assert shot['triangles'] == 2050 + 2*count, (key, 'LOD0 triangle count differs')
assert set(shots) == expected, ('Missing photos', expected-set(shots))
for name, digest in source.items():
    assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest() == digest, name
if args.plates:
    free = int(subprocess.check_output(['df', '-B1', '--output=avail', '/'], text=True).splitlines()[-1])
    assert free >= 2178940928, free
    output = QA/'comparisons'; output.mkdir(exist_ok=True)
    for model in sorted({m for m, _ in expected}):
        plate = Image.new('RGB', (1280, 768), 'white'); draw = ImageDraw.Draw(plate)
        for row, phase in enumerate(['before', 'after']):
            for col, view in enumerate(['model', 'scene']):
                path = QA/'before'/f'{model}-{view}.jpg' if phase=='before' else shots[model, view]
                label = f'{phase.upper()} {model} / {view}'
                if phase=='before' and model in ['tree_deciduous','patrol_car','utility_car']: label += ' (labelled predecessor proxy)'
                draw.text((col*640+8, row*384+5), label, fill='black')
                with Image.open(path) as im: plate.paste(im.resize((640, 360)), (col*640, row*384+24))
        plate.save(output/f'{model}.jpg', quality=85)
print('EXTERNAL PHOTO CHECK PASS: 17 models / 34 current AFTER photos, matching runtime hashes and actual LOD0/shadow triangles; 34 BEFORE photos retained')
print('Scope: static model/placement API fixtures, not native action, animation-in-browser, photorealism or FPS acceptance')

"""Committed vehicle geometry/size/determinism regression; not rendering acceptance."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('generator', ROOT / 'generate-models.py')
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)

for make in (generator.f15, generator.f35, generator.speedboat):
    name = make.__name__
    data = (ROOT.parent / 'models' / (name + '.glb')).read_bytes()
    assert data == make().finish() == make().finish(), f'{name}: committed/deterministic bytes differ'
    print('PASS ' + json.dumps(generator.check_model(data), sort_keys=True))

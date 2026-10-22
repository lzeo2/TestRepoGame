"""Recheck this source-bound packet, not visual quality or release acceptance."""
import hashlib
from functools import cache
import json
import struct
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
# The operator retained A-I evidence across the later presentation-only default flip.
SOURCE_REVISION = 'bedb052'
@cache
def source_digest(name):
    return hashlib.sha256(subprocess.check_output(['git', 'show', f'{SOURCE_REVISION}:{name}'], cwd=ROOT)).hexdigest()
reports = sorted(OUT.glob('letter-*-evidence.json'))
seen = set()
responses = 0
sources = None
for path in reports:
    data = json.loads(path.read_text())
    assert data['status'] == 'COMPLETE-builder-checks-only', path
    assert data['sourcesUnchanged'] and not data['errors'], path
    assert data['runnerSha256'] == source_digest('Games/Jankolock3D/letter-qa.py')
    assert data['sourceHashes'] == data['sourceHashesAfter']
    sources = sources or data['sourceHashes']
    assert sources == data['sourceHashes'], path
    for name, sha in sources.items():
        assert source_digest(name) == sha, name
    for shot in data['screenshots']:
        image = OUT / shot['file']
        assert digest(image) == shot['sha256'], image
        assert image.read_bytes()[:8] == b'\x89PNG\r\n\x1a\n'
        assert struct.unpack('>II', image.read_bytes()[16:24]) == (1280, 720)
        assert image.name not in seen, image
        seen.add(image.name)
    assert all(r['status'] == 200 for r in data['responses'])
    responses += len(data['responses'])
assert (len(reports), len(seen), responses) == (10, 36, 635)
summary = json.loads((OUT / 'evidence-summary.json').read_text())
for model in summary['models']:
    name = model['path']
    size = int(subprocess.check_output(['git', 'cat-file', '-s', f'{SOURCE_REVISION}:{name}'], cwd=ROOT))
    assert size == model['bytes'] < 8388608, name
    assert source_digest(name) == model['sha256'], name
print(f'PASS: {len(reports)} receipts, {len(seen)} screenshot hashes, '
      f'{responses} HTTP200, {len(sources)} identical runtime sources at {SOURCE_REVISION}; '
      '6 historical GLB hashes/sizes. Not a current visual, hardware or release grade.')

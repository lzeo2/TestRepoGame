#!/usr/bin/env python3
"""Read-only verification of v3.1 coverage, source identity and promoted/retained art.

python3 -B scripts/check_thumb_manual_receipts.py
"""
import hashlib
import json
from PIL import Image
from capture_game_thumbs import ROOT, aliases, slug, validate_jpg
from capture_thumb_sweep_v3 import git, tracked


def main():
    original = json.loads((ROOT / 'docs/thumb-sweep-v3.json').read_text())
    rows = json.loads((ROOT / 'docs/thumb-sweep-v3.1.json').read_text())['batch1']
    for path in sorted((ROOT / 'docs/thumb-sweep-v3.1').glob('batch-*.json')):
        rows += json.loads(path.read_text())
    expected = {r['id'] for r in original['games'] if r['status'] == 'needs-manual'}
    assert len(rows) == len(expected) == 52
    assert {r['id'] for r in rows} == expected
    catalog_bytes = (ROOT / 'games.json').read_bytes()
    assert hashlib.sha256(catalog_bytes).hexdigest() == original['catalog_sha256']
    games = json.loads(catalog_bytes)
    assert len({g['id'] for g in games}) == len(games) == 127
    files = tracked()
    mapping = aliases()
    accepted = 0
    for r in rows:
        game = next(g for g in games if g['id'] == r['id'])
        assert all(k in game for k in ('id', 'title', 'cat', 'icon', 'desc', 'url', 'featured'))
        assert files[game['url']] == r['entry_blob']
        root = '/'.join(game['url'].split('/')[:2])
        assert git('rev-parse', 'HEAD:'+root).decode().strip() == r['source_tree']
        # SIGALRM stops input at 180s; receipt bookkeeping may follow slightly.
        assert 0 < r['seconds'] <= 180.1, r
        name = mapping.get(game['title'], slug(game['title']))
        assert r['output'] == f'assets/thumbs/{name}.jpg'
        path = ROOT / r['output']
        digest = hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None
        assert digest == r.get('output_sha256', r.get('retained_sha256')), r['id']
        if r['status'] == 'captured':
            accepted += 1
            data = path.read_bytes()
            validate_jpg(data, {})
            with Image.open(path) as image:
                assert image.size == (1280, 720) and image.format == 'JPEG'
            assert r['accepted_candidate'] in {c['file'] for c in r['candidates']}
        else:
            assert r['status'] == 'needs-manual'
            prior = next(g for g in original['games'] if g['id'] == r['id'])
            assert digest == prior['output_sha256'], r['id']
    assert accepted == 25
    assert all(g['url'] in files for g in games)
    print('PASS: 52 attempts, 25 accepted 1280x720 JPEGs, 27 retained images/fallbacks; current source hashes and all 127 catalog URLs unchanged.')
    print(f'Max recorded duration: {max(r["seconds"] for r in rows):.2f}s (180s input deadline plus receipt bookkeeping).')


if __name__ == '__main__':
    main()

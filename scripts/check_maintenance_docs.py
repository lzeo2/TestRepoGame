#!/usr/bin/env python3
"""Refresh the Git-backed maintenance inventory or check documentation coverage."""
import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / 'docs/maintenance/inventory.json'
SECTIONS = ('Identity and status', 'Implementation map', 'Gameplay and controls',
            'State and persistence', 'Dependencies and provenance', 'Audit findings',
            'Safe iteration', 'Verification', 'Future outlook')


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True)


def inventory():
    catalog = json.loads((ROOT / 'games.json').read_text())
    grouped = {}
    blobs = {}
    for row in git('ls-tree', '-rlz', 'HEAD', 'Games').split('\0'):
        if not row:
            continue
        meta, path = row.split('\t', 1)
        mode, kind, oid, size = meta.split()
        if kind != 'blob':
            continue
        directory = '/'.join(path.split('/')[:2])
        grouped.setdefault(directory, []).append((path, int(size)))
        blobs[path] = oid
    registered = {'/'.join(g['url'].split('/')[:2]): g for g in catalog}
    assert len(registered) == len(catalog), 'Multiple entries share a game directory.'
    assert all(g['url'] in blobs for g in catalog), 'Catalog entry missing from Git.'
    games = []
    for directory, files in sorted(grouped.items()):
        if directory == 'Games/_emulatorjs':
            continue
        game = registered.get(directory)
        slug = re.sub(r'[^a-z0-9]+', '-', directory.split('/')[1].lower()).strip('-')
        doc = f"docs/maintenance/games/{game['id']:03d}-{slug}.md" if game else f'docs/maintenance/games/unregistered-{slug}.md'
        entry = game['url'] if game else next((p for p, _ in files if p == directory + '/index.html'), None)
        games.append({'directory': directory, 'id': game['id'] if game else None,
                      'title': game['title'] if game else directory.split('/')[1],
                      'registered': bool(game), 'entry': entry,
                      'entry_blob': blobs.get(entry), 'tree': git('rev-parse', f'HEAD:{directory}').strip(),
                      'files': len(files), 'bytes': sum(size for _, size in files), 'document': doc})
    return {'catalog_entries': len(catalog), 'games': games,
            'shared_runtime': {'directory': 'Games/_emulatorjs',
                               'files': len(grouped.get('Games/_emulatorjs', [])),
                               'bytes': sum(n for _, n in grouped.get('Games/_emulatorjs', []))}}


def check():
    recorded = json.loads(INVENTORY.read_text())
    assert recorded == inventory(), 'Inventory stale: inspect changes, then run --refresh.'
    game_ids = [g['id'] for g in recorded['games'] if g['registered']]
    assert len(game_ids) == len(set(game_ids)) == recorded['catalog_entries']
    documents = [g['document'] for g in recorded['games']]
    assert len(documents) == len(set(documents))
    failures = []
    for game in recorded['games']:
        path = ROOT / game['document']
        if not path.is_file():
            failures.append(f"Missing {game['document']}")
            continue
        text = path.read_text()
        marker = f"<!-- maintenance-game: {game['directory']} -->"
        if marker not in text:
            failures.append(f'{path.relative_to(ROOT)}: wrong/missing identity marker')
        for section in SECTIONS:
            if f'## {section}' not in text:
                failures.append(f'{path.relative_to(ROOT)}: missing {section}')
    if failures:
        raise AssertionError('\n'.join(failures))
    print(f"PASS: {len(documents)} game documents cover {len(game_ids)} registered + {len(documents)-len(game_ids)} unregistered games; Git inventory current.")
    print('Coverage only: section presence does not certify documentation accuracy or gameplay.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    if args.refresh:
        INVENTORY.parent.mkdir(parents=True, exist_ok=True)
        data = inventory()
        INVENTORY.write_text(json.dumps(data, indent=2) + '\n')
        print(f"Inventory: {len(data['games'])} games, {data['catalog_entries']} registered; shared runtime separate.")
    else:
        check()


if __name__ == '__main__':
    main()

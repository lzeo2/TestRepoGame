"""Read-only Git evidence collector. Run from repository root; writes only this lane."""
import json
import pathlib
import re
import subprocess
import posixpath

OUT = pathlib.Path('docs/maintenance/audits/registered-review/lane6')

def git(*args):
    return subprocess.check_output(['git', *args], text=True)

head = git('rev-parse', 'HEAD').strip()
catalog = json.loads(git('show', head + ':games.json'))
inventory = json.loads(git('show', head + ':docs/maintenance/inventory.json'))
tracked = set(git('ls-tree', '-r', '--name-only', head).splitlines())
rows = []
for game in catalog[107:]:
    directory = game['url'].rsplit('/', 1)[0]
    records = git('ls-tree', '-r', '-l', head, '--', directory).splitlines()
    paths = [r.split('\t', 1)[1] for r in records]
    old = next((r for r in inventory['games'] if r['directory'] == directory), None)
    entry = git('rev-parse', head + ':' + game['url']).strip()
    tree = git('rev-parse', head + ':' + directory).strip()
    manual = old['document'] if old else next((p for p in tracked if p.startswith('docs/maintenance/games/' + str(game['id']).zfill(3) + '-')), None)
    hits = []
    scanned = []
    refs = []
    for path in paths:
        if not path.endswith(('.js', '.mjs', '.html', '.css')):
            continue
        if re.search(r'/(tests?|verification|previews|models)/|(?:-test|-check|-qa)\.', path):
            continue
        text = git('show', head + ':' + path)
        scanned.append(path)
        for m in re.finditer(r'localStorage|sessionStorage|document\.cookie|indexedDB|EJS_STORAGE|\b(?:getItem|setItem|removeItem)\s*\(', text):
            hits.append({'file': path, 'line': text.count('\n', 0, m.start()) + 1, 'offset': m.start(), 'token': m.group()})
        # Literal dependency references only, not a dynamic-loader closure proof.
        patterns = [r'(?:src|href)\s*=\s*[\"\']([^\"\']+)[\"\']', r'\bfrom\s*[\"\']([^\"\']+)[\"\']', r'\bimport\s*[\"\']([^\"\']+)[\"\']', r'url\([\"\']?([^\"\')]+)']
        if '/vendor/' in path or len(text) > 300000:
            continue
        for pattern in patterns:
            for m in re.finditer(pattern, text):
                ref = m.group(1)
                if not ref or re.search(r'^(?:https?:|data:|blob:|#|mailto:)', ref) or '${' in ref or '<' in ref:
                    continue
                target = posixpath.normpath(posixpath.join(posixpath.dirname(path), ref.split('?')[0].split('#')[0])) if not ref.startswith('/') else ref.lstrip('/')
                if ref.startswith(('.', '/')) or re.search(r'\.(?:js|mjs|css|png|svg|jpg|woff2)$', ref):
                    refs.append({'from': path, 'reference': ref, 'target': target, 'tracked': target in tracked})
    rows.append({'id': game['id'], 'title': game['title'], 'entry': game['url'], 'load': 'NOT VERIFIED', 'reload': 'NOT VERIFIED', 'current_entry_blob': entry, 'current_tree': tree, 'files': len(paths), 'bytes': sum(int(r.split('\t')[0].split()[-1]) for r in records), 'inventory': old, 'inventory_entry_matches': bool(old and old['entry_blob'] == entry), 'inventory_tree_matches': bool(old and old['tree'] == tree), 'manual': manual, 'scan_files': scanned, 'storage_api_occurrences': hits, 'literal_references': refs, 'provenance_anchors': [p for p in paths if re.search(r'(?:CREDITS|LICENSE|License|README)\.', p) or p.endswith('/LICENSE')]})
assert len(rows) == 22 and rows[-1]['id'] == 1
result = {'head': head, 'catalog_count': len(catalog), 'slice': '[107:]', 'runtime_checks': 0, 'limits': 'Token/literal scans are not exhaustive semantic caller or dynamic asset closure proofs. Vendor/compiled internals and binary gameplay are not fully read. No cookie path inferred from unrelated library APIs.', 'games': rows}
data = json.dumps(result, indent=2) + '\n'
assert len(data.encode()) < 220000
(OUT / 'evidence.json').write_text(data)
print(f'PASS: {len(rows)} rows; {len(data.encode())} evidence bytes; {sum(r["inventory_tree_matches"] for r in rows)} matching inventory trees')
print('Missing manuals:', [r['id'] for r in rows if not r['manual']])
print('Stale/missing inventory:', [r['id'] for r in rows if not r['inventory_tree_matches']])
print('Literal reference candidates:', [(r['id'], x['target']) for r in rows for x in r['literal_references'] if not x['tracked']][:30])

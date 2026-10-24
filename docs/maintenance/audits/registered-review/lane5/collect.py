"""Bounded Git-only lane 5 evidence. No game execution or materialization."""
import json
import posixpath
import re
import subprocess
from pathlib import Path
from urllib.parse import unquote

OUT = Path(__file__).parent
HEAD = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
def git(*args):
    return subprocess.check_output(['git', *args])
def text(path):
    return git('show', HEAD + ':' + path).decode('utf-8', errors='replace')
def safe(s):
    s = re.sub(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', '[contact withheld]', s)
    return re.sub(r'/(?:home|Users)/[^\s\"\'<>]+', '[host path withheld]', s)
def anchor(path, source, offset):
    line = source.count('\n', 0, offset) + 1
    col = offset - source.rfind('\n', 0, offset)
    return f'{path}:{line}:{col}'

catalog = json.loads(text('games.json'))
assert len(catalog) == 129
assigned = catalog[86:107]
assert [g['id'] for g in assigned] == list(range(196, 217))
inventory = json.loads(text('docs/maintenance/inventory.json'))
tracked = set(git('ls-tree', '-r', '--name-only', HEAD).decode().splitlines())
rows = []
storage = re.compile(r'localStorage|sessionStorage|document\.cookie|indexedDB|\b(?:GetSetting|SetSetting|GetStatistic|GetStatisticString|SetStatistic|saveEloRating|addWinPoints|addLosePoints|bestKey)\s*\(|Dom\.storage|config\.sync\(')
gameplay = re.compile(r'\b(?:startGame|newGame|resetGame|reloadLevel|loadLevel|checkWin|performMove|isValidMove|commitWord|startGame|winGame|loseGame|restartGame|StartAGame|showResult|setupStartButton|calculateScore|initializeGame|restart|reset|keydown|touchstart|pointerdown)\b')
for g in assigned:
    inv = next(x for x in inventory['games'] if x['id'] == g['id'])
    d = inv['directory']
    listing = git('ls-tree', '-rl', HEAD, '--', d).decode().splitlines()
    files = []
    for item in listing:
        meta, p = item.split('\t', 1)
        mode, kind, blob, size = meta.split()
        files.append({'path': p, 'blob': blob, 'bytes': int(size)})
    tree = git('rev-parse', HEAD + ':' + d).decode().strip()
    entry_blob = git('rev-parse', HEAD + ':' + g['url']).decode().strip()
    comparisons = {'tree': tree == inv['tree'], 'entry_blob': entry_blob == inv['entry_blob'], 'files': len(files) == inv['files'], 'bytes': sum(x['bytes'] for x in files) == inv['bytes']}
    sources = {f['path']: text(f['path']) for f in files if f['path'].endswith(('.js', '.html', '.css', '.gltf'))}
    saves, play, refs, opaque = [], [], [], []
    for p, s in sources.items():
        vendor = bool(re.search(r'(jquery|p5\.min|ammo\.js|three\.js|GLTFLoader|/lib/require|vector_battle)', p))
        if vendor or any(len(l) > 1500 for l in s.splitlines()):
            opaque.append(p)
        for m in storage.finditer(s):
            a, b = max(s.rfind('\n', 0, m.start()) + 1, m.start() - 100), s.find('\n', m.end())
            if b < 0:
                b = len(s)
            saves.append({'anchor': anchor(p, s, m.start()), 'token': m.group(), 'context': safe(s[a:min(b, m.end() + 180)]), 'vendor_or_library': vendor})
        if not vendor:
            matches = list(gameplay.finditer(s))
            # Full function/member occurrence positions, no engine source dumps.
            play.extend({'anchor': anchor(p, s, m.start()), 'token': m.group()} for m in matches)
        patterns = []
        if p.endswith('.html'):
            patterns.append(re.compile(r'\b(?:src|href|data-main)\s*=\s*[\"\']([^\"\']+)[\"\']', re.I))
        if p.endswith(('.css', '.html')):
            patterns.append(re.compile(r'url\(\s*[\"\']?([^\"\')\s]+)', re.I))
        if not vendor and p.endswith('.js'):
            patterns.append(re.compile(r'[\"\']([^\"\'\n]+\.(?:png|jpg|jpeg|svg|wav|mp3|ogg|ttf|gltf|bin|html|css))[\"\']'))
        if p.endswith('.gltf'):
            patterns.append(re.compile(r'"uri"\s*:\s*"([^"]+)"'))
        for pattern in patterns:
            for m in pattern.finditer(s):
                ref = m.group(1)
                if ref.startswith(('data:', '#', 'javascript:')):
                    continue
                if re.match(r'(?:https?:)?//', ref):
                    refs.append({'anchor': anchor(p, s, m.start()), 'reference': safe(ref), 'status': 'external reference; navigation versus runtime requires context'})
                    continue
                base = posixpath.dirname(p) if p.endswith(('.css', '.html', '.gltf')) else d
                target = posixpath.normpath(posixpath.join(base, unquote(ref.split('#')[0].split('?')[0])))
                if ref.startswith('/'):
                    target = ref.lstrip('/')
                if 'data-main' in m.group() and not target.endswith('.js'):
                    target += '.js'
                if target.endswith('/') or ref in ('.', './'):
                    target = target.rstrip('/') + '/index.html'
                refs.append({'anchor': anchor(p, s, m.start()), 'reference': safe(ref), 'resolved': target, 'status': 'tracked' if target in tracked else 'unresolved literal; inspect construction/context, not sparse absence'})
    credits = text(d + '/CREDITS.md')
    license_text = text(d + '/LICENSE')
    rows.append({'id': g['id'], 'title': g['title'], 'entry': g['url'], 'directory': d, 'manual': inv['document'], 'manual_blob': git('rev-parse', HEAD + ':' + inv['document']).decode().strip(), 'inventory': inv, 'current_tree': tree, 'current_entry_blob': entry_blob, 'inventory_comparison': comparisons, 'tracked_files': files, 'storage_and_helper_occurrences': saves, 'gameplay_occurrences': play, 'literal_asset_references': refs, 'opaque_or_vendor_partial_review': opaque, 'credits': safe(credits), 'license_anchor': d + '/LICENSE:1', 'license_blob': git('rev-parse', HEAD + ':' + d + '/LICENSE').decode().strip(), 'license_header': safe('\n'.join(license_text.splitlines()[:6]))})
result = {'source_head': HEAD, 'catalog_count': len(catalog), 'slice': '[86:107]', 'inventory_catalog_count': inventory['catalog_entries'], 'runtime_checks': 0, 'load': 'NOT VERIFIED', 'reload': 'NOT VERIFIED', 'method': 'Git blobs only. Literal reference resolution is not complete dynamic/offline closure. Occurrences are source evidence, not execution. Vendor helper presence is not a game save caller. All manuals read; bounded current-source review, not complete engine review.', 'games': rows}
encoded = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
assert len(encoded.encode()) < 250 * 1024, len(encoded.encode())
(OUT / 'source-evidence.json').write_text(encoded)
print(f'SOURCE EVIDENCE: {len(rows)} rows; {len(encoded.encode())} bytes; inventory matches {sum(all(r["inventory_comparison"].values()) for r in rows)}/21; runtime 0')
for r in rows:
    unresolved = [x for x in r['literal_asset_references'] if x['status'] != 'tracked']
    print(r['id'], 'files', len(r['tracked_files']), 'storage occurrences', len(r['storage_and_helper_occurrences']), 'unresolved literals', len(unresolved))
    for x in unresolved[:8]:
        print(' ', x)

#!/usr/bin/env python3
"""Read a frozen Git tree, not the sparse worktree. Candidates are not findings."""
import argparse
import codecs
import collections
from html.parser import HTMLParser
import json
import posixpath
import re
import subprocess
import sys
import time
from urllib.parse import unquote, urlsplit

EXTENSIONS = {'.html', '.htm', '.js', '.mjs', '.cjs', '.css', '.json', '.toml', '.py', '.sh'}
CHUNK = 128 * 1024
OVERLAP = 4096
PARSE_CAP = 512 * 1024
PATTERNS = {
    'url_literal': re.compile(r'(?:https?|wss?)://[^\s\"\'<>]{1,200}'),
    'network_literal': re.compile(r'(?:fetch|WebSocket|EventSource|importScripts)\s*\(\s*[\"\'](?:https?:|wss?:|//)'),
    'unsafe_sink_candidate': re.compile(r'\b(?:eval\s*\(|innerHTML\s*=|outerHTML\s*=|document\.write\s*\(|insertAdjacentHTML\s*\()'),
    'network_api': re.compile(r'\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon\s*\(|RTCPeerConnection)'),
    'dynamic_loader': re.compile(r'(?:createElement\s*\(\s*[\"\'](?:script|iframe)|importScripts\s*\(|import\s*\()'),
    'storage': re.compile(r'\b(?:localStorage|sessionStorage|indexedDB)\b'),
    'loop_or_timer': re.compile(r'\b(?:requestAnimationFrame|setInterval|setTimeout)\s*\('),
    'absolute_machine_path': re.compile(r'(?:/home/[^\s\"\']+|[A-Za-z]:\\\\[^\s\"\']+)'),
    # Never print the matched credential or its surrounding source.
    'credential_candidate_redacted': re.compile(r'\b(?:ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16})\b'),
}


def git(*args):
    return subprocess.check_output(['git', *args])


def resolve_reference(source, value, base=None):
    """Classify a browser URL; local return values are repo-relative paths."""
    value = value.strip()
    if not value or value.startswith('#'):
        return 'fragment', None
    if value.startswith('//'):
        return 'external', None
    parsed = urlsplit(value)
    if parsed.scheme:
        return ('external' if parsed.scheme.lower() in ('http', 'https', 'ws', 'wss') else 'scheme'), None
    path = unquote(parsed.path)
    if not path:
        return 'fragment', None
    if '\\' in path or any(ord(c) < 32 for c in path):
        return 'ambiguous', None
    if base:
        kind, base_path = resolve_reference(source, base)
        if kind != 'local':
            return 'base-dependent', None
        directory = posixpath.dirname(base_path)
    else:
        directory = posixpath.dirname(source)
    resolved = posixpath.normpath(path.lstrip('/') if path.startswith('/') else posixpath.join(directory, path))
    if resolved == '..' or resolved.startswith('../'):
        return 'escape', None
    if path.endswith('/'):
        resolved += '/index.html'
    return 'local', resolved


def self_test():
    source = 'Games/Space Game/index.html'
    cases = [('main.js?v=1#x', ('local', 'Games/Space Game/main.js')),
             ('/assets/a.js', ('local', 'assets/a.js')),
             ('../Space%20Game/main.js', ('local', 'Games/Space Game/main.js')),
             ('//cdn.invalid/a.js', ('external', None)),
             ('https://cdn.invalid/a.js', ('external', None)),
             ('data:image/png;base64,x', ('scheme', None)),
             ('#help', ('fragment', None)),
             ('../../../outside.js', ('escape', None)),
             ('%2e%2e/%2e%2e/%2e%2e/a.js', ('escape', None))]
    for value, expected in cases:
        assert resolve_reference(source, value) == expected, (value, expected)
    assert resolve_reference(source, 'main.js', '/assets/') == ('local', 'assets/main.js')
    assert resolve_reference(source, 'main.js', 'https://cdn.invalid/') == ('base-dependent', None)
    assert resolve_reference(source, 'a\\b.js') == ('ambiguous', None)
    parser = Page()
    parser.feed('<!-- <script src="https://cdn.invalid/x"></script> --><script type="application/ld+json">{}</script><script>var x=1;</script>')
    assert not parser.refs and len(parser.scripts) == 1
    print('PASS: URL resolver and HTML comment/JSON-LD self-test')


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs = []
        self.scripts = []
        self.base = None
        self.script = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        line = self.getpos()[0]
        if tag == 'base' and self.base is None:
            self.base = attrs.get('href')
        attributes = {'script': ('src',), 'iframe': ('src',), 'img': ('src',),
                      'audio': ('src',), 'video': ('src', 'poster'),
                      'source': ('src',), 'link': ('href',), 'object': ('data',)}
        for attr in attributes.get(tag, ()):
            if attrs.get(attr):
                self.refs.append((line, tag, attr, attrs[attr], attrs.get('rel', '')))
        if tag == 'script':
            typ = attrs.get('type', '').lower()
            if not attrs.get('src') and typ in ('', 'text/javascript', 'application/javascript', 'module'):
                self.script = [line, typ == 'module', '']

    def handle_data(self, data):
        if self.script is not None:
            self.script[2] += data

    def handle_endtag(self, tag):
        if tag == 'script' and self.script is not None:
            self.scripts.append(self.script)
            self.script = None


def safe_path(path):
    if '/home/' in path or '@' in path or re.search(r'[A-Za-z]:\\', path):
        return '[redacted path]'
    return path[:300]


def node_check(text, module):
    command = ['node', '--check'] + (['--input-type=module'] if module else [])
    try:
        result = subprocess.run(command, input=text.encode('utf-8'), capture_output=True, timeout=5)
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 'unavailable', type(exc).__name__
    # Node diagnostics can echo sensitive source. Emit only the error class/message.
    error = re.search(r'(?:SyntaxError|ReferenceError|Error):[^\n]+', result.stderr.decode('utf-8', 'replace'))
    return ('pass' if result.returncode == 0 else 'fail'), (error.group(0).split(':', 1)[0] if error else '')


def scan(revision, syntax):
    started = time.monotonic()
    revision = git('rev-parse', revision).decode().strip()
    records = []
    for row in git('ls-tree', '-rlz', revision).split(b'\0'):
        if not row:
            continue
        meta, raw_path = row.split(b'\t', 1)
        mode, kind, oid, size = meta.split()
        if kind == b'blob':
            records.append((raw_path.decode('utf-8', 'surrogateescape'), oid.decode(), int(size)))
    tracked = {p for p, _, _ in records}
    counts = collections.Counter()
    patterns = []
    references = []
    syntax_results = []
    excluded = collections.defaultdict(lambda: [0, 0])
    scanned_extensions = collections.defaultdict(lambda: [0, 0])
    duplicates = collections.defaultdict(list)
    batch = subprocess.Popen(['git', 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    catalog = None
    skipped_parse = []
    for path, oid, size in records:
        duplicates[(oid, size)].append(path)
        extension = posixpath.splitext(path)[1].lower()
        if extension not in EXTENSIONS:
            excluded[extension or '(no extension)'][0] += 1
            excluded[extension or '(no extension)'][1] += size
            continue
        batch.stdin.write((oid + '\n').encode())
        batch.stdin.flush()
        header = batch.stdout.readline().split()
        assert header[1] == b'blob' and int(header[2]) == size
        decoder = codecs.getincrementaldecoder('utf-8')('replace')
        remaining = size
        tail = ''
        line = 1
        total_chars = 0
        processed_chars = 0
        found = collections.defaultdict(lambda: {'count': 0, 'lines': []})
        small = [] if size <= PARSE_CAP else None
        while remaining:
            raw = batch.stdout.read(min(CHUNK, remaining))
            assert raw
            remaining -= len(raw)
            text = decoder.decode(raw, final=remaining == 0)
            if small is not None:
                small.append(text)
            window = tail + text
            boundary = total_chars - len(tail)
            base_line = line - tail.count('\n')
            valid_until = boundary + len(window) - (OVERLAP if remaining else 0)
            for name, regex in PATTERNS.items():
                for match in regex.finditer(window):
                    # Delay the final overlap so split tokens are counted once.
                    if not processed_chars <= boundary + match.start() < valid_until:
                        continue
                    value = found[name]
                    value['count'] += 1
                    if len(value['lines']) < 3:
                        value['lines'].append(base_line + window.count('\n', 0, match.start()))
            processed_chars = max(processed_chars, valid_until)
            line += text.count('\n')
            total_chars += len(text)
            tail = window[-OVERLAP:]
        assert batch.stdout.read(1) == b'\n'
        counts['scanned_files'] += 1
        counts['scanned_bytes'] += size
        scanned_extensions[extension][0] += 1
        scanned_extensions[extension][1] += size
        if path.startswith('Games/'):
            counts['game_scanned_files'] += 1
            counts['game_scanned_bytes'] += size
        if '\ufffd' in tail:
            counts['files_with_replacement_in_final_window'] += 1
        if found:
            patterns.append({'path': safe_path(path), 'hits': dict(found)})
        if small is None:
            if extension in ('.html', '.htm', '.js', '.mjs', '.cjs'):
                skipped_parse.append({'path': safe_path(path), 'bytes': size, 'reason': 'over 512 KiB parse cap; chunk-pattern scan only'})
            continue
        text = ''.join(small)
        if path == 'games.json':
            catalog = json.loads(text)
        if extension in ('.html', '.htm'):
            page = Page()
            page.feed(text)
            for ref_line, tag, attr, value, rel in page.refs:
                kind, local = resolve_reference(path, value, page.base)
                if kind == 'external' or kind == 'local' and local not in tracked:
                    references.append({'path': safe_path(path), 'line': ref_line, 'tag': tag, 'attribute': attr,
                                       'rel': rel, 'classification': 'external_resource' if kind == 'external' else 'missing_literal_local',
                                       'target': safe_path(local) if local else '[external URL omitted]'})
            if syntax:
                for script_line, module, script in page.scripts:
                    if script.strip():
                        status, error = node_check(script, module)
                        syntax_results.append({'path': safe_path(path), 'line': script_line, 'kind': 'inline module' if module else 'inline classic', 'status': status, 'error': error})
        elif syntax and extension in ('.js', '.mjs', '.cjs'):
            # Bounded bootstrap/site selection; no implication that small means authored.
            selected = path.startswith(('assets/', 'uv/', 'netlify/')) or posixpath.basename(path) in ('script.js', 'main.js', 'boot.js', 'game.js', 'loader.js')
            if selected and size <= 128 * 1024:
                module = extension == '.mjs' or bool(re.search(r'^\s*(?:import\s+(?!\()|export\s+)', text, re.M))
                status, error = node_check(text, module)
                syntax_results.append({'path': safe_path(path), 'line': 1, 'kind': 'file module' if module else 'file classic', 'status': status, 'error': error})
    batch.stdin.close()
    batch.stdout.close()
    assert batch.wait(timeout=5) == 0
    assert catalog is not None
    ids = [g['id'] for g in catalog]
    schema_errors = [g.get('id') for g in catalog if not {'id', 'title', 'cat', 'icon', 'desc', 'url', 'featured'} <= g.keys() or type(g.get('id')) is not int or not isinstance(g.get('featured'), bool) or any(not isinstance(g.get(k), str) for k in ('title', 'cat', 'icon', 'desc', 'url'))]
    catalog_missing = [safe_path(g['url']) for g in catalog if g['url'] not in tracked]
    game_dirs = sorted({'/'.join(p.split('/')[:2]) for p in tracked if p.startswith('Games/')})
    registered = {'/'.join(g['url'].split('/')[:2]) for g in catalog}
    duplicate_groups = [{'bytes_each': size, 'copies': len(paths), 'duplicate_bytes': size * (len(paths) - 1), 'paths': [safe_path(p) for p in paths[:8]], 'paths_truncated': len(paths) > 8}
                        for (_, size), paths in duplicates.items() if len(paths) > 1 and size >= 1024]
    duplicate_groups.sort(key=lambda item: item['duplicate_bytes'], reverse=True)
    return {'source_commit': revision, 'method': 'Git ls-tree -rlz metadata; cat-file batch; 128 KiB incremental UTF-8 windows; 4 KiB overlap; no checkout',
            'tracked_blobs': len(records), 'tracked_bytes': sum(s for _, _, s in records), 'coverage': dict(counts),
            'scanned_extensions': dict(sorted(scanned_extensions.items())),
            'excluded_extensions': dict(sorted(excluded.items())), 'parse_cap_exclusions': skipped_parse,
            'catalog': {'entries': len(catalog), 'unique_ids': len(set(ids)), 'schema_errors': schema_errors, 'missing_urls': catalog_missing,
                        'game_directories_including_infrastructure': len(game_dirs), 'unregistered': sorted(set(game_dirs) - registered - {'Games/_emulatorjs'})},
            'pattern_candidates': patterns, 'html_reference_candidates': references, 'syntax_results': syntax_results,
            'syntax_summary': dict(collections.Counter(r['status'] for r in syntax_results)),
            'duplicate_groups': duplicate_groups[:30], 'duplicate_groups_total': len(duplicate_groups),
            'identical_blob_duplicate_bytes_ge_1KiB': sum(g['duplicate_bytes'] for g in duplicate_groups),
            'limitations': ['Machine candidates require human data-flow triage; comments and dormant vendor paths are not runtime evidence.',
                            'HTML literal references only; no srcset, CSS asset closure, computed JS imports, rewrite routing, binary/decompressed engine inspection or secret certification.',
                            'Reference resolution does not model redirect endpoints or JavaScript DOM mutations.',
                            'Pattern windows cannot certify absence of obfuscated or longer-than-overlap constructs; invalid UTF-8 is replacement-decoded.',
                            'Node syntax only for HTML inline JS and selected JS bootstrap/site files; module mode inferred, not browser execution.',
                            'No native browser checks, screenshots, gameplay, performance, licensing or release certification.'],
            'elapsed_seconds': round(time.monotonic() - started, 2)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', default='HEAD')
    parser.add_argument('--output', help='JSON output path; stdout when omitted')
    parser.add_argument('--syntax', action='store_true', help='bounded Node stdin parser checks, no execution')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    result = scan(args.revision, args.syntax)
    encoded = json.dumps(result, ensure_ascii=True, indent=2) + '\n'
    if args.output:
        if len(encoded.encode('utf-8')) > 1024 * 1024:
            raise ValueError('Evidence exceeds 1 MiB; use stdout and review before committing.')
        with open(args.output, 'w', encoding='utf-8') as stream:
            stream.write(encoded)
        print(json.dumps({k: result[k] for k in ('source_commit', 'coverage', 'catalog', 'syntax_summary', 'elapsed_seconds')}))
        print(f'Evidence: {len(encoded.encode())} bytes')
    else:
        sys.stdout.write(encoded)


if __name__ == '__main__':
    main()

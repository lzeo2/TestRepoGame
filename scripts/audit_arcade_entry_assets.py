#!/usr/bin/env python3
"""Audit literal entry HTML script/styles only; no checkout, dependencies or network.

Run: python3 -B scripts/audit_arcade_entry_assets.py [--ref HEAD]
Output JSON distinguishes missing project-relative assets from external and
origin-root paths (which may work on root hosting but escape GitHub Pages' prefix).
Dynamic imports, CSS URLs, workers, manifests, engine assets and gameplay are
outside scope. Character AI is deliberately never opened.
"""
import argparse
from collections import Counter
from html.parser import HTMLParser
import json
import posixpath
import subprocess
from urllib.parse import unquote, urljoin, urlsplit


class Entry(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.assets = []
        self.base = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'base' and self.base is None and 'href' in attrs:
            self.base = attrs['href']
        if tag == 'script' and 'src' in attrs:
            self.assets.append(('script', attrs['src']))
        if tag == 'link' and 'stylesheet' in attrs.get('rel', '').lower().split() and 'href' in attrs:
            self.assets.append(('stylesheet', attrs['href']))


def git(*args):
    return subprocess.check_output(['git', *args])


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--ref', default='HEAD')
    cli.add_argument('--project-prefix', default='/TestRepoGame/')
    args = cli.parse_args()
    prefix = '/' + args.project_prefix.strip('/') + '/'
    origin = 'https://entry-audit.invalid'
    tracked = set(git('ls-tree', '-rz', '--name-only', args.ref).decode().split('\0'))
    catalog = json.loads(git('show', f'{args.ref}:games.json'))
    counts = Counter()
    findings = []
    for game in catalog:
        entry = game['url']
        if entry.startswith('Games/Character AI/'):
            counts['protected_entries_skipped'] += 1
            continue
        if not entry.lower().endswith(('.html', '.htm')):
            counts['non_html_entries_skipped'] += 1
            continue
        counts['html_entries_scanned'] += 1
        parser = Entry()
        parser.feed(git('show', f'{args.ref}:{entry}').decode('utf-8', errors='replace'))
        document_url = origin + prefix + entry
        base = urljoin(document_url, parser.base) if parser.base is not None else document_url
        for kind, literal in parser.assets:
            counts['literal_assets'] += 1
            record = dict(entry=entry, kind=kind, literal=literal)
            raw = literal.strip()
            resolved = urlsplit(urljoin(base, raw))
            if not raw or any(token in raw for token in ('${', '{{', '<%')):
                status = 'ambiguous'
            elif resolved.scheme not in ('http', 'https'):
                status = 'non_http'
            elif resolved.netloc != 'entry-audit.invalid':
                status = 'external'
            else:
                path = posixpath.normpath(unquote(resolved.path))
                if path.startswith(prefix):
                    candidate = path[len(prefix):]
                    status = 'tracked' if candidate in tracked else 'missing'
                else:
                    candidate = path.lstrip('/')
                    status = 'origin_root_outside_project'
                record['resolved_path'] = path
                record['repository_candidate'] = candidate
                record['candidate_tracked'] = candidate in tracked
            counts[status] += 1
            if status != 'tracked':
                record['status'] = status
                findings.append(record)
    print(json.dumps(dict(ref=git('rev-parse', args.ref).decode().strip(),
                         project_prefix=prefix, catalog_entries=len(catalog),
                         counts=dict(sorted(counts.items())), findings=findings), indent=2))


if __name__ == '__main__':
    main()

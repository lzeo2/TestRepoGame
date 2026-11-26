#!/usr/bin/env python3
"""Inventory entry-level mobile and accessibility characteristics from Git."""
import argparse
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path


class Entry(HTMLParser):
    def __init__(self):
        super().__init__()
        self.language = ''
        self.viewport = ''
        self.has_title = False
        self.canvas = False
        self.frameset = False

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'html':
            self.language = values.get('lang') or ''
        elif tag == 'title':
            self.has_title = True
        elif tag == 'meta' and (values.get('name') or '').lower() == 'viewport':
            self.viewport = (values.get('content') or '').lower()
        elif tag == 'frameset':
            self.frameset = True
        elif tag == 'canvas':
            self.canvas = True


def git(*args):
    return subprocess.check_output(['git', *args])


def audit(ref):
    inventory = json.loads(git('show', ref + ':docs/maintenance/inventory.json'))
    results = []
    for game in inventory['games']:
        row = {key: game[key] for key in ('directory', 'id', 'entry')}
        results.append(row)
        if game['directory'] == 'Games/Character AI' or not game['entry']:
            row['coverage'] = 'protected' if game['entry'] else 'no canonical entry'
            continue
        entry = Entry()
        entry.feed(git('show', ref + ':' + game['entry']).decode('utf-8', errors='replace'))
        row.update(coverage='HTML entry', language=bool(entry.language), title=entry.has_title,
                   viewport=bool(entry.viewport), fixed_zoom=bool(re.search(
                       r'user-scalable\s*=\s*(?:no|0)(?:\s*[,;]|\s*$)|maximum-scale\s*=\s*1(?:\.0+)?(?:\s*[,;]|\s*$)',
                       entry.viewport)), frameset=entry.frameset, canvas_in_markup=entry.canvas)
    tested = [r for r in results if r['coverage'] == 'HTML entry']
    return {'revision': git('rev-parse', ref).decode().strip(), 'projects': len(results),
            'inspectedEntries': len(tested), 'missingLanguage': sum(not r['language'] for r in tested),
            'missingViewport': sum(not r['viewport'] for r in tested),
            'fixedZoom': sum(r['fixed_zoom'] for r in tested),
            'framesets': sum(r['frameset'] for r in tested), 'games': results}


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--ref', default='HEAD')
    cli.add_argument('--output', type=Path, help='optional detailed JSON output path')
    args = cli.parse_args()
    result = audit(args.ref)
    if args.output:
        args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'games'}))

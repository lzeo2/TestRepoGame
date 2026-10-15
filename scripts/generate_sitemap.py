#!/usr/bin/env python3
"""Generate the committed sitemap from games.json; no checkout/build/CI required."""
import argparse
import json
from pathlib import Path
import subprocess
from urllib.parse import quote, unquote, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://lzeo2.github.io/TestRepoGame/'
NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'


def sitemap():
    tracked = set(subprocess.check_output(
        ['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0'))
    games = json.loads((ROOT / 'games.json').read_text())
    ids = set()
    urls = [BASE]
    for game in games:
        if not {'id', 'title', 'cat', 'icon', 'desc', 'url', 'featured'} <= game.keys():
            raise ValueError('Missing catalog fields')
        if type(game['id']) is not int or game['id'] in ids:
            raise ValueError('Invalid or duplicate catalog ID')
        ids.add(game['id'])
        parsed = urlsplit(game['url'])
        path = unquote(parsed.path).removeprefix('./')
        if (parsed.scheme or parsed.netloc or parsed.query or parsed.fragment or
                not path.startswith('Games/') or '\\' in path or
                any(part in ('.', '..', '') for part in path.split('/')) or
                any(ord(c) < 32 or ord(c) == 127 for c in path) or path not in tracked):
            raise ValueError('Not a tracked local game entry: ' + game['url'])
        urls.append(BASE + quote(path, safe='/'))
    if len(set(urls)) != len(urls):
        raise ValueError('Duplicate sitemap URL')
    ET.register_namespace('', NS)
    root = ET.Element('{' + NS + '}urlset')
    for url in urls:
        entry = ET.SubElement(root, '{' + NS + '}url')
        ET.SubElement(entry, '{' + NS + '}loc').text = url
    ET.indent(root, space='  ')
    return ET.tostring(root, encoding='utf-8', xml_declaration=True) + b'\n', len(games)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='fail if sitemap.xml is stale')
    args = parser.parse_args()
    content, count = sitemap()
    target = ROOT / 'sitemap.xml'
    if args.check:
        if not target.exists() or target.read_bytes() != content:
            raise SystemExit('FAIL sitemap.xml is stale; run scripts/generate_sitemap.py')
    else:
        target.write_bytes(content)
    print(f'PASS sitemap: {count} Git-backed game URLs + portal; base={BASE}')


if __name__ == '__main__':
    main()

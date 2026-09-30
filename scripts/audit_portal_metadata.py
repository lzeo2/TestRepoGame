#!/usr/bin/env python3
"""Read registered entry HTML from Git, without checking out Games/."""
import json
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit, urljoin

ROOT = Path(__file__).resolve().parents[1]


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.title = ''
        self.icons = []
        self.images = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title':
            self.in_title = True
        if tag == 'link' and 'icon' in attrs.get('rel', '').split():
            self.icons.append(attrs.get('href', ''))
        if tag == 'meta' and attrs.get('property') == 'og:image':
            self.images.append(attrs.get('content', ''))

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def main():
    tracked = set(subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0'))
    games = json.loads((ROOT / 'games.json').read_text())
    records = []
    for game in games:
        path = unquote(urlsplit(game['url']).path).removeprefix('./')
        source = subprocess.check_output(['git', 'show', f'HEAD:{path}'], cwd=ROOT).decode('utf-8', errors='replace')
        meta = Metadata()
        meta.feed(source)
        icons = []
        for href in meta.icons:
            parsed = urlsplit(href)
            local = not parsed.scheme and not parsed.netloc
            resolved = unquote(urlsplit(urljoin('/' + path, href)).path).lstrip('/')
            icons.append({'href': href, 'local': local, 'tracked': local and resolved in tracked})
        records.append({'id': game['id'], 'game': game['title'], 'url': game['url'],
                        'title': meta.title.strip(), 'icons': icons, 'og_images': meta.images})
    print(json.dumps(records, indent=2))


if __name__ == '__main__':
    main()

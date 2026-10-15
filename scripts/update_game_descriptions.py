#!/usr/bin/env python3
"""Check/apply reviewed static entry descriptions without reserializing HTML.

Reads existing worktree entries, otherwise HEAD blobs. --check never writes.
Apply excludes Character AI and the separately owned Wings/Jetpack Hacked trees.
See docs/maintenance/audits/fleet-followup-descriptions.md for review limits.
"""
import argparse
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import shutil
import subprocess
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PROTECTED = 'Games/Character AI/'
OTHER_OWNERS = ('Games/Wings/', 'Games/JetpackJoyrideHacked/')
# Replace inherited keyword stuffing/marketing with the reviewed catalog summary.
REPLACE = {10, 66, 211, 220, 233}
# Catalog claims narrowed where the existing manual contradicts or qualifies them.
DESCRIPTIONS = {
    4: 'Physics-based soccer with random elements.',
    5: 'Basketball with unpredictable physics.',
    6: 'Volleyball with physics-based movement.',
    7: 'Parkour platformer.',
    10: 'Chrome dinosaur runner: jump over obstacles and try to beat your distance.',
    48: 'Physics launch game: smash gummy bears, collect cash and buy upgrades.',
    50: 'Endless runner: dodge trains, jump, roll and switch lanes through San Francisco.',
    51: 'Tend a fire, gather resources and explore in a text adventure.',
    53: "Flipline Studios' time-management game: take orders, build pizzas, bake and serve them. Flash build hosted with local Ruffle.",
    54: "New Star Games' arcade football and franchise-management game, hosted as a local GameMaker HTML5 build.",
    55: 'SUPERHOT Unity WebGL port: movement and weapon encounters in slow motion.',
    56: "Flanne's ten-minute horde survival game with level-up upgrades, hosted as a Unity WebGL build.",
    57: 'Henry Stickmin prison-escape adventure with branching choices. Flash build hosted with local Ruffle.',
    58: 'Henry Stickmin airship-infiltration adventure with branching choices. Flash build hosted with local Ruffle.',
    59: "Mystman12's school exploration and notebook-math game with pursuit by Baldi. Unity WebGL build.",
    60: 'Babylon.js endless runner: turn, jump and slide through temple ruins.',
    63: 'Hand-drawn platform adventure hosted with local Ruffle.',
    64: 'Trap-filled platformer with checkpoints and level progression.',
    79: 'Click the cookie, buy buildings and grow production in an idle game.',
    80: 'A hub for Bloons TD 1-4, hosted with local Ruffle. Place towers to pop bloons.',
    81: 'Hold to drift and release to drive straight in an endless driving game.',
    87: 'Dogecoin-themed mining game with helpers, upgrades and new locations. Current build has a known script startup blocker.',
    89: 'Retro Bowl variant with increased coaching-credit and salary-cap values on save loading.',
    90: 'Cookie Clicker variant with recurring cookie top-ups.',
    94: 'Breakout variant awarding 1000 points per brick with recurring brick grids.',
    95: 'Snake variant with wall wrapping, collision disabled and 1000 points per food.',
    109: 'Doodle Jump variant with a forced 999999 score and fall-rescue behavior.',
    111: 'Subway Surfers variant with coin and collision-message overrides; complete invincibility is unverified.',
    115: 'Super Street Fighter II Turbo Revival, hosted with the local GBA emulator.',
    117: 'GBA kart racing hosted with the local emulator.',
    136: 'Deploy a squad of cats across five lanes and repel enemies from your base.',
    137: 'Five-lane cat defense variant with boosted coins and zero deployment costs.',
    154: 'Backgammon against a computer player with automatic dice and checker movement.',
    160: 'Maze chase: eat pellets and avoid four ghosts.',
    161: 'JIX drawing prototype with directional movement and a countdown. Territory capture and enemy gameplay are not implemented.',
    162: 'Physics-based rider combat with directional movement and flapping. Collision and scene-restart defects remain documented.',
    163: 'Local two-player light-cycle game: steer around trails using separate keyboard controls.',
    178: 'Draw-one Klondike with seven tableau piles, stock, waste, four foundations and undo.',
    179: 'Move cards to four foundations using eight cascades and four free cells, with undo and automatic moves.',
    193: 'Tile solitaire: match free pairs on a layered board, with hints and scoring.',
    203: 'Bowl down a 3D lane with physics-based pinfall and ten-frame scoring.',
    204: 'Four-player Hearts against computer opponents with running scores.',
    205: 'Ten-column Spider Solitaire with hints, undo and statistics.',
    208: 'Drive lap after lap on a pseudo-3D road and try to beat your fastest lap time.',
    212: 'Solve crossword clues from a fixed vocabulary in a randomized layout, with reveal help and progress tracking.',
    213: 'Five in a row on a 15x15 board against a computer or a second player.',
    217: 'Defend six cities from missile waves with an unlimited single launcher.',
    218: 'Guide a lunar module under gravity toward a landing pad.',
    219: 'Fire at descending alien ships with your laser cannon.',
    220: 'Duck-shooting game with timed waves and scoring. Missing renderer chunks remain a documented loading blocker.',
    222: 'Original arena shooter with six solo bot waves and manual 2-4-player LAN co-op pairing; connectivity depends on the local network.',
    229: 'Archive stealth prototype with a case-retrieval objective. Input, pause and extraction defects remain documented.',
}


def git_bytes(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def catalog_entries():
    games = json.loads((ROOT / 'games.json').read_text())
    tracked = set(git_bytes('ls-files', '-z').decode().split('\0'))
    ids, paths = set(), set()
    for game in games:
        assert {'id', 'title', 'cat', 'icon', 'desc', 'url', 'featured'} <= game.keys()
        assert type(game['id']) is int and game['id'] not in ids
        assert type(game['featured']) is bool
        assert all(isinstance(game[k], str) for k in ('title', 'cat', 'icon', 'desc', 'url'))
        url = urlsplit(game['url'])
        path = unquote(url.path).removeprefix('./')
        assert not (url.scheme or url.netloc or url.query or url.fragment)
        assert path.startswith('Games/') and '..' not in PurePosixPath(path).parts
        assert path in tracked and path not in paths and path.endswith('.html'), path
        # A tracked index path alone must not authorize creating an uncommitted entry.
        git_bytes('cat-file', '-e', 'HEAD:' + path)
        ids.add(game['id']); paths.add(path)
        yield game, path


def entry_bytes(path):
    local = ROOT / path
    assert not local.is_symlink(), path
    return local.read_bytes() if local.is_file() else git_bytes('show', 'HEAD:' + path)


class Head(HTMLParser):
    """Byte offsets via Latin-1; comments and script/style raw text are not tags."""
    def __init__(self, raw):
        super().__init__(convert_charrefs=True)
        self.lines = [0]
        self.lines.extend(i + 1 for i, byte in enumerate(raw) if byte == 10)
        self.inside = False
        self.opens = 0
        self.ends = []
        self.descriptions = []
        self.feed(raw.decode('latin-1'))
        self.close()
        assert self.opens == len(self.ends) == 1, 'Expected one explicit HTML head'

    def byte_position(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        if tag == 'head':
            self.opens += 1
            self.inside = True
        if self.inside and tag == 'meta':
            attrs = dict(attrs)
            if attrs.get('name', '').lower() == 'description':
                start = self.byte_position()
                self.descriptions.append((start, start + len(self.get_starttag_text()), attrs.get('content', '')))

    def handle_endtag(self, tag):
        if tag == 'head' and self.inside:
            self.ends.append(self.byte_position())
            self.inside = False


def patch(raw, description, replace=False):
    head = Head(raw)
    assert len(head.descriptions) <= 1, 'Duplicate descriptions require manual review'
    tag = ('<meta name="description" content="' + escape(description, quote=True) + '">').encode('ascii', 'xmlcharrefreplace')
    if head.descriptions:
        start, end, current = head.descriptions[0]
        if current.strip() and not replace:
            return raw
        return raw[:start] + tag + raw[end:]
    pos = head.ends[0]
    newline = b'\r\n' if b'\r\n' in raw else b'\n'
    return raw[:pos] + tag + newline + raw[pos:]


def description_for(game):
    return game['title'] + ': ' + DESCRIPTIONS.get(game['id'], game['desc'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    changes = []
    covered = 0
    pending = []
    for game, path in catalog_entries():
        if path.startswith(PROTECTED):
            continue
        raw = entry_bytes(path)
        head = Head(raw)
        covered += len(head.descriptions) == 1 and bool(head.descriptions[0][2].strip())
        if path.startswith(OTHER_OWNERS):
            if not head.descriptions or not head.descriptions[0][2].strip():
                pending.append(path)
            continue
        updated = patch(raw, description_for(game), game['id'] in REPLACE)
        if updated != raw:
            changes.append((path, raw, updated))
    print(f'Coverage: {covered}/124 nonprotected entries; Character AI read-only exception')
    print(f'Owned changes needed: {len(changes)}; other-owner missing: {len(pending)}')
    for path in pending:
        print('PENDING other owner: ' + path)
    if args.check:
        for path, _, _ in changes:
            print('NEEDS description: ' + path)
        return int(bool(changes or pending))
    # Budget all planned blobs, metadata/docs and Git objects conservatively.
    growth = sum(len(updated) * 3 + 8192 for _, _, updated in changes) + 1_000_000
    assert shutil.disk_usage(ROOT).free - growth >= 2_000_000_000, 'Predicted disk floor breach'
    for path, raw, updated in changes:
        assert entry_bytes(path) == raw, 'Concurrent entry change: ' + path
        target = ROOT / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(updated)
        print('CHANGED ' + path)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

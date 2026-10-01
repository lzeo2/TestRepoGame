#!/usr/bin/env python3
"""One unchanged ALL-games smoke pass with bounded sparse materialization.

Run: xvfb-run python3 scripts/run_sparse_smoke.py
Check without checkout/browser: python3 scripts/run_sparse_smoke.py --self-test
Inspect all catalog budgets: python3 scripts/run_sparse_smoke.py --plan

Operator ticket pi-912882-1790844894029 permits this one-run disk window:
300 MiB of Games at once, 1.5 GiB free floor. No gate arguments are forwarded.
Commit all changes first; do not edit/commit concurrently with the actual run.
The original sparse patterns/configuration are restored even on gate failure.
Restoration success is NOT a passing smoke gate.
"""
import json
import os
from pathlib import Path, PurePosixPath
import runpy
import shutil
import signal
import subprocess
import sys
from urllib.parse import unquote, urlsplit
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 300 * 1024**2
FLOOR = 1536 * 1024**2
SHARED = ('assets', 'docs', 'scripts', 'storage', 'Games/_emulatorjs')


def git(*args, data=None):
    return subprocess.check_output(['git', *args], cwd=ROOT, input=data)


def game_folder(url):
    parts = urlsplit(url)
    path = unquote(parts.path, errors='strict')
    if parts.scheme or parts.netloc or parts.query or parts.fragment:
        raise ValueError('Catalog URL must be a local file: ' + url)
    if '\\' in path or '\x00' in path or any(p in ('', '.', '..') for p in path.split('/')):
        raise ValueError('Unsafe catalog path: ' + url)
    p = PurePosixPath(path)
    if len(p.parts) < 3 or p.parts[0] != 'Games':
        raise ValueError('Catalog file must be beneath Games/: ' + url)
    if not (ROOT / path).resolve().is_relative_to(ROOT / 'Games'):
        raise ValueError('Catalog path escapes Games/: ' + url)
    return str(p.parent)


def game_dependencies(folder):
    # Ovo's module loader imports siblings; never materialize its other versions.
    if folder == 'Games/Ovo/1.4.5':
        return ('Games/Ovo/src/modloaders/util', 'Games/Ovo/src/mods/modloader/config',
                'Games/Ovo/src/img', 'Games/Ovo/src/skins', 'Games/Ovo/src/communitylevels')
    return ()


def included(path, folders):
    # Cone mode also includes loose files in every selected folder's ancestors.
    parent = path.rpartition('/')[0]
    return not parent or any(path.startswith(d + '/') or d.startswith(parent + '/') for d in folders)


def game_bytes(files, folders):
    return sum(size for path, size in files.items() if path.startswith('Games/') and included(path, folders))


def payload():
    return sum(p.lstat().st_size for p in (ROOT / 'Games').rglob('*') if p.is_file() or p.is_symlink())


def snapshot_paths():
    return [Path(os.fsdecode(git('rev-parse', '--path-format=absolute', '--git-path', p)).strip())
            for p in ('info/sparse-checkout', 'config', 'config.worktree')]


def load_plan():
    files = {}
    for record in git('ls-tree', '-rlz', 'HEAD').split(b'\0'):
        if record:
            meta, path = record.split(b'\t', 1)
            mode, kind, _, size = meta.split()
            if kind == b'blob':
                name = os.fsdecode(path)
                if name.startswith('Games/') and mode == b'120000':
                    raise RuntimeError('Game symlinks require a separate materialization audit: ' + name)
                files[name] = int(size)
    games = json.loads((ROOT / 'games.json').read_text())
    base = tuple(os.fsdecode(git('sparse-checkout', 'list')).splitlines())
    if any(d == 'Games' or d.startswith('Games/') for d in base):
        raise RuntimeError('Start with the original non-Games sparse selection.')
    common = tuple(dict.fromkeys((*base, *SHARED)))
    plans = []
    for game in games:
        folder = game_folder(game['url'])
        if unquote(game['url']) not in files:
            raise RuntimeError('Catalog URL is not a tracked file: ' + game['url'])
        folders = (*common, folder, *game_dependencies(folder))
        size = game_bytes(files, folders)
        if size > LIMIT:
            raise RuntimeError(f'{game["title"]}: predicted Games payload {size} exceeds {LIMIT}')
        plans.append((game, folders, size))
    return files, common, plans


def checkout(folders, files):
    growth = sum(size for path, size in files.items()
                 if included(path, folders) and not os.path.lexists(ROOT / path))
    if shutil.disk_usage(ROOT).free - growth < FLOOR:
        raise RuntimeError('Checkout would cross the 1.5 GiB free-space floor.')
    git('sparse-checkout', 'set', '--cone', '--stdin',
        data=('\n'.join(folders) + '\n').encode())
    actual = payload()
    if actual > LIMIT or shutil.disk_usage(ROOT).free < FLOOR:
        raise RuntimeError('Actual checkout violated the Games/disk budget.')
    return actual


def run():
    from playwright.sync_api import Browser

    if git('status', '--porcelain=v1', '-z'):
        raise RuntimeError('Commit all tracked/untracked changes before the actual gate run.')
    if git('config', '--bool', '--get', 'core.sparseCheckout').strip() != b'true' or git(
            'config', '--bool', '--get', 'core.sparseCheckoutCone').strip() != b'true':
        raise RuntimeError('An existing cone-mode sparse checkout is required.')
    head = git('rev-parse', 'HEAD')
    files, common, plans = load_plan()
    baseline = git('status', '--porcelain=v1', '-z')
    if baseline or git('rev-parse', 'HEAD') != head:
        raise RuntimeError('Repository changed while planning the gate.')
    if payload() > LIMIT or shutil.disk_usage(ROOT).free < FLOOR:
        raise RuntimeError('Initial Games/disk budget is already exceeded.')
    original = {p: p.read_bytes() if p.exists() else None for p in snapshot_paths()}
    new_page = Browser.new_page
    previous = None
    count = 0
    peak = 0

    def materialize(browser, *args, **kwargs):
        nonlocal previous, count, peak
        if previous is not None and not previous.is_closed():
            raise RuntimeError('Previous gate page must close before releasing its files.')
        if count >= len(plans):
            raise RuntimeError('Gate created more pages than registered games.')
        if git('rev-parse', 'HEAD') != head or git('status', '--porcelain=v1', '-z') != baseline:
            raise RuntimeError('Repository changed during the gate.')
        # Release first: two large games must never coexist during a checkout.
        checkout(common, files)
        game, folders, predicted = plans[count]
        actual = checkout(folders, files)
        peak = max(peak, actual)
        count += 1
        print(f'SPARSE {count}/{len(plans)} {game["title"]}: '
              f'predicted={predicted} actual={actual} Games bytes', flush=True)
        previous = new_page(browser, *args, **kwargs)
        return previous

    def interrupt(signum, frame):
        raise SystemExit(128 + signum)

    old_term = signal.signal(signal.SIGTERM, interrupt)
    try:
        with patch.object(Browser, 'new_page', materialize):
            try:
                runpy.run_path(str(ROOT / 'scripts/smoke_test_games.py'), run_name='__main__')
            except SystemExit as exc:
                if exc.code in (None, 0) and count != len(plans):
                    raise RuntimeError('Gate did not visit every registered game.') from exc
                raise
    finally:
        # Prevent a second interrupt from leaving restoration half-finished.
        old_int = signal.signal(signal.SIGINT, signal.SIG_IGN)
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        try:
            for path, content in original.items():
                if content is None:
                    path.unlink(missing_ok=True)
                else:
                    path.write_bytes(content)
            git('read-tree', '-mu', 'HEAD')
            if any((p.read_bytes() if p.exists() else None) != content for p, content in original.items()):
                raise RuntimeError('Sparse configuration was not restored exactly.')
            if git('rev-parse', 'HEAD') != head or git('status', '--porcelain=v1', '-z') != baseline:
                raise RuntimeError('Repository status differs after restoration.')
            if payload() != game_bytes(files, tuple(os.fsdecode(git('sparse-checkout', 'list')).splitlines())):
                raise RuntimeError('Temporary Games payload was not fully released.')
            print(f'SPARSE RESTORED: pages={count}/{len(plans)}, peak_Games_bytes={peak}, '
                  f'remaining_Games_bytes={payload()}; this is not a gate-pass assertion.', flush=True)
        finally:
            signal.signal(signal.SIGINT, old_int)
            signal.signal(signal.SIGTERM, old_term)


def self_test():
    assert game_folder('Games/Ovo/1.4.5/index.html') == 'Games/Ovo/1.4.5'
    assert game_folder('Games/Character%20AI/Alsen.html') == 'Games/Character AI'
    for url in ('https://example.invalid/a', '/Games/A/index.html', 'Games/../index.html',
                'Games/%2e%2e/index.html', 'Games/A%5cB/index.html', 'Games//index.html'):
        try:
            game_folder(url)
        except ValueError:
            pass
        else:
            raise AssertionError(url)
    files = {'Games/Ovo/index.html': 2, 'Games/Ovo/1.4.5/index.html': 3,
             'Games/Ovo/other/big.bin': LIMIT, 'Games/loose.js': 5,
             'Games/_emulatorjs/data/loader.js': 7, 'assets/a.js': 11}
    assert game_bytes(files, ('Games/Ovo/1.4.5', 'Games/_emulatorjs', 'assets')) == 17
    assert not included('Games/Ovo/other/big.bin', ('Games/Ovo/1.4.5',))
    ovo = ('Games/Ovo/1.4.5', *game_dependencies('Games/Ovo/1.4.5'))
    for path in ('modloaders/modloader.js', 'modloaders/util/pages/skins/render.js',
                 'modloaders/util/pages/replays/replayruntime.js', 'mods/modloader/community.js',
                 'mods/modloader/config/backend.json', 'mods/modloader/config/changelog.json',
                 'img/modloader/modloader.png', 'skins/skin.png', 'communitylevels/config/data.json'):
        assert included('Games/Ovo/src/' + path, ovo), path
    for path in ('Games/Ovo/1.4.4/data.js', 'Games/Ovo/src/van1.4/media/track1.ogg',
                 'Games/Ovo/src/modloaders/legacy/modloader1.4.js'):
        assert not included(path, ovo), path
    assert not game_dependencies('Games/Run3/tn6pS9dCf37xAhkJv')
    print('self-test: URL safety, cone ancestor budgets and Ovo-only loader closure OK')


if __name__ == '__main__':
    if sys.argv[1:] == ['--self-test']:
        self_test()
    elif sys.argv[1:] == ['--plan']:
        _, _, plans = load_plan()
        for game, _, size in plans:
            print(f'{game["title"]}: {size} Games bytes')
        print(f'{len(plans)} registered games; maximum predicted Games bytes={max(p[2] for p in plans)}')
    elif sys.argv[1:]:
        sys.exit('Only --self-test or --plan are accepted; actual smoke always runs ALL games unchanged.')
    else:
        run()

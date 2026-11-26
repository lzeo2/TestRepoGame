#!/usr/bin/env python3
"""Summarize finished fleet playtest runs, ordered from oldest to newest."""
import argparse
import collections
import json
from pathlib import Path

from playtest_arcade_fleet import titles

LABELS = {
    'game-control-state-confirmed': 'Game control verified',
    'visible-response-after-input': 'Visible response',
    'start-control-responded': 'Start control responded',
    'animated-surface-input-unconfirmed': 'Animation only',
    'input-attempted-no-observed-change': 'No visible change',
    'input-sent-frame-unavailable': 'Frame unavailable',
    'protected-shell-observed': 'Protected shell',
    'entry-unavailable': 'Entry unavailable',
    'unavailable-by-design': 'Unavailable by design',
    'harness-error': 'Test interrupted',
}


def cell(value):
    return ' '.join(str(value).split()).replace('|','\\|').replace('<','&lt;')


def summarize(inputs, observations=None):
    ordered = titles()
    records = collections.defaultdict(list)
    runs = []
    for directory in inputs:
        run = json.loads((directory/'results.json').read_text())
        rows = run['games']
        assert len(rows) == run['count'] == len({row['directory'] for row in rows})
        diagnostics = [sum(bool(row.get(key)) for row in rows)
                       for key in ('errors','failedLocal','externalBlocked')]
        runs.append((directory.name,run['revision'][:12],len(rows),diagnostics))
        for row in rows:
            # Gravity can reverse vertical velocity during an idle frame. The
            # first runner used this field, which cannot isolate a flap.
            if row.get('proof',{}).get('selector') == 'window.schoolyardGame?.state.player.vy < 0':
                row = dict(row, outcome='animated-surface-input-unconfirmed')
            if row['directory']=='Slope' and 'unavailable offline' in row.get('initialText','').lower():
                row = dict(row,outcome='unavailable-by-design')
            records[row['directory']].append((directory.name,row))
    missing = {g['directory'] for g in ordered}-records.keys()
    if missing:
        raise ValueError('Missing game attempts: '+', '.join(sorted(missing)))
    observations = observations or {}
    unknown = set(observations) - records.keys()
    if unknown:
        raise ValueError('Unknown game observations: '+', '.join(sorted(unknown)))
    counts = collections.Counter(history[-1][1]['outcome'] for history in records.values())
    direct = {name for name,history in records.items()
              if any(row['outcome']=='game-control-state-confirmed' for _,row in history)}
    native = {name for name, observation in observations.items() if observation['status']=='gameplay'}
    yield '# Arcade fleet interaction results\n'
    registered = sum(game['registered'] for game in ordered)
    yield (f'{len(ordered)} game projects ({registered} registered and {len(ordered)-registered} unlisted), '
           f'{sum(len(h) for h in records.values())} isolated fleet browser attempts.')
    yield f'{len(direct)} titles had a verified game-control change in at least one fleet attempt. '
    if observations:
        yield (f'Combining that evidence with dedicated gameplay observations covers {len(direct | native)} distinct titles. '
               f'The other {len(ordered)-len(direct | native)} have more limited evidence in these sessions.')
    yield ''
    yield '## Coverage\n'
    yield 'Chromium used real pointer and keyboard events against local game entry pages. '
    yield 'A game control counts as verified when a game-specific state value or board element changed after its action. '
    yield 'Visible response means the frame changed after input following a still sample. '
    yield 'The animation-only group also changed during the idle sample. '
    yield 'Start control measures entry into a new visible screen. '
    yield 'The remaining outcomes need a deeper game-specific route. '
    yield 'Protected chat coverage stops at its shell. These short sessions do not measure completion of entire stories, device frame rates or multiplayer.\n'
    yield '## Latest outcome per title\n'
    yield '| Outcome | Titles |\n| --- | ---: |'
    for key in LABELS:
        if counts[key]:
            yield f'| {LABELS[key]} | {counts[key]} |'
    yield '\n## Runs\n'
    yield 'A run records the starting Git revision. Source repairs and targeted retries occurred during this sweep. '
    yield 'An asset or script loaded by an earlier attempt can differ from a later one. '
    yield 'Each run directory contains JSON observations and captured frames. The last three columns count entries where that kind of event was observed. A missing optional asset can appear in these counts even when the game runs.\n'
    yield '| Run | Starting revision | Entries | Page exceptions | Local HTTP errors | Off-origin HTTP blocked |\n| --- | --- | ---: | ---: | ---: | ---: |'
    for name, revision, total, diagnostic in runs:
        exceptions, http_errors, blocked = diagnostic
        yield f'| {cell(name)} | `{revision}` | {total} | {exceptions} | {http_errors} | {blocked} |'
    if observations:
        yield '\n## Dedicated native-input observations\n'
        yield 'The following longer sessions used individual game controls. Scope identifies exactly how far the evidence reached. '
        yield 'Receipt paths refer to the external session folder or a tracked test script.\n'
        yield '| Game | Scope | Observation | Receipt |\n| --- | --- | --- | --- |'
        for game in ordered:
            observation = observations.get(game['directory'])
            if observation:
                yield (f"| {cell(game['title'])} | {cell(observation['status'])} | "
                       f"{cell(observation['observation'])} | {cell(observation['receipt'])} |")
    yield '\n## Per-game observations\n'
    yield 'Each row distinguishes the latest quick fleet attempt from separate game-specific sessions. The last column identifies the direct fleet input when observed.\n'
    yield '| Game | Latest fleet attempt | Fleet attempts | Dedicated session | Verified fleet input |\n| --- | --- | ---: | --- | --- |'
    for game in ordered:
        history = records[game['directory']]
        row = history[-1][1]
        proof = next((r for _,r in reversed(history) if r['outcome']=='game-control-state-confirmed'),None)
        action = ''
        if proof:
            inputs = [a for a in proof['inputs'] if a.startswith(('Click ', 'key:', 'drag:', 'fill:', 'double:', 'hold:'))]
            action = ' + '.join(inputs)[:128] or proof.get('proof',{}).get('selector','')
        name = game['title'] + ('' if game['registered'] else ' (unlisted)')
        scope = observations.get(game['directory'],{}).get('status','')
        yield f'| {cell(name)} | {LABELS[row["outcome"]]} | {len(history)} | {cell(scope)} | {cell(action)} |'
    yield '\n## Reproduction\n'
    yield 'Run from a checkout with the game assets present and Python Playwright, Pillow and Chromium available.\n'
    yield '```sh\npython3 -B scripts/playtest_arcade_fleet.py --output <new-external-run-dir>\npython3 -B scripts/playtest_arcade_fleet.py --games 8,11 --output <new-retry-dir>\npython3 -B scripts/summarize_arcade_playtests.py <first-run-dir> <retry-dir> --observations docs/verification/arcade-native-controls-2026-11-26.json\n```'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('runs',nargs='+',type=Path)
    parser.add_argument('--observations',type=Path,help='Optional JSON object of reviewed native-input observations by game directory')
    args = parser.parse_args()
    observations = json.loads(args.observations.read_text()) if args.observations else None
    print('\n'.join(line.rstrip(' ') for line in summarize(args.runs, observations)))

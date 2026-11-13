#!/usr/bin/env python3
"""Run bounded Capital Drive syntax and pure regressions; optionally browser QA.

No installation, source regeneration, save resets, maintenance refresh or push.
Browser artifacts require an explicit output directory outside the repository.
"""
import argparse
import json
import os
from pathlib import Path
import shlex
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
GAME = Path('Games/Capital Drive')
MODULES = (
    'script.js', 'simulation.js', 'navigation.js', 'map-projection.js',
    'world-view.js', 'neighbourhood.js', 'pedestrians.js', 'gameplay.js',
    'progression.js', 'actor-view.js', 'landmarks.js', 'landmarks-view.js',
    'address-search.js', 'street-ui.js',
)
SUITES = (
    'test_capital_drive.mjs', 'test_capital_pedestrians.mjs',
    'test_capital_neighbourhood.mjs', 'test_capital_world.mjs',
    'test_capital_geodata.mjs', 'test_capital_map.mjs',
    'test_capital_gameplay.mjs', 'test_capital_progression.mjs',
    'test_capital_actors.mjs', 'test_capital_landmarks.mjs',
    'test_capital_addresses.mjs',
)
DATA = ('canberra.json', 'geodata-validation.json', 'addresses.json')


def run_command(command, timeout):
    """Kill the test process group on timeout, including its temporary browser."""
    started = time.monotonic()
    try:
        process = subprocess.Popen(command, cwd=ROOT, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True,
                                   start_new_session=os.name == 'posix')
    except OSError as error:
        return dict(exitCode=127, seconds=0, timedOut=False, output=str(error))
    timed_out = False
    try:
        output, _ = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        if os.name == 'posix':
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        else:
            process.kill()
        output, _ = process.communicate()
    return dict(exitCode=process.returncode,
                seconds=round(time.monotonic() - started, 2),
                timedOut=timed_out, output=output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', action='store_true', help='Also run the targeted real-input browser suite (600 second limit).')
    parser.add_argument('--output', type=Path, help='Explicit external directory for browser artifacts and runner report; required with --browser.')
    parser.add_argument('--dry-run', action='store_true', help='List required files and exact commands without running them or creating directories.')
    args = parser.parse_args()
    if args.browser != (args.output is not None):
        parser.error('--browser and --output must be used together')
    output = args.output.expanduser().resolve() if args.output else None
    if output is not None and (output == ROOT or ROOT in output.parents):
        parser.error('--output must be outside the repository')
    required = [GAME / filename for filename in MODULES]
    required += [GAME / filename for filename in ('index.html', 'style.css', 'credits.html')]
    required += [GAME / 'data' / filename for filename in DATA]
    required += [Path('scripts') / filename for filename in SUITES]
    if args.browser:
        required.append(Path('scripts/test_capital_drive_browser.py'))
    commands = [(['node', '--check', str(GAME / filename)], 120) for filename in MODULES]
    commands += [(['node', '--check', str(Path('scripts') / filename)], 120) for filename in SUITES]
    commands += [(['node', str(Path('scripts') / filename)] +
                 ([str(GAME / 'data/canberra.json')] if filename == 'test_capital_drive.mjs' else []), 120)
                 for filename in SUITES]
    commands.append((['git', 'diff', '--check'], 120))
    if args.browser:
        commands.append(([sys.executable, '-B', 'scripts/test_capital_drive_browser.py', '--output', str(output)], 600))
    missing = [str(path) for path in required if not (ROOT / path).is_file()]
    if missing:
        for path in missing:
            print(f'MISSING {path}')
        print('Required files are missing; no checks executed. Restore the narrow checkout or finish the assigned modules.')
        return 1
    if args.dry_run:
        for command, timeout in commands:
            print(f'PLAN [{timeout}s] {shlex.join(command)}')
        print(f'DRY RUN: {len(commands)} commands; {len(required)} required files present.')
        return 0
    if output:
        output.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + 900
    records = []
    for command, limit in commands:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            print('FAIL overall 900 second budget exhausted.')
            records.append(dict(command=command, exitCode=124, timedOut=True, output='Overall budget exhausted.', seconds=0))
            break
        print(f'RUN {shlex.join(command)}', flush=True)
        result = run_command(command, min(limit, remaining))
        record = dict(command=command, **result)
        records.append(record)
        label = 'PASS' if result['exitCode'] == 0 and not result['timedOut'] else 'FAIL'
        print(f"{label} exit={result['exitCode']} time={result['seconds']}s" + (' TIMEOUT' if result['timedOut'] else ''))
        lines = result['output'].strip().splitlines()
        if lines:
            print('\n'.join(lines[-3:] if label == 'PASS' else lines[-20:]))
        if label == 'FAIL':
            break
    passed = sum(row['exitCode'] == 0 and not row['timedOut'] for row in records)
    success = passed == len(commands)
    report = dict(passed=passed, planned=len(commands), success=success, browser=args.browser, results=records)
    if output:
        report_file = output / 'runner-results.json'
        report_file.write_text(json.dumps(report, indent=2) + '\n')
        print(f'Report: {report_file}')
    print(f"{'PASS' if success else 'FAIL'} Capital Drive: {passed}/{len(commands)} commands passed.")
    return 0 if success else 1


if __name__ == '__main__':
    raise SystemExit(main())

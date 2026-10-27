"""Native shared-browser regression, not rendered-flight acceptance.
Run from the deployed repository: python3 -B Games/Wings/verification/check-context-sequence.py
Uses the unchanged smoke runner: one browser, Wings -> Server Survival -> Astray.
The outer 90-second deadline bounds browser/server cleanup, not individual test timeouts.
"""
import argparse
import os
from pathlib import Path
import signal
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8982)
args = parser.parse_args()
root = Path(__file__).resolve().parents[3]
command = ['xvfb-run', '-a', sys.executable, '-B', '-u', 'scripts/smoke_test_games.py',
           '--games', 'Wings,Server Survival,Astray']
process = subprocess.Popen(command, cwd=root, env=dict(os.environ, SMOKE_PORT=str(args.port)),
                           start_new_session=True)
try:
    code = process.wait(timeout=90)
except subprocess.TimeoutExpired:
    print('FAIL: native context sequence exceeded its outer process deadline', flush=True)
    code = 124
finally:
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()
sys.exit(code)

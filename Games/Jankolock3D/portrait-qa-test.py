"""Run: python3 -B Games/Jankolock3D/portrait-qa-test.py (no browser)."""
from pathlib import Path
import runpy

active = runpy.run_path(str(Path(__file__).with_name('portrait-qa.py')))['active_browser_processes']
rows = '''
10 S bash bash -lc pgrep -af chrome-linux/chrome
11 S python3 python3 portrait-qa.py
12 S chromium /usr/bin/chromium --remote-debugging-pipe
13 Sl chrome local/chrome-linux/chrome --type=renderer
14 Sl node local/playwright/driver/node cli.js run-driver
15 Z chromium [chromium] <defunct>
16 S node node agent.js --note=playwright
17 S chromium /usr/bin/chromium --remote-debugging-port=9222
'''
assert [row[0] for row in active(rows)] == ['12', '13', '14', '17']
assert not active('')
print('PASS: real Chromium/CDP/renderers/drivers block; shell text and zombies do not')

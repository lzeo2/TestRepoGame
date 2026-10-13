"""Static regression for the reviewed Getaway build; not a general JS analyzer.
Run: python3 -B Games/Getaway/verification/check-telemetry.py
"""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
trackers = re.compile(rb'gtag|googletagmanager|google-analytics|doubleclick|pubstack|pbstck|spawtz|sendBeacon|XMLHttpRequest', re.I)
metrics = re.compile(rb'arcade-perf|gpuMs|timestamp-query|timestampWrites|createQuerySet|resolveQuerySet|adapterInfo|GPU telemetry', re.I)
files = [p for p in root.rglob('*') if p.is_file()]
runtime = [p for p in files if p == root / 'index.html' or p.parts[len(root.parts)] in ('assets', 'sfx')]
for path in runtime:
    data = path.read_bytes()
    assert not trackers.search(data), f'Tracker signature: {path.relative_to(root)}'
    if path.suffix in ('.html', '.js', '.css'):
        assert not metrics.search(data), f'GPU/performance reporting: {path.relative_to(root)}'
        assert not re.search(rb'(?:https?|wss?)://|WebSocket', data), f'External endpoint: {path.relative_to(root)}'
# Test-only SIM contains no tracker, network or GPU performance collector either.
sim = (root / 'verification/sim.mjs').read_bytes()
assert not trackers.search(sim) and not metrics.search(sim)
assert not re.search(rb'fetch\(|(?:https?|wss?)://|WebSocket', sim)
# Preserve the deliberately reviewed local-only browser origin.
browser = (root / 'verification/check-browser.py').read_text()
assert set(re.findall(r'https?://[^\s\'"]+', browser)) == {'http://127.0.0.1:8937'}
index = (root / 'index.html').read_text()
for src in re.findall(r'(?:src|href)="(\./assets/[^\"]+)"', index):
    assert (root / src).is_file(), src
print(f'PASS: {len(runtime)} runtime files; no tracker signatures, external code endpoints or GPU/performance collectors.')
print('PASS: verification SIM clean; browser verification uses loopback only.')
print(f'Tree contains {len(files)} files total. Docs/patch mention removed code; this check contains denylist signatures. MP3 certificate metadata is not executable.')

"""Offline only: python3 -B scripts/test_basketball_process_verifier.py"""
from dataclasses import replace
from pathlib import Path
import sys

source = Path(__file__).with_name('diagnose_basketball_readiness.py').read_text()
assert 'Browser.getBrowserCommandLine' not in source, 'Unavailable CDP argv query still used'
from diagnose_basketball_readiness import (parse_process, select_browser,
    verify_renderer_sandbox, verify_sandbox_page)

EXE, PROFILES, OWNER = '/system/chromium', '/fake/profiles', 100
ARGV = ('chromium', '--remote-debugging-pipe', '--user-data-dir='+PROFILES+'/playwright_chromiumdev_profile-a')


def process(pid, ppid, start, argv, exe=EXE, nnp='1', seccomp='2'):
    # comm deliberately contains spaces and a closing parenthesis.
    stat = f'{pid} (chrome ) test name) '+' '.join(['S', str(ppid)]+['0']*17+[str(start)])
    status = f'Uid:\t1000 1000 1000 1000\nNoNewPrivs:\t{nnp}\nSeccomp:\t{seccomp}\n'
    return parse_process(pid, stat, status, exe, b'\0'.join(a.encode() for a in argv)+b'\0')


owner = process(100, 1, 10, ('python',), exe='/system/python')
driver = process(110, 100, 11, ('node',), exe='/system/node')
browser = process(120, 110, 12, ARGV)
zygote = process(125, 120, 13, ('chromium', '--type=zygote'))
renderer = process(130, 125, 14, ('chromium', '--type=renderer'))
records = {p.pid: p for p in (owner, driver, browser, zygote, renderer)}
previous = {(100, 10), (110, 11)}


def choose(values=records, old=previous):
    return select_browser(values, OWNER, old, EXE, Path(PROFILES), 1000)


checks = 0


def rejects(callback):
    global checks
    try:
        callback()
    except ValueError:
        checks += 1
    else:
        raise AssertionError('Unsafe/missing/ambiguous record accepted')


assert choose() == browser
assert browser.start == 12 and browser.ppid == 110 and browser.argv == ARGV
verify_sandbox_page('Sandbox status\nYou are adequately sandboxed.\n')
assert verify_renderer_sandbox(records, browser, EXE, 1000, {130}) == [renderer]
checks += 3
rejects(lambda: verify_renderer_sandbox(records, browser, EXE, 1000, set()))
rejects(lambda: verify_renderer_sandbox(records, browser, EXE, 1000, {130, 999}))
rejects(lambda: verify_renderer_sandbox(records, browser, EXE, 1000, {120}))
rejects(lambda: verify_renderer_sandbox({**records, 130: replace(renderer, ppid=0)}, browser, EXE, 1000, {130}))
rejects(lambda: choose({k: v for k, v in records.items() if k != 120}))
rejects(lambda: choose({k: v for k, v in records.items() if k != OWNER}))
rejects(lambda: choose({k: v for k, v in records.items() if k != 110}))
rejects(lambda: choose({**records, 121: replace(browser, pid=121)}))
rejects(lambda: choose({**records, 121: replace(browser, pid=121, uids=(0,)*4)}))
rejects(lambda: choose(old=previous | {(120, 12)}))
# Same PID but a different start tick is not the previous process.
assert choose(old=previous | {(120, 5)}) == browser
checks += 1
for changed in [replace(browser, exe='/other/chromium'), replace(browser, uids=(1001,)*4),
                replace(browser, ppid=0), replace(browser, ppid=120), replace(browser, start=9),
                replace(browser, argv=(ARGV[0], ARGV[-1])),
                replace(browser, argv=ARGV[:-1]),
                replace(browser, argv=ARGV+('--user-data-dir=/another/profile',)),
                replace(browser, argv=ARGV[:-1]+('--user-data-dir=/outside/playwright_chromiumdev_profile-a',)),
                replace(browser, argv=ARGV[:-1]+('--user-data-dir='+PROFILES+'/not-playwright',))]:
    rejects(lambda changed=changed: choose({**records, 120: changed}))
separate = replace(browser, argv=ARGV[:-1]+('--user-data-dir', PROFILES+'/playwright_chromiumdev_profile-a'))
assert choose({**records, 120: separate}) == separate
checks += 1
for flag in ['--no-sandbox', '--no-sandbox=false', '--disable-setuid-sandbox',
             '--disable-seccomp-filter-sandbox', '--disable-gpu-sandbox', '--single-process',
             '--in-process-gpu', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-web-security']:
    rejects(lambda flag=flag: choose({**records, 120: replace(browser, argv=ARGV+(flag,))}))
for text in ['', 'You are not adequately sandboxed.', 'Not adequately sandboxed']:
    rejects(lambda text=text: verify_sandbox_page(text))
rejects(lambda: verify_renderer_sandbox({k:v for k,v in records.items() if k != 130}, browser, EXE, 1000, {130}))
rejects(lambda: verify_renderer_sandbox({k:v for k,v in records.items() if k != 125}, browser, EXE, 1000, {130}))
for changed in [replace(renderer, no_new_privs='0'), replace(renderer, seccomp='0'),
                replace(renderer, no_new_privs=''), replace(renderer, seccomp=''),
                replace(renderer, exe='/other/chromium'), replace(renderer, uids=(0,)*4),
                replace(renderer, argv=renderer.argv+('--no-sandbox',))]:
    rejects(lambda changed=changed: verify_renderer_sandbox({**records, 130: changed}, browser, EXE, 1000, {130}))
rejects(lambda: verify_renderer_sandbox({**records, 120: replace(browser, start=99)}, browser, EXE, 1000, {130}))
rejects(lambda: verify_renderer_sandbox({**records, 120: replace(browser, argv=ARGV+('--no-sandbox',))}, browser, EXE, 1000, {130}))
rejects(lambda: parse_process(1, 'malformed', 'Uid: 1000 1000 1000 1000', EXE, b'chromium\0'))
rejects(lambda: parse_process(1, '1) '+' '.join(['S','0']+['0']*17+['1']), 'Uid: 1000 1000 1000 1000', EXE, b'chromium\0'))
rejects(lambda: parse_process(1, '1 (x) '+' '.join(['S','0']+['0']*17+['1']), 'Uid: 1000 1000 1000 1000', EXE, b'not-null-terminated'))
assert not any(name.startswith('playwright') for name in sys.modules)
print(f'PASS {checks} offline process/argv/sandbox cases; no browser or Playwright import/launch')

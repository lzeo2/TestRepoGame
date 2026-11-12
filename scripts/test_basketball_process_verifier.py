"""Offline only: python3 -B scripts/test_basketball_process_verifier.py"""
from dataclasses import replace
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
import diagnose_basketball_readiness as diagnostic

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


def rejects(callback, expected=ValueError):
    global checks
    try:
        callback()
    except expected:
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
def fake_scan(values, denied_exe=(), denied_argv=(), unstable_pid=None):
    """Exercise the actual reader against in-memory /proc files, never real processes."""
    directories,reads,stat_reads=[],[],{}
    for pid,p in values.items():
        directory=MagicMock();directory.name=str(pid)
        directory.stat.return_value=SimpleNamespace(st_uid=p.uids[0])
        comm='systemd' if pid==1064 else 'chrome ) test name'
        stat=f'{pid} ({comm}) '+' '.join(['S',str(p.ppid)]+['0']*17+[str(p.start)])
        status=f'Uid: {" ".join(map(str,p.uids))}\nNoNewPrivs: {p.no_new_privs}\nSeccomp: {p.seccomp}\n'
        def argv(pid=pid,p=p):
            if pid in denied_argv:raise PermissionError('protected cmdline')
            return b'\0'.join(a.encode() for a in p.argv)+b'\0'
        def stat_text(pid=pid,p=p,text=stat):
            stat_reads[pid]=stat_reads.get(pid,0)+1
            if pid==unstable_pid and stat_reads[pid]>2:return text.rsplit(' ',1)[0]+' '+str(p.start+1)
            return text
        files={'stat':SimpleNamespace(read_text=stat_text),
               'status':SimpleNamespace(read_text=lambda text=status:text),
               'cmdline':SimpleNamespace(read_bytes=argv),'exe':pid}
        directory.__truediv__.side_effect=lambda name,files=files:files[name]
        directories.append(directory)
    def exe(pid):
        reads.append(pid)
        if pid in denied_exe:raise PermissionError('protected exe')
        return values[pid].exe
    with patch.object(diagnostic,'Path',return_value=SimpleNamespace(iterdir=lambda:directories)), \
         patch.object(diagnostic.os,'getpid',return_value=OWNER), \
         patch.object(diagnostic.os,'getuid',return_value=1000), \
         patch.object(diagnostic.os,'readlink',side_effect=exe):
        result=diagnostic.read_processes()
    return result,reads


service=process(1064,1,5,('/usr/lib/systemd/systemd','--user'),exe='/system/systemd',nnp='0',seccomp='0')
scanned,exe_reads=fake_scan({**records,1064:service},denied_exe={1064})
assert scanned[1064].exe=='' and 1064 not in exe_reads,'Proven unrelated protected service must not resolve exe'
assert scanned[120].exe==EXE and 120 in exe_reads
checks+=2
rejects(lambda:fake_scan({**records,1064:service},denied_exe={1064},unstable_pid=1064))
rejects(lambda:fake_scan({**records,1065:replace(service,pid=1065)},denied_exe={1065}),PermissionError)
for changed in [replace(service,ppid=110,start=12), replace(service,start=10),
                replace(service,uids=(1000,1000,0,1000)),
                replace(service,argv=service.argv+('--user-data-dir='+PROFILES+'/playwright_chromiumdev_profile-a',)),
                replace(service,argv=ARGV)]:
    rejects(lambda changed=changed:fake_scan({**records,1064:changed},denied_exe={1064}),PermissionError)
rejects(lambda:fake_scan({**records,1064:service},denied_argv={1064}),PermissionError)
rejects(lambda:fake_scan(records,denied_exe={120}),PermissionError)
rejects(lambda:fake_scan(records,denied_exe={130}),PermissionError)
rejects(lambda:fake_scan(records,denied_argv={120}),PermissionError)
rejects(lambda:fake_scan({k:v for k,v in records.items() if k!=OWNER}))
assert not any(name.startswith('playwright') for name in sys.modules)
print(f'PASS {checks} offline process/argv/sandbox cases; no browser or Playwright import/launch')

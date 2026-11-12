"""One safe launch, <=90s including cleanup; no retries or browser downloads.
Run: timeout --signal=TERM --kill-after=5s 85s python3 -B scripts/diagnose_basketball_readiness.py
Evidence stays in .tmp/basketball-native-readiness; earlier receipts are untouched.
"""
import fcntl
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
from threading import Thread
import time
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / '.tmp/basketball-native-readiness'
FLOOR, TEMP_BUDGET = 2178940928, 128 * 1024**2
BASE = 'http://127.0.0.1:8935'


def admission():
    memory = {k: int(v.split()[0]) * 1024 for k, v in
              (line.split(':', 1) for line in Path('/proc/meminfo').read_text().splitlines())}
    values = {'diskFree': shutil.disk_usage(ROOT).free,
              'memAvailable': memory['MemAvailable'], 'swapFree': memory['SwapFree']}
    assert values['diskFree'] >= FLOOR + TEMP_BUDGET, f'Disk admission: {values}'
    assert values['memAvailable'] >= 1536 * 1024**2, f'RAM admission: {values}'
    assert values['swapFree'] >= 256 * 1024**2, f'Swap admission: {values}'
    return values


def clean(text):
    return re.sub(r'/home/[^\s\"\']+', '<local-path>', str(text).replace(str(ROOT), '<repo>'))


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


PROBE = r"""(() => {
  let queued=0, entered=0, exited=0, draws=0, last='document-init', previous='';
  const emit=(kind,extra={})=>console.debug('BB_DIAG '+JSON.stringify({kind,ms:Math.round(performance.now()),...extra}));
  const sample=()=>({snapshotPresent:typeof window.basketballerSnapshot==='function',
    playDisabled:document.getElementById('start')?.disabled??null,
    loadingText:document.getElementById('load-status')?.textContent??null,
    readyState:document.readyState,queued,entered,exited,draws,last});
  window.__bbReadiness=sample;
  const raf=window.requestAnimationFrame;
  window.requestAnimationFrame=function(callback){queued++;if(queued<=3)emit('raf-queued',{queued});
    return raf.call(this,function(t){entered++;last='raf-enter';if(entered<=3)emit(last,{entered});
      const result=callback(t);exited++;last='raf-exit';if(exited<=3)emit(last,{exited});return result;});};
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(kind,...args){
    if(this.id==='world'){last='world-context-request';emit(last,{context:kind});}
    const result=get.call(this,kind,...args);
    if(this.id==='world'){last='world-context-return';emit(last,{context:kind,available:!!result});}
    return result;
  };
  for(const api of [window.WebGLRenderingContext,window.WebGL2RenderingContext])if(api)
    for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
      const original=api.prototype[name];if(!original)continue;
      api.prototype[name]=function(...args){const first=draws++===0;if(first)emit('draw-enter',{name});
        const result=original.apply(this,args);if(first)emit('draw-exit',{name});return result;};
    }
  document.addEventListener('webglcontextlost',()=>emit('context-lost'),true);
  document.addEventListener('webglcontextcreationerror',e=>emit('context-creation-error',{message:e.statusMessage}),true);
  setInterval(()=>{const current=sample(),key=JSON.stringify(current);
    if(key!==previous){previous=key;emit('readiness',current);}},250);
  emit('document-init');
})();"""


def main():
    os.chdir(ROOT)
    report = {'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              'stage': 'admission', 'events': [], 'http': [], 'errors': [], 'external': [], 'captures': []}
    lock = server = thread = browser = None
    started = time.monotonic()

    def wall_stop(*_args):
        raise TimeoutError('80s diagnostic deadline; cleanup reserved within 90s wall cap')

    signal.signal(signal.SIGALRM, wall_stop)
    signal.signal(signal.SIGTERM, wall_stop)
    signal.alarm(80)
    try:
        report['admission'] = admission()
        lock = (Path.home() / '.hermes/cache/scratch/testrepogame-browser-audit.lock').open('a')
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        for command in (['pgrep', '-x', 'chromium'], ['pgrep', '-x', 'chrome'], ['pgrep', '-f', 'chrome-linux/chrome']):
            assert subprocess.run(command, capture_output=True).returncode == 1, 'Browser slot occupied'
        assert Path('/usr/bin/chromium').is_file(), 'Installed system Chromium required'
        ARTIFACTS.mkdir(parents=True, exist_ok=True)
        # Short textual paths, physically inside this repo; no outside-repo profile cleanup.
        (ROOT / '.tmp').mkdir(exist_ok=True)
        temporary = f'/proc/{os.getpid()}/cwd/.tmp'
        os.environ['TMPDIR'] = temporary
        server = ThreadingHTTPServer(('127.0.0.1', 8935), partial(QuietHandler, directory=str(ROOT)))
        server.daemon_threads = True
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        from playwright.sync_api import sync_playwright
        with sync_playwright() as playwright:
            try:
                report['stage'] = 'safe-browser-launch'
                report['immediateAdmission'] = admission()
                browser = playwright.chromium.launch(executable_path='/usr/bin/chromium',
                    chromium_sandbox=True, headless=True, timeout=15000, env=dict(os.environ))
                report['stage'] = 'sandbox-verification'
                cdp = browser.new_browser_cdp_session()
                argv = cdp.send('Browser.getBrowserCommandLine')['arguments']
                forbidden = ('--no-sandbox', '--disable-setuid-sandbox', '--disable-seccomp-filter-sandbox',
                             '--disable-gpu-sandbox', '--single-process', '--in-process-gpu',
                             '--enable-unsafe', '--ignore-gpu-blocklist', '--disable-web-security')
                report['effectiveArgv'] = [clean(arg) if not arg.startswith('--user-data-dir=')
                                          else '--user-data-dir=<ephemeral-repo-profile>' for arg in argv]
                assert not any(arg.startswith(forbidden) for arg in argv), 'Unsafe effective Chromium argv'
                safe = browser.new_context()
                check = safe.new_page()
                check.goto('chrome://sandbox', wait_until='domcontentloaded', timeout=5000)
                report['sandboxText'] = check.locator('body').inner_text(timeout=3000)
                assert 'adequately sandboxed' in report['sandboxText'].lower(), 'Sandbox not positively verified'
                renderers = [p for p in cdp.send('SystemInfo.getProcessInfo')['processInfo'] if p['type'] == 'renderer']
                report['rendererSandbox'] = []
                for process in renderers:
                    status = dict(line.split(':', 1) for line in Path(f'/proc/{process["id"]}/status').read_text().splitlines() if ':' in line)
                    entry = {k: status[k].strip() for k in ('NoNewPrivs', 'Seccomp')}
                    report['rendererSandbox'].append(entry)
                    assert entry == {'NoNewPrivs': '1', 'Seccomp': '2'}, 'Renderer sandbox flags not active'
                assert renderers, 'No sandboxed renderer observed'
                safe.close()

                def attach(page):
                    page.set_default_timeout(5000)
                    page.on('pageerror', lambda error: report['errors'].append(clean(error)))
                    def console(message):
                        if message.text.startswith('BB_DIAG '):
                            report['events'].append(json.loads(message.text[8:]))
                        elif message.type in ('error', 'warning'):
                            report['events'].append({'kind': 'console-'+message.type, 'text': clean(message.text)})
                            if message.type == 'error': report['errors'].append(clean(message.text))
                    page.on('console', console)
                    page.on('response', lambda response: report['http'].append({'url': urlsplit(response.url).path,
                        'status': response.status, 'mime': response.headers.get('content-type'), 'complete': False}))
                    def finished(request):
                        for entry in reversed(report['http']):
                            if entry['url'] == urlsplit(request.url).path:
                                entry['complete'] = True
                                break
                    page.on('requestfinished', finished)
                    page.on('requestfailed', lambda request: report['errors'].append(f'{urlsplit(request.url).path}: {request.failure}'))

                def local_only(route):
                    if urlsplit(route.request.url).scheme in ('http', 'https') and not route.request.url.startswith(BASE+'/'):
                        report['external'].append(clean(route.request.url));route.abort()
                    else: route.continue_()

                def start(context, label):
                    context.route('**/*', local_only)
                    context.add_init_script(PROBE)
                    page = context.new_page();attach(page)
                    report['stage'] = label+'-boot'
                    page.goto(BASE+'/Games/StealBasketballer/', wait_until='commit', timeout=5000)
                    page.wait_for_function('''() => {
                      const s=window.__bbReadiness?.();
                      return s && (s.loadingText?.startsWith('The game could not start:') ||
                        (s.snapshotPresent && s.playDisabled===false && s.exited>0));
                    }''', timeout=6000, polling=250)
                    report[label+'Readiness'] = page.evaluate('window.__bbReadiness()')
                    assert report[label+'Readiness']['playDisabled'] is False, 'Boot caught an exception'
                    assert not report['errors'], 'Console/page/request error; stop'
                    report['stage'] = label+'-natural-start'
                    page.locator('#start').click()
                    page.wait_for_function('window.basketballerSnapshot().started', timeout=5000)
                    return page

                desktop = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce', service_workers='block')
                page = start(desktop, 'desktop')
                report['stage'] = 'natural-recruit'
                page.locator('[data-panel="shop"]').click()
                page.locator('[data-action="openMarket"]').click()
                page.locator('[data-action="buy"]').first.click()
                page.wait_for_function('window.basketballerSnapshot().state.roster.length===1')
                page.locator('#close-sheet').click()
                report['stage'] = 'five-on-five'
                page.locator('#battle').click()
                page.wait_for_function('''() => {const m=window.basketballerSnapshot().match;
                    return m && m.players.length===10 && m.shotClock>0 && m.shotClock<24;}''')
                match = page.evaluate('window.basketballerSnapshot().match')
                assert [sum(p['side']==side for p in match['players']) for side in (0,1)] == [5,5]
                report['match'] = {k: match[k] for k in ('score', 'phase', 'period', 'shotClock')}
                admission();page.screenshot(path=str(ARTIFACTS/'desktop-match.png'), timeout=5000)
                report['captures'].append('desktop-match.png')
                page.locator('[data-panel="collection"]').click()
                assert page.locator('#album-grid > .card').count() == 100
                report['albumNames'] = len(set(page.locator('#album-grid h3').all_text_contents()))
                assert report['albumNames'] == 100
                desktop.close()
                phone = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True,
                    has_touch=True, device_scale_factor=1, reduced_motion='reduce', service_workers='block')
                page = start(phone, 'phone')
                assert page.locator('#joystick').is_visible()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                report['phoneState'] = page.evaluate('window.basketballerSnapshot().state.roster.length')
                admission();page.screenshot(path=str(ARTIFACTS/'phone-world.png'), timeout=5000)
                report['captures'].append('phone-world.png')
                phone.close()
                assert not report['errors'] and not report['external']
                assert all(h['status'] < 400 for h in report['http'])
                report['stage'] = 'complete'
                report['outcome'] = 'PASS bounded native readiness/start/recruit/5v5/album/phone; not full match acceptance'
            finally:
                if browser is not None: browser.close()
    except Exception as error:
        report['outcome'] = 'HOLD: '+clean(error)
    finally:
        if server is not None: server.shutdown();server.server_close()
        if thread is not None: thread.join(timeout=2)
        if lock is not None: lock.close()
        signal.alarm(0)
        report['elapsedSeconds'] = round(time.monotonic()-started, 2)
        report['finalDiskFree'] = shutil.disk_usage(ROOT).free
        # Tiny failure evidence is retained even when preflight refused a browser.
        if ARTIFACTS.is_dir(): (ARTIFACTS/'receipt.json').write_text(json.dumps(report, indent=2)+'\n')
        print(json.dumps(report, indent=2), flush=True)
    return 0 if report.get('stage') == 'complete' else 1


if __name__ == '__main__':
    raise SystemExit(main())

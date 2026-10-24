"""Four bounded native-shell UI fixture JPEGs, not gameplay/GPU acceptance.
TMPDIR=/dev/shm timeout 90s python3 -B Games/Citisten3D/stacking-qa.py
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Event, Thread
import json
import os
import runpy
import signal
import tempfile

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.tmp/citisten-budget'
helpers = runpy.run_path(str(Path(__file__).with_name('memory-qa.py')))

FIXTURE = """import {createUI} from './ui.mjs';
localStorage.setItem('citisten-tutorial-seen','1');
window.ui=createUI(document.querySelector('#ui'));
const panel=document.querySelector('#native-controls');panel.hidden=false;
document.querySelector('.city-toasts').before(panel);
document.querySelector('#loading').hidden=true;
document.querySelector('#feedback').textContent='Drag a road: $10/lot';
document.querySelector('#skip-night').hidden=false;
window.state={mode:'defense',phase:'day',budget:37132,population:64,night:0,
 power:{demand:2,supply:80},water:{demand:6,supply:100},buildings:[],zombies:[],
 townHallHp:600,townHallMaxHp:600,nextMilestone:{population:500,grant:750},
 growthDiagnosis:'Homes are full: zone more residential beside a road.'};
ui.showGame();ui.update(state);
ui.events([{type:'placed'},{type:'wave-warning'},{type:'blackout',active:true}]);
window.fixtureReady=true;
"""
CHECK = """() => {
 const q=s=>document.querySelector(s),toast=q('.city-toasts'),diagnosis=q('[data-value="growthDiagnosis"]');
 const z=e=>Number(getComputedStyle(e).zIndex),board=toast.getBoundingClientRect();
 if(!(z(toast)>z(diagnosis)&&z(diagnosis)>z(q('#native-controls'))))throw Error('HUD layer order');
 const messages=[...toast.querySelectorAll('p')];
 if(messages.at(-1).textContent!=='Blackout')throw Error('Urgent notice not last');
 const last=messages.at(-1).getBoundingClientRect(),controls=q('.city-groups').getBoundingClientRect();
 if(last.bottom>controls.top)throw Error('Events cover phone controls');
 if(board.bottom>innerHeight||board.left<0||board.right>innerWidth)throw Error('Events offscreen');
 const hit=document.elementFromPoint(last.left+8,last.top+8);
 if(!toast.contains(hit))throw Error('Events occluded');
 // Deliberately overlap panels to test paint order, not just numeric CSS values.
 const old=toast.style.cssText;
 toast.style.cssText+=';position:fixed;top:10px;left:10px;margin:0';
 const overlap=messages[0].getBoundingClientRect();
 const top=document.elementFromPoint(overlap.left+8,overlap.top+8);
 if(!toast.contains(top))throw Error('Top HUD occludes events');
 toast.style.cssText=old;
 return {width:innerWidth,eventsZ:z(toast),diagnosisZ:z(diagnosis),nativeZ:z(q('#native-controls')),
  messages:messages.map(p=>p.textContent),eventsBottom:last.bottom,controlsTop:controls.top};
}"""


def main():
    assert not helpers['browser_roots'](), 'Browser slot busy'
    assert helpers['shutil'].disk_usage(ROOT).free >= 1500000000, 'Disk hard halt'
    OUT.mkdir(parents=True, exist_ok=True)
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    report = {'scope': 'Actual native HTML/CSS + createUI state fixture, no world/gameplay grants accepted', 'checks': [], 'errors': [], 'screenshots': [], 'profilePeakBytes': 0}
    done, owned = Event(), set()
    def expired(*_): raise TimeoutError('70s action budget')
    signal.signal(signal.SIGALRM, expired); signal.alarm(70)
    try:
        with tempfile.TemporaryDirectory(prefix='citisten-stacking-', dir='/dev/shm') as tmp:
            os.environ['TMPDIR'] = tmp
            def monitor():
                while not done.wait(.25):
                    size=helpers['tree_bytes'](tmp)
                    report['profilePeakBytes']=max(report['profilePeakBytes'],size)
                    if size>12000000:
                        report['errors'].append('Profile cap exceeded')
                        for pid in owned: os.kill(pid,signal.SIGTERM)
                        return
            watcher=Thread(target=monitor,daemon=True);watcher.start()
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
                    args=['--no-sandbox','--disable-gpu-shader-disk-cache','--disk-cache-size=1','--media-cache-size=1','--disable-background-networking','--disable-component-update'])
                owned.update(helpers['browser_roots']());assert len(owned)==1,'Browser contention'
                base=f'http://127.0.0.1:{server.server_port}/'
                for width,height in [(1440,900),(390,844)]:
                    context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<600,service_workers='block')
                    context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.abort())
                    context.route('**/native.mjs',lambda r:r.fulfill(content_type='text/javascript',body=FIXTURE))
                    page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
                    page.goto(base+'Games/Citisten3D/index.html',wait_until='commit');page.wait_for_function('window.fixtureReady')
                    page.evaluate('document.fonts.ready')
                    for theme in ['dark','light']:
                        if theme=='light':page.locator('.city-top [data-action="theme"]').first.click()
                        assert page.locator('#ui').get_attribute('data-theme')==theme
                        row=page.evaluate(CHECK);row['theme']=theme
                        ui=page.locator('.city-toasts');assert ui.locator('p').count()==(1 if width<600 else 3)
                        name=f'stacking-{width}-{theme}.jpg';page.screenshot(path=str(OUT/name),type='jpeg',quality=65)
                        assert (OUT/name).stat().st_size<500000
                        report['screenshots'].append(name)
                        page.evaluate('ui.showMenu()')
                        assert page.evaluate('''() => {const d=document.querySelector('.city-menu');return d.matches(':modal')&&d.contains(document.elementFromPoint(20,20))}''')
                        page.evaluate("document.querySelector('.city-menu').close()")
                        page.evaluate("document.querySelector('[data-action=\"tutorial\"]').click()")
                        assert page.locator('.city-tutorial').evaluate("d=>d.matches(':modal')")
                        page.keyboard.press('Escape')
                        report['checks'].append(row)
                    context.close()
                browser.close()
    finally:
        signal.alarm(0);done.set()
        if 'watcher' in locals():watcher.join(timeout=2)
        server.shutdown();server.server_close()
        report['released']=not(owned&helpers['browser_roots']())
        (OUT/'stacking.json').write_text(json.dumps(report,indent=2)+'\n')
    assert not report['errors'],report['errors']
    assert report['released'],'Browser not released'
    print('STACKING PASS: 4/4 theme/viewport cases; board > diagnosis > controls; urgent last; modal top layer; released',flush=True)


if __name__=='__main__':main()

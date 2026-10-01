#!/usr/bin/env python3
"""Static shell LAYOUT check. Blocks the core module; never proves gameplay."""
import functools
import json
import re
import shutil
import subprocess
import threading
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from time import monotonic
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/tmp/foldwild-ui-v2')
OLD_IDS = '''reduce-motion controls menu menu-title starter-description start continue
world-hud zone-name score dex-count kites save-state game-canvas message nearby-actions
interact rest team-list collection-btn pause new-run world-help battle-panel player-name
player-hp player-hp-bar player-energy player-energy-bar player-status enemy-name enemy-hp
enemy-hp-bar enemy-energy enemy-energy-bar enemy-status ability-0 ability-1 ability-2
ability-3 capture wait flee switch-list battle-log result result-title result-description
result-continue dialogue-dialog dialogue-title dialogue-text dialogue-start dialogue-cancel
collection-dialog collection-list collection-close reset-dialog reset-title reset-confirm
reset-cancel'''.split()
NEW_IDS = '''service-dialog service-title service-description service-content service-close
services-btn marks class-name synergy-name camera-reset quality seed-input ledger-search
ledger-filter'''.split()


class Tags(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.tags = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run():
    started = monotonic()
    free = shutil.disk_usage(ROOT).free
    assert free >= 2_000_000_000, 'disk guard: less than 2 GB free'
    html = ROOT / 'Games/Foldwild/index.html'
    tags = Tags(html.read_text()).tags
    ids = [attrs['id'] for _, attrs in tags if 'id' in attrs]
    assert len(ids) == len(set(ids)), 'duplicate IDs'
    assert set(OLD_IDS + NEW_IDS) <= set(ids), 'missing shell ABI IDs'
    assert [a['data-region'] for _, a in tags if 'data-region' in a] == ['0','1','2','3','4']
    assert [a['data-slot'] for _, a in tags if 'data-slot' in a] == ['0','1','2','3']
    assert [a['data-starter'] for _, a in tags if 'data-starter' in a] == ['cindupp','dewgob','pithnip']
    assert all(a.get('type') == ('submit' if a.get('id') == 'service-close' else 'button')
               for tag, a in tags if tag == 'button')
    assert next(a for _, a in tags if a.get('id') == 'seed-input')['max'] == '4294967295'
    tracked = set(subprocess.check_output(['git','ls-files'], cwd=ROOT, text=True).splitlines())
    references = [a[key] for _, a in tags for key in ['src','href'] if key in a and not a[key].startswith('#')]
    references += re.findall(r"url\(['\"]?([^)'\"]+)", html.with_name('style.css').read_text())
    for reference in references:
        assert not urlsplit(reference).scheme and not reference.startswith('//'), reference
        assert (html.parent / reference).resolve().relative_to(ROOT).as_posix() in tracked, reference
    # Fixture descriptions use the current canonical data and the core's text format.
    fixture = json.loads(subprocess.check_output([
        'node','--experimental-default-type=module','--input-type=module','-e',
        "import {SPECIES,ABILITIES} from './Games/Foldwild/data.js';"
        "const words=Object.entries(ABILITIES).map(([name,a])=>{const e=[];"
        "for(const [k,label] of [['power','power'],['heal','heal'],['restore','restore'],['shield','shield']])"
        "if(a[k])e.push(label+' '+a[k]+(k==='restore'?' energy':''));"
        "if(a.status)e.push(a.status);if(a.buff)e.push(a.buff.stat+' +'+a.buff.percent+'%');"
        "if(a.debuff)e.push(a.debuff.stat+' -'+a.debuff.percent+'%');if(a.cleanse)e.push('cleanse status');"
        "return name+' · cost '+a.cost+' · '+e.join(', ')}).sort((a,b)=>b.length-a.length).slice(0,4);"
        "console.log(JSON.stringify({words,names:SPECIES.slice().sort((a,b)=>b.name.length-a.name.length)"
        ".slice(0,3).map(s=>s.name+' · level 40 · '+s.element)}));"
    ], cwd=ROOT, text=True))
    OUTPUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1',8795), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    watchdog = threading.Timer(100, server.shutdown)
    watchdog.start()
    origin = 'http://127.0.0.1:8795'
    issues, metrics, pictures = [], {}, []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox','--disable-gpu'])
            try:
                for name, width, height in [('desktop',1280,720),('mobile',390,844),('narrow',320,740)]:
                    context = browser.new_context(viewport={'width':width,'height':height}, has_touch=name!='desktop')
                    def local_shell(route):
                        if urlsplit(route.request.url).netloc != urlsplit(origin).netloc:
                            issues.append('external: '+route.request.url)
                            route.abort()
                        elif urlsplit(route.request.url).path == '/Games/Foldwild/script.js':
                            route.fulfill(status=200, content_type='text/javascript', body='// Static layout fixture: core intentionally not loaded.')
                        else:
                            route.continue_()
                    context.route('**/*', local_shell)
                    page = context.new_page()
                    page.set_default_timeout(15000)
                    page.on('pageerror', lambda error: issues.append(str(error)))
                    page.on('console', lambda msg: issues.append(msg.text) if msg.type=='error' else None)
                    page.on('requestfailed', lambda request: issues.append('failed: '+request.url))
                    page.on('response', lambda response: issues.append(str(response.status)+' '+response.url) if response.status>=400 else None)
                    page.goto(origin+'/Games/Foldwild/')
                    page.evaluate('document.fonts.ready')
                    assert page.evaluate('typeof window.foldwildSnapshot') == 'undefined', 'core was not isolated'
                    page.evaluate('''fixture => {
                        const get=id=>document.getElementById(id);
                        document.querySelector('.play-layout').hidden=true;
                        get('continue').hidden=false;
                        get('starter-description').textContent=fixture.names[0]+' · Four abilities. Starts at level 3.';
                        for(const [id,value] of [['zone-name','Rootfold Meadow · trailkeepers 0/5'],['marks','90'],['kites','8'],['class-name','Quartermaster'],['synergy-name','Coverage'],['message','Survey the riverbank. Approach a trail marker to interact.']])get(id).textContent=value;
                        const add=(id,tag,words)=>words.forEach(word=>{const e=document.createElement(tag);e.textContent=word;if(tag==='button')e.type='button';get(id).append(e)});
                        add('team-list','p',fixture.names.map(name=>name+' · HP 108/108 · energy 36/36'));
                        add('nearby-actions','button',['Supply merchant','Maren: regional trial','Riverbank wild ally']);
                        add('switch-list','button',fixture.names.map(name=>'Switch: '+name+' · HP 108'));
                        for(const [i,word] of fixture.words.entries())get('ability-'+i).textContent=(i+1)+'. '+word;
                        get('capture').textContent='Latch Kite: Weaken the wild creature to half HP or less';
                        get('capture').disabled=true;get('wait').textContent='Wait · restore 3 energy';
                        for(const [i,side] of ['player','enemy'].entries()){
                            get(side+'-name').textContent=fixture.names[i];
                            get(side+'-hp').textContent='108 / 108';get(side+'-energy').textContent='36 / 36';
                            get(side+'-hp-bar').value=80;get(side+'-energy-bar').value=60;
                        }
                        const movement=document.createElement('div');movement.className='actions';movement.setAttribute('aria-label','Held movement controls');
                        for(const label of ['Forward','Left','Back','Right']){const b=document.createElement('button');b.type='button';b.dataset.move=label;b.textContent=label;movement.append(b)}
                        get('world-help').append(movement);
                        for(let i=0;i<12;i++){
                            const card=document.createElement('section');
                            const p=document.createElement('p');p.textContent=fixture.names[i%3]+' · Seen · XP 120';
                            const description=document.createElement('p');description.textContent=fixture.words.join('; ');
                            const b=document.createElement('button');b.type='button';b.textContent='Add to team';card.append(p,description,b);get('collection-list').append(card);
                        }
                        const label=document.createElement('label');label.textContent='Active expedition class';
                        const select=document.createElement('select');for(const name of ['Pathfinder','Quartermaster']){const o=document.createElement('option');o.textContent=name;select.append(o)}
                        label.append(select);get('service-content').append(label);
                        add('service-content','p',['Marks 90. Patch: 18 Marks. Stock 4.','Supplies and outfit choices appear here when a service is available.']);
                        add('service-content','button',['Buy one patch: 18 Marks','Fulfill supply contract: three fiber']);
                    }''', fixture)
                    for phase in ['menu','world','battle']:
                        page.evaluate('''phase=>{document.getElementById('menu').hidden=phase!=='menu';document.querySelector('.play-layout').hidden=phase==='menu';document.getElementById('world-hud').hidden=phase==='menu';document.getElementById('battle-panel').hidden=phase!=='battle';document.getElementById('world-help').hidden=phase!=='world';}''', phase)
                        page.evaluate('window.scrollTo(0,0)')
                        result = page.evaluate('''() => {
                            const box=e=>{const r=e.getBoundingClientRect();return {id:e.id,w:r.width,h:r.height,x:r.x,y:r.y,bottom:r.bottom}};
                            return {width:innerWidth,scroll:document.documentElement.scrollWidth,bodyFont:getComputedStyle(document.body).fontSize,
                                targets:[...document.querySelectorAll('button,a,summary,input:not([type=checkbox]),select')].map(box).filter(r=>r.w&&r.h&&r.y>=0),
                                canvas:box(document.getElementById('game-canvas'))};
                        }''')
                        assert result['scroll'] <= width, (name,phase,result)
                        assert float(result['bodyFont'][:-2]) >= 15
                        assert all(r['w']>=44 and r['h']>=44 for r in result['targets']), (name,phase,result['targets'])
                        if phase != 'menu':
                            assert result['canvas']['h'] >= (270 if phase=='battle' else 300), result
                        if phase == 'battle':
                            for id in ['ability-0','ability-1','ability-2','ability-3','capture','wait','flee']:
                                r=page.locator('#'+id).bounding_box()
                                if name!='narrow':
                                    assert r['y']>=0 and r['y']+r['height']<=height, (name,id,r)
                            assert page.locator('#pause').is_visible(), 'pause must remain available'
                        metrics[name+'-'+phase]=result
                        image=OUTPUT/(name+'-'+phase+'.png')
                        page.screenshot(path=str(image), full_page=False)
                        pictures.append(image)
                    page.evaluate("document.getElementById('battle-panel').hidden=true; document.getElementById('world-help').hidden=false")
                    page.locator('.travel > summary').click()
                    for region in range(5):
                        assert page.locator(f'[data-region="{region}"]').bounding_box()['height'] >= 44
                    for dialog in ['service','collection']:
                        page.evaluate("id=>document.getElementById(id).showModal()",dialog+'-dialog')
                        assert page.evaluate('document.documentElement.scrollWidth') <= width
                        assert page.locator('#'+dialog+'-dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth'), dialog
                        image=OUTPUT/(name+'-'+dialog+'.png')
                        page.screenshot(path=str(image), full_page=False)
                        pictures.append(image)
                        if dialog=='service':
                            page.locator('#service-close').click()
                        else:
                            page.keyboard.press('Escape')
                        assert not page.locator('#'+dialog+'-dialog').evaluate('(e)=>e.open')
                    if name!='narrow':
                        page.emulate_media(color_scheme='dark',reduced_motion='reduce')
                        page.locator('.travel > summary').click()
                        assert page.evaluate('getComputedStyle(document.body).color') == 'rgb(36, 40, 32)'
                        image=OUTPUT/(name+'-dark-preference-world.png')
                        page.screenshot(path=str(image), full_page=False)
                        pictures.append(image)
                    context.close()
            finally:
                browser.close()
    finally:
        watchdog.cancel()
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    assert not issues, issues
    assert monotonic()-started < 100, '100-second bound exceeded'
    size=sum(image.stat().st_size for image in pictures)
    assert size < 2_000_000, size
    print(json.dumps({'kind':'STATIC LAYOUT, NOT GAMEPLAY','cases':len(metrics),'issues':issues,
        'canvas_heights':{name:m['canvas']['h'] for name,m in metrics.items()},
        'screenshot_bytes':size,'seconds':round(monotonic()-started,2),'storage_delta':free-shutil.disk_usage(ROOT).free}))
    print('PASS: retained 61 old IDs, new shell ABI, tracked local references, 9 layouts, 44px targets, native modal close/Escape')


if __name__ == '__main__':
    run()

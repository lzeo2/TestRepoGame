#!/usr/bin/env python3
"""View-only browser regression. Does not load Foldwild's unfinished entry module."""
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/tmp/foldwild-view-qa')
HARNESS = b'''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Foldwild view regression</title>
<link rel="stylesheet" href="/Games/Foldwild/style.css">
<style>body{padding:12px}h1{margin:0 0 12px}canvas{display:block;width:100%;height:520px;border:2px solid #365a74;border-radius:6px;touch-action:none}#message{margin-top:12px}@media(max-width:500px){canvas{height:340px}}</style>
<h1>Foldwild</h1><canvas id="game-canvas" aria-label="View test"></canvas>
<p id="message" role="status"></p>
<script type="module">
import {createView} from '/Games/Foldwild/view.js';
import * as THREE from '/Games/Foldwild/vendor/three.module.js';
import {SPECIES} from '/Games/Foldwild/data.js';
window.species=SPECIES;window.THREE=THREE;window.checkpoints=[];
window.view=createView(document.querySelector('canvas'),{onCheckpoint:id=>checkpoints.push(id)});
window.world={region:0,position:{x:0,z:4},points:[
{id:'left',x:-3,z:0,type:'wild',speciesId:'cindupp'},
{id:'right',x:3,z:-1,type:'wild',speciesId:'dewgob'},
{id:'far',x:0,z:-4,type:'wild',speciesId:'pithnip'},
{id:'keeper',x:6,z:-2,type:'rival'}, {id:'camp',x:-4,z:4,type:'camp'},
{id:'exit',x:0,z:-8,type:'exit'}]};
window.tick=(n=1)=>{for(let i=0;i<n;i++)view.render(1/60);return view.inspect()};
window.screenPoint=(x,z,px=0,pz=4,yaw=0)=>{
 const r=document.querySelector('canvas').getBoundingClientRect();
 const c=new THREE.PerspectiveCamera(45,r.width/r.height,.1,90);
 c.position.set(px+Math.sin(yaw)*8,5,pz+Math.cos(yaw)*8);c.lookAt(px,.7,pz);c.updateMatrixWorld();
 const v=new THREE.Vector3(x,0,z).project(c);
 return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};
};
window.ready=true;
</script></html>'''


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/__foldwild_view_test__':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(HARNESS)
        else:
            super().do_GET()

    def log_message(self, *_args):
        pass


class ContractParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.scripts = []
        self.starters = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'script':
            self.scripts.append(attrs.get('src'))
        if 'data-starter' in attrs:
            self.starters.append(attrs['data-starter'])


def check_contract():
    parser = ContractParser()
    parser.feed((ROOT / 'Games/Foldwild/index.html').read_text())
    expected = '''game-canvas message menu start continue starter-description world-hud
zone-name score dex-count kites save-state nearby-actions interact rest collection-btn pause
new-run world-help team-list battle-panel player-name enemy-name player-hp enemy-hp
player-energy enemy-energy player-status enemy-status ability-0 ability-1 ability-2 ability-3
capture wait flee switch-list battle-log result result-title result-description result-continue
dialogue-dialog dialogue-title dialogue-text dialogue-start dialogue-cancel collection-dialog
collection-list collection-close reset-dialog reset-confirm reset-cancel reduce-motion'''.split()
    assert len(parser.ids) == len(set(parser.ids)), 'duplicate HTML id'
    assert set(expected) <= set(parser.ids), set(expected) - set(parser.ids)
    assert parser.scripts == ['./script.js'], parser.scripts
    assert parser.starters == ['cindupp', 'dewgob', 'pithnip']


def run():
    check_contract()
    OUTPUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    summary = {}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context(viewport={'width': 1100, 'height': 720}, device_scale_factor=2)
                external = []
                def local_only(route):
                    if urlsplit(route.request.url).netloc != urlsplit(origin).netloc:
                        external.append(route.request.url)
                        route.abort()
                    else:
                        route.continue_()
                context.route('**/*', local_only)
                page = context.new_page()
                errors, failed, models = [], [], []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
                page.on('requestfailed', lambda req: failed.append(req.url))
                page.on('request', lambda req: models.append(req.url) if req.url.endswith('.glb') else None)
                page.goto(origin + '/__foldwild_view_test__')
                page.wait_for_function('window.ready === true')
                stats = page.evaluate('async()=>{await view.showWorld(world);return tick(2)}')
                assert len(stats['loadedModels']) == 3 and not stats['fallbackModels'], stats
                assert not stats['hiddenAvailable'] and len(models) == 3, models
                assert stats['drawCalls'] < 80 and stats['triangles'] < 120000, stats
                assert page.evaluate('Object.isFrozen(view.inspect()) && Object.isFrozen(view.inspect().loadedModels)')
                stopped = page.evaluate('view.inspect().frames')
                page.wait_for_timeout(80)
                assert page.evaluate('view.inspect().frames') == stopped, 'view owns an animation loop'
                summary['world'] = stats
                page.screenshot(path=str(OUTPUT / 'world-desktop.png'))
                p = page.evaluate('screenPoint(-3,0)')
                page.mouse.click(p['x'], p['y'])
                assert page.evaluate('checkpoints.at(-1)') == 'left'
                before = page.evaluate('checkpoints.length')
                page.mouse.move(p['x'], p['y'])
                page.mouse.down()
                page.mouse.move(p['x'] + 50, p['y'] + 50)
                page.mouse.up()
                assert page.evaluate('checkpoints.length') == before, 'drag treated as tap'
                stats = page.evaluate("async()=>{await view.showBattle({playerSpeciesId:'cindupp',enemySpeciesId:'kilnarch'});return tick(2)}")
                assert len(stats['loadedModels']) == 2 and not stats['fallbackModels'], stats
                assert stats['drawCalls'] < 80 and stats['triangles'] < 120000, stats
                summary['battle'] = stats
                page.screenshot(path=str(OUTPUT / 'battle-desktop.png'))
                page.evaluate("view.animateAction({type:'capture',side:'player'});tick(40);view.animateAction({type:'ability',side:'enemy'});tick(20);view.animateAction({type:'hit',side:'enemy'});tick(20)")
                # A mirror match checks shared resources survive releases and re-use.
                page.evaluate("async()=>{await view.showBattle({playerSpeciesId:'cindupp',enemySpeciesId:'cindupp'});tick(2);await view.showWorld(world);tick(2)}")
                # Pending old requests must not attach to a newer scene.
                stats = page.evaluate("async()=>{const old=view.showWorld({...world,points:[{id:'old',x:0,z:0,type:'wild',speciesId:'thrumkin'}]});await view.showBattle({playerSpeciesId:'dewgob',enemySpeciesId:'pithnip'});await old;return tick(2)}")
                assert stats['mode'] == 'battle' and len(stats['loadedModels']) == 2, stats
                assert not any('thrumkin' in path for path in stats['loadedModels']), stats
                # More than twelve distinct descriptors exercise retirement, without preloading the roster.
                page.evaluate('''async()=>{for(let i=0;i<14;i+=2){await view.showBattle({playerSpeciesId:species[i].id,enemySpeciesId:species[i+1].id});tick(1);if(view.inspect().fallbackModels.length)throw Error('cache cycle fallback')}}''')
                stats = page.evaluate('async()=>{await view.showWorld(world);return tick(2)}')
                assert len(stats['loadedModels']) == 3 and not stats['fallbackModels'], stats
                assert sum(url.endswith('/cindupp.glb') for url in models) >= 2, 'LRU did not evict the old model'
                for region in [1, 2]:
                    stats = page.evaluate('async region=>{await view.showWorld({...world,region});return tick(2)}', region)
                    assert len(stats['loadedModels']) == 3 and not stats['fallbackModels'], stats
                    assert stats['drawCalls'] < 80 and stats['triangles'] < 120000, stats
                page.set_viewport_size({'width': 1800, 'height': 1100})
                stats = page.evaluate('view.resize();tick(1)')
                assert stats['width'] <= 1280 and stats['height'] <= 720, stats
                # Reduced motion makes follow-camera changes immediate and disables effects.
                page.evaluate('view.setReducedMotion(true);view.setPlayerPosition(1,4,0);tick(1)')
                p = page.evaluate('screenPoint(3,-1,1,4)')
                page.mouse.click(p['x'], p['y'])
                assert page.evaluate('checkpoints.at(-1)') == 'right', 'camera did not follow the player'
                page.evaluate("async()=>{await view.showBattle({playerSpeciesId:'cindupp',enemySpeciesId:'dewgob'});tick(1)}")
                baseline = page.locator('canvas').screenshot()
                page.evaluate("view.animateAction({type:'ability',side:'player'});tick(1);view.animateAction({type:'capture',side:'player'});tick(1);view.animateAction({type:'hit',side:'enemy'});tick(1)")
                assert page.locator('canvas').screenshot() == baseline, 'reduced-motion frame changed'
                page.evaluate('view.dispose()')
                context.close()
                # Fresh touch context, same local-only policy, at both narrow widths.
                mobile = browser.new_context(viewport={'width': 390, 'height': 700}, has_touch=True, is_mobile=True)
                mobile.route('**/*', local_only)
                page = mobile.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
                page.on('requestfailed', lambda req: failed.append(req.url))
                page.goto(origin + '/__foldwild_view_test__')
                page.wait_for_function('window.ready === true')
                for width in [390, 320]:
                    page.set_viewport_size({'width': width, 'height': 700})
                    stats = page.evaluate('async()=>{view.resize();await view.showWorld(world);return tick(2)}')
                    assert not stats['fallbackModels'] and stats['width'] <= width, stats
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                    # Center marker stays in view on narrow, third-person layouts.
                    p = page.evaluate('screenPoint(0,-4)')
                    page.touchscreen.tap(p['x'], p['y'])
                    assert page.evaluate('checkpoints.at(-1)') == 'far', (width, p)
                    if width == 390:
                        page.screenshot(path=str(OUTPUT / 'world-mobile.png'))
                count = page.evaluate('checkpoints.length')
                page.evaluate('view.dispose();view.dispose()')
                page.touchscreen.tap(p['x'], p['y'])
                assert page.evaluate('checkpoints.length') == count, 'disposed pointer listener still active'
                mobile.close()
                assert not errors and not failed and not external, (errors, failed, external)
                summary['clean_console_errors'] = len(errors)
                summary['clean_failed_requests'] = len(failed)
                # Intentional negative fixture is isolated from all clean-pass counts.
                negative = browser.new_context(viewport={'width': 800, 'height': 650})
                negative.route('**/*', local_only)
                negative.route('**/models/Kilnback/cindupp.glb', lambda route: route.fulfill(status=404, body='intentional fixture'))
                page = negative.new_page()
                negative_errors, negative_failed = [], []
                page.on('console', lambda msg: negative_errors.append(msg.text) if msg.type == 'error' else None)
                page.on('pageerror', lambda error: negative_failed.append(str(error)))
                page.goto(origin + '/__foldwild_view_test__')
                page.wait_for_function('window.ready === true')
                stats = page.evaluate('async()=>{await view.showWorld(world);return tick(2)}')
                assert len(stats['loadedModels']) == 2 and len(stats['fallbackModels']) == 1, stats
                assert 'cindupp' in stats['fallbackModels'][0]
                assert 'Marker used instead' in page.locator('#message').inner_text()
                assert not negative_failed, negative_failed
                assert all('404' in text for text in negative_errors), negative_errors
                summary['intentional_404_fallback'] = stats['fallbackModels']
                page.evaluate('view.dispose()')
                negative.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    images = [OUTPUT / f'{name}.png' for name in ['world-desktop', 'battle-desktop', 'world-mobile']]
    total = sum(path.stat().st_size for path in images)
    if total >= 500000:
        from PIL import Image
        for path in images:
            with Image.open(path) as image:
                image.convert('RGB').quantize(colors=128).save(path, optimize=True)
        total = sum(path.stat().st_size for path in images)
    assert total < 500000, total
    summary['screenshot_bytes'] = total
    print(json.dumps(summary, indent=2))
    print('PASS: view-only GLB, framing budgets, pointer, resize, lifecycle and fallback checks')


if __name__ == '__main__':
    run()

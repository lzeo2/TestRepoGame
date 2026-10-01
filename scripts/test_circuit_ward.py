#!/usr/bin/env python3
"""Bounded real-browser Circuit Ward regression; no release-gate substitute."""
import functools
import json
import os
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
GAME = 'Games/Circuit Ward/'
OUT = Path(os.environ.get('CIRCUIT_SHOTS', '/tmp/circuit-ward-qa'))


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def snapshot(page):
    return page.evaluate('window.qaGame.inspect()')


def wait_phase(page, phase):
    page.wait_for_function('phase => window.qaGame.inspect().phase === phase', arg=phase)


def return_to_menu(page):
    if not page.locator('#menuBtn').is_visible():
        page.locator('#pauseBtn').click()
        wait_phase(page, 'paused')
    page.locator('#menuBtn').click()


def check_geometry(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
    assert page.locator('button').evaluate_all("""buttons => buttons.every(b => {
        const r = b.getBoundingClientRect();
        return !r.width || !r.height || (r.width >= 44 && r.height >= 44);
    })"""), 'small touch control'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    errors = []
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/'
    contexts = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=[
                '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader',
                '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
            ])

            def page_for(width=1280, height=720, touch=False):
                ctx = browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch)
                contexts.append(ctx)
                page = ctx.new_page()
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                page.on('response', lambda r: errors.append(f'HTTP {r.status}: {r.url}') if r.status >= 400 else None)
                page.on('requestfailed', lambda r: errors.append(f'{r.url}: {r.failure}'))
                page.on('request', lambda r: errors.append('External request: ' + r.url)
                        if r.url.startswith(('http:', 'https:')) and not r.url.startswith(base) else None)
                page.goto(base + quote(GAME) + 'index.html', wait_until='networkidle')
                page.evaluate("async () => { window.qaGame = await import('./script.js'); }")
                assert page.evaluate("typeof window.qaGame.inspect === 'function'")
                try:
                    page.wait_for_function("window.qaGame.stats().models.length === 6 && window.qaGame.stats().models.every(m => m.status === 'loaded')")
                except Exception:
                    print('Model diagnostic:', page.evaluate('window.qaGame.stats()'), errors, flush=True)
                    raise
                loaded_frame = page.evaluate('window.qaGame.stats().frames')
                page.wait_for_function('frame => window.qaGame.stats().frames > frame', arg=loaded_frame)
                diagnostics = page.evaluate('window.qaGame.stats()')
                assert diagnostics['primitiveWalls'] is False, diagnostics
                assert {m['name']: m['triangles'] for m in diagnostics['models']} == {
                    'cover-console': 828, 'sentry-walker': 1564, 'buzzer-drone': 1220,
                    'coil-blaster': 936, 'repair-cell': 308, 'arena-wall': 836,
                }, diagnostics
                assert page.evaluate("""() => {
                    const s = window.qaGame.stats();
                    return Object.isFrozen(s) && Object.isFrozen(s.models) && s.models.every(m =>
                        Object.isFrozen(m) && Object.isFrozen(m.bounds) &&
                        ['min', 'max'].every(k => Object.isFrozen(m.bounds[k]) &&
                            m.bounds[k].length === 3 && m.bounds[k].every(Number.isFinite)) &&
                        m.bounds.min.every((v, i) => v < m.bounds.max[i]));
                }"""), diagnostics
                return page

            page = page_for()
            check_geometry(page)
            page.screenshot(path=str(OUT / 'desktop-menu.png'))
            page.locator('#startSolo').click()
            wait_phase(page, 'playing')
            initial = snapshot(page)
            assert initial['wave'] == 1 and initial['score'] == 0 and initial['players'][0]['hp'] == 100
            page.keyboard.down('w')
            page.wait_for_function('z => Math.abs(window.qaGame.inspect().players[0].z-z) > .1', arg=initial['players'][0]['z'])
            page.keyboard.up('w')
            page.keyboard.down('l')
            page.wait_for_function('Math.abs(window.qaGame.inspect().players[0].yaw) > .02')
            page.keyboard.up('l')
            page.keyboard.press('Space')
            page.wait_for_function('window.qaGame.inspect().players[0].shot > 0')
            page.screenshot(path=str(OUT / 'desktop-combat.png'))
            metrics = page.evaluate('window.qaGame.stats()')
            calls = metrics.get('calls', metrics.get('drawCalls', 0))
            assert 0 < calls < 80, metrics
            assert 0 < metrics['triangles'] < 120000, metrics
            page.locator('#pauseBtn').click()
            wait_phase(page, 'paused')
            before_pause = snapshot(page)['time']
            page.wait_for_timeout(150)
            assert snapshot(page)['time'] == before_pause, 'simulation continued while paused'
            page.locator('#resumeBtn').click()
            wait_phase(page, 'playing')
            return_to_menu(page)
            page.locator('#startSolo').click()
            wait_phase(page, 'playing')
            assert snapshot(page)['score'] == 0 and snapshot(page)['wave'] == 1, 'restart/reset failed'
            return_to_menu(page)

            # Exercise the same pure simulation functions on independent runs,
            # never mutate the running match or add production cheat controls.
            pure = page.evaluate("""async () => {
                const {createRun, stepRun} = await import('./script.js');
                const neutral = new Map([[0,{mx:0,mz:0,yaw:0,pitch:0,fire:false}]]);
                let dead = createRun(); dead.players[0].hp = 0;
                dead = stepRun(dead, neutral, 1/60);
                if (dead.phase !== 'lost') throw Error('lose state');
                let won = createRun(); won.wave = 6; won.bots = [];
                for(let i=0;i<400 && won.phase==='playing';i++) won=stepRun(won,neutral,1/60);
                if(won.phase !== 'won') throw Error('win state');
                let team=createRun([0,1]);
                team.players[1].hp=0;team.bots=[];
                for(let i=0;i<400 && team.wave===1;i++) team=stepRun(team,neutral,1/60);
                if(team.wave!==2 || team.players[1].hp<=0) throw Error('shared wave respawn');
                let collision=createRun();
                for(let i=0;i<400 && collision.phase==='playing';i++)
                    collision=stepRun(collision,new Map([[0,{mx:1,mz:0,yaw:0,pitch:0,fire:false}]]),1/60);
                if(Math.abs(collision.players[0].x)>11 || collision.players[0].x<10) throw Error('arena boundary');
                let combat=createRun([0,1]);
                combat.players[0].x=0;combat.players[0].z=2;
                combat.players[1].x=0;combat.players[1].z=1;
                combat.bots=[{id:99,type:'walker',x:0,y:0,z:0,hp:100,cooldown:10,stun:0}];
                for(let i=0;i<35;i++) combat=stepRun(combat,new Map([[0,{mx:0,mz:0,yaw:0,pitch:0,fire:true}]]),1/60);
                if(combat.score!==100 || combat.players[1].hp!==100) throw Error('scoring/friendly fire');
                let repair=createRun();repair.players[0].hp=50;
                repair.cells=[{id:99,x:repair.players[0].x,z:repair.players[0].z}];
                repair=stepRun(repair,neutral,1/60);
                if(repair.players[0].hp!==75 || repair.cells.length) throw Error('repair pickup');
                const {validateInput,validateSnapshot,parseSignal}=await import('./multiplayer.js');
                if(!validateInput(neutral.get(0)) || validateInput({...neutral.get(0),yaw:NaN}) ||
                   validateInput({...neutral.get(0),mx:1,mz:1}) || validateInput({...neutral.get(0),id:3})) throw Error('input validation');
                const s=(await import('./script.js')).inspect();
                if(!validateSnapshot(s) || validateSnapshot({...s,score:Infinity}) ||
                   validateSnapshot({...s,phase:'invented'})) throw Error('snapshot validation');
                let rejected=0;for(const text of ['not-json','x'.repeat(32769)]) {
                    try{parseSignal(text,'offer')}catch{rejected++}
                }
                if(rejected!==2) throw Error('signal validation');
                return {lose:dead.phase,win:won.phase,teamWave:team.wave,friendlyFire:false,score:combat.score,repair:75,validation:true};
            }""")

            for width in (390, 320):
                phone = page_for(width, 844, True)
                check_geometry(phone)
                if width == 390:
                    phone.screenshot(path=str(OUT / 'mobile-menu.png'))
                phone.locator('#startSolo').click()
                wait_phase(phone, 'playing')
                check_geometry(phone)
                assert phone.locator('#touchMove').is_visible() and phone.locator('#touchFire').is_visible()
                before_touch = snapshot(phone)['players'][0]
                pad = phone.locator('#touchMove').bounding_box()
                x, y = pad['x'] + pad['width'] / 2, pad['y'] + pad['height'] / 2
                cdp = phone.context.new_cdp_session(phone)
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 0}]})
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y - 35, 'id': 0}]})
                phone.wait_for_function('z => Math.abs(window.qaGame.inspect().players[0].z-z) > .1', arg=before_touch['z'])
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                aim = phone.locator('#touchAim').bounding_box()
                x, y = aim['x'] + aim['width'] / 2, aim['y'] + aim['height'] / 2
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 0}]})
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + 20, 'y': y - 20, 'id': 0}]})
                phone.wait_for_function('Math.abs(window.qaGame.inspect().players[0].yaw) > .02')
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                cdp.detach()
                phone.locator('#touchFire').tap()
                phone.wait_for_function('shot => window.qaGame.inspect().players[0].shot > shot', arg=before_touch['shot'])
                if width == 390:
                    phone.screenshot(path=str(OUT / 'mobile-combat.png'))
                phone.close()

            # Pair via the public native UI, just as users paste offers/answers.
            host = page
            # Four simultaneous SwiftShader windows must fit the software GPU;
            # the independent desktop/mobile checks above keep their full sizes.
            host.set_viewport_size({'width': 640, 'height': 360})
            # Load everyone's graphics before the intentionally short pairing
            # deadline; shader startup is not part of exchanging descriptions.
            prepared = [page_for(640, 360) for _ in range(3)]
            for guest in prepared:
                guest.locator('#joinRoom').click()
            host.locator('#hostRoom').click()
            guests = []
            for guest in prepared:
                old_offer = host.locator('#signalOutput').input_value()
                host.locator('#makeOffer').click()
                host.wait_for_function("old => document.querySelector('#signalOutput').value.length > 0 && document.querySelector('#signalOutput').value !== old", arg=old_offer)
                offer = host.locator('#signalOutput').input_value()
                guest.locator('#signalInput').fill(offer)
                guest.locator('#createAnswer').click()
                guest.wait_for_function("document.querySelector('#signalOutput').value.length > 0")
                answer = guest.locator('#signalOutput').input_value()
                host.locator('#signalInput').fill(answer)
                host.locator('#acceptAnswer').click()
                guests.append(guest)
                try:
                    host.wait_for_function('count => window.qaGame.inspect().players.length === count', arg=len(guests) + 1)
                except Exception:
                    print('Pair diagnostic:', len(guests), host.locator('#roomStatus').text_content(), guest.locator('#roomStatus').text_content(), flush=True)
                    raise
                assert not host.locator('#startCoop').is_disabled()
            host.locator('#startCoop').click()
            wait_phase(host, 'playing')
            for guest in guests:
                wait_phase(guest, 'playing')
                assert len(snapshot(guest)['players']) == 4, 'roster sync failed'
            assert len(snapshot(host)['players']) == 4
            assert host.locator('#scoreLabel').text_content() == 'Pooled score'
            guest_start = snapshot(host)['players'][1]['z']
            guest = guests[0]
            guest.evaluate("""() => {
                window.qaKeyTarget = null;
                addEventListener('keydown', e => {
                    if (e.key.toLowerCase() === 'w') window.qaKeyTarget = {
                        tag: e.target.tagName, id: e.target.id,
                        formTarget: !!e.target.closest('button,textarea,input,a'),
                        prevented: e.defaultPrevented, trusted: e.isTrusted
                    };
                });
            }""")
            focus_before = guest.evaluate("({tag: document.activeElement.tagName, id: document.activeElement.id, formTarget: !!document.activeElement.closest('button,textarea,input,a')})")
            # A normal bay click leaves the signaling textarea and captures aim.
            guest.locator('#arena').click(position={'x': 320, 'y': 180})
            assert guest.evaluate("!document.activeElement.closest('button,textarea,input,a')"), 'gameplay input still targets a form'

            def peer_diagnostic(peer):
                return peer.evaluate("""() => {
                    const canvas = document.querySelector('#arena');
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    const debug = gl.getExtension('WEBGL_debug_renderer_info');
                    return {viewport: [innerWidth, innerHeight], canvas: [canvas.width, canvas.height],
                        driver: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
                        focused: document.hasFocus(), visibility: document.visibilityState,
                        inputTarget: {tag: document.activeElement.tagName, id: document.activeElement.id},
                        keyTarget: window.qaKeyTarget || null,
                        clockMs: performance.now(), time: window.qaGame.inspect().time,
                        renderer: {frames: window.qaGame.stats().frames,
                            drawCalls: window.qaGame.stats().drawCalls,
                            triangles: window.qaGame.stats().triangles}};
                }""")

            clocks_before = [peer_diagnostic(peer) for peer in [host, *guests]]
            movement_at = time.monotonic()
            guest.keyboard.down('w')
            try:
                host.wait_for_function('z => Math.abs(window.qaGame.inspect().players.find(p=>p.id===1).z-z) > .1', arg=guest_start)
            except Exception:
                print('Guest movement diagnostic:', json.dumps({
                    'host': snapshot(host), 'guest': snapshot(guests[0]),
                    'hostRenderer': host.evaluate('window.qaGame.stats()'),
                    'guestRenderer': guests[0].evaluate('window.qaGame.stats()'),
                    'elapsedRealSeconds': time.monotonic() - movement_at,
                    'focusBeforeBayClick': focus_before,
                    'clocksBefore': clocks_before,
                    'clocksAfter': [peer_diagnostic(peer) for peer in [host, *guests]],
                    'hostStatus': host.locator('#roomStatus').text_content(),
                    'guestStatus': guests[0].locator('#roomStatus').text_content(),
                    'errors': errors,
                }, sort_keys=True), flush=True)
                raise
            guest.keyboard.up('w')
            clocks_after = [peer_diagnostic(peer) for peer in [host, *guests]]
            print('Four-peer movement proof:', json.dumps({
                'elapsedRealSeconds': time.monotonic() - movement_at,
                'focusBeforeBayClick': focus_before,
                'guestZBefore': guest_start,
                'guestZAfter': snapshot(host)['players'][1]['z'],
                'clocksBefore': clocks_before, 'clocksAfter': clocks_after,
            }, sort_keys=True), flush=True)
            assert guest.evaluate('window.qaKeyTarget.trusted && !window.qaKeyTarget.formTarget'), 'W did not target gameplay'
            # Pointer capture routes mouse clicks to the bay; P is the public
            # pause control and releases capture before using the resume button.
            guest.keyboard.press('p')
            guest.locator('#resumeBtn').wait_for(state='visible')
            assert snapshot(host)['phase'] == 'playing', 'client pause stopped host'
            guests[0].locator('#resumeBtn').click()
            guests[-1].close()
            host.wait_for_function('window.qaGame.inspect().players.length === 3')
            assert snapshot(host)['phase'] == 'playing', 'guest departure stopped host'
            guests.pop()
            host.locator('#pauseBtn').click()
            wait_phase(host, 'paused')
            for guest in guests:
                wait_phase(guest, 'paused')
                assert snapshot(guest)['score'] == snapshot(host)['score'], 'pooled score diverged'
            host.screenshot(path=str(OUT / 'coop-host.png'))
            # Lobby/host shutdown must lead guests to an explicit solo/menu path.
            host.locator('#menuBtn').click()
            for guest in guests:
                guest.wait_for_timeout(3500)
                assert guest.locator('#freshSolo:visible, #fallbackSolo:visible, #startSolo:visible').count() > 0, 'disconnect solo fallback missing'
            # Independent native transport fixture: no frame producer calls
            # broadcast after the initial paused state. Real hidden-tab timer
            # throttling still needs a window-manager/device check.
            client = guests[0]
            for peer in (host, client):
                peer.evaluate("""async () => {
                    const {PeerRoom} = await import('./multiplayer.js');
                    window.qaPeer = new PeerRoom(); window.qaStates = 0; window.qaFailures = [];
                    qaPeer.addEventListener('state', e => { qaStates++; window.qaLastScore = e.detail.score; });
                    qaPeer.addEventListener('failure', e => qaFailures.push(e.detail.message));
                }""")
            host.evaluate('qaPeer.host()')
            offer = host.evaluate('qaPeer.hostOffer()')
            answer = client.evaluate('text => qaPeer.joinOffer(text)', offer)
            host.evaluate('text => qaPeer.acceptAnswer(text)', answer)
            host.wait_for_function('qaPeer.ids.length === 2')
            host.evaluate("""() => {
                qaPeer.lock();
                qaPeer.broadcast({epoch:1, phase:'paused', wave:1, score:100, time:0,
                    players:[0,1].map(id=>({id,x:id,z:0,yaw:0,pitch:0,hp:100,shot:0})), bots:[],cells:[]});
            }""")
            client.wait_for_timeout(4000)
            assert client.evaluate("qaPeer.role === 'client' && qaStates >= 3 && qaLastScore === 100 && qaFailures.length === 0"), 'paused heartbeat failed'
            for peer in (host, client):
                peer.evaluate('qaPeer.close()')
            assert not errors, errors
            print('Circuit Ward browser checks passed: solo controls/reset, win/lose/repair/friendly-fire, six local GLB replacements, keyboard/touch aiming, touch movement/fire, 320/390 layouts, four-peer sync/input/pause/departure/fallback at 640x360, paused transport heartbeat')
            print('Screenshots: desktop 1280x720; mobile 390x844; coop-host 640x360')
            print(json.dumps({'renderer': metrics, 'simulation': pure}, sort_keys=True))
            browser.close()
    finally:
        for ctx in contexts:
            try:
                ctx.close()
            except Exception:
                pass
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()

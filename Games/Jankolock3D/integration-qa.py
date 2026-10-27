"""Bounded integration evidence. Explicit API fixtures are labeled, never native claims."""
import argparse
import functools
import http.server
import io
import json
import os
from qa_roster import HERO_IDS, runtime_hashes
from pathlib import Path
import subprocess
import threading
from urllib.parse import urlsplit
from PIL import Image, ImageDraw, ImageStat
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/maintenance/audits/jankolock-3d-qa/integration'


def guard():
    available = int(subprocess.check_output(['df', '-B1', '/', '--output=avail'], text=True).splitlines()[-1])
    assert available >= 2178940928, f'Disk guard: {available} bytes'
    return available


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def source_hashes():
    return runtime_hashes(ROOT)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--traversal-only', action='store_true', help='Only A, isolated API placement/clock with native E; no combat acceptance')
    traversal_only = parser.parse_args().traversal_only
    before = guard()
    active = subprocess.run(['pgrep', '-f', '[c]hrome-linux/chrome|[c]hromium.*--remote-debugging-pipe'], capture_output=True)
    assert active.returncode != 0, 'Sibling browser active; sequence, do not overlap'
    guard(); OUT.mkdir(parents=True, exist_ok=True)
    report_file = OUT / ('integration-traversal-evidence.json' if traversal_only else 'integration-evidence.json')
    report = {'scope': 'traversal-only' if traversal_only else 'full',
              'traversalPolicy': 'Fresh page/simulation per lane; fixture API station placement/cooldown reset and scripted clock; native E. Per-instance passive hero bots only; structures defense unchanged. No HP edits/progress grants; no combat or ride-invariant acceptance.',
              'designObservation': 'Attempt 2 observed a live-combat midflight hero death/respawn. Design risk, not recreated by this isolated check.',
              'kind': 'Integrated software-WebGL builder evidence; reviewer grades acceptance. QA API fixtures are not native gameplay.',
              'storageBefore': before, 'screenshots': [], 'checks': {}, 'responses': [], 'errors': [], 'status': 'RUNNING',
              'sourceHashes': source_hashes()}
    def checkpoint():
        guard(); report_file.write_text(json.dumps(report, indent=2) + '\n')
    checkpoint()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '8947'))), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 720}, color_scheme='light', reduced_motion='reduce')
                def local_only(route):
                    if urlsplit(route.request.url).netloc == urlsplit(origin).netloc:
                        route.continue_()
                    else:
                        report['errors'].append('Blocked external request'); route.abort()
                context.route('**/*', local_only)
                page = context.new_page(); page.set_default_timeout(30000)
                page.on('pageerror', lambda e: report['errors'].append(str(e)))
                page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
                page.on('requestfailed', lambda r: report['errors'].append(f'{urlsplit(r.url).path}: {r.failure}'))
                page.on('response', lambda r: report['responses'].append({'path': urlsplit(r.url).path, 'status': r.status}))
                state = lambda: page.evaluate('window.jank3dSnapshot()')
                def load(query=''):
                    response = page.goto(origin + '/Games/Jankolock3D/index.html' + query, wait_until='networkidle')
                    assert response.status == 200
                    page.wait_for_function('typeof window.jank3dSnapshot === "function"')
                    page.wait_for_function('window.jank3dSnapshot().diagnostics.triangles > 0')
                    # Legacy named light comparisons explicitly select light; theme-qa.py tests the cold default.
                    if page.locator('html').get_attribute('data-theme') != 'light':
                        page.get_by_role('button', name='Light theme', exact=True).click()
                def capture(name, kind, mobile=False):
                    guard(); raw = page.screenshot(); image = Image.open(io.BytesIO(raw)).convert('RGB')
                    if mobile:
                        frame = Image.new('RGB', (1280, 720), '#25292b'); frame.paste(image, (0, 0)); image = frame
                    assert image.size == (1280, 720), image.size
                    variance = sum(ImageStat.Stat(image).var) / 3
                    assert variance > 100, (name, variance)
                    guard(); image.save(OUT / f'{"integration-traversal" if traversal_only else "integration"}-{name}.png')
                    report['screenshots'].append({'file': f'{"integration-traversal" if traversal_only else "integration"}-{name}.png', 'variance': round(variance, 2), 'kind': kind,
                                                  'viewport': '390x720 padded, not stretched' if mobile else '1280x720'})
                    checkpoint(); print(f'capture {name}: {kind}', flush=True)
                def start():
                    page.get_by_role('button', name='Start match', exact=True).click()
                    page.wait_for_function('window.jank3dSnapshot().playing')
                    page.locator('[data-close]').click()
                if not traversal_only:
                    load()
                    s = state(); assert s['portrait']['bytes'] == 3228372
                    assert s['portrait']['triangles'] == 124512
                    assert set(page.locator('[data-hero]').evaluate_all('(cards)=>cards.map(card=>card.dataset.hero)')) == set(HERO_IDS)
                    capture('H', 'Normal lobby, verified in-repo photo-derived relief; no fixture')
                    page.get_by_role('button', name='Dark theme', exact=True).click()
                    capture('H-dark', 'Normal lobby, dark theme')
                    page.get_by_role('button', name='Light theme', exact=True).click()
                    start(); assert len(state()['bots']) == 5
                    page.get_by_role('button', name='Pause', exact=True).click()
                    assert state()['paused']
                    capture('pause', 'Native pause dialog')
                    page.get_by_role('button', name='Resume', exact=True).click()
                    assert not state()['paused']
                    capture('I', 'HTTP200 normal integrated HUD, five bots, no fixture')
                # A: each navigation constructs a new sim/bot closure, never reused for combat.
                rides = report['checks']['zipRides'] = []
                for lane in ['graft', 'midway', 'greenhedge']:
                    load('?qa=traversal'); start()
                    page.wait_for_function('window.jank3dSnapshot().time > 0 && window.jank3dSnapshot().bots.length === 5 && window.jank3dSnapshot().bots.every(b=>b.mode === "passive")')
                    page.evaluate('window.jank3dQA.freeze(true)')
                    ride = {'lane': lane, 'freshNavigation': True, 'snapshots': []}
                    rides.append(ride); checkpoint()
                    setup = page.evaluate('(lane)=>window.jank3dQA.zip(lane)', lane)
                    ride['setup'] = setup
                    def observe(stage):
                        s = state(); previous = ride['snapshots'][-1] if ride['snapshots'] else None
                        p = s['controller']['position']; origin_position = [setup['position'][k] for k in ['x', 'y', 'z']]
                        sample = {'stage': stage, 'time': s['time'], 'elapsedSinceSetup': s['time'] - setup['time'],
                                  'deltaTime': s['time'] - previous['time'] if previous else 0,
                                  'heroHP': s['hero']['hp'], 'heroAlive': s['hero']['alive'],
                                  'deltaHP': s['hero']['hp'] - previous['heroHP'] if previous else 0,
                                  'controller': s['controller'], 'botModes': [b['mode'] for b in s['bots']],
                                  'displacementFromSetup': sum((a-b)**2 for a,b in zip(p, origin_position))**.5}
                        ride['snapshots'].append(sample); checkpoint()
                        return s
                    observe('beforeAttach')
                    assert setup['cooldown'] == 0, setup
                    try:
                        page.evaluate('window.jank3dQA.freeze(false)'); page.keyboard.down('KeyE')
                        page.wait_for_function('window.jank3dSnapshot().controller.mode === "zip"')
                        page.evaluate('window.jank3dQA.freeze(true)'); observe('attachment')
                    finally:
                        page.keyboard.up('KeyE')
                    page.evaluate('window.jank3dQA.freeze(false); window.jank3dQA.advance(10); window.jank3dQA.freeze(true)')
                    observe('ride-requested-10s')
                    capture('A-' + lane, 'Native E; API station placement and requested 10s clock, measured times in snapshots')
                    page.evaluate('window.jank3dQA.freeze(false); window.jank3dQA.advance(23); window.jank3dQA.freeze(true)')
                    end = observe('arrival-requested-33s')['controller']
                    assert end['mode'] == 'free' and end['position'][2] > 380, end
                    ride['arrival'] = end; checkpoint()
                page.evaluate('window.jank3dQA.overview()')
                capture('A', 'API aerial camera; not native full-lane walking or combat evidence')
                if traversal_only:
                    assert not report['errors'], report['errors']
                    assert all(r['status'] == 200 for r in report['responses']), report['responses']
                    report['status'] = 'COMPLETE-traversal-builder-checks-only'
                    print('integration-qa: traversal builder checks complete; reviewer grading separate.', flush=True)
                    return
                # B: exact wave clock is stepped through the production simulation, not actors injected.
                load('?qa=waves'); start()
                page.evaluate('window.jank3dQA.waves(); window.jank3dQA.place({x:-246,y:0,z:-48},Math.PI,-.05)')
                s = state(); assert len(s['troopers']) >= 24
                report['checks']['waveAt75'] = {'time': s['time'], 'troopers': len(s['troopers'])}
                capture('B', 'API clock to t75; real squads march/fight, no injected troopers')
                # C: normal damage produces orbs. Secure/ground/deny fixture actions are logged API calls.
                load('?qa=orbs'); start()
                orb = page.evaluate('window.jank3dQA.orbs()')
                capture('C', 'Real floating/ground drops after labeled API kill and camera reposition')
                before_souls = state()['hero']['souls']
                page.evaluate('(id)=>window.jank3dQA.aimAt(id)', orb)
                page.evaluate('window.jank3dQA.freeze(false)'); page.mouse.move(640, 390); page.mouse.down()
                page.wait_for_function('(id)=>window.jank3dSnapshot().history.some(e=>e.type==="orb_shot"&&e.orbId===id)', arg=orb)
                page.mouse.up(); page.keyboard.press('Escape'); page.evaluate('window.jank3dQA.freeze(true)')
                assert state()['hero']['souls'] > before_souls
                capture('C-secure', 'Native mouse weapon secure; API orb kill, camera aim and position setup')
                ground_souls = page.evaluate('window.jank3dQA.ground()'); assert ground_souls > before_souls + 40
                capture('C-ground', 'API placement within claim radius, actual production magnet/pickup')
                orb = page.evaluate('window.jank3dQA.orbs("ivory")')
                result = page.evaluate('(id)=>window.jank3dQA.secure(id)', orb); assert result['ok']
                capture('C-deny', 'API enemy floating soul deny')
                report['checks']['soulHistory'] = state()['history']
                # E: native numbered keys invoke all four selected-hero kits in the shared world.
                load('?qa=abilities'); start(); page.evaluate('window.jank3dQA.freeze(false); window.jank3dQA.advance(31)')
                page.evaluate('window.jank3dQA.place({x:0,y:0,z:-200},Math.PI,-.04)')
                for slot in [1, 2, 3, 4]:
                    page.keyboard.press('Digit' + str(slot)); page.evaluate('window.jank3dQA.freeze(true)')
                    assert len(state()['runtime']['casts']) >= slot
                    capture('E' if slot == 3 else f'E-{slot}', 'Native ability key in integrated world, API clock/position setup; FX frozen for capture')
                    page.evaluate('window.jank3dQA.freeze(false); window.jank3dQA.advance(.1)')
                report['checks']['abilityCasts'] = state()['runtime']['casts']
                page.keyboard.press('Space'); page.wait_for_function('window.jank3dSnapshot().controller.jumps >= 1')
                page.keyboard.press('Space'); page.wait_for_function('window.jank3dSnapshot().controller.jumps === 2')
                page.evaluate('window.jank3dQA.freeze(true)'); capture('E-double-jump', 'Native double jump after API location setup')
                page.evaluate('window.jank3dQA.freeze(false)'); page.keyboard.press('ShiftLeft')
                page.wait_for_function('window.jank3dSnapshot().controller.stamina < 100')
                page.evaluate('window.jank3dQA.freeze(true)'); capture('E-dash', 'Native dash, stamina consumed')
                page.evaluate('window.jank3dQA.place({x:0,y:0,z:-200}); window.jank3dQA.freeze(false)')
                page.keyboard.down('KeyW'); page.wait_for_timeout(500); page.keyboard.down('KeyC')
                page.wait_for_function('window.jank3dSnapshot().controller.state === "slide"')
                page.evaluate('window.jank3dQA.freeze(true)'); capture('E-slide', 'Native forward momentum and C slide')
                page.keyboard.up('KeyC'); page.keyboard.up('KeyW')
                # F: clearly seeded shop fixture, real click purchases/stat/active effects.
                load('?qa=shop'); start(); page.evaluate('window.jank3dQA.freeze(false); window.jank3dQA.advance(31); window.jank3dQA.freeze(true)')
                page.locator('[data-open]').click()
                capture('F', 'Shop fixture starts with 25,600 seeded souls, not earned income')
                page.get_by_label('Tier 1 / 800', exact=True).check()
                hp = state()['hero']['maxHp']; page.get_by_role('button', name='Buy Health', exact=True).click()
                assert state()['hero']['maxHp'] == hp + 200
                page.get_by_label('Tier 2 / 1,600', exact=True).check()
                page.get_by_role('button', name='Buy Dash charge', exact=True).click()
                page.locator('[data-close]').click(); p = state()['hero']['position']
                page.get_by_role('button', name='Activate Dash charge', exact=True).click()
                page.evaluate('window.jank3dQA.freeze(false); window.jank3dQA.advance(.05); window.jank3dQA.freeze(true)')
                q = state()['hero']['position']; assert ((q['x']-p['x'])**2+(q['z']-p['z'])**2)**.5 > 9
                capture('F-active', 'Native purchases and active-item click, real stat increase and collision-resolved dash')
                report['checks']['purchases'] = {'maxHp': state()['hero']['maxHp'], 'items': state()['hero']['items'], 'souls': state()['hero']['souls']}
                page.get_by_role('button', name='Dark theme', exact=True).click(); capture('HUD-dark', 'Integrated HUD dark theme')
                # D/G: actual public damage calls with passive hero bots, chronological locked-chain assertions in Node.
                load('?qa=chain'); start(); partial = page.evaluate('window.jank3dQA.chain("carbon",570)')
                patron = next(s for s in state()['structures'] if s['team'] == 'ivory' and s['type'] == 'patron')
                assert patron['alive'] and patron['vulnerable'] and patron['patronPhase'] == 2
                page.evaluate('window.jank3dQA.place({x:-10,y:0,z:410},Math.PI,-.04)')
                capture('D', 'Scripted chain at t570: all six shrines down, Patron P2 alive; passive hero bots')
                receipt = page.evaluate('window.jank3dQA.chain("carbon")')
                receipt['events'] = partial['events'] + receipt['events']; receipt['actions'] = partial['actions'] + receipt['actions']
                assert receipt['winner'] == 'carbon' and receipt['time'] == 600
                assert len([e for e in receipt['events'] if e['type'] == 'objective_fall' and e['team'] == 'ivory']) == 19
                guard(); (OUT / 'integration-chain.json').write_text(json.dumps(receipt, indent=2) + '\n')
                capture('G', 'Actual Patron P2 death produces Victory, not a forced winner')
                load('?qa=chain'); start(); loss = page.evaluate('window.jank3dQA.chain("ivory")'); assert loss['winner'] == 'ivory'
                capture('G-defeat', 'Symmetric API chain produces actual Defeat')
                # Actual narrow mobile layout; preserve native width, pad to screenshot contract.
                page.set_viewport_size({'width': 390, 'height': 720}); load()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                capture('mobile-lobby', 'Native 390px lobby layout, light theme', True)
                start(); capture('mobile-HUD', 'Native 390px integrated HUD, light theme', True)
                page.get_by_role('button', name='Dark theme', exact=True).click(); capture('mobile-dark', 'Native 390px HUD, dark theme', True)
                tiny = page.locator('button:visible').evaluate_all('(bs)=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44}).map(b=>b.textContent)')
                assert not tiny, tiny
                report['checks']['mobileOverflow'] = False; report['checks']['visibleButtonsMin44'] = True
                assert not report['errors'], report['errors']
                assert all(r['status'] == 200 for r in report['responses']), report['responses']
                report['status'] = 'PASS-builder-checks-only'
            finally:
                if 'page' in locals() and not page.is_closed():
                    try:
                        page.keyboard.press('Escape'); page.mouse.up(); page.mouse.up(button='right')
                        for key in ['KeyE', 'KeyW', 'KeyC', 'Space', 'ShiftLeft']:
                            page.keyboard.up(key)
                    except Exception as error:
                        report['errors'].append(f'Input cleanup: {error}')
                browser.close()
    except Exception as error:
        report['status'] = 'FAIL'; report['failure'] = f'{type(error).__name__}: {error}'
        raise
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=5)
        report['sourceHashesAfter'] = source_hashes()
        report['sourcesUnchanged'] = report['sourceHashes'] == report['sourceHashesAfter']
        if not report['sourcesUnchanged']:
            report['status'] = 'FAIL'; report['failure'] = 'Source hashes changed during capture'
        report['storageAfter'] = guard(); checkpoint()
        assert report['sourcesUnchanged'], report['failure']
    # Labeled mockup/runtime twins, not pixel-identity claims.
    for mock, actual, label in [
        ('ui-mockup-heroes.png', 'H', 'Lobby / hero selection'),
        ('ui-mockup-systems-normalized.png', 'F', 'Shop'),
        ('ui-mockup-world-normalized.png', 'A', 'District / map HUD'),
        ('ui-mockup-heroes.png', 'E', 'Hero / ability HUD'),
        ('ui-mockup-systems-normalized.png', 'I', 'Integrated HUD'),
        ('ui-mockup-heroes-mobile.png', 'mobile-HUD', 'Native mobile HUD (padded)')]:
        left = Image.open(ROOT / 'docs/jank3d-design' / mock).convert('RGB'); left.thumbnail((1280, 720))
        right = Image.open(OUT / f'integration-{actual}.png').convert('RGB')
        pair = Image.new('RGB', (2560, 752), '#eee9d8'); pair.paste(left, (0, 32)); pair.paste(right, (1280, 32))
        draw = ImageDraw.Draw(pair); draw.text((12, 9), f'Approved mockup: {label}', fill='black'); draw.text((1292, 9), f'Actual integrated page: {label}', fill='black')
        guard(); pair.save(OUT / f'comparison-{actual}.png')
    print(f'integration-qa: {len(report["screenshots"])} captures, {len(report["responses"])} HTTP200 responses, {len(report["errors"])} errors. Reviewer grading separate.', flush=True)


if __name__ == '__main__':
    main()

"""Bounded live-input basketball QA. Requires installed Playwright/system Chromium.

Run only after coordinating the exclusive shared browser slot. All positive
play uses real mouse/keyboard/touch input; snapshots are read-only observations.
Artifacts default to a temporary directory outside the repository. This is a
software WebGL functional/visual pass, not a hardware or native-sandbox claim.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
from threading import Thread
import time
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
FLAGS = ['--no-sandbox', '--disable-dev-shm-usage',
         '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifacts', type=Path)
    parser.add_argument('--port', type=int, default=0)
    parser.add_argument('--budget', type=int, default=470)
    args = parser.parse_args()
    if not 180 <= args.budget <= 480:
        parser.error('budget must be 180..480 seconds')
    if shutil.disk_usage(ROOT).free < 2147483648:
        raise RuntimeError('Disk below 2 GiB floor')
    output = (args.artifacts or Path(tempfile.mkdtemp(prefix='basketball-polish-'))).resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('artifacts must be outside repository')
    output.mkdir(parents=True, exist_ok=True)
    from playwright.sync_api import sync_playwright
    receipt = {'rendering': 'system Chromium headless software WebGL; no hardware/sandbox acceptance',
               'flags': FLAGS, 'checks': [], 'observations': {}, 'console': [], 'consoleErrors': [],
               'pageErrors': [], 'requestFailures': [], 'httpErrors': [], 'externalRequests': []}
    receipt['revision'] = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    receipt['sourceHashes'] = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
                              for path in sorted((ROOT/'Games/StealBasketballer/js').glob('*.js'))}
    deadline = time.monotonic() + args.budget
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(QuietHandler, directory=str(ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    browser = None

    def check(condition, label):
        receipt['checks'].append({'name': label, 'pass': bool(condition)})
        print(('PASS ' if condition else 'FAIL ') + label, flush=True)
        if not condition:
            raise AssertionError(label)

    def snap(page):
        return page.evaluate('window.basketballerSnapshot()')

    def wait(page, milliseconds):
        if time.monotonic() + milliseconds / 1000 > deadline:
            raise TimeoutError('Bounded QA deadline reached')
        page.wait_for_timeout(milliseconds)

    def click(page, selector):
        # Dialogs make the underlying HUD inert; identical actions can exist in both.
        scope = page.locator('#sheet') if page.locator('#sheet').is_visible() else page
        if page.locator('#pause-screen').is_visible():
            scope = page.locator('#pause-screen')
        scope.locator(selector).first.click(timeout=10000)
        wait(page, 180)

    def capture(page, name):
        page.screenshot(path=str(output / (name + '.png')))

    def layout(page, name):
        result = page.evaluate('''() => ({overflow: document.documentElement.scrollWidth > innerWidth,
          targets: [...document.querySelectorAll('button,select,#joystick')].filter(e => {
            const r=e.getBoundingClientRect(); return r.width && r.height && !e.disabled && !e.closest('[inert]') &&
            getComputedStyle(e).visibility !== 'hidden' && r.bottom>0 && r.top<innerHeight;
          }).map(e => {const r=e.getBoundingClientRect(); return {id:e.id,label:(e.innerText||e.getAttribute('aria-label')||e.id).slice(0,80),
            width:Math.round(r.width),height:Math.round(r.height),small:r.width<43.9||r.height<43.9};})})''')
        receipt['observations'][name] = result
        check(not result['overflow'], name + ' no horizontal overflow')
        check(not any(t['small'] for t in result['targets']), name + ' visible interactive targets >=44px')

    def prepare(context, label):
        page = context.new_page()
        page.set_default_timeout(10000)
        page.on('console', lambda msg: receipt['console'].append({'context':label,'type':msg.type,'text':msg.text}))
        page.on('console', lambda msg: receipt['consoleErrors'].append({'context':label,'text':msg.text}) if msg.type == 'error' else None)
        page.on('pageerror', lambda error: receipt['pageErrors'].append({'context':label,'text':str(error)}))
        page.on('requestfailed', lambda req: receipt['requestFailures'].append({'context':label,'url':req.url,'failure':req.failure}))
        page.on('response', lambda res: receipt['httpErrors'].append({'context':label,'url':res.url,'status':res.status}) if res.status >= 400 else None)
        page.on('request', lambda req: receipt['externalRequests'].append({'context':label,'url':req.url}) if urlsplit(req.url).scheme in ('http','https','ws','wss') and not req.url.startswith(origin + '/') else None)
        page.goto(origin + '/Games/StealBasketballer/', wait_until='networkidle')
        page.wait_for_function("typeof window.basketballerSnapshot==='function' && !document.getElementById('start').disabled", timeout=20000)
        capture(page, label.replace(' ', '-') + '-intro')
        click(page, '#start')
        check(snap(page)['started'], label + ' PLAY')
        return page

    def recruit(page, label):
        click(page, '[data-panel="shop"]')
        click(page, '#sheet-content [data-action="openMarket"]')
        attempts = []
        for _ in range(20):
            candidates = page.locator('[data-action="buy"]').evaluate_all('''els=>els.map(e=>({id:e.dataset.id,cost:Number(e.closest('article').querySelector('.price').textContent.replace(/[^0-9]/g,''))}))''')
            coins = snap(page)['state']['coins']
            affordable = next((c for c in candidates if c['cost'] <= coins), None)
            attempts.append({'offers':candidates,'coins':coins,'affordable':affordable})
            if affordable:
                click(page, '[data-action="buy"][data-id="' + affordable['id'] + '"]')
                attempts[-1]['toast'] = page.locator('#toast').inner_text()
                if snap(page)['state']['roster']:
                    break
            wait(page, 500)
        receipt['observations'][label + ' recruitment'] = {'attempts':attempts,'panel':snap(page)['panel'],'text':page.locator('#sheet-content').inner_text()}
        capture(page, label + '-conveyor')
        check(bool(snap(page)['state']['roster']), label + ' affordable natural conveyor recruit')
        click(page, '#close-sheet')

    def battle(page, label):
        # A completed match has a real45s rest; defend normally while waiting.
        for _ in range(13):
            if page.locator('#thief-alert').is_visible():
                click(page, '#thief-alert [data-action="home"]')
                click(page, '#thief-alert [data-action="defend"]')
            click(page, '#battle')
            s = snap(page)
            if s['match']:
                break
            wait(page,5000)
        check(bool(s['match']) and len(s['match']['players']) == 10, label + ' actual 5v5 match')
        return s

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=FLAGS)
            desktop = browser.new_context(viewport={'width':1440,'height':900}, color_scheme='light')
            page = prepare(desktop, 'desktop')
            capture(page, 'desktop-world')
            recruit(page, 'desktop')
            click(page, '[data-panel="collection"]')
            check(page.locator('#album-grid .card').count() == 100, 'album displays 100 identities')
            capture(page, 'desktop-album')
            click(page, '#close-sheet')
            click(page, '[data-panel="help"]')
            page.locator('#low-graphics').check()
            check(snap(page)['state']['settings']['lowGraphics'], 'low graphics selected through normal settings')
            click(page, '#close-sheet')
            s = battle(page, 'desktop')
            receipt['observations']['initialMatchRendering'] = s['world']
            initial_coins = s['state']['coins']
            click(page, '#pause')
            paused = snap(page)
            wait(page, 1100)
            still = snap(page)
            check(paused['match'] == still['match'] and paused['world']['avatar'] == still['world']['avatar'] and paused['state']['coins'] == still['state']['coins'], 'pause freezes match, avatar and economy')
            click(page, '#resume')
            wait(page, 350)
            check(snap(page)['match']['elapsed'] > paused['match']['elapsed'], 'resume advances live match')
            capture(page, 'desktop-match-closeup')
            click(page, '[data-panel="match"]')
            available = page.locator('[data-action="ability"]:enabled')
            receipt['observations']['abilityAvailable'] = available.count() > 0
            control_attempts=[]
            for _ in range(8):
                click(page, '[data-action="controlPlayer"]:enabled')
                before = snap(page)
                control_attempts.append({'phase':before['match']['phase'],'elapsed':before['match']['elapsed'],
                                         'accepted':bool(before['match']['control']), 'toast':page.locator('#toast').inner_text()})
                if before['match']['control']:
                    break
                wait(page,350)
            receipt['observations']['controlAttempts']=control_attempts
            check(bool(before['match']['control']), 'manual player control accepted')
            page.keyboard.down('w')
            wait(page, 950)
            page.keyboard.up('w')
            after = snap(page)
            index = before['match']['control']['index']
            player_before = before['match']['players'][index]
            player_after = after['match']['players'][index]
            check((player_before['x'], player_before['z']) != (player_after['x'], player_after['z']), 'WASD advances controlled player')
            page.locator('#follow').select_option('pitch')
            check(snap(page)['world']['camera']['mode'] == 'pitch', 'full court camera selected')
            click(page, '#zoom-out')
            capture(page, 'desktop-fullcourt')
            page.locator('#follow').select_option('ball')
            camera_before = snap(page)['world']['camera']
            page.mouse.move(650, 480)
            page.mouse.down()
            page.mouse.move(750, 480, steps=6)
            page.mouse.up()
            page.mouse.wheel(0, -100)
            wait(page, 250)
            camera_after = snap(page)['world']['camera']
            receipt['observations']['cameraAfterDragZoom'] = camera_after
            check(camera_before['yaw'] != camera_after['yaw'] and camera_before['zoom'] != camera_after['zoom'], 'world drag orbit and wheel zoom')
            capture(page, 'desktop-ball-follow')
            page.locator('#follow').select_option('0')
            for _ in range(4):
                click(page, '#zoom-in')
            capture(page, 'desktop-player-detail')
            receipt['observations']['renderingSnapshot'] = snap(page)['world']
            page.locator('#follow').select_option('ball')
            click(page, '[data-panel="subs"]')
            receipt['observations']['substitutions'] = page.locator('#sheet-content').inner_text()
            check(page.locator('[data-action="substitute"]').count() == 0, 'single natural recruit has no granted reserve')
            click(page, '#close-sheet')
            last_period = None
            called = set()
            receipt['observations']['playAttempts']=[]
            ability_used = False
            while True:
                s = snap(page)
                if s['report']:
                    break
                m = s['match']
                if not ability_used and any(a['available'] for a in m['abilities']):
                    page.keyboard.press('f')
                    ability_result = snap(page)['match']
                    ability_used = ability_result['cooldowns']['ability'] > 0
                    receipt['observations']['abilityAfterF'] = ability_result['activeAbility']
                mode = 'attack' if m['possession'] == 0 else 'defense'
                play = 'drive' if mode == 'attack' else 'zone'
                if mode not in called and m['phase'] == 'live' and not m['ball'].get('flight') and any(p['id'] == play and p['available'] for p in m['callPlays']):
                    toggle = page.locator('#match-controls [data-action="togglePlays"]')
                    wanted = 'DEFENSE' if mode == 'defense' else 'ATTACK'
                    if wanted in toggle.inner_text():
                        click(page, '#match-controls [data-action="togglePlays"]')
                    page.locator('#match-controls [data-action="play"][data-id="'+play+'"]').click()
                    after_call=snap(page)
                    receipt['observations']['playAttempts'].append({'play':play,'phaseBefore':m['phase'],
                        'phaseAfter':after_call['match']['phase'],'cooldown':after_call['match']['cooldowns']['plays'],
                        'toast':page.locator('#toast').inner_text()})
                    if after_call['match']['cooldowns']['plays'] > 0:
                        called.add(mode)
                period = s['match']['period']
                if period != last_period:
                    print('LIVE ' + period + ' ' + str(s['match']['score']), flush=True)
                    last_period = period
                wait(page, 250 if len(called)<2 else 5000)
            receipt['observations']['abilityUsed'] = ability_used
            receipt['observations']['completedMatch'] = {'report':s['report'],'lastBattle':s['state']['lastBattle'],'coins':s['state']['coins']}
            check(called == {'attack', 'defense'}, 'valid attack and defense calls accepted')
            check(not s['report'].get('forfeit'), 'natural full match report')
            reward = s['state']['lastBattle']['reward']['total']
            check(reward > 0 and s['state']['coins'] >= initial_coins + reward, 'actual match reward credited')
            receipt['observations']['completedMatch'] = {'report':s['report'],'lastBattle':s['state']['lastBattle'],'coins':s['state']['coins']}
            capture(page, 'desktop-report')
            click(page, '[data-action="leaveMatch"]')
            click(page, '[data-panel="help"]')
            click(page, '[data-action="saveNow"]')
            saved = snap(page)['state']
            page.reload(wait_until='networkidle')
            click(page, '#start')
            restored = snap(page)['state']
            check([p['uid'] for p in saved['roster']] == [p['uid'] for p in restored['roster']] and restored['coins'] >= saved['coins'], 'reward and roster survive save/reload')
            battle(page, 'desktop restart')
            click(page, '[data-panel="match"]')
            click(page, '[data-action="forfeit"]')
            click(page, '[data-action="confirmForfeit"]')
            check(snap(page)['report']['forfeit'], 'restart match abandonment report')
            click(page, '[data-action="leaveMatch"]')
            desktop.close()
            phone = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True, color_scheme='dark')
            page = prepare(phone, 'phone dark')
            layout(page, 'phone world')
            capture(page, 'phone-world-dark')
            before = snap(page)['world']['avatar']
            box = page.locator('#joystick').bounding_box()
            session = phone.new_cdp_session(page)
            point = {'x':box['x']+box['width']/2+28, 'y':box['y']+box['height']/2}
            session.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[point]})
            wait(page, 850)
            session.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
            check(before != snap(page)['world']['avatar'], 'phone live touch joystick movement')
            recruit(page, 'phone')
            click(page, '[data-panel="collection"]')
            layout(page, 'phone album')
            capture(page, 'phone-album-dark')
            click(page, '#close-sheet')
            battle(page, 'phone')
            layout(page, 'phone match')
            capture(page, 'phone-match-dark')
            page.emulate_media(color_scheme='light')
            capture(page, 'phone-match-light')
            page.set_viewport_size({'width':844,'height':390})
            wait(page, 400)
            layout(page, 'phone landscape match')
            capture(page, 'phone-landscape-match')
            phone.close()
            check(not receipt['pageErrors'], 'no page errors')
            check(not receipt['consoleErrors'], 'no console errors (unfiltered)')
            check(not receipt['requestFailures'] and not receipt['httpErrors'], 'no failed local requests')
            check(not receipt['externalRequests'], 'no external runtime requests')
            receipt['status'] = 'PASS'
            browser.close()
            browser = None
    except Exception as error:
        receipt['status'] = 'FAIL'
        receipt['error'] = str(error).replace(str(ROOT), '<repo>')
        raise
    finally:
        if browser:
            try:
                browser.close()
            except Exception as cleanup_error:
                # Playwright's context manager already stops its owned processes.
                receipt['browserCleanupNotice'] = str(cleanup_error).replace(str(ROOT), '<repo>')
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        receipt['elapsedSeconds'] = round(args.budget - (deadline-time.monotonic()), 2)
        (output / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
        print('Artifacts: ' + str(output), flush=True)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Bounded native-input tutorial/help and responsive UI verification.

Use a fresh external evidence directory and an outer watchdog, for example:
 timeout 660s python3 -B scripts/test_capital_tutorial_browser.py --capture --output <external>
No save writes, state setters, injected clocks, rewards or map travel are used.
"""
import argparse
from contextlib import ExitStack
import functools
import hashlib
import http.server
import json
import math
from pathlib import Path
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BUDGET = 600


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


DOM_FACTS = """() => {
 const visible=e=>{if(!e)return false;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return !!e.getClientRects().length&&r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const ids=['.topbar','.topbar nav','.location h2','#start-panel','#tutorial-coach','#toast','#career-hud','.minimap-wrap','#interaction-hint','.driving-hud'];
 const boxes=Object.fromEntries(ids.map(id=>[id,visible(document.querySelector(id))?rect(document.querySelector(id)):null]));
 const overlap=(a,b)=>a&&b?Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)):0;
 const dialog=document.querySelector('dialog[open]');
 const controls=[...(dialog||document).querySelectorAll('button,input,select,summary,a')].filter(visible).map(e=>({id:e.id,label:(e.getAttribute('aria-label')||e.innerText||e.tagName).trim().slice(0,90),disabled:!!e.disabled,horizontalTextClipping:e.scrollWidth>e.clientWidth+1,...rect(e)}));
 const header=[...document.querySelectorAll('.topbar button')].filter(visible).map(e=>({id:e.id,...rect(e)}));
 const focus=document.activeElement;
 return {viewport:{width:innerWidth,height:innerHeight},document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth},boxes,header,controls,smallTargets:controls.filter(e=>e.width<43.9||e.height<43.9),horizontalControlOverflow:controls.filter(e=>e.x<-.5||e.right>innerWidth+.5),dialogs:[...document.querySelectorAll('dialog[open]')].map(e=>({id:e.id,...rect(e),scrollHeight:e.scrollHeight,clientHeight:e.clientHeight})),focus:{id:focus.id,tag:focus.tagName,outlineStyle:getComputedStyle(focus).outlineStyle,outlineWidth:getComputedStyle(focus).outlineWidth},overlaps:{toastCareer:overlap(boxes['#toast'],boxes['#career-hud']),interactionMinimap:overlap(boxes['#interaction-hint'],boxes['.minimap-wrap']),streetTitleCareer:overlap(boxes['.location h2'],boxes['#career-hud'])}};
}"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT, help='Exact static-source root; defaults to this repository.')
    parser.add_argument('--scenario', choices=['all', 'layout'], default='all', help='Use layout for a bounded visual recheck after CSS-only changes.')
    parser.add_argument('--capture', action='store_true')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    source, output = args.root.resolve(), args.output.resolve()
    if output == ROOT or ROOT in output.parents or output == source or source in output.parents:
        parser.error('--output must be outside the repository and source root')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be a fresh or empty directory')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external, layouts, observations = [], [], [], [], [], []
    page, failure = None, None
    hashes = {name: hashlib.sha256((source / 'Games/Capital Drive' / name).read_bytes()).hexdigest()
              for name in ['index.html', 'style.css', 'script.js', 'tutorial.js', 'simulation.js', 'render-gate.js']}
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(source)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def deadline():
        if time.monotonic() - started > BUDGET:
            raise TimeoutError(f'Tutorial native run exceeded {BUDGET} seconds')

    def check(value, label):
        deadline()
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snap():
        deadline()
        return page.evaluate('capitalDriveSnapshot()')

    def record(label):
        state = snap()
        with (output / 'snapshots.jsonl').open('a') as log:
            log.write(json.dumps({'label': label, 'elapsedSeconds': round(time.monotonic() - started, 2), 'state': state}) + '\n')
        return state

    def frames():
        page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')

    def focus():
        page.locator('#world canvas').focus()

    def pulse(key):
        page.keyboard.down(key)
        try:
            frames()
        finally:
            page.keyboard.up(key)
        frames()

    def wait(predicate, label, seconds=20):
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            state = snap()
            if predicate(state):
                return record(label)
            page.wait_for_timeout(100)
        record(label + ' timed out')
        raise AssertionError(label + ' timed out')

    def tutorial_step(step):
        return wait(lambda s: s['tutorial']['step'] == step, 'Tutorial reaches ' + step)

    def capture(name):
        record(name)
        if args.capture:
            page.screenshot(path=str(output / (name + '.png')), timeout=15000)

    def layout(size, theme, state, shot=False):
        facts = page.evaluate(DOM_FACTS)
        facts.update(size=size, theme=theme, state=state)
        layouts.append(facts)
        (output / 'layouts.json').write_text(json.dumps(layouts, indent=2) + '\n')
        check(facts['document']['scrollWidth'] <= facts['document']['clientWidth'], f'{size}/{theme}/{state}: no horizontal document overflow')
        check(not facts['horizontalControlOverflow'], f'{size}/{theme}/{state}: controls stay horizontally inside viewport')
        check(all(c['width'] >= 43.9 and c['height'] >= 43.9 for c in facts['header']), f'{size}/{theme}/{state}: visible header controls meet 44px')
        if state == 'hud':
            check(facts['overlaps']['toastCareer'] < 1, f'{size}/{theme}: toast clears player status')
            check(facts['overlaps']['interactionMinimap'] < 1, f'{size}/{theme}: interaction hint clears minimap')
            check(facts['overlaps']['streetTitleCareer'] < 1, f'{size}/{theme}: street title clears player status')
        if shot:
            capture(f'{size}-{theme}-{state}')

    def close(dialog):
        if page.locator('#' + dialog).evaluate('(e)=>e.open'):
            page.keyboard.press('Escape')
            page.wait_for_timeout(80)
            check(not page.locator('#' + dialog).evaluate('(e)=>e.open'), 'Escape closes ' + dialog)
        frames()
        if snap()['started']:
            focus()

    def ready():
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
        page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
        reload_page(False)
        check(not snap()['rendering']['compatibility'], 'Actual software WebGL renderer is available')

    def reload_page(reload=True):
        if reload:
            page.reload(wait_until='load', timeout=60000)
        else:
            page.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=60000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=60000)

    def start():
        page.locator('[data-game-mode=street]').click()
        page.locator('#start-button').click()
        wait(lambda s: s['started'] and s['gameMode'] == 'street', 'Normal Start enters Street Life')
        focus()

    def preference():
        return page.evaluate("JSON.parse(localStorage.getItem('capital-drive-tutorial-v1'))")

    def rewards(state):
        campaign = state['campaign']
        return {'cash': state['career']['cash'], 'jobs': state['career']['completedJobs'],
                'chapters': campaign['completed'], 'intros': campaign['intros'], 'meeting': campaign['meeting']}

    def walk(target, tolerance=1, seconds=20):
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            state = snap()
            pose, yaw = state['focus'], state['camera']['footYaw']
            dx, dz = target['x'] - pose['x'], target['z'] - pose['z']
            distance = math.hypot(dx, dz)
            if distance <= tolerance:
                return record('Native foot waypoint reached')
            forward = (-math.sin(yaw) * dx - math.cos(yaw) * dz) / distance
            lateral = (math.cos(yaw) * dx - math.sin(yaw) * dz) / distance
            keys = []
            if abs(forward) >= .38:
                keys.append('w' if forward > 0 else 's')
            if abs(lateral) >= .38:
                keys.append('d' if lateral > 0 else 'a')
            for key in keys:
                page.keyboard.down(key)
            try:
                page.wait_for_timeout(160 if distance < 2 else 250)
            finally:
                for key in keys:
                    page.keyboard.up(key)
        raise AssertionError(f'Native foot route blocked before {target}')

    def full_tutorial():
        focus()
        baseline = rewards(record('Before native tutorial'))
        tutorial_step('look')
        canvas = page.locator('#world canvas').bounding_box()
        cx, cy = canvas['x'] + canvas['width'] * .55, canvas['y'] + canvas['height'] * .45
        page.mouse.move(cx, cy)
        page.mouse.down()
        try:
            page.mouse.move(cx + 90, cy + 12, steps=8)
        finally:
            page.mouse.up()
        tutorial_step('walk')
        pulse('e')
        state = wait(lambda s: s['gameplay']['mode'] == 'foot', 'Native E exits the stationary owned car')
        car, actor = state['player'], state['focus']
        dx, dz = actor['x'] - car['x'], actor['z'] - car['z']
        length = math.hypot(dx, dz)
        walk({'x': actor['x'] + dx / length * 2.8, 'z': actor['z'] + dz / length * 2.8}, tolerance=.35)
        tutorial_step('phone')
        pulse('t')
        page.locator('#phone-dialog').wait_for(state='visible')
        tutorial_step('enter-car')
        page.locator('#personal-car-route').click()
        close('phone-dialog')
        state = snap()
        car, actor = state['player'], state['focus']
        dx, dz = actor['x'] - car['x'], actor['z'] - car['z']
        length = math.hypot(dx, dz)
        walk({'x': car['x'] + dx / length * 3.4, 'z': car['z'] + dz / length * 3.4}, tolerance=.4)
        nearby = snap()
        nearest = min(nearby['nearbyVehicles'], key=lambda v: math.hypot(v['x'] - nearby['focus']['x'], v['z'] - nearby['focus']['z']))
        check(nearest['id'] == 'player', 'Owned player car is the nearest real entry target')
        pulse('e')
        tutorial_step('drive')
        page.keyboard.down('w')
        try:
            tutorial_step('brake')
        finally:
            page.keyboard.up('w')
        page.keyboard.down('s')
        try:
            tutorial_step('map-route')
        finally:
            page.keyboard.up('s')
        # CDP observation can arrive after the brief zero-speed crossing. S also
        # reverses, so settle the real car with the handbrake before route proof.
        page.keyboard.down('Space')
        try:
            wait(lambda s: abs(s['player']['speed']) <= .001, 'Actual handbrake settles the car after the S braking lesson', 15)
        finally:
            page.keyboard.up('Space')
        pulse('m')
        page.locator('#map-dialog').wait_for(state='visible')
        before = snap()['focus']
        page.locator('#places .place-item button').first.click()
        tutorial_step('shops')
        routed = snap()
        check(routed['routePoints'] > 0 and math.hypot(routed['focus']['x'] - before['x'], routed['focus']['z'] - before['z']) < .01, 'Native Set route creates a route without moving the player')
        check(page.locator('#teleport-button').is_hidden(), 'Street Life has no visible teleport action')
        close('map-dialog')
        pulse('k')
        page.locator('#services-dialog').wait_for(state='visible')
        tutorial_step('jobs')
        close('services-dialog')
        pulse('j')
        page.locator('#jobs-dialog').wait_for(state='visible')
        wait(lambda s: s['tutorial']['status'] == 'complete', 'Actual Jobs opening completes all nine stages')
        close('jobs-dialog')
        check(rewards(snap()) == baseline, 'Tutorial grants no cash, jobs or campaign completion')
        capture('desktop-dark-complete')
        page.locator('#tutorial-done').click()
        check(page.locator('#tutorial-coach').is_hidden(), 'Done dismisses the completed coach')
        check(preference()['status'] == 'complete', 'Completion is saved in the separate tutorial preference')

    def open_help(before_start=False):
        page.locator('#intro-help-button' if before_start else '#pause-help-button').click()
        page.locator('#help-dialog').wait_for(state='visible')

    def pause():
        page.locator('#pause-button').click()
        page.locator('#pause-dialog').wait_for(state='visible')

    def layout_batch(size):
        for theme in ['dark', 'light']:
            pause()
            page.locator('#theme').select_option(theme)
            page.locator('#change-mode-button').click()
            page.locator('#start-panel').wait_for(state='visible')
            layout(size, theme, 'start', shot=size == 'mobile' and theme == 'dark')
            open_help(True)
            layout(size, theme, 'help', shot=theme == 'light')
            page.keyboard.press('Tab')
            focus_facts = page.evaluate(DOM_FACTS)['focus']
            check(focus_facts['outlineStyle'] != 'none' and float(focus_facts['outlineWidth'].removesuffix('px')) >= 2, f'{size}/{theme}: Help keyboard focus is visible')
            close('help-dialog')
            start()
            if snap()['tutorial']['active']:
                layout(size, theme, 'coach')
                page.locator('#tutorial-skip').click()
            layout(size, theme, 'hud', shot=size == 'mobile' and theme == 'light')
            pause()
            layout(size, theme, 'pause')
            close('pause-dialog')
            for button, dialog, label in [('services-button', 'services-dialog', 'shops'), ('phone-button', 'phone-dialog', 'phone')]:
                if page.locator('#' + button).is_visible():
                    page.locator('#' + button).click()
                else:
                    pause()
                    page.locator('#pause-services-button').click()
                page.locator('#' + dialog).wait_for(state='visible')
                layout(size, theme, label)
                close(dialog)

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            for size, width, height in [('desktop', 1280, 800), ('mobile', 390, 844)]:
                context = browser.new_context(viewport={'width': width, 'height': height}, service_workers='block', is_mobile=size == 'mobile', has_touch=size == 'mobile')
                try:
                    page = context.new_page()
                    ready()
                    check(page.locator('#guided-tutorial').is_checked(), f'{size}: fresh intro enables guided tutorial')
                    if size == 'desktop':
                        layout(size, 'dark', 'start', shot=True)
                        open_help(True)
                        check(not snap()['started'], 'Help is usable before starting the world')
                        close('help-dialog')
                    start()
                    tutorial_step('look')
                    if size == 'mobile':
                        layout(size, 'dark', 'coach', shot=True)
                        page.locator('#tutorial-skip').click()
                    if size == 'desktop' and args.scenario == 'layout':
                        layout(size, 'dark', 'coach', shot=True)
                        page.locator('#tutorial-skip').click()
                    if size == 'desktop' and args.scenario == 'all':
                        layout(size, 'dark', 'coach', shot=True)
                        page.locator('#tutorial-skip').click()
                        check(preference()['status'] == 'skipped', 'Skip is saved separately')
                        reload_page()
                        check(not page.locator('#guided-tutorial').is_checked(), 'Reload retains skipped opt-out')
                        start()
                        check(not snap()['tutorial']['active'] and page.locator('#tutorial-coach').is_hidden(), 'Skipped tutorial does not interrupt the next start')
                        pause()
                        open_help()
                        page.locator('#tutorial-replay').click()
                        full_tutorial()
                        reload_page()
                        check(not page.locator('#guided-tutorial').is_checked(), 'Reload retains completed opt-out')
                        start()
                        check(not snap()['tutorial']['active'], 'Completed tutorial does not interrupt the next start')
                    layout_batch(size)
                except Exception:
                    try:
                        capture(size + '-failure-state')
                    except Exception as capture_error:
                        observations.append({'failureCapture': str(capture_error)})
                    raise
                finally:
                    context.close()
            check(not errors, 'No page or console errors')
            check(not requests, 'No failed requests or HTTP errors')
            check(not external, 'No external runtime requests')
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        final_hashes = {name: hashlib.sha256((source / 'Games/Capital Drive' / name).read_bytes()).hexdigest() for name in hashes}
        report = {'status': 'FAIL' if failure else 'PASS', 'scenario': args.scenario, 'failure': failure, 'checks': checks, 'errors': errors, 'requests': requests,
                  'external': external, 'observations': observations, 'source_sha256': hashes, 'elapsedSeconds': round(time.monotonic() - started, 2),
                  'source_sha256_end': final_hashes, 'source_unchanged': final_hashes == hashes,
                  'screenshots': sorted(path.name for path in output.glob('*.png')),
                  'limitations': ['Cloud software WebGL only; Intel N100 acceptance remains unmeasured.', 'Mobile layout and normal menu clicks are exercised; touch steering is not.',
                                  'Tutorial progress uses real keys/mouse and read-only observations. Service workers are blocked.', 'Screenshots require a separate visual review.']}
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()

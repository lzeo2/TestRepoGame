"""Short C/D+G/E/F evidence runs, one system Chromium at a time; no fleet/Xvfb.
Run with TMPDIR=/dev/shm SMOKE_PORT=8948 python3 -B Games/Jankolock3D/letter-qa.py C
API setup and the D timeline overlay are explicitly labeled, never native wins.
"""
import argparse
import functools
import hashlib
import http.server
import io
import json
import os
from pathlib import Path
import subprocess
import threading
from urllib.parse import urlsplit
from PIL import Image, ImageDraw, ImageStat
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / 'Games/Jankolock3D'
OUT = ROOT / 'docs/maintenance/audits/jankolock-3d-qa/integration'


def guard():
    available = int(subprocess.check_output(['df', '-B1', '/', '--output=avail'], text=True).splitlines()[-1])
    assert available >= 2178940928, f'Disk guard: {available} bytes'
    return available


def hashes():
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(GAME.rglob('*')) if p.suffix in {'.mjs', '.js', '.html', '.css', '.glb'}}


@functools.cache
def visual_baseline_bytes():
    scopes = ['Games/Jankolock3D', 'docs/jank3d-design', 'docs/maintenance/audits/jankolock-3d-qa',
              'docs/maintenance/games/240-jankolock3d.md', 'docs/maintenance/inventory.json', 'docs/maintenance/README.md']
    rows = subprocess.check_output(['git', 'ls-tree', '-rlz', 'db70557437d12582f651a88369f148fb5d7a7e20', '--', *scopes], cwd=ROOT).decode().split('\0')
    return scopes, sum(int(row.split('\t')[0].split()[-1]) for row in rows if row)


def visual_growth():
    scopes, baseline = visual_baseline_bytes()
    paths = [p for scope in scopes for p in ((ROOT / scope).rglob('*') if (ROOT / scope).is_dir() else [ROOT / scope]) if p.is_file()]
    total = sum(p.stat().st_size for p in paths if p.name != 'ui-mockup-world-controls.png')
    return total - baseline


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main():
    global OUT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('letter', choices=['A', 'C', 'D', 'E', 'F', 'H'])
    parser.add_argument('--hero', choices=['stampead', 'turretina', 'snipeoff', 'gooey'], help='One short E hero run')
    parser.add_argument('--visual-pass', action='store_true', help='Separate visual-pass evidence and strict whole-pass60MB write guard')
    args = parser.parse_args()
    if args.visual_pass:
        OUT = OUT.parent / 'visual-pass'
    letter, selected_hero = args.letter, args.hero
    tag = letter + ('-' + selected_hero if selected_hero else '')
    before = guard()
    processes = subprocess.check_output(['ps', '-eo', 'pid=,stat=,comm=,args='], text=True)
    active = [row for line in processes.splitlines() if len(row := line.split(None, 3)) == 4
              and row[2] in {'chrome', 'chromium'} and not row[1].startswith('Z') and '--type=' not in row[3]]
    assert not active, 'Active sibling browser (CLI/CDP/Playwright); retry only after its cleanup'
    guard(); OUT.mkdir(parents=True, exist_ok=True)
    report = {'letter': letter, 'hero': selected_hero, 'runnerSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'status': 'RUNNING', 'kind': 'Integrated software-WebGL builder evidence, not reviewer acceptance',
              'setup': 'Explicit loopback API clock/position/seed fixtures; native keys/buttons where stated. D timeline is a labeled DOM overlay of actual systems events.',
              'storageBefore': before, 'sourceHashes': hashes(), 'screenshots': [], 'responses': [], 'errors': [], 'checks': {}}
    def write_blob(path, data):
        guard()
        if args.visual_pass:
            replaced = path.stat().st_size if path.exists() else 0
            assert visual_growth() - replaced + len(data) <= 60000000, 'Whole visual pass60MB growth cap'
        path.write_bytes(data)
    def save_image(path, image):
        buffer = io.BytesIO(); image.save(buffer, format='PNG'); write_blob(path, buffer.getvalue())
    def save_report():
        write_blob(OUT / f'letter-{tag}-evidence.json', (json.dumps(report, indent=2) + '\n').encode())
    save_report()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '8948'))), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 720}, reduced_motion='reduce', color_scheme='light')
                def route(r):
                    if urlsplit(r.request.url).netloc == urlsplit(origin).netloc:
                        r.continue_()
                    else:
                        report['errors'].append('Blocked nonlocal request'); r.abort()
                context.route('**/*', route)
                page = context.new_page(); page.set_default_timeout(20000)
                page.on('pageerror', lambda e: report['errors'].append(str(e)))
                page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
                page.on('requestfailed', lambda r: report['errors'].append(f'{urlsplit(r.url).path}: {r.failure}'))
                page.on('response', lambda r: report['responses'].append({'path': urlsplit(r.url).path, 'status': r.status}))
                state = lambda: page.evaluate('window.jank3dSnapshot()')
                def load(fixture, hero=None, play=True):
                    query = '?qa=' + fixture if fixture else ''
                    response = page.goto(origin + '/Games/Jankolock3D/index.html' + query, wait_until='networkidle')
                    assert response.status == 200
                    page.wait_for_function('window.jank3dSnapshot?.().diagnostics.triangles > 0')
                    if fixture:
                        page.wait_for_function('typeof window.jank3dQA === "object"')
                    report['models'] = state().get('models', [])
                    report['portrait'] = state()['portrait']
                    if hero:
                        page.locator(f'[data-hero="{hero}"]').click()
                    if not play:
                        return
                    page.get_by_role('button', name='Start match', exact=True).click()
                    page.wait_for_function('window.jank3dSnapshot().playing')
                    page.locator('[data-close]').click()
                    page.evaluate('window.jank3dQA.freeze(true)')
                def capture(name, kind):
                    guard(); raw = page.screenshot()
                    image = Image.open(io.BytesIO(raw)).convert('RGB')
                    assert image.size == (1280, 720)
                    variance = sum(ImageStat.Stat(image).var) / 3
                    assert variance > 100, (name, variance)
                    save_image(OUT / f'integration-{name}.png', image)
                    report['screenshots'].append({'file': f'integration-{name}.png', 'kind': kind, 'variance': variance,
                                                  'sha256': hashlib.sha256((OUT / f'integration-{name}.png').read_bytes()).hexdigest()})
                    save_report(); print('capture ' + name, flush=True)
                if letter == 'A':
                    report['checks']['lanes'] = []
                    for lane, x in [('graft', -240), ('midway', 0), ('greenhedge', 240)]:
                        load('traversal')
                        page.evaluate('(x)=>window.jank3dQA.place({x,y:0,z:-190},Math.PI,-.03)', x)
                        before_position = state()['controller']['position']
                        page.evaluate('window.jank3dQA.freeze(false)'); page.keyboard.down('KeyW')
                        page.wait_for_function('(z)=>window.jank3dSnapshot().controller.position[2]>z+1.5', arg=before_position[2])
                        page.keyboard.up('KeyW'); page.evaluate('window.jank3dQA.freeze(true)')
                        capture('A-' + lane, 'New textured district; native grounded walk after labeled API lane placement')
                        walked = state()['controller']['position']
                        page.evaluate('(lane)=>window.jank3dQA.zip(lane)', lane)
                        page.evaluate('window.jank3dQA.freeze(false)'); page.keyboard.press('KeyE')
                        page.wait_for_function('window.jank3dSnapshot().controller.mode==="zip"')
                        page.evaluate('window.jank3dQA.advance(33); window.jank3dQA.freeze(true)')
                        arrived = state()
                        assert arrived['hero']['alive'] and arrived['controller']['mode'] == 'free' and arrived['controller']['position'][2] > 380
                        capture('A-' + lane + '-arrival', 'Native E attachment; actual770m zip via scripted elapsed clock, alive grounded arrival')
                        report['checks']['lanes'].append({'lane': lane, 'walkBefore': before_position, 'walkAfter': walked, 'arrival': arrived['controller'], 'hp': arrived['hero']['hp']})
                    page.evaluate('window.jank3dQA.overview()')
                    capture('A', 'Actual three-lane city geometry; API aerial camera, not native full-map walking')
                elif letter == 'H':
                    load(None, play=False)
                    capture('H', 'Normal lobby: supplied portrait relief and new actual character model, no fixture query')
                    page.get_by_role('button', name='Dark theme', exact=True).click()
                    capture('H-dark', 'Normal lobby dark HTML theme; world lighting unchanged')
                    assert len(state()['models']) == 5
                    report['checks'] = {'models': state()['models'], 'portrait': state()['portrait']}
                elif letter == 'C':
                    load('orbs')
                    orb = page.evaluate('window.jank3dQA.orbs()')
                    capture('C-orbs', 'Actual floating and ground drops after API damage/position setup')
                    before_souls = state()['hero']['souls']
                    page.evaluate('(id)=>window.jank3dQA.aimAt(id)', orb)
                    page.evaluate('window.jank3dQA.freeze(false)')
                    page.mouse.move(640, 390); page.mouse.down()
                    page.wait_for_function('(id)=>window.jank3dSnapshot().history.some(e=>e.type==="orb_shot"&&e.orbId===id)', arg=orb)
                    page.mouse.up(); page.keyboard.press('Escape'); page.evaluate('window.jank3dQA.freeze(true)')
                    assert state()['hero']['souls'] > before_souls
                    capture('C-secure', 'Native mouse secure through covered runtime weapon ray; API setup/aim')
                    ground = page.evaluate('window.jank3dQA.ground()'); assert ground > before_souls + 40
                    capture('C-ground', 'Real ground magnet/pickup after API placement inside radius')
                    orb = page.evaluate('window.jank3dQA.orbs("ivory")')
                    result = page.evaluate('(id)=>window.jank3dQA.secure(id)', orb); assert result['ok']
                    # Surface the real outcome; this is presentation of an API result, not a fake reward.
                    page.evaluate('document.querySelector(".sys-notice").textContent="QA API shot: enemy soul denied. Ground pickup and native secure were checked separately."')
                    capture('C', 'Production API deny, actual soul balance; prior native secure and real ground pickup in this receipt')
                    report['checks'] = {'soulsBefore': before_souls, 'soulsAfter': state()['hero']['souls'], 'history': state()['history']}
                elif letter == 'D':
                    load('chain')
                    partial = page.evaluate('window.jank3dQA.chain("carbon",570)')
                    patron = next(s for s in state()['structures'] if s['team'] == 'ivory' and s['type'] == 'patron')
                    assert patron['alive'] and patron['vulnerable'] and patron['patronPhase'] == 2
                    page.evaluate('window.jank3dQA.place({x:-10,y:0,z:410},Math.PI,-.04)')
                    capture('D-world', 'Real Patron P2 alive after all lane objectives fall via logged API damage')
                    timeline = [f'{e["time"]:5.0f}s  {e["lane"]}: {e["objective"]}' for e in partial['events'] if e['type'] == 'objective_fall' and e['team'] == 'ivory']
                    phase2 = next(e for e in partial['events'] if e['type'] == 'patron_phase' and e['team'] == 'ivory')
                    timeline.append(f'{phase2["time"]:5.0f}s  Shared Patron: P1 retreats to P2')
                    page.evaluate('''lines=>{const panel=document.createElement('aside');panel.id='qa-timeline';panel.className='panel';panel.style.cssText='position:absolute;left:12px;top:232px;width:485px;padding:12px;z-index:9;font:15px/1.2 Atkinson, sans-serif';const title=document.createElement('strong');title.textContent='QA timeline: actual systems events';const note=document.createElement('p');note.textContent='Scripted API damage/reposition; passive hero bots. Not a native-play win.';const text=document.createElement('pre');text.style.cssText='font:14px/1.15 Atkinson, sans-serif;margin:0;white-space:pre-wrap';text.textContent=lines.join('\\n');panel.append(title,note,text);document.body.append(panel);}''', timeline)
                    capture('D', 'Labeled overlay of real chronological objective-fall events; production world behind it')
                    page.evaluate('document.getElementById("qa-timeline").remove()')
                    receipt = page.evaluate('window.jank3dQA.chain("carbon")')
                    receipt['events'] = partial['events'] + receipt['events']; receipt['actions'] = partial['actions'] + receipt['actions']
                    assert receipt['winner'] == 'carbon' and receipt['time'] == 600
                    assert len([e for e in receipt['events'] if e['type'] == 'objective_fall' and e['team'] == 'ivory']) == 19
                    assert page.locator('#pause-title').inner_text() == 'Victory'
                    guard(); (OUT / 'integration-chain.json').write_text(json.dumps(receipt, indent=2) + '\n')
                    capture('G', 'Actual Patron P2 death triggers standard Victory dialog, no winner assignment')
                    load('chain'); loss = page.evaluate('window.jank3dQA.chain("ivory")')
                    assert loss['winner'] == 'ivory' and page.locator('#pause-title').inner_text() == 'Defeat'
                    capture('G-defeat', 'Symmetric real P2 death triggers standard Defeat dialog')
                    report['checks'] = {'winner': receipt['winner'], 'time': receipt['time'], 'objectiveFalls': 19, 'defeatWinner': loss['winner']}
                elif letter == 'E':
                    kits = json.loads((ROOT / 'docs/jank3d-hero-kits.json').read_text())['heroes']
                    for kit in kits:
                        if selected_hero and kit['id'] != selected_hero:
                            continue
                        load('abilities', kit['id'])
                        # Registered after the game's handler: freeze the real cast in
                        # that same native key event, before a slow screenshot ages it.
                        page.evaluate('document.addEventListener("keydown", e=>{if(/^Digit[1-4]$/.test(e.code))window.jank3dQA.freeze(true);})')
                        page.evaluate('window.jank3dQA.waves(); window.jank3dQA.place({x:0,y:0,z:-200},Math.PI,-.04)')
                        for ability in kit['abilities']:
                            page.evaluate('window.jank3dQA.freeze(false)')
                            page.keyboard.press('Digit' + str(ability['slot']))
                            page.evaluate('window.jank3dQA.freeze(false); window.jank3dQA.advance(.1); window.jank3dQA.freeze(true)')
                            s = state(); assert s['runtime']['casts'].get(ability['id']) == 1, s['runtime']
                            assert s['runtime']['fx'] > 0
                            capture(f'E-{kit["id"]}-{ability["slot"]}', f'Native {ability["slot"]} key: {kit["name"]} / {ability["name"]}; API clock/position, frozen real FX')
                        report['checks'][kit['id']] = state()['runtime']; save_report()
                        if args.visual_pass:
                            page.evaluate('window.jank3dQA.inspectHero()')
                            capture(f'E-{kit["id"]}-front', 'Real GLB front/three-quarter inspection camera; no material/model state grants')
                            page.evaluate('window.jank3dQA.clearPreview()')
                    if not selected_hero or selected_hero == kits[0]['id']:
                        write_blob(OUT / 'integration-E.png', (OUT / f'integration-E-{kits[0]["id"]}-3.png').read_bytes())
                    if all((OUT / f'integration-E-{kit["id"]}-{a["slot"]}.png').exists() for kit in kits for a in kit['abilities']):
                        sheet = Image.new('RGB', (2560, 1536), '#eee9d8'); draw = ImageDraw.Draw(sheet)
                        for row, kit in enumerate(kits):
                            for col, ability in enumerate(kit['abilities']):
                                image = Image.open(OUT / f'integration-E-{kit["id"]}-{ability["slot"]}.png').convert('RGB'); image.thumbnail((640, 360))
                                x, y = col * 640, row * 384; sheet.paste(image, (x, y + 24))
                                draw.text((x + 8, y + 5), kit['name'] + ' / ' + ability['name'], fill='black')
                        save_image(OUT / 'integration-E-all-heroes.png', sheet)
                elif letter == 'F':
                    load('shop'); page.evaluate('window.jank3dQA.waves()')
                    page.locator('[data-open]').click()
                    capture('F', 'Real shop in explicitly seeded 25,600-soul fixture, not earned income')
                    page.get_by_label('Tier 1 / 800', exact=True).check()
                    hp = state()['hero']['maxHp']; page.get_by_role('button', name='Buy Health', exact=True).click()
                    assert state()['hero']['maxHp'] == hp + 200
                    for label, item in [('Tier 2 / 1,600', 'Dash charge'), ('Tier 3 / 3,200', 'Burst fire'), ('Tier 4 / 6,400', 'Armor pierce')]:
                        page.get_by_label(label, exact=True).check(); page.get_by_role('button', name='Buy ' + item, exact=True).click()
                        capture('F-tier-' + label[5], 'Native purchase at ' + label + ', real inventory and balance')
                    page.locator('[data-close]').click(); p = state()['hero']['position']
                    page.locator('[data-active="dash-charge"]').click()
                    page.evaluate('window.jank3dQA.freeze(false); window.jank3dQA.advance(.05); window.jank3dQA.freeze(true)')
                    q = state()['hero']['position']; moved = ((q['x']-p['x'])**2+(q['z']-p['z'])**2)**.5
                    assert moved > 9
                    page.locator('[data-active="burst-fire"]').click()
                    assert state()['hero']['burstUntil'] > state()['time']
                    capture('F-active', 'Native active-item clicks: collision-resolved dash and live burst deadline')
                    report['checks'] = {'healthBefore': hp, 'healthAfter': state()['hero']['maxHp'], 'items': state()['hero']['items'], 'souls': state()['hero']['souls'], 'dashMetres': moved, 'burstUntil': state()['hero']['burstUntil']}
                    mock = Image.open(ROOT / 'docs/jank3d-design/ui-mockup-systems-normalized.png').convert('RGB'); mock.thumbnail((1280, 720))
                    pair = Image.new('RGB', (2560, 752), '#eee9d8'); pair.paste(mock, (0, 32)); pair.paste(Image.open(OUT / 'integration-F.png'), (1280, 32))
                    draw = ImageDraw.Draw(pair); draw.text((12, 9), 'Approved flat shop mockup', fill='black'); draw.text((1292, 9), 'Actual integrated shop / seeded QA fixture', fill='black')
                    save_image(OUT / 'comparison-F.png', pair)
                assert not report['errors'], report['errors']
                assert all(r['status'] == 200 for r in report['responses']), report['responses']
                report['status'] = 'COMPLETE-builder-checks-only'
            finally:
                browser.close()
    except Exception as error:
        report['status'] = 'FAIL'; report['failure'] = f'{type(error).__name__}: {error}'
        raise
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=5)
        report['sourceHashesAfter'] = hashes(); report['sourcesUnchanged'] = report['sourceHashes'] == report['sourceHashesAfter']
        if not report['sourcesUnchanged']:
            report['status'] = 'FAIL-source-change'
        report['storageAfter'] = guard()
        if args.visual_pass:
            report['visualPassGrowthBytes'] = visual_growth()
        save_report()
    assert report['status'] == 'COMPLETE-builder-checks-only', report['status']
    print(f'letter-{tag}: {len(report["screenshots"])} nonblank captures; {len(report["responses"])} HTTP200 responses; no recorded errors; source stable', flush=True)


if __name__ == '__main__':
    main()

"""Bounded software-WebGL sports QA; coordinate the sole browser slot first.

Normal gameplay receives no seeds, grants, stepping or shortened clocks. Separate
VisualFixture pages import actual World modules and source JSON, but no Game:
their tier selectors change presentation state only, never earned progression.
Requires installed Python Playwright and system Chromium; installs nothing.
"""
import argparse
import base64
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import tempfile
from threading import Thread
import time
from urllib.parse import parse_qs, urlsplit
import wave

ROOT = Path(__file__).resolve().parents[1]
FLAGS = ['--no-sandbox', '--disable-dev-shm-usage',
         '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
SPORTS = {'basketball': ('StealBasketballer', 'basketballerSnapshot'),
          'football': ('StealFootballer', 'footballerSnapshot')}


def fixture_html(sport):
    folder = SPORTS[sport][0]
    # These are explicit visual fixtures, never the production app or its save.
    return f'''<!doctype html><meta name="viewport" content="width=device-width">
<style>body{{margin:0;background:#172a3d;color:white;font:16px sans-serif}}canvas{{width:100vw;height:100vh;display:block}}label{{position:fixed;top:12px;left:12px;background:#172a3d;padding:12px}}select{{min-height:44px}}</style>
<link rel="icon" href="data:,">
<canvas id="world"></canvas><label>VisualFixture · {sport} · not earned progression <select id="fixture-tier">{''.join(f'<option value="{i}">Tier {i}</option>' for i in range(4))}</select></label>
<script type="module">
import {{World}} from '/Games/{folder}/js/world.js';
const [data,worldData]=await Promise.all(['catalog','world'].map(p=>fetch('/Games/{folder}/data/'+p+'.json').then(r=>{{if(!r.ok)throw Error(r.status);return r.json()}})));
const world=new World(document.querySelector('canvas'),{{data,worldData}});
const state={{stadiumLevel:0,roster:[],rivals:[],market:[],lineup:[],tactics:{{}},kit:{{}}}};
const camera={{mode:'venue',zoom:1,yaw:0,pitchIndex:0}};let last=0,frames=0;
document.querySelector('select').onchange=e=>state.stadiumLevel=Number(e.target.value);
function tick(t){{world.update(last?Math.min(.05,(t-last)/1000):.016,{{state,camera}});last=t;frames++;requestAnimationFrame(tick)}}
Object.defineProperty(window,'visualFixtureSnapshot',{{value:()=>({{label:'VisualFixture: not earned progression',frames,world:world.snapshot()}})}});
window.addEventListener('pagehide',()=>world.dispose());requestAnimationFrame(tick);
</script>'''


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path == '/__sports_audio_fixture.html':
            body = b'<!doctype html><link rel="icon" href="data:,"><p>OfflineGeneratedAudio fixture, not native audition.</p>'
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path == '/__sports_visual_fixture.html':
            sport = parse_qs(parsed.query).get('sport', [''])[0]
            if sport not in SPORTS:
                self.send_error(400)
                return
            body = fixture_html(sport).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifacts', type=Path)
    parser.add_argument('--budget', type=int, default=470)
    parser.add_argument('--skip-audio', action='store_true', help='omit optional offline synthesized whistle')
    args = parser.parse_args()
    if not 180 <= args.budget <= 480:
        parser.error('budget must be 180..480 seconds')
    if shutil.disk_usage(ROOT).free < 2147483648:
        raise RuntimeError('Disk below 2 GiB floor')
    output = (args.artifacts or Path(tempfile.mkdtemp(prefix='sports-presentation-'))).resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('artifacts must be outside repository')
    output.mkdir(parents=True, exist_ok=True)
    from playwright.sync_api import sync_playwright
    receipt = {'rendering': 'headless system Chromium software WebGL, not physical hardware acceptance',
               'flags': FLAGS, 'checks': [], 'observations': {}, 'console': [],
               'pageErrors': [], 'httpErrors': [], 'failedRequests': [], 'externalRequests': []}
    deadline = time.monotonic() + args.budget
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'

    def check(ok, name):
        receipt['checks'].append({'name': name, 'pass': bool(ok)})
        print(('PASS ' if ok else 'FAIL ') + name, flush=True)
        if not ok:
            raise AssertionError(name)

    def wait(page, milliseconds):
        if time.monotonic() + milliseconds/1000 > deadline:
            raise TimeoutError('Sports QA deadline reached')
        page.wait_for_timeout(milliseconds)

    def watch(page, label):
        page.set_default_timeout(12000)
        page.on('console', lambda m: receipt['console'].append({'context': label, 'type': m.type, 'text': m.text}))
        page.on('pageerror', lambda e: receipt['pageErrors'].append({'context': label, 'text': str(e)}))
        page.on('response', lambda r: receipt['httpErrors'].append({'context': label, 'url': r.url, 'status': r.status}) if r.status >= 400 else None)
        page.on('requestfailed', lambda r: receipt['failedRequests'].append({'context': label, 'url': r.url, 'failure': r.failure}))
        page.on('request', lambda r: receipt['externalRequests'].append({'context': label, 'url': r.url}) if urlsplit(r.url).scheme in ('http', 'https', 'ws', 'wss') and not r.url.startswith(origin+'/') else None)

    def snap(page, sport='basketball'):
        return page.evaluate(SPORTS[sport][1] + '()')

    def shot(page, name):
        page.screenshot(path=str(output / (name + '.jpg')), quality=80)

    def click(page, selector):
        page.locator(selector).first.click()
        wait(page, 120)

    def boot(context, sport):
        page = context.new_page()
        watch(page, sport)
        page.goto(origin + '/Games/' + SPORTS[sport][0] + '/', wait_until='networkidle')
        page.wait_for_function(f"typeof {SPORTS[sport][1]}==='function' && !document.getElementById('start').disabled", timeout=25000)
        click(page, '#start')
        check(snap(page, sport)['started'], sport + ' actual PLAY')
        return page

    def venue(page, sport, prefix):
        click(page, '[data-panel="upgrades"]')
        s = snap(page, sport)
        requirements = page.locator('#stadium-requirements').inner_text()
        check(s['state']['stadiumLevel'] == 0 and bool(requirements), prefix + ' real tier0 requirements shown')
        check(page.locator('#stadium-build').is_disabled(), prefix + ' unaffordable build disabled')
        coins = s['state']['coins']
        # Real mouse input on a disabled control cannot spend money.
        box = page.locator('#stadium-build').bounding_box()
        page.mouse.click(box['x']+box['width']/2, box['y']+box['height']/2)
        wait(page, 200)
        check(snap(page, sport)['state']['coins'] == coins, prefix + ' blocked build loses no coins')
        shot(page, prefix + '-requirements')
        click(page, '#sheet-content [data-action="visitStadium"]')
        check(snap(page, sport)['world']['camera']['mode'] == 'venue', prefix + ' VIEW VENUE camera')
        click(page, '#close-sheet')
        wait(page, 800)
        receipt['observations'][prefix + '-venue'] = snap(page, sport)['world']
        shot(page, prefix + '-earned-tier0-venue')

    def recruit(page):
        click(page, '[data-panel="shop"]')
        click(page, '#sheet-content [data-action="openMarket"]')
        click(page, '#sheet-content [data-action="buy"]:enabled')
        check(len(snap(page)['state']['roster']) == 1, 'natural affordable basketball recruit')
        click(page, '#close-sheet')

    def settings(page):
        click(page, '[data-panel="help"]')
        page.locator('#low-graphics').check()
        page.locator('#sound').uncheck()
        click(page, '#close-sheet')
        check(snap(page)['state']['settings']['lowGraphics'], 'normal low graphics setting')

    def cameras(page, prefix):
        page.locator('#follow').select_option('ball')
        for _ in range(12):
            click(page, '#zoom-out')
        check(abs(snap(page)['world']['camera']['zoom']-.65) < .00001, prefix + ' zoom lower clamp .65')
        shot(page, prefix + '-ball-zoom-min')
        for _ in range(12):
            click(page, '#zoom-in')
        check(abs(snap(page)['world']['camera']['zoom']-1.8) < .00001, prefix + ' zoom upper clamp 1.8')
        shot(page, prefix + '-ball-zoom-max')
        page.locator('#follow').select_option('0')
        check(snap(page)['world']['camera']['mode'] == 'player', prefix + ' player follow')
        shot(page, prefix + '-player')
        before = snap(page)['world']['camera']['yaw']
        # Canvas receives normal drag away from the spectator/HUD controls.
        width, height = page.viewport_size.values()
        page.mouse.move(width*.45, height*.42)
        page.mouse.down()
        page.mouse.move(width*.65, height*.42, steps=6)
        page.mouse.up()
        check(snap(page)['world']['camera']['yaw'] != before, prefix + ' orbit drag')
        page.locator('#follow').select_option('pitch')
        for _ in range(5):
            click(page, '#zoom-out')
        wait(page, 650)
        shot(page, prefix + '-fullcourt')
        check(not page.evaluate('document.documentElement.scrollWidth>innerWidth'), prefix + ' no horizontal overflow')

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=FLAGS)
            try:
                desktop = browser.new_context(viewport={'width':1280, 'height':720}, color_scheme='light')
                page = boot(desktop, 'basketball')
                venue(page, 'basketball', 'basketball-desktop')
                settings(page)
                recruit(page)
                click(page, '#battle')
                s = snap(page)
                check(len(s['match']['players']) == 10, 'real five-on-five match')
                check(s['match']['court']['bounds'] == {'x':[-47,47], 'z':[-25,25]}, 'regulation94x50 court diagnostics')
                cameras(page, 'basketball-desktop')
                s = snap(page)
                athletes = s['world']['athletes']
                check(len(athletes) == 10 and len({a['heightFeet'] for a in athletes}) > 1, 'ten athletes with varied heights')
                check(all(5.7 <= a['heightFeet'] <= 7.1 for a in athletes), 'human athlete height bounds')
                check(len({(a['hairStyle'], a['skinColor'], a['accessory']) for a in athletes}) > 1, 'independent generic athlete appearance variety')
                official = s['world']['official']
                x, _, z = official['position']
                check(official['visible'] and (abs(x)>47 or abs(z)>25), 'visible referee outside playable court')
                receipt['observations']['basketball-live-world'] = s['world']
                start_coins = s['state']['coins']
                last_period = ''
                while not s['report']:
                    if s['match']['period'] != last_period:
                        last_period = s['match']['period']
                        print('LIVE ' + last_period + ' ' + str(s['match']['score']), flush=True)
                    wait(page, 5000)
                    s = snap(page)
                check(not s['report'].get('forfeit'), 'normal complete basketball match report')
                reward = s['state']['lastBattle']['reward']['total']
                check(reward > 0 and s['state']['coins'] >= start_coins + reward, 'actual complete-match reward')
                receipt['observations']['natural-match'] = {'report':s['report'], 'lastBattle':s['state']['lastBattle']}
                shot(page, 'basketball-natural-report')
                click(page, '#sheet-content [data-action="leaveMatch"]')
                click(page, '[data-panel="help"]')
                click(page, '#sheet-content [data-action="saveNow"]')
                saved = snap(page)['state']
                page.reload(wait_until='networkidle')
                page.wait_for_function('!document.getElementById("start").disabled')
                click(page, '#start')
                restored = snap(page)['state']
                check(restored['coins'] >= saved['coins'] and [p['uid'] for p in restored['roster']] == [p['uid'] for p in saved['roster']], 'natural reward and roster save reload')
                page.close()
                football = boot(desktop, 'football')
                venue(football, 'football', 'football-desktop')
                football.close()
                # Explicit World-only visual fixture: high tiers are not earned.
                for sport in SPORTS:
                    visual = desktop.new_page()
                    watch(visual, 'VisualFixture-' + sport)
                    visual.goto(origin + '/__sports_visual_fixture.html?sport=' + sport)
                    visual.wait_for_function('window.visualFixtureSnapshot?.().frames>4', timeout=20000)
                    for tier in ('0', '3'):
                        visual.locator('#fixture-tier').select_option(tier)
                        wait(visual, 1000)
                        observation = visual.evaluate('visualFixtureSnapshot()')
                        receipt['observations']['VisualFixture-' + sport + '-tier' + tier] = observation
                        shot(visual, 'VisualFixture-' + sport + '-tier' + tier)
                    visual.close()
                if not args.skip_audio:
                    audio = desktop.new_page()
                    watch(audio, 'OfflineGeneratedAudio')
                    audio.goto(origin + '/__sports_audio_fixture.html')
                    rendered = audio.evaluate('''async () => {
                      const {StadiumAudio}=await import('/Games/StealBasketballer/js/stadium-audio.js');
                      const c=new OfflineAudioContext(1,44100,44100),a=new StadiumAudio({audioContextFactory:()=>c});
                      a.start();a.configure(true,false);a.cue('foul');
                      const b=await c.startRendering(),s=b.getChannelData(0);let sum=0,peak=0,raw='';
                      const bytes=new Uint8Array(s.length*2),v=new DataView(bytes.buffer);
                      for(let i=0;i<s.length;i++){sum+=s[i]*s[i];peak=Math.max(peak,Math.abs(s[i]));v.setInt16(i*2,Math.round(Math.max(-1,Math.min(1,s[i]))*32767),true)}
                      for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
                      return {rms:Math.sqrt(sum/s.length),peak,rate:44100,pcm:btoa(raw)};
                    }''')
                    with wave.open(str(output/'offline-generated-whistle.wav'), 'wb') as wav:
                        wav.setnchannels(1)
                        wav.setsampwidth(2)
                        wav.setframerate(rendered['rate'])
                        wav.writeframes(base64.b64decode(rendered.pop('pcm')))
                    receipt['observations']['OfflineGeneratedAudio-not-native-audition'] = rendered
                    check(rendered['rms'] > 0 and 0 < rendered['peak'] < 1, 'offline generated whistle nonzero and unclipped')
                    audio.close()
                desktop.close()
                phone = browser.new_context(viewport={'width':390, 'height':844}, is_mobile=True, has_touch=True, color_scheme='dark')
                page = boot(phone, 'basketball')
                venue(page, 'basketball', 'basketball-phone')
                settings(page)
                recruit(page)
                click(page, '#battle')
                cameras(page, 'basketball-phone')
                receipt['observations']['basketball-phone-world'] = snap(page)['world']
                phone.close()
                check(not receipt['pageErrors'], 'no page exceptions')
                check(not [m for m in receipt['console'] if m['type']=='error'], 'no console errors unfiltered')
                check(not receipt['httpErrors'] and not receipt['failedRequests'], 'no failed local runtime requests')
                check(not receipt['externalRequests'], 'no external runtime requests')
                receipt['status'] = 'PASS'
            finally:
                browser.close()
    except Exception as error:
        receipt['status'] = 'FAIL'
        receipt['error'] = str(error).replace(str(ROOT), '<repo>')
        raise
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        receipt['elapsedSeconds'] = round(args.budget-(deadline-time.monotonic()),2)
        (output/'receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')
        print('Artifacts: '+str(output), flush=True)


if __name__ == '__main__':
    main()

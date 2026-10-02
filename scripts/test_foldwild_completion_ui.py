#!/usr/bin/env python3
"""Native controller check. Imported high-level saves are hostile/composition fixtures,
NOT natural campaign/rank/pacing acceptance. No live state grants or runtime hooks.
Run: python3 -B scripts/test_foldwild_completion_ui.py
"""
import functools
import json
import shutil
import subprocess
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from test_foldwild_core_v2 import Handler, snapshot, keyboard_to, walk
from test_foldwild_milestone import ready

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/tmp/foldwild-completion-ui')


def fixtures():
    # Pure, canonical fixtures constructed outside the browser. Only visible file
    # import + explicit consent can introduce them into the running controller.
    source = """
import {freshGame,validateSave,challengeFor,settleChallenge,REGION_LAYOUTS} from './Games/Foldwild/world.js';
import {createCreature,createBattle,applyAction,clearEffects} from './Games/Foldwild/battle.js';
import {classRank} from './Games/Foldwild/builds.js';
import {FINALE_STAGES,ENDING} from './Games/Foldwild/campaign.js';
function base(kind='finale',id=0) {
 const s=freshGame('cindupp',19); s.defeatedRivals=[0,1,2,3,4];
 s.finaleStage=kind==='finale'?id:3; s.activeClass='warden';
 s.roster=[createCreature('aurelvane',40,'owned-1')];
 s.caught=['aurelvane']; s.seen=['aurelvane']; s.encounterIndex=7;
 s.region=kind==='finale'?FINALE_STAGES[id].region:id;
 const p=REGION_LAYOUTS[s.region].points.find(p=>p.id===(kind==='finale'?'camp':'rival'));
 s.position={x:p.x,z:p.z,yaw:0}; return validateSave(s);
}
function pending(s,kind,id) {
 s=structuredClone(s); const d=challengeFor(s,{kind,id});
 const enemies=d.team.map((c,i)=>createCreature(c.speciesId,c.level,`${kind}-${id}-${s.encounterIndex}-${i}`));
 s.seen=[...new Set([...s.seen,...enemies.map(c=>c.speciesId)])];
 s.pendingChallenge={kind,id}; s.pendingBattle=createBattle(s.roster,enemies,{kind:'rival',seed:(s.seed+s.encounterIndex)>>>0,classId:s.activeClass,classRank:classRank(s,s.activeClass),synergyEnabled:true});
 return validateSave(s);
}
const first=base(), initial=pending(first,'finale',0);
const wait=applyAction(initial.pendingBattle,{type:'wait'});
if(wait.result) throw Error('Nonterminal fixture unexpectedly ended');
function terminal(kind,id,loss=false) {
 const s=pending(base(kind,id),kind,id), b=s.pendingBattle;
 if(loss) {
  b.player.team[0].hp=1; b.player.team[0].turnsTaken=1;
  b.player.team[0].status={name:'Scorch',remaining:1,appliedAt:0};
  s.roster=b.player.team.map(clearEffects); s.marks=0; s.kites=0;
 } else {
  b.enemy.team.forEach((c,i)=>c.hp=i===b.enemy.team.length-1?1:0);
  b.enemy.active=b.enemy.team.length-1;
 }
 const save=validateSave(s), action=loss?{type:'wait'}:{type:'ability',slot:2};
 const ended=applyAction(save.pendingBattle,action);
 if(ended.result!==(loss?'lost':'won')) throw Error('Terminal fixture did not end');
 return {save,ended,next:settleChallenge(save,ended)};
}
const old={...first,version:2}; delete old.finaleStage; delete old.pendingChallenge;
const supply=freshGame(); supply.claimedSupplies=['0:supply-0','0:supply-1'];
const point=REGION_LAYOUTS[0].points.find(p=>p.id==='supply-2');
supply.position={x:point.x,z:point.z,yaw:0};
console.log(JSON.stringify({first,initial,wait,ending:ENDING,final:terminal('finale',2),rematch:base('rematch',0),rematchWin:terminal('rematch',0),loss:terminal('finale',0,true),old,supply:validateSave(supply),fiber:point.quantity+1}));
"""
    return json.loads(subprocess.check_output(['node', '--experimental-default-type=module', '--input-type=module', '-e', source], cwd=ROOT, text=True))


def slots(page):
    return page.evaluate('[localStorage.getItem("foldwild-save-v1"),localStorage.getItem("foldwild-save-backup-v1")]')


def saved(page):
    page.wait_for_function('document.querySelector("#save-state").textContent === "Progress saved on this device."')


def upload(page, data, cancel=False):
    if not page.locator('#save-tools details').evaluate('(e)=>e.open'):
        page.locator('#save-tools summary').click()
    before = slots(page)
    page.locator('#save-file').set_input_files({'name': 'composition-fixture.json', 'mimeType': 'application/json', 'buffer': json.dumps(data).encode()})
    page.wait_for_function('!document.querySelector("#save-confirm").disabled')
    assert page.locator('#save-primary-bytes').input_value() == before[0]
    page.locator('#save-cancel' if cancel else '#save-confirm').click()
    page.wait_for_function('!document.querySelector("#save-dialog").open')
    if cancel:
        assert slots(page) == before
    else:
        saved(page)


def layout(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
    assert page.evaluate('''[...document.querySelectorAll('button')].every(e=>{
        const r=e.getBoundingClientRect(); return !r.width || !r.height || (r.width>=44 && r.height>=44)})'''), 'small button'


def run():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    data = fixtures()
    OUTPUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    origin = f'http://127.0.0.1:{server.server_port}'
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    errors, external = [], []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context(viewport={'width': 1100, 'height': 720})
                def local_only(route):
                    if urlsplit(route.request.url).netloc != urlsplit(origin).netloc:
                        external.append(route.request.url)
                        route.abort()
                    else:
                        route.continue_()
                context.route('**/*', local_only)
                page = context.new_page()
                page.set_default_timeout(10000)
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
                page.goto(origin + '/Games/Foldwild/')
                page.locator('#seed-input').fill('1')
                page.locator('#start').click()
                ready(page, 'world')
                keyboard_to(page, 0, 14)
                walk(page, 'camp', -4, 18)
                page.locator('#interact').click()
                page.get_by_role('button', name='Classes', exact=True).click()
                assert 'Pathfinder rank 1/3' in page.locator('#service-content').inner_text()
                assert '0/3 distinct claimed supplies' in page.locator('#service-content').inner_text()
                page.screenshot(path=str(OUTPUT / 'natural-classes.png'))
                page.get_by_role('button', name='Rest free:', exact=False).click()
                page.locator('#save-now').click()
                saved(page)
                # Movement's live yaw is projected by validateSave; compare the exact
                # canonical persisted state, not the pre-projection render state.
                natural = json.loads(slots(page)[0])
                page.reload()
                assert 'Trials 0/5' in page.locator('#saved-summary').inner_text()
                page.locator('#continue').click()
                ready(page, 'world')
                saved(page)
                assert snapshot(page)['state'] == natural
                print('PASS natural inputs: fresh start, keyboard movement, camp services/rank UI, free rest, manual save/reload', flush=True)

                upload(page, data['old'], cancel=True)
                upload(page, data['old'])
                assert snapshot(page)['state']['finaleStage'] == 0
                assert snapshot(page)['state']['version'] == 3
                assert 'Return lessons 0/3' in page.locator('#campaign-objective').text_content()
                page.locator('#interact').click()
                page.get_by_role('button', name='Preview Maren:', exact=False).click()
                assert not page.locator('#service-dialog').is_visible()
                assert 'Geodelve level 30, Trellisect level 30' in page.locator('#dialogue-text').inner_text()
                before = slots(page)
                page.locator('#dialogue-cancel').click()
                assert slots(page) == before
                page.locator('#interact').click()
                page.get_by_role('button', name='Preview Maren:', exact=False).click()
                page.locator('#dialogue-start').click()
                ready(page, 'battle')
                saved(page)
                assert snapshot(page)['battle'] == data['initial']['pendingBattle']
                assert json.loads(slots(page)[0]) == data['initial']
                page.locator('#wait').click()
                page.wait_for_function('!window.foldwildSnapshot.busy')
                saved(page)
                assert snapshot(page)['battle'] == data['wait']
                checkpoint = json.loads(slots(page)[0])
                assert checkpoint['pendingBattle'] == data['wait']
                page.reload()
                page.locator('#continue').click()
                ready(page, 'battle')
                saved(page)
                assert snapshot(page)['battle'] == data['wait']
                assert snapshot(page)['state'] == checkpoint
                print('PASS composition fixtures: old-save unstarted migration, named preview/Back, earned rank3, exact initial/nonterminal/pending Continue', flush=True)

                for label, fixture in [('loss', data['loss']), ('final', data['final']), ('rematch', data['rematchWin'])]:
                    upload(page, fixture['save'])
                    page.locator('#wait' if label == 'loss' else '#ability-2').click()
                    page.wait_for_function('window.foldwildSnapshot.phase === "result" && !window.foldwildSnapshot.busy')
                    saved(page)
                    assert snapshot(page)['state'] == fixture['next'], label
                    assert snapshot(page)['battle'] == fixture['ended'], label
                    assert json.loads(slots(page)[0]) == fixture['next']
                    assert page.locator('#result-continue').evaluate('(e)=>e===document.activeElement')
                    if label == 'final':
                        assert page.locator('#result-description').inner_text() == data['ending']
                        assert page.locator('#result-continue').inner_text() == 'Continue free play'
                        for width in [390, 320]:
                            page.set_viewport_size({'width': width, 'height': 780})
                            layout(page)
                            page.locator('#result').scroll_into_view_if_needed()
                            page.screenshot(path=str(OUTPUT / f'fixture-ending-{width}.png'))
                        page.set_viewport_size({'width': 1100, 'height': 720})
                    page.locator('#result-continue').click()
                    saved(page)
                    before = snapshot(page)['state']
                    page.reload()
                    page.locator('#continue').click()
                    saved(page)
                    assert snapshot(page)['state'] == before, 'reload paid again'
                print('PASS composition fixtures: exact terminal loss/free recovery, ending/focus/320+390 layout, rematch ordinary payout and no reload payout', flush=True)

                upload(page, data['rematch'])
                page.locator('#interact').click()
                assert page.locator('#dialogue-title').inner_text() == 'Maren rematch'
                assert 'Shardip level 8' in page.locator('#dialogue-text').inner_text()
                page.locator('#dialogue-start').click()
                saved(page)
                assert snapshot(page)['state']['pendingChallenge'] == {'kind': 'rematch', 'id': 0}
                assert snapshot(page)['battle']['enemy']['team'][0]['uid'] == 'rematch-0-7-0'
                upload(page, data['supply'])
                page.locator('#interact').click()
                saved(page)
                assert snapshot(page)['state']['inventory']['fiber'] == data['fiber']
                assert 'Pathfinder rank 2' == page.locator('#class-name').inner_text()
                print('PASS composition fixtures: explicit rematch Begin UID/context; threshold-crossing supply uses OLD rank', flush=True)
                assert not errors and not external, (errors, external)
                context.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        print('CLEANUP: native browser and bounded server stopped', flush=True)
    print('PASS controller check; natural campaign/ranks/pacing, touch, M2, hardware/rights/release remain HELD', flush=True)


if __name__ == '__main__':
    run()

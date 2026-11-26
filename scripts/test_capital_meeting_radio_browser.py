#!/usr/bin/env python3
"""Exercise campaign subtitles and both Three receipts journal choices with real input."""
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = """
import fs from 'node:fs';
import {createProgression} from './Games/Capital Drive/progression.js';
import {createProtagonistState} from './Games/Capital Drive/protagonist-state.js';
import {WEAPON_IDS} from './Games/Capital Drive/weapons.js';
const map=JSON.parse(fs.readFileSync('./Games/Capital Drive/data/canberra.json'));
const ammunition=Object.fromEntries(WEAPON_IDS.map(id=>[id,{ammo:0,reserveAmmo:0}]));
const checkpoint={mode:'foot',actor:{x:376.113,z:-220.272,yaw:0},health:100,weapon:'unarmed',ammunition,
  vehicle:{...map.spawn,yaw:map.spawn.yaw||0,modelId:'lantern',color:'#e7e6df',health:100,stolen:false}};
const protagonists={version:1,student:checkpoint,corporate:null,basement:null};
createProtagonistState(protagonists,{bounds:map.bounds});
console.log(JSON.stringify({...createProgression(map).serialize(),protagonists,campaign:{version:2,character:'student',
  intros:{student:['student-paper-chase','student-extra-credit'],corporate:['corporate-present-tense','corporate-lunch-breakpoint'],
  basement:['basement-touch-grass','basement-first-delivery']},meeting:false,legacy:false,completed:[]}}));
"""


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--map-view',action='store_true',help='Use the shipping 2D renderer on hosts without an accelerated GPU.')
    args=parser.parse_args()
    output=args.output.resolve()
    assert ROOT!=output and ROOT not in output.parents
    output.mkdir(parents=True,exist_ok=False)
    fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',FIXTURE],cwd=ROOT,text=True))
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    report={'checks':[],'errors':[],'limits':['Six prior intro completions and a starting foot pose at the Kingston meeting were seeded. Route selection and subtitle display are native input checks.']}
    def check(ok,label):
        assert ok,label
        report['checks'].append(label)
        print('PASS',label,flush=True)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--ignore-gpu-blocklist',*(['--disable-webgl'] if args.map_view else [])])
            try:
                context=browser.new_context(viewport={'width':1120,'height':750},service_workers='block')
                context.add_init_script("if(!localStorage.getItem('capital-drive-career-v1'))localStorage.setItem('capital-drive-career-v1',"+json.dumps(json.dumps(fixture))+');')
                page=context.new_page()
                page.set_default_timeout(60000)
                page.on('pageerror',lambda error: report['errors'].append(str(error)))
                page.on('console',lambda message: report['errors'].append(message.text) if message.type=='error' else None)
                page.on('response',lambda response: print('HTTP',response.status,response.url,flush=True) if response.status>=400 else None)
                response=page.goto(f'http://127.0.0.1:{server.server_port}/Games/Capital%20Drive/index.html',wait_until='domcontentloaded',timeout=90000)
                report['opened']={'url':page.url,'title':page.title(),'status':response.status}
                print('Opened',report['opened'],page.locator('body').inner_text()[:100],flush=True)
                if page.locator('#loading').count()!=1:
                    raise RuntimeError('Capital Drive startup screen missing')
                page.wait_for_function("()=>typeof window.capitalDriveSnapshot==='function' || document.querySelector('#loading[role=alert]')",timeout=360000)
                if not page.evaluate("()=>typeof window.capitalDriveSnapshot==='function'"):
                    raise RuntimeError(page.locator('#loading').inner_text())
                print('Ready',flush=True)
                report['build']=page.locator('#build-version').inner_text()
                page.locator('[data-game-mode=campaign]').click(no_wait_after=True)
                page.locator('#guided-tutorial').uncheck()
                report['renderer']=page.locator('#loading').inner_text()
                if page.locator('#startup-quality').is_enabled():
                    page.locator('#startup-quality').select_option('performance')
                page.locator('#intro-characters [data-character=student]').click(no_wait_after=True)
                page.locator('#start-button').click(no_wait_after=True)
                page.locator('#campaign-dialog').wait_for(state='visible')
                check('Three receipts' in page.locator('#campaign-title').inner_text(),'Kingston meeting offered from retained intro progress')
                page.locator('#campaign-start').click(no_wait_after=True)
                page.locator('#cutscene-skip').click(no_wait_after=True)
                page.wait_for_function('()=>capitalDriveSnapshot().campaign.active?.stage===1')
                page.locator('#campaign-radio').wait_for(state='visible')
                report['initialLine']=page.locator('#campaign-radio').inner_text()
                check('Mara' in report['initialLine'],'Mara presents the live route choice during play')
                page.keyboard.press('j')
                page.locator('#meeting-backup').wait_for(state='visible')
                check(page.locator('#meeting-direct').get_attribute('aria-pressed')=='true','Crescent handover is initially selected')
                page.screenshot(path=str(output/'01-journal-handover.png'))
                page.locator('#meeting-backup').click(no_wait_after=True)
                page.wait_for_function("()=>capitalDriveSnapshot().campaign.active?.meetingRoute==='backup'")
                page.wait_for_function("()=>document.querySelector('#campaign-radio span').textContent.includes('case table')")
                check(page.evaluate('()=>capitalDriveSnapshot().campaign.active.stageCount')==3,'Case-table action added to the real itinerary')
                page.screenshot(path=str(output/'02-crew-radio.png'))
                page.keyboard.press('j')
                check(page.locator('#meeting-backup').get_attribute('aria-pressed')=='true','Journal remembers the current choice')
                page.locator('#meeting-direct').click(no_wait_after=True)
                page.wait_for_function("()=>capitalDriveSnapshot().campaign.active?.meetingRoute==='direct'")
                check(page.evaluate('()=>capitalDriveSnapshot().campaign.active.stageCount')==2,'Direct route restores the Crescent itinerary')
                check(not report['errors'],'No page errors during the native journal handovers')
                report['status']='PASS'
            except Exception:
                if page and not page.is_closed():
                    report['loading']=page.evaluate("()=>document.querySelector('#loading')?.textContent??document.body.innerText.slice(0,500)")
                    if not report.get('opened'):report['url']=page.url
                    try:page.screenshot(path=str(output/'failure.png'),timeout=8000)
                    except Exception:pass
                raise
            finally:
                browser.close()
    except Exception as error:
        report['status']='FAIL'
        report['failure']=str(error)
    finally:
        server.shutdown();server.server_close()
        (output/'results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(report['status'],report.get('failure',''),flush=True)
    return 0 if report['status']=='PASS' else 1


if __name__=='__main__':
    raise SystemExit(main())

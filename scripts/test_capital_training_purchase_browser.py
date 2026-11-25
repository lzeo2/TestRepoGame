#!/usr/bin/env python3
"""Native Phone purchases with an explicitly seeded earned-points career fixture.

The seed only supplies prior career earnings. All purchases, reloads and mode
selection use real Chromium inputs; this does not verify earning those points.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*_):
        pass

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--build',required=True)
    args=parser.parse_args()
    output=args.output.resolve()
    assert ROOT not in output.parents and output!=ROOT
    output.mkdir(parents=True,exist_ok=False)
    fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import fs from 'node:fs';
import {createProgression} from './Games/Capital Drive/progression.js';
import {createCareerTraining} from './Games/Capital Drive/career-training.js';
const map=JSON.parse(fs.readFileSync('./Games/Capital Drive/data/canberra.json'));
const training=createCareerTraining();
for(let i=0;i<3;i++)training.award({type:'job-complete',jobId:`fixture-job-${i}`},{mode:'street',crewPresent:true});
console.log(JSON.stringify({...createProgression(map).serialize(),trainingProfiles:training.serialize()}));
"""],cwd=ROOT,text=True))
    (output/'initial-career-fixture.json').write_text(json.dumps(fixture,indent=2)+'\n')
    report={'checks':[],'errors':[],'limits':['Explicit seeded prior earnings: Street player 3, crew 3; Campaign 0. No native earning claim.','Headless Chromium with software WebGL; desktop 1280x800.']}
    def check(value,label):
        assert value,label
        report['checks'].append(label)
        print('PASS',label,flush=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
            try:
                context=browser.new_context(viewport={'width':1280,'height':800},service_workers='block')
                context.add_init_script("if(!localStorage.getItem('capital-drive-career-v1'))localStorage.setItem('capital-drive-career-v1',"+json.dumps(json.dumps(fixture))+");")
                page=context.new_page()
                page.set_default_timeout(30000)
                page.on('pageerror',lambda error:report['errors'].append(str(error)))
                url=f'http://127.0.0.1:{server.server_port}/Games/Capital%20Drive/'
                def boot(mode):
                    page.goto(url,wait_until='domcontentloaded',timeout=90000)
                    page.wait_for_function('()=>window.capitalDriveSnapshot?.().ready',timeout=180000)
                    actual_build=page.locator('#build-version').inner_text()
                    report.setdefault('builds',[]).append({'mode':mode,'build':actual_build})
                    check(actual_build==args.build,'Requested build loaded for '+mode)
                    page.locator(f'[data-game-mode={mode}]').click()
                    page.locator('#guided-tutorial').uncheck()
                    page.locator('#startup-quality').select_option('performance')
                    if mode=='campaign':page.locator('#intro-characters [data-character=basement]').click()
                    page.locator('#start-button').click()
                    page.wait_for_function('()=>capitalDriveSnapshot().started',timeout=60000)
                    if page.locator('#campaign-dialog').is_visible():page.keyboard.press('Escape')
                def training(track='player'):
                    page.locator('#phone-button').click()
                    page.locator('#city-training-open').click()
                    page.locator('#city-training-'+track).click()
                boot('street')
                training()
                check(page.locator('#city-training-points').inner_text()=='3 training points available','Seeded player bank displayed')
                page.locator('#city-learn-steady-stride').click()
                check(page.locator('#city-learn-steady-stride').is_disabled(),'Purchased player skill is disabled as learned')
                check(page.locator('#city-training-points').inner_text()=='2 training points available','Player purchase spent exactly one point')
                page.screenshot(path=str(output/'01-player-purchased.png'))
                page.locator('#city-training-crew').click()
                check(page.locator('#city-training-points').inner_text()=='3 training points available','Separate crew bank displayed')
                page.locator('#city-learn-keep-pace').click()
                check(page.locator('#city-training-points').inner_text()=='2 training points available','Crew purchase spent exactly one point')
                check(page.locator('#city-learn-keep-pace').is_disabled(),'Purchased crew skill is learned')
                page.screenshot(path=str(output/'02-crew-purchased.png'))
                stored=page.evaluate("()=>JSON.parse(localStorage.getItem('capital-drive-career-v1')).trainingProfiles")
                check(stored['street']['player']['unlocked']==['steady-stride'] and stored['street']['crew']['unlocked']==['keep-pace'],'Both native purchases persisted in actual career storage')
                boot('street')
                training()
                check(page.locator('#city-training-points').inner_text()=='2 training points available' and page.locator('#city-learn-steady-stride').inner_text()=='Learned','Player purchase survives page reload')
                page.locator('#city-training-crew').click()
                check(page.locator('#city-training-points').inner_text()=='2 training points available' and page.locator('#city-learn-keep-pace').inner_text()=='Learned','Crew purchase survives page reload')
                page.screenshot(path=str(output/'03-reloaded-crew.png'))
                boot('campaign')
                training()
                check(page.locator('#city-training-points').inner_text()=='0 training points available','Campaign player bank isolated')
                check(page.locator('#city-learn-steady-stride').inner_text()!='Learned','Campaign did not inherit Street player skill')
                page.locator('#city-training-crew').click()
                check(page.locator('#city-training-points').inner_text()=='0 training points available' and page.locator('#city-learn-keep-pace').inner_text()!='Learned','Campaign crew bank and skill isolated')
                page.screenshot(path=str(output/'04-campaign-isolation.png'))
                check(not report['errors'],'No page errors')
                report['status']='PASS'
            finally:
                browser.close()
    except Exception as error:
        report['status']='FAIL';report['failure']=str(error)
    finally:
        server.shutdown();server.server_close()
        (output/'results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(report.get('status'),report.get('failure',''),flush=True)
    return 0 if report.get('status')=='PASS' else 1
if __name__=='__main__':
    raise SystemExit(main())

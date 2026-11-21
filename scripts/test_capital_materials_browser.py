#!/usr/bin/env python3
"""Bounded visual/material comparison through actual Free-roam UI.
Use the same harness with exact baseline export and candidate source. Official
map arrivals are streaming fixtures, not native cross-city driving. Software
WebGL/CDP timings are not Intel N100 performance or GPU measurements.
"""
import argparse, functools, hashlib, http.server, json, threading, time
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import profile_capital_sustained as probe
ROOT=Path(__file__).resolve().parents[1]
probe.DTO="""()=>{const s=capitalDriveSnapshot();return {player:s.player,focus:s.focus,camera:s.camera,rendering:s.rendering,world:s.world,neighbourhood:s.neighbourhood,airport:s.airport,mapView:s.mapView,paused:s.paused,gameMode:s.gameMode,simulationElapsed:s.signals.elapsed,webgl:window.__sustainedGLCounts?.()};}"""
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--label',required=True);args=p.parse_args()
    root,out=args.root.resolve(),args.output.resolve()
    if root==out or root in out.parents or ROOT==out or ROOT in out.parents:p.error('Use fresh external evidence output')
    out.mkdir(parents=True,exist_ok=False)
    report={'label':args.label,'viewport':{'width':1280,'height':800},'sourcesBefore':probe.sources(root),'harnessSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'samples':[],'settles':[],'repositions':[],'errors':[],'requests':[],'external':[],'limitations':['Official Free-roam map travel is an explicit fixture; no natural cross-city travel claim.','Stationary camera and vehicle inputs are held unchanged; ambient traffic and actual elapsed simulation are not seeded.','SwiftShader cloud timing and logical GL object counts do not certify N100 FPS, GPU bytes or total memory.','Cumulative metrics, measured RAF intervals, simulation time and actual render deltas are separate observations.']}
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();started=time.monotonic()
    try:
      with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        try:
          context=browser.new_context(viewport=report['viewport'],service_workers='block');context.add_init_script(probe.GL_INIT)
          context.add_init_script('localStorage.setItem("capital-drive-rendering-v1","performance")')
          page=context.new_page();page.set_default_timeout(30000);page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None);page.on('requestfailed',lambda r:report['requests'].append(r.url));page.on('response',lambda r:report['requests'].append(str(r.status)+' '+r.url) if r.status>=400 else None)
          def route(r):
            if urlsplit(r.request.url).hostname in ('127.0.0.1',None):r.continue_()
            else:report['external'].append(r.request.url);r.abort()
          context.route('**/*',route)
          page.goto(f'http://127.0.0.1:{server.server_port}/Games/Capital%20Drive/',wait_until='load',timeout=150000);page.wait_for_function('window.capitalDriveSnapshot?.().ready',timeout=150000)
          page.locator('[data-game-mode=free]').click();page.locator('#guided-tutorial').uncheck();page.locator('#start-button').click();page.wait_for_function('capitalDriveSnapshot().started')
          assert not probe.snapshot(page)['rendering']['compatibility'],'Actual WebGL required'
          session=context.new_cdp_session(page);session.send('Performance.enable')
          def metrics():return {r['name']:r['value'] for r in session.send('Performance.getMetrics')['metrics']}
          def measure(name):
            settled=probe.settle(page,name,report['settles'],seconds=25)
            assert settled['settled'],name+' streaming queue did not settle'
            before=probe.snapshot(page);m0=metrics();wall=time.monotonic()
            raf=page.evaluate("""()=>new Promise(resolve=>{const start=performance.now(),times=[];let last=null;function frame(now){if(last!==null)times.push(now-last);last=now;if(now-start>=3000)resolve({times,elapsedMs:now-start});else requestAnimationFrame(frame)}requestAnimationFrame(frame)})""")
            m1=metrics();elapsed=time.monotonic()-wall;after=probe.snapshot(page)
            row={'name':name,'before':before,'after':after,'metricsDelta':{k:m1[k]-m0.get(k,0) for k in ['Timestamp','ScriptDuration','TaskDuration','LayoutDuration','RecalcStyleDuration'] if k in m1},'wallSeconds':elapsed,'raf':raf,'rafP50Ms':probe.percentile(raf['times'],.5),'rafP95Ms':probe.percentile(raf['times'],.95),'renderDelta':after['rendering']['frames']-before['rendering']['frames'],'suppliedSeconds':after['simulationElapsed']-before['simulationElapsed']}
            page.screenshot(path=str(out/(name+'.png')),timeout=30000);report['samples'].append(row);(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');print('SAMPLED',name,after['rendering'],flush=True)
          data=json.loads((root/'Games/Capital Drive/data/canberra.json').read_text());places={x['id']:x for x in data['landmarks']}
          measure('telopea-performance')
          probe.reposition(page,places['kingston'],report['repositions']);measure('kingston-performance')
          page.locator('#pause-button').click();page.locator('#quality').select_option('low');page.locator('#resume-button').click();measure('kingston-low')
          probe.reposition(page,places['telopea'],report['repositions']);measure('telopea-low')
          assert not report['errors'] and not report['requests'] and not report['external'],'Browser or request errors'
          report['status']='PASS'
        finally:browser.close()
    except Exception as exc:report['status']='FAIL';report['failure']=str(exc)
    finally:
      server.shutdown();server.server_close();thread.join(timeout=3);report['sourcesAfter']=probe.sources(root);report['sourcesUnchanged']=report['sourcesBefore']==report['sourcesAfter'];report['elapsedSeconds']=time.monotonic()-started;(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(report['status'],report.get('failure'),flush=True)
    return int(report['status']!='PASS' or not report['sourcesUnchanged'])
if __name__=='__main__':raise SystemExit(main())

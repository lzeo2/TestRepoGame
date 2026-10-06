#!/usr/bin/env python3
"""Ordinary Cutup drive/braking/real arrest and respawn; no grants or injected steps.
Run from repo root with a 90s outer lease; readiness20s. Not campaign/device proof.
"""
import functools,hashlib,json,shutil,subprocess,tempfile,threading,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
root=Path.cwd();assert shutil.disk_usage(root).free>=2_000_000_000
output=Path(tempfile.mkdtemp(prefix='slipstream-natural-caught-'));head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();errors=[]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}';print('OUTPUT='+str(output),flush=True)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  try:
   page=browser.new_page(viewport={'width':1280,'height':900});page.set_default_timeout(20000)
   page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:errors.append(r.url));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('response',lambda r:errors.append(f'HTTP {r.status} {r.url}') if r.status>=400 else None)
   page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') else(errors.append('External '+r.request.url),r.abort()))
   state=lambda:page.evaluate('slipstreamSnapshot')
   page.goto(origin+'/Games/Slipstream%20Borough/');page.wait_for_function('slipstreamSnapshot.view?.frames>1');page.locator('#mode').select_option('cutup');page.locator('#start').click();page.locator('#closeHelp').click()
   page.locator('#cruise').check();page.locator('#viewport').focus();page.keyboard.down('a');page.wait_for_function('slipstreamSnapshot.run.x<.25');page.keyboard.up('a')
   page.wait_for_function('slipstreamSnapshot.run.police.length>0',timeout=40000)
   approach=state();page.keyboard.down('s');page.wait_for_function('slipstreamSnapshot.phase==="end" && slipstreamSnapshot.run.arrest===3');page.keyboard.up('s')
   caught=state();assert caught['run']['hp']>0 and caught['run']['status']=='busted';assert page.locator('#resultTitle').inner_text()=='Caught by police';assert caught['respawnRemaining']>0
   page.screenshot(path=str(output/'caught-countdown.jpg'),quality=76)
   page.wait_for_function('id=>slipstreamSnapshot.phase==="run" && slipstreamSnapshot.run.id>id',arg=caught['run']['id'])
   restarted=state();assert restarted['run']['mode']=='cutup' and restarted['run']['hp']==100 and restarted['run']['id']==caught['run']['id']+1 and restarted['profile']['settledRun']==caught['run']['id'];assert restarted['profile']['cash']==caught['profile']['cash'] and not restarted['profile']['testMode'] and not page.locator('#cruise').is_checked();assert not errors,errors
   (output/'observations.json').write_text(json.dumps({'head':head,'errors':errors,'assisted':False,'approach':approach,'caught':caught,'sameModeRespawn':restarted,'scope':'Natural single Cutup arrest and respawn only. No storage-conflict/full-campaign/physical hardware certification.'},indent=2));print('PASS ordinary Cutup/real police/brake/actual arrest3 with HP remaining/caught label/countdown/fresh same-mode respawn/once-only payout/no grants/local-only.',flush=True)
  except Exception as error:
   (output/'failure.json').write_text(json.dumps({'head':head,'errors':errors,'failure':str(error),'assisted':False},indent=2))
   try:page.screenshot(path=str(output/'failure.jpg'),quality=76);(output/'failure-state.json').write_text(json.dumps(state(),indent=2))
   except Exception:pass
   raise
  finally:browser.close()
finally:server.shutdown();server.server_close()

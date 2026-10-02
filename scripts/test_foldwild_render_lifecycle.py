#!/usr/bin/env python3
"""Bounded NEGATIVE renderer fixtures, not native-input or whole-game acceptance.

Uses installed Chromium/Playwright, real WebGL loss, and explicitly fake loader
promises/resources. No state grants, screenshots, vendor edits or clock patches.
"""
import functools
import shutil
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'http://127.0.0.1:8822'
HARNESS = b'''<!doctype html><meta charset="utf-8"><title>Negative lifecycle fixtures</title>
<canvas style="width:400px;height:240px"></canvas><section id="inspector"></section>
<p id="message">Independent action message</p><p id="diagnostic" role="status"></p>
<script type="module">
import * as THREE from '/Games/Foldwild/vendor/three.module.js';
import {GLTFLoader} from '/Games/Foldwild/vendor/GLTFLoader.js';
import {createView} from '/Games/Foldwild/view.js';
import {SPECIES} from '/Games/Foldwild/data.js';
window.canvas=document.querySelector('canvas');
window.events=[];window.jobs=[];window.species=SPECIES;window.fixture=false;
const realLoad=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=function(url){
  if(!fixture)return realLoad.call(this,url);
  return new Promise((resolve,reject)=>jobs.push({url,resolve,reject}));
};
window.complete=i=>{
  const job=jobs[i],geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshBasicMaterial();
  job.disposals=0;
  for(const resource of [geometry,material])resource.addEventListener('dispose',()=>job.disposals++);
  const scene=new THREE.Group();scene.add(new THREE.Mesh(geometry,material));job.resolve({scene});
};
window.makeView=callback=>{
  window.view=createView(canvas,callback?{onDiagnostic:status=>{
    if(!Object.isFrozen(status)||!Object.isFrozen(status.pendingModels)||!Object.isFrozen(status.fallbackModels))throw Error('mutable diagnostic');
    events.push(status);document.querySelector('#diagnostic').textContent=status.message;
  }}:{});
};
window.ext=canvas.getContext('webgl').getExtension('WEBGL_lose_context');
makeView(true);window.ready=true;
</script>'''


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/__lifecycle':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(HARNESS)))
            self.end_headers()
            self.wfile.write(HARNESS)
        elif self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
        else:
            super().do_GET()

    def log_message(self, *_args):
        pass


def run():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000, 'disk guard: less than 2 GB free'
    server = ThreadingHTTPServer(('127.0.0.1', 8822), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    errors, external = [], []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context()
                def local_only(route):
                    if urlsplit(route.request.url).netloc != urlsplit(ORIGIN).netloc:
                        external.append(route.request.url)
                        route.abort()
                    else:
                        route.continue_()
                context.route('**/*', local_only)
                page = context.new_page()
                page.set_default_timeout(10000)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
                page.goto(ORIGIN + '/__lifecycle')
                page.wait_for_function('window.ready')
                assert page.evaluate('Boolean(ext)'), 'WEBGL_lose_context unavailable'
                info = page.evaluate("async()=>{await view.showInspection({speciesId:'cindupp'});view.render(0);return view.inspect()}")
                assert info['countLoadedModels'] == 1 and not info['fallbackModels'], info
                # NEGATIVE context-loss fixtures, first in place then after canvas reparenting.
                for reparent in [False, True]:
                    if reparent:
                        page.evaluate("document.querySelector('#inspector').append(canvas);view.resize()")
                    before = page.evaluate('view.inspect()')
                    page.evaluate('ext.loseContext()')
                    page.wait_for_function("view.inspect().contextStatus === 'lost'")
                    lost = page.evaluate('view.render(.1);view.inspect()')
                    assert lost['frames'] == before['frames'], lost
                    assert 'Text and buttons remain available' in page.locator('#diagnostic').inner_text()
                    assert page.locator('#message').inner_text() == 'Independent action message'
                    page.evaluate('ext.restoreContext()')
                    page.wait_for_function("view.inspect().contextStatus === 'restoring'")
                    restored = page.evaluate('view.render(0);view.inspect()')
                    assert restored['contextStatus'] == 'available' and restored['frames'] == before['frames'] + 1
                    assert restored['loadedModels'] == before['loadedModels'] and restored['drawCalls'] > 0
                print('PASS negative fixture: real context loss/restoration, reparenting, retained CPU model and separate diagnostics')

                # Shared rejection: one loader promise, two battle consumers, no fake loaded model.
                page.evaluate("fixture=true;window.pending=view.showBattle({playerSpeciesId:'dewgob',enemySpeciesId:'dewgob'});void 0")
                page.wait_for_function('jobs.length === 1')
                assert page.evaluate('view.inspect().pendingModels') == ['dewgob']
                page.evaluate("jobs[0].reject(new Error('NEGATIVE fixture rejection'))")
                rejected = page.evaluate('async()=>{await pending;return view.inspect()}')
                assert rejected['countLoadedModels'] == 0 and rejected['modelReferences'] == 0
                assert len(rejected['fallbackModels']) == 1 and not rejected['pendingModels'], rejected
                assert 'NEGATIVE fixture rejection' in page.locator('#diagnostic').inner_text()
                # Restore must not turn a fallback marker into a loaded creature.
                page.evaluate('ext.loseContext()')
                page.wait_for_function("view.inspect().contextStatus === 'lost'")
                page.evaluate('ext.restoreContext()')
                page.wait_for_function("view.inspect().contextStatus === 'restoring'")
                assert page.evaluate('view.render(0);view.inspect().countLoadedModels') == 0
                assert page.evaluate('view.inspect().fallbackModels') == rejected['fallbackModels']
                print('PASS negative fixture: shared rejection and honest fallback after context recovery')

                # Actual 20 seconds, no fake clock, sleep inflation or configurable deadline.
                page.evaluate("window.started=performance.now();window.pending=view.showInspection({speciesId:'pithnip'}).then(()=>window.settledAt=performance.now());void 0")
                page.wait_for_function('jobs.length === 2')
                assert page.evaluate('view.inspect().pendingModels') == ['pithnip']
                page.wait_for_function('window.settledAt !== undefined', timeout=23000)
                elapsed = page.evaluate('settledAt-started')
                assert 19900 <= elapsed < 23000, elapsed
                timed = page.evaluate('view.inspect()')
                assert timed['countLoadedModels'] == 0 and timed['modelReferences'] == 0 and not timed['pendingModels']
                assert 'exceeded 20 seconds' in timed['fallbackModels'][0], timed
                page.evaluate('complete(1)')
                page.wait_for_function('jobs[1].disposals === 2')
                assert page.evaluate('view.inspect().countLoadedModels') == 0
                print(f'PASS negative fixture: actual deadline {elapsed:.0f}ms; late result disposed, not attached')

                # Old generation resolves while its base remains legitimately cached, then evicts.
                page.evaluate("window.old=view.showInspection({speciesId:'pithnip'});void 0")
                page.wait_for_function('jobs.length === 3')
                page.evaluate('view.showWorld();complete(2)')
                stale = page.evaluate('async()=>{await old;return view.inspect()}')
                assert stale['mode'] == 'world' and stale['modelReferences'] == 0 and stale['countLoadedModels'] == 0
                assert not stale['pendingModels'] and not stale['fallbackModels']
                assert page.evaluate('jobs[2].disposals') == 0, 'cached source disposed early'
                page.evaluate('''async()=>{for(const s of species.slice(10,24)){
                  const p=view.showInspection({speciesId:s.id});await Promise.resolve();
                  complete(jobs.length-1);await p;
                }}''')
                assert page.evaluate('jobs[2].disposals') == 2, 'evicted stale base leaked'
                assert page.evaluate('view.inspect().cacheSize') == 12
                # Pending disposal cancels the deadline/promise; late resources still dispose once.
                page.evaluate("window.old=view.showInspection({speciesId:'kilnarch'});void 0")
                page.wait_for_function('jobs.length === 18')
                page.evaluate('view.dispose();view.dispose()')
                disposed = page.evaluate('async()=>{await old;return view.inspect()}')
                assert disposed['cacheSize'] == disposed['modelReferences'] == disposed['countLoadedModels'] == 0
                page.evaluate('complete(17)')
                page.wait_for_function('jobs[17].disposals === 2')
                assert page.evaluate('jobs.slice(2).every(j=>j.disposals===2)')
                frames = page.evaluate('view.inspect().frames')
                page.evaluate('view.render(.1)')
                assert page.evaluate('view.inspect().frames') == frames
                print('PASS negative fixtures: stale generation, 12-entry eviction, pending disposal and exactly-once late cleanup')

                # Existing no-callback callers keep direct diagnostic behavior.
                page.evaluate("makeView(false);window.pending=view.showInspection({speciesId:'cindupp'});void 0")
                page.wait_for_function('jobs.length === 19')
                assert 'Loading local 3D models' in page.locator('#message').inner_text()
                page.evaluate("jobs[18].reject(new Error('NEGATIVE direct fixture'))")
                page.evaluate('async()=>{await pending}')
                assert 'Marker used instead' in page.locator('#message').inner_text()
                page.evaluate('view.showWorld()')
                assert page.locator('#message').inner_text() == ''
                page.evaluate('view.dispose()')
                assert page.evaluate('document.querySelectorAll("canvas").length') == 1
                assert not errors and not external, (errors, external)
                print('PASS compatibility: direct fallback, callback action separation, one canvas; no console/page errors or external requests')
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        assert not thread.is_alive(), 'test server thread did not stop'
        print('CLEANUP: browser closed; loopback 8822 server stopped')


if __name__ == '__main__':
    run()

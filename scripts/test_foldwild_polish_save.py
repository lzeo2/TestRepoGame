#!/usr/bin/env python3
"""Focused native save UX check, not full M2/hardware acceptance. No state grants."""
import functools
import json
import shutil
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from test_foldwild_core_v2 import Handler, snapshot, keyboard_to, walk
from test_foldwild_milestone import ready, battle_start, source_hashes

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'http://127.0.0.1:8823'


def slots(page):
    return page.evaluate('[localStorage.getItem("foldwild-save-v1"),localStorage.getItem("foldwild-save-backup-v1")]')


def saved(page):
    page.wait_for_function('document.querySelector("#save-state").textContent === "Progress saved on this device."')


def tools(page):
    if not page.locator('#save-tools details').evaluate('(e)=>e.open'):
        page.locator('#save-tools summary').click()


def upload(page, data, name='foldwild-save.json'):
    tools(page)
    page.locator('#save-file').set_input_files({'name': name, 'mimeType': 'application/json', 'buffer': data})


def run():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    hashes = source_hashes()
    errors, external = [], []
    server = ThreadingHTTPServer(('127.0.0.1', 8823), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                def page_for(context, negative=False):
                    def route(req):
                        if urlsplit(req.request.url).netloc != urlsplit(ORIGIN).netloc:
                            external.append(req.request.url)
                            req.abort()
                        else:
                            req.continue_()
                    context.route('**/*', route)
                    page = context.new_page()
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    if not negative:
                        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
                    page.goto(ORIGIN + '/Games/Foldwild/')
                    page.wait_for_function('window.foldwildSnapshot?.phase === "menu"')
                    return page

                context = browser.new_context(accept_downloads=True)
                page = page_for(context)
                page.locator('#seed-input').fill('1')
                page.locator('#start').click()
                ready(page, 'world')
                page.locator('#save-now').click()
                saved(page)
                assert json.loads(slots(page)[0])['seed'] == 1
                other = page_for(context)
                other.locator('#continue').click()
                ready(other, 'world')
                saved(other)
                page.bring_to_front()
                keyboard_to(page, 0, 10)
                page.locator('#save-now').click()
                saved(page)
                newer = slots(page)
                other.bring_to_front()
                other.locator('#save-now').click()
                other.wait_for_function('document.querySelector("#save-state").textContent.includes("save conflict")')
                assert other.locator('#save-state').is_visible()
                assert slots(other) == newer
                other.locator('#save-now').click()
                other.close(run_before_unload=True)
                page.bring_to_front()
                assert slots(page) == newer
                print('PASS ordinary tabs: fresh/manual/Continue/walk; stale Save and unload preserve both slots', flush=True)

                # Hold the actual native lock to observe queued, pre-captured preference snapshots.
                locker = context.new_page()
                locker.goto(ORIGIN + '/Games/Foldwild/')
                locker.evaluate('''() => { window.lockHeld=false; navigator.locks.request('foldwild-save',()=>{
                    window.lockHeld=true; return new Promise(resolve=>window.releaseLock=resolve); }); }''')
                locker.wait_for_function('window.lockHeld')
                page.locator('#quality').select_option('standard')
                page.locator('#quality').select_option('low')
                assert 'pending' in page.locator('#save-state').inner_text()
                assert slots(page) == newer
                locker.evaluate('window.releaseLock()')
                saved(page)
                assert json.loads(slots(page)[0])['quality'] == 'low'
                assert json.loads(slots(page)[1])['quality'] == 'standard'
                locker.close()
                print('PASS native lock queue: pending truthful, snapshots ordered, no self-conflict', flush=True)

                keyboard_to(page, -8, 4)
                walk(page, 'wild-0', -10, 4)
                battle_start(page)
                saved(page)
                pending = snapshot(page)['battle']
                assert page.locator('#save-state').is_visible()
                tools(page)
                with page.expect_download() as event:
                    page.locator('#save-export').click()
                download = event.value
                payload = Path(download.path()).read_bytes()
                assert json.loads(payload)['pendingBattle'] == pending
                # Strict module validation of the real downloaded bytes, not a fabricated positive save.
                assert page.evaluate('''async raw => { const {validateSave}=await import('./world.js');
                    return JSON.stringify(validateSave(JSON.parse(raw))) === raw; }''', payload.decode())
                page.locator('#wait').click()
                page.wait_for_function('!window.foldwildSnapshot.busy')
                saved(page)
                next_battle = snapshot(page)['battle']
                before = slots(page)
                upload(page, payload)
                page.wait_for_function('!document.querySelector("#save-confirm").disabled')
                assert page.locator('#save-primary-bytes').input_value() == before[0]
                page.locator('#save-cancel').click()
                assert slots(page) == before
                upload(page, payload)
                page.wait_for_function('!document.querySelector("#save-confirm").disabled')
                page.locator('#save-confirm').click()
                page.wait_for_function('!document.querySelector("#save-dialog").open')
                assert snapshot(page)['battle'] == pending
                page.locator('#wait').click()
                page.wait_for_function('!window.foldwildSnapshot.busy')
                saved(page)
                assert snapshot(page)['battle'] == next_battle
                # Backup is the real earlier pending command, explicitly previewed and restored.
                backup = slots(page)[1]
                page.locator('#save-backup').click()
                page.wait_for_function('!document.querySelector("#save-confirm").disabled')
                assert snapshot(page)['battle'] == next_battle
                page.locator('#save-confirm').click()
                page.wait_for_function('!document.querySelector("#save-dialog").open')
                assert snapshot(page)['battle'] == json.loads(backup)['pendingBattle']
                print('PASS ordinary pending battle: real Blob JSON export, import cancel/confirm, exact next-command replay, explicit backup recovery', flush=True)

                before = slots(page)
                for label, data, reason in [('corrupt', b'{bad', 'Could not read'),
                    ('oversized', b' ' * (256 * 1024 + 1), 'maximum file size'),
                    ('unsupported', b'{"version":99}', 'Unsupported save version')]:
                    upload(page, data)
                    page.wait_for_function('(s)=>document.querySelector("#save-state").textContent.includes(s)', arg=reason)
                    assert slots(page) == before
                    assert not page.locator('#save-dialog').is_visible()
                    print(f'PASS negative file fixture: {label}, both slots untouched', flush=True)
                # A valid preview is not authority to overwrite a subsequently changed primary.
                upload(page, payload)
                page.wait_for_function('!document.querySelector("#save-confirm").disabled')
                peer = page_for(context)
                peer.locator('#continue').click()
                ready(peer, 'battle')
                peer.locator('#wait').click()
                peer.wait_for_function('!window.foldwildSnapshot.busy')
                saved(peer)
                changed = slots(peer)
                page.locator('#save-confirm').click()
                page.wait_for_function('document.querySelector("#save-dialog-status").textContent.includes("conflict")')
                assert slots(page) == changed
                page.locator('#save-cancel').click()
                peer.close()
                print('PASS ordinary replacement race: consent bound to exact previewed primary', flush=True)
                context.close()

                # Negative platform fixtures, separately labeled; never progression acceptance.
                fallback = browser.new_context()
                fallback.add_init_script('''const get=HTMLCanvasElement.prototype.getContext;
                    HTMLCanvasElement.prototype.getContext=function(type,...args){
                    return /webgl/.test(type)?null:get.call(this,type,...args);};
                    Object.defineProperty(navigator,'locks',{value:undefined});''')
                p = page_for(fallback, negative=True)
                p.locator('#start').click()
                saved(p)
                assert snapshot(p)['view'] is None
                assert 'without 3D' in p.locator('#render-state').inner_text()
                assert p.locator('#render-state').is_visible()
                tools(p)
                assert 'not atomic' in p.locator('#save-coordination').inner_text()
                walk(p, 'camp', -4, 18)
                p.locator('#rest').click()
                saved(p)
                assert 'without 3D' in p.locator('#render-state').inner_text()
                old = slots(p)
                p.evaluate('() => { Storage.prototype.setItem=function(){throw new DOMException("quota fixture","QuotaExceededError")}; }')
                p.locator('#quality').select_option('standard')
                p.wait_for_function('document.querySelector("#save-state").textContent.includes("quota fixture")')
                assert slots(p) == old
                print('PASS negative platform fixtures: initial WebGL denial live text controls, no-lock disclosure, quota-before-write both slots intact', flush=True)
                fallback.close()

                quota = browser.new_context()
                p = page_for(quota)
                p.locator('#start').click()
                ready(p, 'world')
                saved(p)
                old = slots(p)
                p.evaluate('''() => { const set=Storage.prototype.setItem; Storage.prototype.setItem=function(key,value){
                    if(key==='foldwild-save-v1') throw new DOMException('primary quota fixture','QuotaExceededError');
                    return set.call(this,key,value); }; }''')
                p.locator('#quality').select_option('standard')
                p.wait_for_function('document.querySelector("#save-state").textContent.includes("primary quota fixture")')
                assert slots(p) == [old[0], old[0]]
                assert 'may already have rotated' in p.locator('#save-state').inner_text()
                quota.close()
                print('KNOWN NEGATIVE CEILING: primary-only quota preserves primary but backup rotation is not transactional', flush=True)

                corrupt = browser.new_context()
                corrupt.add_init_script('localStorage.setItem("foldwild-save-v1", "{broken")')
                p = page_for(corrupt)
                p.locator('#start').click()
                p.wait_for_function('!document.querySelector("#reset-confirm").disabled')
                assert p.locator('#reset-primary-bytes').input_value() == '{broken'
                p.locator('#reset-cancel').click()
                assert slots(p) == ['{broken', None]
                p.locator('#start').click()
                p.wait_for_function('!document.querySelector("#reset-confirm").disabled')
                p.locator('#reset-confirm').click()
                saved(p)
                assert slots(p)[1] == '{broken'
                corrupt.close()
                print('PASS negative corrupt slot: cancel preserves bytes; explicit consent backs up exact corrupt bytes', flush=True)

                denied = browser.new_context()
                denied.add_init_script('Storage.prototype.getItem=function(){throw new DOMException("denied fixture","SecurityError")}')
                p = page_for(denied, negative=True)
                assert 'denied fixture' in p.locator('#save-state').inner_text()
                p.locator('#start').click()
                p.wait_for_function('document.querySelector("#reset-preview").textContent.includes("Replacement disabled")')
                assert p.locator('#reset-confirm').is_disabled()
                denied.close()
                print('PASS negative denied read: unknown raw never treated as absent or granted overwrite', flush=True)
                assert not errors and not external, (errors, external)
                assert hashes == source_hashes(), 'source changed during focused proof'
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        print('CLEANUP: browser closed; loopback 8823 stopped', flush=True)
    print('PASS focused save UX; original full M2, hardware and release gates remain held', flush=True)


if __name__ == '__main__':
    run()

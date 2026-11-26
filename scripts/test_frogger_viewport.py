#!/usr/bin/env python3
"""Verify Frogger's complete board and visible frog after keyboard and touch hops."""
import argparse
import functools
import json
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright
from playtest_arcade_fleet import LocalFiles, ROOT, SPRITE_PROBES


def check(browser, origin, width, height, touch, output):
    with browser.new_context(viewport={'width':width,'height':height},has_touch=touch) as context:
        page = context.new_page()
        errors = []
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.goto(f'{origin}/Games/Frogger/index.html')
        center = SPRITE_PROBES['Frogger']
        page.wait_for_function(f'()=>({center}) !== null')
        board = page.locator('#game')
        dimensions = board.evaluate('(canvas)=>[canvas.width,canvas.height]')
        assert dimensions == [320,480], dimensions
        box = board.bounding_box()
        bottom = box['y'] + box['height']
        assert 0 <= box['x'] and box['x'] + box['width'] <= width + 1
        assert box['y'] >= page.locator('#hud').bounding_box()['height'] - 1
        assert bottom <= height + 1
        assert abs(box['width']/box['height'] - 2/3) < .005, box
        assert page.locator('#direction-pad').is_visible() == touch
        before = page.evaluate(center)
        if output:
            page.screenshot(path=str(output/f'{width}-before.png'))
        if touch:
            pad = page.get_by_role('button',name='Hop right')
            layout = pad.bounding_box()
            assert layout['y'] >= bottom - 1 and layout['y'] + layout['height'] <= height + 1
            pad.tap()
        else:
            page.keyboard.down('ArrowRight')
            page.wait_for_timeout(110)
            page.keyboard.up('ArrowRight')
        page.wait_for_function(f'(start)=>({center}) >= start+44',arg=before,timeout=5000)
        after = page.evaluate(center)
        assert not errors, errors
        if output:
            page.screenshot(path=str(output/f'{width}-after.png'))
        return dict(viewport=[width,height],input='touch tap' if touch else 'ArrowRight',
                    buffer=dimensions,visibleBox=box,frogX=[before,after])


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--output',type=Path,help='Optional new evidence directory outside the checkout')
    config = cli.parse_args()
    output = config.output.resolve() if config.output else None
    if output:
        if output==ROOT or ROOT in output.parents:
            cli.error('Choose an external evidence directory.')
        output.mkdir(parents=True,exist_ok=False)
    server = ThreadingHTTPServer(('127.0.0.1',0),functools.partial(LocalFiles,directory=ROOT))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            try:
                rows = [check(browser,f'http://127.0.0.1:{server.server_port}',w,h,t,output)
                        for w,h,t in ((850,590,False),(390,844,True),(640,360,True))]
                receipt = json.dumps(rows,indent=2)
                if output:
                    (output/'results.json').write_text(receipt+'\n')
                print(receipt)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__=='__main__':
    main()

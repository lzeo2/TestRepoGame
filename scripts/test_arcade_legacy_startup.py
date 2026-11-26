#!/usr/bin/env python3
"""Exercise the repaired entry paths using ordinary browser input, with networking limited to the local server."""
import argparse
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

from test_portal_refurbishment import QuietHandler, ROOT


def mine(page):
    for button in ('start-playing', 'second-part-button', 'third-part-button', 'last-part-button'):
        page.locator('#' + button).click(timeout=65000)
    page.locator('#introscreen').wait_for(state='hidden')
    counter = page.locator('#mined strong')
    assert counter.inner_text() == '0'
    page.locator('#miner').click()
    page.wait_for_function('document.querySelector("#mined strong").textContent.trim()==="1"')
    assert page.locator('#music, #sounds, #sounds2').count() == 0


def explore(page):
    page.wait_for_function('Boolean(window.dataGambar?.cover?.complete)')
    page.keyboard.down('Space')
    try:
        page.wait_for_function('window.mapID === 1 && Boolean(window.karakter?.img)')
    finally:
        page.keyboard.up('Space')
    assert page.locator('script[src="flashRPG.js"]').count() == 0


def fly(page):
    scene = "window.game?.scene.getScene('GamePlay')"
    page.wait_for_function(
        f"{scene}?.touchToPlay?.visible && {scene}.touchToPlay.alpha > 0.5", timeout=180000)
    canvas = page.locator('canvas').first
    canvas.click()
    page.wait_for_function(
        f"Number({scene}?.activeScore?.map(digit => digit.text).join('')) > 3", timeout=150000)
    initial_height = page.evaluate(f"{scene}.player.y")
    point = canvas.bounding_box()
    page.mouse.move(point['x'] + point['width'] / 2, point['y'] + point['height'] / 2)
    page.mouse.down()
    try:
        page.wait_for_function(f"(start) => {scene}.player.y < start - 5", arg=initial_height, timeout=30000)
    finally:
        page.mouse.up()
    if page.evaluate('Boolean(window.JJ_HACK?.invincible)'):
        assert page.evaluate(f"{scene}.player.invulnerable && {scene}.player.body.enable")
    assert page.locator('#gamedistribution-jssdk').count() == 1
    assert page.locator('#gamedistribution-jssdk').get_attribute('src') is None


GAMES = {
    'DogeMiner': mine,
    'StrandedInIsekai': explore,
    'JetpackJoyride': fly,
    'JetpackJoyrideHacked': fly,
}


def run(browser, origin, game):
    with browser.new_context(viewport={'width': 960, 'height': 660}) as context:
        page = context.new_page()
        errors, missing, external = [], [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: missing.append(response.url) if response.status >= 400 else None)

        def route(handle):
            url = handle.request.url
            if url.startswith((origin + '/', 'blob:', 'data:')):
                handle.continue_()
            else:
                external.append(url)
                handle.abort()

        context.route('**/*', route)
        page.goto(f'{origin}/Games/{game}/index.html', wait_until='domcontentloaded')
        GAMES[game](page)
        # A deferred callback used to throw after the mining tutorial had closed.
        page.wait_for_timeout(1500)
        assert not (errors or missing or external), (game, errors, missing, external)
        print(f'PASS {game}: input, local requests and page errors', flush=True)


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--game', action='append', choices=GAMES, help='Repeat to run selected titles')
    args = cli.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as playwright:
            chromium = Path('/usr/bin/chromium')
            browser = playwright.chromium.launch(executable_path=str(chromium) if chromium.exists() else None,
                                                 headless=True, args=['--no-sandbox', '--disable-dev-shm-usage',
                                                                      '--enable-unsafe-swiftshader'])
            try:
                for game in args.game or GAMES:
                    run(browser, f'http://127.0.0.1:{server.server_port}', game)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()

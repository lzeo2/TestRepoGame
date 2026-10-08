#!/usr/bin/env python3
"""Async native regression against Main's existing localhost:8899 server.

Run only while Main owns the serialized browser lease:
python3 -B scripts/test_circuit_context_loss.py
"""
import asyncio
import json

from playwright.async_api import async_playwright

URL = 'http://127.0.0.1:8899/Games/Circuit%20Ward/index.html'


async def snapshot(page):
    return await page.evaluate("""async () => {
        const game = await import('./script.js');
        return {run: game.inspect(), frames: game.stats().frames};
    }""")


async def load(page):
    await asyncio.wait_for(page.goto(URL, wait_until='domcontentloaded'), timeout=15)
    await page.evaluate("async () => { window.circuitQa = await import('./script.js'); }")
    await page.wait_for_function('window.circuitQa.stats().frames > 0')


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path='/usr/bin/chromium', headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
                  '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        try:
            page = await browser.new_page(viewport={'width': 960, 'height': 640})
            page.set_default_timeout(10000)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            await load(page)
            await page.locator('#startSolo').click()
            await page.wait_for_function("window.circuitQa.inspect().phase === 'playing'")
            await page.locator('#arena').click(position={'x': 480, 'y': 320})
            before = await snapshot(page)
            for key in ('w', 'l', 'Space'):
                await page.keyboard.down(key)
            await asyncio.sleep(10)
            for key in ('w', 'l', 'Space'):
                await page.keyboard.up(key)
            played = await snapshot(page)
            player = played['run']['players'][0]
            assert played['run']['time'] > before['run']['time'], 'normal simulation stopped'
            assert played['frames'] > before['frames'], 'normal renderer stopped'
            assert abs(player['z'] - before['run']['players'][0]['z']) > .1, 'W did not move'
            assert player['shot'] > before['run']['players'][0]['shot'], 'Space did not fire'
            if played['run']['phase'] == 'playing':
                await page.keyboard.press('p')
            await page.locator('#retryBtn').click()
            await page.wait_for_function("epoch => window.circuitQa.inspect().epoch > epoch && window.circuitQa.inspect().phase === 'playing'", arg=played['run']['epoch'])
            assert (await snapshot(page))['run']['wave'] == 1, 'retry did not reset'

            await page.evaluate("""() => {
                const canvas = document.querySelector('#arena');
                const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                const extension = gl.getExtension('WEBGL_lose_context');
                if (!extension) throw Error('WEBGL_lose_context unavailable');
                extension.loseContext();
            }""")
            reload_button = page.locator('#reloadBtn')
            await reload_button.wait_for(state='visible')
            lost = await snapshot(page)
            await asyncio.sleep(.5)
            assert await snapshot(page) == lost, 'dead renderer advanced simulation/frames'
            await page.locator('#menuBtn').click()
            menu = await snapshot(page)
            for button in ('startSolo', 'hostRoom', 'joinRoom'):
                await page.locator('#' + button).click()
                await asyncio.sleep(.2)
                assert await snapshot(page) == menu, button + ' bypassed loss guard'
                assert await page.locator('#menu').is_visible(), 'loss entered a lobby/run'
                message = (await page.locator('#status').inner_text()).lower()
                assert 'lost' in message and 'reload' in message, 'recovery message was cleared'
                assert await reload_button.is_visible(), 'reload action was hidden'
            assert menu['run']['phase'] == 'lobby' and menu['run']['time'] == 0
            bounds = await reload_button.bounding_box()
            assert bounds and bounds['width'] >= 44 and bounds['height'] >= 44
            await page.keyboard.press('Tab')
            await reload_button.focus()
            assert await reload_button.evaluate("button => button.matches(':focus-visible') && getComputedStyle(button).outlineStyle !== 'none'"), 'reload focus missing'
            async with page.expect_navigation(wait_until='domcontentloaded'):
                await reload_button.click()
            await page.evaluate("async () => { window.circuitQa = await import('./script.js'); }")
            await page.wait_for_function('window.circuitQa.stats().frames > 0')
            assert not await reload_button.is_visible(), 'reload did not create a fresh renderer'
            assert not errors, errors
            print('PASS: normal input 10s/retry, forced loss freeze, Menu/start/host/join blocked, message/44px focus/reload')
            print(json.dumps({'beforeLoss': played, 'lost': lost, 'menu': menu}, sort_keys=True))
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(asyncio.wait_for(main(), timeout=90))

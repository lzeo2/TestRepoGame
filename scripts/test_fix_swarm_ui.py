#!/usr/bin/env python3
"""Serial, ordinary-input checks for the October HUD/layout fixes. Not a release gate.
Requires the existing localhost:8899 static server and installed Playwright/Chromium.
"""
import asyncio
import json
import math
import shutil
import tempfile
from pathlib import Path
from time import monotonic

from playwright.async_api import async_playwright

ORIGIN = 'http://localhost:8899'
OUT = Path(tempfile.gettempdir()) / 'fix-swarm-shots'


async def goto(page, path):
    await asyncio.wait_for(page.goto(ORIGIN + path, wait_until='domcontentloaded'), 15)


async def shot(page, name):
    await page.screenshot(path=str(OUT / (name + '.png')))


async def geometry(game):
    return await game.evaluate("""() => {
        const bounds = e => {const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
        return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
            frame:bounds(document.querySelector('.play-layout')),canvas:bounds(document.querySelector('#game-canvas')),
            controls:bounds(document.querySelector('.trail-controls'))};
    }""")


async def check_frame(game):
    g = await geometry(game)
    assert g['scrollWidth'] <= g['width'], g
    assert g['frame']['bottom'] <= g['height'] and g['frame']['y'] >= 0, g
    for name in ('canvas', 'controls'):
        r = g[name]
        assert r['width'] > 0 and r['height'] > 0, g
        assert r['x'] >= g['frame']['x'] and r['right'] <= g['frame']['right'], g
        assert r['y'] >= g['frame']['y'] and r['bottom'] <= g['frame']['bottom'], g
    assert await game.locator('.play-layout button').evaluate_all("""bs=>bs.every(b=>{
        const r=b.getBoundingClientRect();return !r.width || !r.height || (r.width>=44 && r.height>=44);
    })"""), 'small touch target'
    return g


async def walk_to(game, keyboard, x, z):
    # Ordinary key presses through the existing authored lanes, never a state setter.
    deadline = monotonic() + 35
    await game.locator('#game-canvas').focus()
    while monotonic() < deadline:
        s = await game.evaluate('foldwildSnapshot')
        pos, yaw = s['state']['position'], s['view']['cameraYaw']
        dx, dz = x - pos['x'], z - pos['z']
        if math.hypot(dx, dz) < .5:
            return
        horizontal = dx * math.cos(yaw) - dz * math.sin(yaw)
        vertical = dz * math.cos(yaw) + dx * math.sin(yaw)
        key = ('d' if horizontal > 0 else 'a') if abs(horizontal) > abs(vertical) else ('s' if vertical > 0 else 'w')
        await keyboard.down(key)
        await asyncio.sleep(min(.4, max(.06, math.hypot(dx, dz) / 4)))
        await keyboard.up(key)
    raise AssertionError('ordinary walking did not reach wild marker')


async def slipstream(browser, results):
    for width, height in ((1280, 800), (390, 844)):
        context = await browser.new_context(viewport={'width': width, 'height': height})
        page = await context.new_page()
        attach(page)
        try:
            await goto(page, '/Games/Slipstream%20Borough/index.html')
            await page.wait_for_function('slipstreamSnapshot.view?.frames > 1')
            await page.locator('#garage details').last.locator('summary').click()
            await page.locator('#reset').click()
            await page.locator('#confirmReset').click()
            for theme in ('light', 'dark'):
                if theme == 'dark':
                    await page.locator('#theme').click()
                g = await page.evaluate("""()=>{
                    const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {y:r.y,bottom:r.bottom}};
                    return {io:rect('io'),garage:rect('garage'),start:rect('start'),overflow:document.documentElement.scrollWidth>innerWidth};
                }""")
                assert g['io']['bottom'] + 10 <= g['garage']['y'], g
                assert g['start']['y'] >= g['garage']['y'] and g['start']['bottom'] <= height and not g['overflow'], g
                await shot(page, f'slipstream-after-reset-{width}-{theme}')
                results[f'slipstream-{width}-{theme}'] = g
            if width == 1280:
                await page.locator('#start').click()
                await page.locator('#closeHelp').click()
                await page.wait_for_function('!document.querySelector("#helpDialog").open && !slipstreamSnapshot.paused')
                await page.locator('#viewport').focus()
                await page.keyboard.down('w')
                await asyncio.sleep(10)
                await page.keyboard.up('w')
                s = await page.evaluate('slipstreamSnapshot')
                assert s['run']['distance'] > 1, s['run']
                await page.locator('#leave').click()
                await page.locator('#start').click()
                await page.wait_for_function('slipstreamSnapshot.phase === "run" && slipstreamSnapshot.run.distance < 1')
                results['slipstream-input-restart'] = {'distance': s['run']['distance'], 'restart': True}
        finally:
            await context.close()


ERRORS = []


def attach(page):
    page.set_default_timeout(15000)
    page.on('pageerror', lambda e: ERRORS.append(str(e)))
    page.on('console', lambda m: ERRORS.append(m.text) if m.type == 'error' else None)
    page.on('requestfailed', lambda r: ERRORS.append(r.url + ': ' + str(r.failure)))
    page.on('response', lambda r: ERRORS.append(f'HTTP {r.status}: {r.url}') if r.status >= 400 else None)
    page.on('request', lambda r: ERRORS.append('External: ' + r.url)
            if r.url.startswith(('http:', 'https:')) and not r.url.startswith(ORIGIN + '/') else None)


async def foldwild(browser, results, width, fullscreen):
    height = 800 if width == 1280 else 844
    context = await browser.new_context(viewport={'width': width, 'height': height}, has_touch=width == 390,
                                        reduced_motion='reduce')
    page = await context.new_page()
    attach(page)
    name = f'foldwild-{width}-' + ('fullscreen' if fullscreen else 'windowed')
    try:
        if fullscreen:
            await goto(page, '/index.html')
            await page.locator('.search-bar__input').fill('Foldwild')
            card = page.locator('.game-card').filter(has=page.get_by_text('Foldwild: Open-World RPG (Preview)', exact=True))
            await card.locator('.game-card__play').click()
            await page.wait_for_function('document.fullscreenElement?.classList.contains("ux-player__frame")')
            handle = await page.locator('.ux-player__frame').element_handle()
            game = await handle.content_frame()
        else:
            await goto(page, '/Games/Foldwild/index.html')
            game = page
        await game.locator('[data-starter="dewgob"]').click()
        await game.locator('#seed-input').fill('1')
        assert ';' not in await game.locator('#starter-description').inner_text()
        await game.locator('#start').click()
        await game.wait_for_function('foldwildSnapshot.phase === "world" && foldwildSnapshot.view?.countLoadedModels >= 1 && foldwildSnapshot.view.frames > 2')
        assert await game.evaluate('foldwildSnapshot.state.reducedMotion')
        results[name] = {'world': await check_frame(game)}
        await shot(page, name + '-world')
        before = await game.evaluate('foldwildSnapshot.state.position')
        if width == 390:
            control = game.locator('[data-move="w"]')
            await control.scroll_into_view_if_needed()
            box = await control.bounding_box()
            cdp = await context.new_cdp_session(page)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': box['x'] + box['width']/2, 'y': box['y'] + box['height']/2}]})
            await asyncio.sleep(10)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        else:
            await game.locator('#game-canvas').focus()
            await page.keyboard.down('w')
            await asyncio.sleep(10)
            await page.keyboard.up('w')
        after = await game.evaluate('foldwildSnapshot.state.position')
        assert math.hypot(after['x']-before['x'], after['z']-before['z']) > .1, (before, after)
        await page.keyboard.press('Tab')
        await game.locator('#pause').focus()
        assert await game.locator('#pause').evaluate("b => getComputedStyle(b).outlineStyle !== 'none'"), 'focus outline missing'
        await game.locator('#pause').click()
        assert await game.evaluate('foldwildSnapshot.paused')
        await game.locator('#pause').click()
        await game.locator('#collection-btn').click()
        await game.locator('[data-inspect]').first.click()
        await game.wait_for_function('foldwildSnapshot.view.mode === "inspection" && foldwildSnapshot.view.countLoadedModels === 1')
        await shot(page, name + '-ledger')
        await game.locator('#collection-close').click()
        await game.wait_for_function('foldwildSnapshot.view.mode === "world" && !document.querySelector("#collection-dialog").open')
        await check_frame(game)
        await walk_to(game, page.keyboard, -10, 4)
        await game.locator('#interact').click()
        prompt = await game.locator('#dialogue-text').inner_text()
        assert ';' not in prompt and 'A missed kite costs your turn.' in prompt, prompt
        await shot(page, name + '-prompt')
        await game.locator('#dialogue-start').click()
        await game.wait_for_function('foldwildSnapshot.phase === "battle" && foldwildSnapshot.view.countLoadedModels >= 2')
        results[name]['battle'] = await check_frame(game)
        results[name]['prompt'] = prompt
        await game.locator('#ability-0').scroll_into_view_if_needed()
        await shot(page, name + '-battle')
        if width == 390:
            await game.locator('#wait').scroll_into_view_if_needed()
            await shot(page, name + '-battle-actions')
        round_before = await game.evaluate('foldwildSnapshot.battle.round')
        await game.locator('#ability-0').click()
        await game.wait_for_function('r => !foldwildSnapshot.busy && foldwildSnapshot.battle.round > r', arg=round_before)
        await game.locator('#flee').click()
        await game.wait_for_function('foldwildSnapshot.phase === "result" && !foldwildSnapshot.busy')
        await game.locator('#result-continue').click()
        await game.wait_for_function('foldwildSnapshot.phase === "world"')
        await game.locator('.expedition-options summary').click()
        await game.locator('#new-run').click()
        await game.locator('#reset-confirm').click()
        await game.wait_for_function('foldwildSnapshot.phase === "menu"')
        await game.locator('#start').click()
        await game.wait_for_function('foldwildSnapshot.phase === "world"')
        assert await game.evaluate('foldwildSnapshot.state.encounterIndex === 0 && foldwildSnapshot.state.roster.length === 1')
        results[name].update(input10s=True, turn=True, restart=True, ledgerSingleClose=True)
    except Exception:
        await shot(page, 'ui-failure')
        raise
    finally:
        await context.close()


async def main():
    assert shutil.disk_usage('.').free >= 2_000_000_000, 'disk below 2GB'
    OUT.mkdir(exist_ok=True)
    results = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        try:
            await slipstream(browser, results)
            for fullscreen in (False, True):
                for width in (1280, 390):
                    await foldwild(browser, results, width, fullscreen)
            assert not ERRORS, ERRORS
            print('PASS: Slipstream reset gap/both themes/input/restart; Foldwild bounded HUD at 1280/390, windowed/fullscreen, keyboard/touch10s, ledger, wild turn, restart')
        finally:
            (OUT / 'ui-results.json').write_text(json.dumps({'results': results, 'errors': ERRORS}, indent=2))
            await browser.close()


if __name__ == '__main__':
    asyncio.run(asyncio.wait_for(main(), 360))

#!/usr/bin/env python3
"""Small browser check for the portal polish pass."""
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOT_DIR = Path('/tmp/review-swarm-shots')


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def wait_for_portal(page, expected):
    page.wait_for_function(
        """expected => document.querySelectorAll('.game-card').length === expected""",
        arg=expected,
    )
    page.locator('img').evaluate_all("images => images.forEach(image => image.loading = 'eager')")
    page.wait_for_function(
        """() => Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)"""
    )
    page.wait_for_selector('.ux-tag-filter__pill[data-tag="2p"]')
    page.evaluate('() => document.fonts.ready')


def visible_count(page):
    return page.locator('.game-card:not([data-ux-tag-hidden]):not([data-ux-fav-hidden]):not([data-ux-search-hidden]):not([data-ux-cat-hidden])').count()


def assert_no_overflow(page):
    assert page.evaluate(
        """() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 &&
                  document.body.scrollWidth <= document.body.clientWidth + 1"""
    ), page.evaluate("() => [document.documentElement.scrollWidth, document.documentElement.clientWidth, document.body.scrollWidth, document.body.clientWidth]")


def check_mobile_cards(page, width):
    assert_no_overflow(page)
    assert page.locator('.game-card').evaluate_all("""cards => cards.every(card => {
        if (!card.getBoundingClientRect().height) return true;
        const title = card.querySelector('.game-card__title');
        const thumb = card.querySelector('.game-card__thumb').getBoundingClientRect();
        const body = card.querySelector('.game-card__body').getBoundingClientRect();
        const t = title.getBoundingClientRect();
        const style = getComputedStyle(title);
        const badge = [...card.querySelectorAll('.game-card__category, .game-card__tag')]
            .filter(el => el.getBoundingClientRect().height > 0);
        return getComputedStyle(card).display === 'grid' && thumb.right <= body.left + 1 &&
            style.webkitLineClamp === '2' && style.whiteSpace === 'normal' &&
            t.height <= parseFloat(style.lineHeight) * 2 + 1 && badge.length <= 1 &&
            badge.every(el => { const b = el.getBoundingClientRect();
                return b.left >= thumb.left && b.right <= thumb.right && b.top >= thumb.top && b.bottom <= thumb.bottom;
            });
    })""")
    assert page.locator('.game-card__fav, .game-card__info, .theme-toggle, .category-filter__btn, .ux-tag-filter__pill, .game-card__tag, .game-card__play').evaluate_all("""controls => controls.every(control => {
        const box = control.getBoundingClientRect();
        if (!box.height) return true;
        return box.width >= 44 && box.height >= 44 && getComputedStyle(control).flexShrink === '0';
    })""")
    assert page.locator('.game-card__header').evaluate_all("""headers => headers.every(header => {
        if (!header.getBoundingClientRect().height) return true;
        const box = header.getBoundingClientRect();
        return [...header.querySelectorAll('button, .game-card__category')].every(child => {
            const c = child.getBoundingClientRect();
            return c.left >= box.left - 1 && c.right <= box.right + 1;
        });
    })""")


def check_shelf_design(page):
    for selector, radius in (
        ('.game-card, .search-bar, .ux-sort__select, .theme-toggle', 6),
        ('.category-filter__btn, .ux-tag-filter__pill, .game-card__category, .game-card__tag, .game-card__play, .game-card__fav, .game-card__info, .random-game-btn, .proxy-launcher__btn', 4),
    ):
        assert page.locator(selector).evaluate_all("""(els, radius) => els.every(el => {
            const style = getComputedStyle(el);
            return ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius']
                .every(corner => style[corner] === radius + 'px');
        })""", radius), selector
    assert page.evaluate("() => [...document.fonts].length === 3 && [...document.fonts].every(f => f.status === 'loaded')")
    assert page.locator('.theme-toggle').evaluate("el => el.parentElement.classList.contains('app__header') && getComputedStyle(el).position === 'static'")
    assert page.locator('.random-game-btn, .proxy-launcher').evaluate_all("els => els.every(el => el.parentElement.classList.contains('app__footer') && getComputedStyle(el).position === 'static')")
    assert page.locator('.game-card__icon:not(:has(img))').evaluate_all("els => els.every(el => el.dataset.initial === el.closest('.game-card').dataset.title.charAt(0).toUpperCase() && getComputedStyle(el, '::after').content !== 'none' && [...el.querySelectorAll('svg')].every(svg => getComputedStyle(svg).display === 'none'))")
    assert page.locator('.game-card__info').evaluate_all("els => els.every(el => el.parentElement.classList.contains('game-card__actions'))")
    # Actual theme tokens, including small body labels, must meet WCAG AA.
    ratios = page.evaluate(r"""() => {
        const lum = color => {
            const rgb = color.match(/[0-9.]+/g).slice(0, 3).map(Number).map(n => n / 255)
                .map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
            return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
        };
        const probe = document.createElement('span'); document.body.appendChild(probe);
        const css = getComputedStyle(document.documentElement);
        const colors = ['--text', '--text-muted', '--bg', '--bg-card'].map(token => {
            probe.style.color = css.getPropertyValue(token); return lum(getComputedStyle(probe).color);
        }); probe.remove();
        const contrast = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        const active = [...document.querySelectorAll('.category-filter__btn[aria-pressed="true"], .ux-tag-filter__pill[aria-pressed="true"]')]
            .map(el => { const s = getComputedStyle(el); return contrast(lum(s.color), lum(s.backgroundColor)); });
        return colors.slice(0, 2).flatMap(text => colors.slice(2).map(bg => contrast(text, bg))).concat(active);
    }""")
    assert min(ratios) >= 4.5, ratios


def check_category_counts(page, games):
    assert page.evaluate("() => !!(document.querySelector('.ux-sort').compareDocumentPosition(document.querySelector('.ux-tag-filter')) & Node.DOCUMENT_POSITION_FOLLOWING)")
    expected = {'all': len(games)}
    for game in games:
        expected[game['cat']] = expected.get(game['cat'], 0) + 1
    actual = page.locator('.category-filter__btn').evaluate_all("""buttons => Object.fromEntries(buttons.map(button => {
        const count = button.querySelector('.category-filter__count');
        return [button.dataset.catId, count ? Number(count.textContent) : null];
    }))""")
    assert actual == expected, (actual, expected)


def main():
    games = json.loads((ROOT / 'games.json').read_text())
    normalized = []
    for game in games:
        tags = []
        for tag in game.get('tags', []):
            tag = {'2-player': '2p', 'co-op': 'coop'}.get(tag, tag)
            if tag not in tags:
                tags.append(tag)
        normalized.append({**game, 'tags': tags})
    expected_2p = sum('2p' in g['tags'] for g in normalized)
    expected_coop = sum('coop' in g['tags'] for g in normalized)
    expected_both = sum({'2p', 'coop'} <= set(g['tags']) for g in normalized)

    SHOT_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-dev-shm-usage'])
            context = browser.new_context(viewport={'width': 1280, 'height': 900}, color_scheme='light')
            context.add_init_script("if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'light')")
            page = context.new_page()
            page.goto(f'http://127.0.0.1:{server.server_port}/index.html', wait_until='networkidle')
            wait_for_portal(page, len(games))
            # Reproduce an early/recreated chip retaining a stale rendered count.
            page.evaluate("""() => {
                const action = document.querySelector('.category-filter__btn[data-cat-id="action"]');
                action.removeAttribute('data-cat-id');
                action.querySelector('.category-filter__count').textContent = '0';
                const empty = document.createElement('button');
                empty.className = 'category-filter__btn';
                empty.dataset.catId = 'empty';
                empty.textContent = 'Empty';
                document.querySelector('.category-filter').appendChild(empty);
            }""")
            page.wait_for_function("""() => {
                const action = document.querySelector('.category-filter__btn[data-cat-id="action"]');
                const empty = document.querySelector('.category-filter__btn[data-cat-id="empty"]');
                return action && Number(action.querySelector('.category-filter__count')?.textContent) > 0 &&
                    empty && !empty.querySelector('.category-filter__count');
            }""")
            page.locator('.category-filter__btn[data-cat-id="empty"]').evaluate('el => el.remove()')
            check_category_counts(page, games)
            assert page.locator('.game-card__play').count() == len(games)
            assert page.locator('.game-card__play').evaluate_all("els => els.every(el => !el.disabled && el.textContent.includes('Play'))")
            assert page.locator('.ux-tag-filter__pill').count() <= 4
            assert set(page.locator('.ux-tag-filter__pill').evaluate_all("els => els.map(el => el.dataset.tag || el.textContent)")) >= {'Favorites'}
            assert set(page.locator('.ux-tag-filter__pill[data-tag]').evaluate_all("els => els.map(el => el.dataset.tag)")) <= {'2p', 'coop', 'hacked'}
            assert page.locator('.ux-tag-filter__pill[data-tag="2p"]').text_content() == '2 players'
            assert page.locator('.game-card[data-tags*="2p"]').count() == expected_2p
            assert '2p' in page.locator('.game-card[data-title="Fireboy and Watergirl Hacked (Light Temple)"]').get_attribute('data-tags')
            assert 'coop' in page.locator('.game-card[data-title="Fireboy and Watergirl Hacked (Light Temple)"]').get_attribute('data-tags')
            assert page.locator('.ux-net-banner__msg').text_content() == 'Connection lost. Loaded games may still work.'
            assert_no_overflow(page)
            page.locator('.category-filter__btn[data-cat-id="all"]').hover()
            check_shelf_design(page)
            page.locator('.game-card').first.focus()
            page.keyboard.press('ArrowRight')
            assert page.evaluate("document.activeElement.dataset.title") == 'Run 3'
            assert page.locator('html').get_attribute('data-theme') == 'light'
            page.screenshot(path=str(SHOT_DIR / 'after-portal-light.png'), full_page=True)

            page.locator('.theme-toggle').click()
            page.wait_for_function("document.documentElement.dataset.theme === 'dark'")
            page.reload(wait_until='networkidle')
            wait_for_portal(page, len(games))
            assert page.locator('html').get_attribute('data-theme') == 'dark'
            assert_no_overflow(page)
            page.locator('.category-filter__btn[data-cat-id="all"]').hover()
            check_shelf_design(page)
            page.screenshot(path=str(SHOT_DIR / 'after-portal-dark.png'), full_page=True)

            two_p = page.locator('.ux-tag-filter__pill[data-tag="2p"]')
            coop = page.locator('.ux-tag-filter__pill[data-tag="coop"]')
            two_p.click()
            page.wait_for_function("expected => document.querySelectorAll('.game-card:not([data-ux-tag-hidden])').length === expected", arg=expected_2p)
            assert visible_count(page) == expected_2p
            coop.click()
            page.wait_for_function("expected => document.querySelectorAll('.game-card:not([data-ux-tag-hidden])').length === expected", arg=expected_both)
            assert visible_count(page) == expected_both
            two_p.click()
            page.wait_for_function("expected => document.querySelectorAll('.game-card:not([data-ux-tag-hidden])').length === expected", arg=expected_coop)
            assert visible_count(page) == expected_coop
            coop.click()

            for width in (390, 320):
                page.set_viewport_size({'width': width, 'height': 844})
                for theme in ('light', 'dark'):
                    page.evaluate("theme => localStorage.setItem('theme', theme)", theme)
                    page.reload(wait_until='networkidle')
                    wait_for_portal(page, len(games))
                    assert page.locator('html').get_attribute('data-theme') == theme
                    check_mobile_cards(page, width)
                    check_shelf_design(page)
                    check_category_counts(page, games)
                    assert page.locator('.category-filter').evaluate("""nav => {
                        const box = nav.getBoundingClientRect();
                        return nav.scrollWidth > nav.clientWidth && getComputedStyle(nav).scrollbarWidth === 'thin' &&
                            [...nav.children].some(chip => {
                                const c = chip.getBoundingClientRect();
                                return c.left < box.right && c.right > box.right;
                            });
                    }""")
                    page.evaluate("window.scrollTo({top: 0, left: 0, behavior: 'instant'})")
                    assert page.locator('.app__header').evaluate('el => el.getBoundingClientRect().top') >= 0
                    page.screenshot(path=str(SHOT_DIR / f'mobile-{width}-{theme}.png'))
                    page.locator('.ux-tag-filter__pill[data-tag="hacked"]').click()
                    page.wait_for_timeout(300)
                    check_mobile_cards(page, width)
                    check_category_counts(page, games)
                    long_card = page.locator('.game-card[data-title="Fireboy and Watergirl Hacked (Light Temple)"]')
                    long_card.scroll_into_view_if_needed()
                    page.screenshot(path=str(SHOT_DIR / f'mobile-{width}-{theme}-hacked.png'))
                    page.locator('.category-filter__btn[data-cat-id="action"]').click()
                    page.wait_for_timeout(300)
                    check_category_counts(page, games)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print('portal review checks passed')
    for path in sorted(SHOT_DIR.glob('mobile-*.png')):
        print(path)


if __name__ == '__main__':
    main()

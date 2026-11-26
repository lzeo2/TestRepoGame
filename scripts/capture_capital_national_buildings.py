"""Render the seven shipped national and regional landmarks on their source footprints."""
import argparse
import io
import json
import shutil
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright


VIEWS = [
    ('Shine Dome', 'Acton', 'osm-4970449', 'canberra-north', 28, 1.7),
    ('National Arboretum Village Centre', 'Molonglo Valley', 'osm-663660535', 'region-molonglo', 62, 17),
    ('National Museum of Australia', 'Acton Peninsula', 'osm-5035476', 'canberra-north', -102, 43),
    ('National Library of Australia', 'Parkes', 'osm-5954392', 'canberra-north', 20, 1.7),
    ('Royal Australian Mint', 'Deakin', 'osm-217376654', 'region-south', 147, 30),
    ('National Convention Centre', 'City', 'osm-210305032', 'canberra-north', -44, 2.1),
    ('Canberra Outlet Centre', 'Fyshwick', 'osm-30160608', 'airport', 148, 1.7),
]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format, *args):
        pass


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--chromium', default=shutil.which('chromium'))
    args = parser.parse_args()
    panel_width, panel_height, caption_height, gap = 704, 314, 39, 7
    sheet_width = 2 * panel_width + gap
    compact_width, compact_height = (sheet_width - 2 * gap) // 3, 218
    sheet = Image.new('RGB', (sheet_width, 2 * (panel_height + caption_height + gap) + compact_height + caption_height), '#f9f7f0')
    title_font, area_font = ImageFont.load_default(size=22), ImageFont.load_default(size=16)
    draw = ImageDraw.Draw(sheet)
    errors = []
    http = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(root)))
    threading.Thread(target=http.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=args.chromium, args=[
                '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'])
            page = browser.new_page(viewport={'width': panel_width * 2, 'height': panel_height * 2})
            page.on('pageerror', lambda err: errors.append(str(err)))
            page.goto(f'http://127.0.0.1:{http.server_port}/scripts/capital-national-preview.html')
            page.wait_for_function("typeof window.captureNationalBuilding === 'function'", timeout=20000)
            for i, (name, area, source, pack, azimuth, eye) in enumerate(VIEWS):
                spec = dict(id=source, pack=pack, azimuth=azimuth, eyeHeight=eye)
                if source == 'osm-30160608':
                    spec['detail'] = dict(x=3844.5, y=2.3, z=2130.4, distance=13.6)
                if source == 'osm-210305032':
                    spec['detail'] = dict(x=-245, y=5.5, z=-3673, distance=69)
                stats = page.evaluate('view => window.captureNationalBuilding(view)', spec)
                print(json.dumps(stats), flush=True)
                if i < 4:
                    width, height = panel_width, panel_height
                    x, y = (i % 2) * (width + gap), (i // 2) * (height + caption_height + gap)
                else:
                    width, height = compact_width, compact_height
                    x, y = (i - 4) * (width + gap), 2 * (panel_height + caption_height + gap)
                with Image.open(io.BytesIO(page.locator('canvas').screenshot())) as frame:
                    frame = frame.convert('RGB')
                    frame.thumbnail((width, height), Image.Resampling.LANCZOS)
                    sheet.paste(frame, (x + (width - frame.width) // 2, y + (height - frame.height) // 2))
                baseline = y + height + caption_height / 2
                draw.text((x + 9, baseline), name, fill='#18241e', font=title_font, anchor='lm')
                draw.text((x + width - 10, baseline + 1), area, fill='#4b5650', font=area_font, anchor='rm')
            browser.close()
            if errors:
                raise RuntimeError(errors)
    finally:
        http.shutdown()
        http.server_close()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output, format='WEBP', quality=89, method=6)


if __name__ == '__main__':
    main()

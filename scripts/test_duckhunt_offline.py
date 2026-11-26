"""Exercise the published Duck Hunt entry, renderer chunks and local level creator.

Requires Playwright, Pillow and Chromium. Run from any directory. Pass a directory
with --captures to retain the native screenshots and JSON result.
"""
import argparse
import io
import json
import os
import shutil
import threading
from collections import deque
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from PIL import Image
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ENTRY = "/Games/DuckHunt/index.html"


class QuietFiles(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def visible_duck(image):
    """Locate a coloured sprite in open sky on the rendered, paused normal level."""
    view = image.convert("RGB").resize((160, 120), Image.Resampling.BOX)
    candidates = set()
    for y in range(8, 82):
        for x in range(2, 158):
            if x < 56 and y > 44:
                continue  # tree silhouette
            red, green, blue = view.getpixel((x, y))
            if max(red, green, blue) < 148 or (red > 130 and green < 115 and blue < 125):
                candidates.add((x, y))
    groups = []
    while candidates:
        queue = deque([candidates.pop()])
        group = list(queue)
        while queue:
            x, y = queue.popleft()
            for point in ((x-1,y), (x+1,y), (x,y-1), (x,y+1)):
                if point in candidates:
                    candidates.remove(point)
                    group.append(point)
                    queue.append(point)
        if len(group) >= 5:
            groups.append(group)
    if not groups:
        return None
    group = max(groups, key=len)
    return tuple(round(sum(p[axis] for p in group) / len(group) * 4) for axis in (0, 1))


def run(captures):
    if captures:
        captures.mkdir(parents=True, exist_ok=True)
    report = {"entry": ENTRY.lstrip("/"), "states": {}, "inputs": [], "screenshots": [],
              "errors": [], "externalRequests": [], "failedResponses": []}
    handler = partial(QuietFiles, directory=str(ROOT))
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server, sync_playwright() as pw:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        origin = f"http://127.0.0.1:{server.server_port}"
        executable = os.environ.get("CHROMIUM") or shutil.which("chromium")
        browser = pw.chromium.launch(executable_path=executable, args=[
            "--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        context = browser.new_context(viewport={"width": 640, "height": 480}, service_workers="block")
        loaded = set()

        def local_only(route):
            parsed = urlsplit(route.request.url)
            if parsed.hostname in {None, "127.0.0.1"}:
                route.continue_()
            else:
                report["externalRequests"].append(route.request.url)
                route.abort()

        def response(res):
            path = urlsplit(res.url).path
            if res.status >= 400:
                report["failedResponses"].append([res.status, path])
            else:
                loaded.add(path)

        def watch_page(tab):
            tab.on("pageerror", lambda error: report["errors"].append(str(error)))

        context.route("**/*", local_only)
        context.on("response", response)
        context.on("page", watch_page)
        # Observe text Pixi actually rasterises. Forward every call to its original context.
        context.add_init_script("""{
          const fill = CanvasRenderingContext2D.prototype.fillText;
          window.drawnText = [];
          CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
            if (window.drawnText.at(-1) !== String(text)) window.drawnText.push(String(text));
            return fill.call(this, text, ...args);
          };
        }""")
        page = context.new_page()
        page.goto(origin + ENTRY)

        def picture(label, image=None):
            if image is None:
                image = Image.open(io.BytesIO(page.screenshot()))
            if captures and label:
                name = label + ".jpg"
                image.convert("RGB").save(captures / name, quality=85)
                report["screenshots"].append(name)
            return image

        def hud():
            return page.evaluate("window.drawnText.slice(-22)")

        page.wait_for_function("window.drawnText.includes('wave 1 of 3')", timeout=60000)
        report["states"]["opening"] = hud()
        report["inputs"].append("Opened the ordinary Level 1 entry.")
        shot = False
        # Freeze the real game before looking for a duck. Undo pause and take the
        # shot with native input, regardless of animation speed on the host.
        for attempt in range(6):
            page.wait_for_timeout(380)
            page.keyboard.press("p")
            page.wait_for_timeout(150)
            image = picture(None)
            target = visible_duck(image)
            if target:
                picture("before", image)
            page.keyboard.press("p")
            page.wait_for_timeout(100)
            if target:
                page.mouse.click(*target)
                report["inputs"].append(f"Paused to aim, resumed and clicked the visible duck at {target}.")
                page.wait_for_timeout(230)
                if page.evaluate("window.drawnText.some(t => /^(100|200)$/.test(t))"):
                    shot = True
                    break
        assert shot, f"No confirmed scored normal-level shot. HUD: {hud()}"
        report["states"]["scoredShot"] = hud()
        picture("scored-shot")
        page.keyboard.press("p")
        page.wait_for_timeout(150)
        report["states"]["pauseLink"] = hud()
        picture("paused")
        report["inputs"].append("Pressed P to pause after scoring.")
        assert report["states"]["pauseLink"][-1] == "unpause (p)"
        with context.expect_page() as opened:
            page.keyboard.press("c")
        creator = opened.value
        creator.wait_for_load_state("domcontentloaded")
        assert creator.url == origin + "/Games/DuckHunt/creator.html", creator.url
        creator.locator("#title").fill("Arcade trial")
        creator.locator("#ducks").fill("2")
        creator.locator("#waves").fill("2")
        creator.locator("button[type=submit]").click()
        creator.wait_for_function("window.drawnText.includes('Arcade trial') && window.drawnText.includes('wave 1 of 2')",
                                  timeout=60000)
        report["states"]["customLevel"] = creator.evaluate("window.drawnText.slice(-12)")
        report["inputs"].append("Pressed C, set up a two-wave custom level and submitted it.")
        report["loadedLocalScripts"] = sorted(path for path in loaded if path.endswith(".js"))
        assert len(report["loadedLocalScripts"]) >= 4
        assert not report["errors"] and not report["failedResponses"] and not report["externalRequests"], report
        report.update(status="game-control-state-confirmed", observation=(
            "A visible duck awarded points in normal Level 1. P paused the game and C opened "
            "the same-origin creator, whose form launched the named custom level."))
        if captures:
            (captures / "proof.json").write_text(json.dumps(report, indent=2) + "\n")
        browser.close()
        server.shutdown()
        return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--captures", type=Path)
    result = run(parser.parse_args().captures)
    print(result["observation"])

#!/usr/bin/env python3
"""Exercise Chess Workshop with native input and its bundled Stockfish worker."""

import argparse
import functools
import http.server
import json
from pathlib import Path
import re
import tempfile
import threading

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
GAME = "/Games/Chess%20Workshop/"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def square(page, coordinate):
    return page.locator(f'#board [data-square="{coordinate}"]')


def play_move(page, origin, destination, drag=False):
    if drag:
        square(page, origin).locator(".piece").drag_to(square(page, destination))
    else:
        square(page, origin).click()
        square(page, destination).click()


def wait_for_reply(page):
    expect(page.locator("#play-moves .move-cell")).to_have_count(2, timeout=25_000)
    expect(page.locator("#play-status")).to_have_text("Your move.")


def capture(page, output, name):
    if output:
        page.screenshot(path=output / (name + ".png"), full_page=True)


def play_and_review(page, output):
    expect(page.locator("#board .square")).to_have_count(64)
    check_square_sizing(page)
    capture(page, output, "desktop-play")
    play_move(page, "e2", "e4", drag=True)
    expect(square(page, "e4")).to_have_attribute("aria-label", "e4 White pawn")
    wait_for_reply(page)
    expect(page.locator("#play-moves .move-cell").first).to_have_text("e4")
    page.locator("#review-match").click()
    expect(page.locator("#review-status")).to_contain_text("Review complete", timeout=25_000)
    expect(page.locator("#review-count")).to_have_text("2 / 2 plies")
    page.get_by_role("button", name="Next move", exact=True).click()
    expect(square(page, "e4")).to_have_attribute("aria-label", "e4 White pawn")
    expect(page.locator("#position-title")).to_contain_text("e4")
    expect(page.locator("#review-moves button[aria-current=step] small")).not_to_be_empty()
    expect(page.locator("#evaluation")).to_be_visible()
    capture(page, output, "desktop-review")

    page.locator("#review-pgn").fill("1. InvalidMove")
    page.locator("#start-review").click()
    expect(page.locator("#review-status")).to_have_text("Paste the PGN for one legal chess game.")
    page.locator("#review-pgn").fill("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *")
    page.locator("#start-review").click()
    expect(page.locator("#review-status")).to_contain_text("Review complete", timeout=25_000)
    expect(page.locator("#review-count")).to_have_text("6 / 6 plies")
    page.get_by_role("button", name="Final position", exact=True).click()
    expect(square(page, "a6")).to_have_attribute("aria-label", "a6 Black pawn")

    page.locator('button[data-mode="play"]').click()
    page.locator("#opponent").select_option("fading")
    page.locator("#new-game").click()
    expect(page.locator("#top-player")).to_contain_text("2250 Elo target")
    play_move(page, "d2", "d4")
    wait_for_reply(page)
    expect(page.locator("#top-player")).to_contain_text("2200 Elo target")

    page.locator("#opponent").select_option("draw")
    page.locator("#new-game").click()
    expect(page.locator("#play-status")).to_contain_text("Make a draw to win the challenge.")
    expect(square(page, "g2")).to_have_attribute("aria-label", "g2 White king")
    page.locator("#resign").click()
    page.locator('#resignation button[value="confirm"]').click()
    expect(page.locator("#play-status")).to_have_text("You resigned. This challenge requires a draw.")


def build_bot(page, output, downloads):
    page.get_by_role("button", name="Bot Studio", exact=True).click()
    page.get_by_role("button", name="Remove rule 1", exact=True).click()
    page.get_by_role("button", name="+ Add rule", exact=True).click()
    trigger = page.get_by_role("button", name="Bot plays a move", exact=True)
    action = page.get_by_role("button", name="Drop Elo", exact=True)
    trigger.drag_to(page.get_by_role("button", name="Rule 1, If: Choose block", exact=True))
    action.drag_to(page.get_by_role("button", name="Rule 1, Then: Choose block", exact=True))
    expect(page.get_by_role("button", name="Rule 1, If: Bot plays a move", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="Rule 1, Then: Drop Elo", exact=True)).to_be_visible()
    page.get_by_label("Bot name").fill("Clock Burner")
    page.get_by_label("Starting Elo").fill("1800")
    page.get_by_label("Rule 1 Elo change").fill("50")
    page.get_by_role("button", name="Save bot", exact=True).click()
    expect(page.locator(".bot-builder-status")).to_have_text("Saved Clock Burner.")
    capture(page, output, "desktop-bot-studio")
    with page.expect_download() as delivery:
        page.get_by_role("button", name="Export Clock Burner", exact=True).click()
    exported = downloads / delivery.value.suggested_filename
    delivery.value.save_as(exported)
    profile = json.loads(exported.read_text(encoding="utf-8"))
    assert profile["bot"]["rules"] == [{"trigger": "botMove", "action": "drop", "amount": 50}], profile
    page.get_by_role("button", name="Play Clock Burner", exact=True).click()
    expect(page.locator("#top-player")).to_contain_text("1800 Elo target")
    play_move(page, "e2", "e4")
    wait_for_reply(page)
    expect(page.locator("#top-player")).to_contain_text("1750 Elo target")
    page.reload(wait_until="load")
    page.locator("#opponent").select_option(label="Clock Burner")
    page.get_by_role("button", name="Bot Studio", exact=True).click()
    page.locator('#studio input[type="file"]').set_input_files(exported)
    expect(page.get_by_label("Bot name")).to_have_value("Clock Burner")
    expect(page.get_by_role("button", name="Rule 1, Then: Drop Elo", exact=True)).to_be_visible()


def no_overflow(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Horizontal page overflow"


def check_square_sizing(page):
    assert page.locator("#board .square").evaluate_all("""
        squares => {
            const sizes = squares.map(square => square.getBoundingClientRect());
            return sizes.length === 64 && sizes.every(
                rect => Math.abs(rect.width - rect.height) <= 1 &&
                        Math.abs(rect.width - sizes[0].width) <= 1
            );
        }
    """), "Chessboard squares are not all square and equal-sized"


def phone_flows(page, output):
    page.get_by_role("button", name="Puzzles", exact=True).tap()
    page.locator("#difficulty").select_option("mate1")
    expect(page.locator("#puzzle-count")).to_have_text("0 solved")
    no_overflow(page)
    check_square_sizing(page)
    capture(page, output, "mobile-puzzle")
    page.locator("#puzzle-hint").tap()
    hint = re.fullmatch(
        r"Try ([a-h][1-8]) to ([a-h][1-8])\.(?: Promote to a (queen|rook|bishop|knight)\.)?",
        page.locator("#puzzle-status").inner_text(),
    )
    assert hint, "Missing puzzle hint"
    square(page, hint[1]).tap()
    square(page, hint[2]).tap()
    promotion = page.get_by_role("dialog", name="Promote pawn")
    if hint[3]:
        promotion.get_by_role("button", name=hint[3].title(), exact=True).tap()
    expect(page.locator("#puzzle-status")).to_have_text("Checkmate. Puzzle solved!")
    expect(page.locator("#puzzle-count")).to_have_text("1 solved")
    page.locator("#puzzle-next").tap()
    expect(page.locator("#puzzle-hint")).to_be_enabled()
    expect(page.locator("#puzzle-status")).to_contain_text("to move")

    page.get_by_role("button", name="Bot Studio", exact=True).tap()
    no_overflow(page)
    page.get_by_role("button", name="Remove rule 1", exact=True).tap()
    page.get_by_role("button", name="+ Add rule", exact=True).tap()
    page.get_by_role("button", name="Player moves", exact=True).tap()
    page.get_by_role("button", name="Rule 1, If: Choose block", exact=True).tap()
    page.get_by_role("button", name="Raise Elo", exact=True).tap()
    page.get_by_role("button", name="Rule 1, Then: Choose block", exact=True).tap()
    expect(page.get_by_role("button", name="Rule 1, If: Player moves", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="Rule 1, Then: Raise Elo", exact=True)).to_be_visible()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    parser.add_argument("--output", type=Path, help="Write screenshots to an external directory.")
    args = parser.parse_args()
    if args.output:
        args.output = args.output.resolve()
        if args.output.is_relative_to(ROOT):
            parser.error("--output must be outside the repository")
        args.output.mkdir(parents=True, exist_ok=True)
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler) as server, tempfile.TemporaryDirectory() as temp:
        server_thread = threading.Thread(target=server.serve_forever, daemon=True)
        server_thread.start()
        origin = f"http://127.0.0.1:{server.server_port}"
        problems = []
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(executable_path=args.chromium, args=["--no-sandbox", "--disable-dev-shm-usage"])
                try:
                    for viewport, touch in [({"width": 1360, "height": 1040}, False), ({"width": 390, "height": 844}, True)]:
                        context = browser.new_context(viewport=viewport, has_touch=touch, is_mobile=touch)

                        def local_only(route):
                            if route.request.url.startswith(origin + "/"):
                                route.continue_()
                            else:
                                problems.append("Third-party request: " + route.request.url)
                                route.abort()

                        context.route("**/*", local_only)
                        page = context.new_page()
                        page.on("pageerror", lambda error: problems.append(str(error)))
                        page.on("console", lambda message: problems.append(message.text) if message.type == "error" else None)
                        page.goto(origin + GAME, wait_until="load")
                        if touch:
                            phone_flows(page, args.output)
                        else:
                            play_and_review(page, args.output)
                            build_bot(page, args.output, Path(temp))
                        no_overflow(page)
                        context.close()
                finally:
                    browser.close()
        finally:
            server.shutdown()
            server_thread.join()
    assert not problems, "\n".join(problems)
    print("PASS Chess Workshop native desktop and mobile input, local Stockfish, PGN, tactics, bot drag and touch controls, persistence, export/import and local requests.")


if __name__ == "__main__":
    main()

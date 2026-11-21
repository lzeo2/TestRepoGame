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
    return page.locator(f'#board .board-key[data-square="{coordinate}"]')


def square_center(page, coordinate):
    frame = page.locator("#board cg-board").bounding_box()
    column = ord(coordinate[0]) - ord("a")
    row = 8 - int(coordinate[1])
    if page.locator("#board.orientation-black").count():
        column, row = 7 - column, 7 - row
    return (
        frame["x"] + frame["width"] * (column + .5) / 8,
        frame["y"] + frame["height"] * (row + .5) / 8,
    )


def play_move(page, origin, destination, drag=False, touch=False):
    page.locator("#board cg-board").scroll_into_view_if_needed()
    start, end = (square_center(page, key) for key in (origin, destination))
    if touch and drag:
        session = page.context.new_cdp_session(page)
        try:
            def dispatch(event, points):
                session.send("Input.dispatchTouchEvent", {
                    "type": event,
                    "touchPoints": [{"x": x, "y": y} for x, y in points],
                })

            dispatch("touchStart", [start])
            for step in range(1, 9):
                page.wait_for_timeout(20)
                dispatch("touchMove", [tuple(a + (b - a) * step / 8 for a, b in zip(start, end))])
            dispatch("touchEnd", [])
        finally:
            session.detach()
        return
    if drag:
        page.mouse.move(*start)
        page.mouse.down()
        page.mouse.move(*end, steps=12)
        page.wait_for_timeout(50)
        page.mouse.up()
    elif touch:
        page.touchscreen.tap(*start)
        page.touchscreen.tap(*end)
    else:
        page.mouse.click(*start)
        page.mouse.click(*end)


def board_snapshot(page):
    return page.locator("#board .board-key").evaluate_all("""
        cells => Object.fromEntries(cells.map(cell => [cell.dataset.square, cell.ariaLabel]))
    """)


def verify_rendered_board(page):
    page.wait_for_function("""
        () => {
            const visuals = new Map(
                Array.from(document.querySelectorAll('#board cg-board piece'), piece => [piece.cgKey, piece])
                    .filter(([key, piece]) => key && !piece.classList.contains('ghost') && !piece.classList.contains('fading')),
            );
            return Array.from(document.querySelectorAll('#board .board-key')).every(cell => {
                const [key, side, role] = cell.ariaLabel.split(' ');
                const piece = visuals.get(key);
                return role ? piece?.classList.contains(role) && piece.classList.contains(side.toLowerCase()) : !piece;
            });
        }
    """, timeout=5_000)


def wait_for_reply(page):
    expect(page.locator("#play-moves .move-cell")).to_have_count(2, timeout=25_000)
    expect(page.locator("#play-status")).to_have_text("Your move.")


def capture(page, output, name):
    if output:
        page.screenshot(path=output / (name + ".png"), full_page=True)


def play_and_review(page, output):
    expect(page.locator("#board .board-key")).to_have_count(64)
    check_square_sizing(page)
    capture(page, output, "desktop-play")
    play_move(page, "e2", "e5", drag=True)
    expect(page.locator("#play-moves .move-cell")).to_have_count(0)
    expect(square(page, "e2")).to_have_attribute("aria-label", "e2 White pawn")
    verify_rendered_board(page)
    page.locator("#flip-board").click()
    expect(page.locator("#board")).to_have_class(re.compile(r"\borientation-black\b"))
    play_move(page, "e2", "e4", drag=True)
    expect(square(page, "e4")).to_have_attribute("aria-label", "e4 White pawn")
    wait_for_reply(page)
    expect(page.locator("#play-moves .move-cell").first).to_have_text("e4")
    verify_rendered_board(page)
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
    expect(page.locator("#review-status")).to_contain_text('Illegal move "InvalidMove" in the PGN.')
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
    square(page, "d2").press("Enter")
    square(page, "d2").press("ArrowUp")
    square(page, "d3").press("ArrowUp")
    expect(square(page, "d4")).to_be_focused()
    page.keyboard.press("Enter")
    wait_for_reply(page)
    expect(page.locator("#top-player")).to_contain_text("2200 Elo target")
    first_move = page.locator("#play-moves .move-cell").first.element_handle()
    play_move(page, "g1", "f3")
    expect(page.locator("#play-moves .move-cell")).to_have_count(4, timeout=25_000)
    assert first_move.evaluate("move => move.isConnected"), "Adding moves rebuilt the prior notation"

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
    page.get_by_role("button", name="Play draft", exact=True).click()
    expect(page.locator("#top-player strong")).to_have_text("Clock Burner")
    expect(page.locator("#opponent option:checked")).to_contain_text("Clock Burner")
    page.locator("#new-game").click()
    expect(page.locator("#top-player strong")).to_have_text("Clock Burner")
    page.get_by_role("button", name="Bot Studio", exact=True).click()
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
    assert page.locator("#board .board-key").evaluate_all("""
        squares => {
            const sizes = squares.map(square => square.getBoundingClientRect());
            return sizes.length === 64 && sizes.every(
                rect => Math.abs(rect.width - rect.height) <= 1 &&
                        Math.abs(rect.width - sizes[0].width) <= 1
            );
        }
    """), "Chessboard squares are not all square and equal-sized"


def appearance_flows(page, output):
    page.get_by_role("button", name="Play", exact=True).click()
    page.locator("#appearance-open").press("Enter")
    dialog = page.get_by_role("dialog", name="Appearance")
    expect(dialog).to_be_visible()
    expect(page.locator("#appearance-theme")).to_have_value("workshop")
    page.locator("#appearance-theme").press("ArrowDown")
    expect(page.locator("#appearance-theme")).to_have_value("walnut")
    page.locator("#appearance-pieces").select_option("merida")
    page.locator("#appearance-coordinates").uncheck()
    page.locator("#appearance-dots").uncheck()
    page.locator("#appearance-animation").uncheck()
    expect(page.locator("html")).to_have_attribute("data-chess-pieces", "merida")
    expect(page.locator("#board")).to_have_attribute("data-coordinates", "false")
    capture(page, output, "desktop-appearance")
    page.locator("#appearance-dark").fill("#405060")
    expect(page.locator("#appearance-theme")).to_have_value("custom")
    dialog.get_by_role("button", name="Done", exact=True).press("Enter")
    expect(dialog).not_to_be_visible()
    page.reload(wait_until="load")
    expect(page.locator("html")).to_have_attribute("data-chess-pieces", "merida")
    expect(page.locator("#board")).to_have_attribute("data-coordinates", "false")
    assert page.locator("html").evaluate("root => root.style.getPropertyValue('--board-dark')") == "#405060"
    piece = page.locator("#board cg-board piece.white.king")
    assert "/merida/wK.svg" in piece.evaluate("el => getComputedStyle(el).backgroundImage")
    page.mouse.click(*square_center(page, "e2"))
    expect(page.locator("#board cg-board square.move-dest")).to_have_count(0)
    page.mouse.click(*square_center(page, "e2"))
    page.locator("#appearance-open").click()
    expect(page.locator("#appearance-animation")).not_to_be_checked()
    page.locator("#appearance-reset").click()
    dialog.get_by_role("button", name="Done", exact=True).click()
    expect(page.locator("html")).to_have_attribute("data-chess-pieces", "cburnett")
    expect(page.locator("#board")).to_have_attribute("data-coordinates", "true")
    page.mouse.click(*square_center(page, "e2"))
    expect(page.locator("#board cg-board square.move-dest")).to_have_count(2)
    no_overflow(page)


def puzzle_hint_coordinates(page):
    page.locator("#puzzle-hint").tap()
    hint = re.fullmatch(
        r"Try ([a-h][1-8]) to ([a-h][1-8])\.(?: Promote to a (queen|rook|bishop|knight)\.)?",
        page.locator("#puzzle-status").inner_text(),
    )
    assert hint, "Missing puzzle hint"
    return hint.groups()


def phone_flows(page, output):
    check_square_sizing(page)
    play_move(page, "e2", "e4", touch=True, drag=True)
    wait_for_reply(page)
    expect(page.locator("#play-moves .move-cell").first).to_have_text("e4")
    verify_rendered_board(page)
    page.get_by_role("button", name="Puzzles", exact=True).tap()
    page.locator("#difficulty").select_option("mate1")
    expect(page.locator("#puzzle-hint")).to_be_enabled()
    expect(page.locator("#puzzle-count")).to_have_text("0 solved")
    no_overflow(page)
    check_square_sizing(page)
    capture(page, output, "mobile-puzzle")
    for _ in range(24):
        if page.locator("#puzzle-title").inner_text() == "Promotion finish":
            break
        page.locator("#puzzle-next").tap()
        expect(page.locator("#puzzle-hint")).to_be_enabled()
    expect(page.locator("#puzzle-title")).to_have_text("Promotion finish")
    before = board_snapshot(page)
    wrong = page.evaluate("""async position => {
        const { Chess } = await import('./vendor/chess.js');
        const setup = new Chess();
        setup.clear();
        const types = { king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n', pawn: 'p' };
        for (const label of Object.values(position)) {
            const [square, color, piece] = label.split(' ');
            if (piece) setup.put({ type: types[piece], color: color === 'White' ? 'w' : 'b' }, square);
        }
        const turn = document.querySelector('#puzzle-status').textContent.startsWith('Black') ? 'b' : 'w';
        const game = new Chess(setup.fen().replace(' w ', ' ' + turn + ' '));
        const candidate = game.moves({ verbose: true }).find(move => !move.promotion && !move.san.endsWith('#'));
        return candidate ? [candidate.from, candidate.to] : null;
    }""", before)
    assert wrong, "Promotion puzzle needs a legal nonmating move for rollback coverage"
    play_move(page, *wrong, touch=True, drag=True)
    expect(page.locator("#puzzle-status")).to_contain_text("lets the defender escape")
    assert board_snapshot(page) == before
    verify_rendered_board(page)

    origin, destination, promote = puzzle_hint_coordinates(page)
    assert promote, "Promotion hint must identify the piece"
    promotion = page.get_by_role("dialog", name="Promote pawn")
    play_move(page, origin, destination, touch=True, drag=True)
    expect(promotion).to_be_visible()
    promotion.get_by_role("button", name="Cancel", exact=True).tap()
    expect(promotion).not_to_be_visible()
    assert board_snapshot(page) == before
    verify_rendered_board(page)
    play_move(page, origin, destination, touch=True)
    expect(promotion).to_be_visible()
    promotion.get_by_role("button", name=promote.title(), exact=True).tap()
    expect(page.locator("#puzzle-status")).to_have_text("Checkmate. Puzzle solved!")
    expect(page.locator("#puzzle-count")).to_have_text("1 solved")
    verify_rendered_board(page)
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
                        if touch:
                            context.add_init_script("Math.random = () => 4 / 2 ** 32;")

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
                            appearance_flows(page, args.output)
                        no_overflow(page)
                        context.close()
                finally:
                    browser.close()
        finally:
            server.shutdown()
            server_thread.join()
    assert not problems, "\n".join(problems)
    print(
        "PASS Chess Workshop native pointer and keyboard moves, local Stockfish, PGN, "
        "puzzle rollback and promotion, bot drag and restart, appearance persistence, local requests."
    )


if __name__ == "__main__":
    main()

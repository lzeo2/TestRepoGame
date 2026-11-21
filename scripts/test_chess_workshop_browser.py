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
        if page.locator("#board").is_visible():
            expect(page.locator("#board cg-board piece:is(.anim, .fading)")).to_have_count(0)
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


def move_cells(page, panel="play"):
    return page.locator(f"#{panel}-moves .move-cell strong")


def start_match(page, bot, side="w"):
    page.get_by_role("button", name="Play", exact=True).click()
    page.locator("#opponent").select_option(bot)
    page.locator("#play-color").select_option(side)
    page.locator("#new-game").click()


def check_burst(page, expected):
    expect(page.locator("#play-status")).to_contain_text("Your move.", timeout=25_000)
    expect(move_cells(page)).to_have_count(len(expected))
    for cell, san in zip(move_cells(page).all_text_contents(), expected):
        assert cell and (cell == san if san else cell != "Pass"), (cell, expected)
    verify_rendered_board(page)


def bonus_turns(page, output):
    start_match(page, "double")
    expect(page.locator("#play-format")).to_have_text("Bonus turns")
    play_move(page, "e2", "e4")
    check_burst(page, ["e4", None, "Pass", None])
    final = board_snapshot(page)
    capture(page, output, "desktop-double-turn")

    page.locator("#review-match").click()
    expect(page.locator("#review-status")).to_contain_text("Review complete", timeout=25_000)
    expect(page.locator("#review-count")).to_have_text("4 / 4 plies")
    expect(page.locator("#review-bonus-note")).to_be_visible()
    assert '[Variant "Workshop Bonus Turns"]' in page.locator("#review-pgn").input_value()
    page.get_by_role("button", name="Pass Turn skipped", exact=True).click()
    expect(page.locator("#position-title")).to_contain_text("Pass · Turn skipped")
    before = board_snapshot(page)
    page.get_by_role("button", name="Previous move", exact=True).click()
    assert board_snapshot(page) == before, "Review pass changed piece placement"
    page.get_by_role("button", name="Final position", exact=True).click()
    assert board_snapshot(page) == final, "Bonus review did not reach the played position"
    verify_rendered_board(page)

    start_match(page, "triple", "b")
    expect(page.locator("#board")).to_have_class(re.compile(r"\borientation-black\b"))
    check_burst(page, [None, "Pass", None, "Pass", None])

    start_match(page, "stockfish")
    expect(page.locator("#play-format")).to_have_text("Standard")
    play_move(page, "d2", "d4")
    check_burst(page, ["d4", None])
    page.locator("#review-match").click()
    expect(page.locator("#review-status")).to_contain_text("Review complete", timeout=25_000)
    expect(page.locator("#review-bonus-note")).to_be_hidden()


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
    page.get_by_label("Rule 1 event frequency").fill("2")
    expect(page.locator(".bot-rule-preview")).to_contain_text("every 2")
    code = share_studio_draft(page)
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
    assert profile["bot"]["rules"] == [{"trigger": "botMove", "action": "drop", "amount": 50, "every": 2}], profile
    page.get_by_role("button", name="Play Clock Burner", exact=True).click()
    expect(page.locator("#top-player")).to_contain_text("1800 Elo target")
    play_move(page, "e2", "e4")
    wait_for_reply(page)
    expect(page.locator("#top-player")).to_contain_text("1800 Elo target")
    play_move(page, "g1", "f3")
    expect(move_cells(page)).to_have_count(4, timeout=25_000)
    expect(page.locator("#top-player")).to_contain_text("1750 Elo target")
    page.reload(wait_until="load")
    page.locator("#opponent").select_option(label="Clock Burner")
    page.get_by_role("button", name="Bot Studio", exact=True).click()
    page.locator('#studio input[type="file"]').set_input_files(exported)
    expect(page.get_by_label("Bot name")).to_have_value("Clock Burner")
    expect(page.get_by_label("Rule 1 event frequency")).to_have_value("2")
    expect(page.get_by_role("button", name="Rule 1, Then: Drop Elo", exact=True)).to_be_visible()
    return code


def share_studio_draft(page):
    page.locator(".bot-code summary").click()
    page.get_by_role("button", name="Get draft code", exact=True).click()
    field = page.get_by_label("Bot code", exact=True)
    code = field.input_value()
    assert re.fullmatch(r"CW1\.[A-Za-z0-9_-]+", code), "Missing reusable bot code"
    page.evaluate("""Object.defineProperty(navigator, 'clipboard', {
        configurable: true, value: { writeText: () => Promise.reject(new Error('Clipboard unavailable')) },
    })""")
    try:
        page.get_by_role("button", name="Copy code", exact=True).click()
        expect(page.locator(".bot-code-status")).to_contain_text("Bot code selected")
        assert field.evaluate("field => field.selectionStart === 0 && field.selectionEnd === field.value.length")
    finally:
        page.evaluate("delete navigator.clipboard")
    field.fill("CW1.invalid")
    page.get_by_role("button", name="Load as draft", exact=True).click()
    expect(page.locator(".bot-code-status")).to_contain_text("valid Chess Workshop bot code")
    field.fill(code)
    page.get_by_role("button", name="Load as draft", exact=True).click()
    expect(page.get_by_label("Bot name")).to_have_value("Clock Burner")
    expect(page.get_by_label("Rule 1 event frequency")).to_have_value("2")
    expect(page.locator(".bot-builder-status")).to_contain_text("Loaded as a new draft")
    return code


def open_community(page, panel, touch=False):
    for name in ("Community", panel):
        button = page.get_by_role("button", name=name, exact=True)
        if touch:
            button.tap()
        else:
            button.click()


def marketplace_flow(page, output, code):
    open_community(page, "Marketplace")
    expect(page.locator(".market-grid article")).to_have_count(6)
    page.get_by_label("Bot style").select_option("bonus")
    expect(page.locator(".market-grid article")).to_have_count(3)
    page.get_by_label("Search bots").fill("rush")
    curated = page.locator(".market-grid article")
    expect(curated).to_have_count(1)
    expect(curated.get_by_role("heading")).to_have_text("Opening Rush")
    curated.get_by_role("button", name="Save Opening Rush", exact=True).click()
    expect(page.locator(".market-message")).to_have_text("Saved Opening Rush to Bot Studio.")
    curated.get_by_role("button", name="Save Opening Rush", exact=True).click()
    expect(page.locator(".market-message")).to_contain_text("already in your collection")
    curated.get_by_role("button", name="Play Opening Rush", exact=True).click()
    expect(page.locator("#top-player strong")).to_have_text("Opening Rush")
    expect(page.locator("#play-format")).to_have_text("Bonus turns")
    play_move(page, "e2", "e4")
    check_burst(page, ["e4", None, "Pass", None, "Pass", None])

    open_community(page, "Marketplace")
    field = page.get_by_label("Reusable code or share link")
    field.fill("CW1.invalid")
    page.get_by_role("button", name="Preview bot", exact=True).click()
    expect(page.locator(".market-message")).to_contain_text("valid Chess Workshop bot code")
    field.fill(code)
    page.get_by_role("button", name="Preview bot", exact=True).click()
    preview = page.locator(".market-preview article")
    expect(preview.get_by_role("heading")).to_have_text("Clock Burner")
    capture(page, output, "desktop-marketplace")
    preview.get_by_role("button", name="Share Clock Burner", exact=True).click()
    share = page.get_by_role("dialog", name="Share Clock Burner")
    expect(share.get_by_label("Reusable bot code")).to_have_value(code)
    link = share.get_by_label("Share link", exact=True).input_value()
    assert link == page.url.split("#")[0] + "#bot=" + code
    shared = page.context.new_page()
    try:
        shared.goto(link, wait_until="load")
        expect(shared.locator(".market-preview h3")).to_have_text("Clock Burner")
        expect(shared.locator("#table")).to_be_hidden()
        expect(shared.get_by_role("button", name="Community", exact=True)).to_have_attribute("aria-current", "page")
    finally:
        shared.close()
    share.get_by_role("button", name="Close", exact=True).click()


def build_bonus_bot(page, output):
    # At 100 Elo the app chooses a legal random move. Select the first candidate
    # for each reply so the four-move cap can be checked without an early check.
    page.add_init_script("Math.random = () => 0;")
    page.reload(wait_until="load")
    page.get_by_role("button", name="Bot Studio", exact=True).click()
    page.get_by_label("Bot name").fill("Four-Move Test")
    page.get_by_label("Starting Elo").fill("100")
    page.get_by_label("Starting moves per turn").select_option("2")
    page.get_by_role("button", name="Player moves", exact=True).drag_to(
        page.get_by_role("button", name="Rule 1, If: Bot plays a move", exact=True),
    )
    page.get_by_role("button", name="Add moves per turn", exact=True).drag_to(
        page.get_by_role("button", name="Rule 1, Then: Drop Elo", exact=True),
    )
    expect(page.get_by_role("button", name="Rule 1, Then: Add moves per turn", exact=True)).to_be_visible()
    change = page.get_by_label("Rule 1 move change", exact=True)
    expect(change).to_have_value("1")
    change.fill("3")
    capture(page, output, "desktop-bonus-bot-studio")
    page.get_by_role("button", name="Play draft", exact=True).click()
    for _ in range(2):
        expect(page.locator("#opponent option:checked")).to_have_text("Four-Move Test (draft)")
        expect(page.locator("#bot-description")).to_contain_text("Starts with 2 per turn")
        play_move(page, "e2", "e4")
        check_burst(page, ["e4", None, "Pass", None, "Pass", None, "Pass", None])
        page.locator("#new-game").click()
    page.get_by_role("button", name="Bot Studio", exact=True).click()
    page.get_by_role("button", name="Save bot", exact=True).click()
    expect(page.locator(".bot-builder-status")).to_have_text("Saved Four-Move Test.")
    page.reload(wait_until="load")
    page.get_by_role("button", name="Bot Studio", exact=True).click()
    page.get_by_role("button", name="Edit Four-Move Test", exact=True).click()
    expect(page.get_by_label("Starting moves per turn")).to_have_value("2")
    expect(page.get_by_label("Rule 1 move change", exact=True)).to_have_value("3")
    expect(page.get_by_role("button", name="Rule 1, If: Player moves", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="Rule 1, Then: Add moves per turn", exact=True)).to_be_visible()


def script_engine(page, moves, hold_at=None):
    fixture = """((moves, holdAt) => {
        const NativeWorker = window.Worker;
        let played = 0, held = false;
        class FixtureEngine extends EventTarget {
            reply(data) {
                queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data })));
            }
            postMessage(command) {
                if (command === 'uci') this.reply('uciok');
                if (command === 'isready') this.reply('readyok');
                if (command === 'stop') {
                    held = true;
                    this.reply('bestmove ' + moves[played]);
                }
                if (!command.startsWith('go ')) return;
                if (!held && played === holdAt) return;
                const move = moves[played++];
                this.reply('info depth 1 score cp 0 pv ' + move + '\\nbestmove ' + move);
            }
            terminate() {}
        }
        window.Worker = function(url, ...args) {
            return /stockfish.*\\.js$/.test(String(url)) ? new FixtureEngine() : new NativeWorker(url, ...args);
        };
    })"""
    page.add_init_script(f"{fixture}({json.dumps(moves)}, {json.dumps(hold_at)});")


def check_interrupted_turn(context, url):
    page = context.new_page()
    # Keep the second search pending until Stop. The next burst begins with check.
    script_engine(page, ["e2e4", "d1h5", "c2c3", "h5f7"], hold_at=1)
    try:
        page.goto(url, wait_until="load")
        start_match(page, "triple", "b")
        expect(move_cells(page)).to_have_text(["e4", "Pass"])
        expect(page.locator("#play-status")).to_contain_text("Move 2 of 3")
        page.get_by_role("button", name="Puzzles", exact=True).click()
        page.get_by_role("button", name="Play", exact=True).click()
        check_burst(page, ["e4", "Pass", "Qh5", "Pass", "c3"])
        play_move(page, "a7", "a6")
        check_burst(page, ["e4", "Pass", "Qh5", "Pass", "c3", "a6", "Qxf7+"])
        expect(page.locator("#play-status")).to_contain_text("Check.")
        expect(square(page, "f7")).to_have_attribute("aria-label", "f7 White queen")
    finally:
        page.close()


def assert_record(page, board, alias, table, moves=None):
    page.get_by_label("Leaderboard", exact=True).select_option(board)
    rows = page.get_by_role("table", name=table, exact=True).locator("tbody tr")
    expect(rows).to_have_count(1)
    cells = rows.locator("td").all_text_contents()
    expected = ["1", alias] if moves is None else ["1", alias, str(moves)]
    assert cells[:-1] == expected and re.fullmatch(r"\d+\.\d s", cells[-1]), cells


def save_alias(page, alias, touch=False):
    page.get_by_label("Player name").fill(alias)
    save = page.get_by_role("button", name="Save name", exact=True)
    save.tap() if touch else save.click()
    expect(page.locator(".cw-rankings-notice")).to_contain_text(alias)


def record_bot_match(context, url, output):
    page = context.new_page()
    # Script White into Fool's Mate. Black's two legal moves and the real
    # checkmate result must reach the ranking store from the board controller.
    script_engine(page, ["f2f3", "g2g4"])
    try:
        page.goto(url, wait_until="load")
        open_community(page, "Leaderboards")
        expect(page.locator(".cw-rankings-scope")).to_contain_text("saved in this browser")
        expect(page.locator(".cw-rankings-empty")).to_contain_text("Beat Stockfish")
        save_alias(page, "Test Knight")
        start_match(page, "stockfish", "b")
        check_burst(page, ["f3"])
        play_move(page, "e7", "e5")
        check_burst(page, ["f3", "e5", "g4"])
        play_move(page, "d8", "h4")
        expect(page.locator("#play-status")).to_have_text("Checkmate. You win.")
        expect(move_cells(page).last).to_have_text("Qh4#")
        page.reload(wait_until="load")
        open_community(page, "Leaderboards")
        assert_record(page, "stockfish", "Test Knight", "Stockfish leaderboard", moves=2)
        capture(page, output, "desktop-leaderboard")
    finally:
        page.close()


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
    open_community(page, "Marketplace", touch=True)
    no_overflow(page)
    capture(page, output, "mobile-marketplace")
    open_community(page, "Leaderboards", touch=True)
    no_overflow(page)
    save_alias(page, "Phone Solver", touch=True)
    page.get_by_role("button", name="Play", exact=True).tap()
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
    page.reload(wait_until="load")
    open_community(page, "Leaderboards", touch=True)
    assert_record(page, "mate1", "Phone Solver", "Mate in one leaderboard")
    no_overflow(page)
    capture(page, output, "mobile-leaderboard")


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

                        def detect_errors(page):
                            page.on("pageerror", lambda error: problems.append(str(error)))
                            page.on("console", lambda message: problems.append(message.text) if message.type == "error" else None)

                        context.on("page", detect_errors)
                        page = context.new_page()
                        page.goto(origin + GAME, wait_until="load")
                        if touch:
                            phone_flows(page, args.output)
                        else:
                            play_and_review(page, args.output)
                            bonus_turns(page, args.output)
                            code = build_bot(page, args.output, Path(temp))
                            build_bonus_bot(page, args.output)
                            appearance_flows(page, args.output)
                            marketplace_flow(page, args.output, code)
                            check_interrupted_turn(context, origin + GAME)
                            record_bot_match(context, origin + GAME, args.output)
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
        "puzzle rollback and promotion, bot drag and restart, capped bonus turns and replay, "
        "check and resume guards, appearance persistence, bot sharing and Marketplace, "
        "match and puzzle rankings, local requests."
    )


if __name__ == "__main__":
    main()

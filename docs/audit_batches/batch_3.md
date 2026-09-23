## Batch 3

House of Hazards | functional OK | slop: minor | scores f=9 a=6 s=8 | keep
Geometry Dash Lite | functional OK | slop: minor | scores f=9 a=7 s=7 | keep
Tetris | functional OK | slop: minor | scores f=8 a=7 s=8 | keep
Pong | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Minesweeper | functional BROKEN(save helpers written inside `<script src=...>` are never executed; first cell click throws "saveState is not defined", reveal never runs — game does nothing) | slop: minor | scores f=1 a=7 s=6 | fix
Tic Tac Toe | functional BROKEN(win path calls undefined saveState — verified PAGEERROR on X-win, result screen never shows, board freezes mid-render) | slop: minor | scores f=3 a=7 s=6 | fix
Connect Four | functional BROKEN(two bugs: columnClick guards `turn!==1` so Yellow can NEVER move in 2-player mode — verified only 1 red disc drops; win path also throws on undefined saveState) | slop: minor | scores f=2 a=7 s=6 | fix
Memory | functional BROKEN(win path reads undefined bestMoves — verified PAGEERROR, win screen never appears after all pairs matched) | slop: minor | scores f=4 a=6 s=6 | fix
Whack-a-Mole | functional BROKEN(end-of-round reads undefined bestScore — verified PAGEERROR at time-up, final-score screen never appears) | slop: minor | scores f=4 a=6 s=6 | fix
Simon Says | functional BROKEN(game-over reads undefined bestLevel — verified PAGEERROR on wrong pad, game-over screen never appears) | slop: minor | scores f=4 a=7 s=7 | fix
Typing Speed | functional BROKEN(main script has SyntaxError: TEXTS array closed with `"];` instead of `];` — startGame undefined, Start Test button is dead; endGame would also throw on undefined bestWPM) | slop: minor | scores f=0 a=7 s=7 | fix
Math Quiz | functional BROKEN(10 rounds play but endGame reads undefined bestScore — verified typeof undefined/undefined, results screen never shows; game-screen has no restart = dead end) | slop: minor | scores f=4 a=7 s=6 | fix
Lights Out | functional BROKEN(win path reads undefined bestLevel — verified undefined, "You Win"/Next Level never shows, board goes dead after solving) | slop: minor | scores f=4 a=7 s=8 | fix
Sudoku | functional BROKEN(first number placement throws "saveState is not defined" — verified PAGEERROR, digit never renders) | slop: minor | scores f=2 a=7 s=7 | fix
Cookie Clicker | functional OK | slop: minor | scores f=9 a=9 s=8 | keep

Root cause for the 10 BROKEN entries (Minesweeper, Tic Tac Toe, Connect Four, Memory, Whack-a-Mole, Simon Says, Typing Speed, Math Quiz, Lights Out, Sudoku): each writes its save helpers (`saveState`/`clearSave`/`checkSaved`/`bestScore` etc.) as *inline content of `<script src="../../assets/game-save.js">`*, which browsers never execute — verified `typeof saveState === "undefined"` at runtime in a real browser for all 10, while Tetris/Pong (helpers in a proper separate script) are `function`. One-line fix: split the helpers into their own `<script>` block. Shared slop across the same 10: hidden-dead "Continue" button (checkSaved never runs), "Clear Save" button throws when clicked, and a duplicated "Main Menu" button stacked twice in the game-over screen (8 games; Sudoku's are on separate screens, fine). Connect Four needs the extra `turn!==1` PvP fix; Typing Speed needs the `"];` quote fix. Load-only smoke gate passes 15/15 because none of these fire until interaction — worth adding an interaction pass to the gate.

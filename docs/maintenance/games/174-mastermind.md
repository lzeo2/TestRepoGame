<!-- maintenance-game: Games/Mastermind -->
# Mastermind maintenance

## Identity and status

Registered ID **174**, category `puzzle`, entry `Games/Mastermind/index.html`. Baseline `8c8a055`; five files, 65,154 bytes. The local Meisterhirn canvas engine is readable source, wrapped with score and keyboard controls. No runtime network load is active in the configured game.

## Implementation map

**Source review coverage:** complete HTML, `style.css`, `script.js`, and 1,119-line `engine.js` read, including model/view/controller and dormant autosolver. License terms/source record inspected. No minified or binary engine was skipped.

HTML loads engine before wrapper. Play invokes `createGame` once and constructs `new Meisterhirn({rows:8, cols:4, colors:6, multiple:true}, viewOptions, false)`, injecting into `#gameHost`. The engine exports Controller; it owns `.model/.view/.newGame`. `judge` removes exact matches before counting remaining color matches, preventing duplicate overcount. Model `generateSolution/setColor/isRowSet/checkRow/nextRow` own round rules.

View uses layered canvases and `ClickAreas` to dispatch `rowclick/select/check/show/restart`; Controller translates those into model/view actions. Wrapper listeners update `#status`, `#hudScore`, `#hudRounds` and an absolute `#kbCursor`. Its `recordRound` is idempotent within a round.

## Gameplay and controls

Break a four-color secret chosen from six, with repetition allowed, in eight guesses. Gold feedback is correct color/position; white is color in another position. Click/tap current-row holes and choose popup colors, then click the row's check icon. Left/right move the wrapper cursor; 1 through 6 place colors and advance it; Enter submits a complete row; Escape closes the popup. Focused native buttons retain Enter/Space activation.

Give up reveals the solution; New round and the canvas restart icon reset. Menu hides the game and returning Play starts another round. Session wins/losses persist while the page stays loaded; there is no saved match. No audio exists.

## State and persistence

Model stores secret, guess matrix, zero-based row `count`, won/lost flags. Wrapper owns `roundRecorded`, cursor column, wins/losses and total completed rounds. `newRound` clears bookkeeping before `mm.newGame`. The engine's event order advances the row in its first model `row` listener, before the wrapper reads status. No localStorage or gameplay timer occurs. Dormant autosolver creation would default to `lib/autosolver.js`, but the explicit `false` prevents Worker startup; do not report it as an active missing dependency.

## Dependencies and provenance

Local MIT `LICENSE` and engine's full grant credit Tim Baumann. Header and [ingestion record](../../catalog_parts/sources_6.md) identify `https://github.com/timjb/meisterhirn`, revision `5e001308868f9ec4771e91ad8ff8e9ae6a1c6675`. Flat peg drawing/options replaced glow, wood/font/ribbon assets were not taken, and wrapper added keyboard/bookkeeping. No network comparison or copyright expansion was performed.

## Audit findings

- **Non-finding, traced score/status:** wrapper listens to `row` but not model `lose`; Controller's nested `nextRow` fires lose during the last-row check. Wrapper then sees `count === 8` and `lost`, which is safe, but win wording uses `count + 1`. On a win `nextRow` returns without incrementing, so that expression is correct; this was traced as a non-finding, not guessed from row count.
- **MEDIUM, static give-up semantics:** `engine.js`, Controller view `show` listener, checks a full row first, then unconditionally marks `lost = true` and shows give-up. A correct full row can fire win/record success and still end with both won/lost flags and give-up copy. Root fix: after checking, return if the round already ended; wrapper should read final authoritative outcome once.
- **MEDIUM, static sizing/accessibility:** wrapper `gridWidth` runs only on creation; no resize listener recreates/scales the canvas, and color holes/feedback are canvas-only. Rotation and nonvisual color identification need native testing. Root fix: preserve model while resizing view and expose labeled color/feedback equivalents.
- **LOW, static listener lifecycle:** View `openSelect` installs a body close listener; `closeSelect` does not remove it when keyboard/new round closes the popup. Store/remove that handler at the shared close boundary.

## Safe iteration

Use Controller event APIs, not direct canvas coordinate simulation in wrapper features. Keep autosolver disabled unless its authentic local source is separately authorized. Fix terminal give-up at the shared Controller handler; preserve duplicate-safe judge and eight-row limits. Do not replace the entire engine for a small state bug or delete licensing comments.

## Verification

Actually run: Git/catalog identity and engine/wrapper JS syntax parsing in [batch 65](../audits/games-65.md); **0 native runs**. [Historical P1b](../../audit_batches/playtest_p1b.md) typed 1234 plus Enter and reset, not a full terminal/give-up interaction.

Recommended native checks: repeated-color feedback, incomplete submission, eighth wrong guess, correct full guess then Give up, canvas restart and Menu, rotating after game creation, keyboard popup closure and denied/no Worker support. Read via `git show HEAD:Games/Mastermind/engine.js`; Main owns browser assets/full gate.

## Future outlook

Week 1: give-up terminal consistency and listener cleanup. Week 2: color names/nonvisual feedback and resize without lost guesses. Later: optional local score persistence with explicit corruption handling. Defer autosolver and online comparisons until current keyboard/touch outcomes are verified.

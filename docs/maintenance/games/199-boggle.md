<!-- maintenance-game: Games/Boggle -->
# Boggle maintenance

## Identity and status

Registered ID 199, `word`, not featured; entry `Games/Boggle/index.html`. Three files total 12,851 bytes at `8c8a055`. Current ingested port auto-starts a 4 by 4, ninety-second round. Historical catalog-parts claims of an in-house 4/5-square, three-minute target game do not describe this source. No native gameplay was run here.

## Implementation map

Source review coverage: full entry CSS, embedded `BDICT`/`PLANTS`, generator, pointer/keyboard validation, scoring/timer logic, `CREDITS.md`, `LICENSE`; no compiled engine omitted. `gen()` plants up to five randomly ordered words using `plant()`/`neighbors()`, fills remaining cells from weighted `FILL`, resets round fields, renders and starts interval. `render()` creates sixteen `.cell` divs with coordinates.

Pointer paths use `cellOf()`, `extend()`, `adj()`, `paintPath()` and `evaluate()`. Backtracking one cell removes the latest path step; repeated cells elsewhere are rejected. `commitWord()` checks length, embedded dictionary and duplicate finds, then awards `PTS`. Keyboard `inGridPath()` depth-first searches without cell reuse before committing a typed word. `drawFound()` creates text spans. Anchors: `#grid`, `#cur`, `#msg`, `#new`, `#time`, `#score`, `#wc`, `#best`, `#found`.

## Gameplay and controls

Drag through touching letters in any of eight directions, then release to submit. Minimum three letters; only the small embedded dictionary is accepted. Alternatively type letters anywhere on the document and press Enter; Backspace edits, Escape clears. Typed guesses must have a connected nonreusing grid path. Scores: three/four letters one point, five two, six three, seven or longer five. At ninety interval ticks play stops and status announces final score; New board resets the board/timer/score. There is no score target, separate win/lose overlay, sound or custom arrow navigation. Native New board button activation should remain available.

## State and persistence

Global `grid`, `cells`, `found`, `score`, `time`, `timer`, `over`, `path`, `selecting`, `typed`, `best` own the round. `boggleBest` saves high score and is read at top-level; reads/writes are unguarded and numeric parsing permits NaN. `gen()` clears the previous interval and starts one new timer but does not reset `typed` or `selecting`. Timer stops at expiry. There is no page-hidden pause policy; time is callback count, not wall-clock deadline. No requestAnimationFrame loop exists, only CSS selection transition/scale.

## Dependencies and provenance

`CREDITS.md` records `https://github.com/mohdraqeeb3210/boggle`, revision `70a271d037905f7b0a70b7f8f1d5c2ef191e3489`, ingestion 2025-09-24. MIT `LICENSE` names mohdraqeeb3210. This repository-held evidence supersedes [sources_8](../../catalog_parts/sources_8.md)'s old built-game description for current identity; no fresh upstream diff was performed. All dictionary and visual assets are embedded text/CSS. Dictionary curation terms beyond the upstream notice were not independently traced.

## Audit findings

- **HIGH**, `index.html`, initial `localStorage.getItem('boggleBest')` and `commitWord()` write: storage denial can abort startup or throw mid-score update, leaving feedback/found-list incomplete. Root fix: guard optional persistence and validate nonnegative finite best, keeping in-memory play functional.
- **MEDIUM**, `index.html`, `gen()` versus `typed`: New board clears visible current word but leaves the old typed buffer. Recommended repro: type CAT, click New board, type D; displayed input can become CATD on a fresh board. Root fix: reset all input state at the common round reset, including typed/selecting/path.
- **MEDIUM**, `index.html`, global keydown: Enter is always prevented/submitted, even with `#new` focused, so native button activation is intercepted. Backspace also lacks preventDefault for its game edit. Root fix: skip native controls and explicitly consume gameplay edit keys where appropriate.
- **MEDIUM**, `index.html`, pointer listeners: no capture/cancel handling; cancelled pointer gestures can leave selection active. Root fix: clear selection on pointercancel/lost capture and use bounded pointer capture.
- **MEDIUM**, `index.html`, `#grid`/`.cell`: no grid semantics or accessible coordinate selection; typed entry has no input element and only visual text. Root fix: semantic labeled input and live status or a keyboard grid, without remote dictionary services.

## Safe iteration

Keep pointer adjacency and typed DFS validation aligned; `commitWord()` alone does not validate board paths because pointer callers already construct legal paths. Fix persistence/input lifecycle without loosening dictionary rules. Preserve current length payouts rather than restoring old catalog math. No runtime modification, registration or replacement is authorized here.

## Verification

Actually run: inline-script syntax, Git/catalog identity and doc assertions; [batch audit](../audits/games-66.md). Native checks: zero. Recommended tests: dictionary and connected-path rejection, no reuse, pointer backtracking, duplicate score prevention, typed reset, Enter on focused New board, expiry/restart and blocked/corrupt storage. Prior Boggle keyboard-path evidence covers only a short interaction, not these lifecycle branches.

## Future outlook

Week one repairs storage and round-input reset. Week two improves native keyboard control semantics, pointer cancellation and live feedback with reduced motion. Later improve the local dictionary only with verified terms and reproducible board tests. Defer daily challenges, saved rounds or online vocabulary expansion until timer/input lifecycle is reliable.

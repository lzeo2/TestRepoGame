# Archery round and input refurbishment

Delegation 72, existing registered game 149 only. Actual worker provider/model: `openai-codex/gpt-6.1-sol`. Runtime source baseline `8c8a055`; the Archery entry was unchanged in later shared HEAD commits before this patch. Owned paths are `Games/Archery/index.html`, `scripts/test_archery_refurbishment.py`, this report and `games/149-archery.md`. No other runtime/catalog/license changes, dependency installs, sparse-selection changes, new games, registration, publication or push.

## Root causes and patch boundaries

1. **MEDIUM: stale successful-shot work.** `Games/Archery/index.html`, `resolveShot`'s old `setTimeout(advance,350)` had no owner. `startRound` reset the game but not the callback; the old callback moved the new round's target and could unlock subsequent work. Store one `pendingAdvance`, clear its reference at callback entry, and cancel/null it before round reset. Keep the intentional 350ms hit display.
2. **MEDIUM: mutable flight velocity.** `Arrow.setAim` was callable by keyboard while flying/locked, unlike pointerdown. Put the play/rest/unlocked guard in the shared method, preserving all caller trajectories when aiming is legal. Keyboard handling shares the launch boundary rather than rewriting flight math.
3. **MEDIUM: stale input lifecycle.** `pointerdown/move/up` and `startRound` retained drag/keyboard state across cancel, capture loss, blur and reset. `clearInput` now clears pointer ownership before releasing capture, synchronizes keyboard angle, and is called at reset/launch/cancel/loss/blur. Captured pointer ID filters move/up; a second down cannot replace an active drag.
4. **MEDIUM: keyboard focus/default boundary.** The document listener could scroll the page with arrows and consume Space intended for a button. The field now has `tabindex=0`, a meaningful label and a focus-visible outline. Only handled field keys suppress defaults; modifier shortcuts and native button input are untouched. Keyboard aiming uses the current arrow angle instead of a stale independent angle.
5. **LOW: terminal R mismatch.** Existing controls advertised R restart but the non-play early return blocked it after loss/win. Handle R before the play-state gate while the field has focus. Existing Play again and Restart round remain native buttons.

No engine replacement, new overlay, debug getter/setter/grant, state teleport, RNG seed override or storage injection was added. Ten arrows, the 15-point threshold, ring scores 1..4, ellipse ordering, per-shot wind, gravity/drag, continuous RAF and original generated-in-code artwork are unchanged. The GPL notice and `LICENSE` bytes are unchanged. Locally recorded upstream evidence remains https://github.com/bibhuticoder/archery-master at `107cbc9b8ff84f3ee53bfac43e26cf5d4b30a78e`, not a fresh network verification.

## Frozen source and review coverage

- Original entry blob: `130d4aee8752369c4785cc28bdf4eef227b689d2`; original entry SHA-256: `a6edc510f066248048a8b730a4ff1f27ecd7900da6029958aeefd7b33a6ce734`.
- Patched entry blob: `d73f863b586aabaa68f29140891c1792ee16f134`; SHA-256: `b16ca71abf902a2875b8d726ba5bcf2d6c864d5664d933ade16b5c2fd878f2d7`.
- Entry grows from 20,580 to 21,869 bytes; two-file game tree grows from 55,721 to 57,010 bytes. No asset additions.
- Complete entry HTML/CSS/inline source was read, including every `setAim`, `launch`, `resolveShot` and `startRound` caller and all input listeners. There is no unread bundled/minified engine or binary art in this game tree. Local history inspected: `docs/catalog_parts/sources_10.md`, `docs/audit_batches/playtest_p2b.md`, inventory and existing game manual. Historical playtest success did not cover this callback race.
- Main owns inventory refresh, final integration, subjective screenshot/design review and the separate full-catalog gate. This report is not a claim of comprehensive native certification.

## Native baseline and current check

Runnable regression uses the existing Python Playwright installation and system Chromium; no new framework. Port 8812 serves only the source HTML, plus an empty favicon response. The optional baseline reads the immutable old Git blob without checkout edits. The server, browser and contexts terminate in `finally`.

```sh
timeout 180 python3 -B scripts/test_archery_refurbishment.py --baseline
timeout 180 python3 -B scripts/test_archery_refurbishment.py
```

**Actually run baseline before patch:** exit 1, Chromium `149.0.7827.196`. A normal mouse drag hit a ring, native R restarted within the hit delay, then the target moved after waiting 500ms. Exact assertion:

```text
AssertionError: old hit callback moved restarted target
```

**Actually run patched native check:** two successful runs, exit 0, same frozen source SHA-256. The second used the final strengthened regression, including all locked aim keys and touch restart during drag. Its output:

```text
SOURCE_SHA256 b16ca71abf902a2875b8d726ba5bcf2d6c864d5664d933ade16b5c2fd878f2d7 working
BROWSER 149.0.7827.196
PASS native hit then R cancels old 350ms advance desktop
PASS synthetic negative blur/lostcapture cleanup fixture
NATIVE_WIN_SCORE 40 desktop
PASS native flight/locked input, cancel/reset, ten-shot lose/R, ten-shot win/Play again desktop
PASS native hit then R cancels old 350ms advance mobile
NATIVE_WIN_SCORE 40 mobile
PASS native flight/locked input, cancel/reset, ten-shot lose/R, ten-shot win/Play again mobile
PASS pageerror=0 console_error=0 failed_request=0 http_4xx_5xx=0 external=0
```

Positive gameplay used normal controls only. The aiming solver reads current target ellipses/wind, computes a legal drag and sends mouse input or trusted CDP touch input. It does not mutate game state or substitute mouse for touch. Ten legal low-power misses reached a zero-score loss; terminal R restarted. Ten actual shots scored 40 and reached the win on desktop and mobile; focused native Space activated Play again. Native Space on Restart round did not launch an arrow. Real touchCancel cleared the drag without launching; desktop/touch R during an active drag released input safely. Flight ArrowUp and all locked aim/Space keys were rejected without mutating aim.

**Negative fixtures only:** dispatched blur and lostpointercapture events check cleanup in isolation. These are explicitly synthetic, not trusted browser/OS lifecycle acceptance. No synthetic event is used to establish scoring, win/loss or positive native interaction.

Screenshots contain the actual auto-started field after normal Play again: temporary `archery-refurbishment/desktop.jpg` (1280x720), `390.jpg` (390x720 touch context) and `320.jpg` (320x720). The 320px document overflow assertion passed. They are not committed artwork or a claim of Main's visual approval.

## Static checks and integration hold

Runtime/test/manual/report milestone: `250b00d` (`fix: cancel Archery round callbacks and guard native input`). Git log verified it contains only the four leased paths.

Actually run inline script extraction using Python HTMLParser, then `node --check` via stdin; Python AST parsing of the regression; owned-path `git diff --check`. Output:

```text
PASS inline_scripts=1 node --check; Python AST parse
```

The maintenance checker was run before source commit and correctly refused validation:

```text
AssertionError: Commit inspected source changes before validating its inventory.
```

After source commit `250b00d`, the checker was rerun and still correctly held on the inventory:

```text
AssertionError: Inventory stale: inspect changes, then run --refresh.
```

Additional actual static assertions passed: `Archery manual identity/9 sections; owned-path copy guards; GPL unchanged` and `catalog schema/unique IDs/tracked URLs: 115 entries; no catalog changes`. Owned paths were clean immediately after the milestone; disk remained 2.4 GB free. Main must refresh the inspected inventory after this source commit, then rerun `python3 -B scripts/check_maintenance_docs.py`. The worker does not own inventory/index/checker updates. Focused native checks do not replace `xvfb-run python3 scripts/smoke_test_games.py`; the full 115-game registered-catalog loading gate remains Main's separate serial acceptance gate. The shared worktree contains other workers' changes, so no clean-tree claim is made.

## Known holds and next work

- **LOW, unchanged frame timing:** `Arrow.draw` and `Target.step` use per-frame updates. A timestep rewrite could change the ingested feel and scoring without measured parity; defer until real 60/120Hz and N100 profiling supports it.
- **Not certified:** OS-level blur/capture loss, assistive technology, every ring boundary, cross-browser behavior, devicePixelRatio quality, target-device performance and comprehensive visual review. The single existing dark presentation has no new light theme.
- Main should inspect the three screenshots, retain source/license notices, refresh inventory and run the unfiltered full gate before any separately authorized release. No additional game, sound, art, round type, engine or dependency is required for these fixes.

# Games 200–214: delegation 67 static audit

## Scope and evidence

Owned output: the fifteen game manuals linked below and this batch report. Source baseline is `8c8a055813b35bbd5d8b632423328333b4252d43`. Runtime, catalog, shared index, deployment and other workers' paths are untouched. Existing games only: zero additions, registrations, builds, deletions or pushes.

SourceReview is human inspection of bounded Git text views, complemented by tree inventory and syntax parsing. It is not comprehensive engine certification. Large Three/Ammo/p5/React/jQuery/RequireJS internals, binary art/audio/fonts and uninspected rule/search branches remain partial or unread. Individual pages identify those limits. Temporary formatting for readable inspection did not modify source. Local credits and shipped licenses were inspected; upstream pins were not independently network-reverified. Historical reports were used only as dated context, never as new native evidence.

Native: **0 browser runs, 0 interactions, 0 screenshots, 0 hardware measurements**. No dependency installation, Games materialization in the repository, persistent server or publication occurred. Static text copies stayed outside the repository; disk remained approximately 2.4 GiB free. Main owns the unchanged serial full-catalog smoke gate and visual judgments. None of these pages authorizes release or substitutes for that gate.

## Coverage ledger

| ID / manual | Source boundary inspected | JS parsing |
|---|---|---|
| [200 Achtung](../games/200-achtungdiekurve.md) | Wrapper, compressed engine named methods, entry/CSS | 2/2 PASS |
| [201 Dominoes](../games/201-dominoes.md) | Entry/success page, drag/tap/keyboard placement, order checker, CSS | 3/3 PASS |
| [202 Mini Golf](../games/202-minigolf.md) | Full small game script, entry/CSS, timer/storage/aim boundaries | 1/1 PASS |
| [203 Bowling](../games/203-bowling.md) | Challenge/physics/scoring/input, local GLTF loader boundary; vendor internals unread | 7/7 PASS |
| [204 Hearts](../games/204-heartsclassic.md) | AMD bootstrap, rule/UI/state/worker/config boundaries; search correctness partial | 27/27 PASS |
| [205 Spider](../games/205-spidersolitaire.md) | Entry accessibility glue, CSS, compiled game/store/UI tail; React internals unread | 2/2 PASS |
| [206 SameGame](../games/206-samegame.md) | Readable engine, input glue, entry/CSS; unused compressed alternative only parsed | 3/3 PASS |
| [207 Tower Defense](../games/207-towerdefense.md) | Wrapper, compressed stage/event/grid/tower/wave boundaries; helper algorithms partial | 2/2 PASS |
| [208 Racer](../games/208-javascriptracer.md) | Inline update/render/reset, common input/storage/image loop; assets not rendered | 4/4 PASS |
| [209 Rhythm](../games/209-rhythm.md) | Chart, start/judge/config/result/input paths; recording not listened to or cleared | 2/2 PASS |
| [210 Bullet Hell](../games/210-bullethell.md) | Authored entry/classes/templates and level lifecycle; p5 internals unread | 23/23 PASS |
| [211 Cribbage](../games/211-cribbageclassic.md) | Settings/menu/scoreboard/AI and focused large-game lifecycle/input; engine/template coverage partial | 6/6 PASS |
| [212 Crossword](../games/212-crossword.md) | Generator grouping/matrix/answer/render boundaries, entry/CSS; generator coverage partial | 4/4 PASS |
| [213 Gomoku](../games/213-gomoku.md) | Turn/AI timer/rank storage/search budget/DOM geometry; AI quality unproven | 1/1 PASS |
| [214 Mancala](../games/214-mancala.md) | Inline sow/capture/search/history/AI scheduling/input; optimality unproven | 1/1 PASS |

Actual syntax result: **88 checks, 88 PASS**. External JavaScript plus nonempty inline script bodies were checked from Git blobs; Spider's ESM bundle used module parsing. PASS means syntactically accepted, not executed, functional, accessible, licensed or offline-verified. No source finding was fixed in this documentation-only task.

## Ranked findings

Severity is maintenance priority, not proof of remote exploitability. Every row is **static-only**. `Observed` means the code construct/data flow was inspected; the proposed behavioral repro remains unrun. `Risk` means consequences need reproduction/profiling. `Evidence hold` means rights evidence is insufficient, not a legal conclusion. Paths below are relative to the named game's directory. The manuals contain reproduction steps and broader context.

### High priority

| Ref | Game / source anchor | Impact and status | Minimal root fix / next evidence |
|---|---|---|---|
| H1 | Achtung `javascripts/script.js::updatePlayerList` | Observed: editable player name concatenated into `innerHTML`; executable local markup can share portal origin. No remote-input route established. | Build list nodes; use `textContent` for names. Verify harmless markup stays literal and removal still addresses correct ID. |
| H2 | Hearts `js/domBinding.js::PlayerDisplay/setName`, `js/main.js` Settings name assignment | Observed: stored/editor names reach HTML sinks. Same-origin/local input, not proven network exploitation. | Plain text at both sink families, validated names array at config load; test escaped names and malformed saves. |
| H3 | Hearts `js/AsyncBrain.js::terminate`, `js/game.js::initBrains` | Observed: deferred rejection without Worker termination; fresh workers each deal/restart remain allocated. Memory/CPU impact unmeasured. | Terminate owned worker, detach handlers, clear deferreds. Count workers across new games and deals at levels 2–4. |
| H4 | Gomoku `script.js::makeMove/makeAIMove` | Observed: human input allowed during AI turn; unowned delayed callbacks can move after restart/undo/mode changes. | Guard turn owner; retain/cancel timer or invalidate session; recheck before applying AI output. Test rapid clicks and restart within 100ms. |
| H5 | Mancala `index.html::aiMove/performMove/onPitClick` | Observed: delayed callback uses live state, no AI ownership/session guard; human can move the AI side. | Shared turn/busy boundary and invalidated callbacks; recheck `aiShouldMove`. Test mode/restart/undo during 320ms delay and sow completion. |
| H6 | Spider `index.html` Enter/Space glue; bundle stock component `sy` | Observed: glue dispatches click, stock only responds to double-click. Keyboard cannot deal stock and therefore cannot complete all gameplay. | Obtain a deliberate stock activation route; do not double-click every focusable card. Native keyboard stock test required. |
| H7 | Racer `common.js::Dom.storage`, entry lap initialization/update | Observed conditional crash: storage acquisition/writes unguarded, potentially blocking startup/lap updates when denied. | Guard storage once at Dom with memory fallback; verify mute and best time under denial/corruption. |
| H8 | Cribbage `settings.js::GetSetting/SetSetting/GetStatistic/SetStatistic`; entry onload | Observed conditional crash: denied storage before Game construction, plus unguarded writes during statistics/settings. | Guard shared typed helpers and reset-stat removal; test load/play without persistence. |
| H9 | Gomoku `script.js::initGame/saveEloRating` | Observed conditional crash or NaN state from denied/corrupt rank storage. | Guard access, validate finite nonnegative rank and preserve defaults; do not clear unrelated origin keys. |
| H10 | Rhythm `index.html` song attribution, `media/music.mp3`, local LICENSE/CREDITS | Evidence hold: separate composition/recording rights not established by MIT game-code license; named artist/performer are shown. | Collect explicit redistribution evidence before further publication decision; never silently substitute copyrighted music or claim definite infringement. |

### Medium priority

| Ref | Game / source anchor | Impact and status | Minimal root fix / next evidence |
|---|---|---|---|
| M1 | Achtung `adk.minified.js::Player.calculateNextHole/resetTimeout` | Observed: `holeTimoutID` versus `holeTimeoutID` prevents intended cancellation; stale hole callbacks may affect rounds. | Correct shared timer identity via pinned readable upstream source; test restart/removal. |
| M2 | Achtung entry head and `stylesheets/style.css::#rightColumn` | Observed absence of viewport/reflow; phone usability unverified. | Viewport and bounded column reflow; portrait and keyboard removal review. |
| M3 | Dominoes `touch.js::drop/placeInSlot/touchend` | Observed: appends several tiles into a slot; win check only reads first child. Hidden stacking/confusing recovery. | Shared reject-or-swap placement invariant for every input caller. |
| M4 | Dominoes `bravo.html::.dugmic` | Observed: image-backed return/restart has no accessible name. | Label existing control; remove nested interactive semantics if present. |
| M5 | Dominoes `style1.css` responsive root font rules | Observed root shrink to 0.33rem; text/targets shrink with art. Actual mobile appearance unreviewed. | Scale board/art independently of legible copy and controls. |
| M6 | Dominoes both HTML music DOMContentLoaded handlers | Observed: unguarded storage read and ignored audio play rejection. | Guard access; unlock on a gesture; visible recoverable audio state. |
| M7 | MiniGolf `game.js::update/newHole` | Observed: uncanceled 1.2s next-hole timeout survives reset, advancing restarted session. | Own/cancel transition at shared reset or invalidate session; reproduce immediate post-sink restart. |
| M8 | MiniGolf `game.js::showKeyAim/putt` | Observed keyboard pull vector opposite mouse construction; default positive Y shoots downward. Advertised aim semantics need native comparison. | Correct keyboard coordinate construction; retain mouse physics. |
| M9 | Bowling `js/bowlphysics.js::resetPhysics/createBody` | Risk: removed bodies and Ammo allocations not destroyed; repeated reset may grow native heap. | Review explicit Ammo ownership/disposal, keeping shared shapes; profile many resets before claiming measured leak size. |
| M10 | Bowling `js/bowlchallenge.js::loader.load/Ammo().then` | Observed missing model/init failure UI. A load failure can leave blank lane. | One bootstrap error/loading surface; model error callback and Ammo rejection handler. |
| M11 | Bowling entry viewport | Observed zoom restrictions; mobile header/scorecard overlap unverified. | Permit zoom and inspect portrait layout. |
| M12 | Hearts `style.css` flattened background declarations | Observed invalid `background-image:background-color:...` syntax. Actual computed paint not reviewed. | Replace affected declarations with valid solid backgrounds; native computed style/screenshot check. |
| M13 | Hearts `js/config.js` load/sync and `game.js::initBrains` | Observed no shape/level validation or caught sync writes; malformed saved levels can leave null brain. | Validate four names/levels and accepted range at hydration; guarded writes. |
| M14 | Spider bundle `hy`, wrapper tabindex selector | Observed empty-column destinations not keyboard-reachable; inert foundations receive tabs. | Tag/label actual destinations; preserve card selection/move semantics. |
| M15 | Spider persisted bundle `ey/ly` | Risk: shallow saved array checks allow malformed card objects; history snapshots unbounded. | Upstream-source hydration fixtures, typed cards, measured history cap/migration. Do not edit compiled React internals. |
| M16 | SameGame entry instructions versus `samegame.js::canvas.onmousedown` | Observed copy describes immediate clear, engine marks then clears on confirmation. | Correct two-action instruction, preserving preview/scoring. |
| M17 | SameGame entry `#a` and `glue.js` | Observed missing focusable named board/DOM score and end status, despite page-level keyboard adapter. | Named focusable canvas plus accessible status at engine/glue boundary. |
| M18 | TowerDefense entry `#howto`, bundle `stage_main.step2` | Observed stale Press start instruction; waves follow building/wait condition. | Describe auto-wave trigger and actual pause/restart buttons. |
| M19 | TowerDefense bundle `getEventXY` | Risk: offset-based mapping does not handle every scale/ancestor layout; hit accuracy unverified. | Reproduce on scaled/scrolled board then centralize rect-to-backing mapping. |
| M20 | TowerDefense entry CSS and bundle `Button` | Observed 640px logical layout, small canvas targets, no keyboard adapter. Phone usability unverified. | Responsive shell and DOM keyboard affordances tied to existing actions. |
| M21 | Racer entry touch-controls media rule, `#tb-restart` | Observed desktop restart hidden in touch-only container. | Move/show restart independently; keep touch pad mobile-only. |
| M22 | Racer `common.js::Game.setKeyListener`, entry held input booleans | Risk: no blur/visibility release can leave held acceleration/steer active. | Reset all held inputs at shared lifecycle boundary; test alt-tab and touch cancellation. |
| M23 | Racer `common.js::Game.loadImages` | Observed load-only callbacks; error prevents readiness. | Error handling with visible retry/failure, not endless ready wait. |
| M24 | Rhythm `scripts/script.js::setupChallenge/updateAnimation` | Observed Fade off does not restore plain animation. | Assign both states at common animation/config boundary and rebuild notes. |
| M25 | Rhythm `scripts/script.js::setupStartButton` | Observed chart/wall timer start regardless of audio play success. | Await successful gesture playback or show recoverable failure before starting clocks. |
| M26 | Rhythm `css/style.css::.game/.key` | Risk: seven keys within narrow game pane lack mobile stacking; 44px touch width unmet at common phones. | Responsive lane/control layout and visible labels; native target measurements. |
| M27 | BulletHell `scripts/main.js::loadLevel`, `template/levels.js::LEVEL[5]` | Observed no final-level completion branch; terminal outcome absent. | Explicit completion at shared transition, preserving checkpoints and existing levels. |
| M28 | BulletHell entry viewport, `main.js::setup` | Observed 600px canvas/no viewport, side-by-side shell; mobile pointer/layout unverified. | Viewport and responsive shell with p5 coordinate parity. |
| M29 | BulletHell font asset and license tree | Evidence hold: separate bundled Source Code Pro font license not found in this directory. | Gather correct component license/notice; game MIT is not automatic font clearance. |
| M30 | Cribbage entry viewport/how-to layout | Observed no viewport and large fixed inset; phone overflow unverified. | Responsive shell without replacing card art; inspect keyboard/touch play. |
| M31 | Cribbage `menus.js::InitializeAllPlays`, lines 711–712 | Observed duplicated ordered-pair predicate in OR fails reversed discard highlighting. | Reverse indices in second branch; fixture checks both card orders. |
| M32 | Cribbage `game.js::StartAGame` versus animation callbacks | Risk: outstanding animation timers not globally invalidated by reviewed reset. Exact stale-state behavior unproven. | Native rapid new-game during dealing/pegging, then shared session token only if necessary. |
| M33 | Crossword `javascript/crossword-puzzle.js::generateCrosswordBlockSources` | Observed per-iteration `unmatchedwords` overwrites one shared unmatched slot; disconnected words can disappear. | Accumulate unmatched words once outside loop; disjoint-word fixture and requested/rendered count assertion. |
| M34 | Crossword `showCrossWordOptions/getViewableCrossWordList` | Observed click-only clue list and no dialog focus/Escape behavior. | Native clue buttons and focus return on close. |
| M35 | Crossword CSS `#answer-form` | Observed fixed 30em form/large input; narrow overflow unverified. | Constrain form/input to viewport, permit board scrolling; screenshots required. |
| M36 | Gomoku CSS mobile `.cell`, `script.js::initBoard` marker geometry | Observed 20px mobile cells versus 30px marker positions; board targets small. | Shared geometry and keyboard cursor/44px control strategy. |
| M37 | Gomoku entry copy and fixed `winChance` | Observed unsupported success probability/point claims. Not AI benchmarking. | Main reviews factual budget/depth/status copy; no invented metrics. |
| M38 | Mancala `index.html::layoutBoard` | Observed click-only div pits; H/U do not implement keyboard moves. | Native pit buttons/seed labels or roving cursor over legal moves. |
| M39 | Mancala `index.html::swapSides` | Observed no history save/redo invalidation/pending-turn reconciliation. Undo may restore pre-swap state unexpectedly. | Undoable swap transaction plus shared scheduled-turn invalidation. |

### Low priority and non-findings

- L1, MiniGolf `game.js::draw`: retained `createLinearGradient` contradicts credits' flattening claim. Main chooses bounded solid shell/art changes; no loading failure inferred.
- L2, SameGame `glue.js::TILE/COLS/ROWS`: duplicate fixed geometry is a synchronization ceiling, not grounds for a generic layout framework. Keep values aligned if engine board changes.
- L3, BulletHell `scripts/main.js::dt`: frame-count rather than elapsed-time progression can vary with FPS. Hardware profiling and pattern/collision fixtures precede timing refactoring.
- L4, Crossword `buildCrosswordBlockGraphs/viewPuzzle` and matrix setters: debug output and implicit `letters` global; entry `crosswordPuzzle` reads `.length` before its null guard. Current entry passes a valid fixed list. Fix guard/declarations at shared API after caller review; no present remote dataset/XSS path established.
- L5, Mancala `animateSow`: rerenders final board through each timeout rather than incremental sow state. Clarify presentation; rules need not be rewritten.
- Non-findings: React error-documentation URLs and upstream links in credits are not by themselves runtime requests. TowerDefense's local debug/cheat hook is not evidence of network exploitation. Consumed music, sprites/models/fonts are not unused just because large. No deletion recommendations without tracked/constructed consumer tracing.

## Verification

Delegation 71 finish-only verification retained the earlier bounded source-review ledger, reread all fifteen manuals, sampled the named defect/ownership anchors against frozen Git blobs, and checked local credits/license headers. It did not extend this into a whole-engine review. The current fifteen game trees and frozen entry blobs match the assigned facts. The finish pass independently reran the 88 syntax units: **88/88 PASS**; executed the runnable owned-page check: **15/15 PASS**; and executed Mancala's documented inline extraction: **PASS**. `python3 -B scripts/check_maintenance_docs.py` returned `PASS: 120 game documents cover 115 registered + 5 unregistered games; Git inventory current.` That global coverage result does not certify others' prose. Native remains zero.

Notice attribution checked locally: Achtung names Mathias Paumgarten and David Strauß; Dominoes names martakoprivica; MiniGolf names gamelabz; Hearts names Yujian Yao; Spider names Lee Kelly; SameGame names Gabor Bata; TowerDefense names oldj; Racer names Jake Gordon and contributors; Rhythm names Liang Xin, Chloe; BulletHell names Amelia Clarke; Crossword names Benjamin Tepolt. Bowling, Cribbage, Gomoku and Mancala source accounts are identified by the credited repository URLs; no additional human-name inference is made from those accounts or generic license text.

Actually run: source Git inventory, bounded source/credits/license reads, and 88 JavaScript syntax checks. Final owned-document validation and whitespace results are reported in the completion digest. Native recommendations are deliberately unrun. No claim that every third-party component's asset terms are independently verified.

Runnable documentation regression, repository root, no dependencies or Games checkout:

```python
# audit67-owned-check
import json, re, subprocess
from pathlib import Path
names = ['AchtungDieKurve','Dominoes','MiniGolf','Bowling','HeartsClassic',
         'SpiderSolitaire','SameGame','TowerDefense','JavaScriptRacer','Rhythm',
         'BulletHell','CribbageClassic','Crossword','Gomoku','Mancala']
sections = ['Identity and status','Implementation map','Gameplay and controls',
            'State and persistence','Dependencies and provenance','Audit findings',
            'Safe iteration','Verification','Future outlook']
rev = '8c8a055'
def blob(path):
    return subprocess.check_output(['git','show',rev+':'+path], text=True)
catalog = json.loads(blob('games.json'))
assert len({g['id'] for g in catalog}) == len(catalog)
tracked = set(subprocess.check_output(['git','ls-tree','-r','--name-only',rev], text=True).splitlines())
assert all(g['url'] in tracked for g in catalog)
for ident, name in enumerate(names, 200):
    path = Path('docs/maintenance/games') / f'{ident}-{name.lower()}.md'
    text = path.read_text()
    assert f'<!-- maintenance-game: Games/{name} -->' in text, path
    assert re.findall(r'^## (.+)$', text, re.M) == sections, path
    assert 'SourceReview coverage:' in text, path
    entry = next(g for g in catalog if g['id'] == ident)
    assert entry['url'] == f'Games/{name}/index.html', entry
    for target in re.findall(r'\]\(\.\./\.\./\.\./([^)#]+)', text):
        assert target in tracked, (path, target)
    assert not re.search(r'/home/|[A-Z]:\\|[\w.+-]+@[\w.-]+\.\w+|\u2014', text), path
print('PASS: 15 owned manuals, 9 exact headings each, catalog/link/identity checks')
```

To reproduce script parsing without checkout, use each manual's `git show ... | node --check` example; extract inline bodies rather than parsing HTML as JS. For a future explicitly authorized focused native run, a narrow disposable extraction avoids changing sparse settings. Example for one small assigned game, **not executed by this worker**:

```sh
df -h / | tail -1  # require at least 2 GiB free before extraction
rev=8c8a055
game=SameGame  # replace only with an assigned directory after size inspection
git ls-tree -rl "$rev" "Games/$game"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git archive "$rev" "Games/$game" | tar -x -C "$tmp"
# Main's bounded browser harness serves "$tmp" over HTTP, uses local entry
# Games/$game/index.html, blocks third-party requests, and terminates server.
```

This is a narrow extraction alternative to a sparse checkout, not a worker permission to start a browser. Main separately runs `xvfb-run python3 scripts/smoke_test_games.py` serially and reports loading exclusions/timeouts honestly. The targeted sequences in each manual cover input, score/outcome, restart, denied/corrupt saves, timer races and relevant dependencies; they do not replace the full gate.

## Refurbishment handoff and holds

1. Week 1: local unsafe name sinks, worker/AI ownership, denied-storage startup and music/font evidence. Reproduce risk rows before claiming measured damage. Fix shared owners, not one symptom caller.
2. Week 2: reachable keyboard paths, honest instructions, mobile targets/layout, visible error states and focus. Main reviews actual desktop/mobile screenshots and house style; screenshots here are absent.
3. Later: bounded rule fixtures, save migrations, frame/search/Ammo profiling and notice reconciliation. Compiled bundles require verified readable upstream source and reproducible rebuild outside this repository, not hand editing.

Holds remain: full native gate, all proposed interactions/visual checks, real N100 profiling, asset-specific rights evidence, and complete large-engine/search review. No publication exception was requested. New ports, backend/proxy work, dependencies, decorative replacement engines and month-long background work are outside this delegation.

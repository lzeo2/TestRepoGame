# Delegation 66: card, word and puzzle maintenance audit

## Scope and method

Provider/model actually printed: `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`.
Source baseline: `8c8a055813b35bbd5d8b632423328333b4252d43`. Scope is fifteen
registered games, 68 tracked files, 512,575 logical source bytes. Documentation
only: no runtime edits, new games, registration, deletion, sparse-selection
changes, dependency installs, browser server or push. Main owns design, subjective
UI review, integration, full native gate and publication decisions.

Game text was accessed through `git ls-tree -rlz` and bounded `git show` extraction,
not materialized under Games. All small entry/authored JS/CSS and notices were
read. Sokoban matrices were sampled (first 120 lines); remaining maps were syntax
checked but not human-solved. Binary sprites and SVG artwork were not visually
reviewed. Nonogram's 29,945-byte minified bundle was read for bootstrap, local
fetch paths, GUI/state/input/reset and generator boundaries; solver correctness
was not independently certified and readable build source is not shipped. This
is not a claim of complete engine, gameplay or rights verification.

Historical `docs/audit_batches`, `docs/catalog_parts`, and `docs/wiki/Game-List.md`
were inspected for relevant records. Matching historical playtest paragraphs were
sampled, not every unrelated report read. `sources_7.md` and `sources_8.md` were
read completely. Historical “120 registered” counts are stale against this
baseline's 115 catalog entries. Old Sokoban/Nonogram/Hanoi/Battleship selectors and
Boggle built-game descriptions are superseded by the current ports. Retain that
history; do not convert prior partial test claims into fresh passes.

## Manuals

| ID | Page | Source files / bytes |
| --- | --- | --- |
| 180 | [Blackjack](../games/180-blackjack.md) | 4 / 29,452 |
| 181 | [Video Poker](../games/181-videopoker.md) | 4 / 38,681 |
| 182 | [Yahtzee](../games/182-yahtzee.md) | 4 / 20,149 |
| 184 | [Go Fish](../games/184-gofish.md) | 2 / 27,151 |
| 185 | [War](../games/185-war.md) | 2 / 14,619 |
| 186 | [Word Search](../games/186-wordsearch.md) | 2 / 22,353 |
| 188 | [Word Ladder](../games/188-wordladder.md) | 2 / 24,795 |
| 190 | [Word Scramble](../games/190-wordscramble.md) | 2 / 34,696 |
| 191 | [Darts 501](../games/191-darts501.md) | 2 / 24,565 |
| 193 | [Mahjong Lite](../games/193-mahjonglite.md) | 2 / 20,312 |
| 195 | [Sokoban](../games/195-sokoban.md) | 12 / 105,097 |
| 196 | [Tower of Hanoi](../games/196-towerofhanoi.md) | 5 / 15,303 |
| 197 | [Nonogram](../games/197-nonogram.md) | 16 / 62,483 |
| 198 | [Battleship](../games/198-battleship.md) | 6 / 60,068 |
| 199 | [Boggle](../games/199-boggle.md) | 3 / 12,851 |

## Priority findings

All statuses below are **open, static source review only**. Repro columns are
recommended native/deterministic checks, not interactions run by this worker.
Matching function/property anchors are used instead of fragile minified line numbers.
Minimal fixes are proposals requiring a separate runtime lease.

| Severity | Exact source path / anchor | Impact and recommended repro | Minimal root fix |
| --- | --- | --- | --- |
| HIGH | `Games/WordScramble/index.html`, `arakter: "network"`, `renderRound` | Random sample has no `word`; force that record to reproduce a throw | Correct record and validate the complete word schema before sampling |
| HIGH | `Games/VideoPoker/script.js`, `dealNewHand`, `replaceDraw` | Deal 50 with 10-40 balance can make balance negative | Validate affordability at Deal; clamp wagers after settlement |
| HIGH | `Games/Yahtzee/script.js`, `upperSec`, `cellScore`, `checkUpperBonus` | Last category awards upper bonus after terminal total/outcome | Finish the scoring transaction before evaluating the session |
| HIGH | `Games/GoFish/index.html`, constructor `getItem('difficulty')` | Denied storage prevents table startup | Catch optional preference read with default difficulty |
| HIGH | `Games/Boggle/index.html`, initial `getItem('boggleBest')`, `commitWord` | Denied storage aborts startup or score feedback | Guard reads/writes and validate finite nonnegative best |
| HIGH | `Games/Darts501/index.html`, delayed `endTurn`, `reset` | Third-dart/bust callback advances a freshly reset game | Cancel callback or validate session token |
| HIGH | `Games/MahjongLite/index.html`, `removePair`, `startGame` | Pair callback modifies new board after immediate Restart | Invalidate delayed removals by session identity |
| HIGH | `Games/MahjongLite/index.html`, `removePair` | Same pair can be submitted twice before 190 ms removal | Remove/lock logical pair synchronously in shared transaction |
| HIGH | `Games/Battleship/main.js`, delayed `computerTurn`, `startGame` | Restart after miss lets old AI shoot new board | Track/cancel both AI delay sites and check AI turn/session |
| HIGH | `Games/Sokoban/index.html`, `Trygo` bounds | p1 equal-to-length and unguarded p2 can access missing rows | Validate both coordinates before matrix reads |
| HIGH | `Games/Sokoban/index.html`, `Trygo` destination blocker | Box can overwrite initial box-on-goal value 5 | Treat 3 and 5 consistently as occupied box cells |
| HIGH | `Games/Sokoban/index.html`, `imgPreload`, early `go`/`NextLevel` | Image failure hangs initialization; early controls access absent state | Ready/error gate shared by movement/navigation and preload errors |
| HIGH | `Games/TowerOfHanoi/script.js`, `isValidMove` | Drag lower disk to empty peg bypasses top-disk rule | Validate game-owned source/top disk in shared function |
| HIGH | `Games/TowerOfHanoi/style.css`, `.tower` `column-reverse` | Rendered pile reverses logical top convention | Align visual order with existing first-child top model; native screenshot pending |
| HIGH | `Games/Nonogram/dist/nonogram.min.js`, template `load`, `fetch(e.path)` | Missing template leaves enclosing promise unresolved/GUI blank | Repair returned promise/error handling in verified readable upstream source |
| MEDIUM | `Games/Blackjack/script.js`, `doubleDown`, keydown | D bypasses hidden action rules after Hit/Split | Validate double eligibility in shared action |
| MEDIUM | `Games/Blackjack/script.js`, `checkBrokeState` | Bankruptcy callback can reappear after reset | Cancel or recheck current session/chips |
| MEDIUM | `Games/Blackjack/style.css`, `body` flex direction | Header/table siblings arranged in default row; mobile layout risk | Inspect native screens, then column layout if confirmed |
| MEDIUM | `Games/VideoPoker/script.js`, `changeGameType` | Paid hand can switch payout/evaluation before Draw | Lock selection or snapshot rules per hand |
| MEDIUM | `Games/VideoPoker/script.js`, delayed overlays | Reset may show a prior-session result | Invalidate timeout callbacks |
| MEDIUM | `Games/VideoPoker/script.js`, theme storage | Denied optional theme storage throws | Catch preference persistence independently |
| MEDIUM | `Games/Yahtzee/index.html`, `.page-head p` | “Six or more ones” misstates subtotal bonus | Describe upper aggregate 63 threshold |
| MEDIUM | `Games/Yahtzee/script.js`, `yahtzeeExtend`, `cellScore` | Bonus row consumes rolls but no base round | Decide/document rules and integrate bonus into scoring turn |
| MEDIUM | `Games/GoFish/index.html`, `#fullDeck`, `#addCardClickListener` | Focusable draw card has aria-hidden ancestor | Expose active deck control, not hidden ancestor |
| MEDIUM | `Games/GoFish/index.html`, `#popup.oncancel` | Escape cannot decline confirmation | Allow decline cancellation where appropriate |
| MEDIUM | `Games/WordSearch/index.html`, pointer handlers | Cancelled drag leaves active selection state | Shared pointercancel/lost-capture cleanup |
| MEDIUM | `Games/WordSearch/index.html`, `.cell` clamp | Targets as small as 38 px | Measured zoom/scroll layout retaining 44 px targets |
| MEDIUM | `Games/WordLadder/index.html`, submit/`commit` | IME Enter may submit partial composing word | Guard shared submission while composing; native IME repro pending |
| MEDIUM | `Games/WordScramble/index.html`, `scramble` | Unbounded retry fails for future identical-letter word | Bounded shuffle and validated nonidentical fallback |
| MEDIUM | `Games/Darts501/index.html`, `buildBoard`/`throwDart` radii | Visually outside 180-190 annulus scores double | Share drawing/scoring ring constants |
| MEDIUM | `Games/MahjongLite/index.html`, `fitBoard`, `.tile` | Phone scaling shrinks faces far below 44 px | Measured mobile zoom/selection treatment |
| MEDIUM | `Games/Sokoban/index.html`, completion `setTimeout` in `go` | Repeated finish inputs can queue multiple level advances | Completion lock and transition session guard |
| MEDIUM | `Games/TowerOfHanoi/index.html`, `.disk`/`.tower` | No keyboard puzzle movement | Semantic focus/activation calling existing move function |
| MEDIUM | `Games/TowerOfHanoi/style.css`, 260 px tower/44 px disks | Eight disks exceed fixed peg height | Flexible measured layout and reduced-motion glow |
| MEDIUM | `Games/Nonogram/dist/nonogram.min.js`, `createRandom` retry | Synchronous unbounded generation may freeze UI | Bounded/recoverable generation from readable source |
| MEDIUM | `Games/Nonogram/index.html`, `updateScore` | Solved class checked on outer div instead of table | Observe actual table/engine state after draw completes |
| MEDIUM | `Games/Nonogram/index.html`, viewport; templates/cells | Zoom blocked, cells have no keyboard traversal | Allow zoom and semantic keyboard grid/mode controls |
| MEDIUM | `Games/Battleship/logic.js`, `placeShipsRandomly` | Exhausted attempts silently omit a ship | Verify complete fleet; bounded full-layout retry/failure |
| MEDIUM | `Games/Battleship/main.js`, document keydown | Enter on focused Restart fires aim instead | Respect native controls or scope keys to grid |
| MEDIUM | `Games/Battleship/main.js`, `renderBoard`, message log | No coordinate/status semantics or live announcement | Accessible roving grid/status shell |
| MEDIUM | `Games/Boggle/index.html`, `gen`, `typed` | New board retains old typed buffer | Reset all round input state centrally |
| MEDIUM | `Games/Boggle/index.html`, document keydown | Enter intercepts New board; Backspace edit not consumed | Respect native controls and consume game-edit keys |
| MEDIUM | `Games/Boggle/index.html`, pointer listeners | Cancelled touch selection remains active | Pointer capture/cancel cleanup |
| MEDIUM | `Games/Boggle/index.html`, grid/typed entry | Visual-only typing and cell semantics | Labeled input/live feedback or keyboard grid |
| LOW | `Games/War/index.html`, terminal return in `act` | Decisive winning round excluded from count | Account completed round before terminal return |
| LOW | `Games/GoFish/index.html`, `#shuffle` | Whole-array swaps bias permutations | Shrinking-range Fisher-Yates |
| LOW | `Games/WordLadder/index.html`, graph complexity comment | Bucket pair enumeration not strictly linear | Correct comment before dictionary growth |
| LOW | `Games/WordScramble/index.html`, duplicate word records | Repeated words weight sampling | Confirm intended weighting before deduplication |
| LOW | `Games/MahjongLite/index.html`, layer/hint copy | Five coordinate layers, one highlighted tile disagree with copy | Correct factual instructions |

War, Word Search, Word Ladder, Word Scramble and Darts also have source-confirmed
result-overlay accessibility gaps: no native dialog/focus containment/background
inertness, with some games not even moving focus to Restart. See each manual's
separate MEDIUM finding. Those shell repairs should be small and reviewed with
real keyboard/screen-reader use, not treated as engine redesign permission.

## Provenance and dependency holds

MIT notices are present for thirteen assignments; Word Search has BSD 3-Clause,
Battleship GPL-3.0. Shipped source pins exist for eleven games. Go Fish, War,
Word Search and Word Ladder have named upstream URLs/licenses but no revision in inspected
source evidence. Missing pins remain unknown. Nonogram lacks a named author in
its shipped license; do not invent one. Sokoban sprite/level-specific chain of
authorship and Boggle dictionary curation were not independently established.
No ROM/emulator/protected Character AI/Eagler content is in this assignment.

No runtime third-party load was identified in inspected sources. Nonogram's five
same-origin template fetches and local stylesheet are dependencies, not evidence
of remote network use. Its template innerHTML and Mahjong's fixed face markup
were traced to local/static data; neither is labeled XSS just because innerHTML
appears. No secrets were found in the inspected assignment sources. No network
source retrieval or license expansion was performed.

## Verification actually run

Git-blob JavaScript was passed on stdin to `node --check`, including inline entry
scripts, Sokoban map data and Nonogram bundle. Output:

```text
PASS: 18 JavaScript units parsed from Git blobs; catalog 115 unique IDs; assigned source bytes 512575
```

Catalog parsing confirmed 115 entries and globally unique IDs; assigned catalog
entries and URLs were checked against Git, not filesystem presence. Documentation
identity markers, all nine exact section names, relative links and source entry
blob IDs were checked separately before commit. Output:

```text
PASS: 15 markers, 135 required sections, 15 baseline entry blobs, assigned catalog URLs, relative links; source files 68
Owned docs: 16 files; 97924 bytes; minimum/maximum/median page bytes: 5223 5900 5477
```

The byte total above was measured before adding this evidence block; final commit
size is reported separately. A small rerunnable section/identity check requires
no game checkout:

```sh
python3 -B - <<'PY'
from pathlib import Path
import re, subprocess
batch = Path('docs/maintenance/audits/games-66.md')
heads = ['Identity and status', 'Implementation map', 'Gameplay and controls',
         'State and persistence', 'Dependencies and provenance', 'Audit findings',
         'Safe iteration', 'Verification', 'Future outlook']
links = re.findall(r'\]\((\.\./games/[^)]+)\)', batch.read_text())
assert len(links) == 15
for link in links:
    text = (batch.parent / link).read_text()
    assert re.findall(r'^## (.+)$', text, re.M) == heads
    directory = re.search(r'<!-- maintenance-game: (Games/[^>]+) -->', text)[1]
    subprocess.run(['git', 'cat-file', '-e', 'HEAD:' + directory + '/index.html'], check=True)
print('PASS: 15 game identities and 135 sections')
PY
```

`git diff --check` applies to owned docs only;
shared-tree status can include other workers' work.

**Native/browser sessions: 0. Screenshots: 0. Full-catalog smoke gates: 0.**
No gameplay, accessibility, hardware performance or release pass is implied by
syntax/doc checks. Main must run the unchanged full native gate serially before
any publication decision; no push is requested or authorized.

For reproducible source checks without checkout, use:

```sh
git show HEAD:Games/Battleship/logic.js | node --check
git show HEAD:Games/Nonogram/dist/nonogram.min.js | node --check
git ls-tree -rlz HEAD Games/Sokoban
```

Future native verification should serve an authorized bounded extraction over
local HTTP, then exercise each manual's recommended controls, terminal states,
restart races, denied storage and accessibility cases. Do not change sparse
selection in a worker; do not use old screenshots as proof of current play.

## Month refurbishment order

1. Week one: repair data crash, action/score invariants, source pins, missing
   readiness/error states and stale session callbacks; add a small deterministic
   regression per authorized authored logic patch.
2. Week two: native keyboard/modal/grid accessibility, measured mobile targets,
   reduced motion and accurate instructions, with desktop/mobile screenshots.
3. Week three: target-hardware profiling for Nonogram generation and Mahjong
   matching/layout; source-readable upstream repair where needed. No hand-edited
   compiled bundles or new build dependencies in this repository.
4. Week four: rerun interaction and full release gates, document remaining rights
   and hardware holds, and integrate only owner-approved changes. New 3D work is
   research/planning here, not permission for a new game or background month-long
   implementation promise.

Storage began and remained approximately 2.4 GiB free. Assignment source text and
scratch reports stayed bounded below 2 MB; committed manuals/audit are sub-MB.
Logical owned-document sizes are recorded in the completion check rather than
claiming exclusive shared-filesystem storage deltas.

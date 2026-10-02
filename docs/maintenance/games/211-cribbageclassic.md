# Cribbage: maintenance manual

<!-- maintenance-game: Games/CribbageClassic -->

## Identity and status

Registered ID 211, category `card`, featured `false`. Entry: `Games/CribbageClassic/index.html` ([open source](../../../Games/CribbageClassic/index.html)). Source baseline `8c8a055`; 89 tracked files, 993,758 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: inspected `computerPlayer.js`, `menus.js`, `scoreboard.js`, `settings.js` in bounded views; entry/bootstrap and selected `game.js` state/input/reset sections plus complete function-anchor listing were reviewed. The 163 KB game state/animation/scoring engine, 56 KB HTML templates and four CSS files were not reviewed line-by-line in entirety; no full-engine certification. Binary card/board art was inventoried only.

Entry loads four local CSS files and menus/settings/game/scoreboard/computer scripts. `window.onload` initializes background, `new Game`, and `StartAGame('Standard')`; body resize calls `game.OnResizeWindow`. `Game` creates card views under `#cards_region`. `dragMouseDown/elementDrag/closeDragElement` route low-card selection, crib discards, pegging and manual counting by `currentMoveStage`. Scoreboard supports full peg geometry and compact fallback. Menus expose tutorial, statistics, discard analyzer and hand analysis.

## Gameplay and controls

Select low card to determine first crib, discard two cards and confirm, peg without exceeding 31, then accept/count hands and crib. Game over threshold is score greater than 120. Easy/Standard/Pro use different discard/pegging policies in ComputerPlayer; hints/suboptimal warnings/manual counting/muggins are settings. Menu Start A Game restarts. Mouse click/drag is source-backed. Touch instructions rely on compatibility mouse events; no direct touch/pointer listeners or card keyboard handler were found in the reviewed input path.

## State and persistence

Private Game closure holds hands, crib, current pegging/dead cards, scores, move stage and suboptimal records. No current-match save found. Storage helpers in `settings.js` persist `setting_manual_count_scores`, `setting_muggins`, `setting_hints`, `setting_warn_suboptimal`, `setting_fast_count`, `setting_board_color`, `setting_card_color`.

Statistics families `stat_wins_/losses_/skunks_`, `stat_pegging_count_/points_`, `stat_hands_count_/points_`, `stat_cribs_count_/points_` use Easy/Standard/Pro suffixes; `stat_suboptimal_history` is comma-separated. Menus reset only those stats. Numerous animation setTimeout calls are not globally canceled by StartAGame in the reviewed reset.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/jeffbcole/jeffbcole.github.io, revision `9a3fd29a25776a232fbb584ff3dd5dd6c35f2628`. Shipped `LICENSE` inspected: Apache-2.0. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit.

## Audit findings

- HIGH conditional robustness, `settings.js::GetSetting/SetSetting/GetStatistic/SetStatistic`: every storage operation is unguarded; `index.html::window.onload` calls settings before constructing Game. Denied storage can prevent playable startup. Minimal root fix is guarded typed defaults in the shared helper, not catches in each menu.
- MEDIUM, `index.html` head: viewport metadata absent, while fixed how-to right inset is 220px. Native 360px phone layout requires inspection; add viewport and responsive shell without altering card art.
- MEDIUM, `menus.js::InitializeAllPlays` played-card highlighting repeats the same ordered comparison on both sides of OR, failing swapped-pair recognition. Fix the second branch to compare reversed cards; use a two-card identity fixture.
- MEDIUM, `game.js::StartAGame` versus scheduled animations: reset race is a source-backed risk, not reproduced. Validate starting another game during deal/pegging before adding a session token across callbacks.

## Safe iteration

Use authored settings/input/menu boundaries, retaining scoring and tutorial content. Preserve Apache-2.0 license and provenance evidence; credits' byte-identity claims are historical, not reverified network diffs. Do not replace upstream cards, compile a new engine, or clear all origin storage. Lifecycle changes must preserve both full and compact scoreboards and analyzer access.

## Verification

Recommended native sequence: finish discard and pegging, accept scores, complete a 121-point match, open analyzer/statistics/tutorial and start another difficulty. Test storage denial, swapped discard highlighting, rapid new-game during animations, touch discard and keyboard-only operation. This worker ran no native check; rule-scoring coverage remains partial.

Actually run: Git blob inventory and `node --check` via standard input for 6 external/inline script units, 6/6 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/CribbageClassic/computerPlayer.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: storage helpers and reset race reproduction. Week 2: viewport/keyboard card path, focusable menu templates and visible confirmation feedback. Later: small scoring fixtures for 29 hand, flush/crib distinctions and pegging runs, then benchmark Pro analyzer work. Keep the extensive upstream learning features rather than a simplified replacement.

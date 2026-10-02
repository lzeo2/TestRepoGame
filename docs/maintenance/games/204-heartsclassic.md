# Hearts Classic: maintenance manual

<!-- maintenance-game: Games/HeartsClassic -->

## Identity and status

Registered ID 204, category `card`, featured `false`. Entry: `Games/HeartsClassic/index.html` ([open source](../../../Games/HeartsClassic/index.html)). Source baseline `8c8a055`; 36 tracked files, 213,581 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: inspected entry, CSS, AMD rule/UI/brain modules and local loader configuration through bounded views. Simulator/search correctness is partial, not exhaustive. jQuery/RequireJS vendor internals were not fully reviewed. Entry `data-main='js/main'` loads RequireJS. `main.js` maps jQuery to the local 2.0.3 file, attaches the fragment to `#game-region`, lays out and starts `game.newGame`.

`game.js::proceed/next` runs prepare, distribute, start, passing, confirming, playing, endRound and end. `rules.getValidCards` enforces lead/follow restrictions; `board.desk.score` chooses the leading-suit winner; `Waste.addCards` assigns penalties. `Human` exposes selection/confirmation through generated `#play-button/#pass-arrow`; `Ai` delegates to Simple or worker-backed brains. `BrainWorker.js` uses local `importScripts('lib/require.js')` and receives init/watch/confirm/decide messages.

## Gameplay and controls

Deal starts on load. Select three cards, use the pass arrow, confirm received cards, then select a legal card and Go. The two of clubs leads. Hearts carry one penalty and queen of spades thirteen; shooting all 26 penalizes opponents. Lowest score ranks first when anyone reaches 100. Continue advances deals and Restart begins again. Passing cycles three directions, with no source branch for a no-pass fourth deal. Click/tap is bound; card keyboard activation is not implemented.

## State and persistence

Players own rows, waste, round and accumulated scores. `rounds/status/currentPlay/played/heartBroken/nextTimer` belong to the game module. Settings keys are generic `names` and `levels`, parsed with catches but without shape/range validation. `config.sync` writes without catch. Difficulty 2 uses McBrain, 3 PomDPBrain, 4 a two-second PomDP budget. New games clear `nextTimer` and UI events, but several animation/deferred timers are independent.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/yyjhao/html5-hearts, revision `501fffd98964ff1a543020be09e7efe4cc7c8f6a`. Shipped `LICENSE` inspected: BSD two-condition style with additional FreeBSD disclaimer. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit.

## Audit findings

- HIGH, `js/AsyncBrain.js::terminate`: rejects pending deferreds but never calls `this.worker.terminate()`. `game.js::initBrains` creates fresh workers each deal/new game; old worker processes remain. Recommended repro: repeatedly restart with levels 2/3 and count workers. Minimal fix: terminate owned worker, detach callbacks and null pending deferreds.
- HIGH, `js/domBinding.js::PlayerDisplay/setName` and `js/main.js` Settings rendering: saved/user names reach `innerHTML`. Use `textContent` at both sinks and validate saved arrays; no remote input path established.
- MEDIUM, `style.css::#control-region` and other `/*flattened*/` declarations contain malformed `background-image:background-color:rgba(0;`. Replace only affected declarations with valid solid backgrounds after computed-style inspection.
- MEDIUM, `config.js` accepts truthy malformed settings and unrestricted levels; out-of-range difficulty can leave brain null and crash initialization.

## Safe iteration

Keep rule and AI modules separated. Fix lifecycle in `AsyncBrain`, all name sinks at DOM binding/settings, and validation at config hydration. Do not alter search heuristics to hide worker leaks. Preserve BSD-style license and vendor notices. Capture existing settings before a key namespace migration; avoid clearing all origin storage.

## Verification

Recommended native sequence: complete transfer, legal/illegal follow-suit play and a deal; Continue; exercise all four difficulty levels; restart during a pending decision. Inspect worker count and Settings backgrounds, keyboard-only card selection, corrupt `names/levels`, storage denial and minimum width. No native result was produced here.

Actually run: Git blob inventory and `node --check` via standard input for 27 external/inline script units, 27/27 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/HeartsClassic/js/Ai.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: worker disposal and plain-text names/settings guards. Week 2: card/pass keyboard semantics and valid shell CSS. Later: verify no-pass convention with upstream, first-trick penalties and simulator parity using bounded rule fixtures; profile search before adding stronger AI. Retain gameplay rather than redesigning the engine.

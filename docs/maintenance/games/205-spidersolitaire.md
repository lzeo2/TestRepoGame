# Spider Solitaire: maintenance manual

<!-- maintenance-game: Games/SpiderSolitaire -->

## Identity and status

Registered ID 205, category `card`, featured `false`. Entry: `Games/SpiderSolitaire/index.html` ([open source](../../../Games/SpiderSolitaire/index.html)). Source baseline `8c8a055`; 6 tracked files, 237,253 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: read entry/glue, compiled CSS, credits/license, and the game/store/UI tail of `assets/index-Bj0xLQJV.js`. React scheduler/DOM internals in the earlier large bundle were not fully human-reviewed. No authored React source or source map is shipped here. Entry imports one local ESM bundle and stylesheet, mounting React at `#root`.

Reviewed compiled anchors: `Kv/kv/Wv` construct a seeded 104-card one-suit deal; `Af/kr/Yr` check sequences/legal moves/hints; `$v/Fv/Iv` implement move/deal/undo; `It` exposes store operations, and `Sy` wires UI. Symbols are build-specific, not stable author APIs. Wrapper MutationObserver `tag` adds tab stops to `.card-face`, `.stock`, `.foundation__slot`, then converts Enter/Space into clicks.

## Gameplay and controls

The source uses eight copies of ranks 1–13, all rendered as spades, not selectable suit counts. It starts with ten columns, top cards face up and 50 stock cards. A legal sequence moves to a column one rank higher or an empty pile. Completed descending king-to-ace runs add foundations; eight foundations wins. Move/deal costs one score point; a completed run adds 100. Undo also costs a point and increments moves. Actual card selection is click/tap, with rapid repeated clicks for auto-move; stock is double-click, despite wrapper instructions advertising general keyboard play.

## State and persistence

Zustand-like persisted store key is `spider-solitaire-storage`, schema version 8. Saved fields include tableau, stock, foundation, moves, score, seed, history, timer, pause/play flags, theme/card back and aggregate records. `ey` merges hydrated state, resets won games and pauses resumed play; it checks outer arrays but does not deeply validate card objects. `Sy` starts a one-second repaint interval while playing and returns a clearInterval cleanup. History stores whole snapshots without a visible cap.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/lklynet/spider-solitaire, revision `d4478182a93da6b02ab9f590bb2f7409461077a4`. Shipped `LICENSE` inspected: MIT. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit.

## Audit findings

- HIGH, `index.html` keyboard glue versus bundle `sy` stock component: glue dispatches `.click()`, but stock only has `onDoubleClick`. Keyboard activation cannot deal stock, preventing complete keyboard play. Recommended repro: Tab to stock and Enter once or repeatedly; stock count stays unchanged. Minimal fix: use an explicit authored stock activation route compatible with upstream, not indiscriminate synthetic double-clicks on every element.
- MEDIUM, bundle `hy` empty `.tableau__pile` is clickable but absent from wrapper tab-stop selector. Keyboard cannot choose an empty column; foundation tab stops are inert. Tag actual destinations and label them.
- MEDIUM, persisted `ey/ly`: shallow array checks allow malformed card records into render/sequence logic. Validate at upstream hydration and cap history after measurement; do not hand-edit bundled state machinery.

## Safe iteration

Wrapper focus/activation and safe CSS overrides are bounded patch points. For logic fixes, obtain the pinned source in a separate approved workflow and rebuild reproducibly outside this repository; preserve bundle filenames until both import paths update together. Do not edit the compiled React internals. Preserve existing saves when migrating schema and retain MIT attribution.

## Verification

Recommended native sequence: click-select/move, double-click stock, undo and same-seed restart; compare new-game seed; pause/reload and resume timer. Keyboard-test occupied and empty columns plus stock. Inject malformed saved card records into a disposable context only, and inspect modal focus/Escape behavior. Bundle syntax passing is not React or gameplay certification.

Actually run: Git blob inventory and `node --check` via standard input for 2 external/inline script units, 2/2 PASS; Spider bundle uses `--input-type=module`. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/SpiderSolitaire/assets/index-Bj0xLQJV.js" | node --check --input-type=module
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: truthful controls and working stock/empty-column keyboard path. Week 2: semantic labels, modal focus and 44px toolbar targets. Later: upstream-source hydration tests, history-size limits and save migration fixtures. Multi-suit expansion and a React rewrite are deferred, not authorized.

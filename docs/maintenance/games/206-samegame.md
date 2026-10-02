# SameGame: maintenance manual

<!-- maintenance-game: Games/SameGame -->

## Identity and status

Registered ID 206, category `puzzle`, featured `false`. Entry: `Games/SameGame/index.html` ([open source](../../../Games/SameGame/index.html)). Source baseline `8c8a055`; 7 tracked files, 15,044 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: read full readable `samegame.js`; inspected entry inline CSS, credits/license and input glue in bounded views. `samegame1k.min.js` was syntax-checked and inventoried but is not loaded and was not used to certify gameplay. Entry loads readable source first, then input glue. Canvas `#a` is 528x288, with a 20x10 tile board and a bottom status bar.

Block-scoped `state/reset/mark/swap/points/draw` implement the rules. Positive cells are normal, negative marked and zero empty. `canvas.onmousedown` selects a flood-filled group, removes an already marked group, drops tiles, shifts empty columns and scans for remaining moves. Glue preserves that handler as `origDown`, snapshots the result with `getImageData`, and draws a keyboard cursor on top.

## Gameplay and controls

A group needs two or more orthogonally adjacent same-color tiles. The first action marks it; a second action on a marked tile clears it. Score is `(groupSize - 2)^2`, so two tiles score zero. Touch start invokes the mouse handler directly and suppresses compatibility events. Arrows move the glue cursor; Enter/Space activates if focus is body or canvas; N activates the status-bar New region. Game Over appears when no groups remain. There is no separate clearing bonus in this source.

## State and persistence

Board `table`, score `s` and marker count `m` stay inside the source block; `m = -1` marks game over. Glue owns cursor and pixel snapshot only, with no direct board access. No storage, audio, network, timer or animation loop is used. New resets the random board and score; cursor remains at its prior cell. CSS scaling is compensated in both source mouse mapping and glue `toClient`.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/gaborbata/samegame1k, revision `91df2de82549b64c17e5bbba7e28646bfac3c3f1`. Shipped `LICENSE` inspected: MIT. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit.

## Audit findings

- MEDIUM, `index.html` instructions say tap/click to clear, but `samegame.js::canvas.onmousedown` requires selection then confirmation. Recommended repro: activate a fresh group once and inspect Marked/+points with unchanged score. Minimal fix is truthful two-step copy, not removing the upstream preview interaction.
- MEDIUM, `index.html::#a` has no focusable semantics or text equivalent of score/game-over; glue handles page-level keys but does not expose a labeled board to assistive technology. Add a focusable named canvas plus DOM status derived from the existing state boundary.
- LOW, `glue.js::TILE/COLS/ROWS`: duplicated geometry must remain synchronized with source if board size changes. No generic geometry abstraction is needed for the fixed board.

## Safe iteration

Retain the readable engine and upstream scoring. Extend glue, not the unused golfed file, for focus/touch behavior. Do not delete `samegame1k.min.js` without tracked-reference evidence beyond this entry. Avoid snapshot-based cursor changes that overwrite fresh tiles; take snapshots only after the original handler finishes.

## Verification

Recommended native sequence: mark then clear a group with mouse, touch and Enter; verify zero points for two tiles, larger-group score, gravity and column collapse. Use N after Game Over, then test canvas scaled to 360px and keyboard focus. Compare pixels after repeated cursor moves to ensure no board repaint is lost.

Actually run: Git blob inventory and `node --check` via standard input for 3 external/inline script units, 3/3 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/SameGame/glue.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: correct two-step instructions and DOM status. Week 2: focus/labels and distinguish tiles without color alone. Later: a small seeded board fixture for flood fill/gravity and an evidence-backed unused-file decision. No decorative launch screen or alternate scoring mode is proposed.

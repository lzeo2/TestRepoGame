<!-- maintenance-game: Games/FreeCell -->
# FreeCell maintenance

## Identity and status

Registered ID **179**, category `classic`, entry `Games/FreeCell/index.html`. Baseline `8c8a055`; four files, 33,473 bytes. A readable local card engine and string-based DOM renderer implement single-card movement, not standard multi-card supermoves. No current native tests or rights expansion occurred.

## Implementation map

**Source review coverage:** complete HTML, `script.js`, CSS, MIT notice and source record read. No unread vendor/binary engine exists.

HTML calls `App(window)` through its local script. `Deck/Card/encode/decode/distribute/makeGameData` build four cells, four foundations and eight cascades. `Play` creates closure-owned data/history, returning `Automove/Easymove/Move/Undo/Over/Lost/Render` and timing/deck-ID APIs. `checkedMove` is the shared mutation path; validators enforce one cell card, same-suit ascending foundations, and alternating descending cascades. Cascades accept any card when empty.

`Renderer` replaces `<main>` via generated markup and binds its cards/buttons each render. `dom.quick` defaults Auto; Pick mode stores a selected DOM node in `dom.picked`. `tryEasymove` recursively schedules safe foundation moves. `lost` probes legal moves using snapshots then restoration. `App` installs a one-second elapsed display and document keyboard routing.

## Gameplay and controls

Goal: put all 52 cards on the foundations. Auto mode picks an available destination for a tapped top card, then attempts easy foundation moves. A toggles Auto/Pick; in Pick mode select a cell/cascade top and destination. The current functions reject non-top cascade selection, so whole descending runs cannot be moved in one operation. Foundations are not manual click destinations; automatic/easy move handles them.

Tab focuses cards and empty destinations; Enter/Space dispatches their click handlers. U undoes; N opens the native new-deal confirmation dialog rather than immediately dealing. Toolbar Game opens the same dialog. Completed or stuck banners offer New game. No audio exists.

## State and persistence

Play owns card arrays, immutable-card references in snapshots, deck ID, started/ended times and history. No localStorage, URL persistence or storage key is active; deck encoding is an in-memory API retained from upstream. `MoveCount` is history length minus one, not an independent counter. Auto/Pick survives deal changes because it belongs to the renderer DOM. The elapsed interval is never explicitly stopped; it reads `EndedAt` after a win. Auto-move timeout chains capture an individual old game and are not cancelled when a new deal replaces it.

## Dependencies and provenance

MIT `LICENSE` credits Taeber Rapczak. Header and [ingestion evidence](../../catalog_parts/sources_7.md) identify `https://github.com/taeber/freecell`, revision `e1249a7ee78af3034ceab2927c5480615badfd01`. PWA/service worker, sharing and game-ID URL persistence were not taken; keyboard/stuck feedback were added. License contact details are not reproduced in this page; original notices remained untouched. No upstream fetch or fresh asset rights audit occurred.

## Audit findings

- **HIGH, static pointer exception:** `Renderer.addOnEmptyCascadeClicks`, anchor `if (!dom.picked)`: `dom.picked` is always `{}` when nothing is selected, so this guard never returns. Clicking an empty cascade with no selection sets `src` undefined and accesses `src.dataset`. Root fix: use existing `hasPick()` before resolving the selected node, preserving `game.Move` validation.
- **HIGH, static lifecycle race:** `tryEasymove` timeout closures hold an old `game` and can still call its renderer after New game. They can overwrite the displayed new deal while App's keyboard/timer reference points elsewhere. Root fix: cancel/tag auto-move chains per deal at the existing renderer/Play transition.
- **MEDIUM, static focus:** renderer replaces all focused cards on each move without restoring stable location/card focus. Keyboard users can lose their place. Root fix: capture/restore semantic focus through existing card/location metadata.
- **MEDIUM, static end path:** `easymove`, `tops[0].card`, lacks an empty-top guard. After final foundation transfer, another scheduled easy move can throw. Guard empty tops in the shared function before selecting minimum rank.

## Safe iteration

Reuse `hasPick` and shared validators rather than inventing another selection model. Keep snapshots before moves and restoration after legality probes; don't mutate a deal merely to test whether it is stuck. Generated HTML uses internal constrained card values and numeric counters, not arbitrary input; do not label it XSS solely for containing innerHTML. Preserve the license and local-only dependency closure.

## Verification

Actually run: Git/catalog identity and JS syntax checks in [batch 65](../audits/games-65.md); **0 native runs**. [Historical P2a](../../audit_batches/playtest_p2a.md) observed a move and new deal, not empty-column clicks or a finished foundation loop.

Recommended native steps: create empty cascade, deselect and click it, Auto/Pick transitions, top-card restriction, Undo after manual/automatic moves, final card win, New game during easy-move chain, focus retention, both color schemes and 360px overflow. Sparse read: `git show HEAD:Games/FreeCell/script.js`; Main owns browser extraction/full gate.

## Future outlook

Week 1: empty selection/final-top guards and per-deal timer isolation. Week 2: keyboard focus, accessible card labels and stuck-banner reachable Undo. Later: explicit supermove rules only if requested; do not claim existing full FreeCell controls cover them. Saved deals and sharing remain deferred features.

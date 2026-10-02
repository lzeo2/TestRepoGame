# Delegation 61: source audit and maintenance handoff

## Scope and coverage

Source baseline `8c8a055`; actual provider/model `openai-codex/gpt-6.1-sol`. Fifteen registered games documented. Runtime, catalog, licenses, protected Character AI and sparse configuration unchanged. No browser/server was launched, no native screenshots produced, no game added or published. Full loading gate belongs to Main and was not run by this worker.

Reviewed each actual entry and its relevant authored/bootstrap callees using bounded Git-blob text extraction, not a Games checkout. Full authored Snake/Breakout and Alsen entry logic were read. Other pages explicitly identify partial engine coverage: Construct event/runtime data, Run 3 obfuscation, Unity binaries/frameworks, optional Ovo modules and RPG battle/map logic are not fully human-reviewed. Syntax success is not gameplay, provenance or offline certification.

Historical `docs/audit_batches/batch_0.md`, `batch_3.md`, `playtest_0.md`, `playtest_1.md`, `docs/catalog_parts/sources_3.md`, `docs/GAMES.md` and `docs/wiki/Game-List.md` were consulted. Their old 120-game counts and some control/licensing claims are not current facts. Examples: historical Gladihoppers Play overlay is absent now; Chrome Dino BSD-only description conflicts with actual GPL text; Snake Space-pause is absent; Breakout current HTML does not load an external font.

## First-priority findings

All statuses below are static source findings unless explicitly historical. No runtime repair authorized.

| Severity | Path and matching anchor | Impact / reproduction boundary | Minimal root action |
| --- | --- | --- | --- |
| HIGH | `Games/Character AI/Alsen.html`, `addMessage`, `bubble.innerHTML` | User text and name-derived text become HTML. Recommended harmless native markup test; not run. Protected READ-ONLY. | Operator decision first; if approved, safe text rendering at shared sink. |
| HIGH | `Games/ADarkRoom/script/engine.js`, `deleteSave`, `localStorage.clear()` | Restart clears unrelated origin saves/favorites. Recommended sentinel test; not run. | Delete only owned keys, preserve Prestige. |
| HIGH | Same engine, `import64` | Unvalidated decoded text overwrites a working save before reload. | Parse/schema-validate before write, keep rollback backup. |
| HIGH | `Games/StrandedInIsekai/flashRPG.js:1`, `import flash.display.MovieClip;`; entry script tag | Actual parser failure; valid JS engine loads earlier so total unplayability not established. | Remove erroneous runtime tag only when approved; keep archival file. |
| HIGH | `Games/Snake/game.js`, `generateFood()` | Full board cannot produce free cell; rejection loop never terminates. | Completion/free-cell guard before spawning. |
| HIGH | `Games/BreakoutClassic/script.js`, touch-start `loop()` / `resetGame` | Multiple rAF chains can run from first touch and repeated live level changes. | Single owned frame handle/reset scheduling. |
| HIGH conditional transport | `Games/BurritoBison/Build/kongregate_api.js`, `sendEvents()` | Direct protocol-relative Swrve POST bypasses framework URL helper; activation pending native trace. | Guard central reachable SDK transport, not helper regex alone. |
| HIGH historical | `docs/audit_batches/playtest_0.md`, Run 3 JSON error | Frozen canvas, JSON parse at position 152; current reproduction pending. | Capture exact response and stack before smallest data correction. |
| HIGH historical | `docs/audit_batches/playtest_1.md`, Burrito Bison | Idle scene but no verified launch/progress. | Find native tutorial/launch path; do not claim playable from animation. |
| HIGH evidence | `Games/ChromeDino/dino.html`, BSD header; `LICENSE`, GPL Version 2 | Conflicting component/adaptation terms. | Obtain provenance and required notices; no license edits here. |
| HIGH evidence | Construct/Run3/Unity trees | Mirrors/distributor metadata without verified game-wide rights. | Source/asset rights decision, not default MIT. |
| MEDIUM | `Games/Ovo/src/modloaders/util/ovo.js`, `enableClick` | Writes instance flag while disable mutates behavior flag. | Restore same behavior object across all close callers. |
| MEDIUM | Ovo `modloader.js`, `modSettings` and custom-skin migration | Corrupt JSON aborts; custom skins copied to mods branch. | Guard/schema migration and correct destination with backup. |
| MEDIUM | BitLife/Subway entry XHR overrides | Drop all original `open` arguments except method/url. | Preserve argument list, replace only URL. |
| MEDIUM | ADarkRoom `isMobile`/browser redirects | Warning documents referenced by engine absent from tree. | Honest supported-layout feedback or approved route/support fix. |

Additional source-grounded input, reset, accessibility and motion findings are in individual pages. Retained analytics/SDK files are risks requiring dynamic caller tracing; absence from entry tags does not prove inactivity. `eval/new Function` pattern hits in vendors/state helpers were triaged as maintainability/trust boundaries, not automatically called XSS. Intentional mods/cheats were not treated as exploits merely for changing gameplay.

## Per-game handoff

- [Soccer Random](../games/004-soccerrandom.md): Construct main-thread bootstrap, image workers, stub SW.
- [Basket Random](../games/005-basketrandom.md): active `main.f.js`, disabled SW, historical ad error.
- [Volley Random](../games/006-volleyrandom.md): renamed Construct interface and stub SW.
- [Ovo](../games/007-ovo.md): modloader hooks, config migration, input restoration.
- [Run 3](../games/008-run3.md): OpenFL/Lime boundary and historical JSON hold.
- [Snake](../games/009-snake.md): entire authored class, food/input/storage defects.
- [Chrome Dino](../games/010-chromedino.md): Runner input/rAF, browser gate and license conflict.
- [Breakout](../games/011-breakoutclassic.md): loop ownership, powerup/reset and touch callers.
- [Character Alsen](../games/014-character-ai.md): protected renderer/session audit only.
- [Gladihoppers](../games/047-gladihoppers.md): ready/completion bridge and reload semantics.
- [Burrito Bison](../games/048-burritobison.md): asm memory, framework guard versus retained SDK.
- [BitLife](../games/049-bitlife.md): XHR signature and portrait shell boundary.
- [Subway Surfers](../games/050-subwaysurfers.md): lazy constructor alias, ready handshake, alternate loader tree.
- [A Dark Room](../games/051-adarkroom.md): shared save/migration/cooldown and origin isolation.
- [Stranded In Isekai](../games/052-strandedinisekai.md): ActionScript tag, JS title/game-over, touch adapter.

## Checks actually run

Git `ls-tree -rlz` inventory and bounded blob access. Stdin `node --check`: 22 passed, one failed (`flashRPG.js`); three of the passes used `--input-type=module` for Ovo authored modules. Scripts checked include three active Construct main scripts, Run3 bundle, four Unity loaders, retained Kongregate SDK, Snake/Breakout, ADR engine, authored Unity helpers/progress, RPG engine/map/quiz and Ovo modloader/ovo/hooks. Failure output: `SyntaxError: Cannot use import statement outside a module`. This is syntax-only, no execution; inline entry scripts and every optional vendor were not all parsed.

Owned-page assertions validate all 15 identity markers, nine exact SCOPE headings, catalog IDs/entries and tracked entry existence. `git diff --check` is the whitespace check; native counts are zero. These checks do not bypass Main's unchanged full-catalog gate or its subjective desktop/mobile review.

## Month priorities and holds

1. Week one: protected renderer decision, save isolation/import safety, food termination, parser-tag and loop defects, plus rights evidence. Implement only with explicit runtime assignments and one bounded regression per shared root fix.
2. Week two: controls verified from actual menus, semantic keyboard/touch controls, loader errors and reduced motion. Keep compiled art/physics intact.
3. Week three: source-first lightweight 3D research belongs to Main; no new game is approved by this documentation. Resolve upstream pins/code/assets and performance before additions.
4. Week four: real-device profiling, save migration/rollback and native long-progression tests. Do not convert prior canvas-change evidence into completion claims.

Known holds: no current native interaction/offline trace; partial compiled-engine review; unresolved game/asset rights; protected Alsen cannot be fixed here; source parse failure remains; historical Run3/Burrito play defects unresolved. No push/release decision is made by this worker.

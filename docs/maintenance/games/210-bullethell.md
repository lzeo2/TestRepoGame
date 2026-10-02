# Bullet Hell: maintenance manual

<!-- maintenance-game: Games/BulletHell -->

## Identity and status

Registered ID 210, category `action`, featured `false`. Entry: `Games/BulletHell/index.html` ([open source](../../../Games/BulletHell/index.html)). Source baseline `8c8a055`; 28 tracked files, 589,230 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: inspected entry/CSS, `scripts/main.js`, `util.js`, class and template sections in bounded source views. Collision/rendering helpers and all boss-pattern branches were not exhaustively reviewed. Local `scripts/lib/p5.min.js` was syntax-checked, not human-reviewed in entirety. Font binary was inventoried, not inspected. Ordered defer tags load p5, model/data templates, entity subclasses, then main. p5 invokes `setup/draw`; no extra engine bootstrap is needed.

`Entity/Ship/Player/Bullet/Enemy/Boss` share movement/collision/cooldowns. `applyTemplate` copies local configuration/methods; `loopOver` removes dead entities and calls death hooks. `LEVEL` defines six levels, `BOSS` has two named multi-stage fights, and `WEAPON` basic/dual/triple patterns. `setup` creates a 600px canvas in `#game`; `status` fills `#level/#score/#scoremult`, and `showNotice` updates live `#notice`.

## Gameplay and controls

Arrows/WASD move; Z/B fire; X/N slow time; C/M clears bullets with a bomb; P pauses. Mouse hold/drag moves toward pointer and fires. Mobile support relies on p5 mouse emulation and the added `mouseIsPressed` path, not dedicated authored touch callbacks. It starts immediately; player death automatically reloads current level, boss death advances. F/G/H/T/Y toggle debug/graphics options. These local mechanics are not network cheats.

## State and persistence

Globals own current level/checkpoint score, entity arrays, bombs, cooldowns and pause. No persistent save exists. `resetGame` initializes level zero; `reloadLevel` resets entities/powerups and restores `levelScore`, but does not reset scoreMult. `loadLevel` advances only when `LEVEL[level+1]` exists. `dt` is 1 per frame or 0.4 slowed, not elapsed time. Notice owns a cancelable 2.5-second timer. Entity cleanup is explicit through `loopOver`.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/selenebun/bullethell, revision `75173f8c37868ac7f30b886da6d28560e8e4418b`. Shipped `LICENSE` inspected: MIT. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit.

## Audit findings

- MEDIUM, `scripts/main.js::loadLevel/draw` and `template/levels.js::LEVEL[5]`: exhausting final level has no next-level or completion branch. After the last spawn resolves, no final outcome appears. Recommended repro: finish level six normally; minimal fix is an explicit terminal completion state at loadLevel, preserving level/checkpoint logic.
- MEDIUM, `index.html` lacks viewport and `main.js::setup` fixes width 600; CSS has a side-by-side sidebar and no responsive canvas scaling. Phone layout/touch coordinate reliability is unverified. Fix viewport/layout first, then pointer mapping together.
- MEDIUM evidence gap, `fonts/SourceCodePro-Regular.ttf`: game MIT notice is present but no separate font license file is in this tree. Resolve component-specific font terms rather than assuming MIT covers it.
- LOW, `main.js::dt`: frame-count timing changes speed with FPS. Profile before changing the engine tick contract.

## Safe iteration

Retain local p5 and template/class load order. Patch completion at the shared level transition, not each enemy. A responsive canvas needs p5 coordinate parity. Do not overwrite MODEL art wholesale for shell style, remove consumed font without review, or edit the vendor bundle. Preserve MIT game notice and independently gather dependency/font notices.

## Verification

Recommended native sequence: move/fire, collect a weapon, bomb/slow/pause, die and confirm checkpoint restoration, defeat both bosses and reach the last level. Compare touch and mouse while near sidebar. Measure low-graphics G mode and frame timing on real hardware. No gameplay or font-rights pass is asserted.

Actually run: Git blob inventory and `node --check` via standard input for 23 external/inline script units, 23/23 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/BulletHell/scripts/class/boss.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: final-level outcome and font notice evidence. Week 2: viewport/responsive shell plus explicit touch pause/bomb/slow affordances. Later: elapsed-time or fixed-step conversion only with collision/pattern regressions and actual N100 measurements. Do not invent new levels to mask missing completion.

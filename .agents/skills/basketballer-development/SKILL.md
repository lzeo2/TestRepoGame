---
name: basketballer-development
description: Develop and verify the existing original StealBasketballer preview, keeping economy, match rules, presentation and native evidence separate.
---

Read repository `AGENTS.md`, `docs/CODE_QUALITY.md`, the maintenance index,
`docs/maintenance/games/246-stealbasketballer.md`, the game's
`PORT_CONTRACT.md`/`CREDITS.md` and the latest verification receipt. Check actual
Git source/inventory; old native diagnostics and mockups are dated evidence.
This is the existing original project, registered as 246 after the owner
reported its missing site listing. Do not allocate a second ID, modify Footballer
or migrate its saves. Follow the current user's push/merge
authorization; these checks do not grant new registration or identity rights.

There is no build step or package installation. Keep dependencies local and raw
artifacts outside the repository. Check disk/sparse selection before expanding
the narrow game checkout; restore it afterward. Never touch protected games,
bundled portal code, proxy policy or smoke filters. When authorized to delegate,
use bounded disjoint paths and exclusive commit windows.

State owners:

- `game.js`: validated isolated saves, economy, recruits, training, NPC theft and
  actual rewards. Only `steal-basketballer:v1` and its companions are accessed.
- `match.js`: seeded 50ms steps, ten players, possession/rules and score/result.
- `court-config.js`: court-local feet, 94 by 50, rim X41.75/Y10, ball .4.
- `world.js`/`court-view.js`/`actors.js`: presentation and collision adapters;
  names must not choose likenesses. Preserve bounds/rims, resource budgets and disposal.
- `camera-rig.js`, `stadium-view.js`, `officiating-view.js`, `stadium-audio.js`:
  bounded presentation only; smooth target and position, fit the venue across
  aspects, keep officials outside play and release all owned resources/voices.
- `app.js`: the sole RAF, actual input, active-time clock, modes, menus/audio.
  Update live nodes without recreating focused controls. No diagnostic state grants.

Run from the repository root after a source change:

```sh
node Games/StealBasketballer/tests/fixture.mjs
node Games/StealBasketballer/tests/match.mjs
node Games/StealBasketballer/tests/world.mjs
node Games/StealBasketballer/tests/actors.mjs
node Games/StealBasketballer/tests/camera.mjs
node Games/StealBasketballer/tests/stadium.mjs
node Games/StealBasketballer/tests/officiating.mjs
node scripts/check_sports_stadium_progression.mjs
node --experimental-vm-modules scripts/check_basketball_boot.mjs
```

Also parse touched authored JS, run Python AST checks for tooling and
`git diff --check`. The boot fixture uses real modules/handlers with boundary
doubles: it is not a native rendering or full-match test.

For requested browser evidence, coordinate one shared slot and use the installed
system browser, no downloads. `scripts/test_basketball_polish.py --help` documents
the bounded complete pass, `--followup` for normal rest/restart and phone, and
`--phone-only` for focused touch/layout/visual review. Pass a fresh external
artifact directory. Keep actual input, the real 45s rest, natural affordable
signing and the normal 90s/3x quarter contract. No save seeds, cash/roster grants,
clock acceleration, forced clicks or error filtering as positive proof.
For the sports continuation, `scripts/test_sports_presentation.py` batches actual
desktop/phone input, one normal complete match/reward/reload, both upgrade panels,
and explicitly labeled World-only tier fixtures. Fixture tiers grant no Game
progression and never establish earned upgrades. Offline generated audio is a
waveform check; retain the sample and label native audition separately.

Record actual phase results and source hashes. Retain failure statuses and
explain repaired harness assumptions. Separate pure logic, live milestones,
screenshots, native sandbox checks and hardware performance. Commit source
milestones, reconcile the manual/inventory, then run its checker and sitemap.
Do not repeat whole-match tests for a visual-only follow-up already covered by
a smaller normal-input pass.

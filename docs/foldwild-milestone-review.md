# Foldwild M1 mechanical review: delegation 49

Provider/model printed at startup: `PI_PROVIDER=openai-codex`,
`PI_MODEL=gpt-6.1-sol`. Owned changes are only this report and
`scripts/test_foldwild_milestone.py`. All game, asset, catalog and other-worker
files were read-only. No game addition, registration, push or publication.
Foldwild remains the existing authorized original RPG, not an ingested new port.
The registered catalog remains 115 games; Foldwild is unregistered.

## Frozen source and method

Native execution waited for core commit `ae8f371`, after economic fixes
`2400d6d` and `9c0d827`. The check imports actual shared native-input helpers
from the committed core check, not an alternate entry or mocked module. It
serves the repository on port 8799; browser/server cleanup is in `finally`.
Positive progression uses normal keyboard, click/tap and real CDP touch input.
The deep-frozen snapshot is read-only; no positive save fixtures, RNG writes,
position grants, debugger cheats or state mutations were used.

All eight game JS files plus HTML/CSS were hashed before and after each run.
Both native runs reported `source_unchanged: true`. Entry SHA-256:
`e75a12e84fffdb84daf2baa1a0f782f06ff8dc35d7c969cd42755e9ae440ed8b`.
Complete hash/budget/request evidence is in the temporary QA `result.json`.

## Native built-and-verified loop

- Seed 1, Cindupp starter: 90 Marks, 8 kites; real village/NPC/creature models.
- Route to merchant at (4,16), without teleporting. Buy one kite: 78 Marks,
  9 kites. Sell one of two patches: 84 Marks, one patch. Buy badge: 64 Marks.
  Equip the owned badge to `owned-1` using its ledger select.
- Keyboard-walk open lanes, route to fiber at (18,-18): four fiber including
  the Pathfinder bonus; canonical claim `0:supply-1` removes the pickup.
- Return to the counter, deliver three fiber once: 99 Marks, one fiber;
  completed delivery button disabled. Choose naturally unlocked Quartermaster
  at the mentor. No other class unlock is claimed as naturally verified here.
- Hold Forward into the cottage: stop at its collision boundary, release stops
  movement. Route to wild-0, open native encounter/battle, press ability 1,
  then use the legal kite control to capture actual Budriv at level 2.
  Captured UID `owned-2` retains a non-neutral, zero-sum individual profile.
  Capture reward yields 121 Marks and encounter index 1.
- Remove/add the captured UID through ledger buttons; equip badge and favorite.
  Search shows discovered information. Reload/Continue preserves roster/profile,
  cosmetics, team, wallet, inventory, contract, class, favorites and pickup claim.
- Cancel New run preserves raw saved bytes; confirmed reset and native restart
  restore the single starter, 90 Marks and 8 kites.
- At 390px, real two-contact held movement combines directions and stops after
  release. Native battle ability/kite taps capture Budriv. At 320px, no horizontal
  overflow and displayed button/select rectangles are at least 44px.

Each native run passed nine functional stages, with zero page/console errors,
failed requests, HTTP errors or external requests. Seven distinct original GLB
URLs were fetched in the scenario; no all-roster preload or fallback-model pass.
This is a small M1 gameplay proof, not completion of the campaign/design plan.

## Actual preliminary renderer measurements

Latest software-rendered run, not N100 or Chrome OS hardware certification:

| Scene | Buffer | Draws | Triangles | NPCs | Scene models | Cache |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Desktop low world | 960 x 367 | 19 | 6,107 | 4 | 3 | 3 |
| Desktop standard world | 1254 x 480 | 19 | 6,407 | 8 | 3 | 3 |
| Desktop low battle | 842 x 480 | 4 | 1,040 | 0 | 2 | 4 |
| Mobile low world | 372 x 300 | 19 | 6,107 | 4 | 3 | 3 |
| Mobile low battle | 372 x 270 | 4 | 1,040 | 0 | 2 | 4 |

Measured scenes fit buffer/draw/triangle/cache budgets. No sustained frame-time,
10-minute session, 20 native scene transitions, all-cosmetic fit or device-memory
acceptance is claimed. Pure renderer checks are separate from native gameplay.

## Captures and presentation finding

Six actual JPEG gameplay captures are in the temporary `foldwild-milestone-qa`
directory: `desktop-world.jpg`, `desktop-shop.jpg`, `desktop-battle.jpg`,
`desktop-ledger.jpg`, `mobile-world.jpg`, `mobile-battle.jpg`.
Latest total 291,948 bytes; largest 65,689 bytes. They are not concept frames.
Main owns subjective review and any source/style fix.

**Open presentation finding:** the 390px battle capture shows the large overlaid
combatant HUD occupying the creature area; neither creature is visible in the
image despite two successfully loaded scene models. Functional tap/capture
assertions passed, but that is not mobile model readability or visual acceptance.
Do not describe M1 as fully visually accepted from the native exit code.
Desktop captures and the ledger also require Main's actual picture review.

## Commands and exact outcomes

```sh
timeout 420 xvfb-run python3 -B scripts/test_foldwild_milestone.py
# Two runs: exit 0. Final line:
# PASS: Foldwild M1 native gameplay checks; Main must review pictures, not a visual/campaign/hardware release pass
timeout 210 xvfb-run python3 -B scripts/test_foldwild_core_v2.py
# exit 0: PASS: M1 native starter, merchant trades, accessory/ledger, appearance,
# supply/contract/class, save/continue, movement, wild battle, touch and corrupt-save protection
```

All eight pure checks ran both before and after core freeze with
`node --experimental-default-type=module`: `test_foldwild_data`, `regions`,
`economy`, `builds`, `battle`, `battle_v2`, `world`, `save_v2` (all `.mjs`).
Every command exited 0 with its PASS output. The data check reported 80 exact
tracked/local model SHA matches and `models=7300844 bytes`; hidden species null.
The region check reported 48 NPCs, 9 shops/contracts, 73 POI + 15 wild routes,
185 collision-safe segments. These are pure data/rule proofs, not a natural
all-region playthrough or reactive NPC/campaign-content acceptance.

`node --experimental-default-type=module --check` passed all eight authored
Foldwild JS files. Python in-memory AST parsing and `git diff --check` passed.
Catalog schema, unique IDs and URLs against tracked Git paths passed for 115
entries; sparse-excluded games were not treated as absent. The old focused
`test_foldwild.py` was not run or weakened by this worker.

Native run disk deltas: first 356,352 bytes; final 28,672 bytes; independent
frozen core repeat 12,288 bytes. These are shared-workspace observations, not
exclusive allocations. Disk remained 2.4 GB free; QA output directory 304 KB.
No dependencies, large models, persistent servers or sparse changes.

## Held features and release gates

Pending-battle recovery, final expedition/15 tasks, reactive campaign dialogue,
all natural trials/classes/species, advanced model ledger/release/evolution UI,
all 80 accessory fits, rival editing, three class ranks, frontier and optional
horror integration are not certified here. Quartermaster's second-contract
bonus is not naturally exercised in this run; pure rules do not replace that.
Optional hidden species remains null, with no horror asset ingestion.

Full registered-catalog gate passes in this task: **0**. It was intentionally
not run inside this bounded no-push worker. A future authorized push still
requires the unfiltered full gate. Actual N100/8 GB testing remains unverified.
No release decision, registration or push follows from these results.

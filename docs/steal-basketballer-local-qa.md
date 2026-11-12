# Leo's Steal a Basketballer: local handoff

## Scope and opening

One original owner-ordered basketball sibling, **not an ingested open-source
game**. Local entry: `Games/StealBasketballer/index.html`. No catalog ID,
registration, push or publication. Registered games remain **132**; source
projects139, including this seventh unregistered project.

From repository root, run a local static server yourself:

```sh
python3 -B -m http.server 8935 --bind 127.0.0.1
```

Open `http://127.0.0.1:8935/Games/StealBasketballer/`, then PLAY. Stop the server
with Ctrl-C when finished. No build, package install or download is needed.
WASD/arrows/E/Space, mouse orbit/zoom, touch joystick/buttons. Sign a player using
SHOP -> VIEW CONVEYOR; BATTLE starts five-on-five with academy fillers. Read HELP
for play calls, manual control and substitutions. The browser boot path has not
yet received native acceptance; the one permitted attempt timed out as below.

## Coding swarm and reviewed commits

All coding used `openai-codex/gpt-6.1-sol`, including the orchestrator. Five real,
disjoint coding lanes; not research-only handoffs. A/B/C completed before the
operator's extra D/E lanes started. No lanes were interrupted. Fresh additional
admission: disk2,275,291,136 bytes, RAM available4,601,004,032 bytes,
swap free350,072,832 bytes; only D/E plus brief A confirmation active then.
Short milestones sampled from `.tmp/basketball-{A,B,C,D,E}-progress.log`;
worker receipts under ignored `.swarmforge-logs/`. Actual commits/diffs reviewed.

| Commit | Phase and exact owned files |
| --- | --- |
| `decbf3ac` | C: `Games/StealBasketballer/data/world.json`, `js/world.js`, `js/actors.js`, `tests/world.mjs` |
| `fde5a866` | B: `Games/StealBasketballer/js/match.js`, `tests/match.mjs` |
| `f5d368f6` | A: `Games/StealBasketballer/data/catalog.json`, `js/game.js`, `tests/game.mjs` |
| `49384385` | E: `Games/StealBasketballer/tests/fixture.mjs`, `tests/browser.py` |
| `3ac3ecd7` | D: `Games/StealBasketballer/index.html`, `style.css`, `js/app.js`; `docs/steal-basketballer-design/ui-mockup.png` |
| `297ab3b8` | Integration: match/test role and court fixes, browser console diagnostics, ball icon, fonts/notices, Three.js/license, package metadata, credits, contract; `docs/maintenance/games/unregistered-stealbasketballer.md` |
| `783de9eb` | Three imported whitespace defects only in vendor/notices, updated provenance/contract/manual; **current game-source commit** |

Final handoff commit contains only this QA and maintenance index/inventory
reconciliation. The checker required adding this unregistered project; this is
not portal registration. No source work switched to the queued footballer repair.

## Roster, rules and source review

Proof from current catalog: **100 players / 100 unique IDs / 100 unique names**.
Twenty entries per PG/SG/SF/PF/C; rarity40/30/20/8/2. All100 names reviewed offline
as real current/historical basketball identities. No fictitious collectible
players, aliases counted twice, photos, logos or official assets. Six original
arcade axes: shooting, handling, passing, defense, rebounding, stamina.

Leo's correction `BASKETBALL-CORRECTION-REAL-100-20261112` was relayed through
roster lane A; A acknowledged no data change needed. Names were **not** live
verified against an official dated roster. Metadata explicitly says so.
[Credits](../Games/StealBasketballer/CREDITS.md) records pinned original source,
local licenses/hashes, research limits and identity/publicity/endorsement rights
caveat. Real-name approval is not public-release permission.

Source review traced Game -> app -> Match -> World -> report -> Game reward/save.
Integration fixed natural-role precedence so manual assigned slots persist;
substitutions retain the outgoing slot without overwriting natural position.
Scoring radius48, free-throw x55 and rim x82/y10 now agree with world metadata;
fixtures assert this across modules and test the scoring boundary.

Match has ten actors, possession, dribble movement, pass/interception, steals,
blocks, rebounds, 2/3-point attempts, fouls/free throws, four quarters and overtime.
24s possession and quarter clocks run visibly at3x; offensive rebound resets14s.
Game recomputes authoritative coin rewards. Twelve-player roster, carry/deposit,
NPC theft, staff, eggs, shop, upgrades, kits, presets and album retained. Saves
use only `steal-basketballer:v1` and its companions, never football keys.

Intentional rules limits: no traveling/double-dribble/out-of-bounds adjudication,
disqualification/injury lottery, and-one, held-ball, timeout or return substitutions.
Five one-way changes, arcade court proportions, not an official rules simulation.

## Checks actually run

**7/7 cheap gate groups passed** on assembled source (browser is separate):

1. `node --check` on five authored JS modules and all four `.mjs` fixtures;
   `node --check .../vendor/three.module.js`; Python `ast.parse` for browser script.
2. `node Games/StealBasketballer/tests/fixture.mjs`:
   `PASS static sibling dependency closure: 14 local files, no external asset references`;
   `PASS flow: recruit -> theft/deposit -> 5v5 (2:3) -> reward 85 -> reload`;
   `PASS game: 100 unique basketballers; rarity 40/30/20/8/2; six stats; 12 roster/5 starters; economy/training/perks/events; theft/deposit/defense; basketball rewards; isolated saves/recovery`.
3. `node Games/StealBasketballer/tests/match.mjs`:
   `PASS basketball match fixtures; one short complete match 4:0 (Q4, 41.7s); fixed-step 30/60fps identical`.
4. `node Games/StealBasketballer/tests/world.mjs`: PASS12 routes/slots,
   three formations, aligned court/hoops/collision, ten actors, generic poses,
   max6 meshes/488 triangles per actor, seamed ball, market disposal and cameras;
   **3,333** static primitives including stadium template (source3,356).
5. Portal schema/unique IDs/Git-backed entry paths:
   `PASS portal schema/Git URLs: 132 unchanged registered games; basketball unregistered`.
6. `git diff 31680023 --check`, original-footballer/catalog unchanged comparison,
   vendor/font provenance checks PASS. Initial staged import check found two
   trailing spaces in font notices and one indentation defect in Three.js;
   fixed without code-token/license-word changes, not filtered out. Font binaries
   remain byte-identical. No external runtime additions. Unused inherited football
   exporter excluded after grep showed no runtime/test consumer, only copied credits.
7. `python3 -B scripts/check_maintenance_docs.py --refresh`, then checker:
   `PASS: 139 game documents cover 132 registered + 7 unregistered games; Git inventory current.`
   Coverage only, not gameplay acceptance.

Two tiny complete seeded fixture scenarios (integration and match suite), with
bounded frame-cadence comparison; no mass simulation/sweep or heavy testing.

## One browser attempt, not acceptance

Command actually attempted once:

```sh
python3 -B Games/StealBasketballer/tests/browser.py --port 8935 --artifacts docs/steal-basketballer-design
```

Explicit installed `/usr/bin/chromium`, no browser/package download. Before
launch: disk**2,359,418,880** bytes, RAM available4,242,526,208 bytes. Browser
launched but `Page.wait_for_function` timed out after**10,000ms**, waiting for
`typeof window.basketballerSnapshot === 'function' && !document.getElementById('start').disabled`.
Recorded `pageErrors=[]`, `failedRequests=[]`, `externalRequests=[]`; console
errors were not captured in that attempt. A console-error listener was added
for a future authorized diagnostic pass, Python AST checked, **not rerun**.
Server/browser cleanup completed. No screenshots produced; phone phase not
reached. No root cause established from this timeout.

Hermes ticket **`pi-3273687-1794449864222-14f2c074`** advises keeping native/browser
acceptance unverified and requesting separate authorization before another pass.
Source-only predicate review: the diagnostic property is defined before boot();
boot fetches only two local JSONs, creates Game/World and then enables PLAY;
catch updates loading text and logs console error. This review does not establish
which step the live attempt reached.

The first mockup `docs/steal-basketballer-design/ui-mockup.png` was created before
UI edits and inspected: cream/ink/navy/yellow/green, Bungee/Atkinson and blocky
court concept. Actual HTML/CSS retain the sibling style. Final rendered comparison,
desktop/phone screenshots, normal input, full native match/report, touch and
hardware performance remain **unverified**, not falsely passed.

Skipped as requested: full-fleet smoke, mass simulations, browser downloads,
extra browser attempts and public release gates. No push or registration.

## Storage and worktree

Initial exact free disk2,287,517,696 bytes; before final source/maintenance
reconciliation2,355,179,520 bytes. Shared free-space increase is not attributed
to this task. Game footprint**2,767,083 bytes** in25 tracked files; mockup69,168
bytes. No outside-repo deletion, broad checkout, installs, GC/history rewrite
or persistent server. Sparse selection unchanged. Only pre-existing untracked
`.hermes/` (operator plan) is intentionally left outside commits; ignored worker
logs/progress are retained locally. Final response records final free bytes and
handoff commit.

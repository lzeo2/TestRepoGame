# Nintendo ROM removal: Phase 1 evidence and Phase 2 result

## Scope and reason

Baseline: `47e41d6` (121 catalog entries, including Circuit Ward id 222).
Hermes already removed exactly ids 96 through 103 under the user's Nintendo
ROM policy in `756a68f`, then removed four tracked thumbnails in `5e4654b`.
Both commits are present in local HEAD and `origin/main` ancestry. Phase 2
does not repeat ROM/catalog deletions. This is an operator-directed repository
policy action, not a legal verdict. No other Nintendo games, Cookie Clicker
variants, or other game data are changed. Operator labels received in ticket
`pi-912882-1790852386353` are recorded in `pending-rights.md`; functional
`keep` is not rights clearance. Historical evidence is retained, not purged.

At task start local HEAD was `6b6a100`, containing another writer's commit,
while `origin/main` was `5e4654b`. Thus HEAD and the remote-tracking tip were
no longer identical, but the two completed removal commits were verified in
both. The other writer's document is outside this phase's ownership.

Verified actual environment: `PI_PROVIDER=openai-codex`,
`PI_MODEL=gpt-6.1-sol`. Ten-minute mechanical task, no push, no network,
no installs, no engine changes, and no new games.

## Evidence collected before deletion

Baseline collection read `47e41d6` wrappers and `git ls-tree -rl 47e41d6`; ROMs were not
materialized. `git grep --cached -n -I -i -F` scanned the entire tracked
index, including sparse-excluded games and bundled JavaScript, for every
removed folder path, title, thumbnail path, thumbnail slug, and folder name.
Counts below are matching content lines, case-insensitive, with overlapping
patterns counted separately. Combined output has 163 distinct matching
lines: 12 in removal folders, 24 in games.json, 8 in portal-ux.js, and 119
historical references outside the removal folders. No retained game or
bundle references any target folder, title, or thumbnail slug.

| Folder path | Raw lines |
| --- | ---: |
| Games/PokemonUnbound/ | 7 |
| Games/PokemonUnboundHacked/ | 7 |
| Games/PokemonEmerald/ | 8 |
| Games/PokemonEmeraldHacked/ | 7 |
| Games/PokemonFireRed/ | 7 |
| Games/PokemonFireRedHacked/ | 7 |
| Games/PokemonRuby/ | 7 |
| Games/PokemonRubyHacked/ | 7 |

| Title | Raw lines |
| --- | ---: |
| Pokemon Unbound | 25 |
| Pokemon Unbound Hacked | 10 |
| Pokemon Emerald | 23 |
| Pokemon Emerald Hacked | 10 |
| Pokemon Fire Red | 21 |
| Pokemon Fire Red Hacked | 10 |
| Pokemon Ruby | 24 |
| Pokemon Ruby Hacked | 12 |

| Thumbnail file | Exact path / basename lines | Slug lines |
| --- | ---: | ---: |
| assets/thumbs/pokemonunbound.jpg | 0 / 0 | 23 |
| assets/thumbs/pokemonemerald.jpg | 0 / 0 | 25 |
| assets/thumbs/pokemonfirered.jpg | 0 / 0 | 19 |
| assets/thumbs/pokemonruby.jpg | 0 / 0 | 19 |

Folder-name counts without `Games/` or trailing slash: PokemonUnbound 23,
PokemonUnboundHacked 7, PokemonEmerald 25, PokemonEmeraldHacked 7,
PokemonFireRed 19, PokemonFireRedHacked 7, PokemonRuby 19,
PokemonRubyHacked 7.

The thumbnail consumer is `THUMBS[title]` -> `getGameThumb(title)` ->
`'./assets/thumbs/' + slug + '.jpg'` -> `applyCardMetadata()` image src.
Only the eight mappings at baseline portal-ux.js lines 186-193 consumed these
four images; Phase 2 removes just those mappings. The sole getGameThumb caller
is applyCardMetadata (baseline line 257), itself called at line 804. Baseline
catalog URLs pointed to the eight wrappers. Each baseline wrapper loads
its own local ROM and the shared `../_emulatorjs/data/loader.js`; these are
outgoing dependencies, not remaining users of removed files. The shared
emulator is retained unchanged. The only common ROM basename, `rom.gba`,
is resolved relative to each wrapper, not globally.

A broader case-insensitive cached `pokemon` grep returned 175 lines. It
also identifies historical generic mentions and two shared emulator
localization strings. These strings are not removed-game launch links or
asset consumers; the protected shared emulator remains unchanged.

## Exact retained reference locations

Locations are in baseline `47e41d6`, remain byte-identical, and can be read
with `git show 47e41d6:<path>`. This inventory covers all 119 primary grep
lines plus 10 additional retained lines from the broader grep (129 total).
The new evidence document itself is excluded from these counts.

- `docs/audit_batches/batch_5.md`: 7, 9, 11, 12, 14, 15, 17, 18.
- `docs/audit_batches/playtest_r6.md`: 5, 7, 18-20, 22-24, 26-28, 30-32, 34, 38, 42-44.
- `docs/audit_batches/playtest_r7.md`: 5, 7, 10, 44.
- `docs/audit_verdicts.md`: 121, 123, 125, 126, 128, 129, 131, 132, 298-304, 307, 471-478, 488.
- `docs/qa-w1-smoke.log`: 2530, 2536, 2537, 2539, 2540, 2546, 2547, 2549, 2550, 2556-2559, 2565-2568, 2574-2577, 2583-2586, 2592-2595, 2601-2603.
- `docs/review-swarm-final.md`: 21, 27.
- `docs/sweep-workerC-smoke.log`: 2384, 2390, 2391, 2393, 2394, 2400, 2401, 2403, 2404, 2410-2413, 2419-2422, 2428-2431, 2437-2440, 2446-2449, 2455-2457.
- `docs/sweep-workerD.md`: 66, 76.
- `.hermes-swarm/PLAN.md`: 19, 327.
- `.hermes-swarm/SESSION-STATE.md`: 25.
- `Games/_emulatorjs/data/localization/retroarch.json`: 314, 317 (palette labels only).

All historical audit/log references above are retained as evidence, explicitly
not current launch links. The two localization strings are shared emulator
palette labels, not removed-game consumers. Phase 2 verified all eleven listed
reference files unchanged against `47e41d6` using Git blobs. No old document,
log, shared emulator label, or other out-of-scope file is edited.

## Tracked deletion inventory

| Folder | Wrappers / ROM assets | Logical bytes |
| --- | ---: | ---: |
| Games/PokemonUnbound/ | 1 / 1 | 19,511,539 |
| Games/PokemonUnboundHacked/ | 1 / 1 | 19,514,089 |
| Games/PokemonEmerald/ | 1 / 1 | 16,777,971 |
| Games/PokemonEmeraldHacked/ | 1 / 1 | 16,780,422 |
| Games/PokemonFireRed/ | 1 / 1 | 16,777,872 |
| Games/PokemonFireRedHacked/ | 1 / 1 | 16,780,422 |
| Games/PokemonRuby/ | 1 / 1 | 16,777,910 |
| Games/PokemonRubyHacked/ | 1 / 1 | 16,780,403 |
| Four thumbnails | 0 / 4 | 17,679 |

Total: 20 tracked files, 139,718,307 logical bytes (8 HTML wrappers,
8 ROM archives/images, 4 JPEGs). Game folders are already sparse-excluded:
actual reclaimed game working-tree bytes are **0**, not 139 MB.
The four JPEGs were already deleted from tracking by `5e4654b`, but untracked
local copies remained. Phase 2 removed only those copies after a staged cached
reference audit proved zero runtime consumers. Their payload is 17,679 bytes;
this is not a measurement of allocated disk space reclaimed. Git history objects remain;
no Git disk shrinkage or history purge is claimed.

## Sparse selection and verification

Original cone selection is assets, docs, scripts; `core.sparseCheckout`
and `core.sparseCheckoutCone` are both true. Exact original pattern bytes:

```text
/*
!/*/
/assets/
/docs/
/scripts/
```

The selection/config is not changed; no game checkout, install, server,
network fetch, history rewrite, or garbage collection occurs in Phase 2.
Initial disk guard: `29G 26G 2.3G 92% /`; stop growth below 2 GB free.

## Phase 2 verification results

Actual command output:

```text
baseline removed files: 20 logical bytes: 139718307
current tracked target files: 0
catalog: 113 entries, 113 unique IDs, schema OK, all 113 URLs tracked; includes 222
baseline count: 121
retained catalog data byte-equivalent as parsed entries
all other tracked Games files unchanged vs baseline
0 current runtime consumers, including sparse-excluded Games and bundles
0 tracked thumbnail path/basename references
removed exactly four untracked JPEG leftovers; payload bytes: 17679
node --check assets/portal-ux.js: PASS
11 historical reference files unchanged vs 47e41d6
both removal commits present in origin/main and local HEAD ancestry
thumbnail regression: PASS (8 removed titles, retained pair, fallback)
rights table: 30 operator-named GRAY rows + 2 explicit Cookie Clicker retention rows; all exact current titles/IDs
protected AGENTS.md and original sparse pattern unchanged
Games tree: no target folder or target Pokemon-named ROM files
git diff --check + git diff --cached --check: PASS
```

The cached case-insensitive folder/title/slug audit includes sparse-excluded
content and bundles, excluding only documentation and historical swarm notes
from the runtime-consumer result. Full tracked audits retain the historical
hits inventoried above. Exact thumbnail filename grep has zero tracked hits.
The current Games tree contains none of the eight target folders or their
Pokemon-named ROM files. The common `rom.gba` basename is not globally deleted.

`AGENTS.md` is byte-identical to `47e41d6`; baseline/current SHA-256:
`fa168ca67357466dd32f1f3b653b063d37d3c8f4a3f5753451c037d7e7b5c500`.
Original/current sparse pattern SHA-256:
`246b9c60ac964c8e14e187a81060eb074c7dc692fe83366f99a120df84ab120d`.
No runtime external loads or new games are added. The authored source diff
is exactly eight removed mapping lines; existing minified bundles are untouched.

### Small runnable thumbnail regression check

Run from the repository root; no browser, dependency, or checkout needed:

```sh
node <<'JS'
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync('assets/portal-ux.js', 'utf8');
const block = src.match(/var THUMBS = [\s\S]*?\n  function getGameThumb\(title\) \{[\s\S]*?\n  \}/)[0];
const ctx = vm.createContext({});
vm.runInContext(block, ctx);
for (const title of ['Pokemon Emerald', 'Pokemon Fire Red', 'Pokemon Ruby', 'Pokemon Unbound']) {
  assert.equal(ctx.getGameThumb(title), null);
  assert.equal(ctx.getGameThumb(title + ' Hacked'), null);
}
assert.equal(ctx.getGameThumb('Retro Bowl'), './assets/thumbs/retrobowl.jpg');
assert.equal(ctx.getGameThumb('Retro Bowl Hacked'), './assets/thumbs/retrobowl.jpg');
assert.equal(ctx.getGameThumb('Circuit Ward'), null);
console.log('thumbnail regression: PASS (8 removed titles, retained pair, fallback)');
JS
```

Phase 2 owns only this document, `docs/pending-rights.md`,
`assets/portal-ux.js`, and the four untracked JPEG deletions. Explicit staging
is limited to the three authored files. Other writers' documents are allowed
outside this phase's status and are neither reviewed nor staged here.
New evidence stays far below the 30 MB artifact cap (two small text documents,
under 20 KB combined). Final `df -h / | tail -1` still reports
`29G 26G 2.3G 92% /`; no change is visible at that reporting precision. Only the
17,679-byte leftover payload is removed locally; no 139 MB disk-reclamation
claim is made.

Full browser smoke and screenshots are not claimed by this mechanical phase.
A fresh `xvfb-run python3 scripts/smoke_test_games.py` covering all 113 games
belongs to the orchestrator after all writers stop; no fresh gate pass is
claimed yet. No current publishing GO exists for these changes. Keep local;
no push is performed.

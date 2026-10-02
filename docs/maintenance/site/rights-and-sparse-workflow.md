# Rights evidence and sparse-storage workflow

<!-- maintenance-site: rights-and-sparse-workflow -->

## Identity and status

Baseline `8c8a055`: 115 catalog entries, 120 game directories plus shared
`Games/_emulatorjs` (121 directories). Five unregistered games are 2048, Foldwild,
Hextris, QWOP and Slope. Historical 120/113/121-entry reports describe earlier
states; do not silently rewrite them as present inventory. This document is
maintenance evidence, **not legal advice or redistribution clearance**.
See [scope](../SCOPE.md), [emulation](emulation-runtime.md) and
[ranked infrastructure findings](../audits/infrastructure.md).

## Implementation map

Canonical runtime catalog: `games.json`. Git, not the sparse filesystem or a
backup, is the source of truth for `Games/`. Source evidence lives separately in
`docs/catalog_parts/sources_*.md`, per-game notices and specific source reports.
`docs/GAMES.md`, `docs/wiki/Game-List.md` and `docs/audit_batches/*` contain useful
history but stale counts, controls or functional verdicts need fresh source
confirmation. A batch's "keep" means functional disposition, not licensing.

The portal's thumbnail chain is concrete:
`assets/portal-ux.js:THUMBS[title]` -> `getGameThumb(title)` ->
`'./assets/thumbs/' + slug + '.jpg'` -> `applyCardMetadata()` -> created `img.src`.
Hacked titles can share a base slug. `getGameIcon()` instead selects authored
static SVG constants or category fallback; it is not permission to inject
arbitrary SVG from future catalog/user data. Keep icons local and trusted;
remote replacements are prohibited. Thumbnail branding/art has distinct rights
from the engine. A local download and a known mirror do not establish its license.

## Dependencies and provenance

Separate four questions for every retained or prospective port:

1. **Code:** verified upstream canonical URL, immutable revision, actual license
   text and author name. An unlicensed repository is not implicitly MIT.
2. **Assets/data:** art, music, ROM, word lists, branding and game binaries each
   need applicable terms. Code license does not automatically cover them.
3. **Dependencies:** local runtime closure and their notices, pins and any
   corresponding-source obligations. Keep embedded GPL notices as well as files.
4. **Verification:** runnable wrapper, cold-cache offline evidence, controls and
   restart/save checks. Technical success does not answer rights questions.

Examples of available evidence, not blanket certification:

- `docs/portal-font-sources.md` records local Bungee and Atkinson Hyperlegible OFL
  terms, pinned notice-source revision, exact WOFF2 URLs and hashes. That report
  explicitly does not pretend a source revision pins a different binary build.
- `docs/catalog_parts/sources_9.md` and `sources_10.md` record individual upstream
  commits and modifications for selected ports. Historical AI/in-house source
  narratives do not grant permission to create new games in this run; an old
  README's "original code" statement is not current license evidence.
- `_emulatorjs` embeds GPL v3 text and an EmulatorJS attribution; its 39 core
  archives still require per-core license/source/pin reconciliation. No root
  repository LICENSE/COPYING/NOTICE file exists at this baseline. That absence is
  a provenance gap, not a conclusion that every component has the same license.
- `Games/Balatro/CREDITS.md` contains a fan-demake MIT claim and mirror revision.
  Source/license and game-art/branding clearance still need independent checks;
  no upstream downloads were performed here.

## Retention and owner gates

[Pending rights record](../../pending-rights.md) names 30 operator-labelled GRAY
entries and two explicitly retained Cookie Clicker variants. GRAY means pending
verification, not licensed. Its introductory 113 count is historical; current
count is 115. It does not establish that outreach happened. Do not assign more
GRAY labels to unlisted variants just because their titles resemble listed games.
Cookie Clicker's reported no-rehosting restriction remains unresolved despite
retention. Owner approval to keep files is not copyright-holder permission.

[Nintendo removal evidence](../../nintendo-rom-removal.md) records removal of
exactly Pokemon ids 96-103 and four thumbnail files in earlier commits. It does
not authorize scrubbing every familiar franchise or deleting all ROM consumers.
Current remaining shared emulator entries include:

| ID | Directory | Rights evidence in this infrastructure review |
| ---: | --- | --- |
| 114 | `Games/DrMario` | GBA image bundled; redistribution permission unverified. |
| 115 | `Games/StreetFighter2` | GBA image bundled; redistribution permission unverified. |
| 116 | `Games/AdvanceWars` | Local archive named by wrapper; rights unverified. |
| 117 | `Games/MarioKartSuperCircuit` | GBA image bundled; rights unverified. |
| 118 | `Games/MetroidFusion` | Local archive named by wrapper; rights unverified. |
| 119 | `Games/MegaManZero` | Local archive named by wrapper; rights unverified. |
| 120 | `Games/KirbyAmazingMirror` | Local archive named by wrapper; rights unverified. |
| 121 | `Games/SonicAdvance` | Local archive named by wrapper; rights unverified. |
| 221 | `Games/Balatro` | CREDITS claim present; independent license/assets verification pending. |

Do not infer archive contents, authors or ownership solely from these names.
Keep existing material pending explicit owner/legal disposition; no new ROMs,
registration, removals, relicensing or publication are authorized by this worker.

No Eagler-named path exists in baseline Git. Do not restore a removed game. If
Eaglercraft appears in another authorized revision, preserve fully offline use,
GPL-3.0 component note and Minecraft Java ownership requirement. Absence here
is not authorization to discard those protections.

`Games/Character AI/` is strictly read-only. The inspected `Alsen.html` response
path is `handleInput()` -> `detectIntent()/detectSentiment()` -> canned/random
`generateResponse()`; this is a local scripted bot, not a hosted LLM. Its raw HTML
message sink is reported separately; it must not be silently fixed in this scope.

## Safe iteration

### Sparse workflow and deletion evidence

Worker baseline selection is assets/docs/scripts. This task did not change it,
checkout Games, install tooling or create a scratch repository. Safe read-only
commands from the repo root:

```sh
git show 8c8a055:'Games/DrMario/index.html'
git ls-tree -rlz 8c8a055 -- 'Games/DrMario/'
git grep --cached -l -I -F 'storage/ruffle' -- '*.html' '*.js'
```

Parse `ls-tree` NUL records with Python; shell word splitting fails on spaces,
quoted Unicode and unusual paths. Use `git show HEAD:<exact path>` for bounded
text extraction to temporary storage, then the read tool. Pin the audited commit
when writers are concurrent. Compare local HEAD before proposing a patch; origin
can lag. Never assume a missing local file is absent in Git or deployment.

Before deletion: search tracked content including sparse-excluded blobs, separate
runtime consumers from audit mentions, and trace constructed paths/manifests.
Examples: thumbnail slugs, Ruffle's hashed JS/WASM loaders, Unity's JSON payloads
and emulator archive decompression. A binary's filename absent from direct HTML
is not evidence that it is unused. `storage/ruffle`, the no-op `storage/js/cloak.js`
and `images/ico.ico` all have entry consumers. Inspect incoming and outgoing
references; do not delete notices or evidence because they are unfashionable.
No deletion was performed here.

Check `df -h / | tail -1` before growth and stop below 2 GB free. Normal concurrent
work must preserve that floor and keep growth under 30 MB. Count logical bytes
of owned extraction/documents, not shared filesystem movement caused by other
workers. Game-tree Git size is not materialized workspace size. A deleted
sparse-excluded binary does not reclaim its logical bytes from the local
workspace or history. No history rewrite, broad checkout, reset, clean, amend,
garbage collection or push to evade constraints.

Only main may lease Foldwild or run the approved full-gate sparse procedure after
writers stop. `scripts/run_sparse_smoke.py` has a separately approved 300 MiB
Games/1.5 GiB floor window and exact restoration guards; that exception is not
normal worker storage permission. Workers commit only assigned paths, with
explicit staging and `--only` isolation if another writer has staged changes.

## State and persistence

Rights records are not game state. Do not erase saves while reorganizing paths,
changing origin or probing a bad load. Emulator cache/settings are shared across
wrappers; preserve exports before approved runtime changes. Artifact evidence
must not include personal emails, local machine paths or secret values. If a
credential is found, stop publication, report only redacted path/context to main
and seek operator handling. Historical rewrite instructions conflict with this
run's no-rewrite boundary: escalate; never run destructive history tools here.

## Audit findings

- **INF-12, HIGH:** retained commercial ROM/binary/assets rights are unresolved;
  minimum fix is verifiable permission/terms and source evidence or an explicit
  owner decision, not invented attribution, default MIT or a wrapper rewrite.
- **INF-13, MEDIUM:** current catalog count differs from legacy wiki/catalog and
  pending-rights introductions. Reconcile main-owned index/current summaries
  while preserving dated removal and audit evidence.
- Source scans alone cannot certify every commercial license or external-load
  closure. Unknown areas remain unknown rather than being counted as cleared.

## Verification

Actually run: catalog identity/required-field/115 tracked-URL assertions,
NUL-safe directory/file/size counts, remaining payload existence checks and
bounded entry-consumer scans. No network source fetch, license adjudication,
owner outreach, browser run or hardware test occurred.

Recommended: reconcile each game page's source claims with actual retained
notices, immutable upstream source and asset terms; separately retain local
modification evidence. Have the owner resolve named rights holds before release.
Then main runs the unfiltered full catalog smoke gate and separately reports
known exclusions, play/screenshot evidence and real-device limitations.

## Future outlook

Week 1: rights/source matrix and owner decisions, not cosmetic promotion.
Week 2: high-value reversible wrapper/accessibility repairs, retaining notices.
Week 3: research a few legitimate lightweight 3D ports with verified code/assets
terms and closed local dependencies. New-game permission and current free IDs
must be checked anew; this plan promises no additions. Week 4: hardware/offline/
save QA and a release decision only after full gate and remaining holds are
explicit. No autonomous month-long activity or push is implied.

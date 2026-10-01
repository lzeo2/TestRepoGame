# Foldwild data and asset ingest

## Scope, permission and attribution

Delegation #24 is mechanical data/asset ingestion, not game implementation or
release. Foldwild is operator-authorized original self-made collect/battle RPG
work for this run only; main-orchestrator design owns the game. The latest user
authorization phrases are “I give permission To start use subagent”, “Resume
proceed”, and overnight parallel GO. They authorize creation and USE of the
supplied delivery, not push, broad redistribution clearance, or future games.
No upstream game, human author, originating model provider or artwork license
has been invented. The mechanical worker's actual environment was verified:
`PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`. This identifies this worker,
not the creator/provider of uploaded artwork.

Foldwild remains **UNREGISTERED** tonight. Future catalog id is **UNRESOLVED**;
it is not 224 (reserved for the 3D demo). Catalog remains 113 entries. This
milestone supplies constants and local assets only; gameplay, visual approval,
registration and publication gates belong to the orchestrator. No battle,
main/view, HTML, CSS, portal or catalog changes are included here.

## Operator delivery

Source: operator-uploaded `original-monster-roster-80-glbs.zip`, 6,820,191 bytes,
SHA-256 `ff7ff469e60829b23e0173e71f16a1c978c92f5bc04090504d6f5b7a6f4e1347`.
No archive copy, blanket extraction, program execution or new network access.
The existing stdlib auditor `scripts/audit_monster_archive.py` was rerun before
copying: 308/308 CRC, 90/90 structural GLB passes, exit 0, errors `[]`, archive
unchanged. Classification: 75 FAMILY-SHARED, five BOSS/UNIQUE-GLB, ten retained
family bases. Only the 80 `glb/<Family>/<species>.glb` members were copied,
unchanged, to `Games/Foldwild/models/<Family>/<species>.glb`: **7,300,844 bytes**.
The ten prototypes and all QA programs remain source-only. Original opaque
vertex COLORS are preserved; no house recoloring or hidden placeholder.

The actual ZIP specs were parsed in memory. Its full roster rows, evolution,
stats, four ordered actions, dimensions and complete prompts matched committed
`docs/monster-roster-glbs.md`; archive markdown is byte-identical to that doc.
All 50 glossary costs and effect strings also matched exactly. No discrepancies
were guessed or repaired. Source hashes:

| Source | SHA-256 |
| --- | --- |
| Committed roster / ZIP markdown | `7673827d68e1f38af48d3fd8eb903924f26d9518f72f872416e78c96ec1d3190` |
| ZIP `spec/roster.json` | `5ae9fad325dc7f8d11233e36233e165263d3fcb8262719c92adcb35566542af8` |
| ZIP `spec/ability-glossary.json` | `139fa22e6d0cb81745ccc7d6d0aae980390b322b0bf152da8b151eb962c0f301` |

Every species' archive path, byte count and SHA-256 is already committed in
[monster-model-delivery.md](monster-model-delivery.md). The regression reuses
those 80 rows instead of adding a second manifest. Supplied creator/permission
extras and README assertions are unverified, not independent license clearance.
The operator's scoped use order is the authority here. The prior structural
audit's limitations remain: topology sharing, anatomical attachment, unique
boss silhouettes, orientation and appearance require review. Structure is not
browser import success, visual approval or gameplay QA.

## Exact local vendor copies

Four files were copied from current pinned HEAD
`528aa48fcd5813b221240ae05284b6d893bf1028`, using Git blobs under
`Games/Circuit Ward/vendor/`, to identical filenames under
`Games/Foldwild/vendor/`. Every copied byte was compared to its source blob.
Total **1,414,498 bytes**. No dependency download, installation or vendor edits.
Existing local import rewrites are preserved exactly.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `three.module.js` | 1272972 | `76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495` |
| `GLTFLoader.js` | 108527 | `1f9b02acfbf219a6ebb77f09e355500449a3ba9e6a77d87e0de72c0b9315ea4e` |
| `BufferGeometryUtils.js` | 31918 | `3a6701d824adfe05dc28c09b6c1d64aeab9a183bc3b944d85f15f596e5c6c2b3` |
| `LICENSE` | 1081 | `852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d` |

Library: three.js, by the three.js authors, official repository
<https://github.com/mrdoob/three.js>, r160, peeled upstream commit
`d04539a76736ff500cae883d6a38b3dd8643c548`. MIT copyright 2010-2023 three.js
authors and full permission/warranty notice are retained in `vendor/LICENSE`.
Core is upstream-identical; loader/helper only have the existing local import
rewrites: `three` to `./three.module.js`, and loader utility import to
`./BufferGeometryUtils.js`. See [circuit-ward-sources.md](circuit-ward-sources.md)
and [circuit-ward-models.md](circuit-ward-models.md) for official blob evidence.
MIT covers the library, not game code or delivered artwork.

All static imports are local. Existing vendor HTTP(S) strings are comments,
specification/diagnostic references or the XHTML namespace, not new runtime
endpoints. Stock loader APIs accept caller URLs; they are not a sandbox. Future
view code must load only these local embedded-resource GLBs and must not add
remote textures, fonts, decoders, fetches or sockets. Use system/local fonts
via parent `assets`, with no font downloads.

## Stable worker contract

`Games/Foldwild/data.js` is a plain ES module with exactly these exports:

- `SPECIES`: 80 objects in roster number order, ids are lowercase names.
  Fields: `id, number, name, element, family, tier, stage, evolvesTo,
  evolveLevel, stats, abilities, model, bounds, unique`. `stats` is
  `{hp, energy, attack, defense, speed}`; `bounds` is `{width, height, depth}`
  in meters from normative specification, not rounded decoded measurements.
  Evolution ids and thresholds are explicit: 12 from stage 1, 26 from stage 2,
  null/null for terminal species. Non-boss third stages remain `evolved`.
- `BY_ID`: object keyed by id, pointing to the same species objects.
- `ABILITIES`: exactly 50 names, each containing `cost` and only its normative
  `power`, `status`, `heal`, `restore`, `shield`, `buff`, `debuff`, `cleanse`
  effects. Modifier `{stat, percent}` uses positive percentage magnitude;
  `buff` adds and `debuff` subtracts. Costs/powers are not inferred from flavor.
- `ELEMENTS`: `['Cindrel','Rillune','Loamveil','Gleamric','Hushmere']`.
- `ELEMENT_WHEEL`: Cindrel > Loamveil > Gleamric > Hushmere > Rillune > Cindrel.
  Battle worker applies 1.5 strong, 0.75 reverse, 1 neutral to damage only.
  Actions use their owner's element. Non-damaging effects have no multiplier.
- `OPTIONAL_HIDDEN_SPECIES = null`: horror model NOT DELIVERED. No invented
  name, stats, model, placeholder or configuration. Its absence must not cause
  a 404 request or block wild pool, loading or game start. Future unique hidden
  GLB budget target is 10,000-15,000 triangles, hard maximum 15,999, documentation
  only until delivery and approval.

Battle rules remain in the normative glossary: pay costs before effects, cap
healing/restore, two subsequent affected turns for modifiers/status, shields
through two subsequent owner turns, replacement rather than stacking, switch
clears temporary effects, cleanse removes only negative status. Scorch: 6
shield-bypassing HP each affected turn; Drag/Fray/Haze: -20% speed/defense/attack;
Hush: +2 cost. Wait restores 3 energy when no action is affordable and is not a
fifth ability. No battle implementation is included in this ingest.

## Verification

Run offline from repository root with this narrow game materialized:

```sh
git sparse-checkout add Games/Foldwild
node --experimental-default-type=module scripts/test_foldwild_data.mjs
for file in Games/Foldwild/data.js scripts/test_foldwild_data.mjs Games/Foldwild/vendor/*.js; do
  node --experimental-default-type=module --check "$file" || exit
done
git diff --check
```

Node version actually used: `v22.23.1`. All authored and three vendor JS syntax
checks exited 0. Initial unstaged `git diff --check` exited 0. Unchanged upstream
vendor whitespace warnings must be reported, not fixed by altering pinned bytes.
Asset/library payload is **8,715,342 bytes** before authored constants/evidence/
test. Initial disk free was `2.3G`, 2,388,041,728 bytes before ingest. After files
and staging it was 2,376,339,456 bytes (11,702,272 bytes disk-use growth,
including Git object storage). The 2 GB guard was never crossed. Only `Games/Foldwild` was added to the
original sparse selection `assets`, `docs`, `scripts` for verification.

Actual command-output digest:

```text
actual CLI exit: 0
CRC: 308 / 308 GLB: 90 / 90
classifications: {'FAMILY-SHARED': 75, 'BOSS/UNIQUE-GLB': 5, 'family-base prototype': 10}
errors: []
PASS: 80 exact roster species; 16/element; 10 families x8; 50 exact normative actions; evolution 12/26 acyclic; hidden null; wheel/schema; 80 tracked/local SHA matches; models=7300844 bytes
PASS: catalog=113 schema/unique integer IDs/all URLs tracked; no Foldwild entry; existing empty icons= 81
BufferGeometryUtils.js static imports: ['./three.module.js'] HTTP(S) reference lines: 0
GLTFLoader.js static imports: ['./three.module.js', './BufferGeometryUtils.js'] HTTP(S) reference lines: 48
three.module.js static imports: [] HTTP(S) reference lines: 63
PASS: all four vendor files byte-identical; local static import closure; authored constants have no runtime external loads; no authored personal/absolute paths
```

Full staged `git diff --cached --check` returned exit 2 for the unchanged
upstream `vendor/three.module.js:46517: space before tab in indent`. Authored
constants/test/evidence and all model paths pass their scoped staged diff check.
No pinned vendor byte was changed to hide this finding. An initial overstrict
catalog check rejected existing empty icon strings; schema type/ID/URL checks
then passed, with those 81 existing empty strings reported explicitly. A first
import scan included commented examples; an anchored static-import scan passed
with the actual closure above. Neither preliminary failure was a data discrepancy.

No game is implemented by this task. **Zero game-gate passes, no screenshots,
no browser-success claim.** Full `xvfb-run python3 scripts/smoke_test_games.py`
for all registered games remains mandatory before any push and pending here.
No push or registration is authorized/performed by this milestone.

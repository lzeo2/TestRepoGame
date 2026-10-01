# Circuit Ward vehicle delivery: pending, not integrated

## Scope and source

2026-10-01, delegation 34. Actual worker environment: provider `openai-codex`,
model `gpt-6.1-sol`; bounded to 10 minutes, mechanical audit/vendor/docs only.
The operator supplied three existing untracked GLBs and requested local
unchanged-byte vendoring. No download, generated replacement, metadata edit,
re-export, archive extraction or dependency installation occurred. No source
archive name, upstream URL, pinned upstream revision or independently verified
license was supplied for these files; none is invented here.

**Rights and concept/runtime gates remain pending separately for these three
assets.** Permission for the original six models does not clear these deliveries.
Main's prior review of two concept illustrations is not operator approval to
integrate these GLBs. This commit adds unused assets only, not vehicles, driving,
merges, abilities or wave behavior. Existing runtime, multiplayer, shell, catalog,
six models, library files and their source/permission docs were not edited by
this task. No new game or ID; Circuit Ward remains id 222.

The source wishlist is [circuit-ward-vehicles-concept.md](circuit-ward-vehicles-concept.md).
Its historical statements that delivery was pending describe that milestone;
this document records the later delivery, not successful concept fulfillment.
Original game/library provenance is [circuit-ward-sources.md](circuit-ward-sources.md),
and the original six models remain documented in
[circuit-ward-models.md](circuit-ward-models.md). New credit sections are in
[the game credits](../Games/Circuit%20Ward/CREDITS.md).

## Delivered bytes and decoded counts

Paths below are relative to `Games/Circuit Ward/models/`. Dimensions are decoded
local POSITION bounds, rounded here to meters, not metadata guesses. Nodes have
no TRS/matrix, so these local bounds also describe the default world placement.
All minY values are zero and X/Z bounds are centered within float precision.

| File | Bytes | Actual triangles | Operator-reported triangles | Concept cap | Decoded X/Y/Z m | Concept target X/Y/Z m |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| `cv-scout-hover-runner.glb` | 132580 | 1060 | 1060 | 1600 | 1.50 / 0.90 / 2.20 | 1.65 / 0.65 / 2.40 |
| `cv-rail-van.glb` | 221300 | 1776 | 1776 | 2400 | 2.00 / 1.30 / 3.40 | 2.05 / 0.90 / 3.00 |
| `cv-aegis-goliath.glb` | 306240 | 2476 | 2476 | 4000 | 2.80 / 1.90 / 4.80 | 2.80 / 1.25 / 3.90 |

Total: **660120 bytes, 5312 triangles**. All three reported counts match and all
three concept triangle caps pass. SHA-256 before audit, after audit and after
staging is unchanged:

| File | SHA-256 |
| --- | --- |
| `cv-scout-hover-runner.glb` | `580f158cc149f9a21ebe9ea26dd7e7ef965fa849dcc1c6c7d61835689b0e18e7` |
| `cv-rail-van.glb` | `cf5c9de578d333eb0e869119abdd849302ffad2534c2a7719e3ea176fc16e672` |
| `cv-aegis-goliath.glb` | `9c6f844817dff824b6bf558d8c944f83a232b43e1cfec407f7e5f3efa31e6ab2` |

Distinct hashes prove distinct bytes only, not shared Scout/Rail geometry,
unique top-tier topology, original authorship or visual tier compliance.

## Structural findings: 0/3 strict passes, audit exit 1

The thin stdlib wrapper imports `audit_glb`, `unpack_glb` and `decode` from
`scripts/audit_monster_archive.py`; there is no second GLB parser and that shared
helper is unchanged. It calls `audit_glb(data)` without monster species metadata.
On all three files the shared strict indexed-mesh contract rejects missing
`indices`. These are non-indexed TRIANGLES, not evidence of invalid glTF: the
local r160 Node loader separately parses all three successfully. The wrapper
records the rejection rather than weakening the helper or changing delivered
bytes. It reuses the decoder to obtain diagnostic counts/bounds and to validate
every accessor's finite values and buffer bounds. A rejection is never a pass.

Additional findings, all three files:

- One node, one joined mesh, one primitive, one material; POSITION/NORMAL/COLOR_0.
  No textures, images, skins, animations, external buffer or declared extensions
  were found. No rig or compression observed. All three have opaque base material,
  metallic 0, white base tint, zero emission and roughness **0.86**. This is high
  roughness but differs from the shared strict auditor's required **1**.
- All decoded dimensions differ from the concept targets. The wrapper compares
  them with `1e-5` absolute tolerance for float encoding, not a visual tolerance.
- All metadata declares **front -Z**, whereas the vehicle wishlist requests **+Z**.
  This is a contradictory assertion, not geometric verification of facing.
- Shared audit stops before flat-normal/winding and complete material checks;
  those cannot be represented as passed. Node confirms normal attribute presence,
  not correct shading or winding. Original bytes remain untouched.

Metadata also describes Scout as a `low angular canopy`, Rail as a boxy utility
hull with roof rail/cab window, and Goliath as a layered armored shell with
`centered turret top block`. Component labels mention canopy/entry hatch, cargo
and cab doors, roof and turret features. These assertions raise an open-seat/
no-roof concept discrepancy; no visual review of delivered meshes was performed
here. Family sharing, pod counts, colors, top-tier uniqueness, open-seat visibility
and actual silhouette require main/operator review, not inference from names.

No personal-email, machine-path or common secret-token patterns were found in
any GLB JSON string scan. This is a bounded pattern scan, not a legal/security
certification.

## Metadata assertions, not a license grant

All three asset headers assert:

- Generator: `Original maintenance-bay hover vehicle builder`.
- Creator: `OpenAI assistant, created for the user`.
- Source: `Original procedural artwork created for this request. No third-party
  models, textures, scans, downloaded art, or other third-party asset content used.`
- Usage permission: `The user may use, modify, and redistribute this original
  deliverable for commercial and noncommercial purposes.`

These are quoted embedded claims only. Actual creator/provider identity, source
ownership, third-party exclusion and enforceable usage/publication terms are
**not independently verified**. No CC0 field was found; no CC0 or other license
is assigned by this task. Keep the original six-model permission scope separate.
An operator source/rights record and explicit concept/runtime approval are still
needed before integration/publication of these three deliveries.

## Reproduction and actual verification

From repository root:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/audit_circuit_vehicles.py --self-test
PYTHONDONTWRITEBYTECODE=1 python3 scripts/audit_circuit_vehicles.py
```

Actual self-test output:

```text
PASS: malformed ZIP paths/collisions/expansion/symlink/encryption/CRC; GLB exact length/chunks/external buffer/accessor bounds; JSON duplicates/nonfinite
PASS: three unique vehicle declarations; reported counts; cap/mismatch/invalid-count rejection
```

Delivery audit: **exit 1**, `structural_pass=0`, `model_count=3`. Each model records
strict missing-index rejection, roughness discrepancy, concept dimensions
mismatch and declared forward-axis mismatch. Counts/caps and unchanged-byte
checks pass separately, not as a claim of full structural/concept clearance.
External audit log: `/tmp/circuit-workers/vehicle-delivery-audit.json`.

A bounded Node-only check imported the existing local r160 GLTFLoader, called
`parse` on each exact byte buffer and blocked fetch/XMLHttpRequest/WebSocket.
No module/library files were edited. Actual results:

```text
revision=160; network_requests=0
cv-scout-hover-runner.glb: meshes=1; triangles=1060; normals=3180
cv-rail-van.glb: meshes=1; triangles=1776; normals=5328
cv-aegis-goliath.glb: meshes=1; triangles=2476; normals=7428
Node GLTFLoader.parse PASS; not WebGL/browser QA
```

External result: `/tmp/circuit-workers/vehicle-delivery-node.json`.
This is not integration, rendering, a browser test, a frame-rate benchmark or
hardware evidence. No screenshots were generated or claimed for these deliveries.
No visual family/tier pass is claimed.

The cached tracked-content reference audit for all three `cv-` filenames found
no consumers before staging. After staging their references are credits and
this delivery document/script only; no game runtime reference. The constructed
`./models/${name}.glb` loader iterates the six-entry `modelNames` list:
`cover-console`, `sentry-walker`, `buzzer-drone`, `coil-blaster`, `repair-cell`,
`arena-wall`. It does not enumerate the models directory. None of the three
vehicle names is in that list. No external runtime loads were added. Catalog
check output:

```text
catalog schema/unique IDs/tracked URLs PASS: 115 games; no additions by this task
```

Scoped diff whitespace checks pass. Mandatory full-game release gate was **not
run** during concurrent writers; **zero release-gate passes claimed**. Main must
run the full registered-game smoke gate after freeze before any push, independently
of pending rights/concept decisions. No release claim and no push.

## Storage and handoff

`df -h / | tail -1` showed **2.3G free** before narrow sparse materialization,
**2.2G free** afterward, above the ordinary 2GB stop threshold. Rounded readings
are not an exact free-space delta, and other writers are active. The supplied
660120 binary bytes already existed in the workspace, so vendoring did not
copy or grow those files. Logical tracked asset addition is 660120 bytes, plus
this small script and two Markdown files; Git object overhead is separate.
`git sparse-checkout add 'Games/Circuit Ward'` was used before staging, preserving
Foldwild/Tag Relay/Spline Ride and all original selections. Ward remains included
for the concurrent core/final-gate work; no broad Games checkout or sparse reset.

Only the three deliveries, new game CREDITS, this document and the audit wrapper
are owned/staged/committed here. Other workers' dirty paths are left untouched.
The three assets are operator-supplied deliveries, not new games, ingested upstream
ports or worker-created replacements. Freeze after the explicit-path local commit.

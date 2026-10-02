# Foldwild source-surface accessory attachments

Delegation 55, actual provider `openai-codex`, model `gpt-6.1-sol`.
Scope: `Games/Foldwild/view.js`, `scripts/test_foldwild_attachment.py`, this report.
No new game, registration, catalog ID, dependency, original-model edit or push.

## Root fix

Global bounding-box width previously placed badges/scarves outside the body at
an unrelated height. The shared creature creation path now updates world matrices
on the scaled source clone and casts horizontal rays before any accessory exists.
It tries four heights and three bounded depth offsets, stopping at the first
actual source-triangle intersection. The accessory's inward face center contacts
that point; its center is displaced outward by half its thickness (badge 0.0225 m,
scarf 0.04 m). This applies to inspection, battle and world creatures without
changing their APIs, source vertices/materials, scale, camera or core-owned clock.

The paper-hat placement is unchanged. If no source surface is found, the accessory
is omitted and an honest status appears; the actual source model is retained.
`inspect().cosmeticAttachments` adds frozen observational copies of the species,
accessory, anchor, actual shape position, thickness and side. It exposes no scene,
mutable geometry or simulation controls. Nothing is raycast per frame.

## Runnable verification

Commands completed with exit 0:

```sh
node --experimental-default-type=module --check Games/Foldwild/view.js
PYTHONDONTWRITEBYTECODE=1 timeout 180s xvfb-run -a python3 scripts/test_foldwild_attachment.py
PYTHONDONTWRITEBYTECODE=1 timeout 180s xvfb-run -a python3 scripts/test_foldwild_inspection.py
git diff --check -- Games/Foldwild/view.js scripts/test_foldwild_attachment.py docs/foldwild-attachments.md
```

Actual attachment output:

```text
"actual_source_models": 80
"badge_scarf_contacts": 160
"max_independent_triangle_distance": 3.521787733787174e-16
"unchanged_source_sha256": 80
"normal_console_page_errors": 0
"http_errors": 0
"failed_requests": 0
"external_requests": 0
PASS: 160 actual badge/scarf source-triangle contacts; 46 native captures; unchanged 80 GLBs; no autonomous RAF or browser/request errors
```

The check independently loads each unchanged source GLB without a second renderer,
normalizes its geometry and computes closest-point distance against every source
triangle. It verifies the actual accessory inner-face position, not merely a ray
metadata assertion or bounding-box fit. Each preview must load the correct model,
have no fallback, keep one active reference and a cache of at most 12 entries.
The same canvas fits the complete bounds, including a 180px portrait host; it
renders no autonomous frames during a two-second wait. The HTTP server on port
8804 and browser close in `finally` blocks.

The unchanged inspection regression also returned:

```text
"species_none": 80
"preview_transitions": 120
"repeat_world_battle_inspection_cycles": 40
"stable_resources": {"cacheSize": 12, "modelReferences": 1, "geometries": 16, "textures": 0}
PASS: 80 actual species, 120 previews, independent rotation, 40 scene cycles, single-touch, races, disposal and isolated fallback
```

Its normal browser/load/external error counts were zero. Its separate intentional
missing-model case produced exactly one HTTP 404 and the expected honest marker;
this is not part of the clean normal-path count. Both test ports had no listener
when checked after completion.

## Captures and limits

Native WebGL1 JPEGs are temporary evidence, not committed assets. Main should read
these fresh defect-specific captures for subjective review:

- `raymote-scarf-three-quarter.jpg` and `raymote-scarf-side.jpg`
- `budriv-badge-three-quarter.jpg` and `budriv-badge-side.jpg`

They are under the temporary `foldwild-m2-attachments` directory. It also contains
40 desktop captures spanning ten families and none/badge/scarf/paper-hat, plus
front views of the two reported defects: 46 captures, 561854 bytes total.
The rerun inspection check refreshed its separate `foldwild-m2-inspection`
captures, including mobile Budriv/badge. Worker read the fresh side/three-quarter
images to confirm evidence collection; Main retains aesthetic acceptance.

Disk remained 2.4 GB free. Final attachment rerun observed a shared-workspace
free-space delta of +16384 bytes consumed; concurrent work makes this unsuitable
as exclusive task attribution. The two screenshot directories together occupied
about 1.3 MB. No models/dependencies were materialized.

The 160 checks prove tangible source contact, not all-80 subjective styling,
complete accessory footprint non-intersection, hat fit certification, cloth
physics or N100 FPS. Full campaign, secret creature, procedural frontier,
registration/publication and the fresh full registered-catalog release gate
remain outside this task and unclaimed.

# Operator external-hero integration

Runtime integration: **`f73a500` (`jank3d: external-hero-models`)**.
Saved render evidence, input custody and six-line inventory update: **`40ba135`**.
Asset audit/copy: `459a41d`; rigid adapter: `13de85f`; canonical rig regression:
`371c2e4`. No push or new game/ID; catalog remains 127.

## Verified result

The completed first Jankolock gate has **four before/after pairs, 11 native
1280x720 screenshots, 361 HTTP200 responses, zero retained page/console/request
errors and 100 stable current source/resource hashes**. Four additional PNGs
are labeled comparison composites, not extra native captures. The orchestrator
inspected all four pairs, the deployed prop and integrated lobby/HUD images.

The before namespace served the actual committed files from Git **`bf215f0`**;
those modules and GLBs ran in Chromium. After views used current files. Both
use the same normal devhero camera/spawn and dark-default UI, without staged
camera, health grants or substituted character renders. New views also exercised
native W movement for every hero and native Turretina deployment. Separate
normal integrated-page captures verify the lobby, five bots and six cached
character/prop assets; the unchanged portrait remains separate.

| Hero | Native before | Native after | Labeled comparison |
| --- | --- | --- | --- |
| Stampead | [Before](stampead-before.png) | [After](stampead-after.png) | [Pair](stampead-before-after.png) |
| Turretina | [Before](turretina-before.png) | [After](turretina-after.png) | [Pair](turretina-before-after.png) |
| Snipeoff | [Before](snipeoff-before.png) | [After](snipeoff-after.png) | [Pair](snipeoff-before-after.png) |
| Gooey | [Before](gooey-before.png) | [After](gooey-after.png) | [Pair](gooey-before-after.png) |

Additional native frames: [deployed stapler](deployed-stapler-after.png),
[integrated lobby](integrated-lobby-after.png), [integrated HUD](integrated-hud-after.png).

## Delivered files and bindings

| Asset | Bytes | Triangles | Drawables | Movable nodes |
| --- | ---: | ---: | ---: | ---: |
| Stampead | 948,632 | 25,596 | 69 | 17 |
| Turretina | 1,022,124 | 22,416 | 81 | 23 |
| Snipeoff | 818,532 | 19,160 | 75 | 20 |
| Gooey Sticky | 1,242,716 | 48,760 | 30 | 10 |
| Deployed stapler | 161,804 | 3,248 | 16 | 5 |

Four hero GLBs total **4,032,004 bytes**. Including the prop, five delivered
files total **4,193,808 bytes / 119,180 triangles**. With unchanged trooper and
portrait there are seven live GLBs, **9,014,644 bytes**. The trooper remains
`a15c25e`: 31,730 triangles, 1,592,464 bytes, 12 drawables. No new trooper cycle.

Only these five local deliveries were audited, not the dot's wider 23-asset
batch. All copies retain the exact delivered GLB hashes. Supplied lower counts
are accepted under the explicit replacement order, without padding to the old
procedural minimum. Gooey intentionally has ten rigid nodes. More drawables
can offset fewer triangles; none of these totals establishes GPU FPS.

Receipts verify actual geometry, bounds, indices, normals and rigid axes/pivots.
The loader verifies GLB plus manifest/palette/rig SHA values. All named material
slots match; supplied linear RGBA, roughness and metalness are retained without
an extra sRGB conversion. Materials are isolated per instance; shared original
512px surface/normal maps use existing families. Fourteen missing-UV geometries
receive runtime-only planar attributes; delivered vertex/index bytes do not
change. The pose adapter respects rest transforms and supplied limits. Turret
yaw/pitch/press/recoil use its real nodes and cosmetic muzzle; authoritative
attack origins, ranges and damage remain unchanged.

Fresh CPU checks passed: five unchanged-file audits and corruption checks;
2,540 rigid poses including limits/static nodes/rest/root/grips; four linear
palettes; 16 kit/seven generic FX; turret geometry sharing/material isolation;
hero runtime, eight bot groups, both simulated 600s win chains, unchanged
candle behavior and UI eight checks. These are not native full matches.

## Custody and cleanup

`input-audit.json` records **25 original files / 4,433,562 bytes** and their
retained destinations/hashes. All five `manifest.rig.json` aliases were exactly
identical to canonical `rig.json`; their original bytes are retained there.
The supplied manifests, palettes, rigs and GLBs remain beside each live model.

Before deletion, cached-Git grep and constructed-path tracing found only
provenance/README mentions and the optional offline `--ingest` consumer.
Runtime URLs are fixed to `models/<id>/`. Default `--check` and the rig test
read canonical model directories, not the raw drop. No symlinks or unknown
input files were present. After successful render QA and exact-copy checks,
the operator-authorized `external-art/` deletion completed. Both read-only
canonical checks passed again without that directory. No shared Git lock,
external cache, protected tree or other owner's mockup was deleted.

The original procedural results remain in Git at `bf215f0`, including their
source and all original GLB bytes. Historical packet verification now reads
those model/source bytes from Git rather than comparing old hashes to new art.
No old screenshot or individual capture receipt was rewritten.

## Qualifications and recovery

Manifests declare externally Blender-authored original art by the operator's
dot. No repository agent launched Blender/bpy, installed dependencies or made
new wishlist models. The declared `.blend` source was not delivered; creation
history and originality remain operator declarations, not independently proven.
These are stylized stationery assemblies, not a photoreal/concept-fidelity
claim. Rigid slide/jump, planted feet, full aiming, IK/skinning, animation
clearance, 40 FPS, real handheld play and release acceptance remain held.

The host fell below its ordinary disk floor after the completed gate. The
verified raw drop was removed as a shrink-only authorized operation; existing
evidence/inventory were safely committed in `40ba135`. The answered recovery
ticket then authorized at most 10,000,000 bytes of remaining docs/index work,
`TMPDIR=/dev/shm`, hard stop below 1,800,000,000 free bytes, no new assets,
no browser retries and no push. This final prose pass uses that bounded waiver;
it does not repeat deletion, rendering or the inventory commit.

Read-only integrity commands (no browser rerun needed):

```sh
node Games/Jankolock3D/models/import-external.mjs --check
node Games/Jankolock3D/heroes/external-rig-test.mjs
python3 -B docs/maintenance/audits/jankolock-3d-qa/visual-pass/verify.py
python3 -B scripts/check_maintenance_docs.py
```

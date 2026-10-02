# Foldwild M2 inspection presentation

Delegation 51. Actual environment: `PI_PROVIDER=openai-codex`,
`PI_MODEL=gpt-6.1-sol`. Existing original Foldwild only; no registration or push.

## Owned implementation

- `Games/Foldwild/view.js`: `await showInspection({speciesId, cosmeticId='none'})`
  validates canonical species and the four supported accessory IDs before
  changing presentation. One actual creature uses the existing root, loader,
  renderer, canvas and 12-entry reference-safe cache. No new animation loop.
- Preview orbit/recenter and single-pointer/single-touch dragging use independent
  `inspectionYaw`. `getCameraYaw()` keeps the world heading. Deliberate rotation
  works with reduced motion and a paused simulation (`render(0)`).
- Actual model/accessory bounds determine conservative all-angle camera framing,
  recalculated for resized hosts. Existing presentation generation guards prevent
  late selection/close/dispose loads from restoring an obsolete scene.
- `inspect()` adds frozen bounds/target, inspection yaw and active model-reference
  counts for verification. These are observations, not mutable gameplay hooks.
- Original models, source materials/colors, data, vendor code, core and shell are
  untouched by this implementation. Existing accessory shapes are reused.

## Actual checks

Commands completed successfully:

```text
node --experimental-default-type=module --check Games/Foldwild/view.js
syntax exit=0

git diff --check
diff-check exit=0

xvfb-run -a python3 scripts/test_foldwild_inspection.py
inspection test exit=0
PASS: 80 actual species, 120 previews, independent rotation, 40 scene cycles, single-touch, races, disposal and isolated fallback

xvfb-run -a python3 scripts/test_foldwild_view_v2.py
existing v2 view exit=0
PASS: native desktop/mobile WebGL1 view, camera, actual models, action motion, 40 races, LRU and disposal
```

The new standalone native HTTP check uses port 8801, finally shuts down its
server/browser, and calls the real view directly without a loader mock. Its one
canvas/view is moved between host elements and resized to desktop, 390px phone
and 180px portrait-preview widths. It does not load the core entry module.

Recorded results:

- All 80 species inspected with `none`; 80 unique actual local GLB requests.
- 120 preview transitions: 80 originals plus four accessories/options on one
  representative species in each of ten families. Four quarter-turns and recenter
  checked for each original; bounding corners stay inside the camera viewport.
- Maximum original-only preview counts: 2 draws, 1,674 triangles.
- 40 repeated world/battle/inspection cycles; repeated ending resources equal:
  cache 12, active model references 1, geometries 16, textures 0.
- Zero normal console/page errors, HTTP errors, failed requests or external
  requests. Unknown species/accessories reject without changing the world scene.
- Separately induced local GLB 404 produces an honestly reported fallback;
  subsequent real loading recovers. This one expected HTTP/console failure is not
  included in normal clean-loading results. Pending-load disposal leaves no
  model references or cache entries, and cannot advance renderer frames.

## Captures and remaining gates

44 JPEGs are in the temporary output folder `foldwild-m2-inspection`, totaling
535,533 bytes. Forty desktop images cover all ten representative families with
none/badge/scarf/paper-hat. Four phone captures are
`mobile-cindupp-none.jpg`, `mobile-dewgob-scarf.jpg`,
`mobile-flarivet-paper-hat.jpg` and `mobile-budriv-badge.jpg`.
The actual preview canvas is 240px tall, with unchanged source colors.
The native-test log is `foldwild-m2-inspection-test.log` in the temporary folder.
Main owns subjective model/accessory and integrated-shell screenshot review.

Disk remained 2.4 GB free. The final new-check shared filesystem measurement was
12,288 bytes net growth; that is not isolated worker accounting because other
workers share the tree. Owned captures total approximately 0.51 MiB; no asset
materialization, dependencies or persistent servers were added.

This proves presentation only. Core ledger opening/equipping/closing is a separate
integration task. It does not certify accessory fit across all 80 species,
full campaign/acquisition, reference N100/Chromebook frame rates, rights/publication,
or the mandatory fresh unfiltered registered-catalog release gate. Horror remains
inactive. No game, catalog ID, registration or push was added.

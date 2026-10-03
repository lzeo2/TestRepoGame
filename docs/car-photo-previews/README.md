# Current original car previews

Actual local Chromium/SwiftShader renders of showcase source `43e76d6084d61165a7ea6cd9a679173674727d83`. Not generated photography, a live-game fleet replacement or photographic certification.

- [Pip exterior](pip-exterior.jpg)
- [Brindle exterior](brindle-exterior.jpg)
- [Brindle hatch](brindle-rear.jpg)
- [Brindle physical cockpit](brindle-cockpit.jpg)

Main opened all four images before copying these unchanged JPEGs. Fictional plates read correctly, Brindle's hatch handle/seam are visible and its paired projectors now share a continuous curved cover. Bodies, cabin surfaces and lighting still look stylized; photo-quality acceptance remains unmet.

`capture_car_studies.py`: visual-only exit0 / 84.8389s, source hashes unchanged, local-only requests, zero recorded errors, nonblank image checks, exact actual cockpit eyes and mobile overflow checks. External scratch basename `car-studies-visual-sev3_n1x`; ledgers `car-detail-visual-preview.log` and matching result JSON. A preceding capture was interrupted by the preview request before any image/result was saved; it is not a completed check.

The unchanged 20-second focused gate at this source exited1 / 41.1914s on first-frame `Page.wait_for_function: Timeout 20000ms exceeded.` No recorded errors; post-shutdown diagnostic snapshot unavailable. Retained `car-detail-native-1` ledgers. No retry or timeout change cleared this gate.

Node stub-canvas check `node --experimental-default-type=module scripts/test_car_study_materials.mjs`: two cycles per car pass finite attributes/matching UVs, fresh resources and unique disposal, grounded four wheels, physical-eye bounds, plates/map dimensions and texture bytes. Pip29,164 triangles/25 meshes; Brindle29,376/34; each8 textures/917,504 base RGBA bytes. Stub results do not establish actual text appearance; images above do.

No games added or registered; game/fleet/vendor/catalog unchanged; no push or full release gate.

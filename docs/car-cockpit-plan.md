# Rounded original cars and cockpit study

Owner follow-up: curvier bodies, tinted glazing, greater surrounding detail and essential cockpit mode, aimed at a more believable real-car appearance. This iteration continues the two original opt-in showcase studies; it does not silently replace the live fleet or claim a drivable cockpit was integrated into either held game.

## Bounded ownership

- Astra111: `assets/car-arcade/showcase/pip.js`, rounded continuous body/roof, tinted windows, physical cabin/dash/wheel.
- Astra112: `assets/car-arcade/showcase/brindle.js`, same goals with distinct original five-door bodywork.
- Astra113: `assets/car-arcade/showcase/studio.js`, `index.html`, new `garage.js` if useful. Original offline garage surroundings, exterior/cockpit camera switching, accessible real input and resource lifecycle.
- Main: frozen real-browser test, source/session review, actual captures, subjective review, documentation. No overlapping worker files; 8-minute leases. No new games/catalog entries, installs, external assets, vendor or game edits.

## Shared contract

`createCar()` remains a fresh group, forward -Z, four wheels, ground within .015m; target ≤25k/max30k triangles and ≤75 meshes. Physical geometry for the dashboard, instrument binnacle, wheel/spokes, vents, console and seats; no flat cabin overlay. Root `userData.cockpit={eye:[-.34,1.14,.16],target:[-.34,1.12,-2]}` (Brindle driver x=-.36). Named `window-glass` materials permit view-specific alpha tint without refraction. Mesh maps remain absent; original local procedural maps for garage surroundings are allowed, not photographic/downloaded/OEM assets. Match glass, pillar, roof, hood and panel joins; no detached trim or open caps. Artists may reduce wasteful tessellation, never cabin visibility or silhouette quality merely to chase counts.

Cockpit toggle `#cockpit`, C, Escape to exterior, drag/arrow/button look, reset and car selection must work on keyboard and touch. Exterior bounds remain framed; cockpit camera is truly inside the current car and aligned to its transformed -Z axis, with near plane suitable for nearby geometry. Through-windshield scene visible; no false driving/speed claims. Read-only snapshots include `view`, `cameraLocal`, `look`, `garageTriangles`, `garageMeshes` and existing diagnostics. Disposal includes distinct generated textures exactly once. Keep event-driven rendering, local requests, no transmission framebuffer or dependencies. UI house style/focus/44px controls preserved.

## Acceptance

Independent finite geometry/ownership/cabin position/material checks, real exterior and interior captures for both cars, actual C/buttons/arrow/reset/car-selection and mobile touch/reload checks, local-only requests, error collection, stable committed source hashes and resource lifecycle. Keep 20s readiness and existing timeouts. Main opens images before claiming appearance; triangle count alone never means photorealistic. After two failures stop and ask owner/operator, never loosen waits/assertions. No publication, registration, push or full-catalog QA implied by a focused studio check.

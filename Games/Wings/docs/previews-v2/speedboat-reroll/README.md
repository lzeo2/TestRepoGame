# Speedboat candidate: operator pixel review

Captured 2026-10-19. Standard Three 0.186.0 on Chromium/SwiftShader, not native
Wings gameplay. The operator approved the initial hull shape; realism approval
is still pending. Parent rejected the first flat reroll, reviewed the second at
multiple angles and below, then closed a bow seam exposed by the true front view.

Final asset: [`models/speedboat.glb`](../../../models/speedboat.glb).
17,252 triangles, 92 used material definitions, 258 primitive assignments.
See [stats](stats.json) and [camera/material/capture receipt](browser.json).
No texture images. All finishes and vertex occlusion are generated locally.

## Desktop files

| View | Light | Dark |
| --- | --- | --- |
| Front | [PNG](boat-reroll-light-front-1000.png) | [PNG](boat-reroll-dark-front-1000.png) |
| Side | [PNG](boat-reroll-light-side-1000.png) | [PNG](boat-reroll-dark-side-1000.png) |
| Top | [PNG](boat-reroll-light-top-1000.png) | [PNG](boat-reroll-dark-top-1000.png) |
| Rear | [PNG](boat-reroll-light-rear-1000.png) | [PNG](boat-reroll-dark-rear-1000.png) |
| Lit belly | [PNG](boat-reroll-light-belly-1000.png) | [PNG](boat-reroll-dark-belly-1000.png) |
| Bow quarter | [PNG](boat-reroll-light-bow-quarter-1000.png) | [PNG](boat-reroll-dark-bow-quarter-1000.png) |
| Stern quarter | [PNG](boat-reroll-light-stern-quarter-1000.png) | [PNG](boat-reroll-dark-stern-quarter-1000.png) |

Mobile: [light bow quarter](boat-reroll-light-bow-quarter-390.png),
[dark stern quarter](boat-reroll-dark-stern-quarter-390.png).

The belly uses explicitly labeled below-model diagnostic lighting. Other views
share procedural environment/key/fill lighting with self-shadows. Cameras fit
actual projected geometry without changing model scale or recoloring materials.
The result remains a clean game model, not a claimed photographic reproduction.
These files do not prove the native scene triangle budget, weapon fire or restart.

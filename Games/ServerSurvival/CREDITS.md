# Server Survival

- Upstream: https://github.com/pshenok/server-survival
- Revision: `7804e5969e28267cd33837e023eb46fa65da72b7`
- Author: Kostyantyn Pshenychnyy and upstream contributors.
- License: MIT, verified in the upstream root `LICENSE`, retained here. No separate asset exception was found in the inspected tree. Audio is retained from that repository under its published repository license; no independent authorship claim is made.
- Runtime dependency: Three.js `0.128.0`, npm distribution, MIT notice at `vendor/THREE-LICENSE`.
- Styling dependency: Tailwind CSS `3.4.17`, MIT notice at `vendor/TAILWIND-LICENSE`. Generated CSS only, not the CDN compiler.

## Local modifications

- Replaced both CDN scripts with local Three.js and precompiled Tailwind CSS. No game build is required: native ES modules are served directly.
- Removed remote social-preview metadata; changed the dependency failure message to describe local files.
- Removed decorative emoji and em dashes from first-party HTML/JS, sentence-cased standalone English display labels, preserved technical acronyms, and gave the malicious-traffic indicator a text label.
- Added `port.css`: visible focus, 44px minimum button height, reduced-motion support, removal of uppercase transforms and gradient headings. Original game mechanics, scene colors, modes and layout are retained.
- Imported only runtime HTML/JS/CSS/audio plus license. Git metadata, contributor tooling/tests, README animation and OS metadata are not runtime dependencies and were not imported. No console suppression wrapper or tracking script was found.

## Reproducing the local CSS

Outside the portal repository, install `tailwindcss@3.4.17` and `three@0.128.0` with npm. Copy Three's `build/three.min.js` and `LICENSE`. Create a CSS input containing `@tailwind base; @tailwind components; @tailwind utilities;`, then run Tailwind with:

```
-i input.css -o Games/ServerSurvival/vendor/tailwind.css --content './Games/ServerSurvival/index.html,./Games/ServerSurvival/game.js,./Games/ServerSurvival/src/**/*.js' --minify
```

## Verification

`python3 -B scripts/test_phase3_ports.py ServerSurvival --port 8233`

Native start, C shortcut, firewall placement, budget deduction, play/pause and restart passed. Zero observed console errors, local HTTP errors or attempted external requests while all non-local requests were blocked. Desktop/mobile screenshots under both color-scheme preferences are in `docs/phase3-evidence/`. This upstream uses a fixed dark theme. Campaign completion, all eleven locales, save-file imports and real touch/hardware performance are not certified by this bounded test.

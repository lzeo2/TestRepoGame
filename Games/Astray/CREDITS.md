# Astray

- Upstream/author: [wwwtyro/Astray](https://github.com/wwwtyro/Astray), by wwwtyro.
- Revision: `d3c4f61f2cbbe35752fbfa205f85a41d7f9fe0f0`.
- Game license: Unlicense, verified in the upstream `License.md` and retained. Textures were supplied in the same tree with no separate terms found.

## Dependencies

Original vendored libraries retained, with additional complete notices in `vendor-notices/`:

- Three.js revision 49, MIT: https://github.com/mrdoob/three.js/blob/r49/LICENSE
- jQuery 1.7.2, MIT option: https://github.com/jquery/jquery/blob/1.7.2/MIT-LICENSE.txt
- KeyboardJS, Robert William Hurst, BSD as specified in its header. Complete historical notice: https://github.com/RobertWHurst/KeyboardJS/blob/fa33b75093c220e845925dc1a719f7e0fd7874ba/license.txt . Astray's copy includes a different global/AMD wrapper and polyfills; do not label it the current MIT release.
- Box2DWeb, zlib-style license by Erin Catto, from https://github.com/hecht-software/box2dweb/blob/03ff76dac7f9961668011b44c5ae716a30dd0b6f/Box2D.js . The original Astray minified file byte-compared identical to that revision's `Box2d.min.js` before whitespace normalization.

## Local modifications

- Relative paths for all three textures; title, viewport, language, doctype and local favicon.
- Plain native Restart button reloads the original game, starting at level 1.
- 44px pointer direction buttons feed the existing physics impulse, clear on release/cancel/lost capture/blur, and leave original keyboard controls intact.
- Persistent concise control help, readable system-font fallback and focus indication. Original maze, physics, rendering and automatic level progression retained.
- Trailing whitespace normalized. No analytics or CDN runtime dependencies were found.

## Verification

`python3 -B scripts/test_phase3_ports.py Astray --port 8234`

Automatic start, arrow-key movement, I help, restart to level 1, pointer direction movement and release passed. Console errors 0, HTTP errors 0, external requests 0. Screenshots in `docs/phase3-evidence/`. The two color preferences intentionally retain original scene art. Pointer testing is not physical-touch acceptance; complete maze traversal and long-run GPU resource behavior were not tested.

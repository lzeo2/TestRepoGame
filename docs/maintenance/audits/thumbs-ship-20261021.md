# Thumbnail and game merge shipping receipt (2026-10-21)

## Scope and explicit release exception

The operator explicitly ordered `feat/thumbs` pushed to `origin/main` with
exceptions documented and the full registered-game smoke skipped for this push.
This receipt records that release exception, not a full-fleet PASS. No full
fleet gate was run for this release; historical fleet results do not substitute.
Native hardware, rights and gameplay holds in the existing manuals remain.

Merge `18884f3` preserves both catalog entries: 235 Below the Obvious, then
240 JANKOLOCK. The resulting catalog has **127**, not the anticipated 126,
registered games and 132 projects including five unregistered projects.
The operator selected the trivia name on 2026-10-21; its directory and storage
namespace remain unchanged. Both games were already authored on merged branches,
not newly built during this shipping pass. They are originals, not ingested ports.
Trivia build/register: `3c55f5f`, `c119c77`; JANKOLOCK build/register:
`ff6b0b9`, `68603c5`, `940cbba`. The merge includes 139 tracked thumbnail JPGs.

## Actual targeted verification

- Catalog: `PASS: 127 unique catalog entries; schema and tracked URLs valid`.
- `node scripts/test_dive_trivia.mjs`: `Dive Trivia: 8 checks passed (TZ=system).`
- `node --check Games/Dive\ Trivia/script.js` and
  `node --check assets/portal-ux.js`: exit 0.
- `SMOKE_PORT=8917 CHROMIUM_PATH=/usr/bin/chromium xvfb-run -a python3 -B scripts/smoke_test_games.py --games 'Below the Obvious'`:
  `ok Below the Obvious console_errors=0 failed_reqs=0`; `== 1/1 games pass ==`.
- `python3 -B scripts/check_maintenance_docs.py` after inventory refresh:
  `PASS: 132 game documents cover 127 registered + 5 unregistered games; Git inventory current.`
- Real headless system Chromium loaded `index.html` at 1440x1000 and 390x844,
  each in dark and light themes. Each visit reported 127 cards, 110 images with
  positive naturalWidth, zero broken image elements, 17 SVG fallbacks and zero
  JavaScript pageerrors. Each also logged 17 resource-404 console errors for
  absent thumbnail URLs; this is NOT a zero-console-error result. The fallback
  removes failed images as designed. No runtime scripts or load policies changed.
- Four screenshots visually reviewed at
  `.swarmforge-logs/ship-thumbs/{desktop,mobile}-{dark,light}.png` (ignored).
  Layouts remain readable; mobile categories scroll horizontally.
- The bounded portal server and browser terminated. Original sparse selection
  restored to assets/docs/scripts after targeted verification.
- Superhot has no tracked diff and is excluded from shipping changes. Protected
  Character AI, proxy and Netlify boundaries have no diff against origin/main.

## Known check exception

The combined diff whitespace check found the existing imported vendor line:
`Games/Jankolock/vendor/three.module.js:46517: space before tab in indent.`
Vendored Three.js was left unchanged. The shipping pass's owned-path whitespace
check passed. This whitespace finding is not a runtime smoke failure.

Publication and live HTTP checks follow the push; this pre-push receipt does not
claim that deployment has completed.

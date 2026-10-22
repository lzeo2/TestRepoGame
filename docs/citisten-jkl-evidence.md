# CITISTEN J / K draft / L preview evidence

## Deliverables and boundaries

This is an evidence-only UI lane milestone. No runtime/UI/CSS, simulation,
world, camera, catalog or game entry source changed. No registration or push.
The runtime catalog still has **127** entries and no id 241. There is still
no integrated `Games/Citisten3D/index.html`.

- J: all **eight** planned UI pieces, in both themes: **16** comparisons.
- K: one schema-valid id 241 draft, deliberately outside `games.json`.
- L: fresh-context, cache-disabled, non-loopback-denied request evidence for
  the actual live UI preview, both modes/themes. **Not full-game L proof.**

Reviewer grades J and the acceptance letters; this lane assigns no grades.

## J: eight pieces

Files: `docs/maintenance/audits/citisten-QA/J-piece-<piece>-<theme>.png`.
Each has generated reference left, built UI right, with preserved aspect ratios.

| Piece | Existing generated source | Existing actual Chromium source |
| --- | --- | --- |
| main-menu | `ui-mockup-menu.png` | `J-I-ui-menu-<theme>-1440.png` |
| builder-toolbar | `ui-mockup-toolbar.png`, toolbar crop | `J-B-ui-toolbar-<theme>-1440.png`, toolbar crop |
| zoning-panel | `ui-mockup-toolbar.png`, zoning crop | `J-B-ui-toolbar-<theme>-1440.png`, zoning/focus crop |
| budget-power-water | `ui-mockup-hud.png`, civic stats crop | `J-C-D-ui-hud-<theme>-1440.png`, stats crop |
| minimap | `ui-mockup-hud.png`, map/legend crop | `J-C-D-ui-hud-<theme>-1440.png`, map/legend crop |
| day-hud | `ui-mockup-hud.png` | `J-C-D-ui-hud-<theme>-1440.png` |
| night-alert-defense | `ui-mockup-nightalert.png` | `J-F-G-ui-nightalert-<theme>-1440.png` |
| game-over | `ui-mockup-gameover.png` | `J-H-ui-gameover-<theme>-1440.png` |

The eight planned pieces were present in the five pre-code generated composite
images; this milestone splits those references, rather than generating late
replacement art or inventing new UI. The light UI is compared with the original
dark reference and clearly labelled. Original generation/solid-palette
postprocessing remains disclosed in `docs/citisten-design/README.md`.

`J-eight-pieces.json` records every source path, SHA-256 and explicit pixel crop.
No source screenshot or original reference was repainted or replaced. The built
images are the prior labelled UI fixtures, not integrated city gameplay. Cropped
images were inspected for legibility; differences remain visible for review.

## K: draft only

Draft: `docs/citisten-design/catalog-241.draft.json`.
Validation: `docs/maintenance/audits/citisten-QA/K-catalog-draft-check.json`.

Schema/title/id/category/types and uniqueness were checked against the actual
catalog. Appending the draft **in memory only** yields 128 unique IDs. The
runtime catalog's hash remained unchanged. Planned URL is
`Games/Citisten3D/index.html`, which does not yet exist: do not merge this row
until integration, review and separate registration approval. This draft does
not establish K's registered-entry/URL/count acceptance.

## L: fetch-proof scope

- `L-preview-network-proof.json`: all attempted requests and responses for each
  fresh theme context, plus the nine loaded local asset hashes.
- `L-preview-fetch-proof.txt`: concise result and full-game blocker.
- `L-preview-capture-run.txt`: actual command output.
- `L-ui-preview-{free,defense}-{dark,light}.png`: four actual live preview frames.

All paths above are in `docs/maintenance/audits/citisten-QA/`. The harness used
system Chromium, isolated loopback HTTP, two new contexts, blocked service
workers, disabled HTTP cache and denied every non-loopback request. Request
attempts were logged before enforcement, so blocked external attempts would
still be findings, not filtered successes. No browser-wide offline flag was
used because that would also block the local HTTP specimen.

Observed: **18 requests = 18 HTTP 200 responses**, nine per theme; zero external
attempts, WebSockets, failed requests, page errors or console errors. Responses
were not from service workers. Free/defense start and native theme buttons ran
against the published simulation API; no fixture city state was injected.
Seven process-ownership checks passed. Owned browser/driver/server closed and
final `ps` was clear. The next browser reservation was explicitly released to
the Dive Trivia owner, with Wings and sim/world owners told to sequence.

The full game's offline closure remains unestablished because there is no
integrated entry. The log does not cover the world/vendor renderer or integrated
placement/waves. It is not evidence that the missing game entry works offline.

## Reproduction and checks

```sh
# No browser; reuse existing references and actual captures, validate draft.
python3 -B docs/citisten-design/check-jkl.py
# Only in an explicitly reserved, process-guarded browser slot.
timeout 120 python3 -B docs/citisten-design/check-jkl.py --browser
```

Actual output:

```text
J EVIDENCE: 8 pieces x 2 themes = 16 aspect-preserving comparisons
K DRAFT: schema/ID/count checks OK; games.json unchanged, 127 registered, planned entry missing
L PREVIEW NETWORK: 0 external attempts/errors; cold local asset closure only, full-game entry missing
```

A separate assertion check matched all reference/built/loaded-asset hashes,
paired all 18 request/response paths, and reconfirmed the catalog hash/count.
The 188-line documentation harness reuses the existing UI byte/process guards;
no dependency or new runtime logic. It honours the same explicit browser binary
and closes only its resources. A raw `ps` sample initially saw an unrelated
transient browser, but that process exited before the enforced Python preflight;
the actual successful guard log must not be misreported as a refused run.

Syntax and `git diff --check` passed. The maintenance checker was attempted and
refused while sibling `Games/Citisten3D/sim-qa.py` was modified; it was not
reported as passing and no canonical inventory was changed by UI. Remaining
world/sim utility/traffic source/log/capture dirt belongs to those lanes.

Root free at step start: 5,055,410,176 bytes; inspected after evidence generation:
5,037,436,928 bytes (shared-host delta -17,973,248). Other lanes were active;
this is not UI-exclusive consumption. No guard waiver was needed.

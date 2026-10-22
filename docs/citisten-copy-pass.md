# CITISTEN operator copy pass

## Scope

Copy/layout cleanup only in the authored UI and preview. No simulation,
world mesh, camera maths, catalog, dependency or runtime import changes.
Callbacks, tool IDs, notifications and score values retain their APIs.
No registration or push. Operator copy direction supersedes the original
mockups' narrative wording; their flat visual law still applies.

## Trimmed

- Menu: one CITISTEN heading, two mode-labelled buttons, Light/Dark and a
  compact essential controls line. No duplicate card headings or descriptions.
- Tools: labels and key-only hints. No selected-tool footer or zoning caption.
  Road/Bulldoze act directly, without duplicate one-button options rows.
  Group buttons retain selected-state announcements through `aria-pressed`.
- HUD: currency amount without a redundant Budget caption; day/night without
  repeated mode text. Population/power/water retain necessary labels.
- Night: H/HP numbers and Wave count; no repeated heading or instructions.
  Zombie legend appears only at night. Map label is Map.
- Loss: Town hall lost; Nights / Peak population / Kills; Restart / Menu.
  No narrative or repeated restart instructions.
- Toasts: Placed; Removed; Repaired; Blackout; Power restored;
  Nightfall: 1 min; Wave N incoming; N residents; Night survived.
- Preview markers: UI preview / UI fixture. Accessible labels, numeric health
  semantics, disabled-tool explanation and error diagnostics remain.

Dead caption styles were removed. This is not a new UI piece or new art:
original generated references remain unchanged and are not regenerated after
implementation. Earlier J/K/L evidence is retained as historical evidence,
including its pre-trim UI hashes; it is not relabelled as current-code proof.
The J/K/L documentation harness was adjusted only for the shorter phase label.

## New captures and checks

Directory: `docs/maintenance/audits/citisten-QA/copy-pass/`.
Each pattern has dark/light and 1440/390/320 variants:

| Screen type | Pattern |
| --- | --- |
| Menu | `J-I-ui-menu-<theme>-<width>.png` |
| Day HUD | `J-C-D-ui-hud-<theme>-<width>.png` |
| Zoning/tools | `J-B-ui-toolbar-<theme>-<width>.png` |
| Night HUD | `J-F-G-ui-nightalert-<theme>-<width>.png` |
| Blackout HUD | `D-ui-blackout-<theme>-<width>.png` |
| Loss | `J-H-ui-gameover-<theme>-<width>.png` |

The runner writes **36 fresh frames** and **10 comparisons**, without
replacing the old captures. Menu, HUD, zoning, night, blackout and loss frames
were inspected across desktop/mobile and both themes. These are UI fixtures,
not whole-game acceptance; reviewer assigns grades.

```sh
timeout 120 python3 -B Games/Citisten3D/ui-qa.py
```

The initial full copy run passed. Final-source recapture after the group
`aria-pressed` accessibility fix is pending the reserved browser queue.
Initial stdout in `COPY-run.txt`:

```text
UI CHECK PASS: 36 fixture screenshots, 10 collages; 3 viewports, 2 themes; zero console/page/network errors
```

`J-ui-results.json` records **37** browser ownership checks, empty console/page,
failed-request and external-request error lists, and the checked cases. Tests
now assert exact trimmed menu/loss/tooltip/phase copy, no redundant captions
or single-tool rows, all nine toast variants, hidden daytime zombie legend,
native keyboard focus, callback values, 44px targets, no clipping, no gradients
or shadows, toast priority/deduplication/expiry and cleanup.

System Chromium only; disk checked before each image write. Owned browser,
driver and loopback server closed. Post-run `ps` was clear and the next slot
was explicitly released to Trivia; other queued owners were notified.

Node syntax checks, Python AST parsing and `git diff --check` passed. Canonical
inventory refresh is required after this source milestone and any sibling
world-source changes; those files are outside UI's assigned paths.

## Files and storage

Runtime: `Games/Citisten3D/ui.mjs`, `ui.css`, `ui-preview.html`, `ui-preview.mjs`.
Regression: `Games/Citisten3D/ui-qa.py`. Supporting docs:
`docs/citisten-ui-api.md`, `docs/citisten-ui-qa.md`, this receipt and the
phase assertion in `docs/citisten-design/check-jkl.py`.

Runtime totals **368 lines**, down 11. Existing runner is **320 lines**,
including the added copy assertions. No test framework or runtime asset added.
The 46 PNGs total **1,975,192 bytes**.

Run free-byte samples: 4,066,361,344 before, 4,063,969,280 after; delta
-2,392,064 bytes on the shared root. Step-start availability was 5,072,740,352;
other lanes account for unrelated host movement. No guard waiver was needed.

Remaining holds: reviewer grading, integrated game entry/input and existing
barricade support, target-device/full-game gates, and canonical source inventory
refresh after all lanes commit. No gameplay or hardware acceptance is claimed.

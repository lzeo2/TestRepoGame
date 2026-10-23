# Foldwild UI audit: 2026-10-24

Audit only. Baseline **`9bd8a88e`**, Foldwild tree `d11a1e3a026c7a49119eebfb68ce2e8986410e18`.
All file/line references below refer to that baseline, with paths relative to
`Games/Foldwild/` unless stated otherwise. Entry/tree match the maintenance inventory.
Contrary to the brief's historical label, the current catalog already lists
**Foldwild: Open-World RPG (Preview), story, id 226**. No registration change is proposed.
Read AGENTS, CODE_QUALITY, the maintenance index/manual, implementation order and M2 contract.

Concurrent UI edits began after these captures; this is the captured pre-rework
baseline, not acceptance of the later working tree. No runtime, test, catalog,
manual, inventory, model or vendor files were changed by this audit.

## 1. File inventory

`wc -l` counts, including every tracked `.js` recursively:

| File | Lines |
| --- | ---: |
| `index.html` | 92 |
| `style.css` | 142 |
| `battle.js` | 425 |
| `builds.js` | 163 |
| `campaign.js` | 31 |
| `data.js` | 139 |
| `economy.js` | 167 |
| `region-data.js` | 270 |
| `script.js` | 1,155 |
| `view.js` | 644 |
| `world.js` | 471 |
| `vendor/BufferGeometryUtils.js` | 1,375 |
| `vendor/GLTFLoader.js` | 4,663 |
| `vendor/three.module.js` | 53,044 |
| **Total** | **62,781** |

Nine authored JS modules plus entry/CSS total **3,699 lines**. Entire tracked
project: **95 files / 8,966,626 logical bytes**, including 80 supplied GLBs and
vendor LICENSE. Vendor line count is not evidence of unnecessary functionality;
no full vendor or binary-model review was performed.

## 2. Current UI structure

- **Persistent shell:** skip-link, title/Arcade link, save/render status and
  collapsed export/import/backup/replacement/reload tools (`index.html:13–24`).
- **Starter screen:** three ally choices, description, optional seed,
  Start/Continue, saved summary and keyboard/touch instructions (`25–40`).
- **Exploration:** single 3D canvas; overlaid region/trials, Marks/Kites/class and
  expandable Field record (score, collection, objective, rank, synergy). Adjacent
  controls contain ledger/services/pause, live message, team resources, three
  nearby destinations, Interact/Rest, four held-movement buttons, Travel,
  settings and Controls disclosures (`41–74`; `script.js:1089–1112`).
- **Battle:** same canvas, paired ally/foe HP and energy bars, status disclosures,
  four ability buttons, capture/wait/flee, switches and collapsed history
  (`index.html:56–64`). CSS hides exploration HUD/team/actions/travel and
  ledger/services in battle (`style.css:91`).
- **Result:** title, outcome, optional evolution message and Continue
  (`index.html:66`). Pause is a state/message, not a separate screen.
- **Six native dialogs:** encounter preview; Field ledger; release confirmation;
  services; save replacement; new-run confirmation (`76–89`). Ledger contains
  search/element filters, owned-individual and species cards, plus a model
  inspector with rotation/reset/back controls. Services dynamically renders
  Inventory/Classes/Archivist, contextual trades/accessories/contracts, and camp
  recovery (`script.js:681–770,851–901`). Inspection reuses the same canvas.

## 3. Bloat and leftovers

- **Confirmed ledger bulk:** a fresh run creates **83 list children**, including
  **79 Undiscovered cards**, one owned card and a separate entry for that same
  starter species (`script.js:855–899`). These have distinct management/reference
  purposes, but the default presentation duplicates identity and inspection.
- **Copy density:** owned cards spell out all five modifiers, including neutral
  zeros, then trait name/description; ability buttons contain complete sentences
  (`script.js:491–495,859–860`). Useful mechanics, excessive default presentation.
- **Repeated camp affordances:** Rest Camp destination, contextual Interact,
  separate Rest button and service-dialog Rest all coexist (`index.html:54`;
  `script.js:220–238,335–345,689–693`). Routing and interacting are NOT equivalent;
  consolidate presentation without deleting those behaviors.
- **CSS:** every declared class name has a static/generated consumer; no wholly
  unused class was found. However, `#team-list button` (`style.css:57`) and
  `.toolbar label` (`65`) match no elements produced by the inspected baseline.
  Mobile `#team-list{gap:6px}` (`131`) is inert on its block layout; the mobile
  nearby-button rule (`134`) repeats the base declaration (`60`).
- **Decoration is restrained:** no gradient, emoji cards, marketing panels or
  decorative overlay stack. Borders/card shells do repeat, but most delineate
  real state. Low-poly scenery and subtle world bobbing (`view.js:482–489`) are
  presentation, not evidence of removable assets. Preserve original model bytes.

## 4. Visual assessment

**Good foundation:** warm cream `#eee9d8`/paper `#f7f3e8`, dark ink `#242820`,
muted blue `#365a74`, sage/clay scenery; local Bungee title and readable Atkinson
body (`style.css:1–4,20`; `region-data.js:5,100`). Flat black actions, visible focus,
44px minimum buttons and native disclosures are appropriate. Calculated CSS
contrast: ink/paper **13.53:1**, help/paper **8.53:1**, blue/cream **6.02:1**,
white/black **21:1**. These are token checks, not an exhaustive accessibility pass.
The game explicitly uses light colors; dark preference is not a separate theme.

**Needs polish:** desktop is readable and unclipped, but the sidebar gives equal
black emphasis to navigation and primary actions. On mobile the 101.6px HUD covers
about a third of the 295.5px scene; save chrome adds another row. The 407px controls
scrollport holds 545px of content. Ledger is especially text-heavy: its 671px
scrollport contains 6,357px of content, and stacked full-width card buttons touch
without gaps (`style.css:110`). Scenery is coherent but visually flat, with weak
actor/ground separation; this is not a reason to recolor supplied creatures.

## 5. Top five bounded recommendations

| Priority | Specific change | Baseline references |
| --- | --- | --- |
| 1 | Default ledger to discoveries/owned allies; put the 79 unknown placeholders behind one disclosure with a remaining count. Keep species numbering and discovery secrecy. | `script.js:883–899`; `style.css:107–112` |
| 2 | Put individual modifiers/trait detail and species ability prose behind native details; show name, level and resources first. Reuse species reference content rather than repeating it alongside owned management. Add action gaps without shrinking 44px targets. | `script.js:855–877,885–895`; `style.css:107–114` |
| 3 | Keep one contextual camp action prominently visible. Retain destination routing, but offer recovery through the existing service menu instead of a permanently disabled duplicate Rest control. | `index.html:54`; `script.js:220–238,335–345,689–693` |
| 4 | Reduce phone scene obstruction: keep region/Marks/Kites over the canvas, move the verbose class/Field record into the existing scrollable controls. Keep save failures/render diagnostics visible; do not hide recovery to gain space. | `index.html:16–24,44–47`; `style.css:38–43,116–130` |
| 5 | Shorten battle buttons to ability name/cost and a compact effect; preserve complete mechanics in accessible help. Omit the disabled active-only switch when there is no alternative ally. This is a source-based recommendation, not a fresh battle screenshot finding. | `script.js:457–468,491–509`; `style.css:82–89` |

Do not replace native dialogs, duplicate the renderer, remove controller IDs or
weaken save/release consent. Treat inspector reparenting and mobile Close as
sensitive: their held regression remains open.

## 6. Evidence, tests and limits

Fresh captures, personally reviewed, using system Chromium/software rendering,
ordinary seed **42** and Start clicks/taps; no state grants or modified runtime:

- [Desktop world, 1280×720](foldwild-audit-20261024/desktop-world.png)
- [Mobile world, 390×844](foldwild-audit-20261024/mobile-world.png)
- [Mobile ledger, 390×844](foldwild-audit-20261024/mobile-ledger.png)

Capture command **exit 0**: `PASS: 3 current-state captures; native fresh starts;
mobile ledger open/close; no page/console/request/HTTP/external errors. Not a full
gameplay gate.` No horizontal document overflow at either width. Each world
reported three loaded models, no fallbacks, 19 draws and 6,431 triangles. This
single basic ledger Close does not reproduce or clear resized inspector/M2 holds.
Browser and bounded local server terminated. PNG total **207,387 bytes**.

Existing **31** `scripts/test_foldwild*` files include 13 pure `.mjs` suites
(data, battle, battle_v2, economy, builds, world, regions, save_v2, continuity,
cap_xp, save_conflict, class_ranks, campaign), plus Python shell/layout, input,
inspection, renderer, save, completion and original/async M2 runners.
[Baseline checks](foldwild-ui-rework-checks.md) records **13/13 pure passes**;
these were not rerun for this audit. [Completion integration](foldwild-polish/completion-integration.md)
and the [maintenance manual](maintenance/games/226-foldwild.md#verification)
separate scoped native/fixture passes from held acceptance. Historical images
also exist in `foldwild-m2-previews/`, `foldwild-v2-previews/` and
`foldwild-polish/completion-previews/`; they are not current screenshots.

Fresh read-only checks: baseline inventory entry/tree match; catalog **128 unique
integer IDs/schema/Git-backed URLs PASS**. Global
`python3 -B scripts/check_maintenance_docs.py` **exit 1**:
`AssertionError: Commit inspected source changes before validating its inventory.`
Concurrent source edits were present; no refresh or unrelated repair attempted.
Full campaign/acquisition/evolution, stable original/async M2, physical N100/device
performance and rights/provenance acceptance remain held. No full-fleet gate,
release or push. Games added: **0**; build/register commits: **none**.

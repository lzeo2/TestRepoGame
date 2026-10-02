# Foldwild polish: UI diagnostic review

Delegation 77. Actual worker environment: `PI_PROVIDER=openai-codex`,
`PI_MODEL=gpt-6-astra`. Review only; Main owns design, written implementation
scope, subjective image assessment and integration. No runtime, test, catalog,
vendor, model or sparse-selection edits. No server/browser was started.

## Source identity and coverage

Review started at `559f825f2a506a6e777abdcdc170045f29f1b72b`.
Foldwild tree `e6e0305f82a0bcf2458f7cb2b4d22bb2a0302fe9`, entry blob
`b0e1ed5bac4f6aaca89960c50fdfdc3bd4ce363a`, 94 files, agree with
`docs/maintenance/inventory.json`. Fresh byte comparison found all 94
materialized files equal to HEAD, including the original 80 GLBs and vendor
files. This is byte identity, not a new binary/material or rights audit.

Completely read: `AGENTS.md`, `docs/CODE_QUALITY.md`, maintenance README and
Foldwild manual; actual `Games/Foldwild/index.html` (78 lines), `style.css`
(145), `script.js` (947), `view.js` (586). Controller callers of focus, phase,
modal close, inspection, collection/service rendering, input clearing, loading
and frame scheduling were traced in those complete files.

Completely read relevant reports/direction: `docs/foldwild-layout.md`,
`foldwild-ui-v2.md`, `foldwild-milestone-review.md`, `foldwild-milestone-layout.md`,
`foldwild-m2-shell.md`, `foldwild-inspection.md`, `foldwild-view-v2.md`,
`foldwild-v2-previews.md`, `foldwild-m2-review.md`, `foldwild-m2-finish.md`,
`foldwild-m2-contract.md`, `foldwild-implementation.md`,
`foldwild-development-plan.md`, `foldwild-concept-shots.md`, and
`docs/maintenance/audits/foldwild-input.md`. Unqualified basenames in this
paragraph are under `docs/`. Historical layouts and fixtures are not current
acceptance. The development direction is world-first papercraft, compact
information, model-focused battles and discovered-model inspection; proposed
campaign/frontier features are not permission to activate them here.

Not completely reviewed: `data.js`, `battle.js`, `world.js`, `region-data.js`,
`economy.js`, `builds.js`, native/pure test implementations and vendor internals.
A targeted search of battle/build Wait calculations was not a complete combat
review. No screenshots, GLBs or concept images were visually assessed by this
worker. Main retains all visual judgment.

## Mechanical layout and lifecycle observations

- Native buttons have minimum 44px width/height; inputs/selects and summaries
  have minimum 44px height. Visible focus and an inward canvas outline exist
  (`style.css:10-16,37,43`). Checkbox is explicitly 44px (`:56`). A CSS minimum
  is not fresh touch-hit, clipping, contrast or assistive-technology proof.
- Desktop battle at widths >=900px uses a flexible canvas column plus a 400px
  control column (`style.css:79-84`). At both 320px and 390px the same <=899px
  rules use a 230px canvas followed by static combatant cards, abilities and
  actions, then trail tools/message (`:108-126`). <=420px rules compact spacing
  and stack ledger filters (`:128-144`). Primary combat controls are outside
  the canvas; there is no current mobile combatant-card overlay. Long names,
  open status disclosures and three-member switch rows can increase height.
  No fresh viewport rectangle or all-actions-above-fold claim is made.
- World remains different: the HUD is absolutely positioned over the top of
  the canvas and message over its bottom (`style.css:38,46`). The expandable
  Field record stays inside that overlay. Thus an unobstructed/no-overlay world
  is not the current shell. This is a mechanical difference for Main to judge,
  not authorization for a redesign or proof of an obscured creature. The
  smallest boundary for any approved change is these two world selectors;
  preserve the separate battle overrides and all useful diagnostics.
- Native `showModal()` provides modal isolation. Global game shortcuts return
  while a dialog is open or a text/select control owns input
  (`script.js:911-926`). Direction keys require canvas/main focus; battle
  number/C shortcuts admit controls within main, while Space Wait requires
  canvas/main focus. Buttons retain ordinary Enter/Space activation.
- `clearInput`, `stopped` and `frame` stop simulation during modals, pause or
  hidden documents (`script.js:24-26,46,773-796,928-930`). Hidden documents skip
  rendering; visible dialogs may render zero simulation time for inspection.
  The renderer has a separate pointer map cleared by scene reset and pointer
  up/cancel/lost capture (`view.js:163-175,510-550`). Controller blur/visibility
  handlers do not directly clear that second map. No stuck-pointer or resumed
  motion defect was reproduced; ordinary interruption testing remains needed.
- Inspector moves the same canvas, awaits actual model loading, checks tokens,
  and restores it on close (`script.js:630-686,846-853`). Renderer generations
  reject stale model attachment (`view.js:201-235,398-416`). Supplied materials
  are shared through a source clone; normalization changes transforms, not
  material RGB (`view.js:213-223`). Accessories are separate geometry. Default
  species inspection requests `none`; owned inspection uses equipped cosmetics.
  Lighting/output color space affect displayed appearance, so unchanged bytes
  alone do not establish visual color fidelity or all-80 accessory fit.
- Shell is fixed light (`style.css:4`), not a two-theme implementation. Reduced
  motion is initialized from saved preference or media query and passed to the
  view. No new dark theme or palette modification is proposed by this worker.

## Concerns and smallest shared boundaries

Nine items total. Except item 1's inherited observed failure, these are
source-confirmed gaps/risks, not fresh native reproductions.

1. **HIGH, inherited M2 single-touch hold.** `script.js:846-850` has a direct
   Close ledger click -> native close -> restoration chain; `:665-686` restores
   the canvas. The input audit records the original full test failing with the
   dialog still open and view still in inspection. Successful traced/delayed
   variants do not identify the missing event or clear acceptance. No root fix
   is established. Main must distinguish button input, native close dispatch
   and restoration before assigning a patch. Do not add another mobile CSS
   guess, repeated tap, mouse substitute or longer readiness timeout.
2. **MEDIUM, context loss is not disclosed by authored code.** `view.js:7-13`
   handles initial renderer creation, but its listener map at `:549-550` has
   no context-loss/restoration notification. `script.js:70-78` sets `viewFailed`
   only during construction. Vendor recovery is not equivalent to visible
   controller fallback. Small boundary: view lifecycle notification into existing
   controller diagnostics, keeping text/button gameplay and explicit recovery.
3. **MEDIUM, autosave failure can be visually hidden during battle.**
   `script.js:49-68` puts failure only in `save-state`; that element lives in
   collapsed Field record (`index.html:35`). Battle hides the entire world HUD
   (`style.css:84`). Explicit Save copies status into `message` (`script.js:868-875`),
   but autosaves do not. Small boundary: make failure feedback visible from
   shared `save()` in every phase without erasing model failure information.
4. **MEDIUM, dynamic control replacement has no general focus retention.**
   `renderServices()` replaces service contents (`script.js:604`) after tab
   selection/transactions (`:503-514,529-530`). `ledgerAction()` rebuilds the
   collection (`:606-611,734`); battle rebuilds switch controls (`:360-364`).
   Activated buttons/selects are removed without restoring equivalent focus
   in these paths, unlike explicit inspection/release close helpers. Small
   boundary: preserve the active semantic control around each existing render
   boundary, or update retained controls. Native focus destination after removal
   still needs keyboard reproduction; do not infer a trap from source alone.
5. **MEDIUM, result transition has no directed focus/announcement.**
   `result()` (`script.js:250-257`) reveals the result but neither focuses its
   heading/Continue nor announces it through a live region. `finishBattle()`
   calls it after hiding battle controls; `index.html:62` has no result live
   region. Keyboard activation can leave the previous control hidden, and the
   result is below the play layout. Small boundary: the shared result transition,
   with one intentional accessible destination after the busy period. Verify
   scroll and keyboard behavior rather than forcing focus from every outcome.
6. **MEDIUM, command/turn guidance is incomplete.** `renderBattle()`
   (`script.js:335-374`) shows resource values, effective costs and capture
   reasons; statuses and battle log are collapsed native details
   (`index.html:52-59`). No round/turn-order or matchup indicator is rendered.
   `command()` sets a 0.45s busy lock (`script.js:399-400,781-785`) using disabled
   controls without dedicated busy text; battle-entry text does not explain
   each subsequent resolution. Small boundary: `renderBattle()` plus one
   compact status location, based on authoritative combat data after its owner
   reviews that data. Do not invent predicted damage or add a second combat
   state machine. Main decides the minimum guidance rather than expanding cards.
7. **MEDIUM, failed-model feedback monopolizes ordinary feedback.**
   `script.js:42-44` refuses all `message()` updates while view creation or any
   model has failed. `view.js:177-181` writes directly to the same message.
   Pause still changes its button label, but the ordinary pause/resume,
   navigation and interaction explanations sent through `message()` disappear.
   Small boundary: retain durable render-error feedback separately from current
   action/status text; never hide the fallback disclosure to make play look clean.
8. **MEDIUM, loading has no authored pending-time limit or world/battle state.**
   `view.js:142-161` awaits `loadAsync` with rejection handling but no authored
   timeout; `script.js:642-650` leaves inspection at Loading while it is pending.
   World/battle calls (`script.js:165,380-382`) do not expose their pending
   promises as loading feedback. Rejected models do get honest markers, and
   close/token protection exists; a hung request is distinct from rejection.
   Small boundary: existing shared acquire/loading status and controller
   presentation lifecycle, with bounded truthful feedback, not another loader.
   Hanging-request behavior and late-load recovery were not exercised here.
9. **LOW, touch orbit instructions omit the world gesture distinction.**
   `script.js:888` says only Drag: orbit camera. `view.js:517-523` requires
   multiple touch pointers for world orbit, while inspection permits one.
   Small boundary: shared help copy, distinguishing world two-finger orbit from
   inspection one-finger drag, without changing controls or adding tutorials.

## Actual checks and foreground results

All commands were run directly in the foreground; exit markers below are real
shell `$?` values, not recovered from process absence. This section preserves
the small execution transcript; no historical evidence was overwritten.

```text
PASS: Foldwild inventory tree/entry/count match; all 94 materialized files equal HEAD
catalog entries: 115
IDENTITY_EXIT=0
SCRIPT_SYNTAX_EXIT=0
VIEW_SYNTAX_EXIT=0
PASS: 120 game documents cover 115 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
MAINTENANCE_EXIT=0
DIFF_EXIT=0
```

Identity check used Python stdlib JSON/path reads and `git rev-parse`,
`git ls-files`, `git show HEAD:<path>` byte comparisons. Syntax commands were
`node --experimental-default-type=module --check Games/Foldwild/script.js`
and the same for `view.js`. Documentation command was
`python3 -B scripts/check_maintenance_docs.py`; whitespace command was
`git diff --check`. These checks are not native gameplay tests.

No browser, input diagnostic, unchanged full M2, negative fixture, pure gameplay
suite or full-catalog smoke was run. **Fresh native passes: 0; full gate passes:
0.** Screenshots: none, 0 bytes. Scratch output: none, 0 bytes; only this small
report is created. No owned browser/server/process needed cleanup, and port
8821 was not used. Disk remained displayed as 2.4G available before/after review;
that display does not establish an exclusive storage delta in a shared tree.

## Unresolved acceptance and handoff

The original uninstrumented M2 failure remains authoritative until a fresh stable
unchanged ordinary-input pass. This source review neither clears nor reclassifies
it. No diagnostic success, screenshot, getter observation or static check may
substitute. Future positive evidence must use normal inputs and the read-only
`window.foldwildSnapshot` getter only; `phase:world` alone does not prove that
an inspection dialog is closed or view mode restored.

Not gameplay/hardware-tested here: 320/390/desktop touch targets and scroll/focus
order, battle status and turn comprehension, ordinary close/reopen/resize,
keyboard-only service/ledger transactions, hidden-tab interruptions, WebGL
loss/restoration, pending/rejected model loads, quota feedback, reduced motion,
actual color/accessory inspection, natural evolution/acquisition/campaign and
N100 performance. Main must inspect fresh actual images; historical concept and
fixture images remain separately labeled. Original roster/default colors stay
immutable; no horror/frontier activation, new game, registration, publication,
protected subsystem change, dependency install or push. Catalog remains 115;
Foldwild remains unregistered. Only this report is assigned for anonymous commit.

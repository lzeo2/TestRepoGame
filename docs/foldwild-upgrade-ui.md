# Foldwild exploration UI: lane 3 receipt

## Scope and sequence

Owned only `Games/Foldwild/index.html`, `Games/Foldwild/style.css`, this receipt
and `docs/foldwild-upgrade-evidence/ui-mockup.svg`. Read AGENTS, CODE_QUALITY,
maintenance index, complete Foldwild manual, inventory entry, current entry/CSS,
and controller phase/HUD/proximity/navigation/input/inspection/save call paths.
Existing native M2 single-close, natural campaign, provenance and device holds
remain unchanged.

The compact SVG was written **before** either UI source edit. It uses local SVG
primitives, not embedded artwork, a browser capture or evidence of gameplay.
Destination copy in it is illustrative. No screenshot comparison has occurred.

## Implemented shell

- A visible Next stop section precedes event feedback and the single contextual
  action. The action is full width, 56px high, with a quieter disabled state.
- Nearby destination choices live in a native disclosure, one readable row per
  marker rather than three cramped competing actions. The existing camp-rest
  shortcut remains there; the main contextual action is not duplicated.
- Held movement has an explicit caption. Ledger, Field kit and Pause retain
  their sticky toolbar. Team/progress/travel share **Team and travel**; settings,
  keyboard help and save/recovery tools keep their existing native controls.
- Desktop controls use 344px; phone world scene uses 40% of the frame with a
  150px minimum, leaving more control space. Battle retains its existing split.
  The HUD can scroll without scrolling the scene or losing the sticky toolbar.
- All 114 previous IDs, six native dialogs, the single canvas and its original
  viewport parent remain. Local fonts, safe-area padding, visible focus, minimum
  44px targets and reduced-motion rule remain. No runtime assets/dependencies,
  controller edits, save/schema changes, catalog entries or games added.

## Controller integration contract

| ID | Ownership / expected behavior |
| --- | --- |
| `objective-title` | New compact heading; update from the real current navigation target. |
| `objective-detail` | New concise direction/distance/purpose; not an aria-live region, avoiding movement-update announcements. |
| `navigate-objective` | New native button, initially disabled. Wire click to the authoritative target ID, and update label/disabled state each proximity refresh. |
| `campaign-objective` | Unchanged paragraph retained inside `.field-record`, now labeled Team and travel. |
| `interact` | Unchanged sole primary contextual action; retain proximity guards and E access. |

The orchestrator owns `script.js`: hide `.objective-panel` and `.field-actions`
when not in world phase and update route availability for pause/busy/modal state.
CSS also hides those sections during battle/result as a shell fallback. Initial
objective text is a generic truthful fallback, not a hard-coded destination.
The shell alone does not claim live wayfinding is integrated.

## Actual source checks

- `python3 -B scripts/test_foldwild_m2_shell.py`: `Ran 1 test`, `OK`, exit 0.
  Existing test is unchanged.
- Stdlib HTMLParser comparison to HEAD: `PASS: all 114 existing IDs, six native
  dialogs and single canvas preserved; only three agreed IDs added; SVG parses`.
- Sparse-aware catalog validation: `PASS: 129 catalog entries; unique integer
  IDs, schema and Git-backed URLs`.
- `node --check Games/Foldwild/script.js`: exit 0; controller was not edited by
  this lane.
- Scoped `git diff --check`: exit 0.
- `python3 -B scripts/check_maintenance_docs.py`: exit 1,
  `Commit inspected source changes before validating its inventory.`
  Inventory was already stale before this lane: HEAD Foldwild tree
  `c7f1981da461dc6b9263a1feff9a9dc723e7e809` / entry
  `060a85ac21ed3612bafba6bf94d7e0b318bff55c`, versus inventory tree
  `c935f92b7c41a90697fec764e084adf46f0e86ad` / entry
  `af2e6750fc2fa91d2c52d7a2385b6f5255eb4783`.
  Shared manual/inventory updates are reserved to the orchestrator, not silently
  made by this lane. Refresh after the integrated source milestone.

## Serial capture / acceptance handoff

No browser, screenshot, video, server or full-fleet gate was run here. The later
QA lane will capture baseline via Git interception and current integrated source;
do not treat this SVG as a before/after screenshot. Capture desktop and narrow
phone fresh/resumed world, nearby arrival/action, battle, ledger inspection/one
Close, open team/settings, save recovery and keyboard focus. Check both OS color
preferences (the shell intentionally stays light), reduced motion, readable
objective copy, 44px hit targets, overflow and actual held-touch movement. Compare
hierarchy to the SVG, not its illustrative landscape or text. Screen recordings,
natural navigation and stable native Close acceptance remain pending. No push.

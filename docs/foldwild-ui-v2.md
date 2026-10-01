# Foldwild UI shell milestone (delegation 45)

Provider/model observed: `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`.
Scope: mechanical HTML/CSS only, following the UI ABI in
[implementation order](foldwild-implementation.md). Main owns visual approval.

## Delivered

- All 61 original IDs, three starter attributes and four ability-slot attributes
  remain. Region buttons now cover indices 0 through 4 inside native Travel.
- Full-width exploration canvas: 480 px desktop, 300 px phone. Compact overlay
  wallet/class/kites, collapsible field record, three-column team strip and nearby
  actions. Core-owned held controls still attach to `world-help`.
- Desktop battle controls sit beside a 480 px canvas. Phone combatant information
  overlays a 270 px canvas; four abilities use two columns. Capture, wait, flee,
  switching and the collapsed native battle log remain in the DOM. Pause/tools
  remain accessible below battle controls on phones.
- Services, camera reset, low/standard quality, optional bounded seed, class,
  synergy, Marks and ledger search/element controls provide the new shell ABI.
- Native service and ledger dialogs have sticky heading/close rows, constrained
  scrolling and visible focus. `service-close` is deliberately `type="submit"`
  inside `form method="dialog"`: native closing works before core binding. All
  other buttons are `type="button"`.
- Existing local Bungee/Atkinson fonts and license paths are unchanged. Flat
  cream/sage/blue/clay palette, black actions, 4/6 px corners, no new dependency,
  runtime external request, animation loop or CSS scene imitation.

## Integration holds

This is a shell milestone, not implemented services, economy, classes, filtering,
seed selection, five-region progression or camera/quality behavior. Main/core
must wire those controls. The old three-region `updateHUD` cannot read region
buttons 3/4 until the world/core adapter lands; this intermediate shell must not
be represented as an independently playable integrated build.

Core must populate/filter `nearby-actions` to at most three genuinely nearby
points. CSS does not hide valid actions to disguise the old long marker list.
Progress, collection totals, save state and synergy remain in the native field
record. Existing checks requiring these fields to be always expanded need
integration review, not weakened gameplay assertions.

Ledger cards here are styled containers, not a delivered 3D ledger viewer.
Optional horror remains untouched. No catalog, registration, new game or push.

## Runnable static layout check

```sh
python3 -c "compile(open('scripts/test_foldwild_ui_v2.py').read(), 'scripts/test_foldwild_ui_v2.py', 'exec'); print('Python syntax: PASS')"
timeout 100s xvfb-run python3 scripts/test_foldwild_ui_v2.py
git diff --check -- Games/Foldwild/index.html Games/Foldwild/style.css scripts/test_foldwild_ui_v2.py docs/foldwild-ui-v2.md
```

The harness serves local tracked references on port 8795 and intercepts ONLY
`script.js` with an empty module. It explicitly asserts that no game snapshot
exists. DOM fixture toggles select menu/world/battle, with canonical long species
names and four long current ability descriptions, three team/switch cards,
three nearby actions and populated ledger/service containers. Fixture controls
are not gameplay implementations. Browser and server close in `finally`; a
100-second server watchdog bounds the run. GPU is disabled because this test
checks DOM layout, not rendering.

Final actual output:

```text
Python syntax: PASS
{"kind": "STATIC LAYOUT, NOT GAMEPLAY", "cases": 9, "issues": [], "canvas_heights": {"desktop-menu": 0, "desktop-world": 480, "desktop-battle": 480, "mobile-menu": 0, "mobile-world": 300, "mobile-battle": 270, "narrow-menu": 0, "narrow-world": 300, "narrow-battle": 270}, "screenshot_bytes": 938597, "seconds": 12.75, "storage_delta": 13111296}
PASS: retained 61 old IDs, new shell ABI, tracked local references, 9 layouts, 44px targets, native modal close/Escape
layout test exit: 0
diff check exit: 0
```

Widths/heights: 1280x720, 390x844 and 320x740. All states avoid horizontal
scrolling; visible controls retain 44 px targets. Four abilities/capture/wait/flee
fit above the fold at desktop and 390 px. At 320 px switching/tools may require
vertical scrolling. Native service close and ledger Escape were exercised.
No console/page errors, failed requests, HTTP errors or external requests occurred
in this static fixture. This is not a clean-game-loading claim.

Seventeen temporary screenshots are in the harness output directory
`foldwild-ui-v2` under the system temporary directory: each size's menu/world/
battle/service/collection plus desktop/mobile `dark-preference-world`. The shell
intentionally retains the same light palette under dark browser preference;
these are not two implemented themes. Blank canvases prove only layout. Main's
later actual model/gameplay captures are authoritative.

Initial capture attempts encountered Chromium capture failure/5-second timeout.
The final GPU-disabled DOM-only run passed; no errors were filtered out. The
reported storage delta spans parallel shared-tree activity and is not attributable
solely to this worker. Final screenshot payload is 938,597 bytes; disk stayed
above the 2 GB guard. No full catalog smoke or N100/Chromebook performance test
was run: zero full-game/release gate passes.

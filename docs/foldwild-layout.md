# Foldwild native viewport layout

CSS-only layout adjustment after Main's design review. Gameplay, markup,
renderer, data, models and catalog are unchanged. Core 35 had exited and
`git status --short` was empty before editing.

## Layout

Native `:has(#battle-panel:not([hidden]))` selects battle layout without a
new script flag. At 900px and wider, the scene and battle panel occupy
separate columns. Below 900px, the 200px scene precedes battle controls;
message diagnostics and Pause/New run remain reachable afterward.

Only during battle, CSS hides the disabled world HUD/navigation, disabled
Interact/Rest and Collection controls, and duplicate team summary. World
progress, collection, inventory, region navigation and movement controls
remain available in their original phase. The global `[hidden]` rule retains
`!important`. World canvas height is capped at 440px; narrow-phone HUD and
navigation are compacted without hiding labels. Existing local fonts,
colors, focus treatment and 44px minimum targets are retained.

## Runnable check and actual measurements

```
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test_foldwild_layout.py --baseline
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test_foldwild_layout.py
```

The baseline was captured before the CSS edit (26.51 seconds). Final native
browser run took 34.43 seconds and printed:

```
PASS: native world/battle layouts, loaded GLBs, 44px targets, no overflow, native ability input
```

Coordinates below are actual viewport DOM rectangles at scroll position zero,
not full-page screenshot bounds. Values are vertical top–bottom in pixels.

| Frame / element | Before | After |
| --- | --- | --- |
| 1100×720 world canvas | 182–798 | 182–622 |
| 1100×720 battle canvas | 182–798 | 83–503 |
| 1100×720 first ability | 1022–1093 | 231–287 |
| 1100×720 Flee | 1105–1175 | 412–456 |
| 390×844 world canvas | 370–710 | 220–520 |
| 390×844 battle canvas | 370–710 | 76–276 |
| 390×844 first ability | 1266–1359 | 453–510 |
| 390×844 Flee | 1598–1645 | 646–703 |

At both main sizes, the complete scene, HP/energy, four abilities, capture
reason, Wait and Flee fit together in the first viewport. At 320×740 after a
real ability action, the scene is 124–324 and first ability 519–593; Flee is
748–805 and requires normal scrolling. Every primary action and Pause/New run
was checked for scroll reachability with no horizontal overflow.

One browser, serial desktop/mobile contexts, real seed-1 Dewgob selection,
Start, native walking to wild-1, Interact and dialogue confirmation were used.
No gameplay setter, teleport, frame pump or model fixture was installed.
Checks covered three world GLBs, two battle GLBs, no model fallback, rendered
frames/draw calls, drawing-buffer aspect versus CSS bounds, visible 44px
native targets, Pause/resume and an actual ability advancing the round.
The read-only `window.foldwildSnapshot` getter supplies observations only.

Final error counts: page 0, console 0, failed requests 0, HTTP errors 0,
external requests 0. No error exclusion or asset response stub was used.
Python syntax compilation without cache and `git diff --check` passed.

Viewport JPEG artifacts in the test's temporary output directory:
`desktop-battle.jpg`, `mobile-battle.jpg`, `mobile-world.jpg` (quality 85,
174658 bytes combined). The final run reported 4096 bytes storage delta;
root storage remained approximately 2.2 GB free. Screenshots were inspected
for layout; Main retains subjective design approval.

## Boundaries

No game added or registered; no full campaign or hardware-performance claim.
Only the existing light shell was exercised; there is no second shell theme
in this task. Native CSS selector support is required for the improved battle
layout; older browsers retain the existing functional vertical layout.
Full catalog smoke/release gate was not run here and remains Main's separate
frozen-catalog task. No push or history rewrite.

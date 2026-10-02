# Foldwild M1 mobile layout correction

Delegation 50, actual provider `openai-codex`, model `gpt-6.1-sol`.
Development of the existing original RPG only; no new game, catalog entry,
registration or push. Main's subjective screenshot review remains pending.

## Bounded changes

- Mobile battle uses a 230px canvas followed by two static, full-width status
  columns. HP, energy and keyboard-accessible status disclosures remain intact.
  No status cards or battle message cover the models. Desktop grid is retained.
- Battle entry sets a wild/trailkeeper hint once, not during subsequent renders.
  Pause/resume feedback and disclosed model failures are preserved.
- Merchant explains non-resellable camp kites and disables their Sell button.
  Purchasing still costs 12 Marks; other item transactions are unchanged.
- Ledger accessory labels stack above their selects. Existing reduced-motion
  checkbox now has a physical 44px target.

Only `Games/Foldwild/style.css`, `Games/Foldwild/script.js`,
`scripts/test_foldwild_milestone_layout.py` and this report are owned changes.
No renderer, data, economy, model, vendor or existing QA files were changed.

## Runnable native proof

```sh
PYTHONDONTWRITEBYTECODE=1 timeout 180s xvfb-run python3 scripts/test_foldwild_milestone_layout.py
node --experimental-default-type=module --check Games/Foldwild/script.js
git diff --check
```

Final native run: **exit 0, eight PASS stages**. Syntax and whitespace checks:
**exit 0**. Bounded standard-library HTTP server on port 8800 shuts down in
`finally`; Chromium also closes in `finally`. Uses normal UI and walking inputs,
with the existing read-only snapshot. No state grants or debug mutation.

Actual native output includes:

```text
PASS: Kite Sell disabled/explained; Buy -12 and patch Sell +6; stacked ledger label
PASS: dialogue cancel returns to world; battle begins with phase-correct hint
PASS: 1280x720 native battle bounds, 44px targets and real two-model loads
PASS: 390x844 native battle bounds, 44px targets and real two-model loads
PASS: 320x800 native battle bounds, 44px targets and real two-model loads
PASS: keyboard status disclosure and HP/energy; pause/resume hint survives battle rerenders
PASS: zero normal browser/load/external errors
PASS: separate intentional 503 model failures remain disclosed on battle entry/pause/resume
```

| View | Canvas bottom | Viewport bottom | Status top | Capture bottom | Wait/Flee bottom |
| --- | ---: | ---: | ---: | ---: | ---: |
| 390 x 844 | 287 | 288 | 292 | 658.875 | 727.875 |
| 320 x 800 | 287 | 288 | 292 | 697.875 | 766.875 |

All four abilities, capture, Wait and Flee are initially onscreen at both tested
phone sizes; no horizontal overflow. Rendered buttons, inputs, selects and
summaries, including disabled controls, measure at least 44px in both dimensions.
The desktop ledger label text measures 71.266 x 20px inside a 230.656px column,
with the select starting below the label text rather than squeezing it sideways.

All three battle captures load actual `cindupp.glb` and `budriv.glb`: two active
models, cache size 4, no fallback. Actor positions are x=-1.85/+1.85, y=z=0.
Recorded low-preset snapshots range from 4 draws/1,040 triangles to
5 draws/1,452 triangles. All 80 GLB hashes remain unchanged across this check.
These counts are software-rendered observations, not Chromebook/FPS certification.

Normal-input browser errors, failed requests, HTTP errors and external requests
are all zero. A separate intentional HTTP-503 context records five expected
console load errors and asserts the truthful fallback warning survives battle
entry and pause/resume; it is not counted as clean normal loading.

Evidence is temporary, not committed:

- `/tmp/foldwild-milestone-layout-run.log` and `result.json` in the output directory.
- `/tmp/foldwild-milestone-layout/mobile-battle.jpg` (390 x 844, 39,788 bytes).
- `/tmp/foldwild-milestone-layout/mobile320-battle.jpg` (320 x 800, 34,856 bytes).
- `/tmp/foldwild-milestone-layout/desktop-battle.jpg` (1280 x 720, 67,832 bytes).
- First/second failed-run logs are preserved separately. The first asserted an
  incorrect diagnostic word; the second assumed synchronous dialog close.
  The corrected final test waits for actual world phase and verifies the actual
  disclosed fallback message. No game behavior or failure filtering was weakened.

Disk remained 2.4 GB free. Final native rerun storage delta: 8,192 bytes; the
three JPEGs total 142,476 bytes, well below the shared 30 MB growth ceiling.

## Held scope

Main must inspect the real captures before visual acceptance. This focused proof
is not the full M1 loop, campaign, all-species, cosmetic-fit, two-theme, hardware
or full registered-catalog release gate. Ledger model inspection remains M2;
class ranks, pending-battle recovery, complete campaign, frontier and optional
horror integration are not added by this patch. Optional horror remains inactive.
No release approval or push is claimed.

# Foldwild corrective presentation checks

## Scope and disposition

Non-browser corrective lane, based on `ab61d8b9`. Owns only
`scripts/test_foldwild_presentation.mjs`, `scripts/test_foldwild_animation.mjs`
and this receipt. Runtime `view.js`, controller, UI, original browser runners,
maintenance manual/inventory, saves and supplied creature bytes are unchanged
by this lane. The subsequent shared setter correction belongs to the parent.
No browser/server, dependency install, asset copy, Git writer or push was used.
QA owns the first corrective commit; this lane awaits a separate writer lease.

**RED → GREEN after the parent's shared runtime fix.** Projection and augmented
animation gates now both exit zero. All original assertions remain intact.
Unchanged coat strictly preserves the actual rig, complete motion/limb/facing
snapshot and internal motion sampler state after a zero-dt pause. No continuity
promise is imposed on real appearance changes. Only the parent edited runtime;
these two suites are not a fresh 19-suite run or corrected native acceptance.

## Root proposals communicated before runtime changes

No runtime edits are authorized or made here.

1. `setAppearance` selects `value.hair || value.hairColor` before testing whether
   the selected value is a color. A valid hairstyle string therefore shadows a
   valid hair-color alias. The actual call
   `{hair: 'long', hairColor: '#345678'}` changes style but leaves the previous
   color `#38342d`. **Smallest proposed shared fix:** select the first valid hex
   color among the primary/alias candidates, independently of style selection.
   Do not add guards at every caller. The retained failing assertion requires
   the alias to work alongside a hairstyle; it is not relaxed to observed output.
   Parent implemented this fix; the retained alias assertion now passes.
   This was an API-boundary defect, not proof of current menu impact: controller
   `viewAppearance()` currently passes style under `hair`, not `hairColor`.
2. Every successful `serviceAction`, including unrelated recovery/purchases,
   calls `view.setAppearance(viewAppearance())`. The setter unconditionally
   replaces the human rig, dropping motion phase/weight and snapping facing to
   authoritative yaw, even when colors/style are unchanged. This was reproduced
   with actual THREE groups and the actual setter. Proposed minimal fix:
   normalize appearance and skip reconstruction when unchanged. Parent now
   implements that fix. The former `KNOWN` characterization is replaced by
   strict same-player, full-pose and internal-motion-state preservation assertions,
   all passing. Real appearance changes may rebuild while modal-paused;
   continuity across actual color/style changes is deliberately not required.

## Actual-call tracing and added checks

`script.js` owns authoritative movement at up to .05 simulation seconds/frame.
`move()` calls `view.setPlayerPosition`; `frame()` calls `view.render` at 30/60Hz,
passing zero while stopped (pause/modal/hidden). View render clamps dt to .1 and
calls `updateHumanMotion` on the player. `showWorld` constructs a fresh human at
the current saved position, sets facing, and initializes motion with zero dt.
The service setter and saved-resume paths also call `setAppearance`; reduced
motion resets pose through the same actual motion helper.

### Presentation

The original rig/region/sign assertions are preserved. New checks import actual
`createHuman`, `presentationSigns`, `destinationSignLayout` and local THREE:

- Six spawn/trial combinations with canvas fixtures **912x700**, **374x280** and
  **304x280**, representing desktop1280 and phone390/320 layouts. These are
  explicitly geometry fixtures, not measurements of current DOM layout.
- Exact default world camera (45-degree FOV, player-relative offset `(0,5.6,10)`,
  look target y=.6). Player is at `(0,16)` or 1.5 units south of Maren; trial
  trainer is at `(22,-26)`.
- Project every real human mesh vertex and camera-facing sign-quad corner.
  Assert full actor/primary-card framing and no active destination card overlaps
  the player or trainer bounds. Assert a measurable primary-card pixel height.
- Build the actual trial stone's low-poly icosahedron geometry at its metadata
  position and renderer scale. Cast rays to trial-card center/four corners;
  assert no triangle occludes those samples. No substitute cube/source grep.

This covers default yaw only. Arbitrary orbit, actual font rasterization,
contrast, stone edge cases between ray samples, HUD occlusion and real mobile
layout still require the parent's serial browser slot.

### Animation and setter boundaries

Existing 149 planted-foot samples, original motion/battle assertions and limits
remain. Added 30/60Hz four-unit/s walking sequences, two seconds of zero-dt pause,
resume without paused wall-time cadence, stop/idle settling, fresh-rig restoration
at a non-origin saved position and teleport suppression use actual exported
motion functions and real THREE scene graphs.

The non-WebGL setter fixture executes the **actual current `setAppearance`
function body**, delimited from `view.js`, with its closed-over view state supplied
by the fixture. THREE groups, cached box/material resources and the human builder
are real; this is not a handwritten replacement setter or a claim to exercise
WebGL/render lifecycle. It checks invalid input/palette refusal, color aliases,
position/facing, detachment of old rig, one rendered player, zero-dt appearance
replacement then resume, disposed no-op, and strict unchanged-coat rig/paused
motion preservation. The hair-color assertion is collected and rethrown after
other assertions if it fails, so other checks still execute. With the parent's
valid-color fix it passes, and the command now exits **0**.

## Historical inspector Close: traced, not solved

Read current `inspectCreature`, all `closeInspection` callers, `collection-close`
and dialog-close listeners, view generation/pointer guards and current dialog
CSS. Cross-checked `maintenance/audits/foldwild-input.md`,
`foldwild-m2-finish.md`, `foldwild-polish/m2-async-check.md` and current delivery.
Hivemind search was unavailable (authentication required); its documented local
index fallback was absent. No remembered result was substituted for source.

Proven historical layout defect: a 180px heading flex basis wrapped Close after
390-to-320 resize; the existing 100px basis keeps its 44px button on one row.
Current CSS still has that scoped correction, a sticky heading, 72px inspector
scroll margin and a 260px model host. It is not a proven input-root fix.

The ordinary Close button's click directly calls native `dialog.close()`.
The dialog close listener invokes `closeInspection()`, which invalidates the
inspection token, hides the inspector, prepends the sole canvas back to its
viewport and restores world/result presentation. Stale loader callbacks do not
reopen the dialog. Renderer pointer handlers are canvas-only, and reset clears
their map. There is no source proof to justify patching all those paths.

Historical negative observation had controller phase world **but view mode
inspection, dialog still open and canvas still in model host**. A later
center-hit test cannot prove which target received the original tap. Traced
passes changed timing; the unchanged single-tap gate still failed. Root is
therefore **unresolved**, not an established generation/loader/close-handler bug.
Do not add repeated taps, mouse substitution, longer readiness waits or synthetic
close calls to erase it.

## Ready criteria and source gates

- Parent's shared alias/no-op fixes are verified green in the augmented suite;
  no original assertion or failure filter was removed.
- Unchanged appearance strictly preserves paused gait and rig identity. Real
  style/color changes retain the documented modal-paused rebuild boundary.
- Serial browser order remains Citisten, **Foldwild second**, Jank, Wings. This
  worker has no browser GO. Corrected Foldwild native QA must still cover real
  desktop/390/320 projection/readability, walking/idle/pause/resume, appearance
  service, and exactly one inspector Close after resize/orbit. Distinguish phase,
  view mode, dialog state and canvas parent at readiness. Historical/native and
  physical-device/campaign/rights holds remain.

Commands executed:

```sh
node scripts/test_foldwild_presentation.mjs
node scripts/test_foldwild_animation.mjs
node --check scripts/test_foldwild_presentation.mjs
node --check scripts/test_foldwild_animation.mjs
git diff --check -- scripts/test_foldwild_presentation.mjs scripts/test_foldwild_animation.mjs
```

Initial presentation exit 0 included six new projection cases. Initial animation
exit 1 exposed `valid hairColor alias must remain usable alongside hair style`,
actual `38342d`, expected `345678`. That is historical failure evidence, not the
current result. After the parent's fix, both commands were rerun and exit **0**,
including all old assertions, the alias assertion and strict unchanged-coat
preservation. Output includes:

```text
PASS: 30/60Hz walking-pause-resume-idle, inspector-style reconstruction, teleport suppression, actual setAppearance validation/color-aliases/position/facing/single-player/disposed boundaries; unchanged coat preserves rig and full paused motion
PASS: actual THREE articulated walk, 149 planted-foot samples, grounded soles, speed cadence, smooth stop/turn, frozen dt, reduced motion, immutable diagnostics/controller input, battle anticipation/impact/recovery
PASS: 6 actual THREE spawn/trial projections, desktop/390/320 canvas fixtures, full actor/card frustum, non-overlap and trial-stone ray tests
```

Syntax/whitespace exit 0. The remaining previously green Node suites are not
changed or claimed freshly rerun here. Ready for a parent-issued test/docs commit
lease after QA's first commit; no Git writer was started.

Initial free disk: **2,637,848,576 bytes**. Intermediate post-check free disk:
**2,633,977,856 bytes**, both above **2,147,483,648**. Shared-activity deltas are
not attributed entirely to this lane. No cleanup or waiver was used.

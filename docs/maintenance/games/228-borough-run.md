# Borough Run maintenance

<!-- maintenance-game: Games/Borough Run -->

## Identity and status

Existing catalog **228**, entry `Games/Borough Run/index.html`, introduced by
`890e52a` before this fleet run. No game was added or registered by lane7.
No prior tracked manual was found. This is a bounded source inspection at
`1462411`, not gameplay, provenance or release acceptance.

## Implementation map

The sole tracked file contains inline style, menu, Canvas2D drawing, input,
`reset`, `sim`, `finish` and the animation loop. The complete entry was read.
`choose()` probes WebGL and may label the debug renderer `webgl1`, but actual
`render()` uses the original 2D context. `__gameDebug` exposes state and test
start/reset hooks; these are not ordinary-input acceptance evidence.

## Gameplay and controls

Source intends a timed courier chase: E picks up the package near the initial
position, WASD/arrows drive, Space handbrakes and Q consumes smoke. Carrying the
package into a safehouse at low speed for two seconds finishes successfully.
Integrity loss, bust time or the 90-second deadline loses. Despite title copy,
surviving the clock is not a win in `sim()`. A result offers Restart. Source
also provides pointer steering/throttle pads and action buttons; their usability
has not been verified here.

## State and persistence

Round state is in closure variables; `reset()` restores player, three police,
time and integrity. Best score/time use `borough-run.best` and
`borough-run.bestTime`, with storage exceptions caught. Numeric stored values
are not validated. `held`/touch input clears on blur; visibility can pause.
The loop continues drawing while simulation is not playing.

## Dependencies and provenance

No external runtime script, font or asset reference appears in this single-file
entry. Its About text says original implementation, inspired by game concepts,
not affiliated with Anomaly. That is a source statement, not verified authorship
or permission. No separate license/source notice exists in this game's tracked
tree. Do not label it an ingested Anomaly game or infer authorization from its
presence. Historical approval/rights review remains separate.

## Audit findings

Source-visible blockers, not newly reproduced browser failures:

- Start/restart/pause add or toggle `hidden` on the overlay, but the stylesheet
  defines no `.hidden` rule. The panel can continue covering play.
- Smoke decrements stock and changes heat, but no smoke visibility/pursuit effect
  is implemented. Repair bays and flat-tire fields do not establish working
  repair or hazard mechanics. Help overstates these features.
- Buildings are drawn without collision in `sim()`; police aim at the current
  player rather than implementing the advertised last-known-position system.
- Pause has no dedicated Resume action; behavior needs native verification.
  Touch coordinate thresholds and action release need real-input review.

No runtime fix is authorized in this documentation lane.

## Safe iteration

Reproduce the overlay/start defect first with normal Play/Start clicks. Patch
only confirmed behavior under a separate runtime assignment; retain score and
restart semantics, and correct unsupported copy rather than inventing mechanics.
Do not use debug state grants to claim successful delivery. Resolve provenance
and historical authorization separately from functionality.

## Verification

Git-backed entry/tree and catalog identity were checked against the refreshed
inventory. The completed [fleet gate](../audits/fleet-2026-10-15-lane6.md) logged
this title `ok` within a **failed 122/125** run. Generic bounded loading does not
assert that the overlay hides, driving works or delivery completes. Lane7 ran
no browser/gameplay test, captured no screenshot and changed no game source.

## Future outlook

After scope approval: normal start, package pickup, driving, safehouse completion,
loss/restart, pause/resume, storage failures and physical touch. Keep the visible
source defects and provenance limits open until independently verified.

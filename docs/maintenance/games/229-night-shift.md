# Night Shift maintenance

<!-- maintenance-game: Games/Night Shift -->

## Identity and status

Existing catalog **229**, entry `Games/Night Shift/index.html`, introduced by
`7153e46` before this fleet run. No game was added or registered by lane7.
No prior tracked manual was found. This page records bounded source inspection
at `1462411`, not gameplay, provenance or release acceptance.

## Implementation map

The sole tracked file contains inline CSS, menu, Canvas2D drawing, input,
`reset`, `sim`, `finish` and a fixed-step animation loop. The complete entry was
read. `chooseRenderer()` only probes WebGL; `render()` always uses the 2D
context. The debug `renderer` value is not proof of a 3D scene. `__gameDebug`
exposes reset/start and counters; these hooks must not substitute for native play.

## Gameplay and controls

Source intends collecting a case at the terminal and extracting at the north
gate before 150 seconds, with three lives and four guards. Help advertises
WASD/arrows movement, Shift run, C sneak, J/click fire, F flare, E interaction,
R reload and P/Escape pause. Pointer pads/buttons are present. Successful
extraction or loss should show a result and Restart. These controls/objectives
are source intent, not verified working gameplay; discrepancies follow below.

## State and persistence

Closure variables own player, guards, ammunition, timer and interaction progress.
Best score uses `night-shift.best` with caught storage errors but no numeric
validation. `reset()` restores round fields but does not reset `paused` or all
input/timing fields. Visibility sets `paused=true`. No server or account exists.

## Dependencies and provenance

The entry references no external runtime scripts, fonts or assets. About says
original implementation, inspired by game concepts, not affiliated with Anomaly.
That statement does not establish authorship, redistribution rights or original
operator approval. No separate license/source notice exists in the tracked game
tree. Do not describe it as an ingested Anomaly port.

## Audit findings

Source-visible blockers, not newly reproduced browser failures:

- `togglePause()` only enters when state is PLAYING, then changes it to PAUSED;
  the same key cannot take the inverse branch on a later call. Restart does not
  clear `paused`. Visibility pause likewise lacks a verified recovery path.
- Pointer action `act()` sets `held`, whereas simulation tests `pressed` for
  fire/flare/use/reload. Run/Sneak set Shift/C but release deletes run/sneak keys.
- Case/extraction requires sustained interaction, yet `pressed` clears each tick
  and absent presses reset progress. Native completion is not established.
- Reload completion checks `pressed.reload`, not the keyboard R path or a stored
  completion flag. Mouse aiming/click firing and lamp damage advertised by help
  have no corresponding handlers/damage path in the entry. Walls are drawn but
  not collided with; the alarm value does not implement a detection system.

No runtime repair or replacement gameplay is authorized by this docs task.

## Safe iteration

Obtain runtime scope, reproduce pause and ordinary-input interaction first, and
add one small regression for the shared input/state boundary. Correct unsupported
help claims rather than fabricating systems. Do not grant terminal progress or
health through debug hooks to pass acceptance. Preserve historical provenance
qualifications and verify authorization independently.

## Verification

Git-backed entry/tree and catalog identity were checked against the refreshed
inventory. This title logged `ok` in the completed [fleet gate](../audits/fleet-2026-10-15-lane6.md),
which **failed overall at 122/125**. Generic loading does not test extraction,
reload, pause recovery or touch. Lane7 performed no browser/gameplay run, captured
no screenshot and changed no source for this game.

## Future outlook

Separate normal-input checks must cover start, movement/aim, firing/reload,
terminal interaction, extraction/loss, restart, pause/visibility recovery and
physical touch. Keep source blockers, rights and release gates explicit.

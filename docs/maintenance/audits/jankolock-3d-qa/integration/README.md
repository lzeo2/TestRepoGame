# Integration evidence checkpoint

Integration is playable at `Games/Jankolock3D/index.html`; this checkpoint is
NOT a full A-I acceptance or release report. No push occurred.

- `integration-attempt1.json`: FAIL, retained traveler cooldown prevented the
  second station's E attach after fixture reposition. Fixture reset repaired.
- `integration-attempt2.json`: FAIL, active combat killed the second ride's hero
  and returned it to base. No geometry failure inferred. Traversal QA now uses
  a fresh real match per lane and explicitly passive hero bots; normal structure
  fire remains. Production combat/HP is not changed for those captures.
- `integration-interrupted3.json`: INTERRUPTED by user message after all three
  station arrivals and A/B captures. Its completed checks remain partial, not a
  clean overall run. API clock advancement/placement are labeled in the report.
- `integration-evidence.json`: latest INTERRUPTED attempt, stopped after H/H-dark
  when the user message interrupted the bounded command. Processes were verified
  stopped. Historical image files from earlier attempts remain, not substitutes
  for the missing C/D/E/F/G evidence on stable current source.

Current PNGs cover A (aerial/three ride-in-flight views), B (wave setup), H (normal
lobby in both themes), I (normal HUD) and native pause. Every captured PNG is
1280x720 and passed variance >100 at capture. Inspect each receipt for source
hashes and precise fixture classification. Runtime changed afterward to repair
Ctrl input/respawn reconciliation and Midway bridge-height waypoints, so prior
source hashes must not be advertised as full current-source acceptance.

Independent portrait-only review is in `Games/Jankolock3D/PORTRAIT-REVIEW.md`:
H QUALIFIED on its pinned images. It does not grade all other letters.

Remaining: serialize a stable full run of `integration-qa.py` after CITISTEN UI,
sim and perf release the shared browser slot. It retains native orb shooting,
four ability keys, movement, shop clicks/active effect, a logged passive-bot
600-second chain with D at P2 alive and G at actual victory, defeat, mobile and
labeled mockup/runtime twins. No missing screenshot will be fabricated.

No BLOCKED-WORLD acceptance finding is currently established. Midway's flat
systems fallback would run squads under its bridge; `match-world.mjs` now derives
feet-height waypoints from the actual ramp edges, with a Node regression. The
original world export remains unchanged. Native integrated confirmation is pending.

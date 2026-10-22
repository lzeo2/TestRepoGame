# Wings CTF: corrected operator contract

Status: source implementation and CPU checks staged; native/asset acceptance HOLD.
[Current staging receipt](maintenance/audits/wings-ctf-20261022/README.md) records
private source `bfcafba`, current behavior and unresolved decisions. This document
is not publication approval. The startup baseline is `8b4b615`, inventory `e86db8a`, on
`feat/wings-boat-integration`. No push. Existing native boat/roof/driver and
full-fleet gates remain open; none is waived by this feature order.

## Scope and invariants

- Cancel the proposed plane-driven patrol rework. Preserve every existing patrol
  action, default, Fleet Strike rule and original vehicle slot.
- Speedboat is selectable inside the existing fleet vehicle picker, not just a
  dedicated solo entry. Verify that complete path rather than merely adding copy.
- Add a separate offline, two-team Capture the Flag mode with plane and boat
  selection, mixed AI on both teams, timed rounds and a configurable capture limit.
- Reuse the existing aircraft/hull assets. Whether boat variants mean distinct
  handling/loadouts or team-livery variants awaits the operator's answer. Flag
  authority does not depend on that choice. No duplicate GLBs or new game ID.
- Update catalog 232 only after the CTF implementation actually exists. No
  speculative gameplay claims, new third-party loads, networking/backend/proxy
  changes or publication authorization.

## Authoritative flag rules

Use one server-owned state machine, called by RoomEngine after movement/combat.
Client messages cannot set flag position, carrier, captures or winner.

- Exactly two flags, each with its owner team and fixed home position.
- An occupied, alive enemy vehicle may pick up a home/dropped flag within a
  bounded 3D pickup radius. One vehicle cannot carry two flags.
- Friendly touch returns its dropped flag. Friendly touch cannot steal its own
  home flag or take it from a live enemy carrier.
- Vehicle death/removal or loss of all occupants drops its carried flag at the
  last known X/Z, projected onto the real terrain/water surface. No vehicle is
  moved or granted state. A dropped flag automatically returns after 30 seconds.
- Bring the enemy flag into the own home pickup volume while the own flag is
  home to score. Enemy flag returns home; reaching N captures ends the round.
- Combat kills/ship damage are not CTF captures. Carrier loss does not replace
  CTF's flag/timer win rules or strand its respawns.
- Timer expiration selects the higher capture score; equal scores draw. Existing
  intermission/restart machinery clears flags, carriers, scores and bot route
  memory for the next round. Room time remains authoritative.
- Enemy flag carriers cannot hide the objective through stealth snapshot filtering.

Initial CTF UI defaults: two teams, three captures, five minutes, at least one
plane bot and one boat bot on each side. Existing Fleet defaults remain unchanged.
Expose real timer/score-limit controls, not nonfunctional labels.

## Minimal simulation module boundary

New `src/sim/ctf.ts` owns only pure flag authority and state copying:

- `CtfState`: two flags plus two capture scores and capture limit.
- Each flag: `team`, `home`, `position`, `carrierId`, `droppedAt`; home means no
  carrier and no drop timestamp. Do not duplicate a redundant mutable status.
- `CtfEvent`: `type: "flag"`, action `pickup|drop|return|capture`, flag-owner team,
  vehicle ID or null, and reason where needed to distinguish auto/touch return.
- `createCtfState(homes, captureLimit)` creates independent arrays/vectors.
- `cloneCtfState(state)` isolates protocol snapshots from mutable authority.
- `stepCtf(state, vehicles, now, surfaceHeight, emit)` returns winning team or null.
  Use existing VehicleEntity/Vec3 types; any alive occupied aircraft/watercraft is
  eligible. Team 0 is a valid winner, never a truthiness test.

Use a small runnable `ctf-check.ts`, bundled by the existing builder later. Test
steal/return/capture/home-required, carrier death/removal/empty crew, auto return,
team isolation, occupancy/alive checks, one-flag-per-vehicle, score limit and clone
isolation. These are CPU fixtures, not native gameplay proof.

## Map, bots and rendering

Inspect current geography before selecting homes. Prefer an actual existing
strait so patrol terrain stays unchanged. Validate the full boat hull and draft
along the route, safe spawns and turning basins. A painted water strip over solid
land is not a channel. If no existing channel works, stop for an explicit
mode-local terrain design whose physics and rendered worker geometry agree.

CTF spawns and bot objectives must use those real bases/routes, independent of
carrier destruction. Bots use ordinary flight/seat inputs, never position/score
assignments, teleports or forced captures. Reuse the existing air steering and
combat helpers; watercraft need actual yaw/throttle/brake navigation. Demonstrate
objective progress/captures in a deterministic CPU simulation, with both teams
containing plane and boat bots. Do not silently change Fleet bot selection.

Render homes/flags, actual carried flags and the water-route cues using bounded
local primitives and existing team colors. Reuse the existing HUD/minimap helpers
for flag states, carrier, score and timer. Dispose mode-owned geometry/materials
on exit; no decorative start overlay or new external artwork. Touch/focus/labels
and small-screen layouts remain required.

First-draw readiness must describe the requested play area, not accidentally a
distant Fleet camera location. Keep the actual worker-boot and readiness bounds
and predicates intact. No scene pre-launch, density/framebuffer reduction or
simulation grant to obtain evidence.

## Reviewable delivery and acceptance

Private source commits first, with disjoint worker paths and parent line-by-line
review. Then regenerate the pinned source patch/runtime together, validate closure,
update the Wings manual/inventory and run the maintenance checker. Do not hand-edit
bundles. Preserve the historical HOLD receipts.

Required fresh browser evidence: CTF lobby, an actual plane carrying a flag, and
boat gameplay on the water route. A prior menu, CPU fixture or empty-world image
is not proof. Continue the separately ordered roof/driver and water-frame gates.
Browser runs require explicit shared-slot handoffs and unchanged actual product
bounds; any collector limit remains a separate result. Full 127-game loading
gate is still mandatory before any separately authorized push. Operator reviews;
NO PUSH remains in force.

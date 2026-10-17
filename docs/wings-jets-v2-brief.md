# Wings jets rework v2: rebuild F-15 and F-35 to contract

You are the ORCHESTRATOR. You have delegate_to_worker. All workers
openai-codex/gpt-6-astra, thinking low for mechanical, medium for logic.

## READ FIRST (mandatory, in order)

1. Games/Wings/docs/aircraft-quality-contract.md - THE CONTRACT. Every rule in
   it is an acceptance gate, not a suggestion.
2. Games/Wings/docs/models.md - current model registry facts.
3. The aircraft registry in the built assets (aircraft-*.js, entries f15/f35)
   vs the fa18/yf12/a10 entries - pivots, stores, afterburners, anchors,
   placeholder dims. The f15/f35 entries currently have EMPTY pivots/stores/
   afterburners arrays and this is exactly what the operator flagged.

## Operator verdict on the current build (all must be fixed)

1. "The f35 does not look like it" - proportions/silhouette fail. The
   "F-35-style" wording in docs is rejected as cover.
2. "the planes are white while the others are black, make them all black" -
   repaint both jets onto the dark house palette (near-black base #1d1f20 to
   #2c2f30, gray mid-tones, dark accents) to sit inside the fa18/yf12 family.
3. "the planes dont have any exhaust animation" - add working
   afterburners/exhaust entries (fa18 has afterburner_L/R cone pivots; yf12
   the same). The renderer already supports cones - wire the new jets' nozzle
   geometry to real exhaust pivots with cone entries.
4. "the weapons are all the same" + "no missile animation on f35" + "no
   weapons underwing" - give both jets proper stores/pivots: underwing missile
   pylons on F-15 (fa18 pattern: missile_L1/L2/R1/R2 + wingtip rails),
   internal-bay missiles on F-35 (weapon_bay_L/R anchors, missiles emerging on
   fire), distinct weapon loadouts per aircraft in the tuning tables - F-15
   and F-35 must not be clones of each other or of the fa18.

## Workflow (STUDY FIRST, per contract)

- Phase 0 (orchestrator-led study): read the renderer code that consumes
  afterburner cones + stores + pivots (aircraft.ts/toon.ts in upstream source
  or port.patch staging), the tuning tables (vehicles.ts), and the existing
  model registry entries. Record in a study notes file what fa18/yf12 get
  (exhaust animation, missile spawn points, wing pylons) so workers build to
  the same interface.
- Phase 1: repaint both jets dark (generator edit), regenerate, verify colors
  sit in the family (render + compare against fa18/a10 renders).
- Phase 2: F-35 silhouette rework - study real F-35 references (public spec
  sheets: length 15.6m, wingspan 10.7m, canted tails ~25 deg, chined nose,
  lift-fan bump optional), reshape the parametric generator surfaces until a
  rendered side/top/front view is recognizably an F-35. Same check for F-15
  (19.4m length, 13.0m span, twin tails vertical, big rectangular intakes).
  Update docs to drop the "-style" qualifier once shapes pass.
- Phase 3: exhaust pivots + afterburner cone entries wired to the renderer.
  Verify cones render during boost in the offline simulation.
- Phase 4: weapons - F-15 underwing pylons with visible missiles that animate
  on fire (match fa18 missile store behavior); F-35 bay doors + internal
  missiles on fire. Distinct tuning rows for both (speed/turn/weapons per
  character: F-15 fast high-rate gun+missiles; F-35 slower stealthy, bay
  weapons). Update vehicles.ts + camera/cockpit anchors.
- Phase 5: verification - astra-check successor passes both, offline sim
  regression, then render previews (side/top/front + in-flight) and SAVE them
  under Games/Wings/docs/previews-v2/ for operator review BEFORE final commit.
- Commit milestones per phase. NO push. Clean tree. Disk guard 1.5GB.

## Transparency

Sample worker logs (last ~20 lines, rotate, max 2 workers per cycle). Report
drift or interventions in your summary.

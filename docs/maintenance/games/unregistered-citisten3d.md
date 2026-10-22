# CITISTEN 3D: unregistered component project

<!-- maintenance-game: Games/Citisten3D -->

## Identity and status

Operator-authorized original CITISTEN components, not an integrated game entry.
There is no `Games/Citisten3D/index.html`, no catalog entry or registration yet,
and no publication or push implied. `world.html` and `ui-preview.html` are
standalone specimens. The catalog remains at 127 registered games.

## Implementation map

- [Simulation receipt](../../citisten-sim.md): `sim.mjs`, assertions and API-fixture captures.
- [World receipt](../../citisten-world.md): terrain, roads, camera, PBR materials,
  directional shadows, analytic sky probe/block AO, original high-detail
  procedural models with bounded LOD, animated water, render-only FX and holds.
- [External model wishlist](../../citisten-design/MODEL-WISHLIST.md): operator
  art request only. Blender/bpy is not used; Astra-built geometry is procedural.
- [UI QA receipt](../../citisten-ui-qa.md): UI/preview ownership, generated
  mockups, native focus checks and themed fixture captures.
- [Dark-default UI receipt](../../citisten-dark-default-ui.md): five cold
  default-dark/native-light pairs, startup focus and copy/accessibility checks.

These lane receipts retain their inspected-source limits. This canonical page
indexes them; it does not claim a new whole-game review.

## Gameplay and controls

World specimen: WASD pan, right/middle drag to look, wheel height 2–400m,
with a default spectator tour. Simulation supports free/defense modes through
its API. The UI preview does not wire world placement or full gameplay input.
Integrated normal-input acceptance remains outstanding.

## State and persistence

Simulation owns in-memory city state and its fixed-step clock. Integration
must consume its events once, dispatch visuals and own restart/save lifecycle.
No integrated save/load contract is established by these separate specimens.

## Dependencies and provenance

Original authored components; Three.js 0.186.0 is vendored locally with
`Games/Citisten3D/vendor/THREE-LICENSE.txt`. See the world receipt for hashes
and provenance limits. No new runtime dependency or copied game assets are
introduced by this documentation refresh.

## Audit findings

The approved **pre-PBR** canonical world measurement was **2.257124 FPS**, below
the 40 FPS gate. The new materials/geometry change frame cost and have not had a
new canonical performance measurement; the hold remains. The non-canonical GL probe measured 2.077732 FPS but returned a null
renderer identity and a visual artifact; hardware acceleration is unproven.
Sim/UI/browser fixtures are not integrated gameplay acceptance. Registration,
reviewer grading, touch-world controls and the full-fleet release gate remain held.

## Safe iteration

Read the relevant lane receipt and API before changing its source. Preserve
coordinate units, road version invalidation, model handles and single event
consumption. Commit inspected source before refreshing the Git-backed inventory.
Coordinate browser ownership and preserve disk guards. The historical canonical
repair was documentation-only; current world changes require fresh rendered QA.
Run the world check and all three `model-*-check.mjs` checks before visual QA.
The first material capture exposed nonfinite probe coefficients/black surfaces;
its rejected evidence is retained. Fixed-source material QA passed seven fresh
captures with visible lit windows and animated water; see the world receipt.
Model visual quality remains procedural, not photorealistic art acceptance.
The operator removed the verified stale Git index lock; agents did not remove
that admin file or bypass it. The inventory now includes both world `37db2ac`
and UI `cda7970`; earlier maintenance PASS output is not acceptance of these
runtime changes.

## Verification

Batch 34 canonical repair supersedes the incomplete `ce8d2b4` inventory refresh.
Older lane receipts' inventory-blocker statements are historical; this page,
the index and refreshed inventory are the canonical coverage handover.

The post-world/UI refresh records 30 CITISTEN source files, 2,358,922 bytes,
and source tree `56aa92a81149e7387d87d119826de391fefe56f5`. Only this project's
inventory entry changed; catalog remains 127 registered plus six unregistered
projects. No canonical game entry or registration was added.

Run `python3 -B scripts/check_maintenance_docs.py` after the canonical commit.
This checks document coverage and source hashes, not gameplay or performance.
World records four passing Node checks and seven material/model captures. UI
records five cold dark/light screen pairs plus 36 copy/accessibility screenshots
and ten collages. Existing UI evidence hashes were replayed offline; this
maintenance refresh launches no browser and claims no new first-paint proof.
The sim receipt records its final 22 API-fixture screenshots at exit 0; the UI
receipt records its fixture checks. Neither overrides the world render-budget
failure or substitutes for the mandatory full registered-game smoke before push.

## Future outlook

Integration must supply the actual game entry and finish normal-input/reviewer
gates. Registration, publication and push remain separate approvals. Do not
create an entry or catalog row merely to make maintenance documentation pass.

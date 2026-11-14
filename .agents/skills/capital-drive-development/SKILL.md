---
name: capital-drive-development
description: Develop or verify the existing offline Capital Drive Canberra game, including Street Life rules, free roam, source-derived geography, original landmarks and bounded test evidence.
---

Use this skill for changes to the existing `Games/Capital Drive/` project, catalog 245.
It does not authorize another game, registration, publication or a push.

Read repository `AGENTS.md`, `docs/CODE_QUALITY.md`,
`docs/maintenance/README.md`, `docs/maintenance/games/245-capital-drive.md`,
`docs/maintenance/inventory.json`, `docs/capital-drive-street-life-contract.md`
`docs/capital-drive-expansion-contract.md` and
`docs/capital-drive-stores-pool-contract.md`,
`docs/capital-drive-precinct-character-contract.md` and
`docs/capital-drive-district-sources.md`,
`docs/capital-drive-living-interiors-contract.md` and
`docs/capital-drive-living-sources.md` and
`docs/capital-drive-unlock-contract.md` and
`docs/capital-drive-arms-and-streets-contract.md` and
`docs/capital-drive-yoober-contract.md`.
Then follow [the concrete workflow](references/workflow.md). Check current source
against those records; historical test counts are dated evidence.

The repository root is the static document root. There is no build or package
installation step. Use existing Node and Python; keep optional browser/geodata
packages and raw downloads outside the repository. Runtime imports stay local.

Before editing, identify each affected state owner and its callers. Keep module
ownership explicit. If delegating under an authorized multi-agent task, use
disjoint files, bounded tasks and exclusive staging windows. Never edit the
protected Character AI tree, bundled portal JavaScript or disabled proxy backend.
Check disk and sparse selection before expanding any checkout; retain at least
2 GiB free. Never infer absence from a sparse-excluded path.

The controller owns the sole loop, input, modes, storage and UI. Pure modules
accept injected context and supplied dt. Street Life cannot teleport or earn from
sandbox travel. Invalid/denied career saves remain unwritten. Source observations
must be recorded honestly; proprietary reference imagery is never bundled.

Run the bounded authored check runner from the repository root:

```sh
python3 -B scripts/check_capital_drive.py --help
python3 -B scripts/check_capital_drive.py --dry-run
python3 -B scripts/check_capital_drive.py
```

The paths in examples assume the repository root. The runner itself resolves that
root from its own file. It requires all documented modules/suites and fails on a
missing file or failed command. It installs nothing and runs no full-fleet test,
regeneration, maintenance refresh, save reset or push.

For explicitly needed browser evidence, choose a fresh directory outside the
repository and pass it with `--browser --output`. Browser checks use a temporary
localhost server and terminate it. The default is the district/campaign suite. Earlier store/pool runs are retained as dated evidence.
`--expansion-browser` and `--classic-browser` retain the earlier suites. Normal
E first stops a moving car and a second E exits; the harness must respect that.
Browser closure must run before leaving the Playwright context (ExitStack/LIFO),
so cleanup errors cannot mask results. Retain failed runs and their cause.
Record actual results and limitations; a pure
pass does not establish native gameplay, visual quality or N100 performance.
Commit only owned paths. Update maintenance prose/inventory after the source
commit, run its checker, and hand off exact commits, commands, results and holds.


Mapped store names are original parodies; real source names stay in provenance
and search aliases, with parody labels displayed. Use the pinned stores builder
and exact source footprints; inferred frontages are not observed entrances.
Retired shop cooldown IDs remain valid in v1 saves. Pool physical barriers and
water come from the same exported geometry as rendering. Keep the gate passable.

When profiling lag, preserve the instanced traffic adapter and local parked-car
queries. Do not restore a separate full model for every traffic car. Medical
recovery is character-health based; a wrecked car must allow exit. Ordinary
road travel and foot movement must not generate reckless vehicle reports.

Campaign is a third mode with saved ordered chapters. Its completion and rewards
share the career save write; active missions remain transient. No sandbox travel
may advance a chapter. House/shop/Centre room plans and meshes are generated only
on entry and discarded on leave. Counter actions require the matching active room.
Use the rendered door descriptors, never an independent drifting entrance estimate.
North map/terrain live in separate local sidecars. Apply the source overlap guards,
retain lake island holes, and use the same indexed bridge corridor for visible
deck height and water exemptions. Compact lighting attributes have bounded errors;
never infer whole-device performance from a buffer-byte comparison.

The priority-shop browser option reuses the bounded harness for the sourced noodle
restaurant. Its two official interior photo references inform original geometry;
reference photos/logos/murals stay outside runtime assets. Both source caches are
required for a reproducible21-store build; five Civic extras are rebuilt separately from their pinned OSM/ACT caches.


Living-room changes also require the `--browser --living-browser --output` flow
when normal-input evidence is needed. It uses a temporary localhost server and
retains failed runs. Wait for native dialog-close events to settle before held
exercise input; steer around the player's parked car rather than walking through
it. A harness failure is retained and corrected without weakening collision.

Interior activities own supplied-dt scoring and exactly-once completion events.
Progression owns all paid shift and rental cash, validates the live matching room,
station and session, and writes through the existing career save. No passive
workout timer or Free-roam activity may bank progression. X+Y held with timed
ArrowUp presses controls the six-rep bench. Q starts the nearby task; T opens
the hire phone. The active room's people and geometry must dispose on leave.


Vehicle unlock changes use `vehicle-challenges.js` for supplied clocks/edges and
the normal gameplay/controller owners for admission, claims and offences. Run
the focused `--browser --theft-browser --output` flow for visible cues and actual
scooter/car inputs. `--dev-browser` retains a bounded pause-entry regression; do
not publish configured inputs in UI/help/receipts. The full source runner includes
the new challenge, car and scooter-controller authority suites.


Weapon changes use the shared weapons catalogue, independent Gameplay ammo pools
and Progression's strict legacy ownership/cash owner. Use the bounded
`--browser --store-browser --output` flow for actual career purchasing and
`--browser --dealers-browser --output` for free equipment/contact input. Store disabled reasons must match location/ownership/funds/cap/mode guards;
never style a denied action as loading. Street contacts are fictional, not real
people or allegations attached to source POIs. New parking must pass whole-body
clearance against the same traffic lanes and be used for both art and physics.

Yoober uses one transient external car on the directed public-road graph. Bookings
are free; the stopped boarding action debits its authoritative quote once through
Progression and the existing writer. Passenger focus follows the live car, without
foot movement, attacks or ordinary claiming; exit uses the shared physical sweep.
Driver fares require actual legal owned cars and contiguous stopped pickup/drop-off.
Use --browser --yoober-browser --output for normal-input proof, or the focused
script's separate passenger/driver scenarios. Keep failed attempts and no-grant
evidence. Wanted stars alone now permit ordinary purchasing; actual contact panic
and all other stock/reach/ownership rules remain.

Low world/neighbourhood constructors retain geography, physical surfaces and door
descriptors while simplifying presentation detail. Run the paired
test_capital_low_detail.mjs --actual comparison before claiming savings. Geometry
bytes/triangles and software WebGL observations never establish N100 FPS.

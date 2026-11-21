# Visible mini-game cues and vehicle locks

14 November 2026, Australia/Sydney. Continued existing Capital Drive245 under the
owner's merge-all order. No new game, catalog record, runtime remote dependency,
installed package or source-geography rewrite. Earlier living-interior receipts
remain dated evidence; the following changes supersede their automatic car timer
and six-vehicle/three-stand fleet description.

## Ownership and behavior

`interior-activities.js` publishes sequence, index, expected key, grip/memorise
state and cue timing from the same owner that scores input. The common HUD shows
all keys, highlights completed/current steps and pops up the current prompt with
its response bar. The stock order stays visible during repetition. X/Y/ArrowUp
remain the controls; bench grip is still X+Y held. E cancels; P/Esc pauses.

`vehicle-challenges.js` owns supplied clocks and single-key edges. A scooter
challenge has four cues with1.4-second windows and failure on the third mistake; car
locks have eight cues with1-second windows and failure on the second mistake. Fresh presses after
release are required. Early/wrong/late/chord/held presses do not advance, and
elapsed time alone cannot claim anything. Detached frozen snapshots/events expose
no world, money, claim or police setters.

Gameplay owns car admission and final claims: the actual visible car must remain
close and stopped. Occupied drivers get a separate bounded stopping interval;
only a completed challenge can take the car. Only occupied cars displace a driver.
Cars already driven by the player are marked unlocked and allow immediate return.
Recovery, reset, target loss, movement, leaving and cancellation end attempts.

The controller admits nearby scooter hacking through the phone, freezes walking,
feeds actual keys and verifies the exact completion event/session/target before
asking Micromobility for a one-use claim. Failed/stale/replacement events cannot
claim. Hacking has no hire payment callback. Successful theft uses the existing
witnessed offence path; sandbox mode still cannot earn/spend career money.

## Distribution and budgets

There are56 assets across33 deterministic road-derived points in ten areas:
Manuka, Kingston, Griffith, Narrabundah, Red Hill, Barton, foreshore, west/east lake
and Civic. The old six asset IDs/three anchors remain compatible. Most additional
placements are single scooters or small pairs. They are authored estimates beside
retained source roads, not actual live Lime coordinates or operator stock.

Safety queries exclude motor lanes, building clearance, known entrances,
water/parks/sports/campus/pool/restricted areas and physical barriers. Nearby
phone offers are bounded to eight. The renderer selects nearest assets before
capping24 within180m, with the active rider included, in at most five instance
batches. Large docking platforms/signs were replaced by unobtrusive old-anchor
markers. These are adapter resource limits, not a total frame-time benchmark.

## Bounded swarm milestones

M14 `e24aac5d` owns the guarded existing-wallet developer action/pure test; Root
`b1db39b6` owns its masked collapsed Pause form. M15 `7e0c135c` adds its bounded
actual-input regression. Configured inputs are not published in UI/help/receipts.
No save schema or independent wallet was added.

M16 `24c7f9ab` owns challenge state machines and indoor cue data. M17 `efd24afb`
owns car takeover integration and focused actual-simulation tests. M18 `9d95e771`
owns distribution, one-use scooter permits and bounded view. M19 `e2136e17` owns
normal-input vehicle QA. M20 read-only review reproduced the previously driven
car regression and cancel-copy mismatch; Root corrected both. M21 `ae5786d1`
records the red-then-green prior-car return fixture. Root `c3123f02` integrates
HUD, phone/actor lifecycle, final scooter authority and source checks.

Workers used disjoint paths, explicit owned commits and exclusive staging windows;
none pushed. Root owns subjective review, documentation, integration and release.

## Repeatable checks

```sh
python3 -B scripts/check_capital_drive.py
python3 -B scripts/check_capital_drive.py --browser --theft-browser --output <fresh-external-directory>
python3 -B scripts/check_capital_drive.py --browser --dev-browser --output <fresh-external-directory>
python3 -B scripts/check_maintenance_docs.py
python3 -B scripts/generate_sitemap.py --check
```

The source runner covers45authored modules/40pure suites in126commands. Browser
flows use temporary localhost servers, bounded process lifetimes, normal inputs
and read-only observations. The developer test intentionally verifies its actual
form action and saved wallet; that is not evidence of legitimate job earnings.
Retain failed runs and name harness problems rather than weakening timing.

Source checks cover full correct sequences, timing failures, mode/target/visibility
and final-press guards, exactly-once claims, actual parked/occupied physics,
prior-car return, fleet safety/determinism/culling, old IDs and lazy disposal.
Root scooter-controller tests also execute production admission/step functions
against the real module, including a stale-cancel retry and no-wallet claim.

Cloud software WebGL is not N100/native GPU acceptance. 390px captures establish
layout only; touch driving and complete whole-game/city fidelity remain unmeasured.
The separately disclosed historical fleet123/133 certificate-failure HOLD remains
unchanged under the continuing targeted push/merge order. No fresh full-fleet pass
is claimed. See the final dated verification receipt for actual results/limits.

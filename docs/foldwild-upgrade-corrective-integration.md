# Foldwild corrective integration

## Final acceptance (2026-10-25)

**Scoped first-session upgrade accepted after parent visual review.** Final product
`eb917858`, harness `7ac773ca`, independent QA artifacts `48027aed`: Native-5
exits0, desktop/touch **2/2 clean**, separately captured stderr0 bytes, all
callback/game/diagnostic/failure arrays empty. Parent independently verified the
actual 12 source/88 asset hashes, 13 fresh event2 viewport captures, bounded ACK
cleanup and postflight. Browser/server/owned profiles stopped; explicit release
sent to Wings/Jankolock before long documentation. No further browser or push.

Parent opened final desktop/phone world, arrival, battle, 320px inspector and
OS-preference images, plus enlarged actual-video frames. Signs/actors are
separate, named arrival and HUD agree, faces/role outfits/front-back and stepping
are clearer. Current low-poly presentation is accepted for this scope, not a new
art style or hardware guarantee. Full campaign, original/async M2 stability,
rights and physical-device/GPU gates remain held. [Final delivery](foldwild-upgrade-delivery.md)
links the native manifest and both honest five-second-input videos.

The sections below preserve the initial corrective checkpoint and failure history.

## New operator order and ownership

This new fix-and-finish cycle supersedes the old attempts' no-launch restriction,
not their recorded failures. Preserve original evidence under
`foldwild-upgrade-evidence/`; new native evidence belongs in `corrective-cycle/`.
Lane 6 `b22a99ab-df07-45f1-a4be-10157926a2a8` owns runner repair and independent QA;
lane 4 `a7978e29-34fd-4f02-899c-a6a46fee54f7` owns actual-THREE projection/movement
regressions. The parent owns the shared setter fix, close-lifecycle regression,
manual/inventory, runtime freeze, visual judgment and browser-slot coordination.
No new game, asset replacement, source-model recolor, installation or push.

## Diagnosed fixes and regression

The actual shared `setAppearance` boundary incorrectly preferred any truthy
`hair` value over `hairColor`, so a hairstyle such as `long` masked a valid color
alias. It also rebuilt the player for every successful service transaction, even
when normalized colors/style were unchanged, discarding paused gait/facing.
The parent traced all four controller/view caller paths and patched the shared
setter: choose the first valid hex color independently of hairstyle, and rebuild
only for an actual appearance change. Existing allowed colors/save schemas and
supplied creatures remain untouched. Actual style changes may reconstruct the
local human; no continuity promise is invented for those deliberate edits.

The worker retained its failing alias assertion and replaced the old known-defect
observation with strict same-rig/full-motion preservation for unchanged updates.
The tests now pass without filtering the failure. New actual-THREE sign checks
project real human vertices and billboard corners at desktop/390/320 fixtures,
and ray-test the trial stone rather than assuming a bounding-box proxy.

Parent's new `scripts/test_foldwild_inspection_close.mjs` executes real trusted
controller functions and the dialog close listener with a deliberately late
inspection model promise. A single close restores the original canvas, invalidates
the stale generation, retains position/roster/save state and restores result
presentation appropriately. A plain ledger close does not reload the world.
This is a lifecycle regression, **not proof of native touch-hit delivery**.

The runner now preserves the original exception even if screenshot/DOM/cleanup
also fail, logs bounded stage/request/server diagnostics and performs only fresh
current desktop/touch cases, not redundant baseline contexts. Navigation remains
10 seconds with explicit app/font/model readiness; no timeout inflation. Historical
load-stall cause is not proven by these diagnostic changes.

## Historical initial source freeze checkpoint

Parent executed at `2026-10-25T00:49:35Z`:

```sh
for f in scripts/test_foldwild_*.mjs; do node "$f" || exit; done
for f in Games/Foldwild/*.js; do node --check "$f" || exit; done
python3 -B scripts/test_foldwild_upgrade_runner.py
python3 -B scripts/test_foldwild_m2_shell.py
git diff --check
```

**20 Node suites pass**, ten game-module syntax checks exit zero, runner's
browser-free failure/readiness/font regression passes, unchanged shell ABI prints
`Ran 1 test` / `OK`, whitespace exits zero. All original canonical80 hashes,
500 world snapshots, 168 battle snapshots, strict old-save/pending identity and
RNG checks remain. These are source/fixture checks, not native acceptance.

Runtime SHA-256 after correction:

- `Games/Foldwild/view.js`: `b5e5b383a06a4228f2a55a62df6710bead96ed1d4691d1801048270a647c1619`
- `Games/Foldwild/script.js`: `2c87ce5312e9f0a1b44c9d9efb206c80e202a2b8ba0ce4f12f44f5883611d1fc`

The native runner must capture/check all runtime and asset hashes at its own
fresh admission. No runtime changes are allowed while that batch runs.

## Historical native admission plan

Citisten `51fcd205` owns FIRST slot, Foldwild SECOND only after explicit release,
Jankolock `783d54ad` THIRD after Foldwild's explicit browser/server release, Wings
`771b8d63` FOURTH. An estimated time is not release. No foreign-process action.

Required fresh observations: corrected signs/scenery and legible compact goal,
visible articulated walking recorded from actual canvas, actual touch movement,
exactly one inspector Close after 390-to-320 resize, Maren arrival/preview,
wild ability and battle exit, manual pending save/reload/exact next-action replay,
reopened menus, reduced motion and desktop/mobile layout. No fixture grants,
Close retry, assertion removal or inflated deadline. At most two attempts per
unchanged hypothesis; diagnose before another attempt. Parent must personally
review the new screenshots and walking frames. Those were the initial admission
requirements; the final outcome is recorded above and below.

## Final product correction and qualification

Parent's Native-4 visual review found two real defects despite a clean harness:
auto-routing ended on the NPC/creature center, and a scrolled battle pane could
hide the returning objective. `eb917858` fixes the shared controller boundaries:
stop automatic movement within1.4m of the target (unchanged1.8m interaction), reset
controls scroll in `setPhase`. Manual movement/old save positions are not
teleported; schemas, roster, optional separation, RNG/progression stay unchanged.
The actual-controller test now requires1.2–1.4m separation, not a center overlap,
and executes the real phase-scroll reset. This is a stronger presentation contract,
not a relaxed gate to hide the old defect.

New frozen `Games/Foldwild/script.js` SHA-256:
`51bacd230419a605d017a5129e950d7f6db0de9e7c267f538ab8503044230f4a`.
View SHA remains `b5e5b383a06a4228f2a55a62df6710bead96ed1d4691d1801048270a647c1619`.
`freeze-eb917858.json` and `phase-a-eb917858.json` in the corrective evidence
separate this runtime from Native-4's clean previous-controller result.

One new-runtime Native-5 batch completed all original checks plus strict rendered
Maren/wild separation: desktop1.228956/1.205278m, phone1.390322/1.367052m.
Post-Flee objective headings are visible below their sticky toolbar with scrollTop0
on both cases, asserted **before** manual save or capture-only DOM scroll setup.
All13 accepted frame2 captures took0.147312–0.825908s including cleanup; ACKs in
flight and callback errors are zero. Desktop input held5s encoded4.677269s/30
frames; touch input held5s encoded5.225274s/64 frames. No padding/smoothness claim.
Native-3's terminal callback defect and every prior failure remain preserved.

At closeout, parent reran **20 Node suites,10 JS syntax checks**, browser-free
runner and diagnostic checks and unchanged M2 shell (`Ran1 test`/`OK`), all pass.
Catalog schema/types/unique IDs/Git-backed URLs pass for129 unchanged entries.
An initial ad-hoc catalog audit incorrectly required nonempty icon strings;
existing schema permits blank strings. Correct required-type audit passed without
changing catalog/runtime/tests or excluding entries. Whitespace passes.

Official Foldwild inventory equality passes at tree
`6929cd6f31b89841b1eafeb9e745e73aca002424`,97 files/15,381,500 bytes. Every unrelated
inventory field is unchanged. Required global checker still exits1 with
`Inventory stale: inspect changes, then run --refresh.` for five unrelated rows:
BrainrotBoulevard, Citisten3D, Jankolock, Jankolock3D and Wings. No blind refresh.
Evidence totals 4,604,791 bytes including the SVG mockup, under 5,000,000;
final-native root free bytes
2,603,630,592, above2,147,483,648. No install, broad checkout, full-fleet, release,
new game, protected-path edit, publication or push. Final commit/status/storage
observation is reported separately after this documentation commit.

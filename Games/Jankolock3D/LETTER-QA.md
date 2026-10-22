# Short integration letter captures

`letter-qa.py` captures the existing integrated page, not replacement gameplay.
Each invocation runs one system Chromium and a temporary loopback server, stops
both in `finally`, rejects an active Chrome/Chromium root (including CLI/CDP),
and checks disk before writes. Use `/dev/shm` for browser profiles; no Xvfb,
fleet, browser downloads, new dependency, remote runtime resource or push.

```sh
TMPDIR=/dev/shm SMOKE_PORT=8948 timeout --signal=TERM --kill-after=10s 120s python3 -B Games/Jankolock3D/letter-qa.py C
# D also captures G victory and defeat from the same actual systems path.
TMPDIR=/dev/shm SMOKE_PORT=8948 timeout --signal=TERM --kill-after=10s 150s python3 -B Games/Jankolock3D/letter-qa.py D
TMPDIR=/dev/shm SMOKE_PORT=8948 timeout --signal=TERM --kill-after=10s 120s python3 -B Games/Jankolock3D/letter-qa.py F
# Four separately bounded hero runs, serialized with the global browser queue:
TMPDIR=/dev/shm SMOKE_PORT=8948 timeout --signal=TERM --kill-after=10s 120s python3 -B Games/Jankolock3D/letter-qa.py E --hero stampead
# Repeat E with --hero turretina, snipeoff, gooey.
```

All outputs use the authorized
`docs/maintenance/audits/jankolock-3d-qa/integration/` directory. Reports retain
runtime hashes before/after, HTTP responses, errors, screenshot hashes/variance,
actual checks, fixture classification and shared-root storage. Main letter
PNGs are 1280x720. The E contact sheet and F mockup/runtime comparison are
separately labeled composites; their original full-size captures remain.

## Evidence meaning

- C uses real production damage to drop orbs after explicit API clock/position
  setup, then a native mouse weapon ray secures one, actual ground attraction
  pays another, and the production API denies an enemy floating orb. Camera aim
  and initial damage/reposition are fixtures, not native aiming/combat claims.
- D uses the existing logged 600-second damage/reposition/passive-bot policy.
  Its screenshot timeline is an explicitly labeled QA DOM overlay of real
  `objective_fall`/`patron_phase` events, not a fabricated game HUD or native win.
  `D-world` is the unmodified world/HUD view with P2 still alive. The JSON
  retains actions/events so lane locks and phase order can be checked.
- E selects each real hero in the lobby, uses native 1-4 keys in the shared
  third-person world, verifies cast counters and live FX, and freezes actual
  effects for captures. Clock/position setup is API-controlled. Visual presence
  does not certify every ability's damage balance or behavior against humans.
- F explicitly seeds 25,600 souls. Native buttons buy at all four prices,
  health rises by 200, and active-item buttons exercise the collision-resolved
  dash and burst deadline. It is not earned income or a natural economy run.
  `comparison-F.png` labels the approved flat mockup versus actual shop.
- G is the production Victory dialog after actual enemy P2 death. The symmetric
  run produces the production Defeat dialog. No HP/locks/winner assignment.

At the pre-visual-pass milestone, C/D/G, all sixteen E casts and the F retry
completed on stable then-current runtime bytes: 29 actual 1280x720 captures, 208 HTTP200 responses, zero recorded errors.
E additionally retains a labeled sixteen-frame contact sheet; F retains the
approved-mockup/actual-shop twin. The native ability-key handler creates each
FX before an appended QA listener freezes its real clock in that same event;
this avoids aging short effects during a slow screenshot, not a fake cast.
F verifies 1,365 -> 1,565 max HP, four purchased items, 13,600 souls remaining,
a collision-resolved 10m dash and a live burst deadline. Its first selector
failure is retained with exact archived images; no failed report was relabeled.
These targeted builder checks never replace independent A-I grading, the
unchanged full catalog gate, supported-hardware/touch verification, or the
remaining neutral/boss/pacing work. See the integration audit COMPLETION.md.

## Current visual-pass captures

Use `--visual-pass` to keep new evidence separate from the historical integration
folder. Every artifact write checks the whole visual-pass 60 MB growth ceiling
and the ordinary free-disk guard. No waiver or browser download is used.

```sh
# One hero per bounded run; repeat E/P for all four IDs, serially.
TMPDIR=/dev/shm SMOKE_PORT=8948 timeout --signal=TERM --kill-after=10s 150s python3 -B Games/Jankolock3D/letter-qa.py E --hero stampead --visual-pass
TMPDIR=/dev/shm SMOKE_PORT=8948 timeout --signal=TERM --kill-after=10s 150s python3 -B Games/Jankolock3D/letter-qa.py P --hero stampead --visual-pass
TMPDIR=/dev/shm SMOKE_PORT=8948 timeout --signal=TERM --kill-after=10s 300s python3 -B Games/Jankolock3D/letter-qa.py A --visual-pass
TMPDIR=/dev/shm SMOKE_PORT=8948 timeout --signal=TERM --kill-after=10s 150s python3 -B Games/Jankolock3D/letter-qa.py H --visual-pass
```

E records sixteen native keys/real ability effects plus four inspection views;
those late views can still contain legitimate active FX. P separately provides
four clean GLB views without casting/hiding effects, plus native double-jump,
dash and slide inputs using explicit fixture time on Stampead. Its four labeled
twins compare the actual full viewport with the original concept, not a mesh
render substituted into gameplay. A uses three labeled lane placements, native
short walks and E attachments, scripted elapsed zip time and actual alive/free
arrivals, then a labeled overview camera. H loads the normal lobby with no QA
query, then toggles the HTML theme; the world is not recolored as a second theme.

All ten final receipts completed: 36 nonblank full-size captures, 635 recorded
HTTP200 responses, zero recorded errors, matching runtime and screenshot hashes.
E/P single-hero invocations each use one dedicated bounded Chromium; they do not
claim the advisory persistent-profile/CDP recipe was exercised. The 300s E and
180s P multi-hero timeouts remain explicitly incomplete in separate directories.
Frozen capture checks also verify no idle GPU redraw via the renderer frame
counter. Counts and software screenshots are builder evidence, not art, hardware,
full match, native exhaustive walking or full-catalog release acceptance.

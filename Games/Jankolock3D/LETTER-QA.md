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

D/G and C completed with stable runtime bytes and no recorded errors. The first
F attempt captured shop/all purchase tiers, then failed because the harness
used the wrong accessible name for an active button. Its failed JSON is kept;
the runner now uses the existing `data-active` selectors. E and the F active
retry are recorded in their own reports when complete. These targeted builder
checks never replace independent A-I grading, the unchanged full catalog gate,
supported-hardware/touch verification, or the remaining neutral/boss/pacing work.

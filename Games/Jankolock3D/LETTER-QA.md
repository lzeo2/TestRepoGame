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

C/D/G, all sixteen E casts and the F retry completed on stable current runtime
bytes: 29 actual 1280x720 captures, 208 HTTP200 responses, zero recorded errors.
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

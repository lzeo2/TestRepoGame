# C-D-E-F-G letter completion

Requested missing-letter capture work is complete. This is builder evidence,
not an independent A-I acceptance grade, fleet gate, hardware gate or release.
No push, new game/ID, dependency install or runtime gameplay change in this
follow-up. Catalog remains 127 unique IDs; other 126 records are unchanged.

## Actual captured evidence

| Letter | Evidence | Completed checks |
| --- | --- | --- |
| C | `integration-C.png`, `C-orbs`, `C-secure`, `C-ground` | Production damage drops souls; native mouse weapon ray secures; real radius/magnet ground pickup; production API denies. Balance 0 -> 120. API clock/position/aim setup is labeled. |
| D | `integration-D.png`, `D-world`, `integration-chain.json` | Actual-event QA timeline overlay and plain world view. Three lane chains unlock in order; all six shrines precede P2. No HP/lock/winner assignment. |
| E | `integration-E.png`, `integration-E-{hero}-{1..4}.png` | Four native numbered keys for each of Stampead, Turretina, Snipeoff and Gooey Sticky in the shared third-person world; sixteen real casts/FX. API setup and frozen FX clocks are labeled. |
| F | `integration-F.png`, `F-tier-{2..4}`, `F-active`, `comparison-F.png` | Real shop plus labeled approved-mockup/runtime twin. Native buys at 800/1600/3200/6400; HP1365 ->1565; four items; souls13600; collision-resolved dash10m; burst deadline78.05 at clock75.05. Explicitly seeded25600 souls, not earned income. |
| G | `integration-G.png`, `G-defeat` | Standard Victory after actual enemy P2 death; symmetric actual Defeat after own P2 death. Logged API assists/passive hero bots, not native human wins. |

`integration-E-all-heroes.png` is a labeled sixteen-frame contact sheet, not a
single native viewport. `comparison-F.png` is2560x752; all29 actual fresh
captures are1280x720. `integration-E.png` is an exact canonical duplicate of the
Stampead slam frame, not an additional capture. The first failed F selector
attempt and four exact images remain archived with `-attempt1` filenames.
The harness selector was corrected to existing `data-active` attributes; no
runtime error or purchase/stat failure was hidden.

Completed per-letter receipts:

- C:4 captures,26 HTTP200,0 recorded errors.
- D/G:4 captures,52 HTTP200,0 recorded errors.
- E:16 captures,104 HTTP200,0 recorded errors.
- F retry:5 captures,26 HTTP200,0 recorded errors.
- Total:29 actual captures,208 HTTP200,0 recorded errors. Every captured PNG
  passed RGB variance>100. Every report's before/after runtime hashes match
  each other and the final current runtime. Captured PNG hashes were rechecked.
- The600s chain receipt independently rechecked19 objective falls, both base
  guards before shrines per lane, all six shrines before P2 at570, later actual
  victory at590, and final clock600. The passive/damage/reposition policy and
  individual raw damage actions are retained, not disguised as normal play.

## Files, milestones and verification

New authored code is the214-line `Games/Jankolock3D/letter-qa.py`; its59-line
`LETTER-QA.md` documents scope/fixtures. Canonical maintenance guide, inventory
and this audit are updated. No runtime `.mjs` was changed by letter capture.

Milestones: `8d289db` D/G; `5423ae1` C; `8c023ea` runner/guide;
`def2fba` sixteen E frames, successful F retry, composites and failed archive.
Independent traversal owner committed its four previously dirty paths in
`24c8ed7`; those were reviewed, never silently absorbed into this task.

Commands/checks actually completed:

- `node --check` on every game/root and hero `.mjs`.
- `node Games/Jankolock3D/integration-test.mjs`: bridge heights, frozen zip setup,
  both600s win chains, runtime orb accounting, portrait integrity, catalog pass.
- UI self-test:8 checks; bots:8 groups; world:491 assertions.
- Hero runtime and visual regressions passed; Python AST parses.
- Catalog127 unique; other126 records unchanged; all A-I named PNGs now exist.
- `git diff --check` and maintenance coverage pass:133 projects,127 registered
  plus6 unregistered; Git inventory current. Coverage is not semantic grading.

All browsers used explicit `/usr/bin/chromium`, headless software WebGL, profiles
in RAM and bounded loopback-only servers. No Xvfb/fleets. Global queue handoffs
were honored; own browser/driver/server processes exited normally and cleanup
was verified/notified. No foreign process was killed. Host-pressure CLI delays
were diagnosed by Hermes; commands recovered. No environment workaround needed.

Shared-root free space: entry5055565824 bytes; post-evidence-commit checkpoint
5077323776 bytes, net+21757952 bytes. Host-wide concurrent cleanup/growth prevents
attributing that delta solely to this task; no disk waiver was used.

## Remaining qualifications

No BLOCKED-WORLD finding for requested C-G captures. Older A/B/H/I retain their
own historical source/fixture qualifications; their presence is not a fresh
full-suite pass. The earlier full `integration-evidence.json` remains interrupted,
not retroactively green. Independent grading, full-fleet pre-push smoke, supported
GPU/handheld verification, neutral/Mid-Boss/rejuvenator completion and human
match pacing/balance remain outside these captures. The pre-existing untracked
`docs/jank3d-design/ui-mockup-world-controls.png` remains untouched; all owned
paths are committed. No push.

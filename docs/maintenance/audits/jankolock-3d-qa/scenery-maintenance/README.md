# Jankolock scenery, terrain safety and UI maintenance

Existing game only, catalog 240. No new game/ID, third-party runtime load,
asset download, catalog change, push or publication. This is targeted software
Chromium/CPU evidence, not supported-GPU, photorealism, full-match or fleet acceptance.

## Milestones

- `6c58203`: shared terrain wall collision, 448m bounds, last-safe recovery below
  -32m; legitimate sewer -10m and plaza -6m remain usable.
- `ef5cd06`: remove duplicate HUD health/empty inventory display, compact abilities,
  reduce lobby copy and put map legend in Controls.
- `62f2fcf`: three tiny original aggregate maps, world-scaled UVs, merged street/
  retaining surfaces, grounded plaza paving, directional light definition, building
  base/roof recesses and first camera terrain repair. No delivered assets changed.
- Coordinated, separately owned `696f2d3` and `ac7276a`: numeric/fixed health HUD,
  responsive fire and cheap shot feedback. Their own section in the canonical
  manual records implementation and the separate mobile-scroll probe.
- Final radius follow-up keeps both the body and shoulder camera outside steep
  terrain sides; ramp step allowance and underside collision remain. The two
  final PNGs here show the wall instead of the exposed void. A nearby wall can
  still occupy much of the view; no transparency/occlusion-fade system was added.

## Actual checks

`scenery-qa.py` uses the installed system Chromium, blocks nonlocal requests,
records source SHA-256s, bounds waits and shuts browser/server down in `finally`.
Positions use existing loopback-only `place` fixtures. Edge movement is native
keyboard input with measured simulation progress, not an API walk/clock grant.
Scene placements do not establish native full-lane traversal or combat balance.

| Receipt | Actual result |
| --- | --- |
| `attempt1-failed.json` | FAILED: five captures, 70 responses, no browser errors; a fixed 900ms input window observed no movement. Not a pass. |
| `nine-captures.json` | PASS targeted: nine captures, two native edge probes, 70 responses, no browser errors; desktop/mobile-width dark/light reviewed. Pins precede the final camera and fixed-health-HUD follow-ups. |
| `centre-only-rejected.json` | Mechanical pass, two captures/70 responses/no errors, but subjective review rejected the remaining void sliver. Not visual acceptance. |
| `final-radius.json` | PASS targeted: two native edge probes, two captures/70 responses, zero errors. All eight runtime hashes independently match final source. Browser/server closed. |

The nine-shot images and failed first-run images remain in the runner's RAM
output directory, including its `attempt1/` archive. Only the two final edge PNGs
are copied here to avoid adding redundant screenshot payload. Named PNGs in
older receipts are scoped to those receipts, not substituted with the final pair.
The coordinated HUD owner separately reviewed the dark/light desktop/mobile
images and a fixed-HUD phone scroll image. Mobile width checks are layout proof,
not physical touch/hardware ergonomics acceptance.

Fresh CPU results:

- `player-controller-test`: **1,396 assertions passed**.
- `world-test`: **505 assertions passed**.
- `environment-test`: **PASS**, 67,028 instances / 927,954 assembled triangles /
  280 coarse batches; texture/UV/merged surface/disposal checks. No FPS inference.
- `bots-test`: **8 groups passed**.
- `systems-test --no-evidence`: **18 groups and scripted match completed**.
- `systems-view-test`: shared 24-trooper geometry/lifecycle **PASS**.
- Integration UI **14 checks**; combat-input VM, hero runtime/visuals and external
  rigs (**2,540 poses**) pass. Syntax and authored whitespace checks pass.
- `integration-test` passes both 600s objective chains and portrait integrity,
  then **FAILS** its pre-existing hardcoded catalog count: actual128, expected127.
  No assertion or failure filter was weakened. Independent catalog validation
  passes128 unique IDs/schema/Git-backed entry URLs. Full fleet smoke was not run.

Reproduce from repository root, with no competing browser:

```sh
TMPDIR=/dev/shm timeout --signal=TERM --kill-after=10s 240s python3 -B Games/Jankolock3D/scenery-qa.py
TMPDIR=/dev/shm timeout --signal=TERM --kill-after=10s 120s python3 -B Games/Jankolock3D/scenery-qa.py --edges-only
```

Historical blocked/interrupted tool calls with no report are not inferred passes.
The original first-run failure, centre-only rejection and older art/hardware holds
remain explicit. Broad rectangular roads, primitive objectives, rigid vegetation,
uncollidable dressing and lack of scene-wide contact shadows remain visual limits.

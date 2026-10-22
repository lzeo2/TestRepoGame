# Heroes resume: live reveal repair and current-model evidence

Builder evidence for **E**, not a reviewer acceptance grade. No Blender, new
models, rig-pose edits, kit rebalance, UI redesign, dependencies or push.
Existing externally supplied GLBs, procedural ability FX, camera framing and
all damage/health authority boundaries remain intact.

## Contract and scope

The restored repository-root `jank3d-spec.md` was read before any work and its
MD5 matched the relayed `aaa75071e498f6ca977db0e06fad2641`. Earlier temporary
spec and hero-brief reads returned ENOENT. A later probe no longer found the
root copy either; the already-read, hash-verified contract remained the basis
for this bounded continuation. No ALWAYS/ASK/NEVER clause was reconstructed.
No missing-file recovery, model handoff or disk waiver was assumed.

Local source/manual review showed the four external hero bodies and deployed
stapler had already landed. Their integrity and rig checks were rerun without
regenerating assets. This lane therefore addressed the documented stale reveal
bug rather than starting the finished mesh wishlist work again.

## Changes and ownership

- `hero-runtime.mjs`: xray supplies the current live enemy positions within kit
  range rather than retaining cast-time records. Replaced arrays, replaced
  position objects and caster movement are supported.
- `hero-visuals.mjs`: reuse cage pairs up to peak simultaneous membership;
  hide surplus pairs instead of recreating the whole effect/material each
  frame. Original shape, color, through-cover depth exception and lifetime stay.
- `hero-runtime-test.mjs`, `hero-visuals-test.mjs`: coverage for death/removal,
  team/range changes, new entrants, empty initial sets, replacement positions,
  resource identity reuse, original expiry, cooldown and cleanup. No HP writes.
- `hero-qa.py`: separate output directory preserves historical screenshots;
  native reveal death/respawn/expiry sequence; request/console monitoring on
  both desktop and mobile; native SHA/variance and stable source hashes;
  sibling-browser guard and explicit run status.
- `HEROES.md` and the canonical `240-jankolock3d.md` manual are updated. Only
  the existing Jankolock3D inventory record is refreshed.

The worker's shared runtime/regression changes landed in `15f31e9`; explicit
resource-identity assertions followed in `825533b`. Parent review inspected
both diffs. Runner/manual commit is `24cc2ad`, the final capture's source revision.
Compared with pre-resume `087b67c`, runtime-only edits are **+22/-10 LOC** across
two files; tests are +68/-2, runner +60/-11. With the two manuals, the seven
source/document files total +236/-41 before this receipt/inventory/evidence.

## Fresh checks

```
player-controller-test: 1365 assertions passed (Node only; native camera/input acceptance unproven)
hero-runtime-test: 5 remote-origin events accepted by systems; 16 kit casts, cooldown/expiry/cleanup, cover, headshots, tether break, slide ammo, turret, grenade bounce, healing and live xray membership/pooling/lifetime checked (not native acceptance)
PASS: 4 manifest-pinned external GLB heroes/linear palettes/PBR512/real rigid nodes; deployed stapler bearing/pitch;16 unique kit FX+7 generic FX; lifecycle/links/expiry/cap; live xray pooling and direct-point compatibility
PASS external rigs: 2540 checked poses; raw GLBs, no browser or asset-cache dependency
PASS --check: 5 unchanged external originals; no fallback generation
hero-qa: 4 hero pages HTTP 200; 37 screenshots; 24 observations; 0 retained errors; source hashes stable. Reviewer acceptance pending.
PASS: 133 game documents cover 127 registered + 6 unregistered games; Git inventory current.
```

The delegated systems (18 groups), bots (8 groups) and integrated chain
regressions also completed. Authored syntax/diff checks passed. The 1,365 count
belongs to the controller unit runner, not a native acceptance claim.

Final browser command, after source commit:

```
TMPDIR=/dev/shm timeout --signal=TERM --kill-after=15s 360s python3 -B Games/Jankolock3D/heroes/hero-qa.py
```

System Chromium only, serialized browser, bounded local HTTP server, no state
setters, clock grants, seeded HP changes or screenshot substitution. Four
harness entries and **270 total responses were HTTP200**, with **zero retained
page/console/request errors**. **106 source/resource hashes** remained unchanged.
The report pins the runner, kits, models and resources; this is not a hardware
performance benchmark or a full integrated match/release gate.

## Images and observations

There are **37 native captures** plus **two labeled mockup/runtime twins** and
**one contact sheet**: 40 PNGs. Desktop captures are 1280x720; mobile uses actual
390x844 or full-page dimensions, not a stretched desktop. All native captures
have recorded SHA-256, dimensions and RGB variance; minimum variance is 4180.39.

- [All sixteen ability FX](heroes-fx-contact-sheet.png).
- [Native reveal: target dead](heroes-xray-target-death.png),
  [target respawned within the same cast](heroes-xray-target-respawn.png),
  [original reveal expired](heroes-xray-expired.png).
- [Double jump](heroes-double-jump.png), [dash](heroes-dash.png),
  [slide/free-ammo shot](heroes-slide.png), [camera clamp](heroes-camera-wall-clamp.png).
- [Desktop mockup twin](heroes-mockup-vs-implemented.png),
  [mobile mockup twin](heroes-mobile-mockup-vs-implemented.png).
- [Machine-readable observations](heroes-browser-report.json).

The reveal sequence weakens a dummy using normal attacks, casts reveal, kills
it using primary fire, then waits for the range's existing three-second respawn.
Images show the center cage absent on death and present again on respawn during
the original six-second cast. Node regressions separately establish new-entity,
replacement-object, team/range and resource-reuse behavior. All ability captures,
movement and both-theme desktop/mobile views were inspected. The current art is
stylized supplied art, not a new fidelity claim by this lane.

## Holds and storage

The rigid slide pose still reads comparatively upright despite the verified
controller slide/free-ammo state. This continuation does not reopen the supplied
rig/mesh flow. Independent E/current integrated A-I grading, target-GPU/FPS,
real handheld ergonomics, full-match balance and the complete fleet release
smoke remain separate. No new game/ID/catalog edit; 127 entries remain.

Resume preflight free space was **3,300,081,664 bytes**, above the ordinary guard;
no waiver was used. The final browser run recorded **3,292,479,488 ->
3,293,155,328 bytes** free (shared host usage can increase or decrease independently
of this lane). The packet occupied 4,708,028 bytes before this receipt. No old
PNG/model/receipt was deleted or overwritten. The sibling untracked
`docs/jank3d-design/ui-mockup-world-controls.png` remains untouched.

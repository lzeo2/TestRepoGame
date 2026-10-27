# Foldwild exploration and presentation upgrade

## Final result

**Implemented, integrated and locally committed. Scoped first-session desktop/touch
acceptance PASS on final runtime `eb917858`; no push.** Six actual Paseo lanes and
their responsibility map are in [dispatch](foldwild-upgrade-dispatch.md). This is
existing preview226, not a new game, port, catalog addition or publication.

The final independent gate is [native-5/native-results.json](foldwild-upgrade-evidence/corrective-cycle/native-5/native-results.json):
**process exit 0, 2/2 cases pass**, empty page/console-error/request/HTTP/external,
failure, diagnostic and callback error arrays; separately captured
[stderr.txt](foldwild-upgrade-evidence/corrective-cycle/native-5/stderr.txt) is
**zero bytes**. Browser/server stopped, no owned Chromium roots/profiles remain,
all 12 runtime hashes and all 88 model/vendor/font hashes stayed frozen. Parent
independently checked the actual files/manifests and reviewed the final images
and walking frames. Prior failures are preserved, not relabeled green.

## Improvements tied to the complaints

| Complaint | Integrated implementation |
| --- | --- |
| Cannot locate northern clearing | Compact **Northern Clearing** objective, next-route compass direction, remaining collision-safe trail distance, Walk/Stop control, arrival feedback and explicit Maren preview. The real destination is `(22,-26)`, not the decorative stone at `(16,-40)`. A physical sign and trial arch use that same identity. |
| Confusing UI and menus | Visible goal before the contextual action; secondary markers, team/travel and settings use native disclosures. Recovery/save tools, keyboard access and44px controls remain. Phase changes restore the controls panel to the top so returning from battle exposes the objective. |
| Exploration lacks identity/feedback | Five named trial sites, bridge-loop identity, route edging and15 collision-safe spurs to existing fiber caches. Existing delivery/sale hints explain their value. No filler collectible markers, new payouts or campaign gates. |
| Humans look unfinished | Grounded multipart humans, fitted jacket/shirt/belt, arms/hands/boots, face/front/backpack distinction and role outfits. Cached primitive resources and one NPC box batch keep the original modest renderer. |
| Animation is confusing | Displacement-driven hip/knee/ankle stepping, opposing arms, planted stance, shortest-angle facing and start/stop settling. Idle whole-body bob is removed. Battle anticipation/impact/recovery moves original creature frames, not an invented GLB skeleton. Reduced motion remains functional. |
| Actors overlap on arrival | Autowalk now stops about1.4m from its target, inside the unchanged1.8m interaction radius. It no longer steers the player onto the NPC/creature center. Manual movement and old saved positions are not teleported or migrated. |

Supplied creature bytes/colors, canonical80 stats/actions/collection, separate
optional bonus, save keys/schema, strict imports and campaign progression are
preserved. No new runtime dependency, remote load, model derivative or install.
The original80 model hashes/7,300,844 bytes and separate optional model SHA pass.

## Real native verification

Final command, one serial system-Chromium batch after exclusive-slot preflight:

```sh
timeout --signal=TERM --kill-after=10s 590s python3 -B scripts/test_foldwild_upgrade.py --go
```

The total600s bound includes kill grace; it completed normally. `/usr/bin/chromium`
is explicit. Existing application deadlines were not inflated:10s navigation/input,
one shared30s model-and-fresh-render budget,45s route, absolute3s viewport capture
including cleanup. No state grants, synthetic wins, Close retries or error exclusions.

Both1280x800 desktop and390x844 actual-touch cases passed:

- Normal starter/seed42 input; compact goal and real route to Northern Clearing;
  arrival, Maren preview/Back with no trial credited.
- Exactly one inspector Close, including phone390-to-320 resize,44px center-hit
  target, original canvas restored, world models ready and expedition unchanged.
- Actual five-second keyboard/held-touch movement, changing arm/knee poses,
  grounded soles/level boots/no root bob, reduced-motion movement and preference
  save/reload through native controls.
- Real offered Budriv interaction and ability; manual pending save, reload/Continue,
  exact full next-Wait battle/RNG comparison, Flee and Continue back to exploration.
- Objective visible immediately after battle **before** save or screenshot scroll
  setup; no horizontal overflow or undersized visible targets. Both OS preferences
  retain the intentional fixed-light shell.

Final measured player-to-target separation:

| Case | Maren | Wild target | Post-battle controls |
| --- | ---: | ---: | --- |
| Desktop |1.228956m|1.205278m|scrollTop0; heading y120 below toolbar bottom112|
| Touch phone |1.390322m|1.367052m|scrollTop0; heading y406.5625 below toolbar bottom398.5625|

### User-facing before/after and motion evidence

Before: [desktop](foldwild-upgrade-evidence/baseline-1280-light-world-scenery-ui.jpg),
[phone](foldwild-upgrade-evidence/baseline-390-light-world-scenery-ui.jpg).
The [SVG mockup](foldwild-upgrade-evidence/ui-mockup.svg) was authored before UI
code; it is a design artifact, not gameplay evidence.

Final evidence under `docs/foldwild-upgrade-evidence/corrective-cycle/native-5/`:

- [Desktop arrival](foldwild-upgrade-evidence/corrective-cycle/native-5/current-1280-arrival.jpg)
  and [phone arrival](foldwild-upgrade-evidence/corrective-cycle/native-5/current-390-arrival.jpg).
- [Desktop battle](foldwild-upgrade-evidence/corrective-cycle/native-5/current-1280-wild-battle.jpg)
  and [phone battle](foldwild-upgrade-evidence/corrective-cycle/native-5/current-390-wild-battle.jpg).
- [320px inspector](foldwild-upgrade-evidence/corrective-cycle/native-5/current-390-320-inspector-before-close.jpg).
- [Desktop walking video](foldwild-upgrade-evidence/corrective-cycle/native-5/current-1280-walking.webm)
  and [actual-touch walking video](foldwild-upgrade-evidence/corrective-cycle/native-5/current-390-walking.webm).
- World/menu/dark-preference captures and per-capture timing/metadata are listed in
  the final manifest:13 fresh full-viewport JPEGs plus both videos.

JPEGs come from native CDP viewport frames, not synthetic DOM reconstruction or
canvas-only substitutes. The cached first frame is discarded; accepted event2
arrives within the unchanged3s total budget. Models must be loaded before three
additional real renders. Listener removal, in-flight ACK draining, stop/detach,
callback errors and OS stderr are checked before a clean verdict.

Parent's visual judgment: **scoped upgrade accepted**. The clearing is named and
findable, signs no longer cover actors, player/targets are physically separate,
front/back and role outfits are clearer, the actual battle scene matches its HUD,
and the returning objective is visible. The intended mockup hierarchy is present
without its illustrative art/copy. Phone battle actions beyond abilities require
HUD scrolling while scene/Pause stay available; not every action fits above the fold.
The world remains deliberately simple/flat low-poly art, not a new terrain engine.

Both inputs were held5s. Encoded desktop video is4.677269s/30 frames; phone is
5.225274s/64 frames. Parent reviewed actual cropped/contact frames to verify
alternating steps/arms and stationary root height. Sparse software-rendered footage
is not a60fps claim or physical-device/GPU performance acceptance.

## Diagnosed corrective work and honest failure history

[Independent corrective receipt](foldwild-upgrade-corrective-qa.md) records exact
commands, outputs, commits and each preserved attempt. [Presentation checks](foldwild-upgrade-corrective-presentation.md)
and [parent integration](foldwild-upgrade-corrective-integration.md) separate actual
source tests from native/subjective evidence.

- Initial upgrade runs: oversized sign rejected; a movement-helper deadline failed
  after reaching its tolerance; another batch stalled at baseline load. All remain.
- Corrective native1: phone Close/touch/preferences/clearing positives; a truthy
  Promise from an async polling predicate caused premature interaction. Awaited
  point lookup plus a synchronous distance/enabled/label predicate fixes that runner
  boundary. The desktop cold Start timeout was preserved, not blamed on context reuse.
- A bounded CPU/event probe did not reproduce the10s Start timeout: click4.167s,
  captured Start task1.480s/context acquisition1.194s. It does **not** establish a
  historical GPU cause or resolve intermittent startup on every host.
- Native2 functional PASS had stale initial viewport frames; parent rejected those
  visuals. Fresh-model/render checks and second-frame capture correct that boundary.
- Native3 retained a terminal late-CDP-ACK `TargetClosedError` despite JSON PASS.
  That run is **not clean acceptance**. Explicit listener lifetime, ordered ACK
  draining and separately audited stderr fix/prevent/account for the callback race.
- Native4 cleanly qualified that harness on the previous controller. Final visual
  review then found actor-center overlap/retained panel scroll; `eb917858` fixes
  those actual presentation defects. Native5 is the clean new-runtime result above.

No failed report/image/video was overwritten. No timeout increase, exception
whitelist, forced dialog close or retry of a missed touch was used to obtain green.

## Source gates, commits and maintenance

Final source commands:

```sh
for f in scripts/test_foldwild_*.mjs; do node "$f" || exit; done
for f in Games/Foldwild/*.js; do node --check "$f" || exit; done
python3 -B scripts/test_foldwild_upgrade_runner.py
python3 -B scripts/diagnose_foldwild_start.py
python3 -B scripts/test_foldwild_m2_shell.py
git diff --check
python3 -B scripts/check_maintenance_docs.py
```

**20 Node suites, 10 game JS syntax checks, runner and diagnostic self-checks and
unchanged shell ABI pass.** Canonical80,500 exact world snapshots,168 legacy battle
snapshots, v1/v2 migration and strict pending/save/conflict/quota/release checks
remain. Parent verified all 88 actual asset hashes against the original manifest.

Milestones (full chronology also in Git and per-lane receipts):

| Phase | Local commits |
| --- | --- |
| Actual dispatch/UI/exploration/navigation | `f5597985`, `b9dce23a`, `151e3fb9`, `a75c49d7`, `f603f9d3` |
| Combined presentation/movement and integration | `2d45d3c2` (credits lane4), `44f0ac55`, `dc6634a9`, `f12c8ff0`, `ab61d8b9` |
| Corrective shared appearance and real boundary checks | `5eac54f0`, `0f6d4339`, `9a23536d`, `3c459951` |
| Bounded diagnostic and both-case video | `a2adb777`, `30af3876`, `d0d8c1fa`, `6256ba35` |
| Native viewport/failure/freshness checks | `a8343201`, `54b5075d`, `1f9e1315`, `a9ceddf6`, `6ca92e97` |
| Callback lifecycle/clean old-runtime proof | `fa740dbf`, `d7c39e73`, `d8e0920b` |
| Final product standoff/objective visibility | `eb917858`, `7ac773ca`; `48027aed` final QA artifact/receipt |

Only Foldwild's inventory row is refreshed with the repository's official
Git-backed calculator: tree `6929cd6f31b89841b1eafeb9e745e73aca002424`, entry
`4dcedae6799cc392404e659482ebbf99d6a23e71`,97 files/15,381,500 bytes. All unrelated
inventory fields and shared README are unchanged. The required global checker
still exits1: `Inventory stale: inspect changes, then run --refresh.` Five unrelated
pre-existing stale rows (BrainrotBoulevard, Citisten3D, Jankolock, Jankolock3D, Wings)
were not blindly refreshed. Scoped Foldwild calculator equality/manual coverage pass.

The operator safely cleared the original stale index lock after checking writers;
no agent unlinked it or reset content. All commits used serialized explicit-path
writers. Original sparse selection (`Games/Foldwild`, `docs`, `scripts`) is restored.
Shared fonts are served from exact tracked bytes when sparse-excluded. No downloads,
installs, copied worktrees, history rewrite, full-fleet gate, main merge or push.

Initial whole-run free root:2,269,667,328 bytes; corrective-cycle admission:
2,638,393,344 bytes; final native5 postflight:2,603,630,592 bytes. Shared-host/operator
recovery/activity explains the changing global capacity; it is not an attributed
Foldwild saving. Evidence totals 4,604,791 bytes including the SVG mockup, below the
5,000,000-byte cap. The agent performed no external cleanup or waiver growth. Final clean Git/storage observation follows the docs commit.

## Remaining separate holds

This first-session upgrade does not clear unchanged original/async M2 stability,
natural full campaign/trial victory/acquisition/evolution, all-region/all-roster
native coverage, optional encounter/device cost, supplied-art rights or physical
GPU/device performance. Historical startup timing remains observed, not assigned
a proven cause by a non-reproducing probe. No new game was added; catalog count129
is unchanged. Registration, release and push remain separate operator gates.

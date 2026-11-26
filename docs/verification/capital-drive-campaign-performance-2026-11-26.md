# Capital Drive campaign and streaming verification

26 November 2026. Campaign and shoreline changes for game 245. The offline
cache contains 240 files and reports build `01f289fffe47`.

## Campaign

Lunch Breakpoint and Pink Earmuffs Rematch require the original fight and an
exit from the restaurant. The police interview is optional. Completing the
escape with a pending interview records it as avoided, and completion saves
the witness record together with the reward. A cleared pursuit does not start
again because the interview remained open.

Native input confirmed the booth dialogue and four punches to defeat Dot.
Those punches originally raised two stars before the player could exit. In the
fixed build, the controlled tutorial punches trigger their witness report on
exit. A strike that also hits another person can still raise wanted stars
immediately, and the rematch uses ordinary assault reporting.

The escape regression visits all 24 story missions and checks all 17 escape
objectives, including 11 that have no destination marker. Six still require a
physical handover first. The approach and arrival mode belong to the handover.
Once it registers, clearing the search anywhere can finish the objective.
The tests cover riding away, sheltering indoors after leaving, unanswered
interviews, active stars, incorrect arrival modes and single payouts. The
optional Blackthorn pickup and its escape are also checked separately.

## Performance changes

`water-contact.js` prunes trees and leaf edges whose bounds cannot intersect
the shoreline parity ray. The X bound allows for the original floating-point
intersection arithmetic. `node scripts/test_capital_water_contact.mjs` checked
30,644 exact polygon parity and contact comparisons, 15,354 source-area and
bridge checks and a 360-frame Commonwealth Avenue replay. The test recorded
69,964 parity-edge evaluations with the conservative bound, down from 707,304
before pruning. The contact normal, depth, and source-order tie rules remain
in the original narrow-phase calculation.

The first candidate also tried changing how `world-view.js` appends triangle
data. Exact streamed and full-scene geometry tests passed. Timings varied
across component runs, and the two runs with explicit source hashes spent
more time on the complete fixture in the candidate. The final build uses
the original triangle builder and retains the demonstrated shoreline change.

## Sustained browser method

The baseline is the exact game archive from `17fef9be`. The first candidate
archive comes from `b7a22341` and includes the geometry experiment. Both use
Low graphics in Chromium with SwiftShader.
The harness clicks the official Free roam map to position the car and then
uses keyboard inputs near Commonwealth and Kings Avenue. Each repeat tracks
browser presentation times, renderer counters, process CPU and retained heap.
The paused collection probes sit outside the timing windows.

Use `scripts/profile_capital_sustained.py` with `--root` pointing at a frozen
game archive, a fresh `--output` directory, `--quality low`,
`--mode bridge-attempts`, `--seconds 390` and `--minimum-active-seconds 305`.
Run `scripts/analyse_capital_profile.py` on the resulting `.cpuprofile` files
for sample-weighted flame graphs and bottom-up function tables.

## Sustained browser results

The baseline ran for 577.0 wall seconds and 361.8 supplied simulation seconds.
The first candidate ran for 566.0 wall seconds and 373.8 supplied simulation seconds.
Each run included 14 staged bridge attempts. None reached the selected full
bridge endpoint. Both runs returned to the same position at Telopea with
different camera headings. All captured resource hashes stayed stable, and
neither run recorded page errors, failed requests or external requests.

| Matched sample | RAF p95 before | RAF p95 after | Script ms/render before | Script ms/render after |
| --- | ---: | ---: | ---: | ---: |
| Telopea start | 233.3 ms | 150.0 ms | 17.18 | 14.13 |
| Commonwealth first | 133.3 ms | 116.6 ms | 18.96 | 19.10 |
| Kings first | 133.4 ms | 116.7 ms | 28.30 | 24.24 |
| Commonwealth repeat | 166.7 ms | 133.4 ms | 15.35 | 12.24 |
| Kings repeat | 133.4 ms | 116.7 ms | 20.67 | 19.21 |
| Telopea return | 166.7 ms | 150.1 ms | 14.88 | 14.48 |
| Kings after five minutes | 133.3 ms | 116.7 ms | 15.41 | 13.11 |

Retained JavaScript heap after collection at Telopea was 744.7 to 746.4 MB
in both builds. Resident world geometry there was 16.2 to 15.2 MB. World,
neighbourhood and airport queues were empty at the two settled Telopea
positions. The baseline evicted 199 world chunks and the candidate evicted
203 over their respective runs. The first Commonwealth profile attributed
370.3 ms of self time to the shoreline parity visitor in the baseline and
56.5 ms in the candidate. The return transition attributed 162.4 and 151.0 ms
respectively to triangle construction.

RAF reflects browser presentation. The repeated staged attempts exercise
local driving and streaming. The profile does not establish a full-bridge
drive, performance on an Intel N100 or an FPS improvement on physical hardware.

## Shoreline build retest

The shoreline archive `d056aae9` (offline build `89ccda2d533d`) and the deployed
baseline `17fef9be` also
ran `--scenario bridge-windows`. This mode uses stationary fixture windows
with equal vehicle poses and camera headings across runs. The paired tests
took 127.8 and 123.3 wall seconds and recorded 64.6 and 65.6 supplied simulation
seconds. Source and loaded asset hashes stayed stable in both runs. No page,
request, HTTP or external request errors were recorded.
The subsequent `01f289fffe47` build changed the scripted indoor fight path.
The shoreline code and the Free roam fixture path are the same in both builds.

| Stationary sample | RAF p95 before | RAF p95 after | Script ms/render before | Script ms/render after |
| --- | ---: | ---: | ---: | ---: |
| Telopea start | 150.0 ms | 150.1 ms | 14.34 | 16.88 |
| Commonwealth Avenue | 199.9 ms | 150.0 ms | 29.92 | 22.62 |
| Kings Avenue | 133.4 ms | 133.4 ms | 21.14 | 17.91 |
| Telopea return | 150.0 ms | 133.4 ms | 17.13 | 15.46 |

Shoreline parity self time fell from 302.0 to 44.0 ms in the Commonwealth
window and from 229.9 to 69.0 ms in the Kings window. This measures sampled
time in the parity visitor during each window. The stationary runs remove
camera-heading differences and leave normal traffic and software rendering
variability in the comparison.

Report SHA-256 values in baseline / first candidate / final baseline / final
release order:

- `285a14a8420f3a12216977e715d224e1f29ffc1fa1b6ebd9eb01d474c85d53b2`
- `2d7b2eee53a4eae8c62adbbd3b52f427bf2651e025e03071f62c8a12cec3c45d`
- `bc3210c90f2a2ea114a6a62422aab3eed50c5eeceb81a80067a264a6d5d921b6`
- `4dbcd2f8211199be69d84d510965e37d4691ffc7764144cf399911b64e7b96fc`

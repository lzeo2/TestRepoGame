# Capital Drive: combat, recon and smoothness verification

15 November 2026. Existing original game245; no new game, dependency, geography
snapshot, external runtime request or shared car/font/portal/proxy/Character AI
change. The [contract](../capital-drive-combat-and-recon-contract.md) defines the
implemented behavior, caps, controls and remaining scope.

## Source and checks

Runtime milestone `f3cf0a97` follows the main integration in `df46e44f`, recon
layout fix in `7762927f` and nearby camera admission in `4068de0c`. It integrates pitched hitscan, actual adult-body damage,
terrain/building/room/live-vehicle cover, a shoulder camera with elevation,
pooled flashes and optional bounded local audio, deliberate reconnaissance,
a three-channel case task and modern Pink Earmuffs victory/retry. Four chapters
extend the shared story from9to13; the developer catalogue has20entries. Existing
save prefixes remain valid and rewards retain their original owner.

`python3 -B scripts/check_capital_drive.py` passed **351/351** commands:96game
JavaScript syntax entries,126Node suite syntax/runs,13JSON source requirements,
two Python cache checks and diff hygiene. The final source log SHA256 against `f3cf0a97` is
`43a78905c62d0f0a6c0b467fb3a16d61f2271f5ced02e304f4bf56ced14663c3`.
The final gate includes the controller test through the actual room NPC owner,
vertical target-ID handoff, bounded recon sight and camera admission guards.
The earlier351-command pass is retained separately (log SHA256
`d6fed6d3d5f248d0ec2de185e40e197bb7507feb5979712aa9a8dceb7ef24952`). The50-byte CSS-only follow-up hides the route card during recon
to prevent a native-observed overlap. The follow-up nearby on-foot camera guard
keeps normal route guidance during travel and passed its actual controller
helper regression; the cache was regenerated. The cache closure has116files/17,140,712bytes, version
`173f61253408cc687c9195803f102e5faa016c356ea364dda1d4485ad60ab4e6`.

The original failed source run is retained (SHA256
`046a4b333d0ca1173b14e4e4181b1c8eefaab8eb47f66649062367f0036e3e69`).
It exposed the new evidence callback dependency in an isolated gym controller
fixture. The fixture now supplies that unrelated callback while preserving the
existing paid-session stale-event and once-only assertions. The new controller
suite separately proves exact evidence room/station/session/mission authority.
Review also found the global/native indoor target-ID mismatch; the new real-room
handoff regression verifies damage, unchanged trace identity and wrong-room denial.

Worker milestones: `f56acc5f` scalar collision contact arithmetic; `ed2946d7`
vertical ballistics; `243d4edb` recon/heist chapters; `9fe713cb` adult shot targets;
`99aa190c` actual Pink victory; `5285ae3a` pitched pooled presentation;
`4e8ba49a` case activity; `750bb17e` dynamic vehicle/police shot cover.
Disjoint ownership, bounded tasks and exclusive index windows were used. Native
browser, profiling and the full source runner use one shared heavy CPU lease.

## Performance evidence

The collision regression compares20,020contacts and removes179,999temporary
projection/closest records from those contact probes without a persistent cache. It checks
live shape/bridge/person/external/parked mutations, actual-map probes and a
600-frame40-car+signal replay against the preceding implementation. Exact query
counts, contacts and trajectories are retained. This is allocation/correctness
evidence; observed wall times are measurements, not hardware guarantees.

The accepted baseline profile uses exact merged revision `3695a9a7`, matching
3D/Low/8-second windows. Its result SHA256 is
`538ee840ab10d699879e31caff8d8d5da977beb1b5db295ee961ae9f13c052fc`.
An initial wrong-root profile attempt is retained as a harness failure. The
first candidate pair at `7762927f` completed with no errors. It observed103→103
idle frames and109→115driving frames, polygon-contact sampled self time reductions
of14.8%/11.0%, and driving ScriptDuration per render12.087→11.539ms. Overall
ScriptDuration stayed similar (idle1.419595→1.440098s; drive1.317505→1.327003s).
This is not evidence of a broad FPS/CPU win. The cloud GPU process used about
3.8CPU cores for SwiftShader; no N100 hardware was measured. The result SHA256
is `98ee4221229dbfd6e3003422977549b996e599897ee48f1b22eac3f9ceb09e6c`.
The last profile pair at `4068de0c` also completed with no page errors. Its
sampled contact cost was lower, but frame counts varied between runs; both are
retained rather than selecting a favorable frame-rate result.

| Low3D8s case | Baseline renders / script seconds | Candidatea1 renders / script seconds | Finala2 renders / script seconds |
| --- | --- | --- | --- |
| Idle | 103 /1.419595 | 103 /1.440098 | 89 /1.330977 |
| Driving | 109 /1.317505 | 115 /1.327003 | 98 /1.190397 |
| Paused | 0 /0.029124 | 0 /0.036713 | 0 /0.040235 |

Finala2 polygon-contact sampled self time was122.471ms idle and199.628ms driving,
versus156.766/266.601ms baseline. Normalizing by observed renders gives9.6%/16.7%
lower sampled contact cost; rendered frames are not collision-query counts.
Deterministic source replay, rather than sampled time, proves identical physics.
Aggregate process CPU stayed roughly33CPU-seconds per active8-second window;
SwiftShader's multithreaded GPU process consumed most of it. GC timing changes
heap/RSS observations and prevents a broad memory conclusion. Final profile
SHA256: `49aa1929e01ec33feaec312b3b8c3cbaa27a300a22d4c2d317ba21be19a8fbe1`;
combined baseline/a1/a2 comparison SHA256:
`0a9558a1de8125a0ca4f660c8fa3ef40757e84a089741184d31a3dc55b763781`.

The last measured export had137verified game/shared blobs; its original record
SHA256 is `4f4a818db9698e5f72dddbbcdc6b7923cecfd002e5e3b0ad0469d6eae90e3b67`.
Both candidate exports omitted the root favicon during measurement while the
baseline included it. That startup-only404 is an export limitation, not a
production-page failure; steady profiling windows followed boot. The exact
favicon was added after measurement, bringing that profile export to138
verified blobs (record SHA256
`d51fc4259adcdf878c378a08a1e63b2f702d9a45a272cf1564cf0801611720c6`).
No broader FPS, total-device RAM, N100 or audible quality acceptance follows.
The subsequent final recon optimization in `f3cf0a97` was found by source
review: physical LOS ran before cheap eligibility checks, allowing distant
on-foot objectives to scan a very large grid/terrain ray every simulation tick.
Range/facing/speed/steadiness now gate sight; ranges are sanitized to2–18m and
invalid/over40m controller rays stop before smoke/vehicle/solid queries. Fresh
counter regressions require zero rays for far, too-close, moving, unframed,
paused, unhealthy and malformed-range contexts while eligible blocked/clear
views retain real physical sight and fresh receipts. This fixes the work path
directly; the Free-roam profiles above had no recon objective and did not measure
this active-mission path. Its final native recheck and release gates follow.

## Native evidence and limits

The authored native flow uses ordinary browser input and supplied clocks. Earlier
campaign prefixes and exterior travel checkpoints are explicit fixtures, not
naturally earned progress. Its intended scope is vertical mouse/key/touch aim,
both Paper trail survey scans, a standalone case task, and a real Pink knockout
advancing to the exit stage. A standalone task does not establish a native
mission-bound case receipt or the complete Sealed account heist. Pure campaign
checks prove receipt binding and reward guards separately. No whole-campaign,
audible sound or Intel N100 frame-rate acceptance is claimed.

Earlier native attempts remain retained. Attempta1 completed both survey scans
and its once-only reward but used a left-side Coals route directly through a
living shopper. The corrected harness takes the actual clear central aisle;
player/NPC collision was preserved. Attempta2 was aborted because a CSS update
landed after its source hash baseline; it is invalid evidence. Attempta3
registered a real pistol hit but serialized a large snapshot before checking
the180ms hit cue and missed it. The revised sampler observes hit feedback and
the visible DOM cue together in the renderer while firing. None of these failed
runs establishes the unplayed case or Pink victory. Attempta4 subsequently
passed34checks, including the actual hit/cue and full standalone case task, but
its straight restaurant approach ran into both living companions. The harness
uses a physical detour around them before the exact rendered entrance; it does
not bypass collision or reposition the player. Attemptsa5/a6 did not complete
that approach: full snapshot transfers initially extended held movement, then
another sidewalk contact blocked the detour. Movement pulses now release before
snapshot transfer. The combat fixture is explicitly scoped to the real exterior
door approach, with production checkpoint validation and actual E/exact-room
admission retained; natural Civic travel is not established by that fixture.

| Retained native attempt | Result SHA256 |
| --- | --- |
| a1: blocked harness aisle, source unchanged | `aa647cad06d9cb2dbacbd4f4f166a1f63340d3562ee710d5af7f6b578baf37de` |
| a2: invalidated by source timing | `1d72efe203bf34c7d53b570ec05a79727ca018a69bdafe2ddebb94fc0fda34fa` |
| a3: transient cue sampling, source unchanged | `bdaed06475a5eb6a64138467c07a34389b99e2eac00a496d4f30df049de531d5` |
| a4: actual hit/cue, Survey and case passed; ally-blocked harness approach | `e48b3047b23509f44339ae383e7c41f5512ba31555133b34282618094a4763b4` |
| a5: exterior detour overshoot while serializing held input, source unchanged | `5eb90b5a02805b6f513a7e22cfa3f9fc508849e4c9b25f84ccceaf824e39f5d3` |
| a6: detour stopped at another sidewalk contact, source unchanged | `87d78715f4d6aa5dbd3a100ab65d963bbca840802fee6a3cff59a286268d0a4b` |

The targeted rematch attempta7 passed18checks in65.18seconds on unchanged
`4068de0c`, with no page/console errors, failed requests or external runtime
requests. Actual E entered the correct Lambzhou room, dialogue triggered the
bowl flight, four real F inputs each removed25health, and a live knockout
advanced only to exit stage1. Cash and completed chapters remained unchanged.
Result SHA256: `f92bd15a3e1cb730e8d17a42b4ce82ede6a9aebe446ec2575f7b79dafb4af1ee`.

The combined attempta8 passed **48checks in183.26seconds**, with six captures,
unchanged `4068de0c` runtime hashes and no page/console errors, failed requests,
HTTP errors or external runtime requests. Aim/audio/mobile guards passed; the
two real scans paid exactly900once; X/Y/↑ secured the separate case with no cash
or mission receipt; four actual punches knocked Dot out and admitted only the
exit stage. Optional live-body hit sampling was held in this run when available
targets were moving/blocked. Attempta4 retains the same-runtime joint actual hit
and visible reticle-cue proof; no blocked sample is counted as a hit. Attempta8
result SHA256: `021fe39aeacdf74f3f118389b7249b9052c6843f805178c26d0835cee3f4f149`.

The final recon-only attempta9 passed **16checks in71.14seconds** against
unchanged `f3cf0a97`, with no page/console errors, failed/HTTP requests or external
runtime requests. Both real scans still complete and pay900exactly once;
pause/early-input/steady-view and ready/nav-hidden UI guards remain intact.
Its result SHA256 is `ec82f56491be69640894212a7e900021afbdfe9d4e4267216bbdfa3dc5f4f60d`.
The combined a8 and final a9 checks cover the changed branches separately;
they do not establish natural Civic traversal, an entire sealed-account heist,
all13chapters, audible quality or N100 hardware performance.

Deployment hashes are recorded separately against the exact merged revision. Existing whole-fleet and target-hardware holds remain;
this is targeted authored-game verification.

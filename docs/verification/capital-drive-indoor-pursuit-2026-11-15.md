# Capital Drive indoor pursuit and mission-preview verification

15 November 2026. Existing original game245 only, continued from merged PR24
`8f9561410ef31eba0c7ca33980fd28e9530eec84`. The owner authorized continued work,
push and merging. The [contract](../capital-drive-indoor-pursuit-contract.md) and
[manual](../maintenance/games/245-capital-drive.md) describe the final behavior.
This receipt does not replace the dated full-fleet or hardware limits.

## Source and state-owner checks

Before the later vehicle-impact follow-up, the full runner passed261/261 twice.
The second run includes the blocked-return correction at `c6454e3c`; its log is
`capital-indoor-final-261.log` (42,809bytes, SHA256
`6a8807e2b6b3ecdeeff81446f8099c4051341ad70cd354c07ade3f89eb668b02`).
The final combined source gate is recorded below
after the vehicle-impact follow-up. No source test is presented as native play.

The final combined runner returned **PASS Capital Drive:265/265 commands passed**
at `4416f901`, including the final impact-admission guard. It requires78game
JavaScript modules,92Node suites,12JSON files and187required files in total.
Both Python cache checks and `git diff --check` pass. The current manifest has
97files/15,644,373bytes, content version
`1e4c36a58059bec84faa028cd4d0cbb1c86ab0434778514a147ae451d679246b`.
The six map JSON files remain12,013,726bytes. The final log
`capital-combined-final-265.log` is43,623bytes, SHA256
`7522cbadec23826a4cc3dc1aa6f673a473d49d4e08623d60146231e9084c2119`.
This is the current source gate, not a full-fleet loading test.

The Git-backed game tree grew92→96files and15,421,920→15,465,402bytes
(43,482bytes added). Cache closure grew93→97files and42,023bytes; exact final cache
bytes are above. No new game was built or registered: catalog remains134unique
registered entries with tracked URLs,140game maintenance documents and six
unregistered projects. Maintenance inventory and134URL sitemap checks pass.

The new interior navigation suite physically traverses517routes across21shops,
four gyms, the school, mall and an ordinary house. It shares the actual plan
collider, checks walls/furniture and doorway reach, retains at most2000nodes and
four owner fields per room, and tests cleanup. The largest tested room builds
1029nodes. Log `navigation.log` SHA256:
`e4621b017798516f969e8ef1459b1ca6caea42af01ca8d4401f1d5749955ddee`.

Police/GamePlay fixtures cover witnessed ordinary-room entry, retained room exit,
same-space sight/attacks/arrest, unknown-entry exclusion and safehouse exclusion.
The reproduced real stopped school-car pose reaches the actual gate opening
and indoor doorway after dismount, with no teleport or collider exemption.
The indoor actor suite requires zero patrol-car factory calls/clones/lights
when `policeCars:false`, while four officer/weapon pools still work and dispose.
The room registry prunes unoccupied old rooms and clears on reset.

Campaign/controller fixtures verify Milo's first vehicle state, retained saved
hero state, explicit driving/stopping legs and actual foot work. Wanted-work
fixtures exercise ordinary delivery/checkpoint/stock/noodle and owned legal
driver-fare admission/payment at0–5stars, retaining matching live sessions and
once-only pay. Explicit escape goals still require zero stars. Source regressions
also retain wrong-mode, recovery, reach/ownership, interrupted-session and forged
completion rejection. These are not naturally earned native wanted-job rewards.

Developer fixtures expose thirteen frozen descriptors without changing the normal
journal, unlock prefixes or selected career hero. Cross-owner locked chapters use
their actual character/HUD, current stage count and zero campaign reward. Cancel,
failure and completion clear only the transient preview. The actual controller
test forces checked return placement to fail: its full original snapshot remains,
ordinary frames make no further placement calls, a hero switch cannot overwrite
it and explicit retry restores the real Gameplay checkpoint. The native case
below covers the unobstructed return, not that injected blocked-return path.

The map helper/actual-worker suites validate same-game controlling client, exact
six allowlisted keys, active revision pinning, direct CacheStorage reads, bounded
timeout and all-six local-fetch fallback for missing/denied/unsupported storage.
The manifest generator now has seven fixtures, including the actual helper's
literal map list. Existing hash/install/update isolation guards remain strict.

## Normal-input cloud cases

Each case uses actual game UI/keyboard input and read-only snapshots on Chromium
SwiftShader. No character, police, cash, wanted, save or clock injection is used.
The developer case deliberately uses the owner-requested private UI exception;
it does not establish a normal campaign unlock or earned completion.

| External artifact directory | Result | Observed scope |
| --- | --- | --- |
| `capital-indoor-police-native-20261115-a2` |12/12,78.23s| Fresh Kit, actual gate walk, E school entry and real alarm inputs; a pursuing officer physically enters and visibly renders in the ordinary school hall19.05s after the alarm. Cash remains$1000; no mission completion/reward. |
| `capital-milo-car-native-20261115-a2` |7/7,22.63s| Fresh Milo begins in the actual saloon; ordinary Resume and700msW move it1.936m with speed5.832m/s. Cash/progress unchanged. |
| `capital-mission-preview-native-20261115-a3` |16/16,29.29s| Actual masked form rejects/clears a wrong input, accepts the configured private entry, reveals13missions, starts locked Split the score with Milo and cancels back to prior Kit body/car/health/ammo/mode and career prefixes. |
| `capital-direct-map-cache-native-20261115-a2` |19/19,57.89s| Actual cold boot/cache completion, native driving/pagehide save, warm controlled boot with no page map-fetch requests and zero origin module/six-map bodies, then offline reload/normal driving and exact career save restoration. |

The developer/cache final reruns follow `c6454e3c`; the school/Milo cases precede
its private-return/HUD correction and retain their narrower unchanged feature
scope. All accepted cases have empty page/console error, failed request and
external runtime request arrays. Browser/server cleanup completed after each.
The latest cache proof disables ordinary HTTP caching; its origin-body counts
are empty. It proves stored response reuse, not eliminated parsing/scene setup.

Results JSON SHA256:

- Police: `60df2415099e92a57fc9d9c6ece5ad1812917960f878828b9e789cae4cc39193`.
- Milo: `8c2095d76d2bec2fb9c3f0bc74c7d5099d29a050c9a351e3b265db562f6f97f1`.
- Developer: `f4d58f9a8ce53cd9856d10fc5270d3957c3438a4e0c6d5b649aa204471166246`.
- Direct cache: `fad631acd0b1436c281a05d71e8234eaba7c6123e29e5127d85a1602f94a32d5`.

Reviewed captures show an actual uniformed officer beyond Kit in the school
hall, Milo driving his saloon, and the locked shared mission with Milo's HUD.
No private input appears in the captures or JSON evidence. School image
`actual-police-inside-school.png` SHA256
`508b71392f0a8f27c679ba317f6cd1f9ac2826b111268576d68797c3b8b2ca0c`;
fresh Milo image `fresh-milo-in-car.png`
`ed08bc13dc80d51f962532c912e05cafed5abf1c9285d286e8adef93b573e18d`;
final preview image `private-selector-preview-active.png`
`d4f36cb37159d45e8592aefbdba605e40866fb3e09f8aa32d450e903f1691cd6`.

## Retained failures and corrections

The first school case retained6observations and failed at109.98s. Cars stopped
about37m from the door and the old24m dismount threshold prevented entry. The
fix permits arrived/stalled patrols at known ordinary-room approaches to dismount
within90m and follow the actual source gate path. It does not move cars through
the fence. Failed results SHA256:
`95be80ef0a57ba1af775ba8cace5c7bb805b9739e61d147cabbe3ea7f8864326`.

The first Milo case retained3observations and failed at21.91s because the test
held W while the briefing still paused the game. The corrected harness uses
ordinary Resume; input pause behavior was not weakened. Failed results SHA256:
`21402a1fbadbe4db86fae49dd2b96e4923e1d1b1d8be82a99fd01fdebcd6ff71`.

The first developer case passed13functional checks but failed at27.86s with22
page errors reading `stages`. The HUD looked up a cross-owner preview in the
original hero's ordinary chapter list. It now uses `campaign.current()` and an
actual-refresh regression covers normal and locked cross-owner chapters plus
Cancel. Failed results SHA256:
`27f1e08fe6c3d90c73e7a531879be648d1cfd340f49ff4ec38179c88498d87f1`.
Corrected developer a2 passed16/16 before the final a3 rerun. Direct cache a1
passed19/19 before final a2; neither failed receipt is silently recounted green.

A final read-only review found that failed checked restoration discarded the
private return snapshot. The controller correction retains it, offers explicit
Retry return and prevents overwrite/per-frame retry; the actual-function fixture
now forces failure then successful retry. Review log
`capital-mission-final-audit.txt` SHA256
`d84266b757259de730de0b6a30bf7d18d1543a77a4de1f3594c633a5766c9fe2`.

## Vehicle launch and ragdoll follow-up

The owner then reported missing launch force from fast car hits and requested
ragdolls. The [impact contract](../capital-drive-vehicle-impact-contract.md)
describes the final player-only implementation. Actual Simulation contact tests
cover pre-stop velocity from traffic/bus/Yoober/patrol/player movements, no
predictive-query/stationary/departing/NPC false hits, a32event queue and reset.
Gameplay tests cover actual Simulation→Gameplay launch and landing, mild contact,
no victim wanted offence, bounded wall/adult sweeps, pause/dt clamp, reset,
passenger/room/recovery guards and sandbox protection. Lethal contact reaches
the ground before the existing recovery; ordinary unrelated knockout stays
unchanged. Source log `capital-vehicle-impact-source.log` SHA256:
`f165b3247db594af69ffc72bbecc767507699a6097a1b6d96f1f2b7e6d15efb3`.

The actual Three.js view fixture checks eleven independent damped joint channels,
visible horizontal tumbling, distinct limb responses, every rendered vertex above
sloped terrain, fallen/get-up/KO phases, exact idle reset, zero-dt freeze, bounded
large-dt integration and finite invalid-dt behavior. Lethal impact data may clear
at the start of recovery while the already active body stays fallen for the
1.8s fade. Health restoration returns exact ordinary idle; unrelated KO does not
start a ragdoll. Mesh/material/geometry pools stay unchanged and dispose once.
The existing full actor and weapon-art suites also pass their retained budgets.
Ragdoll source log `capital-ragdoll-source.log` SHA256:
`80fe07b6bbb563e97b48320f96da31b52a2b2bb38dfafc4336eac36cd90afd59`.

`capital-vehicle-ragdoll-component-20261115-a1` passed19/19 in1.55wall seconds.
This is explicitly a **programmatic component**: actual checked-in Three,
Simulation, Gameplay and ActorView, a controlled car/body arrangement and
supplied dt. The actual physical sweep creates its impact events before braking;
the fixture does not inject those events. Buttons advance the arranged contact.
It does not prove a naturally occurring traffic hit or ordinary career play.

At28m/s, the player reaches2.101m peak root height and9.615m horizontal travel,
then lands/recovers by2.633supplied seconds. At3m/s it stays grounded. Actual
visible joint transforms differ during the tumble; minimum visible world height
is at least0.018m above the fixture's flat surface. Air and fallen dt0 keep both
physical and articulated state unchanged. There is no RAF loop or per-impact
geometry/material growth. The11joint view retains20geometry/19material
descriptors in this no-police configuration; all24reachable scene geometries and
nine materials emit disposal, rendered actor draws fall10→0 and allocated
renderer geometries11→0. No errors, failed requests or external loads occur.

The five reviewed frames are visibly labelled programmatic and show before,
airborne at0.417s, falling/fallen at1.4s, get-up at2.267s and standing at2.633s.
The root reviewer inspected the airborne, fallen and get-up captures. Results
SHA256: `d85f5b447355294115e0a2bc591eafa3ee3e05c09ad55fbebfdc7cfe7af4aea4`.
Harness SHA256: `52d58e06bb4ee6c91b83710e9ca8183d8c995e4df5d67664c671dad7260a619c`.
No earlier failed component attempt exists. Lethal medical fade remains source/
Three-fixture coverage, rather than native career evidence.

The reviewed component captures have SHA256:

- `programmatic-component-airborne.png`: `3b569ed4729a677790fba7fc599c4fd6f9f700512394944d0e56d56dc69cebea`.
- `programmatic-component-fallen.png`: `44894a4a9eee7f579cc369737764d2827c24776b3fdae3e768fa675a8329f7af`.
- `programmatic-component-getting-up.png`: `61fa6d24f5fec621788673c9090d8401861ff51b006e58b3464e89be3287cdda`.

## Limits

No native safehouse evasion, all-interior pursuit, wanted-career wages, complete
heist/story or blocked-return retry is claimed. N100/8GB FPS/CPU/RAM remain
unmeasured. The prior cloud CPU reduction receipt remains dated; this turn adds
bounded room/impact work without claiming another whole-device benchmark.
Source geography/terrain/address JSON, shared vehicle/font assets, protected
Character AI, proxy/backend and catalog registration are unchanged. No new game
or runtime external asset/service is added.

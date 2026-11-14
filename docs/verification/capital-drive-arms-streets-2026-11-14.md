# Arms, adults, shops and traffic verification

14 November 2026, Australia/Sydney. Continuing the existing original Capital
Drive245 and the owner's standing push/merge-all order. No game was added,
ingested or registered. Catalog134; maintenance140projects including six
unregistered. The [contract](../capital-drive-arms-and-streets-contract.md)
records controls, ownership, prices, budgets, source limits and reproduction.

## Result and source boundaries

Four original arcade guns share catalogue prices/profiles but keep independent
ammo pools, reload/fire intervals, ranges and clipped spread. Keys1–5 select
fists/pistol/shotgun/SMG/carbine. Strict legacy v1 equipment ownership persists;
unknown/type-invalid fields still fail. Ammo remains session-local with existing
starter restoration. Any equipped owned firearm may support till interaction.

Three fictional adult contacts have source-road approaches, stock and live
health/panic trade guards. K filters arms/contacts; Route and on-foot E expose
stock. No real criminal identities or dealer locations are asserted. Public
adults cap36 suburban/64 Civic rather than80/160, with seated chairs/cups, phones,
work gestures, walking cycles, interrupted routines and attributed panic/flee or
close LOS/cooldown retaliation. Chairs/people/known doors and source exclusions
are tested. Contacts also stay clear of parked hire vehicles.

Canalside's unchanged approach is physically clear in the actual expanded map:
no building within20m, swept on-foot movement and LOS pass. The apparent loading
cursor was disabled-button CSS with missing eligibility feedback. Owned/pack
capacity/cash/wanted/recovery/activity/distance now have explanations and a
not-allowed cursor. Interacting at a counter clears stale type filtering, so a
previous arms filter cannot hide the current food shop. Supplies also has an
explicit nearby E hint. No purchase guard was removed to make a button work.

## Code checks and direct evidence

`python3 -B scripts/check_capital_drive.py` passed **144/144 commands**:
49module syntax checks,47suite syntax checks,47pure suites and diff check. The
later contact/hire-spacing integration regression, UI/controller syntax and diff
checks also passed after small placement/feedback changes. Catalog schema/unique
IDs/Git-backed URLs, maintenance and sitemap are checked again after source commits.

The native combined route run used normal on-foot traversal through an actual
school gate and around occupied road vehicles, spending only the fresh career's
$1,000. It directly passed all19career assertions: reached Canalside, bought the
$900shotgun and$90ammo, confirmed cash$10, six loaded rounds/independent reserve,
saved ownership, correct unaffordable SMG reason,390px layout and reload retention.
It subsequently passed pistol/shotgun/SMG shooting, pool isolation and reload,
plus carbine selection/firing/pool isolation before its combined time budget ran
out. This is observed purchase evidence, **not a whole combined-suite pass**.

The focused free-roam case then completed: **24 normal-input checks PASS**, all
four rendered models, firing/independent ammo/reload, actual contact approach/E,
distinct stock, sandbox purchase denial and zero page/console/request/HTTP/external
errors. Its first pass took90.41seconds; a visual-review pass took97.16seconds.
Both are retained. Root reviewed actual service, weapon and contact frames. A tree
occluded the first contact camera, so a normal camera orbit provided a clear
second frame; source trees were not removed to fake visibility.

Focused report SHA256:
`610d3ee526786910f2dcbd6a5b4232e837fbde34ae6080cf880a6c1dea114e06`.
Visual-review pass report:
`c8e91dee4ed0cc0d12628a870733dc98a30c0bc38ded268576dbb7372eb157fa`.
All raw logs/snapshots/reports/screenshots remain external artifacts, not runtime
payload. The final independently bounded career-case result is appended below.

## Traffic reproduction and physical protection

Exact archived decorative generation put2,065cars physically into public moving
lanes;2,102fell within predictive braking clearance. Original seeded40-car60s
replay:36stopped. Source parking-aisle/wide-curb placement gives887deterministic
physical slots, no mutual overlaps and minimum2.61m whole-body sampled clearance
from directed public lanes. Mission wagon remains within18m of the old meeting
point. Rendering and collision use the same descriptors; no car collision is
ignored or teleported away. Parking-only old-engine replay improved36→17stopped.

A separate actual-map investigation proved permanent mutually blocking Sydney/
Burbury and GameCourt turn cycles at60and120seconds: crossing cars were treated
as same-direction lead vehicles. Ambient crossing priority now yields before
projected conflicts with deterministic precedence. Same-direction following,
player/static/external-bus guards and physical sweeps remain. The old minimal
fixture fails; the new one clears with at least7.46m centre spacing. The original
four actual-map cars clear both known junctions at both samples and pass physical
occupancy every tick. Fixed-parking replay improves17/26stopped at60/120seconds
to7/18. With the new engine fixed, archived versus corrected parking gives31→7
at60seconds. These are separate controlled comparisons, not universal free flow.

Some remaining stops are legitimate queues behind the parked player; independent
source-building/other route holds remain. Existing local-only parked queries,
2,000far-descriptor test, buses, pause, theft, police and physical following pass.

## Retained failures and harness repairs

M26 attempt1 passed7UI checks then exposed a read-only diagnostic bug: route
points are[x,z]tuples, not objects. Root corrected the diagnostic. Attempt2 passed
the same UI checks and normal school-gate crossing, then the road-centre walker
met stationary occupied traffic. Normal detours now go around vehicles and may
skip an occupied intermediate road waypoint, but final shop reach is still
strictly checked. Neither game physics nor career travel permissions were changed.

Root's first long desktop run hit the600second signal during Playwright and its
failure screenshot/cleanup stalled. The exact owned process tree was terminated
(exit143); the partial run and a separate termination record remain. A second
combined run with lower travel viewport and held/released normal keys completed
35assertions, including the full real purchase/reload sequence, but exceeded the
combined budget (external watchdog exit124). No overall PASS was manufactured.

The harness now separates career purchase and free equipment cases, closes the
old browser context before creating another, checks its budget cooperatively
rather than interrupting Playwright internals with SIGALRM, and remains under an
outer process-group watchdog. Small travel viewport reduces software raster cost;
normal clocks, movement, campus fence, collision, money and final reach remain.
Captures/transaction UI restore desktop/390px dimensions. Reproduction uses
`--store-browser` for career and `--dealers-browser` for free equipment, each with
a fresh external output. The main runner installs nothing and bounds descendants.

## Reviewed milestones and limits

Catalogue244188f0; M22 gameplay2049b9cb; M23 economy8a0bf0ed; M24 contacts86d3c625;
M25 art26bcb106; M26 native harnessf3df1563; M27 reproductionffc51ae3;
M28 routinesa24a0fa8; M30 parking regressioneb2dd5a1; M33 crossing287e586a.
M29/M31/M32 were read-only diagnosis/review. Root owns parking helper/controller/
shop UI integration7a6dbb37, feedback05b3d4dc, counter filteringddd0a162,
contact/hire-spacingb78baa37, safe scenario cleanup510914c1 and nearby supplies
hint850d7d3a. Later evidence/copy commits are separate. Workers used disjoint
paths, bounded tasks, explicit commits/exclusive staging windows and did not push.

Adult props/rendering cap11draws; contacts six draws/<1,500triangles; selected
weapon art has four pooled silhouettes and bounded traces. Source geography,
portal bundle, protected Character AI, disabled proxy and shared car factory
remain unchanged. No packages, node_modules, reference imagery or persistent test
servers. Original sparse selection is restored after shipping.

Graphics remain original and stylized. Cloud software WebGL does not establish
N100/native GPU FPS or touch combat. Some cameras can be occluded by tree trunks.
The historical fleet123/133 certificate-failure HOLD remains separately disclosed
under the continuing targeted push/merge order; no fresh fleet-wide pass is claimed.


## Final independent acceptance

- Career store case: **22 checks PASS**,467.49seconds, exit0. Actual normal travel, on-foot Canalside purchase/ammo, cash$1,000→$10, saved ownership, reload, unaffordable/disabled feedback and390px layout all completed. No cash/save/position grants. Report SHA256 `09d87292fcd016036074873b179fc9f6ebc805cfe710d0d52247d90edfecae30`.
- Final free equipment/contact/adult case: **26 checks PASS**,108.32seconds, exit0. All four models/fire/reload/pools, E contact stock/sandbox guards and actual visible coffee/work batches passed with no page/console/request/HTTP/external errors. Final hash recorded below.
- Final complete source runner: **144/144 PASS** after real-map routine placement correction and contact exclusions.

M34 `d70f7953` fixed a material integration defect found through native observation:
initial routine fixtures passed but actual-map runtime showed0seats/0workers. An
axis-aligned safety square rejected every diagonal sidewalk. Validation now uses
the real rotated footprint and prioritizes eligible nearby roles. Actual expanded/
profiled map plus4,241house/store/campus/Civic/contact exclusions now yields
3coffee/3workers near NSW Crescent and Kingston/Giles,6/6in Civic. Prop corners
clear all motor lanes, water/buildings and door/contact buffers; pause, fleeing
and returning remain covered. The native26-check flow also verifies real mapped
coffee/work identities and occupied visible batches, not merely synthetic plans.
Root's final controller passes contact positions into routine exclusions.

All failed/partial runs described above remain retained separately and are not
relabeled PASS. The final acceptance cases run separately with bounded cleanup.

Final street browser SHA256: `6864272907dabbf793ee3773880f4e242cf1a38dee57b0107d08bff92f32b682`.

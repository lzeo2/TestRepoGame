# Supplied fighters: normalization and rigid equipment

Delegation 36 supplied F-16C/MiG-29; Delegation 40 added genuine Eurofighter Typhoon
and Su-35S. Delegation 43 adds genuine Rafale C/JF-17 Block III using the same
stdlib generator. Delegation 49 adds genuine JAS 39C Gripen/MiG-31BM through that
same generator and descriptor ABI. Delegation 55 adds genuine Mirage 2000C/Su-34
through that same pipeline. Delegation 58 adds genuine FA-50/Yak-130 assets.
Delegation 64 adds one genuine Hawk T2 through the same helpers.
Delegation 67 adds one genuine supplied Su-25SM through those same helpers.
Delegation 70 adds one genuine supplied A-10C through those same helpers.
Delegation 73 adds one genuine supplied F-35A through those same helpers.
This lane owns the scoped fighter authoring files and new raw/derived GLBs only.
Native kind registration, rendering and actual converter checks for F-35A
belong to Delegation 74; the parent owns
manuals/inventory/profiles/UI/armor/source pins. No existing GLB, original raw
metadata, host source, catalog, shared model-repairs manifest or served bundle
is changed by this asset expansion.

## Study before authoring

Read CODE_QUALITY, the active swarm quality mode, supplied-model repair spec,
aircraft quality/model/study/acceptance documents and Wings maintenance manual.
Inspected actual retained aircraft registry/converter, weapon tables and camera
consumers. Measured all 11 existing top-level GLBs with stdlib decoding and
composed world transforms; their baseline hashes are in repair-record.json.

Existing five selectable aircraft respectively have 16,896 / 17,576 / 18,028 /
11,322 / 4,740 triangles and 151 / 166 / 123 / 202 / 96 materials for F/A-18,
A-10, YF-12, Apache and B-2. Current F-15/F-35 have 41,352/40,812 triangles and
12 materials each. Those procedural model budgets are not a reason to inflate
these supplied base assets. Existing rigid pivots, ammo-linked store order,
afterburner recentering at the minimum Z face, factor-based batching, shadow
sizes and model-derived camera/muzzle consumers were inspected. Only explicitly
registered pivots move; rig JSON alone does not enable anything. Actual native
missile magazines have two rounds per slot. A single simulation gun origin is
an arcade abstraction, not a barrel/caliber certification.

Current Wings entry blob matches the maintenance inventory, but the inspected
HEAD tree differs from the inventory tree. Parent owns the manual/inventory
update. Historical native or fleet PASS reports do not accept this pair.

## Pristine selection and permission qualification

Archive SHA-256:
`4e37a104ba356790f6f9a0632c99d34b77dc023649e3cab830d895ec55c471d8`.
Only README.txt, manifest.json, models.json, palette.json, roster_lookup.json and
the sixteen rigs are retained here byte-exact. These original whole-package metadata
files still describe 30 archive models, not 30 locally staged or playable models.
The manifest deliberately has a null self-hash. No supplied code was executed.

`models/supplied/f-16c.glb` is the 104,032-byte / 2,236-triangle original;
`models/supplied/mig-29.glb` is the distinct 122,000-byte / 2,904-triangle original.
Their original hashes are pinned by the generator and descriptor. No US aircraft
placeholder was used for the MiG-29. The additional distinct originals are
`models/supplied/eurofighter-typhoon.glb`, 115,688 bytes / 2,654 triangles, and
`models/supplied/su-35s.glb`, 126,788 bytes / 3,058 triangles. Both raw bytes and
rig JSON are exact selected archive members. No F-16/MiG replacement mesh is used.
The additional Rafale C original is 114,880 bytes / 2,642 triangles at
`models/supplied/rafale-c.glb`; JF-17 Block III is 116,228 bytes / 2,708 triangles
at `models/supplied/jf-17-block-iii.glb`. Both preserve their exact archive rigs.
These are distinct supplied meshes, not renamed models. Gripen is the exact
108,908-byte / 2,388-triangle `models/supplied/jas-39c-gripen.glb`; MiG-31BM is
the exact 123,644-byte / 2,626-triangle `models/supplied/mig-31bm.glb`. Their two
original rigs are retained byte-exact. Actual normalized source nozzle components
measure one Gripen outlet centered at X/Y=0 and two MiG-31 outlets centered at
X=±0.830000008, Y=-0.059999973. Controls are the actual separate source surfaces,
not a relabeled model or substituted geometry.

The user reports generating these assets with GPT and authorizes scoped Wings
use/repair. Preserve that report as a qualification, not independent originality
verification or a new license claim. The supplied README and original metadata
remain unchanged. These are qualified base game art, not photorealistic aircraft,
engineering replicas, operational fits or manufacturer-endorsed work.

## Derived contract

`../native-fighter-pair.json` uses `wings_native_fighter_pair_v1`, keyed by
`f16c`, `mig29`, `typhoon`, `su35s`, `rafale`, `jf17`, `gripen`, `mig31`,
`mirage2000`, `su34`, `fa50`, `yak130`, `hawkt2`, `su25sm`, `a10c` and `f35a`. The historical filename/schema remain
ABI, not a literal two-model claim. All fifteen previous descriptor entries and
derivative bytes remain exact, with permanent regression pins. All 52 preexisting
GLBs are pinned, including A-10C and Type022 raw/derived. The historical exported BASELINES map stays exact
because the fleet generator imports it; RETAINED_BASELINES adds the current guards.
The writer preflights those pins before any writes and refuses a retained-GLB
replacement even if generation mistakenly returns different bytes. This is ready for the native
integration owner, not standalone runtime registration. Bounds and gun/store/cockpit/exhaust positions are read
from actual final vertices and composed node transforms.

- Normalize +Z to -Z with C=diag(1,1,-1), preserving negative-X left labels.
  Reverse winding once per index accessor, reflect normals, convert node rest
  translations/quaternions and signed axes; tangent XYZ/W conversion is supported.
  No blind Y rotation, scale change or replacement airframe geometry.
- Preserve every original mesh, original material identity/assignment, UV and
  embedded 256x256 paint image byte. Only the canopy material becomes dielectric
  BLEND alpha .26. It remains in its original closed rest pose. No new cockpit
  aperture/interior or canopy flight animation is claimed.
- Original additions: four independent low-poly missile bodies/fins with pylons,
  visible gun barrel/muzzle, one F-16/JF-17/Gripen or two MiG-29/MiG-31/Typhoon/Su-35S/Rafale thin
  emissive outlet discs on actual separately measured alloy nozzle components.
  Equipment is authored here, not extracted from another aircraft or texture pack.
- `missile_L2/R2` maps to seat0 secondary; `missile_L1/R1` to seat1 primary.
  F-16 fit: pilot cannon20/aim9, officer maverick. MiG fit: pilot cannon20/aim9,
  officer aim9. Typhoon: pilot cannon20/aim9, officer tvmissile. Su-35S: pilot
  cannon20/tvmissile, officer maverick. Two stores per missile slot, four total.
  Su-35S is explicitly a bounded arcade fit, not the full six-missile wish.
  Rafale C and JF-17 Block III both fit pilot [cannon20, aim9] and officer
  [maverick, null]. Their officer store meshes use the existing wider/shorter
  Maverick equipment geometry, not just a changed label.
  Gripen uses pilot [cannon20, aim9], officer [maverick, null]; MiG-31BM uses
  pilot [cannon20, aim9], officer [tvmissile, null], with two stores per slot.
  These identifiers make no caliber or real operational loadout claim.
- Stations use authored span ratios .72/.46, then measure the actual wing chord
  section and underside by triangle intersection. The ratios and equipment size
  are authoring choices, not real aircraft station measurements. Descriptor launch
  positions come from the installed mesh tips. Gun muzzle is a terminal-ring
  center. Exhausts use independently isolated alloy nozzle components.
- Eye Z comes from the closed glazing center section, with eye Y 70% between
  actual body and glazing roof intersections, not the canopy hinge/AABB center.
  Camera visibility and native glass/material behavior remain unverified.
- Each aircraft's five/six flight controls retain converted approximate rest pivots.
  Elevons/flaperons use differential roll (left -1, right +1); Typhoon/Rafale/Gripen
  canards and F-16/MiG-29/MiG-31/Su-35S/JF-17 tailplanes use pitch; rudders use yaw. Pitch/yaw gains are -1 after
  reflection. Gains and .22/.28 rad limits are conservative arcade visuals, not
  certified mixed-elevon mechanics or thrust-vectoring nozzle control. The closed
  canopy is not assigned a pitch/roll/yaw driver.

At the asset checkpoint the legacy converter discarded paint-map appearance.
Registration `5dac8f90` now preserves supplied PBR/maps for these two kinds only,
without changing original-seven conversion. The actual GLTFLoader/converter CPU
check verifies material bindings, controls, stores, exhaust and coordinates;
native texture/cockpit pixels and visual quality remain unaccepted.

## Reproduce and check

From repository root, provide the original ZIP as SOURCE_ZIP:

```sh
python3 -B Games/Wings/authoring/repair-fighter-pair.py --archive SOURCE_ZIP --check
python3 -B Games/Wings/authoring/repair-fighter-pair-check.py --archive SOURCE_ZIP
```

Without --check the generator writes only its explicit selected/generated files.
It verifies archive SHA, all 65 safe unique paths, CRC and 64 non-self hashes
before selecting twenty-one metadata files and sixteen raw models. Unchanged files are
not rewritten; the generator refuses to overwrite a changed retained GLB. It imports only the
existing local stdlib escort helpers, not supplied archive scripts.

Historical Delegation 49 stdlib check output:

```text
PASS f16c: 2236 original / 2636 total triangles; 143888 B
PASS mig29: 2904 original / 3384 total triangles; 169088 B
PASS typhoon: 2654 original / 3134 total triangles; 162784 B; 5 controls / 2 nozzles
PASS su35s: 3058 original / 3538 total triangles; 173856 B; 6 controls / 2 nozzles
PASS rafale: 2642 original / 3122 total triangles; 161964 B; 5 controls / 2 nozzles
PASS jf17: 2708 original / 3108 total triangles; 156088 B; 5 controls / 1 nozzles
PASS gripen: 2388 original / 2788 total triangles; 148784 B; 5 controls / 1 nozzles
PASS mig31: 2626 original / 3106 total triangles; 170740 B; 6 controls / 2 nozzles
PASS rig: 430 signed/rest poses with continuous vertex envelopes; 424 geometry-clear launch/exhaust rays
PASS source surfaces: 9576 rest/signed-control launch/exhaust rays, including actual Typhoon/Rafale/Gripen canards
PASS writer: 30 bad-generation replacements refused before any writes
PASS immutable: 110 historical GLB/metadata/rig/evidence files exact against 78205694; six old model repair records exact
PASS boundaries: all 30 preexisting GLBs unchanged, all six historical descriptors exact, eight derivatives <512KB each, reproducible outputs; native rendering/gameplay UNVERIFIED
```

The full check also verifies exact selected archive bytes, all 30 GLB/JSON rigs,
20 standard/30 faction slot resolution, finite/unit normals, added winding,
original reflected positions/normals/indices and exact UV/image bytes, all rest
world transforms, identity root/unit scales, actual metric bounds, closed-eye
placement, geometry-backed gun/store/exhaust origins and rotated world composition.
Continuous single-control envelopes cover all vertices throughout the declared
angle range; source approximate hinges are not certified collision-free mechanisms.
Clearance rays retain the original static-airframe checks and additionally sample
all source meshes at rest and each flight surface at both half/full signed limits,
including Typhoon's, Rafale's and Gripen's forward canards. New surface-region
assertions require left/right placement, forward Gripen canards, rear elevons and
rear MiG-31 tailplanes/rudders, in addition to exact reflected source geometry. Outlet positions/radii are checked against
actual separate alloy components; station attachments intersect wing triangles.
Store dimensions also independently match their arcade fit: Maverick bodies use
.16 m radius / 2.25 m length; other missile bodies use .10 m / 2.70 m, with the
existing .23 m fins. These are authoring choices, not real weapon dimensions.
The checker injects corrupt output for every retained GLB with writes mocked,
requiring rejection before any write attempt.
These are sampled clearance checks, not operational seeker turns, continuous
moving-surface clearance or continuous moving-aircraft collision.

## Gripen/MiG-31 identity checkpoint

| Asset | Bytes | Triangles | SHA256 |
| --- | ---: | ---: | --- |
| Gripen original | 108908 | 2388 | `f996e62f23cf56027b885767fcb30ae954824b198254dd8a644a14fcacd9e789` |
| Gripen derivative | 148784 | 2788 | `49f9336f7e1c2075f27bbe676791a1eb80ab00f52ab1827df2ec2b7ebfff627d` |
| MiG-31BM original | 123644 | 2626 | `dd4b8a9741ff4fb325c4a5534d1a0264148c1f0f91078f9dfcca565435e9c82f` |
| MiG-31BM derivative | 170740 | 3106 | `c220c9afd4caf065fc8d84f15060d2b5341b16aa638d4ae88677df19409765b4` |

All prior receipts remain immutable, especially six-aircraft Su-35 zero-birth FAIL
and latest four-vessel unforced FAIL. No stealth, bay, gear or new weapon capability
is claimed. The shared fleet-generator check initially caught imported baseline
map expansion changing its manifest. Keeping that historical map and adding a
separate current guard restores byte-exact fleet reproduction without fleet edits.
Maintenance docs are parent-owned and not run/PASS in this dirty shared tree;
parent updates the manual/inventory after this asset commit.

## Mirage 2000C/Su-34 asset checkpoint (Delegation 55)

Actual GLBs and rigs were decoded before derivation. Mirage has only two elevons
and one rudder, with no canard or tailplane mesh. Its one actual elevon pivot per
side uses `driver: roll`, gain left -1/right +1 and optional `pitch_gain: -1`.
The renderer contract clamps the SUM of signed roll and pitch rates to [-1,1]
before multiplying by the unchanged .22-radian limit. Pure pitch is symmetric;
pure roll is antisymmetric. No duplicate pivot or fabricated tailplane is added.
No old descriptor gains `pitch_gain`. Su-34 has two actual elevons for roll, both
canards AND both tailplanes for pitch, two rudders for yaw and two alloy nozzles.
All reflected source rest translations, including positive rear pivot Z, remain.

Mirage pilot [cannon20, aim9], officer [tvmissile, null]; Su-34 pilot
[cannon20, aim9], officer [maverick, null]. Four external ammo-linked stores per
aircraft, two per slot, reuse the measured wing-section/underside attachment,
barrel-ring muzzle, closed-canopy eye and alloy-nozzle derivation. These are arcade
fits, not real caliber, BVR, operational or simultaneous bomb fits. No new weapon,
stealth, bay or landing-gear claim. Approximate hinges/limits, sampled clearance
and the closed-shell cockpit are not certified aircraft mechanisms.

| Asset | Bytes | Triangles | SHA256 |
| --- | ---: | ---: | --- |
| Mirage original | 107820 | 2428 | `5e17fb6db155a50fccaa52ccb4ec1989293441d0346769c43774dc370ce1f4dd` |
| Mirage derivative | 147676 | 2828 | `52a7af241805d4faaf35df163fae70d49149720b2437ea7d08e37f590068631f` |
| Su-34 original | 131032 | 3194 | `8c2f3633dd39e47a0259b0954c831bee5f8531ed38db48a9e383c277166ff50a` |
| Su-34 derivative | 178080 | 3674 | `60ca4edcf7453fe1f7fe25893ee5564888349a258ede977243dc8fbaff7b66ab` |

Fresh generator `--check` and serialized checker PASS: 560 signed/rest poses,
528 static launch/exhaust rays, 12528 rest/posed-source rays (including combined
Mirage controls), 36 corrupt pre-write overwrite negatives and 123 historical
GLB/metadata/rig/evidence files exact against `100190fd`. All 36 old GLBs, eight
old descriptors/repair records, prior rigs and six historical flight receipts
remain byte-exact, including Su-35 zero-birth FAILs, eight-kind PASS and the latest
five-vessel setup FAIL. No prior failure is recast as acceptance.

The independent fleet reproduction/check currently fail at the old whole-file
fighter descriptor hash in `repair-fleet-extension.py:retained`, before model
checks. That parent-owned compatibility update must also preserve the fleet
checker's frozen baseline semantics/count assertions while admitting the new
fighter entries. Legacy `BASELINES` stays exact; only `RETAINED_BASELINES` grows.
No fleet source or check was edited in this asset-only lane.

No install, browser, screenshot, source build, new game, push or native acceptance
is part of this asset-only lane. CPU checks do not establish converted texture
parity, native flight/combat, cockpit pixels or supported-device performance.
User-reported GPT provenance/scoped permission is not independent originality,
license clearance or manufacturer endorsement. Parent owns manuals/inventory.

## FA-50/Yak-130 asset checkpoint (Delegation 58)

Decoded both actual original GLBs and full rigs before authoring. Both have two
real elevons for differential roll, two tailplanes for pitch and one rudder for
yaw. No canard, gear, bay, stealth or thrust-vectoring mechanism is fabricated.
The source geometry, UVs, embedded image bytes and approximate pivots remain;
existing reflection, winding, gun, stores, cockpit and PBR derivation is reused.
FA-50 pilot [cannon20, aim9], officer [tvmissile, null]; Yak-130 pilot
[cannon20, aim9], officer [maverick, null]. Each has four actual ammo-linked
stores, two per missile slot. These are arcade fits, not caliber or operational
loadout claims. No weapon IDs, custom shader or engine/throttle framework added.

FA-50 retains the normal single measured afterburner disc/cone contract. Yak-130
has twin NON-AFTERBURNING turbofans: only its descriptor adds `afterburning:false`.
Its actual added nodes are `exhaust_core_L/R`, with `exhaust_L/R` anchors at
measured nozzle centers, X=±0.569999993, Y=-0.240000002, Z=5.744499786 m.
The restrained core material emissive factor is [0.12, 0.045, 0.012], not flame.
Delegation 59 must use an empty native afterburners array for that tag and the
existing `glow` role on `exhaust_` chains (0.35 scale). No cone, boost stretch or
boost brightness belongs to Yak. Its native boost remains an arcade speed
setting, not a real afterburner claim. No other descriptor gains this field.
FA-50's measured center is [0, 0, 6.567999943] m.

| Asset | Bytes | Triangles | SHA256 |
| --- | ---: | ---: | --- |
| FA-50 original | 115524 | 2652 | `adf3e81efc5c5841bc30b9fa526ae7bdf83f0ccbad8fa12a142f43b73b7484f6` |
| FA-50 derivative | 155408 | 3052 | `68f02d6ff28d5f54c2181031b7faf2e8cba06839925ccaf6836b28c6cd28b079` |
| Yak-130 original | 124716 | 3050 | `0bff616f2330806c42860c8d705f7ae05616f2a84e05d44530da4538da44505e` |
| Yak-130 derivative | 171796 | 3530 | `b1b4f0d3569386cba10e2574dfb29b3135899fbb0b5c8a2d30dd81a55be0fce6` |

Fresh serialized checker PASS: 660 signed/rest poses with continuous vertex
envelopes, 632 static launch/exhaust rays, 14712 rest/posed-source rays, 40
corrupt retained-GLB and 35 corrupt old-entry/metadata pre-write negatives.
All 40 old GLBs, ten descriptors/repair entries, prior rigs and seven flight
receipts are exact against `53355f0b`, including the ten-kind Typhoon zero-birth
FAIL. Reproduction `--check`, Python compile without pycache, catalog129 unique
IDs/schema/Git URLs and diff whitespace pass. The first checker attempt caught a
copied large-aircraft tailplane region threshold (FA-50 actual min Z=3.38 m);
the next caught omission of the exhaust anchor child from the expected node keys.
Only new-model checker expectations changed, not geometry or old guards.

Legacy exported `BASELINES` remains exact; only `RETAINED_BASELINES` grows.
Parent must reconcile whole-file fighter metadata pins in the fleet generator
and the fleet checker's retained count to 44 after this commit. Expected metadata
pin mismatch is not a fleet PASS and does not authorize changing old fleet checks
here. No fleet path was edited or failed command replayed in this lane. Parent
owns manual/inventory updates and maintenance coverage. No supplied code executed,
install, browser, screenshot, source build, new game or push. Native pixels,
converted appearance, human flight and performance remain unverified; source
provenance is user-reported GPT/scoped permission, not independent licensing.

## Single Hawk T2 asset checkpoint (Delegation 64)

Read current manual232/remaining-delivery/quality contract and both complete
fighter scripts before authoring. Current entry and Wings tree match inventory
at `b39d5096`; historical native/coverage failures remain, not current acceptance.
Inspected the actual pinned Hawk GLB and full rigid JSON, not an aircraft template:
source bounds are X +/-4.970424652, Y -0.680000007..2.670000076,
Z -6.210000038..6.215000153 m. The source has actual elevon_L/R, tailplane_L/R,
one rudder_1 and closed canopy, no gear/bay. Source alloy is one connected nozzle
component, normalized X +/-0.270000011, Y -0.230000004..0.310000002,
Z 5.610000134..6.210000038. Existing source-native config skips afterburners for
`afterburning:false`; exhaust_* chains already use static glow at 0.35 scale.
No shared render behavior, shader, pipeline or engine change belongs to this lane.

The same -Z reflection, winding, signed-axis, UV/image-preserving PBR/canopy and
measured equipment helpers derive `hawkt2`. Five actual source controls retain
approximate pivots: differential elevon roll, symmetric tailplane pitch, single
rudder yaw. Pure signed pitch/roll/yaw, inactive-surface rest, return, continuous
vertex envelopes and posed-source clearance are checked independently. Limits
remain conservative arcade visuals, not certified hinges or full mechanisms.

Hawk has ONE NON-AFTERBURNING `exhaust_core` with child anchor `exhaust` at
[0, 0.03999999910593033, 6.218000038146973] m. `afterburning:false` uses the
existing faint warm material [0.12, 0.045, 0.012], no flame/cone/boost brightness
or stretch. Only Yak and Hawk have this descriptor field; all twelve older
entries stay exact, including Yak's two static cores and FA-50's afterburner.
Native boost is an arcade speed aid, not an afterburner claim. Delegation 65
owns actual converted-state verification; native pixels remain unverified.

The current explicit order supersedes the old proposed unarmed-trainer fit for
this scoped arcade derivative: pilot [cannon20, aim9], officer [maverick, null].
Four ammo-linked stores use actual measured wing attachments and installed tip
origins; gun uses its terminal ring, cockpit its closed glazing/body section.
No new weapon, real caliber/operational fit, stealth, bay, gear or tandem cockpit
interior claim. Source geometry/UV/image/metadata and source rest transforms stay
preserved; only existing canopy PBR edits and authored equipment are applied.

| Asset | Bytes | Triangles | SHA256 |
| --- | ---: | ---: | --- |
| Hawk T2 original | 114272 | 2540 | `9289e2d589b8a295392b2d100c1c3462ee935f1e4837e937e0fea5240bfb54e7` |
| Hawk T2 derivative | 154156 | 2940 | `7dc2868e30f4f9f68be8425e04aac5e00d9145d3fe3b590b84f707827f235734` |

Final stdlib checks: 745 signed/rest poses, 680 static launch/exhaust rays,
16056 rest/posed-source rays, exact original PNG CRC/decode/image bytes, 46 corrupt
GLB plus 41 corrupt historical entry/metadata pre-write guards. All 46 old GLBs,
12 old descriptors/repair records, prior rigs and nine historic coalition flight
receipts stay exact against `b39d5096`, including six-vessel Typhoon/MiG31
zero-birth coverage FAIL. Legacy BASELINES ABI stays exact; RETAINED_BASELINES
now guards every old GLB. Reproduction --check and memory-only compile pass.

Parent owns canonical thirteen-fighter whole-file pins, fleet retained-count48,
armor/host bridge/profiles/UI/manual/inventory/root checks. No fleet path changed
here; historical pin mismatches must not be bypassed or called a fleet PASS.
No supplied code executed, install, browser, new game, further aircraft/vessel
work or push. User-reported GPT provenance/scoped permission is not independent
originality, redistribution license, photorealism or native acceptance.

## Single Su-25SM asset checkpoint (Delegation 67)

Inspected the complete current fighter generator/checker, shared escort geometry
helpers and their callers, current manual232/remaining-delivery/quality contract,
actual retained converter and exact source GLB/rig before authoring. At source
pin `9a4efe06`, Wings entry/tree match inventory. The source is a supplied Su-25
exterior SM simplification, not a certified exact SM revision. No supplied code
was executed. User-reported GPT provenance and scoped Wings use/repair permission
remain qualifications, not independently verified originality or a license grant.

Actual source controls are `aileron_L/R` for differential roll, `elevator_L/R`
for symmetric pitch and `rudder_center` for yaw. The existing classifier now
recognizes ailerons directly; no elevon rename or fabricated control is used.
The canopy retains its closed source rest pose. Original reflected geometry,
rest pivots, winding, normals, UVs and embedded PNG bytes remain exact, with only
the existing canopy dielectric/alpha edits and authored arcade equipment added.
Gains/limits and source approximate hinges are not certified aircraft mechanics.

Source material3 `bare_engine_alloy` actually contains TWO separate rear nozzle
components: X -1.490000010..-0.610000014 and +0.610000014..+1.490000010,
Y -0.479999989..+0.400000006, Z4.900000095..5.300000191 after reflection.
Both are NON-AFTERBURNING outlets. Existing Yak/Hawk warm-core helpers produce
`exhaust_core_L/R`, child anchors `exhaust_L/R` at
[+/-1.050000011920929, -0.03999999165534973, 5.308000190734863].
Only Yak, Hawk and Su25 descriptors have `afterburning:false`. The same low static
warm material [0.12,0.045,0.012] uses the retained converter's exhaust glow path
at 0.35 scale: no cone, flame, boost stretch/brightness, new shader or engine clock.
Delegation68 owns actual native converted-state verification, not this asset lane.

Arcade fit: pilot [cannon20, aim9], officer [maverick, null], four actual stores,
two per missile slot. Same measured wing-section/underside attachment, installed
store-tip launch, terminal gun-ring muzzle and closed-canopy eye helpers apply.
No real GSh caliber, operational loadout, rocket, bomb bay, stealth or gear claim.
No other aircraft/vessel or existing GLB was changed.

| Asset | Bytes | Triangles | SHA256 |
| --- | ---: | ---: | --- |
| Su-25SM original | 125092 | 2972 | `cf231893435e7283a5950bd7ca15591bb2ff9159ab29c001ea7b9412204b4663` |
| Su-25SM derivative | 172188 | 3452 | `2fe458ed79d9de72b3e122c7149ab859f64142e435f023b993bb0b50a602a767` |

Fresh stdlib generator/checker PASS: 830 signed/rest poses, 736 static-clearance
rays, 17624 rest/posed-source rays, PNG CRC/decode/original-image parity and exact
reproduction. Pure signed pitch/roll/yaw, inactive surfaces and return to source
rest are independently checked. The first checker run caught an overly rearward
new elevator region expectation: actual elevator vertices start at Z4.35, while
the source pivot is Z5.65. Only that new expectation changed, not geometry or
older checks. All48 old GLBs, thirteen descriptors/repair entries, prior rigs,
149 historical files and TEN flight receipts are exact against `9a4efe06`, including
the thirteen-kind Typhoon/Rafale zero-birth coverage FAIL. No historical failure
is rewritten or promoted. All48 corrupt GLB and44 corrupt old-entry/metadata
outputs reject before mkdir/write. Legacy BASELINES ABI stays exact; only
RETAINED_BASELINES grows. Every new asset is below512000B; known49-output total
4138361B fits a bounded4200000B generator ceiling. Unchanged files are not written.

Parent owns fleet whole-file metadata pins/count50, armor/bridge/profiles/root
checks/manual/inventory. No fleet path was edited or fleet PASS claimed. Native
pixels, SM-revision fidelity, converted appearance, human flight/performance and
license certification remain unverified. No install, browser, new game or push.

## Single A-10C asset checkpoint (Delegation 70)

Bounded asset-only continuation from `c488b4ab`. Read current manual232 tail,
remaining-delivery/active quality contract, both complete fighter scripts, shared
geometry helpers and callers, native registry/converter and existing weapon fit.
Wings entry/tree match the current inventory at that pin. Native registration,
armor/bridge/profiles/UI/root checks/fleet pins/manual/inventory belong to their
separate owners. No supplied code was executed and no fleet path was edited.

Decoded the pinned A-10C GLB and complete original rig before authoring. Actual
controls are `aileron_L/R` for differential roll, `elevator_L/R` for symmetric
pitch and `rudder_L/R` for symmetric yaw. The existing Su-25 aileron classifier
is unchanged. All original geometry, reflected rest pivots/axes, winding,
normals, UVs and embedded PNG bytes remain, with the existing closed-canopy
PBR edits and measured equipment only. Closed canopy stays at source rest.
Source A-10 family exterior is not certification of C-variant avionics, cockpit,
approximate hinges or real aircraft mechanisms.

Material3 contains 28 actual connected alloy components: two raised rear outlets
and 26 front fan/hub components. The generator isolates the two rearmost
components; the checker independently partitions front Z<2 versus rear Z>4.8.
Rear outlet bounds are X -2.339999914..-1.159999967 / +1.159999967..+2.339999914,
Y +0.709999979..+1.889999986, Z4.899090767..5.299016476 m. Existing Yak/Hawk/
Su-25 dim static warm cores produce `exhaust_core_L/R` with child `exhaust_L/R`
at [+/-1.749999940, 1.299999982, 5.307016476] m. `afterburning:false` now occurs
ONLY on Yak, Hawk, Su-25 and A-10C. Same [0.12,0.045,0.012] material and existing
0.35 native glow path: no cone, flame, boost brightness/stretch or new shader/
clock. Front fan geometry remains untouched and is not an invented spinning rig.

Arcade contract: kind `a10c`, pilot [gau8, aim9], officer [maverick, null]. Four
generic external ammo-linked stores, two per missile slot, use the existing
wing-section/underside and installed-tip helpers. The existing generic visible
under-nose barrel and measured terminal-ring `gun_muzzle` can bind the existing
native `gau8` weapon ID, but do NOT depict or certify a real rotary GAU-8
installation. No source gun pivot exists, no spinning rig is invented, and no
weapon or simulated gun mechanism is added. Legacy `a10.glb`/Warthog rotary gun,
rockets and stats remain untouched. No rocket/bomb fit, gear, bay or stealth.
Cockpit eye uses actual closed-glazing/body rays, not copied camera coordinates.

| Asset | Bytes | Triangles | SHA256 |
| --- | ---: | ---: | --- |
| A-10C original | 148464 | 3698 | `74c58cd536be3705b347d7c32fa76b54a0692a992fadde65f82772037187d623` |
| A-10C derivative | 195560 | 4178 | `897cd0cc6407cebdddaddd05224e925f577870f6f961e0903f11de367708f00e` |

Fresh generator/checker PASS: 932 signed/rest poses with continuous vertex
envelopes, 792 static-clearance rays and 19416 rest/posed-source rays. Pure
signed roll/pitch/twin-rudder yaw, inactive surfaces and exact return to source
rest, source UV/image CRC/decode, measured camera/store/gun/exhaust origins and
reproduction pass. First check caught a new bounds expectation using source-body
height instead of the finished store-fin height, 4.04849 m; only that new assertion
was corrected, no geometry or historical assertions changed.

All 50 old GLBs, fourteen descriptors/repair entries, previous rigs and 154
historical GLB/metadata/rig/evidence files match `c488b4ab`, including ELEVEN
coalition flight receipts and the current fourteen-kind Typhoon/Rafale zero-birth
FAIL. Fifty corrupt GLB plus 47 corrupt old-entry/metadata outputs reject before
mkdir/write. Legacy exported BASELINES remains exact; only RETAINED_BASELINES
grows. Twenty pristine metadata files include exactly one new real rig. Each new
file is below512000B. Known52-output aggregate4492958B is explicitly bounded by
4700000B, not an unbounded allowance; unchanged files are not rewritten.

Parent owns the fleet whole-file pins and count52 update, canonical armor/bridge,
coalition/root checks and manual/inventory reconciliation. No fleet PASS is
claimed here. Native pixels, converted appearance, normal human flight, hardware
performance, variant fidelity and certification remain UNVERIFIED. User-reported
GPT provenance/scoped use permission is not independent originality or a license
claim. No other aircraft/vessel, new game, install, browser, server or push.

## Single F-35A asset checkpoint (Delegation 73)

Bounded asset-only continuation from `0de93d6e`. Inspected CODE_QUALITY, current
manual232 tail, remaining-delivery/active quality mode, both complete fighter
scripts, shared escort geometry helpers and their callers, native config and
actual pinned F-35A GLB/full rigid rig before authoring. The Wings entry/tree
match the inventory at that pin. No supplied code was executed. Parent owns
armor/bridge/canonical/coalition/root checks, fleet whole-file pins/count54 and
manual/inventory; Delegation74 owns native registration/converter checks.

The original is the supplied land-based A exterior, not legacy `models/f35.glb`
or relabeled art. Actual `flaperon_L/R` drive differential roll, `tailplane_L/R`
symmetric pitch and `rudder_1/2` symmetric yaw. Both canted fin/rudder regions
are checked from actual vertices. Six approximate source pivots and the closed
canopy rest pose remain; no invented nozzle, bay, lift-fan, VTOL, gear or naval
rig/capability. Original geometry, reflected winding/normals/rest transforms,
UVs and embedded PNG bytes remain exact, with only existing canopy PBR edits
and measured authored arcade equipment. These are not certified hinges or
mechanisms, photorealism, manufacturer endorsement or native pixels.

ONE connected alloy outlet measures X/Y +/-0.589999974 m and normalized
Z7.141414642..7.767676830 m. The existing dim static warm-core path produces
`exhaust_core` with child anchor `exhaust` at [0,0,7.775676830291748] m and
emissive factor [0.12,0.045,0.012]. `afterburning:false` is a VISUAL opt-out ONLY:
it does NOT claim the real F-35A lacks an afterburner. Engine afterburner mechanics
and visuals are not modeled in this bounded unit. No new flame/cone, shader,
clock, renderer field or nozzle mechanism is introduced. The generator-local
name is now `static_core`; all fifteen older outputs/entries remain exact.
Only Yak/Hawk/Su25/A10C/F35A have the existing `afterburning:false` field.
Native worker74 must reuse the existing config/static-glow path, not invent one.

Kind `f35a`: pilot [cannon20, aim9], officer [tvmissile, null]. Four generic
EXTERNAL ammo-linked arcade stores, two per missile slot, use existing measured
wing-section/underside attachment and installed-tip anchors. F-35A joins the
existing TV-officer classification, not Maverick. The generic under-nose barrel
adapter and terminal-ring muzzle are NOT a real-caliber or internal GAU-22 fit.
No stealth, internal bay, operational-loadout or new-weapon claim. Original F35
model, weapons, stealth and bays remain untouched. Cockpit eye comes from the
actual closed-glazing/body section, not copied coordinates.

| Asset | Bytes | Triangles | SHA256 |
| --- | ---: | ---: | --- |
| F-35A original | 108228 | 2278 | `956550b4cba4a7e4bf4f6bccd71609673f46705a7f249b18adf8f38f2a646e01` |
| F-35A derivative | 148112 | 2678 | `1dfd31db6e01e7604c4145617a3a0afb3b880bc28a8017b5e61ea6b061221ce5` |

Fresh stdlib generator `--check` and serialized checker PASS: 1034 signed/rest
poses with continuous vertex envelopes, 840 static-clearance rays, 20952
rest/posed-source rays, exact PNG CRC/decode/UV/image parity and reproduction.
Pure signed roll/pitch/twin-rudder yaw, inactive surfaces and exact source-rest
return pass independently. All52 old GLBs, fifteen descriptor/repair entries,
prior rigs and159 historical files match `0de93d6e`, including TWELVE coalition
flight receipts and the current fifteen-kind Rafale/Yak zero-birth FAIL.
Historical failures remain failures, not acceptance of the new aircraft.

52 corrupt GLB plus50 corrupt historical-entry/metadata outputs reject before
mkdir/write. Legacy exported BASELINES ABI stays exact; RETAINED_BASELINES now
protects all52 old GLBs. New raw/derived/rig files total260611B, each below512000B.
Known55-output aggregate4759645B is bounded below4900000B; per-GLB512000B ceiling
is unchanged. Unchanged files are not rewritten. No fleet path was edited or
fleet PASS claimed; parent must reconcile its exact whole-file metadata pins.
Python memory compilation, catalog129 unique IDs/schema/Git URLs and diff
whitespace checks pass. The global maintenance checker stops at its unchanged
`Commit inspected source changes before validating its inventory.` guard in the
shared dirty tree, not a documentation PASS. Parent owns that reconciliation.

User-reported GPT provenance and scoped Wings use/repair permission remain
qualifications, not independent originality or a redistribution license claim.
Native converted appearance, pixels, human flight/input, listening, hardware
performance and real-aircraft certification remain UNVERIFIED. No other unit,
new game, install, browser, server, provider/model change or push.

## Single J-20 asset checkpoint (Delegation 76)

Asset-only continuation from `87c4ed04`, using the same pinned archive SHA256
`4e37a104ba356790f6f9a0632c99d34b77dc023649e3cab830d895ec55c471d8`.
Read CODE_QUALITY, manual232 tail, remaining-delivery quality mode, complete
fighter generator/checker, shared escort geometry and fleet callers, inventory
and actual J-20 rigid rig/vertices. No supplied code executed. Parent owns the
canonical armor/bridge/coalition/root integration, fleet count56/pins and manual/
inventory; native77 and coverage78 remain separate lanes. No fleet path edited.

Distinct supplied J-20 public-silhouette art, not J-20S/naval or old-aircraft
substitution. Measured finished XYZ is 13.502904/4.420000/20.409999 art units;
approximate 20.4 length/13.5 span is NOT an official dimension claim. Actual
`elevon_L/R` drive roll (L=-1/R=+1), `canard_L/R` pitch (-1), and named
`vertical_stabilizer_1/2` yaw (-1). Keep those fin names, not renamed rudders
or defaulted to pitch. Shared classifier asserts supplied +Y axis and reflected
-Y axial metadata. Limits remain original arcade .22/.28 rad, not certified
mechanics. Exact original geometry, UVs and embedded PNG bytes remain, apart
from the established coordinate reflection, winding and canopy material edits.

Two connected alloy outlets measure X [-1.330000,-.230000] and [.230000,1.330000],
Y [-.650000,.450000], Z [9.590000,10.190000]. Reuse existing static warm
`exhaust_core_L/R` and `exhaust_L/R` anchors at
[+/-0.780000024,-0.099999994,10.197999580]. Same [.12,.045,.012] emission.
`afterburning:false` is VISUAL ONLY, like F35A, not a claim about real J-20
engine capability. No flame/cone/boost brightness/stretch, shader, clock or
nozzle mechanism. No stealth, bay doors, gear or naval fit.

Kind `j20`: pilot [cannon20,tvmissile], officer [maverick,null]. Same Su35
classification supplies four generic EXTERNAL arcade stores, two TV pilot and
two Maverick officer, measured wing attachment/pylons/tip launch anchors.
Generic under-nose cannon adapter/terminal-ring muzzle is NOT a real J-20 gun,
caliber, internal-bay fit or operational capability. No verified gun/bay geometry
exists here. Cockpit eye uses actual closed-glazing/body section rays.

| Asset | Bytes | Triangles | SHA256 |
| --- | ---: | ---: | --- |
| J-20 original | 111048 | 2346 | `9d70ac66e30c70a69c76b8e0c7c0151a74a4e5ab9f12691cef738b816707b862` |
| J-20 derivative | 158124 | 2826 | `5fcabcc098e29d6c844b0b44f3c8ead56925553ce2b005850e84828d27863b1c` |

Generator and --check reproduce 58 outputs totaling5039918B, bounded5100000B;
per-GLB512000B unchanged. New raw/derived/rig total273635B. Serialized checker
PASS:1136 signed/rest poses,896 static-clearance rays,22744 rest/posed-source
rays, exact PNG CRC/decode/UV/image parity, origins and continuous envelopes.
Pure roll/pitch/whole-fin yaw, inactive surfaces and source-rest return pass.
Initial new region expectation was corrected to actual elevon Z5.275 and fin
Z4.70 minima; no source geometry or historical check changed.

All54 old GLBs,16 descriptor/repair entries, prior rigs and164 historical files
match87c4ed04, including13 flight receipts and sixteen-kind Rafale/Yak130
zero-birth FAIL. Legacy BASELINES unchanged.54 corrupt GLB plus53 corrupt old
entry/metadata outputs reject before mkdir/write. Wrong fin-axis suggestions
also reject in memory. Historical failures remain failures.

Python memory compile (two scripts), catalog129 unique integer IDs/schema/Git
URLs and diff whitespace checks PASS. Preimage Wings entry/tree match inventory
at87c4ed04. Global maintenance checker remains held at `Commit inspected source
changes before validating its inventory.` in the shared dirty tree. Parent owns
manual232/inventory reconciliation; no global documentation PASS claimed.

User-reported GPT provenance/scoped permission is not independent originality,
license, manufacturer or realism certification. Native pixels, converted
appearance, human input/listening and hardware performance remain UNVERIFIED.
No other unit, new game, browser, install, server, provider change or push.

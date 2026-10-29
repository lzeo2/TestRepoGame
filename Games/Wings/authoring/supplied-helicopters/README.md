# Supplied helicopter pair: BLOCKED source clearance

Delegation81, source checkpoint `1a1f674d`. This is an intake/blocker checkpoint,
NOT a completed conversion or native acceptance. **Native82 must not register
these assets as ready.** No `native-helicopter-pair.json` or derived helicopter
GLBs are published. Corrected source geometry or an explicit contract change is
required. Do not invent a gun, shorten blades, move pivots, or waive clearance.

## Pre-authoring study

Read CODE_QUALITY, maintenance232 tail, remaining-delivery/READY handoff,
aircraft-quality-contract, shared fighter generator/checker, escort GLB helpers,
fleet geometry and CPU model fixture, and native aircraft/vehicle/camera/flight
callsites. Inventory at `1a1f674d`: Wings360 files/38424700B; catalog129. Existing
render/input/performance/rights holds and missing001 manual remain open.

Measured existing GLBs: fa18 16896 triangles, a10 17576, yf12 18028, Apache11322,
B2 4740, F15 41352, F35 40812. Existing neutral/dark PBR and local maps stay
untouched. Native Apache has rotors, eight visible Hellfires, rocket pods and a
chin turret; those are NOT evidence that the supplied pair has that equipment.
The native spinner loop already drives rigid bones from rotor spool. Store
visibility maps ammunition to named pivots. No new clock or spinner engine is
needed. Existing camera constants are not valid source-derived coordinates.

The actual supplied roots have static airframe/glazing, main_rotor_spin with
main_rotor_blade_assembly, tail_rotor_spin with tail_rotor_blade_assembly, and
three fixed-gear wheel nodes. There is no gun/turret pivot or canopy hinge.
AH64D has four main blades; Mi28N has five. Both preserve their four asymmetric/X
tail blades. AH64D's radar housing and mast belong to static airframe, not the
spinning assembly. No sensor capability follows from that housing.

The static tinted_canopy primitive contains two cabin glazing components and a
small forward optic face. Future cockpit measurements must use actual cabin
glass, not that optic, native Apache constants or an invented interior. Supplied
paint/maps stay intact; a future derivative may qualify the existing dielectric
BLEND alpha .26 adaptation. No derivative material edit is accepted here.

## Reproduced blocker

Coordinates below are metres in the reflected root frame: +X right, +Y up,
-Z forward. Rotations are positive right-handed radians about each actual pivot.
Only positions/normals/translations are reflected by C=diag(1,1,-1); winding is
reversed and signed axes are axial-reflected by the existing helper. Original
files and rig bytes remain unchanged.

| Source | Rotor | Pose | Actual static triangle intersection |
| --- | --- | --- | --- |
| AH64D | tail_rotor_spin, X | 0.6981317007977318rad (40deg) | horizontal tail at [-.362500012,.808592700,7.941544650] |
| Mi28N | main_rotor_spin, Y | 0.9599310885968811rad (55deg) | vertical fin at [.075000003,2.806732381,8.638505583] |
| Mi28N | tail_rotor_spin, X | 0rad (source rest) | horizontal tail at [.4375,.802265030,8.002953830] |

These are edge/triangle intersections, not merely overlapping AABBs. The checker
recomputes them from actual vertices with an independent ray method and reports
triangle indices, pivots and witnesses in repair-record.json. A single forbidden
pose disproves all-360 clearance; a sample with no hits would not prove it.
Central mast/hub mating contact is not used as a failure witness. The AH radar
housing remains outside the spinning bone. No source code is executed.

## Commands and boundaries

```sh
python3 -B Games/Wings/authoring/repair-helicopter-pair.py --archive .tmp/wings-source-intake/Wings_Base_30_Models.zip
# Expected exit 1: BLOCKED: source rotor/body collision; no mkdir/write.
python3 -B Games/Wings/authoring/repair-helicopter-pair.py --archive .tmp/wings-source-intake/Wings_Base_30_Models.zip --intake-only
# Preserves only exact originals/rigs and blocker record, not geometry acceptance.
python3 -B Games/Wings/authoring/repair-helicopter-pair-check.py --archive .tmp/wings-source-intake/Wings_Base_30_Models.zip
# Regression success means the blocked state is reproduced, NOT clearance PASS.
```

The requested future ABI remains `wings_native_helicopter_pair_v1`, kinds ah64d
and mi28n, rotors main_rotor_spin/Y/-30 and tail_rotor_spin/X/-70, driver rotor.
These are arcade visual rates/directions, not certified mechanics. Proposed
pilot[rockets,null]/officer[hellfire,null] is an arcade fit, NOT a real Mi28N
Hellfire installation. Four ammo-linked hellfire_L1/R1/L2/R2 and two static
rocket_pod_L/R need measured actual stub-wing attachments and tip launch anchors.
None are created while source rotor clearance fails. Wheels remain at rest;
no flight gear/sensor/ASW/bay/steerable turret/gun/exhaust capability is claimed.
No new flame, shader, clock, model replacement, game, browser/server or push.

## Executed verification

- Python in-memory compilation: two scripts PASS; no bytecode written.
- Blocked-state regression: PASS intake/reproduction, original geometry/UV,
  real PNG CRC/decompression/scanline decoding, unchanged PBR, 292 signed
  full-turn bound/rest poses, three independent triangle witnesses and 97
  no-mkdir/no-write negative cases. This is NOT a rotor-clearance PASS.
- Literal immutable pins: all64 older GLBs,17 fighter descriptor/repair entries,
  eight fleet entries,13 random receipts and declared Rafale/Yak exact.
- Catalog129 integer/unique IDs, required schema and tracked URLs PASS.
- Maintenance checker exits1 at `Commit inspected source changes before
  validating its inventory.` Parallel workers own dirty native/runtime source;
  this lane cannot commit their paths or refresh the shared inventory/manual232.
  Parent must reconcile those after integration; the older missing001 hold is
  not substituted for this actual current failure.
- No browser, server, install, native/render/human acceptance or push attempted.

User reports GPT-generated assets and scoped repair permission. This is not
independent proof of originality, redistribution rights, manufacturer accuracy,
photorealism or hardware acceptance. Existing64 GLBs,17 fighter entries,eight
fleet entries,13 historical random receipts and the declared Rafale/Yak receipt
are frozen by literal hashes from `1a1f674d`, not re-baselined at runtime.

## Parent safe-runtime quarantine

Native candidate `efa89ed6` had imported the deliberately withheld manifest, so it
was NOT buildable or READY. Parent preserved its exact runtime integration plus
pending measured-launch/armor delta in `blocked-native-candidate.patch.gz`
(10574B, SHA256 `f94b4be7dc2667b66e025820c8db603742ded6c48f9eff6df49c5293bca0a81f`).
It decompresses byte-exact to the36372B captured patch, SHA256
`e150f33fec1ca414a80d6d5650d61c94b3177a8acb64c6c138594bac1450b5c8`.
Compression preserves exact patch-format blank context without relaxing whitespace
gates; no executable or supplied code is run.
The14 explicitly scoped runtime/check paths were reversed to their exact
`1a1f674d` bytes, without a history reset or deletion of candidate/source evidence.
Parent pending changes were inspected and captured in that patch too. Raw inputs,
rigs, collision records, both partial commits and the proposed native checker are
retained. The candidate also needs a future `launchedHardpoint()` fix: its current
%2 index cannot select four distinct Hellfire origins. No such adapter is active.

Fresh original-UI compilation at `.tmp/wings-helicopter-hold-review` succeeds:
26files4066526B, dependency closure PASS, all26 files byte-exact to the prior READY
`.tmp/wings-j20-ten-vessels-review`. Runtime source remains exact `1a1f674d`.
This proves removal of the missing-manifest dependency, not a helicopter runtime,
rotor-clearance, native-input, visibility or performance PASS. Registered roster
stays17/20aircraft+10/10vessel objectives, ordinary24; AH64D/Mi28N remain absent.
Parent independently replays the blocked-state checker:292poses/three exact
triangle witnesses/97prewrite negatives, all64olderGLBs/metadata/14receipts exact.

Advice ticket `pi-667665-1793230218293-93186427` agrees these are genuine non-joint
contacts. Large arbitrary offsets or a fabricated manifest are not validated
repairs. A source/reference-supported structural correction remains required,
whether produced locally within repair scope or supplied externally. No guard,
contract or operator decision was overwritten; ticket review uses the guarded
lifecycle CLI, not direct JSON edits. Tu160 is separate unfinished engineering,
so this is not a whole-scope completion or an operator-only global blocker.

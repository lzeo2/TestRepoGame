# Supplied vessel extension assets

Current extension contains eight genuine supplied models. Delegation 79 appends
Charles de Gaulle, Queen Elizabeth, Liaoning and Admiral Kuznetsov assets and
measured descriptors only. Parent owns manuals, inventory, rosters, source/client
integration and fleet-root checks. Earlier checkpoint measurements below remain
historical, not current native acceptance.

## Original two-vessel checkpoint (historical)

Delegation 46 selects only these two genuine, distinct supplied archive meshes
and their raw rigs. Parent owns registry, faction membership, UI, manuals and
inventory; Delegation 47 owns scenario/integration checks. This is an asset/rig
checkpoint, not a new game, runtime registration or native acceptance.

## Source and permission

Source archive: `Wings_Base_30_Models.zip`, 3,114,212 bytes, SHA-256
`4e37a104ba356790f6f9a0632c99d34b77dc023649e3cab830d895ec55c471d8`.
The existing fighter archive validator checks all 65 unique safe relative paths,
no symlinks, ZIP CRC, exact manifest membership/sizes and all 64 non-self hashes.
The manifest's self-hash is explicitly null. No supplied script is executed.

Whole-package metadata remains byte-exact under
[`../supplied-fighters/`](../supplied-fighters/): original
[`README.txt`](../supplied-fighters/README.txt),
[`models.json`](../supplied-fighters/models.json),
[`roster_lookup.json`](../supplied-fighters/roster_lookup.json),
[`manifest.json`](../supplied-fighters/manifest.json) and
[`palette.json`](../supplied-fighters/palette.json). They describe the complete
30-model archive, not 30 integrated models. They are not duplicated here.
Only `rigs/wings_aquitaine_fremm.json` and `rigs/wings_type055_renhai.json` are
selected into this directory, byte-exact. Raw GLBs live in `../../models/supplied/`.

The user reports generating the models with GPT and authorizes scoped Wings
use/repair. This is user-reported provenance and permission, not independently
verified originality, a license claim, photographic realism, manufacturer
endorsement or real-class certification. The archive supplies neutral base game
art and approximate proportions. Type 055's supplied 20 m beam is retained, not
silently corrected to other reported dimensions. Upstream game rights remain
separate. No network art, replacement vessel geometry or new textures are added.

| Asset | Raw triangles / bytes | Raw SHA-256 | Rig SHA-256 |
| --- | --- | --- | --- |
| Aquitaine FREMM | 5,982 / 540,832 | `cb8c3a46ab4bc4e0fd34633d0747664a371bff02dcb768635e3b5448bf489068` | `4b3352b5cbf603485d19c6183240cdc1d2c4c1865504406a41b164c53ee7b128` |
| Type 055 Renhai | 6,014 / 536,996 | `7066833e6c8307e0d64906da35233ac4435fceda18f29acb7e82e219c968620b` | `fcd1573ad4c715c75bbfacf782b6079ed2f18245b34eedff1047e384250ef239` |

## Derived contract

`../repair-fleet-extension.py` imports the existing `repair-escorts.py` derivation
and GLB helpers, rather than forking the converter. It reuses the fighter archive
validator. `../extended-escort-models.json` retains schema
`wings_derived_escort_assets_v1` with exactly two new model descriptors:
`wings.original.wings_aquitaine_fremm.v1` and
`wings.original.wings_type055_renhai.v1`. Parent/integration aliases are
`aquitaine` and `type055`; no aliases rename the original supplied files/IDs.
The old `model-repairs.json`, its first two descriptors and both old escort GLBs
remain byte-exact. All 26 preexisting GLBs have pinned hashes.

- Reflect +Z to -Z using C=diag(1,1,-1): positions/normals, tangent XYZ/W,
  rest translations and C*M*C rest rotations. Reverse winding once per unique
  index accessor, including indices shared by the propellers. Preserve all
  original meshes, UVs, PNG bytes, material identities and map bindings. Explicit
  PBR factors are only glTF defaults. Mixed opaque atlas glass remains qualified;
  this does not claim a fixed glass partition or native converter parity.
- Root `vessel_root_waterline` stays identity, meter scale, Y=0 waterline.
  Full world bounds and actual connected-component hull/deck/major-island boxes
  come from vertices, not another vessel's constants. Collision boxes remain
  conservative, not exact hull/appendage or continuous rotational physics.
- Actual main yaw/pitch and both propellers retain their local rest pivots.
  Signed axes reflect as [-ax,-ay,az]. Thus yaw is -Y, pitch -X and both screws
  remain **-Z**, matching their raw rig suggestions. The old escort generator's
  +Z spinner descriptors are not changed by this lane. Propeller centers are
  actual mesh pivots, not invented torpedo/exhaust/weapon launch outlets.
- Yaw limits [-0.6,+0.6] rad and pitch [-0.45,0] rad are conservative authoring
  envelopes, not verified mechanisms. Negative pitch raises the barrel; signed
  yaw turns the measured bore in the corresponding direction. Propeller spin
  is unbounded visual rotation, with no implied propulsion performance.
- `main_gun_muzzle` averages eight unique terminal-ring points. The breech uses
  its own eight-point ring. Their actual center-to-center bore has a slight
  upward rest slope; neither extrema averaging nor a hardcoded -Z ray is used.
  Existing fleet-rig can query the anchor as `main_gun`; the descriptor's
  inherited proposed `gun_fwd` binding is not runtime weapon registration.
- Both descriptors remain AI/objective-only: player kind null, runtime_consumed
  false, main-gun capability_enabled false and supported weapon capabilities
  empty. No AA, ASW, sonar, sensors, missile or torpedo origins/capabilities are
  fabricated from a class name. Parent alone owns subsequent authority binding.

| Asset | Derived triangles / bytes | Derived SHA-256 | Rest muzzle in root meters |
| --- | --- | --- | --- |
| Aquitaine | 5,982 / 541,244 | `e3675fa8736cd1b0d98880936662f8554bdeab0dc83ea62b3067df6632482f9e` | approximately [0, 8.210400, -51.540002] |
| Type 055 | 6,014 / 537,408 | `261dcdaee62082df2e47f13d7afbb246ba35dc87f55fb07fa9f1fc600f7de01c` | approximately [0, 10.480000, -65.400000] |

Each derivative is strictly below 1,000,000 bytes. The seven generator outputs
(two raw GLBs, two derived GLBs, two rigs, one descriptor) total 2,182,402 bytes.
The writer validates every path, all retained pins, symlink boundaries and the
strict 2 GiB disk floor before any mkdir/write. It refuses any retained-GLB target,
even if mistakenly returned by generation; identical owned outputs are skipped.

## Reproduction and independent check

From repository root, supply the exact original archive as SOURCE_ZIP:

```sh
python3 -B Games/Wings/authoring/repair-fleet-extension.py --archive SOURCE_ZIP --check
python3 -B Games/Wings/authoring/repair-fleet-extension-check.py --archive SOURCE_ZIP
```

Omit `--check` only to generate the seven owned asset/metadata outputs. No old
file is regenerated. Both repeated generation and comparison run in memory.

The checker imports independent decode/accessor/quaternion/world/PNG/slab math
from `repair-escorts-check.py`, not the generator's matrix implementation.
Its independent position-welded adjacency traversal verifies actual component
boxes. Original reflected geometry, winding, transforms, exact UV/PNG/PBR
identity, finite attributes, unit normals, root/world bounds, raw rigs and source
hashes are checked. It tests 25 yaw/pitch combinations plus ten screw poses per
model. Bore segments from actual breech through muzzle to 10 m beyond it clear
both fitted boxes and actual static mesh triangles; posed barrel vertices clear
conservative static hull/deck/island boxes. Screw pivots/radii remain invariant.
These sampled clearances do not certify continuous moving-surface clearance.

Fresh check, exit 0:

```text
PASS wings_aquitaine_fremm: 5982 triangles; raw 540832 B / derived 541244 B; 3 exact PNG maps; 35 poses; muzzle Y 8.210400..9.736233 m
PASS wings_type055_renhai: 6014 triangles; raw 536996 B / derived 537408 B; 3 exact PNG maps; 35 poses; muzzle Y 10.480000..12.436196 m
PASS: 11996 triangles; 6 exact/CRC/decoded PNGs; 70 poses; 50 actual-static-triangle/box bore-clearance rays; 26 pre-write overwrite negatives; all 26 retained GLBs and old descriptor bytes exact; reproducible outputs
```

All 26 corrupt retained-GLB output injections reject before mocked mkdir/write
calls. Original archive and retained manifest bytes also remain unchanged.
The existing old-escort check also passes unchanged: 11,960 triangles, six PNGs,
22 poses. Direct execution of `fleet-geometry.mjs` compiles both new descriptors
and solves 90 signed boundary/rotated-body poses; unreachable yaw/pitch rejects.
Both new Python files compile, 129 catalog records validate unique IDs/schema/
tracked URLs, and the diff whitespace check passes.

Parent owns manual/inventory updates. The unchanged maintenance command currently
exits 1 at `Commit inspected source changes before validating its inventory.`
while parent/Delegation 47 source edits are dirty; no global coverage PASS is
claimed. The previously known missing001 manual is also outside this lane.
No browser, build, install, served-asset change, new game, publication or push is
part of this asset-only checkpoint. Native PBR/glass pixels, whole-vessel visual
realism, human gameplay, mechanical limits and target-device performance remain
**unverified**.

## CB90 H single-asset slice (Delegation 52)

The same pinned archive supplies `models/wings_cb90_h.glb` and
`rigs/wings_cb90_h.json`. No supplied code ran. User-reported GPT provenance and
scoped Wings permission remain qualified as above, not independent originality,
rights clearance or manufacturer/real-class certification.

| Output | Triangles / bytes | SHA-256 |
| --- | --- | --- |
| `../../models/supplied/wings_cb90_h.glb` | 2,630 / 307,892 | `46aaa3e428309ad927402589a5b35243bedfa7511ee18849c50e48a45b84cfcc` |
| `../../models/derived/wings_cb90_h.glb` | 2,630 / 308,092 | `c8e959a7cd618ce589c547780657b1cb9308d421a5149279d5e66816d4dac578` |
| `rigs/wings_cb90_h.json` | original rig / 990 | `3112559a3e8a14b8820edb2fc602519ca6f5e71a5b7b9589d07ed3611ab03757` |

The existing `repair-fleet-extension.py` uses the existing fighter `orient` helper
and escort accessor/component/world/bounds/packing helpers. No replacement
converter, geometry generator or source-specific shared-math change is added.
`extended-escort-models.json` retains its schema object with `models:Array(3)`.
Its first two model entries retain every field exactly. All 34 prior GLBs, eight
fighter descriptors/repair records, old two-escort descriptor and imported fighter
`BASELINES` ABI remain unchanged. Existing outputs are compared and skipped,
not rewritten. The ten generated asset/metadata outputs total 2,804,164 bytes;
this slice adds 616,974 bytes of raw/derived/rig files plus 4,788 descriptor bytes,
strictly below 1 MB. Total output ceiling is 2,900,000 bytes.

### Measured geometry and resting ramp

Identity root, meter scale, -Z forward, +Y up and Y=0 waterline. Full/static bounds
and continuous swept bounds coincide because the only control is frozen:
X=[-2.0029985905,2.0029985905], Y=[-0.8000000119,4.2160000801],
Z=[-7.9499998093,8.0295000076]. Source Z bounds before reflection were
[-8.0295000076,7.9499998093]. Meshes, reflected geometry/winding, exact UVs,
PBR maps/bindings and three embedded PNG payloads are preserved. Only explicit
glTF material defaults and orientation/provenance metadata are added.

`bow_ramp_pitch` is the ONLY supplied control. Original pivot
[0,0.9700000286,5.0879998207] and source +X axis remain in the pristine rig;
derived pivot [0,0.9700000286,-5.0879998207], signed axis -X. Limits [0,0]
retain the supplied resting shape without ramp scheduling, troop transport,
water-driving, cockpit, seats, ASW or invented articulation. The zero-width
angular envelope makes rest and continuous swept bounds identical; this is not
a moving-ramp clearance result. Ramp root bounds are
[-0.7220000029,1.0350000262,-7.7909998894] to
[0.7220000029,1.3125000298,-5.0879998207].

Four conservative collision layers come from actual position-welded static
components, not the antenna-filled full visual box:

| Component | Min XYZ | Max XYZ |
| --- | --- | --- |
| Hull | [-1.8999999762,-0.8000000119,-7.9499998093] | [1.8999999762,1.1000000238,7.9499998093] |
| Deck | [-1.8999999762,0.8999999762,-7.9499998093] | [1.8999999762,1.1299999952,7.9499998093] |
| Major cabin | [-1.5199999809,1.1000000238,-3.8159999847] | [1.5199999809,2.4600000381,6.0419998169] |
| Upper cabin | [-1.3869999647,1.8450000286,-4.0545001030] | [1.3869999647,3.0950000286,-0.0794999972] |

These AABBs are not exact shell collision. Fine fittings and the resting ramp do
not get separate collision proxies; full visual bounds remain available for
placement/clearance. No padded hitbox, tunnel or invented main-gun geometry.
`main_gun_geometry:null`, `launch_origins:[]` and supported weapon capabilities
`[]` are strict. Objective-only is true, player kind null, runtime_consumed false.
Parent may bind this as an unarmed NONCAPITAL AI objective, never a fifth gun.
The existing four armed vessels keep their prior gun checks and limits.

### Fresh browser-free verification

Both reproduction commands above pass. Independent checker output:

```text
PASS wings_cb90_h: 2630 triangles; raw 307892 B / derived 308092 B; 3 exact PNG maps; 1 frozen ramp pose; gun null / launches empty; 4 measured collision layers
PASS: 14626 triangles; 9 exact/CRC/decoded PNGs; 71 poses; 50 actual-static-triangle/box bore-clearance rays; 34 pre-write overwrite negatives + 3 corrupt CB90 outputs + unowned-path negative; all 34 retained GLBs, 8 fighter entries and old vessel descriptor bytes exact; reproducible outputs
```

Corrupt raw, derived and rig CB90 outputs reject before mkdir/write, as do all
34 retained-GLB replacements and an unowned path. Archive identity stays exact.
CPU integration/model-rig/reset/disposal acceptance belongs to Delegation 53 and
parent, not this authoring receipt. Mixed-atlas glass, native PBR/pixels,
performance, gameplay and real-class realism remain unverified. No browser,
install, build, new game, capability, publication or push is part of this slice.

Additional fresh gates: existing `compileGeometry` accepts all four fitted boxes
and returns no gun/launches; both Python sources compile; 129 catalog records pass
schema, unique IDs and Git-backed URL checks; scoped diff whitespace passes.
Independent comparison to checkpoint `0bde3e54` confirms all 34 old GLBs and all
five historical flight receipts, including the newer eight-aircraft PASS, remain
byte-exact. The unchanged old-escort checker passes 11,960 triangles, six PNGs and
22 poses. Global maintenance validation stops at `Commit inspected source changes
before validating its inventory.` while parent/Delegation 53 paths are dirty;
parent owns final manual/inventory reconciliation, not this seven-path commit.

## Type 022 Houbei single-asset slice (Delegation 61)

The same authenticated archive supplies the genuine static model
`wings.original.wings_type022_houbei.v1`. No supplied code executes. User-reported
GPT provenance and scoped Wings permission remain qualified, not independent
originality, redistribution-license clearance, manufacturer endorsement or
certified real-class accuracy. Dimensions describe approximate source visual art.

| Output | Triangles / bytes | SHA-256 |
| --- | --- | --- |
| `../../models/supplied/wings_type022_houbei.glb` | 2,988 / 331,884 | `f259a65fb5a43a6647e3e740d307aba23e77ff060db8d4881a9dcb853772bdca` |
| `../../models/derived/wings_type022_houbei.glb` | 2,988 / 332,092 | `80fd1b8287e8adb16844df2e7760bb34d7484ab15f59db057a949496a321898a` |
| `rigs/wings_type022_houbei.json` | pristine static rig / 433 | `b9f55b8bc74bec58a7eaa0ee527d7e17f2b4fcb165a52285788e6482fd7b337a` |

The existing generator appends the fourth descriptor to `models:Array(4)` and
extends its owned-output allowlist. The first three entries remain exact, pinned
by serialized SHA-256 `ddbcd63aca013856a58c279b9dde7168633ba5a4544e45958e74c2f62a640092`.
Legacy 26-entry BASELINES ABI, all 44 old GLBs, 12 fighter entries and whole-file
metadata SHA pins, old two-escort manifest and eight historical coalition flight
receipts remain exact against checkpoint `39d97e02`. No other aircraft changes.
Total generated asset/metadata bytes are 3,472,796, below the 3,600,000 ceiling.
New raw/derived/rig files total 664,409 bytes; descriptor growth is 4,223 bytes.
Identical existing outputs are skipped, never rewritten.

Only `static_hull_deck_superstructure` and identity `vessel_root_waterline` exist.
Source and derived rigs have no controls, animations, guns, missile-launch nodes,
propeller or sensor nodes. No mesh, equipment, anchor, driver or triangle is added.
Geometry/winding undergo only the existing Z reflection. Original meshes, UVs,
material identities, three PNG payloads/map bindings and static rest hierarchy
remain exact; explicit PBR defaults and orientation/provenance metadata are the
only serialization additions. Mixed opaque atlas glass is still unverified.

Identity root, metres, -Z forward/+Y up, waterline Y=0. Derived full/static bounds:
X=[-5.935983181,5.935983181], Y=[-1.5,14.067999840],
Z=[-21.299999237,21.513000488]. Raw Z=[-21.513000488,21.299999237].
With no motion, rest and continuous swept bounds coincide.

### Catamaran collision, not a filled waterline box

Five conservative boxes match actual connected components. They are not exact
hull shells and do not fill antenna height:

| Component | Min XYZ | Max XYZ |
| --- | --- | --- |
| Port pontoon (`collision.hull`) | [-5.868505001,-1.5,-21.299999237] | [-2.915494919,2.25,21.299999237] |
| Starboard pontoon (first additional component) | [2.915494919,-1.5,-21.299999237] | [5.868505001,2.25,21.299999237] |
| Connecting deck | [-5.855999947,2.099999905,-13.631999969] | [5.855999947,2.819999933,19.170000076] |
| Lower cabin | [-4.026000023,2.799999952,-8.946000099] | [4.026000023,5.900000095,7.242000103] |
| Upper cabin | [-3.355000019,5.25,-8.946000099] | [3.355000019,6.949999809,-1.277999997] |

`compileGeometry` consumes one primary hull, a deck, then `island_components`.
That ABI's first additional component is explicitly the second pontoon, NOT a
superstructure claim. The next two are cabins. `island_bounds` is reporting-only,
not a collision box; never substitute its aggregate for the separate solids.
The central waterline tunnel remains empty, with connecting deck only above
Y=2.099999905. Fine static fittings/canisters have no separate collision proxies.

Independent serialized tests compare all five boxes to actual source components
and test triangles and boxes at five translated/yawed poses: 100 longitudinal
tunnel misses across X=-2..2/Y=-1..2, zero phantom hits, plus 25 positive rays into
both pontoons, connecting deck, lower cabin and upper cabin. Direct execution of
the actual unchanged `compileGeometry`/`fittedHit` confirms those same 100 misses
and 25 hits, empty controls, null gun and empty launches. This is projectile
collision proof only. The existing vertical heightfield still returns the deck
roof over the tunnel and CANNOT model under-deck aircraft airspace. No core or
physics changes disguise that limitation.

`articulation:[]`, `main_gun_geometry:null`, `launch_origins:[]` and supported
weapon capabilities `[]` are strict. Objective-only true, player kind null and
runtime_consumed false. Parent may bind an unarmed NONCAPITAL AI objective.
Missile-boat naming and static canisters grant no weapon capability. No invented
propulsion anchors, player control, cockpit, ASW or sensor functionality.

### Fresh browser-free gates

The reproduction commands above pass with four models. Independent checker:

```text
PASS wings_type022_houbei: 2988 triangles; 2 exact static nodes; controls/gun/launches absent; 5 source-component boxes; 125 rotated triangle/box rays, 100 tunnel misses / zero phantom hits
PASS: 17614 triangles; 12 exact/CRC/decoded PNGs; 72 poses; 175 actual-static-triangle/box bore-or-catamaran rays; 44 pre-write overwrite negatives + 6 corrupt CB90/Type022 outputs + unowned-path negative; all 44 retained GLBs, 12 fighter entries and old vessel descriptor bytes exact; reproducible outputs
```

All three older model checks remain mandatory. Every retained-GLB overwrite,
corrupt new raw/derived/rig output and unowned path rejects before mocked mkdir
or write. Both touched Python files compile without cache writes; catalog 129
unique IDs/schema/Git-backed URLs and scoped diff whitespace pass. No JS changes,
so touched-JS syntax is not applicable. Global maintenance validation still stops
at `Commit inspected source changes before validating its inventory.` with parent
and Delegation 62 paths dirty. Parent owns final manuals/inventory reconciliation.
No browser, install, build, new game, runtime third-party load, weapon capability,
publication or push. Native pixels, PBR/glass realism, hardware performance,
under-deck aircraft physics and gameplay acceptance remain unproven.

## Four supplied carrier-shaped objectives (Delegation 79)

The authenticated archive above supplies all four original GLBs and pristine
rigs. No supplied code executes. The same existing generator reuses fighter
reflection and escort GLB/component helpers; there is no second conversion
pipeline. The schema stays an OBJECT with `models:Array(8)`, not a raw array.
Only four descriptors and twelve raw/derived/rig files are appended. The first
four descriptors retain serialized SHA256
`b842aad5732bb3e523cc9bc7aa81b5c1d8c9e9f0330ef979defc6ea088461c6e`.

| Source slug | Raw / derived bytes | Triangles, unchanged | Raw SHA256 | Derived SHA256 |
| --- | --- | --- | --- | --- |
| `wings_charles_de_gaulle_r91` | 559588 / 559800 | 6048 | `710d89240f0493d66d7e0982fc8cad4d9e5485a4ca6cd819420ff3452dd50610` | `c29b71d3299927d13198a1c7b61abb77d3959203d506b2c95c9056b1347b55f7` |
| `wings_queen_elizabeth_class` | 592336 / 592556 | 6550 | `e631d38a98fff7c75220d818ab5ed6f20dc9097d56749ae7bdd5cbf536ed23e7` | `a11cdaedf40116d9ae92bad1cfa07a71c8ccbb5d5e2273ca2a646bdd9b855661` |
| `wings_liaoning_type001` | 578588 / 578796 | 6320 | `62efc4a166bf3d53a197aa43dd92f7a4e21cd3b2eccb49fa0a0f4b24a0ee116a` | `3d0f0f05afc77ff7a1b5069a4da1634adf6779f13c76b1bd33cc0199f4ecd1d3` |
| `wings_admiral_kuznetsov_project1143_5` | 622108 / 622332 | 6820 | `566d2422ca21b208a37b0d11f929ac4058613912e4a78aa12f6f70a6e19143d4` | `922e49409191a903830a72e38c9f082d30613648ac91efb6ad92a24d43697ff7` |

All original meshes, UVs, PNG payloads, textures/samplers, material identities,
metre scale and hierarchy remain. Only the existing Z reflection/winding repair,
orientation/provenance extras and explicit glTF factor defaults change. Each
model has three byte-exact embedded PNGs. Mixed opaque atlas response is qualified
source preservation, not native decoded pixels or corrected glass.

### Source-calibrated solids and propellers

Identity `vessel_root_waterline`, -Z forward/+Y up, waterline Y=0. There is no
universal rescaling, recentering or renamed legacy hull. The asymmetric Charles
de Gaulle X interval [-32.180000305,31.536399841] remains. Liaoning and Kuznetsov
share source overall bounds but retain their different full static meshes,
triangle counts and fittings. No copied defensive-weapon descriptor is added.

Each hull and deck is its own measured connected component. The following
zero-based component IDs are calibrated to the strict source hashes and
independently checked from serialized geometry:

| Model | Static component count | Hull/deck | Separate island solids | Separate static ramp components | Total fitted boxes | Actual screws |
| --- | --- | --- | --- | --- | --- | --- |
| Charles de Gaulle | 304 | 0 / 1 | 229,230,265 | none | 5 | 2 |
| Queen Elizabeth | 338 | 0 / 1 | 243,244,274 and 282,283,313 | 203,204 | 10 | 4 |
| Liaoning | 303 | 0 / 1 | 232,233,270 | 192,193 | 7 | 4 |
| Kuznetsov | 326 | 0 / 1 | 232,233,270 | 192,193 | 7 | 4 |

Queen Elizabeth retains two distinct islands with an open inter-island deck,
not an aggregate wall. Island solid tiers/funnels stop at Y=42/45/42/42 m,
while full visual maxima are 57.779999/50.464001/60.759998/60.759998 m.
Masts/antennae do not fill collision height. Flat deck tops are respectively
18/20/18/18 m. Actual sloped ski-jump mesh components remain static on the last
three models; the checker requires changing source surface heights along them.

Existing `collision.island_components` ABI means ADDITIONAL SOLIDS here. Its
trailing ramp boxes are not semantic islands. These conservative component
AABBs fill space below a sloped ramp's maximum height and can overestimate curved
hull/deck footprints. They are not exact mesh collision, walkable decks or real
carrier operations. `island_bounds` remains reporting-only, never a replacement
aggregate collision box. Fine fittings, lattice masts and appendages have no
separate collision proxies. Full/static/continuous bounds remain available.

Actual source screw pivots stay reflected at their original rest translations;
axis -Z remains -Z under the existing signed-axis reflection. Only the supplied
2/4/4/4 propeller nodes appear in `articulation`, matching existing spinner
channels. Full-turn continuous bounds use the maximum actual vertex XY radius
about each Z pivot, with measured local Z extents. Twenty poses per screw include
analytic extremal angles, verifying pivot/radius invariance, containment and
attained envelope extrema. No propulsive performance or mechanical rig is
inferred. Queen Elizabeth's supplied FOUR screws are retained as source art,
NOT certified twin-shaft class geometry. Correcting that requires separate
reference/geometry work; this lane does not silently remove two screws.

### Fresh browser-free gates and holds

Both reproduction/check commands above pass. Aggregate output bytes are
**8223704 < 8700000**; every derivative remains **<1000000 bytes**. New
raw/derived/rig bytes total 4716506, plus descriptor growth 34402. Identical older
outputs are skipped. Strict pre-write allowlist, source/rig hashes, exact new
carrier re-derivation, retained pins, symlink checks and 2 GiB floor remain.

```text
PASS carriers: Charles 40 poses / 150 rays; Queen Elizabeth 80 / 195; Liaoning 80 / 175; Kuznetsov 80 / 175
PASS: 43352 triangles; 24 exact/CRC/decoded PNGs; 352 poses; 870 actual-static-triangle heights/box/bore-or-catamaran rays; 93 pre-write no-mkdir/no-write negatives
```

Carrier rays measure full actual static-triangle heights at five translated/yawed
poses (0,.37,-1.2,pi/2,pi), calibrated against original source heights, alongside
fitted box-height/footprint tests. Includes ramp slope and the twin-island gap.
This independently verifies Python geometry evidence; runtime JS/native binding
belongs to parent and is not claimed by this no-Node asset-only check.
Old CB90 frozen-ramp and Type022 100 tunnel-miss/25 positive-ray proofs remain.
All 56 preexisting GLBs, including J20 raw/derived, 17 fighter metadata/repair
entries and original fighter rigs, prior four extension entries, the legacy
26-entry BASELINES ABI and old two-capital manifest remain exact. Thirteen
historical coalition-flight receipts are compared byte-for-byte to `0edc4834`.
The current 17-fighter whole-file SHA pins are updated, not weakened or bypassed.
Both touched Python sources compile in memory; catalog129 unique IDs/schema/
Git-backed URLs and scoped whitespace checks pass. Parent owns final manual and
inventory reconciliation; a dirty-source global maintenance result is not PASS.

All four remain UNARMED NONCAPITAL AI objectives: geometry and visual screw
animation only. `main_gun_geometry:null`, `launch_origins:[]`, supported weapon
capabilities `[]`, objective-only true, player kind null, runtime_consumed false.
Source supplies NO gun, launch or deck-animation controls. No naval weapons,
runway/deck services, air wing, player driving or ship seats are invented.
Native serviced runways remain HELD; existing passive native launch carriers
are unchanged. No realistic carrier-operations, native PBR/pixels, human input,
performance, gameplay, class certification or independent originality/license
acceptance follows. User-reported GPT provenance/scoped permission remains
qualified. No new game, browser, install, server, publication or push.

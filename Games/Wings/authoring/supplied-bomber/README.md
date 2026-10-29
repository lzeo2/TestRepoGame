# Supplied Tu-160: asset-only arcade fit

## Study before authoring (Delegation83, baseline1b652d1b)

Read CODE_QUALITY, manual232 tail, remaining-delivery, READY handoff, aircraft
quality/model/study/acceptance/v2 brief, complete fighter generator/checker,
shared escort geometry and blocked-helicopter guards. Inspected actual aircraft
registry/converter, bomber stores/doors, camera and combat/shared-ammo consumers.
Current entry/tree match inventory (370files/38864136B). No supplied code ran.

Measured original fa18/a10/yf12/apache/b2:16896/17576/18028/11322/4740 triangles,
151/166/123/202/96 materials. F15/F35:41352/40812 triangles,12 materials each.
Native rigid conversion starts from composed source rest transforms; only listed
pivots animate. Static exhaust_* glow scales existing emission by0.35. Existing
B2 doors, art, stealth and cameras are not a Tu160 template. Current bomb has
8 shared rounds,900 damage, native gravity/drag/TTL; both seats alias one magazine.
Current native muzzlePosition has NO bomb-list ABI: parent must implement eight
centroid origins and shared visibility later, not use missile-tip/%2 fallback.
No runtime registration or integration acceptance is provided here.

Actual source:120580B/2924tri, seven nodes, no canopy node/bomb pivots/bay geometry.
Wing rest quaternions are source +/-20degrees around Y (axially reflected on
normalization), frozen exactly, not a yaw driver or sweep schedule. Full composed
rest span is49.473357m, NOT maximum55.7m. Tailplanes pitch conservatively at.22rad;
central rudder yaw at.28rad. No fabricated roll surfaces, gun, gear or doors.

Static material1 is actual glass: four forward components at Z-18..-14.8 after
reflection. Material4 is safety markings, NOT glass; it must remain byte/value
exact. Only actual glass gets the established dielectric BLEND alpha.26 edit.
Some front glass lies below the solid source body roof. Eye selection must use
an actually exposed measured glass section with positive body/glass roof gap;
no aperture, interior or copied bomber camera. Native cockpit pixels remain HELD.
Four material3 alloy components are actual rear outlets: X centers +/-4.77 and
+/-3.23, Y-1.4, rear face Z13.75. No guessed class offsets.

## Bounded proposal and qualifications

Eight generic EXTERNAL arcade bomb tubes in two rows X+/-1.1 and four Z sections
-6,-2,+2,+6. Each small pylon attaches by actual vertical underside intersection;
store height must clear its full measured footprint and all original meshes,
including composed frozen wings and signed tail poses. Release anchors are
exact symmetric store centroids, not tips. No fuselage cutting or old B2 art.
This is NOT a real Tu160 external/internal load, bomb caliber/weight or certified
mechanism. Both seats must SHARE8 rounds later, bomb-only with no gun/missiles.
Four static warm cores use afterburning:false VISUAL ONLY, not a claim that the
real Tu160 lacks afterburners. No cone/flame/boost brightness/stretch/shader/clock.

Archive SHA256:4e37a104ba356790f6f9a0632c99d34b77dc023649e3cab830d895ec55c471d8.
Raw SHA256:705f494bc379b7371c7acd0dde80f18e5002874cc7b498ff27a684b1509f6b0e.
User-reported GPT originals and scoped permission are not independent originality,
license clearance, engineering accuracy or manufacturer endorsement. Existing
upstream rights and native visibility/human/performance holds remain. Helicopter
BLOCKED records and quarantined candidate remain unchanged. Parent owns manual232,
inventory and native integration after separate geometry review. Only eight new
paths belong to this lane; no existing source/metadata/catalog/art is modified.

## Reproduce (stdlib only, no browser/server/install)

```
python3 -B Games/Wings/authoring/repair-tu160.py --archive SOURCE_ZIP --check
python3 -B Games/Wings/authoring/repair-tu160-check.py --archive SOURCE_ZIP
```

The record contains measured full bounds, original/normalized rest transforms,
continuous single-tail-control bounds, glass/roof sections, eight attachments,
store clearance/drop rays and outlet faces. CPU geometry checks are not rendered
acceptance. No publication, registration, native or release PASS is implied.

## Measured candidate

Raw120580B/2924tri, SHA256
`705f494bc379b7371c7acd0dde80f18e5002874cc7b498ff27a684b1509f6b0e`.
Derived199816B/3724tri, SHA256
`83cfe2e45141d6917520d89b6aa579dbecf5756518cdbed1151a280f4718e791`.
New GLB aggregate320396B<700000B; both individually<512000B.

Bomb centroid pairs (X+/-1.1): Z-6/Y-2.249981, Z-2/Y-2.319114,
Z+2/Y-2.246706, Z+6/Y-2.169528. Each entire XZ store rectangle has
at least0.20m vertical separation from actual source triangles. Closest
store/store bounding-axis gap is1.5999999m. Full source geometry includes
actual lower outboard engine pods and composed frozen wings, not a static box.
Four core anchors: X[-4.77,-3.23,+3.23,+4.77], Y-1.4000001, Z13.758;
actual alloy rear faces are at13.75. Static warm emission[.12,.045,.012].

Eye[-.62999997,1.74181976,-16.48000031] uses the exposed left forward pane:
actual body roof1.70830989, glass section1.75618113, gap0.04787124m. This
small supplied-envelope clearance does NOT accept cockpit visibility or imply
an interior. Four thin glass components remain in their original static mesh.
Only glass material1 changes, per primitive assignment; safety material4 exact.

Serialized checker:21 pure-input tail poses,24 individual signed-tail surface
poses plus full rest,5800 downward/outlet rays,120 identity/full-rotation world-
vertical release rays,94 corrupt-output/disk no-mkdir/no-write negatives. Volume
integration independently matches all8 release anchors to actual bomb centroids.
Every normalized source-buffer byte is checked, including original UV/image/
padding. Full256x256 RGB PNG decode/CRC and literal output pins pass. First
checker attempt incorrectly expected RGBA; corrected to the actual RGB header,
not changed image bytes or weakened CRC. Reproduction and memory compilation
pass. Catalog remains129, with no game added. All66 old GLBs,17fighter and8fleet
entries,13random receipts plus declared Rafale/Yak receipt, blocked helicopter
intake and quarantine remain byte-exact to1b652d1b. Native/pixels/input/hardware/
rights remain HELD. Parent owns manual/inventory reconciliation, not this lane.

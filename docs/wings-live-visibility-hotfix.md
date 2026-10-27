# Wings live visibility hotfix against deployed 532c9ee0

## Report and inspected release

User reports ordinary flight with no resolved other aircraft/boats and Factions
without visible vessels/effects. The supplied gameplay image shows F-15 rear view,
558km/h,761m, ship HUD markers at3.7/4.2km, a horizontally banded dark cloud layer
and sharp lower edge. Marker presence does not establish resolved vessel pixels.

Compared deployed`532c9ee0` to source checkpoint`fd0e87fb`: retained source and
all authoring files were identical; the deployed index/assets were a rebuilt
original-UI entry. Deployed build metadata names actual main/game/scene entry
chunks, not an authoring viewer. An exact ignored32-file/3,459,778-byte index/
asset snapshot was extracted from Git for targeted reproduction; no models/fonts
were copied. New work changes actual retained source, never minified bundles.

## Root defects and repairs

- `0b8f8fd6`: cloud ray-proxy back faces can be beyond cameraFar while their
  participating medium is in range. At761m the old coverage edge is4.4743degrees:
  a medium interval starts at4633.33m while its top proxy is31300m away. Clamp
  proxy clip Z only, preserving XY/W, world rays, density/extinction, view/light
  sample budgets and opaque-depth clipping.132 numeric cases include64 old
  false-clips. Horizontal-stripe causation and final native pixels are unproven.
- `60bf8490`: Factions authority snapshots updated hull poses/HP but never fed
  existing native effects. Connect authenticated shots/projectiles/impacts/sinks
  to existing tracer/muzzle/ship-hit/explosion/splash pools. Deduplicate events,
  reject stale events and clear on reset/leave. No second physics clock, damage
  change, extra RAF or fabricated effects. Added read-only entity/ship/fleet FX
  debug DTOs for normal-entry QA; no controls or scene handles exposed.
- `ac853471`: registered F-15/F-35 kinds had zero bot weight. Include both through
  the existing native weighted bot selector, preserving original-five weights and
  existing model/weapon/flight paths. This is real bot-model reuse, not ingestion
  of the separate unregistered foreign-aircraft collection. Solo remains explicitly
  AI-free; Play with bots still uses its original actual room/snapshot path.
- `ef697768`: Factions configured zero bots and the bridge rejected any nonzero
  bot count. Support static integer0..2 bots per team only; reject dynamic fill,
  wrong teams, invalid/excess counts and later reconfiguration. Factions now starts
  two native bots/team through RoomEngine, the same seat/owner/provenance/collision
  rules and the same reused aircraft views. No diagnostic-only enemies.

Original menus, controls, player aircraft-only selection, model bytes, actor
flight, friendly-fire/native-collision precedence and capital authority stay intact.
Existing native ships use non-frustum-culled instanced hulls. Actual serialized
ordinary allies/enemies and converted GLB view pose/scale/bounds pass CPU checks;
these facts do not prove the user's absent-vessel pixels are fully repaired.
Source day fog retains about47% contrast at4km (night about0.65%); no unsupported
fog removal, distance scaling, moved objectives or weather downgrade was used.

## Targeted checks actually run by parent

```text
native-ai-roster-check: all7 weighted kinds; both jets native fire;24 real rooms;
  Solo empty; bounded Factions native allies/enemies with actual bridge PASS
retained-host-bridge-check:15 actual retained-host groups PASS
local-session-check:7 local/ordinary entity and FX groups PASS
  real FX once/stale/reset/leave; ordinary GLB views; native Factions4AI;
  player ammo600->589 / enemyHP989.1999999999998; pause/disposal/15s reset
sky-visibility-check:132 numeric rays/64 previous clips PASS
 18 actual GLSL/WGSL sky/cloud graphs PASS (standard/reversed/log depth)
node --check touched authored JS; scoped git diff --check PASS
```

Fixtures are explicit CPU geometry/loader/timer instrumentation, not native
texture, pixel, physical controls or compositor acceptance. No full-suite rerun.
The obsolete unsupported-bots assertion in the roster check was replaced with
actual bridge-backed allied/enemy spawn assertions, not removed to get green.

## Actual reproduction state and remaining gates

The baseline normal-entry Play with bots reproduction was prepared with balanced
quality (cloud layer enabled), original F-15 spawn key and normal flight/fire keys,
no state grants. It **did not launch**: another lane owned the single-browser
reservation. No browser/root process was killed or interrupted.

Shared free space then dropped from2,363,416,576 to2,161,541,120 bytes. This remains
above the2,147,483,648 floor but below the existing build30MiB/native32MiB reserves.
Recovery ticket`pi-667665-1793094417327-c98784df` requests operator-side free space
of at least2,214,592,512 bytes; remaining build/evidence growth is bounded24MiB.
No disk-floor waiver, cleanup, install, permission change, security weakening,
forced frames, relaxed timeouts, fake gameplay image or unchanged failed launch.

Required follow-up when the guarded route permits it: regenerate the original
served entry with exact existing tools; compare deployed532c9ee0 and fixed entry
at identical camera/time/quality. Check actual enemy aircraft and vessel pixels,
cloud edge/stripes, real normal-input Factions effects and absence of new errors.
Do not turn this source-check receipt into native acceptance. Known release risk
approval remains a release-owner decision, not a reason to fabricate PASS.

## Scoped release handoff

Sole release owner remains`74b61fa7`; this lane does not push or race main.
Apply only the committed source/authoring/test delta against deployed532c9ee0,
plus this receipt and the reviewed Wings manual/inventory row. Regenerate served
HTML/chunks/build metadata/verification outputs from source using
`scripts/build_wings.mjs` and exact existing Three0.186.0/esbuild0.28.2. Preserve
release HTML attribution/notices and newer main-only changes; do not wholesale
merge this branch's inherited history. No new runtime dependencies or model packs.
Parent closing commit and pinned patch identify the final reviewed snapshot.
Technical native/pixel limitations above remain disclosed; no green-only release
HOLD is being issued to supersede the user's known-risk push approval.

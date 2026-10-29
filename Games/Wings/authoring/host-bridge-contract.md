# Retained host bridge contract

Original adapter: `createRetainedHostBridge({mode:'factions', config, rosters,
onSnapshot})`. Config uses the existing fleet authority; rosters are two arrays
of retained aircraft kinds. Optional trusted `onSnapshot(playerId, safeFrame)`
feeds presentation. Other modes return null without side effects. Public methods:
`beforeStep`, `afterStep`, `allow`, `reset`, `paused`, `setPaused`, `dispose`,
`snapshot(room, playerId)`, `aircraftRoster(room, team)`, `stats`. No public
authority handles or new clock. The roster getter returns a frozen copied
allowlist for the bound room/team. Shared vehicle creation, native bot selection,
crew fallback and human spawn/boarding enforce it; no disallowed fighter fallback.
The original UI now selects genuine NATO-inspired/Eastern-inspired starter
profiles: F-16C/Typhoon/Rafale C/Gripen/Mirage2000C/FA50/HawkT2/A10C/F35A with Type45/Aquitaine/CB90 versus MiG-29/Su-35S/JF-17/MiG-31BM/Su-34/Yak130/Su25SM/J20/Tu160. NATO has Type45 capital/Aquitaine/CB90/Charles de Gaulle/Queen Elizabeth; Eastern has Type054A capital/Type055/Type022/Liaoning/Admiral Kuznetsov. These fictional coalitions use supplied lookup membership, not renamed aircraft. Nine NATO and nine Eastern aircraft are integrated, with all five supplied AI-only vessel objectives per side. Only the two original flagships are capitals. CB90 has no gun/launch/sensor/player-control capability and its ramp stays
closed; it is not a capital. Type022 has no articulated controls or weapon/sensor
capability; its static canisters do not enable missiles. Its measured twin-pontoon
collision preserves the water-level tunnel, without promising under-deck aircraft
physics from the native heightfield. The four supplied carrier hulls are unarmed NONCAPITAL objectives: generic1000HP/speed12 arcade settings, not real-class performance. Their measured propellers number2/4/4/4. No weapons, sensors, launch origins, air wing, recovery, serviced runway, player seats or operational carrier capability is inferred. Existing passive native launch carriers remain unchanged.

All six prior units, IDs, geometry, weapons, HP, stats and routes remain exact; four hulls append after them. Only named-composition arena eligibility expands to X[-2350,2750], Z[2500,3300], with unchanged bottomY-40/cell20/obstacles. New home hulls travel X-2100 to-1900; enemy hulls travel2500 to2300. Charles/Liaoning useZ2720, Queen/KuznetsovZ3080. Both choices pass native water/seabed probes and conservative full-route/all-yaw swept separation from every old/new route. No AA/ASW capability is inferred.
Ordinary selection has twenty-four registered aircraft, original7 plus supplied17; previous specifications remain. Numbered launch shortcuts stay1-9; additional rows use arrows/Enter.

The [ten-vessel CPU receipt](../../../docs/wings-local-native/ten-vessel-production-check.json) records both unchanged138.7s battles, all four original guns firing, four new zero-fire hulls, actual ten-model loading/HUD contacts, two capital bars and shared safe-client/trusted component-height parity. Geometry component boxes are conservative; ramps are static AABBs, not continuous sloped deck physics. Native pixels/input/listening/performance and release acceptance remain held. User-reported GPT provenance/scoped supplied-asset permission is not independently verified originality or clearance of upstream rights.

## Current retained host integration

`retained-host-wiring.mjs` authenticates exactly combat, room-engine and loopback
preimages and applies reviewed hooks/context transforms without writes. The
separate hash-pinned native collision delta follows that ABI. Tests reject drift,
repeat and foreign files and compare actual source to these artifacts. The loader
executes actual current TypeScript using Node's `stripTypeScriptTypes`, not a
replacement host. No generated bundle editing or weakened source guard.

Loopback passes the bridge into RoomEngine. Message authorization precedes normal
dispatch. A denied spawn emits the normal protocol error before returning; the
bridge previously rejected it silently before the later onSpawn error branch.
Team/boarding/turret denial and all ownership guards remain. `beforeStep` follows
native fleet synchronization, and `afterStep`
uses native results/reset. Pause stops the accumulator before any tick advances.
Exactly two teams with static 0..2 native bots/team are supported; dynamic fill,
other counts/teams and later bot reconfiguration reject. Real GameSession/lobby
and local Factions now consume it; the older isolated delivery receipt is history,
not a claim that these consumers remain absent.

The trusted `combat.hostFleet` binding supplies:

- `surfaceHeightAt(x,z)`: current measured live surface bodies only. Stale binding/
  combat callbacks return null; disposed calls reject. Shared native flight and
  safe client prediction overlays preserve higher terrain/decks, without creating
  a serviced escort runway or replacing the flight engine.
- `surfaceSegment(a,b)`: pure instantaneous first measured surface-hull fraction,
  with the same stale-binding protection. Native bomb steering uses the earlier
  of native terrain/ships and this hull ray, without calling a damage method.
  Client prediction/HUD use only their safe visible-frame counterpart.
- `botTargets(team)`: immutable bounded per-faction safe visible surface contacts,
  with only ID/team/kind/capital, copied position and measured above-water deck
  aim point. No model IDs, HP, hidden/submarine pose, geometry or authority handle.
  Empty/unmodelled/hidden contacts never fall back to legacy carrier targets.
  RoomEngine passes contacts to actual bot strike/defend/gunner logic. Native
  terrain/hull clearance, air combat, readiness, aim cones and flight remain.
- `resolveProjectile(p,from,to,maxFraction,damage)`: only real accepted cannon20,
  chaingun30, gau8, Hydra rockets and direct native bombs. Returns false or immutable fitted impact
  fraction/position. Native aircraft/terrain/ship ties win; FC owns fitted hull
  damage/sinks/results. Existing gun range/ship scaling applies; rockets use their
  actual damage/ship scaling. Rockets retain native aircraft splash at that point,
  with no second FC splash/damage or uncensored duplicate native explosion event.
  Existing faction-safe impact events drive native ship-hit FX. Direct bombs use
  unchanged native 900 x 3 ship damage, gravity/drag/TTL/steering budgets and
  shared-slot ammunition. Fitted hulls consume them, including friendly blockers;
  aircraft blast applies once with no duplicate legacy ship damage or crater.
  FC near-miss area damage is still absent; native misses retain their original
  water/terrain/legacy-ship impact behavior.

Initial provenance requires actual projectile-array membership and a live current
occupied allowed aircraft/player/team. Captured owner/vehicle/team/weapon survives
launcher death/disconnect. Copies, mutations, stale bindings/rounds, paused/ended
matches reject. Native ammo/cooldown/spread/gravity/TTL are unchanged. Reset/dispose
clear provenance and contexts. Empty sweeps do not consume replay capacity.

## Runnable checks

```sh
node Games/Wings/authoring/retained-host-bridge-check.mjs
node Games/Wings/authoring/native-factions-rockets-check.mjs
node Games/Wings/authoring/native-factions-targets-check.mjs
node Games/Wings/authoring/retained-fleet-targets-check.mjs
# These checks also use the existing approved THREE_ROOT and ESBUILD_ROOT:
node Games/Wings/authoring/native-factions-bombs-check.mjs
node Games/Wings/authoring/native-faction-rosters-check.mjs
node Games/Wings/authoring/native-fighter-pair-check.mjs
node Games/Wings/authoring/faction-picker-check.mjs
node Games/Wings/authoring/local-session-check.mjs
```

These execute actual native input, bots, projectiles and fleet authority using
explicit CPU poses, not ordinary-input native gameplay. Additional actual-model
view/surface/FX checks require the existing approved external Three/esbuild tools.
No dependency installation, new game or push follows from these checks. The
supplied pair adds pristine originals and reproducible derivatives without
changing existing GLBs. See [remaining delivery](../../../docs/wings-remaining-delivery.md).

Missile locks/guidance, FC bomb near-misses and AI bombing, ASW/AA fleet
reconciliation, the remaining three supplied aircraft and native vessel acceptance,
selected-map context and served weather still require implementation. Native
pixels/normal flight acceptance remain open. Ordinary mode retains its original
fleet/weapon paths; unsupported Factions bomb/seeker fits do not fake compatibility.

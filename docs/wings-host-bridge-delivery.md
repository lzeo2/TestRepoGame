# Wings isolated host-bridge delivery

## Current local-engineering update

The subsequent operator local-integration-only order authorizes actual retained
source wiring and local tests, without push/publication/redistribution or any
license conclusion. The [local playable receipt](wings-local-integration.md) now
supersedes this artifact-only technical boundary for that local scope: original
lobby/GameSession/HUD, direct host source and shared supplied-model rigs are
wired and source-built into an ignored loopback-only entry. Earlier checkpoints
and the unsent publication-permission draft below remain historical; they are
not a reason to halt the newly authorized local engineering.

## Delivered scope

Branch `fix/wings-isolated-delivery` uses its own worktree/index. No shared-index
queue, old-repository edits, installs, downloads, model copies or push. Two scoped
workers only; the second timed out once, then completed its single retry.

- `Games/Wings/authoring/retained-host-bridge.mjs`: original adapter against the
  retained `RoomEngine`/`CombatState` ABI. The actual host owns flight, seats,
  accepted fire, ammunition, cooldowns and native aircraft/terrain collision.
  Existing fleet authority owns fitted fleet hits, friendly obstruction, HP,
  sinks and capital outcomes. Its safe model/pose/event frames go to the optional
  `onSnapshot(playerId, frame)` consumer, not a second combat implementation.
- `retained-host-wiring.mjs` in that directory: add-only, SHA-256-pinned application
  artifact for the actual retained `src/sim/{combat,room-engine,loopback}.ts`.
  It returns patched text without writing source or carrying gated preimages.
  It adds the gun sweep boundary, room request/clock/objective/reset hooks and
  loopback disposal. Drift, repeated application and foreign files reject.
- `retained-host-loader.mjs` and `retained-host-bridge-check.mjs`: apply those
  additions **in memory to the actual tracked TypeScript**, then execute real
  RoomEngine/loopback/flight/combat via Node 22's experimental TypeScript
  transform. These are not stub engines or copied battle gameplay.
- `fleet-sim.mjs`: replayable trusted host segments reuse existing fitted hit and
  damage/sink logic. Native nearer hits and ties win. Sustained empty segments
  do not fill replay history; adjacent clocks coalesce. Sunk events preserve
  victim faction and separate attacker attribution. Existing battle is not rebuilt.

The [adapter contract](../Games/Wings/authoring/host-bridge-contract.md) gives the
local API. `onSnapshot` receives faction-safe copies compatible with existing
fleet presentation state, never authority/replay handles. No assets are duplicated.

## Fresh verification

From repository root, all commands exited 0:

```text
node Games/Wings/authoring/retained-host-bridge-check.mjs
13 actual retained-host integration groups passed (in-memory TS, not served/native GPU)
PASS 111 original source/UI/bundle/patch files byte-unchanged
node Games/Wings/authoring/fleet-sim-check.mjs
PASS 22 original standalone FC groups
node Games/Wings/authoring/fleet-session-check.mjs
PASS: 9 session groups
node Games/Wings/authoring/fleet-weather-check.mjs
PASS 7 FC/weather integration groups
```

Actual buffered host input proves cannon magazine/cooldown, accepted burst events,
fleet damage, ten seconds sustained fire, friendly hull blocking, nearer native
aircraft damage, faction/boarding/turret restrictions, pause, victory, the native
15-second reset with fresh CombatState, restart and once-only close/disposal.
Follow-up `886ef504` also proves accepted rounds survive launcher death/disconnect
with original team/source/weapon and exactly one ammo spent; unregistered copies,
mutated identity and obsolete/reset CombatState callbacks reject. Provenance is
captured once only after initial live ownership/roster validation, then cleared
on reset/disposal. The old-code death failure was reproduced before fixing it.
Mechanical fixtures position actual spawned aircraft for deterministic aim; this
is not natural flight. A separate 30,000-segment replay regression passes.

Existing `verification/{astra,solo,lighting}-check.mjs` each exit 0. All six
changed/new JS modules parse with `node --check`; whitespace passes. Catalog:
`PASS catalog 129 unique IDs/schema/tracked URLs`. No games added or registered.
No new runtime external loads. At the initial delivery checkpoint, inventory refresh
changed only Wings: 232 files / 24,334,739 bytes, tree
`e351b88501825feb7de2c629f705b374c00cdc2c`; catalog and all other rows agree.
The unchanged maintenance checker exits 1 on the existing
`Missing docs/maintenance/games/001-brainrotboulevard.md`, not a coverage PASS.

## Exact remaining acceptance/deployment gate

**Not served Factions.** This is the requested bounded original bridge plus an
application-tested wiring artifact, not installed host output. All original UI,
source, HTML, models, generated bundles and `port.patch` remain unchanged.
No browser was launched: this artifact has no served rendered entry to verify;
a capture of the unchanged game or old diagnostic battle would not test it.
No browser-slot reservation, persistent server or full-fleet run was made.

The bounded bridge supports two human-only factions and accepted straight
`cannon20`/`chaingun30`/`gau8` rounds. Bot factions reject. Missile/bomb/ASW paths and
fleet AA versus host aircraft are not bridged. Accepted in-flight gun rounds now
retain their authenticated provenance after launcher death/disconnect. Replay remains bounded to 4,096 state-changing actions. Existing native
fleet/world/spawn geography remains present in the in-memory candidate; suppressing
or mapping that generic fleet, matching the selected authored map and attaching
shared supplied-model rigs/weather to GameSession are still necessary before a
real Factions game. Ordinary-mode shared-model wiring and the original-style
separate start control are not installed. No replacement menu/debug UI was added.

**Withheld action:** materialize the host additions and complete that GameSession/
map/render wiring, then source-build matching output/patch and verify one bounded
normal-input visual session. Existing applicable upstream permission is still
unresolved; no new upstream-derived delivery is authorized here. The retained
editable source is available at `Games/Wings/source/games/wings/`; inaccessible
upstream HTTP endpoints are not a source-location blocker and were not retried.
Once that gate is resolved, acceptance is actual aircraft fire changing the same
visible fleet HP/outcome through the original UI, pause/menu/restart disposing
once, aircraft-only ordinary selection and no duplicate generic fleet. Public
publication/push remains a separate decision; no push in this run.

### Permission-request draft only; not sent

Please confirm permission from the relevant rightsholders to adapt Wings at
`anomalyco/arcade` revision `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`
and applicable contributions, and redistribute its compiled browser output on
this project's public static site, retaining required attribution/notices.
Please separately confirm coverage of the eight retained original GLBs:
`a10`, `ac130`, `apache`, `b2`, `carrier`, `destroyer`, `fa18`, `yf12`.
Identify any conditions or exclusions. This request does not concern the user's
separately supplied GPT-generated models, whose scoped user-reported permission
remains distinct; Three/font notices are retained and do not license Wings.

## Delivery checkpoint

- Worker commits: `c3b12df0` core API; `03c98c79` actual-host tests/loader.
- Parent integration: `bba145f1`, adapter/artifact and sustained-fire/replay fixes.
- Storage preflight: **2,295,914,496 bytes free**; closing source/inventory
  checkpoint: **2,289,090,560 bytes free**, growth **6,823,936 bytes** (including
  worker logs/Git overhead). This is below the 50 MB phase cap; the 2 GiB floor
  was never waived. Final documentation commit adds only this small receipt and
  inventory/link updates. Worktree is clean after that commit.
- No new games, served UI changes, screenshots, upstream code copies, external
  permission request, publication or push. Stop this bounded lane here rather
  than repeating source/license studies or unrelated cosmetic work.

### Auto-continue correctness checkpoint

One scoped implementation worker delivered `886ef504`; parent reviewed the diff
and independently reran **13 host +22 core +9 session +7 weather =51 groups**,
plus touched-JS syntax and whitespace checks, all exit0. All111 host/UI/bundle/
patch baseline files remain byte-identical. This closes a concrete permissible
adapter defect, not the source-host deployment gate. The existing served-mode
acceptance and unsent permission decision above remain unchanged; no browser
was justified by this nonvisual fix. Fresh root preflight was2,282,119,168 free
bytes, above2GiB; no waiver or destructive cleanup was used. Closing measurement:
2,286,632,960 free bytes (observed root increase4,513,792 bytes, not attributed
to this lane's work). Inventory refresh changes only Wings to232 files /
24,340,300 bytes, tree`c2e7e8ca05a27cff62d4429dc3460095b0a18465`.
The unchanged coverage checker still exits1 on the existing missing Brainrot
manual. Source fix`886ef504` and reviewed checkpoint`cf489459` are committed.
No game was added; original UI is preserved; no captures, publication or push.

**SWARM_NEEDS_OPERATOR:** before the remaining host materialization/GameSession/
map/render build can proceed, supply applicable rightsholder permission covering
adaptation of the pinned Wings source and public compiled hosting, plus the eight
original GLBs identified in the unsent draft above. This is a request for actual
permission evidence, not a guard waiver or another bare GO. This bounded original
bridge lane has delivered and verified its permissible correctness follow-up;
do not start unrelated fixes or repeat upstream/license/browser probes while
that decision is absent.

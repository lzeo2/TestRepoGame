# Wings remaining delivery checkpoint

## Serial integration qualification

The owner-source history below is retained at `f98e2529`. Serial integration
selects ONLY the full `5b3065df` source alternative atop reviewed local `0736c207`,
not the older appended alternatives. The rebuilt26 files/4,122,701bytes exactly
match tree SHA256 `493d45e73a1ff5714ea83b91c613311f7dd3692f35be0364314c1d59fcca07db`.
Fresh scoped CPU/generated checks pass; native failures and remaining implementation
limits below are not waived. No push/deployment/native acceptance is inferred.
All references below to a missing001 manual belong to historical source-lane
checks: the serial base already has canonical blob
`74161bc691998ff33544456863f44433824e3c31`; unrelated inventories/manuals are preserved.
The serial receipt records actual source/build SHAs and current coverage separately.

Quality mode remains active. This is an implementation milestone, not whole-game
completion or native acceptance. Sole release owner: `74b61fa7`. This lane does
not push or reset newer main. Original Anomaly UI, aircraft-only selection,
notices and existing model bytes remain intact; the restored supplied pair adds
pristine originals and reproducible derivatives. No inference settings changed.
Current integrated source **5b3065df**, host binding **ed563114**; helicopter
assets **37d885bb**, native **ee8c6c59**, independent clearance **3ea48c9e**.
All **20/20 genuine supplied aircraft and10/10 vessel objectives** are registered;
ordinary27=original7+supplied20, named coalitions10aircraft each. AH64D/Mi28N now
use validated repaired derivatives and actual helicopter dynamics/rotors, not jets.
Raw source collisions and failed fin-only repair remain immutable evidence;
partial5feb3a26/efa89ed6 and their quarantined patch are NOT standalone READY imports.
Carriers remain unarmed noncapital objectives, not operational launch/recovery/
deck-service implementations. Source readiness is not native acceptance. Exact scoped integration
and original-UI build identity: [READY handoff](wings-ready-integration-handoff.md).
Historical random16kind coverage remains FAIL; current20kind full-pool sampling
is unrun. Separately declared Rafale6/6 and Yak1307/7 normal airborne births PASS,
not a rewritten random result. Thirteen older receipts remain exact.
No native graphics/input or new release acceptance.
Prior359d4758/56270348 and68f4a4df/6f55a197 checkpoints remain dated below.
New source is not a verified public release.

## Scope/status matrix

| Area | Actual status | Still missing |
| --- | --- | --- |
| Ordinary aircraft / AI | Live `885cbb2` has seven kinds. New source registers supplied F-16C/MiG-29/Typhoon/Su-35S/Rafale C/JF-17/Gripen/MiG-31BM/Mirage2000C/Su34/FA50/Yak130/HawkT2/Su25SM/A10C/F35A/J20/Tu160/AH64D/Mi28N, twenty-seven native kinds with positive bot weights and preserved previous-twenty-five specifications. | All20 supplied registrations are integrated in source. Per-class operational fits, native aircraft pixels and acceptance remain open. |
| Ordinary AI vessels | New source adds one measured, unarmed Type45 escort per team, reusing the existing GLB/PBR resources. Legacy carriers/destroyers, formation, seats and all 68 AA slots remain. | Release-owner integration/native acceptance. This is not the complete ten-vessel roster or a newly equipped escort. |
| Named faction selection / distinct rosters | Original menu selects NATO-inspired F-16C/Typhoon/Rafale C/Gripen/Mirage2000C/FA50/HawkT2/A10C/F35A/AH64D with Type45/Aquitaine/CB90/Charles/Queen versus Eastern-inspired MiG-29/Su-35S/JF-17/MiG-31BM/Su34/Yak130/Su25SM/J20/Tu160/Mi28N with Type054A/Type055/Type022/Liaoning/Kuz and swaps actual friendly/enemy profiles. Original hangar, human/direct spawn, bots/crew/respawn and boarding use authoritative distinct lists. | Source registrations:NATO10/10,East10/10; all5/5vessel objectives each. Historical random16kind FAIL preserved; separate declared Rafale/Yak and helicopter birth/takeoff fixtures are not full-pool results. Current20kind full-pool random sampling unrun. Current menu layout, native3D and human acceptance remain open. |
| Factions battles / results | Live code has two modeled flagships, four native AI aircraft, separated 2,800 m starts, reciprocal fleet fire, finite HP/sinks/capital outcome and 15 s reset. New source fixes HUD targets, false AA avoidance and aircraft/hull contact. | Source includes all ten vessel objectives, two capitals, four armed and six unarmed hulls. Safe gun/rocket/direct-bomb/near-miss damage and AI bombing have CPU integration evidence. FC seeker guidance, operational carrier fits and ASW remain unfinished; normal-input/natural-battle evidence is open. |
| Maps / weather | Three deterministic maps and five presets work in original modules, with placement/privacy tests. | Still not the served terrain/flight/worker/weather lifecycle. No functional served selector, shared map context/cache epochs or complete weather render/sensing integration. Preview controls are not gameplay. |
| Submarines / ASW | Original generic submarine asset/rig and core depth/contact/uncertainty/privacy/counterplay checks exist. | No served submarine scenario or player ASW role. Measured escorts lack a compatible actual ASW launcher. Keep incompatible compositions fail-closed, without invented mounts or hidden poses. |
| Simulation-driven effects | Live shots/impacts/sinks use native FX. New source connects existing motion foam and HP smoke/fire, and points original HUD/radar at the actual safe FC hulls. | Pixels, readability and wave conformity remain unverified. Mean-sea foam/deck-proxy damage anchors are not photorealism or full-class realism. |

## Implemented source

Prior frozen bomb/roster source: **`e539b2d3`**, following `91d0b195` and `0a562f92`.
Supplied-pair checkpoints `5dac8f90`/`4ce2ddb9`, picker `328bd965` and the parent
named-profile integration below advance it. Earlier builds/patches remain dated.

- `9c989add`: initial ordinary supplied-model reuse, explicitly partial because
  collision consumers did not yet agree. Do not release this commit alone.
- `6ef2107c`: preserves exact legacy carrier/destroyer specs and armed formation;
  adds AI-only `escort` IDs `t{team}-type45-escort`, 3,000 HP, no player seats or
  weapons. Four total/two active at two teams. The same Type45 uses 5,962 triangles,
  five shared instanced PBR batches and three textures, not another model pack.
- `12041cbf`: geography/projectile segment hits and surface height share measured
  component boxes. Correct measured draft and island gaps; retain legacy 15 m
  draft. Strict source application/drift/repeat guards remain.
- `6d46b793`: actual local Factions uses SeaView with `water:false, impacts:false`;
  host mode suppresses duplicate rig transients. Safe simulation ticks, motion
  and HP drive bounded foam/smoke/fire; native ocean/combat FX stay sole owners.
- `d20379c6` / `12041cbf`: original Factions HUD previously showed FC HP but native
  carrier positions/AA. Existing markers/radar now use cloned safe FC poses/HP;
  empty/hidden/dead frames never fall back to native carriers. Correct rig yaw,
  not mirrored navigation yaw. Ordinary markers remain on their native path.
- `e9f6a6c1`: shared native AA capability excludes the new unarmed escort from
  warning/radar/no-fly/safe-zone umbrellas without removing physical collision.
- `160ff6c0`: actual RoomEngine combat context disables nonexistent native AA
  avoidance and safe-zone target/fire gating for Factions bots only. Ordinary
  pilot/gunner behavior and physical hull/terrain clearance remain.
- `e9e68819` / `de5ff348`: pure fitted surface query uses the same current body
  boxes as fleet hits. Trusted host reads authority; client reads only visible
  safe-frame models. Actual authoritative flight, bot ground lookahead and both
  client prediction/replay paths consume the shared overlay. Base terrain/decks
  win when higher; escorts are not serviced runways/moving decks. Client queries
  omit hidden hulls; both omit dead/unmodelled hulls. Trusted authority retains
  physical hidden surfaces. Reset/disposal cannot retain stale callbacks.

The flight contact is the native vertical heightfield model, not full wing,
under-deck or continuous rotating-airframe sweeps. No whole-vehicle physics claim.
The later direct-bomb section supersedes the original unsupported bomb boundary;
it does not imply near-miss area damage, missiles or AI bombing.

## Targeted verification

CPU fixtures, not native pixels or ordinary input acceptance:

- Ordinary reuse: actual GLTF geometry/PBR, legacy preservation/separation,
  movement, HP/sink/reset/disposal, Solo/Bots/Custom and aircraft-only vehicles.
- Collision: 145 component heights, 74 island-gap negatives, 576 actual native
  terrain/seabed orbit samples; legacy draft preserved.
- AA: 55 unarmed-escort safe-zone negatives; three actual bot/context groups,
  including pilot/gunner cached-target reset and actual RoomEngine lifecycle.
- Surface overlay: 3,672 yaw/translation/component probes, 256 island-gap
  negatives, core/bridge/client/rig parity and privacy/lifecycle. Actual native
  `stepFlight` and RoomEngine crash against the fitted hull where native sea alone
  misses. Execute both real controller flight callsites with actual physics.
  These use disclosed CPU poses, not a claimed flight playtest.
- Fifteen actual retained-host groups and seven local/ordinary entity/FX/session
  groups pass, including cannon ammo 600 to 589 / enemy HP 1,000 to 989.2,
  automatic capital result and native 15 s reset.
- Actual-host sea cues: foam 6 / smoke 2 / fire 1, unchanged 138.7 simulation-second
  outcome, pause/reset/ownership/cleanup checks.
- Actual `main.ts` in-memory compilation, authored syntax and whitespace checks;
  19 emitted JS/MJS parse and 129 catalog IDs/schema/Git URLs validate.

Prior frozen `de5ff348` build: **26 files / 3,861,518 bytes**, exact existing
Three 0.186.0 / esbuild 0.28.2. Generated import/HTML/CSS/worker closure passes,
without copying models/fonts or editing bundles. Bounded local HTTP readback
passes **45/45** entry/build/model/font byte hashes and runtime MIME checks; server
closed. Receipt: `wings-local-native/remaining-build-readback.json`. This is local
served identity, not browser execution or public deployment. Local bounded serving:

```sh
python3 -B scripts/serve_wings_local.py --build .tmp/wings-remaining-de5ff348 --seconds 180
```

Exact 26-path source/authoring patch against live `885cbb2`:
`.tmp/wings-remaining-de5ff348-source.patch`, 153,338 bytes, SHA256
`c6e21eb7ff9096fe24728677e6fa39abce317a346679ce71e50df9d15592ec5f`.
Apply narrowly/three-way through the serial owner, never wholesale merge/reset.
No production bundle/entry was changed in this branch. Models/fonts/credits and
catalog are byte-unchanged. Global maintenance checker reaches the existing
`Missing docs/maintenance/games/001-brainrotboulevard.md`; Wings inventory
was reconciled there at 257 files / 24,582,708 bytes, all other rows preserved.
The 0a562f92 inventory was 260 files / 24,621,040 bytes; 91d0b195 was
261 files / 24,636,332 bytes. Latest e539b2d3 is 264 files / 24,692,750 bytes,
with all unrelated rows preserved.

An earlier combined command timed out after partial local-session output. The
unchanged suite subsequently completed all seven groups alone under a 240 s
bound; the partial attempt is not promoted. A new surface test initially reused
an old synthetic frame after advancing the real room and correctly hit its rewind
guard; the fixture now uses the advanced frame, without weakening that guard.

## Safe bot targets and accepted rockets (AUTO-CONTINUE follow-up)

`8206ba8e`, `77f90ca3` and parent integration `0a562f92` implement the next
concrete weapon/target slice, not another renderer retry:

- Trusted RoomEngine requests immutable faction-safe, alive, modeled surface
  contacts. Aim points lie inside measured above-water deck geometry. No model
  identity, HP, private pose or authority handles are passed to bots. Per-binding
  caches reset with the native clock/binding; empty/hidden/unmodelled contacts
  cannot fall back to legacy carriers.
- Actual native bots use these contacts for strike, friendly-fleet defence,
  cached-target removal and gunner aim. Gun-only F-15 pilots can select strike;
  supported gun/rocket readiness, native lead, cones, jitter and flight controls
  remain. Bomb/seeker fits do not fake FC targets or waste attacks on legacy ships.
- Accepted Hydra rockets enter the same fitted swept resolver with strict native
  obstruction/tie precedence. Native ammo/gravity/spread/TTL/provenance remain;
  direct FC damage applies once, existing native aircraft splash applies once.
  Safe FC impact FX remain the only vessel-impact presentation owner. No duplicate
  native explosion event leaks the fleet position. Guns retain their old scaling.
- Original menu/hint copy now says guns and rockets, without new UI/player seats.
  Exact source guards remain; reviewed ABI/collision preimage pins are updated to
  the new canonical implementation, not broadened to accept arbitrary source.

Fresh CPU results: 4 standalone target groups, 3 actual target-producer/RoomEngine
integration groups, 10 actual rocket groups, 15 original host groups, 3 AA-context
groups and 7 local/ordinary entity/FX/session groups pass. Surface/view checks,
actual main.ts compilation and sea-cue battle/reset also pass; the latter still
reaches its 138.7 s outcome with foam 6/smoke 2/fire 1 in the unchanged seed.

A real native bot in a disclosed approach-pose fixture spends GAU-8 ammo
1,100 to 1,087 and produces its own attributed fitted FC impact, enemy HP 997.9.
Real warthog/Apache Hydra cases spend 38 to 37 for HP 1,000 to 904; native aircraft
interception, friendly obstruction, splash, death/disconnect, copies/mutations,
reset/pause/outcome and sustained-fire checks pass. Actual opaque-weather source
snapshots omit hostile bot contacts; unsupported/unmodelled cases fail closed.
This proves CPU integration, not natural-flight performance or native pixels.

Fixture failures were preserved and corrected without changing production guards:
start after the real six-second spawn protection; classify weather weapons as
visual; use an explicitly anonymous legal legacy proxy for the unmodelled
negative rather than a mast-height symmetric box outside validated water.
Technical advice ticket `pi-667665-1793108870197-e0480b52` records these corrections;
it is not permission or a visual acceptance decision.

Prior build `.tmp/wings-targets-0a562f92`: **26 files / 3,867,087 bytes** using
existing Three 0.186.0/esbuild 0.28.2. Entry/import/CSS/worker closure, all 19 emitted
JS/MJS syntax and 129 catalog IDs/schema/Git URLs pass. **45/45** actual bounded
local HTTP file bytes/MIME match; server closed. Receipt:
`wings-local-native/targets-build-readback.json`. No public delivery is inferred.

Serial-owner patches, preserving newer main:

- Since prior `de5ff348`: `.tmp/wings-targets-0a562f92-incremental.patch`, 73,665 B,
  SHA256 `89b6926c76724a959a98d04b8789031162d2f8bae9dc209db2e777196defb10c`.
- Full source/authoring delta since verified live `885cbb2`:
  `.tmp/wings-targets-0a562f92-source.patch`, 213,679 B, SHA256
  `2bbc577e9cfa526c5eda38a777a3fa6b921120733ae7e3462bc80a7f98679128`.

No asset/model/provider changes, new game, browser attempt, push or guard waiver.
Missile/bomb/ASW paths, full roster/composition, maps/weather and native acceptance
remain unfinished. Do not apply either worker's partial API change alone.

## Same-binding freshness and unforced flight (Hermes batch 228)

`46835dd9` fixes a reproduced authority-boundary defect: a successful fitted
impact could kill a hull after `botTargets` had cached it, so another read through
that SAME live binding still returned the dead contact. One invalidation at the
successful authority-impact boundary refreshes both factions. Misses retain the
cache; previous immutable DTOs are not rewritten. Actual accepted-Hydra tests
cover lethal removal, friendly/private obstruction, no new pose disclosure and
reset/disposal, using explicitly declared 1-HP CPU fixtures, not production HP.

Parent replay passes **4 safe-target integration / 10 rocket / 15 retained-host
groups**, including unchanged exact TypeScript/preimage/drift/repeat guards.
No retained TypeScript or bot controller changed from 0a562f92.

`91d0b195` adds an unforced retained-simulation regression: normal carrier spawn,
standard room configuration, four native bot slots/native respawns, real flight
controls, ammo/fire, accepted projectiles and fitted FC damage. A passive adapter
always delegates the real binding and records each projectile's first callback,
actual launch phase and target ID, then matches the safe impact by source, weapon,
position and host/authority tick. It grants no poses, controls, HP, ammunition,
skill or RNG state and installs no second flight/target/damage implementation.

Final bounded run: **actual exit 0**, 108 wall seconds, three cases, each reaching
its genuine 138.7 simulation-second capital outcome:

| Room code | Aircraft FC impacts | Deliberate strike impacts | Aircraft FC damage |
| --- | --- | --- | --- |
| `fc-targets-boundary` |0|0|0|
| `fc-natural-flight-1` |7|7|9.45|
| `fc-natural-flight-2` |2|2|2.7|

The zero-hit case remains; this is not a guarantee of fleet hits in every seed.
All nine positive impacts trace to projectiles launched during `strike` against
that matching FC ID, not an inference from aggregate role/ammo counters.
Full stdout/stderr, exit status, source pins and projectile records are retained
in `wings-local-native/unforced-fleet-flight.json`. Script/log SHA256 are recorded
and the script/receipt/case correlations were independently verified by parent.

The first worker timed out before collecting its bounded child's result. Its
older PASS text has **unknown exit status**, not a promoted pass. The bounded
retry strengthens projectile correlation and captures exit 0; no AI source fix,
positive-case filtering, forced controls or renderer retry was used.

Prior `.tmp/wings-safe-targets-91d0b195`: **26 files / 3,867,100 bytes**, exact
existing tools, import/entry/CSS/worker closure and 19 emitted script syntax PASS.
**45/45** local HTTP hashes/MIME match; server closed. See
`wings-local-native/safe-targets-build-readback.json`. Catalog 129 and unchanged
model/font/credit bytes validate. Global maintenance check still reaches only
pre-existing missing `001-brainrotboulevard.md` after inventory reconciliation.

Serial-owner incremental patch since 0a562f92:
`.tmp/wings-safe-targets-91d0b195-incremental.patch`, 17,588 bytes, SHA256
`9f0e36d391d411a20dbd040a498b22515c1a626cb5136422360f06098a4a5832`.
Full source patch since verified live 885cbb2:
`.tmp/wings-safe-targets-91d0b195-source.patch`, 229,456 bytes, SHA256
`0a20c66e2af76dd77aa6adcda51f6e790f85d2457d4cdb0b157f908108386504`.
Preserve newer main; do not apply both blindly or push from this lane.

These are **CPU flight-simulation/integration checks**, not rendered native flight,
human input, target-device performance or public deployment acceptance. Existing
native visual concerns and broader implementation gaps remain open.

## Direct bombs and faction roster enforcement (requested Codex retry)

The first delegation32 exited with exact error **`Codex error: The usage limit
has been reached`**. Per explicit user instruction, one retry used the SAME
`openai-codex/gpt-6.1-sol` and succeeded; no provider/model/tier switch or retry loop.

- `15311df1`: pure measured core `surfaceSegment`, visible-safe client ray/contact,
  all four original bomb predictions, original HUD release/under-ship/HP cues and
  steering rays now use fitted FC surfaces. No padded footprint or private contact.
  False Factions-only bomber AA-safety indication is removed; ordinary UI remains.
- `f4ccb5b9`: accepted native B-2 bomb drops hit the existing fitted damage resolver.
  Unchanged damage is 900 x 3 = 2,700: declared 4,000-HP fixture reaches 1,300;
  production 1,000-HP capital sinks. Shared-slot ammo 8 to 7, gravity/drag/TTL,
  native-ground/ship ties, friendly obstruction and retained provenance remain.
  Aircraft blast applies once; safe fleet impact FX owns presentation, without
  duplicate native ship damage/crater/explosion. Native misses remain identical.
- `d27e946c`: fixes bot/direct-spawn bypass of faction allowlists. Shared vehicle
  creation rejects forbidden kinds before mutation; human errors remain normal
  protocol responses. Bots/crew/fallback choices use only the bound team's legal
  registered kinds, without disallowed fighter fallback. Ordinary output/RNG
  matches executable pre-change code. Synthetic distinct lists are test fixtures,
  **not invented NATO/Eastern service rosters**.
- `e539b2d3`: guarded host read-only ray and immutable roster getter, actual steering
  binding and strict canonical source/preimage integration. The original menu/hint
  says local prototype and direct bombs, not completed named coalitions.

Parent passes **16 bomb / 6 roster / 15 exact-host / 7 local-session groups**;
1,740 ray probes and real GLB/HUD/ray/prediction execution pass. The roster check
includes 2,000 ordinary/all-seven choice/RNG comparisons, two ordinary room output
comparisons, three 120 s distinct synthetic-roster rooms and three natural
respawns. Actual bound measured steering is exercised without damage queries.
A first parent replay completed its 16 assertions then correctly failed missing
approved tool environment; rerunning with existing THREE_ROOT/ESBUILD_ROOT passed
compilation and the full check. No assertion or physical guard was relaxed.

**Still absent:** FC bomb near-miss area damage, AI bombing and missile/seeker
integration. Direct-hit support is not called complete bomb warfare. All evidence
is CPU/in-memory/local HTTP, not rendered native flight or ordinary human input.

Fresh `.tmp/wings-bombs-rosters-e539b2d3`: **26 files / 3,871,314 bytes**, exact
existing tools, dependency closure, 19 emitted-script syntax, 129 catalog checks
and **45/45 local HTTP hash/MIME checks** pass; owned server closed. Receipt:
`wings-local-native/bombs-rosters-build-readback.json`. No model/font/credit/catalog
changes, installs, browser attempt, new game or source-lane push.

Increment since91d0b195: `.tmp/wings-bombs-rosters-e539b2d3-incremental.patch`,
86,253 B, SHA256 `5f1816bdc98538f56ba3f978981235159e3215d739eb78dde57415b36ef4a81d`.
Full source since verified885cbb2: `.tmp/wings-bombs-rosters-e539b2d3-source.patch`,
299,750 B, SHA256 `86f6146099d574606dc0ddd53a81ce41a89eaf1be3b3fde6fb531d727b5f09b6`.
Use appropriate narrow three-way integration through the sole serial owner.

## Restored archive and genuine named-coalition starter (2026-10-28)

The user supplied the missing archive at a safe boundary; no delegate was
cancelled or provider/model changed. SHA256 is exactly
`4e37a104ba356790f6f9a0632c99d34b77dc023649e3cab830d895ec55c471d8`.
Fresh intake verifies65 safe unique paths/no symlinks, CRC,64 non-self manifest
hashes/byte counts, all30 GLB/rig identities and control-node references, embedded
resources and20 standard/30 faction slots. The manifest self-hash is explicitly
null. No supplied script ran. The earlier search failure and restoration ticket
`pi-667665-1793181743041-0fa72a4f` are superseded, not an ongoing asset blocker.

Delegations36/37, unchanged `openai-codex/gpt-6.1-sol`, returned4ce2ddb9/5dac8f90:
pristine F-16C/MiG-29 GLBs and original metadata, reproducible -Z derivatives,
real controls, gun/four stores/exhaust, native kinds, geometry-derived hardpoints/
cameras, supplied PBR bindings, distinct flight tuning, audio and bot weights.
Raw derivatives are2,636 triangles/143,888B and3,384 triangles/169,088B; actual
native templates are2,832/3,776 triangles. Original geometry/UV/images and all
existing GLBs remain exact. User-reported GPT provenance/scoped permission is
retained, not independent rights or photorealism certification.

328bd965 and parent wiring preserve original MenuNav/hangar/HUD. The coalition
choice dispatches an immutable local profile through actual GameSession/host:
NATO-inspired F-16C + Type45 against Eastern-inspired MiG-29 + Type054A. Choosing
Eastern swaps both actual aircraft and modeled vessel membership. Supplied lookup
IDs validate membership; this is fictional coalition grouping, not current
alliance membership. No renamed U.S. mesh or generic-team rename substitutes.

The hangar filters rendered rows, detail, displayed-index number keys, crew and
thumbnails. Empty/invalid/unready lists fail closed. Native human/direct creation,
bots, fallback, crew, boarding and respawn enforce the same per-team lists.
Per-session escaped HUD/scoreboard/result names never mutate ordinary globals.
The new protocol-negative test exposed an earlier silent bridge denial before
onSpawn's error. Shared handle now emits the existing normal spawn error without
weakening authorization. New armor entries prevent non-finite incoming damage.

Fresh CPU evidence:15 exact-host/9 local-session groups, both actual named
adapters and opposite real bot kinds/models, foreign-kind wire errors and genuine
accepted new-kind cannon impacts. Impact approach/protection poses are disclosed
fixtures. Pair checks cover6,300 old-seven flight ticks, actual GLTF/converter,
rig/stores/exhaust/PBR bindings, lock/fire/ammo/regen and finite incoming damage.
Roster check keeps2,000 original-seven subset choices/RNG plus2,000 ordinary/
all-nine choices/RNG, two actual ordinary outputs and all synthetic-partition
negatives. Comparing unequal7/9 populations first failed; coherent baselines
retain both proofs. Actual original-menu dispatch, picker/HUD checks and main.ts
compilation pass. Collector22 readiness/10 lifecycle fixtures include wrong-side
metadata rejection. Snapshot-order/queued-wire fixture mistakes were corrected,
not production state grants. Advisory ticket `pi-667665-1793187393483-cf34f425`
first timed out; later Hermes batch234 independently reviewed531c845d and confirmed
the minimal fix preserves security/ordering. This is technical review, not approval.

**Partial scope remains explicit:** one of ten aircraft and one of five AI-only
vessels per coalition, not the full20/10 integration. Original passive launch
carriers are not newly supplied carrier classes. F-16C uses cannon20/aim9 plus
officer maverick; MiG-29 uses cannon20/aim9 plus officer aim9, arcade fits. Fleet
hints advertise cannon/air combat, not unavailable rocket/bomb choices or completed
FC seekers. Native aircraft/cockpit/material pixels and human flight/combat remain
OPEN. An exact-entry menu-only batch is separate from exhausted renderer routes.

Unforced follow-up **6b29238c** runs both selected coalitions for120 simulation
seconds using normal native carrier spawns, four default-skill bots and no pose,
input, HP, ammunition, skill or RNG grants. Actual exit0 in50.150 wall seconds.
NATO/Eastern cases record11/5 aircraft births,213/121 real projectile births and
5/21 accepted FC impacts, damage6.75/28.35; both kinds achieve ordinary airborne
movement in both cases. All26 impacts correlate to actual launch phase=strike,
source/owner/weapon/position/ticks and paired positive damage. Outcomes stay null;
no completed battle, native input/rendering or broad natural-strike acceptance.
Parent independently matches all source/script hashes and26 impact records in
`wings-local-native/named-coalition-flight.json`. The receipt's conservative
`naturalStrikeAcceptance:false` remains unchanged.

Exact runtime build **531c845d**:26 files/3,899,493B, local dependency/HTML/CSS/
worker closure and19 emitted-script syntax pass. **49/49 local HTTP bytes/hash/MIME**
match, including new raw/derived models and both OFL notices; server closed.
The first audit counted47 by omitting notices and failed its planned49 assertion;
the complete replay includes them, not a relaxed check. Receipt:
`wings-local-native/coalition-build-readback.json`.

One original-entry menu-only batch passes **8/8 in16.9s**: both actual choices at
1280x720/390x844 under dark/light preferences, no overflow, three44px rows,
no page/console errors, failed or external requests. Parent reviewed all eight
plus the retained initial menu. Original fixed-dark styling is unchanged under
both preferences. No renderer/session starts; all owned browser/server resources
close. [Images/report](wings-local-native/coalition-menus/README.md) are menu-only,
not native aircraft/vessel/cockpit/material or flight evidence.

Full source/binary patch since885cbb2:
`.tmp/wings-coalition-6b29238c-source.patch`,918,345B, SHA256
`8e841e46942ebd64e0a9e46365c34aab5d606fefb3de029f51df645f8824aea9`.
Increment sincee539b2d3:
`.tmp/wings-coalition-6b29238c-incremental.patch`,634,640B, SHA256
`8de6478aa4b543b1c9ba85787ce8231731f2f1ca2e7be1849349254618158ff2`.
These6b patches are historical and superseded for delivery by359d4758 below.
Both reverse-check their frozen files; choose the proper narrow three-way delta through
74b61fa7, never apply both blindly or overwrite newer main. Four new model files
and original metadata must accompany code, not just menu labels.

Final Wings-only inventory is285 files/25,447,910B, tree
`fa94e5815661ff6791790949ad7c196bfbb609c1`; all other rows match unchanged.
Global checker reaches only the known missing001 manual. To avoid another upload
cache prune, the exact original archive is also retained in the assigned ignored
`.tmp/wings-source-intake/Wings_Base_30_Models.zip`,3,114,212B with verified SHA.
No new game, install, full-fleet run, source-lane push or publication claim.

## Final generated-check checkpoint359d4758

Actual generated Astra first failed its stale seven-kind assertion. Review then
exposed the old Request-only fixture's relative-URL assumption after the native
arrayBuffer helper; lighting also logged rejected derived paths despite exit0.
No failure was filtered. Shared Node-only `node-model-fixture.ts` resolves only
the reserved local origin and exact registered asset URLs, reads actual GLBs and
uses explicitly metadata-only PNG bitmaps. Foreign/unregistered/non-PNG negatives
reject; globals restore. Astra preserves all old assertions while expecting9 and
both new fits. Lighting now requires all9 templates ready, strengthening its gate.

Fresh source-built **Astra/solo/lighting3/3 PASS**,19 JS/MJS syntax,26 files/
**3,900,927B**, dependency closure and final **49/49 HTTP bytes/hash/MIME PASS**;
server closed. [Final receipt](wings-local-native/coalition-final-build-readback.json).
All22 browser runtime/HTML/CSS/notice files match the actual531c845d captures
byte-for-byte. Only Node verification/meta changes; no second browser launch.
Prior531/review failures stay retained. Advice ticket
`pi-667665-1793190125269-a4798f3a` timed out and remains advisory-pending; the
independently traced fix and full replay remove the code blocker, not a permission.

Final build `.tmp/wings-coalition-359d4758`. Source/binary patch since885cbb2:
`.tmp/wings-coalition-359d4758-source.patch`,927,758B, SHA256
`cdb8d3aa5c06cb296820e7cc8faabed5ea8ab2d956fdf0e6baa406318befa66e`.
Increment sincee539b2d3:
`.tmp/wings-coalition-359d4758-incremental.patch`,644,053B, SHA256
`6d91e536ccd5704b525677ffff3f4afbfdebf64176bbd58eb8f212567e64b43e`.
Both reverse-check current frozen files without applying. Serial owner chooses
one proper narrow three-way delta, including four new model files and metadata,
preserving newer main. No new game, full-fleet run, independent push or deployment.

## Four-aircraft expansion68f4a4df / unforced6f55a197

Continuing the authorized roster priority,400ce137/af7bbedb add genuine supplied
Typhoon/Su-35S, not renamed aircraft. Existing generator/descriptor ABI is reused
for four models, preserving all18 prior GLBs and old pair descriptors exactly.
New raw/derived budgets: Typhoon2,654/3,134 triangles,115,688/162,784B;
Su-35S3,058/3,538 triangles,126,788/173,856B. Native templates3,526/3,930 triangles.
Each has two measured exhausts. Actual canards/tailplanes/elevons/rudders use
conservative signed native-state drivers; no certified mechanical/TV-nozzle claim.
Fresh220 pose/216 clearance/4,984 source-surface ray checks pass, including
Typhoon canards, exact original UV/image/material identities and reproduction.

Parent68f4a4df adds armor/strict canonical pins and binds NATO[f16c,typhoon] versus
Eastern[mig29,su35s] to actual host/picker/HUD. Counts derive from registry data:
2/10 aircraft and1/5 vessels per side. Ordinary eleven retain1-9 shortcuts;
Typhoon/Su35 rows10/11 use arrows/Enter, not nonexistent multi-digit keys. Their
fits are existing arcade cannon/AAM/TV/Maverick mechanics with four stores;
Su-35S does not claim the wishlist six-round fit. Previous-nine source specs/rigs/
audio/cameras are unchanged; the ordinary bot pool intentionally gains two kinds.

Fresh parent15 strict-host/11 local-session/16 bomb/6 roster groups pass, with all
four real kinds taking finite incoming damage and causing fitted cannon impacts
in disclosed approach/protection fixtures. Both opposing kinds reject through
normal protocol errors. Actual original picker/menu/HUD and main compile pass.
Six-thousand7/9/11-population chooser+RNG comparisons and two actual ordinary
outputs retain coherent baselines. Prior seven6,300 + nine8,100 flight ticks,
all four real GLTF/rig/PBR bindings/weapon locks/fire/ammo/regen, distinct handling
and finite engine audio graphs pass; not native pixel or listening acceptance.

6f55a197 records one complete no-grant production-roster CPU pass, exit0 in53.918s:
two120-simulation-second/7,200-tick normal-carrier cases, four default-skill bots.
NATO:5 births,162 projectiles,**zero** FC hits; no Su35 birth/movement retained.
Eastern:10 births,225 projectiles,33 fitted hits/44.55 damage. All four kinds move
airborne across the two cases; both teams move in each. All33 actual strike-launch
owner/source/weapon/position/tick/damage correlations pass. Outcomes stay null;
natural-strike/battle/native acceptance flags remain false. Parent independently
matches source/script hashes and all33 records. The earlier two-kind receipt is
byte-exact, not overwritten. [New receipt](wings-local-native/expanded-coalition-flight.json).

Source68 build `.tmp/wings-four-fighters-68f4a4df`:26 files/**3,918,760B**, closure,
19 script syntax and generatedAstra/solo/lighting3/3 PASS. **53/53 local HTTP**
bytes/hash/MIME match including original/derived models and font notices; server
closed. [Readback](wings-local-native/expanded-coalition-build-readback.json).
One current menu-only batch **FAILS before faction selection** at8.084s:
`Page.captureScreenshot: Unable to capture screenshot` on the initial original
menu. No accepted image or8-case evidence, no page errors/failed/external requests;
renderer/session remain null and owned resources close. [Unfiltered failure](wings-local-native/expanded-coalition-menus-failure.json).
No unchanged retry. Prior531 images do not accept new longer labels/aircraft.

Final source/binary patch since885cbb2:
`.tmp/wings-expanded-6f55a197-source.patch`,1,356,487B, SHA256
`d7e90cf5f7d3292225f3389e952e73e3837e868e1968ba902fc1068d04d3515b`.
Increment since56270348:
`.tmp/wings-expanded-6f55a197-incremental.patch`,508,250B, SHA256
`6f0d27e0c87fd32d5e5b7c8768685053249b36fe19240e254bbc80ad1aaab0a0`.
Both reverse-check frozen source, not applied. They supersede prior delivery
patches; sole owner74b61fa7 chooses one narrow three-way delta including new
models/rigs and preserves newer main. No independent push or public-deploy claim.
Wings-only inventory291 files/26,074,397B, tree
`d73601f1441b63d46e8dc3ef2529aab53ded44d0`; every unrelated row preserved.
Remaining16 aircraft/8 vessels and broader combat/map/weather/ASW/native work are
unfinished. No new game, install, full-fleet run, model/provider change or waiver.

## Six-aircraft sourcee1e4dc37 / evidence0deb4f08, generation5d34ebc6

31658d34/7d9b0eff add genuine supplied Rafale C/JF-17 Block III, exact originals/
rigs plus reproducible derivatives. All22 preexisting GLBs and prior four model
entries remain exact. Raw/derived budgets: Rafale2,642/3,122 triangles,
114,880/161,964B; JF-17 2,708/3,108 triangles,116,228/156,088B. Actual native
conversion3,514/3,304 triangles. Rafale twin nozzles/canards versus JF-17 single
nozzle/tailplanes are measured, not replacements or invented feature anchors.
320 poses/320 clearance/7,168 source-surface rays and22 corrupt overwrite
negatives pass. Supplied provenance/permission qualification remains unchanged.

Parent e1e4dc37 binds actual three-kind profiles: NATO[f16c,typhoon,rafale],
Eastern[mig29,su35s,jf17], same measured Type45/Type054A flagships. Registry-derived
3/10 aircraft and1/5 vessels counts, original picker keys1/2/3, ordinary thirteen
with1-9 shortcuts and remaining rows via arrows/Enter. Existing cannon/aim9 plus
officer Maverick are four-store arcade fits. Rafale C is not relabeled naval M.
Armor/pins are exact; all six incoming-damage gates required. No new combat clock,
weapon ID, damage authority, aircraft substitute or player vessel.

Fresh15 host/13 actual-session/16 bomb/6 roster groups and generatedAstra/solo/
lighting3/3 pass; actual original menu/picker/HUD/main and19 emitted scripts pass.
Previous seven6,300/nine8,100/eleven9,900 flight ticks (24,300 total), prior engine/
audio/rig/control/camera parameters and8,000 coherent7/9/11/13 choice/RNG checks
remain. All six real GLTF/PBR/rig/store/exhaust/weapon/finite-damage paths pass.
New Rafale/JF-17 actual normal/boosted non-catapult takeoff, stall/turn/crash/reset
and chase/gunner camera checks are CPU fixtures, not native flight or listening.

**Coverage gate remains FAIL:**0deb4f08 is one85.439953026s run, exit1, three
fixed120s/7,200-tick production cases declared before execution; no grants,
additional seeds, retries or altered weights. CasesNATO/Eastern/NATO-mixed have
8/6/7 births,266/212/240 projectiles,19/24/4 fitted impacts and25.65/32.40/5.40
damage. All47 impact correlations pass, both teams fly each case, outcomes null.
Across cases F16C=2/Typhoon=5/Rafale=7/MiG29=6/JF17=1 move airborne, but
Su-35S has **zero births**, so required six-kind coverage fails at spawn sampling.
This is not proof that Su-35S flight is broken; old receipts remain unchanged and
are not substituted as a current PASS. Parent matches all183 source/tool/asset
hashes and47 records. [Retained FAIL receipt](wings-local-native/six-aircraft-coalition-flight.json).
Early-outcome branch is unexercised; no battle/native acceptance is inferred.

Exact build `.tmp/wings-six-fighters-e1e4dc37`:26 files/**3,935,279B**, closure,
19 syntax and generated checks3/3 pass. **57/57 local HTTP** bytes/hash/MIME incl
notices match; server closed. [Readback](wings-local-native/six-aircraft-build-readback.json).
The ticket-authorized one menu-only retry **passes8/8 in13.56s**, both coalitions
at1280x720/390x844 under dark/light preferences,44px/nooverflow/noerrors/no failed
or external requests. Parent reviewed all eight, names/counts readable and original
fixed-dark styling unchanged. [Nine retained images/report](wings-local-native/six-aircraft-menus/README.md).
No session/renderer starts; all owned resources close. Previous capture failure
remains unchanged; menu acceptance does not accept 3D models, cockpit, human flight,
performance or the failed unforced coverage gate. No gameplay-renderer retry.

Final full binary/source patch since885cbb2:
`.tmp/wings-six-0deb4f08-source.patch`,1,759,789B, SHA256
`eb64ceec2e5c419900237935f1ccac1e022fe31efbe7bab03a500f75da5f6c7b`.
Increment since9626f909:
`.tmp/wings-six-0deb4f08-incremental.patch`,473,154B, SHA256
`613dad5db6dcac546ec19033d4aac22b275bde9795e7df4b9ec0fde0ea741d99`.
Both reverse-check frozen files, not applied. Prior delivery deltas are superseded;
sole owner74b61fa7 chooses one appropriate narrow three-way patch including raw/
derived assets and rigs, preserving newer main. Source lane does not push. Catalog129,
no new games/installs/full-fleet run/provider/model change/waiver or destructive cleanup.
Wings-only inventory297 files/26,658,022B, tree
`8cfadfb9863a34300894e6a67d63dd3b9adaaf6e`; all unrelated rows preserved.
Remaining14 aircraft/8 vessels and broad combat/map/weather/ASW/native work remain.

## Four-vessel source69fc9e3f / unforced76db26e8

139ef265 retains actual Aquitaine FREMM/Type055 Renhai originals, supplied rigs
and reproducible derivatives; c75eed6a introduces named composition. Parent
69fc9e3f fixes only escort routes and integrates actual assets/UI/client queries.
NATO: Type45 capital plus Aquitaine noncapital escort; Eastern: Type054A capital
plus Type055 noncapital escort. Choosing Eastern swaps actual memberships.
Aircraft stay exactly F16C/Typhoon/Rafale versus MiG29/Su35/JF17, with unchanged
parameters. Ordinary carriers/destroyers/68 AA slots and old measured Type45
unarmed escorts remain unchanged. Original aircraft-only controls/menu retained;
no new game/catalog ID. Original menu truthfully reports3/10 aircraft,2/5 vessels.

New models: Aquitaine5,982 triangles,540,832 raw/541,244 derivedB; Type0556,014,
536,996/537,408B. Source geometry/UV/images retained, six embedded PNG maps exact;
70 signed poses/50 bore-clearance rays/26 overwrite negatives and reproducibility
pass. All26 previous GLBs/old descriptors are exact. No certified mechanical,
manufacturer/material/pixel/performance claim. Only real measured main guns use
existing1000HP/speed12/1200m/240mps/500ms/10damage/400round settings; no inferred
AA/missile/sensor/ASW role. New vessels are AI only and NOT capitals.

Failure retained: proposed diagonal escort route crossed native land at
(-163.223769,2902.269181). Worker diagnostic all-endpoints±260/escortZ2696 passed
water but Type45 fired0 due to the unnecessarily enlarged capital separation.
Parent keeps capital endpoints±180/Z3100 exact and uses horizontal escortZ2696
with endpoints±260. No shared aiming/collision/HP/weapon/arc change was needed.
An initial raw-array assertion misread the agreed schema-object/models:Array2
contract; test now strictly checks actual schema, archive hash and count.
[Staging failure record](wings-local-native/four-vessel-staging-failures.json).
Hermes advisory answered the earlier optional upper-interior-target proposal;
it was NOT implemented because preserving capital placement was the smaller fix.

Fresh [production receipt](wings-local-native/four-vessel-production-check.json):
5 groups,315,080 native-water probes,22,200 height/pose probes,11,100 friendly
separation checks, both choices. Each real1000HP battle lasts138.7 simulation
seconds,288 signed gun shots/275 damage events/one capital sink, both teams
receive damage and all four guns fire. Final HP620/230/0/400 for NATO
(enemy/enemy-escort/home/home-escort), swapped by Eastern choice. Native60Hz clock,
15-second reset/disposal, zero ammo, invalid TTL/unsupported round, expiry and
noncapital-sink nonvictory checks pass. Exact legacy factory and old ordered asset
export match executable2de5013c. CPU/model-state only, not native pixels/input.

Actual local-factions uses four proper GLBs/rigs; safe HUD/height/ray/contact
queries include escorts while capital bars remain2. Fresh15 strict host/13 actual
session/6 legacy scenario/16 direct-bomb groups, original picker/HUD/main, ordinary
fleet legacy-parity/AA checks and generatedAstra/solo/lighting3/3 PASS. Collector
24 readiness/10 lifecycle mocks require4 ships and retain the prior fail-closed
startup behavior. Syntax19 emitted files, dependency closure and diffs pass.

**New unforced FAIL**, SINGLE normal-production run, exit1/109.678s. Same three
predeclared cases, each120s/7200 native ticks, four default-skill bots, full actual
rosters, no pose/control/HP/ammo/skill/RNG/timing grants or seed/weight retry.
Births8/6/7; projectiles266/207/184; damaging hits19/0/4, damage25.65/0/5.40.
Both teams flew each case; outcomesnull. All23 original-launch/source/owner/
weapon/fraction/position/tick/actual-authority-unit correlations pass. All were
on Type054A capital: Aquitaine0 hits, Type0550, friendly consumption0. Missing
Su35birth0 again fails required six-kind movement coverage, not proof of a flight
defect. New observer correlates actual authority IDs, never assumes capitals,
and checks both faction-safe snapshots without changing production privacy.
336,237B [receipt](wings-local-native/four-vessel-coalition-flight.json), SHA256
`337a8b7d46a93c2d46aa0c411f331e807b5636a130b5c4472d3887e4fcaf75d2`.
202 source/tool pins and all30 GLBs unchanged. All three previous receipts,
including the six-aircraft FAIL, remain byte-exact. Native/natural-strike/battle
acceptance flags remainfalse; no early-outcome branch exercised.

Build26 files/3,948,353B; generated3/3,19 emitted syntax checks, localHTTP61/61
bytes/hash/MIME including all four added models/fonts/licenses PASS; server closed.
[Readback](wings-local-native/four-vessel-build-readback.json). One menu-only batch
8/8 PASS/13.664s at1280x720 and390x844, both coalitions, dark/light preferences.
Parent reviewed all8: all aircraft/ship names and2/5 counts fit,44px rows, visible
focus/no overflow/errors/failed/external loads. Original fixed-dark styling
unchanged; no session/renderer launched. [Nine images/report](wings-local-native/four-vessel-menus/README.md).
This does not fill native3D/human-flight or new-escort-aircraft-hit evidence gaps.
An extra synthetic-roster regression first exceeded a60s harness bound after its
first case; a single240s-bound retry completed all6 groups, including8000 choice/
RNG comparisons and three declared synthetic-partition rooms. This is not a retry
or PASS promotion of the failed production unforced cases.

Serial-owner source alternatives (reverse-checked, NOT applied; choose ONE):
- Full since885cbb2: `.tmp/wings-four-vessels-76db26e8-source.patch`,2,854,824B,
  SHA256 `a4bc4a88caf0d1fe844445deed9e7229cfb0eed6957e9e5fa93e36ac5af5aed8`.
- Incremental since2de5013c: `.tmp/wings-four-vessels-76db26e8-incremental.patch`,
  1,108,445B, SHA256 `a9d104b1f3a1e6d6b4bedeb9434b867e6583a48b67f35ff3e9ee362d83811705`.
Full uses the previous81-path source allowlist plus this slice, excluding generated
bundles/verification outputs. An initially over-inclusive10,163,867B candidate is
retained as `inclusive-NOT-DELIVERY.patch`; DO NOT APPLY it. Correct source deltas
include actual supplied/derived GLBs and rigs; rebuild with approved tools and
preserve newer main. Both alternatives supersede prior0deb4f08 deltas.

Current Wings inventory308 files/28,900,922B/tree
`16e0d551da2ff430b6147369f6e47dac59d9cde7`; unrelated rows unchanged. Global docs
checker still reports only historical missing001-brainrotboulevard.md. Remaining
14 aircraft/6 vessels and broad combat/map/weather/ASW/native work are unfinished.
Sole serial owner74b61fa7 integrates one appropriate narrow three-way source
patch, never combines a full and incremental alternative. No push in this lane.

## Eight-aircraft source0988bb0b / evidence8904ab67, Batch254

Continuation from78205694 adds genuine supplied JAS39C Gripen and MiG31BM:
e6a17c51 registers native kinds; bed94eff retains exact originals/rigs and derives
-Z-forward models through existing helpers. These concurrent commits are a pair,
not independently complete delivery. Parent0988bb0b binds actual NATO
[f16c,typhoon,rafale,gripen] versus Eastern[mig29,su35s,jf17,mig31], same four
vessels and validated routes. Original menu4/10aircraft2/5vessels, original hangar
keys1–4; ordinary15 uses1–9 plus arrows/Enter, no player vessels or new games.

Gripen raw2388tri/108908B, derived2788tri/148784B; MiG31 raw2626tri/123644B,
derived3106tri/170740B. Actual native templates2984/3498tri. Source vertices,
UV/images and approximate signed rigid pivots retained; actual Gripen canards/
single nozzle versus MiG31 tailplanes/twin rudders/nozzles. All30 old GLBs/six
previous descriptors and110 historical files exact. Reproducibility,430 poses/
424 static-clearance rays/9576 source-surface rays/30 pre-write overwrite negatives
PASS. Existing fleet generator's imported baseline ABI is preserved, not broadened
by changing its baseline map. User-reported GPT provenance/scoped permission and
unresolved upstream qualifications remain, not manufacturer/license certification.

Cruise/boost140/195 versus185/250m/s, light agile Gripen versus heavy fast
interceptor are conservative arcade tuning. Four ammo-linked stores each, Gripen
cannon20/aim9+Maverick officer, MiG31 cannon20/aim9+TV missile officer. No new
weapon/guidance, real-caliber/BVR, stealth, bay, gear or naval-variant claim.
Native descriptor PBR/control/gun/store/exhaust/camera/audio integration uses the
same real converter/physics/combat pipeline. Prior7/9/11/13 parameters/rigs/audio/
cameras and36000 flight parity ticks stay exact. Mandatory incoming native damage
is finite for all15 kinds; no pending-kind skip. New normal+boosted non-catapult
takeoff, turn/stall/crash/reset, lock/fire/ammo/regen and cameras PASS as CPU
fixtures, not human input, listening, decoded pixels or hardware performance.

Parent fresh15 strict host/15 session/16 bomb/6 roster/5 production-fleet groups,
10000 coherent7/9/11/13/15 chooser-RNG comparisons and two actual ordinary outputs
PASS. All8 selected kinds cause native cannon fitted impacts in declared approach/
protection fixtures; both extra new-kind cases also hit the real enemy noncapital
Type055/Aquitaine respectively, with ammo/HP changes. Those additional fixture
poses are disclosed, NOT natural strike proof. Four-ship native-water/separation/
all-four-gun battles/reset and ordinary legacy formation/68 AA remain unchanged.
Strict canonical preimage is now
`d9982243828cbc5c7281db227699c426ccb1c1f2a65e7c010a49d99cd87da902`;
actual transform/drift/repeat/foreign-path guards all pass, not relaxed patterns.

**Fresh changed-pool unforced PASS, not a repair/rewrite of older FAILs:**
8904ab67 records SINGLE actual exit0/109.375192197s script (109.636494997s wall).
Same three codes declared before execution: named-coalition-nato/eastern/six-mixed
(the last label is historical, not a newly searched code). Each120s/7200ticks,
four default-skill bots, production four-kind/team rosters, normal native carrier
spawns, no pose/control/HP/ammo/skill/RNG/timing grant or retune/retry. Births11/13/9,
projectiles198/226/148, hits0/0/16 and damage0/0/21.6; both teams move each case,
outcomesnull. All8 kinds move across the cases, Su35now3 births/3airborne,
Gripen6/6 andMiG312/2. Previous Su35 code/weights were not changed to get this
sample; pool expansion naturally changes choices. The previous zero-birth runs
remain genuine FAILs for their older sources, not recast as passes.

All16 source/owner/weapon/fraction/position/tick/actual-authority-unit correlations
PASS independently; Type0559 hits, Type054A1, Type456, Aquitaine0/friendly0.
A collision is not a claim of deliberately aimed FC seeker/escort tactics.
Two zero-hit cases and Aquitaine zero remain; broad naturalStrike/battle/native
acceptance flagsfalse and early-outcome branch unexercised. Parent verifies208
source/tool pins,34 actual GLBs, all16 correlations and all4 older receipts exact.
[Receipt](wings-local-native/eight-aircraft-coalition-flight.json),363617B,
SHA256 `d44fe4c62dd668d14efd78d8054b57191c09323fa9345df1d4ba54b9a64f84e2`.

Build `.tmp/wings-eight-aircraft-review`:26 files/3965359B, generatedAstra/solo/
lighting3/3,19 emitted syntax/closure, catalog129/schema/Git URLs and diffs PASS.
[Local HTTP identity65/65](wings-local-native/eight-aircraft-build-readback.json)
includes all34 raw/derived/original GLBs, fonts/OFL notices; server closed. No
browser/full-fleet smoke, install, push, guard waiver, new game or fabricated source.
Earlier four-vessel menu8/8 is dated three-aircraft UI only, not current menu/native
acceptance. Current menu counts/dispatch pass actual source/UI CPU checks; no new
screenshots or responsive gameplay renderer is claimed.

Serial-owner alternatives, reverse-checked NOT applied (chooseONE):
- `.tmp/wings-eight-8904ab67-source.patch` since885cbb2,3254632B,
  SHA256 `d334233e8bca7fc9beea827f5fa05ce9fc9658603d3bd1718bd1e351423bccba`.
- `.tmp/wings-eight-8904ab67-incremental.patch` since78205694,477317B,
  SHA256 `832bc07c83b62dccd3f04ba02820360f07533cf75f6bd084c1d58ec9a2a52e74`.
Full preserves the prior narrow source allowlist plus this slice, excluding stale
generated bundles/check outputs. Include new raw/derived models/rigs, rebuild with
existing approved tools, preserve newer main; never combine full+incremental.
These supersede previous76db26e8 source delivery alternatives, not their evidence.

Wings-only inventory314files/29490212B/tree
`3aa531b27c0388e47fd05754e39cab289de244c9`; all foreign rows unchanged. Global
checker still reaches only missing001-brainrotboulevard.md. Remaining12 aircraft/
6 vessels plus combat/maps/weather/ASW/native work unfinished. Sole serial owner
integrates appropriate narrow source delta preserving newer main; no source push.

## Single CB90 H / five-vessel source6d6fea0b, evidence9d1f4fe0

One genuine supplied vessel slice from0bde3e54: a2ed7671 assets, b2b9c4ee scenario/
regression, parent6d6fea0b original-session metadata/tests and9d1f4fe0 observer.
The source commits depend on each other; don't release the asset/config partial
alone. NATO nowType45/Aquitaine/CB90, EasternType054A/Type055; choice swaps real
memberships. All eight aircraft unchanged, ordinary15/aircraft-only preserved.
Original menu reports NATO4/10air3/5vessels versus East4/10air2/5. CB90 never
becomes a selectable vehicle, capital or armed escort through its class name.

Actual supplied CB90 raw307892B/2630tri, derived308092B/2630tri, original rig,
three exact embedded PNG maps and original geometry/UVs retained. Derivative
SHA256 `c8e959a7cd618ce589c547780657b1cb9308d421a5149279d5e66816d4dac578`.
Same fleet generator/checker extended with an unarmed branch; old2gun checks stay
mandatory. Fresh14626 total fleet-extension triangles,9 CRC/decoded PNGs,71poses,
50 old gun-clearance rays,38 pre-write corrupt/unowned-path negatives and exact
reproduction PASS. All34 older GLBs/eight fighter/prior vessel descriptors and
five historical flight receipts are exact. Four measured collision components,
not antenna-height filled hull; source approximate ramp pivot, derived axis-X,
limits[0,0], static closed ramp. No gun/launch/sensor/propeller, ramp gameplay,
missile/ASW/troop/player-water-driving feature fabricated. User-reported GPT/scoped
permission and unresolved upstream qualifications remain, not certified realism.

Factory keeps executable2de5013c undefinedlegacy config/ordered assets exact;
all4 old vessel definitions/geometry/statistics/routes/IDs match executable0bde3e54.
New CB90 idhome-cb90/enemy-cb90, generic1000HP/speed12, weapons[]/sensor:null,
noncapital surfaced objective. HorizontalZ2610, initialX-1200/1600 toX-300/+300;
all-yaw8.275559m radius and complete native-water/arena/seabed/friendly separation
pass without moving older ships or widening arcs/bounds. Rendering consumes the
same safe authority state; no new combat/clock/flight/damage engine or runtime
third-party load. Current class count is8/20aircraft and5/10supplied vessels.

Fresh [production receipt](wings-local-native/five-vessel-production-check.json):
7groups,319222water/seabed,27750height,22200separation/22200muzzle pose probes.
Both1000HP battles still138.7s/2774FCticks/8322native ticks,288fires/275damage/
one capital sink; originalguns Type45/Aquitaine/Type054A/Type055 fire41/81/102/64,
CB90fires0 and endsHP1000. Core fitted attack fixture1000->990->0 never wins by
sinking CB90. NoFF/friendly obstruction/privacy/absent gun/closed ramp/reset/
disposal and earlier ammo/TTL/expiry negatives PASS. Native GPU/pixels not tested.

Actual local-session safe HUD/height/ray/contact queries include all5 actual
models while capital bars stay2. Fresh15host/15session, original picker/HUD/main,
all8 legal aircraft cannon approaches/foreign roster rejection and collector25
readiness/10 lifecycle mocks PASS. A declared moving-CB90 MiG31 cannon fixture
spends ammo and changesHP1000->985.15. Initial100m fixture ray encountered nearer
Aquitaine before CB90; the test alone moves to a clear40m lane. No native collision,
HP/ammo or physical bounds change. This is an explicit pose/protection fixture,
not normal flight or unforced strike acceptance. Collector now requires5 hulls
and rejects the old4frame. No new menu or gameplay screenshots/browser launch.

**Current unforced attempt FAIL before cases, not failed flight or coverage:**
9d1f4fe0 retains sole actual exit1/2.604155944s wall,2.310s script. Added observer
raw-source assertion wrongly expected historical Type45/Type054A originals under
models/supplied. These old capitals have authenticated source metadata/SHA and
tracked derived assets, unlike the3 newer originals which MUST be tracked.
Corrected observer checks that exact distinction without relaxing new-asset guards;
both five-identity choices compile and statically verify, syntax/catalog/diff PASS.
No simulation rerun; corrected observer's flight behavior is unproven. Births,
projectiles/hits/damage/all8 coverage/CB90/Aquitaine/Type055 strikes are unobserved,
not zero or PASS; correlations/early-outcome branch unexercised. Acceptance flags
remainfalse. Prior8kind/four-vessel PASS and two oldSu35FAILs remain exact/different
sources, not promoted into current flight acceptance.
[FAIL receipt](wings-local-native/five-vessel-coalition-flight.json),149135B,
SHA256 `f2ea0d441b840b5d8369ba6321d8c9181962899cf11c2b3b0f2fb0f4195940aa`.
It retains exact executed observer text and211execution pins; only the checker
changes post-run. Parent verifies remaining210pins/all36GLBs/five old receipts,
plus corrected observer SHA separately. No guessed successful run or seed search.

Build `.tmp/wings-cb90-6d6fea0b`:26files/3968192B; generatedAstra/solo/lighting3/3,
19emitted syntax/closure and catalog129/schema/Git URLs PASS. BoundedlocalHTTP
[67/67 bytes/hash/MIME](wings-local-native/five-vessel-build-readback.json) includes
all36models/fonts/notices; server closed. No install/full-fleet/newgame/push or
guard waiver. Serial-owner alternatives (reverse-checked NOT applied, chooseONE):
- `.tmp/wings-five-vessels-9d1f4fe0-source.patch` since885cbb2,3692457B,
  SHA256 `be3d1e06f096546703543fbbc9214b2cf3ced7974f2c529536b7f86904635fe9`.
- `.tmp/wings-five-vessels-9d1f4fe0-incremental.patch` since0bde3e54,483267B,
  SHA256 `e316f833e0002f5052c258721c6e4d9795fbb3b0e664de7825e62fc09ba05d45`.
Full retains the prior narrow source allowlist plus this slice, excluding stale
generated assets/check bundles. Include new raw/derived/rig metadata; rebuild with
approved existing tools and preserve newer main, never combine alternatives or
wholesale merge/reset. Supersede prior8904ab67 delivery patches, not evidence.

Source317files/30141781B/tree
`12f6c3e202a8742a59c480c8b0eacbd52008bdbf`; unrelated inventory rows unchanged.
Global checker still only historical missing001. Remaining12aircraft/5vessels
plus combat/maps/weather/ASW/native work unfinished. Sole serial owner integrates
one appropriate narrow source delta preserving newer main; no independent push.

## Genuine Mirage2000C/Su34 source57dfe0d4 / evidence47cd7e7d

Continued from100190fd:4220b317 assets,a62749e6 native,57dfe0d4 parent wiring,
47cd7e7d single current-pool flight attempt. Ten genuine supplied aircraft/five
vessels, ordinary17, NATO[f16c,typhoon,rafale,gripen,mirage2000] versus
East[mig29,su35s,jf17,mig31,su34]. Original menu5/10air per side, NATO3/5vessels
versus East2/5. Original hangar keys1–5, ordinary1–9 plus arrows/Enter thereafter;
aircraft-only. CB90 remains one unarmed boat, not twelve fabricated aircraft or
a forced10m vessel family. Source dimensions/identities, UI and controls retained.

Exact originals/rigs and reproducible derivatives: Mirage2428/2828tri,
107820/147676B; Su343194/3674tri,131032/178080B. Native templates3024/4066tri.
Source geometry/UV/images retained; single/twin measured exhausts. All36 older
GLBs/eight prior descriptors/rigs/six old flight receipts exact.560signed/rest
poses,528static-clearance/12528source-surface rays/36overwrite negatives and
reproduction PASS. User-reported GPT/scoped permission and unresolved upstream
qualifications remain; not independent licensing, realism or manufacturer claims.

Mirage has only actual delta elevons and rudder: optional pitch_gain:-1 on its
roll-driven elevons adds clamped pitch+roll without fabricated tailplanes or
multiple bones on one node. Actual native symmetric pitch, antisymmetric roll,
mixed clamp/rest and absent-vs-zero gain parity pass. Su34 uses actual canards
AND tailplanes for pitch, elevons roll and twin rudders yaw. All prior15 bone
poses/configs/audio/cameras/flight parameters stay exact, including49500 prior
7/9/11/13/15 flight ticks. All17 incoming native damage cases mandatory/finite.
Cruise/boost145/205 versus140/190m/s and handling differences are conservative
arcade tuning, not certified flight performance. Existing four-store fits:
Miragecannon20/aim9+officerTVmissile;Su34cannon20/aim9+officerMaverick. No new
weapon, bomb/bay, real caliber/BVR, stealth, gear or operational fit claim.

Fresh parent15strict host/17actual session/16bomb/6roster/7five-vessel groups,
12000 coherent7/9/11/13/15/17 chooser-RNG comparisons/two ordinary outputs and
actual original picker/HUD/main PASS. All10 selected kinds produce real native
cannon fitted impacts in disclosed approach/protection fixtures; all foreign
kinds reject. Old CB90clear-lane test still spends ammo for1000->985.15HP. Native
GLTF/PBR/stores/exhaust/lock/fire/ammo/regen, normal+boosted noncatapult takeoff,
turn/stall/crash/reset/cameras PASS as CPU fixtures, not pixels/listening/input.
Samefive-vessel routes, old4guns/HP/collision/legacy68AA,2capitalbars, no new clock
or damage/flight engine. Exact canonical preimage now
`b5830f4a16350ca07d2995c3eefcf5e5116f9d1e0a8e8fc5ac045fe2ce3e6b71`;
source/drift/repeat/foreign-path checks remain strict.

Asset worker's two old fleet commands failed whole-file8fighter metadata pins.
Parent reconciled exact reviewed10fighter hashes and protected all40current GLBs,
without changing legacy26baseline map or older descriptors. Fresh generator
reproduces byte-exact. Its corrupt-CB90 negative first failed only because frozen
CB90 bytes now hit the stronger earlier retained-GLB guard: test now expects that
EXACT guard for retained GLBs, original corrupt-metadata guard otherwise, still
proves NO mkdir/write.40retained+3CBcorrupt+1unowned negatives PASS. Fleet parity
also initially compared the intentionally appended aircraft against old8pool;
it now proves every historical aircraft prefix exact and separately compares ALL
fleet fields exact, while explicit10kind/5perside/currentpool checks stay mandatory.
No broad ignored paths, removed content checks or physical guard changes. Worker
advice ticket1793209308764 records the resolved pin mismatch, not permission.

**Current ten-kind unforced coverage FAIL:** SINGLE actual exit1,128.707s script/
128.949s wall, same3predeclared codes/120s/7200ticks each/default4bots/normalnative
carrier spawns. No pose/control/HP/ammo/skill/RNG/timing grants or seed/weight
search/retry. Births10/8/9; projectiles271/135/163; hits1/6/14, damage1.35/8.10/18.90.
Both teams fly each; outcomesnull/early-outcome branch unexercised.9/10 kinds move:
F16=4,MiG29=2,Su35=4,Rafale=5,JF17=1,Gripen=4,MiG31=3,Mirage=3,Su34=1.
Typhoonbirth0 fails required10kind coverage at spawn sampling, NOT proof of a
flight defect; no retune/old-pass substitution. Corrected old source-path setup
guards now pass before flight in this new pool; the earlier setupFAIL stays FAIL.

All21 original launch-phase/source/owner/weapon/fraction/position/tick/actual
unit/damage correlations PASS independently, including13Mirage impacts. Aquitaine5,
Type054A16, CB90/Type055/Type450; friendlyconsumption0/CB90authorityfires0. Zero
new-class hits forSu34 andCB90 remain, not simulated success. Native/naturalStrike/
battle flagsfalse.217source/tool pins/all40GLBs/six historical receipts remain
exact. [Receipt](wings-local-native/ten-aircraft-coalition-flight.json),392325B,
SHA256 `f0f56c58e3ee0ac49ebf109767916e9edb1806db1d776b2651e38ff3891bf5c9`.

Build `.tmp/wings-ten-aircraft-review`:26files/3985404B,generatedAstra/solo/
lighting3/3,19emitted syntax/closure/catalog129/schema/GitURLs/diffs PASS. Local
[HTTP71/71 bytes/hash/MIME](wings-local-native/ten-aircraft-build-readback.json)
includes all40models/fonts/notices; server closed. No browser/capture/full-fleet,
install, newgame, push or waiver. Native3D/human/performance remain unaccepted.
Serial-owner alternatives (reverse-checked NOT applied; chooseONE):
- `.tmp/wings-ten-47cd7e7d-source.patch` since885cbb2,4110568B,
  SHA256 `b555ca0055f99f7b43f0b586e888c5b29a04df4fe44209ea18c6a0f560707ec9`.
- `.tmp/wings-ten-47cd7e7d-incremental.patch` since100190fd,498404B,
  SHA256 `c576dca3c33b64c3d32531b4e807a518795697b5eff339d2df8276730bac37ac`.
Full retains the prior narrow source allowlist plus this slice, excludes stale
generated bundles/check outputs. Include raw/derived models/rigs; rebuild using
existing approved tools, preserve newer main, never combine full+incremental or
wholesale merge/reset. These supersede9d1f4fe0 delivery alternatives, not evidence.

Wings-only323files/30748326B/tree
`40c2220c42eeee767b6a1aafe25f555cf55117e2`; foreign inventory rows unchanged;
global checker still only historical missing001. Remaining10aircraft/5vessels
and broader combat/maps/weather/ASW/native work unfinished. Sole serial owner
integrates one appropriate narrow delta preserving newer main, never a blanket
merge/reset/full+incremental combination or independent source push.

## Genuine FA50/Yak130 sourcef08bac56 / evidence6cc5bda7

Continued bounded slice from53355f0b: c18ea1cb assets,41609030 native,f08bac56
parent and6cc5bda7 sole current-pool sampling attempt. Twelve genuine supplied
aircraft/five vessels, ordinary19. NATO[f16c,typhoon,rafale,gripen,mirage2000,fa50]
versus East[mig29,su35s,jf17,mig31,su34,yak130]. Original hangar keys1–6, ordinary
1–9plusarrows/Enter beyond9; aircraft only. Same Type45/Aquitaine/CB90 versus
Type054A/Type055; menu6/10air each,NATO3/5vessels/East2/5. All older vessel
geometry/routes/HP/four guns/unarmedCB90/legacy68AA and aircraft parameters remain.

Exact originals/rigs plus reproducible-Z derivatives through existing generator:
FA50raw2652tri115524B/derived3052tri155408B; Yak1303050tri124716B/3530tri171796B.
Actual templates3248/3530tri. Actual elevons/tailplanes/single rudder and measured
nozzle origins; original geometry/UV/images retained.660poses/632clearance/
14712source-surface rays/75corrupt pre-write negatives/reproduction/Pythoncompile
PASS. All40oldGLBs/ten descriptors+repair entries/rigs/seven historical receipts
exact. User-reported GPT/scoped permission and upstream qualifications stay, not
independent license, real mechanical/cockpit/operational or manufacturer claims.

FA50single actual afterburner outlet uses existing boost visual. Yak130 has two
NONAFTERBURNING turbofan outlets: only its descriptor adds afterburning:false,
exhaust_core_L/R nodes use existing faint emissive-glow path. No afterburner cone,
flame mesh, boost stretch or boost brightness. Existing engine/physics/render
helpers reused, not a new shader, clock or engine fork. Native arcade boost is a
speed aid, not real afterburner functionality. Actual tests require two static
cores under throttle/boost/leave/reset/dispose and FA50's retained afterburner.
All17 older bone poses, descriptors, rig/audio/camera/flight behavior unchanged.

Conservativearcadecruise/boost130/180 versus105/140m/s, compact responsiveFA50 vs
slower trainer/attackYak. Four ammo-linked existing-weapon stores; both pilot
cannon20/aim9, FA50officerTVmissile/YakofficerMaverick. No new weapon type, real
caliber/BVR, operational fit, stealth/bay/gear claim. Native64800 prior7/9/11/13/
15/17flightticks/14000coherentchooserRNG/all19finiteincomingdamage/GLTF/PBR/rig/
lockfireammo regen/normalboostnoncatapulttakeoff/turnstallcrashreset/cameras PASS.
Old Mirage mixed-control and absent/zero-gain parity remain. CPU only, not pixels,
listening, human flight or performance acceptance.

Parent fresh15strict host/19actual session/16bomb/6roster/7fleet groups,14000
7/9/11/13/15/17/19choice-RNG/two ordinary outputs and actual picker/HUD/main PASS.
All12 selected kinds spend real cannon ammo for fitted impacts in declared pose/
protection fixtures; foreign requests reject. CB90clear-lane test remains
1000->985.15. Exact canonical preimage
`e90dbf4b722d97307e4fc1b2cb7779567fb16b58f7952dce0016920350b455e1`
updates armor/bridge in tandem and retains drift/repeat/foreign-path negatives.
Fleet exact12fighter metadata pins now guard all44GLBs; unchanged historical26
BASELINES,48pre-write/frozenCB/no-write negatives and byte reproduction PASS.
No recurring stale metadata exception or dropped older content guards.

**Current twelve-kind coverage FAIL**, SINGLEexit1/119.693210357s script,
119.929790659s wall. Same3predeclared codes/default4bots/normal native carrier
spawns,120s/7200ticks each, no pose/control/HP/ammo/skill/RNG/timing grant, extra
seeds, retune or retry. Births7/8/12,projectiles242/232/137,hits0/7/12,damage0/
9.45/16.20. Both teams fly each; outcomesnull/early-outcome branch unexercised.
Ten kinds move across cases, Typhoonbirth0/MiG31birth0 fail the12kind gate at
spawn sampling, not proof of flight defects. FA504/4,Yak1301/1move; F164,MiG292,
Su353,Rafale2,JF172,Gripen3,Mirage3,Su343. Original Typhoon/MiG31parameters
unchanged; priorPASS/FAIL receipts are not substituted or rewritten.

All19 native launch-phase/source/owner/weapon/fraction/position/tick/actual-unit/
damage correlations independently PASS;13fromFA50. Aquitaine5,Type05511,Type054A3,
CB90/Type450; friendlyconsumption0/CB90authorityfires0. Zero-hit first case and
Yak130fleetstrikes0 remain; native/naturalStrike/battleflagsfalse.223source/tool
pins/all44GLBs/seven old receipts unchanged. [Receipt](wings-local-native/twelve-aircraft-coalition-flight.json),408725B,
SHA256 `10506035b63e57da90a51b9accb976bdf8dc04abcf87e11cd5191bb6e1f4a0ec`.

Build `.tmp/wings-twelve-aircraft-review`:26files/4002019B,generatedAstraSolo
Lighting3/3,19emitted syntax/closure/catalog129/schema/GitURLs/diffs PASS. Local
[HTTP75/75 bytes/hash/MIME](wings-local-native/twelve-aircraft-build-readback.json)
includes all44models/fonts/notices; server closed. No browser/capture/full-fleet,
install/newgame/push/waiver. Native3D/human/performance/currentmenu pixels held.
Serial-owner alternatives, reverse-checked NOT applied (chooseONE):
- `.tmp/wings-twelve-6cc5bda7-source.patch` since885cbb2,4527847B,
  SHA256 `abf27ba783b3ecbe132cb91b7461d8a2ba928e8c6e741856f1e86f8fc945c278`.
- `.tmp/wings-twelve-6cc5bda7-incremental.patch` since53355f0b,507827B,
  SHA256 `27dce1bd1c0de2c4a116ee353d4621389a47a582720fe84b2bc096ffbd35a19f`.
Full retains the previous narrow source allowlist plus this slice, excludes stale
generated bundles/check outputs. Include raw/derived models/rigs, rebuild with
approved existing tools, preserve newer main; never combine full+incremental or
wholesale merge/reset. Supersede47cd7e7d delivery alternatives, not evidence.

Wings-only329files/31355552B/tree
`9ef5da8d4aae2bce719ae54c3aeeb932fc7ab709`, foreign inventory rows unchanged;
globalcheckeronlyhistoricalmissing001. Remaining8aircraft/5vessels plus broader
combat/maps/weather/ASW/native work unfinished. Current samplingFAIL is retained,
not a reason to fake fullscope completion or seek routine permission. Sole serial
owner integrates one correct narrow source delta preserving newer main; no push.

## Genuine Type022 / six-vessel source4bbd319f, evidenceb70361fd

Single genuine vessel slice from39d97e02: d32391a4 assets,2b315278 scenario,
4bbd319f parent original-session binding,b70361fd sole current-pool observer.
12/20aircraft,6/10vessels; ordinary19 unchanged. NATOType45/Aquitaine/CB90 versus
EastType054A/Type055/Type022, swapped by choice, each6/10air and3/5vessels. Type022
is UNARMEDNONCAPITALAIobjective: its missile-boat identity/static canisters do NOT
enable missiles, guns, sensors, propeller rigs or player water-driving. Actual
source controls[]/noanimations remain, not fabricated capability or copied art.

Exact raw331884B/2988tri and derived332092B/2988tri, original static rig/3PNGmaps;
SHA256 `80fd1b8287e8adb16844df2e7760bb34d7484ab15f59db057a949496a321898a`.
Derived boundsX±5.935983181/Y-1.5..14.067999840/Z-21.299999237..21.513000488.
Actual geometry/UV/maps preserved, same existing fleet generator/helper. Five
measured boxes: left pontoon, right pontoon, connecting deck and2cabins, not an
antenna-filled aggregate hull. Additional-component ABI holds the second pontoon
with explicit qualification, not a claim it is an island. Native/independent
rotated triangle+box proof100water-level tunnel misses/25hull-deck-cabin hits,
zero phantom hits PASS. Projectile gap is modeled; native heightfield still cannot
promise under-deck aircraft motion or complete wing sweeps. Supplied provenance/
rights/mixed-glass/nativepixels/performance/real-class qualifications retained.

Asset check17614extensiontri/12exactCRCdecodedPNGs/72poses/175gun-or-catamaran
rays,44retained+6corruptCB90Type022+1unowned pre-write negatives/reproduction PASS.
All44oldGLBs/12fighter/prior3extension descriptors/eight flight receipts exact.
No old model or source helper was overwritten. Fullsource dimensions retained,
not a forced10m boat template or invented replacement model.

Factory validates6unique models, onecapital/team, unchanged undefinedlegacy/
LOCAL_MODEL_ASSETS vs executable2de5013c and all5prior unit fields/geometry/stat/
routes/IDs vs39d97e02. NewType022idhome-type022/enemy-type022, generic1000HP/speed12,
weapons[]sensor:null. Proposed same-X start rejected Overlapping initial hulls;
retained negative, ONLYnewboat changed toX-1340/1740->-400/+400,Z2630. All-yaw/
fullsource bounds/native-water/seabed/arena/friendly paths pass. Existing ships,
map, HP and gun arcs weren't moved/widened to hide the failure.

Fresh [production receipt](wings-local-native/six-vessel-production-check.json):
7groups/335102water/33300height/33300separation/22200muzzle poses/40catamaran rays.
Both real1000HP battles still138.7s/288fires/275damage/capitalresult;4original guns
fire,CB90/Type022zero. Type022declared fittedattack1000->990->0 cannotwinby
noncapital sinking; noFF/obstruction/privacy/caps/unsupportedmount/expiry/pause/
15sreset/disposal negatives retained. Legacy6/core22/geometry9/actual-GLB rig
checks also pass, CPU/factor materials not native decoded pixels or human input.

Parent actual local adapter loads six proper models, safeHUD/height/ray/contact
queries include them, capitalbarsremain2.15host/19session/16bomb/6roster/7fleet,
original picker/HUD/main,14000choiceRNG/twoordinaryoutputs PASS. All12 legal
cannon approaches/foreign roster rejection remain. Extra declared movingType022
FA50cannon fixture changesHP1000->986.5 with ammo spent; not unforced flight.
OldCB90fixture1000->985.15 preserved. Collector26readiness/10lifecycle fixtures
require6hulls and reject5frame; no capture/newbrowser/service restart.

**Coverage not closed:** b70361fd SINGLE actualexit1,121.685s script/121.926s wall.
Same3declaredcodes,120s7200ticks/default4bots/normalnativecarriers,no pose/control/
HP/ammo/skill/RNG/timing grant, extra seeds, weight retune or repeat. Births7/8/12,
projectiles242/237/132,hits0/7/12,damage0/9.45/16.20. Bothteamsflyeach,10/12kinds
across; Typhoonbirth0/MiG31birth0 still FAIL strict coverage at spawn sampling,
not proof of a flight defect. Newboat was placed for physical clearance, not to
fish for different aircraft births. Existing older PASS/FAILs not rewritten.

All19 original source/owner/weapon/launchphase/fraction/position/tick/unit/damage
correlations independently PASS. Aquitaine5/Type05511/Type054A3,Type022/CB90/Type450;
friendlyconsumption0/both unarmedfires0. Type022unforced strikes remain0 despite
positive declared cannon fixture. Outcomesnull/early-outcome unexercised, native/
naturalStrike/battleflagsfalse.226pins/all46GLBs/eight historic receipts exact.
[FAIL receipt](wings-local-native/six-vessel-coalition-flight.json),471382B,
SHA256 `39ed270b768b420960375d2dcff4bce8a3723446ad4de5261135292e3a9984a8`.

Build `.tmp/wings-type022-review`:26files/4004757B,generatedAstraSoloLighting3/3,
19emittedsyntax/closure/catalog129/schema/GitURLs/diffs PASS. BoundedlocalHTTP
[77/77bytes/hash/MIME](wings-local-native/six-vessel-build-readback.json) includes
all46models/fonts/notices; server closed. No browser/full-fleet/install/newgame/
push/waiver; shared Chrome untouched. Strict2GiB floor kept,1.4GBticketline not a
waiver. Native3D/human/performance/currentmenu pixels and missing001 hold remain.
Serial-owner source alternatives, reverse-checked NOT applied (chooseONE):
- `.tmp/wings-six-vessels-b70361fd-source.patch` since885cbb2,4960957B,
  SHA256 `ba1666358f985fe0b9e37ed77cce63937662c23934cbf4ec70573343138d8623`.
- `.tmp/wings-six-vessels-b70361fd-incremental.patch` since39d97e02,489912B,
  SHA256 `0cb3868b5b23f7feff454f7250f0e2c191627b1d55dc3178d427d1d4ab2b62bd`.
Full retains the previous narrow source allowlist plus this slice, excludes stale
generated bundles/check outputs. Include raw/derived/rig metadata; rebuild with
approved existing tools, preserve newer main; never combine full+incremental or
wholesale merge/reset. Supersede6cc5bda7 delivery alternatives, not evidence.

CurrentWings332files/32054061B/tree
`b7a1b7aeb1accebbff5d53cb53df7f6a7c5921ff`; foreign inventory rows unchanged.
Remaining8aircraft/4vessels plus broader combat/maps/weather/ASW/native work remain;
not whole-scope completion or operator-only decision. Sole serial owner integrates
one appropriate narrow delta preserving newer main; this lane never pushes.

## Single HawkT2 sourcec9c11600 / evidenceb49930a3

Bounded SINGLEaircraft slice fromb39d5096:68a302f9 assets,424e8fb4 native,c9c11600
parent,b49930a3 sole fixed-case observer.13/20suppliedair/6/10vessels; ordinary20
means original7+supplied13, not completion of target20supplied. NATO adds actual
HawkT2 after[f16c,typhoon,rafale,gripen,mirage2000,fa50]; Eastern6unchanged.
TruthfulNATO7/10air versusEast6/10air,3/5vessels each; original hangar keys1–7/
1–6, ordinary1–9 plus arrows/Enter for later rows. No player vessel/newgame or
whole-roster work in this capped unit.

Exact Hawkraw114272B/2540tri, originalrig, samehelper-derived154156B/2940tri,
SHA256 `7dc2868e30f4f9f68be8425e04aac5e00d9145d3fe3b590b84f707827f235734`.
Native2940tri. Sourcegeometry/UV/imagebytes retained; actualelevons/tailplanes/
single rudder/ONEmeasured nozzle. Uses existing Yak non-afterburning path,
afterburning:false, oneexhaust_core/exhaust faint staticwarmcore; NOcone/flame/
booststretch/brightness/customshader/engineclock. Fourammo-linked arcade stores,
pilotcannon20/aim9+officerMaverick; no operational/realcaliber/BVR/stealth/bay/gear
or detailedrear-cockpit claim. Conservative95/125m/s/stall42 trainer tuning, native
boost onlyarcade aid. User-reported GPT/scoped permission and upstream caveats
remain, not licensing/manufacturer/mechanical/photorealism certification.

745poses/680static/16056posed-source rays/87corrupt pre-write guards/PNGCRCdecode/
reproduction PASS. All46oldGLBs/12descriptors+repairentries/priorrigs/nine old
flight receipts exact. Fleet canonical13fighter metadata/all48currentGLBguard/
55no-write negatives and unchangedlegacy26BASELINES/reproduction PASS. Native
81900 prior7/9/11/13/15/17/19flight ticks,16000coherentchooserRNG/all20mandatory
finiteincomingdamage/old19boneposes/specs/rig/audio/cameras exact. Actual Hawk
GLTF/PBR/controls/stores/exhaust/noABboostresponse/lockfireammo regen/normalboost
noncatapulttakeoff/turnstallcrashreset/cameras/lifecycle PASS as CPU fixtures.
No pixels/listening/human input/performance acceptance inferred.

Parent fresh15host/20session/16bomb/6roster/7fleet groups,16000chooserRNG/two
ordinary outputs and actual originalpicker/HUD/main PASS. Asymmetric rows and
next-number rejection now use displayed roster length; ordinaryexact20guard
retained, no fictional20 shortcut. All13 chosen aircraft spend actualcannonammo
for fitted impacts in declared approaches, foreign requests reject; prior boat
fixtures unchanged. Same6shipmodels/routes/geometry/HP/4guns/2unarmedboats/68AA,
capitalbars2, sourcephysics/authority unchanged except registration/armor.
Exact canonical reviewedpreimage
`12d3b7ed0acbd6bb8183d6649b0624c14ef12000feec13987aea05e7cd64863a`
retainsdrift/repeat/foreign negatives. Five-vessel historical fixture initially
compared the intendednewHawk entry too; it now separately proves every old12air
prefix and ALLfleet fields exact, while current13kind/NATO7East6assertions remain
mandatory. No previouscontentchecks discarded or physical guard weakened.

**Current13kindcoverageFAIL:** SINGLEactualexit1/125.671s script/126.045s wall.
Same3predeclaredcodes/120s7200ticks/default4bots/normalnativecarriers, no poses/
controls/HP/ammo/skill/RNG/timing grants, newseeds/weightretune/retry. Births10/6/10,
projectiles171/192/108,hits0/16/18,damage0/21.60/24.30. Bothteamsflyeach,11/13kinds
moveacross; Typhoonbirth0/Rafalebirth0 failstrictcoverage atsampling, NOT flight
defects. MiG31now1birth/1moving withoutpriorhandlingchange; oldMiG31FAIL not
rewritten. Hawk4births/4moving, airborneTicks1318/6992/4060/2584,14native shiphits.

All34launchphase/source/owner/weapon/fraction/position/tick/unit/damage correlations
independently PASS. Type054A23/Type456/Aquitaine5,Type055/CB90/Type0220;friendly0/
bothunarmedfires0. Zero-hitfirstcase/oldFAILs/outcomesnull/earlybranchunexercised
retained;NativeNaturalStrikeBattleflagsfalse.229pins/all48GLBs/nine historical
receipts byteexact. [FAIL receipt](wings-local-native/thirteen-aircraft-coalition-flight.json),498307B,
SHA256 `18a55cea665f0110a67b4a2e61ecdca2a98abc55369d1f75ad2fdd162954a477`.

Build `.tmp/wings-hawk-review`:26files4012980B,generatedAstraSoloLighting3/3,
19emitted syntax/closure/catalog129/schema/GitURLs/diffs PASS. BoundedlocalHTTP
[79/79bytes/hash/MIME](wings-local-native/thirteen-aircraft-build-readback.json)
includes all48models/fonts/notices; serverclosed. No browser/service restart/
full-fleet/install/newgame/push/waiver; native3D/input/performance/currentmenu pixels
and missing001 hold unchanged. Sharedrootfree briefly dropped to2300211200B,
stillabove2147483648floor; remaininggrowth bounded, observer229pinflight finished
abovefloor aftersharedhostrecovery, no agentcleanup/waiver orcapacityevasion.
Serial-owner alternatives, reverse-checked NOT applied (chooseONE):
- `.tmp/wings-hawk-b49930a3-source.patch` since885cbb2,5167468B,
  SHA256 `937ae3094a84f40c0fb813f3109aed8887da666c615bee09e5270c35936e8f92`.
- `.tmp/wings-hawk-b49930a3-incremental.patch` sinceb39d5096,304333B,
  SHA256 `0f5c404e6707319eaf717a6a58a28cb7ffe333779bb1b31b1eac521cc48843bf`.
Full retains the previous narrow source allowlist plus this single-aircraft slice,
excludes stale generated bundles/check outputs. Include raw/derived/rig metadata;
rebuild with existing approved tools, preserve newer main, never combine full+
incremental or wholesale merge/reset. Supersede b70361fd delivery, not evidence.

InventoryWings335files32347550B/tree
`e0e3f0cedcc2c078fd6d7e1340fcabc7ab9fe0f7`; foreign rows unchanged. Remaining
7aircraft/4vessels pluscombat/maps/weather/ASW/nativework unfinished. Stop at this
single-Hawkcheckpoint;no falseScopeComplete/operator-onlydecision claim. Serial
ownerchoosesoneappropriate narrowdelta preserving newer main, no sourcepush.

## Single Su25SM source6fb03f3a / evidence95487233

Capped SINGLEaircraft slice from9a4efe06:2a151711 assets,c61d2c8f native,
6fb03f3a parent,95487233 sole fixed-case observer.14/20suppliedair/6/10vessels,
ordinary21=original7+supplied14. East adds actualSu25SM after[mig29,su35s,jf17,
mig31,su34,yak130], NATO7unchanged; both7/10air3/5vessels. Originalhangar keys1–7,
ordinary1–9+arrows/Enter beyond9, aircraft-only. No other aircraft/vessel added.

ExactsourceSu25SMraw125092B2972tri, originalrig and samehelper-derived172188B/
3452tri/nativetemplate3452tri. SHA256
`2fe458ed79d9de72b3e122c7149ab859f64142e435f023b993bb0b50a602a767`.
SourceSu25familyexteriorrepresentsSMapproximately, not exact-revision certification.
ActualaileronL/Rroll/elevatorL/Rpitch/rudder_center yaw; existingclassifier now
recognizes aileron names without relabeling or changing previous13 entries.
TwinNONAFTERBURNINGexhaust_core_L/R/exhaust_L/R use existing staticwarmcore path,
no cone/flame/boostbrightness/stretch/shader/engineclock. Originalgeometry/UV/
imagebytes preserved; no warthog/A10skin or new control/gear/bay/stealth feature.

830poses/736static/17624posed-source rays/92corrupt pre-write guards/PNGUV/CRC/
reproduction/Pythoncompile PASS. All48olderGLBs/13descriptor+repairentries/prior
rigs/ten historical receipts exact; legacyBASELINES unchanged. Fleetguards exact
14fighter metadata/all50GLBs/57no-write negatives and byte reproduction PASS.
User-reported GPT/scopedpermission/upstream rights caveats retained, not independent
license/manufacturer/photorealistic/mechanical/cockpit validation.

Nativearcade100/130m/s/stall44/HP550/roll2.4/induced.14 proposal: heavier low-speed
groundattack behavior, not measuredSMflight or certified armor. Fourammo-linked
stores, cannon20/aim9pilot+officerMaverick, no GSh30/newweapon/rocket/bombfit or
operationalcaliber claim. Nativeboost is an arcade aid, not afterburner. Actual
GLTF/PBR/signedcontrols/weaponlockfireammo regen/stores/twinstaticcores/cameras/
normalboostNONCATAPULTtakeoff/turnstallcrashreset/lifecycle PASS. Prior20specs/
rig/boneposes/audio/cameras and99900historical7/9/11/13/15/17/19/20flightticks
unchanged;18000coherentchooserRNG/all21finite incomingdamage mandatory. Existing
Hawk/YaknoAB,FA50AB,Miragemixedcontrol checks retained. CPU not nativepixels,
listening, humaninput or performance acceptance.

Parentfresh15host/21session/16bomb/6roster/7fleet groups,18000choiceRNG/two
ordinaryoutputs and actual originalpicker/HUD/main PASS. All14 chosen kinds
produce realcannon fitted impacts in disclosed approach/protection fixtures;
foreign rosters reject; priorType022/CB90fixtureHP986.5/985.15 unchanged. Same6ship
geometry/routes/HP/fourguns/2unarmedboats/68AA/2capitalbars, no second damage/flight
engine. Exactreviewedcanonical source
`df13582458a205f26cff860a98a4625757dab4d7c15b32e44dc7fb22e56eba83`
updatesarmor/bridge in tandem; drift/repeat/foreignpath negatives remain strict.

**Current14kindcoverageFAIL:** SINGLEactualexit1/138.450s script/138.739s wall.
Same3predeclaredcodes/120s7200ticks/default4bots/normalnativecarriers, no poses/
controls/HP/ammo/skill/RNG/timing grants, extra seeds, retune or retry. Births10/6/10,
projectiles171/275/108,hits0/31/18,damage0/41.85/24.30. Bothteamsflyeach,12/14kinds
moveacross; Typhoonbirth0/Rafalebirth0 failstrictcoverage atsampling, not proof
of flightdefects. Su25SM1birth/1moving/0native shiphits. OldTyphoon/Rafale flight
parameters unchanged and olderPASS/FAILs not substituted. The positive declared
Su25fixture is not promoted into unforced fleet-strike proof.

All49actualsource/owner/weapon/launchphase/fraction/position/tick/unit/damage
correlations independently PASS. Type4522/Type054A22/Aquitaine5;Type055/CB90/
Type0220,friendly0/bothboatsfire0. Outcomesnull/earlybranchunexercised; flags
NativeNaturalStrikeBattlefalse.232pins/all50GLBs/ten old receipts exact.
[FAIL receipt](wings-local-native/fourteen-aircraft-coalition-flight.json),526282B,
SHA256 `c618ab2c038dcfda3de238f782d963dc7157cfa9346b4733e1724d7f5e79b042`.

Build `.tmp/wings-su25-review`:26files4021924B,generatedAstraSoloLighting3/3,
19emittedsyntax/closure/catalog129/schema/GitURLs/diffs PASS. BoundedlocalHTTP
[81/81bytes/hash/MIME](wings-local-native/fourteen-aircraft-build-readback.json)
includes50models/fonts/notices; serverclosed. No browser/capture/full-fleet,
install/newgame/service restart/push/waiver; native3D/human/listening/performance/
currentmenu andmissing001 holds remain. Serial-owner alternatives (reverse-checked
NOT applied,chooseONE):
- `.tmp/wings-su25-95487233-source.patch` since885cbb2,5378781B,
  SHA256 `895200a3b840fc7b935e0838ff79e662f0d4cd51a1aab61febfee20d7f7f589e`.
- `.tmp/wings-su25-95487233-incremental.patch` since9a4efe06,303108B,
  SHA256 `18a85b0bd2bc252dcf848bda7ba1c0d0687c3791baf67dab71f9d5973f478b3c`.
Full retains prior narrow source allowlist plus singleSu25slice, excludes stale
generated bundles/check outputs. Include raw/derived/rig metadata; rebuild with
existing approved tools,preserve newer main,never combine full+incremental or
whole merge/reset. Supersede b49930a3 delivery alternatives,not their evidence.

Wings-only338files32666415B/tree
`894836066a231dee4fb68aead3edb8c97accc6c9`, foreigninventoryrowsexact. Remaining
6aircraft/4vessels+broadercombat/maps/weather/ASW/nativework unfinished. Stop this
singleSu25checkpoint; no falsewholecompletion or operator-onlydecision claim.
Serialownerchoosesoneappropriate narrowdelta preserving newer main, no sourcepush.

## Single A10C sourced909677f / evidencef67b5810

Capped SINGLEaircraft slice fromc488b4ab: c2e018e2 assets,4cac4413 native,
d909677f parent,f67b5810 sole observer.14→15/20suppliedair,6/10vessels unchanged;
ordinary21→22=original7+supplied15. NATO appendsactualA10C afterF16/Typhoon/Rafale/
Gripen/Mirage/FA50/Hawk,East7unchanged;8/10vs7/10air3/5vessels each. Originalhangar
keys1–8/1–7,ordinary1–9+arrows/Enter beyond9,aircraft-only. No extra unit/new game.

ExactsourceA10C148464B3698tri, pristine rigidrig and samehelper-derived195560B/
4178tri/native4178tri. SHA256
`897cd0cc6407cebdddaddd05224e925f577870f6f961e0903f11de367708f00e`.
RealaileronL/Rroll/elevatorL/Rpitch/twinrudderL/Ryaw; two measuredraised NONAB
outlets/exhaust_core_LR/anchors use existing staticwarmcores. No flame/cone/boost
brightness/stretch/newshader/clock/flightengine. SourcegeometryUVimagebytes exact;
sourcecommonfamilyexterior not variant-specific avionics or exactCcertification.
OriginalWarthog is distinct and unchanged, not a relabelled suppliedA10C. No
inventedfan/gunspinrig. QualifieduserGPT/scopedpermission not independentlicense,
manufacturer endorsement, mechanical/photorealism/nativepixels certification.

932poses/792static/19416posed-source rays/97corruptprewrite guards/PNGCRCdecode/
UV/reproduction/Pythonmemorycompile PASS. All50olderGLBs/14descriptor+repairentries/
priorrigs/eleven historical receipts exact; legacyBASELINES unchanged. Aggregate
4492958B remains bounded4700000B,512000BperGLB unchanged. Fleet protects52GLBs,
exact15fightermetadatapins,59prewrite no-write negatives/reproduction PASS.

Nativearcade90/115m/s/stall42/HP600/roll2/induced.15, slowerheavierattackproposal,
not measuredCperformance/certifiedarmor. ExistingGAU8/aim9pilot+Maverickofficer,
fourammo-linked genericexternalstores. Genericmeasured barreladapter is not real
rotaryGAU8 geometry/spin/certifiedinstallation/operationalfit. No newweaponID,
rocket/bombbay/stealth/gear or originalWarthog change. Nativeboost is poweraid,
not afterburner. ActualGAU8fire1100ammo30Hznativeballistics/owner/source/muzzle,
GLTF/PBR/signedcontrols/stores/twinstaticcores/normalboostNONCATAPULTtakeoff/
turnstallcrashreset/cameras/disposal PASS. Prior21spec/rig/bones/audio/cam exact,
118800old7/9/11/13/15/17/19/20/21flightticks/20000coherentchooserRNG/all22finite
incomingdamage. PriorHawkYakSu25noAB/FA50AB/Miragemix/Warthogweaponrig checks kept.
CPU not nativepixels/input/listening/performance acceptance.

Parentarmor1/bridgekind/canonical strictpreimage
`a2535cc150cc24e805f87b5efd956e7c555c1840e5fee985a721068cbe3bc2b9`
updatedtogether,drift/repeat/foreignpath negatives strict. Nativeworker initially
stopped at not-yet-added parentARMOR.a10c; freshfullnative passes after binding,
no skippedcase/guardweakening. Readiness ticketpi-2016496-1793221544233-1d1bb299
resolvedbyparent. Pickerinitialstale7/10fixtureFAILretained in session record,
correctedexpectationrequires A10C and8/10,notlooser textmatching. Parentfresh
15host/22session/16bomb/6roster/7fleet/actualpickerHUDmain/20000choiceRNG/two
ordinaryoutputs PASS. All15actualgun fittedimpact fixtures spendnativeammo,
foreignrostersreject; oldType022/CB90HP986.5/985.15 unchanged. Same6ships/routes/
geometry/HP/fourguns/2unarmedboats/68AA/2capitalbars/singleflightdamageauthority.

**Current15kindcoverageFAIL:** SINGLEactualexit1/115.649s script/116s wall.
Same3predeclared120s7200ticks/default4bots/normalcarrier cases, no pose/control/
HP/ammo/skill/RNG/timinggrants/seeds/retune/retry. Births11/7/8,projectiles76/141/
135,hits2/21/8,damage2.70/28.35/16.05. Bothteamsflyeach13/15kindsacross; Rafale/
Yak130zero births failstrictcoverage at sampling, notflightdefects. A10C2/2moving,
12GAU8fireevents/7nativeGAU8shiphits/14.7damage. Typhoon2/2nowmoves but oldFAILs
remainexact; changedpool sampling doesnotfix/rewrite its oldtuning/history.

All31actualsource/owner/weapon/launchphase/fraction/position/tick/unit/damage
correlations independentlyPASS. Actualweapon IDs not normalized:cannon20hit1.35,
A10GAU8hit2.1 unchangednative damage. Type4516/Type054A10/Aquitaine5,Type055/
CB90/Type0220,friendly0/bothboatsfire0. Outcomesnull/earlybranchunexercised;
NativeNaturalStrikeBattleflagsfalse.235pins/52GLBs/eleven oldreceipts exact.
[FAIL receipt](wings-local-native/fifteen-aircraft-coalition-flight.json),514166B,
SHA256 `116adc7b5cd60db66f7fb098303019a351d68823847ff58e68468abfc8e052a4`.

Build `.tmp/wings-a10-review`:26files4030832B/generated3/3/19syntax/closure/
catalog129schemaGitURLs/diffs PASS. BoundedlocalHTTP
[83/83bytes/hash/MIME](wings-local-native/fifteen-aircraft-build-readback.json)
includes52models/fonts/notices; serverclosed. No browser/capture/fullfleet,
install/newgame/service restart/push/waiver; native3D/human/listening/performance/
currentmenu andmissing001 held. Serial-owner alternatives(reverse-checked NOT
applied,chooseONE):
- `.tmp/wings-a10-f67b5810-source.patch` since885cbb2,5620005B,
  SHA256 `c7f8fa746160a20e48c8f376b950eb0e1d9af4421f70e40a074860a774ffdc39`.
- `.tmp/wings-a10-f67b5810-incremental.patch` sincec488b4ab,338717B,
  SHA256 `2ae83856beb5bbed0e878c798fb39cf1f777ebe755a979f22db47812f17658e8`.
Full retains previous narrow source allowlist+singleA10slice, excludes stale
`assets/`/generatedverificationbundles. Include raw/derived/rig metadata and rebuild
using existing tools; preserve newer main,never wholemerge/reset/duplicate full+
incremental. Supersede95487233 source alternatives,not historicalevidence.

Wingsonly341files33039935Btree
`324e12ffbb292bf0bdb8cea0eeff288cb94327c7`, foreigninventoryrowsexact. Remaining
5air(F35A,J20,Tu160,AH64D,Mi28N)/4suppliedcarriers+broadercombat/maps/weather/ASW/
native work unfinished. Stop singleA10Cunit, not wholecompletion or operator-only
permission blocker. Sole serialowner integratesoneproper narrowdelta preserving
newermain; no sourcepublicdeployment claim.

## Single F35A source87136b41 / evidenced2cdd007

Capped SINGLEaircraft slice from0de93d6e: b05015c8 assets, f6ba2421 native,
87136b41 parent, d2cdd007 sole observer.15→16/20suppliedair;6/10vessels unchanged.
Ordinary22→23=original7+supplied16. NATO appends F35A after prior8; East7 unchanged,
9/10vs7/10aircraft,3/5vessels each. Original hangar keys1–9/1–7, ordinary1–9 plus
arrows/Enter beyond9; aircraft-only. No second unit or new game/ID.

Exact supplied raw108228B/2278tri, pristine rigid rig, samehelper-derived148112B/
2678tri/native2678tri SHA256
`1dfd31db6e01e7604c4145617a3a0afb3b880bc28a8017b5e61ea6b061221ce5`.
Actual flaperonLRroll/tailplaneLRpitch/rudder_1/2yaw, one measured outlet uses
existing exhaust_core/exhaust static warm path. `afterburning:false` is a visual
opt-out ONLY, not a claim the real F35A lacks afterburning. Real engine AB is not
modeled here; no flame/cone/boost brightness/stretch, shader/clock or nozzle
mechanics added. Source land-based A is not a lift-fan/naval/VTOL conversion.
Sourcegeometry/UV/image bytes exact, common exterior not avionics/cockpit accuracy
certification. Original F35 art/recessed bays/stealth/weapons stay exact, not
relabelled or reused as the supplied F35A. User GPT/scopedpermission is not an
independent license/manufacturer/mechanical/photorealism certification.

1034poses/840static/20952posed-source rays/102corrupt prewrite guards, PNGCRCdecode/
UV/reproduction/Pythonmemorycompile PASS. All52olderGLBs/15descriptor+repairentries/
rigs/twelve old receipts exact; legacyBASELINES unchanged. Aggregate4759645B is
bounded4900000B,512000BperGLB unchanged. Fleet protects54GLBs/exact16fighter
metadata pins/61prewrite no-write negatives/reproduction PASS.

Arcade145/200m/s/stall55/HP450 with mediumfighter energy costs, not certified
A performance. Pilotcannon20/aim9, officerTVmissile; four EXTERNAL generic stores,
not a real operational fit, internal GAU22/caliber/bay/stealth/gear claim. No new
weapon IDs or burner voice. Boost is arcade power aid. Actual GLTF/PBR/signed
controls/single staticcore/weapon lock-fire-ammo-regen/stores/normalboost
NONCATAPULT takeoff/turn/stall/crash/reset/cameras/disposal PASS. Prior22specs/
rigs/bones/audio/cameras exact;138600old7/9/11/13/15/17/19/20/21/22flightticks,
22000coherent chooserRNG/all23finite incoming damage mandatory. Original F35
bay/stealth, Warthog gun/rockets, prior4static-core kinds, FA50AB and Mirage mixing
guards retained. CPU only, not nativepixels/input/listening/performance.

Parent armor1/bridgekind/canonical strictpreimage
`6e07fb9e93df0322ab1af769cd3e76f03e473b9e183a32377f70a4249a53e044`
updated together; drift/repeat/foreign-path negatives retained. Fresh15host/
23session/16bomb/6roster/7fleet/actualpicker-HUD-main/22000choiceRNG/two ordinary
outputs PASS. All16chosen aircraft spend actual gun ammo for fitted impacts in
declared approach/protection fixtures, foreign rosters reject. OldType022/CB90
fixtureHP986.5/985.15 unchanged. Same6ships/geometry/routes/HP/fourguns/2unarmedboats/
68AA/2capitalbars and one flight/damage authority. No invented operational capability.

**Current16kindcoverageFAIL:** SINGLEactualexit1/146.258s script/147s wall.
Same3fixed120s7200tick/default4bot/normalcarrier cases, no pose/control/HP/ammo/
skill/RNG/timing grants/seeds/retune/retry. Births11/7/10,projectiles75/141/159,
hits0/21/38,damage0/28.35/51.30. Bothteams fly each,14/16kinds across; Rafale/
Yak130zero births failstrictcoverage at sampling, not proven flight defects.
F35A2/2moving,9cannon20 shiphits/12.15damage. A10C1/1moving/6GAU8fireevents/0hits;
older A10hit receipt remains exact and is not promoted as current acceptance.

All59actualsource/owner/weapon/launchphase/fraction/position/tick/unit/damage
correlations independently PASS; exact actual weapon IDs, damage1.35cannon20,
no normalized labels. Type054A36/Type4516/Aquitaine5/Type0222,Type055/CB900.
Both boats fire0, friendly consumption0; Type022 taking hits does NOT enable its
static canisters or new weapons, nor solve under-deck aircraft physics. Outcomes
null/earlybranch unexercised/NativeNaturalStrikeBattleflagsfalse.238pins/54GLBs/
twelve old receipts exact. [FAIL receipt](wings-local-native/sixteen-aircraft-coalition-flight.json),
560740B SHA256 `996e2591e6d96f2e10ce8e77cffefe3ea1e66df8b29b86c23623b3730fc4af52`.

Build `.tmp/wings-f35a-review`:26files4038801B/generated3/3/19syntax/closure/
catalog129integeruniqueIDs/schema/GitURLs/diffs PASS. BoundedlocalHTTP
[85/85bytes/hash/MIME](wings-local-native/sixteen-aircraft-build-readback.json)
includes54models/fonts/notices; serverclosed. No browser/capture/fullfleet/
install/newgame/service restart/push/waiver. Native3D/currentmenu/human/listening/
performance and missing001 held. Superseding serial-owner alternatives (reverse-
checked NOT applied; chooseONE):
- `.tmp/wings-f35a-d2cdd007-source.patch` since885cbb2,5821723B,
  SHA256 `b82611990044a6109549094e31dd3aa9650b15f04c4b7697a9bb00844b88aa2b`.
- `.tmp/wings-f35a-d2cdd007-incremental.patch` since0de93d6e,304749B,
  SHA256 `300e33184fdfeb716511b519113d8c4840c3191dedf8a0308400c0b33b7021c3`.
Full retains previous narrow source allowlist plus singleF35A; excludes stale
`assets/`/generatedverificationbundles. Include raw/derived/rig metadata, rebuild
with existing approved tools and preserve newer main. Never wholemerge/reset or
duplicate full+incremental. Supersede f67b5810 delivery alternatives, not evidence.

Wingsonly344files33325012Btree
`6f296fe26c9cfabe1196ad0e329b39742743475d`,foreigninventoryrowsexact. Remaining4air
(J20,Tu160,AH64D,Mi28N)/4suppliedcarriers+combat/maps/weather/ASW/native work
unfinished. Stop singleF35A checkpoint, not wholecompletion or an operator-only
decision blocker. Sole serialowner integrates one proper narrowdelta preserving
newer main, no publicdeployment claim.

## READY J20/ten-objective follow-through sourceffc2daee

[Exact handoff to74](wings-ready-integration-handoff.md) records source base885cbb2,
fresh maind3dbb39e comparison, atomic source/evidenceffc2daee, changed-behavior
checks, source+incremental patches, original-UI frozen build hashes, exclusions,
remaining class adapters and unwaived native/release holds. Do not harvest54cd258a
alone: its pending parent J20 bindings are complete in92e66eeb.

This wave implemented J20 and all four remaining supplied carrier objectives,
not a docs-only checkpoint: assets0edc4834/nativefcd7abc6/carrierassets05dd7e6f/
composition54cd258a/bindings92e66eeb/declaredflightffc2daee. Prior aircraft/model
bytes and six old vessel units/routes/stats stay exact. Source goes16→17/20air,
6→10/10vessel objectives; ordinary23→24. Remaining Tu160/AH64D/Mi28N are explicitly
unimplemented, not substitutes for original native bomber/Apache. Real carrier
operations and wider combat/maps/weather/ASW/native work remain unfinished.

Explicit Rafale/Yak coverage is a declared test-only legal single-kind roster,
not a production chooser fix or random sampler success. Two fixed side-swapped
120s7200tick cases/default four bots/normal native carrier births/no input or
state grants: Rafale6/6airborne, Yak7/7airborne, exit0/95.289s script95s wall.
Only testconfig.aircraft differs; all10ships and every other field exact. Actual
own-carrier deck predicates, finite HP/poses, default skill and movement pass;
296source pins/64GLBs/13older receipts immutable. Receipt107826B SHA256
`716ea1930603c814d99451edc6a5d84907b2a3e13831929332bbc0ec91169d3b`.
Historical sixteen-kind FAIL remains FAIL; current17kind full-pool sampling unrun.

Current changed-behavior gates: J20native159300prior ticks/24000chooserRNG/all24
finite damage; fleet7groups1387136water probes/both unchanged138.7s battles;
24session/originalpickerHUDmain/30readiness10lifecycle; parent15host6roster and
generated3/3/19syntax/closure/catalog129/diff. Frozen original-UI build
`.tmp/wings-j20-ten-vessels-review`26files4066526B/localHTTP95/95byteshashMIME,
serverclosed. No redundant unchanged native/browser/full-fleet or random retry.
Wingsonly360files38424700Btree`403c67ed176265f7c4c22fc1f255cd1c33c5ab87`,
foreign inventory rows exact; global checkeronlymissing001. No fresh publication,
GPU/human visibility acceptance, push, install, game/ID or guard waiver.

## Helicopter source blocker and safe runtime restoration

The next class-specific implementation attempt preserved genuine AH64D/Mi28N
originals and rigs but failed real moving-geometry clearance. AH tail rotor40deg
crosses horizontal tail; Mi main rotor55deg crosses vertical fin; Mi tail rotor
crosses horizontal tail even at rest. Three independently reproduced triangle
witnesses are not hub-contact exclusions. Checker292signed bounds/rest poses+
97prewrite negatives PASS only as a reproduced BLOCKED-state regression. No
consumable helicopter manifest/derived GLB exists, no corrected geometry accepted.

Asset5feb3a26 and nativeefa89ed6 remain historical partials. The latter imported
the withheld manifest and was not buildable. Parent0057cf19 captures that native
candidate and pending measured-launch/armor delta in
`Games/Wings/authoring/supplied-helicopters/blocked-native-candidate.patch.gz`:
10574B SHA256 `f94b4be7dc2667b66e025820c8db603742ded6c48f9eff6df49c5293bca0a81f`.
Decompressed bytes36372/SHA256
`e150f33fec1ca414a80d6d5650d61c94b3177a8acb64c6c138594bac1450b5c8`
are exact; no evidence/history reset. Fourteen explicitly scoped runtime/check
paths return to1a1f674d byte-for-byte; no new rotor, rocket, gun or model kind is
registered. The future candidate also needs four-origin launch-index handling;
its existing %2 helper cannot be reported correct for four Hellfire positions.

Fresh `.tmp/wings-helicopter-hold-review` original-UI compilation/closure PASS,
all26files4066526B byte-exact to the prior READY build. This is dependency recovery,
not new flight/weapon/render/lifecycle acceptance. [Quarantine proof](wings-local-native/helicopter-quarantine-build-check.json)
SHA256 `d807fcc03d987d3d6bfd37350981700aa1d26c9d4601d7e6e18bfc6a69b0d01c`.
All64oldGLBs/17fighterentries/8fleetentries/13random+declaredRafaleYak receipts
remain exact. Current inventory370files38864136B/tree
`68065f91f17408b44eb9fcf8fb6527e9442d03cc`, foreign rows unchanged; globalmissing001.

The prior READY pins/patches are still the integrator's valid source selection;
new raw helicopter intake/checks/candidate patch are excluded from release scope.
Roster remains17air/10objectives/24ordinary, Tu160/AH64D/Mi28N unfinished. A
validated structural correction could be established by source-first local repair
or corrected supplied art; arbitrary large offsets, fake manifests and guard
waivers are not substitutes. Tu160 remains independent unfinished engineering,
so this is not a whole-scope completion or an operator-only global blocker.
No browser, full-fleet, repeated random/native pass, install, new game/ID, push,
cleanup worker or cancellation. Guarded ticket review preserves consumed/newer
answers; advice is not operator approval. Native visibility holds remain open.

## Supplied Tu160 runtime source6113df50

Assets871727a6/native3fda22c0/parent6113df50 add the genuine Tu160 with eight shared
EXTERNAL arcade bombs, measured centroid releases and existing native bomb physics/
controls. No real operational fit, internal bays, gun, stealth, sweep schedule,
new flames/shaders/clocks or helicopter activation. All prior24specs/rig/bones/
audio/cameras and B2bomb physics/default−3m release stay exact. See the updated
[READY handoff](wings-ready-integration-handoff.md) and maintenance232 Tu160 section
for exact source/asset/build pins, blocked-source exclusions and failures retained.

Fresh15host/25session/16bomb/6roster/7fleet groups,26000coherentchooserRNG/two ordinary
outputs, actualpickerHUDmain/generated3/3/19syntaxclosure/catalog129/diff PASS.
Declared model-origin bomb sharesammo8→7 and movingcapitalHP1000→0; initial20m
fixture crashed fittedterrain before weapon evaluation, corrected to safe100m
with measured target velocity, NOT production-rule retuning or natural bombing.
[Changed-behavior receipt](wings-local-native/tu160-integration-check.json) SHA256
`cc2cf22c946d7e8ccaf9b45bfbe2475c961fbedda865e40b3ae69e0ccdcaf9a6`.
Frozen `.tmp/wings-tu160-review`26files4079040B/
[HTTP99/99bytes/hash/MIME](wings-local-native/tu160-build-readback.json) PASSserverclosed;
2blocked raw helicopter inputs in HTTP are NOT registrations. Wingsonly379files/
39283592Btree`548e75994e6a140b9c07f67cbd35ab2a2355e8ca`,foreignrowsexact/globalmissing001.
Both named sides9/10air5/5vessels; ordinary25. Current18kind full-pool sampling
unrun, older randomFAIL/declaredRafaleYakPASS exact. Only AH64D/Mi28N source repairs
remain as registrations; broadercarrieroperations/combatmapsweatherASW/nativework
unfinished. No browser/fullfleet/install/newgame/id/push/waiver or scopecompletion.

## Native evidence remains FAIL

Both new attempts used the real source `12041cbf` entry, original Low setting,
initialized spawn-control criterion and the same 60 s deadline:

1. Headed Xvfb/default flags: Mesa llvmpipe GLES3.2 reported, but WebGL context
   creation failed at `getSupportedExtensions`; zero draws, 73.788 s overall.
2. Headed with the exact existing QA baseline GL trio: SwiftShader created real
   WebGL2; world-ready, two frames/30 draws/281,052 triangles, then failed the
   source renderer gate with `Unknown reason`. Overall 72.066 s, no gameplay.
   The retained context-loss warning is not independently proven to be the
   initiating fault rather than teardown after the failed renderer gate.

Full normalized receipts: `wings-local-native/remaining-headed-*.json.gz`.
No successful startup/flight/combat image. Owned browser/driver/Xvfb/server
resources ended; no new blocklist, sandbox/permission change, forced frames,
state grants, quality reduction or deadline weakening. The GL trio already
belongs to the committed public QA baseline.

Technical ticket `pi-667665-1793103751604-77ab4f3f` is answered: context works with
baseline SwiftShader, but neither existing software route demonstrates required
responsiveness on this board. No further flag iteration. The newer collision/AA
source above has CPU evidence, not a post-change native observation. Existing
live `885cbb2` identity readback is not proof that this milestone is deployed.

## Fitted bomb near-miss source5a7fd1d3 (after167a716a)

Implemented the next documented combat hold through existing native bomb and
fleet authority, not a replacement engine. Chain5c41fb75/1fcf8706/**5a7fd1d3**:
measured component-distance blast with native45m/1350peak falloff, authenticated
actual projectile identity, once-only impacts, shared sink/objectives/redaction
and one atomic replay action. No friendly/sub/unmodelled near-miss grants, filled
Type022 tunnel, direct-plus-near double damage, changed native aircraft splash/
FX/crater policy, production flight/weapon tuning or new clock. The last commit
is required: review found the middle commit's age restriction would reject a real
first-step water impact. Its dedicated native fireBomb CPU regression now passes.

Parent9near-miss/21bomb/15host/25session/22fleet/9geometry groups and main.ts
write:false compile PASS, generated3/3,19emitted syntax/catalog129/diffs PASS.
Fixtures spend actual8→7ammo and assert component falloff/native effects once;
low release pose/protection is test-only, NOT normal flight or natural AI bombing.
Original worker compile failure was unset approved tool environment; no install
was needed. Failures/correction retained in
[changed-behavior receipt](wings-local-native/bomb-near-miss-integration-check.json).
Frozen original UI `.tmp/wings-bomb-near-miss-review`26files4080528B/
[HTTP99/99](wings-local-native/bomb-near-miss-build-readback.json) PASSserverclosed;
no browser or native claim. Exact eight-path incremental patch/pins are in the
[updated READY handoff](wings-ready-integration-handoff.md#bomb-near-miss-follow-up-source5a7fd1d3-based-on167a716a).

18/20suppliedair/10objectives/25ordinary and129catalog remain unchanged; genuine
AH64D/Mi28N rotor contacts/quarantine and all model/historical observer bytes exact.
Current18kind random pool unrun; no sampling retry. Native visibility/human input,
AI bombing, missiles, carrier operations/maps/weather/ASW still unfinished. Wings
inventory380files39304830B/tree`4c9a1ec065e85f859016e43ae0cb0295ae9b3fe7`;
foreign rows unchanged, global checker only missing001. No push/new game/ID,
install/cleanup/waiver or scope-complete claim.

## Completed helicopter/source follow-through5b3065df

The latest operator's FIX order was implemented, not converted into another HOLD
report. All supplied aircraft are now source-registered. AH64D and Mi28N retain
actual helicopter dynamics, vertical aft-carrier births, spool-driven main/tail
rotor bones, fixed wheels and existing rotor audio; no jet substitute or fake chin
gun/turret. Generic external Hydra/Hellfire fits are arcade compatibility, not
real Mi28N Hellfire or certified performance/airframe mechanisms.

The first connected repair passed AH but exposed a distinct Mi main/tail rotor
collision at main−87deg/tail+5deg. That failed candidate remains byte-exact in
`clearance-record.json`. The accepted derivative moves both existing horizontal
stabilizers forward along their still-connected tail boom: AH.876022989591m,
Mi.844905485532m. Mi's entire main assembly rises.667406191251m, derived from
full tail swept TOP+.02 minus original blade MIN, and the SAME existing mast
extends coherently with fixed lower cap. No blade trimming or dropped contact.
All original GLBs/rigs/raw three witnesses/quarantined candidate remain exact.

Assets37d885bb and independent3ea48c9e:151688 triangle bounds/276 narrow source
mast-hub mating checks/261 independent rotor pairs/690 store separations/38856
launch rays/282 continuous rotor-ray proofs,117 new writer negatives plus97raw/
6coexistence negatives PASS. Earlier absent-destination corrupt-write defect is
fixed with literal SHA/size preflight before mkdir/open. Raw source checker still
intentionally returns1/BLOCKED; accepted derivative checker exits0. Tu16094old+
9coexistence negatives and all68 old GLBs exact. Existing maps/notices/metadata
and historical random/declared receipts are preserved.

Nativeee8c6c59/hosted563114/preview3144e12f/generatedguard5b3065df pass actual
27-kind incoming damage, all25 old specs/rig/bones/audio/cameras/physics parity,
real GLTF/PBR/4-vs5blades/four distinct missile rails/stores/refill/rotor pause/
reset and direct/aim helicopter controls. Both original spawn/input/seat/fire/
leave/fresh-room protocols pass. Separate two declared20s1200tick cases use
four default bots and normal own-carrier aft spots, all four AH/four Mi births
become airborne, without state grants. Fire fixtures explicitly expire protection
and supply approach poses: actual Hydra38→37, fitted HP1000→904. These do not
prove natural strikes, physical human input, cockpit pixels or native acceptance.
The missing-role preview crash was fixed by native fallback copy, not invented
agility/firepower scores. Both tenth rows and ordinary row27 use arrows/Enter.

Safe-contact AI bombing d159acb2/9216a12f reuses native bomber/run/drop/fins and a
measured inscribed aim radius, no hidden hull handles or synthetic lock IDs.
Four B2/Tu160 pilot/officer CPU fixtures spend shared8→7 and hit moving fitted
hulls;1200 old25 ordinary output/state/RNG comparisons exact. Natural bombing is
not accepted. Parent15host/27session/21bomb/three picker-HUD-menu groups pass.
Final original-UI build26files4122701B/generated3/3/19syntax/
[HTTP101/101](wings-local-native/helicopters-build-readback.json) PASSserverclosed.
First generated Astra failed stale25 expectation; exact27 guard corrected and
both builds/failure retained. [Full changed-behavior receipt](wings-local-native/helicopters-integration-check.json).
Worker98 disclosed4.25MB failed data-URL logs beyond3MB allowance; stopped without
cleanup, strict disk floor never crossed. No native/browser/full-fleet/push/install,
new game/ID, guard waiver or whole-scope acceptance. Source388files40059145B/tree
`409a468118806da443172753af7a274991a0145c`; global checker only missing001.
[Completed scoped source/build handoff to74](wings-ready-integration-handoff.md).

## Next implementation slices

1. Serial owner integrates the frozen source/build while preserving newer main;
   keep source, generated artifact identity and native verdict separate.
2. **All20 aircraft/10 vessel objectives are now source-registered.** Preserve
   repaired helicopter clearance and original UI/host bindings. Complete outstanding
   carrier operations/class fits without inventing capabilities; registrations and
   declared CPU flight/fire fixtures are not full20/10 native acceptance.
3. Finish native **Factions missile/bomb integration**. Direct bombs and safe
   gun/rocket targeting, fitted bomb near-misses and safe-contact AI bombing have
   CPU integration evidence. Native/natural bombing still needs gameplay evidence;
   FC seeker acquisition/guidance still needs implementation and single authority.
   Unsupported fits remain explicit; no invented lock IDs or damage grants.
4. Share map key/mesh/query/spawn/bathymetry across room, prediction, projectile
   collision and terrain workers; invalidate tile/shore/blur/tree caches. Only
   then expose functional map selection through the original menus.
5. Connect actual authority environment/time to daylight/fog/rain/cloud/lightning
   and sensing/preferences. Keep flight disturbance gain zero until prediction
   and controllability agree; no separate pretty-weather clock/unfair sensing.
6. Establish an actual symmetric modeled ASW fit before enabling submarines;
   then safe contact uncertainty/depth/water occlusion/attacks/HUD. MH-60R remains
   an asset/registration task, not an Apache rename. Never ship an uncounterable
   submerged unit or claim legacy fixture counterplay is an equipped frigate.

No model/roster/map/weather/submarine feature is complete merely because its
module/preview exists. Continue bounded implementation; whole-game and visible
gameplay acceptance remain open.

# JANKOLOCK arena translation contract

2026-10-20 operator pivot; implemented 2026-10-21. See the
[current build receipt](jankolock-release.md) for actual gates and limits, not
this specification alone. Supersedes the sliding
puzzle contract at `21d47aa`; puzzle mechanics research remains a historical
appendix, not the active specification. Reference identity is now resolved by
the operator as Valve's Deadlock. No faithful port or third-party asset reuse.
See [provenance](jankolock-provenance.md) for evidence and permission boundaries.

## Pivot delta and technology decision

Remove the grid, twenty puzzle levels, solver, slide/undo rules and endless
puzzle generator. Replace them with an original hero arena, bots, capture,
combat deaths/respawns, round results and between-round item drafting. Jank is
visible in movement/reactions but cannot corrupt aiming, collision or input.

**Decision: Canvas 2.5D gameplay, three.js trophy lobby only.** Fixed oblique
arena, ground-plane simulation and original drawn characters are smaller and
more reliable than a full browser 3D shooter. This sacrifices shoulder-camera
shooting, vertical traversal and lane/macro depth; do not market it as equivalent
to the reference. Offline solo with bots is the releasable core. Online is a
separate phase2, never a fake enabled button.

## Round and match rules

- Arena: 960x600 logical ground plane, four original static rectangular cover
  blocks, solid boundary, central circular capture zone radius 70. Two teams:
  player + one allied bot versus two enemy bots. No external maps/assets.
- Fixed-step simulation at 60 Hz, dt accumulator capped at 0.1s, no background
  catch-up. Rendering uses interpolation, never changes simulation state.
- Actors: 100 HP base, speed 150 units/s, circle radius 15; bullets speed 500,
  damage 14, cooldown 0.24s, finite lifetime/range. Cover stops actors/bullets;
  swept segment collision prevents tunneling. Shots cannot pass through cover.
- Capture: after a team alone occupies the zone for 1s, it scores 2 influence/s.
  Contested/empty zone stops scoring; kill adds 4 influence to killer's team.
  Show occupancy, capture warm-up and both influence totals explicitly.
- First 40 influence wins the round. Regulation 60s; higher influence at timeout
  wins. Equal influence enters sudden death: next kill or uncontested capture
  tick wins. No random tie coin, hidden score or fabricated result.
- Death: stop firing/control, visible 3s respawn countdown, respawn at safe team
  spawn with 1s shield. Shield cancels on shooting. Round does not end merely
  because all actors are temporarily dead. Reset actors/projectiles/cooldowns
  and influence between rounds; preserve only drafted items and match score.
- First 3 round wins takes the best-of-5 match. Result shows actual winner,
  round score, kills, capture contribution and Continue/Restart match. Player
  can lose; bots do not grant victory after a timer. No injected QA wins.
- Restart match returns hero selection, clears all items/scores/round state and
  pending input/audio/animations. Retry selected hero is optional explicit action.
  Pause stops all clocks; blur/hidden page pauses and releases held controls.

## Original roster: choose one hero, two abilities each

All names, silhouettes, descriptions and effects are independently authored.
No Valve hero names, silhouettes, icons, dialogue, character art or marks.

| Hero | Readable silhouette | Q / touch ability1 | E / touch ability2 |
| --- | --- | --- | --- |
| Tin Courier | Square helmet, paper satchel | Receipt Rush:180-unit swept dash,8s cooldown | Stamp Burst:three original cone projectiles,7s cooldown |
| Wobble Postmaster | Round padded coat | Filing Shield:absorb40 damage for3s,10s cooldown | Desk Slam:70-radius20 damage/brief knockback,8s cooldown |
| Rattle Clerk | Tall triangular hat | Carbon Copy:stationary decoy draws bot aim for3s,10s cooldown | Staple Fan:five low-damage spread shots,8s cooldown |

Abilities share authoritative collision/damage; knockback remains bounded and
cannot place actors inside walls. Show ability labels, cooldown seconds and
unavailable reasons. Bots use the same rules/cooldowns and visible projectiles.
Tune numbers after playtests, not by claiming these targets are proven balanced.

## Bot behavior and item draft

Bots steer toward capture via deterministic waypoints around cover, separate
from allies, and attack visible in-range opponents. Repath if blocked, retreat
briefly when badly hurt, return to objective. Line-of-sight checks use the same
cover geometry. Aim error/reaction delay is seeded and bounded, not wallhacks.
Display ally/enemy identity beyond color. No hidden player damage multiplier.

After every nonfinal round offer **three distinct visible items**, choose one
before next round. Effects apply to the player next round and persist for this
match; max four draft picks. Each bot also receives one comparable item per
intermission, shown in the round summary. Repeat items stack to a cap of 2.

| Item | Factual effect |
| --- | --- |
| Thick Envelope | +20 maximum HP and round-start healing to new max |
| Greased Soles | +10% movement speed |
| Extra Staple | +15% basic-shot damage |
| Quick Forms | -10% basic-shot cooldown |
| Pocket Thermos | -10% ability cooldowns |
| Union Badge | +10 shield on respawn, no capture-score multiplier |

Seeded PRNG fixes offer order/bot choices per match seed/round; no clock-based
randomness. Exclude items at cap, enough eligible items remain through four
picks. Choosing twice, keyboard autorepeat or late pointer events cannot grant
two upgrades. The draft is an explicit state boundary; combat remains stopped.

## Controls, layouts and feedback

- Desktop: WASD/arrows move, pointer aims, held primary button fires; Q/E
  abilities, P/Escape pause. Keyboard-only aim uses IJKL, Space fires. Ability
  buttons and hero/item cards are native focusable controls with meaningful labels.
- Touch: left movement stick, right aim/fire stick, separate44px Q/E, Pause and
  Restart. Pointer ownership/cancellation prevents stuck movement/firing. Touch
  gestures on controls do not scroll; page remains scrollable outside playfield.
- Lobby: hero cards and ability explanations, trophy hall control, Start match.
  Match HUD shows round/first-to3, scores, time, capture and health/cooldowns.
  Draft and results replace side panels, not cover the arena with redundant cards.
- Desktop landscape has arena + compact side HUD. At320px, arena scales with
  separate readable HUD/touch controls below; no clipped buttons or horizontal
  overflow. Both themes, visible focus, labels/patterns beyond color, readable
  contrast, local/system fonts, flat solids/black actions. No gradients, emoji,
  em-dashes or Comic Sans in authored game copy.
- Jank: springy cosmetic torso tilt on turns, consistently offset drawn muzzle
  flash without offsetting shot trajectory, short original synth stamp/bonk/
  victory/failure sounds. No misleading aim marker, fake lag or random penalties.
  Motion-off/reduced-motion removes wobble/shake; persistent Mute. Native WebAudio
  starts only after gesture, with text feedback when audio is unavailable.
- DPR cap2, render only while active or dirty, stop RAF on unmount. Storage
  optional for settings only; malformed/unavailable storage cannot block play.

## Portrait: lobby-only trophy gag

Operator supplies an in-house photo-derived bas-relief generated2026-10-20.
Exact input: `portrait_relief.glb`, SHA-256
`abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9`,
10,972,672 bytes,421,968 triangles from inspected metadata. Do not silently
call its supplier's explicit photorealism FAIL a PASS. No fabricated substitute.

**Keep exact bytes, lobby only; no decimation.** It is outside the gameplay
scene budget. After capacity clears, copy into `Games/Jankolock/assets/`, run
compatible glb_stats/full integrity checks and record exact hash/size. Reject
external resource URIs or malformed buffers/accessors. If absent or invalid,
ship core without portrait and disable hall through a local guaranteed-present
manifest, with factual unavailable text and no guessed404 request.

Local three.js r160 core/GLTFLoader/BufferGeometryUtils/MIT from Circuit Ward
read-copy to Jankolock vendor/, relative imports only. Donor files stay untouched.
Library pin: `d04539a76736ff500cae883d6a38b3dd8643c548`; closure1,414,498 bytes.
No CDN, downloaded runtime dependency or remote font/script/asset.

Lobby camera faces the bust/pedestal; small original player pawn moves on the
floor with WASD/touch and bumps a simple cylindrical pedestal collider, not the
422k-triangle mesh. Bonk reaction never modifies supplied geometry. Optional
three-bump smash gag can hide the intact bust and show primitive confetti; Reset
restores it. This optional gag is not required for core acceptance. Camera-fit
and light setup must preserve the supplied colors, not repaint the subject.

Lazy-load once on explicit Hall entry, abort/dispose on Back/Start/reset; no
portrait/vendor requests during combat. If WebGL unavailable, show truthful
unavailable state and let Canvas play continue. Pi SwiftShader cannot establish
supported-GPU render acceptance. Separate DOM/HUD, exact-byte GLB load, actual
preview image and named-device hardware evidence. Supplier previews are not a
new Jankolock lobby render; exact-file preview remains a required gate if enabled.

## Implementation ownership after capacity clears

Four sol6.1 lanes, disjoint files, bounded tasks and explicit-path commits, no
switch/main/push or other swarms' files. Orchestrator owns contracts, integration,
line-by-line diff/subjective review, provenance/catalog/manual and gate decisions.

| Lane | Exclusive files | Boundary |
| --- | --- | --- |
| Core | `Games/Jankolock/engine.js`, `scripts/test_jankolock_engine.mjs` | Pure fixed-step rules, bot steering, collision, capture, round/draft/match state |
| Data | `Games/Jankolock/data.js`, `scripts/test_jankolock_data.mjs` | Roster/item/arena constants, seed offers, validation/golden checks; contract first |
| UI | `Games/Jankolock/index.html`, `style.css`, `ui.js`, `scripts/test_jankolock_browser.py` | Canvas art/native controls/audio/lifecycle and normal-input browser proof |
| Lobby | `Games/Jankolock/portrait.js`, `portrait-config.json`, `assets/`, `vendor/`, `scripts/test_jankolock_portrait.py` | Presence/integrity manifest, supplied bytes/local MIT closure, isolated3D lobby |

Core state modes: `lobby`, `playing`, `paused`, `roundResult`, `draft`,
`matchResult`. Read-only detached `snapshot()` exposes scores/actors/offers for
assertions, never QA mutation hooks. UI submits validated input/hero/item IDs;
core alone advances scores, damage, drafts and winners. Rendering never grants
state. Agree minimal API before parallel edits: `createMatch`, `step`,
`selectHero`, `chooseItem`, `advanceRound`, `restart`, `snapshot` and frozen data.

## Online phase2, not part of releaseable core

Read-only local precedent: Circuit Ward's `multiplayer.js` and
`docs/circuit-ward-qa.md` use manual full WebRTC offer/answer, `iceServers: []`,
host authority, bounded32KiB signaling/16KiB data, payload validation/backpressure.
This is an inspected implementation precedent, not proven Jankolock MP research
or deployed multiplayer. Hivemind search could not authenticate; fallback index
was unavailable. No hidden prior-MP evidence is claimed.

Future design must separately specify host-authoritative capture/combat/draft,
input sequence/epoch checks, disconnect behavior and round consensus. No STUN/
TURN/signaling/backend/accounts/room codes/proxy changes. Manual LAN/browser
compatibility is unverified; solo remains usable offline. No online UI claim
until separately authorized, implemented and tested. Do not copy existing MP
code or weaken its validation speculatively.

## QA and shipping requirements (results in current build receipt)

1. Small assert-based engine/data regressions: swept bullet/actor collisions,
   cover/LOS, capture contention, death/respawn, scoring/time/tie boundaries,
   single item application, item caps, first-to3, deterministic replay/restart.
   `node --check` every authored JS; audit all runtime loads and license closure.
2. Interactive Playwright: select a real hero, start, play **two complete rounds
   versus active bots** with ordinary key/pointer/touch events. Verify fired shots,
   abilities, actual capture, deaths/respawns, a real round win, item offer3/pick1,
   applied next-round item and restart. Assert snapshots/DOM without granting
   health/score/time/position. A scenario that never wins is failed QA, not a pass.
3. Mobile viewport/touch, desktop, both themes, pause/focus loss, storage failure,
   reduced motion/mute, no overflow. Fresh lobby/gameplay/draft/result screenshots
   reviewed by orchestrator VISION; no numeric self-score substituted for judgment.
4. Portrait glb_stats/integrity + exact-file preview; bump/pedestal/Back/disposal,
   unavailable WebGL, missing asset, no combat asset requests. Report loaded vs
   rendered vs genuine hardware verification separately. No fake screenshot.
5. Bounded servers only, ports>=8910. Targeted game smoke with selected-count1;
   unchanged failure filters. No full fleet run in this scope. Full all-games
   smoke remains mandatory before any separately authorized push; no push here.
6. Recheck live catalog before ID240 registration, factual original-genre desc,
   Git-backed URL/schema/unique IDs, own maintenance page/inventory coordination
   and `python3 -B scripts/check_maintenance_docs.py`. Pre-existing dirty Wings
   files block its global guard; never stage/reset them to manufacture a pass.

The initial 1,286,856,704-byte capacity hold was cleared by operator action.
Build resumed only after independently measuring 2,670,514,176 bytes free.
Keep the 2,147,483,648-byte floor. No broad checkout, installs or full-fleet
browser run; source/tests and exact lobby asset were added narrowly. Current
storage/registration/native/smoke status is in the build receipt. Optional smash
prop was not implemented; supported GPU and all-hero native balance remain held.

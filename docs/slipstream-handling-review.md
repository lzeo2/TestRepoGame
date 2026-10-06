# Slipstream handling review

**Verdict: source-only / HOLD.** Frozen source checkpoint: `d400195`. Later Main commits, native harness results and screenshots are outside this review. No runtime edits, browser execution, native gameplay, screenshot review or hardware acceptance were performed. This is maintenance of the existing original game, not a new game or ingestion.

## Scope and evidence

Read the code-quality contract, maintenance index and Slipstream manual; traced controller `script.js`, `core.js`, `world.js`, `clock.js`, `map.js`, `view.js`, `index.html`, `style.css`, shared model changes and Patrol reuse. Locations below are at `d400195`, with game paths relative to `Games/Slipstream Borough/` unless otherwise stated.

Worker changes inspected:

- `470156b`: only `assets/car-arcade/models.js` and `scripts/test_car_arcade_models.mjs`; shared live body/cockpit geometry refinement.
- `b989840`: only `core.js` and `scripts/test_slipstream_steering.mjs`; bounded city yaw and reduced highway lateral steering.
- `d400195`: integrated controller/camera/map/scenery/recovery changes. This report does not certify the tests merely because their files exist.

The requested delegation configuration was explicit Codex/Astra, high reasoning. Commit identity and scope do **not** establish actual provider/model execution. Current worker execution logs were not available as repository evidence inspected here; no model-provenance PASS is issued. Historical manual statements about earlier workers are not proof for these workers. No further delegation was made.

The frozen inventory is stale: it records entry `ef1f32cd5e0520c46cb84fcba66eed0749bc936f` and tree `3cd34174b0f75d51d1d1ce5d5133e8e7975f48f6`; actual frozen entry is `300eb1498946667fc663ec4d49fc73514393648e` and tree `2bd1aa023bda0aa0dabcc504cc8ae11359534e0a`. Current `python3 -B scripts/check_maintenance_docs.py` exited 1 with `AssertionError: Inventory stale: inspect changes, then run --refresh.` Refresh/manual updates belong to Main, not this report-only lease.

## Findings

No HIGH-severity defect was established from the inspected source. The following MEDIUM findings are actionable; pending acceptance scenarios below must not be represented as confirmed defects or passes.

### M1: Map summary loses its native Space activation and can spend a kit

**Location:** `script.js:222-232`, `index.html` map details/summary.

The global keyboard handler exempts buttons/inputs but not `summary`. With the Map summary focused during a run, Space reaches the deployment branch, calls `preventDefault()` and queues a mounted kit instead of toggling the disclosure. This defeats a primary native keyboard affordance and may consume a charge while trying to close an obstructing map. Enter still has its default behavior; this is specifically a Space conflict, not a claim that the whole disclosure is inaccessible.

**Minimal fix:** exempt native summary activation keys before gameplay shortcuts (preserve explicit M if desired). Regression: focus Map, Space closes/reopens it without deployment; Space on the viewport still deploys.

### M2: Crash damage reports a net frame change, not collision damage

**Location:** `script.js:134-137,195-199`; `core.js:246-248,319-326,368-370`.

Repair adds up to 20 HP before collision damage in the same fixed step. Feedback subtracts the previous run HP from the final HP. A repair-and-contact step therefore understates actual damage; with enough toughness, net HP can increase, yielding a negative damage amount behind an already prefixed minus sign. The new notice promises actual crash body damage but measures net change across unrelated operations.

**Minimal fix:** expose the actual collision HP decrement from the simulation, or explicitly describe the displayed number as net body change with correct signed formatting. Do not duplicate armor calculations in the controller. Regression: simultaneous repair and contact for stock and upgraded armor.

### M3: Newly created timers immediately consume time from before their creation

**Location:** `script.js:190-210`; `clock.js:1-3`.

A collision or terminal transition inside the fixed-step loop sets a fresh four-second notice or three-second recovery timer. The subsequent timer branch subtracts the entire outer-frame `dt`, including time before the event. A terminal transition can also clear the accumulator while the same frame still deducts all its time from recovery. With the documented 250 ms catch-up ceiling, recovery can begin up to a frame early, and a late collision in a catch-up frame receives less than its requested four active seconds.

**Minimal fix:** do not tick a timer on the frame that created it, or account only for eligible time after the transition. Apply the same eligibility gate to notice time as simulation time (`!blocked`, valid view), rather than only `!paused`. Regression: terminal/collision on the last substep of a 250 ms frame, then pause/help/blur/hidden and resume.

### M4: Fixed open-map placement has no exclusion against driving controls

**Location:** `style.css:36-51,55-75`; `index.html` initially open map.

HUD, map and driving controls are independently fixed with the same z-index. The map has a hard-coded top of 208 px (70 px on short screens), an open canvas, summary and legend, but no available-height limit or relationship to the bottom controls. On sufficiently short portrait screens its box necessarily extends into the control band or outside the window; body scrolling is disabled. Later DOM driving controls may cover part of the map, rather than solve the collision. Exact overlap at target phone sizes remains unmeasured here.

**Minimal fix:** constrain the open map to the space above driving controls, or default it closed when that space is insufficient. Keep its close summary reachable and prevent map content from intercepting critical controls. Main should check 320/390 portrait and 844 landscape with kit/notice present, both themes, real hit targets and focus; this report supplies no screenshot acceptance.

## Traced contracts and remaining acceptance limits

### Handling and frame ownership

`core.js:273-279` uses the shared effective handling value for all fleet IDs: low-speed yaw grows with speed through 5 m/s, blends over 5–20 m/s, then caps at `1.1 * handling / (handling + 2)`. This is **not** a minimum moving speed of 5 m/s and does not permit stationary city rotation. The high-speed cap stays handling-sensitive. Highway lateral motion is independently scaled by 0.7 at line 330. Fleet-specific behavior and upgrade feel need current evidence, not inference from one starter drive.

`script.js:146-148,195-197` ramps steering at five units/second in fixed steps: neutral to full takes 0.2 active seconds; full opposite lock takes 0.4 seconds. `clearInput()` resets steering, held keys, deployment and frame remainder. Start, phase transitions, pause, blur and visibility all route through this boundary. `frameDelta` consumes RAF timestamps, not calendar/year time: backward deltas become zero, visible stalls cap at 250 ms, and reset drops stale elapsed time. Long stalls intentionally lose simulation time; there is no wall-clock/FPS guarantee.

### Terminal ownership, payment and recovery

All live simulation steps route through `script.js:197`. `finish()` has the running-phase/terminal guard and is reached from that transition or city `leave()` via `parkRun()`. It settles once before entering end phase. `settleRun()` (`core.js:398-408`) validates reservation, settled counter, selected car, stats and loadout before banking. Busts retain ordinary mileage/near-miss earnings but get no completion prize (`core.js:184-190`); that is the existing settlement contract, not unpaid abandonment.

Nonterminal crash Respawn stores the mode, enters garage (discarding the run without `parkRun`/settlement), then calls the same `start()` as a normal launch. Terminal Respawn does not settle again. Every restart obtains `core.startRun()`'s new ID and must save that reservation before play. Auto gas turns off and phase changes clear held controls. Ordinary completed Retry uses `start()` directly; it is not the failure auto-respawn path.

Zero body, arrest at three seconds and timeout all produce `busted`; finish/escape/park do not auto-respawn. The result cause prioritizes arrest over zero HP when simultaneous (`script.js:115`). Outcome priority is bust before finish/escape in core. That precedence should be tested, not silently changed as a style preference.

The recovery timer requires end phase, unblocked save, renderer, closed dialogs and document focus; hidden RAF stops entirely. Help opens a modal and pauses a live run, and end-phase Help freezes recovery via the timer gate. New-run help acknowledgment follows the existing start path. Storage event handling pauses/locks, and synchronous reservation/settlement failure also blocks further writes. Read/compare/write storage is not atomic across noncooperating writers. Required Main checks: settlement failure then retry, conflict during countdown, no second payment, unpaid manual abandonment, same-mode fresh reservation, held-input/Auto gas clearing and focus/visibility/help freezes. None ran here.

Natural arrest is not established by reading `arrest === 3`: city police pathing/contact and highway containment feed that clock (`core.js:286-300,356-381`). A naturally reached arrest and wreck/timeout need distinct observations; a synthetic terminal fixture proves only the fixture path. Existing city police/player interpenetration remains visible in the source: cop motion checks buildings, not vehicle separation, then damages at distance under four. It is pre-existing and not repaired by contact discs.

### Map, camera and scene

`map.js` draws immutable WORLD block extents and actual city NPC/player world coordinates; the arrow uses negative heading to match north-up canvas coordinates. Highway positions use signed distance relative to the player and lane X. Police use squares, other NPCs circles and player a triangle. Offscreen markers clamp to the boundary, so an edge marker is not an exact distance indication. There are no historical movement traces implemented; if “traces” means trails rather than live position tracking, that remains absent. Text reports location/counts, not the entire spatial map.

`view.js:323-328,390-419` separates small 0.04 highway cosmetic yaw from city heading. Chase heading uses exponential rate 2.5 and both eye/aim use follow heading; pause passes zero visual dt. Cockpit retains physical local eye/target metadata, with slight roadward pitch. New runs/camera switches snap through existing reset logic; pause alone does not authorize an animation reset. City obstruction still raycasts the hidden shared footprint proxy after smoothing. Lighting changes do not establish readable road/cockpit contrast or absence of camera penetration.

Highway windows/roof edges/posts are three static instance batches whose scrolling offsets match the corresponding building/post periods. Contact discs are one bounded 48-instance batch, three discs per car, sufficient for the current population ceilings (player + at most seven traffic + two police + three rivals). Their y positions sit above current road surfaces. This is cosmetic grounding, not collision separation, real shadows or measured performance. No third-party runtime load was added in the inspected changes.

### Shared factory ABI and lifetime

Factory callers traced: Slipstream player selection and NPC creation (`view.js:250,347`), Garage Borough slot creation (`Games/Garage Borough/view.js:62`) and Patrol's Lantern reuse (`assets/car-arcade/patrol.js:86`). Disposal is final-view teardown, with Patrol resources disposed before shared cars in Slipstream (`view.js:460-462`). Removing NPCs does not dispose shared model caches. Shared changes therefore need both game consumers and Patrol checked, not just the Slipstream starter.

The worker preserves named body/trim/glazing meshes, four wheel meshes, immutable cockpit/profile/dimensions metadata, cached geometries/materials and explicit final disposal. Actual geometry bytes and triangle counts changed; previous fingerprints/counts must not be described as unchanged. New interior gauges are static geometry, not live instruments. Newly created scene instance buffers are included in scene traversal disposal; owned geometry/material resources are disposed separately. Repeated creation/removal/recreation, every fleet geometry budget, Patrol livery attachment, physical cockpit clearance and both consumer renderers remain acceptance requirements, not measured passes here.

## Handoff

Main owns native verification and source/manual/inventory corrections. Keep that pending result separate from this source-only HOLD. No release, push, full-catalog smoke, gameplay, native input, screenshots or hardware pass is claimed. Report-only changes do not alter the catalog or game count. Initial working status was clean; storage check reported 2.5G free. Only this new report is owned and staged.

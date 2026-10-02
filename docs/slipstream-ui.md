# Slipstream presentation worker #102

Original implementation under `car-arcade-plan.md`; genuine session provider/model `openai-codex/gpt-6-astra`. Session log basename `2026-10-02T13-04-11-309Z_01a0fcb7-122a-7163-a7de-7f5576072a77.jsonl`. Source dependencies read in full: shared fleet/models/storage/skin, pure core and core report. Core source frozen at `446fd4b`, fleet/models `a8edf08`, storage `5278134`. No existing game, shared/vendor, catalog, manual or inventory changes are owned here. No registration or push.

## Runtime

`index.html`, `script.js`, `view.js`, `style.css`, `CREDITS.md` implement the new presentation. `createView(host)` returns `draw(profile,run,steer)`, `turn(amount)`, `inspect()`, `dispose()`. One renderer canvas, DPR1, single controller RAF, 60Hz fixed simulation steps capped to .05s elapsed input; hidden pages cancel the RAF and pause. Keyboard/touch holds clear on blur, pointer up/cancel and transitions. Garage orbit, 16 fleet cards and real transactions use the shared factory/core; no vehicle replacement boxes or model reexports.

World entity transforms use `z=-(entity.distance-run.distance)`, with traffic/police/rival identity retained and removed groups never disposing shared resources. Factory disposal occurs only after final renderer teardown. Road markings/buildings use instancing. Diagnostic getter `window.slipstreamSnapshot` returns deep-frozen detached `{phase,paused,profile,run,view}` with measured renderer frames/triangles/drawcalls/modelId and world entity counts, never THREE objects or mutators.

Start saves the reserved profile before simulation. Terminal transition settles once; garage abandonment/reload never pays an unfinished run. Saves contain banked profiles only. Live failure locks further automatic writes and never accepts failure RAW as a token. Corrupt initial bytes remain untouched. Error plus raw=null means unread/unknown: explicit reset is refused until a successful read is possible. Native reset confirmation captures exact observed bytes and checks them again on write; cancellation writes nothing. Other keys are untouched.

**Current integration supersedes the following original hold:** Main added/tested upgradeCost atc090df0 and full-width/mobile layout at801240a; frozen native Slipstream checks exited0. Worker102 itself later timed out143, no completed final reply. See [integration checkpoint](car-arcade-integration.md) for actual evidence/remaining holds. Original source-milestone note follows.

Core ABI hold: frozen core has no upgrade cost quote function. Upgrade actions call `upgradeCar` directly and display actual charged cost afterward, without a duplicated pricing formula. Pre-purchase upgrade pricing remains held pending a core export. Controller can consume `upgradeCost(profile,id,kind)` if Main coordinates that ABI; its signature must be confirmed before integration acceptance.

## Verification checkpoint

Implementation committed before native checks. Runnable bounded native check: `xvfb-run python3 -B scripts/test_slipstream_ui.py`; it uses ordinary fresh profiles and real keyboard/touch controls, with separately labeled assisted progression in an isolated context. No snapshots mutate state. Optional private Radio input is supplied only through environment, never printed. Screenshots contain ordinary gameplay only. Evidence output directory `.tmp/slipstream-ui/` is untracked. No physical-hardware FPS, campaign balance, full-catalog gate, or release claims follow from software WebGL checks.

Initial free disk bytes 2335551488. Final test exits, images, counters and disk check will be appended after execution. Maintenance inventory presently has no new-game page; Main owns the required manual/inventory refresh. Existing historical source reports are not current acceptance.

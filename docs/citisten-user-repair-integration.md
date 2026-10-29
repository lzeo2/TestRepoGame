# Citisten screenshot, seed and usability repairs

## Source-ready; bounded HUD DOM verified, native visuals unaccepted

The user's screenshot is sufficient initial evidence: broad green terrain/water
bands, a water-dominated view, large stacked panels and utility clipping. The user
also reports motion, unchanged worlds across seeds and unintuitive interaction.
Original tested build remains unspecified. No demand for another initial capture
or obsolete device approval blocks this work.

**Rendering artifacts, whole-world motion, actual seeded/native HUD visuals
and native Water/Save/Continue remain UNPASSED.** These repairs have CPU/source
proof, not a demonstrated cure of the screenshot. At the original source-ready
checkpoint no Citisten browser admission was issued; Slipstream's release did
not grant one and no browser/server/screenshot was produced then.

Subsequently, explicit operator-relayed admission authorized one DOM-only pass.
[Actual result](citisten-user-hud-visual-result.md):8/8 default-town viewport/theme
checks, four reviewed both-theme sheets with an explicit world/renderer double,
zero errors/external requests/WebGL calls and verified owned closure/release.
No runtime change, native GPU retry, install, export, push or deployment. The
854×569 layout remains dense; this does not certify actual playable town visibility.

Source pin`78faf916182be40f757d5a2928d0f04d82886d6a`, runtime tree
`1500eca1b81e4ffa8b5cc6a8c9f242256e0c7043`:228files/35,196,186bytes,
+7,871 bytes over published`ff06ce5f`. Catalog129/projects135, games added0.
Models/vendor/fonts are byte-identical. Private v2 is unchanged. New source is
not pushed/deployed; published233-file proof belongs to the preceding release.

## Ownership, interruption and commit boundary

[Pre-delegation contract](citisten-user-repro-repair-contract.md) records exact
interfaces and scope. Current guarded ticket generation`a72aeefe` succeeds earlier
user-turn generations without interpreting expiry as bug resolution. The
lifecycle CLI performed open/review/CAS-answer; no direct ticket edit or stale resume.
Models stayed sol/astra, high. No subagents or settings changes.

The three original worker calls ended143 when a scheduling message interrupted
the harness. Actual processes were gone; their WIP was preserved and resumed in
same-model/same-path six-minute finishing lanes. No work cancellation was inferred.

| Source commit | Ownership / meaning |
| --- | --- |
| `5ac374ae` | HUD/UI, two existing checks, new HUD check and receipt, isolated paths |
| `d9f13107` | Mixed render+seed commit: six rendering files AND five concurrently staged seed files |
| `50a2307d` | Seed legacy-slot follow-up and attribution |
| `87c9894e` | Render shared-index collision receipt, no rewrite |
| `44f0be47` | Parent native/save/clock/incident/framing integration and portable tests |
| `78faf916` | Parent on-demand Map default and regression |

Do not claim d9 is ownership-isolated or cherry-pick it as render-only. An explicit
add followed by a plain commit consumed sibling staging; source was not reverted
or history rewritten. Final reviewed snapshot is the READY boundary. Parent used
path-only commits. The four old source-only temporal diagnoses/checks at f66 were
handed off separately and already integrated locally by the sole main owner;
those are not evidence that these new repairs have shipped.

## Rendering and camera

[Rendering receipt](citisten-user-render-repair.md) and runnable check execute
actual local GLBs/Three with declared renderer/image-header doubles. The adapter
forced positive factor1/units4 polygon offset onto actual, noncoplanar terrain.
Under its stated D24 model, old bias41.2245 exceeds one sampled land/water depth
gap19.5499 steps. Ten viewport/DPR cases show old depth reversal and zero sampled
reversals after removing only that override. Asphalt offset, water height, fog,
geometry, materials/maps, art, LOD/DPR/shadows and quality stay unchanged.

This proves a source depth-order hazard under an explicit model. It does NOT
prove z-fighting, shader correctness, green-band pixel resolution or user-device
GPU behavior. No fog concealment, blanket animation removal or speculative
shadow-bias change was made.

Desktop starter minimum height215->180 increases actual hall projection at
1367x910 from59.18 to74.22px; terrain/FOV fitting still takes priority. Existing
756 legacy fits and new1890 fits pass. Parent additionally found the widest seeded
phone crossing missed the intended8% side margin at the400m height cap: seed
4294967295 reached x366.28 on390px. Derived retreat now preserves fitting without
raising height/altering input;96 size/seed/viewport cases include this old-red
case. This is frustum/source-envelope evidence, not DOM occlusion or readability.
Capture-keyup, clearance, easing and deliberate camera controls remain.

## Seeded terrain and saves

[Seed/save receipt](citisten-seeded-terrain-repair.md): the old river generator
ignored seed entirely. The shared generator now accepts optional terrainSeed.
Omission AND explicit0 retain exact legacy geometry; nonzero unsigned seeds vary
course/banks deterministically, independently of mutable simulation RNG. New
optional state.terrainSeed is strictly validated. Saved absence wins too: never
regenerate an old town from economy/event seed. Storage key/version remain1.

CPU proof includes1,403,332 legacy samples,100,170 seeded rows,6,048 fuzz cases,
20 geometries,45 legacy snapshots,40 real storage round trips,15 partial-build
restores and12 corruptions rejecting before roads/slot mutation. Ten seed pairs
differ by548..2400 water cells and2.08..10.21 lots of course. Those are actual
terrain/geometry differences, not resource-only changes or native visual proof.

Parent passes seed only for an explicit new town, forwards saved layout/seed into
world.setTerrain and preserves seed/layout on Restart. World/minimap caches are
seed-aware. Incident flood terrain reconstruction also now includes seed; actual
instance elevations follow1/42/0/legacy switches instead of a stale layout-only
course. Native fixture verifies seed1/42 masks, renderer arguments and invalid-new-
seed Continue bypass. Legacy flat absence survives native Continue AND Restart.

New town/restart asks standard confirmation when active or stored town exists,
including saved-only startup. Cancellation preserves sim/roads/models/menu/save
bytes. Changing seed alone has no effect. Accepted new town does not immediately
write the old slot; dialog explicitly warns that subsequent save/autosave replaces
it. Continue bypasses this confirmation. Invalid mode rejects before world removal;
storage denial still permits a first town. No real user storage was touched by tests.

## HUD/onboarding and native integration

[HUD receipt](citisten-hud-onboarding-repair.md): compact wrapping stats, explicit
available/needed utilities and zero-demand meter state, one actual next-action
line, expandable economy/progression, named routine events, urgent/action notices
retained, three concise first-town steps. Source selectors, theme,44px/focus and
storage-failure behavior remain. UI respects callback false without closing/reset;
Continue does not parse unrelated new-town fields.

Parent places speed/weather/repair inside existing Controls, camera buttons/help
first, with concise selection-versus-placement guidance. Native and UI share the
same building labels; placement/construction failures retain actual reasons. Map
starts closed on all widths and remains available through its native summary.
A future admitted native harness must open Controls normally to change Speed;
no collector pins or500ms/5s gates were weakened to compensate for the new layout.

The later admitted DOM-only pass captured all four target viewports1367x910,
1024x768,854x569,390x844 in both themes. Four visibly labelled contact sheets were
reviewed: no tested default-header clipping or horizontal overflow;44px targets,
expanded Controls scrolling and ordinary Water selection work. This supersedes
the source checkpoint's unrun default-HUD gate, not native/gameplay acceptance.
Short-landscape density, dense-town/incident/economy states and actual world
visibility remain limits; the renderer double cannot prove polished native play.

The separate confirmed visual-clock defect is repaired: native keeps its existing
single frame owner busy only while shortest circular phase residual is unsettled.
No new RAF/timer, always-running loop or game-clock change. Pinned old source
strands phase.34 vs.27 at60/120Hz; current code settles before sleep and unrelated
wakes no longer change shading. Night Save/Continue settles to0. Snapshots, slot
bytes and fixture matrices stay fixed. Running/shots/camera/hidden/dt0 ownership
and original Continue assertions remain. This does NOT explain the old10x native
completion failure or establish either user-reported visual cause.

## Verification and remaining gates

Twenty-two targeted Node executables passed;18 changed/new JS syntax checks,
catalog129/schema/unique IDs/Git URLs and diff checks passed. Seven affected checks
were replayed after the final Map change. Four pinned-old/new causal checks use
published ancestor017e4a47, whose entire baseline game tree exactly equals f66;
this avoids an unpublished source-branch dependency after integration.

New combined check:

```sh
node --experimental-vm-modules scripts/citisten_user_repair_integration_check.mjs
```

Actual result includes native confirmation/seed/save/legacy/storage-denied/named
feedback, five flood seed switches and96 framing cases. Clock check now proves
old-red/current-green rather than labelling reproduction of the old bug a repair.
Other commands and exact metrics are in the three linked lane receipts. Logs:
`.tmp/citisten-user-repair/combined-checks-attempt{1,2}.log`,
`published-baseline-checks.log`, `compact-map-final-checks.log` and final pin logs.
Initial city-event-effects invocation lacked the required VM flag and exited1;
raw failure remains. Correct invocation passed without source/assertion changes.
The original three aborted143 worker records and shared-index error remain.

Static native-parser closure resolves39 local entry modules plus tracked styles/
fonts, no external imports. This is NOT new served-entry HTTP/MIME/execution proof.
New separate233-hash freeze `.tmp/citisten-user-repair/freeze-user-repair1.json`,
SHA256`f42a31c4092282fbebfa8b494322460ba63d5741e179d214f706f9d368dc4da6`,
records exact source78 and all fonts. Prior manifests remain unchanged. Only16
existing game files differ; all original model/vendor/font bytes match.

Canonical source inventory changes only Citisten. The unchanged source branch's
missing Brainrot manual is a historical coverage blocker; serial main's prior
135/129 coverage PASS is not overwritten or reinterpreted. No full-fleet run.
Sole integrator74 receives exact atomic runtime/docs pins; no independent push,
blanket failed-gate waiver or browser permission is inferred from the merge order.
After actual publication, compare entry/native/UI/controller/material/generation/
snapshot/clock/effect modules and all233 assets against the NEW manifest, not the
old deployed one. Keep merge, push, Pages, served identity and native acceptance
as separate stages. Default-town HUD fixture screenshots now have bounded actual
DOM evidence. User artifact/motion, actual seeded/native HUD view, complex-state
layout, Water/Save/Continue, hardware and FPS remain OPEN pending real admitted
evidence. No further browser launch is inferred from the completed one-pass admission.

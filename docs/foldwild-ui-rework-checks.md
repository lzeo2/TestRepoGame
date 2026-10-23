# Foldwild UI rework: baseline checks

Baseline HEAD: `8aa3cece5ce611e6d9c01cd208997affb2c6c2b4`. Documentation-only receipt. Read `AGENTS.md`, `docs/CODE_QUALITY.md`, the maintenance index and complete Foldwild manual. Inspected all 1,155 lines of `Games/Foldwild/script.js`, all 92 entry lines and all 142 CSS lines. No UI design or runtime changes.

## Results and limits

- Node `v22.23.1`: **13/13 requested pure suites passed, each exit 0; zero failed suites**. Counts below are suite-reported coverage, not an invented aggregate assertion count.
- Global maintenance checker: **exit 1 before this report existed**, stale inventory. No refresh. Foldwild's own recorded tree and entry do match HEAD; the global failure is not evidence that Foldwild's inventory is stale.
- Read-only inline `python3 -B` checks: exit 0. Actual output: `DOM: 112 unique IDs; 90 literal byId/text IDs and 19 expanded dynamic IDs resolve; data-slot 0..3/data-region 0..4 exact`. Literal/dynamic sets overlap. This checks references, not browser behavior.
- Same inline check: `Catalog: 128 unique integer IDs/schema/Git-backed URLs pass; Foldwild=226, Foldwild: Open-World RPG (Preview), category=story`. Existing **preview226**, not a new registration or game build.
- Controller, entry and CSS working bytes matched HEAD. Foldwild tree `d11a1e3a026c7a49119eebfb68ce2e8986410e18`; entry `90c57cd6bbd81ca7828aac4a99a1d06ccb4f64a8`, both identical to inventory. Controller `110ac26ff7329581a44fc2a89c5644a85bceee2d`; CSS `c1c2c7cb9d136473b47da10b855c23ecbdcd0c05`. Existing tracked Foldwild file count: 95.
- `df -B1 --output=avail /` initially returned **2,754,105,344 bytes**. Immediately before report creation it returned **2,752,626,688 bytes**, above the **2,147,483,648-byte** floor. Shared-host storage changes are not attributable solely to this receipt.
- No browsers, screenshots, installs, servers, sparse changes, runtime/test/catalog/manual/inventory edits, full-fleet gate or push. Only this new document is owned.

## Pure-suite command/output receipt

Inspected each existing suite's imports and entry/footer. Each runs directly with the ESM default flag and no further arguments. Actual commands, stdout and exits:

```text
$ node --experimental-default-type=module scripts/test_foldwild_data.mjs
PASS: 80 exact roster species; 16/element; 10 families x8; 50 exact normative actions; evolution 12/26 acyclic; hidden null; wheel/schema; 80 tracked/local SHA matches; models=7300844 bytes
exit=0

$ node --experimental-default-type=module scripts/test_foldwild_battle.mjs
PASS: 80 species; all 50 abilities executed; 25 wheel pairs (5 strong/5 reverse); bounds/effects/Wait/switch/KO/teams/capture/replay/immutability/XP/invalid inputs/local-only
Capture reproducibility: hit seed=670, miss seed=671
exit=0

$ node --experimental-default-type=module scripts/test_foldwild_battle_v2.mjs
PASS: battle v2 all 80 profiles/evolutions; every class/trait; capture boundaries; 31 energy/26 shield caps; synergy gating; NPC utility/switch targeting; frozen-input replay; canonical snapshots/log limits
exit=0

$ node --experimental-default-type=module scripts/test_foldwild_economy.mjs
Foldwild economy: PASS (9 shops, atomic trades, caps, reload stock, one-shot contracts, prototype guards).
exit=0

$ node --experimental-default-type=module scripts/test_foldwild_builds.mjs
Foldwild builds: PASS (80 species x 10 seeds, 77 builds, neutral migration, caps, unlocks, synergy, prototype guards).
exit=0

$ node --experimental-default-type=module scripts/test_foldwild_world.mjs
PASS: world/save v2 API; five regions/rivals; habitat pools 35/65/65/75/80; deterministic points/proximity; immutable inputs; strict schema/UID/effects/prototype/unknown ids; canonical resources/progress; storage namespace/quota/security/corrupt-byte preservation
exit=0

$ node --experimental-default-type=module scripts/test_foldwild_regions.mjs
PASS: 5 regions, 128000 m², 480 trees, 48 NPCs (12 principal), 9 shops/contracts; 73 POI + 15 wild routes, 185 collision-safe segments; water/bridge/house/sliding/bounds/invalid inputs/immutability
exit=0

$ node --experimental-default-type=module scripts/test_foldwild_save_v2.mjs
PASS: v1 neutral migration and legacy Iven badge; five-region route/reexports; v2 economic/profile/cosmetic/class/appearance/favorites validation; no reload restock; descriptor/UID alias defenses; scoped rotating backup, quota failure and UTF-8 256 KiB corrupt-byte preservation
exit=0

$ node --experimental-default-type=module scripts/test_foldwild_continuity.mjs
PASS: optional v1/v2 continuity; canonical effects/profiles, active index and exact action/RNG replay; missed capture; five canonical trials; roster/enemy/HP/XP/counter/schema/accessor rejection; immutable release guards/history; scoped backup/quota/corrupt-byte preservation
exit=0

$ node --experimental-default-type=module scripts/test_foldwild_cap_xp.mjs
PASS: XP cap fixtures; v1/v2 accepted XP retained; near/exact ceiling rewards save/reload; frozen inputs; level 12/26/40 resource deltas; validation rejection unchanged
exit=0

$ node --experimental-default-type=module scripts/test_foldwild_save_conflict.mjs
PASS: optimistic expected-null/bytes writes; stale primary AND backup preservation; exact raw metadata; unchanged two-argument API; legacy/pending replay; negative corrupt/UTF-8/version/denied/quota fixtures
exit=0

$ node --experimental-default-type=module scripts/test_foldwild_class_ranks.mjs
PASS: class rank thresholds/history/immutable perks; getter/prototype/duplicate/rank rejection; pinned shield/switch/capture/Wait stacks and caps; 168 baseline legacy replay snapshots exact
exit=0

$ node --experimental-default-type=module scripts/test_foldwild_campaign.mjs
PASS: campaign composition fixtures; F3/R1 exact tables; schema3/v1/v2 migration and old-rank next-action replay; availability/location/context/identity/rank guards; genuine one-command win/loss settlement, XP/evolution/history/caps/ordinary rewards and no replay; zero-Marks/kites recovery; immutable copies; pending continuation; getter/prototype/corrupt/oversize/conflict/backup/quota preservation. Natural campaign acceptance NOT established.
exit=0
```

Maintenance baseline command and terminal error (machine-specific traceback paths omitted):

```text
$ python3 -B scripts/check_maintenance_docs.py
AssertionError: Inventory stale: inspect changes, then run --refresh.
exit=1
```

## DOM caller map for Main

Line references below are in unchanged `Games/Foldwild/script.js`. This covers the controller's DOM-consuming paths; it does not certify vendor/rendering internals or native behavior.

| Callers | Required UI contract |
| --- | --- |
| Helpers/bootstrap, lines 9–63, 1148–1155 | `byId`/`text` dereference nodes without null guards; `all` is document-wide. Cache `game-canvas`, its immediate parent and `.play-layout` once. `message`, `save-state`, saved summary and coordination text remain live sinks. |
| Save preview/import/view creation, 66–164 | `save-dialog` must have native `.open`/`.showModal()`, confirm button, status/preview and primary-bytes textarea. `save-file` needs `.files`/`.value`; reduce-motion needs `.checked`. Diagnostics write `render-state` independently of gameplay messages. |
| Phase/HUD/proximity, 165–239 | `.hidden` toggles menu/layout/world HUD/battle/result/nearby/world-help. HUD writes zone/resources/class/objective/rank/synergy/score/dex, quality and disabled states. Team and nearby hosts use `replaceChildren`; `[data-region]`, `[data-move]`, `[data-point]` drive state/interaction. |
| Starter/start/reset/menu, 260–314 | `[data-starter]`, starter description, numeric seed validity API, reduce-motion, continue/start focus, native reset dialog, preview and exact-primary textarea. Reset waits for queued saves before consent. |
| Result/dialogue/challenges, 347–452 | Result title/description/continue/evolution nodes, focusable result title, dialogue title/text/start and native dialogue dialog. Service-to-challenge transition closes service dialog before preview; dialogue-close events restore world only when still in dialogue phase. |
| Battle rendering/settlement, 475–617 | Dynamic player/enemy name/status/HP/energy/bar IDs and ability-0..3; capture/wait/flee; switch-list and battle-log replacement/scrolling. Resource bars require `.max`/`.value`; result/evolution sinks and Continue focus are functional, not decoration. |
| Service builders/actions, 619–770 | Generated labels/selects/options/buttons/sections use `.actions`; appearance builder queries its generated descendant `select`. Native service-dialog and title/description/content host are required. `service-content` is replaced in full on rerender; inventory, trading, classes, appearance, contracts and camp recovery live here. |
| Ledger/release/inspection, 772–901 | Search/filter values; native collection/release dialogs; collection-list replacement; generated `data-uid`, `data-inspect`, `data-release`, `data-species` hooks. Inspector visibility, model host/name/status/rotation/close controls and focus restoration depend on these hosts. |
| Pause/frame, 903–963 | Pause/HUD updates, document visibility, modal state and result-continue focus after busy window. Frame loop updates proximity and render state; controls are not static markup. |
| Bound event handlers, 965–1087 | Starter/start/continue/new-run/reset; dialogue/collection/service close; ledger filters; camera/quality/seed; inspector/release; all save recovery/export/import actions; interact/rest/pause/result; region/ability/capture/wait/flee. Export temporarily appends a download anchor to `document.body`. `service-close` instead uses native `form method="dialog"`. |
| Movement/help/keyboard/lifecycle, 1088–1139 | Reduce-motion state, `control-help` text and generated `[data-move]` buttons appended to `world-help`. Pointer capture and cancel/up/lost-capture handlers own held movement. Keyboard gates inspect target tags/editability and `#controls` containment. Canvas blur/window blur/document visibility clear input; resize resizes view; unload disposes it. |

### High-risk removals and ancestry dependencies

1. **Immediate canvas parent is a fixed positional dependency**, lines 13, 807, 830–835: `viewport = canvas.parentElement`, inspector does `ledger-model-host.append(canvas)`, close does `viewport.prepend(canvas)` and compares parent identity. A new wrapper, replaced canvas/viewport, or changed child ordering alters restoration. There is no numeric `children[n]`, sibling traversal or `closest()` dependency elsewhere in the inspected controller.
2. **Keyboard ancestry is behavioral**, lines 1113–1129: movement requires the event target to be exactly canvas or `#controls`; other shortcuts also allow descendants of `#controls`. Moving controls outside that main node, removing its tabindex or changing focus targets changes input. Text inputs/selects/textareas/editable targets and any open dialog suppress game shortcuts.
3. **Native dialogs are simulation gates**, lines 28–30 and close handlers 999–1069: every open `dialog` anywhere stops gameplay. Replacing them with generic hidden panels is not equivalent. Collection close must return the single canvas, clear input, resize, update HUD and focus game; nested release close also restores a generated target. This intersects the existing held inspection-close failure.
4. **CSS relies on ancestry and phase attributes**, `style.css` lines 6, 34–38, 53, 91, 118–126: `[hidden]` has `!important`; `.play-layout:has(#battle-panel:not([hidden]))` hides HUD/team/field/travel/ledger/services and changes mobile scene rows. Moving battle-panel outside layout silently loses these effects. Body/main/layout/viewport/trail-controls flex/grid and overflow form the bounded frame; toolbar sticky behavior depends on the HUD scroll ancestor. These are static dependencies, not newly verified geometry.
5. **Generated hosts are functional UI**, not empty removable markup: world-help receives movement buttons once at startup; team-list, nearby-actions, switch-list, battle-log, service-content and collection-list are overwritten. Removing hosts throws on unguarded calls; inserting permanent children into replacement hosts loses them on render. Data selectors bind at startup for starters/regions/slots/movement, while point/ledger hooks are generated later.
6. **Save and fallback surfaces are high-risk removals**: save-state/render-state/coordination and export/import/backup/replacement consent expose async failures, corrupt-save refusal and renderer fallback. Hiding them as redundant status would remove recovery information. Progress bars, seed validity, checkboxes/selects, exact-byte textareas and file input require their native element APIs, not just preserved IDs.
7. **Inspector CSS/focus contracts remain sensitive**, `style.css` lines 96–117: collection heading/close layout, inspector scroll margin, model-host height/scene-height variable and list descendant styles participate in close reachability and canvas sizing. Controller scrolls inspector into view, focuses its close button, then restores generated ledger focus or collection-close fallback. No browser test here proves a revised hierarchy safe.

## Holds unchanged

Original M2 remains held at the synchronous manual-save assertion under current async saves. Separately versioned async/native M2 and single-mobile-Close/world-readiness remain held; a prior 1/2 async result is not stable acceptance. No native runner was executed here.

Natural full campaign, rank progression, acquisition/evolution and whole-roster acceptance remain held. Pure campaign/composition and boundary fixtures do not establish ordinary earned play. Physical-device/N100 performance and rights/provenance clearance remain held. Supplied original model bytes and vendor qualifications are unchanged. Existing preview226 listing grants none of these acceptances. No holds cleared.

## Owned-path checks

`node --experimental-default-type=module --check Games/Foldwild/script.js`: no output, exit 0 (read-only syntax check). `git diff --cached --check -- docs/foldwild-ui-rework-checks.md`: no output, exit 0. Inline report check: `PASS: 13 exact suite commands/exits; no machine home paths, emails or em-dashes`, exit 0. The initial `git diff --no-index --check /dev/null docs/foldwild-ui-rework-checks.md` produced no diagnostics and exit 1 for the new-file difference; staged whitespace check above passed.

Working tree was initially clean. Concurrent unrelated changes appeared at `Games/Wings/models/speedboat.glb`, `Games/Wings/verification/check-speedboat-pbr.py` and `Games/Wings/verification/generate-models.py`; none is owned, staged or reverted by this task. Commit only this receipt. Final commit and shared-host storage delta are reported to Main separately.

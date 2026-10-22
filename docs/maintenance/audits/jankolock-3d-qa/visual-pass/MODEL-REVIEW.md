# Independent bounded mechanical review

## Verdict and scope

**A / E (including P) / H: QUALIFIED mechanical evidence pass only.** Art acceptance, parent quality scores, supported hardware/FPS, handheld input, full native play and release approval remain **HOLD / outside this review**. No browser/server, model construction/export, installation, asset modification or wishlist change was performed. Only this report is owned by this reviewer.

Reviewed source baseline: `6942be0`; game tree `72663782547d6248a56469ec440383a254259100`. Read applicable AGENTS, CODE_QUALITY, maintenance entry/manual and source. Parent refreshed the inventory during review: its game tree matches that baseline. Fresh checker output: `PASS: 133 game documents cover 127 registered + 6 unregistered games; Git inventory current.` This is coverage, not gameplay acceptance.

## Receipt and hash checks

An independent Python stdlib check parsed all ten final `letter-*-evidence.json` files, required `COMPLETE-builder-checks-only`, equal before/after source maps, `sourcesUnchanged: true`, empty errors, HTTP200 responses, and matching runner SHA. Each of the **59 pinned source files per receipt** matches both current bytes and `git show 6942be0:<path>`. All **36 distinct recorded screenshot SHA-256 values** match actual PNG bytes; PNG headers are 1280x720. No timeout directory contributed to these counts.

| Receipt | Recorded full-size shots | HTTP200 |
| --- | ---: | ---: |
| A | 7 | 159 |
| E-gooey / E-snipeoff / E-stampead / E-turretina | 5 each | 53 each |
| H | 2 | 52 |
| P-gooey / P-snipeoff / P-turretina | 1 each | 53 each |
| P-stampead | 4 | 53 |
| **Total** | **36** | **635** |

Zero retained page/console/request errors in these receipts. The actual runner records these errors and blocks nonlocal requests; its completion branch requires all responses to be 200. This independently verifies existing recorded evidence, not a new network/browser run. The 59-file hash selector includes JS/MJS/HTML/CSS/GLB, **not JSON configs/receipts, kit JSON or environment PNGs**. Those resources are therefore not independently capture-time hash-pinned by these receipts. Composite concept twins/contact sheet and the E alias are additional artifacts, not additional hashed captures in the 36. Current source/assets are committed, but that does not retroactively expand capture-time coverage.

## Actual GLB decoding, budgets and runtime

Independently decoded GLB v2 headers/JSON chunks using `struct` and `json`, checked declared byte length, TRIANGLES primitive mode, and summed index-accessor counts / 3. Compared file SHA/bytes/triangles with actual model receipts; no builder was invoked.

| Asset | Bytes | Triangles | Meshes | Materials |
| --- | ---: | ---: | ---: | ---: |
| Stampead | 5,797,108 | 179,388 | 45 | 13 |
| Turretina | 4,648,580 | 171,818 | 48 | 14 |
| Snipeoff | 4,835,696 | 170,342 | 39 | 15 |
| Gooey | 4,612,808 | 179,556 | 43 | 13 |
| Trooper | 1,592,464 | 31,730 | 12 | 4 |
| Portrait relief | 3,228,372 | 124,512 | 1 | 1 |

Five new GLBs: **21,486,656 bytes / 732,834 triangles**. Six including portrait: **24,715,028 bytes**. All six are below 8,388,608 bytes; each hero is below 6,000,000 bytes and within 120k–250k triangles / 64 drawables. Trooper is below 2,000,000 bytes, within 15k–40k triangles and 12 drawables. These are asset counts, not frame budgets or GPU measurements.

All five new files have PBR metallic/roughness material records, NORMAL and TEXCOORD_0 attributes, no embedded images and no external buffer URI. Actual hero nodes include head/torso, both arms/legs and cape pivots. `character-assets.mjs` loads verified local bytes, checks budgets/hash and supplies shared original **512x512 color/normal DataTextures at runtime**; the GLBs themselves do not contain 512px images. `hero-model.mjs` animates rigid named pivots, not skin weights, IK, facial animation or cloth simulation. Builder sources contain the authored geometry and checks; their construction/export paths were deliberately not executed.

Fresh `hero-visuals-test.mjs` output: `PASS: 4 real120k-250k GLB heroes/PBR512 surfaces/pivots/disposal,16 unique kit FX+7 generic FX; positions/depth/links/expiry/cap`.

`systems-view.mjs` requests `shareGeometry:true`, isolates materials and pose, scales the candle at its fixed Y=1.45 base and multiplies emission by systems HP-derived state. Fresh `systems-view-test.mjs`: `systems-view:24 actual31,730-triangle troops, shared geometry, isolated materials, bottom-anchored HP candle, facing and cleanup PASS (CPU only)`. This proves resource identity and candle behavior in CPU objects, not crowd FPS or motion clearance.

Portrait SHA remains `8463eee8276187cacaba912d9540279ad1bb338aa382e9448632aa9a33892514`, matching source/receipts and independent decoding. The external supplied original was not accessed here; its unchanged status remains prior provenance evidence, not a new independent original-file verification.

## Falsifiable A / E / H findings

- **A qualified:** inspected `integration-A.png`, `integration-A-greenhedge.png` and `integration-A-midway-arrival.png`. Architecture/facades, cables, three lanes and trees are present. Broad straight roads, sparse park dressing, stylized cloud discs and primitive objectives remain plainly visible. Midway arrival is heavily occluded by the large blue objective geometry: it is not a clear visual proof of grounded character placement. Receipt coordinates establish free/idle Y=0 and positive HP at arrival, not collision-free visibility. Each recorded native short walk moves about **3.451m** after API placement. Native E attachment is followed by **33s API clock advancement** for the 770m station ride; the aerial camera is API-controlled. **No native 900m walk is established.** The overview/arrival images should travel with their JSON classification; not every frame visibly retains the fixture banner.
- **E/P qualified:** inspected the actual sixteen-effect contact sheet and all four labeled concept/model twins, plus the actual slide capture. Receipts record exactly one cast of each of sixteen abilities, live FX, and the runner sends native 1–4 keys after API positioning/clock setup, then freezes real effects. P records four clean no-cast/no-FX model views, native double-jump/dash/slide inputs with explicit fixture time, not uninterrupted native locomotion. Distinct modeled equipment/silhouettes are visible: cap/cape/hammer, engineer goggles/tools, long coat/rifle, and protective coat/helmet/sprayer. Generic rigid faces, simplified hands and cloth/hoses differ materially from the concepts; triangle density does not establish concept fidelity. The slide photo still reads close to an upright body: the controller state and CPU lean test are stronger evidence than this still for animation readability. No subjective score or visual-animation acceptance is assigned.
- **H qualified:** inspected both `integration-H.png` and `integration-H-dark.png`. Supplied relief is visible in the framed glass display; selected Stampead GLB, four hero choices and Start match are visible. The runner loads without a QA query and changes the HTML theme; the room lighting is unchanged. These establish these desktop lobby views only, not likeness rights, mobile layout or supported-GPU rendering.

## CPU checks and boundaries

Fresh runs completed: world **491 assertions**; controller **1,365 assertions**; environment **66,904 instances / 926,466 full-detail triangles / 280 coarse batches / 41 reusable geometries / 11 PNG maps, 1,210,564 bytes**; hero runtime **16 casts** and five remote-origin events; bots **8 groups**; integration **both 600-second simulated chains**, 19 falls per chain and distinct Patron phases, portrait corruption rejection and catalog validation; systems **18 groups**. Hero visuals and systems-view results are above. UI8 is parent-reported existing evidence, not independently rerun here. Simulation seconds are not wall-clock human play. Frozen-frame assertions in the capture runner check no redraw during paused captures; they are not an FPS benchmark.

Authored runtime URL/import scan found no new external loads: the HTTP-looking authored matches are SVG namespaces/data markup. Model/portrait fetches, environment maps, hero kits, imports and fonts resolve locally. Existing capture routing rejects nonlocal requests. Local addon files match all four recorded provenance SHA values; MIT notice is present. CREDITS and model sources identify original procedural assets, codex-imagen reference plates, and supplied-photo relief qualifications. Upstream distribution/identity rights were not independently re-investigated, and no cold-offline browser closure is claimed.

Historical `visual-pass-before-idle-fix/` and `visual-pass-before-single-hero/` timeouts remain incomplete historical attempts, not passes. No full-fleet smoke, release, push, art acceptance or hardware approval follows from this report. No game was added; catalog remains 127. Parent-owned untracked evidence/images and inventory changes were not staged by this reviewer.

Storage: initial available **2,771,566,592 bytes**; immediately before this tiny report **2,762,878,976 bytes**, above the normal 2 GiB floor, no waiver. Shared-host changes are not attributable to this report. Only this Markdown file is committed.

# Car arcade source authority, shared storage and skin

## Scope and authority

The latest direct operator order explicitly authorizes **two new original car
games and original detailed modeling**: Slipstream Borough and Garage Borough.
The [complete implementation plan](car-arcade-plan.md), committed at `a48a386`,
records the owner's request to create new games, plan and execute, and use 3D
modeling workers. Task #101 reiterates that two-original exception. This is not
an ingested-game claim and does not derive authority from Circuit Ward's expired
one-run exception. Registration, public release and push remain separate gates.

Game rules, fictional fleet names and authored geometry are original project
work, not an upstream game port. The plan prohibits copied vehicle artwork,
exact OEM bodies, confusing near-brand names and logos. Generic retro compact
proportions are not permission to reproduce a branded vehicle. This record does
not certify a new car-art license, provider rights, trademark clearance or OEM
noninfringement. Library copyright and original game/geometry authorship are
separate. No Circuit Ward or Foldwild artwork is supplied by this storage task.

Worker #101 owns only `assets/car-arcade/storage.js`,
`assets/car-arcade/style.css`, `scripts/test_car_arcade_storage.mjs` and this
record. It changes no game, catalog, vendor, manual or inventory file. Other
workers own fleet/model implementation, engines and UI; their final sources,
geometry measurements, gameplay and originality review are not certified here.

## Original polished fleet and hypercar follow-up

Newest direct owner asks concrete existing-model polish before original sports hypercars. [Exact scoped authority/provenance](car-polish-hypercars-plan.md): actual Astra126 authored shared construction corrections1c433e8 but timedout143/no finalreport; Main independently accepted tested source and corrected hood geometryd681c7a after actual image review. Genuine completed Astra127/128 authored05fa709/82968fb original Aerolume/Riftline numerical designs/geometry and21-study capture/check support. Actual assistant metadata independently verified. Mainebba1db corrects demonstrated hull overlap/narrow-cabin defects; [real current gallery/hashes](car-polished-previews/README.md) documents actual new content, not ingested upstream material. No OEM assets/images/blueprints/traces/distinct branded signatures/logos downloaded or copied, no dependency/vendor/font/license changes. Names/design intentions and local original authorship aren't trademark/noninfringement/provider-rights certification. MODELS ONLY: two parked hypercar concepts added, no new games/live selectable cars/fleet/storage/catalog/registration/push.20s startup/hardware/legal/driving/release holds remain.

## Earlier original detailed fleet and sports follow-up

Newest direct owner request extends original modeling to the remaining fleet and additional generic sports/high-performance intentions while avoiding copyrighted designs. [Bounded source/authority record](car-fleet-detail-plan.md). Genuine Astra123–125 authored seventeen parked factories using new original numerical profiles and sampled/primitive geometry: fifteen existing fleet counterparts plus **Kestrel R** and **Vesper GT**. Existing original Pip/Brindle are retained, nineteen studio selectors total. Model build commits bae98a8/2b3fd2a, studio/test6416114/b083128, Main geometry/camera correctionf9169da. [Actual local-render gallery](car-detailed-previews/README.md) and its source hashes document this authored content, not ingested attribution or fabricated upstream licensing.

No OEM reference images, meshes, textures, logos, badges, blueprints or traced branded silhouettes were imported. Original runtime finishes reuse the existing project decorator, local fonts and renderer, with unchanged MIT/OFL notices. No dependency/download/vendor changes. Generic vehicle forms and original names are not a legal noninfringement/trademark certificate; copyright/design review remains separate. High-performance terminology describes sports concepts, not verified mechanical results. These are parked models, **not new games or installed live sports cars**; both live fleets/Game/catalog/store bytes remain unchanged. No new game registration or push.

## Local rendering dependency

Main copied the existing local renderer/helper/notice into
`assets/car-arcade/vendor/` in `a48a386`. Worker #101 compared each local file
byte-for-byte against `a48a386:Games/Circuit Ward/vendor/<filename>`; all match.
No download, package installation, source rewrite or vendor edit was performed.

- Library: three.js, by the three.js authors.
- Repository: <https://github.com/mrdoob/three.js>.
- Pin: r160, peeled commit `d04539a76736ff500cae883d6a38b3dd8643c548`.
- Annotated tag object: `643680ed5fc73ba27e32a6529d59cae8c8b3825c`.
- MIT notice: copyright 2010-2023 three.js authors; complete permission and
  warranty terms remain in `assets/car-arcade/vendor/LICENSE`.
- Prior official-blob evidence: [Circuit Ward source record](circuit-ward-sources.md)
  and [helper provenance](circuit-ward-models.md). The matching local helper hash
  is also recorded in [Foldwild's source record](foldwild-sources.md).

| Shared vendor filename | Bytes | SHA-256 |
| --- | ---: | --- |
| `three.module.js` | 1272972 | `76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495` |
| `BufferGeometryUtils.js` | 31918 | `3a6701d824adfe05dc28c09b6c1d64aeab9a183bc3b944d85f15f596e5c6c2b3` |
| `LICENSE` | 1081 | `852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d` |

Total: **1305971 bytes**. Core and license remain upstream-identical. The helper
retains the earlier local-only import rewrite from `three` to
`./three.module.js`; it is unchanged from the local source, not byte-identical
to upstream. Its upstream file is `examples/jsm/utils/BufferGeometryUtils.js`,
31906 bytes, SHA-256
`9be041e96308775d00e2695cc607645b9a9b64fd7c0e759dd8f7c00a8d92becb`.
Core upstream path is `build/three.module.js` at the pinned revision.

The upstream `three.module.js:46517` space-before-tab indentation is deliberately
retained. A diff check including the library's addition can report that warning;
this worker's authored-path check is not a claim of a clean vendor-addition diff.
Copying these files establishes library identity, not an ingested game's source
or a license for original car geometry. Stock renderer loading APIs can accept
remote URLs; the library is not a network sandbox. Game consumers must use only
local resources, and full offline browser closure remains an integration gate.

## Shared storage contract

Only these exports exist:

```js
loadSave(key, validate, storage) // -> {state, error, raw}
saveSave(key, state, validate, expectedRaw, storage) // -> {raw, error}
```

Omitting `storage` obtains `globalThis.localStorage` **inside** the protected
operation, including a denied property getter. Allowed keys are exactly
`slipstream-borough-v1` and `garage-borough-v1`. There is no backup key, clear,
remove, origin-wide reset, WebLock dependency or mutable debug interface.

`validate` is the trusted game validator: `validateProfile` or
`validateBusiness`. It must inspect plain data descriptors before reading
untrusted fields and return a canonical plain profile or throw, not a boolean.
The helper validates parsed data on load and serializes the validator's return
value on save. It does not substitute its own game schema. Both engine
validators were inspected locally for this return contract and getter rejection.

- Missing save: `{state:null,error:null,raw:null}`.
- Valid save: canonical `state`, `error:null`, original exact `raw` string from
  that same single read. Parsing/validation never triggers another metadata read.
- Corrupt, oversized or invalid save: `state:null`, nonempty explanatory `error`,
  original `raw` retained; reads never repair, erase or rewrite it.
- Read/access denial: nonempty `error`, `raw:null` if no value was read.
- Save success: `raw` is the exact string passed to `setItem`, `error:null`.
- Save failure: nonempty `error`, `raw` is the primary string observed before
  the failed attempt (or null if unread). It is **not** a successful-save token.
- `expectedRaw` must be the exact prior string or null for an absent save.
  Omitted, stale and whitespace-different tokens reject without writing.
- Both loaded and serialized values are limited to **131072 UTF-8 bytes**,
  inclusive, using `TextEncoder`, not JavaScript string length alone.

UI consumers must display errors and disable automatic overwrite until an
explicit reload or consented reset. Do not update the caller's accepted token
from a failure result or turn corrupt data into a silently saved fresh profile.
After consent, reset can save a fresh profile using the exact observed token;
if the primary has changed again, that attempt must also reject. Reload is not
permission to overwrite a newly observed corrupt save without consent.

This is an exact-byte stale check followed by one scoped write, **not** an atomic
cross-tab transaction, backup recovery protocol, noncooperating-writer defense
or ABA guarantee. Native quota/denial exceptions are reported rather than
claimed as saved progress. It provides neither encryption nor anti-cheat trust.

## CSS integration contract

Link `../../assets/car-arcade/style.css` from either game entry. Three font faces
resolve relative to that CSS through `../fonts/`: Bungee regular and Atkinson
Hyperlegible regular/bold, with readable system fallbacks. Existing font files
and OFL notices are unchanged; [font provenance](portal-font-sources.md) records
the original authors, distribution hashes and license limits.

Use native HTML with these shared classes; no generated HTML or injection API
is provided:

| Class or selector | Intended use |
| --- | --- |
| `.skip-link` | First anchor targeting the main content ID; appears on focus |
| `.game-shell`, `main` | Centered content, maximum 1280px width |
| `.game-header` | Wrapping title/navigation row |
| `.game-layout` | View and side panel; one column at 760px and below |
| `.panel`, `.actions` | Bordered content and wrapping native action controls |
| `.garage-grid`, `.car-card` | Auto-fitting vehicle cards without a 320px overflow floor |
| `.viewport` | Bordered renderer container with solid background |
| `.viewport canvas`, `canvas.game-canvas` | Full width; height min(56vh,560px), mobile min(46vh,400px) |
| `.hud` | Wrapping numeric readouts, no positioning over touch controls |
| `.touch-controls` | Native buttons, at least 52px high; controller must handle pointer cancellation |
| `.status`, `.error` | Feedback and high-contrast error text; UI supplies appropriate live-region semantics |
| `.stats` | Definition-list rows |
| `.button` | Button-styled anchor; use a native button for actions |
| `dialog` | Native modal styling; UI owns open/close/Escape/focus recovery |

All buttons are at least 44px in both dimensions, inputs/selects at least 44px
high. Native focus-visible rings, solid light/dark surfaces, safe-area padding,
wrapping controls, `[hidden]` behavior and reduced-motion scrolling are retained.
Set `html[data-theme="dark"]` for dark mode; default is light. There is no
JavaScript theme manager or preference storage in this skin. Canvas drawing
buffer resize, accessible labels, keyboard/touch behavior and WebGL recovery
belong to the controllers. Skin alone does not establish accessible gameplay.

## Worker #101 verification and holds

Run on the `a48a386` parent baseline during concurrent disjoint worker activity:

```sh
node --experimental-default-type=module scripts/test_car_arcade_storage.mjs
node --experimental-default-type=module --check assets/car-arcade/storage.js
node --experimental-default-type=module --check scripts/test_car_arcade_storage.mjs
sha256sum assets/car-arcade/vendor/*
python3 -B scripts/check_maintenance_docs.py
git diff --check -- assets/car-arcade/storage.js assets/car-arcade/style.css scripts/test_car_arcade_storage.mjs docs/car-arcade-sources.md
```

Actual regression output: `Storage regression: 11/11 passed (synthetic, not
gameplay evidence).` Regression and both syntax commands exited 0. Tests cover
same-read metadata, missing/corrupt/schema-invalid saves, stale exact bytes,
getters/toJSON, default storage getter denial, denied reads/writes, quota,
UTF-8 boundaries and isolated keys. No game progression is proved by these
synthetic fixtures.

A separate in-memory integration check imported both local engine validators:
`slipstream-borough-v1: actual fresh-core round trip and getter rejection PASS`
and `garage-borough-v1: actual fresh-core round trip and getter rejection PASS`,
exit 0. This checks fresh serialization only, not earned progress. Vendor copy
comparison and three-font path/static CSS checks exited 0. Catalog check found
115 valid entries with unique IDs and Git-backed URLs. Maintenance checker
output: `PASS: 120 game documents cover 115 registered + 5 unregistered games;
Git inventory current.` Its exit 0 predates new-game registration and certifies
coverage only. Main owns later manual/inventory updates.

No game was registered, downloaded or published by this task. Browser screenshots
at 320/390/desktop in both themes, real denial/quota UI recovery, gameplay input,
natural progression, geometry review, target hardware performance and the full
registered-catalog smoke gate remain **held**, not passed. No push. Source log
basename: `2026-10-02T12-48-38-951Z_01a0fca8-d81f-7677-b13f-ced44d4f067e.jsonl`.

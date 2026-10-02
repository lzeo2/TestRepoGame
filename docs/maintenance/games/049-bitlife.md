# BitLife maintenance

<!-- maintenance-game: Games/BitLife -->

## Identity and status

Registered id 49, category `simulation`, entry `Games/BitLife/index.html`. Baseline `8c8a055`: 12 tracked files, 20,405,872 bytes. Docs-only review; local bootstrap does not certify offline gameplay or rights.

## Implementation map

Source review coverage: Read full entry, `style.css`, `TemplateData/UnityProgress.js`, `Build/BitLife.json`; reviewed loader instantiate/download excerpts. Compiled WASM/data/framework and full UnityLoader are not human-reviewed. An inline XHR hook is installed before progress and loader scripts; it routes matching host substrings to `json/null.json`. `UnityLoader.instantiate("gameContainer", "Build/BitLife.json", {onProgress:UnityProgress})` appears in head, relying on the loader's DOMContentLoaded fallback for the body container. UnityProgress creates `.logo/.progress/.empty/.full` and hides them at progress 1.

## Gameplay and controls

Catalog describes yearly life decisions, careers/relationships and eventual life outcomes. Actual button controls, new-life/death/reset and touch behavior are engine-owned; no wrapper keyboard mapping or tutorial exists. Store, ads and cloud-transfer are intended inert features per header, not working services. Do not infer arrows control the life simulation because a historical tester pressed them.

## State and persistence

`unityInstance` owns the compiled lifecycle; progress DOM attaches to its container. No authored localStorage key. Engine save/IDB schema is unresolved; page reload is not a documented delete-save action. Inline XHR override forwards only method/url via `originalOpen.call`, dropping async/user/password arguments from all callers. Existing saved lives must be preserved in future wrapper work.

## Dependencies and provenance

Header credits Candywriter, LLC and mirror `https://github.com/a456pur/seraph`, branch main/path games/bitlife; manifest companyName is `3kh0.github.io`, which is distribution metadata, not ownership proof. No pinned source/license established. The XHR regex lists unity3d, appspot, herokuapp and amongus-online; fetch and other transports are not guarded here. Local progress images/stylesheet remain dependencies.

## Audit findings

- MEDIUM, inline `XMLHttpRequest.prototype.open`: signature truncation changes callers' async/auth semantics. Minimal fix: copy arguments, replace only URL, then apply originalOpen with all arguments. Regression both matching and nonmatching URLs.
- MEDIUM, `style.css: body, html { width:62vh; overflow:hidden }`: portrait-ratio assumption can clip content on narrow/wide viewports. Native repro at phone/landscape sizes before a bounded shell layout fix.
- HIGH evidence hold, inline host regex: substring filtering and XHR-only interception are not a complete offline boundary. Record actual engine requests and match normalized URL hosts if future correction is authorized.

No runtime fix or new native repro performed. Legal evidence holds are distinct from confirmed transport/bootstrap behavior.

## Safe iteration

Patch authored XHR hook, progress UI and shell CSS; do not hand-edit Unity bundles or replace game menus. Preserve local save data and unmodified build references. No cloud service reactivation.

## Verification

Actually run: registered UnityLoader and authored helper/progress JS through stdin `node --check`, all exit 0. For Burrito Bison the retained Kongregate API also parsed. Zero native browser runs/screenshots. Source-only checks can be repeated with `git show HEAD:Games/BitLife/Build/UnityLoader.js | node --check`; no sparse selection changes needed. Historical `playtest_1.md` saw input-driven pixels, not a complete lifetime or persistence. Recommended native: age through one decision, death/new life, reload, blocked storage, responsive screenshots and denied-network traces including store/cloud buttons. Verify loading failure exposes recovery. Main owns any narrow asset lease and the unchanged serial full-catalog loading gate.

## Future outlook

First resolve rights and actual request/input evidence. Next implement the specifically identified authored wrapper lifecycle/accessibility fix with one small regression. Later profile real-device memory/load time and preserve saves before approved refurbishment. Defer new assets, online SDKs, engine rebuilds and speculative features.

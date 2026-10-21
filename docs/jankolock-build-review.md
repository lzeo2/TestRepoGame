# Jankolock build review: delegation 11

Mechanical runtime review of `46fd393..24db25b`, plus native-QA-only
`c318d69`, 2026-10-21. Model pinned to
`openai-codex/gpt-6.1-sol`, xhigh as ordered; no subdelegation, model change,
browser, server, install, branch switch or push. Only this document is owned.
Log: `.swarmforge-logs/jankolock-11-review.log` (ignored, under 10 KB).
This is not visual judgment, native-input acceptance, hardware acceptance or a
release approval. Those remain with the orchestrator and delegation 10.

## Follow-up status

M1 was subsequently repaired in `73f5829` and reverified with four deterministic
await-boundary regressions plus actual software-browser ordering tests. See
[current build receipt](jankolock-release.md). L1 remains an explicitly retained
immutable-vendor warning. This review and its bug-expecting reproducer below
refer to the original reviewed snapshot, not a claim that M1 still exists.

## Findings at reviewed snapshot

**Confirmed defects: 0 critical, 0 high, 1 medium, 1 low.** No critical/high
runtime blocker was demonstrated in this bounded review. This does not waive
unrun native/browser/release gates.

### M1: context loss during portrait loading resurrects a broken ready handle

- Location: `Games/Jankolock/portrait.js:72-84,175-190,231-234`.
- Actual caller: `ui.js:483-496` calls `mountPortrait`; its canvas context-loss
  listener calls `unavailable()`. That clears `renderer`, `scene`, `pawn` and
  `camera` but does not terminate the pending asset/digest/parser continuation.
- The continuation checks only `disposed`, not the terminal `unavailable`
  status. It can finish GLTF parsing, construct a new scene and set `ready`
  after the renderer has been cleared. `resize()` silently returns, leaving a
  blank hall and a false successful status. `ui.js:58` subsequently calls
  `setReducedMotion()` on a setting change; that schedules `draw()`, which
  dereferences the null renderer at `portrait.js:116`.
- Reproduced through production `mountPortrait`, real vendored GLTFLoader and
  the exact asset. Only DOM, RAF and WebGLRenderer were stubbed. Delayed the
  asset response, dispatched context loss, then completed the response.
  Observed `status:"ready", rendered:0`, followed by
  `Cannot read properties of null (reading 'render')` on motion change.
  This proves the asynchronous state-machine bug, not a native GPU failure.
- Smallest fix: treat `unavailable` as terminal at the existing post-await
  checks at lines 183,187,190; dispose a late parsed tree on either terminal
  state. Do not abort the shared listener controller just to cancel loading:
  that would also disable the module's Back button. Add the delayed-load /
  context-loss ordering to the existing portrait regression.
- Severity is medium: the optional hall breaks; no path was found that grants
  match state or loads this scene into Canvas combat. Fix before enabled-hall
  acceptance. Existing browser regression tests context loss only after ready
  (`scripts/test_jankolock_portrait.py:344-348`), so it misses this ordering.

### L1: exact donor renderer makes the full diff whitespace gate fail

`git diff --check 46fd393..24db25b` reports:

```text
Games/Jankolock/vendor/three.module.js:46517: space before tab in indent.
```

The identical line exists in the read-only Circuit Ward donor. Authored-file
whitespace checks pass and all vendor syntax checks pass. This is inherited
vendor formatting, not a gameplay defect. Preserve the required immutable
bytes; the orchestrator must explicitly record the warning rather than claim
an unqualified clean full diff or silently reformat the renderer.

## Complete source coverage and commit scope

Read `AGENTS.md`, `docs/CODE_QUALITY.md`, active design/build contract,
provenance, maintenance entry guide and donor provenance before concluding.
The design/provenance still contain pre-build status text; they are not fresh
acceptance evidence. No Jankolock inventory/manual/catalog entry exists yet;
registration and maintenance coordination remain orchestrator work.

Used actual `git show HEAD:<path> | nl -ba`, full authored diffs from
`46fd393`, and both portrait correction diffs. Reviewed every current authored
line, including rendering, not just exports or changed function headers:

| Source | Lines |
| --- | ---: |
| `Games/Jankolock/data.js` | 145 |
| `Games/Jankolock/engine.js` | 427 |
| `Games/Jankolock/ui.js` | 530 |
| `Games/Jankolock/portrait.js` | 240 |
| `Games/Jankolock/index.html` | 77 |
| `Games/Jankolock/style.css` | 11, including the full minified rules |
| Package/config/asset receipt | 86 |
| Three committed regression scripts | 799 |
| **Total committed authored/metadata/test lines** | **2,315** |

Also read all 512 lines of delegation 10's then-untracked
`scripts/test_jankolock_browser.py`, including its actual new-file diff. Its
reviewed SHA-256 is
`11c182cb159afdf82f0a20f663e3a7ee6abe15dc5f80c45ab0628dc7da45932b`.
It landed unchanged as `c318d69` during this review; its committed full diff
and sole-path scope were checked again. Source inspection is not execution or
an assurance about later edits. Total authored/metadata/test coverage including
that commit is **2,827 lines**, across 18 changed paths.

All six implementation commits stay within their assigned game/test paths:

- `d3c2d6a`: data, package, data regression.
- `ff6b0b9`: engine and engine regression.
- `68603c5`: HTML/CSS/UI.
- `52b9c8a`: portrait/config/asset receipt/exact asset/vendor/portrait regression.
- `d460a17`: portrait disposal reference cleanup only.
- `24db25b`: portrait camera target and portrait-regression focus/wait only.

The runtime range changes 17 paths. The seventh commit, `c318d69`, changes
only `scripts/test_jankolock_browser.py`. No Wings, Character AI, catalog,
maintenance, proxy or portal changes occur in either range. Pre-existing dirty
Wings files were neither edited nor staged; their final diff digest is
`93831d1af3495aee97a5459c78c049d44f2fa66862c142a1532423b7cda0a359`.
The protected Character AI Git-tree digest is
`4a1fa42503b90e1bb605630b54b6cb07315c9a1defff97e5ecffa57034780f53`.
The untracked build contract belongs to the orchestrator, not this commit.

## Mechanics and trust-boundary evidence

- Data constants and nested arrays are frozen. Item IDs are own-property
  checked, stacks reject a third copy, seed/round/actor indices reject invalid
  numbers. The data regression exhausts 243 seeded four-draft paths and 1,423
  legal inventories. Multiplicative item effects match descriptions.
- The engine's WeakMap owns state. Its frozen handle exposes only a phase
  getter. Snapshots deep-copy all observed actors/items/events, exclude bot
  brain/stats, and the only UI diagnostic deep-freezes that copy. No current
  match handle, state-setting QA hook or score grant is exposed globally.
- `step` validates finite dt and clamps to 0..0.05. `validatedInput` accepts
  only finite numeric axes/aim and literal true action intents. This boundary
  is for ordinary JS records, not hostile getters/proxies executing arbitrary
  same-origin code. No network input exists in this scope.
- `tickActor` movement, Courier dash and Warden knockback share `moveActor`;
  cover sweep, bullets and bot LOS share `rectHit`. Actor collision uses
  conservative radius-expanded rectangles and circle sweeps. Existing fixture
  tests prove selected sweep/LOS/cover-before-target cases, including an
  overspeed bullet. Fixtures instrument an isolated module copy, not production
  browser state. They are not exhaustive collision proofs or native play.
- Basic fire, burst/fan, shield, slam and decoy all route through authoritative
  core paths; bots use the same stats/cooldowns and seeded reaction/aim rules.
  Ability names, effects and unavailable/cooldown UI labels agree by source.
  All three hero kits have fixture coverage; only Warden has the provisional
  native driver's full two-round path. No other hero's native parity is claimed.
- Capture scores only a lone team's occupancy after the warm-up; contention
  resets it. Kills award four influence. Regulation is split at expiry, ties
  enter sudden death, and all-dead state alone does not award a win. Draft
  application is phase-gated and resolves every pick before mutating any actor;
  round reset preserves inventories but clears combat/clock/contribution state.
- Additional unmodified-public-API simulation: all three heroes at seeds
  0/1/240/uint32-max completed 12 matches and 36 rounds, with 48,855 observed
  states. Assertions checked finite numeric state, HP, arena bounds, exclusion
  from expanded cover, item-derived max HP, inventory length/caps, distinct
  offers, pick-once behavior, first-to-three and exact restart equivalence.
- Another ordinary-input simulation deliberately remained passive in rounds
  1/3 and fought in 2/4/5: wins progressed `[0,1],[1,1],[1,2],[2,2],[3,2]`.
  All four drafts completed; player picks were envelope/staple/staple/envelope,
  and all four actors ended with four legal items. This is simulation, not
  native keyboard/touch, human difficulty/balance or an exhaustive seed proof.

## UI/lifecycle and local-resource closure

Source-traced key/pointer ownership, cancel/lost-capture clearing, blur/hidden
pause, fixed-step accumulator, interpolation, restart, RAF scheduling, audio
node cleanup and pagehide/pageshow observer restoration. Hero/item text uses
native nodes and `textContent`; no user-string HTML/eval path was found.
Storage parsing/access failures use optional defaults. These are source checks;
real focus loss, audio availability, touch delivery and bfcache remain unproven
here. No screenshot/layout/aesthetic judgment was delegated to this review.

Hall code is imported only on explicit lobby entry; vendor imports occur only
after an enabled validated local config. Config fixes the exact relative asset
URL/hash/size. Runtime verifies size and SHA-256 before GLTF parsing. Abort
checks cover entry, config, vendor imports, bytes, digest and late parsed-tree
disposal. Scene traversal disposes shared geometry/materials/textures once;
renderer disposal loses its context and clears retained scene/camera/pawn
references. M1 is the distinct unavailable-state continuation hole.

Every authored script/style/font URL resolves to a tracked local file. The
three shared font files have local OFL notices; they are repository assets,
not fonts embedded in the game directory. No runtime third-party fetch,
socket, script, font, service worker or network fallback was found. This is a
static exact-input closure audit, not a fresh cold-offline browser capture.
The loader's example HTTP URLs are comments at lines 193-196, not imports.

The three renderer/loader/helper files plus LICENSE are **1,414,498 bytes**,
byte-identical to the local Circuit Ward donor and the previously documented
hashes. Inspected the core revision/license header, full MIT notice and actual
relative import declarations. Ran full syntax checks on all three JS files.
**No human line-by-line review of the 59,103 vendor/license lines is claimed.**
Initial comparison mistakenly treated upstream three.js revision `d04539a` as
a commit in this repository; Git rejected the lazy fetch with `not our ref`.
Retried with lazy fetching disabled, identified the upstream/repository
namespace distinction and compared local donor blobs without downloads.

The portrait regression independently confirmed exact SHA-256
`abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9`,
10,972,672 bytes, 421,968 actual triangles, finite accessors/index bounds and no
external resource URIs. Six malformed-copy rejection cases passed. This is an
exact static-asset validator, not a generic glTF validator. Supplier
photorealism remains FAIL; supported hardware remains UNVERIFIED. No new CPU
preview, WebGL render or native GLB-load acceptance is claimed by this lane.

Full authored hero names are Tin Courier, Wobble Warden and Rattle Clerk;
ability/item/copy names match the original office contract, not a Valve asset
manifest. The generic word Warden overlaps an existing reference-game name;
that alone neither proves copying nor supplies trademark clearance. Primitive
source drawings and synthesized audio contain no fetched Valve art/audio.
Source inspection cannot certify independent creation or legal/name clearance;
the working title and supplied likeness retain provenance qualifications.

## Commands and results

Run from repository root. The first three commands passed:

```sh
node scripts/test_jankolock_data.mjs
node scripts/test_jankolock_engine.mjs
python3 -B scripts/test_jankolock_portrait.py
for p in Games/Jankolock/{data,engine,ui,portrait}.js Games/Jankolock/vendor/*.js scripts/test_jankolock_{data,engine}.mjs; do node --check "$p" || exit; done
git diff --check 46fd393..24db25b -- Games/Jankolock/{data,engine,ui,portrait}.js Games/Jankolock/index.html Games/Jankolock/style.css scripts/test_jankolock*
git diff --check 46fd393..24db25b -- Games/Jankolock/vendor
python3 -B scripts/check_maintenance_docs.py
```

Nine JS syntax checks passed; both Python regressions parsed with `ast.parse`
without writing bytecode. Authored whitespace passed; vendor whitespace has L1.
Maintenance guard failed as expected:
`AssertionError: Commit inspected source changes before validating its inventory.`
The two pre-existing dirty Wings paths trigger that guard; no staging/reset or
inventory refresh was attempted to hide them. Catalog parses with 125 unique
IDs, zero Jankolock entries. No game was added or registered by this lane.

Exact in-memory entry commands for the two public simulation probes were
`node --input-type=module <<'JS'`; both used only `createMatch/startMatch/step/
snapshot/advanceRound/chooseItem/restart`, no instrumentation or state grants.
Their bounded policies/assertions and actual counts are recorded above and in
the compact log. The M1 reproducer below preserves the independently runnable
failure case without adding a script artifact.

### No-browser M1 reproducer

```sh
node --experimental-vm-modules --input-type=module <<'JS'
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import * as THREE from './Games/Jankolock/vendor/three.module.js';
import {GLTFLoader} from './Games/Jankolock/vendor/GLTFLoader.js';
class Element extends EventTarget {
 constructor(tag){super();this.tagName=tag;this.style={};this.children=[];this.clientWidth=800;this.clientHeight=480;}
 setAttribute(){} append(...children){this.children.push(...children);} remove(){this.removed=true;}
 replaceChildren(...children){this.children=children;} getContext(){return {};}
 contains(v){return this.children.includes(v);} focus(){} setPointerCapture(){}
}
let canvas, assetResolve, pendingFetchResolve, rendered=0;
class Renderer {constructor(opts){canvas=opts.canvas;}setPixelRatio(){}dispose(){}forceContextLoss(){}setSize(){}render(){rendered++;}}
const document=Object.assign(new EventTarget(),{hidden:false,createElement:t=>new Element(t)});
const window=Object.assign(new EventTarget(),{devicePixelRatio:1});
const raf=new Map(); let id=0;
const fetchStarted=new Promise(resolve=>pendingFetchResolve=resolve);
const bytes=await readFile('./Games/Jankolock/assets/portrait_relief.glb');
const context=vm.createContext({console,URL,AbortController,Event,document,window,crypto:webcrypto,
 requestAnimationFrame:fn=>{raf.set(++id,fn);return id;},cancelAnimationFrame:id=>raf.delete(id),
 ResizeObserver:class{observe(){}disconnect(){}},
 fetch:async url=>String(url).endsWith('.json')?{ok:true,json:async()=>({enabled:true,integrity:'PASS',url:'assets/portrait_relief.glb',sha256:'abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9',bytes:10972672})}:
 {ok:true,arrayBuffer:()=>{pendingFetchResolve();return new Promise(resolve=>assetResolve=resolve);}}
});
const three=new vm.SyntheticModule(Object.keys(THREE),function(){for(const [key,value] of Object.entries(THREE))this.setExport(key,key==='WebGLRenderer'?Renderer:value);},{context});
const loader=new vm.SyntheticModule(['GLTFLoader'],function(){this.setExport('GLTFLoader',GLTFLoader);},{context});
await three.link(()=>{});await three.evaluate();await loader.link(()=>{});await loader.evaluate();
const mod=new vm.SourceTextModule(await readFile('./Games/Jankolock/portrait.js','utf8'),{
 context,identifier:new URL('./Games/Jankolock/portrait.js',import.meta.url).href,
 initializeImportMeta(meta){meta.url=new URL('./Games/Jankolock/portrait.js',import.meta.url).href;},
 importModuleDynamically:async spec=>spec.includes('GLTFLoader')?loader:three
});
await mod.link(()=>{});await mod.evaluate();
const host=new Element('main');const pending=mod.namespace.mountPortrait(host);
await fetchStarted;
canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
const message=host.children[0].children[2].textContent;
assetResolve(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const handle=await pending;
assert.equal(handle.status,'ready');
assert.match(message,/context was lost/);
assert.equal(raf.size,0);assert.equal(rendered,0);
handle.setReducedMotion(true);
let error;try{raf.values().next().value(100);}catch(e){error=e.message;}
assert.match(error,/null.*render|render.*null/);
console.log('CONFIRMED portrait load/context-loss race:',JSON.stringify({message,status:handle.status,rendered,drawError:error}));
handle.dispose();assert.equal(handle.status,'disposed');
JS
```

These assertions confirmed the bug in the reviewed snapshot; do not run them
against current source expecting failure. The retained regression now checks
the repaired behavior. A repaired implementation should
instead remain unavailable with no newly allocated live scene or draw error.
Do not invert this into a permanent test expecting broken behavior.

## Delivery limits

Root free space was 2,541 MiB before probes, 2,544 MiB at the intermediate
check and 2,542 MiB before delivery; shared-host net change +1 MiB is not
attributable solely to this review. No
bulk artifacts were created; only this document and the ignored text log grew.
No source/test/catalog/maintenance files were edited. Native QA is concurrent
and was deliberately not run here. Full registered-game smoke, supported GPU,
new screenshot review and final acceptance are **unproven in this lane**.

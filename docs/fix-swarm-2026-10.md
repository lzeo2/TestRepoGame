# October fix swarm

Branch: `feat/oct-audit`. Baseline: `dcd75d1`. **All three requested fixes pass their focused gates. No push.**

No game was added, ingested, built from scratch or registered. The catalog remains **117 games**; maintenance covers **122 projects**. These are maintenance changes to existing original games, not new-port authorization. Full catalog smoke/release, real-device performance, co-op pairing and Foldwild's existing M2/campaign/rights holds remain separate.

## Pre-flight and ownership

- Initial run stopped at 1.7 GB free, missing stale swarm-standard reference and unavailable server. Operator subsequently cleared storage to 2.1 GB, confirmed the referenced standard never existed and restored the server. Resume verified a clean branch and portal HTTP200.
- Applied `AGENTS.md`, `docs/CODE_QUALITY.md` and the three complete maintenance manuals. All three baseline source trees matched inventory; the initial maintenance check passed.
- Reused already materialized assets. No checkout, download, install, new server, security/backend change or vendor/model edit. The operator's existing server was left running.
- Two disjoint workers requested `openai-codex/gpt-6.1-sol`, thinking `xhigh`, bounded to10minutes. Launch logs record that provider/model; both exit0. Workers committed their own paths, never pushed or ran browsers. Main verified commits/diffs and owned Foldwild copy/layout, serial browsers and subjective image review.
- Worker logs: `.swarmforge-logs/worker-2026-10-08T03-08-57-853Z.log` (Circuit), `.swarmforge-logs/worker-2026-10-08T03-08-57-868Z.log` (Slipstream). Worker inventory failures during concurrent source changes are historical, not current gate results.

## Task verdicts and commits

| Task | Verdict | Commit(s) |
| --- | --- | --- |
| Circuit Ward CW-02 | PASS, reload-only recovery | `8569603ac5055bb12dafedb0330b31a4bd31e009`, regression/review `9974039` |
| Slipstream reset strip | PASS, bounded layout fix | `ca180c6d65100e05784f16979ef0d8a0c1e145af`, scroll-position follow-up `6b0d7b1` |
| Foldwild viewport/text | PASS, focused UI acceptance | `44854de` |

Subjects:

- `fix: guard Circuit Ward start after WebGL context loss`
- `fix: stop reset strip overlapping garage panel in Slipstream Borough`
- `fix: keep garage heading visible after Slipstream reset`
- `test: verify Circuit Ward renderer-loss reload path`
- `fix: integrate Foldwild controls into game viewport and rewrite in-game strings`

The enclosing documentation commit records this report and refreshed inventory. There are no new-game build/register commits.

### 1. Circuit Ward

Baseline native loss after solo -> Menu -> Start advanced simulation time **0.0334 -> 1.5667**, while rendered frames remained **11 -> 11**. This confirmed CW-02 rather than inferring it from source.

`graphicsReady()` now checks actual context loss and latches failure until reload. Start/resume, solo/lobby/co-op boundaries, async pairing callbacks and the RAF share the guard. Loss pauses the authoritative run, clears input and stops rescheduling the dead renderer. Menu and late status updates cannot erase the recovery message. Reload calls `location.reload()`; no live-context recovery is claimed.

`python3 -B scripts/test_circuit_context_loss.py` exits0. Its final output:

```text
PASS: normal input 10s/retry, forced loss freeze, Menu/start/host/join blocked, message/44px focus/reload
```

Native10second movement/aim/fire changes state and frames. Retry resets the wave. Forced loss freezes state/frames, Menu/start/host/join remain blocked, recovery copy and the44px keyboard-focusable Reload remain visible, and Reload creates a working fresh renderer. Recorded page/console/HTTP/request errors are empty. Main opened normal/loss/Menu images. Initial unavailable GL and co-op callbacks were source-reviewed; fresh two-device pairing, all six waves and phone loss were not newly certified.

### 2. Slipstream Borough

The status and garage formerly had independent fixed top offsets. At1280x800, the strip occupied **y66..116.09375**, overlapping the garage beginning at **y72**. Garage-phase header/status now reserve their actual height in native flow, while the existing scrollable garage occupies the remaining space. Driving/result layouts and storage/reset mechanics stay unchanged.

Final real Reset -> confirm measurements in both themes:

- 1280x800: status **y72..122.09375**, garage **y134.09375..788**, exactly **12px** clear gap. Start **y327.59375..373.6875**.
- 390x844: wrapped status ends at **148.1875**, garage begins at **384.6875**. Heading and Start are visible.

Main's screenshots also exposed the retained garage scroll position clipping the heading/Start after reset. One scroll reset in the shared garage-return path corrects it. Ordinary City input for10seconds changes distance; Garage -> Start creates a fresh run. Long storage-error fixtures,320px/short landscape and a full race/pursuit were not newly accepted. Before/after images were personally reviewed in both themes.

### 3. Foldwild

The semantic HTML controls now live in the same bounded `.play-layout` as the canvas. Desktop uses a canvas-adjacent HUD; phone stacks the scene and internally scrollable HUD. Pause stays sticky. Battle and result commands are inside this frame, not beneath a separate webpage. Save/render status stays visible, and secondary settings/help use native details. One canvas/renderer and the existing inspector reparenting are retained.

Main rewrote prompts, help, ability/status explanations, ledger/service copy, economy notices and battle log sentences as plain prose. `Intl.ListFormat` supplies readable conjunctions instead of semicolon chains. `data.js` was fully inspected: it contains identity/action names and mechanical tables, not narrative descriptions, so its constants remain byte-identical. Stats, RNG, actions/turns, IDs, prices, caps, saves, models, vendor code and region/campaign rules are unchanged. All five requested text files contain no em dashes.

Four fresh contexts passed: **1280x800 and390x844, windowed and native portal iframe fullscreen**. Each used normal starter/seed input, keyboard or genuine held touch for10seconds, pause/resume, ledger inspection with one Close, ordinary walking to a wild marker, a real ability advancing the round, Flee/Continue and confirmed new-run restart. No state setters, grants, synthetic battle composition or frame pumping was used for native acceptance.

Canvas/HUD stay inside the game frame; visible buttons are at least44px, keyboard focus and reduced motion pass, and there is no horizontal overflow. The world controls fit at390. Later phone battle actions require HUD scrolling, while the scene and Pause remain visible. Main opened the final world/battle/prompt/inspector captures, including the lower battle-actions image. Foldwild has one authored light shell; no second theme or upstream-art recoloring was introduced.

## Verification and retained failures

Final browser command `python3 -B scripts/test_fix_swarm_ui.py` exits0 and prints:

```text
PASS: Slipstream reset gap/both themes/input/restart; Foldwild bounded HUD at 1280/390, windowed/fullscreen, keyboard/touch10s, ledger, wild turn, restart
```

Final `ui-results.json` records `errors: []`, including page/console/request/HTTP/external checks, without filtering. Chromium was pinned as requested, with ANGLE/SwiftShader flags. Navigation used DOMContentLoaded and a15second `asyncio.wait_for`; only one browser pass ran at a time, and all test browsers terminated.

Retained failed attempts:

1. `ui-check.log`: Slipstream input preceded its asynchronous Help-close handler, which cleared held input. The runner now waits for the existing closed/unpaused state before pressing W. No game-input workaround or larger deadline.
2. `ui-check-2.log` and `run-2/ui-results.json`: every gameplay/layout path completed, but the clean-load assertion failed on an implicit missing favicon404. The entry now references the existing local SVG. No error exclusion was added.
3. Pure continuity/class-rank checks initially failed because they pinned rewritten kite/log copy. Exact copy expectations were updated. The class replay translates only four intentional log sentences back to their former wording and retains the **original digest** across168 snapshots, rather than deleting logs or accepting a new mechanics hash.

Final gates:

| Gate | Actual result |
| --- | --- |
| Focused browser executables | **2/2 pass**; three touched games, four Foldwild layouts |
| Existing Foldwild pure suites | **13/13 pass** |
| `node --check` on touched game JS | **5/5 pass** |
| Catalog parse/schema/unique IDs/Git URLs | **117/117 pass** |
| New Python runners' AST | **2/2 pass** |
| Maintenance inventory/coverage | PASS after committed source refresh |
| `git diff --check` | PASS |
| Full registered-catalog release smoke | **Not run; no push/release** |

Pure suites: data, battle, battle_v2, economy, builds, world, regions, save_v2, continuity, cap_xp, save_conflict, class_ranks, campaign. They prove scoped contracts, not natural campaign completion.

Maintenance commands and actual output:

```text
python3 -B scripts/check_maintenance_docs.py --refresh
Inventory: 122 games, 117 registered; shared runtime separate.
python3 -B scripts/check_maintenance_docs.py
PASS: 122 game documents cover 117 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

No runtime third-party loads were added. The only added asset reference is the existing local SVG favicon. Catalog, portal/bundles, backend/proxy, shared skin, all models and vendors are unchanged. Protected Character AI is untouched. Main's final source audit/diff and browser checks found no new external load.

## Screenshot and receipt paths

All paths below are relative to the **system temporary directory**, in `fix-swarm-shots/` (the operator-requested temporary output location). Images are not committed or represented as durable release evidence.

| Evidence | Relative path |
| --- | --- |
| Circuit failure baseline | `fix-swarm-shots/circuit-before-lost.png` |
| Circuit normal play | `fix-swarm-shots/circuit-normal-play.png` |
| Circuit guarded loss | `fix-swarm-shots/circuit-after-lost.png` |
| Circuit Menu/start guard | `fix-swarm-shots/circuit-after-menu-start.png` |
| Slipstream desktop before | `fix-swarm-shots/slipstream-before-reset.png` |
| Slipstream desktop after, light/dark | `fix-swarm-shots/slipstream-after-reset-1280-light.png`, `fix-swarm-shots/slipstream-after-reset-1280-dark.png` |
| Slipstream phone after, light/dark | `fix-swarm-shots/slipstream-after-reset-390-light.png`, `fix-swarm-shots/slipstream-after-reset-390-dark.png` |
| Foldwild desktop/phone before | `fix-swarm-shots/foldwild-before-1280.png`, `fix-swarm-shots/foldwild-before-390.png` |
| Foldwild windowed world | `fix-swarm-shots/foldwild-1280-windowed-world.png`, `fix-swarm-shots/foldwild-390-windowed-world.png` |
| Foldwild windowed battle | `fix-swarm-shots/foldwild-1280-windowed-battle.png`, `fix-swarm-shots/foldwild-390-windowed-battle.png` |
| Foldwild fullscreen world | `fix-swarm-shots/foldwild-1280-fullscreen-world.png`, `fix-swarm-shots/foldwild-390-fullscreen-world.png` |
| Foldwild fullscreen battle | `fix-swarm-shots/foldwild-1280-fullscreen-battle.png`, `fix-swarm-shots/foldwild-390-fullscreen-battle.png` |
| Foldwild phone lower actions | `fix-swarm-shots/foldwild-390-fullscreen-battle-actions.png` |
| Foldwild readable encounter prompt | `fix-swarm-shots/foldwild-390-fullscreen-prompt.png` |
| Foldwild inspector | `fix-swarm-shots/foldwild-1280-fullscreen-ledger.png`, `fix-swarm-shots/foldwild-390-fullscreen-ledger.png` |
| Final process logs | `fix-swarm-shots/ui-check-3.log`, `fix-swarm-shots/circuit-check-final.log` |
| Native geometry/errors | `fix-swarm-shots/baseline.json`, `fix-swarm-shots/ui-results.json` |

## Storage and final boundary

Runtime logical storage delta from baseline: Circuit **+1,326bytes**, Slipstream **+955bytes**, Foldwild **+771bytes**, total **+3,052bytes**. Temporary screenshots/receipts, including retained attempts, occupy **3,685,433bytes** at report collection. No bulk assets or dependencies were added. Root free space displayed2.1GB throughout resumed work; report collection measured **2,248,953,856bytes free**, above the2GB gate. Exact whole-run filesystem delta was not captured at the resumed baseline, so no precise overall-disk claim is made.

Each affected manual is updated and the Git-backed inventory refreshed. The source milestones and final documentation commit are path-scoped. Final status is checked again after that commit. No requested fix remains blocked. Full release smoke, deployment, real hardware, Circuit co-op and Foldwild stable M2/campaign acceptance are not claimed. **No push.**

# Phase 3 ingest: partial completion

Baseline: `7414782`, clean main, 123 catalog entries, maximum ID 232.
All five named repositories were shallow-cloned and inspected sequentially. The operator confirmed the five-game exception to the historical two-addition cap. No delegation, original game invention, push or publication occurred.

## Final operator disposition

The operator confirmed that HexGL's CC BY-NC 3.0 core cannot ship in this public repository. Do not vendor it. Keep only the two accepted ingests, Server Survival 233 and Astray 234; no replacement is needed. No additional candidate has passed browser acceptance. A final catalog check confirmed 125 unique entries, every URL tracked, correct 233/234 metadata, and no HexGL catalog entry or vendored tree.

## Results

| Candidate | Verified upstream revision | License finding | Runtime bytes imported | ID / port commit |
| --- | --- | --- | ---: | --- |
| Server Survival | `7804e5969e28267cd33837e023eb46fa65da72b7` | MIT, Kostyantyn Pshenychnyy; local MIT Three/Tailwind notices | about 14.56 MB | 233 / `07bb71b` |
| Astray | `d3c4f61f2cbbe35752fbfa205f85a41d7f9fe0f0` | Unlicense; separate MIT/BSD/zlib-style dependency notices restored | about 1.63 MB | 234 / `4faffa2` |
| HexGL | `6addc95a2fce3bf05f4d751823cc054c61a16d68` | CC BY-NC 3.0 core; operator rejected public redistribution | 0 | Rejected, not registered |
| Casmo Tower Defense | `784129a685627a18f3d3f8fa594208000d9313e8` | MIT, Mathieu; runtime/quality gate failed | 0 | Held, not registered |
| Voxel Musou | `aba5fb8f43b713e88e8ac3a3105e48f01941dc7f` | MIT, BubuAi; Three MIT and Yuji OFL identified | 0 retained | Held, not registered |

Upstream logical tree sizes excluding `.git`, respectively in the requested order: HexGL 20,421,268 bytes; Server Survival 15,910,237; Astray 1,623,716; Casmo 10,725,023; Voxel Musou 22,235,211. No `.git` directories or node_modules were imported. Temporary npm tooling was outside the repository. Voxel's untracked runtime candidate was moved back outside the repository after failure, not committed.

## Native browser checks

Bounded Python root servers and Chromium; all non-local requests blocked. Commands:

```
python3 -B scripts/test_phase3_ports.py ServerSurvival --port 8233
python3 -B scripts/test_phase3_ports.py Astray --port 8234
```

Actual outputs:

- Server Survival: `start, keyboard C, native firewall placement ($500 to $460), play/pause, restart ($500/empty): PASS`
- Astray: `automatic start, arrow-key ball movement, I help, restart to level 1, pointer direction/release: PASS`
- Both: `console_errors: []`, `http_errors: []`, `external_requests: []`.

Two focused game checks passed. These are not full-game completion, physical touch, all-mode acceptance or target-GPU performance tests. The first Astray fixed-duration movement assertion was too short under software rendering; the retained check waits for actual movement. Its restart check was corrected to wait for navigation before inspecting state. No simulation state was granted or modified by the tests.

Screenshots and machine-readable results: [phase3-evidence](phase3-evidence/). Desktop 1440x1000 and mobile 390x844 were captured under light/dark color preferences and reviewed; the originals retain their fixed scene/theme appearance. Server's phone palette scrolls horizontally; technical labels remain small. Astray's scene and native controls fit the phone viewport. Original technical type labels/acronyms remain uppercase in Server Survival; this is not a claim of complete visual-style conformance. See each port's CREDITS and maintenance page for modifications and limits.

## Held candidates

### HexGL: rights gate

`README.md`: “Unless specified in the file, HexGL's code and resources are now licensed under the MIT License.” Core files including `bkcore/hexgl/HexGL.js`, `Gameplay.js`, `HUD.js`, `ShipControls.js`, `ShipEffects.js`, `CameraChase.js` and `tracks/Cityscape.js` explicitly specify Creative Commons Attribution-NonCommercial 3.0. This does not establish the requested wholly open-source MIT port. No vendoring or browser acceptance was attempted after the conflict. Operator decision on ticket `pi-326141-1791893070271`: do not vendor or ship HexGL in this public repository.

### Casmo: runtime and quality gate

The original source was tested separately from the portal at port 8236. Play and Play level 1 opened the scene; W advanced currentWave to 1. Observed errors: `THREE.WebGLShader: Shader couldn't compile.`, `THREE.WebGLProgram: Could not initialise shader.`, `gl.VALIDATE_STATUS false`. No local HTTP failures or external requests were observed.

Measured state: resources 555 / HUD 0; lives 50 / HUD 0; exactly two waves. `js/lib/dom.js` substitutes a no-op for removed Object.observe; `TowerDefense.Ui.initialize` depends on that observer for HUD updates. `Level1.js` defines two identical three-second spawn intervals. No completion/failure path was found in the inspected level, core or enemy sources. Reset does not reset stats or cancel those wave intervals. Fixing the HUD alone would not meet the requested genuinely-good-game bar; no new gameplay was invented. Evidence: `CasmoTowerDefense-probe.json` and `CasmoTowerDefense-prototype.png`. Ticket: `pi-326141-1791894322275`.

### Voxel Musou: runtime acceptance blocked

No build wall: native modules and bundled Three.js. No runtime remote load was found in the source scan. The 18 MB media folder is README promotional material, not referenced by runtime sources. The font's separate OFL notice was verified, not treated as MIT.

Two SwiftShader attempts became unresponsive after DOMContentLoaded: body-text evaluation timed out at 30 seconds (1440x1000), then 90 seconds (800x600). A third diagnostic under Xvfb/ANGLE GL timed out at 20 seconds; a raw desktop screenshot shows the boot/loading curtain, not accepted gameplay. No console, HTTP or external request errors were captured by that third attempt; their absence is NOT a pass when interaction never became available. Start, keyboard and restart remain unverified. See `VoxelMusou-final-probe.json` and `VoxelMusou-blocked.png`. Ticket: `pi-326141-1791894663979`.

## Final sweep and release holds

- Catalog: `125` unique integer IDs and tracked URLs; maximum ID `234`. IDs 235–237 remain unused, not reserved.
- Syntax: `74 local JS files: syntax PASS`; Astray's inline entry was separately checked. `git diff --check` run; trailing imported blank lines corrected in final sweep.
- Maintenance checker was already failing at baseline with `Inventory stale: inspect changes, then run --refresh.` Its recorded count is 118, five existing registrations are also absent, and their existing pages still use unregistered filenames. Added accurate manuals for these two ports, but did not blindly refresh unrelated source hashes or pretend historical pages were reviewed. Maintenance inventory remains a reported blocked gate.
- Full `xvfb-run python3 scripts/smoke_test_games.py` was not run. No push requested or performed; full release gate remains mandatory.
- Initial measured root availability: 2,980,282,368 bytes; pre-cleanup availability: 2,870,091,776 bytes, about 110 MB less. The 2 GB floor was preserved. Exact final disk/status is recorded in the task response; shared filesystem movement is not attributed solely to this run.
- Original sparse selection is restored after verification. Temporary browser servers terminate in `finally` blocks.

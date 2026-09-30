# Gladihoppers — repair notes & verdict

Worker W3, 2026-09-30. Scope: verify HEAD state of `Games/Gladihoppers/`, run the targeted smoke gate, and record a verdict. **No files under `Games/Gladihoppers/` were modified; no history rewritten; no push.**

## Repair history (from git, `git log --all --oneline -- Games/Gladihoppers`)

| Commit  | What it did |
|---------|-------------|
| `fec22ca` | `feat: add Gladihoppers` — original ingest (Unity WebGL build, ~47 MB of Build blobs). |
| `90bee99` | `fix: Gladihoppers Unity window.config` — window.config shim so the loader boots. |
| `512d6c6` | `fix: Gladihoppers document.xURL shim` (+ smoke-test QA gate added in same era). |
| `7fb2a83` | `fix: strip Gladihoppers intro overlay, boot straight into gameplay`. |
| `b6459b7` | `fix: send ready to game on poki bridge init, unlocks main menu and input`. |
| `bf49302` | `fix: Gladihoppers ship missing offline telemetry stub patch/json/null.json` — the Unity analytics endpoints (`config.uca.cloud.unity3d.com`, `cdp.cloud.unity3d.com`) are redirected to the local stub so the game runs fully offline. |

Earlier sweep report `docs/sweep-workerC.md` records the game as FIXED and passing (all Build assets served 200; only known-benign emscripten advisories remain).

## Verified at current HEAD (2026-09-30)

### `git ls-tree -r --long HEAD Games/Gladihoppers/`

```
9896ec1… 24739996  Games/Gladihoppers/Build/Gladihoppers.data.unityweb
650fc3b…      537  Games/Gladihoppers/Build/Gladihoppers.json
54f342c… 22620489  Games/Gladihoppers/Build/Gladihoppers.wasm.code.unityweb
949339a…   510379  Games/Gladihoppers/Build/Gladihoppers.wasm.framework.unityweb
e8929d0…      399  Games/Gladihoppers/appmanifest.json
d01c13b…     2820  Games/Gladihoppers/index.html
3e48c8d…     3647  Games/Gladihoppers/js/gladihoppers.js
4093ac5…    12513  Games/Gladihoppers/patch/images/null.png
2f9ec2e…   159248  Games/Gladihoppers/patch/js/UnityLoader.2019.2.js
0967ef4…        3  Games/Gladihoppers/patch/json/null.json
```

All three Build blobs exist and are large (24.7 MB + 22.6 MB + 0.5 MB ≈ 47 MB total incl. framework — matching the sweep report), and the telemetry stub `patch/json/null.json` (3 bytes) is present.

### Targeted smoke run

Command: `SMOKE_PORT=8769 xvfb-run python3 scripts/smoke_test_games.py --games "Gladihoppers"`

Server log shows every asset served 200/304, including the telemetry stub:

```
"GET /Games/Gladihoppers/Build/Gladihoppers.wasm.framework.unityweb HTTP/1.1" 200 -
"GET /Games/Gladihoppers/Build/Gladihoppers.data.unityweb HTTP/1.1" 200 -
"GET /Games/Gladihoppers/Build/Gladihoppers.wasm.code.unityweb HTTP/1.1" 200 -
"GET /Games/Gladihoppers/patch/json/null.json?https://config.uca.cloud.unity3d.com HTTP/1.1" 200 -
"GET /Games/Gladihoppers/patch/json/null.json?https://cdp.cloud.unity3d.com/v1/events HTTP/1.1" 200 -
```

Summary lines:

```
ok   Gladihoppers                 console_errors=0 failed_reqs=0

== 1/1 games pass ==
```

## VERDICT

**No repair needed at HEAD.** The prior fixes (`fec22ca` add → `90bee99` window.config → `512d6c6` xURL shim → `7fb2a83` intro strip → `b6459b7` poki ready → `bf49302` telemetry stub) have all landed; the three Unity Build blobs are intact and large; `patch/json/null.json` exists and is being served for both Unity analytics endpoints; the targeted smoke gate is **green** (`console_errors=0 failed_reqs=0`, 1/1 pass). No blob surgery performed or required. Known-benign emscripten advisories remain as previously documented in `docs/sweep-workerC.md`.

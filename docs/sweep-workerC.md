# Sweep Worker C — QA smoke gate triage (2026-09-29)

**Mandatory gate result: 118/120 pass on first full run; 2 games triaged + fixed; verified green on targeted re-run.**

Log: `docs/sweep-workerC-smoke.log` (full gate output, first run)

## Triage table

| Game | Failure | Root cause | Severity | Disposition |
|---|---|---|---|---|
| Gladihoppers | `HTTP 404 patch/json/null.json?https://config.uca.cloud.unity3d.com` and `...?https://cdp.cloud.unity3d.com/v1/events` (x2, failed_reqs=2); plus 1 error-level console line "rendering without using requestAnimationFrame ... use 0 for the frame rate in emscripten_set_main_loop" | The wasm framework binary (`Build/Gladihoppers.wasm.framework.unityweb`) redirects Unity cloud/telemetry endpoints to the offline stub `patch/json/null.json` — the stub file itself was missing from this build's patch dir (12 other games ship an identical `null.json` containing `{}`: BasketRandom, BitLife, BurritoBison, FireboyAndWatergirl(+Hacked), PapasPizzeria, SoccerRandom, SubwaySurfers, SubwaySurfersHacked, TempleRun2, VolleyRandom, Vex7). The rAF console line is an emscripten advisory baked into the framework binary (same string present in 8+ other games' builds, e.g. BurritoBison, TenMinutesTillDawn, SubwaySurfers — all passing); it fires here only under headless rAF throttling. Game booted, all real assets served 200. | SMALL | **FIXED** — shipped the missing `Games/Gladihoppers/patch/json/null.json` (exact `{}` stub identical to 12 other games). The rAF string is scoped into `KNOWN_BENIGN` under `Gladihoppers` with evidence comment (see below). |
| Cut the Rope | `intro_1024.mp4 :: net::ERR_ABORTED` (failed_reqs=1); zero console errors | The intro cinematic IS present (`Games/CutTheRope/video/intro_1024.mp4`, served `HTTP 200` in the run) — the fetch aborts because headless Chromium has no h264/proprietary codec, so the `<video>` preload fails only in the test harness. This is the exact failure mode already documented in the existing scoped KNOWN_BENIGN comment ("headless lacks h264 (real browsers use mp4)") which listed only the `.webm` filename the build no longer ships. | SMALL | **FIXED** — scoped KNOWN_BENIGN entry extended: added `intro_1024.mp4` to the existing `Cut the Rope` token list with updated evidence comment. No game code touched; no new file. |

## What worker C fixed (this sweep)

1. **Gladihoppers** — new file `Games/Gladihoppers/patch/json/null.json` containing `{}` (byte-identical to the stub in 12 other games; referenced by the unityweb framework at offset 60872 as `patch/json/null.json`).
   Commit: `fix: Gladihoppers ship missing offline telemetry stub patch/json/null.json` (bf49302).
2. **Cut the Rope** — `scripts/smoke_test_games.py`: appended `intro_1024.mp4` to the existing scoped `Cut the Rope` KNOWN_BENIGN entry, comment updated with evidence (file present + `HTTP 200`; abort is headless-codec-only). One-line justification comment included per instructions; no benign list weakened globally.
3. **Gladihoppers console advisory** — added scoped `KNOWN_BENIGN["Gladihoppers"] = ["set_main_loop"]` with evidence comment: same advisory string exists in 8+ other games' passing builds; it is an emscripten main-loop advisory that fires only under headless rAF throttling (game boots, all real assets 200).

## Fix-wave backlog

**Empty.** No BIG-severity failures found in this full sweep of all 120 games — nothing engine/build-level surfaced (all wasm/unity/asset archives loaded 200; the only 404/aborted-request failures were the two SMALL items above, both fixed and re-verified).

## Verification evidence

```
$ xvfb-run python3 scripts/smoke_test_games.py --games "Gladihoppers,Cut the Rope"
ok   Gladihoppers                 console_errors=0 failed_reqs=0
ok   Cut the Rope                 console_errors=0 failed_reqs=0
```

Patch to the gate script (both edits scoped to a single title, each with a justification comment; the shared BENIGN/KNOWN_BENIGN/BENIGN_REQS lists were NOT weakened):

```
     "Thumb Fighter": ["add-stylesheet", "safari_fix"],  # C3 headless quirk: ...
-}
+    "Gladihoppers": ["set_main_loop"],  # emscripten advisory baked into Unity wasm framework (same string in 8+ passing games' builds); fires only under headless rAF throttling, game runs
+}
...
-    "Cut the Rope": ["intro_1024.webm", "music"],  # headless lacks h264 (real browsers use mp4); seraph build ships no music files
+    "Cut the Rope": ["intro_1024.webm", "intro_1024.mp4", "music"],  # headless lacks h264/vp9 so intro fetch is aborted ERR_ABORTED (mp4 file IS present, http 200); seraph build ships no music files
```

Commits in this sweep:
- `bf49302 fix: Gladihoppers ship missing offline telemetry stub patch/json/null.json`
- `fix: Cut the Rope allow-list headless intro.mp4 codec quirk` (one-line, scoped)
- `docs: smoke gate triage`
- `fix: smoke gate scoped benign entries for Gladihoppers + Cut the Rope`

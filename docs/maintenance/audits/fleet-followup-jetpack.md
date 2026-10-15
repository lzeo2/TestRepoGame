# Fleet follow-up: Jetpack Joyride Hacked (2026-10-15)

## Decision and owned change

**Original transport flake unreproduced in three fresh boots; not waived. No
loader retry justified. These were not three clean gameplay passes.** The full
125-game smoke remains a separate mandatory unchanged gate; the recorded prior
result is 122/125, exit 1. No full-gate PASS, release or push is claimed here.

Only runtime change: one static `meta name="description"` in
`Games/JetpackJoyrideHacked/index.html`, exactly copying catalog id107's description.
The catalog describes intended max-coins/invincibility behavior, not renewed
acceptance of those cheats. No tracking/gtag, dependency, fetch, request/console
suppression, engine change, retry, timeout/filter change, sparse/branch operation,
history rewrite, game addition or inventory refresh. No regression script added:
there is no new nontrivial authored runtime logic.

Read AGENTS, CODE_QUALITY, maintenance README, inventory id107, the exact manual,
testing guide, fleet triage and completed lane6 report. Starting HEAD was
`e787681d6fe573b393fc73445a031be8e9af5214`. All 417 materialized title files matched
HEAD; tree `0bdb30cf0188a3f0ea7c7fc48860c9b893e80fe4`, entry
`351b15e272de13fc24b8e55669eaf356918d0861` matched the inventory before the metadata
edit. The complete HTML/CSS and selected obfuscated startup, Preload queue,
decoding and save anchors were inspected, not the entire game/Phaser engine.

## Native method and raw evidence schema

Evidence names below are relative to external scratch directory
`trg-fleet/followup-jetpack/`. `diagnose.py` uses installed Playwright and Python's
ThreadingHTTPServer, port **8983**. Each invocation launches a fresh Chromium
profile/browser with the unchanged smoke launch flags, 1280x800 viewport and
15-second DOM navigation timeout. It is an independent diagnostic, not the smoke
runner. No routing interception, request abortion, loader mutation, synthetic
state grant or injected runtime override was used. Inputs are ordinary center
mouse clicks and 1200ms hold/1500ms release. Runtime evaluations only read state.

Commands (DIAG denotes that external directory):

```sh
timeout --kill-after=5s 100s xvfb-run -a python3 -B -u "$DIAG/diagnose.py" --run 1
timeout --kill-after=5s 100s xvfb-run -a python3 -B -u "$DIAG/diagnose.py" --run 2
timeout --kill-after=5s 210s xvfb-run -a python3 -B -u "$DIAG/diagnose.py" --run 3
```

All three exited **0**, meaning diagnostic collection completed, **not PASS**.
Run1 collected five screenshots; run2 added queue details, Runtime exceptions,
read-only boundary inspection and three later inputs. Run3 added at most 24
five-second state polls before those later inputs. Its wait observed native
asset processing; it did not retry a failed request or alter gate timing. No
fourth boot/reload occurred. Final diagnostic source retains the richer schema.

Each `run-N.jsonl` contains `{t, kind, ...}` with process-relative seconds:

- `request`: complete URL, method, resource type; `response`: URL/status/headers;
  `requestfinished` and `requestfailed`: URL, with failure reason if present.
- `cdp.requestWillBeSent`, `responseReceived`, `loadingFinished`, `loadingFailed`:
  complete CDP event data including request IDs, initiators and response MIME.
  CDP includes internal data-URL loads, hence larger counts than Playwright.
- All console levels, `pageerror`, server HTTP messages; runs2/3 also retain
  `Runtime.exceptionThrown`, including the exception's source URL and line.
- `snapshot`/`poll`: real scene key/status/active flags, loader counts/queues,
  selected actor/coin fields, visible display objects/text and storage readout.
  `boundary` records actual script URLs, save-key decoder result and loader
  method names. No save mutation is performed by the diagnostic.

| Run | Complete marker (seconds) | Requests / responses / finished | HTTP 200 / 404 | Transport failures | Page errors | Console errors / warnings |
| --- | ---: | --- | --- | ---: | ---: | --- |
| 1 | 38.880 | 405 / 405 / 405 | 404 / 1 | 0 | 1 | 1 / 6 |
| 2 | 81.838 | 405 / 405 / 405 | 404 / 1 | 0 | 1 | 1 / 6 |
| 3 | 165.764 | 406 / 406 / 406 | 405 / 1 | 0 | 1 | 83 / 26 |

Every observed HTTP request was local to port8983. None was filtered. All three
404s are `/images/ico.ico`, tracked in Git but sparse-excluded from this diagnostic
workspace. No materialization was attempted outside ownership. Each run's CDP
request/response/finished totals also match: 596/596/596, 595/595/595 and
650/650/650, with zero CDP loading failures. Run3's extra successful request is
not treated as a failure retry.

## Original seven failures: only three identifiable samples

The original gate retained only `fails[:3]`; **four original URLs/reasons cannot
be reconstructed**. This follow-up retained every new request rather than
inventing seven original samples. The known basenames all resolve beneath
`Games/JetpackJoyrideHacked/assets/png/`:

| Basename | Response bytes | Run1 finished (s) | Run2 finished (s) | Run3 finished (s) |
| --- | ---: | ---: | ---: | ---: |
| `4aYqZlweZQJUE6g` | 9466 | 6.934 | 18.779 | 12.691 |
| `wMXRK79F5qhS4vvr` | 210 | 6.904 | 18.798 | 12.929 |
| `Du1uY8ZeNd9PYmqJ` | 522 | 6.978 | 18.826 | 12.934 |

Every table entry has an actual request, HTTP **200** response with
`application/octet-stream` and `requestfinished` event, not merely Git existence.
No `ERR_NETWORK_CHANGED` appeared. A transient browser/transport event remains
plausible, but these runs do not establish the original underlying cause or
prove the four unknown requests succeeded in that original run.

## Separate application findings and scene evidence

1. **Reproduced HTML-as-JavaScript defect:** `game3.js:6325-6333` creates script
   id `gamedistribution-jssdk` with decoded `src='#'`. CDP attributes the request
   to lines6332/6333 (one-based). It fetches this entry as a script, HTTP200,
   `text/html`; Runtime reports `SyntaxError: Unexpected token '<'` at index.html
   line1. The live DOM script URL is `index.html#`. All three runs reproduce it.
   It is not a missing PNG, transport error or proof of permanently failed boot:
   run3 subsequently reaches the menu and gameplay. The historical undefined-
   length error was not reproduced. No SDK was restored or request suppressed.
2. **Slow local processing, not demonstrated permanent loader stall:** runs1/2
   ended in Preload. Runs2/3 expose 394 completed Phaser files, zero failed,
   empty list/inflight/processing queues, while the game's separate image/sprite/
   audio/text/atlas queues continue draining. Run3 `curEncryptedAsset` progresses
   from 1 at 32.271s to 365 at 130.665s. The source has sequential texture/audio
   conversion callbacks after HTTP completion. Software rendering, screenshot
   overhead and concurrent worker activity prevent interpreting these times as
   target-hardware performance or attributing the slowness to another worker.
3. **Real menu/start, bounded gameplay:** active GamePlay appears at 136.108s;
   `run-3-settled.png` shows the native TOUCH ANYWHERE TO PLAY menu. Center click
   starts scrolling gameplay and the real boost/offer UI. Read-only snapshots
   show HUD 17m, 45m, 71m; the later final screenshot shows 82m. This difference
   is continued simulation between snapshot and screenshot, not a state grant.
4. **Cheat/input acceptance still held:** actual `player.body.enable` is false,
   as the existing authored update wrapper requests. Player y stays636 through
   late click/hold/release; its x moves from -100 in menu to512 in play. The
   offer remains active during the hold (`holdInput=false`), so this does not
   isolate flight-input failure. Visible menu/run coins remain0, not999999.
   The live scene uses `textTotalCoin`, unlike the wrapper's `textCoins` check.
   No cheat removal/physics rewrite is authorized by these observations.
5. **Save schema traced, not exercised:** `a0zy` at game3.js:22329 writes key
   `data` with `{coin, best_score, bgm, sfx, language}`. The read-only decoder
   resolves `a0zQ(0x4a5)` to `data`; GamePlay also reads that literal key. It does
   not match the wrapper's coin/score-key substring branch. The fresh profiles
   have no saved `data`; the diagnostic reports only an own `setItem` function
   property and null `getItem('setItem')`. This is not proof of save corruption
   or a successful save/reload cycle. No persistence behavior was changed.
6. **Audio/console not clean:** run3 records **82** errors, exactly
   `The AudioContext encountered an error from the audio device or the WebAudio renderer.`
   The selected source creates a new AudioContext for each decoded sound
   (`game3.js:5919-5937`); this is a candidate lifecycle/environment interaction,
   not a proven exclusive cause. All runs retain canvas readback/GL performance
   warnings and the shared favicon error. No console APIs were changed here.

No result/restart, coin spending, save/reload, denied/corrupt storage, mobile,
physical touch, themes, native hardware or complete cheat acceptance. Twenty-two
screenshots exist; the menu and final-play captures above were actually opened
and reviewed, showing real game art/HUD rather than a fixture.

## Why no loader repair

There is no failed local asset transfer to retry in these reproductions. The
engine's exposed LoaderPlugin method list was inspected, but no supported retry
contract applicable to this problem was established. Its HTTP queue is already
empty; the game owns a separate local decoding pipeline. Adding a global fetch
patch, retry timer, preload bypass or fake completion would not address these
facts and could hide failures. No synthetic fault-injection fixture is warranted
without justified recovery logic.

**Operator/coordinator question:** supply legitimate underlying source or approve
separate investigation of a verified authored hook for the malformed SDK
injection and cheat/audio contracts. No safe reviewed authored hook for those
repairs was established in this bounded task. Do not hand-edit game3/Phaser or
preempt the malformed request merely to quiet the gate. Re-run the unchanged
full125 gate after integration; targeted transport success does not replace it.

## Static checks, cleanup and evidence digests

Actual output:

```text
PASS: all 417 materialized files match HEAD
PASS: one description exactly matches catalog; 3 inline scripts parse
PASS: 125 catalog entries, schema, unique integer IDs, Git-tracked URLs
game3 syntax exit=0
```

`git diff --check` on owned paths passes. Only metadata was added to runtime,
with no external loads. `python3 -B scripts/check_maintenance_docs.py` exits1:
`AssertionError: Commit inspected source changes before validating its inventory.`
Concurrent SEO/Wings source edits are dirty; after this metadata commit the
coordinator must reconcile the shared inventory too. No worker refresh here.
Other workers' SEO game entries/manuals, Wings source/verification, portal/history
scripts/docs are outside this commit and left untouched.

Each native run checks at least2GiB free before launching. Initial free bytes
**2,359,697,408**, post-native **2,339,725,312**, shared-filesystem delta
**-19,972,096** bytes; concurrent work makes this non-isolated accounting.
Diagnostic artifacts occupy about44MiB, including raw CDP data URLs and22 PNGs.
Port8983 has no listener after testing; no owned diagnostic command remains.
Browser close and server shutdown/server_close execute in finally blocks.
No persistent server, install or push.

SHA-256 (external evidence except the two unchanged tracked scripts):

| Evidence | Digest |
| --- | --- |
| `summary.json` | `ae87e0a0b470893c1ba6f8efdb298d4a980c429513f9f053001cf9e25afdf969` |
| `run-1.jsonl` | `55b3f67ca5e8dbedf7cc0bee372c3b59c5999d38330757ef60996b0125f4195d` |
| `run-2.jsonl` | `4980df34d8db2a4e9076bdf21a59c592feedb7bf58c0a851125e893bf438f85a` |
| `run-3.jsonl` | `dce0a67078e8aa9b520076697f595a39fc82a803be61762f475df96cd7bb3d18` |
| final `diagnose.py` | `c4b092f2fa88b044f9d2a1c79ee87e0f3f8de013497ea6392d910114b25fa021` |
| `actions.json` | `9b3db9e393d6835172da6103318d80733327c020483e5cf64cd630b371e95151` |
| `run-3-settled.png` | `0cefce2729e57bb27353cff0fbba068b73c60e05d185a886208ffca667be7c9b` |
| `run-3-late-release.png` | `63626b18c03951ca0a6b5e2917ea791ca854eb10ce4a567a768fc8237094346e` |
| `scripts/smoke_test_games.py` | `ee204d35ee1cd65bd11936decc627fe30644fe7edde5126e2f16e39c2c8f7f6f` |
| `scripts/run_sparse_smoke.py` | `5833da8665e512a228d210d2cc5c891740752bd6c32c4b59ba3ed8d02f6052c2` |

# Approved Basketballer diagnostic: pre-launch permission HOLD

Scope `BASKETBALL-NATIVE-VERIFIED-PASS-20261112`, pinned game/source HEAD
`56d4c8b4a52ed3d529492f57a08ebf51d4d5ffb3`. One diagnostic invocation; **zero
Chromium launches**, zero game requests, no retries. This is not native gameplay
or sandbox acceptance. The unused launch allowance does not authorize resumption
inside this ended scope.

## Invocation and distinct evidence

```sh
timeout --signal=TERM --kill-after=5s 85s python3 -B scripts/diagnose_basketball_readiness.py
```

New raw receipt: `.tmp/basketball-native-readiness-approved/receipt.json`, SHA256
`e2717ced5ec929d2db35fb92a8868f3140a301e0d9e8daaf05441130263fbf64`.
Old `.tmp/basketball-native-readiness/receipt.json` remains byte-identical, SHA256
`55e62169147c6677406e8f5dd789852879c4ed1cfe54263145cef280c5494450`.
Earlier committed QA/source/safety receipts are unchanged.

The checker was prepared to record accepted gates, actual local server game
GETs, context errors and individual readiness signals, with just one optional
phone capture. It uses a distinct evidence directory and refuses receipt
overwrite. Requested launch invocation/flags were AST-identical to the corrected
verifier; no automation, no-sandbox, unsafe SwiftShader or renderer override
arguments were added. Swap admission was strengthened to256MiB plus30MiB
headroom; the existing128MiB disk temporary reserve was retained.

## Exact observed result

Admission: disk **2,488,934,400 bytes**, MemAvailable **5,077,934,080**,
SwapFree **323,166,208**. Exclusive nonblocking shared scratch flock acquired;
no conflicting Chromium found; installed system binary present.

Then the pre-launch `read_processes()` baseline failed with **EACCES reading
the exe link of pre-existing PID1064** (`/proc/<pid>/exe`). The raw receipt
contains the exact kernel error. `launchAttempted=false`; execution never
reached `playwright.chromium.launch`. The stored stage is `safe-browser-launch`,
but the failure is its prerequisite baseline scan, not a failed Chromium launch.
Elapsed **3.80 seconds**.

| Gate | Observed acceptance |
| --- | --- |
| Offline verifier and Python AST | PASS52 fake-process cases; source checks only |
| Disk/RAM/swap, exclusive slot, binary | PASS |
| Pre-launch process baseline | **HOLD: PermissionError/EACCES** |
| Actual Chromium PID/argv/profile | NOT REACHED |
| Positive sandbox page | NOT REACHED |
| Renderer ancestry/NoNewPrivs/Seccomp | NOT REACHED |
| Local game page/HTTP, boot/RAF | NOT REACHED; `gameRequests=[]`, `http=[]` |
| Natural PLAY/recruit/5v5/live scoreboard | NOT REACHED |
| 100-name album and 390px phone HUD | NOT REACHED |
| Screenshot/full-match/device acceptance | NONE/unverified |

`events/errors/external/captures` arrays were empty because no game page was
loaded, not because the game passed. The Playwright driver entered before the
scan and emitted pending-task/TargetClosedError cleanup warnings on exit; those
are tooling cleanup warnings, not game or Chromium evidence.

Post-check: no Chromium process remained, the local server port8935 was bindable,
lock was released and free disk was **2,488,573,952 bytes**, above the floor.
No outside-repo deletion, download, extra worker, fixture grant or runtime edit.

## End of scope

Stopped without skipping protected processes, changing permissions, relaxing
identity checks, modifying gameplay or retrying. Hermes ticket
**`pi-3273687-1794466551296-0f6ec794`** records the hard permission hold and confirms
that even the unused launch allowance is not permission to auto-resume.
A narrowly scoped process-identity acquisition correction would need a separate
operator decision. There is no live argv/sandbox proof, no observed 100-player
album or 5v5 gameplay from this attempt, and no screenshot to compare with mockup.

Only diagnostic bookkeeping, this result and the maintenance manual changed.
No games added; registered catalog remains132, game projects139. Footballer,
basketball runtime/data, retained fixtures and previous receipts stay unchanged.
No catalog registration, publication or push. Native safety/rendering/phone play
remain blocked; the first10s readiness failure is still unexplained.

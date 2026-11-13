# Filtered Basketballer process check: pre-launch HOLD

Scope `BASKETBALL-PROCESS-FILTER-AND-ONE-PASS-20261112`. Starting HEAD `6d84ebbb`;
source fix/test checkpoint **`bef621197e686ca8509fc3b4929cf2b04773f21a`**.

## Source checkpoint

Actual-reader in-memory `/proc` regression reproduced the old protected-exe
PermissionError, then passed **66 offline cases** after the narrow filter.
Only an exact same-UID `systemd --user`, PPID1, older than this checker may omit
exe resolution; stable accessible comm/argv/PID/start/UID metadata is retained
and rechecked. No PID is hardcoded. Candidate/unknown/renderer exe or argv errors,
misleading service signatures, missing/ambiguous/reused PIDs and sandbox failures
still fail closed. AST, identical launch invocation, diff and maintenance gates
passed. No game/runtime/catalog changes or permission/flag bypass.

## One bounded diagnostic invocation

```sh
timeout --signal=TERM --kill-after=5s 85s python3 -B scripts/diagnose_basketball_readiness.py
```

Third distinct raw receipt: `.tmp/basketball-native-readiness-filtered/receipt.json`.
SHA256 `de6c4b5a0b0a331d238d20721152a482745f5ac43162f006349b681fc6f48673`.
Both earlier raw receipts and committed QA/safety receipts remain unchanged.

Fresh admission: disk **2,485,346,304 bytes**, MemAvailable **5,081,321,472**,
SwapFree **323,211,264**; exclusive shared scratch lock acquired and installed
system Chromium present. Required disk/temp, RAM and swap+30MiB headroom passed.

Stopped after **3.24 seconds** at `pre-launch-process-baseline`:

```text
HOLD: Missing UID or NUL-delimited argv
```

The receipt does **not** identify a PID or distinguish absent UID from invalid
argv. No process/root cause was inferred, and no subsequent process investigation
or filter expansion was performed. The baseline never completed, so even live
service-exemption completion cannot be claimed from this attempt.

| Gate | Result |
| --- | --- |
| Source fix/fake tests/AST/diff/maintenance | PASS, source evidence only |
| Resource/exclusive-slot/system-binary admission | PASS |
| Actual process baseline | HOLD: metadata validation error |
| Chromium launch | **NOT ATTEMPTED** (`launchAttempted=false`) |
| Actual browser argv/exe/profile/sandbox/renderer | NOT REACHED |
| Game HTTP/boot/RAF/PLAY/recruit/5v5/album/phone | NOT REACHED |
| Screenshots/native acceptance | NONE/unverified |

`gameRequests/http/events/errors/external/captures` are empty because no game
page was loaded, not because gameplay passed. The Playwright driver was entered
and emitted pending-task/TargetClosedError cleanup warnings; no Chromium launch
or gameplay evidence follows from those tooling warnings.

## Cleanup and end of scope

Post-check: no Chromium found, shared lock available, port8935 bindable; disk
**2,485,334,016 bytes**, MemAvailable5,043,425,280, SwapFree324,374,528.
No checker browser/profile was created; no outside-repo deletion. No retry,
unsafe flags, downloads, workers, heavy tests, Footballer/portal/catalog edits,
publication or push. The parked Footballer owner can reclaim browser capacity
under its own assignment; no competing work was started here.

Hermes ticket **`pi-3273687-1794467511604-9aa0ae33`** retains this unresolved
metadata gate. The unused launch allowance is not authority to resume this
ended scope or skip unknown processes. Native safety, rendering and gameplay
remain blocked; any further investigation/change/pass needs a separate scope.

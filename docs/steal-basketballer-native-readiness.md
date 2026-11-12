# Basketballer native readiness: safety-verification HOLD

Scope `BASKETBALL-NATIVE-READINESS-20261112`, pinned base
`5dacdae9456ee9843d96d7e703125bec66f75571`. One changed-hypothesis diagnostic,
no retry, no game evaluation. This is **not a native boot/play result**.

## Changed hypothesis and observed boundary

Previous evidence did not distinguish module/constructor/first-render readiness.
The new diagnostic first required positive effective-argv and sandbox evidence,
then would have observed readiness conjuncts separately, JSON/script HTTP
status/MIME/completion, console/page errors, context creation/loss, first draws,
RAF entry/exit and main-thread samples. Only after safe admission/readiness would
it naturally click PLAY, sign a player, start 5v5 and capture desktop/phone.

Exactly one invocation:

```sh
timeout --signal=TERM --kill-after=5s 85s python3 -B scripts/diagnose_basketball_readiness.py
```

Requested launch: installed `/usr/bin/chromium`, `chromium_sandbox=True`, no
supplied renderer arguments, no unsafe SwiftShader/GPU-blocklist/no-sandbox
argument. **Requested configuration is not effective-sandbox proof.**

Launch returned; the first effective-command-line query failed:

```text
CDPSession.send: Protocol error (Browser.getBrowserCommandLine): Command line not returned because --enable-automation not set.
```

Stopped at `sandbox-verification` after **3.12 seconds**. No effective argv was
returned; sandbox page and child-process checks were not reached. No game request,
HTTP entry, game event, external request or screenshot was recorded. Game boot,
first RAF/render, natural recruit, 5v5, album and phone phases were **not reached**.
The empty error/request arrays are not a game pass. Browser/server closed and
exclusive lock released; no Chromium process remained in the post-check.
Private raw result: `.tmp/basketball-native-readiness/receipt.json`.

Immediate admission: disk **2,495,655,936 bytes**, MemAvailable **5,037,596,672**,
SwapFree **320,835,584**. Thresholds: disk2,178,940,928 plus134,217,728 temporary
reserve, RAM1.5GiB, swap256MiB. No other Chromium was found; exclusive lock held.
No download, extra worker, model generation or production-state injection.

## Scratch-lock correction and retained evidence

The operator's `BASKETBALL-DIAG-SCRATCH-LOCK` arrived **after** this invocation.
That consumed pass used the earlier system-temp lock. Only the diagnostic's
lock path was subsequently changed to
`~/.hermes/cache/scratch/testrepogame-browser-audit.lock`, preserving exclusive
nonblocking flock and cross-game shared naming. The corrected path was source
checked, **not launched again**. The old system-temp lock file was not deleted;
no outside-repo deletion was performed. All cross-game callers must coordinate
on the designated shared scratch lock, not a per-game substitute.

The original failure and source-only receipts remain byte-identical:

- `docs/steal-basketballer-local-qa.md` SHA256
  `9b3b59145f7e07790334e7337f289dc0c55303b1137254989f48820ded36ec91`.
- `docs/steal-basketballer-boot-source-followup.md` SHA256
  `b95f10215b598dcd6dc4b4297bc37b734d361911c6c17bc3ddf1e240b15c7ea3`.

## Source changes, checks and native gap

Files: new `scripts/diagnose_basketball_readiness.py`; optional
`Games/StealBasketballer/tests/browser.py` removes its unsafe renderer arguments
and explicitly requests sandboxing (this old checker was **not run**); this
receipt and the basketball maintenance manual. No app/Game/Match/World/data,
original Footballer or catalog changes. No concrete production RED was observed,
so no speculative gameplay repair was made. No new games/registration/push or
publication; identity/publicity rights hold remains.

Python AST plus static launch/lock invariants, existing targeted `fixture.mjs`
(100 identities, 14-file local closure, bounded match/reward/reload), whitespace
and maintenance checks are the cheap source gates. Raw native outcome remains
HOLD regardless of those source results. Git inventory is refreshed only because
the optional checker is tracked inside the game tree, not as registration.

Hermes ticket **`pi-3273687-1794462997886-5cd8599f`** confirms this is a
safety-verification hold. A separately authorized pass needs an operator-approved
method to observe live effective argv and positively verify sandbox/child-process
state. Do not silently add launch arguments, weaken verification, retry this
configuration or proceed to game evaluation on a requested sandbox flag alone.
The first 10s readiness timeout remains unexplained; native play/visuals/touch
and complete-match/report acceptance remain unverified. No screenshots exist for
this attempt, so no implemented-render/mockup comparison can be claimed.

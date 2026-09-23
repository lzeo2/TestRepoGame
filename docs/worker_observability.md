# Worker observability — live logs + digests (default on)

How delegation activity becomes live-observable in every repo, without any
per-task setup.

## Mechanism

Delegation is implemented by the **swarmforge pi extension**:
`~/.pi/agent/extensions/swarmforge/orchestrator.ts`, registered globally in
`~/.pi/agent/settings.json` under `"packages"`. It registers the
`delegate_to_worker` tool, which spawns workers as
`pi --provider opencode-go --model <m> --no-extensions --print "<task>"`
subprocesses **in the repo's working directory**.

Everything below is written by that extension at delegation time — no repo
opt-in required.

## 1. Live per-worker logs

- Location: `<repo>/.swarmforge-logs/worker-<ISO-ts>.log`
  (override with `SWARMFORGE_LOG_DIR`).
- The extension tees worker stdout + stderr into the log **per chunk as it
  arrives** (`logStream.write` on every `data` event), so the file grows while
  the worker runs and `tail -f .swarmforge-logs/worker-*.log` works live.
- Log format:
  ```
  [worker start <ts>] cwd=<repo> model=<model>
  [task]
  <task text>
  [task end]
  ... worker reply streams in here ...
  [worker exit code=<n>]

  === DIGEST (first 25 lines of worker reply) ===
  ...
  === END DIGEST ===
  ```
- `.swarmforge-logs/` is gitignored (see repo `.gitignore`); logs persist on
  disk per repo but are never committed.

## 2. One-line progress notes

At each delegation the extension appends ONE line to
`<repo>/.swarmforge-logs/progress.log` (and surfaces it as a UI notify):

```
[<ts>] delegation START task="<first 80 chars>" log=worker-<ts>.log
[<ts>] delegation END code=<n> log=worker-<ts>.log digest=first-25-lines
```

Tail it with `tail -f .swarmforge-logs/progress.log`. Additionally, the
orchestrator's `promptGuidelines` instruct the orchestrator model to echo a
one-line progress note in its reply on every delegation — the `progress.log`
lines are the deterministic, machine-checkable version of that.

## 3. Digests

On worker completion the extension writes a `=== DIGEST ===` section into the
worker's own log containing the **first 25 lines of the worker's final reply**
(same 25 lines the orchestrator gets in the tool result), then closes the
stream. One file = full output + digest.

Fallback for logs that predate this (or workers spawned by external wrappers):
`scripts/worker_digest.sh [logpath]` computes and appends the same digest
section; it is a no-op if a digest already exists.

## 4. Wrapper convention (for anything spawning workers outside the extension)

If you spawn a worker process yourself, reproduce the contract with one line:

```sh
stdbuf -oL -eL <worker cmd> 2>&1 | tee -a .swarmforge-logs/worker-$(date -u +%Y-%m-%dT%H-%M-%S-%3NZ).log
scripts/worker_digest.sh .swarmforge-logs/worker-<ts>.log   # after completion
```

`stdbuf`/`tee -a` keep the log unbuffered so `tail -f` sees output immediately;
`worker_digest.sh` lands the digest once the worker exits.

## Patchability status

- Live tee, `progress.log` notes, and digest-in-log: **patched** in the
  swarmforge extension (external to this repo — lives in `~/.pi/agent/`, not
  committed anywhere; it is global to all repos).
- `.gitignore` entry: already present in this repo.
- Fallback digest + wrapper convention: **in-repo** (`scripts/worker_digest.sh`,
  this doc).
- Not patchable from this repo: the extension source itself is outside any git
  repo; if it is lost, re-create it per this document (all behaviors above are
  described precisely enough to reimplement).

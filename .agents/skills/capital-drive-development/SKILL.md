---
name: capital-drive-development
description: Develop or verify the existing offline Capital Drive Canberra game, including Street Life rules, free roam, source-derived geography, original landmarks and bounded test evidence.
---

Use this skill for changes to the existing `Games/Capital Drive/` project, catalog 245.
It does not authorize another game, registration, publication or a push.

Read repository `AGENTS.md`, `docs/CODE_QUALITY.md`,
`docs/maintenance/README.md`, `docs/maintenance/games/245-capital-drive.md`,
`docs/maintenance/inventory.json` and `docs/capital-drive-street-life-contract.md`.
Then follow [the concrete workflow](references/workflow.md). Check current source
against those records; historical test counts are dated evidence.

The repository root is the static document root. There is no build or package
installation step. Use existing Node and Python; keep optional browser/geodata
packages and raw downloads outside the repository. Runtime imports stay local.

Before editing, identify each affected state owner and its callers. Keep module
ownership explicit. If delegating under an authorized multi-agent task, use
disjoint files, bounded tasks and exclusive staging windows. Never edit the
protected Character AI tree, bundled portal JavaScript or disabled proxy backend.
Check disk and sparse selection before expanding any checkout; retain at least
2 GiB free. Never infer absence from a sparse-excluded path.

The controller owns the sole loop, input, modes, storage and UI. Pure modules
accept injected context and supplied dt. Street Life cannot teleport or earn from
sandbox travel. Invalid/denied career saves remain unwritten. Source observations
must be recorded honestly; proprietary reference imagery is never bundled.

Run the bounded authored check runner from any directory:

```sh
python3 -B scripts/check_capital_drive.py --help
python3 -B scripts/check_capital_drive.py --dry-run
python3 -B scripts/check_capital_drive.py
```

The paths in examples assume the repository root. The runner itself resolves that
root from its own file. It requires all documented modules/suites and fails on a
missing file or failed command. It installs nothing and runs no full-fleet test,
regeneration, maintenance refresh, save reset or push.

For explicitly needed browser evidence, choose a fresh directory outside the
repository and pass it with `--browser --output`. Browser checks use a temporary
localhost server and terminate it. Record actual results and limitations; a pure
pass does not establish native gameplay, visual quality or N100 performance.
Commit only owned paths. Update maintenance prose/inventory after the source
commit, run its checker, and hand off exact commits, commands, results and holds.

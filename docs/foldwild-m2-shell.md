# Foldwild M2 shell milestone

Delegation 53 used actual `openai-codex/gpt-6.1-sol`. Scope: `index.html`,
`style.css`, `scripts/test_foldwild_m2_shell.py`, and this report only.

- Preserved legacy IDs, data attributes, skip link and the single canvas.
- Added initially hidden ledger inspection with name, live status, 260px model
  host and 44px rotate/reset/back controls. The host scopes `--scene-height` so
  the existing canvas height follows it when Core moves the same node.
- Added native release confirmation, Save progress and initially hidden evolution
  summary below the result description. Release description is empty until Core
  fills the exact individual and irreversible-action warning.
- Kept local fonts, flat colors and existing desktop/battle layout. No JavaScript,
  dependency, asset, catalog, registration or push changes.

## Verification

`python3 scripts/test_foldwild_m2_shell.py`:

```text
Ran 1 test in 0.010s
OK
shell-test exit=0
```

Python AST parsing: `shell test Python AST: OK`.
`git diff --check` for the assigned HTML/CSS: `diff-check exit=0`.

A bounded native HTTP layout fixture on port 8802 used one Chromium browser,
blocked the entry module to avoid concurrent Core edits, moved the existing
canvas, and supplied clearly labeled layout text. At 320/390/1280px the host
measured 254/324/716px wide and 260px high. Checks found no horizontal overflow,
no heading/back overlap, and all tested controls at least 44px. Native Escape
closed ledger/release dialogs. Light/dark preference captures use the existing
fixed-light shell. Output: `browser-layout exit=0`; `Port 8802 server closed.`
Nine uncommitted screenshots are in `/tmp/foldwild-m2-shell/`, named
`{width}-{light|dark}-inspector-layout.png` and `{width}-release-layout.png`.
Main owns subjective review.

## Integration holds

The fixture is not gameplay, a loaded-model/fallback proof, or a release/save
transaction proof. Core 54 must wire all new controls, restore canvas ownership,
fill release text, and reveal actual evolution results. Initial shell markup
alone does not make Save progress active. Hairstyles remain Core-owned; no
extra options were inserted here. Campaign, all-species fit/acquisition, N100
hardware acceptance and the full registered-catalog pre-push gate remain open.

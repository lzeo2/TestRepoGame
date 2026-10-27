# Foldwild narrow release integration (2026-10-27)

## Authorized scope and integration

The operator explicitly authorized pushing eligible Foldwild changes to main,
reusing exact passing snapshots rather than repeating tests. A subsequent order
authorized minimal mechanical baseline inventory/manual repairs, not other-game
runtime changes or acceptance waivers.

Fresh remote base: `76518f9d5253437500da62ad9392769669448f6a`.
Accepted source: `11707038`; product `eb917858`; independent QA `48027aed`.
New linked sparse release branch: `release/foldwild-20261026`. Existing source
worktrees remain untouched. Only Foldwild runtime, scoped tests, linked receipts
and evidence were integrated with a three-way indexed patch. Main was the common
ancestor; there were no conflicting or newer main Foldwild edits to discard.
Source integration is `6efa1470`. No mixed branch history/catalog was imported.

## Passing proof reused, not rerun

The entire 97-file Foldwild tree is exactly
`6929cd6f31b89841b1eafeb9e745e73aca002424`. All 12 runtime SHA-256 values and all
88 model/vendor/font hashes exactly match the clean Native-5 report, including
fonts retained from main. Script SHA is
`51bacd230419a605d017a5129e950d7f6db0de9e7c267f538ab8503044230f4a`;
view SHA is `b5e5b383a06a4228f2a55a62df6710bead96ed1d4691d1801048270a647c1619`.
All 20 passing Node suites and runner/diagnostic/shell check sources are also
byte-identical to the accepted source. Their passing results and desktop/touch
2/2 Native-5 acceptance are reused; no browser or repeated passing suite ran.
The original failure history and full M2/campaign/hardware/rights holds remain.

[Native result](foldwild-upgrade-evidence/corrective-cycle/native-5/native-results.json),
[postflight](foldwild-upgrade-evidence/corrective-cycle/native-5/postflight.json),
[implementation/visual review](foldwild-upgrade-delivery.md).

## Separate mechanical baseline repair

Before repair, the unchanged fresh main failed:

```text
AssertionError: Inventory stale: inspect changes, then run --refresh.
```

Recorded catalog count127 versus actual129; missing Brainrot row, obsolete
Citisten registration/path, stale Jankolock/Jankolock3D/Wings trees and Foldwild's
old row. The official calculator, not a feature-branch inventory copy, now records
actual tracked trees. All non-Foldwild game trees are proven identical to the
fresh remote base. Foldwild's own row records its accepted release tree.

After refresh, the next genuine failure was:

```text
AssertionError: Missing docs/maintenance/games/001-brainrotboulevard.md
```

A bounded source-grounded coverage manual fills that missing path. It documents
exact inspected-source limits and does not claim new native testing or rights.
The README current counts/unregistered list are corrected from catalog facts;
historical reports remain historical. No unrelated source/test/asset changed.
The baseline documentation repair is committed separately from source integration.

Final actual command: `python3 -B scripts/check_maintenance_docs.py`:

```text
PASS: 135 game documents cover 129 registered + 6 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

## New release checks

- All native runtime/asset/test hash comparisons pass; no failed check was waived.
- Catalog129 required schema/types/unique IDs/Git-backed URLs pass; catalog is
  byte-identical to both fresh main and the accepted source.
- Foldwild-only runtime allowlist passes; every other game tree equals main.
- Three-way integration, staged whitespace and text privacy scans pass. A scanner
  was corrected to distinguish escaped `Call log` newlines from Windows paths;
  no artifact, error, source or assertion was suppressed or altered for this.
- No install, browser, model copy, force push, source-worktree reset or history
  rewrite. Only this small linked sparse release worktree was initialized.
- Root free space was 2,434,265,088 bytes at admission and remained above the
  2,147,483,648-byte floor throughout recorded release operations.

Final remote SHA and deployed HTTP hash observations are reported after the push,
not invented in this pre-publication record. Deployment target is the documented
`https://lzeo2.github.io/TestRepoGame/`; no host/backend configuration is changed.

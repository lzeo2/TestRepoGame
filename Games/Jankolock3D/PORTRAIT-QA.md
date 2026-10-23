# Portrait lobby verification

## Approved-directory follow-up

The operator approved the maintenance audit directory. A fresh dedicated run
now passes with exactly one browser attempt: two native 1280x720 normal-lobby
captures (dark/light) and one explicitly labeled unscaled crop, 69 HTTP200
responses, zero retained errors, and 64 stable runtime/config/model hashes.
Evidence: `docs/maintenance/audits/jankolock-3d-qa/portrait-resume/`.
The original SKIP receipt and historical account below remain unchanged.

A new zero-attempt preflight SKIP is retained in `portrait-resume-preflight-skip/`.
The broad process search could match shell arguments containing a cleanup search
for Chrome. The runner now tests actual process names and Playwright driver
commands, excluding zombies, rather than arbitrary shell text. Run
`python3 -B Games/Jankolock3D/portrait-qa-test.py` for the no-browser regression.
Output now goes exclusively to the approved audit directory; an existing output
directory must be archived before another run rather than overwritten.

Saved-image review shows the supplied face relief inside its display frame in
both themes, unobscured by hero selection. The surface remains soft and shallow;
framing does not prove scan quality, likeness clearance, glass realism, or a
360-degree model. The crop is not a third camera view. Lobby/no-fixture state,
exact portrait metadata and local asset pins passed. Browser/server cleanup was
verified and the parent received explicit release. No gameplay/model/catalog
change, full-fleet gate, supported-hardware or independent H grade is claimed.

## Historical dedicated-run account

This is builder evidence, not acceptance H, full-game QA or an escape-room game
claim. No asset or integration code was changed. Asset commit `a6b273a` and its
original receipt remain untouched. CREDITS was not updated with a visual claim.

### Original skipped run

`TMPDIR=/dev/shm timeout --signal=TERM --kill-after=5s 100s python3 -B
Games/Jankolock3D/portrait-qa.py` exited 1. Its preflight reported:

```text
Sibling browser/Playwright active (1 processes); no browser attempt
```

The safety interlock skipped before creating a server or launching Chromium.
No second browser run was attempted. The matching process identity was not
retained; actual sibling browser ownership is unproven. The subsequent process
check had no matches. The script now describes this conservatively as a live
process match, not confirmed sibling ownership.

`portrait-qa.json` saves SKIP, zero browser attempts, zero HTTP observations and
zero screenshots. Light/dark lobby and detail images do not exist from this
run. Actual relief recognizability, in-room placement, behind-glass visibility,
read-only `jank3dSnapshot()` lobby metadata and HTTP closure remain unverified.
Source inspection shows intended placement and glass geometry, not visual proof.

## Checks that did run

- `node --check` on `portrait.js` and `game.mjs`: exit 0.
- Existing `selfCheckPortrait` on the actual GLB:
  `PASS: GLB geometry/counts/native scale, SHA-256 and corruption rejection`.
- Isolated Node mount with actual local config/model responses: frozen metadata,
  unit transforms, scene attachment/detachment and exactly-once geometry/material
  disposal after two `dispose()` calls passed. This uses a local-file fetch
  fixture, not browser or gameplay evidence. No game state grants were used.
- Python AST parse and saved SKIP report invariants: PASS.
- `python3 -B scripts/check_maintenance_docs.py` exited 1:
  `AssertionError: Commit inspected source changes before validating its inventory.`
  The orchestrator owns reconciliation after sibling integration commits.

Before/after source hashes in the JSON include game, scene, portrait loader,
config, receipt and model. No changes were observed during the short preflight
interval or the later module-check recheck. This cannot exclude edit-and-revert,
changes between resource reads or changes after this run. The existing inventory
still describes a 37-file world-only tree with no canonical entry, not the
current active integration. Historical maintenance results do not accept it.

## Repeat when the shared browser is free

```sh
TMPDIR=/dev/shm timeout --signal=TERM --kill-after=5s 100s \
  python3 -B Games/Jankolock3D/portrait-qa.py
```

The script uses installed Python Playwright/PIL, system Chromium, an ephemeral
loopback server with finally-shutdown, 1280x720 native captures and the normal
index without a fixture query. It checks native dimensions, full-frame and
left-scene variance, actual portrait metadata with `playing:false`, local HTTP
200 closure and browser errors. Dark mode uses the existing theme button.
No DOM hiding, camera edits, grants, UI changes or new dependencies are used.
The detail output is a labeled, unscaled crop of the light capture, not a
separate view. Inspect all captures before making any visibility claim.

Independent review and H grading remain separate. Formal approval for the
separate QA directory is pending; this task writes only its allowed game paths.
No catalog change, game addition, maintenance edit, full-fleet gate or push
was performed by the dedicated QA worker.

## Subsequent independent review of integration-owner captures

The integration owner later supplied normal-lobby light/dark captures at
`docs/maintenance/audits/jankolock-3d-qa/integration/integration-H.png` and
`integration-H-dark.png`. Independent `PORTRAIT-REVIEW.md` binds its **QUALIFIED**
H result to their exact hashes. The dedicated SKIP above remains accurate:
this script did not produce those captures or run a competing browser. The
broader integration run timed out, and subsequent source edits prevent treating
those images as stable current-source or full-game acceptance.

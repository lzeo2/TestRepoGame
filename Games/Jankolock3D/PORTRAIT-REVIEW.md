# Independent portrait acceptance H review

## Verdict: QUALIFIED

H is supported by the inspected normal-lobby screenshots and verified supplied
relief derivative. This is bounded visual/source acceptance, not a certification
of the entire integration, other acceptance letters, hardware or release.
No browser launched, no asset regenerated, no implementation edited.

Contract reviewed: supplied JANKOLOCK 3D shared spec, criterion H, and approval
ticket `pi-2056936-1792623938095-8f83e5fa` response. The response approves an
in-house supplied-photo relief derivative below 8,388,608 bytes, preserving the
external original and computing actual integrity pins. It does not require a
full head scan or an escape-puzzle game.

## Independent measurements and source inspection

Read `portrait.js`, `portrait-config.json`, `portrait-receipt.json`,
`optimize-portrait.py`, `CREDITS.md`, and integrated `game.mjs` lobby setup.
Read the maintenance guide and inventory; their world-era coverage is not
current integrated acceptance. No manual/inventory edits belong to this review.

Local GLB bytes independently hashed and parsed:

- Derived bytes: **3,228,372**, strictly below **8,388,608**.
- SHA-256: `8463eee8276187cacaba912d9540279ad1bb338aa382e9448632aa9a33892514`.
- Vertices: **61,893**. Triangles: **124,512**.
- Loader BYTES/HASH, enabled config URL/bytes/hash and receipt derived pins agree.
- External supplied original still exists: **10,972,672 bytes**, SHA-256
  `abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9`.
  This proves its present bytes match the pinned source, not its complete history.
- Legacy `Games/Jankolock/index.html` remains tracked. Nothing was removed.

Optimizer source implements deterministic 1.5 mm vertex clustering with averaged
positions/colors/normals and collapsed/duplicate/zero-area face removal. The
receipt clearly labels centroid displacement as not a surface-distance bound.
This reviewer did not rerun full derivation or independently measure that error.
Source provenance is operator-supplied, not independent identity/rights research.

`mountPortrait` uses local config and GLB, validates bytes and SHA-256 before
mounting, and supplies disposal. The host builds real room boxes, cabinets,
a plinth/frame and a transparent glass box (opacity 0.16, depthWrite false).
It mounts the relief at scale 23, position (-3.5, 5, -2) within the lobby,
sets the lobby camera and captions it as a supplied photo-derived Patron effigy.
No full scan or complete sculpted head is claimed.

## Actual images and capture-flow review

Opened both actual PNG attachments, not just their filenames or report labels.
Paths below are relative to `docs/maintenance/audits/jankolock-3d-qa/integration/`.
SHA-256 binds this review to these exact bytes, which were untracked and owned
by the active integration worker when inspected.

| Image | SHA-256 | Independently recomputed size / RGB variance |
| --- | --- | --- |
| `integration-H.png` | `8c9f3791cc96a99ad13c1862388cf6a7eb0dabf934b3e91c39180e9426647ed5` | 1280x720 / 5429.64 |
| `integration-H-dark.png` | `def6ab1ae1ad3af3bfaece5d95a512a679516bb201b3638df426d4f043af95da` | 1280x720 / 3052.38 |

The face and hair are clearly visible, unobscured by hero selection, within a
perspective room and framed display. It reads as a photographic shallow relief,
not a rounded statue. The cutout edge, muted shading and very subtle glass are
aesthetic qualifications: adequate for the requested effigy, not polished scan
quality. Room furniture and the frame establish the lobby setting; no escape
puzzle is inferred or demanded. These images do not establish likeness identity.

Read `integration-qa.py`: initial `load()` uses no query, waits for renderer
triangles, then checks portrait metadata before H capture. H-dark follows only
a native theme-button click. Fixture traversal loading and API mutations occur
later. `game.mjs` gates fixtures on a nonempty qa query and loopback host.
Thus the H capture flow is normal lobby, not a staged portrait fixture.

Inspected evidence report SHA-256:
`dbbb0fedea52090fefa1517d9235a0a1d4d3791c9f9adbc3bd21823878acc99b`.
It records HTTP **200** for index, portrait module, config and GLB, zero retained
errors, and the two matching H variances. These are inspected builder receipts,
not an independently repeated browser/HTTP run. Its overall status is **FAIL**:
`TimeoutError: Page.wait_for_function: Timeout 30000ms exceeded.` Later integration
failure does not erase the already captured H evidence or become a full pass.

Capture-script SHA-256:
`9f3c51e18c0e05b19befd55257d6a597d0982ec808d4e1c9f6f407f827f928ec`.
Current inspected `game.mjs` SHA-256:
`7af251c997480a13e07ba654839fe357d41a6758a3e8251867858410d0099a1d`.
The report instead pins game source
`ce92b910005101efb3891da5fee0aa957e7b7204d6af3fd37dcfd7f23627cc5f`.
Active source changed: this review cannot certify that every current integration
byte produced these screenshots. Final integrated acceptance needs a stable run.
The portrait module and asset hashes still match the captured source pins.

## Checks run and remaining limits

Existing Node portrait self-check returned:
`PASS: GLB geometry/counts/native scale, SHA-256 and corruption rejection`.
Independent loader/config/receipt byte/hash comparison returned `pins: PASS`.
Existing optimizer `--self-test` returned:
`PASS: deterministic clustering, collapsed/duplicate removal, GLB round-trip`.
These are CPU/module checks, not target-GPU or browser performance verification.

`python3 -B scripts/check_maintenance_docs.py` was attempted and blocked:
`AssertionError: Commit inspected source changes before validating its inventory.`
The active integration owner must reconcile source/manual/inventory after commit;
this reviewer must not stage or repair their paths to manufacture a pass.

Prior `portrait-qa.json` is **SKIP**, with zero browser attempts because a sibling
browser was active. It is neither portrait failure nor affirmative visual proof.
No full-fleet gate, mobile H review, offline cold-cache run, hardware gate,
registration change, push or other acceptance criterion is certified here.

Only new `Games/Jankolock3D/PORTRAIT-REVIEW.md` is owned and committed by this
review. Screenshots captured by reviewer: **0**; existing images inspected: **2**.
Disk available at entry: **4,009,578,496 bytes**; immediately before this report
write: **4,009,136,128 bytes**, above the required **2,178,940,928** write floor.
Concurrent work prevents attributing the whole disk delta to this review.

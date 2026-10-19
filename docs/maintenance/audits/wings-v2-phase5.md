# Wings v2 Phase 5: CPU and raw-preview consolidation

2026-10-19, baseline `08342c6`, initially clean. **CPU checks PASS; saved raw
receipts validated.** This is not new native or final visual acceptance.
Only this new receipt changes tracked content. No source, bundle, model, catalog,
installation, checkout, browser launch, screenshot capture, deletion or push.
Read AGENTS, CODE_QUALITY, maintenance README/manual232, resume, Phase 3/4,
v2 brief, quality/models contracts and previews-v2 README. Current Wings tree
`99037d4c28dc37dbafee9db8f0104751f704995f` matches inventory. Local receipts
supply history; Hivemind tools/index were unavailable. Parent owns subjective
review, selected screenshot saving, manual and inventory updates.

## Fresh terminal checks
All four commands exited **0**, with 90-second command bounds:

```sh
node Games/Wings/verification/astra-check.mjs
node Games/Wings/verification/solo-check.mjs
python3 -B Games/Wings/verification/check-models.py
python3 -B scripts/check_maintenance_docs.py
```

Actual output excerpts:

```text
PASS: offline takeoff, fresh session, ordinary-input crash and respawn; rendering not tested
PASS: 130 game documents cover 125 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

Astra passed real CPU loader/converter, distinct fits, stealth, hardpoints,
store depletion/regeneration, exhaust/bay/input assertions and original-five
invariance. Four combat fixtures printed ammo 1 after firing; acquire ticks
132/150/150/150. Converted F-15/F-35 triangles were 41,744/41,008, six batches
each, including 392/196 flame triangles. Solo printed freshTime 0, crashAt
4.016666666666667, respawnAt 14.016666666666666, respawnAlive true.
Model checker passed committed bytes against repeated in-memory generation:

| Model | Raw triangles / vertices / assignments / materials | Bytes |
| --- | --- | ---: |
| F-15 | 41,352 / 25,305 / 142 / 12 | 1,176,316 |
| F-35 | 40,812 / 25,323 / 143 / 12 | 1,174,768 |

Current GLB SHA-256, independently checked against HEAD and models.md:

- F-15: `5c1bf64dc21962dc822dc44edd91186aa4a6932034b06a405d3170518fc135bf`
- F-35: `ce19018414037e3cef949a99ae08a1d035b25fbd20601e1835c2426bc32db197`

## Saved renders, not recaptured today

Validated `.tmp/wings-v2-resume/accepted/browser.json` **6/6** and
`.tmp/wings-v2-resume/phase2/browser.json` **9/9**; every referenced PNG exists.
Every recorded model has Three revision **186**, exact calls/triangles:
F-15 142/41,352; F-35 143/40,812; family F/A-18 151/16,896,
A-10 166/17,576; YF-12 123/18,028. Current serialized counts match.
All saved errors/warnings/external arrays are empty. Phase 2 also records empty
failed-request arrays and projected corners inside clip bounds, revalidated here.
Neither JSON records model hashes or an overflow field. No historical hash binding
is inferred. The default runner asserts scrollWidth <= innerWidth; the inspected
Phase 2 adapter retains that assertion. Overflow execution PASS is dated evidence
from the resume receipt, not a fresh DOM measurement or invented JSON field.

The [resume receipt](wings-v2-resume.md) dates the actual last-session raw renders
and parent vision judgments to **2026-10-18**: distinct dark silhouettes,
continuous lit bellies, visible F-15 stores and no visible inverted patches.
Default dim undersides alone were insufficient; lit-belly diagnostics supplied
the scoped clearance. Raw fixtures omit converter-generated animated cones.
The tracked [previews README](../../../Games/Wings/docs/previews-v2/README.md)
dates existing Windows climb/cockpit/cannon images to **2026-10-17**, not today.
Parent will save selected last-session images under `Games/Wings/docs/previews-v2/`;
this worker neither copies images nor grants subjective/operator approval.

## Operator clarification and remaining scopes

Operator answer to `pi-829842-1792322142957-ab609a47` restores only narrow
capacity above the strict 2 GiB floor. Native GPU limitations are hardware
receipts and **do not themselves block gate/push**; SwiftShader CPU rendering is
supported. This hardware waiver does not claim successful native pixels, waive
functional acceptance, or turn CPU simulation into an interactive playtest.
Native exhaust, missile acquisition/fire and bay/store pixels, converted-family
parity, physical pointer capture, listening/audio and device performance remain
unverified in this consolidation. Phase 3's Settings timeout preceded launch.
Rights qualifications remain unchanged; historical fleet passes stay dated.

Required sequence: Phase 4/5 consolidation, then bounded speedboat/F/A-18 study,
then design/build, then fresh unchanged full **125-game** gate, then interactive
new-boat acceptance, then push only if all required gates are green. Normal boat
spawn and every weapon's verified state changes remain mandatory. No boat work
started; no game or selectable class added. Full gate here: **0/125 visits**.
Parent preview consolidation remains pending; no release or push follows this file.

## Logs and storage
Full bounded stdout/stderr: `.swarmforge-logs/wings-v2-phase5.log` and
`.swarmforge-logs/worker-20261019-052955.log`. Four fresh checks plus saved-receipt
validation passed. Free bytes before: **2,154,225,664**; after checks/validation:
**2,153,910,272**, decrease **315,392**, filesystem-wide, not task-attributed.
Both exceed **2,147,483,648**; remaining margin is only **6,426,624 bytes**.
Checks guard capacity before each command. This is not fleet/build headroom.
Only this receipt is staged with a `docs:` commit; never push from this lane.

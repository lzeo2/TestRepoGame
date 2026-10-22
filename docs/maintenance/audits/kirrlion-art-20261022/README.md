# Below the Obvious: original depth-column artwork

## Scope and milestones

Existing catalog 235 only. No new games, registration, publication or push.

1. `bbaba1a` committed the generated [mockup](../../../kirrlion-art/ui-mockup-trivia-krillionized.png) before UI edits. Generated with codex-imagen, original concept only; not shipped as a runtime image.
2. Visual source: system monospace, cream/navy paper card, oversized spaced title, flat ocean bands, proportional ruler, original Glim SVG and original flavour lines. Sonar is muted by default, synthesized locally, and opt-in. `core.js` and `questions.js` are untouched.
3. QA/documentation: this receipt, retained screenshots, source checks and a guarded focused browser regression (`scripts/test_kirrlion_art.py`).

The design follows the operator's supplied Krillion measurements. It is **not an identical rendering**: system monospace is not VT323; the title, creature, wording and trivia controls are original. No Krillion artwork, source, font or audio was imported. The mockup's generated sample question and decorative text were not adopted.

## Checks actually run

- `node --check 'Games/Dive Trivia/script.js'`: exit 0.
- `node scripts/test_dive_trivia.mjs`: **8 checks passed**, 28 prompts / 4 packs / version 2026.10.1.
- `git diff --check`: exit 0.
- Existing `python3 -B scripts/test_dive_trivia_browser.py`: **FAILED**, exit 1, 208.097 seconds. Completed 12 groups and 24 screenshots before `Locator.press_sequentially` exceeded its unchanged 8-second timeout on the 80-character input case. Zero external attempts, browser errors or request failures; no layout findings before the timeout. [Machine report](partial-gameplay-report.json) retains the failure. No filters or timeouts weakened.
- Focused `python3 -B scripts/test_kirrlion_art.py --reference`: refused launch, `BLOCKED: another Chromium owns the shared browser slot`. This is not a test pass.

## Browser coordination and holds

The existing regression was mistakenly launched after printing busy Chromium processes rather than stopping. This violated the shared-browser sequencing rule; contention was observed, but is not proven to be the timeout's sole cause. Its browser and bounded server have exited. A coordination ticket requests an exclusive slot; CITISTEN's next numeric performance slot has priority and this lane is holding browser launches. The focused checker now enforces a pre-launch busy refusal.

**Blocked:** fresh focused sonar/depth acceptance, live `https://krillion.to/en` capture and side-by-side comparison. No reference screenshot or comparison is fabricated. Re-run the guarded focused check with `--reference` after an exclusive slot is released. It uses `/usr/bin/chromium` explicitly, bounds runtime to 170 seconds, and closes its browser/server. The external reference tab is isolated from the offline game's request policy.

The full fleet `xvfb-run python3 scripts/smoke_test_games.py` has not run. No push or release acceptance claimed. Real audio audibility, real touch hardware, mobile keyboard and screen-reader review remain unverified.

## Retained screenshots and visual review

Captured using system Chromium headless during the partial regression, not design fixtures:

- [Desktop light launch](desktop-light-launch.png), [dark launch](desktop-dark-launch.png)
- [Desktop light reveal](desktop-light-reveal.png), [dark reveal](desktop-dark-reveal.png)
- [320px light reveal](mobile-320-light-reveal.png), [dark reveal](mobile-320-dark-reveal.png)
- [390px light launch](mobile-390-light-launch.png), [dark launch](mobile-390-dark-launch.png)

Visually reviewed desktop light launch and 320px dark reveal: cream/navy hierarchy, flat bands, legible tick labels and original luminous-eye creature are visible; no horizontal clipping. Full ruler is retained on mobile, at the cost of additional vertical scrolling. The existing test found no layout failures in all 24 captures, but that does not establish subjective polish for every image or complete the failed regression. Other retained captures are evidence, not all individually reviewed.

## Storage and sparse hygiene

Initial `df -B1 / --output=avail`: **3,907,674,112 bytes**. The user-supplied earlier disk figure was not treated as current measurement. No guard waiver, browser installs, dependency installs or out-of-repository deletion. Only `Games/Dive Trivia` was added to the narrow sparse selection temporarily; original selection must be restored after source verification. Final bytes and commits are recorded in the final handoff.

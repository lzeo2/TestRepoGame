# Slipstream overlay: source-only review

**Verdict:** native acceptance remains pending with Main. This is code review, not browser, screenshot, gameplay or release proof.

Reviewed baseline `c869bc24ad84b1b1a68f21b052e1ec25433623f2`. Environment reports `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6-astra`; thinking level and underlying service identity were not independently verified. Read AGENTS, CODE_QUALITY, maintenance entry/manual, the four game presentation files, shared CSS, portal launch functions and modes harness. Private implementation/phrase/tests were excluded.

## Findings

- **Medium, existing focus handoff gap:** `script.js:83–114,195–196` hides the focused Park/Garage button when returning to the garage, without focusing a visible garage control. Automatic terminal entry likewise does not announce/focus the results. Start and Hide/Show explicitly manage focus, but return/results do not. This is a missing handoff, not evidence of an inescapable keyboard trap. Main should check normal keyboard Park, highway abandon, terminal result and Garage navigation; focusing Start/Retry at the corresponding transition is the small potential correction.
- **Verification gap:** `test_slipstream_modes.py` checks garage CTA bounds at 1280×900 and 390×844 only. Its 320×740 and 844×390 loop checks paused driving HUD/controls, not garage/results. `style.css:46–64` combines a 53dvh scrolling portrait panel with a separate short-height half-width rule. A scrolling panel alone does not guarantee Start stays above its fold, especially with wrapped title/goal text. No confirmed clipping claim without layout execution. Extend native coverage to those garage/results sizes, all three goals, and both themes.
- **Documentation blocker:** maintenance inventory is stale. Recorded entry blob `e85098374bc169058906df93a62b24c8ff4fbd72` differs from current `c3be296cc4631be34feb4ab44512e130a85552d4`; the manual still describes the earlier layout. The checker actually failed with `AssertionError: Inventory stale: inspect changes, then run --refresh.` Main owns the update; this review changes neither inventory nor manual.

## Source conclusions

- `style.css:1–14,36–50`: canvas host is fixed at zero with full window dimensions; garage, results, HUD and driving controls overlay it. Shared canvas height rules are overridden by the higher-specificity local canvas rule. Native dialogs remain top-layer, scrollable and Escape-dismissible; key handling exits while either dialog is open. Modifier/composition/editable guards preserve native form input and button Space/Enter. No custom Tab trap was added.
- `script.js:73–143`: each native select mode has a goal and matching Start verb; live goals distinguish city banking, active pursuit, Sprint and Cutup. Copy does not promise an unconditional win, free payout on abandonment, or a finish bonus for city parking. Start requires renderer availability, unlocked storage and no active run; the core transaction remains the authority for mode/reservation validation. `finish()` is the sole controller settlement caller, guarded by running phase and terminal status. City Park routes through it; highway leave abandons without settlement. Core economics were not re-audited here.
- `script.js:8–10,165–213`: touch controls are intentionally UA-only, not width/touch-capability driven. Hide/Show stays reachable outside the hidden garage, updates expanded state, and focuses viewport/Start. Help pauses, clears input and resumes only under guards; native reset retains explicit consent. Phone desktop-UA compatibility remains a known limitation, not a new regression.
- `view.js:270–285,350–358`: dimensions come from the full-window host. `setViewOffset` shifts a full-size projection, not renderer size. Any non-null run, including terminal results, clears the garage offset; garage return nulls the run and reapplies it. Portrait/landscape are recalculated each draw. **Low-priority behavior:** hiding the garage does not recenter or restore the closer orbit because the view receives no menu visibility; the same offset remains with the menu hidden. This is deterministic source behavior, not proven visual harm.
- `assets/portal-ux.js:338–425,520–531`: launch uses the existing local Games-path guard, modal player and titled iframe. Native fullscreen checks method/support, catches rejection and retains the non-fullscreen player. Close removes the frame and restores a connected opener. Fullscreen Escape is separately forwarded; actual browser fullscreen/dialog interplay remains a runtime hold.
- Commit scope lists only HTML/controller/CSS/view/harness. No physics, save implementation, private implementation, vendor, catalog or protected changes belong to this overlay milestone or this review.

## Pins and actual checks

SHA-256 of inspected working files (game files and portal matched HEAD):

| File | SHA-256 |
| --- | --- |
| `Games/Slipstream Borough/index.html` | `c776996493301520f68c0cb3c5cb53a0e66e489b25e6b99864d28d6af93222da` |
| `Games/Slipstream Borough/style.css` | `36752db8877ba58f37334ee18f1d22e2ce1ea1049bb494d7bfee1f8367cb5f12` |
| `Games/Slipstream Borough/script.js` | `ead801af82a3c1ee00e0948d19718a095def0fad65e004f81ae671f656c3c4b9` |
| `Games/Slipstream Borough/view.js` | `4cb52b978a6dd69eca0b9b638c29f2f398b5c3c128c16d7037bafe172b1773fd` |
| `assets/portal-ux.js` | `f2ef29bbc7bf081dcb4349abba0136a34d0dd3c34f58edfedbc9527f4de1c2be` |
| `assets/car-arcade/style.css` | `c860363f9d9fb9e572f9e44f6b7a728786c977ff8582c1578e97a98d32ae7ee8` |
| `scripts/test_slipstream_modes.py` | `8b86e8e069d06a22042bbe3d5b6a45276bf145708c6c9d152580e06778125858` |

The harness had a concurrent, unowned working-tree addition: `shot(page, 'garage-390')`. Its pinned working bytes above are not falsely represented as baseline-commit bytes; committed blob was `8595f6b75cbe70a8579c9077fcb64520053b3a21`.

Actual checks: controller/view `node --check` exited successfully without output; harness AST parsed. Catalog check printed `catalog: 116 unique entries, required fields and tracked URLs OK; modes AST OK`. Maintenance check failed as quoted. No browser/server, screenshots, downloads or full-catalog smoke run; **zero runtime gates passed by this review**. No games added or push. Storage stayed at approximately 2.6G free; only this small report is owned.

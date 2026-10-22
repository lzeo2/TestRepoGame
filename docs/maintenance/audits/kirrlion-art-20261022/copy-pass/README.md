# Trivia copy pass

Existing game 235 only; no game additions, release or push.

## Trim

- Intro: “Find a rarer answer.”
- Numeric summary: “25 s” / “7,000 m”, no sub-captions.
- How to play stays closed by default; shortened rules preserve editorial rarity, finite-key/spelling limitations, controls and replay/UTC facts.
- Tier chips: name + pts only; one column on mobile to keep them readable.
- Footer: offline solo + dataset key. Mascot status lines reduced to a few words.
- Round reveal retains answer, points and current depth, with concise timeout/pass/unlisted feedback.
- Final receipt: total depth + best recognized find (highest points, first on ties), plus replay/home. Save success is silent; save failure remains visible.
- Removed the nonfunctional Battle teaser and final per-round history. Before removal, tracked searches established their HTML/CSS/controller and legacy browser-test consumers; those consumers were removed/adapted together, not left dangling.

Core, questions, scoring, clock, selection and storage schema are unchanged. The existing abyss mockup remains the visual contract: this is a copy pass, not new artwork.

## Verification status

- JS syntax and Python AST syntax pass.
- Core regression: **8 checks passed**, 28 prompts / 4 packs / version 2026.10.1.
- Core/questions byte-identical to pre-copy HEAD.
- `git diff --check`: pass.
- First guarded browser attempt **FAILED** before screenshots: `Page.goto: Timeout 8000ms exceeded`, waiting for local page `load`; total **54.828s including cleanup**, zero recorded console errors/external requests. [Retained failed report](first-navigation-timeout.json). Root cause is not proven. Browser/context/server closed and process check was clear; slot released to UI. One retry is requested after UI with an explicit 20s navigation bound (previously inherited the 8s action timeout), still inside the unchanged 90s work alarm; no runtime workaround or error filtering.
- Retry `python3 -B scripts/test_dive_trivia_copy.py`: **exit 0, four groups, 10 screenshots, 32.756s including cleanup**; [machine report](report.json) includes source hashes. Normal/dim desktop seven-answer runs verify highest-point best find and stable first-answer ties; mobile 390 all-pass run verifies zero depth / no best find, one-line intro, closed rules and name+pts tiers. Question text is compared with the untouched dataset. Zero console errors, external requests or captured root/internal overflow. No game-state/time grants.
- Runner retains a 90s work +10s cleanup bound, dedicated fresh profile, explicit `/usr/bin/chromium`, process/disk guards and bounded local server. Browser/context/profile/server closed after the retry; post-run ps was clear. Wings/world/sim notified of release; no further browser runs planned here.
- Legacy `scripts/test_dive_trivia_browser.py` was adapted to the compact receipt and copy, including CSS-uppercase-safe text checks. It was **not rerun**; no full gameplay or full-fleet acceptance claimed.

## Theme clarification

The requested desktop “dark + light” cannot literally be captured without changing the approved full-dark design: the game has normal and dim glow, both abyss-dark. This text-only pass preserves those modes. QA captures must be labeled dark/dim, never mislabeled as a true light theme. Mobile target: 390px. True light-theme QA is not available.

## Fresh screenshots and review

- Desktop normal: [launch](desktop-dark-launch.png), [question](desktop-dark-question.png), [receipt](desktop-dark-receipt.png).
- Desktop dim: [launch](desktop-dim-launch.png), [question](desktop-dim-question.png), [receipt](desktop-dim-receipt.png).
- Mobile 390: [launch](mobile-390-launch.png), [question](mobile-390-question.png), [receipt](mobile-390-receipt.png), [expanded rules](mobile-390-rules.png).

All 10 images were visually reviewed. The question, answer, timer and depth remain prominent; the shorter intro/summary and compact receipt are visible. Mobile gameplay fits its viewport and expanded tiers are readable. Some depth-label/mascot-badge portions appear unpainted in desktop dim launch/question frames; the later dim receipt paints them completely. This resembles earlier capture/paint anomalies, but the sole cause is not proven and those frames are not pristine visual acceptance. Evidence is retained, not retouched. Native select text is clipped to the closed control's width on mobile; the native picker remains the control for the full option.

## Gates

Copy source: `b773972`; timeout/inventory receipt: `2771760`; failed current report retained as `4c50402`, superseded by the passing retry report without deleting the first-failure evidence. JS/Python syntax, core 8/8, catalog 127 unique IDs/schema/Git URLs and maintenance coverage (132 documents / 127 registered +5 unregistered) pass. The adapted full gameplay browser checker and full fleet gate were not run. No external loads, assets or dependencies added. No game additions or push. Shared-host disk and final commits are reported in the handoff. Sparse selection was restored after checks.

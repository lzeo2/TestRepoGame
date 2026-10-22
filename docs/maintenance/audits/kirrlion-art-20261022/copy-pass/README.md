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
- Fresh guarded browser QA pending exclusive slot. Runner: `python3 -B scripts/test_dive_trivia_copy.py`, 90s work +10s cleanup bound, dedicated fresh profile, explicit `/usr/bin/chromium`, process/disk guards, bounded local server. It checks receipt best-find selection and ties, all-pass/zero result, closed rules, tier text, untouched question text and captured root/internal overflow. No game-state/time grants.
- Legacy `scripts/test_dive_trivia_browser.py` was adapted to the compact receipt and copy, including CSS-uppercase-safe text checks. It was **not rerun**; no full gameplay or full-fleet acceptance claimed.

## Theme clarification

The requested desktop “dark + light” cannot literally be captured without changing the approved full-dark design: the game has normal and dim glow, both abyss-dark. This text-only pass preserves those modes. QA captures must be labeled dark/dim, never mislabeled as a true light theme. Mobile target: 390px. True light-theme QA is not available.

## Gates

No external loads, assets or dependencies added. No full fleet gate or push. Shared-host disk and final commits are reported in the handoff. Sparse selection will be restored after checks.

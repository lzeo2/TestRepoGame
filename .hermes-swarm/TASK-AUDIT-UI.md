# TASK: Rendered-UI Slop Review (glm-5.3-flash worker)

You review the RENDERED interface of the portal (not the source code) for
vibe-coded / AI-slop visual patterns. Read .hermes-swarm/SLOP-CHECKLIST.md first.
Another worker audits code separately; you judge what a visitor SEES.

## How to work
You are running on a machine with Playwright + Chromium (xvfb available).
Toolchain: xvfb-run -a /home/leozhang/.local/geo-venv/bin/python3

1. Write a small Python/Playwright script to .hermes-swarm/ui-slop-shots.py that:
   - serves /home/leozhang/TestRepoGame on a local port (http.server, like .hermes-swarm/chromebook_matrix.py does — read that file for the pattern)
   - loads the portal at 1366x900
   - captures screenshots: full dark portal (top), scrolled mid-page, filtered view (click a category pill), light theme, the game detail panel (click .game-card__info on a card), tag-filter row visible
   - saves to .hermes-swarm/ui-shots-2/ as PNG
   - ALSO extracts computed-style evidence into JSON printed to stdout: computed font-family of body/h1/buttons, all distinct background-colors used, count of elements using border-radius > 12px, count of elements with box-shadow containing saturated alpha color, any element with backdrop-filter, letter-spacing values found
2. Run it with xvfb-run. Iterate until screenshots exist.
3. You CANNOT see images. Instead, for each rubric dimension, rely on the
   computed-style JSON evidence + these DOM probes:
   - fonts: document.fonts.check / getComputedStyle
   - gradients: scan getComputedStyle(el).backgroundImage for 'gradient(' across all elements
   - radius uniformity: distribution of computed border-radius values
   - shadows: box-shadow values containing rgba( with alpha and hue
   - animation: count of @keyframes in the page CSS + which classes use them
   - copy: page.textContent scan for the F1 banned phrases (case-insensitive)
4. Score each rubric section A-F (0-2 each: 0 clean, 1 partial, 2 slop-cluster) with the evidence line that justifies the score.
5. Write the report to .hermes-swarm/AUDIT-UI.md: per-section score, evidence
   (quote computed values), verdict (CLEAN / SLOPPY / SLOP), and a prioritized
   list of concrete visual changes (exact selector + exact new value, flat design law: solid colors, no gradients, no blur/glass, no glow shadows, cyan/teal accent, black buttons).

Rules:
- READ-ONLY: modify nothing except your two files (ui-slop-shots.py, AUDIT-UI.md).
- No git commands. No commits.
- Evidence over vibes: every claim needs a computed-style value or DOM count.

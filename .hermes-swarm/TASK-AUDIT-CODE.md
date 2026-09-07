# TASK: Codebase Slop Audit (glm-5.3-flash worker)

You audit the ENTIRE codebase of /home/leozhang/TestRepoGame (UNBLOCKMATH // ARCADE, static site, branch main) against the rubric in .hermes-swarm/SLOP-CHECKLIST.md. READ that file first.

Scope: portal code ONLY — index.html (inline <style> + markup), assets/portal-ux.js, assets/game-save.js, games.json, scripts/smoke_test_games.py. Do NOT audit game content in Games/ beyond a quick grep for gradient/glow patterns in the 3 HTML5 games (HelixJump, CrushTheCastle, GeometryRash) — those are third-party ports, report findings but DO NOT propose modifying them beyond what is already done.

Method:
1. Read SLOP-CHECKLIST.md rubric.
2. Systematically scan every portal file for each checklist item (A1-G6). For every finding record: file, line(s), the offending value, rubric ID, severity (high = visible design default cluster, medium = code smell, low = minor).
3. Pay special attention to:
   - leftover purple/glass values: grep for rgba(255,255,255, and #7c6aef #9086c4 #b8b0cc #c084fc #6d28d9 #7c3aed #8b5cf6 #3b82f6
   - backdrop-filter / blur
   - colored glow box-shadows with saturated alphas
   - cubic-bezier(0.34, 1.56, 0.64, 1) spring curves
   - !important density and duplicate selectors
   - dead CSS selectors (defined but never matched by markup in index.html or injected classes in portal-ux.js)
   - unused/dead JS in portal-ux.js (functions never called)
   - magic hex values not using the :root tokens (--accent, --accent-2, --danger, --gold)
   - emoji in UI code
4. Run these commands to collect evidence (quote output in report):
   grep -n "backdrop-filter" index.html
   grep -cn "rgba(255, 255, 255" index.html
   grep -n "cubic-bezier(0.34" index.html
   grep -oE "#[0-9a-fA-F]{6}" index.html | sort | uniq -c | sort -rn | head -25
   grep -c "!important" index.html
   node --check assets/portal-ux.js

Write your report to .hermes-swarm/AUDIT-CODE.md as a table per rubric section (A-G) with columns: ID | File:line | Finding | Severity | Suggested fix. End with a prioritized removal list (top 10 highest-impact deletions/changes, each with exact file+line).

Rules:
- READ-ONLY audit. Modify NOTHING. Write only .hermes-swarm/AUDIT-CODE.md.
- Do not propose re-adding gradients/glass — the design law is FLAT.
- Be exhaustive on portal files; quote real line numbers from the actual files, not estimates.
- Do not touch git. No commits.

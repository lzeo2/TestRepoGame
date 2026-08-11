# Code Quality & Anti-Vibe-Coding Standards — TestRepoGame

This file is the contract for code quality in this repo. Any agent working here (swarm workers, reviewers, auditors) applies these rules. Violations found during audits are logged as findings and fixed.

## 1. Hard rules (non-negotiable)

1. **No secrets in code** — no tokens, keys, `sk-`, `ghp_`, passwords, or personal emails in any committed file.
2. **Offline-first** — every game and the portal must work with zero network access. No CDN scripts, no external fonts, no runtime `fetch()`/`WebSocket` to third parties. Everything vendored locally.
3. **No absolute local paths** — no `/home/...`, `C:\...` in committed files. Always relative paths.
4. **Evidence before deletion** — never delete a file/dir without grepping the repo to prove it is unreferenced.
5. **Never touch `Games/Character AI/`** — read-only, protected.
6. **`/bare/*` proxy stays disabled** — do not re-enable or repoint it.
7. **No secrets in git history** — if one slips in, rewrite history, don't just delete the file.

## 2. Git / repo hygiene

- Commit at milestones with clear messages (`feat:`, `fix:`, `chore:`, `docs:`).
- Keep commits small and reviewable; no mega-commits mixing unrelated changes.
- `.gitignore` covers: `node_modules/`, `.tmp/`, `*.log`, `.DS_Store`, scratch files.
- No build artifacts, no `node_modules`, no `__pycache__`, no stale duplicate bundles.
- Working tree clean at the end of each milestone (or every dirty file explained).
- No scratch/temp files at repo root (`_cw_*.js`, `_words.txt`, screenshots, downloads).

## 3. Game code standards

- Self-contained: `index.html` + `script.js` + `style.css` (inline JS/CSS acceptable for tiny games).
- Controls documented on the start screen (WASD, mouse, touch, keys).
- Every game has: start screen, play state, clear win/lose state, score display, restart path.
- Mobile + desktop: touch input and keyboard both work; no horizontal overflow on phones.
- `requestAnimationFrame` loops: cleaned up on game over/restart; no runaway loops.
- No `eval()`, no `document.write`, no `innerHTML` with user-provided strings.
- `node --check` passes on every entry script.
- No console errors in normal play (verify with a browser).
- Fixed viewport / canvas resize handled; DPI-aware rendering where it matters.

## 4. Portal standards

- `games.json` is the single source of truth; every entry: `{id, title, cat, icon, desc, url, featured}`, unique ids, urls resolve to real files.
- Game titles/descs rendered safely (textContent, never raw innerHTML).
- Keyboard: arrows navigate the grid, Enter opens, Esc closes modal.
- Touch targets >= 44px; visible focus states; skip-link present.
- Favorites persist in localStorage and never crash on corrupt data.

## 5. Signs of vibe coding (red flags — audit checklist)

Vibe coding = code that *looks* done but nobody verified. Detect and fix these:

**Symptom code**
- Dead code: functions never called, unused variables/imports, unreachable branches.
- Commented-out blocks left in place; "temporary" scaffolding shipped.
- Comments that restate the code (`// increment i by 1`) instead of explaining why.
- Empty `catch {}` blocks that swallow errors silently.
- `console.log` debug spam left in production paths.
- Magic numbers everywhere; duplicated logic where a helper belongs.
- One file doing everything (2,000-line index.html) with no structure.
- Placeholder text/UI ("TODO", "lorem", "game coming soon") shipped as complete.
- Fake success states: buttons that do nothing, score that never updates, restart that doesn't reset.
- Inconsistent style across files (tabs vs spaces, snake_case vs camelCase, random names).

**Symptom behavior**
- Game claims features it doesn't have (docs say multiplayer, code has no networking).
- Copy-paste games: same structure/files duplicated across dirs without adaptation.
- Licensing ignored: bundled assets/art/names from copyrighted games.
- External fetches: CDN scripts, remote images, font URLs — instant fail of the offline policy.
- Absolute paths or machine-specific references in code.
- Assets that are never referenced (huge unused images/audio bloating the repo).

**Symptom UI/UX**
- No responsive design: fixed pixel widths, content cut off, horizontal scroll on phones, mobile viewport meta missing.
- Contrast failures (light gray on white), tiny unreadable fonts, no visible focus states.
- Touch targets smaller than 44px or overlapping; taps hit the wrong thing.
- Keyboard navigation broken: tab traps, no skip-link, focus invisible or lost.
- Missing states: no loading/error/empty states, fake spinners that spin forever.
- Buttons that look clickable but do nothing; hover effects with no action behind them.
- Modal/dialog with no close button and no Esc handling.
- No back/restart affordance inside games; dead-ends in the UI.
- Placeholder UI shipped as final ("lorem", "TODO", "game coming soon").
- Design-token chaos: ad-hoc hex colors everywhere, inline styles instead of a stylesheet, random fonts/sizes per section, purple/gradient vomit.
- Animation without purpose (everything glows/bounces), scroll hijacking, page jumps.
- Text clipped in buttons/cards, no ellipsis or wrapping; overlapping elements at common widths.
- No favicon/title; mixed icon systems (emoji vs SVG) with no consistency.
- Notched-phone safe-area insets ignored; content hidden under browser chrome.
- Confusing IA: categories that mislabel games, search that misses obvious terms, no sorting/filter feedback.

**Symptom process**
- Zero commits during long work (work invisible until the end).
- Verification claimed but not run (reviewers must re-run commands themselves).
- Unbounded delegation: tasks too big for one agent, no progress lines.
- Silent stalls tolerated instead of abandoning + moving on.

## 6. Severity levels

- **CRITICAL** — security hole, secret in repo, external fetch, protected area touched, broken deployment. Must fix before push.
- **HIGH** — game unplayable (no restart, crashes, broken input), games.json broken, offline policy violation.
- **MEDIUM** — dead code, console errors, missing controls docs, minor a11y fails, unregistered game.
- **LOW** — style inconsistencies, placeholder text, harmless leftovers.

## 7. Verification commands (run these, quote the output)

```bash
python3 -c "import json; d=json.load(open('games.json')); print(len(d))"   # catalog parses
# every url exists:
python3 - <<'PY'
import json, os
for g in json.load(open('games.json')):
    assert os.path.isfile(g['url']), g['url']
print('all urls OK')
PY
grep -rEl "https?://" Games --include=*.html --include=*.js | head -20          # external fetch scan (expect: only localhost-free, none)
grep -rEl "/home/|C:\\\\" Games docs *.html *.js *.json *.toml 2>/dev/null      # absolute paths
node --check Games/*/script.js 2>/dev/null | head                                # syntax
du -sh Games/* | sort -h | tail -10                                             # bloat audit
git status --short                                                               # hygiene
```

## 8. Rule of thumb

If a human reviewer can't tell what a function does without reading it twice, or a file has no owner and no purpose, it's vibe code. Fix it or cut it. Ship fewer, verified things — not more, unverified ones.

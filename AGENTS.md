# AGENTS.md - TestRepoGame

Read `docs/CODE_QUALITY.md` first. Read `docs/proxy.md` before proxy work.
These rules apply to every orchestrator and worker. Operator scope is not a
license to skip attribution, security, review, or runtime verification.
Start maintenance work at `docs/maintenance/README.md`: find the exact game's
manual or site-feature guide, read its known blockers and inspected-source limits,
and verify current source against `docs/maintenance/inventory.json`. Historical
PASS reports are not current acceptance. Update the relevant manual with each
source change and run `python3 -B scripts/check_maintenance_docs.py`.

## The deployed site

UNBLOCKMATH // ARCADE is a static browser-games portal. Netlify publishes the
repository root (`publish = "."`). No build step is needed.

- `games.json` is the runtime catalog, not generated documentation.
- Games are self-contained static ports under `Games/<Name>/`.
- Portal files: `index.html`, `assets/portal-polish.css`, `assets/portal-ux.js`.
- Bundled `assets/index-*.js` has no source here. Do not hand-edit it.
  Use authored CSS, HTML, and the existing UX layer for bounded changes.
- `uv/` is the disabled-backend proxy launcher; `netlify/` holds functions.
- Do not install build tooling or leave `node_modules` in this repository.

## Sparse checkout is real

`Games/` is normally sparse-excluded. Missing local files do not mean missing
GitHub or deployed content. The full game tree lives in Git and origin;
Google Drive's `TestRepoGame-Games/` is a backup, not the source of truth.

- Inspect one file: `git show origin/main:Games/<Name>/index.html`.
- Compare against `HEAD` before patching; origin may lag local commits.
- If assets are required, use a temporary narrow checkout, never all Games
  by default. Restore the original sparse selection after verification.
- Use `git ls-files` / `git ls-tree` to establish existence and size.
  Reference audits must include sparse-excluded content (`git grep --cached`).
- Stage explicit paths with `git add --sparse` when required. Never `git add -A`.

## Protected boundaries

1. `Games/Character AI/` is READ-ONLY. Never edit, move, delete, or restructure it.
2. Eaglercraft must remain fully offline if present. Preserve its GPL-3.0
   component note and Minecraft Java ownership requirement. Do not restore
   a removed game without operator approval.
3. `/bare/*` stays disabled. No proxy repointing or weaker Netlify security
   without security sign-off.
4. No secrets, personal emails, or machine-specific absolute paths in code,
   reports, or Git history. Use relative paths in committed evidence.
5. No new runtime third-party scripts, fonts, fetches, sockets, or assets.
   Vendor legitimate dependencies locally; do not disguise a remote iframe
   as an offline port. Existing violations are findings, not precedents.
6. Evidence before deletion: grep tracked content, trace constructed paths,
   and record consumers or their absence. Audit mentions alone do not prove
   an asset is unused. Do not delete evidence merely for unfashionable prose.
7. Check `df -h / | tail -1` before operations that consume disk. Below 2 GB
   free: stop growing the workspace, commit safe work, and report the blocker.
   No history rewrites, broad checkout, or garbage collection to evade this.

## Games: port first, never fabricate provenance

Default scope is existing games only. New games require an explicit operator
order. The historical review authorized at most two new ports, starting at id
222 if free. That authorization was run-specific, not standing permission;
222, 223 and 224 are now occupied. A month outlook is not permission to assign
an ID, invent a game, or publish automatically.

### Current maintenance and Foldwild development

The owner authorized detailed implementation of the existing original Foldwild
and subsequent continued development; see `docs/foldwild-implementation.md` and
`docs/foldwild-m2-contract.md`. This is an explicit exception for that existing,
unregistered project, not standing permission for other self-made games. Keep
its supplied originals, provenance qualifications and unverified hardware gate.
M2 native input acceptance remains held until a fresh stable regression passes.
The comprehensive audit/manual/refurbishment order covers existing code and a
source-first month plan. Registration, publication and push remain separate gates.

### Dated one-run exception: Circuit Ward (2026-10-01)

Direct operator approval in ticket `pi-912882-1790827041648` authorizes ONE
self-made game, Circuit Ward, id 222, for this run only. It covers the four
rendered concept frames, six-model wishlist, solo waves and 2–4-player co-op
with manual offer/answer WebRTC pairing. No STUN/TURN, accounts, room codes,
signaling service, proxy reactivation or backend changes. Build primitives
first; generated GLB art can replace them later with provenance evidence.
All 3D planning/implementation workers must use `openai-codex/gpt-6.1-sol`;
each task is bounded to 20 minutes maximum. Vendor dependencies/licenses,
preserve offline solo, and retain the full-game smoke/release/no-push gates.
This exception expires when this Circuit Ward implementation run ends; it
creates no standing permission for any other self-made game or new id.

- Prefer known, legitimately reusable open-source web games. Verify the
  license, upstream revision, author, and assets before ingesting.
- Except for the explicit Circuit Ward and existing Foldwild authorizations
  above, no from-scratch AI games. Never invent attribution or placeholder
  replacements. Stop if an ingested source cannot be verified. A mirror URL is not itself evidence of redistribution rights.
- Each addition needs `docs/` source evidence: upstream URL, pinned revision,
  license/asset terms, local modifications, and runnable verification.
  Include correct human-readable author/source attribution in catalog desc.
- Keep upstream notices and licenses with the vendored files. No permission
  claim without evidence. No copyrighted ROM additions under a web-port order.
- Catalog schema: `{id, title, cat, icon, desc, url, featured}`. IDs are unique
  integers, URLs resolve to tracked files; optional tags/controls stay factual.
- Check the actual current catalog for free IDs; memory is not an allocator.
- Preserve working upstream gameplay. Patch wrappers and defects, not entire
  engines. Do not add decorative launch screens over functional game menus.
- New ports need clear controls, keyboard and touch input, a start/play path,
  score or progress, completion/failure as appropriate, and restart/reset.
  Do not invent incompatible win/lose states for open-ended upstream games.

## House UI and deslop

Flat solid colors, black action buttons, local Bungee/Atkinson with readable
system fallbacks. No gradients,
no teal-on-green, no em-dashes in game-facing or portal copy.

- Remove empty claims, AI-isms, redundant cards, duplicate filters, and
  theatrical animation. Keep useful feedback, errors, and loading states.
- Small diffs beat redesign layers. Reuse existing helpers and native features.
- Visible focus, meaningful labels, 44px touch controls, readable contrast,
  reduced motion, and mobile layouts are non-negotiable.
- Review real desktop/mobile screenshots in both themes. A passing parser
  does not establish a polished game or portal. Do not recolor upstream art
  wholesale to force house style; apply it to our shell and copy.

## Swarm discipline

The orchestrator owns scope, subjective review, UI judgment, deslop decisions,
and the written word of this file. Delegate mechanical implementation and
collection only; never silently absorb worker tasks.

- Use the operator-selected provider/model/thinking on every worker call.
  Current 3D order: `openai-codex/gpt-6.1-sol` (including workers); prior
  non-3D review order was `openai-codex`, `gpt-5.6-luna`, thinking `xhigh`.
- Assign disjoint paths and one bounded task per worker. At most three port
  workers, at most two additions total. No port work before P1-P4 land.
- Workers commit their own changes using explicit paths, never push.
  Verify their commits with `git log` and review the actual diff.
- Emit delegation number/scope on start and log path/digest on completion.
- Cap tasks at 10 minutes where practical; priority port review at 20 minutes.
  Never silently wait beyond 20 minutes. After two failures, abandon and report.
- No persistent dev servers. Bounded browser-test servers must terminate.
- Ask the operator when tooling, source legitimacy, or policy blocks progress.
  Never replace a failed port with a self-made game to satisfy a count.

## Verification and shipping

Commit small milestones with `feat:`, `fix:`, `chore:`, or `docs:` prefixes.
Quote actual command output; never infer or fabricate success.

1. Parse the catalog, validate unique IDs/schema, and check URLs against Git
   when sparse. Check touched scripts with `node --check` and diffs with
   `git diff --check`. Audit added external loads and disk usage.
2. Leave one small runnable regression check for non-trivial authored logic.
   No new test framework or speculative scaffolding.
3. MANDATORY before any push: `xvfb-run python3 scripts/smoke_test_games.py`.
   It must exercise every registered game in a real browser. A targeted run,
   static checks, or prior-run report cannot substitute for the full gate.
   `SMOKE_PORT` can isolate parallel runs. Never weaken failure filtering to
   get a green result. Report known exclusions separately from clean loading.
4. Fix failures or explicitly report them before any release decision. A
   blocked gate means no push. User/operator decides any exception.
5. Finish with clean `git status` or explain every dirty path. Report each
   phase, game count, commit list, storage delta, gate pass count, and screenshots.
   State whether games were added and whether they were ingested or self-made;
   list each new game's build/register commit(s). No unrequested push.

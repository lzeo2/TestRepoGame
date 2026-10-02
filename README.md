# UNBLOCKMATH // ARCADE

A static browser-games portal. Netlify publishes the repository root (`publish = "."`); no build step is required. The compiled React portal and the authored UX layer read `games.json` at runtime.

## Start here

Read [AGENTS.md](AGENTS.md), [code quality](docs/CODE_QUALITY.md) and the [maintenance contract](docs/maintenance/SCOPE.md) before editing. The [maintenance manual](docs/maintenance/README.md) is the entry point for individual game pages, site features, audit findings and the refurbishment plan.

At audited source `8c8a055`, there are **115 registered games, 120 game directories and one shared runtime directory** (`Games/_emulatorjs`). These are Git-tree counts, not assertions that all Games files exist in the sparse workspace. The five unregistered games are 2048, Foldwild, Hextris, QWOP and Slope. Do not register them merely to reconcile historical counts.

- [Architecture](docs/ARCHITECTURE.md): entry files, ownership and data flow.
- [Portal](docs/maintenance/site/portal.md): search, categories, tags, launch and detail panels.
- [Accessibility and style](docs/maintenance/site/accessibility-and-style.md): selectors, cascade and local fonts.
- [Browser state](docs/maintenance/site/browser-state.md): favorites, recent history, theme and sort keys.
- [Testing](docs/maintenance/site/testing.md): static checks, browser coverage and release holds.
- [Portal audit](docs/maintenance/audits/portal.md): source findings and minimal patch points.
- [Deployment](docs/DEPLOYMENT.md) and [disabled proxy](docs/proxy.md): operational context, not permission to enable a relay.
- [Historical catalog](docs/GAMES.md), [wiki](docs/wiki/) and `docs/audit_batches/`: dated evidence. Their 120-entry claims and some controls/provenance statements are not the current inventory or new verification.

## Maintain an existing game first

Default scope is existing games. Additions require explicit operator approval, verified upstream revision and separate code/asset redistribution terms. Preserve notices and actual gameplay; a mirror URL or a README saying "original code" does not establish rights. Existing ingests, operator-authorized original work and legacy content coexist here. Unknown legacy rights remain unknown pending source review. There is no blanket repository-wide game license claim.

`Games/Character AI/` is read-only. Its catalog title is Character Alsen; the existing documentation describes a scripted local chatbot, not a hosted LLM. This portal documentation pass did not inspect or modify the protected implementation. Preserve Eaglercraft's component licensing/ownership requirements if present; do not restore a removed game. `/bare/*` stays disabled without security sign-off.

Game maintenance needs source-backed controls, a working start/play path, meaningful progress, appropriate outcome and restart/reset. Preserve open-ended upstream mechanics rather than inventing a win screen. Keep keyboard/touch access and actual desktop/mobile checks. Foldwild is an unregistered held prototype; its presence is not a claim of completed trainer-party/save or native gameplay verification.

## Catalog contract

Seven fields are required; optional fields are allowed, not discarded:

| Field | Type and consumer |
| --- | --- |
| `id` | Unique integer; bundle favorites use this identity. Operator allocates after checking live entries and reservations, not an automatic max-plus-one rule. |
| `title` | String; rendered title and UX lookup key. Keep titles unique. |
| `cat` | String; category chip/filter identity. Current values include simulation, story, arcade, card, idle and word as well as the original six categories. |
| `icon` | String; legacy glyphs and mnemonics coexist. The current authored shelf uses local art or safe title initials; no new emoji is required. |
| `desc` | String; detail text and bundle search input. Keep attribution and mechanics factual. |
| `url` | Repository-relative tracked entry beneath `Games/`; the current URL guard rejects remote paths and traversal. |
| `featured` | Boolean; bundle partitions featured/standard cards, although authored CSS presents a continuous shelf. |
| `tags` | Optional array; UX normalizes `2-player` to `2p`, `co-op` to `coop`. Supported chips are `2p`, `coop`, `hacked`. |
| `players`, `howto` | Optional detail metadata. Neither field proves engine capabilities or working input. |

At the audited source, 86 entries have tags and six each have players/howto. Unknown controls belong in maintenance findings, not guessed catalog copy.

## Sparse-safe validation

Do not broadly check out Games, install dependencies or edit `assets/index-CRWHmtoy.js`. Use Git to verify catalog paths:

```bash
python3 - <<'PY'
import json, subprocess
catalog = json.load(open('games.json'))
tracked = set(subprocess.check_output(
    ['git', 'ls-tree', '-rz', '--name-only', 'HEAD']).decode().split('\0'))
required = {'id', 'title', 'cat', 'icon', 'desc', 'url', 'featured'}
assert len({g['id'] for g in catalog}) == len(catalog)
for game in catalog:
    assert required <= game.keys()
    assert type(game['id']) is int and type(game['featured']) is bool
    assert all(isinstance(game[k], str) for k in
               ('title', 'cat', 'icon', 'desc', 'url'))
    assert game['url'] in tracked, game['url']
print(f'{len(catalog)} catalog entries; schema/IDs/tracked URLs OK')
PY
node --check < assets/portal-ux.js
git diff --check
```

A local HTTP server is necessary for JSON/module loading; opening `index.html` as `file:` is not the supported launch path. Local dependency closure is the offline policy, not a cold-offline guarantee: the root portal registers no cache service worker or PWA manifest. Bungee and Atkinson Hyperlegible are local OFL fonts, not remote font loads. See [font evidence](docs/portal-font-sources.md).

Before any release/push, Main must run the unchanged **full** browser gate, `xvfb-run python3 scripts/smoke_test_games.py`, or the operator-approved serial sparse wrapper executing that same all-games gate. A targeted portal pass is not a substitute. Commit explicit owned paths, never `git add -A`; no unrequested push. The current maintenance run adds documentation, not games or publication permission.

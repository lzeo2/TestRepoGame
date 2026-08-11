# UNBLOCKMATH // ARCADE — Wiki Home

A browser-games portal. Everything runs from a static site: the repo root is the deployed site (Netlify, `publish = "."`), and the game grid is driven by `games.json` at runtime — no rebuild needed to add a game.

## What's here

- **46 registered games** in `Games/`, each a self-contained folder with an `index.html` entry point. See the [Game List](Game-List.md).
- **The portal** — a compiled React app in `assets/` that fetches `games.json` and renders search, categories, and a featured row.
- **A proxy launcher** (`uv/`) for the Ultraviolet framework — **backend disabled by default** (see [Deploying](Deploying.md) and [Security](Security.md)).
- **Docs** — architecture (`docs/ARCHITECTURE.md`), full game catalog (`docs/GAMES.md`), deployment (`docs/DEPLOYMENT.md`), proxy design (`docs/proxy.md`), code-quality contract (`docs/CODE_QUALITY.md`).

## Golden rules (short version)

1. **Offline-first** — every game and the portal work with zero network access; everything vendored locally.
2. **`Games/Character AI/` is read-only** — never move, edit, or restructure it.
3. **No secrets** in code or git history; relative paths only.
4. **Evidence before deletion** — grep before removing any file.
5. **`/bare/*` proxy stays disabled** — do not re-enable without security sign-off.
6. **Eaglercraft stays fully offline** — its wrapper fetches nothing external; it carries a licensing note (GPL-3.0 components, requires owning Minecraft Java).

## Quick links

- [Game List](Game-List.md) — all 46 games with category, controls, and honest offline/remote status.
- [Adding a Game](Adding-a-Game.md) — folder + `games.json` entry + validation + commit.
- [Deploying](Deploying.md) — Netlify publish `.`, the disabled `/bare` proxy, UV launcher posture.
- [Security](Security.md) — headers, no-secrets, proxy relay risks, offline-policy audit.

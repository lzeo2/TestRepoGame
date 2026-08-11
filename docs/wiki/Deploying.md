# Deploying

## Where it runs

**Netlify**, with the **repo root as the publish directory** — `netlify.toml` sets `publish = "."`. There is no build step: no build tooling, no `node_modules`. The portal bundle in `assets/` is already compiled; the game grid is data-driven from `games.json`.

## Deploy steps

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Netlify → **Add new site** → *Import an existing project* → pick the repo.
3. Build settings (leave defaults):
   - **Build command:** *(empty)*
   - **Publish directory:** `.`
4. *(Optional)* Environment variable `PUBLIC_BARE_URL` — informational only (see below).
5. Deploy.

Verify after deploy:

- `https://<site>.netlify.app/` — arcade loads, **Proxy** launcher button bottom-right.
- `https://<site>.netlify.app/uv/` — UV launcher page loads and states the backend is disabled.
- `https://<site>.netlify.app/bare/v3/` — **404** (backend disabled).
- `https://<site>.netlify.app/.netlify/functions/bare` — JSON with `"proxyEnabled": false` and `"localBare": false`.

## The proxy / UV posture

- The Ultraviolet launcher lives at `uv/`. Its **backend is disabled by default**: `/bare/*` returns 404, and no traffic is forwarded anywhere.
- The old unauthenticated `/bare/*` redirect to a public community Bare server (`https://tomp.app/bare/`) was **removed** — it was an open-relay risk. `netlify.toml` now carries only a commented-out template.
- An operator may enable the proxy **only** by pointing that template at a **Bare server they operate** (e.g. `bare-server-node` on a persistent host — see `docs/proxy.md` §6.1). Never point it at a public third-party relay.
- The UV distribution files (`uv.bundle.js`, `uv.client.js`, `uv.handler.js`, `uv.sw.js`) are not vendored; the launcher reports the missing dependency honestly and does not register an inert worker.
- `PUBLIC_BARE_URL` is **informational only** — it does not enable anything, and `netlify.toml` redirect targets cannot read env vars.

## Why not GitHub Pages

GitHub Pages can serve the arcade fine, but cannot host the UV proxy: it cannot send the `Service-Worker-Allowed: /` header (required for the root-scope UV worker) and cannot run any Bare server. Details: `docs/proxy.md` §2.

## Headers applied (from `netlify.toml`)

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: frame-ancestors 'self'` (clickjacking only)
- `Service-Worker-Allowed: /` + no-cache for `/uv/sw.js`

## Full references

- `docs/DEPLOYMENT.md` — deployment details in the repo.
- `docs/proxy.md` — complete proxy design, caveats, and operator enable steps.
- `docs/wiki/Security.md` — security posture summary.

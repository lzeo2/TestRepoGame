# Deployment — UNBLOCKMATH // ARCADE

This document covers the Netlify deployment posture, the disabled `/bare` proxy backend, and the Ultraviolet (UV) launcher state. For the full proxy design, caveats, and the operator steps to (optionally) enable a controlled Bare endpoint, read **[`docs/proxy.md`](proxy.md)** — it is the authoritative proxy document.

## Quick facts

| Item | Value |
| --- | --- |
| Host | Netlify |
| Build command | *(empty)* — no build tooling, no `node_modules` |
| Publish directory | `.` (the repo root **is** the deployed static site) |
| Functions | `netlify/functions` (only `bare.js`, an informational status endpoint) |
| Domain/route config | `netlify.toml` (headers, redirects, commented `/bare/*` template) |

## Netlify configuration (`netlify.toml`)

- `publish = "."` — repo root served directly; `games.json` and `Games/` are part of the site.
- **Security headers** applied site-wide:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy: frame-ancestors 'self'` (clickjacking protection only — deliberately does **not** set `default-src`/`style-src`, so documented inline `<style>` blocks keep working)
- **UV service worker header:** `/uv/sw.js` gets `Service-Worker-Allowed: /` (root scope) + `Cache-Control: public, max-age=0, must-revalidate`.
- **Redirects:** `/uv` → `/uv/` (directory index). The `/bare/*` proxy redirect is **disabled by default** (see below).

## The `/bare/*` proxy — DISABLED BY DEFAULT

The previous revision proxied `/bare/*` to a community-hosted public Bare server (`https://tomp.app/bare/`). That **unauthenticated open relay was removed** — anyone who knew the path could route arbitrary traffic through a third-party server this site does not control.

Current posture:

- Requests to `/bare/*` return **404**.
- The UV launcher (`uv/index.html`) states the backend is disabled.
- `netlify/functions/bare.js` (`/.netlify/functions/bare`) reports honestly: `proxyEnabled: false`, `localBare: false`, and treats `PUBLIC_BARE_URL` as **informational only** (it does not enable or configure anything — `netlify.toml` redirect targets cannot read env vars).
- `netlify.toml` carries a **commented-out template** an operator may enable *only* by pointing `to` at a **Bare server they operate** (e.g. `bare-server-node` on a persistent host — see `docs/proxy.md` §6.1). **Do not** point it at a public third-party relay.

### Why no local Bare server

- `bare-server-node` is not vendored in this repo (no `node_modules`; packages must not be installed here).
- Netlify Functions are stateless serverless invocations — they cannot hold a long-lived Bare server that handles WebSocket upgrades.

### Why not GitHub Pages

GitHub Pages cannot send the `Service-Worker-Allowed: /` header (breaking the root-scope UV worker) and cannot run any Bare runtime. The arcade itself deploys fine anywhere; the UV proxy is Netlify-only by necessity. See `docs/proxy.md` §2.

## Ultraviolet (UV) launcher state

- `uv/` contains the static launcher: `index.html`, `index.js`, `sw.js`, `uv.config.js`.
- The UV distribution files (`uv.bundle.js`, `uv.client.js`, `uv.handler.js`, `uv.sw.js`) are **not vendored**. The launcher detects the missing dependency, does **not** register an inert root-scope worker, and reports the gap honestly.
- Nothing here claims the proxy works. Vendoring the distribution (see `docs/proxy.md` §5 step 6) is still **not** enough — the backend stays disabled until an operator enables a controlled Bare endpoint in `netlify.toml`.

## Deploy steps (Netlify)

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Netlify → **Add new site** → *Import an existing project* → pick the repo.
3. Build settings (leave defaults):
   - **Build command:** *(empty)*
   - **Publish directory:** `.`
4. *(Optional)* Environment variable `PUBLIC_BARE_URL` — informational only; documents the controlled Bare endpoint an operator intends to configure. It does **not** enable the proxy.
5. Deploy, then verify:
   - `https://<site>.netlify.app/` — arcade loads; **Proxy** launcher button bottom-right.
   - `https://<site>.netlify.app/uv/` — launcher page loads and states the backend is disabled.
   - `https://<site>.netlify.app/bare/v3/` — **404** (backend disabled).
   - `https://<site>.netlify.app/.netlify/functions/bare` — JSON: `"proxyEnabled": false`, `"localBare": false`.
6. **Vendor the Ultraviolet distribution** (optional, operator decision) per `docs/proxy.md` §5 step 6 — after which the launcher can report the dependency as present, but the **backend stays disabled** until §6.1 is done.

## Related documents

- `docs/proxy.md` — full UV design, Bare-server requirements, relay risks, operator enable steps, verification.
- `docs/ARCHITECTURE.md` — repo layout and data flow.
- `docs/wiki/Deploying.md` — wiki-ready deployment page.

# UV Proxy — design, deploy steps, and caveats

This document explains why the proxy works the way it does, how to deploy it,
and what its limits are. Short version: **this site is static.** Static hosts
can serve the Ultraviolet client and the service worker, but they cannot run a
Bare server. **The proxy backend is disabled by default** — an operator must
explicitly configure a *controlled* Bare endpoint before any `/bare/*` traffic
is forwarded anywhere.

---

## 1. What was added

| Path | Purpose |
| --- | --- |
| `index.html` (repo root) | Floating **Proxy** launcher button that links to `./uv/`. Lightweight, accessible (`<nav>` + `<a>` with `aria-label`, visible `:focus-visible` outline, `prefers-reduced-motion` respected), and themed with the app's own CSS variables (`--accent`, `--border`, …) via a small inline `<style>` block — the minified build output in `./assets/` is never edited. |
| `uv/` (repo root) | Static Ultraviolet launcher, served as `/uv/` (this folder is inside the publish directory). |
| `uv/index.html` | Minimal launcher page: address bar + Launch button, same design tokens as the arcade app, back link to the arcade. States clearly that the backend is disabled by default. |
| `uv/index.js` | Launcher entry point: validates input (http/https only, no control characters), registers the service worker at root scope **only when** the UV distribution is present, checks the (absent) UV dependency, navigates to `<prefix><encoded-url>`. |
| `uv/uv.config.js` | UV configuration: `bare: '/bare/'`, `prefix: '/service/'`, paths for handler/client/bundle/sw. Guarded against a missing `UltravioletCodec` global. |
| `uv/sw.js` | Service-worker launcher. Uses a **relative** import of `./uv.sw.js`; if the UV distribution is absent the import throws, the worker logs an error and **unregisters itself** so no inert root-scope worker lingers. |
| `react-app/public/uv/` | Identical mirror of the launcher inside the React app's `public/` folder, so a future `npm run build` ships the same `/uv/` files. |
| `react-app/index.html` | Same launcher button + style as the root `index.html`, so the source of truth stays in sync with the deployed build. |
| `netlify.toml` | Publish dir `.`; security headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Content-Security-Policy: frame-ancestors 'self'`); `Service-Worker-Allowed: /` header for `/uv/sw.js`. The `/bare/*` public relay redirect was **removed** — the proxy backend is disabled by default, with a commented-out template an operator can enable. |
| `netlify/functions/bare.js` | Status endpoint (`/.netlify/functions/bare`) that honestly reports **proxyEnabled: false**, **localBare: false**, and treats `PUBLIC_BARE_URL` as **informational only**. |
| `docs/proxy.md` | This file. |

Notes on scope:

- The arcade app already has search and categories (`.search-bar`,
  `.category-filter` in the build output), so nothing was duplicated — the
  launcher is only a floating button.
- There is **no `manifest.json`** anywhere in the repo (PWA manifest was never
  added), so there is nothing to share/sync; the React source and the deployed
  root already share the same look because the root **is** the built React app.
- Existing unrelated working-tree changes (e.g. the games under
  `react-app/public/Games/`, `Games/`) were left untouched.

---

## 2. GitHub Pages: static-only limitation

GitHub Pages serves **only static files**. Consequences:

1. **No Bare server.** The Bare protocol needs a runtime that can answer
   WebSocket `upgrade` requests. GitHub Pages cannot run `bare-server-node`.
2. **No custom response headers.** The Ultraviolet service worker lives at
   `/uv/sw.js` and must be allowed a **root scope** so it can intercept the
   proxy prefix (`/service/…`) and `/bare/…`. Allowing that scope requires the
   `Service-Worker-Allowed: /` header (or the SW script at the site root).
   GitHub Pages cannot send custom headers, so `navigator.serviceWorker.register('/uv/sw.js', { scope: '/' })`
   is rejected by the browser.

   The only way to get a working root-scope worker on GitHub Pages is to also
   place the worker at the site root (`/sw.js`), which still leaves problem
   No. 1 (no Bare server anywhere). **Conclusion: GitHub Pages cannot host a
   working UV proxy as of this writing.**

---

## 3. Bare server requirement and the disabled-by-default backend

UV is only a *client* + service worker. The actual request forwarding is done
by a **Bare server** implementing the Bare protocol (v3). `uv.config.js`
points the client at `bare: '/bare/'`, i.e. the same origin at path `/bare/`.

Since no runtime is available on static hosting, `/bare/` must be **proxied to
or replaced by an external Bare server**. The repo does not do this for you:

- **Disabled by default (the safe fallback).** The previous `netlify.toml`
  redirect (`/bare/*` → `https://tomp.app/bare/:splat`, status `200` + `force`)
  has been removed. It was an **unauthenticated public relay** — anyone who
  knew the path could route arbitrary traffic through a third-party server
  this site does not control. Today, requests to `/bare/*` return **404**
  until an operator opts in. The launcher page and the status function both
  say the backend is disabled; nothing here claims the proxy works.
- **Enable it (operator action).** Uncomment the template in `netlify.toml`
  and point `to` at a Bare server **you operate** (e.g. `bare-server-node` on
  a persistent host, §6.1). Then `/bare/*` is forwarded to that controlled
  endpoint and the UV client can work.
- **Direct external (not recommended).** Change `uv.config.js` to
  `bare: 'https://<host>/bare/'` and skip the redirect entirely. Only do this
  with a server you control; cross-origin use requires the server to send
  permissive CORS headers.

### Third-party relay risks (why the public relay was removed)

Public, community-hosted Bare servers are **untrusted**:

- They can **log, modify, or inject** into every request routed through them
  (including any credentials or content the user loads through the proxy).
- They can disappear, rate-limit, or change behavior at any time, silently
  breaking the proxy.
- Pointing `/bare/*` at one makes **your origin an open proxy for that
  server** — anyone can use your site as a gateway to it.

Do not ship a public relay as the default, and if you ever point at any Bare
server, make sure it is one you operate. This is exactly why the old
`https://tomp.app/bare/` default was removed.

`bare-server-node` (the official server package) is **not installed** in this
repo (no `node_modules`, and packages must not be installed here), so local
Bare support is **not claimed anywhere**. See §6.1 for how to add a real server.

---

## 4. Why Netlify

Netlify is used instead of GitHub Pages for the proxy because it can do things
static-only hosts can't:

1. **Custom headers** — `Service-Worker-Allowed: /` makes the `/uv/sw.js`
   worker usable at root scope (the hard requirement for UV), and security
   headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy`,
   `Content-Security-Policy: frame-ancestors 'self'`) are applied site-wide.
   The CSP only sets `frame-ancestors`, so the documented inline `<style>`
   blocks are not affected.
2. **Redirects** — directory-index handling and (operator-enabled) Bare
   proxying. The `/bare/*` proxy is **not** enabled by default; it exists
   only as a commented template so no open relay is ever shipped.
3. **Optional functions** — `netlify/functions/bare.js` gives a first-class
   URL (`/.netlify/functions/bare`) that reports the proxy status honestly
   (`proxyEnabled: false` by default).

If the proxy is not needed, the rest of the site still deploys fine anywhere
(GitHub Pages included) — only the launcher button would lead to a page that
reports the missing dependency / disabled backend.

---

## 5. Deploy steps (Netlify)

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Netlify → **Add new site** → *Import an existing project* → pick the repo.
3. Build settings (leave the defaults; this repo has **no build command**):
   - **Build command:** *(empty)*
   - **Publish directory:** `.`
   - (If the file picker shows, choose the repo root.)
4. *Optional* environment variable: `PUBLIC_BARE_URL` — **informational only**.
   It is reported by `/.netlify/functions/bare` so an operator can document
   which Bare endpoint they intend to configure; it does **not** enable the
   proxy, and Netlify redirect targets in `netlify.toml` cannot read it.
5. Deploy. Then verify:
   - `https://<site>.netlify.app/` — arcade loads, **Proxy** button bottom-right.
   - `https://<site>.netlify.app/uv/` — launcher page loads and states the
     backend is disabled by default.
   - `https://<site>.netlify.app/bare/v3/` — **404** (backend disabled).
     After an operator enables the redirect (§3 / §6.1), this should return a
     Bare v3 response.
   - `https://<site>.netlify.app/.netlify/functions/bare` — JSON with
     `"proxyEnabled": false` and `"localBare": false`.
6. **Vendor the Ultraviolet distribution** (until this is done the launcher
   reports the missing dependency, no root-scope worker is registered, and
   the proxy is inert):
   ```
   npm i @titaniumnetwork-dev/ultraviolet
   cp node_modules/@titaniumnetwork-dev/ultraviolet/dist/uv.{bundle,client,handler,sw}.js uv/
   cp node_modules/@titaniumnetwork-dev/ultraviolet/dist/uv.{bundle,client,handler,sw}.js react-app/public/uv/
   ```
   Then redeploy (the copies live in the publish directory). Even after this,
   the **backend stays disabled** until a controlled Bare endpoint is enabled
   in `netlify.toml` (§6.1).

---

## 6. Chosen path + caveats

**Chosen path:** static UV launcher whose backend is **disabled by default**.
The unauthenticated `/bare/*` redirect to a community public Bare server was
removed for security; `netlify.toml` carries a commented-out template instead,
plus site-wide security headers. The status function reports
`proxyEnabled: false` until an operator opts in.

Caveats, in order of severity:

1. **No backend by default.** Requests to `/bare/*` return 404. The launcher
   and the status function both say so. An operator must enable a
   **controlled** Bare endpoint (§6.1) before the proxy does anything.
2. **Third-party relays are risky.** Public Bare servers are untrusted and can
   log/modify/inject traffic; they also turn your origin into an open relay
   for them. The old default (`https://tomp.app/bare/`) is exactly why the
   public relay was removed. Always point at a server you operate.
3. **UV distribution files are absent.** `uv.bundle.js`, `uv.client.js`,
   `uv.handler.js` and `uv.sw.js` are not vendored (the npm package is not
   installed in this repo, by constraint). The launcher is wired and honest:
   it detects the missing files, does not register an inert root-scope worker,
   and reports them. Nothing here claims the proxy works before those files
   are added (§5 step 6).
4. **Netlify redirect proxying is best-effort.** Even after enabling, the Bare
   protocol is heavily WebSocket-based; Netlify tunnels WS through proxy
   redirects, but complex sessions can be flaky. The *supported* fix is §6.1
   below.
5. **Service-worker scope on static hosts.** Root scope needs
   `Service-Worker-Allowed: /` (shipped in `netlify.toml`). On GitHub Pages
   this header cannot be sent, so the worker stays confined to `/uv/` and the
   proxy cannot intercept `/service/…` — the GitHub Pages limitation of §2.

### 6.1 Upgrading to a real local Bare server (recommended for production)

Run `bare-server-node` on a persistent host (Render, Railway, Fly.io, a VPS):

```js
// server.js (persistent Node host)
import { createBareServer } from 'bare-server-node';
import http from 'node:http';

const bare = createBareServer('/bare/');
const server = http.createServer((req, res) => bare.routeRequest(req, res));
server.on('upgrade', (req, socket, head) => bare.routeUpgrade(req, socket, head));
server.listen(8080);
```

Then either point `uv.config.js` at it directly
(`bare: 'https://<host>/bare/'`) or keep `/bare/` on your origin and enable
the `netlify.toml` redirect template to `https://<host>/bare/:splat`. Either
way, update §5's verification steps accordingly.

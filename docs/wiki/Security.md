# Security

## Headers

`netlify.toml` applies site-wide:

- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage.
- `Content-Security-Policy: frame-ancestors 'self'` — clickjacking protection. The CSP deliberately sets only `frame-ancestors` (not `default-src`/`style-src`) so the documented inline `<style>` blocks in `index.html` and `uv/index.html` keep working.

## No secrets, ever

- No tokens, keys, `sk-`, `ghp_`, passwords, or personal emails in any committed file.
- No absolute local paths (`/home/...`, `C:\...`) — relative paths only.
- If a secret ever lands in git history, **rewrite history** — deleting the file is not enough. (Rule from `docs/CODE_QUALITY.md`.)

## The `/bare/*` proxy is disabled

- The previous `/bare/*` redirect to a **public community Bare server** (`https://tomp.app/bare/`) was an **unauthenticated open relay**: anyone who knew the path could route arbitrary traffic through a third-party server this site does not control. It was **removed**.
- Today `/bare/*` returns **404**. Nothing forwards proxy traffic.
- The status function `/.netlify/functions/bare` reports `proxyEnabled: false` and `localBare: false`; `PUBLIC_BARE_URL` is informational only.
- **Do not re-enable or repoint `/bare/*` without security sign-off.** If an operator ever enables it, it must point at a **controlled Bare server they operate** — public relays can log, modify, or inject traffic, and they turn your origin into an open proxy for them. See `docs/proxy.md` §3.

## Offline-first as a security property

- No CDN scripts, no external fonts, no runtime third-party `fetch()`/`WebSocket` in games — every game is self-contained. This is both a reliability guarantee and a supply-chain control: nothing is loaded from third-party origins at runtime.
- Games that are exceptions (remote iframes like Slope/Hextris/Flappy Bird, the Ruffle-CDN Age of War, PeerJS-cloud Multiplayer Arena Shooter) are **audited and labeled honestly** in `docs/GAMES.md` — they are not claimed to be offline.
- The Eaglercraft wrapper fetches nothing external; relays and servers are empty by default.

## Verification commands (run these, quote the output)

```bash
# catalog parses and every url resolves
python3 -c "import json; d=json.load(open('games.json')); print(len(d))"
python3 - <<'PY'
import json, os
for g in json.load(open('games.json')):
    assert os.path.isfile(g['url']), g['url']
print('all urls OK')
PY

# external fetch scan (expect: only known/audited hits)
grep -rEl "https?://" Games --include=*.html --include=*.js | head -20

# absolute paths (expect: none)
grep -rEl "/home/|C:\\\\" Games docs *.html *.js *.json *.toml 2>/dev/null

# syntax check on entry scripts
node --check Games/*/script.js 2>/dev/null | head

# working tree hygiene
git status --short
```

## Protected areas

- `Games/Character AI/` — **read-only**, never edit or restructure.
- `netlify.toml` security settings — do not weaken without security sign-off.
- Eaglercraft — must stay fully offline and keep its GPL-3.0 / own-Minecraft-Java licensing note.

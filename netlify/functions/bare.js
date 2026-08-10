// Netlify function: /bare/* status endpoint (informational only).
//
// WHY NOT A REAL BARE SERVER HERE:
//   - `bare-server-node` is NOT vendored/installed in this repo (no
//     node_modules; packages must not be installed in this project).
//   - Netlify Functions are stateless serverless invocations. The Bare
//     protocol needs a long-lived server that can answer WebSocket upgrade
//     requests, which serverless functions cannot do.
//
// PROXY BACKEND IS DISABLED BY DEFAULT. The unauthenticated `/bare/*`
// redirect to a community public Bare server was removed (see netlify.toml):
// it turned this site into an open relay for anyone who knew the path.
// No `/bare/*` traffic is forwarded anywhere until an operator explicitly
// enables a controlled Bare endpoint in netlify.toml (see docs/proxy.md).
//
// PUBLIC_BARE_URL is INFORMATIONAL ONLY. It does NOT enable or configure
// anything — Netlify redirect targets in netlify.toml cannot read it. It
// exists so an operator can document which controlled Bare endpoint they
// intend to wire up.

exports.handler = async () => {
  const publicBareUrl = process.env.PUBLIC_BARE_URL || null;

  const body = JSON.stringify(
    {
      status: 'ok',
      proxyEnabled: false,
      localBare: false,
      note: 'No proxy backend is enabled by default. The previous /bare/* redirect to a public relay was removed (open-relay risk). An operator must configure a controlled Bare endpoint in netlify.toml before the proxy works — see docs/proxy.md.',
      bare: null,
      publicBareUrl,
      publicBareUrlNote:
        'INFORMATIONAL ONLY — does not enable or configure the proxy. Set it only to document the controlled Bare endpoint an operator intends to configure in netlify.toml.',
      configure: {
        uvConfig: '/uv/uv.config.js',
        netlifyRedirect:
          'netlify.toml -> [[redirects]] from = "/bare/*" (disabled by default; see the commented template)',
        docs: '/docs/proxy.md',
      },
      verify:
        'Requests to /bare/* should return 404 until an operator enables the redirect to a controlled Bare endpoint.',
    },
    null,
    2
  );

  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body,
  };
};

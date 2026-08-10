/* Ultraviolet service worker launcher.
 *
 * This worker is inert until the Ultraviolet distribution is vendored into
 * this directory (/uv/):
 *   - uv.sw.js     (imported below)
 *   - uv.bundle.js (defines UltravioletCodec)
 *   - uv.client.js (client-side UV API)
 *   - uv.handler.js
 *
 * Get them from the npm package @titaniumnetwork-dev/ultraviolet (dist/)
 * and copy them here. This repo does not vendor them, so until then the
 * import below throws.
 *
 * The import is RELATIVE (./uv.sw.js), not absolute (/uv/uv.sw.js), so it
 * resolves against this worker's own location and keeps working no matter
 * where the site is mounted (site root or a sub-path such as a GitHub Pages
 * project site).
 *
 * Registration happens in index.js with { scope: '/' } and only AFTER the UV
 * dependency check passes, so an inert worker is normally never registered.
 * As a second line of defense, if uv.sw.js cannot be loaded here, this
 * worker unregisters itself rather than leave a useless root-scope worker
 * that could serve stale responses.
 *
 * On hosts that cannot send the `Service-Worker-Allowed: /` header
 * (e.g. GitHub Pages) the root scope is blocked by the browser — see
 * /docs/proxy.md.
 */
try {
  importScripts('./uv.sw.js');
} catch (err) {
  console.error(
    '[uv] ./uv.sw.js not found — Ultraviolet distribution files are not ' +
      'vendored in this repo. Copy uv.sw.js / uv.bundle.js / uv.client.js / ' +
      'uv.handler.js from @titaniumnetwork-dev/ultraviolet into /uv/ to enable ' +
      'the proxy.',
    err
  );
  try {
    self.registration.unregister().catch(function () {});
  } catch (err2) {
    // Unregistration failed (or is unsupported here); nothing more to do.
  }
}

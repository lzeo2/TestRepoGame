/* Ultraviolet configuration.
 *
 * This file is loaded by the launcher page (index.html) AFTER uv.bundle.js,
 * which defines the `UltravioletCodec` reference used below. It is guarded
 * so that a missing uv.bundle.js does not throw a ReferenceError — instead
 * self.__uv$config is left undefined and the launcher (index.js) reports the
 * missing dependency.
 *
 * DEPENDENCY STATUS (be honest): the Ultraviolet distribution files
 * (uv.bundle.js, uv.client.js, uv.handler.js, uv.sw.js) are NOT vendored in
 * this repository. They ship in the npm package
 * `@titaniumnetwork-dev/ultraviolet` (dist/ folder) and must be copied into
 * this directory for the proxy to work. Until then the launcher page shows
 * a clear error and no service worker is registered.
 *
 * PROXY BACKEND STATUS: even once the distribution is vendored, no backend
 * is enabled until an operator configures a controlled Bare endpoint — the
 * previous `/bare/*` public relay was removed for security. See docs/proxy.md.
 */
(function () {
  'use strict';

  if (typeof UltravioletCodec === 'undefined') {
    // uv.bundle.js (which defines UltravioletCodec) did not load. Leave
    // self.__uv$config undefined so index.js reports the missing dependency
    // instead of throwing here.
    console.error(
      '[uv] UltravioletCodec is not defined — uv.bundle.js is not loaded. ' +
        'Ultraviolet distribution files are not vendored in this repo.'
    );
    return;
  }

  self.__uv$config = {
    bare: '/bare/',
    prefix: '/service/',
    encodeUrl: UltravioletCodec.code,
    decodeUrl: UltravioletCodec.decode,
    handler: '/uv/uv.handler.js',
    client: '/uv/uv.client.js',
    bundle: '/uv/uv.bundle.js',
    config: '/uv/uv.config.js',
    sw: '/uv/uv.sw.js',
  };
})();

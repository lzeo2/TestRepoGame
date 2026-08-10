/* UV launcher entry point.
 *
 * Hard dependency (absent in this repo): the Ultraviolet distribution files
 * uv.bundle.js, uv.config.js and uv.client.js must be present in /uv/ for
 * the proxy to actually run. They ship in the npm package
 * `@titaniumnetwork-dev/ultraviolet` (dist/). Until they are vendored this
 * page reports the missing dependency and never claims the proxy works.
 *
 * PROXY BACKEND STATUS: no backend is enabled by default. The previous
 * `/bare/*` redirect to a public third-party relay was removed for security
 * (open-relay risk). Until an operator configures a controlled Bare endpoint
 * (see docs/proxy.md), routing traffic through the proxy prefix will not
 * work even once the UV distribution files are present.
 */
(function () {
  'use strict';

  var statusEl = document.getElementById('uv-status');
  var formEl = document.getElementById('proxy-form');
  var inputEl = document.getElementById('proxy-url');
  var launchBtn = document.getElementById('launch-btn');

  // OPERATOR OPT-IN: the proxy backend is disabled by default on this
  // deployment (see docs/proxy.md). Set this to true only after vendoring the
  // Ultraviolet distribution files AND configuring a controlled Bare endpoint;
  // until then the Launch button stays disabled so users are never sent to a
  // proxy prefix that cannot work.
  var BACKEND_ENABLED = false;

  function report(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.hidden = false;
    if (isError) {
      statusEl.classList.add('is-error');
      console.error('[uv]', message);
    } else {
      statusEl.classList.remove('is-error');
      console.info('[uv]', message);
    }
  }

  function setLaunchDisabled(disabled) {
    if (!launchBtn) return;
    launchBtn.disabled = disabled;
    if (disabled) {
      launchBtn.setAttribute('aria-disabled', 'true');
    } else {
      launchBtn.removeAttribute('aria-disabled');
    }
  }

  // --- Dependency check (BEFORE service-worker registration) --------------
  // The Ultraviolet distribution (uv.bundle.js, uv.client.js, uv.handler.js,
  // uv.sw.js) is NOT vendored in this repo. Until an operator adds it the
  // proxy cannot work, so no root-scope worker is registered at all — an
  // idle root-scope worker would add risk without providing any benefit.
  if (typeof self.__uv$config === 'undefined') {
    report(
      'The proxy is not available on this deployment. This repo does not ' +
        'vendor the Ultraviolet distribution files (uv.bundle.js, ' +
        'uv.client.js, uv.handler.js, uv.sw.js). Copy them from the npm ' +
        'package @titaniumnetwork-dev/ultraviolet (dist/) into /uv/ to ' +
        'enable the proxy.',
      true
    );
    setLaunchDisabled(true);
    return;
  }

  // --- Service worker -----------------------------------------------------
  if (!('serviceWorker' in navigator)) {
    report(
      'The proxy is not available on this deployment. Your browser does not ' +
        'support service workers; the proxy cannot run here.',
      true
    );
    setLaunchDisabled(true);
    return;
  }

  // Root scope is required so the worker can intercept /service/* and /bare/*.
  // Netlify sends `Service-Worker-Allowed: /` (see netlify.toml). On hosts
  // that cannot (GitHub Pages) the browser rejects this — see docs/proxy.md.
  navigator.serviceWorker.register('/uv/sw.js', { scope: '/' }).catch(function (err) {
    report(
      'Could not register the proxy service worker at root scope. On static ' +
        'hosts such as GitHub Pages the server must be able to send the ' +
        '`Service-Worker-Allowed: /` header (Netlify does this via netlify.toml). ' +
        'Details: ' + err,
      true
    );
  });

  if (!formEl || !inputEl) return;

  // --- Launch gate ----------------------------------------------------------
  // The backend is disabled by default on this deployment, so keep the Launch
  // button disabled (and block the submit handler) unless an operator has
  // explicitly enabled the proxy (see BACKEND_ENABLED above / docs/proxy.md).
  if (!BACKEND_ENABLED) {
    setLaunchDisabled(true);
  } else {
    setLaunchDisabled(false);
  }

  // --- Input validation -----------------------------------------------------
  // Accept only http:// and https:// URLs. Anything else — javascript:,
  // data:, file:, vbscript:, chrome:, etc. — is rejected.
  function isHttpUrl(value) {
    var parsed;
    try {
      parsed = new URL(value);
    } catch (err) {
      return false;
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  }

  // --- Launch ---------------------------------------------------------------
  formEl.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!BACKEND_ENABLED) {
      report(
        'The proxy is not available on this deployment — no backend is ' +
          'enabled. An operator must configure a controlled Bare endpoint ' +
          'and set BACKEND_ENABLED in uv/index.js (see docs/proxy.md).',
        true
      );
      return;
    }
    var url = (inputEl.value || '').trim();

    // Reject control characters outright (C0 controls, DEL, C1 controls).
    // Address-bar input should never need them; the URL parser silently
    // strips tabs/newlines, so check before parsing to prevent smuggling.
    if (/[\u0000-\u001f\u007f-\u009f]/.test(url)) {
      report('Invalid URL: control characters are not allowed.', true);
      return;
    }

    if (!url) return;
    // Default to https:// when no scheme was typed.
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
      url = 'https://' + url;
    }

    if (!isHttpUrl(url)) {
      report('Invalid URL: only http:// and https:// URLs are allowed.', true);
      return;
    }

    var config = self.__uv$config || {};
    var prefix = config.prefix || '/service/';
    var encode = config.encodeUrl || encodeURIComponent;
    window.location.assign(prefix + encode(url));
  });

  if (BACKEND_ENABLED) {
    report(
      'Ready, and the proxy backend is enabled by an operator. Enter a URL ' +
        'above to route it through the proxy.',
      false
    );
  } else {
    report(
      'The proxy is not available on this deployment. The Ultraviolet ' +
        'distribution files are not vendored here and no proxy backend is ' +
        'enabled — an operator must configure a controlled Bare endpoint ' +
        '(see docs/proxy.md).',
      false
    );
  }
})();

// Diagnostic only: hide GLB body visibility for FileLoader's native arrayBuffer fallback.
// CPU fixture coverage is not native-mechanism acceptance.
(() => {
  'use strict';
  if (Object.prototype.hasOwnProperty.call(window, '__wingsDirectBodyTrace')) return;
  const originalFetch = window.fetch;
  const trace = { mode: 'direct-glb-body-probe', glbResponses: 0,
    otherResponses: 0, overrideErrors: 0, urls: [], dropped: 0 };
  const bump = key => { trace[key] = Math.min(Number.MAX_SAFE_INTEGER, trace[key] + 1); };
  Object.defineProperty(window, '__wingsDirectBodyTrace', {
    value: Object.freeze({ read: () => ({ ...trace, urls: trace.urls.slice() }) })
  });
  window.fetch = function () {
    return Reflect.apply(originalFetch, this, arguments).then(response => {
      const url = response.url;
      if (/\.glb(?:[?#]|$)/i.test(url)) {
        bump('glbResponses');
        if (trace.urls.length < 32) trace.urls.push(url.slice(0, 2048));
        else bump('dropped');
        try {
          Object.defineProperty(response, 'body', { value: undefined, configurable: true });
        } catch {
          // Invalid diagnostic variant: matched responses are not an applied count.
          bump('overrideErrors');
        }
      } else bump('otherResponses');
      return response;
    });
  };
})();

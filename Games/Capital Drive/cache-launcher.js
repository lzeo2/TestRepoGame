const BUILD_MESSAGE = 'CAPITAL_CACHE_BUILD';
const BUILD_ID = /^[a-f0-9]{12}$/;
const UPDATE_INTERVAL = 60_000;
const MIN_UPDATE_GAP = 8_000;
let cacheMonitor;

function readControllerBuild(controller) {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => finish(null), 750);
    function finish(reply) {
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
      resolve(reply?.type === BUILD_MESSAGE && typeof reply.build === 'string' && BUILD_ID.test(reply.build) ? reply.build : null);
    }
    channel.port1.onmessage = event => finish(event.data);
    channel.port1.onmessageerror = () => finish(null);
    try { controller.postMessage({ type: BUILD_MESSAGE }, [channel.port2]); }
    catch { finish(null); }
  });
}

function createMonitor(canReload, startPanel = document.getElementById('start-panel')) {
  const status = document.getElementById('cache-status');
  const updateButton = document.getElementById('cache-update');
  const show = text => {
    if (status && (status.hidden || status.textContent !== text)) {
      status.hidden = false;
      status.textContent = text;
    }
  };
  let workers;
  try { if (globalThis.isSecureContext) workers = navigator.serviceWorker; }
  catch { /* A browser privacy setting can deny access to service workers. */ }
  if (!workers) {
    show('File caching is unavailable in this browser.');
    return { register() {} };
  }
  const workerURL = new URL('./service-worker.js', import.meta.url);
  const scopeURL = new URL('./', workerURL);
  const pageBuild = document.getElementById('build-version')?.textContent.trim();
  const reloadKey = `capital-drive-update:${workerURL.pathname}`;
  const getController = () => workers.controller?.scriptURL === workerURL.href ? workers.controller : null;
  const visible = () => document.visibilityState !== 'hidden';
  const installations = new WeakSet();
  let registration, knownController = null, pendingController = null, controllerBuild = null;
  let registrationRequested = false, reloading = false, updatePending = false, lastUpdate = -Infinity;

  function refresh() {
    const ready = Boolean(controllerBuild && controllerBuild !== pageBuild && knownController === getController());
    const safe = ready && canReload();
    if (updateButton) {
      updateButton.hidden = !ready || reloading;
      updateButton.disabled = !safe || reloading;
      const label = safe ? 'Load update' : 'Update ready · start menu';
      if (updateButton.textContent !== label) updateButton.textContent = label;
    }
    if (reloading) show('Loading the new build…');
    else if (ready) show(safe ? 'New build ready. Choose Load update.' : 'New build ready. Return to the start menu to update.');
    else if (registration?.waiting || registration?.installing) show('Saving game files for faster starts…');
    else if (registration?.active) show('Saved for faster starts and offline play.');
    else if (getController()) show('Using saved game files.');
    else if (registrationRequested) show('Files could not be saved. Online play is available.');
  }

  function rememberReload(build) {
    const pair = `${pageBuild}:${build}`;
    try {
      if (sessionStorage.getItem(reloadKey) === pair) return false;
      sessionStorage.setItem(reloadKey, pair);
      return true;
    } catch {
      // Avoid a reload loop when a stale shell and blocked storage coincide.
      return false;
    }
  }

  function applyUpdate({ manual = false } = {}) {
    if (reloading || !visible() || !controllerBuild || controllerBuild === pageBuild ||
        knownController !== getController() || !canReload() || (!manual && !rememberReload(controllerBuild))) return false;
    reloading = true;
    refresh();
    location.reload();
    return true;
  }

  async function checkController() {
    const controller = getController();
    if (controller !== knownController) {
      knownController = controller;
      controllerBuild = null;
    }
    if (applyUpdate()) return;
    refresh();
    if (!controller || controllerBuild || pendingController === controller ||
        !BUILD_ID.test(pageBuild) || typeof MessageChannel !== 'function') return;
    pendingController = controller;
    let build;
    try { build = await readControllerBuild(controller); }
    catch { /* A later wake can retry a transient handshake failure. */ }
    finally { if (pendingController === controller) pendingController = null; }
    if (!build || controller !== getController() || reloading) return;
    controllerBuild = build;
    if (build === pageBuild) {
      try { sessionStorage.removeItem(reloadKey); }
      catch { /* Build already matches when session storage is unavailable. */ }
    } else if (applyUpdate()) return;
    refresh();
  }

  async function checkForUpdate() {
    if (!visible() || reloading) return;
    void checkController();
    if (navigator.onLine === false || !registration?.active || registration.installing || registration.waiting || updatePending) return;
    const now = Date.now();
    if (now - lastUpdate < MIN_UPDATE_GAP) return;
    lastUpdate = now;
    updatePending = true;
    try { await registration.update(); }
    catch { /* Offline/CDN errors leave the currently verified build playable. */ }
    finally { updatePending = false; refresh(); }
  }

  function watchRegistration(result) {
    if (!result || registration === result) return;
    registration = result;
    function watch() {
      const installing = result.installing;
      if (installing && !installations.has(installing)) {
        installations.add(installing);
        installing.addEventListener('statechange', refresh);
      }
      refresh();
    }
    result.addEventListener('updatefound', watch);
    watch();
  }

  workers.addEventListener('controllerchange', checkController);
  const wake = () => { void checkForUpdate(); };
  globalThis.addEventListener?.('focus', wake);
  globalThis.addEventListener?.('pageshow', wake);
  globalThis.addEventListener?.('offline', () => { lastUpdate = -Infinity; });
  globalThis.addEventListener?.('online', wake);
  document.addEventListener?.('visibilitychange', wake);
  globalThis.setInterval?.(wake, UPDATE_INTERVAL);
  updateButton?.addEventListener('click', () => { applyUpdate({ manual: true }); });
  if (startPanel && typeof MutationObserver === 'function') {
    new MutationObserver(checkController).observe(startPanel, { attributes: true, attributeFilter: ['hidden'] });
  }
  void checkController();
  // Existing installations can repair a stale shell even if the game module
  // fails to boot. First visits still wait for the game before registering.
  if (typeof workers.getRegistration === 'function') {
    void Promise.resolve().then(() => workers.getRegistration(scopeURL)).then(result => {
      if (result?.scope !== scopeURL.href || ![result.active, result.waiting, result.installing]
        .some(worker => worker?.scriptURL === workerURL.href)) return;
      watchRegistration(result);
      wake();
    }).catch(() => {});
  }

  function register(gameCanReload) {
    canReload = gameCanReload;
    void checkController();
    if (registrationRequested || reloading) return;
    registrationRequested = true;
    void Promise.resolve().then(() => workers.register(workerURL, { scope: './', updateViaCache: 'none' })).then(result => {
      watchRegistration(result);
      wake();
    }).catch(refresh);
  }
  return { register };
}

export function setupGameCache({ canReload = () => false } = {}) {
  // A new download starts only after boot. It uses separate storage from career saves.
  (cacheMonitor ??= createMonitor(canReload)).register(canReload);
}

export function showGameStartupError(error) {
  const loading = document.getElementById('loading');
  loading.textContent = `Unable to start: ${error.message} Reload to try again.`;
  loading.setAttribute('role', 'alert');
  const start = document.getElementById('start-button');
  start.textContent = 'Reload game';
  start.disabled = false;
  start.addEventListener('click', () => location.reload(), { once: true });
  console.error('Capital Drive startup failed', error);
}

const startPanel = document.getElementById('start-panel');
if (startPanel) {
  // Existing workers can take control while the module graph or map is loading.
  cacheMonitor = createMonitor(() => !startPanel.hidden, startPanel);
}
if (document.getElementById('capital-drive-launcher')) {
  import('./script.js').catch(showGameStartupError);
}

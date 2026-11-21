const BUILD_MESSAGE = 'CAPITAL_CACHE_BUILD';
const BUILD_ID = /^[a-f0-9]{12}$/;
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

function createMonitor(canReload) {
  const status = document.getElementById('cache-status');
  const show = text => {
    if (status) { status.hidden = false; status.textContent = text; }
  };
  let workers;
  try { if (globalThis.isSecureContext) workers = navigator.serviceWorker; }
  catch { /* A browser privacy setting can deny access to service workers. */ }
  if (!workers) {
    show('File caching is unavailable in this browser.');
    return { register() {} };
  }
  const workerURL = new URL('./service-worker.js', import.meta.url);
  const pageBuild = document.getElementById('build-version')?.textContent.trim();
  const reloadKey = `capital-drive-update:${workerURL.pathname}`;
  const getController = () => workers.controller?.scriptURL === workerURL.href ? workers.controller : null;
  let registration, checkedController = null, controllerBuild = null, reloading = false;
  let registrationRequested = false;

  function refresh() {
    if (reloading) return;
    if (controllerBuild && controllerBuild !== pageBuild) show('New build ready. Reopen after this session.');
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

  async function checkController() {
    const controller = getController();
    if (controller === checkedController) return;
    checkedController = controller;
    controllerBuild = null;
    refresh();
    if (!controller || !BUILD_ID.test(pageBuild) || typeof MessageChannel !== 'function') return;
    let build;
    try { build = await readControllerBuild(controller); }
    catch { return; }
    if (!build || controller !== getController() || reloading) return;
    controllerBuild = build;
    if (build === pageBuild) {
      try { sessionStorage.removeItem(reloadKey); }
      catch { /* Build already matches when session storage is unavailable. */ }
    } else if (canReload() && rememberReload(build)) {
      reloading = true;
      show('Loading the new build…');
      location.reload();
      return;
    }
    refresh();
  }

  workers.addEventListener('controllerchange', checkController);
  void checkController();

  function register(gameCanReload) {
    canReload = gameCanReload;
    if (registrationRequested || reloading) return;
    registrationRequested = true;
    workers.register(workerURL, { scope: './', updateViaCache: 'none' }).then(result => {
      registration = result;
      function watch() {
        registration.installing?.addEventListener('statechange', refresh);
        refresh();
      }
      registration.addEventListener('updatefound', watch);
      watch();
      void checkController();
      // Same-script register calls can return an existing registration.
      if (registration.active && !registration.installing && !registration.waiting) {
        void registration.update().catch(refresh);
      }
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
  cacheMonitor = createMonitor(() => !startPanel.hidden);
}
if (document.getElementById('capital-drive-launcher')) {
  import('./script.js').catch(showGameStartupError);
}

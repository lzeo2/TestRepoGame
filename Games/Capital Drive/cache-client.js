// Download storage is separate from career saves and never delays the first boot.
export function setupGameCache() {
  const status = document.getElementById('cache-status');
  const show = text => { status.hidden = false; status.textContent = text; };
  if (!globalThis.isSecureContext || !('serviceWorker' in navigator)) {
    show('File caching is unavailable in this browser.');
    return;
  }
  const workerURL = new URL('./service-worker.js', import.meta.url);
  const usingSavedFiles=navigator.serviceWorker.controller?.scriptURL===workerURL.href;
  if(usingSavedFiles)show('Using saved game files.');
  navigator.serviceWorker.register(workerURL, { scope: './', updateViaCache: 'none' }).then(registration => {
    function refresh() {
      if (registration.waiting) show('Update saved. Close game tabs and reopen to use it.');
      else if (registration.installing) show('Saving game files for faster starts…');
      else if (registration.active) show('Saved for faster starts and offline play.');
      else show('Files could not be saved. Online play is available.');
    }
    function watch(worker) {
      if (worker) worker.addEventListener('statechange', () => {
        if (worker.state === 'redundant' && !registration.active && !registration.waiting) show('Files could not be saved. Online play is available.');
        else refresh();
      });
      refresh();
    }
    registration.addEventListener('updatefound', () => watch(registration.installing));
    watch(registration.installing);
  }).catch(() => show(usingSavedFiles?'Using saved game files.':'Files could not be saved. Online play is available.'));
}

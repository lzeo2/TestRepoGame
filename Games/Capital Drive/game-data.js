// Read the active worker's complete map revision without creating fetch requests.
const DATA_FILES = new Set([
  'data/canberra.json', 'data/addresses.json', 'data/road-profiles.json',
  'data/canberra-north.json', 'data/north-terrain.json', 'data/traffic-signals.json',
  'data/airport.json',
]);
const MESSAGE_TYPE = 'CAPITAL_CACHE_FILES';

export async function loadGameData(urls, {
  baseURL = import.meta.url,
  serviceWorker = globalThis.navigator?.serviceWorker,
  cacheStorage = globalThis.caches,
  fetch: fetchFile = globalThis.fetch?.bind(globalThis),
  MessageChannel: Channel = globalThis.MessageChannel,
  setTimeout: startTimer = globalThis.setTimeout,
  clearTimeout: stopTimer = globalThis.clearTimeout,
  timeoutMs = 750,
} = {}) {
  const base = new URL('./', baseURL);
  const resolved = urls.map(url => new URL(url, base).href);
  const fallback = () => Promise.all(resolved.map(url => fetchFile(url)));
  const controller = serviceWorker?.controller;
  const allowed = new Set([...DATA_FILES].map(url => new URL(url, base).href));
  if (!controller || controller.scriptURL !== new URL('service-worker.js', base).href ||
      !cacheStorage?.match || !Channel ||
      resolved.length !== DATA_FILES.size || new Set(resolved).size !== DATA_FILES.size ||
      resolved.some(url => !allowed.has(url))) return fallback();

  let channel, timer;
  try {
    const saved = await Promise.race([
      new Promise(resolve => { timer = startTimer(() => resolve(null), timeoutMs); }),
      (async () => {
        channel = new Channel();
        const reply = await new Promise(resolve => {
          channel.port1.onmessage = event => resolve(event.data);
          channel.port1.onmessageerror = () => resolve(null);
          channel.port1.start?.();
          controller.postMessage({ type: MESSAGE_TYPE, urls: resolved }, [channel.port2]);
        });
        const prefix = `capital-drive-files-v1-${encodeURIComponent(base.pathname)}-`;
        if (reply?.type !== MESSAGE_TYPE || typeof reply.cacheName !== 'string' ||
            !reply.cacheName.startsWith(prefix) || !/^[a-f0-9]{64}$/.test(reply.cacheName.slice(prefix.length)) ||
            !Array.isArray(reply.files) || reply.files.length !== resolved.length) return null;
        for (let i = 0; i < resolved.length; i++) {
          const file = reply.files[i];
          if (file?.url !== resolved[i] || typeof file.key !== 'string' ||
              !file.key.startsWith(`${file.url}?capital-file=`) ||
              !/^[a-f0-9]{64}$/.test(file.key.slice(`${file.url}?capital-file=`.length))) return null;
        }
        // CacheStorage.match is read-only, including when the cache was evicted.
        const responses = await Promise.all(reply.files.map(file => cacheStorage.match(file.key, { cacheName: reply.cacheName })));
        return responses.every(response => response?.ok && response.type !== 'opaque') ? responses : null;
      })(),
    ]);
    if (saved) return saved;
  } catch {
    // Unsupported worker revisions and unavailable storage retain ordinary loading.
  } finally {
    stopTimer(timer);
    channel?.port1.close();
    channel?.port2.close();
  }
  return fallback();
}

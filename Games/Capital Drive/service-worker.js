'use strict';
const buildId = '9af12d77b9aa'; // Generated build ID
importScripts(`./cache-manifest.js?capital-build=${buildId}`);

const manifest = self.CAPITAL_CACHE_MANIFEST;
if (manifest?.build !== buildId || !/^[a-f0-9]{64}$/.test(manifest.version) ||
    !Array.isArray(manifest.files) || !manifest.files.length) throw new Error('Cache manifest does not match this build.');
const base = new URL('./', self.location.href);
const prefix = `capital-drive-files-v1-${encodeURIComponent(base.pathname)}-`;
const cacheName = prefix + manifest.version;
const entries = new Map(manifest.files.map(file => [new URL(file.url, base).href, file]));
const indexURL = new URL('index.html', base).href;
const keyFor = (url, file) => `${url}?capital-file=${file.sha256}`;

async function matches(response, file) {
  if (!response?.ok || response.type === 'opaque') return false;
  const bytes = await response.clone().arrayBuffer();
  if (bytes.byteLength !== file.bytes) return false;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return hex === file.sha256;
}

async function installFiles() {
  const existing = await caches.keys();
  const cache = await caches.open(cacheName);
  const pending = [...entries];
  try {
    const previous = existing.filter(name => name.startsWith(prefix) && name !== cacheName);
    const sources = [cache, ...await Promise.all(previous.map(name => caches.open(name)))];
    let failure = null;
    async function copyFiles() {
      while (pending.length && !failure) {
        const [url, file] = pending.pop();
        try {
          const key = keyFor(url, file);
          let response;
          for (const source of sources) {
            const candidate = await source.match(key);
            if (await matches(candidate, file)) { response = candidate; break; }
          }
          if (!response) {
            // Reuse first-visit transfers. A digest URL also bypasses stale CDN bytes.
            response = await fetch(url, { cache: 'force-cache', credentials: 'same-origin' });
            if (!await matches(response, file)) {
              response = await fetch(key, { cache: 'reload', credentials: 'same-origin' });
              if (!await matches(response, file)) throw new Error(`Incomplete game revision: ${file.url}`);
            }
          }
          await cache.put(key, response);
        } catch (error) {
          failure = error;
        }
      }
    }
    await Promise.all(Array.from({ length: 4 }, copyFiles));
    if (failure) throw failure;
  } catch (error) {
    // A repeated install can reuse the currently active cache name.
    if (!existing.includes(cacheName)) await caches.delete(cacheName);
    throw error;
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await installFiles();
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(prefix) && name !== cacheName).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  const data = event.data;
  const port = event.ports?.[0];
  if (!port || !event.source?.url) return;
  const client = new URL(event.source.url);
  if (client.origin !== base.origin || !client.pathname.startsWith(base.pathname)) return;
  if (data?.type === 'CAPITAL_CACHE_BUILD') {
    port.postMessage({ type: 'CAPITAL_CACHE_BUILD', build: manifest.build });
    return;
  }
  if (data?.type !== 'CAPITAL_CACHE_FILES' || !Array.isArray(data.urls) ||
      !data.urls.length || data.urls.length > entries.size) return;
  const files = [];
  for (const url of data.urls) {
    const file = entries.get(url);
    if (!file || !file.url.startsWith('data/') || !file.url.endsWith('.json') ||
        new URL(url).origin !== base.origin) return;
    files.push({ url, key: keyFor(url, file) });
  }
  // The page asks its controller, so an incoming revision cannot change these keys before activation.
  port.postMessage({ type: 'CAPITAL_CACHE_FILES', cacheName, files });
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== base.origin) return;
  const navigation = request.mode === 'navigate' && (url.pathname === base.pathname || url.pathname === new URL(indexURL).pathname);
  const canonical = navigation ? indexURL : url.href;
  const file = entries.get(canonical);
  if (!file) return;
  event.respondWith((async () => {
    let cache;
    try {
      cache = await caches.open(cacheName);
      const saved = await cache.match(keyFor(canonical, file));
      if (saved) return saved;
    } catch {
      // Private browsing, eviction or storage failure must not prevent online play.
    }
    const key = keyFor(canonical, file);
    let response;
    for (const retry of [false, true]) {
      try {
        const candidate = retry ? await fetch(key, { cache: 'reload', credentials: 'same-origin' }) : await fetch(request);
        if (await matches(candidate, file)) { response = candidate; break; }
      } catch {
        // A failed transfer or digest never authorizes bytes from another revision.
      }
    }
    if (!response) return new Response('Game revision verification failed. Reload to try again.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
    if (cache) try {
      event.waitUntil(cache.put(key, response.clone()).catch(() => {}));
    } catch {
      // Storage failures do not block a response whose bytes were verified above.
    }
    return response;
  })());
});

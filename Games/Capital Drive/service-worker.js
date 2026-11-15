'use strict';
importScripts('./cache-manifest.js');

const manifest = self.CAPITAL_CACHE_MANIFEST;
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
  const cache = await caches.open(cacheName);
  const previous = (await caches.keys()).filter(name => name.startsWith(prefix) && name !== cacheName);
  const oldCaches = await Promise.all(previous.map(name => caches.open(name)));
  const pending = [...entries];
  let failure = null;
  async function copyFiles() {
    while (pending.length && !failure) {
      const [url, file] = pending.pop();
      try {
        const key = keyFor(url, file);
        let response = await cache.match(key);
        for (const oldCache of oldCaches) {
          if (response) break;
          response = await oldCache.match(key);
        }
        if (!response) {
          // Already downloaded first-visit files can be reused from the HTTP cache.
          response = await fetch(url, { cache: 'force-cache', credentials: 'same-origin' });
          if (!await matches(response, file)) {
            response = await fetch(url, { cache: 'reload', credentials: 'same-origin' });
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
  if (failure) {
    await caches.delete(cacheName);
    throw failure;
  }
}

self.addEventListener('install', event => {
  // A complete revision must be installed before it can replace a working one.
  // Default waiting protects other open game tabs; never force an active update.
  event.waitUntil(installFiles());
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
  if (data?.type !== 'CAPITAL_CACHE_FILES' || !port || !Array.isArray(data.urls) ||
      !data.urls.length || data.urls.length > entries.size) return;
  if (event.source?.url) {
    const client = new URL(event.source.url);
    if (client.origin !== base.origin || !client.pathname.startsWith(base.pathname)) return;
  }
  const files = [];
  for (const url of data.urls) {
    const file = entries.get(url);
    if (!file || !file.url.startsWith('data/') || !file.url.endsWith('.json') ||
        new URL(url).origin !== base.origin) return;
    files.push({ url, key: keyFor(url, file) });
  }
  // The page asks its controller, so a waiting revision cannot change these keys.
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
    const response = await fetch(request);
    if (cache) {
      const copy = response.clone();
      event.waitUntil((async () => {
        if (await matches(copy, file)) await cache.put(keyFor(canonical, file), copy);
      })().catch(() => {}));
    }
    return response;
  })());
});

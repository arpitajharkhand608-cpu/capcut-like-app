/* ═══════════════════════════════════════════════════════════
   capcut-like-app — sw.js
   Strategy:
   · Precache the app shell on install (offline-ready, AC-2)
   · Runtime stale-while-revalidate for the Tailwind CDN
   · Network-first for navigations, cache fallback when offline
   ═══════════════════════════════════════════════════════════ */
'use strict';

const VERSION = 'capcut-like-v23';
const SHELL_CACHE = `${VERSION}-shell`;
const CDN_CACHE   = `${VERSION}-cdn`;

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE, CDN_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isCdnRequest(url) {
  return url.hostname === 'cdn.tailwindcss.com';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Navigations: network-first, fall back to cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Tailwind CDN: stale-while-revalidate.
  if (isCdnRequest(url)) {
    event.respondWith(
      caches.open(CDN_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Same-origin static assets: NETWORK-FIRST with cache fallback.
  // (index.html, app.js and style.css must never come from a stale shell —
  //  cache-first previously served old JS against new HTML after deploys.)
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
  }
});

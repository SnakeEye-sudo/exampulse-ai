/* ExamPulse AI service worker
 *
 * Two caching strategies, chosen by what the resource is:
 *   app shell / static assets → cache-first (they are content-hashed by Next)
 *   /data/*.json              → stale-while-revalidate (yesterday's news is
 *                               still worth reading on a train with no signal;
 *                               a fresh copy replaces it in the background)
 *
 * Navigation falls back to the cached shell when offline, so the whole app —
 * articles already read, the quiz, the mistake book, the revision schedule —
 * keeps working without a connection. That matters: a lot of aspirants study
 * on patchy mobile data.
 */
const VERSION = 'v1';
const SHELL = `exampulse-shell-${VERSION}`;
const DATA = `exampulse-data-${VERSION}`;
const RUNTIME = `exampulse-rt-${VERSION}`;

const PRECACHE = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => ![SHELL, DATA, RUNTIME].includes(k)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

const isData = (url) => url.pathname.startsWith('/data/');
const isStatic = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // The AI tutor must never be answered from cache.
  if (url.pathname.startsWith('/api/')) return;

  if (isData(url)) {
    event.respondWith(
      caches.open(DATA).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => { if (res && res.ok) cache.put(request, res.clone()); return res; })
          .catch(() => null);
        return cached || (await network) || new Response('[]', { headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  if (isStatic(url)) {
    event.respondWith(
      caches.open(SHELL).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res && res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          const cache = await caches.open(RUNTIME);
          cache.put(request, res.clone());
          return res;
        } catch {
          const cache = await caches.open(RUNTIME);
          return (await cache.match(request))
            || (await caches.match('/'))
            || new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:system-ui;padding:2rem"><h1>Offline</h1><p>ExamPulse could not reach the network, and this page was not cached. Open a page you have visited before, or reconnect.</p>', { headers: { 'Content-Type': 'text/html' } });
        }
      })()
    );
  }
});

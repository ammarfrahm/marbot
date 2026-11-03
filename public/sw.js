// Marbot's service worker: every built file is cached at install, so all tabs open offline.
// The build replaces the placeholder below with the file list and a hash of their contents;
// a new deploy changes the hash, which installs a fresh cache and drops the old one.
const { version, urls } = /*PRECACHE*/ { version: 'dev', urls: [] };
const CACHE = `marbot-${version}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(urls)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Same-origin files come from the cache first: they open instantly, and a deploy refreshes them
// through the new worker. Schedules from myQuran and Aladhan are not touched; the page caches those.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  const navigate = request.mode === 'navigate';
  event.respondWith(
    caches
      .match(request, { ignoreSearch: navigate }) // ?kota= links open the cached page
      .then((hit) => hit ?? fetch(request))
      .catch(() => (navigate ? caches.match('/') : Response.error())),
  );
});

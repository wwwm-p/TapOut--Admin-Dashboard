const CACHE_NAME = "student-support-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/student-manifest.json",
  "/service-worker.js",
  "/style.css",
  "/page1.png",
  "/page2.png",
  "/page3.png",
  "/icons/icon-192-student.png",
  "/icons/icon-512-student.png",
  "/icons/apple-touch-icon-student.png"
];

// INSTALL: cache all static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing student service worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ACTIVATE: clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating student service worker...");
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))
    )
  );
  self.clients.claim();
});

// FETCH: cache-first strategy
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

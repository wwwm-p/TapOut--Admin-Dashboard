const CACHE_NAME = "admin-dashboard-v3";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/admin-manifest.json",
  "/service-worker.js",
  "/icons/icon-192-admin.png",
  "/icons/icon-512-admin.png"
];

// INSTALL
self.addEventListener("install", (event) => {
  console.log("SW: Installed");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  console.log("SW: Activated");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH (offline support)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});

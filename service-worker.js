const CACHE_NAME = "admin-dashboard-v2";

const STATIC_ASSETS = [
  "/",
  "/index-admin.html",
  "/manifest.json",
  "/service-worker.js",
  "/script.js",

  // icons (must match your actual files)
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png"
];

// INSTALL
self.addEventListener("install", (event) => {
  console.log("SW: Installing");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  console.log("SW: Activating");
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

// FETCH
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});

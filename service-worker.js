const CACHE_NAME = "geogiardini-cache-v3";
const urlsToCache = [
  "/",
  "/login.html",
  "/dashboard.html",
  "/admin_dashboard.html",
  "/manifest.json",
  "/icons/leaf-192.png",
  "/icons/leaf-512.png",
  "/icons/logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const acceptHeader = request.headers.get("Accept") || "";

  if (request.mode === "navigate" || acceptHeader.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then(
              (cachedResponse) => cachedResponse || caches.match("/login.html")
            )
        )
    );
    return;
  }

  event.respondWith(
    caches
      .match(request)
      .then((cachedResponse) => cachedResponse || fetch(request))
  );
});

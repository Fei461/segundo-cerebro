const CACHE_NAME = "segundo-cerebro-app-v5";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-icon-512.png",
  "./icons/apple-touch-icon-180.png",
  "./src/main.js",
  "./src/styles/app.css",
  "./src/domain/catalogs.js",
  "./src/domain/insights.js",
  "./src/domain/personal-nutrition.js",
  "./src/domain/plans.js",
  "./src/domain/schema.js",
  "./src/domain/weekly.js",
  "./src/features/dashboard-view.js",
  "./src/features/nutrition-view.js",
  "./src/features/planning-view.js",
  "./src/features/recovery-view.js",
  "./src/features/training-view.js",
  "./src/features/wellbeing-view.js",
  "./src/storage/crypto.js",
  "./src/storage/backup.js",
  "./src/storage/indexeddb.js",
  "./src/storage/legacy-import.js",
  "./src/storage/secure-store.js",
  "./src/ui/app-shell.js",
  "./src/ui/formatters.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isNavigation = event.request.mode === "navigate";
  const shouldPreferNetwork =
    isSameOrigin &&
    (isNavigation || ["document", "script", "style", "manifest"].includes(event.request.destination));

  event.respondWith(
    (shouldPreferNetwork
      ? fetch(event.request)
          .then(response => {
            if (!response || response.status >= 400) return response;
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            return response;
          })
          .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
      : caches.match(event.request).then(cached => {
          if (cached) return cached;

          return fetch(event.request)
            .then(response => {
              if (!response || response.status >= 400) return response;
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
              return response;
            })
            .catch(() => caches.match("./index.html"));
        }))
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

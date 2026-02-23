self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("sub-app-cache").then((cache) => {
      return cache.addAll([
        "./",
        "./index.html",
        "./manifest.webmanifest",
        "./icon.jpg",
        "./icon.jpg"
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => {
      return resp || fetch(event.request);
    })
  );
});



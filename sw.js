// Service worker: makes the game work offline once installed from HTTPS.
//
// `cargo xtask web` replaces f5b8188ccd5678f9 with a hash of the build, so every new
// build is a new service worker with a new cache; old caches are deleted.
const CACHE = "rustine-f5b8188ccd5678f9";
const FILES = [
  "./",
  "index.html",
  "platform_sdl.js",
  "platform_sdl.wasm",
  "manifest.webmanifest",
  "icon-180.png",
];

// First visit (or new build): download everything into a fresh cache.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // cache: "reload" bypasses the browser's HTTP cache, so we never store a stale file.
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

// New version active: delete the caches of older builds.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Every request: answer from the cache first, fall back to the network.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches
      .match(event.request, { ignoreSearch: true })
      .then((cached) => cached || fetch(event.request)),
  );
});

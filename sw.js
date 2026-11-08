// Service worker: makes the games work offline once opened from HTTPS.
//
// `cargo xtask web` replaces 47fceed866ebe64c with a hash of the build, so every new
// build is a new service worker with a new cache; old caches are deleted.
//
// Only the list is downloaded at install: there are several games, each a few MB, and
// a visitor plays one or two. A game's files are cached the first time it's opened, so
// a game opened once works offline afterwards (until the next build).
const CACHE = "rustine-47fceed866ebe64c";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-180.png"];

// First visit (or new build): download the list into a fresh cache.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // cache: "reload" bypasses the browser's HTTP cache, so we never store a stale file.
      .then((cache) => cache.addAll(SHELL.map((f) => new Request(f, { cache: "reload" }))))
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

// Every request for one of our files: the cache first; otherwise the network, and keep a
// copy. "no-cache" asks the server whether the browser's own copy is still current: a
// game's .js and .wasm must come from the same build.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(request, { cache: "no-cache" }).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});

// Minimal offline cache for Inkwell. Keeps just the app shell (this is a
// single self-contained HTML file, so "the shell" is "the whole app")
// available without a network connection. Notes themselves live in
// localStorage, which already works offline on its own — this file only
// makes sure the PAGE can still load when there's no signal.

const CACHE_NAME = "inkwell-shell-v1";
const SHELL_URLS = ["./", "index.html", "manifest.json", "icon-192.png"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; }).map(function (n) {
          return caches.delete(n);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  // Only handle our own same-origin files. Cross-origin requests (the
  // Google Fonts stylesheet/font files) are left alone entirely — they
  // work fine online and fail gracefully offline via the font-family
  // fallback stacks already in the page's CSS.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});

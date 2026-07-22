/* Hint Laundry service worker — precaches the whole app so it opens
   instantly and fully offline. Bump VERSION on every deploy so phones
   pick up the new build. */
const VERSION = "v3.1.0";
const CACHE = "hint-laundry-" + VERSION;
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.webmanifest",
  "./vendor/react.production.min.js",
  "./vendor/react-dom.production.min.js",
  "./vendor/xlsx.full.min.js",
  "./fonts/inter-latin-400-normal.woff2",
  "./fonts/inter-latin-500-normal.woff2",
  "./fonts/inter-latin-600-normal.woff2",
  "./fonts/inter-latin-700-normal.woff2",
  "./fonts/inter-latin-800-normal.woff2",
  "./fonts/ibm-plex-mono-latin-500-normal.woff2",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("hint-laundry-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // e.g. wa.me links
  e.respondWith(
    caches.match(e.request, { ignoreSearch: e.request.mode === "navigate" }).then((hit) => {
      if (hit) return hit;
      if (e.request.mode === "navigate") return caches.match("./index.html");
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});

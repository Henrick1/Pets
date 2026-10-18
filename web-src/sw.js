const CACHE = "pets-__BUILD__";
const ASSETS = __ASSETS__;

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => Promise.all(ASSETS.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req, { cache: "no-cache" })
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./" : req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("./") : undefined))
      )
  );
});

const CACHE_NAME = "invendex-v2-shell-v1"
const OFFLINE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  if (request.url.includes("/api/")) return
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (
            response.ok &&
            new URL(request.url).origin === self.location.origin
          ) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})

self.addEventListener("sync", (event) => {
  if (event.tag === "invendex-outbox-sync") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        for (const client of clients)
          client.postMessage({ type: "SYNC_OUTBOX" })
      }),
    )
  }
})

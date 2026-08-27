const VERSION = "biblioteca-v1"
const STATIC_CACHE = `${VERSION}-static`
const IMAGE_CACHE = `${VERSION}-images`
const PAGE_CACHE = `${VERSION}-pages`

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(["/offline.html"]))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // Navegações: rede primeiro, com fallback offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/offline.html"))
        )
    )
    return
  }

  // Assets estáticos do Next e ícones: cache first
  if (url.origin === self.location.origin) {
    if (
      url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/")
    ) {
      event.respondWith(
        caches.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              const copy = response.clone()
              caches
                .open(STATIC_CACHE)
                .then((cache) => cache.put(request, copy))
              return response
            })
        )
      )
    }
    return
  }

  // Imagens remotas (ex.: capas do Google Books): cache first
  if (request.destination === "image") {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches
              .open(IMAGE_CACHE)
              .then((cache) => cache.put(request, copy))
            return response
          })
      )
    )
  }
})

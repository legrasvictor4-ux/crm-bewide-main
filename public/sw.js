const CACHE_NAME = "bewide-static-v1";
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = ["/", OFFLINE_URL, "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key))))
    )
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { title: "Notification", body: event.data.text() };
  }
  const { title, body, actions = [], data = {} } = payload;
  event.waitUntil(
    self.registration.showNotification(title || "BeWide", {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      actions,
      data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Navigate requests: network first, fallback offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Assets: stale-while-revalidate
  if (request.destination === "style" || request.destination === "script" || request.destination === "font" || request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
        return cached || fetchPromise;
      })
    );
  }
});

/* ADAPT coach dashboard — Web Push service worker. */
/* eslint-disable */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "ADAPT", body: "", data: {} };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_e) {
    if (event.data) payload.body = event.data.text();
  }

  const title = payload.title || "ADAPT";
  const options = {
    body: payload.body || "",
    icon: "/coach-dashboard/favicon.ico",
    badge: "/coach-dashboard/favicon.ico",
    data: payload.data || {},
    tag: (payload.data && payload.data.link) || undefined,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

function buildTargetUrl(link) {
  // Normalize to a single /coach-dashboard prefix regardless of whether the
  // notification payload already includes it. Drops any external origin.
  let path = typeof link === "string" && link.length > 0 ? link : "/";
  try {
    // If absolute, keep only the pathname + search + hash.
    if (/^https?:\/\//i.test(path)) {
      const u = new URL(path);
      path = u.pathname + u.search + u.hash;
    }
  } catch (_e) {}
  if (!path.startsWith("/")) path = "/" + path;
  if (path === "/coach-dashboard" || path.startsWith("/coach-dashboard/")) return path;
  return "/coach-dashboard" + path;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data && event.notification.data.link;
  const targetUrl = buildTargetUrl(link);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to focus an already-open dashboard tab and navigate it.
      for (const client of clientList) {
        try {
          const url = new URL(client.url);
          if (url.pathname.startsWith("/coach-dashboard") && "focus" in client) {
            if ("navigate" in client) {
              return client.navigate(targetUrl).then((c) => (c ? c.focus() : null));
            }
            return client.focus();
          }
        } catch (_e) {}
      }
      // No tab open → open one.
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return null;
    })
  );
});

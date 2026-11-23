// FCM web push without the Firebase SDK: the payload is {notification, data} (ADR 0004).
self.addEventListener("push", (event) => {
  const payload = event.data?.json() ?? {};
  const { title = "", body = "", tag } = payload.notification ?? {};
  event.waitUntil(
    self.registration.showNotification(title, { body, tag, renotify: !!tag, data: payload.data }),
  );
});

// S7: only a same-origin url is opened, anything else falls back to the root.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = URL.parse(event.notification.data?.url ?? "/", self.location.origin);
  const url = target?.origin === self.location.origin ? target.href : self.location.origin + "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((all) => {
      const open = all.find((c) => new URL(c.url).origin === self.location.origin);
      return open ? open.navigate(url).then((c) => c?.focus()) : self.clients.openWindow(url);
    }),
  );
});

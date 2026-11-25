self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Ms nardeen Academy',
    body: 'You have a new academy update!',
    linkTab: 'home',
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = {
        title: parsed.notification?.title || parsed.title || payload.title,
        body: parsed.notification?.body || parsed.body || payload.body,
        linkTab: parsed.data?.linkTab || parsed.linkTab || 'home',
      };
    }
  } catch {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: 'ms-nardeen-academy',
      data: { linkTab: payload.linkTab },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        const client = clients[0];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
      return undefined;
    })
  );
});

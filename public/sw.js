// public/sw.js
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/822/822143.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/822/822143.png',
    vibrate: [200, 100, 200]
  });
});

// Función para enviar notificaciones locales desde el fondo
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'NOTIFY') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/822/822143.png'
    });
  }
});

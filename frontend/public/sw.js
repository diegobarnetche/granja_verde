// Service Worker - Granja Verde PWA
// Nivel 0: Solo instalable, sin cache offline

const CACHE_VERSION = 'v1';

// Evento de instalación
self.addEventListener('install', (event) => {
  console.log('[SW] Instalado');
  self.skipWaiting();
});

// Evento de activación
self.addEventListener('activate', (event) => {
  console.log('[SW] Activado');
  event.waitUntil(clients.claim());
});

// Fetch: pasar todo a la red (sin cache)
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

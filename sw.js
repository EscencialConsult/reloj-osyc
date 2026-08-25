// sw.js — service worker mínimo (habilita "instalar app"). Sin caché offline por ahora.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* red directa */ });

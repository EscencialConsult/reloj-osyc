// sw.js — Service Worker de OSYC para notificaciones push
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} }
  catch (_) { data = { titulo: 'OSYC', cuerpo: event.data ? event.data.text() : '' } }
  const title = data.titulo || 'OSYC'
  const options = {
    body: data.cuerpo || '',
    icon: '/icon-192.png',          // ícono grande a color (logo de la empresa)
    badge: '/badge.png',            // ícono chico monocromo (silueta blanca del logo, transparente)
    vibrate: [120, 60, 120],
    data: { url: data.link || '/' },
    tag: data.tag || undefined,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Si la app ya está abierta: la enfocamos y le pedimos navegar POR DENTRO
    // (sin recargar toda la página, que es lo que trababa el celular).
    for (const c of list) {
      if ('focus' in c) {
        await c.focus()
        c.postMessage({ type: 'navigate', url })
        return
      }
    }
    // Si no había ninguna ventana abierta, abrimos una nueva.
    if (self.clients.openWindow) return self.clients.openWindow(url)
  })())
})

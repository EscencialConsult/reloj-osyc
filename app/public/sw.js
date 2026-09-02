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
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [120, 60, 120],
    data: { url: data.link || '/' },
    tag: data.tag || undefined,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { try { c.navigate(url) } catch (_) {} return c.focus() }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

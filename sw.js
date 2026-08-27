// ============================================================================
// sw.js — Service Worker OSYC  ·  auto-actualización + respaldo offline
// ----------------------------------------------------------------------------
// Estrategia "RED PRIMERO": siempre intenta traer la última versión desde el
// servidor; si el celular no tiene internet, usa la copia guardada en caché.
// Así los empleados nunca quedan con una versión vieja mientras tengan señal.
//
// ⬆️  AL PUBLICAR UNA VERSIÓN NUEVA: subí el número de CACHE_VERSION (de 1 a 2,
//     etc.). Eso hace que TODOS los dispositivos borren el caché viejo y bajen
//     la versión nueva automáticamente. Es lo único que hay que tocar acá.
// ============================================================================

const CACHE_VERSION = 2;                       // ⬅️ subí este número en cada publicación
const CACHE_NAME = 'osyc-cache-v' + CACHE_VERSION;

// 1) Instalar la versión nueva de inmediato (no espera a cerrar pestañas)
self.addEventListener('install', () => self.skipWaiting());

// 2) Al activarse: borra los cachés de versiones anteriores y toma control ya
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// 3) Interceptar pedidos: RED PRIMERO con respaldo de caché
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo manejamos GET del MISMO ORIGEN (la app). Los pedidos a Supabase, al
  // CDN, etc. (otro origen) o los que no son GET van directo a la red.
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      // Pide a la red revalidando contra el servidor (evita versiones viejas).
      const fresh = await fetch(req, { cache: 'no-cache' });
      // Guarda una copia por si después no hay internet.
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (_) {
      // Sin conexión: servimos lo último que quedó guardado.
      const cached = await caches.match(req);
      if (cached) return cached;
      // Si es una navegación y no hay copia, intentamos la pantalla de fichaje.
      if (req.mode === 'navigate') {
        const fallback = await caches.match('fichar.html');
        if (fallback) return fallback;
      }
      throw _;
    }
  })());
});

// src/lib/geo.js — mejor lectura de GPS (igual criterio que el reloj HTML):
// observa unos segundos y se queda con la lectura de menor error (accuracy).
export function bestPosition({ timeout = 9000, desired = 18 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject({ code: 2 }); return }
    let best = null, watchId = null, done = false
    const stop = () => {
      if (watchId != null) { try { navigator.geolocation.clearWatch(watchId) } catch (_) {} }
      clearTimeout(timer)
    }
    const finish = () => { if (done) return; done = true; stop(); best ? resolve(best) : reject({ code: 3 }) }
    const timer = setTimeout(finish, timeout)
    watchId = navigator.geolocation.watchPosition(
      pos => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos
        if (best.coords.accuracy <= desired) finish()
      },
      err => { if (!best) { done = true; stop(); reject(err) } },
      { enableHighAccuracy: true, timeout, maximumAge: 0 }
    )
  })
}

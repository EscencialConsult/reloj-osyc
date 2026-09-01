// src/lib/facial.js — carga el módulo de reconocimiento facial (public/facial.js)
// que ya usa el reloj HTML. Devuelve el objeto global window.Facial.
let _cargando = null

export function cargarFacial() {
  if (window.Facial) return Promise.resolve(window.Facial)
  if (_cargando) return _cargando
  _cargando = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = '/facial.js'
    s.async = true
    s.onload = () => window.Facial ? resolve(window.Facial) : reject(new Error('Facial no disponible'))
    s.onerror = () => { _cargando = null; reject(new Error('No se pudo cargar facial.js')) }
    document.head.appendChild(s)
  })
  return _cargando
}

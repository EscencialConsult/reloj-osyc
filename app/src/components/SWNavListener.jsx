import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Cuando el usuario toca una notificación, el service worker manda un mensaje
// {type:'navigate', url} y acá navegamos por dentro de la app (sin recargar).
export default function SWNavListener() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const fn = (e) => {
      if (e.data && e.data.type === 'navigate' && e.data.url) {
        try { navigate(e.data.url) } catch (_) { window.location.assign(e.data.url) }
      }
    }
    navigator.serviceWorker.addEventListener('message', fn)
    return () => navigator.serviceWorker.removeEventListener('message', fn)
  }, [navigate])
  return null
}

import { useEffect, useState } from 'react'
import { useSession } from '../lib/session.jsx'
import { pushSoportado, estaActivo, activarPush } from '../lib/push'

export default function PushToggle() {
  const { session } = useSession()
  const uid = session?.user?.id
  const [estado, setEstado] = useState('cargando')  // no-soportado | denegado | activo | inactivo
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      if (!pushSoportado()) return setEstado('no-soportado')
      if (Notification.permission === 'denied') return setEstado('denegado')
      setEstado(await estaActivo() ? 'activo' : 'inactivo')
    })()
  }, [])

  async function activar() {
    setBusy(true); setErr('')
    try { await activarPush(uid); setEstado('activo') }
    catch (e) {
      const m = String(e?.message || e)
      // "push service error" = el sistema del celular rechazó la suscripción
      if (/push service|Registration failed|AbortError/i.test(m)) {
        setErr('El celular no pudo registrarse para notificaciones. Probá: usar la app instalada (agregar a pantalla de inicio), tener buena conexión, y permitir notificaciones y "actividad en segundo plano" a la app en los ajustes del teléfono. Después reintentá.')
      } else {
        setErr(m)
      }
    }
    finally { setBusy(false) }
  }

  if (estado === 'cargando') return null
  const wrap = { padding: '10px 14px', borderTop: '1px solid var(--linea)' }
  if (estado === 'no-soportado') return <div className="muted" style={wrap}>Este dispositivo no soporta alertas push.</div>
  if (estado === 'denegado') return <div className="muted" style={wrap}>Notificaciones bloqueadas. Activalas desde los permisos del navegador.</div>

  return (
    <div style={wrap}>
      {estado === 'activo'
        ? <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ok)', fontWeight: 700 }}>✓ Alertas activas en este dispositivo</div>
        : <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={activar} disabled={busy}>
            {busy ? 'Activando…' : '🔔 Activar alertas en este dispositivo'}
          </button>}
      {err && <div className="err-txt" style={{ marginTop: 8, fontSize: 12 }}>{err}</div>}
    </div>
  )
}

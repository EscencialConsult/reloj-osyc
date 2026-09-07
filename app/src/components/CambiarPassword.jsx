import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { Icon } from './icons.jsx'

export default function CambiarPassword({ onClose }) {
  const { session } = useSession()
  const email = session?.user?.email
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [conf, setConf] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)

  async function guardar() {
    setErr('')
    if (nueva.length < 6) { setErr('La contraseña nueva debe tener al menos 6 caracteres.'); return }
    if (nueva !== conf) { setErr('Las contraseñas nuevas no coinciden.'); return }
    setBusy(true)
    // 1) Verificar la contraseña actual
    const { error: e1 } = await supabase.auth.signInWithPassword({ email, password: actual })
    if (e1) { setBusy(false); setErr('La contraseña actual no es correcta.'); return }
    // 2) Cambiarla
    const { error: e2 } = await supabase.auth.updateUser({ password: nueva })
    setBusy(false)
    if (e2) { setErr('No se pudo cambiar: ' + e2.message); return }
    setOk(true)
  }

  return (
    <div className="consent-ov" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card stack" style={{ maxWidth: 380, width: '100%' }}>
        <div className="between"><b>Cambiar mi contraseña</b><button className="btn btn-ghost btn-sm" onClick={onClose}><Icon.X /></button></div>

        {ok ? (
          <>
            <div className="result ok" style={{ marginTop: 0 }}>✓ Contraseña actualizada. La próxima vez ingresá con la nueva.</div>
            <button className="btn btn-primary" onClick={onClose}>Listo</button>
          </>
        ) : (
          <>
            <div><label className="lbl">Contraseña actual</label><input className="inp" type="password" value={actual} onChange={e => setActual(e.target.value)} autoComplete="current-password" /></div>
            <div><label className="lbl">Nueva contraseña</label><input className="inp" type="password" value={nueva} onChange={e => setNueva(e.target.value)} autoComplete="new-password" placeholder="Mínimo 6 caracteres" /></div>
            <div><label className="lbl">Repetir nueva contraseña</label><input className="inp" type="password" value={conf} onChange={e => setConf(e.target.value)} autoComplete="new-password" /></div>
            {err && <div className="err-txt">{err}</div>}
            <button className="btn btn-primary" onClick={guardar} disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button>
          </>
        )}
      </div>
    </div>
  )
}

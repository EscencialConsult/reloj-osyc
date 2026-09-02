import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { Icon } from './icons.jsx'
import PushToggle from './PushToggle.jsx'

function haceCuanto(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'recién'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

// Beep corto con Web Audio (sin archivo) + vibración
let _actx
function alertar() {
  try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]) } catch (_) {}
  try {
    _actx = _actx || new (window.AudioContext || window.webkitAudioContext)()
    if (_actx.state === 'suspended') _actx.resume()
    const t = _actx.currentTime
    const o = _actx.createOscillator(), g = _actx.createGain()
    o.connect(g); g.connect(_actx.destination); o.type = 'sine'
    o.frequency.setValueAtTime(880, t); o.frequency.setValueAtTime(1170, t + 0.12)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
    o.start(t); o.stop(t + 0.42)
  } catch (_) {}
}

export default function Campana() {
  const { session } = useSession()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [abierto, setAbierto] = useState(false)
  const boxRef = useRef(null)
  const uid = session?.user?.id

  const cargar = useCallback(async () => {
    if (!uid) return
    const { data } = await supabase.from('notificaciones')
      .select('*').order('created_at', { ascending: false }).limit(20)
    setItems(data || [])
  }, [uid])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!uid) return
    const ch = supabase.channel('notif-' + uid)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${uid}` },
        payload => { setItems(prev => [payload.new, ...prev].slice(0, 20)); alertar() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [uid])

  useEffect(() => {
    if (!abierto) return
    const fn = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [abierto])

  const noLeidas = items.filter(n => !n.leido).length

  // Marca la notificación como leída y, si viene de un aviso, deja el acuse de recibo
  async function marcarLeida(n) {
    if (!n.leido) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, leido: true } : x))
      await supabase.from('notificaciones').update({ leido: true }).eq('id', n.id)
      if (n.origen_tabla === 'avisos' && n.origen_id) {
        await supabase.from('avisos_lecturas').upsert({ aviso_id: n.origen_id, user_id: uid }, { onConflict: 'aviso_id,user_id' })
      }
    }
  }

  async function abrirNotif(n) {
    setAbierto(false)
    await marcarLeida(n)
    if (n.link) navigate(n.link)
  }

  async function marcarTodas() {
    const noLe = items.filter(n => !n.leido)
    if (!noLe.length) return
    setItems(prev => prev.map(x => ({ ...x, leido: true })))
    await supabase.from('notificaciones').update({ leido: true }).in('id', noLe.map(n => n.id))
    // acuse de recibo de los avisos incluidos
    const avisoIds = noLe.filter(n => n.origen_tabla === 'avisos' && n.origen_id).map(n => n.origen_id)
    for (const aid of avisoIds) await supabase.from('avisos_lecturas').upsert({ aviso_id: aid, user_id: uid }, { onConflict: 'aviso_id,user_id' })
  }

  return (
    <div className="campana" ref={boxRef}>
      <button className="campana-btn" onClick={() => setAbierto(o => !o)} aria-label="Notificaciones">
        <Icon.Bell />
        {noLeidas > 0 && <span className="pill-count campana-badge">{noLeidas}</span>}
      </button>
      {abierto && (
        <div className="campana-panel">
          <div className="between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--linea)' }}>
            <b>Notificaciones</b>
            {noLeidas > 0 && <button className="linklike" onClick={marcarTodas}>Marcar todas</button>}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {items.length === 0 ? <div className="empty" style={{ padding: 24 }}>Sin notificaciones.</div>
              : items.map(n => (
                <div key={n.id} className="campana-item" style={{ background: n.leido ? 'transparent' : 'rgba(44,110,180,.06)' }}>
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                    {!n.leido && <span className="dot" style={{ marginTop: 6, flexShrink: 0 }} />}
                    <button className="campana-txt" onClick={() => abrirNotif(n)}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{n.titulo}</div>
                      {n.cuerpo && <div className="muted campana-cuerpo">{n.cuerpo}</div>}
                      <div className="muted" style={{ fontSize: 11 }}>{haceCuanto(n.created_at)}</div>
                    </button>
                    {!n.leido && (
                      <button className="campana-ok" title="Marcar recibido" onClick={() => marcarLeida(n)}><Icon.Check /></button>
                    )}
                  </div>
                </div>
              ))}
          </div>
          <PushToggle />
        </div>
      )}
    </div>
  )
}

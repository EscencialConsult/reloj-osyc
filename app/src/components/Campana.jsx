import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { Icon } from './icons.jsx'

function haceCuanto(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'recién'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
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

  // Realtime: nuevas notificaciones para este usuario
  useEffect(() => {
    if (!uid) return
    const ch = supabase.channel('notif-' + uid)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${uid}` },
        payload => setItems(prev => [payload.new, ...prev].slice(0, 20)))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [uid])

  // Cerrar al hacer click afuera
  useEffect(() => {
    if (!abierto) return
    const fn = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [abierto])

  const noLeidas = items.filter(n => !n.leido).length

  async function abrirNotif(n) {
    setAbierto(false)
    if (!n.leido) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, leido: true } : x))
      await supabase.from('notificaciones').update({ leido: true }).eq('id', n.id)
    }
    if (n.link) navigate(n.link)
  }

  async function marcarTodas() {
    const ids = items.filter(n => !n.leido).map(n => n.id)
    if (!ids.length) return
    setItems(prev => prev.map(x => ({ ...x, leido: true })))
    await supabase.from('notificaciones').update({ leido: true }).in('id', ids)
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
                <button key={n.id} className="campana-item" onClick={() => abrirNotif(n)} style={{ background: n.leido ? 'transparent' : 'rgba(44,110,180,.06)' }}>
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                    {!n.leido && <span className="dot" style={{ marginTop: 6 }} />}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{n.titulo}</div>
                      {n.cuerpo && <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.cuerpo}</div>}
                      <div className="muted" style={{ fontSize: 11 }}>{haceCuanto(n.created_at)}</div>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

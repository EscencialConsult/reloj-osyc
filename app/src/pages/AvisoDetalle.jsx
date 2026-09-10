import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { Icon } from '../components/icons.jsx'

function paraLabel(av) {
  if (av.destinatarios && av.destinatarios.length) return `${av.destinatarios.length} persona${av.destinatarios.length > 1 ? 's' : ''}`
  if (av.area) return `Área: ${av.area}`
  return 'Todos'
}
const fechaHora = iso => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AvisoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { esAdmin, session, nombre } = useSession()
  const [av, setAv] = useState(null)
  const [recibos, setRecibos] = useState(null)   // { total, leidos:[{nombre,leido_at}] }
  const [resp, setResp] = useState([])
  const [cargando, setCargando] = useState(true)
  const [verRecibos, setVerRecibos] = useState(false)

  const cargar = useCallback(async () => {
    const [{ data: aviso }, { data: rec }, { data: rr }] = await Promise.all([
      supabase.from('avisos').select('*').eq('id', id).maybeSingle(),
      supabase.rpc('avisos_recibos', { p_aviso_id: id }),
      supabase.from('avisos_respuestas').select('*').eq('aviso_id', id).order('created_at', { ascending: true }),
    ])
    setAv(aviso)
    setRecibos(rec && rec.ok ? rec : { total: 0, leidos: [] })
    setResp(rr || [])
    setCargando(false)
  }, [id])
  useEffect(() => { cargar() }, [cargar])

  // Actualización en vivo: cuando entra/cambia una respuesta de este aviso
  useEffect(() => {
    const ch = supabase.channel('resp-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos_respuestas', filter: 'aviso_id=eq.' + id }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, cargar])

  // Agrupar respuestas por persona (hilo)
  const hilos = useMemo(() => {
    const by = new Map()
    for (const r of resp) {
      const k = r.con_user_id || r.user_id
      if (!by.has(k)) by.set(k, { ownerId: k, nombre: null, msgs: [] })
      const h = by.get(k)
      h.msgs.push(r)
      if (r.user_id === k && r.autor_nombre) h.nombre = r.autor_nombre   // nombre del dueño del hilo
    }
    return [...by.values()].map(h => ({ ...h, nombre: h.nombre || h.msgs[0]?.autor_nombre || 'Empleado' }))
  }, [resp])

  if (cargando) return <div className="center-screen" style={{ minHeight: 200 }}><div className="spin" /></div>
  if (!esAdmin) return <div className="empty">Esta vista es solo para administradores.</div>
  if (!av) return <div className="empty">No se encontró el aviso.</div>

  const enviados = recibos?.total || 0
  const recibidos = recibos?.leidos?.length || 0
  const respondieron = hilos.filter(h => h.msgs.some(m => m.user_id === h.ownerId)).length
  const pendientes = Math.max(0, enviados - recibidos)

  return (
    <div className="stack">
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/avisos')}>
        <Icon.Back /> Volver
      </button>

      {/* Indicadores */}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <KPI n={enviados} t="Enviado a" />
        <KPI n={recibidos} t="Recibieron" color="var(--ok)" />
        <KPI n={pendientes} t="Pendientes" color={pendientes ? 'var(--err)' : undefined} />
        <KPI n={respondieron} t="Respondieron" color="var(--azul)" />
      </div>

      {/* El aviso */}
      <div className="card stack">
        <div className="between">
          <b style={{ fontSize: 17 }}>{av.titulo}</b>
          <span className="muted">{fechaHora(av.created_at)}</span>
        </div>
        <div className="muted">Para: {paraLabel(av)}{av.autor_nombre ? ` · por ${av.autor_nombre}` : ''}</div>
        <div style={{ whiteSpace: 'pre-wrap', color: 'var(--tinta-2)' }}>{av.cuerpo}</div>
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setVerRecibos(v => !v)}>
          <Icon.Check /> {verRecibos ? 'Ocultar quiénes recibieron' : `Quiénes recibieron (${recibidos}/${enviados})`}
        </button>
        {verRecibos && (
          <div style={{ padding: '8px 12px', background: 'rgba(44,74,110,.04)', borderRadius: 10 }}>
            {recibidos === 0 ? <span className="muted">Todavía nadie confirmó recepción.</span>
              : recibos.leidos.map((l, i) => (
                <div key={i} className="between" style={{ fontSize: 13, padding: '2px 0' }}>
                  <span>{l.nombre}</span>
                  <span className="muted" style={{ fontSize: 11 }}>{fechaHora(l.leido_at)}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Conversaciones (una por persona que respondió) */}
      <b style={{ fontSize: 14 }}>Respuestas ({hilos.length})</b>
      {hilos.length === 0 ? <div className="empty">Todavía nadie respondió este aviso.</div>
        : hilos.map(h => (
          <Hilo key={h.ownerId} avisoId={id} hilo={h} yo={session.user.id} miNombre={nombre} onEnviado={cargar} />
        ))}
    </div>
  )
}

// Un hilo = conversación entre una persona y la administración
function Hilo({ avisoId, hilo, yo, miNombre, onEnviado }) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function responder() {
    if (!texto.trim()) return
    setEnviando(true)
    const { error } = await supabase.from('avisos_respuestas').insert({
      aviso_id: avisoId, user_id: yo, con_user_id: hilo.ownerId, autor_nombre: miNombre, cuerpo: texto.trim()
    })
    setEnviando(false)
    if (error) { alert('No se pudo enviar: ' + error.message); return }
    setTexto(''); onEnviado()
  }

  return (
    <div className="card stack" style={{ gap: 8 }}>
      <b style={{ fontSize: 13 }}>{hilo.nombre}</b>
      <div className="stack" style={{ gap: 6 }}>
        {hilo.msgs.map(m => {
          const mio = m.user_id !== hilo.ownerId   // lo escribió la administración/autor
          return (
            <div key={m.id} style={{ alignSelf: mio ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{
                background: mio ? 'var(--azul)' : 'rgba(44,74,110,.07)',
                color: mio ? '#fff' : 'var(--tinta)',
                borderRadius: 12, padding: '8px 12px', whiteSpace: 'pre-wrap', fontSize: 14
              }}>{m.cuerpo}</div>
              <div className="muted" style={{ fontSize: 10, textAlign: mio ? 'right' : 'left', marginTop: 2 }}>
                {mio ? (m.autor_nombre || 'Administración') : ''} {fechaHora(m.created_at)}
              </div>
            </div>
          )
        })}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input className="inp grow" value={texto} onChange={e => setTexto(e.target.value)}
          placeholder={`Responder a ${hilo.nombre}…`} onKeyDown={e => e.key === 'Enter' && responder()} />
        <button className="btn btn-primary btn-sm" onClick={responder} disabled={enviando}>{enviando ? '…' : 'Enviar'}</button>
      </div>
    </div>
  )
}

function KPI({ n, t, color }) {
  return (
    <div className="card" style={{ flex: '1 1 90px', padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--azul)' }}>{n}</div>
      <div className="muted" style={{ fontSize: 11 }}>{t}</div>
    </div>
  )
}

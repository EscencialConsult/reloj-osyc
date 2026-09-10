import { useEffect, useState, useCallback } from 'react'
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
  const { esAdmin } = useSession()
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

  if (cargando) return <div className="center-screen" style={{ minHeight: 200 }}><div className="spin" /></div>
  if (!esAdmin) return <div className="empty">Esta vista es solo para administradores.</div>
  if (!av) return <div className="empty">No se encontró el aviso.</div>

  const enviados = recibos?.total || 0
  const recibidos = recibos?.leidos?.length || 0
  const respondieron = new Set(resp.map(r => r.user_id)).size
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
        <button className="linklike" style={{ alignSelf: 'flex-start' }} onClick={() => setVerRecibos(v => !v)}>
          {verRecibos ? 'Ocultar quién recibió' : `Ver quién recibió (${recibidos}/${enviados})`}
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

      {/* Respuestas (tipo chat) */}
      <div className="stack">
        <b style={{ fontSize: 14 }}>Respuestas ({resp.length})</b>
        {resp.length === 0 ? <div className="empty">Todavía nadie respondió este aviso.</div>
          : resp.map(r => (
            <div key={r.id} className="card" style={{ padding: '10px 14px' }}>
              <div className="between">
                <b style={{ fontSize: 13 }}>{r.autor_nombre || 'Empleado'}</b>
                <span className="muted" style={{ fontSize: 11 }}>{fechaHora(r.created_at)}</span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, marginTop: 3 }}>{r.cuerpo}</div>
            </div>
          ))}
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

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { Icon } from '../components/icons.jsx'
import { tipoLabel, fechaCorta } from './Solicitudes.jsx'

export default function SolicitudDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session, esAdmin, nombre } = useSession()
  const [sol, setSol] = useState(null)
  const [coments, setComents] = useState([])
  const [cargando, setCargando] = useState(true)
  const [texto, setTexto] = useState('')
  const [accion, setAccion] = useState(false)

  const cargar = useCallback(async () => {
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from('solicitudes').select('*, personal:personal_id(nombre)').eq('id', id).maybeSingle(),
      supabase.from('solicitud_comentarios').select('*').eq('solicitud_id', id).order('created_at', { ascending: true })
    ])
    setSol(s); setComents(c || []); setCargando(false)
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  async function verAdjunto() {
    const { data, error } = await supabase.storage.from('justificativos').createSignedUrl(sol.adjunto_path, 60)
    if (error) { alert('No se pudo abrir el adjunto'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function comentar() {
    if (!texto.trim()) return
    const cuerpo = texto.trim()
    setTexto('')
    const { error } = await supabase.from('solicitud_comentarios').insert({
      solicitud_id: id, user_id: session.user.id, autor_nombre: nombre, cuerpo
    })
    if (error) { alert('No se pudo comentar: ' + error.message); setTexto(cuerpo); return }
    cargar()
  }

  async function resolver(estado) {
    setAccion(true)
    const { data, error } = await supabase.rpc('resolver_solicitud', {
      p_id: id, p_estado: estado, p_comentario: texto.trim() || null
    })
    setAccion(false)
    if (error || !data?.ok) { alert('No se pudo actualizar: ' + (data?.msg || error?.message || '')); return }
    setTexto('')
    cargar()
  }

  if (cargando) return <div className="center-screen" style={{ minHeight: 200 }}><div className="spin" /></div>
  if (!sol) return <div className="empty">No se encontró la solicitud.</div>

  return (
    <div className="stack">
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/solicitudes')}>
        <Icon.Back /> Volver
      </button>

      <div className="card stack">
        <div className="between">
          <b style={{ fontSize: 17 }}>{tipoLabel(sol.tipo)}</b>
          <span className={'badge ' + sol.estado}>{sol.estado}</span>
        </div>
        {sol.personal?.nombre && <div className="muted">Solicitante: {sol.personal.nombre}</div>}
        {(sol.desde || sol.hasta) && (
          <div className="muted">Fechas: {sol.desde ? fechaCorta(sol.desde) : '—'}{sol.hasta ? ' → ' + fechaCorta(sol.hasta) : ''}</div>
        )}
        {sol.motivo && <div style={{ whiteSpace: 'pre-wrap' }}>{sol.motivo}</div>}
        {sol.adjunto_path && (
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={verAdjunto}>
            <Icon.File /> Ver adjunto
          </button>
        )}
      </div>

      {/* Comentarios */}
      <div className="card stack">
        <b>Comentarios</b>
        {coments.length === 0 && <div className="muted">Sin comentarios todavía.</div>}
        {coments.map(c => (
          <div key={c.id} style={{ borderLeft: '3px solid var(--linea)', paddingLeft: 10 }}>
            <div className="muted"><b style={{ color: 'var(--tinta)' }}>{c.autor_nombre || 'Usuario'}</b> · {new Date(c.created_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{c.cuerpo}</div>
          </div>
        ))}
        <textarea className="inp" value={texto} onChange={e => setTexto(e.target.value)}
          placeholder={esAdmin ? 'Escribí un comentario o el motivo de la decisión…' : 'Escribí un comentario…'} />
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={comentar}>Comentar</button>
      </div>

      {/* Acciones de admin */}
      {esAdmin && sol.estado === 'pendiente' && (
        <div className="card row" style={{ gap: 10 }}>
          <button className="btn btn-ok grow" onClick={() => resolver('aprobado')} disabled={accion}>
            <Icon.Check /> Aprobar
          </button>
          <button className="btn btn-err grow" onClick={() => resolver('rechazado')} disabled={accion}>
            <Icon.X /> Rechazar
          </button>
        </div>
      )}
    </div>
  )
}

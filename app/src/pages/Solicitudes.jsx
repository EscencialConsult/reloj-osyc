import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { Icon } from '../components/icons.jsx'

const TIPOS = [
  { v: 'licencia', t: 'Licencia' },
  { v: 'vacaciones', t: 'Vacaciones' },
  { v: 'certificado', t: 'Certificado médico' },
  { v: 'otro', t: 'Otro' },
]
export const tipoLabel = (v) => (TIPOS.find(x => x.v === v)?.t || v)
export function fechaCorta(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function Solicitudes() {
  const { session, esAdmin } = useSession()
  const [items, setItems] = useState([])
  const [verTodas, setVerTodas] = useState(esAdmin)   // admin arranca viendo todas
  const [cargando, setCargando] = useState(true)
  const [nueva, setNueva] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    let q = supabase.from('solicitudes')
      .select('*, personal:personal_id(nombre)')
      .order('created_at', { ascending: false })
    if (!(esAdmin && verTodas)) q = q.eq('user_id', session.user.id)
    const { data } = await q
    setItems(data || [])
    setCargando(false)
  }, [esAdmin, verTodas, session.user.id])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="stack">
      <div className="between">
        <h2 style={{ fontSize: 18 }}>Solicitudes</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setNueva(v => !v)}>
          <Icon.Plus /> Nueva
        </button>
      </div>

      {nueva && <NuevaSolicitud onCreada={() => { setNueva(false); cargar() }} />}

      {esAdmin && (
        <div className="row">
          <button className={'btn btn-sm ' + (verTodas ? 'btn-primary' : 'btn-ghost')} onClick={() => setVerTodas(true)}>Todas</button>
          <button className={'btn btn-sm ' + (!verTodas ? 'btn-primary' : 'btn-ghost')} onClick={() => setVerTodas(false)}>Solo mías</button>
        </div>
      )}

      {cargando ? <div className="center-screen" style={{ minHeight: 160 }}><div className="spin" /></div>
        : items.length === 0 ? <div className="empty">No hay solicitudes.</div>
          : items.map(s => (
            <Link key={s.id} to={`/solicitudes/${s.id}`} className="card between" style={{ color: 'inherit' }}>
              <div>
                <div className="row">
                  <b>{tipoLabel(s.tipo)}</b>
                  {s.adjunto_path && <Icon.File style={{ width: 15, height: 15, color: 'var(--tinta-2)' }} />}
                </div>
                {(s.desde || s.hasta) && (
                  <div className="muted" style={{ marginTop: 3 }}>
                    {s.desde ? fechaCorta(s.desde) : ''}{s.hasta ? ' → ' + fechaCorta(s.hasta) : ''}
                  </div>
                )}
                {esAdmin && verTodas && s.personal?.nombre && <div className="muted">{s.personal.nombre}</div>}
              </div>
              <span className={'badge ' + s.estado}>{s.estado}</span>
            </Link>
          ))}
    </div>
  )
}

function NuevaSolicitud({ onCreada }) {
  const { session } = useSession()
  const [tipo, setTipo] = useState('licencia')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [motivo, setMotivo] = useState('')
  const [file, setFile] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [err, setErr] = useState('')

  async function enviar() {
    setErr('')
    if (!motivo.trim() && tipo === 'otro') { setErr('Contanos el motivo'); return }
    if (file) {
      const okTipo = /\.(pdf|jpe?g|png)$/i.test(file.name)
      if (!okTipo) { setErr('El adjunto debe ser PDF, JPG o PNG'); return }
      if (file.size > 8 * 1024 * 1024) { setErr('El adjunto no puede superar 8 MB'); return }
    }
    setGuardando(true)
    try {
      let adjunto_path = null
      if (file) {
        const ext = file.name.split('.').pop().toLowerCase()
        adjunto_path = `${session.user.id}/${crypto.randomUUID()}.${ext}`
        const up = await supabase.storage.from('justificativos').upload(adjunto_path, file)
        if (up.error) throw up.error
      }
      // user_id / personal_id / estado los fija el trigger en la base
      const { error } = await supabase.from('solicitudes').insert({
        user_id: session.user.id, tipo,
        desde: desde || null, hasta: hasta || null,
        motivo: motivo.trim() || null, adjunto_path
      })
      if (error) throw error
      onCreada()
    } catch (e) {
      setErr('No se pudo enviar: ' + (e.message || e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="card stack">
      <b>Nueva solicitud</b>
      <div>
        <label className="lbl">Tipo</label>
        <select className="inp" value={tipo} onChange={e => setTipo(e.target.value)}>
          {TIPOS.map(t => <option key={t.v} value={t.v}>{t.t}</option>)}
        </select>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <div className="grow">
          <label className="lbl">Desde</label>
          <input className="inp" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="grow">
          <label className="lbl">Hasta</label>
          <input className="inp" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="lbl">Motivo / detalle</label>
        <textarea className="inp" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Contanos brevemente…" />
      </div>
      <div>
        <label className="lbl">Adjunto (certificado/justificativo) — PDF, JPG o PNG</label>
        <input className="inp" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0] || null)} />
      </div>
      {err && <div className="err-txt">{err}</div>}
      <button className="btn btn-primary" onClick={enviar} disabled={guardando}>
        {guardando ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </div>
  )
}

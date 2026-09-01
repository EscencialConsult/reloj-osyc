import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { getAreas } from '../lib/config'
import { Icon } from '../components/icons.jsx'

function fechaCorta(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}
function paraLabel(av) {
  if (av.destinatarios && av.destinatarios.length) return `${av.destinatarios.length} persona${av.destinatarios.length > 1 ? 's' : ''}`
  if (av.area) return `Área: ${av.area}`
  return 'Todos'
}

export default function Avisos() {
  const { session, esAdmin, nombre } = useSession()
  const [avisos, setAvisos] = useState([])
  const [leidos, setLeidos] = useState(new Set())
  const [abierto, setAbierto] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [{ data: av }, { data: le }] = await Promise.all([
      supabase.from('avisos').select('*').order('created_at', { ascending: false }),
      supabase.from('avisos_lecturas').select('aviso_id').eq('user_id', session.user.id)
    ])
    setAvisos(av || [])
    setLeidos(new Set((le || []).map(x => x.aviso_id)))
    setCargando(false)
  }, [session.user.id])

  useEffect(() => { cargar() }, [cargar])

  async function abrir(av) {
    setAbierto(abierto === av.id ? null : av.id)
    if (!leidos.has(av.id)) {
      setLeidos(prev => new Set(prev).add(av.id))
      await supabase.from('avisos_lecturas').upsert({ aviso_id: av.id, user_id: session.user.id }, { onConflict: 'aviso_id,user_id' })
    }
  }

  if (cargando) return <div className="center-screen" style={{ minHeight: 200 }}><div className="spin" /></div>

  return (
    <div className="stack">
      {esAdmin && <NuevoAviso nombre={nombre} onCreado={cargar} />}

      <h2 style={{ fontSize: 18 }}>Avisos</h2>
      {avisos.length === 0 && <div className="empty">Todavía no hay avisos.</div>}

      {avisos.map(av => {
        const noLeido = !leidos.has(av.id)
        const open = abierto === av.id
        return (
          <div key={av.id} className="card" style={{ cursor: 'pointer', borderColor: noLeido ? 'rgba(44,110,180,.4)' : undefined }} onClick={() => abrir(av)}>
            <div className="between">
              <div className="row">
                {noLeido && <span className="dot" />}
                <b style={{ fontSize: 15 }}>{av.titulo}</b>
              </div>
              <span className="muted">{fechaCorta(av.created_at)}</span>
            </div>
            {esAdmin && <div className="muted" style={{ marginTop: 4 }}>Para: {paraLabel(av)}</div>}
            <div style={{ marginTop: 8, color: 'var(--tinta-2)', fontSize: 14, whiteSpace: 'pre-wrap', maxHeight: open ? 'none' : 40, overflow: 'hidden' }}>
              {av.cuerpo}
            </div>
            {av.autor_nombre && open && <div className="muted" style={{ marginTop: 8 }}>— {av.autor_nombre}</div>}
          </div>
        )
      })}
    </div>
  )
}

function NuevoAviso({ nombre, onCreado }) {
  const { session } = useSession()
  const [abierto, setAbierto] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [modo, setModo] = useState('todos')       // 'todos' | 'area' | 'personas'
  const [area, setArea] = useState('')
  const [sel, setSel] = useState(new Set())        // user_ids elegidos
  const [busca, setBusca] = useState('')
  const [areas, setAreas] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!abierto) return
    getAreas().then(setAreas)
    supabase.from('personal').select('user_id,nombre,area').eq('activo', true).not('user_id', 'is', null).order('nombre')
      .then(({ data }) => setEmpleados(data || []))
  }, [abierto])

  function toggle(uid) { setSel(s => { const n = new Set(s); n.has(uid) ? n.delete(uid) : n.add(uid); return n }) }

  async function publicar() {
    setErr('')
    if (!titulo.trim() || !cuerpo.trim()) { setErr('Completá título y mensaje'); return }
    if (modo === 'area' && !area) { setErr('Elegí un área'); return }
    if (modo === 'personas' && sel.size === 0) { setErr('Elegí al menos una persona'); return }
    setGuardando(true)
    const fila = {
      titulo: titulo.trim(), cuerpo: cuerpo.trim(), autor_id: session.user.id, autor_nombre: nombre,
      area: modo === 'area' ? area : null,
      destinatarios: modo === 'personas' ? [...sel] : null
    }
    const { error } = await supabase.from('avisos').insert(fila)
    setGuardando(false)
    if (error) { setErr('No se pudo publicar: ' + error.message); return }
    setTitulo(''); setCuerpo(''); setModo('todos'); setArea(''); setSel(new Set()); setBusca(''); setAbierto(false)
    onCreado()
  }

  if (!abierto) {
    return <button className="btn btn-primary" onClick={() => setAbierto(true)}><Icon.Plus /> Nuevo aviso</button>
  }

  const filtrados = empleados.filter(e => e.nombre.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="card stack">
      <div className="between"><b>Nuevo aviso</b><button className="btn btn-ghost btn-sm" onClick={() => setAbierto(false)}><Icon.X /></button></div>
      <div>
        <label className="lbl">Título</label>
        <input className="inp" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Cambio de horario" />
      </div>
      <div>
        <label className="lbl">Mensaje</label>
        <textarea className="inp" value={cuerpo} onChange={e => setCuerpo(e.target.value)} placeholder="Escribí el aviso…" />
      </div>

      {/* Destinatario */}
      <div>
        <label className="lbl">¿A quién se lo enviás?</label>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <button className={'btn btn-sm ' + (modo === 'todos' ? 'btn-primary' : 'btn-ghost')} onClick={() => setModo('todos')}>Todos</button>
          <button className={'btn btn-sm ' + (modo === 'area' ? 'btn-primary' : 'btn-ghost')} onClick={() => setModo('area')}>Un área</button>
          <button className={'btn btn-sm ' + (modo === 'personas' ? 'btn-primary' : 'btn-ghost')} onClick={() => setModo('personas')}>Personas</button>
        </div>
      </div>

      {modo === 'area' && (
        <div>
          <label className="lbl">Área</label>
          <select className="inp" value={area} onChange={e => setArea(e.target.value)}>
            <option value="">Elegí un área…</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {areas.length === 0 && <div className="muted" style={{ marginTop: 4 }}>No hay áreas cargadas (Configuración → Áreas).</div>}
        </div>
      )}

      {modo === 'personas' && (
        <div>
          <label className="lbl">Personas ({sel.size} seleccionadas)</label>
          <input className="inp" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nombre…" style={{ marginBottom: 8 }} />
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--linea)', borderRadius: 12 }}>
            {filtrados.length === 0 ? <div className="muted" style={{ padding: 12 }}>Sin empleados con acceso.</div>
              : filtrados.map(e => (
                <label key={e.user_id} className="row" style={{ gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--linea)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sel.has(e.user_id)} onChange={() => toggle(e.user_id)} />
                  <span style={{ flex: 1 }}>{e.nombre}</span>
                  {e.area && e.area !== 'GENERAL' && <span className="muted" style={{ fontSize: 11 }}>{e.area}</span>}
                </label>
              ))}
          </div>
        </div>
      )}

      {err && <div className="err-txt">{err}</div>}
      <button className="btn btn-primary" onClick={publicar} disabled={guardando}>{guardando ? 'Publicando…' : 'Publicar aviso'}</button>
    </div>
  )
}

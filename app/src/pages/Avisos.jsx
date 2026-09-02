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
  const [abiertos, setAbiertos] = useState(new Set())   // avisos con el cuerpo visible
  const [confirmando, setConfirmando] = useState(null)  // aviso a confirmar (empleado)
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

  function toggleAbierto(id) {
    setAbiertos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // Click en el aviso: el admin (o ya leído) solo despliega; el empleado con
  // aviso sin leer pasa por el cartel de confirmación.
  function clickAviso(av) {
    if (esAdmin || leidos.has(av.id)) toggleAbierto(av.id)
    else setConfirmando(av)
  }

  // El empleado confirma → queda registrado como RECIBIDO y se abre el aviso
  async function confirmarRecepcion(av) {
    setLeidos(prev => new Set(prev).add(av.id))
    setAbiertos(prev => new Set(prev).add(av.id))
    setConfirmando(null)
    await supabase.from('avisos_lecturas').upsert({ aviso_id: av.id, user_id: session.user.id }, { onConflict: 'aviso_id,user_id' })
  }

  if (cargando) return <div className="center-screen" style={{ minHeight: 200 }}><div className="spin" /></div>

  return (
    <div className="stack">
      {esAdmin && <NuevoAviso nombre={nombre} onCreado={cargar} />}

      <h2 style={{ fontSize: 18 }}>Avisos</h2>
      {avisos.length === 0 && <div className="empty">Todavía no hay avisos.</div>}

      {avisos.map(av => {
        const noLeido = !leidos.has(av.id)
        const abierto = abiertos.has(av.id)
        const pedirConfirm = noLeido && !esAdmin   // empleado: no muestra el cuerpo hasta confirmar
        return (
          <div key={av.id} className="card" style={{ cursor: 'pointer', borderColor: noLeido ? 'rgba(44,110,180,.4)' : undefined }} onClick={() => clickAviso(av)}>
            <div className="between">
              <div className="row">
                {noLeido && <span className="dot" />}
                <b style={{ fontSize: 15 }}>{av.titulo}</b>
              </div>
              <span className="muted">{fechaCorta(av.created_at)}</span>
            </div>
            {esAdmin && (
              <div className="row" style={{ marginTop: 4, gap: 10, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                <span className="muted">Para: {paraLabel(av)}</span>
                <Recibos avisoId={av.id} />
              </div>
            )}
            {pedirConfirm ? (
              <div className="muted" style={{ marginTop: 8, color: 'var(--azul)', fontWeight: 700 }}>📩 Tocá para leer y confirmar recepción</div>
            ) : (
              <>
                <div style={{ marginTop: 8, color: 'var(--tinta-2)', fontSize: 14, whiteSpace: 'pre-wrap', maxHeight: abierto ? 'none' : 40, overflow: 'hidden' }}>
                  {av.cuerpo}
                </div>
                {av.autor_nombre && abierto && <div className="muted" style={{ marginTop: 8 }}>— {av.autor_nombre}</div>}
              </>
            )}
          </div>
        )
      })}

      {/* Cartel de confirmación de apertura (empleado) */}
      {confirmando && (
        <div className="consent-ov" onClick={e => { if (e.target === e.currentTarget) setConfirmando(null) }}>
          <div className="card stack" style={{ maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>📩</div>
            <b style={{ fontSize: 17 }}>{confirmando.titulo}</b>
            <p className="muted">Al abrir este aviso, queda registrado que lo <b>recibiste</b>. ¿Querés abrirlo ahora?</p>
            <button className="btn btn-primary" onClick={() => confirmarRecepcion(confirmando)}>Abrir y confirmar recepción</button>
            <button className="linklike" onClick={() => setConfirmando(null)}>Ahora no</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Recibos({ avisoId }) {
  const [abierto, setAbierto] = useState(false)
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function toggle() {
    const nuevo = !abierto
    setAbierto(nuevo)
    if (nuevo && !data) {
      setCargando(true)
      const { data: r } = await supabase.rpc('avisos_recibos', { p_aviso_id: avisoId })
      setData(r && r.ok ? r : { total: 0, leidos: [] })
      setCargando(false)
    }
  }
  const n = data ? (data.leidos?.length || 0) : null

  return (
    <>
      <button className="linklike" onClick={toggle}>
        {abierto ? 'Ocultar recibos' : (data ? `Recibido por ${n}/${data.total}` : 'Ver recibos')}
      </button>
      {abierto && (
        <div style={{ flexBasis: '100%', marginTop: 6, padding: '8px 12px', background: 'rgba(44,74,110,.04)', borderRadius: 10 }}>
          {cargando ? <span className="muted">Cargando…</span>
            : !data || data.leidos.length === 0 ? <span className="muted">Todavía nadie lo recibió.</span>
              : (
                <>
                  <div className="muted" style={{ marginBottom: 4 }}>Recibido por {n} de {data.total}:</div>
                  {data.leidos.map((l, i) => (
                    <div key={i} className="row between" style={{ fontSize: 13, padding: '2px 0' }}>
                      <span>{l.nombre}</span>
                      <span className="muted" style={{ fontSize: 11 }}>{new Date(l.leido_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </>
              )}
        </div>
      )}
    </>
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

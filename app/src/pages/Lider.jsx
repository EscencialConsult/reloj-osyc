import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getLunes, getDomingo, today, PERIODOS, getDateRange, fmtDate } from '../lib/fechas'
import { fmtHs, areaColor, calcHs, calcTardVsPlan, calcHsExtra } from '../lib/calculos'
import { logActividad, esFueraDeTerm } from '../lib/audit'
import { DIAS, DIAS_SEM, calcTotRow, filaDesdeGuardado, filaAGuardar, dd, diasArr } from '../lib/horarios'
import { PersonCard, sincronizarRegistros } from './Horarios.jsx'
import { PERMISOS_DEFAULT, liderSolicitudes, liderResolver, liderComentar, liderCrearAviso, liderAvisos } from '../lib/lideres'
import { tipoLabel, fechaCorta } from './Solicitudes.jsx'
import { Icon } from '../components/icons.jsx'

const LS_KEY = 'osyc_lider_sess'

// ¿Estamos dentro de la ventana de carga? Sin config → editable (abierto).
function dentroDeVentana(cfg) {
  if (!cfg) return true
  const ahora = new Date()
  const c = cfg[DIAS_SEM[ahora.getDay()]]
  if (!c?.activo) return false
  if (c.hasta === null || c.hasta === undefined) return true
  return (ahora.getHours() + ahora.getMinutes() / 60) < c.hasta
}

export default function Lider() {
  const [sess, setSess] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch { return null } })
  const [area, setArea] = useState(() => localStorage.getItem(LS_KEY + '_area') || '')

  function login(l) {
    setSess(l); localStorage.setItem(LS_KEY, JSON.stringify(l))
    if (l.areas?.length === 1) elegirArea(l.areas[0])
    else { setArea(''); localStorage.removeItem(LS_KEY + '_area') }
  }
  function elegirArea(a) { setArea(a); localStorage.setItem(LS_KEY + '_area', a) }
  function salir() { setSess(null); setArea(''); localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_KEY + '_area') }

  if (!sess) return <LiderLogin onLogin={login} />
  if (!area) return <SelectorArea sess={sess} onElegir={elegirArea} onSalir={salir} />
  return <PanelLider sess={sess} area={area} onCambiarArea={() => setArea('')} onSalir={salir} />
}

function LiderLogin({ onLogin }) {
  const [u, setU] = useState(''); const [p, setP] = useState('')
  const [err, setErr] = useState(''); const [cargando, setCargando] = useState(false)

  async function entrar(e) {
    e.preventDefault(); setErr(''); setCargando(true)
    const usuario = u.trim().toUpperCase(), pass = p.trim().toUpperCase()
    const { data } = await supabase.from('lideres').select('*').eq('activo', true)
    const l = (data || []).find(x => (x.usuario || '').toUpperCase() === usuario)
    const passOk = l && (pass === (l.password || '').toUpperCase() || pass === usuario)
    setCargando(false)
    if (!l || !passOk) { setErr('Usuario o contraseña incorrectos'); return }
    onLogin({
      usuario: l.usuario, nombre: l.nombre, areas: l.areas || [],
      password: l.password || l.usuario,
      permisos: { ...PERMISOS_DEFAULT, ...(l.permisos || {}) }
    })
  }

  return (
    <div className="center-screen">
      <form className="card stack" style={{ width: '100%', maxWidth: 380 }} onSubmit={entrar}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo.png" alt="OSYC" style={{ maxWidth: '100%', maxHeight: 56, height: 'auto', display: 'block', margin: '0 auto' }} />
          <p className="muted" style={{ marginTop: 8 }}>Líder · Panel de tu área</p>
        </div>
        <div><label className="lbl">Usuario</label><input className="inp" value={u} onChange={e => setU(e.target.value)} placeholder="Tu usuario" /></div>
        <div><label className="lbl">Contraseña</label><input className="inp" type="password" value={p} onChange={e => setP(e.target.value)} /></div>
        {err && <div className="err-txt">{err}</div>}
        <button className="btn btn-primary" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar →'}</button>
        <Link to="/" className="muted" style={{ textAlign: 'center', fontSize: 13 }}>← Volver al inicio</Link>
      </form>
    </div>
  )
}

function SelectorArea({ sess, onElegir, onSalir }) {
  return (
    <div className="center-screen">
      <div className="card stack" style={{ width: '100%', maxWidth: 420 }}>
        <div className="between"><b>Hola, {sess.nombre}</b><button className="btn btn-ghost btn-sm" onClick={onSalir}>Salir</button></div>
        <p className="muted">Elegí el área que vas a gestionar:</p>
        {sess.areas.map(a => (
          <button key={a} className="btn btn-ghost" style={{ justifyContent: 'flex-start', color: areaColor(a, sess.areas), borderLeft: `3px solid ${areaColor(a, sess.areas)}` }} onClick={() => onElegir(a)}>{a}</button>
        ))}
      </div>
    </div>
  )
}

function PanelLider({ sess, area, onCambiarArea, onSalir }) {
  const permisos = { ...PERMISOS_DEFAULT, ...(sess.permisos || {}) }
  const secciones = [
    permisos.horarios && { k: 'horarios', t: 'Horarios' },
    permisos.solicitudes && { k: 'solicitudes', t: 'Solicitudes' },
    permisos.avisos && { k: 'avisos', t: 'Avisos' },
    permisos.informes && { k: 'informes', t: 'Informes' },
  ].filter(Boolean)
  const [sec, setSec] = useState(secciones[0]?.k || null)

  return (
    <div style={{ minHeight: '100%' }}>
      <header className="appbar">
        <div className="inner">
          <span className="row" style={{ gap: 8, alignItems: 'center' }}><img src="/logo.png" alt="OSYC" style={{ height: 24 }} /> <b style={{ color: 'var(--tinta-2)', fontWeight: 800 }}>Líder</b></span>
          <div className="row" style={{ gap: 8 }}>
            <span className="badge pendiente">{area}</span>
            {sess.areas.length > 1 && <button className="btn btn-ghost btn-sm" onClick={onCambiarArea}>Cambiar área</button>}
            <button className="btn btn-ghost btn-sm" onClick={onSalir}><Icon.Logout /> Salir</button>
          </div>
        </div>
      </header>

      <main className="wrap stack">
        <p className="muted">Hola, <b style={{ color: 'var(--tinta)' }}>{sess.nombre}</b> · área <b>{area}</b></p>

        {secciones.length > 1 && (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {secciones.map(s => (
              <button key={s.k} className={'btn btn-sm ' + (sec === s.k ? 'btn-primary' : 'btn-ghost')} onClick={() => setSec(s.k)}>{s.t}</button>
            ))}
          </div>
        )}

        {secciones.length === 0 && <div className="empty">Tu usuario no tiene permisos habilitados. Pedile al administrador que te asigne alguno.</div>}
        {sec === 'horarios' && <LiderHorarios sess={sess} area={area} />}
        {sec === 'solicitudes' && <LiderSolicitudes sess={sess} area={area} />}
        {sec === 'avisos' && <LiderAvisos sess={sess} area={area} />}
        {sec === 'informes' && <LiderInformes area={area} />}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  HORARIOS (lo de siempre)
// ═══════════════════════════════════════════════════════════════════════════
function LiderHorarios({ sess, area }) {
  const [offSem, setOffSem] = useState(1)   // por defecto: semana siguiente
  const semViendo = getLunes(today(), offSem)
  const [editRows, setEditRows] = useState(null)
  const [rowId, setRowId] = useState(null)
  const [antData, setAntData] = useState(null)
  const [ventanaCfg, setVentanaCfg] = useState(null)
  const [ventanaLista, setVentanaLista] = useState(false)
  const [saving, setSaving] = useState(false)
  const fechas = diasArr(semViendo)

  useEffect(() => {
    supabase.from('configuracion').select('valor').eq('id', 'ventana_carga').maybeSingle()
      .then(({ data }) => { setVentanaCfg(data?.valor || null); setVentanaLista(true) })
  }, [])

  const cargar = useCallback(async () => {
    setEditRows(null)
    const [{ data: personal }, { data: existing }, { data: ant }] = await Promise.all([
      supabase.from('personal').select('nombre,rol').eq('activo', true).eq('area', area).order('nombre'),
      supabase.from('horarios_semanales').select('*').eq('area', area).eq('semana_desde', semViendo).maybeSingle(),
      supabase.from('horarios_semanales').select('horarios').eq('area', area).eq('semana_desde', getLunes(semViendo, -1)).maybeSingle()
    ])
    const savedMap = {}; (existing?.horarios || []).forEach(h => savedMap[h.nombre] = h)
    setEditRows((personal || []).map(p => filaDesdeGuardado(p, savedMap[p.nombre])))
    setRowId(existing?.id || null)
    setAntData(ant?.horarios?.length ? ant.horarios : null)
  }, [area, semViendo])
  useEffect(() => { cargar() }, [cargar])

  const editable = ventanaLista && dentroDeVentana(ventanaCfg)
  const update = (i, patch) => setEditRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  function copiarAnterior() {
    if (!antData) return
    const map = {}; antData.forEach(h => map[h.nombre] = h)
    setEditRows(rs => rs.map(r => {
      const a = map[r.nombre]; if (!a) return r
      const nr = { ...r, obs: a.obs || r.obs }
      DIAS.forEach(d => {
        nr[d + '_e'] = a[d]?.e || ''; nr[d + '_s'] = a[d]?.s || ''
        nr[d + '_e2'] = a[d]?.e2 || ''; nr[d + '_s2'] = a[d]?.s2 || ''
        nr[d + '_tipo'] = a[d]?.tipo || 'normal'; nr[d + '_split'] = !!(a[d]?.e2 || a[d]?.s2)
      })
      return nr
    }))
  }

  async function guardar() {
    setSaving(true)
    const horarios = editRows.map(filaAGuardar)
    const payload = { semana_desde: semViendo, semana_hasta: getDomingo(semViendo), area, horarios }
    let error, newId = rowId
    if (rowId) ({ error } = await supabase.from('horarios_semanales').update(payload).eq('id', rowId))
    else { const res = await supabase.from('horarios_semanales').insert(payload).select('id').single(); error = res.error; if (!error) { newId = res.data.id; setRowId(newId) } }
    if (error) { setSaving(false); alert('Error: ' + error.message); return }
    await sincronizarRegistros(area, semViendo, horarios)
    await logActividad(sess.nombre, 'horario_semanal_guardado', area, null,
      `Horario semanal ${rowId ? 'actualizado' : 'creado'} por líder para ${area} — semana ${semViendo}`,
      { semana: semViendo, personas: editRows.length }, esFueraDeTerm(semViendo), 'lider')
    setSaving(false)
    alert('✓ Horarios guardados')
  }

  const total = (editRows || []).reduce((a, r) => a + calcTotRow(r), 0)

  return (
    <>
      <div className="card row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setOffSem(o => o - 1)}>‹</button>
          <span className="badge pendiente" style={{ alignSelf: 'center' }}><Icon.Calendar width={13} height={13} /> {dd(semViendo)} al {dd(getDomingo(semViendo))}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setOffSem(o => o + 1)}>›</button>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className={'btn btn-sm ' + (offSem === 0 ? 'btn-primary' : 'btn-ghost')} onClick={() => setOffSem(0)}>Esta semana</button>
          <button className={'btn btn-sm ' + (offSem === 1 ? 'btn-primary' : 'btn-ghost')} onClick={() => setOffSem(1)}>Siguiente</button>
        </div>
      </div>

      {!editable && ventanaLista && (
        <div className="result err" style={{ marginTop: 0 }}>Fuera del horario de carga habilitado. Podés ver los horarios pero no modificarlos.</div>
      )}

      {editRows === null ? <div className="center-screen" style={{ minHeight: 160 }}><div className="spin" /></div>
        : editRows.length === 0 ? <div className="empty">No hay empleados activos en {area}.</div>
          : (
            <>
              <div className="between">
                <span className="muted">Total del área: <b style={{ color: 'var(--azul)' }}>{total > 0 ? fmtHs(total) : '—'}</b></span>
                {editable && antData && <button className="btn btn-ghost btn-sm" onClick={copiarAnterior}>Copiar semana anterior</button>}
              </div>

              {editable ? (
                <>
                  {editRows.map((r, i) => <PersonCard key={r.nombre} row={r} i={i} fechas={fechas} plantillas={[]} update={update} />)}
                  <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : 'Guardar horarios'}</button>
                </>
              ) : (
                <VistaSoloLectura rows={editRows} fechas={fechas} />
              )}
            </>
          )}
    </>
  )
}

function VistaSoloLectura({ rows }) {
  const cell = (r, d) => {
    const tipo = r[d + '_tipo'] || 'normal'
    if (tipo === 'flex') return 'Flex'; if (tipo === 'guardia') return '1h'; if (tipo === 'licencia') return 'Lic'
    if (!r[d + '_e']) return '—'
    return r[d + '_e'] + (r[d + '_s'] ? '→' + r[d + '_s'] : '') + (r[d + '_e2'] ? ' | ' + r[d + '_e2'] + (r[d + '_s2'] ? '→' + r[d + '_s2'] : '') : '')
  }
  return (
    <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
      <table className="tbl">
        <thead><tr><th>Nombre</th>{DIAS.map(d => <th key={d}>{d.slice(0, 3)}</th>)}<th>Hs</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.nombre}>
              <td style={{ fontWeight: 700 }}>{r.nombre}</td>
              {DIAS.map(d => <td key={d} style={{ fontSize: 12 }}>{cell(r, d)}</td>)}
              <td><span className="badge aprobado">{calcTotRow(r) > 0 ? fmtHs(calcTotRow(r)) : '—'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SOLICITUDES (recibir / responder las de su área)
// ═══════════════════════════════════════════════════════════════════════════
function LiderSolicitudes({ sess, area }) {
  const [items, setItems] = useState(null)
  const [abierta, setAbierta] = useState(null)   // id expandida

  const cargar = useCallback(async () => { setItems(await liderSolicitudes(sess, area)) }, [sess, area])
  useEffect(() => { cargar() }, [cargar])

  if (items === null) return <div className="center-screen" style={{ minHeight: 160 }}><div className="spin" /></div>
  if (items.length === 0) return <div className="empty">No hay solicitudes dirigidas a vos en {area}.</div>

  return (
    <div className="stack">
      {items.map(s => (
        <SolicitudCard key={s.id} s={s} sess={sess}
          abierta={abierta === s.id} onToggle={() => setAbierta(a => a === s.id ? null : s.id)}
          onCambio={cargar} />
      ))}
    </div>
  )
}

function SolicitudCard({ s, sess, abierta, onToggle, onCambio }) {
  const [texto, setTexto] = useState('')
  const [accion, setAccion] = useState(false)

  async function resolver(estado) {
    setAccion(true)
    const r = await liderResolver(sess, s.id, estado, texto.trim() || null)
    setAccion(false)
    if (!r?.ok) { alert('No se pudo actualizar: ' + (r?.msg || '')); return }
    setTexto(''); onCambio()
  }
  async function comentar() {
    if (!texto.trim()) return
    setAccion(true)
    const r = await liderComentar(sess, s.id, texto.trim())
    setAccion(false)
    if (!r?.ok) { alert('No se pudo comentar: ' + (r?.msg || '')); return }
    setTexto(''); alert('Comentario enviado ✓')
  }

  return (
    <div className="card stack">
      <div className="between" style={{ cursor: 'pointer' }} onClick={onToggle}>
        <div>
          <b>{tipoLabel(s.tipo)}</b>
          {s.solicitante && <span className="muted"> · {s.solicitante}</span>}
          {(s.desde || s.hasta) && <div className="muted" style={{ marginTop: 3 }}>{s.desde ? fechaCorta(s.desde) : ''}{s.hasta ? ' → ' + fechaCorta(s.hasta) : ''}</div>}
        </div>
        <span className={'badge ' + s.estado}>{s.estado}</span>
      </div>

      {abierta && (
        <>
          {s.motivo && <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{s.motivo}</div>}
          {s.tiene_adjunto && <div className="muted" style={{ fontSize: 13 }}><Icon.File style={{ width: 14, height: 14, verticalAlign: '-2px' }} /> Adjunto (visible para la administración)</div>}

          <textarea className="inp" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Comentario o motivo de la decisión…" />
          {s.estado === 'pendiente' ? (
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-ok grow" onClick={() => resolver('aprobado')} disabled={accion}><Icon.Check /> Aprobar</button>
              <button className="btn btn-err grow" onClick={() => resolver('rechazado')} disabled={accion}><Icon.X /> Rechazar</button>
              <button className="btn btn-ghost" onClick={comentar} disabled={accion}>Comentar</button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={comentar} disabled={accion}>Comentar</button>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  AVISOS (enviar a su área)
// ═══════════════════════════════════════════════════════════════════════════
function LiderAvisos({ sess, area }) {
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [err, setErr] = useState('')
  const [lista, setLista] = useState(null)

  const cargar = useCallback(async () => { setLista(await liderAvisos(sess, area)) }, [sess, area])
  useEffect(() => { cargar() }, [cargar])

  async function publicar() {
    setErr('')
    if (!titulo.trim() || !cuerpo.trim()) { setErr('Completá título y mensaje'); return }
    setEnviando(true)
    const r = await liderCrearAviso(sess, area, titulo.trim(), cuerpo.trim())
    setEnviando(false)
    if (!r?.ok) { setErr('No se pudo publicar: ' + (r?.msg || '')); return }
    setTitulo(''); setCuerpo(''); cargar()
  }

  return (
    <div className="stack">
      <div className="card stack">
        <b>Nuevo aviso para {area}</b>
        <div><label className="lbl">Título</label><input className="inp" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Cambio de horario" /></div>
        <div><label className="lbl">Mensaje</label><textarea className="inp" value={cuerpo} onChange={e => setCuerpo(e.target.value)} placeholder="Escribí el aviso…" /></div>
        {err && <div className="err-txt">{err}</div>}
        <button className="btn btn-primary" onClick={publicar} disabled={enviando}>{enviando ? 'Publicando…' : 'Publicar aviso'}</button>
      </div>

      <b style={{ fontSize: 14 }}>Avisos de {area}</b>
      {lista === null ? <div className="muted">Cargando…</div>
        : lista.length === 0 ? <div className="empty">Todavía no hay avisos para esta área.</div>
          : lista.map(a => (
            <div key={a.id} className="card">
              <div className="between"><b>{a.titulo}</b><span className="muted">{new Date(a.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span></div>
              <div style={{ marginTop: 6, color: 'var(--tinta-2)', fontSize: 14, whiteSpace: 'pre-wrap' }}>{a.cuerpo}</div>
              {a.autor_nombre && <div className="muted" style={{ marginTop: 6 }}>— {a.autor_nombre}</div>}
            </div>
          ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  INFORMES (solo lectura, de su área)
// ═══════════════════════════════════════════════════════════════════════════
const ESPECIAL = ['Flex', 'Guardia', 'Licencia', 'Vacaciones']
const conPlan = r => r.turno && r.hora_entrada && !ESPECIAL.includes(r.turno) && /^\d{2}:\d{2}$/.test(r.turno.split('→')[0].trim())
const planEnt = r => r.turno.split('→')[0].trim()

function LiderInformes({ area }) {
  const [per, setPer] = useState('semana')
  const [custom, setCustom] = useState({ desde: '', hasta: '' })
  const [dia, setDia] = useState('')
  const [rows, setRows] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    const { desde, hasta } = getDateRange(per, { desde: custom.desde, hasta: custom.hasta, dia })
    let q = supabase.from('registros').select('*').eq('area', area).order('fecha', { ascending: true })
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    const { data } = await q
    setRows(data || [])
    setCargando(false)
  }, [area, per, dia, custom.desde, custom.hasta])
  useEffect(() => { cargar() }, [cargar])

  const kpis = useMemo(() => {
    const withPlan = rows.filter(conPlan)
    const diffs = withPlan.map(r => calcTardVsPlan(planEnt(r), r.hora_entrada.slice(0, 5))).filter(d => d !== null)
    const puntuales = diffs.filter(d => d <= 0).length
    const tardes = diffs.filter(d => d > 0).length
    const prom = diffs.length ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : 0
    const conHs = rows.filter(r => r.hora_entrada && r.hora_salida && !ESPECIAL.includes(r.turno))
    const totHs = conHs.reduce((a, r) => { const h = calcHs(r.hora_entrada.slice(0, 5), r.hora_salida.slice(0, 5)); return h ? a + h : a }, 0)
    return {
      total: rows.length, personas: new Set(rows.map(r => r.nombre)).size,
      prom, puntuales, tardes, hsProm: conHs.length ? fmtHs(totHs / conHs.length) : '—'
    }
  }, [rows])

  const tabla = useMemo(() => {
    const by = {}
    rows.forEach(r => {
      if (!by[r.nombre]) by[r.nombre] = { nombre: r.nombre, registros: 0, puntuales: 0, tardanzas: [], horas: 0, extra: 0 }
      const p = by[r.nombre]; p.registros++
      const h1 = calcHs(r.hora_entrada?.slice(0, 5), r.hora_salida?.slice(0, 5))
      const h2 = calcHs(r.hora_entrada2?.slice(0, 5), r.hora_salida2?.slice(0, 5))
      if (h1 !== null || h2 !== null) p.horas += (h1 || 0) + (h2 || 0)
      if (conPlan(r)) {
        const diff = calcTardVsPlan(planEnt(r), r.hora_entrada.slice(0, 5))
        if (diff !== null) { if (diff <= 0) p.puntuales++; else p.tardanzas.push(diff) }
        const parts = r.turno.split('→')
        if (parts.length >= 2 && r.hora_salida) {
          const planSal = parts[1].trim().slice(0, 5)
          if (/^\d{2}:\d{2}$/.test(planSal)) { const ex = calcHsExtra(planSal, r.hora_salida.slice(0, 5)); if (ex && ex > 0) p.extra += ex }
        }
      }
    })
    return Object.values(by).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [rows])

  return (
    <div className="stack">
      <div className="card stack">
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <div className="grow" style={{ minWidth: 140 }}>
            <label className="lbl">Período</label>
            <select className="inp" value={per} onChange={e => setPer(e.target.value)}>
              {PERIODOS.map(p => <option key={p.v} value={p.v}>{p.t}</option>)}
            </select>
          </div>
        </div>
        {per === 'custom' && (
          <div className="row" style={{ gap: 10 }}>
            <div className="grow"><label className="lbl">Desde</label><input className="inp" type="date" value={custom.desde} onChange={e => setCustom(c => ({ ...c, desde: e.target.value }))} /></div>
            <div className="grow"><label className="lbl">Hasta</label><input className="inp" type="date" value={custom.hasta} onChange={e => setCustom(c => ({ ...c, hasta: e.target.value }))} /></div>
          </div>
        )}
        {per === 'dia_especifico' && <div><label className="lbl">Día</label><input className="inp" type="date" value={dia} onChange={e => setDia(e.target.value)} /></div>}
      </div>

      {cargando ? <div className="center-screen" style={{ minHeight: 160 }}><div className="spin" /></div>
        : (
          <>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <KPI n={kpis.total} t="Registros" />
              <KPI n={kpis.personas} t="Personas" />
              <KPI n={(kpis.prom > 0 ? '+' : '') + kpis.prom + 'm'} t="Tardanza prom." color={kpis.prom > 5 ? 'var(--err)' : 'var(--ok)'} />
              <KPI n={kpis.puntuales} t="Puntuales" color="var(--ok)" />
              <KPI n={kpis.tardes} t="Tardes" color="var(--err)" />
              <KPI n={kpis.hsProm} t="Hs prom." />
            </div>

            {tabla.length === 0 ? <div className="empty">Sin registros en el período.</div>
              : (
                <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                  <table className="tbl">
                    <thead><tr><th>#</th><th>Nombre</th><th>Reg.</th><th>Hs</th><th>Punt.</th><th>Tard.</th><th>Extra</th></tr></thead>
                    <tbody>
                      {tabla.map((p, i) => {
                        const promT = p.tardanzas.length ? Math.round(p.tardanzas.reduce((a, b) => a + b, 0) / p.tardanzas.length) : 0
                        const punt = (p.puntuales + p.tardanzas.length) > 0 ? Math.round(p.puntuales / (p.puntuales + p.tardanzas.length) * 100) + '%' : '—'
                        return (
                          <tr key={p.nombre}>
                            <td style={{ color: 'var(--tinta-2)' }}>{i + 1}</td>
                            <td style={{ fontWeight: 700 }}>{p.nombre}</td>
                            <td style={{ textAlign: 'center' }}>{p.registros}</td>
                            <td style={{ textAlign: 'center' }}><span className="badge aprobado">{p.horas > 0 ? fmtHs(p.horas) : '—'}</span></td>
                            <td style={{ textAlign: 'center' }}>{punt}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: p.tardanzas.length ? 'var(--err)' : 'var(--ok)' }}>{p.tardanzas.length ? '+' + promT + 'm' : '✓'}</td>
                            <td style={{ textAlign: 'center' }}>{p.extra > 0 ? '+' + fmtHs(p.extra / 60) : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </>
        )}
    </div>
  )
}

function KPI({ n, t, color }) {
  return (
    <div className="card" style={{ flex: '1 1 90px', padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || 'var(--azul)' }}>{n}</div>
      <div className="muted" style={{ fontSize: 11 }}>{t}</div>
    </div>
  )
}

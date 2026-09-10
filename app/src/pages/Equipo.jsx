import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { getLunes, getDomingo, today, PERIODOS, getDateRange } from '../lib/fechas'
import { fmtHs, calcHs, calcTardVsPlan, calcHsExtra } from '../lib/calculos'
import { logActividad, esFueraDeTerm } from '../lib/audit'
import { DIAS, DIAS_SEM, calcTotRow, filaDesdeGuardado, filaAGuardar, dd, diasArr } from '../lib/horarios'
import { liderSolicitudes, liderResolver, liderComentar, liderCrearAviso, liderAvisos } from '../lib/lideres'
import { PersonCard, sincronizarRegistros } from './Horarios.jsx'
import { tipoLabel, fechaCorta } from './Solicitudes.jsx'
import { Icon } from '../components/icons.jsx'

// ¿Estamos dentro de la ventana de carga? Sin config → editable (abierto).
function dentroDeVentana(cfg) {
  if (!cfg) return true
  const ahora = new Date()
  const c = cfg[DIAS_SEM[ahora.getDay()]]
  if (!c?.activo) return false
  if (c.hasta === null || c.hasta === undefined) return true
  return (ahora.getHours() + ahora.getMinutes() / 60) < c.hasta
}

export default function Equipo() {
  const { esLider, liderAreas, liderPermisos, nombre } = useSession()
  const [area, setArea] = useState(liderAreas[0] || '')

  const permisos = { horarios: true, solicitudes: false, avisos: false, informes: false, ...(liderPermisos || {}) }
  const secciones = [
    permisos.horarios && { k: 'horarios', t: 'Horarios' },
    permisos.solicitudes && { k: 'solicitudes', t: 'Solicitudes' },
    permisos.avisos && { k: 'avisos', t: 'Avisos' },
    permisos.informes && { k: 'informes', t: 'Informes' },
  ].filter(Boolean)
  const [sec, setSec] = useState(secciones[0]?.k || null)

  if (!esLider) return <div className="empty">Esta sección es solo para líderes.</div>
  if (!area) return <div className="empty">No tenés áreas asignadas. Pedile al administrador que te asigne al menos una.</div>

  return (
    <div className="stack">
      <div className="between">
        <div>
          <h2 style={{ fontSize: 18 }}>Mi equipo</h2>
          <span className="muted">Área: <b style={{ color: 'var(--azul)' }}>{area}</b></span>
        </div>
        {liderAreas.length > 1 && (
          <select className="inp" style={{ maxWidth: 200 }} value={area} onChange={e => setArea(e.target.value)}>
            {liderAreas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      {secciones.length > 1 && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {secciones.map(s => (
            <button key={s.k} className={'btn btn-sm ' + (sec === s.k ? 'btn-primary' : 'btn-ghost')} onClick={() => setSec(s.k)}>{s.t}</button>
          ))}
        </div>
      )}

      {secciones.length === 0 && <div className="empty">Tu usuario no tiene permisos de líder habilitados. Pedile al administrador que te asigne alguno.</div>}
      {sec === 'horarios' && <LiderHorarios nombre={nombre} area={area} />}
      {sec === 'solicitudes' && <LiderSolicitudes area={area} />}
      {sec === 'avisos' && <LiderAvisos area={area} />}
      {sec === 'informes' && <LiderInformes area={area} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  HORARIOS
// ═══════════════════════════════════════════════════════════════════════════
function LiderHorarios({ nombre, area }) {
  const [offSem, setOffSem] = useState(1)   // por defecto: semana siguiente
  const semViendo = getLunes(today(), offSem)
  const [editRows, setEditRows] = useState(null)
  const [rowId, setRowId] = useState(null)
  const [antData, setAntData] = useState(null)
  const [ventanaCfg, setVentanaCfg] = useState(null)
  const [ventanaLista, setVentanaLista] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)     // { tipo: 'ok'|'err', txt }
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
    setSaving(true); setMsg(null)
    const horarios = editRows.map(filaAGuardar)
    const payload = { semana_desde: semViendo, semana_hasta: getDomingo(semViendo), area, horarios }
    let error, newId = rowId
    if (rowId) ({ error } = await supabase.from('horarios_semanales').update(payload).eq('id', rowId))
    else { const res = await supabase.from('horarios_semanales').insert(payload).select('id').single(); error = res.error; if (!error) { newId = res.data.id; setRowId(newId) } }
    if (error) { setSaving(false); setMsg({ tipo: 'err', txt: 'Error: ' + error.message }); return }
    await sincronizarRegistros(area, semViendo, horarios)
    await logActividad(nombre, 'horario_semanal_guardado', area, null,
      `Horario semanal ${rowId ? 'actualizado' : 'creado'} por líder para ${area} — semana ${semViendo}`,
      { semana: semViendo, personas: editRows.length }, esFueraDeTerm(semViendo), 'lider')
    setSaving(false)
    setMsg({ tipo: 'ok', txt: '✓ Horarios guardados' }); setTimeout(() => setMsg(null), 3000)
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
                  {msg && <div className={msg.tipo === 'ok' ? 'result ok' : 'err-txt'} style={{ marginTop: 0 }}>{msg.txt}</div>}
                  <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : 'Guardar horarios'}</button>
                </>
              ) : (
                <VistaSoloLectura rows={editRows} />
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
function LiderSolicitudes({ area }) {
  const [items, setItems] = useState(null)
  const [abierta, setAbierta] = useState(null)

  const cargar = useCallback(async () => { setItems(await liderSolicitudes(area)) }, [area])
  useEffect(() => { cargar() }, [cargar])

  if (items === null) return <div className="center-screen" style={{ minHeight: 160 }}><div className="spin" /></div>
  if (items.length === 0) return <div className="empty">No hay solicitudes dirigidas a vos en {area}.</div>

  return (
    <div className="stack">
      {items.map(s => (
        <SolicitudCard key={s.id} s={s}
          abierta={abierta === s.id} onToggle={() => setAbierta(a => a === s.id ? null : s.id)}
          onCambio={cargar} />
      ))}
    </div>
  )
}

function SolicitudCard({ s, abierta, onToggle, onCambio }) {
  const [texto, setTexto] = useState('')
  const [accion, setAccion] = useState(false)
  const [msg, setMsg] = useState(null)

  function avisar(tipo, txt) { setMsg({ tipo, txt }); if (tipo === 'ok') setTimeout(() => setMsg(null), 3000) }

  async function resolver(estado) {
    setAccion(true); setMsg(null)
    const r = await liderResolver(s.id, estado, texto.trim() || null)
    setAccion(false)
    if (!r?.ok) { avisar('err', 'No se pudo actualizar: ' + (r?.msg || '')); return }
    setTexto(''); onCambio()
  }
  async function comentar() {
    if (!texto.trim()) return
    setAccion(true); setMsg(null)
    const r = await liderComentar(s.id, texto.trim())
    setAccion(false)
    if (!r?.ok) { avisar('err', 'No se pudo comentar: ' + (r?.msg || '')); return }
    setTexto(''); avisar('ok', 'Comentario enviado ✓')
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
          {msg && <div className={msg.tipo === 'ok' ? 'result ok' : 'err-txt'} style={{ marginTop: 0 }}>{msg.txt}</div>}
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
function LiderAvisos({ area }) {
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState(null)
  const [lista, setLista] = useState(null)

  const cargar = useCallback(async () => { setLista(await liderAvisos(area)) }, [area])
  useEffect(() => { cargar() }, [cargar])

  async function publicar() {
    setMsg(null)
    if (!titulo.trim() || !cuerpo.trim()) { setMsg({ tipo: 'err', txt: 'Completá título y mensaje' }); return }
    setEnviando(true)
    const r = await liderCrearAviso(area, titulo.trim(), cuerpo.trim())
    setEnviando(false)
    if (!r?.ok) { setMsg({ tipo: 'err', txt: 'No se pudo publicar: ' + (r?.msg || '') }); return }
    setTitulo(''); setCuerpo(''); setMsg({ tipo: 'ok', txt: '✓ Aviso publicado' }); setTimeout(() => setMsg(null), 3000); cargar()
  }

  return (
    <div className="stack">
      <div className="card stack">
        <b>Nuevo aviso para {area}</b>
        <div><label className="lbl">Título</label><input className="inp" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Cambio de horario" /></div>
        <div><label className="lbl">Mensaje</label><textarea className="inp" value={cuerpo} onChange={e => setCuerpo(e.target.value)} placeholder="Escribí el aviso…" /></div>
        {msg && <div className={msg.tipo === 'ok' ? 'result ok' : 'err-txt'} style={{ marginTop: 0 }}>{msg.txt}</div>}
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

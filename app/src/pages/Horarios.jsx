import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { getLunes, getDomingo, today } from '../lib/fechas'
import { fmtHs, areaColor } from '../lib/calculos'
import { getFeatures, getAreas, getPlantillas } from '../lib/config'
import { logActividad, esFueraDeTerm } from '../lib/audit'
import {
  DIAS, DIA_CORTO, DIAS_SEM, normHora, calcTotRow, flatPersonas,
  filaDesdeGuardado, filaAGuardar, turnoDeDia, ddCorto, dd, diasArr
} from '../lib/horarios'
import { Icon } from '../components/icons.jsx'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export default function Horarios() {
  const { esAdmin, nombre } = useSession()
  const semActual = getLunes(today(), 0)
  const [semViendo, setSemViendo] = useState(semActual)
  const [usaAreas, setUsaAreas] = useState(false)
  const [areas, setAreas] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editorArea, setEditorArea] = useState(null)

  // Config (una vez)
  useEffect(() => {
    Promise.all([getFeatures(), getAreas(), getPlantillas()]).then(([f, a, p]) => {
      setUsaAreas(!!f.usa_areas && a.length > 0); setAreas(a); setPlantillas(p)
    })
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data: hs } = await supabase.from('horarios_semanales').select('*').eq('semana_desde', semViendo).order('area')
    setRows(hs || []); setLoading(false)
  }, [semViendo])
  useEffect(() => { cargar() }, [cargar])

  const personas = flatPersonas(rows)
  const totalHs = personas.reduce((a, p) => a + (p.vacaciones ? (p.vacaciones_hs || 0) : calcTotRow(p)), 0)
  const especiales = personas.filter(p => DIAS.some(d => ['flex', 'guardia', 'licencia'].includes(p[d + '_tipo']))).length

  const grupos = usaAreas ? [...areas, 'GENERAL'] : ['GENERAL']

  // Navegación de semanas (mismos límites que el original: -4 a +1)
  const limAnt = getLunes(semActual, -4), limPost = getLunes(semActual, 1)
  function mover(dir) {
    const nueva = getLunes(semViendo, dir)
    if (dir < 0 && nueva < limAnt) return
    if (dir > 0 && nueva > limPost) return
    setSemViendo(nueva)
  }
  const semD = new Date(semViendo + 'T12:00:00'), semH = new Date(getDomingo(semViendo) + 'T12:00:00')
  const label = `${semD.getDate()} al ${semH.getDate()} de ${MESES[semH.getMonth()]} ${semH.getFullYear()}`

  function exportCSV() {
    if (!personas.length) return
    const cols = ['Área', 'Nombre', 'Rol', ...DIAS.flatMap(d => [`${d} Tipo`, `${d} E`, `${d} S`, `${d} E2`, `${d} S2`]), 'Hs/sem', 'Obs. persona', 'Obs. área']
    const lines = [cols.join(',')]
    personas.forEach(p => {
      lines.push(['"' + p.area + '"', '"' + p.nombre + '"', '"' + p.rol + '"',
        ...DIAS.flatMap(d => ['"' + (p[d + '_tipo'] || 'normal') + '"', '"' + (p[d + '_e'] || '') + '"', '"' + (p[d + '_s'] || '') + '"', '"' + (p[d + '_e2'] || '') + '"', '"' + (p[d + '_s2'] || '') + '"']),
        calcTotRow(p).toFixed(2), '"' + (p.obs || '') + '"', '"' + (p.obsArea || '') + '"'].join(','))
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' }))
    a.download = `OSYC_horarios_${semViendo}.csv`; a.click()
  }

  function descargarImagen() {
    if (!personas.length) return
    const DLAN = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const fd = (e, s, tipo) => tipo === 'flex' ? 'Flex' : tipo === 'guardia' ? '1h' : tipo === 'licencia' ? 'Licencia' : (!e ? '—' : (s ? `${e}→${s}` : e))
    const filas = personas.map(p => ({
      area: p.area, nombre: p.nombre, hs: (calcTotRow(p) > 0 ? fmtHs(calcTotRow(p)) : '—'), obs: p.obs || '',
      dias: DIAS.map(d => { let t = fd(p[d + '_e'], p[d + '_s'], p[d + '_tipo']); if (p[d + '_e2']) t += ` / ${fd(p[d + '_e2'], p[d + '_s2'], 'normal')}`; return t })
    }))
    const colW = 108, col0 = 88, col1 = 155, colHs = 56, colObs = 130, rowH = 34, headH = 42, pad = 18
    const totalW = pad * 2 + col0 + col1 + colW * 7 + colHs + colObs
    const totalH = pad * 2 + headH * 2 + rowH * filas.length + 46
    const canvas = document.createElement('canvas'); const scale = 2
    canvas.width = totalW * scale; canvas.height = totalH * scale
    const ctx = canvas.getContext('2d'); ctx.scale(scale, scale)
    ctx.fillStyle = '#f4f7fb'; ctx.fillRect(0, 0, totalW, totalH)
    ctx.fillStyle = '#1e2f45'; ctx.font = 'bold 14px "Segoe UI",sans-serif'
    ctx.fillText(`OSYC · Semana ${dd(semViendo)} al ${dd(getDomingo(semViendo))}`, pad, pad + 14)
    const hY = pad + headH
    const cols = [{ lbl: 'ÁREA', x: pad }, { lbl: 'NOMBRE', x: pad + col0 }, ...DLAN.map((d, i) => ({ lbl: d, x: pad + col0 + col1 + colW * i })), { lbl: 'HS', x: pad + col0 + col1 + colW * 7 }, { lbl: 'OBS', x: pad + col0 + col1 + colW * 7 + colHs }]
    ctx.fillStyle = 'rgba(44,74,110,.06)'; ctx.fillRect(pad, hY - rowH + 6, totalW - pad * 2, rowH)
    ctx.fillStyle = 'rgba(30,47,69,.45)'; ctx.font = 'bold 10px "Segoe UI",sans-serif'
    cols.forEach(c => ctx.fillText(c.lbl, c.x + 7, hY - 8))
    filas.forEach((row, ri) => {
      const y = hY + 3 + rowH * ri
      if (ri % 2 === 0) { ctx.fillStyle = 'rgba(44,74,110,.02)'; ctx.fillRect(pad, y, totalW - pad * 2, rowH) }
      ctx.fillStyle = '#5b6b80'; ctx.font = 'bold 10px "Segoe UI",sans-serif'; ctx.fillText((row.area || '').split(' ')[0], pad + 7, y + rowH * .62)
      ctx.fillStyle = '#1e2f45'; ctx.font = 'bold 12px "Segoe UI",sans-serif'; ctx.fillText(row.nombre, pad + col0 + 7, y + rowH * .62)
      ctx.font = '11px "Segoe UI",sans-serif'
      row.dias.forEach((txt, di) => { ctx.fillStyle = txt === '—' ? 'rgba(30,47,69,.25)' : '#2c6eb4'; ctx.fillText(txt, pad + col0 + col1 + colW * di + 7, y + rowH * .62) })
      ctx.fillStyle = '#2c6eb4'; ctx.font = 'bold 11px "Segoe UI",sans-serif'; ctx.fillText(row.hs, pad + col0 + col1 + colW * 7 + 7, y + rowH * .62)
      if (row.obs) { ctx.fillStyle = 'rgba(30,47,69,.5)'; ctx.font = '10px "Segoe UI",sans-serif'; ctx.fillText(row.obs.length > 18 ? row.obs.slice(0, 18) + '…' : row.obs, pad + col0 + col1 + colW * 7 + colHs + 7, y + rowH * .62) }
    })
    const a = document.createElement('a'); a.download = `OSYC_horarios_${semViendo}.png`; a.href = canvas.toDataURL('image/png'); a.click()
  }

  if (!esAdmin) return <div className="empty">Esta sección es solo para administradores.</div>

  return (
    <div className="stack">
      <div className="between">
        <h2 style={{ fontSize: 18 }}>Horarios semanales</h2>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={descargarImagen}>Imagen</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <KPI n={personas.length} t="Personas" />
        <KPI n={new Set(personas.map(p => p.area)).size} t="Áreas" />
        <KPI n={totalHs > 0 ? fmtHs(totalHs) : '—'} t="Hs total" />
        <KPI n={especiales || '—'} t="Especiales" />
      </div>

      {/* Nav de semanas */}
      <div className="card row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <button className={'btn btn-sm ' + (semViendo === semActual ? 'btn-primary' : 'btn-ghost')} onClick={() => setSemViendo(semActual)}>Esta semana</button>
          <button className={'btn btn-sm ' + (semViendo === getLunes(semActual, -1) ? 'btn-primary' : 'btn-ghost')} onClick={() => setSemViendo(getLunes(semActual, -1))}>← Anterior</button>
          <button className="btn btn-ghost btn-sm" onClick={() => mover(-1)} disabled={semViendo <= limAnt}>‹</button>
          <span className="badge pendiente" style={{ alignSelf: 'center' }}><Icon.Calendar width={13} height={13} /> {label}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => mover(1)} disabled={semViendo >= limPost}>›</button>
        </div>
        <input className="inp" type="date" style={{ maxWidth: 160 }} onChange={e => e.target.value && setSemViendo(getLunes(e.target.value, 0))} />
      </div>

      {loading ? <div className="center-screen" style={{ minHeight: 160 }}><div className="spin" /></div>
        : usaAreas ? (
          <div className="mod-grid">
            {grupos.map(area => {
              const row = rows.find(r => r.area === area)
              const ps = row ? flatPersonas([row]) : []
              const tot = ps.reduce((a, p) => a + calcTotRow(p), 0)
              const col = area === 'GENERAL' ? '#5b6b80' : areaColor(area, areas)
              return (
                <button key={area} className="mod-card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setEditorArea(area)}>
                  <div className="between">
                    <b style={{ color: col }}>{area === 'GENERAL' ? 'Sin área asignada' : area}</b>
                    <span className={'badge ' + (row ? 'aprobado' : 'rechazado')}>{row ? `✓ ${ps.length}` : 'Sin cargar'}</span>
                  </div>
                  {row && <div className="muted">Total: <b style={{ color: 'var(--azul)' }}>{fmtHs(tot)}</b></div>}
                  <div className="muted" style={{ fontSize: 11 }}>Tocá para {row ? 'editar' : 'cargar'} →</div>
                </button>
              )
            })}
          </div>
        ) : (
          <EditorHorario area="GENERAL" semViendo={semViendo} plantillas={plantillas} adminNombre={nombre} inline onSaved={cargar} />
        )}

      {editorArea && (
        <EditorHorario area={editorArea} semViendo={semViendo} plantillas={plantillas} adminNombre={nombre}
          onClose={() => setEditorArea(null)} onSaved={() => { setEditorArea(null); cargar() }} />
      )}
    </div>
  )
}

function KPI({ n, t }) {
  return (
    <div className="card" style={{ flex: '1 1 70px', padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--azul)' }}>{n}</div>
      <div className="muted" style={{ fontSize: 11 }}>{t}</div>
    </div>
  )
}

// ── EDITOR de un área/semana ────────────────────────────────────────────────
function EditorHorario({ area, semViendo, plantillas, adminNombre, inline, onClose, onSaved }) {
  const [editRows, setEditRows] = useState(null)
  const [rowId, setRowId] = useState(null)
  const [areaObs, setAreaObs] = useState('')
  const [antData, setAntData] = useState(null)
  const [saving, setSaving] = useState(false)
  const fechas = diasArr(semViendo)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const usaAreas = area !== 'GENERAL'
      let q = supabase.from('personal').select('nombre,rol').eq('activo', true)
      if (usaAreas) q = q.eq('area', area)
      const [{ data: personal }, { data: existing }, { data: ant }] = await Promise.all([
        q.order('nombre'),
        supabase.from('horarios_semanales').select('*').eq('area', area).eq('semana_desde', semViendo).maybeSingle(),
        supabase.from('horarios_semanales').select('horarios').eq('area', area).eq('semana_desde', getLunes(semViendo, -1)).maybeSingle()
      ])
      if (!vivo) return
      const savedMap = {}; (existing?.horarios || []).forEach(h => savedMap[h.nombre] = h)
      setEditRows((personal || []).map(p => filaDesdeGuardado(p, savedMap[p.nombre])))
      setRowId(existing?.id || null)
      setAreaObs(existing?.observaciones || '')
      setAntData(ant?.horarios?.length ? ant.horarios : null)
    })()
    return () => { vivo = false }
  }, [area, semViendo])

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
    const payload = { semana_desde: semViendo, semana_hasta: getDomingo(semViendo), area, observaciones: areaObs.trim() || null, horarios }
    let error, newId = rowId
    if (rowId) ({ error } = await supabase.from('horarios_semanales').update(payload).eq('id', rowId))
    else { const res = await supabase.from('horarios_semanales').insert(payload).select('id').single(); error = res.error; if (!error) { newId = res.data.id; setRowId(newId) } }
    if (error) { setSaving(false); alert('Error: ' + error.message); return }

    await sincronizarRegistros(area, semViendo, horarios)
    await logActividad(adminNombre, 'horario_semanal_guardado', area, null,
      `Horario semanal ${rowId ? 'actualizado' : 'creado'} para ${area} — semana ${semViendo}`,
      { semana: semViendo, personas: editRows.length }, esFueraDeTerm(semViendo))
    setSaving(false)
    onSaved && onSaved()
  }

  async function eliminar() {
    if (!rowId) return
    if (!window.confirm(`¿Eliminar los horarios de "${area}" para esta semana?`)) return
    const { error } = await supabase.from('horarios_semanales').delete().eq('id', rowId)
    if (error) { alert('Error'); return }
    await logActividad(adminNombre, 'horario_semanal_eliminado', area, null, `Horario semanal eliminado para ${area} — semana ${semViendo}`, { semana: semViendo }, esFueraDeTerm(semViendo))
    onSaved && onSaved()
  }

  const titulo = area === 'GENERAL' ? 'Todos los empleados' : area
  const contenido = (
    <div className="card stack" style={inline ? {} : { maxWidth: 760, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
      <div className="between">
        <b style={{ fontSize: 16 }}>{titulo} <span className="muted" style={{ fontWeight: 400 }}>· {dd(semViendo)} al {dd(getDomingo(semViendo))}</span></b>
        {!inline && <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon.X /></button>}
      </div>
      {editRows === null ? <div className="center-screen" style={{ minHeight: 120 }}><div className="spin" /></div>
        : editRows.length === 0 ? <div className="empty">No hay empleados activos en este grupo. Cargalos en Personal.</div>
          : (
            <>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {antData && <button className="btn btn-ghost btn-sm" onClick={copiarAnterior}>Copiar semana anterior</button>}
              </div>
              {editRows.map((r, i) => (
                <PersonCard key={r.nombre} row={r} i={i} fechas={fechas} plantillas={plantillas} update={update} />
              ))}
              <div>
                <label className="lbl">Observación del área</label>
                <input className="inp" value={areaObs} onChange={e => setAreaObs(e.target.value)} placeholder="Opcional…" />
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-primary grow" onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                {rowId && <button className="btn btn-err btn-sm" onClick={eliminar}>Eliminar semana</button>}
              </div>
            </>
          )}
    </div>
  )

  if (inline) return contenido
  return <div className="consent-ov" onClick={e => { if (e.target === e.currentTarget) onClose() }}>{contenido}</div>
}

// ── Tarjeta de una persona: quick-fill + grilla de 7 días ───────────────────
export function PersonCard({ row, i, fechas, plantillas, update }) {
  const [chips, setChips] = useState(() => new Set([0, 1, 2, 3, 4]))
  const [qe, setQe] = useState(''); const [qs, setQs] = useState('')
  const [tpl, setTpl] = useState('')
  const tot = calcTotRow(row)

  const toggleChip = di => setChips(s => { const n = new Set(s); n.has(di) ? n.delete(di) : n.add(di); return n })

  function aplicar() {
    const e = normHora(qe), s = normHora(qs)
    if (!e) { alert('Ingresá la hora de entrada'); return }
    if (!chips.size) { alert('Elegí al menos un día'); return }
    const patch = {}
    DIAS.forEach((d, di) => { if (chips.has(di)) { patch[d + '_tipo'] = 'normal'; patch[d + '_e'] = e; patch[d + '_s'] = s; patch[d + '_e2'] = ''; patch[d + '_s2'] = ''; patch[d + '_split'] = false } })
    update(i, patch)
  }
  function aplicarPlantilla() {
    const t = plantillas[parseInt(tpl, 10)]
    if (!t) { alert('Elegí una plantilla'); return }
    if (!chips.size) { alert('Elegí al menos un día'); return }
    const patch = {}
    DIAS.forEach((d, di) => {
      if (!chips.has(di)) return
      patch[d + '_tipo'] = 'normal'; patch[d + '_e'] = t.e || ''; patch[d + '_s'] = t.s || ''
      if (t.e2) { patch[d + '_e2'] = t.e2; patch[d + '_s2'] = t.s2 || ''; patch[d + '_split'] = true }
      else { patch[d + '_e2'] = ''; patch[d + '_s2'] = ''; patch[d + '_split'] = false }
    })
    update(i, patch)
  }
  function setTipo(d, tipo) {
    const patch = { [d + '_tipo']: tipo }
    if (tipo !== 'normal') { patch[d + '_e'] = ''; patch[d + '_s'] = ''; patch[d + '_e2'] = ''; patch[d + '_s2'] = ''; patch[d + '_split'] = false }
    update(i, patch)
  }
  function toggleSplit(d) {
    if (row[d + '_split']) update(i, { [d + '_split']: false, [d + '_e2']: '', [d + '_s2']: '' })
    else update(i, { [d + '_split']: true })
  }

  return (
    <div className="hc-card">
      <div className="hc-head">
        <div><b>{row.nombre}</b> <span className="muted" style={{ fontSize: 11 }}>{row.rol}</span></div>
        <div className="row" style={{ gap: 8 }}>
          <button className={'btn btn-sm ' + (row.vacaciones ? 'btn-ok' : 'btn-ghost')} onClick={() => update(i, { vacaciones: !row.vacaciones })}>Vac.</button>
          <span style={{ fontWeight: 800, color: 'var(--azul)' }}>{tot > 0 ? fmtHs(tot) : '—'}</span>
        </div>
      </div>

      {row.vacaciones ? (
        <div className="result ok" style={{ marginTop: 0 }}>Semana de vacaciones</div>
      ) : (
        <>
          {/* Quick-fill */}
          <div className="hc-tpl">
            <span className="muted" style={{ fontWeight: 800 }}>Días:</span>
            {DIAS.map((d, di) => (
              <button key={d} type="button" className={'hc-daychip' + (chips.has(di) ? ' on' : '')} onClick={() => toggleChip(di)}>{DIA_CORTO[d]}</button>
            ))}
            <input className="inp" style={{ width: 64, minHeight: 34 }} value={qe} onChange={e => setQe(e.target.value)} placeholder="09:00" />
            <span>→</span>
            <input className="inp" style={{ width: 64, minHeight: 34 }} value={qs} onChange={e => setQs(e.target.value)} placeholder="17:00" />
            <button className="btn btn-primary btn-sm" onClick={aplicar}>Aplicar</button>
            {plantillas.length > 0 && (
              <>
                <select className="inp" style={{ maxWidth: 150, minHeight: 34 }} value={tpl} onChange={e => setTpl(e.target.value)}>
                  <option value="">Plantilla…</option>
                  {plantillas.map((t, ti) => <option key={ti} value={ti}>{t.nombre}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={aplicarPlantilla}>Aplicar</button>
              </>
            )}
          </div>

          {/* Grilla 7 días */}
          <div className="hc-grid">
            {DIAS.map((d, di) => {
              const tipo = row[d + '_tipo'] || 'normal'
              const split = !!(row[d + '_split'] || row[d + '_e2'] || row[d + '_s2'])
              return (
                <div key={d} className="hc-col">
                  <div className="hc-day">{DIA_CORTO[d]} <span className="hc-date">{ddCorto(fechas[di])}</span></div>
                  <select className="hc-tipo" value={tipo} onChange={e => setTipo(d, e.target.value)}>
                    <option value="normal">Fijo</option><option value="flex">Flex</option>
                    <option value="guardia">Guardia</option><option value="licencia">Licencia</option>
                  </select>
                  {tipo === 'normal' ? (
                    <>
                      <input className="ht-edit" maxLength={5} placeholder="—" value={row[d + '_e']} onChange={e => update(i, { [d + '_e']: e.target.value })} onBlur={e => update(i, { [d + '_e']: normHora(e.target.value) })} />
                      <input className="ht-edit" maxLength={5} placeholder="—" value={row[d + '_s']} onChange={e => update(i, { [d + '_s']: e.target.value })} onBlur={e => update(i, { [d + '_s']: normHora(e.target.value) })} />
                      {split && <>
                        <input className="ht-edit ht-gold" maxLength={5} placeholder="2°e" value={row[d + '_e2']} onChange={e => update(i, { [d + '_e2']: e.target.value })} onBlur={e => update(i, { [d + '_e2']: normHora(e.target.value) })} />
                        <input className="ht-edit ht-gold" maxLength={5} placeholder="2°s" value={row[d + '_s2']} onChange={e => update(i, { [d + '_s2']: e.target.value })} onBlur={e => update(i, { [d + '_s2']: normHora(e.target.value) })} />
                      </>}
                      <button className={'hc-split' + (split ? ' on' : '')} onClick={() => toggleSplit(d)}>2°</button>
                    </>
                  ) : (
                    <div className="hc-badge">{tipo === 'flex' ? 'Flex' : tipo === 'guardia' ? '1h' : 'Lic'}</div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
      <input className="hc-obs" placeholder={`Observación de ${row.nombre} (opcional)…`} value={row.obs || ''} onChange={e => update(i, { obs: e.target.value })} />
    </div>
  )
}

// ── SYNC: actualizar el turno en registros de la semana ─────────────────────
export async function sincronizarRegistros(area, semDesde, horarios) {
  const semHasta = getDomingo(semDesde)
  const { data: regs } = await supabase.from('registros').select('id, nombre, fecha, turno').eq('area', area).gte('fecha', semDesde).lte('fecha', semHasta)
  if (!regs?.length) return
  const map = {}; horarios.forEach(h => map[h.nombre] = h)
  const updates = []
  regs.forEach(reg => {
    const p = map[reg.nombre]; if (!p) return
    if (p.vacaciones) { if (reg.turno !== 'Vacaciones') updates.push({ id: reg.id, turno: 'Vacaciones' }); return }
    const dia = p[DIAS_SEM[new Date(reg.fecha + 'T12:00:00').getDay()]]
    if (!dia) return
    const nuevo = turnoDeDia(dia)
    if (nuevo && reg.turno !== nuevo) updates.push({ id: reg.id, turno: nuevo })
  })
  if (updates.length) await Promise.all(updates.map(u => supabase.from('registros').update({ turno: u.turno }).eq('id', u.id)))
}

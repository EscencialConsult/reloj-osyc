import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { PERIODOS, getDateRange, fmtDate, today } from '../lib/fechas'
import { horasTotales, fmtHs, tardanzaDeRegistro, tardBadge, areaColor } from '../lib/calculos'
import { logActividad } from '../lib/audit'
import { Icon } from '../components/icons.jsx'

const PAGE = 100

export default function Registros() {
  const { esAdmin, nombre, usaAreas } = useSession()
  const [per, setPer] = useState('semana')
  const [area, setArea] = useState('')
  const [busq, setBusq] = useState('')
  const [salida, setSalida] = useState('todas')
  const [custom, setCustom] = useState({ desde: '', hasta: '' })
  const [dia, setDia] = useState('')
  const [areas, setAreas] = useState([])
  const [regs, setRegs] = useState([])
  const [cargando, setCargando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [edit, setEdit] = useState(null)     // registro en edición
  const [obs, setObs] = useState(null)        // texto de observación en popup

  // Áreas para el filtro (de la tabla personal)
  useEffect(() => {
    supabase.from('personal').select('area').eq('activo', true).then(({ data }) => {
      setAreas([...new Set((data || []).map(p => p.area).filter(Boolean))].sort())
    })
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    const { desde, hasta } = getDateRange(per, { desde: custom.desde, hasta: custom.hasta, dia })
    let q = supabase.from('registros').select('*')
      .order('fecha', { ascending: false }).order('created_at', { ascending: false })
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    if (area) q = q.eq('area', area)
    const { data } = await q
    setRegs(data || [])
    setPagina(1)
    setCargando(false)
  }, [per, area, custom.desde, custom.hasta, dia])

  useEffect(() => { cargar() }, [cargar])

  // Filtro cliente (nombre + salida)
  const filtrados = useMemo(() => regs.filter(r => {
    if (busq && !r.nombre.toLowerCase().includes(busq.toLowerCase())) return false
    if (salida !== 'todas') {
      const sinSalida = (r.hora_entrada && !r.hora_salida) || (r.hora_entrada2 && !r.hora_salida2)
      if (salida === 'sin_salida' && !sinSalida) return false
      if (salida === 'con_salida' && sinSalida) return false
    }
    return true
  }), [regs, busq, salida])

  const sinPaginar = per === 'dia_especifico' || filtrados.length <= PAGE
  const totalPags = sinPaginar ? 1 : Math.ceil(filtrados.length / PAGE)
  const visibles = sinPaginar ? filtrados : filtrados.slice((pagina - 1) * PAGE, pagina * PAGE)

  async function borrar(r) {
    if (!window.confirm(`¿Eliminar registro de ${r.nombre} del ${fmtDate(r.fecha)}?`)) return
    const { error } = await supabase.from('registros').delete().eq('id', r.id)
    if (error) { alert('Error al eliminar'); return }
    await logActividad(nombre, 'registro_eliminado', r.area, r.nombre,
      `Registro del ${r.fecha} eliminado`, { fecha: r.fecha }, r.fecha < today())
    cargar()
  }

  function exportCSV() {
    if (!filtrados.length) return
    const cols = ['Área', 'Nombre', 'Rol', 'Fecha', 'Horario plan.', 'Entrada', 'Salida', 'Entrada 2', 'Salida 2', 'Hs', 'Min tard.', 'Puntual', 'Observaciones']
    const lines = [cols.join(',')]
    filtrados.forEach(r => {
      const hs = horasTotales(r)
      const t = tardanzaDeRegistro(r)
      const puntual = t.tipo !== 'diff' ? 'N/A' : (t.diff !== null ? (t.diff <= 0 ? 'SÍ' : 'NO') : '')
      lines.push([`"${r.area}"`, `"${r.nombre}"`, `"${r.rol || ''}"`, `"${r.fecha}"`, `"${r.turno || ''}"`,
        `"${r.hora_entrada?.slice(0, 5) || ''}"`, `"${r.hora_salida?.slice(0, 5) || ''}"`,
        `"${r.hora_entrada2?.slice(0, 5) || ''}"`, `"${r.hora_salida2?.slice(0, 5) || ''}"`,
        hs !== null ? hs.toFixed(2) : '', t.diff != null ? t.diff : '', puntual, `"${r.observaciones || ''}"`].join(','))
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' }))
    a.download = `OSYC_registros_${today()}.csv`
    a.click()
  }

  if (!esAdmin) return <div className="empty">Esta sección es solo para administradores.</div>

  return (
    <div className="stack">
      <div className="between">
        <h2 style={{ fontSize: 18 }}>Registros</h2>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}><Icon.File /> CSV</button>
      </div>

      {/* Filtros */}
      <div className="card stack">
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <div className="grow" style={{ minWidth: 130 }}>
            <label className="lbl">Período</label>
            <select className="inp" value={per} onChange={e => setPer(e.target.value)}>
              {PERIODOS.map(p => <option key={p.v} value={p.v}>{p.t}</option>)}
            </select>
          </div>
          {usaAreas && (
            <div className="grow" style={{ minWidth: 130 }}>
              <label className="lbl">Área</label>
              <select className="inp" value={area} onChange={e => setArea(e.target.value)}>
                <option value="">Todas</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
        </div>
        {per === 'custom' && (
          <div className="row" style={{ gap: 10 }}>
            <div className="grow"><label className="lbl">Desde</label><input className="inp" type="date" value={custom.desde} onChange={e => setCustom(c => ({ ...c, desde: e.target.value }))} /></div>
            <div className="grow"><label className="lbl">Hasta</label><input className="inp" type="date" value={custom.hasta} onChange={e => setCustom(c => ({ ...c, hasta: e.target.value }))} /></div>
          </div>
        )}
        {per === 'dia_especifico' && (
          <div><label className="lbl">Día</label><input className="inp" type="date" value={dia} onChange={e => setDia(e.target.value)} /></div>
        )}
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <div className="grow" style={{ minWidth: 160 }}>
            <label className="lbl">Buscar persona</label>
            <input className="inp" value={busq} onChange={e => setBusq(e.target.value)} placeholder="Nombre…" />
          </div>
          <div className="grow" style={{ minWidth: 130 }}>
            <label className="lbl">Salida</label>
            <select className="inp" value={salida} onChange={e => setSalida(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="con_salida">Con salida</option>
              <option value="sin_salida">Sin salida</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {cargando ? <div className="center-screen" style={{ minHeight: 160 }}><div className="spin" /></div>
        : filtrados.length === 0 ? <div className="empty">Sin registros para este filtro.</div>
          : (
            <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Área</th><th>Nombre</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Hs</th><th>Tard.</th><th>Obs</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map(r => {
                    const hs = horasTotales(r)
                    const hay2 = !!(r.hora_entrada2 || r.hora_salida2)
                    const t = tardanzaDeRegistro(r)
                    const badge = t.tipo === 'flex' ? { clase: 'pendiente', texto: 'Flex' }
                      : t.tipo === 'guardia' ? { clase: 'pendiente', texto: 'Guardia' }
                        : tardBadge(t.diff)
                    return (
                      <tr key={r.id}>
                        <td><span style={{ color: areaColor(r.area, areas), fontWeight: 800, fontSize: 11 }}>{(r.area || '').split(' / ')[0]}</span></td>
                        <td style={{ fontWeight: 700 }}>{r.nombre}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.fecha)}</td>
                        <td>{r.hora_entrada?.slice(0, 5) || '—'}{hay2 && <div className="mini2">2º {r.hora_entrada2?.slice(0, 5) || '—'}</div>}</td>
                        <td>{r.hora_salida?.slice(0, 5) || '—'}{hay2 && <div className="mini2">2º {r.hora_salida2?.slice(0, 5) || '—'}</div>}</td>
                        <td><span className="badge aprobado">{hs !== null ? fmtHs(hs) : '—'}</span></td>
                        <td><span className={'badge ' + badge.clase}>{badge.texto}</span></td>
                        <td>{r.observaciones
                          ? <button className="linklike" onClick={() => setObs(r.observaciones)}>ver</button>
                          : <span style={{ color: 'var(--linea)' }}>—</span>}</td>
                        <td>
                          <div className="row" style={{ gap: 4 }}>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => setEdit(r)} title="Editar">✎</button>
                            <button className="btn btn-err btn-sm" style={{ padding: '4px 8px' }} onClick={() => borrar(r)} title="Eliminar">✕</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

      {/* Paginación */}
      {totalPags > 1 && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {Array.from({ length: totalPags }, (_, i) => i + 1).map(n => (
            <button key={n} className={'btn btn-sm ' + (n === pagina ? 'btn-primary' : 'btn-ghost')} onClick={() => setPagina(n)}>{n}</button>
          ))}
        </div>
      )}

      {edit && <EditarRegistro reg={edit} areas={areas} usuario={nombre} onClose={() => setEdit(null)} onGuardado={() => { setEdit(null); cargar() }} />}
      {obs && (
        <div className="consent-ov" onClick={e => { if (e.target === e.currentTarget) setObs(null) }}>
          <div className="card" style={{ maxWidth: 420 }}>
            <b>Observación</b>
            <p style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{obs}</p>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setObs(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function EditarRegistro({ reg, areas, usuario, onClose, onGuardado }) {
  const [f, setF] = useState({
    area: reg.area || '', nombre: reg.nombre || '', fecha: reg.fecha || '', turno: reg.turno || '',
    e: reg.hora_entrada?.slice(0, 5) || '', s: reg.hora_salida?.slice(0, 5) || '',
    e2: reg.hora_entrada2?.slice(0, 5) || '', s2: reg.hora_salida2?.slice(0, 5) || '',
    o: reg.observaciones || ''
  })
  const [nombres, setNombres] = useState([])
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!f.area) return
    supabase.from('personal').select('nombre').eq('area', f.area).eq('activo', true).order('nombre')
      .then(({ data }) => setNombres((data || []).map(p => p.nombre)))
  }, [f.area])

  async function guardar() {
    if (!f.area || !f.nombre || !f.fecha) { alert('Área, nombre y fecha son obligatorios'); return }
    setGuardando(true)
    const { error } = await supabase.from('registros').update({
      area: f.area, nombre: f.nombre, fecha: f.fecha, turno: f.turno || null,
      hora_entrada: f.e ? f.e + ':00' : null, hora_salida: f.s ? f.s + ':00' : null,
      hora_entrada2: f.e2 ? f.e2 + ':00' : null, hora_salida2: f.s2 ? f.s2 + ':00' : null,
      observaciones: f.o.trim() || null
    }).eq('id', reg.id)
    setGuardando(false)
    if (error) { alert('Error al guardar'); return }
    await logActividad(usuario, 'registro_editado', f.area, f.nombre,
      `Registro del ${f.fecha} editado para ${f.nombre}`,
      { fecha: f.fecha, turno: f.turno, entrada: f.e, salida: f.s }, f.fecha < today())
    onGuardado()
  }

  return (
    <div className="consent-ov" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card stack" style={{ maxWidth: 420, width: '100%' }}>
        <div className="between"><b>Editar registro</b><button className="btn btn-ghost btn-sm" onClick={onClose}><Icon.X /></button></div>
        <div className="row" style={{ gap: 10 }}>
          <div className="grow">
            <label className="lbl">Área</label>
            <select className="inp" value={f.area} onChange={e => set('area', e.target.value)}>
              {[f.area, ...areas.filter(a => a !== f.area)].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="grow">
            <label className="lbl">Nombre</label>
            <select className="inp" value={f.nombre} onChange={e => set('nombre', e.target.value)}>
              {!nombres.includes(f.nombre) && <option value={f.nombre}>{f.nombre}</option>}
              {nombres.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="grow"><label className="lbl">Fecha</label><input className="inp" type="date" value={f.fecha} onChange={e => set('fecha', e.target.value)} /></div>
          <div className="grow"><label className="lbl">Turno (texto)</label><input className="inp" value={f.turno} onChange={e => set('turno', e.target.value)} placeholder="09:00 → 18:00" /></div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="grow"><label className="lbl">Entrada</label><input className="inp" type="time" value={f.e} onChange={e => set('e', e.target.value)} /></div>
          <div className="grow"><label className="lbl">Salida</label><input className="inp" type="time" value={f.s} onChange={e => set('s', e.target.value)} /></div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="grow"><label className="lbl">Entrada 2º</label><input className="inp" type="time" value={f.e2} onChange={e => set('e2', e.target.value)} /></div>
          <div className="grow"><label className="lbl">Salida 2º</label><input className="inp" type="time" value={f.s2} onChange={e => set('s2', e.target.value)} /></div>
        </div>
        <div><label className="lbl">Observaciones</label><textarea className="inp" value={f.o} onChange={e => set('o', e.target.value)} /></div>
        <button className="btn btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>
    </div>
  )
}

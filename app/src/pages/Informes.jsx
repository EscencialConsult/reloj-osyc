import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { PERIODOS, getDateRange, fmtDate } from '../lib/fechas'
import { calcHs, fmtHs, calcTardVsPlan, calcHsExtra, areaColor } from '../lib/calculos'
import { getAreas } from '../lib/config'

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)

const ESPECIAL = ['Flex', 'Guardia', 'Licencia', 'Vacaciones']
const conPlan = r => r.turno && r.hora_entrada && !ESPECIAL.includes(r.turno) && /^\d{2}:\d{2}$/.test(r.turno.split('→')[0].trim())
const planEnt = r => r.turno.split('→')[0].trim()

// Suma de minutos extra por persona (con detalle por día)
function extraPorPersona(rows) {
  const by = {}
  rows.forEach(r => {
    if (!r.turno || !r.hora_entrada || !r.hora_salida || ESPECIAL.includes(r.turno)) return
    const parts = r.turno.split('→'); if (parts.length < 2) return
    const planSal = parts[1].trim().slice(0, 5); if (!/^\d{2}:\d{2}$/.test(planSal)) return
    const extra = calcHsExtra(planSal, r.hora_salida.slice(0, 5)); if (extra === null) return
    if (!by[r.nombre]) by[r.nombre] = { nombre: r.nombre, area: r.area, totalExtra: 0, veces: 0, dias: [] }
    by[r.nombre].totalExtra += extra
    if (extra > 0) by[r.nombre].veces++
    by[r.nombre].dias.push({ fecha: r.fecha, extra })
  })
  return Object.values(by)
}

export default function Informes() {
  const { esAdmin, usaAreas } = useSession()
  const [per, setPer] = useState('semana')
  const [area, setArea] = useState('')
  const [persona, setPersona] = useState('')
  const [dia, setDia] = useState('')
  const [custom, setCustom] = useState({ desde: '', hasta: '' })
  const [areas, setAreas] = useState([])
  const [rows, setRows] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    getAreas().then(a => setAreas(a.length ? a : []))
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    const { desde, hasta } = getDateRange(per, { desde: custom.desde, hasta: custom.hasta, dia })
    let q = supabase.from('registros').select('*').order('fecha', { ascending: true })
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    if (area) q = q.eq('area', area)
    const { data } = await q
    setRows(data || [])
    setCargando(false)
  }, [per, area, dia, custom.desde, custom.hasta])
  useEffect(() => { cargar() }, [cargar])

  const filtrados = useMemo(() =>
    persona ? rows.filter(r => r.nombre.toLowerCase().includes(persona.toLowerCase())) : rows,
    [rows, persona])

  // Áreas presentes (config o derivadas de los datos)
  const areasUsar = areas.length ? areas : [...new Set(filtrados.map(r => r.area).filter(Boolean))]

  // ── KPIs ──
  const kpis = useMemo(() => {
    const withPlan = filtrados.filter(conPlan)
    const diffs = withPlan.map(r => calcTardVsPlan(planEnt(r), r.hora_entrada.slice(0, 5))).filter(d => d !== null)
    const puntuales = diffs.filter(d => d <= 0).length
    const tardes = diffs.filter(d => d > 0).length
    const prom = diffs.length ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : 0
    const conHs = filtrados.filter(r => r.hora_entrada && r.hora_salida && !ESPECIAL.includes(r.turno))
    const totHs = conHs.reduce((a, r) => { const h = calcHs(r.hora_entrada.slice(0, 5), r.hora_salida.slice(0, 5)); return h ? a + h : a }, 0)
    const conExtra = extraPorPersona(filtrados).filter(e => e.totalExtra > 0).length
    return {
      total: filtrados.length, personas: new Set(filtrados.map(r => r.nombre)).size,
      prom, promN: diffs.length, puntuales, tardes,
      hsProm: conHs.length ? fmtHs(totHs / conHs.length) : '—', conExtra
    }
  }, [filtrados])

  const gris = 'rgba(30,47,69,.6)', grid = 'rgba(30,47,69,.07)'

  // ── Datos de gráficos ──
  const dataArea = useMemo(() => ({
    labels: areasUsar.map(a => a.split(' ')[0]),
    datasets: [{
      data: areasUsar.map(a => filtrados.filter(r => r.area === a).length),
      backgroundColor: areasUsar.map(a => areaColor(a, areas) + '55'),
      borderColor: areasUsar.map(a => areaColor(a, areas)), borderWidth: 2
    }]
  }), [filtrados, areasUsar])

  const dataPunt = useMemo(() => {
    const ars = areasUsar.filter(a => filtrados.some(r => r.area === a))
    const pct = ars.map(a => {
      const ar = filtrados.filter(r => r.area === a && conPlan(r))
      if (!ar.length) return 0
      const p = ar.filter(r => calcTardVsPlan(planEnt(r), r.hora_entrada.slice(0, 5)) <= 0)
      return Math.round(p.length / ar.length * 100)
    })
    return { labels: ars.map(a => a.split(' ')[0]), datasets: [{ label: '% puntualidad', data: pct, backgroundColor: ars.map(a => areaColor(a, areas) + '55'), borderColor: ars.map(a => areaColor(a, areas)), borderWidth: 2, borderRadius: 6 }] }
  }, [filtrados, areasUsar])

  const dataDia = useMemo(() => {
    const by = {}; filtrados.forEach(r => { by[r.fecha] = (by[r.fecha] || 0) + 1 })
    const dates = Object.keys(by).sort()
    return { labels: dates.map(fmtDate), datasets: [{ label: 'Registros', data: dates.map(d => by[d]), borderColor: '#2c6eb4', backgroundColor: 'rgba(44,110,180,.1)', fill: true, tension: .35, pointRadius: 3 }] }
  }, [filtrados])

  if (!esAdmin) return <div className="empty">Esta sección es solo para administradores.</div>

  return (
    <div className="stack">
      <h2 style={{ fontSize: 18 }}>Informes / Tablero</h2>

      {/* Filtros */}
      <div className="card stack">
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <div className="grow" style={{ minWidth: 120 }}>
            <label className="lbl">Período</label>
            <select className="inp" value={per} onChange={e => setPer(e.target.value)}>
              {PERIODOS.map(p => <option key={p.v} value={p.v}>{p.t}</option>)}
            </select>
          </div>
          {usaAreas && (
            <div className="grow" style={{ minWidth: 120 }}>
              <label className="lbl">Área</label>
              <select className="inp" value={area} onChange={e => setArea(e.target.value)}>
                <option value="">Todas</option>
                {areasUsar.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          <div className="grow" style={{ minWidth: 120 }}>
            <label className="lbl">Persona</label>
            <input className="inp" value={persona} onChange={e => setPersona(e.target.value)} placeholder="Nombre…" />
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
            {/* KPIs */}
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <KPI n={kpis.total} t="Registros" />
              <KPI n={kpis.personas} t="Personas" />
              <KPI n={(kpis.prom > 0 ? '+' : '') + kpis.prom + 'm'} t="Tardanza prom." color={kpis.prom > 5 ? 'var(--err)' : 'var(--ok)'} />
              <KPI n={kpis.puntuales} t="Puntuales" color="var(--ok)" />
              <KPI n={kpis.tardes} t="Tardes" color="var(--err)" />
              <KPI n={kpis.hsProm} t="Hs prom." />
              <KPI n={kpis.conExtra || '—'} t="Con extra" />
            </div>

            {/* Gráficos por área (solo si la empresa usa áreas) */}
            {usaAreas && (
              <div className="mod-grid">
                <div className="card"><b style={{ fontSize: 13 }}>Registros por área</b><div style={{ height: 220 }}><Doughnut data={dataArea} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: gris, font: { size: 11 }, boxWidth: 12 } } } }} /></div></div>
                <div className="card"><b style={{ fontSize: 13 }}>% Puntualidad por área</b><div style={{ height: 220 }}><Bar data={dataPunt} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, ticks: { color: gris }, grid: { color: grid } }, x: { ticks: { color: gris }, grid: { display: false } } }, plugins: { legend: { display: false } } }} /></div></div>
              </div>
            )}
            <div className="card"><b style={{ fontSize: 13 }}>Registros por día</b><div style={{ height: 200 }}><Line data={dataDia} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: gris, stepSize: 1 }, grid: { color: grid } }, x: { ticks: { color: gris, maxTicksLimit: 8 }, grid: { display: false } } }, plugins: { legend: { display: false } } }} /></div></div>

            {/* Tops */}
            <div className="mod-grid">
              <TopTardanzas rows={filtrados} areas={areas} />
              <TopExtra rows={filtrados} areas={areas} />
            </div>

            {/* Tabla por persona */}
            <TablaPersonas rows={filtrados} areas={areas} />
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

function TopTardanzas({ rows, areas }) {
  const [modo, setModo] = useState('total')
  const [verMas, setVerMas] = useState(false)
  const data = useMemo(() => {
    const withTard = rows.filter(conPlan)
    const by = {}
    withTard.forEach(r => {
      const diff = calcTardVsPlan(planEnt(r), r.hora_entrada.slice(0, 5))
      if (diff === null || diff <= 0) return
      if (!by[r.nombre]) by[r.nombre] = { nombre: r.nombre, area: r.area, totalMin: 0, veces: 0, maxMin: 0, maxFecha: r.fecha }
      by[r.nombre].totalMin += diff; by[r.nombre].veces++
      if (diff > by[r.nombre].maxMin) { by[r.nombre].maxMin = diff; by[r.nombre].maxFecha = r.fecha }
    })
    return Object.values(by).sort((a, b) => modo === 'total' ? b.totalMin - a.totalMin : b.maxMin - a.maxMin)
  }, [rows, modo])
  const val = p => modo === 'total' ? `+${p.totalMin}m` : `+${p.maxMin}m`
  const sub = p => modo === 'total' ? `${p.veces} registros` : fmtDate(p.maxFecha)
  return (
    <TopBox titulo="Top tardanzas" modo={modo} setModo={setModo} data={data} val={val} sub={sub} color="var(--err)" areas={areas} verMas={verMas} setVerMas={setVerMas} />
  )
}

function TopExtra({ rows, areas }) {
  const [modo, setModo] = useState('total')
  const [verMas, setVerMas] = useState(false)
  const data = useMemo(() => {
    const ex = extraPorPersona(rows).filter(e => e.totalExtra > 0)
    if (modo === 'total') return ex.sort((a, b) => b.totalExtra - a.totalExtra)
    return ex.map(e => { let m = 0, f = null; e.dias.forEach(d => { if (d.extra > m) { m = d.extra; f = d.fecha } }); return { ...e, maxExtra: m, maxFecha: f } }).sort((a, b) => b.maxExtra - a.maxExtra)
  }, [rows, modo])
  const val = p => '+' + fmtHs((modo === 'total' ? p.totalExtra : p.maxExtra) / 60)
  const sub = p => modo === 'total' ? `${p.veces} días` : fmtDate(p.maxFecha)
  return (
    <TopBox titulo="Top horas extra" modo={modo} setModo={setModo} data={data} val={val} sub={sub} color="#3f6aa0" areas={areas} verMas={verMas} setVerMas={setVerMas} />
  )
}

function TopBox({ titulo, modo, setModo, data, val, sub, color, areas, verMas, setVerMas }) {
  const lista = verMas ? data : data.slice(0, 5)
  const fila = (p, i) => (
    <div key={p.nombre} className="between" style={{ padding: '8px 0', borderBottom: '1px solid var(--linea)' }}>
      <div className="row" style={{ gap: 8, minWidth: 0 }}>
        <span style={{ color: areaColor(p.area, areas), fontWeight: 800 }}>{i + 1}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
          <div className="muted" style={{ fontSize: 10 }}>{p.area}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 800, color, fontSize: 13 }}>{val(p)}</div>
        <div className="muted" style={{ fontSize: 10 }}>{sub(p)}</div>
      </div>
    </div>
  )
  return (
    <div className="card stack">
      <b style={{ fontSize: 13 }}>{titulo}</b>
      <div className="row" style={{ gap: 6 }}>
        <button className={'btn btn-sm ' + (modo === 'total' ? 'btn-primary' : 'btn-ghost')} onClick={() => setModo('total')}>Total</button>
        <button className={'btn btn-sm ' + (modo === 'individual' ? 'btn-primary' : 'btn-ghost')} onClick={() => setModo('individual')}>Máx.</button>
      </div>
      {data.length === 0 ? <div className="muted">—</div> : lista.map(fila)}
      {data.length > 5 && (
        <button className="btn btn-ghost btn-sm" onClick={() => setVerMas(v => !v)}>{verMas ? 'Ver menos' : `Ver más (${data.length})`}</button>
      )}
    </div>
  )
}

function TablaPersonas({ rows, areas }) {
  const data = useMemo(() => {
    const by = {}
    rows.forEach(r => {
      if (!by[r.nombre]) by[r.nombre] = { nombre: r.nombre, area: r.area, registros: 0, puntuales: 0, tardanzas: [], horas: 0 }
      const p = by[r.nombre]; p.registros++
      const h1 = calcHs(r.hora_entrada?.slice(0, 5), r.hora_salida?.slice(0, 5))
      const h2 = calcHs(r.hora_entrada2?.slice(0, 5), r.hora_salida2?.slice(0, 5))
      if (h1 !== null || h2 !== null) p.horas += (h1 || 0) + (h2 || 0)
      if (conPlan(r)) {
        const diff = calcTardVsPlan(planEnt(r), r.hora_entrada.slice(0, 5))
        if (diff !== null) { if (diff <= 0) p.puntuales++; else p.tardanzas.push(diff) }
      }
    })
    return Object.values(by).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [rows])
  if (!data.length) return null
  return (
    <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
      <table className="tbl">
        <thead><tr><th>#</th><th>Nombre</th><th>Reg.</th><th>Hs</th><th>Punt.</th><th>Tard.</th></tr></thead>
        <tbody>
          {data.map((p, i) => {
            const promT = p.tardanzas.length ? Math.round(p.tardanzas.reduce((a, b) => a + b, 0) / p.tardanzas.length) : 0
            const punt = (p.puntuales + p.tardanzas.length) > 0 ? Math.round(p.puntuales / (p.puntuales + p.tardanzas.length) * 100) + '%' : '—'
            return (
              <tr key={p.nombre}>
                <td style={{ color: 'var(--tinta-2)' }}>{i + 1}</td>
                <td style={{ fontWeight: 700 }}>{p.nombre} <span style={{ color: areaColor(p.area, areas), fontWeight: 800, fontSize: 10 }}>{(p.area || '').split(' ')[0]}</span></td>
                <td style={{ textAlign: 'center' }}>{p.registros}</td>
                <td style={{ textAlign: 'center' }}><span className="badge aprobado">{p.horas > 0 ? fmtHs(p.horas) : '—'}</span></td>
                <td style={{ textAlign: 'center' }}>{punt}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: p.tardanzas.length ? 'var(--err)' : 'var(--ok)' }}>{p.tardanzas.length ? '+' + promT + 'm' : '✓'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

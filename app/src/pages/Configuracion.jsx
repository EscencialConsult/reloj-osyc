import { useEffect, useState, useCallback } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { getFeatures, saveFeatures, getAreas, saveAreas, getPlantillas, savePlantillas } from '../lib/config'
import { bestPosition } from '../lib/geo'
import { Icon } from '../components/icons.jsx'

// Normaliza "9", "9.30", "9,30", "9:30" → "09:30"
function fmtHora(v) {
  v = (v || '').trim(); if (!v) return ''
  v = v.replace(/[.,]/, ':')
  let [h, m] = v.includes(':') ? v.split(':') : [v, '0']
  h = parseInt(h, 10); m = parseInt(m, 10)
  if (isNaN(h)) return ''; if (isNaN(m)) m = 0
  if (h < 0 || h > 23 || m < 0 || m > 59) return ''
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}

// Parsea una coordenada tolerando coma decimal y el signo menos unicode (−)
function parseCoord(v) {
  if (v == null) return NaN
  let s = String(v).trim().replace(/−/g, '-').replace(/\s+/g, '')
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.')   // coma decimal → punto
  return parseFloat(s)
}
// Detecta un par "lat, lng" pegado (ej: desde Google Maps: "-26.8175, -65.2093")
function parPegado(txt) {
  const s = String(txt).replace(/−/g, '-').trim()
  let parts = s.split(',').map(x => x.trim()).filter(Boolean)
  if (parts.length !== 2) parts = s.split(/\s+/).filter(Boolean)
  if (parts.length !== 2) return null
  const la = parseFloat(parts[0]), lo = parseFloat(parts[1])
  if (isNaN(la) || isNaN(lo)) return null
  return { lat: la, lng: lo }
}

export default function Configuracion() {
  const { esAdmin } = useSession()
  const [feats, setFeats] = useState({ usa_areas: false, usa_lideres: false })
  const [areas, setAreas] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [f, a, p] = await Promise.all([getFeatures(), getAreas(), getPlantillas()])
    setFeats({ usa_areas: false, usa_lideres: false, ...f })
    setAreas(a); setPlantillas(p)
    setCargando(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function toggle(key) {
    const next = { ...feats, [key]: !feats[key] }
    setFeats(next)
    await saveFeatures(next)
  }

  if (!esAdmin) return <div className="empty">Esta sección es solo para administradores.</div>
  if (cargando) return <div className="center-screen" style={{ minHeight: 160 }}><div className="spin" /></div>

  return (
    <div className="stack">
      <h2 style={{ fontSize: 18 }}>Configuración</h2>

      {/* Interruptores */}
      <div className="card stack">
        <b>Funciones</b>
        <label className="between" style={{ cursor: 'pointer' }}>
          <span>Usar <b>áreas</b> <div className="muted">Agrupar personal por área (Barra, Cocina…). Apagado = un solo grupo.</div></span>
          <input type="checkbox" checked={feats.usa_areas} onChange={() => toggle('usa_areas')} />
        </label>
        <label className="between" style={{ cursor: 'pointer' }}>
          <span>Usar <b>líderes</b> <div className="muted">Usuarios que cargan los horarios de su área. Apagado = solo el admin.</div></span>
          <input type="checkbox" checked={feats.usa_lideres} onChange={() => toggle('usa_lideres')} />
        </label>
      </div>

      {feats.usa_areas && <Areas areas={areas} setAreas={setAreas} />}
      <Plantillas plantillas={plantillas} setPlantillas={setPlantillas} />
      <Sedes />
    </div>
  )
}

function Areas({ areas, setAreas }) {
  const [nueva, setNueva] = useState('')
  async function add() {
    const name = nueva.trim(); if (!name) return
    if (areas.some(a => a.toLowerCase() === name.toLowerCase())) { alert('Esa área ya existe'); return }
    const arr = [...areas, name]
    if (await saveAreas(arr)) { setAreas(arr); setNueva('') }
  }
  async function editar(i) {
    const nuevo = (prompt('Nuevo nombre del área:', areas[i]) || '').trim()
    if (!nuevo || nuevo === areas[i]) return
    if (areas.some((a, j) => j !== i && a.toLowerCase() === nuevo.toLowerCase())) { alert('Esa área ya existe'); return }
    const arr = areas.slice(); arr[i] = nuevo
    if (await saveAreas(arr)) setAreas(arr)
  }
  async function borrar(i) {
    if (!window.confirm(`¿Eliminar el área "${areas[i]}"? El personal que la tenga quedará sin área.`)) return
    const arr = areas.slice(); arr.splice(i, 1)
    if (await saveAreas(arr)) setAreas(arr)
  }
  return (
    <div className="card stack">
      <b>Áreas</b>
      {areas.length === 0 && <div className="muted">Todavía no hay áreas.</div>}
      {areas.map((a, i) => (
        <div key={i} className="between" style={{ border: '1px solid var(--linea)', borderRadius: 9, padding: '8px 12px' }}>
          <b style={{ fontSize: 13 }}>{a}</b>
          <div className="row" style={{ gap: 4 }}>
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => editar(i)}>✎</button>
            <button className="btn btn-err btn-sm" style={{ padding: '4px 8px' }} onClick={() => borrar(i)}>✕</button>
          </div>
        </div>
      ))}
      <div className="row" style={{ gap: 8 }}>
        <input className="inp grow" value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Nueva área" onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="btn btn-primary btn-sm" onClick={add}>Agregar</button>
      </div>
    </div>
  )
}

function Plantillas({ plantillas, setPlantillas }) {
  const [f, setF] = useState({ nombre: '', e: '', s: '', e2: '', s2: '' })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  async function add() {
    const nombre = f.nombre.trim()
    const e = fmtHora(f.e), s = fmtHora(f.s), e2 = fmtHora(f.e2), s2 = fmtHora(f.s2)
    if (!nombre) { alert('Ponele un nombre a la plantilla'); return }
    if (!e) { alert('Cargá al menos la entrada del 1er turno'); return }
    const arr = [...plantillas, { nombre, e, s, e2, s2 }]
    if (await savePlantillas(arr)) { setPlantillas(arr); setF({ nombre: '', e: '', s: '', e2: '', s2: '' }) }
  }
  async function borrar(i) {
    if (!window.confirm(`¿Eliminar la plantilla "${plantillas[i].nombre}"?`)) return
    const arr = plantillas.slice(); arr.splice(i, 1)
    if (await savePlantillas(arr)) setPlantillas(arr)
  }
  return (
    <div className="card stack">
      <b>Plantillas de horario</b>
      <div className="muted">Horarios reutilizables (ej: Corrido 09→18, Cortado 09→13 / 17→21).</div>
      {plantillas.map((t, i) => (
        <div key={i} className="between" style={{ border: '1px solid var(--linea)', borderRadius: 9, padding: '8px 12px' }}>
          <span><b style={{ fontSize: 13 }}>{t.nombre}</b> <span style={{ color: 'var(--azul)', fontWeight: 700, marginLeft: 6, fontSize: 12 }}>{t.e}{t.s ? ' → ' + t.s : ''}{t.e2 ? '  |  ' + t.e2 + (t.s2 ? ' → ' + t.s2 : '') : ''}</span></span>
          <button className="btn btn-err btn-sm" style={{ padding: '4px 8px' }} onClick={() => borrar(i)}>✕</button>
        </div>
      ))}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <input className="inp" style={{ flex: '1 1 120px' }} value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre" />
        <input className="inp" style={{ width: 80 }} value={f.e} onChange={e => set('e', e.target.value)} placeholder="09:00" />
        <input className="inp" style={{ width: 80 }} value={f.s} onChange={e => set('s', e.target.value)} placeholder="18:00" />
        <input className="inp" style={{ width: 80 }} value={f.e2} onChange={e => set('e2', e.target.value)} placeholder="2º ent" />
        <input className="inp" style={{ width: 80 }} value={f.s2} onChange={e => set('s2', e.target.value)} placeholder="2º sal" />
        <button className="btn btn-primary btn-sm" onClick={add}>Agregar</button>
      </div>
    </div>
  )
}

function Sedes() {
  const [sedes, setSedes] = useState([])
  const [base, setBase] = useState('')
  const [form, setForm] = useState(null)     // sede en edición/alta
  const [qr, setQr] = useState(null)         // { nombre, url, dataUrl }

  const cargar = useCallback(async () => {
    const { data: cfg } = await supabase.from('configuracion').select('valor').eq('id', 'app_base_url').maybeSingle()
    setBase((cfg && typeof cfg.valor === 'string' && cfg.valor) ? cfg.valor : window.location.origin)
    const { data } = await supabase.from('sedes').select('*').order('nombre')
    setSedes(data || [])
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function guardarBase() {
    const v = (base || '').trim().replace(/\/$/, '')
    await supabase.from('configuracion').upsert({ id: 'app_base_url', valor: v })
    setBase(v || window.location.origin)
    alert('URL guardada ✓')
  }
  async function borrar(s) {
    if (!window.confirm(`¿Eliminar la sucursal "${s.nombre}"? Los empleados ya no podrán fichar ahí.`)) return
    const { error } = await supabase.from('sedes').delete().eq('id', s.id)
    if (error) { alert('No se pudo eliminar'); return }
    cargar()
  }
  async function verQR(s) {
    const url = (base || window.location.origin).replace(/\/$/, '') + '/fichar?sede=' + s.id
    const dataUrl = await QRCode.toDataURL(url, { width: 288, margin: 1, color: { dark: '#1e2f45', light: '#ffffff' } })
    setQr({ nombre: s.nombre, url, dataUrl })
  }

  return (
    <div className="card stack">
      <b>Sucursales</b>
      <div className="muted">Cada sucursal tiene su QR: el empleado lo escanea y ficha. La URL base es donde publiques la app.</div>
      <div className="row" style={{ gap: 8 }}>
        <input className="inp grow" value={base} onChange={e => setBase(e.target.value)} placeholder="https://tusitio.com" />
        <button className="btn btn-ghost btn-sm" onClick={guardarBase}>Guardar URL</button>
      </div>

      {sedes.map(s => (
        <div key={s.id} className="between" style={{ border: '1px solid var(--linea)', borderRadius: 9, padding: '10px 12px', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ flex: '1 1 160px' }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>{s.nombre} {!s.activo && <span style={{ color: 'var(--err)', fontSize: 11 }}>(inactiva)</span>}</div>
            <div className="muted">{s.direccion || ''} · radio {s.radio_m} m</div>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setForm(s)}>Editar</button>
            <button className="btn btn-err btn-sm" onClick={() => borrar(s)}>Eliminar</button>
            <button className="btn btn-primary btn-sm" onClick={() => verQR(s)}>Ver QR</button>
          </div>
        </div>
      ))}

      <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setForm({})}><Icon.Plus /> Agregar sucursal</button>

      {form && <SedeForm sede={form} onClose={() => setForm(null)} onGuardado={() => { setForm(null); cargar() }} />}
      {qr && <QRModal qr={qr} onClose={() => setQr(null)} />}
    </div>
  )
}

function SedeForm({ sede, onClose, onGuardado }) {
  const esNuevo = !sede.id
  const [f, setF] = useState({
    nombre: sede.nombre || '', direccion: sede.direccion || '',
    lat: sede.lat ?? '', lng: sede.lng ?? '',
    radio_m: sede.radio_m ?? 100, precision_max: sede.precision_max ?? 100,
    activo: sede.id ? !!sede.activo : true
  })
  const [hint, setHint] = useState('Tocá "Usar mi ubicación" dentro del local, o pegá las coordenadas de Google Maps.')
  const [gps, setGps] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  async function usarUbicacion() {
    setGps(true); setHint('Afinando GPS…')
    try {
      const pos = await bestPosition({ timeout: 9000, desired: 15 })
      const { latitude, longitude, accuracy } = pos.coords
      setF(p => ({ ...p, lat: latitude.toFixed(6), lng: longitude.toFixed(6) }))
      setHint(`Ubicación tomada con ±${Math.round(accuracy)} m. ` + (accuracy > 30 ? 'Algo imprecisa: probá a cielo abierto o usá un radio mayor.' : 'Buena precisión ✓'))
    } catch (e) {
      setHint(e && e.code === 1 ? 'Permiso de ubicación denegado.' : 'No se pudo obtener la ubicación. Probá en un lugar abierto.')
    } finally { setGps(false) }
  }

  async function guardar() {
    const nombre = f.nombre.trim()
    const lat = parseCoord(f.lat), lng = parseCoord(f.lng)
    const radio = parseInt(f.radio_m, 10), prec = parseInt(f.precision_max, 10)
    if (!nombre) { alert('Poné un nombre para la sucursal'); return }
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert(`Ubicación GPS inválida.\nLatitud: ${f.lat || '—'} (debe estar entre -90 y 90)\nLongitud: ${f.lng || '—'} (debe estar entre -180 y 180)\n\nRevisá que no le falte el punto decimal.`)
      return
    }
    if (isNaN(radio) || radio < 5) { alert('El radio debe ser un número (mínimo 5 m)'); return }
    setGuardando(true)
    const fila = { nombre, direccion: f.direccion.trim() || null, lat, lng, radio_m: radio, precision_max: (isNaN(prec) || prec < 5) ? 50 : prec, activo: f.activo }
    let error
    if (sede.id) ({ error } = await supabase.from('sedes').update(fila).eq('id', sede.id))
    else ({ error } = await supabase.from('sedes').insert(fila))
    setGuardando(false)
    if (error) { alert('No se pudo guardar: ' + error.message); return }
    onGuardado()
  }

  return (
    <div className="consent-ov" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card stack" style={{ maxWidth: 440, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="between"><b>{esNuevo ? 'Nueva sucursal' : 'Editar sucursal'}</b><button className="btn btn-ghost btn-sm" onClick={onClose}><Icon.X /></button></div>
        <div><label className="lbl">Nombre</label><input className="inp" value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="ej: Sucursal Centro" /></div>
        <div><label className="lbl">Dirección</label><input className="inp" value={f.direccion} onChange={e => set('direccion', e.target.value)} placeholder="ej: Av. Siempre Viva 742" /></div>
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={usarUbicacion} disabled={gps}><Icon.Pin /> {gps ? 'Afinando GPS…' : 'Usar mi ubicación'}</button>
        <div className="row" style={{ gap: 10 }}>
          <div className="grow">
            <label className="lbl">Latitud</label>
            <input className="inp" type="text" inputMode="decimal" value={f.lat}
              onChange={e => { const par = parPegado(e.target.value); if (par) setF(p => ({ ...p, lat: String(par.lat), lng: String(par.lng) })); else set('lat', e.target.value) }} />
          </div>
          <div className="grow">
            <label className="lbl">Longitud</label>
            <input className="inp" type="text" inputMode="decimal" value={f.lng} onChange={e => set('lng', e.target.value)} />
          </div>
        </div>
        <div className="muted">{hint} <br />Tip: podés pegar el par «lat, lng» de Google Maps directamente en Latitud.</div>
        <div className="row" style={{ gap: 10 }}>
          <div className="grow"><label className="lbl">Radio (m)</label><input className="inp" type="number" min="10" value={f.radio_m} onChange={e => set('radio_m', e.target.value)} /></div>
          <div className="grow"><label className="lbl">Precisión máx. (m)</label><input className="inp" type="number" min="10" value={f.precision_max} onChange={e => set('precision_max', e.target.value)} /></div>
        </div>
        <label className="row" style={{ gap: 8, cursor: 'pointer' }}><input type="checkbox" checked={f.activo} onChange={e => set('activo', e.target.checked)} /> Activa</label>
        <button className="btn btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar sucursal'}</button>
      </div>
    </div>
  )
}

function QRModal({ qr, onClose }) {
  function imprimir() {
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR ${qr.nombre} — OSYC</title>
<style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Segoe UI',system-ui,sans-serif}.page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:18mm 14mm;background:radial-gradient(circle at 50% 0%,#f8fafc,#eef3f9)}
.card{background:#fff;border-radius:30px;max-width:560px;width:100%;overflow:hidden;box-shadow:0 26px 64px rgba(44,74,110,.18)}.strip{height:11px;background:linear-gradient(90deg,#2c6eb4,#5a97d4,#3f6aa0)}
.body{padding:32px 46px 36px;text-align:center}.brand{font-size:22px;font-weight:800;color:#2c6eb4}.sede{font-size:36px;font-weight:800;color:#1e2f45;margin:16px 0 4px}
.sub{font-size:11px;color:#4a7fb5;letter-spacing:.22em;text-transform:uppercase;font-weight:700;margin-bottom:26px}.frame{display:inline-block;padding:16px;border:3px solid #2c6eb4;border-radius:24px}
.frame img{width:288px;height:288px;display:block}.cta{font-size:26px;font-weight:800;color:#1e2f45;margin-top:26px}.foot{margin-top:28px;padding-top:16px;border-top:1px dashed #cddef0;font-size:11px;color:#6b7f99;letter-spacing:.1em;font-weight:600}</style></head><body>
<div class="page"><div class="card"><div class="strip"></div><div class="body">
<div class="brand">OSYC</div><div class="sede">${qr.nombre}</div><div class="sub">Fichaje de ingreso y salida</div>
<div class="frame"><img src="${qr.dataUrl}"/></div><div class="cta">Escaneá para fichar</div>
<div class="foot">OSYC · SISTEMA DE FICHAJE</div></div></div></div></body></html>`)
    w.document.close(); w.focus(); setTimeout(() => { try { w.print() } catch (_) {} }, 500)
  }
  return (
    <div className="consent-ov" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card stack" style={{ maxWidth: 340, textAlign: 'center' }}>
        <div className="between"><b>{qr.nombre}</b><button className="btn btn-ghost btn-sm" onClick={onClose}><Icon.X /></button></div>
        <img src={qr.dataUrl} alt="QR" style={{ width: 240, height: 240, alignSelf: 'center' }} />
        <div className="muted" style={{ wordBreak: 'break-all' }}>{qr.url}</div>
        <button className="btn btn-primary" onClick={imprimir}>Imprimir</button>
      </div>
    </div>
  )
}

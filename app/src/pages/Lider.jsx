import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getLunes, getDomingo, today } from '../lib/fechas'
import { fmtHs, areaColor } from '../lib/calculos'
import { logActividad, esFueraDeTerm } from '../lib/audit'
import { DIAS, DIAS_SEM, calcTotRow, filaDesdeGuardado, filaAGuardar, turnoDeDia, dd, diasArr } from '../lib/horarios'
import { PersonCard, sincronizarRegistros } from './Horarios.jsx'
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
    onLogin({ usuario: l.usuario, nombre: l.nombre, areas: l.areas || [], password: l.password || l.usuario })
  }

  return (
    <div className="center-screen">
      <form className="card stack" style={{ width: '100%', maxWidth: 380 }} onSubmit={entrar}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand" style={{ fontSize: 22 }}>OS<b>YC</b> · Líder</div>
          <p className="muted" style={{ marginTop: 4 }}>Carga de horarios de tu área</p>
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
        <p className="muted">Elegí el área que vas a cargar:</p>
        {sess.areas.map(a => (
          <button key={a} className="btn btn-ghost" style={{ justifyContent: 'flex-start', color: areaColor(a, sess.areas), borderLeft: `3px solid ${areaColor(a, sess.areas)}` }} onClick={() => onElegir(a)}>{a}</button>
        ))}
      </div>
    </div>
  )
}

function PanelLider({ sess, area, onCambiarArea, onSalir }) {
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

  const semH = new Date(getDomingo(semViendo) + 'T12:00:00')
  const total = (editRows || []).reduce((a, r) => a + calcTotRow(r), 0)

  return (
    <div style={{ minHeight: '100%' }}>
      <header className="appbar">
        <div className="inner">
          <div className="brand">OS<b>YC</b> · Líder</div>
          <div className="row" style={{ gap: 8 }}>
            <span className="badge pendiente">{area}</span>
            {sess.areas.length > 1 && <button className="btn btn-ghost btn-sm" onClick={onCambiarArea}>Cambiar área</button>}
            <button className="btn btn-ghost btn-sm" onClick={onSalir}><Icon.Logout /> Salir</button>
          </div>
        </div>
      </header>

      <main className="wrap stack">
        <p className="muted">Hola, <b style={{ color: 'var(--tinta)' }}>{sess.nombre}</b> · cargando horarios de <b>{area}</b></p>

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
      </main>
    </div>
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

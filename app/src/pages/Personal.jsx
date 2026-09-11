import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { getFeatures, getAreas } from '../lib/config'
import { areaColor } from '../lib/calculos'
import { logActividad } from '../lib/audit'
import { PERMISOS_DEFAULT, PERMISO_LABEL, PERMISO_HINT } from '../lib/lideres'
import { useAviso } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'

// Normaliza encabezados: minúsculas y sin acentos/ñ (robusto, sin regex de combinantes)
const _normH = h => String(h).trim().toLowerCase()
  .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
  .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')

export default function Personal() {
  const { esAdmin, nombre: adminNombre } = useSession()
  const aviso = useAviso()
  const [all, setAll] = useState([])
  const [areas, setAreas] = useState([])
  const [usaAreas, setUsaAreas] = useState(false)
  const [usaLideres, setUsaLideres] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [edit, setEdit] = useState(null)   // {persona} o {} para nuevo, null = cerrado
  const [importar, setImportar] = useState(false)
  const [aEliminar, setAEliminar] = useState(null)   // persona a eliminar (modal de confirmación)
  const [borrando, setBorrando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [{ data }, feats, ar] = await Promise.all([
      supabase.from('personal').select('*').order('nombre'),
      getFeatures(), getAreas()
    ])
    setAll(data || [])
    setUsaAreas(!!feats.usa_areas)
    setUsaLideres(!!feats.usa_lideres)
    setAreas(ar)
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function confirmarEliminar() {
    const p = aEliminar; if (!p) return
    setBorrando(true)
    const { error } = await supabase.from('personal').delete().eq('id', p.id)
    setBorrando(false)
    if (error) { aviso('No se pudo eliminar: ' + error.message, 'err'); return }
    await logActividad(adminNombre, 'personal_eliminado', p.area, p.nombre,
      `Persona eliminada: ${p.nombre} (${p.rol || 'sin rol'})`, { rol: p.rol, activo: p.activo })
    setAEliminar(null)
    cargar()
  }

  if (!esAdmin) return <div className="empty">Esta sección es solo para administradores.</div>

  return (
    <div className="stack">
      <div className="between">
        <div>
          <h2 style={{ fontSize: 18 }}>Personal</h2>
          <span className="muted">{all.length} personas en total</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setImportar(true)}><Icon.Upload /> Importar CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setEdit({})}><Icon.Plus /> Agregar</button>
        </div>
      </div>

      {cargando ? <div className="center-screen" style={{ minHeight: 160 }}><div className="spin" /></div>
        : all.length === 0 ? <div className="empty">Sin personal cargado.</div>
          : (
            <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
              <table className="tbl">
                <thead><tr><th>#</th><th>Nombre</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {all.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--tinta-2)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>
                        {p.nombre}
                        {usaAreas && p.area && p.area !== 'GENERAL' && (
                          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: areaColor(p.area, areas), background: areaColor(p.area, areas) + '1a', border: '1px solid ' + areaColor(p.area, areas) + '33', padding: '1px 7px', borderRadius: 999 }}>{p.area}</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--tinta-2)', fontSize: 13 }}>{p.rol || '—'}</td>
                      <td><span className={'badge ' + (p.activo ? 'aprobado' : 'rechazado')}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td>
                        <div className="row" style={{ gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => setEdit(p)} title="Editar">✎</button>
                          <button className="btn btn-err btn-sm" style={{ padding: '4px 8px' }} onClick={() => setAEliminar(p)} title="Eliminar">✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

      {edit && (
        <EditarPersona persona={edit} areas={areas} usaAreas={usaAreas} usaLideres={usaLideres} adminNombre={adminNombre}
          onClose={() => setEdit(null)} onGuardado={() => { setEdit(null); cargar() }} />
      )}

      {importar && (
        <ImportarCSV usaAreas={usaAreas} onClose={() => setImportar(false)} onImportado={cargar} />
      )}

      {aEliminar && (
        <div className="consent-ov" onClick={e => { if (e.target === e.currentTarget && !borrando) setAEliminar(null) }}>
          <div className="card stack" style={{ maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 34 }}>🗑️</div>
            <b style={{ fontSize: 17 }}>¿Eliminar a {aEliminar.nombre}?</b>
            <p className="muted">Se borrará del sistema junto con su acceso. Esta acción no se puede deshacer.</p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-ghost grow" onClick={() => setAEliminar(null)} disabled={borrando}>Cancelar</button>
              <button className="btn btn-err grow" onClick={confirmarEliminar} disabled={borrando}>{borrando ? 'Eliminando…' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditarPersona({ persona, areas, usaAreas, usaLideres, adminNombre, onClose, onGuardado }) {
  const esNuevo = !persona.id
  const [f, setF] = useState({
    nombre: persona.nombre || '', rol: persona.rol || '',
    email: persona.email || '', dni: '',
    area: persona.area && persona.area !== 'GENERAL' ? persona.area : '',
    activo: persona.id ? !!persona.activo : true,
    es_lider: !!persona.es_lider,
    lider_areas: Array.isArray(persona.lider_areas) ? persona.lider_areas : [],
    lider_permisos: { ...PERMISOS_DEFAULT, ...(persona.lider_permisos || {}) },
  })
  const [guardando, setGuardando] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const toggleLiderArea = (a) => setF(p => ({ ...p, lider_areas: p.lider_areas.includes(a) ? p.lider_areas.filter(x => x !== a) : [...p.lider_areas, a] }))
  const togglePerm = (k) => setF(p => ({ ...p, lider_permisos: { ...p.lider_permisos, [k]: !p.lider_permisos[k] } }))

  async function guardar() {
    setErr('')
    const nombre = f.nombre.trim(), rol = f.rol.trim()
    const email = f.email.trim().toLowerCase(), dni = f.dni.trim()
    if (!nombre) { setErr('El nombre es obligatorio'); return }
    if ((email && !dni) || (!email && dni)) { setErr('Para el acceso a la app cargá email Y contraseña'); return }
    // Un líder necesita poder ingresar (email+contraseña) y tener área(s) a cargo
    if (f.es_lider && !persona.user_id && !email) { setErr('Un líder necesita email y contraseña para ingresar.'); return }
    if (f.es_lider && f.lider_areas.length === 0) { setErr('Elegí al menos un área a cargo para el líder.'); return }
    const area = usaAreas ? (f.area || 'GENERAL') : 'GENERAL'
    setGuardando(true)

    const fila = {
      nombre, rol, area, activo: f.activo,
      es_lider: f.es_lider,
      lider_areas: f.es_lider ? f.lider_areas : [],
      lider_permisos: f.lider_permisos,
    }
    if (email) fila.email = email
    let error
    if (persona.id) ({ error } = await supabase.from('personal').update(fila).eq('id', persona.id))
    else ({ error } = await supabase.from('personal').insert(fila))
    if (error) { setGuardando(false); setErr('Error: ' + error.message); return }

    if (email && dni) {
      const { data: res, error: e2 } = await supabase.rpc('crear_empleado', {
        p_email: email, p_dni: dni, p_nombre: nombre, p_area: area, p_rol: rol || null
      })
      if (e2 || !res?.ok) { setGuardando(false); setErr('Guardado, pero el acceso falló: ' + (res?.msg || e2?.message || '')); return }
    }

    await logActividad(adminNombre, persona.id ? 'personal_editado' : 'personal_nuevo', area, nombre,
      persona.id ? `Datos editados: ${nombre}` : `Nueva persona: ${nombre} (${rol || 'sin rol'})`, { rol, activo: f.activo })
    setGuardando(false)
    onGuardado()
  }

  return (
    <div className="consent-ov" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card stack" style={{ maxWidth: 420, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="between"><b>{esNuevo ? 'Agregar persona' : 'Editar persona'}</b><button className="btn btn-ghost btn-sm" onClick={onClose}><Icon.X /></button></div>
        <div><label className="lbl">Nombre *</label><input className="inp" value={f.nombre} onChange={e => set('nombre', e.target.value)} /></div>
        <div><label className="lbl">Rol / puesto</label><input className="inp" value={f.rol} onChange={e => set('rol', e.target.value)} placeholder="Ej: Mozo, Cajero…" /></div>
        {usaAreas && (
          <div>
            <label className="lbl">Área</label>
            <select className="inp" value={f.area} onChange={e => set('area', e.target.value)}>
              <option value="">— Sin área —</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
        <div style={{ borderTop: '1px dashed var(--linea)', paddingTop: 12 }}>
          <span className="muted">Acceso a la app (opcional): email + contraseña.</span>
        </div>
        <div><label className="lbl">Email</label><input className="inp" type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="empleado@gmail.com" /></div>
        <div><label className="lbl">Contraseña {persona.id ? '(dejar vacío = no cambiar)' : ''}</label><input className="inp" value={f.dni} onChange={e => set('dni', e.target.value)} placeholder="Contraseña del empleado" /></div>
        <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.activo} onChange={e => set('activo', e.target.checked)} /> Activo
        </label>

        {usaLideres && (
          <div style={{ borderTop: '1px dashed var(--linea)', paddingTop: 12 }} className="stack">
            <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={f.es_lider} onChange={e => set('es_lider', e.target.checked)} />
              <span><b>Es líder</b> <div className="muted" style={{ fontSize: 12 }}>Además de fichar, gestiona su(s) área(s) según los permisos.</div></span>
            </label>

            {f.es_lider && (
              <>
                <div>
                  <label className="lbl">Área(s) a cargo</label>
                  {areas.length === 0 ? <div className="muted">No hay áreas cargadas (Configuración → Áreas).</div>
                    : (
                      <div style={{ border: '1px solid var(--linea)', borderRadius: 10, maxHeight: 150, overflowY: 'auto' }}>
                        {areas.map(a => (
                          <label key={a} className="row" style={{ gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--linea)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={f.lider_areas.includes(a)} onChange={() => toggleLiderArea(a)} />
                            <span>{a}</span>
                          </label>
                        ))}
                      </div>
                    )}
                </div>
                <div>
                  <label className="lbl">Permisos del líder</label>
                  <div style={{ border: '1px solid var(--linea)', borderRadius: 10 }}>
                    {Object.keys(PERMISO_LABEL).map(k => (
                      <label key={k} className="between" style={{ padding: '9px 12px', borderBottom: '1px solid var(--linea)', cursor: 'pointer' }}>
                        <span>{PERMISO_LABEL[k]} <span className="muted" style={{ fontSize: 11 }}>· {PERMISO_HINT[k]}</span></span>
                        <input type="checkbox" checked={!!f.lider_permisos[k]} onChange={() => togglePerm(k)} />
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {err && <div className="err-txt">{err}</div>}
        <button className="btn btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : (esNuevo ? 'Guardar' : 'Actualizar')}</button>
      </div>
    </div>
  )
}

// ── Importación masiva por CSV ──────────────────────────────────────────────
function ImportarCSV({ usaAreas, onClose, onImportado }) {
  const [filas, setFilas] = useState(null)
  const [err, setErr] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado] = useState(null)

  function descargarPlantilla() {
    const cols = ['Nombre', 'Rol', 'Email', 'Contraseña', ...(usaAreas ? ['Área'] : [])]
    const ejemplo = ['Juan Pérez', 'Mozo', 'juan@gmail.com', '1234', ...(usaAreas ? ['Barra'] : [])]
    const csv = '﻿' + [cols.join(','), ejemplo.map(x => `"${x}"`).join(',')].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = 'plantilla_personal.csv'; a.click()
  }

  async function onArchivo(e) {
    setErr(''); setResultado(null); setFilas(null)
    const file = e.target.files[0]; if (!file) return
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
        .filter(r => r.some(c => String(c).trim()))   // saca filas vacías
      if (rows.length < 2) { setErr('El archivo no tiene filas de datos.'); return }
      const H = rows[0].map(_normH)
      const has = (h, ...subs) => subs.some(s => h.includes(s))
      const iN = H.findIndex(h => has(h, 'nombre'))
      const iR = H.findIndex(h => has(h, 'rol', 'puesto'))
      const iE = H.findIndex(h => has(h, 'email', 'correo', 'mail'))
      const iP = H.findIndex(h => has(h, 'contrase', 'clave', 'password', 'pass'))
      const iA = H.findIndex(h => has(h, 'area'))
      if (iN < 0) { setErr('Falta la columna "Nombre". Fijate que la primera fila tenga los títulos.'); return }
      const val = (r, i) => (i >= 0 ? String(r[i] ?? '').trim() : '')
      const data = rows.slice(1)
        .filter(r => val(r, iN))
        .map(r => ({
          nombre: val(r, iN), rol: val(r, iR),
          email: val(r, iE).toLowerCase(), pass: val(r, iP), area: val(r, iA)
        }))
      if (!data.length) { setErr('No se encontraron filas con nombre.'); return }
      setFilas(data)
    } catch (ex) {
      setErr('No se pudo leer el archivo. Subí un Excel (.xlsx) o un CSV.')
    }
  }

  async function importar() {
    setProcesando(true)
    let creados = 0; const errores = []
    for (let k = 0; k < filas.length; k++) {
      const f = filas[k]
      try {
        if ((f.email && !f.pass) || (!f.email && f.pass)) throw new Error('email y contraseña deben ir juntos')
        const area = usaAreas ? (f.area || 'GENERAL') : 'GENERAL'
        if (f.email && f.pass) {
          const { data, error } = await supabase.rpc('crear_empleado', { p_email: f.email, p_dni: f.pass, p_nombre: f.nombre, p_area: area, p_rol: f.rol || null })
          if (error || !data?.ok) throw new Error(data?.msg || error?.message || 'no se pudo crear')
        } else {
          const { error } = await supabase.from('personal').insert({ nombre: f.nombre, rol: f.rol, area, activo: true })
          if (error) throw new Error(error.message)
        }
        creados++
      } catch (e) { errores.push({ fila: k + 2, nombre: f.nombre, msg: e.message }) }
    }
    setProcesando(false)
    setResultado({ creados, errores })
    onImportado()
  }

  return (
    <div className="consent-ov" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card stack" style={{ maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="between"><b>Importar personal (Excel o CSV)</b><button className="btn btn-ghost btn-sm" onClick={onClose}><Icon.X /></button></div>

        {resultado ? (
          <>
            <div className="result ok" style={{ marginTop: 0 }}>Creados: <b>{resultado.creados}</b>{resultado.errores.length ? ` · Con error: ${resultado.errores.length}` : ''}</div>
            {resultado.errores.length > 0 && (
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--linea)', borderRadius: 10, padding: '8px 12px' }}>
                {resultado.errores.map((e, i) => (
                  <div key={i} style={{ fontSize: 13, padding: '3px 0' }}>Fila {e.fila} ({e.nombre}): <span className="err-txt">{e.msg}</span></div>
                ))}
              </div>
            )}
            <button className="btn btn-primary" onClick={onClose}>Listo</button>
          </>
        ) : (
          <>
            <div className="muted">
              1) Descargá la plantilla, 2) completá las filas, 3) subí el archivo (podés subir el <b>Excel .xlsx</b> tal cual, o un CSV).
              Columnas: <b>Nombre</b> (obligatorio), Rol, Email, Contraseña{usaAreas ? ', Área' : ''}.
              El Email + Contraseña son opcionales (solo si esa persona va a entrar a la app).
            </div>
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={descargarPlantilla}><Icon.File /> Descargar plantilla</button>
            <div>
              <label className="lbl">Archivo (Excel o CSV)</label>
              <input className="inp" type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={onArchivo} />
            </div>
            {err && <div className="err-txt">{err}</div>}
            {filas && <div className="muted">{filas.length} fila(s) listas para importar.</div>}
            <button className="btn btn-primary" onClick={importar} disabled={!filas || procesando}>
              {procesando ? 'Importando…' : `Importar ${filas ? filas.length : ''}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

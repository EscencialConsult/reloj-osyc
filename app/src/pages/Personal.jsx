import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { getFeatures, getAreas } from '../lib/config'
import { areaColor } from '../lib/calculos'
import { logActividad } from '../lib/audit'
import { Icon } from '../components/icons.jsx'

export default function Personal() {
  const { esAdmin, nombre: adminNombre } = useSession()
  const [all, setAll] = useState([])
  const [areas, setAreas] = useState([])
  const [usaAreas, setUsaAreas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [edit, setEdit] = useState(null)   // {persona} o {} para nuevo, null = cerrado

  const cargar = useCallback(async () => {
    setCargando(true)
    const [{ data }, feats, ar] = await Promise.all([
      supabase.from('personal').select('*').order('nombre'),
      getFeatures(), getAreas()
    ])
    setAll(data || [])
    setUsaAreas(!!feats.usa_areas)
    setAreas(ar)
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function borrar(p) {
    if (!window.confirm(`¿Eliminar a ${p.nombre}?`)) return
    const { error } = await supabase.from('personal').delete().eq('id', p.id)
    if (error) { alert('Error al eliminar'); return }
    await logActividad(adminNombre, 'personal_eliminado', p.area, p.nombre,
      `Persona eliminada: ${p.nombre} (${p.rol || 'sin rol'})`, { rol: p.rol, activo: p.activo })
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
        <button className="btn btn-primary btn-sm" onClick={() => setEdit({})}><Icon.Plus /> Agregar</button>
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
                          <button className="btn btn-err btn-sm" style={{ padding: '4px 8px' }} onClick={() => borrar(p)} title="Eliminar">✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

      {edit && (
        <EditarPersona persona={edit} areas={areas} usaAreas={usaAreas} adminNombre={adminNombre}
          onClose={() => setEdit(null)} onGuardado={() => { setEdit(null); cargar() }} />
      )}
    </div>
  )
}

function EditarPersona({ persona, areas, usaAreas, adminNombre, onClose, onGuardado }) {
  const esNuevo = !persona.id
  const [f, setF] = useState({
    nombre: persona.nombre || '', rol: persona.rol || '',
    email: persona.email || '', dni: '',
    area: persona.area && persona.area !== 'GENERAL' ? persona.area : '',
    activo: persona.id ? !!persona.activo : true
  })
  const [guardando, setGuardando] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  async function guardar() {
    setErr('')
    const nombre = f.nombre.trim(), rol = f.rol.trim()
    const email = f.email.trim().toLowerCase(), dni = f.dni.trim()
    if (!nombre) { setErr('El nombre es obligatorio'); return }
    if ((email && !dni) || (!email && dni)) { setErr('Para el acceso a la app cargá email Y DNI'); return }
    const area = usaAreas ? (f.area || 'GENERAL') : 'GENERAL'
    setGuardando(true)

    const fila = { nombre, rol, area, activo: f.activo }
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
      <div className="card stack" style={{ maxWidth: 420, width: '100%' }}>
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
          <span className="muted">Acceso a la app (opcional): email + DNI. El DNI es la contraseña.</span>
        </div>
        <div><label className="lbl">Email</label><input className="inp" type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="empleado@osyc.com" /></div>
        <div><label className="lbl">DNI {persona.id ? '(dejar vacío = no cambiar)' : ''}</label><input className="inp" inputMode="numeric" value={f.dni} onChange={e => set('dni', e.target.value)} placeholder="Sin puntos" /></div>
        <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.activo} onChange={e => set('activo', e.target.checked)} /> Activo
        </label>
        {err && <div className="err-txt">{err}</div>}
        <button className="btn btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : (esNuevo ? 'Guardar' : 'Actualizar')}</button>
      </div>
    </div>
  )
}

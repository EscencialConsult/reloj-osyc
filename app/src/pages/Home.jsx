import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { today, fmtDate } from '../lib/fechas'
import { NAV } from '../components/nav.js'
import { Icon } from '../components/icons.jsx'
import { tipoLabel } from './Solicitudes.jsx'

export default function Home() {
  const { nombre, esAdmin } = useSession()
  const [stats, setStats] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [pend, setPend] = useState([])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const hoy = today()
      const [fichHoy, pendientes, noLeidos, activos, ultAvisos] = await Promise.all([
        esAdmin ? supabase.from('registros').select('id', { count: 'exact', head: true }).eq('fecha', hoy) : Promise.resolve({ count: null }),
        supabase.from('solicitudes').select('*, personal:personal_id(nombre)').eq('estado', 'pendiente').order('created_at', { ascending: false }),
        supabase.rpc('avisos_no_leidos'),
        esAdmin ? supabase.from('personal').select('id', { count: 'exact', head: true }).eq('activo', true) : Promise.resolve({ count: null }),
        supabase.from('avisos').select('*').order('created_at', { ascending: false }).limit(4)
      ])
      if (!vivo) return
      setStats({ fichHoy: fichHoy.count, pendientes: (pendientes.data || []).length, noLeidos: noLeidos.data || 0, activos: activos.count })
      setPend((pendientes.data || []).slice(0, 5))
      setAvisos(ultAvisos.data || [])
    })()
    return () => { vivo = false }
  }, [esAdmin])

  const tiles = esAdmin
    ? [
      { n: stats?.fichHoy ?? '—', t: 'Fichajes hoy', to: '/registros', icon: Icon.Pin },
      { n: stats?.pendientes ?? '—', t: 'Solicitudes pendientes', to: '/solicitudes', icon: Icon.Inbox, alerta: stats?.pendientes > 0 },
      { n: stats?.noLeidos ?? '—', t: 'Avisos sin leer', to: '/avisos', icon: Icon.Bell },
      { n: stats?.activos ?? '—', t: 'Personas activas', to: '/personal', icon: Icon.Users },
    ]
    : [
      { n: stats?.pendientes ?? '—', t: 'Mis solicitudes pendientes', to: '/solicitudes', icon: Icon.Inbox },
      { n: stats?.noLeidos ?? '—', t: 'Avisos sin leer', to: '/avisos', icon: Icon.Bell },
    ]

  const accesos = NAV.filter(n => n.to !== '/' && (!n.admin || esAdmin))

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 24 }}>Hola, {nombre}</h1>
        <p className="muted">{esAdmin ? 'Resumen de hoy · Administrador' : 'Bienvenido a tu panel'}</p>
      </div>

      {/* Stat tiles */}
      <div className="dash-stats">
        {tiles.map((x, i) => {
          const Ic = x.icon
          return (
            <Link key={i} to={x.to} className={'stat-card' + (x.alerta ? ' alerta' : '')}>
              <div className="stat-ic"><Ic /></div>
              <div className="stat-n">{x.n}</div>
              <div className="stat-t">{x.t}</div>
            </Link>
          )
        })}
      </div>

      {/* Accesos rápidos */}
      <div>
        <div className="dash-h">Accesos rápidos</div>
        <div className="quick-row">
          {accesos.map(a => {
            const Ic = a.icon
            return <Link key={a.to} to={a.to} className="quick-chip"><Ic width={16} height={16} /> {a.label}</Link>
          })}
        </div>
      </div>

      {/* Dos columnas: avisos + pendientes */}
      <div className="dash-cols">
        <div className="card stack">
          <div className="between"><b>Últimos avisos</b><Link to="/avisos" className="linklike">ver todos</Link></div>
          {avisos.length === 0 ? <div className="muted">Sin avisos.</div> : avisos.map(a => (
            <Link key={a.id} to="/avisos" className="mini-item">
              <div style={{ fontWeight: 700, fontSize: 14 }}>{a.titulo}</div>
              <div className="muted" style={{ fontSize: 12 }}>{fmtDate(a.created_at.slice(0, 10))}</div>
            </Link>
          ))}
        </div>

        <div className="card stack">
          <div className="between"><b>{esAdmin ? 'Solicitudes pendientes' : 'Mis solicitudes pendientes'}</b><Link to="/solicitudes" className="linklike">ver todas</Link></div>
          {pend.length === 0 ? <div className="muted">Nada pendiente. 👌</div> : pend.map(s => (
            <Link key={s.id} to={`/solicitudes/${s.id}`} className="mini-item between">
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{tipoLabel(s.tipo)}</div>
                {esAdmin && s.personal?.nombre && <div className="muted" style={{ fontSize: 12 }}>{s.personal.nombre}</div>}
              </div>
              <span className="badge pendiente">pendiente</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

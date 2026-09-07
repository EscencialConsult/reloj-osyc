import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSession } from '../lib/session.jsx'
import { supabase } from '../lib/supabase'
import { Icon } from './icons.jsx'
import { NAV } from './nav.js'
import Campana from './Campana.jsx'

export default function Layout({ children }) {
  const { esAdmin, logout } = useSession()
  const location = useLocation()
  const [noLeidos, setNoLeidos] = useState(0)
  const [pendientes, setPendientes] = useState(0)   // solicitudes pendientes (admin)
  const [menu, setMenu] = useState(false)   // drawer abierto en celular

  useEffect(() => {
    let vivo = true
    supabase.rpc('avisos_no_leidos').then(({ data }) => { if (vivo) setNoLeidos(data || 0) })
    if (esAdmin) {
      supabase.from('solicitudes').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente')
        .then(({ count }) => { if (vivo) setPendientes(count || 0) })
    }
    return () => { vivo = false }
  }, [location.pathname, esAdmin])

  // Cerrar el menú al navegar (celular)
  useEffect(() => { setMenu(false) }, [location.pathname])

  const items = NAV.filter(n => !n.admin || esAdmin)

  return (
    <div className="shell">
      {/* Barra lateral (fija en desktop, drawer en celular) */}
      <aside className={'sidebar' + (menu ? ' open' : '')}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="OSYC" style={{ width: '100%', maxWidth: 155, display: 'block' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--tinta-2)', letterSpacing: '.05em' }}>GESTIÓN</span>
        </div>
        <nav className="sidebar-nav">
          {items.map(n => {
            const Ic = n.icon
            return (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}>
                <Ic />
                <span>{n.label}</span>
                {n.badge === 'avisos' && noLeidos > 0 && <span className="pill-count" style={{ marginLeft: 'auto' }}>{noLeidos}</span>}
                {n.badge === 'solicitudes' && pendientes > 0 && <span className="pill-count" style={{ marginLeft: 'auto' }}>{pendientes}</span>}
              </NavLink>
            )
          })}
        </nav>
        <button className="side-link side-salir" onClick={logout}><Icon.Logout /> <span>Salir</span></button>
      </aside>

      {/* Fondo oscuro al abrir el drawer en celular */}
      {menu && <div className="drawer-bg" onClick={() => setMenu(false)} />}

      {/* Columna de contenido */}
      <div className="content">
        <header className="topbar">
          <button className="hamb only-mobile" onClick={() => setMenu(true)} aria-label="Menú"><Icon.Menu /></button>
          <img className="only-mobile" src="/logo.png" alt="OSYC" style={{ height: 26 }} />
          <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
            <Campana />
            <button className="btn btn-ghost btn-sm only-mobile" onClick={logout}><Icon.Logout /> Salir</button>
          </div>
        </header>
        <main className="content-inner">{children}</main>
      </div>
    </div>
  )
}

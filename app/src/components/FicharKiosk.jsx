// Modo "kiosco": cuando el empleado entra por el QR (/fichar?sede=...), ve la
// pantalla de Fichar enfocada, con un acceso a su panel (avisos/solicitudes).
import { Link } from 'react-router-dom'
import { useSession } from '../lib/session.jsx'
import { Icon } from './icons.jsx'
import Campana from './Campana.jsx'
import Fichar from '../pages/Fichar.jsx'

export default function FicharKiosk() {
  const { logout } = useSession()
  return (
    <div className="kiosk">
      <header className="kiosk-bar">
        <div className="brand">OS<b>YC</b></div>
        <div className="row" style={{ gap: 8 }}>
          <Campana />
          <button className="btn btn-ghost btn-sm" onClick={logout}><Icon.Logout /> Salir</button>
        </div>
      </header>
      <main className="kiosk-body">
        <Fichar />
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
            <Icon.Bell /> Ver mis avisos y solicitudes
          </Link>
        </div>
      </main>
    </div>
  )
}

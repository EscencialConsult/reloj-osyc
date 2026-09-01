// Modo "kiosco": cuando el empleado entra por el QR (/fichar?sede=...), ve SOLO
// la pantalla de Fichar, sin barra lateral ni el resto de las opciones.
import { useSession } from '../lib/session.jsx'
import { Icon } from './icons.jsx'
import Fichar from '../pages/Fichar.jsx'

export default function FicharKiosk() {
  const { logout } = useSession()
  return (
    <div className="kiosk">
      <header className="kiosk-bar">
        <div className="brand">OS<b>YC</b></div>
        <button className="btn btn-ghost btn-sm" onClick={logout}><Icon.Logout /> Salir</button>
      </header>
      <main className="kiosk-body">
        <Fichar />
      </main>
    </div>
  )
}

import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useSession } from './lib/session.jsx'
import Login from './components/Login.jsx'
import Lider from './pages/Lider.jsx'
import FicharKiosk from './components/FicharKiosk.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Fichar from './pages/Fichar.jsx'
import Avisos from './pages/Avisos.jsx'
import Solicitudes from './pages/Solicitudes.jsx'
import SolicitudDetalle from './pages/SolicitudDetalle.jsx'
import Registros from './pages/Registros.jsx'
import Personal from './pages/Personal.jsx'
import Configuracion from './pages/Configuracion.jsx'
import Horarios from './pages/Horarios.jsx'
import Informes from './pages/Informes.jsx'

export default function App() {
  const { session, cargando } = useSession()
  const location = useLocation()

  if (cargando) {
    return <div className="center-screen"><div className="spin" /></div>
  }
  // El rol Líder tiene su propio acceso (tabla lideres), fuera del login de empleados/admin
  if (location.pathname.startsWith('/lider')) return <Lider />
  if (!session) return <Login />

  // Modo kiosco: si entró por el QR de una sucursal (/fichar?sede=...), solo ve Fichar
  const sedeQR = new URLSearchParams(location.search).get('sede')
  if (location.pathname === '/fichar' && sedeQR) return <FicharKiosk />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fichar" element={<Fichar />} />
        <Route path="/avisos" element={<Avisos />} />
        <Route path="/solicitudes" element={<Solicitudes />} />
        <Route path="/solicitudes/:id" element={<SolicitudDetalle />} />
        <Route path="/registros" element={<Registros />} />
        <Route path="/personal" element={<Personal />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/horarios" element={<Horarios />} />
        <Route path="/informes" element={<Informes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

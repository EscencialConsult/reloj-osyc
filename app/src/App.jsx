import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useSession } from './lib/session.jsx'
import Login from './components/Login.jsx'
import Layout from './components/Layout.jsx'

// Cada pantalla se carga SOLO cuando se entra (code-splitting).
// Así abrir la app / una notificación es rápido y liviano en el celular,
// y lo pesado (gráficos de Informes, QR de Configuración) no se baja de más.
const Lider = lazy(() => import('./pages/Lider.jsx'))
const FicharKiosk = lazy(() => import('./components/FicharKiosk.jsx'))
const Home = lazy(() => import('./pages/Home.jsx'))
const Fichar = lazy(() => import('./pages/Fichar.jsx'))
const Avisos = lazy(() => import('./pages/Avisos.jsx'))
const Solicitudes = lazy(() => import('./pages/Solicitudes.jsx'))
const SolicitudDetalle = lazy(() => import('./pages/SolicitudDetalle.jsx'))
const Registros = lazy(() => import('./pages/Registros.jsx'))
const Personal = lazy(() => import('./pages/Personal.jsx'))
const Configuracion = lazy(() => import('./pages/Configuracion.jsx'))
const Horarios = lazy(() => import('./pages/Horarios.jsx'))
const Informes = lazy(() => import('./pages/Informes.jsx'))

const Cargando = () => <div className="center-screen" style={{ minHeight: 200 }}><div className="spin" /></div>

export default function App() {
  const { session, cargando } = useSession()
  const location = useLocation()

  if (cargando) return <Cargando />

  // El rol Líder tiene su propio acceso (tabla lideres), fuera del login de empleados/admin
  if (location.pathname.startsWith('/lider')) return <Suspense fallback={<Cargando />}><Lider /></Suspense>
  if (!session) return <Login />

  // Modo kiosco: si entró por el QR de una sucursal (/fichar?sede=...), solo ve Fichar
  const sedeQR = new URLSearchParams(location.search).get('sede')
  if (location.pathname === '/fichar' && sedeQR) return <Suspense fallback={<Cargando />}><FicharKiosk /></Suspense>

  return (
    <Layout>
      <Suspense fallback={<Cargando />}>
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
      </Suspense>
    </Layout>
  )
}

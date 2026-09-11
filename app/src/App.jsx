import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useSession } from './lib/session.jsx'
import Login from './components/Login.jsx'
import Layout from './components/Layout.jsx'

// Cada pantalla se carga SOLO cuando se entra (code-splitting).
// Así abrir la app / una notificación es rápido y liviano en el celular,
// y lo pesado (gráficos de Informes, QR de Configuración) no se baja de más.
//
// Si falla la carga de un "pedazo" (típico cuando hubo un deploy nuevo y la
// pestaña estaba abierta con la versión vieja), recargamos la página una vez
// para traer la versión nueva, en vez de mostrar pantalla en blanco.
const reintentar = (factory) => lazy(async () => {
  try { return await factory() }
  catch (e) {
    const key = 'chekapp-reload-chunk'
    const ultima = Number(sessionStorage.getItem(key) || '0')
    if (Date.now() - ultima > 10000) {
      sessionStorage.setItem(key, String(Date.now()))
      window.location.reload()
      return new Promise(() => {})   // no resuelve: la página se está recargando
    }
    throw e
  }
})
const Equipo = reintentar(() => import('./pages/Equipo.jsx'))
const FicharKiosk = reintentar(() => import('./components/FicharKiosk.jsx'))
const Home = reintentar(() => import('./pages/Home.jsx'))
const Fichar = reintentar(() => import('./pages/Fichar.jsx'))
const Avisos = reintentar(() => import('./pages/Avisos.jsx'))
const AvisoDetalle = reintentar(() => import('./pages/AvisoDetalle.jsx'))
const Solicitudes = reintentar(() => import('./pages/Solicitudes.jsx'))
const SolicitudDetalle = reintentar(() => import('./pages/SolicitudDetalle.jsx'))
const Registros = reintentar(() => import('./pages/Registros.jsx'))
const Personal = reintentar(() => import('./pages/Personal.jsx'))
const Configuracion = reintentar(() => import('./pages/Configuracion.jsx'))
const Horarios = reintentar(() => import('./pages/Horarios.jsx'))
const Informes = reintentar(() => import('./pages/Informes.jsx'))

const Cargando = () => <div className="center-screen" style={{ minHeight: 200 }}><div className="spin" /></div>

export default function App() {
  const { session, cargando } = useSession()
  const location = useLocation()

  if (cargando) return <Cargando />

  // Compatibilidad: el viejo enlace /lider ahora es una sección más del panel normal
  if (location.pathname.startsWith('/lider')) return <Navigate to="/equipo" replace />
  if (!session) return <Login />

  // Modo kiosco: si entró por el QR de una sucursal, solo ve Fichar.
  // Se acepta /fichar y /fichar.html (para que los QR viejos ya impresos sigan sirviendo).
  const sedeQR = new URLSearchParams(location.search).get('sede')
  const esRutaFichar = location.pathname === '/fichar' || location.pathname === '/fichar.html'
  if (esRutaFichar && sedeQR) return <Suspense fallback={<Cargando />}><FicharKiosk /></Suspense>

  return (
    <Layout>
      <Suspense fallback={<Cargando />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fichar" element={<Fichar />} />
          <Route path="/fichar.html" element={<Fichar />} />
          <Route path="/avisos" element={<Avisos />} />
          <Route path="/avisos/:id" element={<AvisoDetalle />} />
          <Route path="/equipo" element={<Equipo />} />
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

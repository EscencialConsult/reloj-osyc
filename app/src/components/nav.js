// Navegación central del sistema. La usan la barra lateral y el tablero de Inicio.
// admin:true → solo visible para administradores.
import { Icon } from './icons.jsx'

export const NAV = [
  { to: '/', label: 'Inicio', icon: Icon.Home, end: true },
  { to: '/fichar', label: 'Fichar', icon: Icon.Pin },
  { to: '/avisos', label: 'Avisos', icon: Icon.Bell, badge: 'avisos' },
  { to: '/solicitudes', label: 'Solicitudes', icon: Icon.Inbox },
  { to: '/registros', label: 'Registros', icon: Icon.File, admin: true },
  { to: '/personal', label: 'Personal', icon: Icon.Users, admin: true },
  { to: '/horarios', label: 'Horarios', icon: Icon.Calendar, admin: true },
  { to: '/informes', label: 'Informes', icon: Icon.Chart, admin: true },
  { to: '/configuracion', label: 'Configuración', icon: Icon.Settings, admin: true },
]

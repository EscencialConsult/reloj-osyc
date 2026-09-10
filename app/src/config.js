// ============================================================================
// CONFIGURACIÓN POR EMPRESA
// ----------------------------------------------------------------------------
// Al DUPLICAR el sistema para otra empresa, esto es lo único (junto con el logo)
// que hay que cambiar. Ver la guía NUEVA_EMPRESA.md en la raíz del proyecto.
// ============================================================================

// Nombre corto de la empresa (aparece en títulos de pestaña, etc.)
export const EMPRESA = 'OSYC'

// Nombre COMERCIAL del producto (mismo para todas las empresas). Se usa en el
// texto de consentimiento y en el nombre con el que se instala la app (PWA).
// La marca visible dentro de la app (logo/color) sigue siendo la de la empresa.
export const APP_NAME = 'ChekApp'

// Proyecto Supabase de ESTA empresa  (Supabase → Settings → API)
export const SUPABASE_URL = 'https://zbaqcbadqefaggpbylfn.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYXFjYmFkcWVmYWdncGJ5bGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzcxOTAsImV4cCI6MjEwMzQxMzE5MH0.oW92ZOpWcPAeK037DUS5BMFhh0c0XLSCTbVN7Fa108M'

// Clave PÚBLICA VAPID para las notificaciones push de ESTA empresa.
// (La privada va SOLO como secret en la Edge Function de Supabase.)
export const VAPID_PUBLIC = 'BPzqOcIRrdhP_nrJnSCsUTbVnE9-jo6zXGKp5VJTKDUaieJnIuvSLXnzArv31Kja-ahbZab1q69u41vCv1qLmAQ'

// Color de marca de ESTA empresa (para personalizar el reloj por empresa).
//   COLOR   = principal (botones, links, barra activa)
//   COLOR_2 = variante más clara (degradés de botones/logo)
export const COLOR = '#2c6eb4'
export const COLOR_2 = '#5a97d4'

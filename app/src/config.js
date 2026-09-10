// ============================================================================
// CONFIGURACIÓN POR EMPRESA
// ----------------------------------------------------------------------------
// Al DUPLICAR el sistema para otra empresa, esto es lo único (junto con el logo)
// que hay que cambiar. Ver la guía NUEVA_EMPRESA.md en la raíz del proyecto.
// ============================================================================

// Nombre corto de la empresa (aparece en títulos de pestaña, etc.)
export const EMPRESA = 'ONE'

// Nombre COMERCIAL del producto (mismo para todas las empresas). Se usa en el
// texto de consentimiento y en el nombre con el que se instala la app (PWA).
// La marca visible dentro de la app (logo/color) sigue siendo la de la empresa.
export const APP_NAME = 'ChekApp'

// Proyecto Supabase de ESTA empresa  (Supabase → Settings → API)
export const SUPABASE_URL = 'https://xgmhcerbdnspdhyibnxi.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbWhjZXJiZG5zcGRoeWlibnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5OTIzMDQsImV4cCI6MjEwNDU2ODMwNH0.n-Ba6PbJmgmG-qurFuQtbVpTUCgVa4nsBJtwxew7hTA'

// Clave PÚBLICA VAPID para las notificaciones push de ESTA empresa.
// (La privada va SOLO como secret en la Edge Function de Supabase.)
export const VAPID_PUBLIC = 'BIxFmz7scGeh4f9a-QHdSRwyxp6mAug7oEg5IE63nFEQUWJWQPVs0X1O9FVxucIp6UCyls7SkvqG7rA492jlOXk'

// Color de marca de ESTA empresa (para personalizar el reloj por empresa).
//   COLOR   = principal (botones, links, barra activa) — un poco intenso para que el texto blanco se lea
//   COLOR_2 = variante más clara (extremo del degradé) — el rosa exacto de la marca
// Fondo siempre blanco. Paleta de acentos de la empresa (por si se usan en detalles a futuro):
//   rosa #e17bd7 · celeste #6be1e3 · dorado #e4c76a · gris #a4a8c0
export const COLOR = '#d24fbf'
export const COLOR_2 = '#e17bd7'

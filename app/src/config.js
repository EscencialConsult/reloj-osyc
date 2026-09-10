// ============================================================================
// CONFIGURACIÓN POR EMPRESA
// ----------------------------------------------------------------------------
// Al DUPLICAR el sistema para otra empresa, esto es lo único (junto con el logo)
// que hay que cambiar. Ver la guía NUEVA_EMPRESA.md en la raíz del proyecto.
// ============================================================================

// Nombre corto de la empresa (aparece en títulos de pestaña, etc.)
export const EMPRESA = 'Escencial'

// Proyecto Supabase de ESTA empresa  (Supabase → Settings → API)
export const SUPABASE_URL = 'https://xgmhcerbdnspdhyibnxi.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbWhjZXJiZG5zcGRoeWlibnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5OTIzMDQsImV4cCI6MjEwNDU2ODMwNH0.n-Ba6PbJmgmG-qurFuQtbVpTUCgVa4nsBJtwxew7hTA'

// Clave PÚBLICA VAPID para las notificaciones push de ESTA empresa.
// (La privada va SOLO como secret en la Edge Function de Supabase.)
export const VAPID_PUBLIC = 'BIxFmz7scGeh4f9a-QHdSRwyxp6mAug7oEg5IE63nFEQUWJWQPVs0X1O9FVxucIp6UCyls7SkvqG7rA492jlOXk'

// Color de marca de ESTA empresa (para personalizar el reloj por empresa).
//   COLOR   = principal (botones, links, barra activa)
//   COLOR_2 = variante más clara (degradés de botones/logo)
// (Cambiá estos valores por los de Escencial cuando tengas su color de marca.)
export const COLOR = '#2c6eb4'
export const COLOR_2 = '#5a97d4'

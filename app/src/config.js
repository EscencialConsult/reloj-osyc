// ============================================================================
// CONFIGURACIÓN POR EMPRESA
// ----------------------------------------------------------------------------
// Al DUPLICAR el sistema para otra empresa, esto es lo único (junto con el logo)
// que hay que cambiar. Ver la guía NUEVA_EMPRESA.md en la raíz del proyecto.
// ============================================================================

// Nombre corto de la empresa (aparece en títulos de pestaña, etc.)
export const EMPRESA = 'Nati Modas Online'

// Nombre COMERCIAL del producto (mismo para todas las empresas). Se usa en el
// texto de consentimiento y en el nombre con el que se instala la app (PWA).
// La marca visible dentro de la app (logo/color) sigue siendo la de la empresa.
export const APP_NAME = 'ChekApp'

// Proyecto Supabase de ESTA empresa  (Supabase → Settings → API)
// ⚠️ DEMO NUEVA: crear un proyecto Supabase PROPIO y pegar acá su URL y anon key.
//    NO reutilizar los de ONE ni OSYC (compartiría su base de producción).
export const SUPABASE_URL = 'https://yilaxsihaowapvuiffzd.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbGF4c2loYW93YXB2dWlmZnpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzODMzMDQsImV4cCI6MjEwNjk1OTMwNH0.SUbnzcn-jgwfgRC6lT5wM3TBfHjAQyaW-ljzr8oX13Y'

// Clave PÚBLICA VAPID para las notificaciones push de ESTA empresa.
// (La privada va SOLO como secret en la Edge Function de Supabase.)
// Generar con: npx web-push generate-vapid-keys  (ver README_push.md)
export const VAPID_PUBLIC = 'PEGAR_VAPID_PUBLIC_DE_ESTA_DEMO'

// Color de marca de ESTA empresa (para personalizar el reloj por empresa).
//   COLOR   = principal (botones, links, barra activa) — un poco intenso para que el texto blanco se lea
//   COLOR_2 = variante más clara (extremo del degradé) — marrón caramelo (que el texto blanco se lea)
// Fondo siempre blanco. Paleta real de Nati Modas: marrón #56412a · nude (fondo del logo) #e8d2c7
export const COLOR = '#56412a'
export const COLOR_2 = '#8a6a45'

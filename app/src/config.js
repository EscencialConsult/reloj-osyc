// ============================================================================
// CONFIGURACIÓN POR EMPRESA
// ----------------------------------------------------------------------------
// Al DUPLICAR el sistema para otra empresa, esto es lo único (junto con el logo)
// que hay que cambiar. Ver la guía NUEVA_EMPRESA.md en la raíz del proyecto.
// ============================================================================

// Nombre corto de la empresa (aparece en títulos de pestaña, etc.)
export const EMPRESA = 'OSPA'

// Nombre COMERCIAL del producto (mismo para todas las empresas). Se usa en el
// texto de consentimiento y en el nombre con el que se instala la app (PWA).
// La marca visible dentro de la app (logo/color) sigue siendo la de la empresa.
export const APP_NAME = 'ChekApp'

// Proyecto Supabase de ESTA empresa  (Supabase → Settings → API)
// ⚠️ EMPRESA NUEVA: crear un proyecto Supabase PROPIO y pegar acá su URL y anon key.
//    NO reutilizar los de OSYC/ONE (compartiría su base de producción).
export const SUPABASE_URL = 'https://xxuffygpjqvktismwjfq.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dWZmeWdwanF2a3Rpc213amZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTMyNjYsImV4cCI6MjEwNzY2OTI2Nn0.CABV93RawB83cVyRE6q8wku4wxIfMn8zfF88v8pu2AU'

// Clave PÚBLICA VAPID para las notificaciones push de ESTA empresa.
// (La privada va SOLO como secret en la Edge Function de Supabase.)
// Generar con: npx web-push generate-vapid-keys  (ver README_push.md)
export const VAPID_PUBLIC = 'PEGAR_VAPID_PUBLIC_DE_ESTA_EMPRESA'

// Color de marca de ESTA empresa (para personalizar el reloj por empresa).
//   COLOR   = principal (botones, links, barra activa)
//   COLOR_2 = variante más clara (degradés de botones/logo)
// Paleta OSPA: azul #4871ac (principal) · verde #72ae55 · verde claro #cfdcb5 · dorado #ebb23c
export const COLOR = '#4871ac'
export const COLOR_2 = '#6d97d0'

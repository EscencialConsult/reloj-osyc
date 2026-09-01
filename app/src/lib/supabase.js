// src/lib/supabase.js — cliente Supabase (mismo proyecto que el reloj actual)
import { createClient } from '@supabase/supabase-js'

// Misma URL + anon key pública que usa js/supabase.js del sitio HTML.
// (La anon key NO es secreta: ya viaja al navegador en la app actual.)
const SUPA_URL = 'https://zbaqcbadqefaggpbylfn.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYXFjYmFkcWVmYWdncGJ5bGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzcxOTAsImV4cCI6MjEwMzQxMzE5MH0.oW92ZOpWcPAeK037DUS5BMFhh0c0XLSCTbVN7Fa108M'

export const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})

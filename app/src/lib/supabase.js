// src/lib/supabase.js — cliente Supabase. Las credenciales vienen de config.js
// (para que cada empresa duplicada solo cambie ese archivo).
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})

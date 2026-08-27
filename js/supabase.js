// js/supabase.js — cliente Supabase centralizado (OSYC)
const SUPA_URL = 'https://zbaqcbadqefaggpbylfn.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYXFjYmFkcWVmYWdncGJ5bGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzcxOTAsImV4cCI6MjEwMzQxMzE5MH0.oW92ZOpWcPAeK037DUS5BMFhh0c0XLSCTbVN7Fa108M';
const SB = supabase.createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

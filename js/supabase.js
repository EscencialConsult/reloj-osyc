// js/supabase.js — cliente Supabase centralizado (RUNAS Café)
const SUPA_URL = 'https://nntmkwrqjbzhonvqvxhb.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5udG1rd3JxamJ6aG9udnF2eGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTgyODksImV4cCI6MjEwMjg5NDI4OX0.ueKP0cm5861H4Ryb6jsRbWcWgcc397GfMkiWX0FaTJc';
const SB = supabase.createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

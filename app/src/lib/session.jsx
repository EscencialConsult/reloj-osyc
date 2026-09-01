// src/lib/session.jsx — sesión + perfil (empleado / admin) en un contexto global
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const SessionCtx = createContext(null)

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)   // fila de public.personal
  const [esAdmin, setEsAdmin] = useState(false)
  const [cargando, setCargando] = useState(true)

  // Carga el perfil (personal) + si es admin, para el usuario logueado
  const cargarPerfil = useCallback(async (sess) => {
    if (!sess) { setPerfil(null); setEsAdmin(false); return }
    const [{ data: p }, { data: admin }] = await Promise.all([
      supabase.from('personal').select('*').eq('user_id', sess.user.id).maybeSingle(),
      supabase.rpc('es_admin')
    ])
    setPerfil(p || null)
    setEsAdmin(!!admin)
  }, [])

  useEffect(() => {
    let vivo = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!vivo) return
      setSession(session)
      await cargarPerfil(session)
      setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setSession(session)
      await cargarPerfil(session)
    })
    return () => { vivo = false; sub.subscription.unsubscribe() }
  }, [cargarPerfil])

  const login = useCallback(async (email, dni) => {
    return supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: dni.trim()
    })
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setPerfil(null); setEsAdmin(false)
  }, [])

  const nombre = perfil?.nombre || session?.user?.user_metadata?.nombre || session?.user?.email || 'Empleado'

  return (
    <SessionCtx.Provider value={{ session, perfil, esAdmin, cargando, nombre, login, logout }}>
      {children}
    </SessionCtx.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionCtx)
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>')
  return ctx
}

// js/auth.js — Login de administrador con Supabase Auth (email + contraseña real)
const SESSION_KEY = 'one_admin_session';

const Auth = {
  // Login del admin: valida contra Supabase Auth y confirma que sea administrador
  loginAdmin: async function (email, pass) {
    try {
      const { data, error } = await SB.auth.signInWithPassword({
        email: (email || '').trim().toLowerCase(),
        password: pass || ''
      });
      if (error || !data?.session) return false;

      // ¿El usuario es administrador?
      const { data: isAdmin, error: e2 } = await SB.rpc('es_admin');
      if (e2 || !isAdmin) { await SB.auth.signOut(); return false; }

      localStorage.setItem(SESSION_KEY, 'true');
      localStorage.setItem('admin_user', data.user.email);
      localStorage.setItem('admin_role', 'ADMIN_GENERAL');
      return true;
    } catch (_) {
      return false;
    }
  },

  // Guard para páginas de admin (async). Devuelve true si puede continuar.
  requireAdmin: async function () {
    try {
      const { data: { session } } = await SB.auth.getSession();
      if (!session) { window.location.href = 'index.html'; return false; }
      const { data: isAdmin } = await SB.rpc('es_admin');
      if (!isAdmin) { await SB.auth.signOut(); localStorage.clear(); window.location.href = 'index.html'; return false; }
      localStorage.setItem('admin_user', session.user.email);
      localStorage.setItem('admin_role', 'ADMIN_GENERAL');
      return true;
    } catch (_) {
      window.location.href = 'index.html';
      return false;
    }
  },

  isLoggedIn: async function () {
    const { data: { session } } = await SB.auth.getSession();
    return !!session;
  },

  logout: async function () {
    try { await SB.auth.signOut(); } catch (_) {}
    localStorage.clear();
    window.location.href = 'index.html';
  }
};

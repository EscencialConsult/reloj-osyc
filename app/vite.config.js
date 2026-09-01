import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// App integral: React es el sistema completo (raíz '/'). El sitio HTML viejo
// (fichar.html, admin.html…) queda como respaldo accesible por su nombre directo.
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: { port: 5174, open: true }
})

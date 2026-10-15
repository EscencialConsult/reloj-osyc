import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SessionProvider } from './lib/session.jsx'
import App from './App.jsx'
import SWNavListener from './components/SWNavListener.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { UIProvider } from './components/ui.jsx'
import { COLOR, COLOR_2 } from './config.js'
import './index.css'

// Aplica el color de marca de la empresa (definido en config.js)
const _rgb = (hex) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const [_r, _g, _b] = _rgb(COLOR)
const _root = document.documentElement.style
_root.setProperty('--azul', COLOR)
_root.setProperty('--azul-2', COLOR_2)
// Componentes RGB del color de marca → los tintes suaves (hover, ítem activo,
// íconos, chips, foco, encabezado) siguen la marca en vez de un azul fijo.
_root.setProperty('--azul-rgb', `${_r}, ${_g}, ${_b}`)
// Fondo apenas teñido con la marca (en lugar de un blanco frío fijo).
const _bg = (c) => Math.round(c * 0.08 + 255 * 0.92)
const [_br, _bgg, _bb] = [_bg(_r), _bg(_g), _bg(_b)]
_root.setProperty('--bg', `rgb(${_br}, ${_bgg}, ${_bb})`)
_root.setProperty('--bg-rgb', `${_br}, ${_bgg}, ${_bb}`)

// Service worker para notificaciones push (Fase 2)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* App integral en la raíz '/' */}
    <BrowserRouter>
      <SessionProvider>
        <SWNavListener />
        <UIProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </UIProvider>
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>
)

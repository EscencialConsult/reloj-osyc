import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SessionProvider } from './lib/session.jsx'
import App from './App.jsx'
import SWNavListener from './components/SWNavListener.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { COLOR, COLOR_2 } from './config.js'
import './index.css'

// Aplica el color de marca de la empresa (definido en config.js)
document.documentElement.style.setProperty('--azul', COLOR)
document.documentElement.style.setProperty('--azul-2', COLOR_2)

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
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>
)

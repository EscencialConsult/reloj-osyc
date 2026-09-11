// src/components/ui.jsx — Confirmaciones, avisos y entradas de texto DENTRO de la
// app (sin usar los window.confirm / alert / prompt del navegador). Hooks:
//   const confirmar = useConfirmar()  → await confirmar({ titulo, texto, ok })  → true/false
//   const aviso = useAviso()          → aviso('mensaje')  o  aviso('error', 'err')
//   const pedir = usePedir()          → await pedir({ titulo, valor, ok })       → texto o null
import { createContext, useContext, useState, useCallback, useRef } from 'react'

const UICtx = createContext(null)

export function UIProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null)   // { titulo, texto, ok, peligro, resolve }
  const [promptState, setPromptState] = useState(null)     // { titulo, texto, valor, ok, resolve }
  const [toasts, setToasts] = useState([])                 // { id, texto, tipo }
  const idRef = useRef(0)

  const confirmar = useCallback((opts) => {
    const o = typeof opts === 'string' ? { texto: opts } : (opts || {})
    return new Promise(resolve => setConfirmState({
      titulo: o.titulo || '¿Confirmás?', texto: o.texto || '', ok: o.ok || 'Aceptar',
      peligro: o.peligro !== false, resolve,
    }))
  }, [])
  const cerrarConfirm = useCallback((val) => { setConfirmState(s => { if (s) s.resolve(val); return null }) }, [])

  const pedir = useCallback((opts) => {
    const o = typeof opts === 'string' ? { titulo: opts } : (opts || {})
    return new Promise(resolve => setPromptState({
      titulo: o.titulo || 'Ingresá un valor', texto: o.texto || '', valor: o.valor || '', ok: o.ok || 'Guardar', resolve,
    }))
  }, [])
  const cerrarPrompt = useCallback((val) => { setPromptState(s => { if (s) s.resolve(val); return null }) }, [])

  const aviso = useCallback((texto, tipo = 'ok') => {
    const id = ++idRef.current
    setToasts(t => [...t, { id, texto, tipo }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  return (
    <UICtx.Provider value={{ confirmar, aviso, pedir }}>
      {children}

      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={'toast ' + (t.tipo === 'err' ? 'toast-err' : 'toast-ok')}>{t.texto}</div>
        ))}
      </div>

      {confirmState && (
        <div className="consent-ov" onClick={e => { if (e.target === e.currentTarget) cerrarConfirm(false) }}>
          <div className="card stack" style={{ maxWidth: 380, textAlign: 'center' }}>
            <b style={{ fontSize: 17 }}>{confirmState.titulo}</b>
            {confirmState.texto && <p className="muted">{confirmState.texto}</p>}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-ghost grow" onClick={() => cerrarConfirm(false)}>Cancelar</button>
              <button className={'btn grow ' + (confirmState.peligro ? 'btn-err' : 'btn-primary')} onClick={() => cerrarConfirm(true)}>{confirmState.ok}</button>
            </div>
          </div>
        </div>
      )}

      {promptState && <PromptBox estado={promptState} onCerrar={cerrarPrompt} />}
    </UICtx.Provider>
  )
}

function PromptBox({ estado, onCerrar }) {
  const [v, setV] = useState(estado.valor)
  return (
    <div className="consent-ov" onClick={e => { if (e.target === e.currentTarget) onCerrar(null) }}>
      <div className="card stack" style={{ maxWidth: 380 }}>
        <b style={{ fontSize: 16 }}>{estado.titulo}</b>
        {estado.texto && <div className="muted">{estado.texto}</div>}
        <input className="inp" autoFocus value={v} onChange={e => setV(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onCerrar(v); if (e.key === 'Escape') onCerrar(null) }} />
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost grow" onClick={() => onCerrar(null)}>Cancelar</button>
          <button className="btn btn-primary grow" onClick={() => onCerrar(v)}>{estado.ok}</button>
        </div>
      </div>
    </div>
  )
}

export function useUI() {
  const ctx = useContext(UICtx)
  if (!ctx) throw new Error('useUI debe usarse dentro de <UIProvider>')
  return ctx
}
export const useConfirmar = () => useUI().confirmar
export const useAviso = () => useUI().aviso
export const usePedir = () => useUI().pedir

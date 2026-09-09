import { Component } from 'react'

// Atrapa errores de render (incluida la carga de un "pedazo" que falle) y, en vez
// de dejar la pantalla trabada/en blanco, muestra un botón para recargar.
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error('[ErrorBoundary]', error) }

  render() {
    if (this.state.error) {
      return (
        <div className="center-screen">
          <div className="card stack" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 38 }}>🔄</div>
            <b style={{ fontSize: 17 }}>Se trabó algo</b>
            <p className="muted">Tocá recargar para continuar. No se pierde ningún dato.</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Recargar</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

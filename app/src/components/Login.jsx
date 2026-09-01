import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../lib/session.jsx'

export default function Login() {
  const { login } = useSession()
  const [email, setEmail] = useState('')
  const [dni, setDni] = useState('')
  const [err, setErr] = useState('')
  const [cargando, setCargando] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (!email || !dni) { setErr('Completá email y DNI'); return }
    setCargando(true)
    const { error } = await login(email, dni)
    setCargando(false)
    if (error) setErr('Email o DNI incorrectos')
    // si sale bien, el contexto detecta la sesión y App muestra la app
  }

  return (
    <div className="center-screen">
      <form className="card stack" style={{ width: '100%', maxWidth: 380 }} onSubmit={submit}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand" style={{ fontSize: 24 }}>OS<b>YC</b></div>
          <p className="muted" style={{ marginTop: 4 }}>Ingresá con tu email y DNI</p>
        </div>
        <div>
          <label className="lbl">Email</label>
          <input className="inp" type="email" autoComplete="username" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="tuemail@osyc.com" />
        </div>
        <div>
          <label className="lbl">DNI</label>
          <input className="inp" type="password" inputMode="numeric" autoComplete="current-password" value={dni}
            onChange={e => setDni(e.target.value)} placeholder="Tu DNI (sin puntos)" />
        </div>
        {err && <div className="err-txt">{err}</div>}
        <button className="btn btn-primary" disabled={cargando}>
          {cargando ? <span className="spin" style={{ width: 18, height: 18, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.4)' }} /> : 'Ingresar →'}
        </button>
        <Link to="/lider" className="muted" style={{ textAlign: 'center', fontSize: 13 }}>Soy líder · cargar horarios →</Link>
      </form>
    </div>
  )
}

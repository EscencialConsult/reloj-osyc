import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session.jsx'
import { cargarFacial } from '../lib/facial'
import { bestPosition } from '../lib/geo'
import ConsentModal, { CONSENT_VER } from '../components/ConsentModal.jsx'
import { Icon } from '../components/icons.jsx'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export default function Fichar() {
  const { nombre } = useSession()
  const [sp] = useSearchParams()
  const sedeParam = sp.get('sede') || null   // sucursal indicada por el QR (si vino por QR)
  const [now, setNow] = useState(new Date())
  const [estado, setEstado] = useState('')       // texto del botón mientras trabaja
  const [ocupado, setOcupado] = useState(false)
  const [result, setResult] = useState(null)     // { ok, msg }
  const [consent, setConsent] = useState(null)    // { resolve } cuando hay que pedirlo
  const faceState = useRef(null)                  // { enrolado, descriptor }

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    // precargar biometría + estado de enrolamiento
    cargarFacial().then(F => F.ready()).catch(() => {})
    supabase.rpc('mi_biometria').then(({ data }) => {
      faceState.current = data && data.enrolado
        ? { enrolado: true, descriptor: data.descriptor }
        : { enrolado: false, descriptor: null }
    }).catch(() => { faceState.current = { enrolado: false, descriptor: null } })
    return () => clearInterval(t)
  }, [])

  const pedirConsentimiento = useCallback(() => {
    return new Promise(resolve => setConsent({ resolve }))
  }, [])

  function cerrarConsent(valor) {
    if (consent) consent.resolve(valor)
    setConsent(null)
  }

  // Puerta facial: 1ª vez registra; después verifica. Devuelve true si puede seguir.
  async function puertaFacial() {
    setEstado('Preparando cámara…')
    let F
    try { F = await cargarFacial(); await F.ready() }
    catch { setResult({ ok: false, msg: 'No pudimos cargar el reconocimiento facial. Revisá tu conexión.' }); return false }

    if (!faceState.current) {
      try {
        const { data } = await supabase.rpc('mi_biometria')
        faceState.current = data && data.enrolado ? { enrolado: true, descriptor: data.descriptor } : { enrolado: false, descriptor: null }
      } catch { faceState.current = { enrolado: false, descriptor: null } }
    }

    const esEnrol = !faceState.current.enrolado
    if (esEnrol) {
      const acepto = await pedirConsentimiento()
      if (!acepto) { setResult({ ok: false, msg: 'Para fichar con reconocimiento facial necesitás aceptar el uso del dato biométrico.' }); return false }
    }

    let cap
    try {
      cap = await F.capture(esEnrol
        ? { title: 'Registrá tu cara (1ª vez)', captureLabel: 'Registrar' }
        : { title: 'Verificá tu identidad', captureLabel: 'Verificar' })
    } catch (e) {
      if (e && e.code === 'cancel') return false
      setResult({ ok: false, msg: (e && e.msg) || 'No pudimos usar la cámara.' }); return false
    }

    if (esEnrol) {
      setEstado('Guardando tu registro…')
      const { data, error } = await supabase.rpc('guardar_biometria', { p_descriptor: cap.descriptor, p_consent_version: CONSENT_VER })
      if (error || !data?.ok) { setResult({ ok: false, msg: (data && data.msg) || 'No se pudo registrar tu cara.' }); return false }
      faceState.current = { enrolado: true, descriptor: cap.descriptor }
      return true
    }

    if (!F.match(cap.descriptor, faceState.current.descriptor)) {
      setResult({ ok: false, msg: 'No te reconocimos. Buscá buena luz, sacate lentes/barbijo y reintentá.' })
      return false
    }
    return true
  }

  async function fichar() {
    if (ocupado) return
    setResult(null); setOcupado(true)
    try {
      if (!navigator.geolocation) { setResult({ ok: false, msg: 'Activá el GPS y probá de nuevo.' }); return }

      const caraOk = await puertaFacial()
      if (!caraOk) return

      setEstado('Afinando GPS…')
      let pos
      try { pos = await bestPosition({ timeout: 9000, desired: 18 }) }
      catch (err) {
        setResult({ ok: false, msg: err && err.code === 1
          ? 'Necesitás permitir la ubicación para fichar.'
          : 'No pudimos obtener tu ubicación. Salí a un lugar más abierto y reintentá.' })
        return
      }

      setEstado('Registrando…')
      const { latitude, longitude, accuracy } = pos.coords
      const { data, error } = await supabase.rpc('fichar', {
        p_sede_id: sedeParam, p_lat: latitude, p_lng: longitude, p_accuracy: accuracy, p_tipo: null
      })
      if (error) { setResult({ ok: false, msg: 'Hubo un problema de conexión. Probá otra vez.' }); return }
      if (data?.ok) {
        const ent = data.tipo === 'entrada'
        setResult({ ok: true, msg: (ent ? '¡Ingreso registrado! ' : '¡Salida registrada! ') + [data.sede, data.hora].filter(Boolean).join(' · ') })
      } else {
        setResult({ ok: false, msg: data?.msg || 'No se pudo registrar el fichaje.' })
      }
    } finally {
      setOcupado(false); setEstado('')
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="clock-h">{String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}</div>
        <div className="clock-d">{DIAS[now.getDay()]} {now.getDate()} de {MESES[now.getMonth()]}</div>
        <div style={{ height: 18 }} />
        <button className="fichar-btn" onClick={fichar} disabled={ocupado}>
          {ocupado ? <><span className="spin" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.4)' }} /> {estado}</> : <><Icon.Pin width={26} height={26} /> Fichar</>}
        </button>
        {result && <div className={'result ' + (result.ok ? 'ok' : 'err')}>{result.msg}</div>}
      </div>
      <p className="muted" style={{ textAlign: 'center' }}>Vas a fichar como <b style={{ color: 'var(--tinta)' }}>{nombre}</b></p>

      {consent && <ConsentModal onAceptar={() => cerrarConsent(true)} onRechazar={() => cerrarConsent(false)} />}
    </div>
  )
}

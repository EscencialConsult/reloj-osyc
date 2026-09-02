// src/lib/push.js — activar/desactivar notificaciones push (Web Push)
import { supabase } from './supabase'

// Clave PÚBLICA VAPID (la privada va SOLO en los secrets de la Edge Function).
const VAPID_PUBLIC = 'BPzqOcIRrdhP_nrJnSCsUTbVnE9-jo6zXGKp5VJTKDUaieJnIuvSLXnzArv31Kja-ahbZab1q69u41vCv1qLmAQ'

export const pushSoportado = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function b64ToUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// ¿Este dispositivo ya está suscripto?
export async function estaActivo() {
  if (!pushSoportado() || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg && await reg.pushManager.getSubscription()
  return !!sub
}

// Activa las notificaciones push en este dispositivo
export async function activarPush(uid) {
  if (!pushSoportado()) throw new Error('Este dispositivo/navegador no soporta notificaciones.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado.')
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToUint8(VAPID_PUBLIC)
    })
  }
  const j = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: uid, endpoint: sub.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent
  }, { onConflict: 'endpoint' })
  if (error) throw new Error(error.message)
  return true
}

// Desactiva en este dispositivo
export async function desactivarPush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg && await reg.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    try { await sub.unsubscribe() } catch (_) {}
  }
}

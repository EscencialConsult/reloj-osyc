// src/lib/lideres.js — CRUD de líderes (tabla `lideres`) + acceso del panel del
// líder a solicitudes/avisos vía funciones seguras del servidor (fase14).
// El líder NO usa el login de Supabase: se valida con usuario+contraseña en cada
// llamada (sess.usuario / sess.password), igual que en su login.
import { supabase } from './supabase'

export const PERMISOS_DEFAULT = { horarios: true, solicitudes: false, avisos: false, informes: false }

// Etiquetas cortas para mostrar los permisos activos de un líder
export const PERMISO_LABEL = { horarios: 'Horarios', solicitudes: 'Solicitudes', avisos: 'Avisos', informes: 'Informes' }
export function resumenPermisos(permisos) {
  const p = { ...PERMISOS_DEFAULT, ...(permisos || {}) }
  const on = Object.keys(PERMISO_LABEL).filter(k => p[k]).map(k => PERMISO_LABEL[k])
  return on.length ? on.join(' · ') : 'Sin permisos'
}
const normPermisos = (p) => ({ ...PERMISOS_DEFAULT, ...(p || {}) })
const normAreas = (a) => (Array.isArray(a) ? a : [])

// ── ADMIN: alta/edición/baja de líderes ─────────────────────────────────────
export async function listLideres() {
  const { data } = await supabase.from('lideres').select('*').order('nombre')
  return (data || []).map(l => ({ ...l, areas: normAreas(l.areas), permisos: normPermisos(l.permisos) }))
}
export async function saveLider(l) {
  const fila = {
    nombre: (l.nombre || '').trim(),
    usuario: (l.usuario || '').trim(),
    password: (l.password || '').trim() || null,
    areas: normAreas(l.areas),
    activo: l.activo !== false,
    permisos: normPermisos(l.permisos),
  }
  if (l.id) return supabase.from('lideres').update(fila).eq('id', l.id)
  return supabase.from('lideres').insert(fila)
}
export async function deleteLider(id) {
  return supabase.from('lideres').delete().eq('id', id)
}

// ── EMPLEADO: ¿su área tiene un líder activo que reciba solicitudes? ─────────
export async function liderDeMiArea(area) {
  if (!area) return null
  const { data } = await supabase.from('lideres').select('nombre,areas,permisos,activo').eq('activo', true)
  const l = (data || []).find(x => normAreas(x.areas).includes(area) && normPermisos(x.permisos).solicitudes)
  return l ? { nombre: l.nombre } : null
}

// ── PANEL DEL LÍDER: solicitudes / avisos (vía RPC segura) ───────────────────
export async function liderSolicitudes(sess, area) {
  const { data } = await supabase.rpc('lider_solicitudes', { p_usuario: sess.usuario, p_password: sess.password, p_area: area })
  return data?.ok ? (data.items || []) : []
}
export async function liderResolver(sess, id, estado, comentario) {
  const { data } = await supabase.rpc('lider_resolver_solicitud', {
    p_usuario: sess.usuario, p_password: sess.password, p_id: id, p_estado: estado, p_comentario: comentario || null
  })
  return data || { ok: false, msg: 'Sin respuesta del servidor' }
}
export async function liderComentar(sess, id, comentario) {
  const { data } = await supabase.rpc('lider_comentar_solicitud', {
    p_usuario: sess.usuario, p_password: sess.password, p_id: id, p_comentario: comentario
  })
  return data || { ok: false, msg: 'Sin respuesta del servidor' }
}
export async function liderCrearAviso(sess, area, titulo, cuerpo) {
  const { data } = await supabase.rpc('lider_crear_aviso', {
    p_usuario: sess.usuario, p_password: sess.password, p_area: area, p_titulo: titulo, p_cuerpo: cuerpo
  })
  return data || { ok: false, msg: 'Sin respuesta del servidor' }
}
export async function liderAvisos(sess, area) {
  const { data } = await supabase.rpc('lider_avisos', { p_usuario: sess.usuario, p_password: sess.password, p_area: area })
  return data?.ok ? (data.items || []) : []
}

// src/lib/lideres.js — rol de líder sobre una persona (fase15).
// El líder es una fila de `personal` con es_lider=true. Entra con su email+
// contraseña como todos; su acceso a solicitudes/avisos (RLS) pasa por RPCs
// seguras que validan por la sesión (auth.uid()), sin usuario/contraseña.
import { supabase } from './supabase'

export const PERMISOS_DEFAULT = { horarios: true, solicitudes: false, avisos: false, informes: false }
export const PERMISO_LABEL = { horarios: 'Horarios', solicitudes: 'Solicitudes', avisos: 'Avisos', informes: 'Informes' }
export const PERMISO_HINT = {
  horarios: 'cargar/modificar horarios de su área',
  solicitudes: 'recibir y responder solicitudes',
  avisos: 'enviar avisos a su área',
  informes: 'ver informes de su área',
}
export function resumenPermisos(permisos) {
  const p = { ...PERMISOS_DEFAULT, ...(permisos || {}) }
  const on = Object.keys(PERMISO_LABEL).filter(k => p[k]).map(k => PERMISO_LABEL[k])
  return on.length ? on.join(' · ') : 'Sin permisos'
}

// ── EMPLEADO: ¿su área tiene un líder activo que reciba solicitudes? ─────────
// Excluye al propio usuario (si YO soy la líder de mi área, no me la envío a mí mismo).
export async function liderDeMiArea(area, miUserId = null) {
  if (!area) return null
  const { data } = await supabase.from('personal')
    .select('nombre,user_id,lider_areas,lider_permisos,es_lider,activo')
    .eq('es_lider', true).eq('activo', true)
  const l = (data || []).find(x =>
    Array.isArray(x.lider_areas) && x.lider_areas.includes(area) &&
    (x.lider_permisos?.solicitudes) &&
    x.user_id !== miUserId)
  return l ? { nombre: l.nombre } : null
}

// ── AVISOS: user_ids de todos los líderes (para el destino "Líderes") ────────
export async function idsDeLideres() {
  const { data } = await supabase.from('personal')
    .select('user_id').eq('es_lider', true).eq('activo', true).not('user_id', 'is', null)
  return (data || []).map(x => x.user_id)
}

// ── PANEL DEL LÍDER: solicitudes / avisos (vía RPC, valida por sesión) ───────
export async function liderSolicitudes(area) {
  const { data } = await supabase.rpc('lider_solicitudes', { p_area: area })
  return data?.ok ? (data.items || []) : []
}
export async function liderResolver(id, estado, comentario) {
  const { data } = await supabase.rpc('lider_resolver_solicitud', { p_id: id, p_estado: estado, p_comentario: comentario || null })
  return data || { ok: false, msg: 'Sin respuesta del servidor' }
}
export async function liderComentar(id, comentario) {
  const { data } = await supabase.rpc('lider_comentar_solicitud', { p_id: id, p_comentario: comentario })
  return data || { ok: false, msg: 'Sin respuesta del servidor' }
}
export async function liderCrearAviso(area, titulo, cuerpo) {
  const { data } = await supabase.rpc('lider_crear_aviso', { p_area: area, p_titulo: titulo, p_cuerpo: cuerpo })
  return data || { ok: false, msg: 'Sin respuesta del servidor' }
}
export async function liderAvisos(area) {
  const { data } = await supabase.rpc('lider_avisos', { p_area: area })
  return data?.ok ? (data.items || []) : []
}

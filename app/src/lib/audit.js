// src/lib/audit.js — registro de auditoría (tabla actividad_log), portado de utils.js
import { supabase } from './supabase'
import { today, getLunes } from './fechas'

// ¿El cambio es "fuera de término"? (la semana ya empezó y se está modificando)
export const esFueraDeTerm = (semDesde) => {
  if (!semDesde) return false
  const hoy = today()
  return semDesde <= hoy && hoy > getLunes(hoy, 0)
}

// Registra una acción manual. Nunca interrumpe la operación principal.
// usuarioTipo: 'admin' (default) | 'lider'
export async function logActividad(usuario, tipo, area, targetNombre, descripcion, detalle = {}, fueraDeTerm = false, usuarioTipo = 'admin') {
  try {
    await supabase.from('actividad_log').insert({
      usuario: usuario || 'admin',
      usuario_tipo: usuarioTipo,
      tipo,
      area: area || null,
      target_nombre: targetNombre || null,
      descripcion,
      detalle,
      fuera_de_termino: fueraDeTerm,
    })
  } catch (e) {
    console.warn('[logActividad] error silenciado:', e?.message)
  }
}

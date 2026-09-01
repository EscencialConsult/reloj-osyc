// src/lib/config.js — configuración de la empresa (tabla configuracion, filas por id)
// id='features' → { usa_areas, usa_lideres } · id='areas' → [..] · id='plantillas' → [{nombre,e,s,e2,s2}]
import { supabase } from './supabase'

async function _get(id, fallback) {
  try {
    const { data } = await supabase.from('configuracion').select('valor').eq('id', id).maybeSingle()
    return data?.valor ?? fallback
  } catch { return fallback }
}
async function _set(id, valor) {
  const { error } = await supabase.from('configuracion').upsert({ id, valor })
  return !error
}

export const getFeatures = () => _get('features', { usa_areas: false, usa_lideres: false })
export const saveFeatures = (flags) => _set('features', flags)
export const getAreas = () => _get('areas', []).then(a => Array.isArray(a) ? a : [])
export const saveAreas = (arr) => _set('areas', arr)
export const getPlantillas = () => _get('plantillas', []).then(a => Array.isArray(a) ? a : [])
export const savePlantillas = (arr) => _set('plantillas', arr)

// src/lib/horarios.js — helpers del módulo Horarios Semanales (portado de horarios-sem.js)
import { calcHs } from './calculos'

export const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
export const DIA_LBL = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' }
export const DIA_CORTO = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' }
// Para mapear fecha → día (getDay: 0=domingo)
export const DIAS_SEM = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

// Normaliza "9", "9.30", "930", "9:30" → "09:30" (vacío si inválido)
export function normHora(raw) {
  if (!raw || !raw.trim()) return ''
  let s = raw.trim().replace(/[.,]/, ':'), h, m
  if (s.includes(':')) [h, m] = s.split(':')
  else if (s.length <= 2) { h = s; m = '0' }
  else { h = s.slice(0, s.length - 2); m = s.slice(-2) }
  h = parseInt(h, 10); m = parseInt(m, 10)
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return ''
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Horas totales de una fila de edición (mismos criterios que el original)
export function calcTotRow(r) {
  if (r.vacaciones) return r.vacaciones_hs || 0
  let t = 0
  DIAS.forEach(d => {
    const tipo = r[d + '_tipo'] || 'normal'
    if (tipo === 'guardia') { t += 1; return }
    if (tipo === 'flex' || tipo === 'licencia') return
    const h1 = calcHs(r[d + '_e'], r[d + '_s'])
    const h2 = calcHs(r[d + '_e2'], r[d + '_s2'])
    if (h1) t += h1; if (h2) t += h2
  })
  return t
}

// Aplana los rows de la base (una fila por área) a personas con claves planas
export function flatPersonas(data) {
  const out = []
  data.forEach(row => {
    const hs = row.horarios
    if (!Array.isArray(hs) || !hs.length) return
    hs.forEach(h => {
      const p = { _rowId: row.id, area: row.area, nombre: h.nombre, rol: h.rol || '', obs: h.obs || '', obsArea: row.observaciones || '', vacaciones: h.vacaciones || false, vacaciones_hs: h.vacaciones_hs || 0 }
      DIAS.forEach(d => {
        p[d + '_e'] = h[d]?.e || ''; p[d + '_s'] = h[d]?.s || ''
        p[d + '_e2'] = h[d]?.e2 || ''; p[d + '_s2'] = h[d]?.s2 || ''
        p[d + '_tipo'] = h[d]?.tipo || 'normal'
      })
      out.push(p)
    })
  })
  return out
}

// Construye una fila de edición vacía/desde guardado para una persona
export function filaDesdeGuardado(p, sv) {
  const r = { nombre: p.nombre, rol: p.rol || '', obs: sv?.obs || '', vacaciones: sv?.vacaciones || false, vacaciones_hs: sv?.vacaciones_hs || 0 }
  DIAS.forEach(d => {
    r[d + '_e'] = sv?.[d]?.e || ''; r[d + '_s'] = sv?.[d]?.s || ''
    r[d + '_e2'] = sv?.[d]?.e2 || ''; r[d + '_s2'] = sv?.[d]?.s2 || ''
    r[d + '_tipo'] = sv?.[d]?.tipo || 'normal'
    r[d + '_split'] = !!(sv?.[d]?.e2 || sv?.[d]?.s2)
  })
  return r
}

// Fila de edición → objeto para guardar en horarios_semanales.horarios[]
export function filaAGuardar(r) {
  const obj = { nombre: r.nombre, rol: r.rol, obs: r.obs || '', vacaciones: r.vacaciones || false, vacaciones_hs: r.vacaciones_hs || 0 }
  DIAS.forEach(d => {
    obj[d] = { e: r[d + '_e'] || '', s: r[d + '_s'] || '', e2: r[d + '_e2'] || '', s2: r[d + '_s2'] || '', tipo: r[d + '_tipo'] || 'normal' }
  })
  return obj
}

// Turno de texto para sincronizar en la tabla registros
export function turnoDeDia(dia) {
  const tipo = dia.tipo || 'normal'
  if (tipo === 'flex') return 'Flex'
  if (tipo === 'guardia') return 'Guardia'
  if (tipo === 'licencia') return 'Licencia'
  if (!dia.e) return null
  let t = dia.e + (dia.s ? ' → ' + dia.s : '')
  if (dia.e2) t += ' | ' + dia.e2 + (dia.s2 ? ' → ' + dia.s2 : '')
  return t
}

export const ddCorto = s => { if (!s) return ''; const [, m, d] = s.split('-'); return `${d}/${m}` }
export const dd = s => { if (!s) return ''; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}` }
export function diasArr(lunes) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes + 'T12:00:00'); d.setDate(d.getDate() + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
}

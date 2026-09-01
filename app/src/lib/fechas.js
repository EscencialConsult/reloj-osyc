// src/lib/fechas.js — helpers de fecha (portados de js/utils.js, sin dependencias del DOM)
// Todo en hora LOCAL para evitar corrimientos de zona horaria (Argentina UTC-3).

const _local = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const today = () => _local(new Date())
export const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return _local(d) }

export const fmtDate = d => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export const getDayKey = dateStr => {
  const d = new Date(dateStr + 'T12:00:00')
  return ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][d.getDay()]
}

export const getLunes = (dateStr, offsetWeeks = 0) => {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day) + offsetWeeks * 7)
  return _local(d)
}
export const getDomingo = dateStr => {
  const d = new Date(getLunes(dateStr) + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return _local(d)
}
const getMonthStart = (off = 0) => { const d = new Date(); d.setMonth(d.getMonth() + off, 1); return _local(d) }
const getMonthEnd = (off = 0) => { const d = new Date(); d.setMonth(d.getMonth() + off + 1, 0); return _local(d) }

// Rango de fechas por período. Para 'custom'/'dia_especifico' se pasan los valores.
export const getDateRange = (per, { desde = '', hasta = '', dia = '' } = {}) => {
  const t = today()
  switch (per) {
    case 'hoy': return { desde: t, hasta: t }
    case 'ayer': return { desde: yesterday(), hasta: yesterday() }
    case 'semana': return { desde: getLunes(t, 0), hasta: t }
    case 'semana_ant': return { desde: getLunes(t, -1), hasta: getDomingo(getLunes(t, -1)) }
    case 'mes': return { desde: getMonthStart(0), hasta: t }
    case 'mes_ant': return { desde: getMonthStart(-1), hasta: getMonthEnd(-1) }
    case 'anio': return { desde: `${new Date().getFullYear()}-01-01`, hasta: t }
    case 'dia_especifico': return { desde: dia, hasta: dia }
    case 'custom': return { desde, hasta }
    default: return { desde: null, hasta: null }   // 'todos'
  }
}

export const PERIODOS = [
  { v: 'hoy', t: 'Hoy' }, { v: 'ayer', t: 'Ayer' },
  { v: 'semana', t: 'Esta semana' }, { v: 'semana_ant', t: 'Semana pasada' },
  { v: 'mes', t: 'Este mes' }, { v: 'mes_ant', t: 'Mes pasado' },
  { v: 'anio', t: 'Este año' }, { v: 'todos', t: 'Todos' },
  { v: 'dia_especifico', t: 'Día específico' }, { v: 'custom', t: 'Personalizado' },
]

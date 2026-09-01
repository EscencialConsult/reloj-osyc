// src/lib/calculos.js — cálculos de horas/tardanza + color de área (portado de utils.js)

export const calcHs = (entStr, salStr) => {
  if (!entStr || !salStr) return null
  const [eh, em] = entStr.split(':').map(Number)
  const [sh, sm] = salStr.split(':').map(Number)
  const mins = (sh * 60 + sm) - (eh * 60 + em)
  return mins > 0 ? mins / 60 : null
}

export const fmtHs = h => {
  if (h === null || h === undefined) return '—'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

// Tardanza en minutos: >0 tarde, <0 temprano, null sin dato
export const calcTardVsPlan = (planStr, entStr) => {
  if (!planStr || !entStr) return null
  const [ph, pm] = planStr.split(':').map(Number)
  const [eh, em] = entStr.split(':').map(Number)
  return (eh * 60 + em) - (ph * 60 + pm)
}

// Minutos extra tras la salida planificada (planSal="17:00", salReal="18:30" → 90)
export const calcHsExtra = (planSalStr, salRealStr) => {
  if (!planSalStr || !salRealStr) return null
  const [ph, pm] = planSalStr.split(':').map(Number)
  const [sh, sm] = salRealStr.split(':').map(Number)
  const diff = (sh * 60 + sm) - (ph * 60 + pm)
  return diff > 0 ? diff : 0
}

// Suma de horas de los dos turnos (horario cortado)
export const horasTotales = (r) => {
  const h1 = calcHs(r.hora_entrada?.slice(0, 5), r.hora_salida?.slice(0, 5))
  const h2 = calcHs(r.hora_entrada2?.slice(0, 5), r.hora_salida2?.slice(0, 5))
  return (h1 !== null || h2 !== null) ? (h1 || 0) + (h2 || 0) : null
}

// Tardanza según el turno planificado (texto guardado en r.turno "HH:MM → HH:MM")
export const tardanzaDeRegistro = (r) => {
  const turno = r.turno || ''
  if (turno === 'Flex') return { tipo: 'flex' }
  if (turno === 'Guardia') return { tipo: 'guardia' }
  if (turno.includes(':') && r.hora_entrada) {
    const planEnt = turno.split('→')[0].trim()
    if (/^\d{2}:\d{2}$/.test(planEnt)) return { tipo: 'diff', diff: calcTardVsPlan(planEnt, r.hora_entrada.slice(0, 5)) }
  }
  return { tipo: 'diff', diff: null }
}

// Devuelve {clase, texto} para el badge de tardanza
export const tardBadge = (diff) => {
  if (diff === null) return { clase: 'pendiente', texto: '—' }
  if (diff < 0) return { clase: 'aprobado', texto: `✓ ${Math.abs(diff)}m ant.` }
  if (diff === 0) return { clase: 'aprobado', texto: '✓ Exacto' }
  return { clase: 'rechazado', texto: `+${diff}m` }
}

// Color por área (paleta fija, por índice en la lista de áreas)
const PALETTE = ['#2c6eb4', '#3f6aa0', '#3457a8', '#1f8f5f', '#2563eb', '#c23d78', '#1f4e79', '#0e7490', '#9a3412']
export const areaColor = (area, areas = []) => {
  const i = areas.indexOf(area)
  return i >= 0 ? PALETTE[i % PALETTE.length] : '#5b6b80'
}

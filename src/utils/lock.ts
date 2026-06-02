import type { Match } from '../types'

// Minutos antes del inicio en que se cierran las predicciones de un partido.
export const LOCK_MINUTES = 5

/**
 * Instante de cierre de predicciones de un partido (inicio − LOCK_MINUTES).
 * Nota: la fecha/hora del partido se interpreta en la zona horaria del
 * dispositivo. Ajustá los horarios en data/schedule.ts a tu huso si hace falta.
 */
export function predictionDeadline(match: Match): number | null {
  const kickoff = new Date(`${match.date}T${match.time}:00`)
  const t = kickoff.getTime()
  if (Number.isNaN(t)) return null
  return t - LOCK_MINUTES * 60 * 1000
}

/** ¿Ya cerró la ventana para predecir este partido? */
export function isPredictionLocked(match: Match, now: number = Date.now()): boolean {
  const deadline = predictionDeadline(match)
  if (deadline == null) return false
  return now >= deadline
}

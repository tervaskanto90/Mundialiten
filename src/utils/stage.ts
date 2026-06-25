import type { Match, StageId } from '../types'
import { MATCHES } from '../data/schedule'
import { LOCK_MINUTES } from './lock'
import { STAGING } from '../staging'

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA ACTIVA DE PREDICCIÓN
//
// Las predicciones se habilitan por etapa según la fase real en curso:
//  grupos → 16avos → 8avos → 4tos → (semifinal + final + 3er puesto).
// Sólo hay UNA etapa abierta a la vez = el primer "bucket" todavía no terminado
// (un bucket termina cuando ya arrancaron todos sus partidos). Además, cada
// partido deja de poder predecirse 5 minutos antes de su inicio.
// ─────────────────────────────────────────────────────────────────────────────

export type BucketId = 'group' | 'r32' | 'r16' | 'qf' | 'finals'

export const BUCKET_ORDER: BucketId[] = ['group', 'r32', 'r16', 'qf', 'finals']

export function bucketOf(stage: StageId): BucketId {
  if (stage === 'group') return 'group'
  if (stage === 'r32') return 'r32'
  if (stage === 'r16') return 'r16'
  if (stage === 'qf') return 'qf'
  return 'finals' // sf, third, final
}

// Último kickoff (ms) de cada bucket — fijo, se calcula una vez.
const LAST_KICKOFF: Record<BucketId, number> = (() => {
  const out = { group: 0, r32: 0, r16: 0, qf: 0, finals: 0 } as Record<BucketId, number>
  for (const m of MATCHES) {
    const b = bucketOf(m.stage)
    const k = Date.parse(m.kickoff)
    if (k > out[b]) out[b] = k
  }
  return out
})()

/** Bucket de predicción abierto ahora (el primero no terminado), o null si terminó todo. */
export function activeBucket(now: number = Date.now()): BucketId | null {
  // Staging: forzamos 16avos abierto para probar el flujo de eliminatorias
  // (los grupos se dan por terminados; ver staging.ts).
  if (STAGING) return 'r32'
  for (const b of BUCKET_ORDER) {
    if (now <= LAST_KICKOFF[b]) return b
  }
  return null
}

export type PredictReason = 'open' | 'future' | 'past' | 'kickoff'

/** Por qué un partido puede o no predecirse en una predicción. */
export function predictReason(match: Match, now: number = Date.now()): PredictReason {
  const active = activeBucket(now)
  const b = bucketOf(match.stage)
  if (active !== b) {
    if (active == null) return 'past'
    return BUCKET_ORDER.indexOf(b) < BUCKET_ORDER.indexOf(active) ? 'past' : 'future'
  }
  // Etapa abierta: rige el cierre por partido (5 min antes).
  const deadline = Date.parse(match.kickoff) - LOCK_MINUTES * 60 * 1000
  return now < deadline ? 'open' : 'kickoff'
}

/** ¿Se puede predecir este partido ahora (etapa abierta y antes del cierre)? */
export function canPredict(match: Match, now: number = Date.now()): boolean {
  return predictReason(match, now) === 'open'
}

// ─────────────────────────────────────────────────────────────────────────────
// MODO STAGING (sandbox de pruebas)
//
// Sólo se activa en el build de la rama `staging` (ver vite.config.ts). Sirve
// para probar el flujo de predicciones de la fase ELIMINATORIA antes de tiempo:
//  - simula TODA la fase de grupos (para que el cuadro se arme con equipos reales)
//  - abre los 16avos y, con el botón de StagingControls, se puede "jugar" cada
//    ronda (simular resultados reales) para ir abriendo la siguiente.
//
// IMPORTANTE: en staging NO se escribe nada a Supabase (ver lib/sync.ts). Todo es
// local al navegador, así main (que comparte la misma base) queda intacto.
// ─────────────────────────────────────────────────────────────────────────────
import type { MatchResult, StageId } from './types'
import type { BucketId } from './utils/stage' // sólo tipo → no crea ciclo en runtime
import { MATCHES } from './data/schedule'
import { GROUPS, teamsOfGroup } from './data/teams'

// __STAGING__ lo inyecta Vite. Con typeof evitamos un ReferenceError en entornos
// donde no está definido (p. ej. el runner de tests, que no aplica el define).
export const STAGING: boolean = typeof __STAGING__ !== 'undefined' ? __STAGING__ === true : false

// Buckets de eliminatoria, en orden, y qué fases agrupa cada uno.
export const KO_BUCKETS: BucketId[] = ['r32', 'r16', 'qf', 'sf', 'finals']
const STAGES_OF_BUCKET: Record<BucketId, StageId[]> = {
  group: ['group'],
  r32: ['r32'],
  r16: ['r16'],
  qf: ['qf'],
  sf: ['sf'],
  finals: ['third', 'final'],
}

function matchesOfBucket(b: BucketId): typeof MATCHES {
  const stages = STAGES_OF_BUCKET[b]
  return MATCHES.filter((m) => stages.includes(m.stage))
}

// Resultados simulados de toda la fase de grupos. Cada grupo queda con un orden
// limpio 9/6/3/0: el equipo más fuerte (menor índice dentro del grupo) le gana a
// los más débiles 2-0. Así los grupos quedan completos y resolubles, y el cuadro
// de 16avos se arma con los clasificados reales.
export function simulatedGroupResults(): Record<number, MatchResult> {
  const idx = new Map<string, number>() // teamId → índice dentro de su grupo
  for (const g of GROUPS) teamsOfGroup(g).forEach((tm, i) => idx.set(tm.id, i))

  const out: Record<number, MatchResult> = {}
  for (const m of MATCHES) {
    if (m.stage !== 'group' || !m.home || !m.away) continue
    const homeWins = (idx.get(m.home) ?? 0) < (idx.get(m.away) ?? 0)
    out[m.id] = { played: true, finished: true, homeScore: homeWins ? 2 : 0, awayScore: homeWins ? 0 : 2, events: [] }
  }
  return out
}

// Primer bucket de eliminatoria que todavía NO está completo (todos sus partidos
// jugados) en los resultados reales. null = ya se simuló toda la eliminatoria.
export function openKnockoutBucket(results: Record<number, MatchResult>): BucketId | null {
  for (const b of KO_BUCKETS) {
    if (matchesOfBucket(b).some((m) => !results[m.id]?.played)) return b
  }
  return null
}

// Resultados simulados (DECISIVOS, sin empates) para todos los partidos de un
// bucket de eliminatoria. Variamos el marcador por id para que haya ganadores de
// local y de visitante (así el cuadro siguiente no es trivial).
const KO_SCORES: Array<[number, number]> = [[2, 1], [1, 0], [3, 1], [0, 2], [1, 2], [2, 0]]
export function simulateBucketResults(b: BucketId): Record<number, MatchResult> {
  const out: Record<number, MatchResult> = {}
  for (const m of matchesOfBucket(b)) {
    const [h, a] = KO_SCORES[m.id % KO_SCORES.length]
    out[m.id] = { played: true, finished: true, homeScore: h, awayScore: a, events: [] }
  }
  return out
}

// Pone el PRIMER partido de un bucket EN VIVO (jugándose, empatado 1-1 → camino
// al alargue): played=true pero finished=false. Sirve para ver cómo queda el
// ranking mientras un partido de eliminatoria está en juego.
export function liveBucketResults(b: BucketId): Record<number, MatchResult> {
  const first = matchesOfBucket(b).sort((x, y) => x.id - y.id)[0]
  if (!first) return {}
  return { [first.id]: { played: true, finished: false, homeScore: 1, awayScore: 1, events: [] } }
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

// Predicción SINTÉTICA y determinística por (usuario, partido) — sólo staging:
// como el real simulado no se sube a Supabase, el historial no trae predicciones
// para los partidos de eliminatoria. Esto puebla el ranking para el preview.
// En empates se incluye un "ganador de penales" (quién pasa) determinístico.
export function stagingFakePred(userId: string, matchId: number): { home: number; away: number; homePens?: number; awayPens?: number } {
  const h = hash(`${userId}|${matchId}`)
  const home = h % 3
  const away = (h >>> 5) % 3
  if (home === away) {
    const homeAdvances = ((h >>> 9) & 1) === 0
    return { home, away, homePens: homeAdvances ? 4 : 3, awayPens: homeAdvances ? 3 : 4 }
  }
  return { home, away }
}

// Conteo SINTÉTICO de "pases de ronda acertados" por usuario (sólo staging,
// para previsualizar el 3er desempate). 0-8.
export function stagingFakeAdvanceCount(userId: string): number {
  return hash(`adv|${userId}`) % 9
}

// Holder del real para que utils/stage (activeBucket) sepa qué ronda abrir en
// staging, sin importar el store (lo mantiene en sync useActiveContext).
let stagingReal: Record<number, MatchResult> = {}
export function setStagingReal(results: Record<number, MatchResult>): void {
  stagingReal = results
}
export function stagingActiveBucket(): BucketId | null {
  return openKnockoutBucket(stagingReal)
}

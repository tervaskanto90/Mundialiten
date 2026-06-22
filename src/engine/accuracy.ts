import type { MatchResult, StageId } from '../types'
import { MATCHES } from '../data/schedule'
import { GROUPS } from '../data/teams'
import { resolve, type Resolution } from './resolve'
import { groupComplete } from './standings'

export interface AccuracyFactor {
  key: string
  label: string
  correct: number
  total: number
  pct: number // 0..100
}

export interface AccuracyReport {
  factors: AccuracyFactor[]
  overall: number // 0..100, promedio de factores con datos
  playedSample: number // partidos reales jugados considerados
}

function sign(a: number, b: number): number {
  return a === b ? 0 : a > b ? 1 : -1
}

// Puntos por partido para el ranking, escalonados por fase: valen más a medida
// que avanza el torneo, así la fase final mantiene el ranking abierto.
export const STAGE_POINTS: Record<StageId, { exact: number; tendency: number }> = {
  group: { exact: 3, tendency: 1 },
  r32: { exact: 4, tendency: 2 },
  r16: { exact: 5, tendency: 2 },
  qf: { exact: 6, tendency: 3 },
  sf: { exact: 8, tendency: 4 },
  third: { exact: 10, tendency: 5 },
  final: { exact: 10, tendency: 5 },
}

export interface RankingScore {
  points: number
  max: number
  pct: number
  exact: number // marcadores exactos acertados
  tendency: number // sólo el resultado acertado
  played: number // partidos reales jugados considerados
}

/**
 * Puntaje del ranking: SÓLO cuenta los resultados de los partidos.
 *  - marcador exacto  → EXACT_POINTS
 *  - acertar sólo quién ganó/empató (sin el marcador) → TENDENCY_POINTS
 *  - errar → 0
 * El % es sobre el máximo posible de los partidos ya jugados.
 */
export function computeRankingScore(
  predResults: Record<number, MatchResult>,
  realResults: Record<number, MatchResult>,
): RankingScore {
  let points = 0
  let max = 0
  let exact = 0
  let tendency = 0
  let played = 0
  for (const m of MATCHES) {
    const real = realResults[m.id]
    if (!real?.played) continue
    const pred = predResults[m.id]
    // Sólo cuentan los partidos que predijiste a tiempo (antes del cierre).
    // Los que no predijiste no suman ni restan (no entran al máximo).
    if (!pred?.played) continue
    const pts = STAGE_POINTS[m.stage]
    played++
    max += pts.exact
    if (pred.homeScore === real.homeScore && pred.awayScore === real.awayScore) {
      points += pts.exact
      exact++
    } else if (sign(pred.homeScore, pred.awayScore) === sign(real.homeScore, real.awayScore)) {
      points += pts.tendency
      tendency++
    }
  }
  const pct = max > 0 ? (points / max) * 100 : 0
  return { points, max, pct, exact, tendency, played }
}

// Conjunto "equipo:jugador" de eventos de un tipo en un resultado.
function eventKeys(res: MatchResult, types: string[]): string[] {
  return res.events
    .filter((e) => types.includes(e.type))
    .map((e) => `${e.team}:${(e.player ?? '').trim().toLowerCase()}`)
}

function overlap(a: string[], b: string[]): number {
  const pool = [...b]
  let matched = 0
  for (const key of a) {
    const idx = pool.indexOf(key)
    if (idx >= 0) {
      matched++
      pool.splice(idx, 1)
    }
  }
  return matched
}

// Conjunto de equipos clasificados a la fase final, según una resolución.
function qualifiers(res: Resolution, real: Record<number, MatchResult>): Set<string> {
  const set = new Set<string>()
  for (const g of GROUPS) {
    if (!groupComplete(g, real)) continue
    const a = res.slots[`1${g}`]
    const b = res.slots[`2${g}`]
    if (a) set.add(a)
    if (b) set.add(b)
  }
  if (res.bestThirds) {
    res.bestThirds.slice(0, 8).forEach((t) => set.add(t))
  }
  return set
}

/**
 * Compara un escenario de predicción contra la realidad.
 * Sólo cuenta lo que YA sucedió en el escenario real (partidos jugados).
 */
export function computeAccuracy(
  predResults: Record<number, MatchResult>,
  realResults: Record<number, MatchResult>,
): AccuracyReport {
  const realRes = resolve(realResults)
  const predRes = resolve(predResults)

  let outcomeOk = 0
  let outcomeTot = 0
  let scoreOk = 0
  let scoreTot = 0
  let goalOk = 0
  let goalTot = 0
  let yellowOk = 0
  let yellowTot = 0
  let redOk = 0
  let redTot = 0
  let varOk = 0
  let varTot = 0
  let koOk = 0
  let koTot = 0
  let playedSample = 0

  for (const m of MATCHES) {
    const real = realResults[m.id]
    if (!real?.played) continue
    playedSample++
    const pred = predResults[m.id]

    // Resultado 1/X/2
    outcomeTot++
    if (pred?.played && sign(pred.homeScore, pred.awayScore) === sign(real.homeScore, real.awayScore)) {
      outcomeOk++
    }

    // Marcador exacto
    scoreTot++
    if (pred?.played && pred.homeScore === real.homeScore && pred.awayScore === real.awayScore) {
      scoreOk++
    }

    // Goleadores
    const realGoals = eventKeys(real, ['goal', 'own_goal', 'penalty'])
    goalTot += realGoals.length
    if (pred) goalOk += overlap(realGoals, eventKeys(pred, ['goal', 'own_goal', 'penalty']))

    // Amarillas
    const realYellow = eventKeys(real, ['yellow'])
    yellowTot += realYellow.length
    if (pred) yellowOk += overlap(realYellow, eventKeys(pred, ['yellow']))

    // Rojas
    const realRed = eventKeys(real, ['red'])
    redTot += realRed.length
    if (pred) redOk += overlap(realRed, eventKeys(pred, ['red']))

    // VAR: cantidad de intervenciones en el partido (acierto exacto).
    if (real.varCount != null) {
      varTot++
      if (pred?.varCount != null && pred.varCount === real.varCount) varOk++
    }

    // Ganador de eliminatoria
    if (m.stage !== 'group') {
      const rw = realRes.matches[m.id]?.winner
      if (rw) {
        koTot++
        const pw = predRes.matches[m.id]?.winner
        if (pw && pw === rw) koOk++
      }
    }
  }

  // Clasificados
  const realQual = qualifiers(realRes, realResults)
  const predQual = qualifiers(predRes, realResults)
  let qualOk = 0
  realQual.forEach((t) => {
    if (predQual.has(t)) qualOk++
  })
  const qualTot = realQual.size

  // Campeón
  const realChamp = realRes.matches[104]?.winner
  const predChamp = predRes.matches[104]?.winner
  const champTot = realChamp ? 1 : 0
  const champOk = realChamp && predChamp === realChamp ? 1 : 0

  const factors: AccuracyFactor[] = [
    { key: 'outcome', label: 'Resultado (1/X/2)', correct: outcomeOk, total: outcomeTot },
    { key: 'score', label: 'Marcador exacto', correct: scoreOk, total: scoreTot },
    { key: 'goals', label: 'Goleadores', correct: goalOk, total: goalTot },
    { key: 'yellow', label: 'Tarjetas amarillas', correct: yellowOk, total: yellowTot },
    { key: 'red', label: 'Tarjetas rojas', correct: redOk, total: redTot },
    { key: 'var', label: 'Cantidad de intervenciones del VAR', correct: varOk, total: varTot },
    { key: 'qualifiers', label: 'Clasificados a fase final', correct: qualOk, total: qualTot },
    { key: 'knockout', label: 'Ganadores de eliminatoria', correct: koOk, total: koTot },
    { key: 'champion', label: 'Campeón', correct: champOk, total: champTot },
  ].map((f) => ({ ...f, pct: f.total > 0 ? (f.correct / f.total) * 100 : 0 }))

  const withData = factors.filter((f) => f.total > 0)
  const overall =
    withData.length > 0 ? withData.reduce((s, f) => s + f.pct, 0) / withData.length : 0

  return { factors, overall, playedSample }
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTADÍSTICAS ÚTILES DE UNA PREDICCIÓN (para la pestaña Precisión)
// Derivadas SOLO de lo que la app verifica de verdad (marcador de cada partido),
// así no quedan métricas en "sin datos".
// ─────────────────────────────────────────────────────────────────────────────
export type HitKind = 'exact' | 'result' | 'miss'

export interface StageBreakdown {
  stage: StageId
  points: number
  max: number
  played: number
  exact: number
}

export interface HitEntry {
  matchId: number
  ph: number // predicción local
  pa: number // predicción visitante
  rh: number // real local
  ra: number // real visitante
  points: number // puntos que sumó ese partido
}

export interface PredStats {
  byStage: StageBreakdown[]
  // Forma reciente: últimos partidos jugados que predijiste, del más nuevo al
  // más viejo, con qué tan bien le pegaste.
  form: { matchId: number; kind: HitKind }[]
  // Listado completo por categoría (desglose de la pestaña Precisión).
  lists: { exact: HitEntry[]; result: HitEntry[]; miss: HitEntry[] }
  exact: number
  result: number
  miss: number
}

export function classifyHit(
  pred: MatchResult | undefined,
  real: MatchResult | undefined,
): HitKind | null {
  if (!real?.played || !pred?.played) return null
  if (pred.homeScore === real.homeScore && pred.awayScore === real.awayScore) return 'exact'
  if (sign(pred.homeScore, pred.awayScore) === sign(real.homeScore, real.awayScore)) return 'result'
  return 'miss'
}

export function computePredStats(
  predResults: Record<number, MatchResult>,
  realResults: Record<number, MatchResult>,
  formLimit = 14,
): PredStats {
  const stageMap = new Map<StageId, StageBreakdown>()
  const timeline: { matchId: number; kind: HitKind; ts: number }[] = []
  const lists: PredStats['lists'] = { exact: [], result: [], miss: [] }
  let exact = 0
  let result = 0
  let miss = 0

  for (const m of MATCHES) {
    const pred = predResults[m.id]
    const real = realResults[m.id]
    const kind = classifyHit(pred, real)
    if (!kind) continue
    const pts = STAGE_POINTS[m.stage]
    let row = stageMap.get(m.stage)
    if (!row) {
      row = { stage: m.stage, points: 0, max: 0, played: 0, exact: 0 }
      stageMap.set(m.stage, row)
    }
    row.played++
    row.max += pts.exact
    const gained = kind === 'exact' ? pts.exact : kind === 'result' ? pts.tendency : 0
    const entry = { matchId: m.id, ph: pred!.homeScore, pa: pred!.awayScore, rh: real!.homeScore, ra: real!.awayScore, points: gained }
    if (kind === 'exact') {
      row.points += pts.exact
      row.exact++
      exact++
      lists.exact.push(entry)
    } else if (kind === 'result') {
      row.points += pts.tendency
      result++
      lists.result.push(entry)
    } else {
      miss++
      lists.miss.push(entry)
    }
    timeline.push({ matchId: m.id, kind, ts: Date.parse(m.kickoff) })
  }

  const order: StageId[] = ['group', 'r32', 'r16', 'qf', 'sf', 'third', 'final']
  const byStage = order.filter((s) => stageMap.has(s)).map((s) => stageMap.get(s)!)
  const form = timeline
    .sort((a, b) => b.ts - a.ts)
    .slice(0, formLimit)
    .map(({ matchId, kind }) => ({ matchId, kind }))

  return { byStage, form, lists, exact, result, miss }
}

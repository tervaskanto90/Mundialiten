// Verifica el puntaje del partido MEX–RSA (partido 1, real 2-0) para el conjunto
// real de usuarios reportado, y bloquea la tabla STAGE_POINTS (si cambia, hay que
// actualizar también la función SQL recompute_all_scores del trigger en Supabase).
import { computeRankingScore, STAGE_POINTS } from '../src/engine/accuracy'
import type { MatchResult, StageId } from '../src/types'

let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) pass++; else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

// Resultado real del partido 1: México 2 - 0 Sudáfrica.
const real: Record<number, MatchResult> = { 1: { played: true, homeScore: 2, awayScore: 0, events: [] } }
const pred = (h: number, a: number): Record<number, MatchResult> => ({
  1: { played: true, homeScore: h, awayScore: a, events: [] },
})

// [nombre, MEX, RSA | null si no predijo, puntos esperados]
const dataset: Array<[string, number | null, number | null, number]> = [
  ['Lio', 2, 0, 3],
  ['Octavio', 2, 0, 3],
  ['Victor pampa', 2, 0, 3],
  ['Andre', 2, 1, 1],
  ['Bruno', 2, 1, 1],
  ['Dani Arias M', 2, 1, 1],
  ['Nicolino Locche', 2, 1, 1],
  ['Plutarco', 2, 1, 1],
  ['Ricardo', 2, 1, 1],
  ['Barbara', 1, 0, 1],
  ['Oliver', 1, 0, 1],
  ['Edu', 3, 0, 1],
  ['Putoelquelee', null, null, 0],
  ['Sergio', null, null, 0],
  ['TARA2', null, null, 0],
]

for (const [name, h, a, expected] of dataset) {
  const p = h == null ? {} : pred(h, a as number)
  const s = computeRankingScore(p, real)
  check(`${name}: ${expected} pts`, s.points === expected, `got ${s.points}`)
}

// Exacto y "sólo resultado" puntúan distinto.
check('exacto (2-0) = 3', computeRankingScore(pred(2, 0), real).points === 3)
check('tendencia (5-1) = 1', computeRankingScore(pred(5, 1), real).points === 1)
check('errado (0-1) = 0', computeRankingScore(pred(0, 1), real).points === 0)
check('empate vs victoria local = 0', computeRankingScore(pred(1, 1), real).points === 0)

// Bloqueo de STAGE_POINTS — si esto cambia, actualizar la función SQL del trigger.
// [exacto, resultado, "quién pasa" (advance)]
const expectPts: Record<StageId, [number, number, number]> = {
  group: [3, 1, 0], r32: [4, 2, 2], r16: [5, 2, 2], qf: [6, 3, 3], sf: [8, 4, 4], third: [10, 5, 5], final: [10, 5, 5],
}
for (const st of Object.keys(expectPts) as StageId[]) {
  check(
    `STAGE_POINTS ${st}`,
    STAGE_POINTS[st].exact === expectPts[st][0] &&
      STAGE_POINTS[st].tendency === expectPts[st][1] &&
      STAGE_POINTS[st].advance === expectPts[st][2],
  )
}

// ── Eliminatorias: marcador + bonus "quién pasa" (esquema aditivo) ──
// 4tos de final (partido 97). Real: 1-1 y ganan los penales el LOCAL (avanza local).
const koReal: Record<number, MatchResult> = {
  97: { played: true, homeScore: 1, awayScore: 1, homePens: 5, awayPens: 4, events: [] },
}
const koPred = (h: number, a: number, hp?: number, ap?: number): Record<number, MatchResult> => ({
  97: { played: true, homeScore: h, awayScore: a, homePens: hp, awayPens: ap, events: [] },
})
// qf: exacto 6 · resultado 3 · advance 3
check('KO exacto 1-1 + pasa local = 6+3=9', computeRankingScore(koPred(1, 1, 1, 0), koReal).points === 9)
check('KO empate 2-2 + pasa local = 3+3=6', computeRankingScore(koPred(2, 2, 1, 0), koReal).points === 6)
check('KO exacto 1-1 + pasa visita = 6+0=6', computeRankingScore(koPred(1, 1, 0, 1), koReal).points === 6)
check('KO 2-1 local (gana en 90) + pasa local = 0+3=3', computeRankingScore(koPred(2, 1), koReal).points === 3)
check('KO 1-2 visita (errado, pasa visita) = 0', computeRankingScore(koPred(1, 2), koReal).points === 0)
check('KO empate sin elegir penales = 3+0=3', computeRankingScore(koPred(2, 2), koReal).points === 3)
check('KO conteo advance', computeRankingScore(koPred(1, 1, 1, 0), koReal).advance === 1)

console.log(`\n──────── PUNTAJE (dataset real MEX-RSA): ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)

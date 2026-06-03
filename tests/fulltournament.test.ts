// Simulación de un Mundial completo: el cuadro resuelve hasta el campeón y el
// reacomodo con equipos reales se propaga ronda a ronda en la predicción.
import { MATCHES } from '../src/data/schedule'
import { resolve } from '../src/engine/resolve'
import { computeRankingScore } from '../src/engine/accuracy'
import { allGroupsComplete } from '../src/engine/standings'
import type { MatchResult } from '../src/types'

let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) pass++; else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}
const r = (h: number, a: number, e: Partial<MatchResult> = {}): MatchResult => ({ played: true, homeScore: h, awayScore: a, events: [], ...e })

// REAL: grupos gana el local; cada KO se carga (gana el local del slot) una vez
// que tiene equipos, iterando hasta resolver toda la llave.
const real: Record<number, MatchResult> = {}
for (const m of MATCHES) if (m.stage === 'group') real[m.id] = r(2, 1)
for (let p = 0; p < 10; p++) {
  const res = resolve(real)
  for (const m of MATCHES) {
    if (m.stage === 'group') continue
    const rm = res.matches[m.id]
    if (rm.home && rm.away && !real[m.id]) real[m.id] = r(1, 0)
  }
}
const realRes = resolve(real)

check('Todos los grupos completos', allGroupsComplete(real))
const koNoWinner = MATCHES.filter((m) => m.stage !== 'group' && !realRes.matches[m.id]?.winner)
check('Toda eliminatoria resuelta (con ganador)', koNoWinner.length === 0, `sin ganador: ${koNoWinner.map((m) => m.id)}`)
const champ = realRes.matches[104]?.winner
check('Hay campeón (M104)', !!champ, `champ=${champ}`)
check('3er puesto resuelto (M103)', !!realRes.matches[103]?.winner)
const undef = MATCHES.filter((m) => m.stage !== 'group' && (!realRes.matches[m.id]?.home || !realRes.matches[m.id]?.away))
check('Ningún cruce con equipo indefinido', undef.length === 0, `${undef.map((m) => m.id)}`)
console.log(`  Campeón simulado: ${champ}`)

// Re-seed multi-ronda: predicción que erró todo en grupos.
const pred: Record<number, MatchResult> = {}
for (const m of MATCHES) if (m.stage === 'group') pred[m.id] = r(0, 1)
for (let p = 0; p < 10; p++) {
  const pr = resolve(pred)
  for (const m of MATCHES) {
    if (m.stage === 'group') continue
    const rm = pr.matches[m.id]
    if (rm.home && rm.away && !pred[m.id]) pred[m.id] = r(3, 0)
  }
}
const predRes = resolve(pred, { realSlots: realRes.slots, realMatches: realRes.matches })
for (const stage of ['r32', 'r16', 'qf', 'sf', 'third', 'final']) {
  const ms = MATCHES.filter((m) => m.stage === stage)
  let okHome = 0, okAway = 0
  for (const m of ms) {
    if (predRes.matches[m.id].home === realRes.matches[m.id].home) okHome++
    if (predRes.matches[m.id].away === realRes.matches[m.id].away) okAway++
  }
  check(`Re-seed ${stage}: equipos coinciden con la realidad`, okHome === ms.length && okAway === ms.length, `home ${okHome}/${ms.length} away ${okAway}/${ms.length}`)
}

const perfect = computeRankingScore(real, real)
check('Predicción perfecta = 100% y points==max', Math.round(perfect.pct) === 100 && perfect.points === perfect.max && perfect.points > 0)
console.log(`  Puntaje máximo del torneo completo: ${perfect.max} pts (${perfect.played} partidos)`)
const tendPred: Record<number, MatchResult> = {}
for (const m of MATCHES) tendPred[m.id] = r(real[m.id].homeScore + 1, real[m.id].awayScore)
const tend = computeRankingScore(tendPred, real)
check('Acertar sólo tendencia da > 0 y < máximo', tend.points > 0 && tend.points < perfect.max, `${tend.points}/${perfect.max}`)

console.log(`\n──────── MUNDIAL COMPLETO: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)

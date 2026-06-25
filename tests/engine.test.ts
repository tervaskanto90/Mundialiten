// Pruebas del núcleo: etapas, reacomodo de equipos reales, penales y ranking.
import { MATCHES } from '../src/data/schedule'
import { activeBucket, predictReason, canPredict, bucketOf, BUCKET_ORDER } from '../src/utils/stage'
import { resolve } from '../src/engine/resolve'
import { computeRankingScore } from '../src/engine/accuracy'
import { allGroupsComplete } from '../src/engine/standings'
import type { MatchResult } from '../src/types'

let pass = 0, fail = 0
const fails: string[] = []
function check(name: string, cond: boolean, extra = '') {
  if (cond) pass++
  else { fail++; fails.push(`${name} ${extra}`); console.log(`  ❌ ${name} ${extra}`) }
}
function section(s: string) { console.log(`\n=== ${s} ===`) }

const byId = (id: number) => MATCHES.find((m) => m.id === id)!
const T = (iso: string) => Date.parse(iso)
const r = (homeScore: number, awayScore: number, extra: Partial<MatchResult> = {}): MatchResult =>
  ({ played: true, homeScore, awayScore, events: [], ...extra })

const lastKickoff: Record<string, number> = { group: 0, r32: 0, r16: 0, qf: 0, sf: 0, finals: 0 }
for (const m of MATCHES) {
  const b = bucketOf(m.stage); const k = T(m.kickoff)
  if (k > lastKickoff[b]) lastKickoff[b] = k
}
const firstGroupKick = Math.min(...MATCHES.filter((m) => m.stage === 'group').map((m) => T(m.kickoff)))

section('1. activeBucket en fechas clave')
check('Pre-Mundial (03/06) = group', activeBucket(T('2026-06-03T12:00:00Z')) === 'group')
check('Justo antes 1er kickoff = group', activeBucket(firstGroupKick - 1000) === 'group')
check('Mitad de grupos (20/06) = group', activeBucket(T('2026-06-20T12:00:00Z')) === 'group')
check('Tras último grupo, antes r32 = r32', activeBucket(lastKickoff.group + 1000) === 'r32')
check('Durante r32 (30/06) = r32', activeBucket(T('2026-06-30T12:00:00Z')) === 'r32')
check('Tras último r32 = r16', activeBucket(lastKickoff.r32 + 1000) === 'r16')
check('Tras último r16 = qf', activeBucket(lastKickoff.r16 + 1000) === 'qf')
check('Tras último qf = sf', activeBucket(lastKickoff.qf + 1000) === 'sf')
check('Tras último sf = finals', activeBucket(lastKickoff.sf + 1000) === 'finals')
check('Día de la final (19/07) = finals', activeBucket(T('2026-07-19T12:00:00Z')) === 'finals')
check('Tras la final = null', activeBucket(lastKickoff.finals + 1000) === null)
check('Año 2027 = null', activeBucket(T('2027-01-01T00:00:00Z')) === null)

section('2. canPredict / predictReason — una sola etapa abierta')
const now1 = T('2026-06-20T12:00:00Z')
const futureGroup = MATCHES.filter((m) => m.stage === 'group' && T(m.kickoff) > now1 + 3600_000)[0]
check('Grupo futuro durante grupos = open', predictReason(futureGroup, now1) === 'open', `(m${futureGroup.id})`)
const pastGroup = MATCHES.filter((m) => m.stage === 'group' && T(m.kickoff) < now1 - 3600_000).slice(-1)[0]
check('Grupo ya jugado = kickoff (cerrado)', predictReason(pastGroup, now1) === 'kickoff', `(m${pastGroup.id})`)
check('R32 durante grupos = future', predictReason(byId(74), now1) === 'future')
check('R16 durante grupos = future', predictReason(byId(89), now1) === 'future')
check('Final durante grupos = future', predictReason(byId(104), now1) === 'future')
const m74 = byId(74); const k74 = T(m74.kickoff)
const duringR32 = T('2026-06-30T12:00:00Z')
check('R32 abierto 1h antes = open', predictReason(m74, k74 - 3600_000) === 'open')
check('R32 a 4 min del inicio = kickoff', predictReason(m74, k74 - 4 * 60_000) === 'kickoff')
check('R32 a 6 min del inicio = open', predictReason(m74, k74 - 6 * 60_000) === 'open')
check('Grupo cuando ya cerró su etapa = past', predictReason(byId(1), duringR32) === 'past')
check('R16 durante r32 = future', predictReason(byId(89), duringR32) === 'future')
for (const probe of ['2026-06-20T12:00:00Z', '2026-06-30T12:00:00Z', '2026-07-06T12:00:00Z', '2026-07-10T12:00:00Z', '2026-07-16T12:00:00Z']) {
  const now = T(probe); const ab = activeBucket(now)
  const openOutside = MATCHES.filter((m) => bucketOf(m.stage) !== ab && canPredict(m, now))
  check(`Sin partidos abiertos fuera de la etapa activa (${probe.slice(0, 10)} → ${ab})`, openOutside.length === 0, `abiertos: ${openOutside.map((m) => m.id)}`)
}

section('3. Re-seed: la fase final usa equipos REALES por ronda')
function fillGroups(map: Record<number, MatchResult>, homeWins = true) {
  for (const m of MATCHES) if (m.stage === 'group') map[m.id] = homeWins ? r(2, 1) : r(1, 2)
}
const real: Record<number, MatchResult> = {}
fillGroups(real, true)
check('allGroupsComplete(real) = true', allGroupsComplete(real) === true)
real[73] = r(0, 1); real[74] = r(0, 2)
const realRes = resolve(real)
check('M73 real tiene ganador (visitante)', !!realRes.matches[73].winner && realRes.matches[73].winner === realRes.matches[73].away)
check('M74 real tiene ganador (visitante)', !!realRes.matches[74].winner && realRes.matches[74].winner === realRes.matches[74].away)
const pred: Record<number, MatchResult> = {}
fillGroups(pred, false)
pred[73] = r(3, 0); pred[74] = r(3, 0)
const opts = { realSlots: allGroupsComplete(real) ? realRes.slots : undefined, realMatches: realRes.matches }
const predResolved = resolve(pred, opts)
check('Pred usa slots de grupo REALES (1A)', predResolved.slots['1A'] === realRes.slots['1A'], `pred1A=${predResolved.slots['1A']} real1A=${realRes.slots['1A']}`)
check('Pred M73 home = equipo real', predResolved.matches[73].home === realRes.matches[73].home)
function r16UsingRealWinners() {
  let okAny = false
  for (const m of MATCHES.filter((mm) => mm.stage === 'r16')) {
    for (const ref of [m.home, m.away]) {
      const mm = ref.match(/^W(\d+)$/)
      if (!mm) continue
      const n = Number(mm[1])
      if (n === 73 || n === 74) {
        okAny = true
        const realWinner = realRes.matches[n].winner
        const side = ref === m.home ? 'home' : 'away'
        const got = (predResolved.matches[m.id] as Record<string, string | undefined>)[side]
        check(`R16 m${m.id}.${side} usa ganador REAL de m${n}`, got === realWinner, `got=${got} real=${realWinner}`)
      }
    }
  }
  return okAny
}
check('Hay r16 alimentado por m73/m74', r16UsingRealWinners())
const predNoOpts = resolve(pred)
check('Sin overrides, pred usa SUS propios slots', predNoOpts.slots['1A'] !== realRes.slots['1A'], `predNoOpts1A=${predNoOpts.slots['1A']}`)

section('4. Penales: ganador correcto desde score.penalties')
const penReal: Record<number, MatchResult> = {}
fillGroups(penReal, true)
penReal[73] = r(1, 1, { homePens: 4, awayPens: 5 })
const penRes = resolve(penReal)
check('Penales: gana el visitante (awayPens>homePens)', penRes.matches[73].winner === penRes.matches[73].away)
penReal[74] = r(2, 2, { homePens: 5, awayPens: 3 })
const penRes2 = resolve(penReal)
check('Penales: gana el local (homePens>awayPens)', penRes2.matches[74].winner === penRes2.matches[74].home)
penReal[75] = r(0, 0)
const penRes3 = resolve(penReal)
check('Empate sin penales = sin ganador', penRes3.matches[75].winner == null && penRes3.matches[75].decided === false)

section('5. Ranking por puntos acumulados (entrar tarde no infla)')
const rk_real: Record<number, MatchResult> = { 1: r(2, 1), 101: r(3, 0) }
const A: Record<number, MatchResult> = { 1: r(2, 1) }
const B: Record<number, MatchResult> = { 101: r(3, 0) }
const sA = computeRankingScore(A, rk_real)
const sB = computeRankingScore(B, rk_real)
check('A (grupo exacto) = 3 pts', sA.points === 3, `got ${sA.points}`)
// Semifinal exacta: 8 (exacto) + 4 (bonus "quién pasa", acierta al ganador que avanza) = 12.
check('B (semi exacto + quién pasa) = 12 pts', sB.points === 12, `got ${sB.points}`)
check('A tiene 100% (1/1 jugados predichos)', Math.round(sA.pct) === 100)
check('B tiene 100% pct también', Math.round(sB.pct) === 100)
check('Pero por PUNTOS B supera a A (semi vale más)', sB.points > sA.points)
check('A: max sólo cuenta lo predicho (3)', sA.max === 3)
const C: Record<number, MatchResult> = { 1: r(1, 0) }
check('C tendencia en grupo = 1 pt', computeRankingScore(C, rk_real).points === 1)
const D: Record<number, MatchResult> = { 1: r(0, 2) }
const sD = computeRankingScore(D, rk_real)
check('D errado = 0 pts (pero suma al max)', sD.points === 0 && sD.max === 3)

section('6. Robustez: resolve no rompe con entradas vacías/parciales')
let threw = false
try { resolve({}) } catch { threw = true }
check('resolve({}) no lanza', !threw)
let threw2 = false
try { resolve({ 1: r(1, 0) }, { realMatches: {}, realSlots: undefined }) } catch { threw2 = true }
check('resolve parcial con opts vacíos no lanza', !threw2)
check('activeBucket(0) = group', activeBucket(0) === 'group')

console.log(`\n──────── ENGINE: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) { console.log('FALLOS:'); fails.forEach((f) => console.log('  - ' + f)); process.exit(1) }

// Detección de partidos EN VIVO (played && !finished && dentro de la ventana).
import { liveMatchIds } from '../src/utils/live'
import { MATCH_BY_ID } from '../src/data/schedule'
import type { MatchResult } from '../src/types'

let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) pass++; else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}
const T = (iso: string) => Date.parse(iso)
const r = (extra: Partial<MatchResult> = {}): MatchResult => ({ played: true, homeScore: 1, awayScore: 0, events: [], ...extra })

const ko13 = T(MATCH_BY_ID[13].kickoff) // Bélgica–Egipto
const ko14 = T(MATCH_BY_ID[14].kickoff) // España–Cabo Verde (arranca antes que el 13)

// Durante el partido 13 (1h después de su inicio): en vivo.
{
  const ids = liveMatchIds({ 13: r() }, ko13 + 3600_000)
  check('partido jugado y no terminado → en vivo', ids.length === 1 && ids[0] === 13)
}
// Terminado → no en vivo.
{
  const ids = liveMatchIds({ 13: r({ finished: true }) }, ko13 + 3600_000)
  check('partido finished → NO en vivo', ids.length === 0)
}
// No empezó (sin resultado) → no en vivo.
{
  const ids = liveMatchIds({}, ko13 + 3600_000)
  check('sin resultado → NO en vivo', ids.length === 0)
}
// Pasó hace mucho sin flag finished (tope de seguridad) → no en vivo.
{
  const ids = liveMatchIds({ 13: r() }, ko13 + 5 * 3600_000)
  check('5h después sin finished → NO en vivo (tope)', ids.length === 0)
}
// Dos partidos en simultáneo → ambos, ordenados por horario (14 arranca antes).
{
  const now = Math.max(ko13, ko14) + 1800_000
  const ids = liveMatchIds({ 13: r(), 14: r() }, now)
  check('dos en vivo → ambos', ids.length === 2)
  check('ordenados por horario (14 antes que 13)', ids[0] === 14 && ids[1] === 13, JSON.stringify(ids))
}

console.log(`\n──────── EN VIVO: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)

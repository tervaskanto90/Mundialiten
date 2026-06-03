// Pruebas del mapeo de resultados en vivo (camino desatendido durante el Mundial).
import { mapFixturesToUpdates } from '../src/engine/liveSync'
import { resolve } from '../src/engine/resolve'
import { TEAM_BY_ID } from '../src/data/teams'
import { MATCHES } from '../src/data/schedule'
import type { MatchResult } from '../src/types'

let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) pass++; else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}
const r = (h: number, a: number, e: Partial<MatchResult> = {}): MatchResult => ({ played: true, homeScore: h, awayScore: a, events: [], ...e })
// Atajo para construir un fixture del proveedor con campos opcionales.
const fx = (o: Record<string, unknown>) => o as Parameters<typeof mapFixturesToUpdates>[0][number]

const real: Record<number, MatchResult> = {}
for (const m of MATCHES) if (m.stage === 'group') real[m.id] = r(2, 0)
const res = resolve(real)

let u = mapFixturesToUpdates([fx({ homeName: 'Mexico', awayName: 'South Africa', hs: 3, as: 1, finished: true })], res)
check('Mapea M1 (misma orientación)', u.updates.some((x) => x.matchId === 1 && x.homeScore === 3 && x.awayScore === 1))

u = mapFixturesToUpdates([fx({ homeName: 'South Africa', awayName: 'Mexico', hs: 1, as: 3, finished: true })], res)
const m1 = u.updates.find((x) => x.matchId === 1)
check('Invierte orientación: MEX sigue siendo "home" nuestro', !!m1 && m1.homeScore === 3 && m1.awayScore === 1, JSON.stringify(m1))

u = mapFixturesToUpdates([fx({ homeName: 'Atlantis', awayName: 'Wakanda', hs: 5, as: 0, finished: true })], res)
check('Ignora equipos desconocidos', u.updates.length === 0 && u.fetched === 1 && u.matched === 0)

u = mapFixturesToUpdates([fx({ homeName: 'Mexico', awayName: 'South Africa', hs: null, as: null, finished: false })], res)
check('Ignora marcador null', u.updates.length === 0)

const m73 = res.matches[73]
const homeId = m73.home!, awayId = m73.away!
const enName = (id: string) => TEAM_BY_ID[id]?.aliases?.[0] ?? TEAM_BY_ID[id]?.name ?? id
u = mapFixturesToUpdates([fx({ homeName: enName(awayId), awayName: enName(homeId), hs: 1, as: 1, finished: true, hpens: 5, apens: 4 })], res)
const up73 = u.updates.find((x) => x.matchId === 73)
check('M73 mapeado con penales', !!up73, JSON.stringify(up73))
check('Penales con orientación invertida correctos', !!up73 && up73.homePens === 4 && up73.awayPens === 5, JSON.stringify(up73))
const realKO: Record<number, MatchResult> = { ...real, 73: r(up73!.homeScore, up73!.awayScore, { homePens: up73!.homePens, awayPens: up73!.awayPens }) }
check('Ganador por penales = equipo correcto (el de 5)', resolve(realKO).matches[73].winner === awayId)

u = mapFixturesToUpdates([fx({ homeName: 'Mexico', awayName: 'South Africa', hs: 1, as: 1, finished: true })], res)
const g = u.updates.find((x) => x.matchId === 1)
check('Empate sin penales: homePens/awayPens undefined', !!g && g.homePens === undefined && g.awayPens === undefined)

console.log(`\n──────── LIVE SYNC: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)

// Pruebas del mapeo de resultados en vivo (camino desatendido durante el Mundial).
import { mapFixturesToUpdates, regulationScore } from '../src/engine/liveSync'
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
check('Reporta los nombres no reconocidos', u.unmatched.includes('Atlantis') && u.unmatched.includes('Wakanda'))

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

// M3 = CAN vs BOS. El proveedor puede nombrar a Bosnia de varias formas; todas
// deben emparejar (normalize ignora conectores y separadores).
for (const bos of ['Bosnia and Herzegovina', 'Bosnia-Herzegovina', 'Bosnia & Herzegovina', 'Bosnia Herzegovina', 'Bosnia']) {
  const uu = mapFixturesToUpdates([fx({ homeName: 'Canada', awayName: bos, hs: 1, as: 0, finished: true })], res)
  check(`Bosnia "${bos}" mapea a M3 (1-0)`, uu.updates.some((x) => x.matchId === 3 && x.homeScore === 1 && x.awayScore === 0), JSON.stringify(uu.updates))
}
// No debe romper nombres que contienen un conector como subcadena.
check('"Ireland" no se rompe (no es "and")', ('Ireland'.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !['and'].includes(w)).join('')) === 'ireland')

// M14 = ESP vs CAB: variantes de Cabo Verde del proveedor.
for (const cab of ['Cape Verde', 'Cabo Verde', 'Cape Verde Islands', 'Cabo Verde Islands']) {
  const uu = mapFixturesToUpdates([fx({ homeName: 'Spain', awayName: cab, hs: 2, as: 1, finished: true })], res)
  check(`ESP vs "${cab}" mapea a M14 (2-1)`, uu.updates.some((x) => x.matchId === 14 && x.homeScore === 2 && x.awayScore === 1))
}
// Otras variantes de nombre por proveedor (USA M4, Corea M2).
check('"United States of America" → M4', mapFixturesToUpdates([fx({ homeName: 'United States of America', awayName: 'Paraguay', hs: 1, as: 0, finished: true })], res).updates.some((x) => x.matchId === 4))
check('"Korea Republic" → M2', mapFixturesToUpdates([fx({ homeName: 'Korea Republic', awayName: 'Czechia', hs: 0, as: 0, finished: true })], res).updates.some((x) => x.matchId === 2))

// ── PENALES NO SE SUMAN AL MARCADOR (football-data suma la tanda al fullTime) ──
const rs = (fh: number | null, fa: number | null, ph: number | null, pa: number | null) => regulationScore(fh, fa, ph, pa)
// ALE 1-1 PAR, gana PAR por penales 3-4 → football-data manda fullTime 4-5, pens 3-4.
check('ALE-PAR: fullTime 4-5 + pens 3-4 → marcador 1-1', rs(4, 5, 3, 4).hs === 1 && rs(4, 5, 3, 4).as === 1)
// Snapshot corrupto observado (5-5, 4-4p) → debe quedar 1-1, no 5-5.
check('fullTime 5-5 + pens 4-4 → marcador 1-1 (no 5-5)', rs(5, 5, 4, 4).hs === 1 && rs(5, 5, 4, 4).as === 1)
// Si el proveedor YA manda el marcador después del alargue (1-1) con pens aparte,
// no se le resta de más (restar daría negativo → se deja el fullTime tal cual).
check('fullTime 1-1 + pens 3-4 → marcador 1-1 (no toca)', rs(1, 1, 3, 4).hs === 1 && rs(1, 1, 3, 4).as === 1)
// Empate alto definido por penales: 2-2 (5-4p) → marcador 2-2.
check('fullTime 7-6 + pens 5-4 → marcador 2-2', rs(7, 6, 5, 4).hs === 2 && rs(7, 6, 5, 4).as === 2)
// Sin penales: el marcador es el fullTime tal cual (no se toca).
check('Sin penales: fullTime 3-1 → 3-1', rs(3, 1, null, null).hs === 3 && rs(3, 1, null, null).as === 1)
check('Empate de fase de grupos 1-1 sin penales → 1-1', rs(1, 1, null, null).hs === 1 && rs(1, 1, null, null).as === 1)
// El marcador resultante de un partido por penales SIEMPRE es empate.
{
  const x = rs(4, 5, 3, 4)
  check('Un partido por penales queda EMPATADO en el marcador', x.hs === x.as)
}

console.log(`\n──────── LIVE SYNC: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)

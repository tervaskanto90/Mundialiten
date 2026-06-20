// Desempate oficial FIFA 2026 (head-to-head primero) + eliminación.
// Grupo A: 1 MEX-RSA · 2 COR-CZE · 25 CZE-RSA · 28 MEX-COR · 51 CZE-MEX · 52 RSA-COR
import { computeGroupStanding } from '../src/engine/standings'
import { resolve } from '../src/engine/resolve'
import type { MatchResult } from '../src/types'

let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) pass++; else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}
const r = (h: number, a: number): MatchResult => ({ played: true, homeScore: h, awayScore: a, events: [] })

// 1) Head-to-head MANDA sobre la DG total: COR le ganó a CZE (1-0), pero CZE
//    tiene mejor diferencia de gol total. Igual COR va ARRIBA por el directo.
{
  const results = { 1: r(0, 0), 2: r(1, 0), 25: r(5, 0), 28: r(3, 0) }
  const order = computeGroupStanding('A', results).map((x) => x.teamId).join(',')
  check('head-to-head antes que DG total → MEX,COR,CZE,RSA', order === 'MEX,COR,CZE,RSA', order)
}

// 2) Si el head-to-head queda empatado (0-0 entre ellos), manda la DG total.
{
  const results = { 1: r(0, 0), 2: r(0, 0), 25: r(5, 0), 28: r(0, 3) }
  const order = computeGroupStanding('A', results).map((x) => x.teamId).join(',')
  check('h2h empatado → DG total decide (CZE,COR,MEX,RSA)', order === 'CZE,COR,MEX,RSA', order)
}

// 3) Eliminación: grupo A completo, RSA pierde todo (0 pts, último) → eliminado.
{
  const results = { 1: r(2, 0), 2: r(1, 1), 25: r(3, 0), 28: r(1, 1), 51: r(2, 2), 52: r(0, 2) }
  const res = resolve(results)
  check('RSA (4°) eliminado', res.eliminated.has('RSA'))
  check('1°/2°/3° no eliminados', !res.eliminated.has('MEX') && !res.eliminated.has('COR') && !res.eliminated.has('CZE'))
}

// 4) Grupo sin terminar → nadie eliminado todavía (salvo último matemático).
{
  const res = resolve({ 1: r(1, 0), 2: r(1, 0) })
  check('grupo en curso → sin eliminados', res.eliminated.size === 0, `${[...res.eliminated]}`)
}

// 5) Eliminado AUNQUE el grupo no haya terminado (falta M51 por sincronizar):
//    RSA jugó sus 3 partidos con 0 pts y 3 rivales por encima sin importar M51.
{
  const results = { 1: r(1, 0), 2: r(1, 0), 25: r(1, 0), 28: r(1, 0), 52: r(0, 1) }
  const res = resolve(results)
  check('RSA eliminado aunque el grupo no terminó (sin chances de top 3)', res.eliminated.has('RSA'))
  check('MEX/COR no eliminados', !res.eliminated.has('MEX') && !res.eliminated.has('COR'))
}

console.log(`\n──────── DESEMPATE/ELIMINACIÓN: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)

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

// 5b) PRINCIPIO: con sólo 1 fecha jugada NADIE puede estar eliminado (cualquiera
//     puede llegar a 6 pts). Grupo D fecha 1: USA-PAR y AUS-TUR.
{
  const res = resolve({ 4: r(2, 0), 8: r(1, 0) })
  check('1 fecha jugada → 0 eliminados', res.eliminated.size === 0, `${[...res.eliminated]}`)
}

// 6) Caso Turquía (Grupo D, falta la fecha 3): USA 6, AUS 3, PAR 3, TUR 0.
//    TUR llega como mucho a 3 (gana fecha 3) pero YA perdió el head-to-head con
//    AUS (M8) y PAR (M31) → no los pasa ni empatándolos → eliminada por h2h.
//    D: 4 USA-PAR · 8 AUS-TUR · 29 USA-AUS · 31 TUR-PAR · 59 TUR-USA · 60 PAR-AUS
{
  const results = { 4: r(2, 0), 8: r(1, 0), 29: r(2, 0), 31: r(0, 1) }
  const res = resolve(results)
  check('TUR eliminada por head-to-head (no por puntos)', res.eliminated.has('TUR'))
  check('USA/AUS/PAR NO eliminados', !res.eliminated.has('USA') && !res.eliminated.has('AUS') && !res.eliminated.has('PAR'))
}

console.log(`\n──────── DESEMPATE/ELIMINACIÓN: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)

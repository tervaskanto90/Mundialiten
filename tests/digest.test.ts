// Lógica del DIGEST cada 2 días: ¿quién entra en el mail? Sólo quien trepó 2+
// puestos desde el snapshot anterior; los empatados comparten puesto (sin saltos
// por desempates de orden); si nadie trepó 2+, no hay destacados (no se manda).
import { computeClimbers } from '../api/digest'

let pass = 0, fail = 0
const ok = (n: string, c: boolean, extra = '') => { if (c) pass++; else { fail++; console.log(`  ❌ ${n} ${extra}`) } }

// Base: puntos distintos → puesto actual claro (A=1 … E=5).
const base = [
  { user_id: 'A', display_name: 'Ana', points: 30, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: 4, digest_points: 10 },
  { user_id: 'B', display_name: 'Beto', points: 25, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: 1, digest_points: 24 },
  { user_id: 'C', display_name: 'Caro', points: 20, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: 5, digest_points: 8 },
  { user_id: 'D', display_name: 'Dani', points: 15, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: null, digest_points: null },
  { user_id: 'E', display_name: 'Eze', points: 10, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: 3, digest_points: 10 },
]
const c1 = computeClimbers(base as any)
ok('Destaca exactamente a los que treparon 2+ (Ana 4→1, Caro 5→3)', c1.length === 2, `(${c1.map((c) => c.name).join(',')})`)
ok('Orden: el que más trepó primero', c1[0]?.name === 'Ana' && c1[1]?.name === 'Caro')
ok('Ana: +3 puestos, ahora #1', c1[0]?.gainedPos === 3 && c1[0]?.currRank === 1 && c1[0]?.prevRank === 4)
ok('Ana: puntos ganados = 30-10 = 20', c1[0]?.gainedPts === 20)
ok('Caro: +2 puestos, ahora #3', c1[1]?.gainedPos === 2 && c1[1]?.currRank === 3)
ok('Beto bajó (1→2): NO entra', !c1.find((c) => c.name === 'Beto'))
ok('Dani sin baseline (digest_rank null): NO entra', !c1.find((c) => c.name === 'Dani'))

// Subir sólo 1 puesto NO alcanza.
const base2 = [
  { user_id: 'X', display_name: 'X', points: 20, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: 2, digest_points: 18 },
  { user_id: 'Y', display_name: 'Y', points: 10, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: 1, digest_points: 25 },
]
// X: ahora #1 (20 > 10), antes #2 → +1 puesto (no alcanza). Y: #2, antes #1 → bajó.
ok('Trepar 1 solo puesto no entra (nadie destacado)', computeClimbers(base2 as any).length === 0)

// Empate: comparten puesto (ranking de competición). F y G empatados en 18.
const tie = [
  { user_id: 'A', display_name: 'A', points: 30, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: 1, digest_points: 29 },
  { user_id: 'B', display_name: 'B', points: 25, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: 2, digest_points: 24 },
  { user_id: 'C', display_name: 'C', points: 20, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: 3, digest_points: 19 },
  { user_id: 'F', display_name: 'Fede', points: 18, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: 6, digest_points: 6 },
  { user_id: 'G', display_name: 'Gus', points: 18, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: 7, digest_points: 5 },
]
// F y G empatan 18 → ambos puesto #4 (3 estrictamente mejores). F: 6→4 (+2), G: 7→4 (+3).
const c3 = computeClimbers(tie as any)
ok('Empatados comparten puesto #4 y ambos cuentan como trepadores', c3.length === 2 && c3.every((c) => c.currRank === 4))
ok('Gus +3 y Fede +2 (sin saltos espurios por el empate)', c3[0]?.name === 'Gus' && c3[0]?.gainedPos === 3 && c3[1]?.gainedPos === 2)

// Desempate por subcriterios: a igual puntaje, más exactos rankea mejor.
const tb = [
  { user_id: 'P', display_name: 'P', points: 10, exact_count: 2, result_count: 2, advance_count: 0, digest_rank: 2, digest_points: 10 },
  { user_id: 'Q', display_name: 'Q', points: 10, exact_count: 0, result_count: 0, advance_count: 0, digest_rank: 1, digest_points: 10 },
]
// Mismos puntos; P tiene más exactos → P #1, Q #2. P trepó 2→1 (+1, no entra).
ok('Desempate por exactos respeta el orden del ranking (P #1)', computeClimbers(tb as any).length === 0)

console.log(`\n──────── DIGEST (trepadores): ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)

// Cambio de puesto por efecto del último partido (flechas del ranking).
import { rankDeltas } from '../src/lib/rankDelta'

let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) pass++; else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

// A predijo bien el último (sumó 5) y saltó de último a primero.
{
  const d = rankDeltas([
    { user_id: 'A', points: 5, last_points: 5 },
    { user_id: 'B', points: 4, last_points: 0 },
    { user_id: 'C', points: 3, last_points: 0 },
  ])
  check('A sube 2 puestos', d.get('A') === 2, `got ${d.get('A')}`)
  check('B baja 1', d.get('B') === -1, `got ${d.get('B')}`)
  check('C baja 1', d.get('C') === -1, `got ${d.get('C')}`)
}

// Nadie sumó en el último partido → nadie se mueve.
{
  const d = rankDeltas([
    { user_id: 'A', points: 5, last_points: 0 },
    { user_id: 'B', points: 3, last_points: 0 },
  ])
  check('sin cambios = 0', d.get('A') === 0 && d.get('B') === 0)
}

// Empate en puntos tras el último partido: quien venía atrás sube, el otro se mantiene.
{
  const d = rankDeltas([
    { user_id: 'A', points: 6, last_points: 3 }, // antes 3 (2º)
    { user_id: 'B', points: 6, last_points: 0 }, // antes 6 (1º)
  ])
  check('empate: A sube 1', d.get('A') === 1, `got ${d.get('A')}`)
  check('empate: B se mantiene', d.get('B') === 0, `got ${d.get('B')}`)
}

// Dataset MEX-RSA real (2-0): Victor pampa (exacto, +3) salta sobre los de +1.
{
  const d = rankDeltas([
    { user_id: 'lio', points: 3, last_points: 3 },
    { user_id: 'octavio', points: 3, last_points: 3 },
    { user_id: 'victor', points: 3, last_points: 3 },
    { user_id: 'andre', points: 1, last_points: 1 },
    { user_id: 'sergio', points: 0, last_points: 0 }, // no predijo
  ])
  // Antes del partido todos tenían 0 menos sergio (0) → todos empatados 1º.
  // Después: los de 3 quedan 1º (delta 0), andre baja, sergio baja.
  check('victor (exacto) no baja', (d.get('victor') ?? 0) >= 0)
  check('sergio (no predijo) baja o igual', (d.get('sergio') ?? 0) <= 0)
}

console.log(`\n──────── RANK DELTA: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)

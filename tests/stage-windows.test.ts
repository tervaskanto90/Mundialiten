// Garantiza que CADA etapa se abre con tiempo de sobra antes de su primer
// partido: nadie queda sin poder predecir por el cierre de 5 min.
// (Cada etapa se habilita cuando termina la anterior — cuando ya arrancaron
//  todos sus partidos — que es bastante antes de que empiece la nueva.)
import { MATCHES } from '../src/data/schedule'
import { activeBucket, bucketOf, BUCKET_ORDER, canPredict } from '../src/utils/stage'

let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) pass++; else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}
const T = (iso: string) => Date.parse(iso)
const ES: Record<string, string> = { group: 'grupos', r32: '16avos', r16: 'octavos', qf: 'cuartos', finals: 'semis+final+3°' }

const first: Record<string, number> = {}, last: Record<string, number> = {}
const firstMatchId: Record<string, number> = {}
for (const b of BUCKET_ORDER) { first[b] = Infinity; last[b] = -Infinity }
for (const m of MATCHES) {
  const b = bucketOf(m.stage); const k = T(m.kickoff)
  if (k < first[b]) { first[b] = k; firstMatchId[b] = m.id }
  if (k > last[b]) last[b] = k
}
// Una etapa se abre cuando arranca el último partido de la fase anterior.
const opensAt = (b: string) => {
  const i = BUCKET_ORDER.indexOf(b)
  return i === 0 ? -Infinity : last[BUCKET_ORDER[i - 1]]
}

// 1) Cada transición deja una ventana amplia (> 1 h) para el primer partido nuevo.
for (let i = 1; i < BUCKET_ORDER.length; i++) {
  const b = BUCKET_ORDER[i]
  const open = opensAt(b)
  const deadline = first[b] - 5 * 60_000 // cierre del 1er partido de la nueva etapa
  const windowH = (deadline - open) / 3_600_000
  check(`Ventana amplia para el 1er partido de ${ES[b]} (${windowH.toFixed(1)} h)`, windowH > 1)
  // Y el primer partido es predecible apenas se abre la etapa.
  const m = MATCHES.find((x) => x.id === firstMatchId[b])!
  check(`1er partido de ${ES[b]} predecible al abrir la etapa`, canPredict(m, open + 60_000))
}

// 2) Ningún partido de eliminatoria queda sin ventana (su etapa abre antes de su cierre).
const lockedOut: number[] = []
for (const m of MATCHES) {
  if (m.stage === 'group') continue
  if (opensAt(bucketOf(m.stage)) >= T(m.kickoff) - 5 * 60_000) lockedOut.push(m.id)
}
check('Ningún partido de eliminatoria sin ventana (lockout)', lockedOut.length === 0, lockedOut.join(','))

// 3) La etapa nueva se abre cuando termina la anterior, NO durante la nueva:
//    el momento de apertura es anterior al primer partido de la propia etapa.
for (let i = 1; i < BUCKET_ORDER.length; i++) {
  const b = BUCKET_ORDER[i]
  check(`${ES[b]} se abre ANTES de su propio primer partido`, opensAt(b) < first[b])
}

// 4) Caso puntual: en el instante en que se abre octavos, octavos es la etapa activa.
check('Al abrir octavos, activeBucket = r16', activeBucket(opensAt('r16') + 1000) === 'r16')

console.log(`\n──────── VENTANAS DE ETAPA: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)
